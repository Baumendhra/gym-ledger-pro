import { useState } from "react";
import { useMembers, useCreateMember } from "@/hooks/useMembers";
import { MemberCard } from "@/components/MemberCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { exportMembersCSV } from "@/lib/export";
import { type MembershipPlan, type PackageType, PLAN_CONFIG } from "@/types";
import { Search, Plus, Download } from "lucide-react";
import { toast } from "sonner";

export default function MembersPage() {
  const { data: members = [], isLoading } = useMembers();
  const createMember = useCreateMember();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [packageType, setPackageType] = useState<PackageType>("strengthening");
  const [membershipPlan, setMembershipPlan] = useState<MembershipPlan>("1_month");
  const [filter, setFilter] = useState<"All" | "Active" | "Inactive" | "Due" | "Overdue" | "Strengthening" | "Cardio">("All");

  const filtered = members
    .filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(search.toLowerCase()) || m.phone.includes(search);
      if (!matchesSearch) return false;

      if (filter === "Active") return m.activityStatus === "active";
      if (filter === "Inactive") return m.activityStatus === "inactive";
      if (filter === "Due") return m.paymentStatus === "due";
      if (filter === "Overdue") return m.paymentStatus === "overdue";
      if (filter === "Strengthening") return m.package_type === "strengthening";
      if (filter === "Cardio") return m.package_type === "cardio";
      return true;
    })
    .sort((a, b) => {
      const getPriority = (m: typeof members[0]) => {
        if (m.paymentStatus === "overdue") return 0;
        if (m.paymentStatus === "due") return 1;
        if (m.activityStatus === "inactive") return 2;
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
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => { exportMembersCSV(members); toast.success("Members exported"); }}
          >
            <Download className="w-4 h-4" />
          </Button>
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
        {["All", "Active", "Inactive", "Due", "Overdue", "Strengthening", "Cardio"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full font-medium transition-all ${
              filter === f
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary/50 text-primary hover:bg-secondary"
            }`}
          >
            {f}
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
