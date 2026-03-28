import { useMembers, useCreatePayment } from "@/hooks/useMembers";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { formatDate, formatCurrency } from "@/lib/status";
import { MessageCircle, IndianRupee } from "lucide-react";
import { toast } from "sonner";

export default function PendingPage() {
  const { data: members = [] } = useMembers();
  const createPayment = useCreatePayment();

  const pending = members
    .filter((m) => m.status === "overdue" || m.status === "due")
    .sort((a, b) => {
      if (a.status === "overdue" && b.status !== "overdue") return -1;
      if (a.status !== "overdue" && b.status === "overdue") return 1;
      return b.overdueDays - a.overdueDays;
    });

  const handleQuickPay = async (memberId: string, name: string) => {
    try {
      await createPayment.mutateAsync({
        member_id: memberId,
        amount: 1000,
        mode: "Cash",
        note: `${name} - ${new Date().toLocaleDateString("en-IN", { month: "long" })}`,
      });
      toast.success(`${formatCurrency(1000)} received from ${name}`);
    } catch {
      toast.error("Payment failed");
    }
  };

  const handleWhatsApp = (name: string, phone: string) => {
    const msg = encodeURIComponent(
      `Hi ${name}, your gym fee is pending. Please clear it at your earliest convenience. — GymKhata Pro`
    );
    window.open(`https://wa.me/91${phone}?text=${msg}`, "_blank");
  };

  return (
    <div className="px-4 pt-6 pb-24 max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Pending</h1>
        <span className="text-sm text-muted-foreground">{pending.length} members</span>
      </div>

      {pending.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🎉</p>
          <p className="text-muted-foreground">All members are up to date!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((m) => (
            <div key={m._id} className="glass-card rounded-lg p-4 space-y-3 animate-slide-up">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {m.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold">{m.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.dueDate ? `Due: ${formatDate(m.dueDate)}` : "Never paid"}
                    </p>
                  </div>
                </div>
                <StatusBadge status={m.status} />
              </div>

              {m.overdueDays > 0 && (
                <p className="text-xs font-medium text-status-overdue">
                  {m.overdueDays} days overdue
                </p>
              )}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 gap-1.5"
                  onClick={() => handleQuickPay(m._id, m.name)}
                >
                  <IndianRupee className="w-3.5 h-3.5" /> Mark Paid
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => handleWhatsApp(m.name, m.phone)}
                >
                  <MessageCircle className="w-3.5 h-3.5" /> Remind
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
