import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMemberStatus } from "@/lib/status";
import { useAuth } from "@/hooks/useAuth";
import type { Member, Payment } from "@/types";

export function useMembers() {
  return useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as Member[]).map(getMemberStatus);
    },
  });
}

export function useCreateMember() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (data: { name: string; phone: string }) => {
      const { data: member, error } = await supabase
        .from("members")
        .insert({ name: data.name, phone: data.phone, user_id: user?.id })
        .select()
        .single();
      if (error) throw error;
      return member;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members"] }),
  });
}

export function usePayments(memberId: string) {
  return useQuery({
    queryKey: ["payments", memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("member_id", memberId)
        .order("date", { ascending: false });
      if (error) throw error;
      return data as Payment[];
    },
    enabled: !!memberId,
  });
}

export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { member_id: string; amount: number; mode: string; note?: string }) => {
      const { data: payment, error } = await supabase
        .from("payments")
        .insert({
          member_id: data.member_id,
          amount: data.amount,
          mode: data.mode,
          note: data.note || "",
        })
        .select()
        .single();
      if (error) throw error;

      const { error: updateError } = await supabase
        .from("members")
        .update({ last_payment_date: new Date().toISOString() })
        .eq("id", data.member_id);
      if (updateError) throw updateError;

      return payment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
    },
  });
}
