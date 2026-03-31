import type { Member, MemberWithStatus, PaymentStatus, ActivityStatus, PLAN_CONFIG } from "@/types";
import { PLAN_CONFIG as planConfig } from "@/types";

export function getMemberStatus(member: Member): MemberWithStatus {
  const plan = member.membership_plan || "monthly";
  const durationDays = planConfig[plan]?.durationDays || 30;

  let dueDate: Date | null = null;
  if (member.next_due_date) {
    dueDate = new Date(member.next_due_date);
  } else if (member.last_payment_date) {
    // Fallback if not yet set by migration
    dueDate = new Date(member.last_payment_date);
    dueDate.setDate(dueDate.getDate() + durationDays);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!dueDate) {
    return { 
      ...member, 
      paymentStatus: "overdue", 
      activityStatus: "inactive",
      dueDate: null, 
      overdueDays: 0,
      dueInDays: 0,
    };
  }

  const diffMs = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  let paymentStatus: PaymentStatus = "overdue";
  let activityStatus: ActivityStatus = "inactive";

  if (diffDays < 0) {
    paymentStatus = "overdue";
    activityStatus = "inactive";
  } else {
    activityStatus = "active";
    if (diffDays <= 3) {
      paymentStatus = "due";
    } else {
      paymentStatus = "paid";
    }
  }

  return {
    ...member,
    paymentStatus,
    activityStatus,
    dueDate,
    overdueDays: diffDays < 0 ? Math.abs(diffDays) : 0,
    dueInDays: diffDays > 0 ? diffDays : 0,
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
