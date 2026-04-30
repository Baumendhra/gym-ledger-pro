import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMembers, usePayments, useDeleteMember, useCheckIns } from "@/hooks/useMembers";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatCurrency, daysSinceVisit, formatVisitAge } from "@/lib/status";
import { exportPaymentsCSV, exportMemberAttendanceCSV } from "@/lib/export";
import { ArrowLeft, Phone, CreditCard, Banknote, Download, MessageCircle, Trash2, UserCheck, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PLAN_CONFIG } from "@/types";
import { getMemberNotificationLogs, handleNotificationAction, type NotificationLog } from "@/services/pushNotifications";

export default function MemberDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: members = [] } = useMembers();
  const { data: payments = [], isLoading } = usePayments(id || "");
  const { data: allCheckIns = [] } = useCheckIns();
  const deleteMember = useDeleteMember();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const member = members.find((m) => m.id === id);
  // Filter check_ins to only this member's records
  const memberCheckIns = allCheckIns.filter((c) => c.member_id === id);

  // ── Notification Activity (additive layer) ────────────────────────────────────
  const [notifLogs, setNotifLogs] = useState<NotificationLog[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    setNotifLoading(true);
    getMemberNotificationLogs(id)
      .then(setNotifLogs)
      .finally(() => setNotifLoading(false));
  }, [id]);

  // Listen for SW messages when member clicks a notification button
  useEffect(() => {
    function handleSWMessage(event: MessageEvent) {
      const msg = event.data;
      if (msg?.type === "pn-action" && msg.memberId === id) {
        handleNotificationAction(msg.memberId, msg.notifType, msg.status)
          .then(() => getMemberNotificationLogs(id!).then(setNotifLogs));
      }
    }
    navigator.serviceWorker?.addEventListener("message", handleSWMessage);
    return () => navigator.serviceWorker?.removeEventListener("message", handleSWMessage);
  }, [id]);

  function handleDeleteConfirm() {
    if (!id) return;
    deleteMember.mutate(id, {
      onSuccess: () => {
        toast.success("Member deleted");
        navigate("/members");
      },
      onError: () => {
        toast.error("Failed to delete member");
        setShowDeleteDialog(false);
      },
    });
  }

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
            <StatusBadge finalStatus={member.finalStatus} />
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Phone className="w-3.5 h-3.5" />
            <span>{member.phone}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 capitalize">
            {member.package_type || "Strengthening"} • {PLAN_CONFIG[(member.package_type as "strengthening" | "cardio") || "strengthening"]?.[(member.membership_plan as "1_month" | "3_months" | "6_months" | "1_year") || "1_month"]?.label || member.membership_plan}
          </p>
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
          disabled={!member.phone}
          onClick={() => {
            const raw = String(member.phone).replace(/\D/g, "");
            window.open(`tel:${raw}`);
          }}
          title="Call Member"
        >
          <Phone className="w-4 h-4 text-blue-600" />
        </Button>
        <Button
          variant="outline"
          className="px-3"
          disabled={!member.phone}
          onClick={() => {
            const raw = String(member.phone).replace(/\D/g, "");
            const phone = raw.startsWith("91") ? raw : `91${raw}`;
            const days = daysSinceVisit(member.last_visit_date) || 0;
            
            let statusFilter = "All";
            if (member.paymentStatus === "overdue" || member.isOverdue10Days) statusFilter = "Overdues";
            else if (member.hasDues) statusFilter = "Dues";
            else if (member.finalStatus === "Inactive") statusFilter = "Inactive";
            else if (member.finalStatus === "At Risk") statusFilter = "At Risk";
            else if (member.finalStatus === "Active") statusFilter = "Active";

            let msg = `Hi ${member.name}, we’d love to see you at the gym 💪`;
            if (statusFilter === "Active") msg = `Great going ${member.name}! Keep it up 💯`;
            else if (statusFilter === "At Risk") msg = `Hey ${member.name}, it’s been ${days} days — don’t lose your streak 🔥`;
            else if (statusFilter === "Inactive") msg = `Hi ${member.name}, we miss you! It’s been ${days} days — come back 💪`;
            else if (statusFilter === "Dues") msg = `Hi ${member.name}, your membership dues are pending. Kindly clear them 🙏`;
            else if (statusFilter === "Overdues") msg = `${member.name}, your membership is overdue. Please renew to continue 💪`;
            else if (statusFilter === "All") msg = `Hi ${member.name}, stay consistent with your workouts 💪`;

            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
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

      {/* ── Notification Activity (additive section) ──────────────────────────── */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Bell className="w-3.5 h-3.5" /> Notification Activity
        </h2>
        {notifLoading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
          </div>
        ) : notifLogs.length === 0 ? (
          <p className="text-center text-muted-foreground py-4 text-sm">
            No notifications sent yet
          </p>
        ) : (
          <div className="space-y-1.5">
            {notifLogs.map((log) => {
              const sentDate = new Date(log.sent_at);
              const dayLabel = sentDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
              const statusEmoji: Record<string, string> = {
                sent:    "❌",
                coming:  "💪 Coming",
                later:   "⏰ Later",
                restart: "💪 Restarting",
                called:  "📞 Called",
              };
              const typeLabel = log.type === "at_risk" ? "⚡ At Risk" : "🔔 Reminder";
              const statusLabel = statusEmoji[log.status] ?? log.status;
              return (
                <div
                  key={log.id}
                  className="glass-card rounded-lg px-3 py-2.5 flex items-center gap-3 text-sm"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bell className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs">{dayLabel} — {typeLabel}</p>
                    <p className="text-xs text-muted-foreground truncate">{log.message}</p>
                  </div>
                  <span className="text-xs font-medium whitespace-nowrap">
                    {log.status === "sent" && !log.action_time ? "❌ No response" : statusLabel}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Member */}
      <Button
        variant="outline"
        className="w-full border-red-500/50 text-red-500 hover:bg-red-500/10 hover:text-red-400 hover:border-red-400 transition-colors gap-2"
        onClick={() => setShowDeleteDialog(true)}
      >
        <Trash2 className="w-4 h-4" />
        Delete Member
      </Button>

      {/* Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowDeleteDialog(false)}
          />
          {/* Dialog */}
          <div className="relative glass-card rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4 animate-slide-up">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 mx-auto">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-bold text-base">Delete Member</h3>
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete <span className="font-semibold text-foreground">{member.name}</span>? This will also remove all their payment records. This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowDeleteDialog(false)}
                disabled={deleteMember.isPending}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white border-0"
                onClick={handleDeleteConfirm}
                disabled={deleteMember.isPending}
              >
                {deleteMember.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Deleting…
                  </span>
                ) : (
                  "Delete"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
