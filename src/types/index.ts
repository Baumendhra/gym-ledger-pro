export interface Member {
  id: string;
  name: string;
  phone: string;
  membership_plan: MembershipPlan;
  membership_type?: MembershipType;
  last_payment_date: string | null;
  next_due_date: string | null;
  created_at: string;
}

export type MembershipPlan = "monthly" | "3_months" | "6_months" | "yearly";
export type MembershipType = "Regular" | "Premium" | "Sessions";

export const PLAN_CONFIG: Record<MembershipPlan, { durationDays: number; fee: number; label: string }> = {
  monthly: { durationDays: 30, fee: 700, label: "Monthly" },
  "3_months": { durationDays: 90, fee: 2000, label: "3 Months" },
  "6_months": { durationDays: 180, fee: 4000, label: "6 Months" },
  yearly: { durationDays: 365, fee: 8000, label: "Yearly" },
};

export type PaymentMode = "UPI" | "Cash";

export interface Payment {
  id: string;
  member_id: string;
  amount: number;
  mode: string;
  date: string;
  note: string | null;
}

export type PaymentStatus = "paid" | "due" | "overdue";
export type ActivityStatus = "active" | "inactive";

export interface MemberWithStatus extends Member {
  paymentStatus: PaymentStatus;
  activityStatus: ActivityStatus;
  dueDate: Date | null;
  overdueDays: number;
  dueInDays: number;
}
