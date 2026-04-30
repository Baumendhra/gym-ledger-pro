import { useMembers, useCheckIns } from "@/hooks/useMembers";
import { useNotificationTrigger } from "@/hooks/useNotificationTrigger";
import { useAuth } from "@/hooks/useAuth";
import { StatCard } from "@/components/StatCard";
import { MemberCard } from "@/components/MemberCard";
import { exportDailyCSV, exportMonthlyMembersCSV, exportAttendanceCSV } from "@/lib/export";
import {
  Users, AlertTriangle, Clock, Dumbbell,
  LogOut, Download, FileText, CalendarDays,
  Heart, Zap, TrendingUp, UserCheck, Bell, ShieldAlert,
  BellRing, Smartphone, ShieldOff, MessageCircle, XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAdminAlerts } from "@/hooks/useAdminAlerts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Dashboard() {
  const { data: members = [], isLoading } = useMembers();
  const { data: checkIns = [] } = useCheckIns();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { alerts, handledMemberIds, loading: alertsLoading } = useAdminAlerts();

  // Generate dynamic WhatsApp fallback
  const sendWhatsApp = async (e: React.MouseEvent, phone: string, memberId: string, name: string, type: "at_risk" | "reminder") => {
    e.stopPropagation();

    const raw = String(phone).replace(/\D/g, "");
    const waPhone = raw.startsWith("91") ? raw : `91${raw}`;
    const days = 5; // Placeholder or calculate if needed
    let msg = type === "at_risk" 
      ? `Hey ${name.split(" ")[0]} 👋 It’s been ${days} days — don’t lose your streak 💪`
      : `Hi ${name.split(" ")[0]} 😔 We miss you! Come back strong 💪`;
    
    // Open synchronously to prevent browser popup blockers
    window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`, "_blank");

    // Log the manual fallback to dismiss the alert from the Admin Notification Center
    await supabase.from("notification_logs").insert({
      member_id: memberId,
      type: "whatsapp_fallback",
      message: "Handled manually via WhatsApp",
      status: "fallback"
    });
  };

  // ── Category counts ───────────────────────────────────────────────────────
  const cardioMembers = members.filter((m) => m.package_type === "cardio");
  const strengthMembers = members.filter((m) => m.package_type === "strengthening");

  // ── Status counts ─────────────────────────────────────────────────────────
  const activeMembers = members.filter((m) => m.finalStatus === "Active");
  const atRiskMembers = members.filter((m) => m.finalStatus === "At Risk");
  const inactiveMembers = members.filter((m) => m.finalStatus === "Inactive");
  const newMembers = members.filter((m) => m.finalStatus === "New");
  const reminderMembers = members.filter((m) => m.needsReminder);

  // ── Auto push notifications (additive layer — no existing logic changed) ──
  useNotificationTrigger(atRiskMembers, reminderMembers);

  // ── Payment counts ────────────────────────────────────────────────────────
  const overdueMembers = members.filter((m) => m.paymentStatus === "overdue");
  const dueSoonMembers = members.filter((m) => m.paymentStatus === "due");
  const duesMembers = members.filter((m) => m.hasDues);
  const overdueMembers10 = members.filter((m) => m.isOverdue10Days);

  // ── Attendance calculations ────────────────────────────────────────────────
  const todayStr = new Date().toDateString();
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const uniqueToday = new Set(
    checkIns
      .filter((c) => {
        try { return new Date(c.checked_in_at).toDateString() === todayStr; } catch { return false; }
      })
      .map(c => c.member_id)
  );
  const todayAttendance = uniqueToday.size;

  const monthlyAttendance = checkIns.filter((c) => {
    try {
      const d = new Date(c.checked_in_at);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    } catch { return false; }
  }).length;

  const monthName = new Date().toLocaleDateString("en-IN", { month: "long" });

  const handleLogout = async () => { await signOut(); toast.success("Signed out"); };

  // ── Unhandled Notifications for Dropdown ──────────────────────────────────
  const unhandledAtRisk = atRiskMembers.filter(m => !handledMemberIds.has(m.id));
  const unhandledReminder = reminderMembers.filter(m => !handledMemberIds.has(m.id));
  const totalAlertCount = unhandledAtRisk.length + unhandledReminder.length + alerts.length;

  return (
    <div className="px-4 pt-6 pb-24 max-w-lg mx-auto space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary text-primary-foreground">
          <Dumbbell className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight">Vijay Fitness</h1>
          <p className="text-xs text-muted-foreground">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <div className="flex gap-1 items-center">
          {/* ── Admin Notification Center ── */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative" title="Notifications">
                <BellRing className="w-5 h-5" />
                {totalAlertCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 max-h-[400px] overflow-y-auto">
              <div className="px-3 py-2 text-sm font-semibold border-b flex items-center justify-between">
                <span>⚠️ Member Attention Needed</span>
                <span className="bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full">
                  {totalAlertCount}
                </span>
              </div>
              
              {unhandledAtRisk.map((m) => (
                <DropdownMenuItem key={`atrisk-${m.id}`} onClick={() => navigate(`/member/${m.id}`)} className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                  <div className="flex items-center justify-between w-full">
                    <span className="font-medium text-amber-500 flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5" /> {m.name} added to At Risk list</span>
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-1 h-7 text-xs" onClick={(e) => sendWhatsApp(e, m.phone, m.id, m.name, "at_risk")}>
                    <MessageCircle className="w-3 h-3 mr-1.5 text-green-500" /> WhatsApp Fallback
                  </Button>
                </DropdownMenuItem>
              ))}

              {unhandledReminder.map((m) => (
                <DropdownMenuItem key={`rem-${m.id}`} onClick={() => navigate(`/member/${m.id}`)} className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                  <div className="flex items-center justify-between w-full">
                    <span className="font-medium text-red-400 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> {m.name} needs reminder</span>
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-1 h-7 text-xs" onClick={(e) => sendWhatsApp(e, m.phone, m.id, m.name, "reminder")}>
                    <MessageCircle className="w-3 h-3 mr-1.5 text-green-500" /> WhatsApp Fallback
                  </Button>
                </DropdownMenuItem>
              ))}

              {alerts.map((a) => {
                const m = members.find(x => x.id === a.member_id);
                if (!m) return null;
                return (
                  <DropdownMenuItem key={a.id} onClick={() => navigate(`/member/${m.id}`)} className="flex flex-col items-start gap-1 p-3 cursor-pointer border-t border-border/50">
                    <div className="flex items-center gap-1.5 font-medium text-muted-foreground w-full">
                      {a.type === "failed_push" && <XCircle className="w-3.5 h-3.5 text-red-500" />}
                      {a.type === "iphone_limitation" && <Smartphone className="w-3.5 h-3.5 text-blue-400" />}
                      {a.type === "no_permission" && <ShieldOff className="w-3.5 h-3.5 text-yellow-500" />}
                      <span className="truncate">{m.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{a.message}</span>
                    <Button variant="outline" size="sm" className="w-full mt-1 h-7 text-xs" onClick={(e) => sendWhatsApp(e, m.phone, m.id, m.name, "at_risk")}>
                      <MessageCircle className="w-3 h-3 mr-1.5 text-green-500" /> WhatsApp Fallback
                    </Button>
                  </DropdownMenuItem>
                );
              })}

              {totalAlertCount === 0 && (
                <div className="py-6 text-center text-muted-foreground text-sm">
                  No alerts right now.
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" title="Download Reports">
                <Download className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { exportAttendanceCSV(members); toast.success("Attendance CSV exported"); }}>
                <UserCheck className="w-4 h-4 mr-2" /> Attendance Report
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { exportDailyCSV(members, true); toast.success("Daily Report (Today) exported"); }}>
                <Clock className="w-4 h-4 mr-2" /> Daily Report (Today)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { exportDailyCSV(members, false); toast.success("Daily Report (All) exported"); }}>
                <FileText className="w-4 h-4 mr-2" /> Daily Report (All Members)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { exportMonthlyMembersCSV(members); toast.success("Monthly Report exported"); }}>
                <CalendarDays className="w-4 h-4 mr-2" /> Monthly Report
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" onClick={handleLogout} title="Sign out">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* ── Attendance ─────────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Attendance</p>
        <StatCard label="Today's Check-ins" value={todayAttendance} icon={<UserCheck className="w-5 h-5 text-blue-500" />} className="border-blue-500/20" onClick={() => navigate("/members?filter=Attended+Today")} />
      </div>

      {/* ── Members Overview ───────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Members Overview</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total Members" value={members.length} icon={<Users className="w-5 h-5" />} onClick={() => navigate("/members")} />
          <StatCard label="Active" value={activeMembers.length} icon={<Dumbbell className="w-5 h-5 text-green-500" />} onClick={() => navigate("/members?filter=Active")} />
          <StatCard label="At Risk" value={atRiskMembers.length} icon={<ShieldAlert className="w-5 h-5 text-yellow-500" />} onClick={() => navigate("/members?filter=At+Risk")} />
          <StatCard label="Inactive" value={inactiveMembers.length} icon={<AlertTriangle className="w-5 h-5 text-red-500" />} className={inactiveMembers.length > 0 ? "border-red-500/30" : ""} onClick={() => navigate("/members?filter=Inactive")} />
        </div>
      </div>

      {/* ── Workout Categories ─────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Workout Categories</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Cardio Members" value={cardioMembers.length} icon={<Heart className="w-5 h-5 text-cyan-500" />} className="border-cyan-500/20 bg-cyan-500/5" onClick={() => navigate("/members?filter=Cardio")} />
          <StatCard label="Strength Members" value={strengthMembers.length} icon={<Dumbbell className="w-5 h-5 text-purple-500" />} className="border-purple-500/20 bg-purple-500/5" onClick={() => navigate("/members?filter=Strengthening")} />
        </div>
      </div>

      {/* ── Risk & Reminders ───────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Risk & Reminders</p>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="At Risk" value={atRiskMembers.length} icon={<ShieldAlert className="w-5 h-5 text-yellow-500" />} className={atRiskMembers.length > 0 ? "border-yellow-500/30 bg-yellow-500/5" : ""} onClick={() => navigate("/members?filter=At+Risk")} />
          <StatCard label="Needs Reminder" value={reminderMembers.length} icon={<Bell className="w-5 h-5 text-amber-500" />} className={reminderMembers.length > 0 ? "border-amber-500/30 bg-amber-500/5" : ""} onClick={() => navigate("/members?filter=Needs+Reminder")} />
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  );
}
