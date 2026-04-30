/**
 * Push Notification Service
 *
 * Handles all push-notification logic as an ADDITIVE layer.
 * Zero modifications to existing attendance, QR, or member logic.
 *
 * Flow:
 *  1. Member scans QR → existing check-in runs
 *  2. Post-success: show prompt → user clicks "Enable"
 *  3. requestPermission() → subscribeToPush(memberId) → saved to DB
 *  4. Dashboard loads → useNotificationTrigger reads atRiskMembers / reminderMembers
 *  5. sendPushToMember() → calls Edge Function → logs in notification_logs
 *  6. User clicks notification action → handleNotificationAction() updates status
 */

import { supabase } from "@/integrations/supabase/client";

// ── Constants ────────────────────────────────────────────────────────────────

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;
const SUPABASE_URL     = import.meta.env.VITE_SUPABASE_URL    as string;

/** Edge Function endpoint */
const SEND_PUSH_URL = `${SUPABASE_URL}/functions/v1/send-push`;

/** Gym phone for "Call Gym 📞" action — configurable via .env */
export const GYM_PHONE = import.meta.env.VITE_GYM_PHONE ?? "+919999999999";

// ── Types ────────────────────────────────────────────────────────────────────

export type NotificationType = "at_risk" | "reminder";
export type NotificationStatus = "sent" | "coming" | "later" | "restart" | "called";

export interface NotificationLog {
  id: string;
  member_id: string;
  type: NotificationType;
  message: string;
  sent_at: string;
  status: NotificationStatus;
  action_time: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Convert VAPID base64url public key to Uint8Array */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw     = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

// ── Permission + Subscription ────────────────────────────────────────────────

/**
 * Request browser notification permission.
 * Returns "granted" | "denied" | "default"
 */
export async function requestPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  if (Notification.permission === "granted") return "granted";
  return await Notification.requestPermission();
}

/**
 * Subscribe this device to Web Push and save to Supabase.
 * Safe to call multiple times — upserts on (member_id, endpoint).
 */
export async function subscribeToPush(memberId: string): Promise<boolean> {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.warn("[pushNotifications] Push not supported in this browser");
      return false;
    }

    const reg = await navigator.serviceWorker.ready;

    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly:      true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    const json = subscription.toJSON();
    const { endpoint, keys } = json;
    if (!endpoint || !keys) return false;

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        member_id: memberId,
        endpoint,
        p256dh:    keys.p256dh,
        auth:      keys.auth,
      },
      { onConflict: "member_id,endpoint" }
    );

    if (error) {
      console.error("[pushNotifications] Failed to save subscription:", error.message);
      return false;
    }

    try {
      const existingStr = localStorage.getItem("subscribed_members");
      const existing = existingStr ? JSON.parse(existingStr) : [];
      if (!existing.includes(memberId)) {
        existing.push(memberId);
        localStorage.setItem("subscribed_members", JSON.stringify(existing));
      }
    } catch (e) {
      console.warn("[pushNotifications] Failed to track subscribed_members locally", e);
    }

    console.log("[pushNotifications] ✅ Push subscription saved for member:", memberId);
    return true;
  } catch (err) {
    console.error("[pushNotifications] subscribeToPush error:", err);
    return false;
  }
}

/**
 * Check whether a member already has a push subscription in the DB.
 */
export async function isSubscribed(memberId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("id")
    .eq("member_id", memberId)
    .limit(1);

  if (error) return false;
  return (data?.length ?? 0) > 0;
}

/**
 * Get the push subscription object from the DB for a member.
 * Returns null if not found.
 */
async function getSubscriptions(memberId: string): Promise<Array<{
  endpoint: string; p256dh: string; auth: string;
}>> {
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("member_id", memberId);

  if (error || !data) return [];
  return data as Array<{ endpoint: string; p256dh: string; auth: string }>;
}

// ── Send Push ────────────────────────────────────────────────────────────────

/**
 * Send a push notification to a member + log to DB.
 * Skips if member has no subscription or already received one today (unless "later" status).
 *
 * @returns true if sent, false if skipped or failed
 */
export async function sendPushToMember(
  memberId: string,
  memberName: string,
  type: NotificationType,
  supabaseAnonKey: string
): Promise<boolean> {
  try {
    // ── Check for existing log today (dedup) ────────────────
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: existingLogs } = await supabase
      .from("notification_logs")
      .select("id, status")
      .eq("member_id", memberId)
      .eq("type", type)
      .gte("sent_at", todayStart.toISOString())
      .order("sent_at", { ascending: false })
      .limit(1);

    const existing = existingLogs?.[0];

    // Skip if already sent today (unless they said "remind later" — allow re-send)
    if (existing && existing.status !== "later") {
      console.log(`[pushNotifications] Skipping ${memberName} — already handled today (${existing.status})`);
      return false;
    }

    // ── Get subscription ────────────────────────────────────
    const subs = await getSubscriptions(memberId);
    console.log("Sending to member:", memberId);
    console.log("Subscriptions found:", subs.length);

    if (subs.length === 0) {
      console.log(`[pushNotifications] No subscription for member: ${memberId}`);
      console.log("❌ No device for this member");
      return false;
    }

    // ── Build notification content ──────────────────────────
    let title: string;
    let body: string;

    if (type === "at_risk") {
      title = `Hey ${memberName.split(" ")[0]} 👋`;
      body  = "It's been a few days — don't lose your streak 💪";
    } else {
      title = `Hi ${memberName.split(" ")[0]} 😔`;
      body  = "We miss you! Come back strong 💪";
    }

    let anySuccess = false;

    // ── Call Edge Function ──────────────────────────────────
    for (const sub of subs) {
      const response = await fetch(SEND_PUSH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey":        supabaseAnonKey,
          "Authorization": `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          subscription: {
            endpoint: sub.endpoint,
            keys:     { p256dh: sub.p256dh, auth: sub.auth },
          },
          title,
          body,
          data: {
            type,
            member_id: memberId,
            gym_phone: GYM_PHONE,
          },
        }),
      });

      if (response.status === 410) {
        // Subscription expired — remove from DB
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("member_id", memberId)
          .eq("endpoint", sub.endpoint);
        console.warn("[pushNotifications] Removed expired subscription for", memberName);
        continue;
      }

      if (!response.ok) {
        const err = await response.text();
        console.error("[pushNotifications] Edge Function error:", err);
        await supabase.from("notification_logs").insert({
          member_id: memberId,
          type: "failed_push",
          message: "Push not delivered: Edge function error",
          status: "failed",
        });
        continue;
      }

      anySuccess = true;
    }

    if (anySuccess) {
      console.log(`[pushNotifications] ✅ Sent ${type} notification to ${memberName}`);
      return true;
    }
    
    return false;

  } catch (err) {
    console.error("[pushNotifications] sendPushToMember error:", err);
    await supabase.from("notification_logs").insert({
      member_id: memberId,
      type: "failed_push",
      message: "Push not delivered: Network error",
      status: "failed",
    });
    return false;
  }
}

// ── Action Handling ──────────────────────────────────────────────────────────

/**
 * Update a notification log entry with the member's action response.
 * Called when member clicks a notification button.
 */
export async function handleNotificationAction(
  memberId: string,
  type: NotificationType,
  status: NotificationStatus
): Promise<void> {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Find today's most recent log for this member+type
    const { data: logs } = await supabase
      .from("notification_logs")
      .select("id")
      .eq("member_id", memberId)
      .eq("type", type)
      .gte("sent_at", todayStart.toISOString())
      .order("sent_at", { ascending: false })
      .limit(1);

    const logId = logs?.[0]?.id;
    if (!logId) return;

    await supabase
      .from("notification_logs")
      .update({ status, action_time: new Date().toISOString() })
      .eq("id", logId);

    console.log(`[pushNotifications] Action recorded: ${status} for log ${logId}`);
  } catch (err) {
    console.error("[pushNotifications] handleNotificationAction error:", err);
  }
}

// ── Activity Logs ────────────────────────────────────────────────────────────

/**
 * Fetch notification history for a specific member.
 * Used in MemberDetail to show 🔔 Notification Activity section.
 */
export async function getMemberNotificationLogs(
  memberId: string
): Promise<NotificationLog[]> {
  const { data, error } = await supabase
    .from("notification_logs")
    .select("id, member_id, type, message, sent_at, status, action_time")
    .eq("member_id", memberId)
    .order("sent_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("[pushNotifications] getMemberNotificationLogs error:", error.message);
    return [];
  }

  return (data ?? []) as NotificationLog[];
}
