import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type VerifyResult =
  | { success: true; member: { id: string; name: string; phone: string; last_visit_date: string | null } }
  | { success: false; error: string; code?: "not_found" | "multiple_match" | "invalid_input" | "unauthenticated" | "db_error" };

export type CheckInResult =
  | { success: true; name: string; message: string }
  | { success: false; error: string; code?: "not_found" | "already_checked_in" | "db_error" };

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

/**
 * PART 1 + PART 4: Verify a member by id + last 4 digits of phone, scoped to current gym (user_id).
 * Handles 0 matches → "not_found" and >1 matches → "multiple_match".
 */
export async function verifyMember(member_id: string, last4digits: string): Promise<VerifyResult> {
  if (!/^\d{4}$/.test(last4digits)) {
    return { success: false, error: "Enter the last 4 digits of the phone number", code: "invalid_input" };
  }

  const { data: auth } = await supabase.auth.getUser();
  const gymId = auth.user?.id;
  if (!gymId) return { success: false, error: "Not authenticated", code: "unauthenticated" };

  // Indexed lookup: members_pkey on id + RLS user_id check; LIMIT 2 to detect duplicates cheaply.
  const { data, error } = await supabase
    .from("members")
    .select("id, name, phone, last_visit_date, user_id")
    .eq("id", member_id)
    .eq("user_id", gymId)
    .limit(2);

  if (error) return { success: false, error: error.message, code: "db_error" };
  if (!data || data.length === 0) return { success: false, error: "Member not found", code: "not_found" };
  if (data.length > 1) return { success: false, error: "Multiple matches found", code: "multiple_match" };

  const m = data[0];
  if (!m.phone.endsWith(last4digits)) {
    return { success: false, error: "Verification failed", code: "not_found" };
  }
  return { success: true, member: { id: m.id, name: m.name, phone: m.phone, last_visit_date: m.last_visit_date } };
}

/** PARTS 2-5 + 7: Check in a verified member. Validates existence, prevents duplicates, syncs both stores. */
export async function checkInMember(member_id: string): Promise<CheckInResult> {
  // PART 7: Validate member exists (indexed pkey lookup, RLS-scoped)
  const { data: member, error: fetchErr } = await supabase
    .from("members")
    .select("id, name, last_visit_date")
    .eq("id", member_id)
    .maybeSingle();

  if (fetchErr) return { success: false, error: fetchErr.message, code: "db_error" };
  if (!member) return { success: false, error: "Member not found", code: "not_found" };

  // PART 3 + 7: Duplicate check
  if (isToday(member.last_visit_date)) {
    return { success: false, error: "Already checked in today", code: "already_checked_in" };
  }

  const now = new Date().toISOString();

  // PART 3: Insert into check_ins history FIRST (awaited, not best-effort)
  const { error: insErr } = await supabase
    .from("check_ins")
    .insert({ member_id, checked_in_at: now });
  if (insErr) return { success: false, error: insErr.message, code: "db_error" };

  // PART 3 + 5: Sync members.last_visit_date with the check-in timestamp
  const { error: updErr } = await supabase
    .from("members")
    .update({ last_visit_date: now })
    .eq("id", member_id);
  if (updErr) return { success: false, error: updErr.message, code: "db_error" };

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
