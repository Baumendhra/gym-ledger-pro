import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Payment, MembershipPlan, PackageType } from "@/types";

export interface PaymentWithMember extends Payment {
  member: {
    name: string;
    phone: string;
    membership_plan: MembershipPlan | string;
    package_type: PackageType | string;
  } | null;
}

export function useAllPayments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["all_payments", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("payments")
        .select(`
          id, amount, date, mode, note, package_type, membership_plan, member_id,
          member:members!inner (
            name,
            phone,
            membership_plan,
            package_type,
            user_id
          )
        `)
        .eq("members.user_id", user.id)
        .order("date", { ascending: false });

      if (error) throw error;
      
      // Cast the result, as Supabase typings might not accurately reflect joined tables correctly without generated types
      return (data as any) as PaymentWithMember[];
    },
    enabled: !!user?.id,
  });
}
