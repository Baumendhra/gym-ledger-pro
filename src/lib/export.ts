import type { MemberWithStatus } from "@/types";
import type { Payment } from "@/types";
import { formatDate, formatCurrency, daysSinceVisit, formatVisitAge } from "@/lib/status";

function downloadCSV(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportMembersCSV(members: MemberWithStatus[]) {
  const header = "Name,Phone,Membership Plan,Status,Last Payment,Due Date,Overdue Days,Member Since\n";
  const rows = members.map((m) =>
    [
      `"${m.name}"`,
      m.phone,
      m.membership_plan ?? "monthly",
      `${m.finalStatus} / ${m.paymentStatus}`,
      formatDate(m.last_payment_date),
      m.dueDate ? formatDate(m.dueDate) : "N/A",
      m.overdueDays,
      formatDate(m.created_at),
    ].join(",")
  ).join("\n");
  downloadCSV(`gymkhata-members-${new Date().toISOString().slice(0, 10)}.csv`, header + rows);
}

export function exportPaymentsCSV(payments: Payment[], memberName: string) {
  const header = "Date,Amount,Mode,Note\n";
  const rows = payments.map((p) =>
    [
      formatDate(p.date),
      p.amount,
      p.mode,
      `"${p.note || ""}"`,
    ].join(",")
  ).join("\n");
  downloadCSV(`gymkhata-payments-${memberName.replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`, header + rows);
}

export function exportMonthlyCSV(payments: any[], monthLabel: string) {
  const header = "Member Name,Phone,Membership Plan,Package Type,Amount,Payment Mode,Payment Date\n";
  const rows = payments.map((p) =>
    [
      `"${p.member?.name || "Unknown"}"`,
      p.member?.phone || "-",
      p.member?.membership_plan || "-",
      p.member?.package_type || "-",
      p.amount,
      p.mode,
      formatDate(p.date),
    ].join(",")
  ).join("\n");
  
  // Create safe filename (e.g. "January 2026" -> "January-2026")
  const safeMonth = monthLabel.replace(/\s+/g, "-");
  
  downloadCSV(`gymkhata-payments-${safeMonth}.csv`, header + rows);
}

export function exportDailyCSV(members: MemberWithStatus[], onlyToday: boolean) {
  const todayStr = new Date().toISOString().slice(0, 10);
  
  const filtered = onlyToday 
    ? members.filter(m => m.last_visit_date && m.last_visit_date.slice(0, 10) === todayStr)
    : members;

  const header = "Name,Phone,Last Visit Date,Membership End Date,Status,Dues Status\n";
  const rows = filtered.map((m) =>
    [
      `"${m.name}"`,
      m.phone,
      formatDate(m.last_visit_date),
      m.dueDate ? formatDate(m.dueDate) : "N/A",
      m.finalStatus,
      m.hasDues ? (m.isOverdue10Days ? "Overdue" : "Due") : "Paid"
    ].join(",")
  ).join("\n");
  
  downloadCSV(`gym-report-${todayStr}.csv`, header + rows);
}

export function exportMonthlyMembersCSV(members: MemberWithStatus[]) {
  const header = "Member Name,Total Check-ins,Last Visit,Membership Status,Dues Status\n";
  const rows = members.map((m) =>
    [
      `"${m.name}"`,
      m.totalCheckins || 0,
      formatDate(m.last_visit_date),
      m.finalStatus,
      m.hasDues ? (m.isOverdue10Days ? "Overdue" : "Due") : "Paid"
    ].join(",")
  ).join("\n");
  
  const monthStr = new Date().toISOString().slice(0, 7);
  downloadCSV(`gym-report-${monthStr}.csv`, header + rows);
}

/** Global attendance report — one row per member */
export function exportAttendanceCSV(members: MemberWithStatus[]) {
  const header = "Name,Phone,Last Visit,Days Since Visit,Status,Reminder Needed\n";
  const today  = new Date().toISOString().slice(0, 10);
  const rows   = members.map((m) => {
    const days = daysSinceVisit(m.last_visit_date);
    return [
      `"${m.name}"`,
      m.phone,
      m.last_visit_date ? formatDate(m.last_visit_date) : "Never",
      days !== null ? days : "—",
      m.finalStatus,
      m.needsReminder ? "Yes" : "No",
    ].join(",");
  }).join("\n");
  downloadCSV(`attendance-${today}.csv`, header + rows);
}

/** Per-member attendance — one row per check_in */
export function exportMemberAttendanceCSV(
  checkIns: { id: string; member_id: string; checked_in_at: string }[],
  memberName: string
) {
  const header = "Date,Time\n";
  const rows   = checkIns.map((c) => {
    const d = new Date(c.checked_in_at);
    return [
      d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
      d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    ].join(",");
  }).join("\n");
  const safeName = memberName.replace(/\s+/g, "-").toLowerCase();
  downloadCSV(`attendance-${safeName}.csv`, header + rows);
}

