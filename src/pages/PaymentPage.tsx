import { useEffect, useMemo, useState } from "react";
import { useMembers, useCreatePayment } from "@/hooks/useMembers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/status";
import { QRCodeSVG } from "qrcode.react";
import { Search, CheckCircle2, Banknote, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { type MemberWithStatus, PLAN_CONFIG, type PackageType, type MembershipPlan } from "@/types";
import { useSearchParams } from "react-router-dom";

const QUICK_AMOUNTS = [500, 1000, 1500, 2000];

export default function PaymentPage() {
  const { data: members = [] } = useMembers();
  const createPayment = useCreatePayment();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<MemberWithStatus | null>(null);
  const [amount, setAmount] = useState(1000);
  const [mode, setMode] = useState<"UPI" | "Cash">("UPI");
  const [confirmed, setConfirmed] = useState(false);
  const memberIdFromQuery = searchParams.get("memberId");

  const todayStr = useMemo(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  }, []);
  const [paymentDate, setPaymentDate] = useState(todayStr);

  const filtered = search
    ? members.filter(
        (m) =>
          m.name.toLowerCase().includes(search.toLowerCase()) ||
          m.phone.includes(search)
      )
    : members;

  useEffect(() => {
    if (!memberIdFromQuery || members.length === 0) return;
    const memberFromQuery = members.find((member) => member.id === memberIdFromQuery);
    if (memberFromQuery) {
      setSelected(memberFromQuery);
      setSearch(memberFromQuery.name);
    }
  }, [memberIdFromQuery, members]);

  useEffect(() => {
    if (selected) {
      const pkg = (selected.package_type as PackageType) || "strengthening";
      const plan = (selected.membership_plan as MembershipPlan) || "1_month";
      setAmount(PLAN_CONFIG[pkg]?.[plan]?.fee || 699);
    }
  }, [selected]);

  const UPI_ID = "johnvijayraj.4@oksbi";
  const UPI_NAME = "Vijay Raj";

  const upiString = useMemo(
    () =>
      selected
        ? `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(UPI_NAME)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`${selected.name} - Gym Fee`)}`
        : "",
    [selected, amount]
  );

  const handleConfirm = async () => {
    if (!selected) return;
    try {
      let finalDate = new Date();
      if (paymentDate && paymentDate !== todayStr) {
        finalDate = new Date(paymentDate);
        finalDate.setHours(12, 0, 0, 0); // Noon to avoid timezone offset issues
      }

      await createPayment.mutateAsync({
        member_id: selected.id,
        amount,
        mode,
        note: `${selected.name} - ${finalDate.toLocaleDateString("en-IN", { month: "long" })}`,
        date: finalDate.toISOString(),
      });
      setConfirmed(true);
      toast.success(`${formatCurrency(amount)} received from ${selected.name}`);
      setTimeout(() => {
        setSelected(null);
        setConfirmed(false);
        setSearch("");
        setAmount(1000);
        setPaymentDate(todayStr);
      }, 2000);
    } catch {
      toast.error("Payment failed");
    }
  };

  return (
    <div className="px-4 pt-6 pb-24 max-w-lg mx-auto space-y-4">
      <h1 className="text-xl font-bold">Collect Payment</h1>

      <AnimatePresence mode="wait">
        {confirmed ? (
          <motion.div
            key="success"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 gap-4"
          >
            <div className="w-20 h-20 rounded-full bg-status-paid-bg flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-status-paid" />
            </div>
            <p className="text-lg font-semibold text-center">
              {formatCurrency(amount)} received from {selected?.name}
            </p>
          </motion.div>
        ) : !selected ? (
          <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search member..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {filtered.map((m) => (
                 <button
                  key={m.id}
                  onClick={() => setSelected(m)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg glass-card hover:shadow-md transition-all active:scale-[0.98] text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {m.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.phone}</p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div key="payment" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            {/* Selected member */}
            <div className="flex items-center gap-3 p-3 rounded-lg glass-card">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                {selected.name.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="font-semibold">{selected.name}</p>
                <p className="text-xs text-muted-foreground">{selected.phone}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                Change
              </Button>
            </div>

            {/* Amount Configuration */}
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Amount to Pay</p>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value) || 0)}
                  className="h-12 text-lg font-semibold"
                />
              </div>
              <div className="grid grid-cols-4 gap-2">
                {QUICK_AMOUNTS.map((a) => (
                  <button
                    key={a}
                    onClick={() => setAmount(a)}
                    className={`py-2 rounded-lg text-sm font-semibold transition-all active:scale-95 ${
                      amount === a
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "glass-card hover:shadow-sm"
                    }`}
                  >
                    {formatCurrency(a)}
                  </button>
                ))}
              </div>
              
              {/* Payment Date Selection */}
              <div className="flex items-center justify-between pt-2 mt-4 border-t border-border/40">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  Payment Date 
                  <span className="font-semibold text-foreground bg-secondary/50 px-2 py-0.5 rounded-md">
                    {paymentDate === todayStr ? "Today" : new Date(paymentDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </span>
                <div className="relative overflow-hidden inline-block group">
                  <span className="text-xs font-semibold text-primary px-3 py-1.5 cursor-pointer rounded-md hover:bg-primary/10 transition-colors">
                    Change Date
                  </span>
                  <input
                    type="date"
                    max={todayStr}
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Mode toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setMode("UPI")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all ${
                  mode === "UPI" ? "bg-primary text-primary-foreground" : "glass-card"
                }`}
              >
                <Smartphone className="w-4 h-4" /> UPI
              </button>
              <button
                onClick={() => setMode("Cash")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all ${
                  mode === "Cash" ? "bg-primary text-primary-foreground" : "glass-card"
                }`}
              >
                <Banknote className="w-4 h-4" /> Cash
              </button>
            </div>

            {/* QR Code for UPI */}
            {mode === "UPI" && (
              <div className="flex flex-col items-center py-4 gap-3 glass-card rounded-xl">
                <QRCodeSVG value={upiString} size={180} className="rounded-lg" />
                <p className="text-sm font-medium">{UPI_NAME}</p>
                <p className="text-xs text-muted-foreground">UPI ID: {UPI_ID}</p>
                <p className="text-xs text-muted-foreground">Scan to pay via any UPI app</p>
              </div>
            )}

            {/* Confirm */}
            <Button
              onClick={handleConfirm}
              className="w-full h-14 text-base font-semibold"
              disabled={createPayment.isPending}
            >
              {createPayment.isPending
                ? "Processing..."
                : mode === "Cash"
                ? `Confirm Cash ${formatCurrency(amount)}`
                : `Confirm Payment ${formatCurrency(amount)}`}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
