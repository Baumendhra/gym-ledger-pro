import type { Member, Payment } from "@/types";

// Mock data for demo / when backend is unavailable
const today = new Date();

function daysAgo(n: number): string {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

export const mockMembers: Member[] = [
  { _id: "1", name: "Ravi Kumar", phone: "9876543210", last_payment_date: daysAgo(5), createdAt: daysAgo(90) },
  { _id: "2", name: "Amit Sharma", phone: "9876543211", last_payment_date: daysAgo(28), createdAt: daysAgo(120) },
  { _id: "3", name: "Priya Singh", phone: "9876543212", last_payment_date: daysAgo(35), createdAt: daysAgo(60) },
  { _id: "4", name: "Suresh Patel", phone: "9876543213", last_payment_date: daysAgo(15), createdAt: daysAgo(200) },
  { _id: "5", name: "Neha Gupta", phone: "9876543214", last_payment_date: daysAgo(45), createdAt: daysAgo(150) },
  { _id: "6", name: "Vikram Yadav", phone: "9876543215", last_payment_date: daysAgo(2), createdAt: daysAgo(30) },
  { _id: "7", name: "Anjali Verma", phone: "9876543216", last_payment_date: null, createdAt: daysAgo(10) },
  { _id: "8", name: "Deepak Joshi", phone: "9876543217", last_payment_date: daysAgo(29), createdAt: daysAgo(180) },
];

export const mockPayments: Payment[] = [
  { _id: "p1", member_id: "1", amount: 1000, mode: "UPI", date: daysAgo(5), note: "Ravi Kumar - March" },
  { _id: "p2", member_id: "2", amount: 1000, mode: "Cash", date: daysAgo(28), note: "Amit Sharma - Feb" },
  { _id: "p3", member_id: "4", amount: 1500, mode: "UPI", date: daysAgo(15), note: "Suresh Patel - March" },
  { _id: "p4", member_id: "6", amount: 500, mode: "Cash", date: daysAgo(2), note: "Vikram Yadav - March" },
  { _id: "p5", member_id: "1", amount: 1000, mode: "Cash", date: daysAgo(35), note: "Ravi Kumar - Feb" },
];

// Simple in-memory store for demo mode
let members = [...mockMembers];
let payments = [...mockPayments];

export const mockApi = {
  getMembers: async (): Promise<Member[]> => members,
  createMember: async (data: { name: string; phone: string }): Promise<Member> => {
    const m: Member = {
      _id: String(Date.now()),
      name: data.name,
      phone: data.phone,
      last_payment_date: null,
      createdAt: new Date().toISOString(),
    };
    members = [m, ...members];
    return m;
  },
  getPayments: async (memberId: string): Promise<Payment[]> =>
    payments.filter((p) => p.member_id === memberId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  createPayment: async (data: { member_id: string; amount: number; mode: string; note?: string }): Promise<Payment> => {
    const p: Payment = {
      _id: String(Date.now()),
      member_id: data.member_id,
      amount: data.amount,
      mode: data.mode as "UPI" | "Cash",
      date: new Date().toISOString(),
      note: data.note || "",
    };
    payments = [p, ...payments];
    // Update member's last_payment_date
    members = members.map((m) =>
      m._id === data.member_id ? { ...m, last_payment_date: new Date().toISOString() } : m
    );
    return p;
  },
};
