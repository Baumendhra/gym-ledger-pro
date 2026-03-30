import type { Member, MemberStatus, MemberWithStatus, PLAN_DURATION_DAYS } from "@/types";
import { PLAN_DURATION_DAYS as planDays } from "@/types";

export function getMemberStatus(member: Member): MemberWithStatus {
  if (!member.last_payment_date) {
    return { ...member, status: "overdue", dueDate: null, overdueDays: 0 };
  }

  const lastPayment = new Date(member.last_payment_date);
  const dueDate = new Date(lastPayment);

  // Get duration based on membership plan
  const plan = member.membership_plan ?? "Monthly";
  const durationDays = planDays[plan] ?? 30;
  dueDate.setDate(dueDate.getDate() + durationDays);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffMs = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  let status: MemberStatus;
  if (diffDays < 0) {
    status = "overdue";
  } else if (diffDays <= 7) {
    status = "due";
  } else {
    status = "paid";
  }

  return {
    ...member,
    status,
    dueDate,
    overdueDays: diffDays < 0 ? Math.abs(diffDays) : 0,
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
