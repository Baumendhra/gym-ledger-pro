/**
 * useNotificationTrigger
 *
 * Automatically sends push notifications to at-risk and reminder members.
 *
 * OPTIMIZED: Uses 2 batch DB queries for ALL members instead of N×2 individual queries.
 * - 1 query: fetch all push_subscriptions for all member IDs at once
 * - 1 query: fetch today's notification_logs for all member IDs at once
 * - Process everything in memory — only send to members with subscriptions not yet notified
 */

import { useEffect, useRef } from "react";
import type { MemberWithStatus } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { sendPushToMemberWithData } from "@/services/pushNotifications";

const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const SESSION_KEY = "pn_triggered_session";

export function useNotificationTrigger(
  atRiskMembers: MemberWithStatus[],
  reminderMembers: MemberWithStatus[]
): void {
  const triggered = useRef(false);

  useEffect(() => {
    if (triggered.current) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    if (atRiskMembers.length === 0 && reminderMembers.length === 0) return;
    if (!("PushManager" in window)) return;

    triggered.current = true;
    sessionStorage.setItem(SESSION_KEY, "1");

    (async () => {
      const inactiveReminders = reminderMembers.filter(m => m.finalStatus === "Inactive");
      const allTargets: Array<{ member: MemberWithStatus; type: "at_risk" | "reminder" }> = [
        ...atRiskMembers.map(m => ({ member: m, type: "at_risk" as const })),
        ...inactiveReminders.map(m => ({ member: m, type: "reminder" as const })),
      ];

      if (allTargets.length === 0) return;

      console.log(`[useNotificationTrigger] Batch processing ${allTargets.length} members (2 queries total)`);

      const allMemberIds = allTargets.map(t => t.member.id);
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // ── QUERY 1: Fetch all subscriptions for all members in one go ──
      const { data: subsData } = await supabase
        .from("push_subscriptions")
        .select("member_id, endpoint, p256dh, auth")
        .in("member_id", allMemberIds);

      // ── QUERY 2: Fetch today's notification logs for all members in one go ──
      const { data: logsData } = await supabase
        .from("notification_logs")
        .select("member_id, type, status")
        .in("member_id", allMemberIds)
        .gte("sent_at", todayStart.toISOString());

      // Build lookup maps in memory (zero additional DB queries)
      const subsMap = new Map<string, Array<{ endpoint: string; p256dh: string; auth: string }>>();
      for (const sub of subsData ?? []) {
        const key = sub.member_id;
        if (!subsMap.has(key)) subsMap.set(key, []);
        subsMap.get(key)!.push({ endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth });
      }

      // Map: memberId+type → status (to check if already sent today)
      const logsMap = new Map<string, string>();
      for (const log of logsData ?? []) {
        logsMap.set(`${log.member_id}:${log.type}`, log.status);
      }

      // Filter to only members who have subscriptions AND haven't been notified today
      const toSend = allTargets.filter(({ member, type }) => {
        const subs = subsMap.get(member.id);
        if (!subs || subs.length === 0) return false; // no device
        const existingStatus = logsMap.get(`${member.id}:${type}`);
        if (existingStatus && existingStatus !== "later") return false; // already handled
        return true;
      });

      console.log(`[useNotificationTrigger] ${toSend.length} members to notify (${allTargets.length - toSend.length} skipped — no device or already sent)`);

      // Send only to filtered members — pass pre-fetched subscription data
      await Promise.all(
        toSend.map(({ member, type }) =>
          sendPushToMemberWithData(
            member.id,
            member.name,
            type,
            ANON_KEY,
            subsMap.get(member.id)!
          )
        )
      );

      console.log("[useNotificationTrigger] ✅ Notification trigger cycle complete");
    })();
  }, [atRiskMembers, reminderMembers]);
}
