export interface Member {
  _id: string;
  name: string;
  phone: string;
  last_payment_date: string | null;
  createdAt: string;
}

export type PaymentMode = "UPI" | "Cash";

export interface Payment {
  _id: string;
  member_id: string;
  amount: number;
  mode: PaymentMode;
  date: string;
  note: string;
}

export type MemberStatus = "paid" | "due" | "overdue";

export interface MemberWithStatus extends Member {
  status: MemberStatus;
  dueDate: Date | null;
  overdueDays: number;
}
