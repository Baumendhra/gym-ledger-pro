import { useState, useMemo } from "react";
import { format } from "date-fns";
import { BarChart3, ChevronRight, Download, CreditCard, Users, CalendarDays, History } from "lucide-react";
import { useAllPayments, type PaymentWithMember } from "@/hooks/useAnalytics";
import { formatCurrency } from "@/lib/status";
import { exportMonthlyCSV } from "@/lib/export";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

type PlanBreakdown = {
  [key: string]: { amount: number; count: number };
};

type MonthData = {
  monthKey: string; // YYYY-MM
  label: string; // e.g., March 2026
  total: number;
  breakdown: PlanBreakdown;
  payments: PaymentWithMember[];
};

export default function AnalyticsPage() {
  const { data: allPayments = [], isLoading } = useAllPayments();
  const [selectedMonth, setSelectedMonth] = useState<MonthData | null>(null);

  // Group payments by month
  const monthlyData = useMemo(() => {
    const grouped = allPayments.reduce((acc: { [key: string]: MonthData }, payment) => {
      const date = new Date(payment.date);
      const monthKey = format(date, "yyyy-MM");
      const label = format(date, "MMMM yyyy");

      if (!acc[monthKey]) {
        acc[monthKey] = {
          monthKey,
          label,
          total: 0,
          breakdown: {
            "1_month": { amount: 0, count: 0 },
            "3_months": { amount: 0, count: 0 },
            "6_months": { amount: 0, count: 0 },
            "1_year": { amount: 0, count: 0 },
            "unknown": { amount: 0, count: 0 },
          },
          payments: [],
        };
      }

      acc[monthKey].total += payment.amount;
      acc[monthKey].payments.push(payment);

      const plan = payment.member?.membership_plan || "unknown";
      if (!acc[monthKey].breakdown[plan]) {
        acc[monthKey].breakdown[plan] = { amount: 0, count: 0 };
      }
      acc[monthKey].breakdown[plan].amount += payment.amount;
      acc[monthKey].breakdown[plan].count += 1;

      return acc;
    }, {});

    // Sort by most recent month first
    return Object.values(grouped).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [allPayments]);

  const currentMonthData = monthlyData[0]; // The most recent month in the data
  const historyData = monthlyData.slice(1);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const formatPlanName = (plan: string) => {
    switch (plan) {
      case "1_month": return "Monthly";
      case "3_months": return "3 Months";
      case "6_months": return "6 Months";
      case "1_year": return "Yearly";
      default: return "Other";
    }
  };

  return (
    <div className="px-4 pt-6 pb-24 max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
          <BarChart3 className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">Revenue & collections</p>
        </div>
      </div>

      {currentMonthData ? (
        <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5 shadow-sm">
          <CardHeader className="pb-3">
            <CardDescription className="font-medium text-primary">This Month Collection</CardDescription>
            <CardTitle className="text-4xl text-primary">{formatCurrency(currentMonthData.total)}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2.5">
              {Object.entries(currentMonthData.breakdown)
                .filter(([_, data]) => data.count > 0)
                .map(([plan, data]) => (
                <div key={plan} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/60"></div>
                    <span className="font-medium text-foreground">{formatPlanName(plan)}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold">{formatCurrency(data.amount)}</span>
                    <span className="text-muted-foreground text-xs ml-1">({data.count} members)</span>
                  </div>
                </div>
              ))}
            </div>
            <Button 
              variant="outline" 
              className="w-full text-xs h-9 bg-background/50 hover:bg-background"
              onClick={() => setSelectedMonth(currentMonthData)}
            >
              View Full Detail
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center py-10 bg-muted/20 rounded-xl border border-dashed border-border">
          <History className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground">No payment data available yet</p>
        </div>
      )}

      {historyData.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            Monthly History
          </h2>
          <div className="space-y-2">
            {historyData.map((month) => (
              <div 
                key={month.monthKey}
                onClick={() => setSelectedMonth(month)}
                className="bg-card border border-border rounded-xl p-4 flex items-center justify-between transition-colors hover:bg-muted/50 active:scale-[0.98] cursor-pointer"
              >
                <div>
                  <h3 className="font-medium">{month.label}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{month.payments.length} payments</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold">{formatCurrency(month.total)}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Sheet open={!!selectedMonth} onOpenChange={(open) => !open && setSelectedMonth(null)}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl sm:max-w-lg mx-auto p-0 flex flex-col">
          {selectedMonth && (
            <>
              <SheetHeader className="p-6 pb-4 border-b border-border/50 text-left relative shrink-0">
                <SheetTitle className="text-2xl">{selectedMonth.label}</SheetTitle>
                <SheetDescription>
                  Detailed breakdown of {selectedMonth.payments.length} payments
                </SheetDescription>
                <Button 
                  size="sm" 
                  className="absolute right-6 top-6 gap-1.5 h-8 text-xs"
                  onClick={() => exportMonthlyCSV(selectedMonth.payments, selectedMonth.label)}
                >
                  <Download className="w-3.5 h-3.5" />
                  CSV
                </Button>
              </SheetHeader>
              
              <div className="overflow-y-auto p-6 pt-4 space-y-6 pb-24 flex-1">
                {/* Details Summary */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
                    <p className="text-xs text-muted-foreground mb-1 font-medium">Total Collection</p>
                    <p className="text-xl font-bold text-primary">{formatCurrency(selectedMonth.total)}</p>
                  </div>
                  <div className="bg-muted/30 rounded-xl p-4 border border-border">
                    <p className="text-xs text-muted-foreground mb-1 font-medium">Total Payments</p>
                    <p className="text-xl font-bold flex items-center gap-2">
                      {selectedMonth.payments.length}
                      <CreditCard className="w-4 h-4 text-muted-foreground" />
                    </p>
                  </div>
                </div>

                {/* Plan Breakdown */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Plan Breakdown</h4>
                  <div className="bg-card border border-border rounded-xl divide-y divide-border/50">
                    {Object.entries(selectedMonth.breakdown)
                      .filter(([_, data]) => data.count > 0)
                      .map(([plan, data]) => (
                        <div key={plan} className="flex justify-between items-center p-3 text-sm">
                          <span className="font-medium">{formatPlanName(plan)}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground text-xs">{data.count} members</span>
                            <span className="font-semibold">{formatCurrency(data.amount)}</span>
                          </div>
                        </div>
                    ))}
                  </div>
                </div>

                {/* Payments List */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent Payments</h4>
                  <div className="space-y-2">
                    {selectedMonth.payments.map((payment) => (
                      <div key={payment.id} className="bg-card border border-border rounded-xl p-3 flex justify-between items-center">
                        <div>
                          <p className="font-medium text-sm flex items-center gap-2">
                            {payment.member?.name || "Unknown"}
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal uppercase">
                              {payment.mode}
                            </Badge>
                          </p>
                          <p className="text-xs text-muted-foreground truncate w-32 mt-0.5">
                            {formatPlanName(payment.member?.membership_plan || "unknown")} 
                            {payment.member?.package_type ? ` • ${payment.member.package_type}` : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">{formatCurrency(payment.amount)}</p>
                          <p className="text-[10px] text-muted-foreground">{format(new Date(payment.date), "dd MMM")}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
