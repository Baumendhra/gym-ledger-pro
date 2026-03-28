import type { Member, MemberStatus, MemberWithStatus } from "@/types";

export function getMemberStatus(member: Member): MemberWithStatus {
  if (!member.last_payment_date) {
    return { ...member, status: "overdue", dueDate: null, overdueDays: 0 };
  }

  const lastPayment = new Date(member.last_payment_date);
  const dueDate = new Date(lastPayment);
  dueDate.setDate(dueDate.getDate() + 30);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const diffMs = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  let status: MemberStatus;
  if (diffDays < 0) {
    status = "overdue";
  } else if (diffDays <= 3) {
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
