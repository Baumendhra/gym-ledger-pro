import type { MemberWithStatus, PackageType, MembershipPlan } from "@/types";
import { PLAN_CONFIG } from "@/types";
import { StatusBadge } from "./StatusBadge";
import { formatVisitAge } from "@/lib/status";
import { ChevronRight, MessageCircle, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface MemberCardProps {
  member: MemberWithStatus;
  onClick?: () => void;
  navigateToPayment?: boolean;
}

/** Sends a WhatsApp reminder for members who haven't visited in a while. */
function sendWhatsAppReminder(member: MemberWithStatus) {
  const raw    = String(member.phone).replace(/\D/g, "");
  const phone  = raw.startsWith("91") ? raw : `91${raw}`;
  const days   = member.daysSinceVisit;
  const msg    = days !== null
    ? `Hi ${member.name}, we noticed you haven't visited the gym for ${days} day${days === 1 ? "" : "s"}. We'd love to see you back! 💪`
    : `Hi ${member.name}, we miss you at the gym! Come back soon. 💪`;
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
}

export function MemberCard({ member, onClick, navigateToPayment }: MemberCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) onClick();
    else if (navigateToPayment) navigate(`/payment?memberId=${member.id}`);
    else navigate(`/member/${member.id}`);
  };

  const pkg       = (member.package_type as PackageType) || "strengthening";
  const plan      = (member.membership_plan as MembershipPlan) || "1_month";
  const planLabel = PLAN_CONFIG[pkg]?.[plan]?.label || member.membership_plan;

  const visitDays = member.daysSinceVisit;
  const visitText = formatVisitAge(visitDays);

  // Row highlight based on status
  const rowHighlight =
    member.finalStatus === "Inactive" ? "border-red-500/20 bg-red-500/5"
    : member.finalStatus === "At Risk" ? "border-yellow-500/20 bg-yellow-500/5"
    : "";

  // Visit text colour
  const visitColor =
    visitDays === null    ? "text-muted-foreground italic"
    : visitDays === 0     ? "text-green-600 dark:text-green-400 font-semibold"
    : visitDays <= 6      ? "text-emerald-600 dark:text-emerald-400"
    : visitDays <= 10     ? "text-yellow-600 dark:text-yellow-400 font-semibold"
    : "text-red-500 dark:text-red-400 font-semibold";

  return (
    <div className={`w-full rounded-lg glass-card transition-all animate-slide-up border ${rowHighlight}`}>
      <button
        onClick={handleClick}
        className="w-full flex items-center gap-3 p-4 text-left hover:opacity-90 active:scale-[0.98] transition-all"
      >
        {/* Avatar */}
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-display font-bold text-sm">
          {member.name.charAt(0).toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-semibold truncate leading-tight">{member.name}</p>
            {member.needsReminder && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
                <Bell className="w-2.5 h-2.5" /> Reminder
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
            {pkg} • {planLabel}
          </p>

          {/* Last visit + payment mini-badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs ${visitColor}`}>
              Last visit: {visitText}
            </span>
            {member.isOverdue10Days ? (
              <span className="text-[10px] bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded font-semibold">Overdue</span>
            ) : member.hasDues ? (
              <span className="text-[10px] bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 px-1.5 py-0.5 rounded font-semibold">Dues</span>
            ) : member.paymentStatus === "due" ? (
              <span className="text-[10px] bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0.5 rounded font-semibold">Due in {member.dueInDays}d</span>
            ) : null}
          </div>

          {/* Inactive / At Risk reason */}
          {member.inactiveReason && (
            <p className={`text-[11px] font-medium mt-0.5 ${member.finalStatus === "Inactive" ? "text-red-500" : "text-yellow-600 dark:text-yellow-400"}`}>
              {member.inactiveReason}
            </p>
          )}
        </div>

        {/* Status badge + chevron */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusBadge finalStatus={member.finalStatus} />
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      </button>

      {/* WhatsApp reminder button — only shown when reminder is needed */}
      {member.needsReminder && (
        <div className="px-4 pb-3 pt-0">
          <button
            onClick={(e) => { e.stopPropagation(); sendWhatsAppReminder(member); }}
            className="flex items-center gap-1.5 text-xs font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 border border-green-200 dark:border-green-800 rounded-full px-3 py-1 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Send WhatsApp Reminder
          </button>
        </div>
      )}
    </div>
  );
}
