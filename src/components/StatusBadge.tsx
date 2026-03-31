import { cn } from "@/lib/utils";
import type { PaymentStatus, ActivityStatus } from "@/types";

const paymentConfig: Record<PaymentStatus, { label: string; className: string }> = {
  paid: { label: "Paid", className: "bg-status-paid-bg text-status-paid" },
  due: { label: "Due Soon", className: "bg-status-due-bg text-status-due" },
  overdue: { label: "Overdue", className: "bg-status-overdue-bg text-status-overdue" },
};

const activityConfig: Record<ActivityStatus, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500" },
  inactive: { label: "Inactive", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-500" },
};

export function StatusBadge({ 
  paymentStatus, 
  activityStatus,
  showDual = true 
}: { 
  paymentStatus: PaymentStatus;
  activityStatus: ActivityStatus;
  showDual?: boolean;
}) {
  const pConfig = paymentConfig[paymentStatus];
  const aConfig = activityConfig[activityStatus];

  if (!showDual) {
    return (
      <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold", pConfig.className)}>
        {pConfig.label}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider", aConfig.className)}>
        <span className="mr-1 h-1.5 w-1.5 rounded-full bg-current" />
        {aConfig.label}
      </span>
      <span className="text-muted-foreground text-xs">|</span>
      <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider", pConfig.className)}>
        <span className="mr-1 h-1.5 w-1.5 rounded-full bg-current" />
        {pConfig.label}
      </span>
    </div>
  );
}
