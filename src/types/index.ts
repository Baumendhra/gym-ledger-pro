export interface Member {
  id: string;
  name: string;
  phone: string;
  package_type: PackageType;
  membership_plan: MembershipPlan;
  membership_type?: MembershipType;
  last_payment_date: string | null;
  next_due_date: string | null;
  last_visit_date: string | null;
  created_at: string;
}

export type PackageType = "strengthening" | "cardio";
export type MembershipPlan = "1_month" | "3_months" | "6_months" | "1_year";
export type MembershipType = "Regular" | "Premium" | "Sessions";

export const PLAN_CONFIG: Record<PackageType, Record<MembershipPlan, { durationDays: number; fee: number; label: string }>> = {
  strengthening: {
    "1_month": { durationDays: 30, fee: 699, label: "1 Month" },
    "3_months": { durationDays: 90, fee: 1799, label: "3 Months" },
    "6_months": { durationDays: 200, fee: 3499, label: "6 Months" }, // 180 + 20 extra
    "1_year": { durationDays: 395, fee: 6999, label: "1 Year" }, // 365 + 30 extra
  },
  cardio: {
    "1_month": { durationDays: 30, fee: 999, label: "1 Month" },
    "3_months": { durationDays: 90, fee: 2499, label: "3 Months" },
    "6_months": { durationDays: 200, fee: 4999, label: "6 Months" }, // 180 + 20 extra
    "1_year": { durationDays: 385, fee: 8999, label: "1 Year" }, // 365 + 20 extra
  },
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
  finalStatus: "Active" | "At Risk" | "Inactive" | "New";
  inactiveReason: string | null;
  dueDate: Date | null;
  overdueDays: number;
  dueInDays: number;
  hasDues: boolean;
  isOverdue10Days: boolean;
  totalCheckins: number;
  needsReminder: boolean;
  daysSinceVisit: number | null;
}
