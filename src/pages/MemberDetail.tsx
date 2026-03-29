import { useParams, useNavigate } from "react-router-dom";
import { useMembers, usePayments } from "@/hooks/useMembers";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatCurrency } from "@/lib/status";
import { exportPaymentsCSV } from "@/lib/export";
import { ArrowLeft, Phone, CreditCard, Banknote, Download, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function MemberDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: members = [] } = useMembers();
  const { data: payments = [], isLoading } = usePayments(id || "");

  const member = members.find((m) => m.id === id);

  if (!member) {
    return (
      <div className="px-4 pt-6 pb-24 max-w-lg mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-1.5 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <p className="text-center text-muted-foreground py-12">Member not found</p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-24 max-w-lg mx-auto space-y-5">
      <Button variant="ghost" onClick={() => navigate(-1)} className="gap-1.5 -ml-2">
        <ArrowLeft className="w-4 h-4" /> Back
      </Button>

      {/* Profile Header */}
      <div className="glass-card rounded-xl p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-display font-bold text-xl">
          {member.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-lg font-bold truncate">{member.name}</h1>
            <StatusBadge status={member.status} />
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Phone className="w-3.5 h-3.5" />
            <span>{member.phone}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{member.batch} batch {member.membership_type ? `• ${member.membership_type}` : ''}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground">Last Paid</p>
          <p className="font-semibold text-sm mt-1">{formatDate(member.last_payment_date)}</p>
        </div>
        <div className="glass-card rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground">Member Since</p>
          <p className="font-semibold text-sm mt-1">{formatDate(member.created_at)}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button className="flex-1" onClick={() => navigate(`/payment?memberId=${member.id}`)}>
          <CreditCard className="w-4 h-4 mr-2" /> Collect Payment
        </Button>
        <Button
          variant="outline"
          className="px-3"
          onClick={() => {
            const msg = encodeURIComponent(
              member.status === "overdue" || member.status === "due"
                ? `Hi ${member.name}, your gym fee is pending. Please clear it at your earliest convenience. — GymKhata Pro`
                : `Hi ${member.name}, `
            );
            window.open(`https://wa.me/91${member.phone}?text=${msg}`, "_blank");
          }}
          title="Send WhatsApp Message"
        >
          <MessageCircle className="w-4 h-4 text-green-600" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => { exportPaymentsCSV(payments, member.name); toast.success("Payments exported"); }}
          title="Export payments CSV"
        >
          <Download className="w-4 h-4" />
        </Button>
      </div>

      {/* Payment Timeline */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Payment History
        </h2>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
          </div>
        ) : payments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">No payments yet</p>
        ) : (
          <div className="space-y-1">
            {payments.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 py-3 animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-status-paid-bg flex items-center justify-center">
                  {p.mode === "UPI" ? (
                    <CreditCard className="w-4 h-4 text-status-paid" />
                  ) : (
                    <Banknote className="w-4 h-4 text-status-paid" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{formatCurrency(p.amount)}</p>
                  <p className="text-xs text-muted-foreground">{p.note}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{formatDate(p.date)}</p>
                  <p className="text-xs text-muted-foreground">{p.mode}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
