export interface Member {
  id: string;
  name: string;
  phone: string;
  batch: Batch;
  last_payment_date: string | null;
  created_at: string;
}

export type Batch = "Morning" | "Evening";

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
