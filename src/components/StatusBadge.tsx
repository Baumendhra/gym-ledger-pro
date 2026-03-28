import { cn } from "@/lib/utils";
import type { MemberStatus } from "@/types";

const statusConfig: Record<MemberStatus, { label: string; className: string }> = {
  paid: { label: "Paid", className: "bg-status-paid-bg text-status-paid" },
  due: { label: "Due Soon", className: "bg-status-due-bg text-status-due" },
  overdue: { label: "Overdue", className: "bg-status-overdue-bg text-status-overdue" },
};

export function StatusBadge({ status }: { status: MemberStatus }) {
  const config = statusConfig[status];
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold", config.className)}>
      {config.label}
    </span>
  );
}
