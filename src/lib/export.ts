import type { MemberWithStatus } from "@/types";
import type { Payment } from "@/types";
import { formatDate, formatCurrency } from "@/lib/status";

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
      `${m.activityStatus} / ${m.paymentStatus}`,
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
