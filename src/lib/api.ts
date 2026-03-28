import type { Member, Payment } from "@/types";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  getMembers: () => request<Member[]>("/members"),
  createMember: (data: { name: string; phone: string }) =>
    request<Member>("/members", { method: "POST", body: JSON.stringify(data) }),
  getPayments: (memberId: string) =>
    request<Payment[]>(`/payments/${memberId}`),
  createPayment: (data: { member_id: string; amount: number; mode: string; note?: string }) =>
    request<Payment>("/payments", { method: "POST", body: JSON.stringify(data) }),
};
