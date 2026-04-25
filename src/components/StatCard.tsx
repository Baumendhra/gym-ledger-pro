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
        "glass-card rounded-xl p-3 md:p-4 flex flex-col items-center justify-center text-center gap-2.5 h-full animate-slide-up transition-transform",
        onClick && "cursor-pointer hover:scale-[1.02] active:scale-[0.98]",
        className
      )}
      onClick={onClick}
    >
      <div className="flex-shrink-0 p-2.5 rounded-full bg-primary/10 text-primary mb-0.5">
        {icon}
      </div>
      <div className="w-full space-y-1">
        <p className="text-2xl font-display font-bold tracking-tight leading-none">{value}</p>
        <p className="text-xs font-medium text-muted-foreground leading-tight break-words">{label}</p>
      </div>
    </div>
  );
}
