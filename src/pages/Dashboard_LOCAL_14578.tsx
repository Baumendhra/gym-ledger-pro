import { useMembers, useCheckIns } from "@/hooks/useMembers";
import { useAuth } from "@/hooks/useAuth";
import { StatCard } from "@/components/StatCard";
import { MemberCard } from "@/components/MemberCard";
import { exportDailyCSV, exportMonthlyMembersCSV, exportAttendanceCSV } from "@/lib/export";
import {
  Users, AlertTriangle, Clock, Dumbbell,
  LogOut, Download, FileText, CalendarDays,
  Heart, Zap, TrendingUp, UserCheck, Bell, ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
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

  // ── Category counts ───────────────────────────────────────────────────────
  const cardioMembers    = members.filter((m) => m.package_type === "cardio");
  const strengthMembers  = members.filter((m) => m.package_type === "strengthening");

  // ── Status counts ─────────────────────────────────────────────────────────
  const activeMembers    = members.filter((m) => m.finalStatus === "Active");
  const atRiskMembers    = members.filter((m) => m.finalStatus === "At Risk");
  const inactiveMembers  = members.filter((m) => m.finalStatus === "Inactive");
  const newMembers       = members.filter((m) => m.finalStatus === "New");
  const reminderMembers  = members.filter((m) => m.needsReminder);

  // ── Payment counts ────────────────────────────────────────────────────────
  const overdueMembers   = members.filter((m) => m.paymentStatus === "overdue");
  const dueSoonMembers   = members.filter((m) => m.paymentStatus === "due");
  const duesMembers      = members.filter((m) => m.hasDues);
  const overdueMembers10 = members.filter((m) => m.isOverdue10Days);

  // ── Attendance calculations ────────────────────────────────────────────────
  const todayStr         = new Date().toDateString();
  const currentMonth     = new Date().getMonth();
  const currentYear      = new Date().getFullYear();

  const todayAttendance  = checkIns.filter((c) => {
    try { return new Date(c.checked_in_at).toDateString() === todayStr; } catch { return false; }
  }).length;

  const monthlyAttendance = checkIns.filter((c) => {
    try {
      const d = new Date(c.checked_in_at);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    } catch { return false; }
  }).length;

  const monthName = new Date().toLocaleDateString("en-IN", { month: "long" });

  const handleLogout = async () => { await signOut(); toast.success("Signed out"); };

  return (
    <div className="px-4 pt-6 pb-24 max-w-lg mx-auto space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary text-primary-foreground">
          <Dumbbell className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight">GymKhata Pro</h1>
          <p className="text-xs text-muted-foreground">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <div className="flex gap-1">
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
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Today's Check-ins" value={todayAttendance} icon={<UserCheck className="w-5 h-5 text-blue-500" />} className="border-blue-500/20" onClick={() => navigate("/members?filter=Attended+Today")} />
          <StatCard label={`${monthName} Total`} value={monthlyAttendance} icon={<TrendingUp className="w-5 h-5 text-violet-500" />} className="border-violet-500/20" />
        </div>
      </div>

      {/* ── Members Overview ───────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Members Overview</p>
        <div className="grid grid-cols-4 gap-3">
          <StatCard label="Total" value={members.length} icon={<Users className="w-5 h-5" />} onClick={() => navigate("/members")} />
          <StatCard label="New" value={newMembers.length} icon={<UserCheck className="w-5 h-5 text-gray-500" />} onClick={() => navigate("/members?filter=New")} />
          <StatCard label="Active" value={activeMembers.length} icon={<Dumbbell className="w-5 h-5 text-green-500" />} onClick={() => navigate("/members?filter=Active")} />
          <StatCard label="Inactive" value={inactiveMembers.length} icon={<AlertTriangle className="w-5 h-5 text-red-500" />} className={inactiveMembers.length > 0 ? "border-red-500/30" : ""} onClick={() => navigate("/members?filter=Inactive")} />
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

      {/* ── Workout Categories ─────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Workout Categories</p>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Cardio Members" value={cardioMembers.length} icon={<Heart className="w-5 h-5 text-pink-500" />} className="border-pink-500/20" onClick={() => navigate("/members?filter=Cardio")} />
          <StatCard label="Strength Members" value={strengthMembers.length} icon={<Zap className="w-5 h-5 text-orange-500" />} className="border-orange-500/20" onClick={() => navigate("/members?filter=Strengthening")} />
        </div>
      </div>

      {/* ── Payments ───────────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Payments</p>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Dues" value={duesMembers.length} icon={<AlertTriangle className="w-5 h-5 text-orange-500" />} className={duesMembers.length > 0 ? "border-orange-500/30" : ""} onClick={() => navigate("/members?filter=Dues")} />
          <StatCard label="Overdue (10d+)" value={overdueMembers10.length} icon={<AlertTriangle className="w-5 h-5 text-red-600" />} className={overdueMembers10.length > 0 ? "border-red-600/40 bg-red-500/5" : ""} onClick={() => navigate("/members?filter=Overdue")} />
        </div>
      </div>

      {/* ── Needs Attention list ────────────────────────────────────────────── */}
      {overdueMembers.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">⚠ Needs Attention</h2>
          <div className="space-y-2">
            {overdueMembers.slice(0, 3).map((m) => <MemberCard key={m.id} member={m} navigateToPayment={true} />)}
          </div>
        </div>
      )}

      {dueSoonMembers.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Due Soon</h2>
          <div className="space-y-2">
            {dueSoonMembers.map((m) => <MemberCard key={m.id} member={m} />)}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  );
}
