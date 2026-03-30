export interface Member {
  id: string;
  name: string;
  phone: string;
  membership_plan: MembershipPlan;
  membership_type?: MembershipType;
  last_payment_date: string | null;
  created_at: string;
}

export type MembershipPlan = "Monthly" | "6 Months" | "1 Year";
export type MembershipType = "Monthly" | "6 Months" | "1 Year";

// Duration in days for each plan
export const PLAN_DURATION_DAYS: Record<MembershipPlan, number> = {
  "Monthly": 30,
  "6 Months": 180,
  "1 Year": 365,
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

export type MemberStatus = "paid" | "due" | "overdue";

export interface MemberWithStatus extends Member {
  status: MemberStatus;
  dueDate: Date | null;
  overdueDays: number;
}
