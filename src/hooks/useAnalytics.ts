import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  return useQuery({
    queryKey: ["all_payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select(`
          *,
          member:members (
            name,
            phone,
            membership_plan,
            package_type
          )
        `)
        .order("date", { ascending: false });

      if (error) throw error;
      
      // Cast the result, as Supabase typings might not accurately reflect joined tables correctly without generated types
      return (data as any) as PaymentWithMember[];
    },
  });
}
