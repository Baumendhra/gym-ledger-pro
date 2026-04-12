import type { MemberWithStatus, PackageType, MembershipPlan } from "@/types";
import { PLAN_CONFIG } from "@/types";
import { StatusBadge } from "./StatusBadge";
import { formatDate } from "@/lib/status";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface MemberCardProps {
  member: MemberWithStatus;
  onClick?: () => void;
  navigateToPayment?: boolean;
}

export function MemberCard({ member, onClick, navigateToPayment }: MemberCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) onClick();
    else if (navigateToPayment) navigate(`/payment?memberId=${member.id}`);
    else navigate(`/member/${member.id}`);
  };

  const pkg = (member.package_type as PackageType) || "strengthening";
  const plan = (member.membership_plan as MembershipPlan) || "1_month";
  const planLabel = PLAN_CONFIG[pkg]?.[plan]?.label || member.membership_plan;

  return (
    <button
      onClick={handleClick}
      className="w-full flex items-center gap-3 p-4 rounded-lg glass-card hover:shadow-md transition-all active:scale-[0.98] text-left animate-slide-up"
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-display font-bold text-sm">
        {member.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="font-semibold truncate leading-tight">{member.name}</p>
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
          {pkg} • {planLabel}
        </p>
        <p className="text-xs text-muted-foreground">
          {member.paymentStatus === "paid" && <span className="text-green-600 font-medium">Paid till {formatDate(member.dueDate)}</span>}
          {member.paymentStatus === "due" && <span className="text-orange-600 font-medium">Due in {member.dueInDays} days</span>}
          {member.paymentStatus === "overdue" && <span className="text-red-500 font-medium">Overdue by {member.overdueDays} days</span>}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge paymentStatus={member.paymentStatus} activityStatus={member.activityStatus} />
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </button>
  );
}
