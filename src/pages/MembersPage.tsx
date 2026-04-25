import { useState, useEffect } from "react";
import { useMembers, useCreateMember, useCheckIns } from "@/hooks/useMembers";
import { MemberCard } from "@/components/MemberCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { exportDailyCSV, exportMonthlyMembersCSV, exportAttendanceCSV } from "@/lib/export";
import { type MembershipPlan, type PackageType, PLAN_CONFIG } from "@/types";
import { Search, Plus, Download, Clock, FileText, CalendarDays, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type FilterType = "All" | "New" | "Active" | "At Risk" | "Inactive" | "Needs Reminder" | "Strengthening" | "Cardio" | "Dues" | "Overdue" | "Attended Today";

export default function MembersPage() {
  const { data: members = [], isLoading } = useMembers();
  const { data: checkIns = [] } = useCheckIns();
  const createMember = useCreateMember();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [packageType, setPackageType] = useState<PackageType>("strengthening");
  const [membershipPlan, setMembershipPlan] = useState<MembershipPlan>("1_month");
  const [filter, setFilter] = useState<FilterType>("All");

  // Sync filter from URL query param (e.g. ?filter=Cardio from dashboard)
  useEffect(() => {
    const urlFilter = searchParams.get("filter");
    if (urlFilter) setFilter(urlFilter as FilterType);
  }, [searchParams]);

  // Build set of member IDs who checked in today
  const todayStr = new Date().toDateString();
  const attendedTodayIds = new Set(
    checkIns
      .filter((c) => {
        try { return new Date(c.checked_in_at).toDateString() === todayStr; }
        catch { return false; }
      })
      .map((c) => c.member_id)
  );

  const filtered = members
    .filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(search.toLowerCase()) || m.phone.includes(search);
      if (!matchesSearch) return false;

      if (filter === "Active")         return m.finalStatus === "Active";
      if (filter === "New")            return m.finalStatus === "New";
      if (filter === "At Risk")        return m.finalStatus === "At Risk";
      if (filter === "Inactive")       return m.finalStatus === "Inactive";
      if (filter === "Needs Reminder") return m.needsReminder;
      if (filter === "Strengthening")  return m.package_type === "strengthening";
      if (filter === "Cardio")         return m.package_type === "cardio";
      if (filter === "Dues")           return m.hasDues;
      if (filter === "Overdue")        return m.isOverdue10Days;
      if (filter === "Attended Today") return attendedTodayIds.has(m.id);
      return true;
    })
    .sort((a, b) => {
      const getPriority = (m: typeof members[0]) => {
        if (m.paymentStatus === "overdue") return 0;
        if (m.paymentStatus === "due") return 1;
        if (m.finalStatus === "Inactive") return 2;
        return 3;
      };

      const priorityA = getPriority(a);
      const priorityB = getPriority(b);

      if (priorityA !== priorityB) return priorityA - priorityB;
      return b.overdueDays - a.overdueDays;
    });

  const handleAdd = async () => {
    if (!name.trim() || !phone.trim()) {
      toast.error("Name and phone are required");
      return;
    }
    try {
      await createMember.mutateAsync({ name: name.trim(), phone: phone.trim(), package_type: packageType, membership_plan: membershipPlan });
      toast.success(`${name} added successfully`);
      setName("");
      setPhone("");
      setPackageType("strengthening");
      setMembershipPlan("1_month");
      setOpen(false);
    } catch {
      toast.error("Failed to add member. Please check your connection and try again.");
    }
  };

  return (
    <div className="px-4 pt-6 pb-24 max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Members</h1>
        <div className="flex gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5" title="Download Reports">
                <Download className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { exportAttendanceCSV(filtered); toast.success("Attendance CSV exported"); }}>
                <UserCheck className="w-4 h-4 mr-2" /> Attendance Report
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { exportDailyCSV(filtered, true); toast.success("Daily Report (Today) exported"); }}>
                <Clock className="w-4 h-4 mr-2" /> Daily Report (Today)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { exportDailyCSV(filtered, false); toast.success("Daily Report (All) exported"); }}>
                <FileText className="w-4 h-4 mr-2" /> Daily Report (All Members)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { exportMonthlyMembersCSV(filtered); toast.success("Monthly Report exported"); }}>
                <CalendarDays className="w-4 h-4 mr-2" /> Monthly Report
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" /> Add
              </Button>
            </DialogTrigger>
            <DialogContent className="mx-4 max-w-sm">
              <DialogHeader>
                <DialogTitle>Add New Member</DialogTitle>
                <DialogDescription className="sr-only">Enter the details of the new member below.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <Input placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
                <Input placeholder="Phone Number" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />

                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Package</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={packageType === "strengthening" ? "default" : "outline"}
                        onClick={() => setPackageType("strengthening")}
                        className="text-sm"
                      >
                        Strengthening
                      </Button>
                      <Button
                        type="button"
                        variant={packageType === "cardio" ? "default" : "outline"}
                        onClick={() => setPackageType("cardio")}
                        className="text-sm"
                      >
                        Cardio
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Membership Plan</p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(PLAN_CONFIG[packageType] || PLAN_CONFIG.strengthening).map(([value, config]) => (
                        <Button
                          key={value}
                          type="button"
                          variant={membershipPlan === value ? "default" : "outline"}
                          onClick={() => setMembershipPlan(value as MembershipPlan)}
                          className="text-sm flex flex-col h-auto py-2.5"
                        >
                          <span className="font-bold">{config.label}</span>
                          <span className="text-xs opacity-80 mt-1">₹{config.fee}</span>
                        </Button>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Renews every {PLAN_CONFIG[packageType]?.[membershipPlan]?.durationDays || 30} days
                    </p>
                  </div>
                </div>

                <Button onClick={handleAdd} className="w-full" disabled={createMember.isPending}>
                  {createMember.isPending ? "Adding..." : "Add Member"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search by name or phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="flex gap-2 text-sm overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        {([
          { label: "All", value: "All" },
          { label: "New", value: "New" },
          { label: "Active", value: "Active" },
          { label: "⚡ At Risk", value: "At Risk" },
          { label: "Inactive", value: "Inactive" },
          { label: "🔔 Reminder", value: "Needs Reminder" },
          { label: "Strengthening", value: "Strengthening" },
          { label: "Cardio", value: "Cardio" },
          { label: "Dues", value: "Dues" },
          { label: "Overdue", value: "Overdue" },
          { label: "✅ Today", value: "Attended Today" },
        ] as const).map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setFilter(value as any)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full font-medium transition-all ${
              filter === value
                ? value === "At Risk" ? "bg-yellow-500 text-white shadow-sm"
                  : value === "Needs Reminder" ? "bg-amber-500 text-white shadow-sm"
                  : value === "Inactive" ? "bg-red-500 text-white shadow-sm"
                  : value === "Active" ? "bg-green-600 text-white shadow-sm"
                  : value === "New" ? "bg-gray-500 text-white shadow-sm"
                  : "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary/50 text-primary hover:bg-secondary"
            }`}
          >
            {label}
          </button>
        ))}
      </div>


      <div className="space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No members found</p>
        ) : (
          filtered.map((m) => <MemberCard key={m.id} member={m} />)
        )}
      </div>
    </div>
  );
}
