import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type VerifyResult =
  | { success: true; member: { id: string; name: string; phone: string; last_visit_date: string | null } }
  | { success: false; error: string };

export type CheckInResult =
  | { success: true; name: string; message: string }
  | { success: false; error: string };

function isToday(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/** PART 1: Verify a member by id + last 4 digits of phone */
export async function verifyMember(member_id: string, last4digits: string): Promise<VerifyResult> {
  if (!/^\d{4}$/.test(last4digits)) {
    return { success: false, error: "Enter the last 4 digits of the phone number" };
  }
  const { data, error } = await supabase
    .from("members")
    .select("id, name, phone, last_visit_date")
    .eq("id", member_id)
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: "Member not found" };
  if (!data.phone.endsWith(last4digits)) {
    return { success: false, error: "Verification failed" };
  }
  return { success: true, member: data as VerifyResult extends { success: true; member: infer M } ? M : never };
}

/** PARTS 2-5: Check in a verified member */
export async function checkInMember(member_id: string): Promise<CheckInResult> {
  // Fast indexed lookup by id (no joins)
  const { data: member, error: fetchErr } = await supabase
    .from("members")
    .select("id, name, last_visit_date")
    .eq("id", member_id)
    .maybeSingle();

  if (fetchErr) return { success: false, error: fetchErr.message };
  if (!member) return { success: false, error: "Member not found" };

  // PART 3: Duplicate check
  if (isToday(member.last_visit_date)) {
    return { success: false, error: "Already checked in today" };
  }

  const now = new Date().toISOString();

  // PART 4: Update last visit timestamp
  const { error: updErr } = await supabase
    .from("members")
    .update({ last_visit_date: now })
    .eq("id", member_id);
  if (updErr) return { success: false, error: updErr.message };

  // History row (best-effort, non-blocking failure)
  await supabase.from("check_ins").insert({ member_id, checked_in_at: now });

  // PART 5: Response
  return { success: true, name: member.name, message: "Checked in" };
}

export function useCheckIn() {
  return useMutation({ mutationFn: checkInMember });
}

export function useVerifyMember() {
  return useMutation({
    mutationFn: ({ member_id, last4digits }: { member_id: string; last4digits: string }) =>
      verifyMember(member_id, last4digits),
  });
}
