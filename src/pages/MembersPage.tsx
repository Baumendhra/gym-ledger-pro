import { useState } from "react";
import { useMembers, useCreateMember } from "@/hooks/useMembers";
import { MemberCard } from "@/components/MemberCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { exportMembersCSV } from "@/lib/export";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Download } from "lucide-react";
import { toast } from "sonner";

export default function MembersPage() {
  const { data: members = [], isLoading } = useMembers();
  const createMember = useCreateMember();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [plan, setPlan] = useState("monthly");

  const filtered = members.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.phone.includes(search)
  );

  const handleAdd = async () => {
    if (!name.trim() || !phone.trim()) {
      toast.error("Name and phone are required");
      return;
    }
    try {
      await createMember.mutateAsync({ name: name.trim(), phone: phone.trim(), membership_plan: plan });
      toast.success(`${name} added successfully`);
      setName("");
      setPhone("");
      setPlan("monthly");
      setOpen(false);
    } catch {
      toast.error("Failed to add member");
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
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <Input placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
                <Input placeholder="Phone Number" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                <Select value={plan} onValueChange={setPlan}>
                  <SelectTrigger>
                    <SelectValue placeholder="Membership Plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="6months">6 Months</SelectItem>
                    <SelectItem value="1year">1 Year</SelectItem>
                  </SelectContent>
                </Select>
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
