import type { Member, MemberWithStatus, PaymentStatus, PackageType, MembershipPlan } from "@/types";
import { PLAN_CONFIG as planConfig } from "@/types";

// ── Attendance helpers ────────────────────────────────────────────────────────

/** Returns whole days between today (midnight) and last_visit_date. null = never visited. */
export function daysSinceVisit(lastVisitDate: string | null): number | null {
  if (!lastVisitDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const last = new Date(lastVisitDate);
  last.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)));
}

/** Human-readable visit age. */
export function formatVisitAge(days: number | null): string {
  if (days === null) return "Not checked in yet";
  if (days === 0)    return "Today";
  if (days === 1)    return "Yesterday";
  return `${days} days ago`;
}

// ── Three-tier status from attendance ─────────────────────────────────────────
//   null        → Active   (new / existing member, no visit recorded)
//   0 – 6 days  → Active
//   7 – 10 days → At Risk  + reminder
//   > 10 days   → Inactive + reminder
function attendanceStatus(
  days: number | null
): { finalStatus: "Active" | "At Risk" | "Inactive" | "New"; needsReminder: boolean; inactiveReason: string | null } {
  if (days === null) {
    return { finalStatus: "New", needsReminder: false, inactiveReason: null };
  }
  if (days <= 6) {
    return { finalStatus: "Active", needsReminder: false, inactiveReason: null };
  }
  if (days <= 10) {
    return { finalStatus: "At Risk", needsReminder: true, inactiveReason: `No visit for ${days} days` };
  }
  return { finalStatus: "Inactive", needsReminder: true, inactiveReason: `Inactive for ${days} days` };
}

// ── Core getMemberStatus ──────────────────────────────────────────────────────
export function getMemberStatus(member: any): MemberWithStatus {
  const pkg          = (member.package_type as PackageType) || "strengthening";
  const plan         = (member.membership_plan as MembershipPlan) || "1_month";
  const durationDays = planConfig[pkg]?.[plan]?.durationDays || 30;

  // ── Payment fields (kept for payment badges / CSV — not used for finalStatus) ──
  let dueDate: Date | null = null;
  if (member.next_due_date) {
    dueDate = new Date(member.next_due_date);
  } else if (member.last_payment_date) {
    dueDate = new Date(member.last_payment_date);
    dueDate.setDate(dueDate.getDate() + durationDays);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const memberAny = member as any;
  let totalCheckins = 0;
  if (Array.isArray(memberAny.check_ins) && memberAny.check_ins.length > 0) {
    totalCheckins = memberAny.check_ins[0]?.count || 0;
  } else if (typeof memberAny.check_ins === "number") {
    totalCheckins = memberAny.check_ins;
  }

  const diffMs   = dueDate ? dueDate.getTime() - today.getTime() : null;
  const diffDays = diffMs !== null ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) : null;

  let paymentStatus: PaymentStatus = "overdue";
  if (diffDays !== null) {
    if (diffDays < 0)       paymentStatus = "overdue";
    else if (diffDays <= 3) paymentStatus = "due";
    else                    paymentStatus = "paid";
  }

  const hasDues         = diffDays !== null ? diffDays < 0   : true;
  const isOverdue10Days = diffDays !== null ? diffDays <= -10 : true;

  // ── Attendance-only finalStatus ───────────────────────────────────────────
  const visitDays                                   = daysSinceVisit(member.last_visit_date);
  const { finalStatus, needsReminder, inactiveReason } = attendanceStatus(visitDays);

  return {
    ...member,
    paymentStatus,
    finalStatus,
    inactiveReason,
    dueDate,
    overdueDays:   diffDays !== null && diffDays < 0 ? Math.abs(diffDays) : 0,
    dueInDays:     diffDays !== null && diffDays > 0 ? diffDays : 0,
    hasDues,
    isOverdue10Days,
    totalCheckins,
    needsReminder,
    daysSinceVisit: visitDays,
  };
}

export function formatDate(date: string | Date | null): string {
  if (!date) return "Never";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}
