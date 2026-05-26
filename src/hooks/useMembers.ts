import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMemberStatus } from "@/lib/status";
import { useAuth } from "@/hooks/useAuth";
import { type Member, type Payment, type MembershipPlan, type PackageType, PLAN_CONFIG } from "@/types";

export function useMembers() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["members", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("members")
        .select("id, name, phone, package_type, membership_plan, last_visit_date, last_payment_date, next_due_date, notes, profile_image_url, created_at, user_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any[]).map(getMemberStatus);
    },
    enabled: !!user?.id,
  });
}

/** Updates the notes field for a single member. */
export function useUpdateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, notes }: { memberId: string; notes: string }) => {
      const { error } = await supabase
        .from("members")
        .update({ notes })
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members"] }),
  });
}

export function useUpdateProfileImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, file }: { memberId: string; file: File }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${memberId}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('member_profiles')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('member_profiles')
        .getPublicUrl(filePath);

      // Append timestamp to prevent browser caching
      const urlWithCacheBuster = `${publicUrl}?v=${Date.now()}`;

      // Update members table
      const { error: updateError } = await supabase
        .from('members')
        .update({ profile_image_url: urlWithCacheBuster })
        .eq('id', memberId);

      if (updateError) throw updateError;
      
      return urlWithCacheBuster;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members"] }),
  });
}

export function useRemoveProfileImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => {
      const { data: member } = await supabase
        .from("members")
        .select("profile_image_url")
        .eq("id", memberId)
        .single();
        
      if (member?.profile_image_url) {
        const urlParts = member.profile_image_url.split('/');
        let fileName = urlParts[urlParts.length - 1];
        if (fileName.includes('?')) {
          fileName = fileName.split('?')[0];
        }
        if (fileName) {
          await supabase.storage.from('member_profiles').remove([fileName]);
        }
      }

      const { error } = await supabase
        .from("members")
        .update({ profile_image_url: null })
        .eq("id", memberId);

      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members"] }),
  });
}

export function useCreateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; phone: string; package_type: string; membership_plan: string }) => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Authentication required to add members");

      const { data: member, error } = await supabase
        .from("members")
        .insert({
          name: data.name,
          phone: data.phone,
          package_type: data.package_type,
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
        .select("id, member_id, amount, mode, note, date, package_type, membership_plan")
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
    mutationFn: async (data: { member_id: string; amount: number; mode: string; note?: string; date?: string }) => {
      const paymentDate = data.date ? new Date(data.date) : new Date();
      
      const { data: payment, error } = await supabase
        .from("payments")
        .insert({
          member_id: data.member_id,
          amount: data.amount,
          mode: data.mode,
          note: data.note || "",
          date: paymentDate.toISOString(),
        })
        .select()
        .single();
      if (error) throw error;

      // Fetch member's plan
      const { data: memberData } = await supabase
        .from("members")
        .select("package_type, membership_plan")
        .eq("id", data.member_id)
        .single();

      const pkg = ((memberData as any)?.package_type as PackageType) || "strengthening";
      const plan = ((memberData as any)?.membership_plan as MembershipPlan) || "1_month";
      const durationDays = PLAN_CONFIG[pkg]?.[plan]?.durationDays || 30;

      const nextDueDate = new Date(paymentDate);
      nextDueDate.setDate(nextDueDate.getDate() + durationDays);

      const { error: updateError } = await supabase
        .from("members")
        .update({ 
          last_payment_date: paymentDate.toISOString(),
          next_due_date: nextDueDate.toISOString(),
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

      // Delete the profile image if it exists
      const { data: member } = await supabase
        .from("members")
        .select("profile_image_url")
        .eq("id", memberId)
        .single();
        
      if (member?.profile_image_url) {
        // Extract the filename from the URL
        const urlParts = member.profile_image_url.split('/');
        let fileName = urlParts[urlParts.length - 1];
        if (fileName.includes('?')) {
          fileName = fileName.split('?')[0];
        }
        if (fileName) {
          await supabase.storage.from('member_profiles').remove([fileName]);
        }
      }

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
