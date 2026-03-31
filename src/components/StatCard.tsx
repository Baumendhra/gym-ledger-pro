import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  className?: string;
  to?: string;
}

export function StatCard({ label, value, icon, className, to }: StatCardProps) {
  const navigate = useNavigate();
  const handleClick = to ? () => navigate(to) : undefined;

  return (
    <div
      className={cn("glass-card rounded-lg p-4 animate-slide-up", to && "cursor-pointer hover:shadow-md transition-shadow", className)}
      onClick={handleClick}
    >
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 p-2 rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground truncate">{label}</p>
          <p className="text-xl font-display font-bold tracking-tight">{value}</p>
        </div>
      </div>
    </div>
  );
}
