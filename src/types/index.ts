export type MembershipPlan = "monthly" | "6months" | "1year";

export const PLAN_DURATION_DAYS: Record<MembershipPlan, number> = {
  monthly: 30,
  "6months": 180,
  "1year": 365,
};

export interface Member {
  id: string;
  name: string;
  phone: string;
  membership_plan: MembershipPlan;
  last_payment_date: string | null;
  next_due_date: string | null;
  created_at: string;
}

export type PaymentMode = "UPI" | "Cash";

export interface Payment {
  id: string;
  member_id: string;
  amount: number;
  mode: string;
  date: string;
  note: string | null;
}

export type MemberStatus = "paid" | "due" | "overdue";

export interface MemberWithStatus extends Member {
  status: MemberStatus;
  dueDate: Date | null;
  overdueDays: number;
}
