import type { Member, Payment } from "@/types";

// Mock data for demo / when backend is unavailable
const today = new Date();

function daysAgo(n: number): string {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

export const mockMembers: Member[] = [
  { id: "1", name: "Ravi Kumar", phone: "9876543210", membership_plan: "monthly", last_payment_date: daysAgo(5), created_at: daysAgo(90) },
  { id: "2", name: "Amit Sharma", phone: "9876543211", membership_plan: "monthly", last_payment_date: daysAgo(28), created_at: daysAgo(120) },
  { id: "3", name: "Priya Singh", phone: "9876543212", membership_plan: "6months", last_payment_date: daysAgo(35), created_at: daysAgo(60) },
  { id: "4", name: "Suresh Patel", phone: "9876543213", membership_plan: "1year", last_payment_date: daysAgo(15), created_at: daysAgo(200) },
  { id: "5", name: "Neha Gupta", phone: "9876543214", membership_plan: "monthly", last_payment_date: daysAgo(45), created_at: daysAgo(150) },
  { id: "6", name: "Vikram Yadav", phone: "9876543215", membership_plan: "monthly", last_payment_date: daysAgo(2), created_at: daysAgo(30) },
  { id: "7", name: "Anjali Verma", phone: "9876543216", membership_plan: "monthly", last_payment_date: null, created_at: daysAgo(10) },
  { id: "8", name: "Deepak Joshi", phone: "9876543217", membership_plan: "6months", last_payment_date: daysAgo(29), created_at: daysAgo(180) },
];

export const mockPayments: Payment[] = [
  { id: "p1", member_id: "1", amount: 1000, mode: "UPI", date: daysAgo(5), note: "Ravi Kumar - March" },
  { id: "p2", member_id: "2", amount: 1000, mode: "Cash", date: daysAgo(28), note: "Amit Sharma - Feb" },
  { id: "p3", member_id: "4", amount: 1500, mode: "UPI", date: daysAgo(15), note: "Suresh Patel - March" },
  { id: "p4", member_id: "6", amount: 500, mode: "Cash", date: daysAgo(2), note: "Vikram Yadav - March" },
  { id: "p5", member_id: "1", amount: 1000, mode: "Cash", date: daysAgo(35), note: "Ravi Kumar - Feb" },
];

// Simple in-memory store for demo mode
let members = [...mockMembers];
let payments = [...mockPayments];

export const mockApi = {
  getMembers: async (): Promise<Member[]> => members,
  createMember: async (data: { name: string; phone: string }): Promise<Member> => {
    const m: Member = {
      id: String(Date.now()),
      name: data.name,
      phone: data.phone,
      last_payment_date: null,
      created_at: new Date().toISOString(),
    };
    members = [m, ...members];
    return m;
  },
  getPayments: async (memberId: string): Promise<Payment[]> =>
    payments.filter((p) => p.member_id === memberId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  createPayment: async (data: { member_id: string; amount: number; mode: string; note?: string }): Promise<Payment> => {
    const p: Payment = {
      id: String(Date.now()),
      member_id: data.member_id,
      amount: data.amount,
      mode: data.mode,
      date: new Date().toISOString(),
      note: data.note || "",
    };
    payments = [p, ...payments];
    members = members.map((m) =>
      m.id === data.member_id ? { ...m, last_payment_date: new Date().toISOString() } : m
    );
    return p;
  },
};
