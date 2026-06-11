import { lazy, Suspense, useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, Redirect, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Coffee,
  ShoppingBag,
  UserCircle,
  Tag,
  BarChart3,
  LogOut,
  KeyRound,
  Store,
  CalendarClock,
  LayoutDashboard,
  CheckCircle2,
  Trash2,
  Undo2,
  Menu,
  Settings as SettingsIcon,
  ChevronDown,
  ChevronUp,
  Star,
  Camera,
  X,
  Share2,
  Copy,
  Users,
  MapPin,
  Plus,
  Pencil,
} from "lucide-react";
import SettingsPage from "@/pages/settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth, type CurrentUser } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useT } from "@/lib/i18n-context";
import { useI18n } from "@/lib/i18n-context";

const CameraFace = lazy(() => import("@/components/camera-face"));

interface MyOrderReturn {
  id: string;
  kind: "cancel_refund" | "exchange";
  status: "pending" | "approved" | "rejected";
  reasonCode: string;
  requestedAt: string;
  processedAt: string | null;
  staffNote: string | null;
}

interface MyOrder {
  id: string;
  code: string;
  total: number;
  status: string;
  rated: boolean;
  createdAt: string;
  storeId: string;
  storeSlug: string;
  storeName: string;
  allGrocery: boolean;
  eligibleForReturn: boolean;
  lastReturn: MyOrderReturn | null;
}

const RETURN_REASON_CODES = ["wrong_item", "not_needed", "defective", "not_as_described", "want_other", "other"] as const;

const RETURN_STATUS_CLS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
};

interface MyPromo {
  id: string;
  code: string;
  name: string;
  kind: "new_account" | "percent_invoice" | "percent_shipping" | "fixed";
  type: "percent" | "fixed";
  value: number;
  minOrder: number;
  maxDiscount: number | null;
  requiresCode: boolean;
  endDate: string;
  isUsed: boolean;
}

interface MyReferralEntry {
  id: string;
  orderId: string;
  orderCode: string;
  amount: number;
  referredName: string;
  createdAt: string;
}

interface MyReferral {
  referralCode: string | null;
  balance: number;
  invitedCount: number;
  history: MyReferralEntry[];
}

interface MyExpiryItem {
  id: string;
  productName: string;
  quantity: number;
  purchasedAt: string;
  expiresAt: string;
  dismissed: boolean;
  storeId: string;
  storeSlug: string;
  storeName: string;
}

const formatVnd = (n: number) => new Intl.NumberFormat("vi-VN").format(n) + " ₫";

const ORDER_STATUS_CLS: Record<string, string> = {
  received: "bg-amber-100 text-amber-700",
  preparing: "bg-blue-100 text-blue-700",
  completed: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  canceled: "bg-red-100 text-red-700",
};

const ORDER_SUB_TAB_KEYS: { value: string; tKey: string; statuses: string[] }[] = [
  { value: "all", tKey: "orderStatusAll", statuses: [] },
  { value: "received", tKey: "orderStatusReceived", statuses: ["received"] },
  { value: "preparing", tKey: "orderStatusPreparing", statuses: ["preparing"] },
  { value: "completed", tKey: "orderStatusCompleted", statuses: ["completed"] },
  { value: "delivered", tKey: "orderStatusDelivered", statuses: ["delivered"] },
  { value: "canceled", tKey: "orderStatusCanceled", statuses: ["canceled"] },
];

type SectionKey = "overview" | "orders" | "promos" | "expiry" | "addresses" | "profile" | "settings";

interface MyAddress {
  id: string;
  label: string;
  recipientName: string;
  recipientPhone: string;
  address: string;
  lat: number | null;
  lng: number | null;
  isDefault: boolean;
  createdAt: string;
}

export default function AccountPage() {
  const t = useT();
  const { user, loading, logout } = useAuth();
  const [, setLocation] = useLocation();
  const handleLogout = async () => {
    setLocation("/");
    await logout();
  };
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        {t.common.loading}
      </div>
    );
  }
  if (!user) return <Redirect to="/login?next=/account" />;
  if (user.role !== "customer") {
    if (user.role === "platform_admin") return <Redirect to="/admin" />;
    return <Redirect to="/dashboard" />;
  }
  return <AccountInner user={user} onLogout={handleLogout} />;
}

function AccountInner({ user, onLogout }: { user: CurrentUser; onLogout: () => Promise<void> }) {
  const t = useT();
  const { lang } = useI18n();
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(lang === "vi" ? "vi-VN" : "en-US", { dateStyle: "short", timeStyle: "short" });
  const formatDateOnly = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === "vi" ? "vi-VN" : "en-US", { day: "2-digit", month: "2-digit", year: "numeric" });
  const [section, setSection] = useState<SectionKey>("overview");
  const [orderSubTab, setOrderSubTab] = useState<string>("all");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const ordersQuery = useQuery({
    queryKey: ["my-orders"],
    queryFn: async (): Promise<MyOrder[]> => {
      const res = await fetch("/api/storefront/my-orders", { credentials: "include" });
      if (!res.ok) throw new Error(t.account.loadOrdersError);
      return res.json();
    },
  });
  const promosQuery = useQuery({
    queryKey: ["my-promotions"],
    queryFn: async (): Promise<MyPromo[]> => {
      const res = await fetch("/api/storefront/my-promotions", { credentials: "include" });
      if (!res.ok) throw new Error(t.account.loadPromosError);
      return res.json();
    },
  });
  const pointsQuery = useQuery({
    queryKey: ["my-points"],
    queryFn: async (): Promise<{ points: number; equivalentVnd: number }> => {
      const res = await fetch("/api/storefront/my-points", { credentials: "include" });
      if (!res.ok) throw new Error(t.account.loadPointsError);
      return res.json();
    },
  });
  const referralQuery = useQuery({
    queryKey: ["my-referral"],
    queryFn: async (): Promise<MyReferral> => {
      const res = await fetch("/api/storefront/my-referral", { credentials: "include" });
      if (!res.ok) throw new Error(t.account.referralRedeemFailed);
      return res.json();
    },
  });
  const expiryQuery = useQuery({
    queryKey: ["my-expiry-items"],
    queryFn: async (): Promise<MyExpiryItem[]> => {
      const res = await fetch("/api/storefront/my-expiry-items?includeDismissed=true", {
        credentials: "include",
      });
      if (!res.ok) throw new Error(t.account.loadExpiryError);
      return res.json();
    },
  });

  const stats = useMemo(() => {
    const orders = ordersQuery.data ?? [];
    const completed = orders.filter((o) => o.status !== "canceled");
    const totalSpent = completed.reduce((s, o) => s + o.total, 0);
    const now = new Date();
    const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthSpent = completed
      .filter((o) => new Date(o.createdAt) >= monthAgo)
      .reduce((s, o) => s + o.total, 0);
    const storeCount = new Map<string, number>();
    for (const o of completed) storeCount.set(o.storeName, (storeCount.get(o.storeName) ?? 0) + 1);
    let favStore: string | null = null;
    let favCount = 0;
    for (const [name, c] of storeCount) {
      if (c > favCount) {
        favCount = c;
        favStore = name;
      }
    }
    return {
      totalOrders: orders.length,
      completedOrders: completed.length,
      totalSpent,
      monthSpent,
      favStore,
      favCount,
    };
  }, [ordersQuery.data]);

  const activePromos = (promosQuery.data ?? []).filter((p) => !p.isUsed);
  const usedPromos = (promosQuery.data ?? []).filter((p) => p.isUsed);
  const activeExpiry = (expiryQuery.data ?? []).filter((e) => !e.dismissed);

  const orderCountsByStatus = useMemo(() => {
    const orders = ordersQuery.data ?? [];
    const map: Record<string, number> = { all: orders.length };
    for (const o of orders) map[o.status] = (map[o.status] ?? 0) + 1;
    return map;
  }, [ordersQuery.data]);

  const navItems: { key: SectionKey; label: string; icon: typeof LayoutDashboard; count?: number }[] = [
    { key: "overview", label: t.account.overview, icon: LayoutDashboard },
    { key: "orders", label: t.account.myOrders, icon: ShoppingBag, count: stats.totalOrders },
    { key: "promos", label: t.account.promotions, icon: Tag, count: activePromos.length },
    { key: "expiry", label: t.account.expiryManagement, icon: CalendarClock, count: activeExpiry.length },
    { key: "addresses", label: t.account.addressesTitle, icon: MapPin },
    { key: "profile", label: t.account.profile, icon: UserCircle },
    { key: "settings", label: t.account.settings, icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col">
      <header className="bg-primary text-primary-foreground" data-testid="account-header">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 hover-elevate rounded-md px-2 py-1">
            <div className="bg-primary-foreground/15 p-2 rounded-lg">
              <Coffee className="h-5 w-5" />
            </div>
            <span className="font-semibold">VComm Store Retail</span>
          </Link>
          <div className="flex items-center gap-2">
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="lg:hidden bg-transparent text-primary-foreground border-primary-foreground/40 hover:bg-primary-foreground/10"
                  data-testid="button-mobile-menu"
                  aria-label={t.account.openMenu}
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle>{t.account.myAccount}</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1 p-2" data-testid="mobile-account-nav">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = section === item.key;
                    return (
                      <button
                        key={item.key}
                        onClick={() => {
                          setSection(item.key);
                          setMobileNavOpen(false);
                        }}
                        data-testid={`mobile-sidebar-${item.key}`}
                        className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                          active
                            ? "bg-primary text-primary-foreground"
                            : "text-foreground hover:bg-muted"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </span>
                        {item.count !== undefined && item.count > 0 && (
                          <Badge
                            variant={active ? "secondary" : "outline"}
                            className="text-[10px] px-1.5 py-0"
                          >
                            {item.count}
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </SheetContent>
            </Sheet>
            <Link href="/">
              <Button variant="secondary" size="sm" data-testid="button-back-home">
                <Store className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">{t.account.shopping}</span>
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              className="bg-transparent text-primary-foreground border-primary-foreground/40 hover:bg-primary-foreground/10"
              onClick={() => onLogout()}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">{t.account.logout}</span>
            </Button>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-6 pt-2">
          <h1 className="text-2xl sm:text-3xl font-bold" data-testid="text-account-title">
            {t.account.greeting} {user.name}
          </h1>
          <p className="mt-1 text-primary-foreground/80 text-sm">
            {t.account.accountSubtitle}
          </p>
        </div>
      </header>

      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 flex-1 flex flex-col lg:flex-row gap-6">
        {/* LEFT SIDEBAR (desktop only — mobile uses Sheet drawer) */}
        <aside className="hidden lg:block lg:w-64 lg:shrink-0" data-testid="account-sidebar">
          <Card className="lg:sticky lg:top-4">
            <CardContent className="p-2">
              <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = section === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => setSection(item.key)}
                      data-testid={`sidebar-${item.key}`}
                      className={`flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                        active
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </span>
                      {item.count !== undefined && item.count > 0 && (
                        <Badge
                          variant={active ? "secondary" : "outline"}
                          className="text-[10px] px-1.5 py-0"
                        >
                          {item.count}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </nav>
            </CardContent>
          </Card>
        </aside>

        {/* RIGHT CONTENT */}
        <section className="flex-1 min-w-0 space-y-6">
          {section === "overview" && (
            <OverviewSection stats={stats} expiryCount={activeExpiry.length} promoCount={activePromos.length} />
          )}

          {section === "orders" && (
            <OrdersSection
              ordersQuery={ordersQuery}
              orderSubTab={orderSubTab}
              setOrderSubTab={setOrderSubTab}
              counts={orderCountsByStatus}
            />
          )}

          {section === "promos" && (
            <PromosSection
              promosQuery={promosQuery}
              pointsQuery={pointsQuery}
              referralQuery={referralQuery}
              activePromos={activePromos}
              usedPromos={usedPromos}
            />
          )}

          {section === "expiry" && <ExpirySection expiryQuery={expiryQuery} />}

          {section === "addresses" && <AddressesSection />}

          {section === "profile" && <ProfileEditor user={user} />}
          {section === "settings" && <SettingsPage />}
        </section>
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        {t.common.brandFooter}
      </footer>
    </div>
  );
}

function OverviewSection({
  stats,
  expiryCount,
  promoCount,
}: {
  stats: { totalOrders: number; totalSpent: number; monthSpent: number; favStore: string | null; favCount: number };
  expiryCount: number;
  promoCount: number;
}) {
  const t = useT();
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">{t.account.overviewTitle}</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label={t.account.totalOrders} value={String(stats.totalOrders)} testid="stat-total-orders" />
        <StatCard
          label={t.account.totalSpent}
          value={formatVnd(stats.totalSpent)}
          testid="stat-total-spent"
        />
        <StatCard
          label={t.account.thisMonth}
          value={formatVnd(stats.monthSpent)}
          testid="stat-month-spent"
        />
        <StatCard
          label={t.account.favoriteStore}
          value={stats.favStore ? `${stats.favStore} (${stats.favCount})` : "—"}
          testid="stat-favorite-store"
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-amber-100 text-amber-700 rounded-lg p-2">
              <Tag className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-sm text-muted-foreground">{t.account.availablePromos}</div>
              <div className="text-lg font-semibold" data-testid="overview-promo-count">
                {promoCount}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-rose-100 text-rose-700 rounded-lg p-2">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-sm text-muted-foreground">{t.account.expiryTracking}</div>
              <div className="text-lg font-semibold" data-testid="overview-expiry-count">
                {expiryCount}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function OrdersSection({
  ordersQuery,
  orderSubTab,
  setOrderSubTab,
  counts,
}: {
  ordersQuery: ReturnType<typeof useQuery<MyOrder[], Error>>;
  orderSubTab: string;
  setOrderSubTab: (v: string) => void;
  counts: Record<string, number>;
}) {
  const t = useT();
  const data = ordersQuery.data ?? [];
  const filtered =
    orderSubTab === "all"
      ? data
      : data.filter((o) => {
          const tab = ORDER_SUB_TAB_KEYS.find((tk) => tk.value === orderSubTab);
          return tab ? tab.statuses.includes(o.status) : true;
        });

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold">{t.account.myOrdersTitle}</h2>

      <div
        className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1"
        data-testid="order-sub-tabs"
      >
        {ORDER_SUB_TAB_KEYS.map((tab) => {
          const active = tab.value === orderSubTab;
          const count = counts[tab.value] ?? 0;
          return (
            <button
              key={tab.value}
              onClick={() => setOrderSubTab(tab.value)}
              data-testid={`order-tab-${tab.value}`}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border hover:bg-muted"
              }`}
            >
              {(t.account as any)[tab.tKey]}
              {count > 0 && (
                <span className={`ml-1.5 ${active ? "opacity-90" : "text-muted-foreground"}`}>
                  ({count})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {ordersQuery.isLoading && (
        <p className="text-muted-foreground text-sm">{t.account.loadingOrders}</p>
      )}
      {ordersQuery.error && (
        <Alert variant="destructive">
          <AlertDescription>{(ordersQuery.error as Error).message}</AlertDescription>
        </Alert>
      )}

      {!ordersQuery.isLoading && data.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground space-y-3">
            <BarChart3 className="h-8 w-8 mx-auto opacity-50" />
            <p>{t.account.noOrdersYet}</p>
            <Link href="/">
              <Button size="sm" data-testid="button-empty-shop">
                {t.account.exploreStores}
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {!ordersQuery.isLoading && data.length > 0 && filtered.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            {t.account.noOrdersInStatus}
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {filtered.map((o) => (
          <OrderCard key={o.id} order={o} />
        ))}
      </div>
    </div>
  );
}

interface OrderDetailItem {
  id: string;
  productName: string;
  productType: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  note: string;
}
interface OrderDetailPromo {
  code: string;
  name: string;
  discountAmount: number;
}
interface OrderDetail {
  id: string;
  code: string;
  status: string;
  paymentMethod: string;
  paid: boolean;
  note: string;
  subtotal: number;
  discount: number;
  total: number;
  itemCount: number;
  createdAt: string;
  storeSlug: string;
  storeName: string;
  items: OrderDetailItem[];
  promotions: OrderDetailPromo[];
}

const PAYMENT_METHOD_TKEYS: Record<string, string> = {
  cash: "paymentCash",
  qr: "paymentQr",
  ewallet: "paymentEwallet",
  card: "paymentCard",
  cod: "paymentCod",
};

const ORDER_STATUS_TKEYS: Record<string, string> = {
  received: "orderStatusReceived",
  preparing: "orderStatusPreparing",
  completed: "orderStatusCompleted",
  delivered: "orderStatusDelivered",
  canceled: "orderStatusCanceled",
};

const RETURN_KIND_TKEYS: Record<string, string> = {
  cancel_refund: "returnKindCancelRefund",
  exchange: "returnKindExchange",
};

const RETURN_STATUS_TKEYS: Record<string, string> = {
  pending: "returnStatusPending",
  approved: "returnStatusApproved",
  rejected: "returnStatusRejected",
};

const RETURN_REASON_TKEYS: Record<string, string> = {
  wrong_item: "returnReasonWrongItem",
  not_needed: "returnReasonNotNeeded",
  defective: "returnReasonDefective",
  not_as_described: "returnReasonNotAsDescribed",
  want_other: "returnReasonWantOther",
  other: "returnReasonOther",
};

function OrderCard({ order: o }: { order: MyOrder }) {
  const t = useT();
  const { lang } = useI18n();
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(lang === "vi" ? "vi-VN" : "en-US", { dateStyle: "short", timeStyle: "short" });
  const statusTKey = ORDER_STATUS_TKEYS[o.status];
  const statusLabel = statusTKey ? (t.account as any)[statusTKey] : o.status;
  const statusCls = ORDER_STATUS_CLS[o.status] ?? "bg-gray-100 text-gray-700";
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const lr = o.lastReturn;
  const lrStatusTKey = lr ? RETURN_STATUS_TKEYS[lr.status] : null;
  const lrStatusLabel = lrStatusTKey ? (t.account as any)[lrStatusTKey] : lr?.status;
  const lrStatusCls = lr ? RETURN_STATUS_CLS[lr.status] : "";

  const detailQuery = useQuery({
    queryKey: ["order-detail", o.id],
    enabled: expanded,
    queryFn: async (): Promise<OrderDetail> => {
      const res = await fetch(`/api/storefront/orders/${o.id}`, { credentials: "include" });
      if (!res.ok) throw new Error(t.account.loadDetailError);
      return res.json();
    },
  });

  return (
    <>
      <Card data-testid={`card-order-${o.code}`}>
        <CardContent className="p-4 space-y-3">
          <div
            className="flex flex-col sm:flex-row sm:items-center gap-3 cursor-pointer"
            onClick={() => setExpanded((v) => !v)}
            data-testid={`toggle-order-${o.code}`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold" data-testid={`text-order-code-${o.code}`}>
                  #{o.code}
                </span>
                <Badge className={statusCls}>{statusLabel}</Badge>
                {o.allGrocery && (
                  <Badge variant="outline" className="text-[10px]">
                    {t.account.groceryBadge}
                  </Badge>
                )}
              </div>
              <Link
                href={`/shop/${o.storeSlug}`}
                onClick={(e) => e.stopPropagation()}
                className="text-sm text-muted-foreground hover:underline inline-flex items-center gap-1 mt-1"
              >
                <Store className="h-3.5 w-3.5" /> {o.storeName}
              </Link>
              <div className="text-xs text-muted-foreground mt-0.5">
                {formatDate(o.createdAt)}
              </div>
            </div>
            <div className="text-right sm:min-w-[140px]">
              <div
                className="font-semibold text-lg"
                data-testid={`text-order-total-${o.code}`}
              >
                {formatVnd(o.total)}
              </div>
              {o.status === "delivered" && !o.rated && (
                <div className="text-xs text-amber-700 mt-1">{t.account.notRated}</div>
              )}
            </div>
            <div className="text-muted-foreground">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </div>

          {expanded && (
            <div className="border-t pt-3 space-y-3" data-testid={`detail-order-${o.code}`}>
              {detailQuery.isLoading && (
                <div className="text-sm text-muted-foreground">{t.account.loadingDetail}</div>
              )}
              {detailQuery.error && (
                <div className="text-sm text-destructive">{t.account.loadDetailError}</div>
              )}
              {detailQuery.data && (
                <>
                  <div className="space-y-1.5">
                    {detailQuery.data.items.map((it) => (
                      <div key={it.id} className="flex items-start justify-between gap-2 text-sm">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium">{it.productName}</div>
                          <div className="text-xs text-muted-foreground">
                            {it.quantity} × {formatVnd(it.unitPrice)}
                            {it.note ? ` · ${it.note}` : ""}
                          </div>
                        </div>
                        <div className="font-medium whitespace-nowrap">{formatVnd(it.lineTotal)}</div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t pt-2 space-y-1 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>{t.account.subtotal}</span>
                      <span>{formatVnd(detailQuery.data.subtotal)}</span>
                    </div>
                    {detailQuery.data.promotions.map((p) => (
                      <div key={p.code} className="flex justify-between text-emerald-700">
                        <span>{t.account.promoCodePrefix} {p.code}</span>
                        <span>-{formatVnd(p.discountAmount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-semibold pt-1 border-t">
                      <span>{t.account.totalAmount}</span>
                      <span>{formatVnd(detailQuery.data.total)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground pt-1">
                      <span>{t.account.paymentLabel}</span>
                      <span>
                        {(() => { const pk = PAYMENT_METHOD_TKEYS[detailQuery.data.paymentMethod]; return pk ? (t.account as any)[pk] : detailQuery.data.paymentMethod; })()}
                        {detailQuery.data.paid ? ` · ${t.account.paidStatus}` : ""}
                      </span>
                    </div>
                    {detailQuery.data.note && (
                      <div className="text-xs text-muted-foreground">
                        {t.account.noteLabel} {detailQuery.data.note}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {lr && lrStatusLabel && (
            <div
              className="rounded-md border bg-muted/30 px-3 py-2 text-xs space-y-1"
              data-testid={`return-status-${o.code}`}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <Undo2 className="h-3.5 w-3.5" />
                <span className="font-medium">{(() => { const rk = RETURN_KIND_TKEYS[lr.kind]; return rk ? (t.account as any)[rk] : lr.kind; })()}</span>
                <Badge className={lrStatusCls + " text-[10px]"}>{lrStatusLabel}</Badge>
              </div>
              <div className="text-muted-foreground">
                {t.account.reasonLabel} {(() => { const rr = RETURN_REASON_TKEYS[lr.reasonCode]; return rr ? (t.account as any)[rr] : lr.reasonCode; })()}
              </div>
              <div className="text-muted-foreground">
                {t.account.sentAtLabel} {formatDate(lr.requestedAt)}
                {lr.processedAt && ` · ${t.account.processedLabel} ${formatDate(lr.processedAt)}`}
              </div>
              {lr.staffNote && (
                <div className="text-muted-foreground">
                  {t.account.storeResponseLabel} {lr.staffNote}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 flex-wrap">
            {o.status === "delivered" && !o.rated && (
              <Button
                size="sm"
                variant="default"
                onClick={() => setRateOpen(true)}
                data-testid={`button-rate-${o.code}`}
              >
                <Star className="h-4 w-4 mr-1.5" />
                {t.account.rateShop}
              </Button>
            )}
            {o.eligibleForReturn && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDialogOpen(true)}
                data-testid={`button-request-return-${o.code}`}
              >
                <Undo2 className="h-4 w-4 mr-1.5" />
                {t.account.requestCancelExchange}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      {dialogOpen && (
        <ReturnRequestDialog
          order={o}
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
        />
      )}
      {rateOpen && (
        <RateStoreDialog
          order={o}
          open={rateOpen}
          onClose={() => setRateOpen(false)}
        />
      )}
    </>
  );
}

function RateStoreDialog({
  order,
  open,
  onClose,
}: {
  order: MyOrder;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const t = useT();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const submit = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/storefront/stores/${order.storeSlug}/ratings`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, rating, comment: comment || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? t.account.rateFailed);
      }
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["my-orders"] });
      toast({ title: t.account.rated, description: t.account.ratedDesc });
      onClose();
    },
    onError: (err) =>
      toast({
        variant: "destructive",
        title: t.common.error,
        description: err instanceof Error ? err.message : t.account.rateFailed,
      }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.account.rateStoreTitle} {order.storeName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div>
            <div className="text-xs font-medium mb-1.5">{t.account.starCount}</div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className="p-1"
                  data-testid={`star-${n}`}
                >
                  <Star
                    className={`h-7 w-7 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
                  />
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="rate-comment" className="text-xs font-medium">
              {t.account.commentOptional}
            </Label>
            <Textarea
              id="rate-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder={t.account.commentPlaceholder}
              className="mt-1"
              data-testid="input-rating-comment"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submit.isPending}>
            {t.common.close}
          </Button>
          <Button
            onClick={() => submit.mutate()}
            disabled={submit.isPending}
            data-testid="button-submit-rating"
          >
            {submit.isPending ? t.account.submitting : t.account.submitRating}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReturnRequestDialog({
  order,
  open,
  onClose,
}: {
  order: MyOrder;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const t = useT();
  const [kind, setKind] = useState<"cancel_refund" | "exchange">("cancel_refund");
  const [reasonCode, setReasonCode] = useState<string>(RETURN_REASON_CODES[0]);
  const [note, setNote] = useState("");

  const submit = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/storefront/orders/${order.id}/return-request`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, reasonCode, note: note || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? t.account.requestFailed);
      }
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["my-orders"] });
      toast({
        title: t.account.requestSent,
        description: t.account.requestSentDesc,
      });
      onClose();
    },
    onError: (err) =>
      toast({
        variant: "destructive",
        title: t.common.error,
        description: err instanceof Error ? err.message : t.account.requestFailed,
      }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.account.returnDialogTitle} #{order.code}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div>
            <div className="text-xs font-medium mb-1.5">{t.account.requestType}</div>
            <RadioGroup
              value={kind}
              onValueChange={(v) => setKind(v as "cancel_refund" | "exchange")}
              className="flex gap-4"
            >
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="cancel_refund" data-testid="kind-cancel" />
                <span>{t.account.returnKindCancelRefund}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="exchange" data-testid="kind-exchange" />
                <span>{t.account.returnKindExchange}</span>
              </label>
            </RadioGroup>
          </div>
          <div>
            <div className="text-xs font-medium mb-1.5">{t.account.reason}</div>
            <RadioGroup
              value={reasonCode}
              onValueChange={setReasonCode}
              className="space-y-1.5"
            >
              {RETURN_REASON_CODES.map((code) => (
                <label
                  key={code}
                  className="flex items-center gap-2 cursor-pointer"
                  data-testid={`reason-${code}`}
                >
                  <RadioGroupItem value={code} />
                  <span>{(() => { const rr = RETURN_REASON_TKEYS[code]; return rr ? (t.account as any)[rr] : code; })()}</span>
                </label>
              ))}
            </RadioGroup>
          </div>
          <div>
            <Label htmlFor="return-note" className="text-xs font-medium">
              {t.account.noteOptional}
            </Label>
            <Textarea
              id="return-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder={t.account.returnNotePlaceholder}
              className="mt-1"
              data-testid="input-return-note"
            />
          </div>
          <div className="text-[11px] text-muted-foreground bg-muted/40 rounded p-2">
            {t.account.returnNotice}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submit.isPending}>
            {t.common.close}
          </Button>
          <Button
            onClick={() => submit.mutate()}
            disabled={submit.isPending}
            data-testid="button-submit-return"
          >
            {submit.isPending ? t.account.submitting : t.account.submitRequest}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReferralCard({
  referralQuery,
}: {
  referralQuery: ReturnType<typeof useQuery<MyReferral, Error>>;
}) {
  const t = useT();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [redeeming, setRedeeming] = useState(false);

  const data = referralQuery.data;
  const code = data?.referralCode ?? "";
  const shareLink =
    typeof window !== "undefined" && code
      ? `${window.location.origin}/register-customer?ref=${encodeURIComponent(code)}`
      : "";

  const handleCopy = async (text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: t.account.referralCopied, description: text });
    } catch {
      toast({ title: t.account.referralCopied, description: text });
    }
  };

  const handleRedeem = async () => {
    setRedeeming(true);
    try {
      const res = await fetch("/api/storefront/redeem-referral", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? t.account.referralRedeemFailed);
      }
      const result = await res.json();
      toast({
        title: t.account.referralRedeemSuccess,
        description: t.account.referralRedeemSuccessDesc
          .replace("{code}", result.code)
          .replace("{value}", formatVnd(result.value)),
      });
      qc.invalidateQueries({ queryKey: ["my-referral"] });
      qc.invalidateQueries({ queryKey: ["my-promotions"] });
    } catch (err: any) {
      toast({ title: t.common.error, description: err.message, variant: "destructive" });
    } finally {
      setRedeeming(false);
    }
  };

  const balance = data?.balance ?? 0;
  const canRedeem = balance >= 1000;
  const lang =
    typeof window !== "undefined"
      ? (window.localStorage.getItem("vcomm-store_lang") === "en" ? "en-US" : "vi-VN")
      : "vi-VN";

  return (
    <Card data-testid="referral-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Share2 className="h-5 w-5 text-emerald-600" />
          {t.account.referralTitle}
        </CardTitle>
        <CardDescription>{t.account.referralDesc}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {referralQuery.isLoading && (
          <p className="text-muted-foreground text-sm">{t.account.referralLoading}</p>
        )}
        {data && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">{t.account.referralYourCode}</div>
                <div className="font-mono text-2xl font-bold tracking-wider mt-1" data-testid="text-referral-code">
                  {code || "—"}
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopy(code)}
                    disabled={!code}
                    data-testid="button-copy-referral-code"
                  >
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    {t.account.referralCopyCode}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopy(shareLink)}
                    disabled={!shareLink}
                    data-testid="button-copy-referral-link"
                  >
                    <Share2 className="h-3.5 w-3.5 mr-1" />
                    {t.account.referralCopyLink}
                  </Button>
                </div>
              </div>
              <div className="rounded-md border bg-muted/30 p-3 flex flex-col">
                <div className="text-xs text-muted-foreground">{t.account.referralBalance}</div>
                <div className="text-3xl font-bold text-primary mt-1" data-testid="text-referral-balance">
                  {formatVnd(balance)}
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {t.account.referralInvited}: <span className="font-medium text-foreground">{data.invitedCount}</span> {t.account.referralInvitedUnit}
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="mt-3 self-start"
                  onClick={handleRedeem}
                  disabled={!canRedeem || redeeming}
                  data-testid="button-redeem-referral"
                >
                  {redeeming ? t.account.referralRedeeming : t.account.referralRedeem}
                </Button>
                {!canRedeem && (
                  <p className="text-xs text-muted-foreground mt-1">{t.account.referralRedeemMin}</p>
                )}
              </div>
            </div>

            {data.history.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.account.referralEmpty}</p>
            ) : (
              <div>
                <div className="text-sm font-medium mb-2">{t.account.referralHistoryTitle}</div>
                <div className="rounded-md border divide-y max-h-64 overflow-y-auto" data-testid="referral-history">
                  {data.history.map((h) => (
                    <div key={h.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <div className="font-medium truncate">
                          {h.orderCode || h.orderId.slice(0, 8)}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {t.account.referralHistoryFrom} {h.referredName || "—"} ·{" "}
                          {new Date(h.createdAt).toLocaleDateString(lang)}
                        </div>
                      </div>
                      <div className="font-semibold text-emerald-600 whitespace-nowrap">
                        +{formatVnd(h.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
              <p>{t.account.referralInfo1}</p>
              <p>{t.account.referralInfo2}</p>
              <p>{t.account.referralInfo3}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function PromosSection({
  promosQuery,
  pointsQuery,
  referralQuery,
  activePromos,
  usedPromos,
}: {
  promosQuery: ReturnType<typeof useQuery<MyPromo[], Error>>;
  pointsQuery: ReturnType<typeof useQuery<{ points: number; equivalentVnd: number }, Error>>;
  referralQuery: ReturnType<typeof useQuery<MyReferral, Error>>;
  activePromos: MyPromo[];
  usedPromos: MyPromo[];
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const t = useT();
  const [redeeming, setRedeeming] = useState(false);

  const handleRedeem = async () => {
    setRedeeming(true);
    try {
      const res = await fetch("/api/storefront/redeem-points", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? t.account.redeemFailed);
      }
      const data = await res.json();
      toast({
        title: t.account.redeemSuccess,
        description: t.account.redeemSuccessDesc
          .replace("{code}", data.code)
          .replace("{value}", formatVnd(data.value)),
      });
      qc.invalidateQueries({ queryKey: ["my-points"] });
      qc.invalidateQueries({ queryKey: ["my-promotions"] });
    } catch (err: any) {
      toast({ title: t.common.error, description: err.message, variant: "destructive" });
    } finally {
      setRedeeming(false);
    }
  };

  const pts = pointsQuery.data;

  return (
    <div className="space-y-4">
      <ReferralCard referralQuery={referralQuery} />
      <Card data-testid="loyalty-points-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Star className="h-5 w-5 text-amber-500" />
            {t.account.loyaltyPoints}
          </CardTitle>
          <CardDescription>
            {t.account.loyaltyDesc}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pointsQuery.isLoading && (
            <p className="text-muted-foreground text-sm">{t.account.loadingPoints}</p>
          )}
          {pts && (
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-primary" data-testid="text-loyalty-points">
                    {pts.points}
                  </span>
                  <span className="text-muted-foreground text-sm">{t.account.pointsUnit}</span>
                </div>
                {pts.points > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {t.account.equivalentTo} <span className="font-semibold text-foreground">{formatVnd(pts.equivalentVnd)}</span> {t.account.discountSuffix}
                  </p>
                )}
                {pts.points === 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {t.account.shopToEarn}
                  </p>
                )}
              </div>
              <Button
                onClick={handleRedeem}
                disabled={!pts || pts.points <= 0 || redeeming}
                data-testid="button-redeem-points"
              >
                {redeeming ? t.account.redeeming : `${t.account.redeemPrefix} ${pts.points > 0 ? pts.points + " " + t.account.pointsUnit : ""}`}
              </Button>
            </div>
          )}
          <div className="mt-3 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
            <p>{t.account.loyaltyInfo1}</p>
            <p>{t.account.loyaltyInfo2}</p>
            <p>{t.account.loyaltyInfo3}</p>
          </div>
        </CardContent>
      </Card>

      <h2 className="text-xl font-semibold">{t.account.promoCodes}</h2>

      {promosQuery.isLoading && (
        <p className="text-muted-foreground text-sm">{t.account.loadingPromos}</p>
      )}
      {promosQuery.data && promosQuery.data.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {t.account.noPromoCodes}
          </CardContent>
        </Card>
      )}
      {activePromos.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">{t.account.availableLabel}</h3>
          {activePromos.map((p) => (
            <PromoRow key={p.id} promo={p} />
          ))}
        </div>
      )}
      {usedPromos.length > 0 && (
        <div className="space-y-2 pt-2">
          <h3 className="text-sm font-medium text-muted-foreground">{t.account.usedLabel}</h3>
          {usedPromos.map((p) => (
            <PromoRow key={p.id} promo={p} muted />
          ))}
        </div>
      )}
    </div>
  );
}

function ExpirySection({
  expiryQuery,
}: {
  expiryQuery: ReturnType<typeof useQuery<MyExpiryItem[], Error>>;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const t = useT();
  const { lang } = useI18n();
  const formatDateOnly = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === "vi" ? "vi-VN" : "en-US", { day: "2-digit", month: "2-digit", year: "numeric" });
  const data = expiryQuery.data ?? [];
  const active = data.filter((e) => !e.dismissed);
  const dismissed = data.filter((e) => e.dismissed);

  const dismiss = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/storefront/my-expiry-items/${id}/dismiss`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? t.account.dismissFailed);
      }
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["my-expiry-items"] });
      toast({ title: t.account.dismissedLabel, description: t.account.dismissedDesc });
    },
    onError: (err) =>
      toast({
        variant: "destructive",
        title: t.common.error,
        description: err instanceof Error ? err.message : t.account.dismissFailed,
      }),
  });

  const itemMeta = (iso: string) => {
    const ms = new Date(iso).getTime() - Date.now();
    const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
    if (days < 0) {
      return { text: t.account.expiredDaysAgo.replace("{n}", String(Math.abs(days))), cls: "text-red-700 bg-red-50 border-red-200" };
    }
    if (days === 0) return { text: t.account.expiresToday, cls: "text-red-700 bg-red-50 border-red-200" };
    if (days <= 3) return { text: t.account.daysLeft.replace("{n}", String(days)), cls: "text-rose-700 bg-rose-50 border-rose-200" };
    if (days <= 7) return { text: t.account.daysLeft.replace("{n}", String(days)), cls: "text-amber-700 bg-amber-50 border-amber-200" };
    return { text: t.account.daysLeft.replace("{n}", String(days)), cls: "text-emerald-700 bg-emerald-50 border-emerald-200" };
  };

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold">{t.account.expiryTitle}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t.account.expiryDesc}
        </p>
      </div>

      {expiryQuery.isLoading && (
        <p className="text-muted-foreground text-sm">{t.account.loadingList}</p>
      )}
      {expiryQuery.error && (
        <Alert variant="destructive">
          <AlertDescription>{(expiryQuery.error as Error).message}</AlertDescription>
        </Alert>
      )}

      {!expiryQuery.isLoading && active.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground space-y-2">
            <CalendarClock className="h-8 w-8 mx-auto opacity-50" />
            <p>{t.account.noExpiryItems}</p>
            <p className="text-xs">
              {t.account.expiryAutoAdd}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {active.map((e) => {
          const meta = itemMeta(e.expiresAt);
          return (
            <Card key={e.id} data-testid={`card-expiry-${e.id}`}>
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold" data-testid={`text-expiry-name-${e.id}`}>
                      {e.productName}
                    </span>
                    <Badge variant="outline" className="text-xs">×{e.quantity}</Badge>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${meta.cls}`}>
                      {meta.text}
                    </span>
                  </div>
                  <Link
                    href={`/shop/${e.storeSlug}`}
                    className="text-sm text-muted-foreground hover:underline inline-flex items-center gap-1 mt-1"
                  >
                    <Store className="h-3.5 w-3.5" /> {e.storeName}
                  </Link>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {t.account.purchasedLabel} {formatDateOnly(e.purchasedAt)} · {t.account.expiresLabel} {formatDateOnly(e.expiresAt)}
                  </div>
                </div>
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => dismiss.mutate(e.id)}
                    disabled={dismiss.isPending}
                    data-testid={`button-dismiss-expiry-${e.id}`}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    {t.account.expiryDismissBtn}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {dismissed.length > 0 && (
        <details className="pt-3" data-testid="expiry-dismissed-section">
          <summary className="text-sm font-medium text-muted-foreground cursor-pointer flex items-center gap-1">
            <Trash2 className="h-3.5 w-3.5" />
            {t.account.dismissedLabel} ({dismissed.length})
          </summary>
          <div className="space-y-2 mt-2">
            {dismissed.map((e) => (
              <Card key={e.id} className="opacity-60">
                <CardContent className="p-3 flex items-center gap-3 text-sm">
                  <span className="flex-1 truncate">
                    {e.productName} ×{e.quantity} — {e.storeName}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatDateOnly(e.expiresAt)}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function StatCard({ label, value, testid }: { label: string; value: string; testid: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-semibold text-lg mt-1 truncate" data-testid={testid}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

const PROMO_KIND_TKEYS: Record<string, string> = {
  new_account: "promoKindNewAccount",
  percent_invoice: "promoKindPercentInvoice",
  percent_shipping: "promoKindPercentShipping",
  fixed: "promoKindFixed",
};

function PromoRow({ promo, muted = false }: { promo: MyPromo; muted?: boolean }) {
  const t = useT();
  const { lang } = useI18n();
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(lang === "vi" ? "vi-VN" : "en-US", { dateStyle: "short", timeStyle: "short" });
  const valueText =
    promo.type === "percent"
      ? `-${promo.value}%${promo.maxDiscount ? ` (${t.account.promoMaxDiscount} ${formatVnd(promo.maxDiscount)})` : ""}`
      : `-${formatVnd(promo.value)}`;
  const kindTKey = PROMO_KIND_TKEYS[promo.kind];
  const kindLabel = kindTKey ? (t.account as any)[kindTKey] : promo.kind;
  return (
    <Card className={muted ? "opacity-60" : ""} data-testid={`account-promo-${promo.code}`}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-semibold">{promo.code}</span>
            <Badge variant="secondary">{kindLabel}</Badge>
            {muted && <Badge className="bg-gray-100 text-gray-600">{t.account.usedLabel}</Badge>}
          </div>
          <div className="text-sm mt-1">{promo.name}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {t.account.promoExpiryLabel} {formatDate(promo.endDate)}
            {promo.minOrder > 0 ? ` · ${t.account.promoMinOrder} ${formatVnd(promo.minOrder)}` : ""}
          </div>
        </div>
        <div className="text-right text-green-600 font-semibold whitespace-nowrap">{valueText}</div>
      </CardContent>
    </Card>
  );
}

function ProfileEditor({ user }: { user: CurrentUser }) {
  const { refresh } = useAuth();
  const { toast } = useToast();
  const t = useT();
  const { lang } = useI18n();
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(lang === "vi" ? "vi-VN" : "en-US", { dateStyle: "short", timeStyle: "short" });
  const qc = useQueryClient();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [contactEmail, setContactEmail] = useState(user.contactEmail ?? "");
  const [phone, setPhone] = useState(user.phone);
  const [showCamera, setShowCamera] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    setName(user.name);
    setEmail(user.email);
    setContactEmail(user.contactEmail ?? "");
    setPhone(user.phone);
  }, [user.name, user.email, user.contactEmail, user.phone]);

  const handleAvatarCapture = useCallback(async (dataUrl: string) => {
    setShowCamera(false);
    setAvatarUploading(true);
    try {
      const [head, base64] = dataUrl.split(",");
      const mime = (head.match(/data:(.*);base64/) || [])[1] || "image/jpeg";
      const binStr = atob(base64);
      const bytes = new Uint8Array(binStr.length);
      for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
      const blob = new Blob([bytes], { type: mime });
      const file = new File([blob], "avatar.jpg", { type: mime });

      const urlRes = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!urlRes.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await urlRes.json();

      const putRes = await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!putRes.ok) throw new Error("Upload failed");

      const avatarUrl = `/api/storage/objects/${objectPath.replace(/^\/objects\//, "")}`;
      const patchRes = await fetch("/api/auth/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl }),
      });
      if (!patchRes.ok) throw new Error(t.account.avatarUpdateFailed);

      await refresh();
      await qc.invalidateQueries({ queryKey: ["my-orders"] });
      toast({ title: t.account.saved, description: t.account.avatarUpdated });
    } catch {
      toast({ variant: "destructive", title: t.common.error, description: t.account.avatarUpdateFailed });
    } finally {
      setAvatarUploading(false);
    }
  }, [refresh, qc, toast, t]);

  const handleRemoveAvatar = useCallback(async () => {
    setAvatarUploading(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: null }),
      });
      if (!res.ok) throw new Error(t.account.avatarUpdateFailed);
      await refresh();
      toast({ title: t.account.saved, description: t.account.avatarRemoved });
    } catch {
      toast({ variant: "destructive", title: t.common.error, description: t.account.avatarUpdateFailed });
    } finally {
      setAvatarUploading(false);
    }
  }, [refresh, toast, t]);

  const updateProfile = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          contactEmail: contactEmail.trim(),
          phone: phone.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? t.account.updateProfileFailed);
      }
    },
    onSuccess: async () => {
      await refresh();
      await qc.invalidateQueries({ queryKey: ["my-orders"] });
      toast({ title: t.account.saved, description: t.account.profileUpdateDesc });
    },
    onError: (err) =>
      toast({
        variant: "destructive",
        title: t.common.error,
        description: err instanceof Error ? err.message : t.account.updateProfileFailed,
      }),
  });

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const changePassword = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) throw new Error(t.account.passwordMismatch);
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? t.account.changePasswordFailed);
      }
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: t.account.passwordChanged, description: t.account.passwordChangeSuccessDesc });
    },
    onError: (err) =>
      toast({
        variant: "destructive",
        title: t.common.error,
        description: err instanceof Error ? err.message : t.account.changePasswordFailed,
      }),
  });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">{t.account.profileTitle}</h2>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative group">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={t.account.avatarLabel}
                  className="w-20 h-20 rounded-full object-cover border-2 border-border"
                  data-testid="img-avatar"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border-2 border-border" data-testid="avatar-placeholder">
                  <UserCircle className="w-10 h-10 text-muted-foreground" />
                </div>
              )}
              {avatarUploading && (
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <div className="font-medium text-sm">{t.account.avatarLabel}</div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCamera(true)}
                  disabled={avatarUploading}
                  data-testid="button-take-photo"
                >
                  <Camera className="h-4 w-4 mr-1" />
                  {t.account.takePhoto}
                </Button>
                {user.avatarUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveAvatar}
                    disabled={avatarUploading}
                    data-testid="button-remove-avatar"
                  >
                    <X className="h-4 w-4 mr-1" />
                    {t.account.removeAvatar}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {showCamera && (
        <Dialog open onOpenChange={(open) => { if (!open) setShowCamera(false); }}>
          <DialogContent className="max-w-[520px] p-0 overflow-hidden border-none [&>button]:hidden bg-transparent shadow-none">
            <Suspense fallback={<div className="flex items-center justify-center h-[400px] text-white">{t.common.loading}</div>}>
              <CameraFace
                onConfirm={handleAvatarCapture}
                onClose={() => setShowCamera(false)}
                outputSize={300}
              />
            </Suspense>
          </DialogContent>
        </Dialog>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.account.personalInfo}</CardTitle>
            <CardDescription>{t.account.personalInfoDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-3"
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                updateProfile.mutate();
              }}
            >
              <div>
                <Label htmlFor="profile-name">{t.account.fullName}</Label>
                <Input
                  id="profile-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  data-testid="input-profile-name"
                />
              </div>
              <div>
                <Label htmlFor="profile-username">{t.account.usernameLabel}</Label>
                <Input
                  id="profile-username"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  minLength={3}
                  autoComplete="username"
                  data-testid="input-profile-username"
                />
                <p className="text-xs text-muted-foreground mt-1">{t.account.usernameHelp}</p>
              </div>
              <div>
                <Label htmlFor="profile-email">{t.account.emailLabel}</Label>
                <Input
                  id="profile-email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder={t.account.emailPlaceholder}
                  autoComplete="email"
                  data-testid="input-profile-email"
                />
              </div>
              <div>
                <Label htmlFor="profile-phone">{t.account.phoneNumber}</Label>
                <Input
                  id="profile-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  data-testid="input-profile-phone"
                />
              </div>
              <div className="text-xs text-muted-foreground">
                {t.account.memberSince} {formatDate(user.createdAt)}
              </div>
              <Button
                type="submit"
                disabled={updateProfile.isPending}
                data-testid="button-save-profile"
              >
                {updateProfile.isPending ? t.account.saving : t.account.saveChanges}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <KeyRound className="h-4 w-4" /> {t.account.changePasswordBtn}
            </CardTitle>
            <CardDescription>{t.account.changePasswordDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-3"
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                changePassword.mutate();
              }}
            >
              <div>
                <Label htmlFor="cur-pw">{t.account.currentPassword}</Label>
                <PasswordInput
                  id="cur-pw"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  data-testid="input-current-password"
                />
              </div>
              <div>
                <Label htmlFor="new-pw">{t.account.newPassword}</Label>
                <PasswordInput
                  id="new-pw"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                  required
                  data-testid="input-new-password"
                />
              </div>
              <div>
                <Label htmlFor="cf-pw">{t.account.confirmPassword}</Label>
                <PasswordInput
                  id="cf-pw"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={6}
                  required
                  data-testid="input-confirm-password"
                />
              </div>
              <Button
                type="submit"
                disabled={changePassword.isPending}
                data-testid="button-change-password"
              >
                {changePassword.isPending ? t.account.changingPassword : t.account.changePasswordBtn}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AddressesSection() {
  const t = useT();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MyAddress | null>(null);
  const [form, setForm] = useState({
    label: "",
    recipientName: "",
    recipientPhone: "",
    address: "",
    isDefault: false,
  });

  const listQ = useQuery<MyAddress[]>({
    queryKey: ["my-addresses"],
    queryFn: async () => {
      const res = await fetch("/api/storefront/my-addresses", { credentials: "include" });
      if (!res.ok) throw new Error(t.account.addressLoadFailed);
      return res.json();
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ label: "", recipientName: "", recipientPhone: "", address: "", isDefault: false });
    setDialogOpen(true);
  };

  const openEdit = (a: MyAddress) => {
    setEditing(a);
    setForm({
      label: a.label,
      recipientName: a.recipientName,
      recipientPhone: a.recipientPhone,
      address: a.address,
      isDefault: a.isDefault,
    });
    setDialogOpen(true);
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      const body = {
        label: form.label.trim(),
        recipientName: form.recipientName.trim(),
        recipientPhone: form.recipientPhone.trim(),
        address: form.address.trim(),
        isDefault: form.isDefault,
      };
      const url = editing
        ? `/api/storefront/my-addresses/${editing.id}`
        : "/api/storefront/my-addresses";
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? t.account.addressSaveFailed);
      }
    },
    onSuccess: () => {
      toast({ title: t.account.addressSaved });
      setDialogOpen(false);
      qc.invalidateQueries({ queryKey: ["my-addresses"] });
    },
    onError: (err) =>
      toast({
        variant: "destructive",
        title: t.common.error,
        description: err instanceof Error ? err.message : String(err),
      }),
  });

  const setDefaultMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/storefront/my-addresses/${id}/default`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error(t.account.addressDefaultFailed);
    },
    onSuccess: () => {
      toast({ title: t.account.addressDefaultSet });
      qc.invalidateQueries({ queryKey: ["my-addresses"] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/storefront/my-addresses/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(t.account.addressDeleteFailed);
    },
    onSuccess: () => {
      toast({ title: t.account.addressDeleted });
      qc.invalidateQueries({ queryKey: ["my-addresses"] });
    },
  });

  const list = listQ.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <MapPin className="h-5 w-5" /> {t.account.addressesTitle}
        </h2>
        <Button onClick={openCreate} size="sm" data-testid="button-add-address">
          <Plus className="h-4 w-4 mr-1" /> {t.account.addAddress}
        </Button>
      </div>

      {list.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {t.account.addressesEmpty}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((a) => (
            <Card key={a.id} data-testid={`address-card-${a.id}`}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {a.label && <span className="font-semibold text-sm">{a.label}</span>}
                      {a.isDefault && (
                        <Badge variant="default" className="text-[10px]">
                          {t.account.defaultBadge}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm">{a.address}</div>
                    {(a.recipientName || a.recipientPhone) && (
                      <div className="text-xs text-muted-foreground">
                        {a.recipientName}
                        {a.recipientName && a.recipientPhone ? " — " : ""}
                        {a.recipientPhone}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {!a.isDefault && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDefaultMut.mutate(a.id)}
                        disabled={setDefaultMut.isPending}
                        data-testid={`button-set-default-${a.id}`}
                      >
                        {t.account.setDefault}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(a)}
                      data-testid={`button-edit-${a.id}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm(t.account.confirmDeleteAddress)) deleteMut.mutate(a.id);
                      }}
                      disabled={deleteMut.isPending}
                      data-testid={`button-delete-${a.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? t.account.editAddress : t.account.addAddress}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              if (!form.address.trim()) return;
              saveMut.mutate();
            }}
            className="space-y-3"
          >
            <div>
              <Label htmlFor="addr-label">{t.account.addressLabel}</Label>
              <Input
                id="addr-label"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder={t.account.addressLabelPh}
                data-testid="input-address-label"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="addr-name">{t.account.recipientName}</Label>
                <Input
                  id="addr-name"
                  value={form.recipientName}
                  onChange={(e) => setForm((f) => ({ ...f, recipientName: e.target.value }))}
                  data-testid="input-recipient-name"
                />
              </div>
              <div>
                <Label htmlFor="addr-phone">{t.account.recipientPhone}</Label>
                <Input
                  id="addr-phone"
                  value={form.recipientPhone}
                  onChange={(e) => setForm((f) => ({ ...f, recipientPhone: e.target.value }))}
                  data-testid="input-recipient-phone"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="addr-full">{t.account.addressFull} *</Label>
              <Textarea
                id="addr-full"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder={t.account.addressPlaceholder}
                required
                rows={3}
                data-testid="input-address-full"
              />
              <p className="text-xs text-muted-foreground mt-1">{t.account.coordsHint}</p>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
                data-testid="checkbox-is-default"
              />
              {t.account.setDefault}
            </label>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                {t.account.cancel}
              </Button>
              <Button
                type="submit"
                disabled={saveMut.isPending || !form.address.trim()}
                data-testid="button-save-address"
              >
                {t.account.saveAddress}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
