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
  const header = "Name,Phone,Batch,Status,Last Payment,Due Date,Overdue Days,Member Since\n";
  const rows = members.map((m) =>
    [
      `"${m.name}"`,
      m.phone,
      m.batch,
      m.status,
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
