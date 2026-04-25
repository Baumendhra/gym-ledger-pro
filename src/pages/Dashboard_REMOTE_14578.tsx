import { useMembers } from "@/hooks/useMembers";
import { useAuth } from "@/hooks/useAuth";
import { StatCard } from "@/components/StatCard";
import { MemberCard } from "@/components/MemberCard";
import { formatCurrency } from "@/lib/status";
import { exportMembersCSV } from "@/lib/export";
import { IndianRupee, Users, AlertTriangle, Clock, Dumbbell, LogOut, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { data: members = [], isLoading } = useMembers();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const overdueMembers = members.filter((m) => m.paymentStatus === "overdue");
  const dueSoonMembers = members.filter((m) => m.paymentStatus === "due");
  const paidMembers = members.filter((m) => m.paymentStatus === "paid");

  const handleLogout = async () => {
    await signOut();
    toast.success("Signed out");
  };

  return (
    <div className="px-4 pt-6 pb-24 max-w-lg mx-auto space-y-6">
      {/* Header */}
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { exportMembersCSV(members); toast.success("Members exported"); }}
            title="Export CSV"
          >
            <Download className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleLogout} title="Sign out">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total Members" value={members.length} icon={<Users className="w-5 h-5" />} onClick={() => navigate("/members")} />
        <StatCard label="Paid" value={paidMembers.length} icon={<IndianRupee className="w-5 h-5" />} onClick={() => navigate("/members")} />
        <StatCard
          label="Overdue"
          value={overdueMembers.length}
          icon={<AlertTriangle className="w-5 h-5" />}
          className={overdueMembers.length > 0 ? "border-status-overdue/30" : ""}
          onClick={() => navigate("/pending")}
        />
        <StatCard
          label="Due Soon"
          value={dueSoonMembers.length}
          icon={<Clock className="w-5 h-5" />}
          className={dueSoonMembers.length > 0 ? "border-status-due/30" : ""}
          onClick={() => navigate("/pending")}
        />
      </div>

      {overdueMembers.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">⚠ Needs Attention</h2>
          <div className="space-y-2">
            {overdueMembers.slice(0, 3).map((m) => (
              <MemberCard key={m.id} member={m} navigateToPayment={true} />
            ))}
          </div>
        </div>
      )}

      {dueSoonMembers.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Due Soon</h2>
          <div className="space-y-2">
            {dueSoonMembers.map((m) => (
              <MemberCard key={m.id} member={m} />
            ))}
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
