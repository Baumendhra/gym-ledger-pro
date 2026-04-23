import { useState } from "react";
import { useMembers } from "@/hooks/useMembers";
import { verifyMember, checkInMember } from "@/hooks/useCheckIn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dumbbell, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Step = "select" | "verify" | "done";

export default function CheckInPage() {
  const { data: members = [], isLoading } = useMembers();
  const [step, setStep] = useState<Step>("select");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [last4, setLast4] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; name?: string; message: string } | null>(null);

  const filtered = search.trim()
    ? members.filter(
        (m) =>
          m.name.toLowerCase().includes(search.toLowerCase()) ||
          m.phone.includes(search)
      )
    : members.slice(0, 8);

  const selected = members.find((m) => m.id === selectedId);

  const reset = () => {
    setStep("select");
    setSelectedId(null);
    setLast4("");
    setResult(null);
    setSearch("");
  };

  const handleVerifyAndCheckIn = async () => {
    if (!selectedId) return;
    setBusy(true);
    const v = await verifyMember(selectedId, last4);
    if (v.success !== true) {
      setBusy(false);
      toast.error(v.error);
      return;
    }
    const c = await checkInMember(selectedId);
    setBusy(false);
    if (c.success !== true) {
      setResult({ ok: false, message: c.error });
      setStep("done");
      return;
    }
    setResult({ ok: true, name: c.name, message: c.message });
    setStep("done");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary text-primary-foreground">
            <Dumbbell className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Check-In</h1>
            <p className="text-xs text-muted-foreground">Tap your name and verify</p>
          </div>
        </div>

        {step === "select" && (
          <Card className="p-4 space-y-3">
            <Label htmlFor="search">Find your name</Label>
            <Input
              id="search"
              placeholder="Search name or phone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {isLoading && (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {!isLoading && filtered.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">No members found</p>
              )}
              {filtered.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setSelectedId(m.id);
                    setStep("verify");
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-lg border bg-card hover:bg-accent transition-colors"
                >
                  <p className="font-medium text-sm">{m.name}</p>
                  <p className="text-xs text-muted-foreground">
                    •••••• {m.phone.slice(-4)}
                  </p>
                </button>
              ))}
            </div>
          </Card>
        )}

        {step === "verify" && selected && (
          <Card className="p-5 space-y-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Verifying</p>
              <p className="text-lg font-semibold">{selected.name}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="last4">Last 4 digits of your phone</Label>
              <Input
                id="last4"
                inputMode="numeric"
                maxLength={4}
                placeholder="••••"
                value={last4}
                onChange={(e) => setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                autoFocus
                className="text-center text-2xl tracking-[0.5em] font-mono"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={reset} disabled={busy}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={last4.length !== 4 || busy}
                onClick={handleVerifyAndCheckIn}
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Check In"}
              </Button>
            </div>
          </Card>
        )}

        {step === "done" && result && (
          <Card className="p-6 text-center space-y-4">
            {result.ok ? (
              <>
                <CheckCircle2 className="w-16 h-16 text-primary mx-auto" />
                <div>
                  <p className="text-2xl font-bold">Welcome, {result.name}!</p>
                  <p className="text-sm text-muted-foreground mt-1">{result.message}</p>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="w-16 h-16 text-destructive mx-auto" />
                <div>
                  <p className="text-xl font-bold">{result.message}</p>
                </div>
              </>
            )}
            <Button className="w-full" onClick={reset}>
              Done
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
