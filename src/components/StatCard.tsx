import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function StatCard({ label, value, icon, className, onClick }: StatCardProps) {
  return (
    <div
      className={cn(
        "glass-card rounded-lg p-4 animate-slide-up transition-transform",
        onClick && "cursor-pointer hover:scale-[1.02] active:scale-[0.98]",
        className
      )}
      onClick={onClick}
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
