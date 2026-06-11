import { useGetDashboardSummary, useGetRevenueTrend, useGetTopProducts, useGetRecentOrders, useGetLowStock, useGetSalesByHour, useGetSalesByCategory } from "@workspace/api-client-react";
import { useStoreId } from "@/lib/store-context";
import { formatCurrency, formatDate } from "@/lib/format";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight, AlertTriangle, Package, ShoppingBag, TrendingUp, Users, DollarSign, Clock, Store, CalendarClock, Undo2 } from "lucide-react";
import { Link } from "wouter";
import { OrderStatus } from "@workspace/api-client-react";
import { useT } from "@/lib/i18n-context";
import { SampleImportPrompt } from "@/components/sample-import-prompt";

interface ExpiringItem {
  id: string;
  productName: string;
  quantity: number;
  expiresAt: string;
  daysLeft: number;
  storeId: string;
  storeName: string;
  customerName: string;
  customerPhone: string;
}

export default function Dashboard() {
  const { storeId } = useStoreId();
  const t = useT();
  const queryParams = { storeId: storeId === 'all' ? undefined : storeId };

  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary(queryParams);
  const { data: trendData = [] } = useGetRevenueTrend({ ...queryParams, days: 14 });
  const { data: topProducts = [] } = useGetTopProducts({ ...queryParams, limit: 5 });
  const { data: recentOrders = [] } = useGetRecentOrders({ ...queryParams, limit: 5 });
  const { data: lowStock = [] } = useGetLowStock(queryParams);
  const { data: salesByHour = [] } = useGetSalesByHour(queryParams);
  const { data: salesByCategory = [] } = useGetSalesByCategory(queryParams);

  const expiringQueryKey = ["dashboard-expiring-soon", storeId, 7] as const;
  const { data: expiringItems = [] } = useQuery({
    queryKey: expiringQueryKey,
    queryFn: async (): Promise<ExpiringItem[]> => {
      const params = new URLSearchParams({ days: "7" });
      if (storeId !== "all") params.set("storeId", storeId);
      const res = await fetch(`/api/dashboard/expiring-soon?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(t.dashboard.loadExpiringError);
      return res.json();
    },
  });

  const returnStatsKey = ["dashboard-return-stats", storeId] as const;
  const { data: returnStats } = useQuery({
    queryKey: returnStatsKey,
    queryFn: async (): Promise<{
      pendingCount: number;
      monthCount: number;
      approvedThisMonth: number;
      rejectedThisMonth: number;
      byReason: { reasonCode: string; reasonLabel: string; count: number }[];
      byKind: { kind: string; count: number }[];
    }> => {
      const params = new URLSearchParams();
      if (storeId !== "all") params.set("storeId", storeId);
      const res = await fetch(`/api/dashboard/return-stats?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(t.dashboard.loadReturnsError);
      return res.json();
    },
  });

  if (loadingSummary) {
    return <div className="p-8 text-center text-muted-foreground">{t.dashboard.loadingOverview}</div>;
  }

  const statCards = [
    {
      title: t.dashboard.todayRevenue,
      value: formatCurrency(summary?.todayRevenue || 0),
      change: summary?.revenueChangePercent || 0,
      icon: DollarSign,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      title: t.dashboard.todayOrders,
      value: summary?.todayOrders || 0,
      change: summary?.ordersChangePercent || 0,
      icon: ShoppingBag,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: t.dashboard.avgOrderValue,
      value: formatCurrency(summary?.avgOrderValue || 0),
      change: null,
      icon: TrendingUp,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      title: t.dashboard.activeCustomers,
      value: summary?.activeCustomers || 0,
      change: null,
      icon: Users,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    }
  ];

  const ORDER_STATUS_LABELS: Record<string, string> = {
    [OrderStatus.received]: t.dashboard.orderStatusReceived,
    [OrderStatus.preparing]: t.dashboard.orderStatusPreparing,
    [OrderStatus.completed]: t.dashboard.orderStatusCompleted,
    [OrderStatus.delivered]: t.dashboard.orderStatusDelivered,
    [OrderStatus.canceled]: t.dashboard.orderStatusCanceled,
  };

  const ORDER_STATUS_COLORS: Record<string, string> = {
    [OrderStatus.received]: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    [OrderStatus.preparing]: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    [OrderStatus.completed]: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    [OrderStatus.delivered]: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800",
    [OrderStatus.canceled]: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700",
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <SampleImportPrompt />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">{t.dashboard.title}</h1>
          <p className="text-muted-foreground mt-1">{t.dashboard.businessActivity} {formatDate(new Date().toISOString(), "dd/MM/yyyy")}</p>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <Card key={i} className="border-card-border shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
              {stat.change !== null && (
                <div className="mt-4 flex items-center text-sm">
                  {stat.change > 0 ? (
                    <span className="flex items-center text-emerald-600 font-medium">
                      <ArrowUpRight className="w-4 h-4 mr-1" /> {stat.change.toFixed(1)}%
                    </span>
                  ) : stat.change < 0 ? (
                    <span className="flex items-center text-destructive font-medium">
                      <ArrowDownRight className="w-4 h-4 mr-1" /> {Math.abs(stat.change).toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-muted-foreground font-medium">{t.common.noChange}</span>
                  )}
                  <span className="text-muted-foreground ml-2">{t.common.comparedToYesterday}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle>{t.dashboard.revenueTrend}</CardTitle>
            <CardDescription>{t.dashboard.revenueTrendDesc}</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tickFormatter={(val) => formatDate(val, "dd/MM")} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(val) => `${val / 1000000}tr`} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} width={50} />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), t.dashboard.revenue]}
                  labelFormatter={(label) => formatDate(label, "dd/MM/yyyy")}
                  contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sales by Category */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>{t.dashboard.revenueByCategory}</CardTitle>
            <CardDescription>{t.dashboard.revenueByCategoryDesc}</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex flex-col justify-center">
            {salesByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={salesByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="revenue"
                    nameKey="categoryName"
                  >
                    {salesByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${(index % 5) + 1}))`} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-muted-foreground flex flex-col items-center">
                <PieChart className="w-12 h-12 mb-2 opacity-20" />
                {t.dashboard.noSalesData}
              </div>
            )}
            {salesByCategory.length > 0 && (
              <div className="flex flex-wrap justify-center gap-4 mt-4">
                {salesByCategory.map((c, i) => (
                  <div key={c.categoryName} className="flex items-center text-xs">
                    <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: `hsl(var(--chart-${(i % 5) + 1}))` }} />
                    <span className="truncate max-w-[100px]">{c.categoryName}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales by Hour */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle>{t.dashboard.revenueByHour}</CardTitle>
            <CardDescription>{t.dashboard.revenueByHourDesc}</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesByHour} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="hour" tickFormatter={(val) => `${val}:00`} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(val) => `${val / 1000000}tr`} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} width={50} />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    name === 'revenue' ? formatCurrency(value) : value, 
                    name === 'revenue' ? t.dashboard.revenue : t.dashboard.orderCount
                  ]}
                  labelFormatter={(label) => `${label}:00 - ${Number(label)+1}:00`}
                  cursor={{ fill: 'hsl(var(--muted))' }}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Low Stock + Expiring Stack */}
        <div className="space-y-6">
        <Card className="shadow-sm border-rose-200 dark:border-rose-900/50" data-testid="card-expiring-soon">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center text-rose-600 dark:text-rose-500 text-base">
                <CalendarClock className="w-5 h-5 mr-2" />
                {t.dashboard.expiringSoon}
              </CardTitle>
              {expiringItems.length > 0 && (
                <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100" data-testid="badge-expiring-count">
                  {expiringItems.length}
                </Badge>
              )}
            </div>
            <CardDescription>{t.dashboard.expiringSoonDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            {expiringItems.length === 0 ? (
              <div className="text-center text-muted-foreground py-6 text-sm">
                {t.dashboard.noExpiring}
              </div>
            ) : (
              <div className="space-y-3">
                {expiringItems.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-start border-b border-border/50 pb-3 last:border-0 last:pb-0"
                    data-testid={`row-expiring-${item.id}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate" title={item.productName}>
                        {item.productName}
                        <span className="text-muted-foreground font-normal ml-1">×{item.quantity}</span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {item.customerName}
                        {item.customerPhone ? ` · ${item.customerPhone}` : ""}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{item.storeName}</div>
                    </div>
                    <div className="text-right whitespace-nowrap pl-2">
                      <div
                        className={`font-bold text-sm ${
                          item.daysLeft <= 2
                            ? "text-rose-600"
                            : item.daysLeft <= 5
                            ? "text-amber-600"
                            : "text-emerald-600"
                        }`}
                      >
                        {item.daysLeft === 0 ? t.common.today : `${item.daysLeft} ${t.common.days}`}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {formatDate(item.expiresAt, "dd/MM")}
                      </div>
                    </div>
                  </div>
                ))}
                {expiringItems.length > 6 && (
                  <div className="text-center pt-1">
                    <span className="text-xs text-muted-foreground">+ {expiringItems.length - 6} {t.common.moreItems}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-amber-200 dark:border-amber-900/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center text-amber-600 dark:text-amber-500">
                <AlertTriangle className="w-5 h-5 mr-2" />
                {t.dashboard.lowStock}
              </CardTitle>
              {summary && summary.lowStockCount > 0 && (
                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">{summary.lowStockCount}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                {t.dashboard.allStocked}
              </div>
            ) : (
              <div className="space-y-4">
                {lowStock.slice(0, 6).map((item) => (
                  <div key={item.id} className="flex justify-between items-center border-b border-border/50 pb-3 last:border-0 last:pb-0">
                    <div>
                      <div className="font-medium text-sm truncate max-w-[150px]" title={item.itemName}>{item.itemName}</div>
                      <div className="text-xs text-muted-foreground">{item.storeName}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-amber-600 text-sm">{item.quantity} {item.unit}</div>
                      <div className="text-[10px] text-muted-foreground">Min: {item.minQuantity}</div>
                    </div>
                  </div>
                ))}
                {lowStock.length > 6 && (
                  <div className="text-center pt-2">
                    <span className="text-xs text-muted-foreground">+ {lowStock.length - 6} {t.common.moreItems}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Returns / Exchanges widget */}
      <Card className="shadow-sm border-card-border">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="flex items-center text-base">
              <Undo2 className="w-5 h-5 mr-2 text-primary" />
              {t.dashboard.returnsTitle}
            </CardTitle>
            <CardDescription>{t.dashboard.returnsDesc}</CardDescription>
          </div>
          <Link href="/returns">
            <span className="text-xs text-primary hover:underline cursor-pointer" data-testid="link-returns-detail">
              {t.common.viewDetails} →
            </span>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <div className="text-[11px] text-amber-700">{t.dashboard.pendingReturns}</div>
              <div className="text-xl font-bold text-amber-700" data-testid="dash-returns-pending">
                {returnStats?.pendingCount ?? 0}
              </div>
            </div>
            <div className="bg-muted rounded-lg px-3 py-2">
              <div className="text-[11px] text-muted-foreground">{t.dashboard.monthTotal}</div>
              <div className="text-xl font-bold" data-testid="dash-returns-month">
                {returnStats?.monthCount ?? 0}
              </div>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              <div className="text-[11px] text-emerald-700">{t.dashboard.approvedMonth}</div>
              <div className="text-xl font-bold text-emerald-700">
                {returnStats?.approvedThisMonth ?? 0}
              </div>
            </div>
            <div className="bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              <div className="text-[11px] text-rose-700">{t.dashboard.rejectedMonth}</div>
              <div className="text-xl font-bold text-rose-700">
                {returnStats?.rejectedThisMonth ?? 0}
              </div>
            </div>
          </div>
          {returnStats && returnStats.byReason.length > 0 && (
            <div className="text-xs">
              <div className="text-muted-foreground mb-1">{t.dashboard.commonReasons}</div>
              <div className="flex flex-wrap gap-1.5">
                {returnStats.byReason.slice(0, 6).map((r) => (
                  <Badge key={r.reasonCode} variant="outline" className="text-[10px]">
                    {r.reasonLabel}: {r.count}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2 text-primary" />
              {t.dashboard.recentOrders}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">{t.dashboard.noOrdersToday}</div>
            ) : (
              <div className="space-y-4">
                {recentOrders.map(order => (
                  <div key={order.id} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                        {order.code.slice(-4)}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{order.customerName || t.common.guest} <span className="text-muted-foreground font-normal ml-1">({order.itemCount} {t.common.items})</span></div>
                        <div className="text-xs text-muted-foreground">{formatDate(order.createdAt, "HH:mm")} • {order.storeName}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm">{formatCurrency(order.total)}</div>
                      <Badge variant="outline" className={`mt-1 text-[10px] px-1.5 py-0 border ${ORDER_STATUS_COLORS[order.status]}`}>
                        {ORDER_STATUS_LABELS[order.status]}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="w-5 h-5 mr-2 text-primary" />
              {t.dashboard.topProducts}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">{t.common.noData}</div>
            ) : (
              <div className="space-y-4">
                {topProducts.map((product, idx) => (
                  <div key={product.productId} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-md flex items-center justify-center font-bold text-sm
                        ${idx === 0 ? 'bg-amber-100 text-amber-700' : 
                          idx === 1 ? 'bg-slate-200 text-slate-700' : 
                          idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-muted text-muted-foreground'}`}>
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{product.productName}</div>
                        <div className="text-xs text-muted-foreground">{t.dashboard.soldCount}: {product.quantitySold}</div>
                      </div>
                    </div>
                    <div className="font-bold text-sm text-right">
                      {formatCurrency(product.revenue)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
