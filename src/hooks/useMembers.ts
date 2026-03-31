import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMemberStatus } from "@/lib/status";
import { useAuth } from "@/hooks/useAuth";
import { type Member, type Payment, type MembershipPlan, PLAN_CONFIG } from "@/types";


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
  return useMutation({
    mutationFn: async (data: { name: string; phone: string; membership_plan: MembershipPlan }) => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Authentication required to add members");

      const { data: member, error } = await supabase
        .from("members")
        .insert({
          name: data.name,
          phone: data.phone,
          membership_plan: data.membership_plan,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error("Supabase insert error:", error);
        throw error;
      }
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

      // Fetch member's plan
      const { data: memberData } = await supabase
        .from("members")
        .select("membership_plan")
        .eq("id", data.member_id)
        .single();

      const plan = (memberData?.membership_plan as MembershipPlan) || "monthly";
      const durationDays = PLAN_CONFIG[plan]?.durationDays || 30;

      const lastPaymentDate = new Date();
      const nextDueDate = new Date(lastPaymentDate);
      nextDueDate.setDate(nextDueDate.getDate() + durationDays);

      const { error: updateError } = await supabase
        .from("members")
        .update({ 
          last_payment_date: lastPaymentDate.toISOString(),
          next_due_date: nextDueDate.toISOString()
        })
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

export function useDeleteMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => {
      // Delete all related payment records first to avoid orphan rows
      const { error: paymentsError } = await supabase
        .from("payments")
        .delete()
        .eq("member_id", memberId);
      if (paymentsError) throw paymentsError;

      // Now delete the member
      const { error: memberError } = await supabase
        .from("members")
        .delete()
        .eq("id", memberId);
      if (memberError) throw memberError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
    },
  });
}
