/**
 * useNotificationTrigger
 *
 * Automatically sends push notifications to at-risk and reminder members.
 *
 * RULES:
 * - Uses the EXISTING atRiskMembers + reminderMembers arrays from Dashboard
 * - Does NOT recalculate days, status, or detection logic
 * - Fires once per session (sessionStorage flag)
 * - Skips members without a push subscription
 * - Deduplication: won't re-send if already sent today (handled in sendPushToMember)
 */

import { useEffect, useRef } from "react";
import type { MemberWithStatus } from "@/types";
import { sendPushToMember } from "@/services/pushNotifications";

const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const SESSION_KEY = "pn_triggered_session";

export function useNotificationTrigger(
  atRiskMembers: MemberWithStatus[],
  reminderMembers: MemberWithStatus[]
): void {
  // Track whether we've already triggered this session
  const triggered = useRef(false);

  useEffect(() => {
    // Skip if already triggered this session
    if (triggered.current) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    // Skip if no members to notify
    if (atRiskMembers.length === 0 && reminderMembers.length === 0) return;

    // Skip if push isn't supported in this browser
    if (!("PushManager" in window)) {
      console.log("[useNotificationTrigger] Push not supported — skip");
      return;
    }

    triggered.current = true;
    sessionStorage.setItem(SESSION_KEY, "1");

    // ── Run async notification sends in background ──────────
    (async () => {
      console.log(
        `[useNotificationTrigger] Triggering notifications — at_risk: ${atRiskMembers.length}, reminder: ${reminderMembers.length}`
      );

      // ── At Risk members → "don't lose your streak" ──────
      // These have finalStatus === "At Risk" (7-10 days inactive)
      const atRiskPromises = atRiskMembers.map(member => 
        sendPushToMember(member.id, member.name, "at_risk", ANON_KEY)
      );

      // ── Reminder members who are INACTIVE (not just At Risk) ──
      // reminderMembers includes At Risk too (needsReminder=true for 7+)
      // So we only process those with Inactive status here to avoid duplicates
      const inactiveReminders = reminderMembers.filter(
        (m) => m.finalStatus === "Inactive"
      );

      const reminderPromises = inactiveReminders.map(member =>
        sendPushToMember(member.id, member.name, "reminder", ANON_KEY)
      );

      // Execute all push requests concurrently
      await Promise.all([...atRiskPromises, ...reminderPromises]);

      console.log("[useNotificationTrigger] ✅ Notification trigger cycle complete");
    })();
  }, [atRiskMembers, reminderMembers]);
}
