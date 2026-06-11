import { lazy, Suspense, useCallback, useMemo, useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth, type CurrentUser } from "@/lib/auth-context";
import { useT, useI18n } from "@/lib/i18n-context";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/components/confirm-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Bike,
  LogOut,
  Phone,
  MapPin,
  Navigation,
  Wallet,
  Package,
  RefreshCw,
  Menu,
  LayoutDashboard,
  ListChecks,
  Clock3,
  History as HistoryIcon,
  UserCircle,
  Settings as SettingsIcon,
  CheckCircle2,
  Camera,
  X,
  KeyRound,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";

const CameraFace = lazy(() => import("@/components/camera-face"));

const SettingsPage = lazy(() => import("@/pages/settings"));

interface CourierStore {
  id: string;
  name: string;
}
interface CourierMe {
  id: string;
  fullName: string;
  phone: string;
  cccd: string;
  hasZalo: boolean;
  stores: CourierStore[];
}
interface CourierOrder {
  id: string;
  code: string;
  storeId: string;
  storeName: string;
  status: string;
  deliveryStatus: string | null;
  paymentMethod: string;
  paid: boolean;
  total: number;
  shippingFee: number;
  courierShare: number;
  distanceKm: number | null;
  deliveryAddress: string | null;
  deliveryLat: number | null;
  deliveryLng: number | null;
  guestName: string;
  guestPhone: string;
  note: string | null;
  createdAt: string;
}
interface HistoryResp {
  days: number;
  earnings: number;
  orders: CourierOrder[];
}

type SectionKey = "overview" | "available" | "active" | "history" | "profile" | "settings";

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export default function CourierPortalPage() {
  const t = useT();
  const { lang } = useI18n();
  const dateLocale = lang === "vi" ? "vi-VN" : "en-US";
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const confirm = useConfirm();
  const qc = useQueryClient();
  const [section, setSection] = useState<SectionKey>("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const meQ = useQuery<CourierMe>({
    queryKey: ["/api/courier/me"],
    queryFn: () => jsonFetch<CourierMe>("/api/courier/me"),
  });
  const availableQ = useQuery<CourierOrder[]>({
    queryKey: ["/api/courier/orders/available"],
    queryFn: () => jsonFetch<CourierOrder[]>("/api/courier/orders/available"),
    refetchInterval: 15000,
  });
  const activeQ = useQuery<CourierOrder[]>({
    queryKey: ["/api/courier/orders/active"],
    queryFn: () => jsonFetch<CourierOrder[]>("/api/courier/orders/active"),
    refetchInterval: 30000,
  });
  const historyQ = useQuery<HistoryResp>({
    queryKey: ["/api/courier/orders/history"],
    queryFn: () => jsonFetch<HistoryResp>("/api/courier/orders/history?days=30"),
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["/api/courier/orders/available"] });
    qc.invalidateQueries({ queryKey: ["/api/courier/orders/active"] });
    qc.invalidateQueries({ queryKey: ["/api/courier/orders/history"] });
  };

  const claimMut = useMutation({
    mutationFn: (id: string) =>
      jsonFetch<{ ok: true }>(`/api/courier/orders/${id}/claim`, { method: "POST" }),
    onSuccess: () => {
      invalidateAll();
      setSection("active");
      toast({ title: t.courierPortal.claimed });
    },
    onError: (err: unknown) =>
      toast({
        variant: "destructive",
        title: t.common.error,
        description: err instanceof Error ? err.message : String(err),
      }),
  });

  const transitionMut = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "pick-up" | "deliver" | "fail" }) =>
      jsonFetch<{ ok: true }>(`/api/courier/orders/${id}/${action}`, { method: "POST" }),
    onSuccess: () => {
      invalidateAll();
      toast({ title: t.courierPortal.statusUpdated });
    },
    onError: (err: unknown) =>
      toast({
        variant: "destructive",
        title: t.common.error,
        description: err instanceof Error ? err.message : String(err),
      }),
  });

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const totalEarnings = historyQ.data?.earnings ?? 0;
  const activeCount = activeQ.data?.length ?? 0;
  const availableCount = availableQ.data?.length ?? 0;

  const me = meQ.data;
  const greeting = useMemo(() => me?.fullName ?? user?.name ?? "", [me, user]);

  const navItems: { key: SectionKey; label: string; icon: typeof LayoutDashboard; count?: number }[] = [
    { key: "overview", label: t.courierPortal.overview, icon: LayoutDashboard },
    { key: "available", label: t.courierPortal.available, icon: ListChecks, count: availableCount },
    { key: "active", label: t.courierPortal.active, icon: Clock3, count: activeCount },
    { key: "history", label: t.courierPortal.history, icon: HistoryIcon },
    { key: "profile", label: t.courierPortal.profile, icon: UserCircle },
    { key: "settings", label: t.courierPortal.settings, icon: SettingsIcon },
  ];

  const renderNavButton = (item: typeof navItems[number], onPick: () => void) => {
    const Icon = item.icon;
    const active = section === item.key;
    return (
      <button
        key={item.key}
        onClick={onPick}
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
          <Badge variant={active ? "secondary" : "outline"} className="text-[10px] px-1.5 py-0">
            {item.count}
          </Badge>
        )}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col" data-testid="page-courier-portal">
      <header className="bg-primary text-primary-foreground" data-testid="courier-header">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 hover-elevate rounded-md px-2 py-1">
            <div className="bg-primary-foreground/15 p-2 rounded-lg">
              <Bike className="h-5 w-5" />
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
                  aria-label={t.courierPortal.openMenu}
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle>{t.courierPortal.myPortal}</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1 p-2" data-testid="mobile-courier-nav">
                  {navItems.map((item) =>
                    renderNavButton(item, () => {
                      setSection(item.key);
                      setMobileNavOpen(false);
                    })
                  )}
                </nav>
              </SheetContent>
            </Sheet>
            <Button
              variant="outline"
              size="icon"
              className="bg-transparent text-primary-foreground border-primary-foreground/40 hover:bg-primary-foreground/10"
              onClick={invalidateAll}
              data-testid="button-refresh"
              aria-label={t.courierPortal.refresh}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-transparent text-primary-foreground border-primary-foreground/40 hover:bg-primary-foreground/10"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">{t.account.logout}</span>
            </Button>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-6 pt-2">
          <h1 className="text-2xl sm:text-3xl font-bold" data-testid="text-courier-title">
            {t.courierPortal.portalTitle} · {greeting}
          </h1>
          <p className="mt-1 text-primary-foreground/80 text-sm">
            {(me?.stores ?? []).map((s) => s.name).join(" · ") || t.courierPortal.noStores}
          </p>
        </div>
      </header>

      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 flex-1 flex flex-col lg:flex-row gap-6">
        <aside className="hidden lg:block lg:w-64 lg:shrink-0" data-testid="courier-sidebar">
          <Card className="lg:sticky lg:top-4">
            <CardContent className="p-2">
              <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
                {navItems.map((item) => renderNavButton(item, () => setSection(item.key)))}
              </nav>
            </CardContent>
          </Card>
        </aside>

        <section className="flex-1 min-w-0 space-y-6">
          {section === "overview" && (
            <OverviewSection
              t={t}
              availableCount={availableCount}
              activeCount={activeCount}
              earnings={totalEarnings}
              onGo={setSection}
            />
          )}

          {section === "available" && (
            <div className="space-y-3">
              <h2 className="text-xl font-semibold">{t.courierPortal.available}</h2>
              {availableQ.isLoading && (
                <p className="text-center text-sm text-muted-foreground py-6">{t.common.loading}</p>
              )}
              {!availableQ.isLoading && (availableQ.data ?? []).length === 0 && (
                <Card>
                  <CardContent className="py-10 text-center text-sm text-muted-foreground">
                    {t.courierPortal.noAvailable}
                  </CardContent>
                </Card>
              )}
              {(availableQ.data ?? []).map((o) => (
                <OrderCard
                  key={o.id}
                  o={o}
                  dateLocale={dateLocale}
                  actions={
                    <Button
                      className="w-full h-11"
                      onClick={() => claimMut.mutate(o.id)}
                      disabled={claimMut.isPending}
                      data-testid={`button-claim-${o.id}`}
                    >
                      <Package className="w-4 h-4 mr-1" />
                      {t.courierPortal.claim}
                    </Button>
                  }
                  t={t}
                />
              ))}
            </div>
          )}

          {section === "active" && (
            <div className="space-y-3">
              <h2 className="text-xl font-semibold">{t.courierPortal.active}</h2>
              {activeQ.isLoading && (
                <p className="text-center text-sm text-muted-foreground py-6">{t.common.loading}</p>
              )}
              {!activeQ.isLoading && (activeQ.data ?? []).length === 0 && (
                <Card>
                  <CardContent className="py-10 text-center text-sm text-muted-foreground">
                    {t.courierPortal.noActive}
                  </CardContent>
                </Card>
              )}
              {(activeQ.data ?? []).map((o) => (
                <OrderCard
                  key={o.id}
                  o={o}
                  t={t}
                  dateLocale={dateLocale}
                  actions={
                    <div className="grid grid-cols-2 gap-2">
                      {o.deliveryStatus === "assigned" && (
                        <Button
                          className="w-full h-11 col-span-2"
                          onClick={() => transitionMut.mutate({ id: o.id, action: "pick-up" })}
                          disabled={transitionMut.isPending}
                          data-testid={`button-pickup-${o.id}`}
                        >
                          {t.courierPortal.markPickedUp}
                        </Button>
                      )}
                      {o.deliveryStatus === "picked_up" && (
                        <Button
                          className="w-full h-11 col-span-2 bg-green-600 hover:bg-green-700"
                          onClick={() => transitionMut.mutate({ id: o.id, action: "deliver" })}
                          disabled={transitionMut.isPending}
                          data-testid={`button-deliver-${o.id}`}
                        >
                          {t.courierPortal.markDelivered}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        className="w-full h-10 col-span-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={async () => {
                          const ok = await confirm({
                            title: t.courierPortal.confirmFail,
                            variant: "destructive",
                          });
                          if (ok) transitionMut.mutate({ id: o.id, action: "fail" });
                        }}
                        disabled={transitionMut.isPending}
                        data-testid={`button-fail-${o.id}`}
                      >
                        {t.courierPortal.markFailed}
                      </Button>
                    </div>
                  }
                />
              ))}
            </div>
          )}

          {section === "history" && (
            <div className="space-y-3">
              <h2 className="text-xl font-semibold">{t.courierPortal.history}</h2>
              <Card>
                <CardContent className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Wallet className="w-4 h-4 text-green-600" />
                    <span>{t.courierPortal.earnings30d}</span>
                  </div>
                  <div className="font-bold text-green-600" data-testid="text-history-earnings">
                    {formatCurrency(totalEarnings)}
                  </div>
                </CardContent>
              </Card>
              {historyQ.isLoading && (
                <p className="text-center text-sm text-muted-foreground py-6">{t.common.loading}</p>
              )}
              {!historyQ.isLoading && (historyQ.data?.orders ?? []).length === 0 && (
                <Card>
                  <CardContent className="py-10 text-center text-sm text-muted-foreground">
                    {t.courierPortal.noHistory}
                  </CardContent>
                </Card>
              )}
              {(historyQ.data?.orders ?? []).map((o) => (
                <OrderCard key={o.id} o={o} t={t} dateLocale={dateLocale} compact />
              ))}
            </div>
          )}

          {section === "profile" && user && <ProfileSection t={t} me={me} user={user} />}

          {section === "settings" && (
            <Suspense fallback={<p className="text-sm text-muted-foreground">{t.common.loading}</p>}>
              <SettingsPage />
            </Suspense>
          )}
        </section>
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        {t.common.brandFooter}
      </footer>
    </div>
  );
}

function OverviewSection({
  t,
  availableCount,
  activeCount,
  earnings,
  onGo,
}: {
  t: ReturnType<typeof useT>;
  availableCount: number;
  activeCount: number;
  earnings: number;
  onGo: (s: SectionKey) => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">{t.courierPortal.overviewTitle}</h2>
      <div className="grid sm:grid-cols-3 gap-3">
        <StatCard label={t.courierPortal.statAvailable} value={String(availableCount)} testid="stat-available" />
        <StatCard label={t.courierPortal.statActive} value={String(activeCount)} testid="stat-active" />
        <StatCard
          label={t.courierPortal.statEarnings}
          value={formatCurrency(earnings)}
          accent="text-green-600"
          testid="stat-earnings"
        />
      </div>
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="text-sm font-semibold">{t.courierPortal.quickActions}</div>
          <div className="grid sm:grid-cols-3 gap-2">
            <Button variant="outline" onClick={() => onGo("available")} data-testid="quick-available">
              <ListChecks className="w-4 h-4 mr-1" />
              {t.courierPortal.goAvailable}
            </Button>
            <Button variant="outline" onClick={() => onGo("active")} data-testid="quick-active">
              <Clock3 className="w-4 h-4 mr-1" />
              {t.courierPortal.goActive}
            </Button>
            <Button variant="outline" onClick={() => onGo("history")} data-testid="quick-history">
              <HistoryIcon className="w-4 h-4 mr-1" />
              {t.courierPortal.goHistory}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  testid,
}: {
  label: string;
  value: string;
  accent?: string;
  testid?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase text-muted-foreground">{label}</div>
        <div className={`mt-1 text-xl font-bold ${accent ?? ""}`} data-testid={testid}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function ProfileSection({
  t,
  me,
  user,
}: {
  t: ReturnType<typeof useT>;
  me: CourierMe | undefined;
  user: CurrentUser;
}) {
  const { refresh } = useAuth();
  const { toast } = useToast();
  const [showCamera, setShowCamera] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleAvatarCapture = useCallback(
    async (dataUrl: string) => {
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

        const putRes = await fetch(uploadURL, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });
        if (!putRes.ok) throw new Error("Upload failed");

        const avatarUrl = `/api/storage/objects/${objectPath.replace(/^\/objects\//, "")}`;
        const patchRes = await fetch("/api/auth/me", {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatarUrl }),
        });
        if (!patchRes.ok) throw new Error(t.courierPortal.avatarUpdateFailed);

        await refresh();
        toast({ title: t.common.success, description: t.courierPortal.avatarUpdated });
      } catch {
        toast({
          variant: "destructive",
          title: t.common.error,
          description: t.courierPortal.avatarUpdateFailed,
        });
      } finally {
        setAvatarUploading(false);
      }
    },
    [refresh, toast, t]
  );

  const handleRemoveAvatar = useCallback(async () => {
    setAvatarUploading(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: null }),
      });
      if (!res.ok) throw new Error(t.courierPortal.avatarUpdateFailed);
      await refresh();
      toast({ title: t.common.success, description: t.courierPortal.avatarRemoved });
    } catch {
      toast({
        variant: "destructive",
        title: t.common.error,
        description: t.courierPortal.avatarUpdateFailed,
      });
    } finally {
      setAvatarUploading(false);
    }
  }, [refresh, toast, t]);

  const changePassword = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) throw new Error(t.courierPortal.passwordMismatch);
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? t.courierPortal.changePasswordFailed);
      }
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({
        title: t.courierPortal.passwordChanged,
        description: t.courierPortal.passwordChangeSuccessDesc,
      });
    },
    onError: (err) =>
      toast({
        variant: "destructive",
        title: t.common.error,
        description: err instanceof Error ? err.message : t.courierPortal.changePasswordFailed,
      }),
  });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">{t.courierPortal.profile}</h2>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative group">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={t.courierPortal.avatarLabel}
                  className="w-20 h-20 rounded-full object-cover border-2 border-border"
                  data-testid="img-avatar"
                />
              ) : (
                <div
                  className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border-2 border-border"
                  data-testid="avatar-placeholder"
                >
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
              <div className="font-medium text-sm">{t.courierPortal.avatarLabel}</div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCamera(true)}
                  disabled={avatarUploading}
                  data-testid="button-take-photo"
                >
                  <Camera className="h-4 w-4 mr-1" />
                  {t.courierPortal.takePhoto}
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
                    {t.courierPortal.removeAvatar}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {showCamera && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setShowCamera(false);
          }}
        >
          <DialogContent className="max-w-[520px] p-0 overflow-hidden border-none [&>button]:hidden bg-transparent shadow-none">
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-[400px] text-white">
                  {t.common.loading}
                </div>
              }
            >
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
            <CardTitle className="text-base">{t.courierPortal.profile}</CardTitle>
            <CardDescription>{t.courierPortal.profileNotice}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ProfileRow
              label={t.courierPortal.profileFullName}
              value={me?.fullName ?? user.name ?? "—"}
              testid="profile-name"
            />
            <ProfileRow
              label={t.courierPortal.profilePhone}
              value={me?.phone ?? "—"}
              testid="profile-phone"
            />
            <ProfileRow
              label={t.courierPortal.profileCccd}
              value={me?.cccd ?? "—"}
              testid="profile-cccd"
            />
            <ProfileRow
              label={t.courierPortal.profileZalo}
              value={
                <span className="inline-flex items-center gap-1">
                  {me?.hasZalo ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      {t.courierPortal.profileZaloYes}
                    </>
                  ) : (
                    t.courierPortal.profileZaloNo
                  )}
                </span>
              }
              testid="profile-zalo"
            />
            <ProfileRow
              label={t.courierPortal.profileStores}
              value={(me?.stores ?? []).map((s) => s.name).join(", ") || t.courierPortal.noStores}
              testid="profile-stores"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <KeyRound className="h-4 w-4" /> {t.courierPortal.changePasswordTitle}
            </CardTitle>
            <CardDescription>{t.courierPortal.changePasswordDesc}</CardDescription>
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
                <Label htmlFor="cur-pw">{t.courierPortal.currentPassword}</Label>
                <PasswordInput
                  id="cur-pw"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  data-testid="input-current-password"
                />
              </div>
              <div>
                <Label htmlFor="new-pw">{t.courierPortal.newPassword}</Label>
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
                <Label htmlFor="cf-pw">{t.courierPortal.confirmPassword}</Label>
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
                {changePassword.isPending
                  ? t.courierPortal.changingPassword
                  : t.courierPortal.submitChangePassword}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ProfileRow({
  label,
  value,
  testid,
}: {
  label: string;
  value: React.ReactNode;
  testid?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right break-words" data-testid={testid}>
        {value}
      </span>
    </div>
  );
}

function statusBadge(status: string | null, t: ReturnType<typeof useT>) {
  switch (status) {
    case "pending_courier":
      return <Badge variant="outline">{t.courierPortal.statusPending}</Badge>;
    case "assigned":
      return <Badge variant="secondary">{t.courierPortal.statusAssigned}</Badge>;
    case "picked_up":
      return <Badge className="bg-amber-500 hover:bg-amber-600">{t.courierPortal.statusPickedUp}</Badge>;
    case "delivered":
      return <Badge className="bg-green-600 hover:bg-green-700">{t.courierPortal.statusDelivered}</Badge>;
    case "failed":
      return <Badge variant="destructive">{t.courierPortal.statusFailed}</Badge>;
    default:
      return null;
  }
}

function OrderCard({
  o,
  actions,
  compact,
  t,
  dateLocale,
}: {
  o: CourierOrder;
  actions?: React.ReactNode;
  compact?: boolean;
  t: ReturnType<typeof useT>;
  dateLocale: string;
}) {
  const mapsHref = o.deliveryLat !== null && o.deliveryLng !== null
    ? `https://www.google.com/maps/dir/?api=1&destination=${o.deliveryLat},${o.deliveryLng}`
    : o.deliveryAddress
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.deliveryAddress)}`
      : null;
  return (
    <Card data-testid={`card-order-${o.id}`}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">
              #{o.code}
              <span className="text-muted-foreground font-normal"> · {o.storeName}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {new Date(o.createdAt).toLocaleString(dateLocale)}
            </div>
          </div>
          {statusBadge(o.deliveryStatus, t)}
        </div>

        <div className="text-sm">
          <div className="flex items-start gap-1">
            <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
            <span className="break-words">{o.deliveryAddress ?? "—"}</span>
          </div>
          {o.distanceKm !== null && (
            <div className="text-xs text-muted-foreground ml-5">
              {t.courierPortal.distance}: <span className="font-semibold text-foreground">{o.distanceKm} km</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
          <span>
            {t.courierPortal.orderTotal}: <span className="font-semibold">{formatCurrency(o.total)}</span>
          </span>
          <span>
            {t.courierPortal.shippingFee}: <span className="font-semibold">{formatCurrency(o.shippingFee)}</span>
          </span>
          <span className="text-green-600">
            {t.courierPortal.yourShare}: <span className="font-semibold">{formatCurrency(o.courierShare)}</span>
          </span>
          {!o.paid && (
            <Badge variant="outline" className="text-orange-600 border-orange-300">
              {t.courierPortal.collectCash}
            </Badge>
          )}
        </div>

        {!compact && (
          <div className="text-xs text-muted-foreground border-t pt-2 space-y-0.5">
            <div>
              <span className="font-medium text-foreground">{o.guestName || "—"}</span>
              {o.guestPhone && <span> · {o.guestPhone}</span>}
            </div>
            {o.note && <div>{t.courierPortal.note}: {o.note}</div>}
          </div>
        )}

        {!compact && (
          <div className="flex flex-wrap gap-2">
            {mapsHref && (
              <a href={mapsHref} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-[140px]">
                <Button variant="outline" size="sm" className="w-full" data-testid={`link-map-${o.id}`}>
                  <Navigation className="w-4 h-4 mr-1" />
                  {t.courierPortal.openMap}
                </Button>
              </a>
            )}
            {o.guestPhone && (
              <a href={`tel:${o.guestPhone}`} className="flex-1 min-w-[140px]">
                <Button variant="outline" size="sm" className="w-full" data-testid={`link-call-${o.id}`}>
                  <Phone className="w-4 h-4 mr-1" />
                  {t.courierPortal.call}
                </Button>
              </a>
            )}
          </div>
        )}

        {actions && <div className="pt-1">{actions}</div>}
      </CardContent>
    </Card>
  );
}
