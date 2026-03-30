import type { MemberWithStatus } from "@/types";
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

  return (
    <><button
      onClick={handleClick} /><div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-display font-bold text-sm">
        {member.name.charAt(0).toUpperCase()}
      </div><div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{member.name}</p>
        <p className="text-xs text-muted-foreground">{member.batch} batch {member.membership_type ? `• ${member.membership_type}` : ''}</p>
        <p className="text-xs text-muted-foreground">Last paid: {formatDate(member.last_payment_date)}</p>
      </div><div className="flex items-center gap-2">
        <StatusBadge status={member.status} />
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div></>
    </button >
  );
}
