import {
  useGetStaffPerformance,
  useGetStoreComparison,
  useGetIngredientConsumption,
  useGetIncomeExpenseReport,
  useListStores,
} from "@workspace/api-client-react";
import { useStoreId } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { Store, UserCircle, Leaf, Wallet, TrendingUp, TrendingDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMemo, useState } from "react";
import { useT } from "@/lib/i18n-context";

function currentMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default function ReportsPage() {
  const t = useT();
  const { storeId } = useStoreId();
  const queryParams = { storeId: storeId === 'all' ? undefined : storeId };

  const { data: staffPerformance = [], isLoading: pLoading } = useGetStaffPerformance(queryParams);
  const { data: storeComparison = [], isLoading: sLoading } = useGetStoreComparison();
  const { data: consumption = [], isLoading: cLoading } = useGetIngredientConsumption({ ...queryParams, limit: 10 });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">{t.reports.title}</h1>
        <p className="text-muted-foreground mt-1">{t.reports.subtitle}</p>
      </div>

      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance" data-testid="tab-reports-performance">
            {t.reports.performanceTab}
          </TabsTrigger>
          <TabsTrigger value="income-expense" data-testid="tab-reports-income-expense">
            {t.expenses.title}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="performance">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-sm lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Leaf className="w-5 h-5 mr-2 text-emerald-600" />
                  {t.reports.ingredientConsumption}
                </CardTitle>
                <CardDescription>{t.reports.ingredientConsumptionDesc}</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                {cLoading ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground">{t.common.loading}</div>
                ) : consumption.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground">{t.common.noData}</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={consumption} margin={{ top: 10, right: 10, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="ingredientName" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" height={60} />
                      <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="right" orientation="right" tickFormatter={(val) => `${val/1000}k`} tick={{ fontSize: 12 }} />
                      <Tooltip
                        formatter={(value: number, name: string, props: any) => {
                          if (name === 'consumed') return [`${value} ${props.payload.unit}`, t.reports.consumptionQty];
                          if (name === 'cost') return [formatCurrency(value), t.reports.costValue];
                          return [value, name];
                        }}
                        cursor={{ fill: 'hsl(var(--muted))' }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '20px' }}/>
                      <Bar yAxisId="left" dataKey="consumed" name={t.reports.consumptionQty} fill="hsl(var(--emerald-500, 160 84% 39%))" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      <Bar yAxisId="right" dataKey="cost" name={t.reports.costValue} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <UserCircle className="w-5 h-5 mr-2 text-blue-500" />
                  {t.staff.title} ({t.reports.today})
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-0">
                {pLoading ? (
                  <div className="p-8 text-center text-muted-foreground">{t.common.loading}</div>
                ) : (
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>{t.staff.staff}</TableHead>
                        <TableHead className="text-right">{t.reports.orders}</TableHead>
                        <TableHead className="text-right">{t.reports.revenue}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staffPerformance.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">{t.common.noData}</TableCell>
                        </TableRow>
                      ) : (
                        staffPerformance.map((staff) => (
                          <TableRow key={staff.staffId}>
                            <TableCell className="font-medium">
                              {staff.staffName}
                              <div className="text-xs text-muted-foreground font-normal">{staff.role}</div>
                            </TableCell>
                            <TableCell className="text-right">{staff.ordersHandled}</TableCell>
                            <TableCell className="text-right font-bold text-primary">{formatCurrency(staff.revenue)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Store className="w-5 h-5 mr-2 text-purple-500" />
                  {t.reports.byStore} ({t.reports.today})
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-0">
                {sLoading ? (
                  <div className="p-8 text-center text-muted-foreground">{t.common.loading}</div>
                ) : (
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>{t.staff.store}</TableHead>
                        <TableHead className="text-right">{t.reports.orders}</TableHead>
                        <TableHead className="text-right">{t.reports.revenue}</TableHead>
                        <TableHead className="text-right hidden sm:table-cell">{t.reports.avgOrder}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {storeComparison.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">{t.common.noData}</TableCell>
                        </TableRow>
                      ) : (
                        storeComparison.map((s, i) => (
                          <TableRow key={s.storeId} className={i === 0 ? "bg-amber-500/5" : ""}>
                            <TableCell className="font-medium">{s.storeName}</TableCell>
                            <TableCell className="text-right">{s.orders}</TableCell>
                            <TableCell className="text-right font-bold text-primary">{formatCurrency(s.revenue)}</TableCell>
                            <TableCell className="text-right text-muted-foreground hidden sm:table-cell">{formatCurrency(s.avgOrderValue)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="income-expense">
          <IncomeExpenseReportPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function IncomeExpenseReportPanel() {
  const t = useT();
  const { storeId } = useStoreId();
  const { user } = useAuth();
  const { data: stores = [] } = useListStores();
  const visibleStores = useMemo(() => {
    if (!user) return stores;
    if (user.role === "owner") return stores;
    return stores.filter((s) => user.storeIds.includes(s.id));
  }, [stores, user]);
  const [month, setMonth] = useState<string>(currentMonth());
  const filterStoreId = storeId && storeId !== "all" ? storeId : undefined;
  const { data: report, isLoading } = useGetIncomeExpenseReport({
    month,
    ...(filterStoreId ? { storeId: filterStoreId } : {}),
  });

  const revenue = report?.revenue ?? 0;
  const expenses = report?.expensesTotal ?? 0;
  const net = report?.net ?? 0;
  const orderCount = report?.orderCount ?? 0;
  const isProfit = net >= 0;

  return (
    <div className="space-y-4">
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Wallet className="w-5 h-5 mr-2 text-primary" />
                {t.expenses.title}
              </CardTitle>
              <CardDescription>
                {t.expenses.subtitle}
              </CardDescription>
            </div>
            <div className="flex items-end gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{t.reports.thisMonth}</Label>
                <Input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value || currentMonth())}
                  className="w-[180px]"
                  data-testid="input-income-expense-month"
                />
              </div>
              <div className="text-xs text-muted-foreground pb-2">
                {filterStoreId
                  ? `${t.expenses.store}: ${visibleStores.find((s) => s.id === filterStoreId)?.name ?? ""}`
                  : t.layout.allStores}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-10 text-center text-muted-foreground">{t.common.loading}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg border bg-card p-4">
                <div className="text-xs uppercase text-muted-foreground tracking-wide">
                  {t.reports.revenue}
                </div>
                <div className="text-2xl font-bold text-primary mt-1" data-testid="text-report-revenue">
                  {formatCurrency(revenue)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{orderCount} {t.common.orders}</div>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <div className="text-xs uppercase text-muted-foreground tracking-wide">
                  {t.expenses.title}
                </div>
                <div className="text-2xl font-bold text-destructive mt-1" data-testid="text-report-expenses">
                  {formatCurrency(expenses)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {report?.byCategory.length ?? 0} {t.expenses.category.toLowerCase()}
                </div>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <div className="text-xs uppercase text-muted-foreground tracking-wide">
                  {t.reports.netProfit}
                </div>
                <div
                  className={`text-2xl font-bold mt-1 ${isProfit ? "text-emerald-600" : "text-destructive"}`}
                  data-testid="text-report-net"
                >
                  {formatCurrency(net)}
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  {isProfit ? (
                    <>
                      <TrendingUp className="w-3 h-3 text-emerald-600" /> {t.reports.profitable}
                    </>
                  ) : (
                    <>
                      <TrendingDown className="w-3 h-3 text-destructive" /> {t.reports.loss}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">{t.reports.byStore}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead>{t.expenses.store}</TableHead>
                  <TableHead className="text-right">{t.reports.revenue}</TableHead>
                  <TableHead className="text-right">{t.expenses.title}</TableHead>
                  <TableHead className="text-right">{t.reports.netCol}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!report || report.byStore.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                      {t.common.noData}
                    </TableCell>
                  </TableRow>
                ) : (
                  report.byStore.map((s) => (
                    <TableRow key={s.storeId} data-testid={`row-report-store-${s.storeId}`}>
                      <TableCell className="font-medium">{s.storeName}</TableCell>
                      <TableCell className="text-right text-primary font-semibold">
                        {formatCurrency(s.revenue)}
                      </TableCell>
                      <TableCell className="text-right text-destructive">
                        {formatCurrency(s.expenses)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-bold ${s.net >= 0 ? "text-emerald-600" : "text-destructive"}`}
                      >
                        {formatCurrency(s.net)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">{t.expenses.title} - {t.expenses.category}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead>{t.expenses.category}</TableHead>
                  <TableHead className="text-right">{t.reports.countCol}</TableHead>
                  <TableHead className="text-right">{t.expenses.amount}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!report || report.byCategory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                      {t.expenses.noExpenses}
                    </TableCell>
                  </TableRow>
                ) : (
                  report.byCategory.map((c, i) => (
                    <TableRow key={c.categoryId ?? `none-${i}`}>
                      <TableCell className="font-medium">{c.categoryName}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{c.count}</TableCell>
                      <TableCell className="text-right text-destructive font-semibold">
                        {formatCurrency(c.amount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
