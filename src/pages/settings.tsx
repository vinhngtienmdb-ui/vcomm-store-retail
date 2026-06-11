import { useEffect, useRef, useState } from "react";
import { Check, Palette, PanelLeftClose, Building2, Bell, Loader2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useTheme, type ThemeId } from "@/lib/theme-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAutoHideSidebar } from "@/components/layout/app-layout";
import { useT } from "@/lib/i18n-context";
import { useAuth } from "@/lib/auth-context";
import { HelpGuide } from "@/components/help-guide";
import type { HelpRoleId } from "@/lib/help-content";
import { useOcNotifications, getPendingOcToken } from "@/lib/oc-notifications";

interface BusinessFields {
  businessName: string;
  taxCode: string;
  businessRegNumber: string;
  legalRepresentative: string;
  businessAddress: string;
  contactEmail: string;
}

function BusinessInfoCard() {
  const t = useT();
  const { toast } = useToast();
  const { refresh } = useAuth();
  const [data, setData] = useState<BusinessFields>({
    businessName: "",
    taxCode: "",
    businessRegNumber: "",
    legalRepresentative: "",
    businessAddress: "",
    contactEmail: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("HTTP"))))
      .then((u: Partial<BusinessFields>) => {
        if (cancelled) return;
        setData({
          businessName: u.businessName ?? "",
          taxCode: u.taxCode ?? "",
          businessRegNumber: u.businessRegNumber ?? "",
          legalRepresentative: u.legalRepresentative ?? "",
          businessAddress: u.businessAddress ?? "",
          contactEmail: u.contactEmail ?? "",
        });
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = (k: keyof BusinessFields, v: string) => setData((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error || t.settings.saveBusinessFailed);
      }
      toast({ title: t.settings.saveBusinessOk });
      await refresh();
    } catch (err) {
      toast({
        title: t.settings.saveBusinessFailed,
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          {t.settings.businessTitle}
        </CardTitle>
        <CardDescription>{t.settings.businessDesc}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="biz-name">{t.settings.businessName}</Label>
            <Input id="biz-name" value={data.businessName} onChange={(e) => update("businessName", e.target.value)} disabled={loading} data-testid="input-business-name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="biz-tax">{t.settings.taxCode}</Label>
            <Input id="biz-tax" value={data.taxCode} onChange={(e) => update("taxCode", e.target.value)} disabled={loading} data-testid="input-tax-code" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="biz-reg">{t.settings.businessRegNumber}</Label>
            <Input id="biz-reg" value={data.businessRegNumber} onChange={(e) => update("businessRegNumber", e.target.value)} disabled={loading} data-testid="input-biz-reg" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="biz-rep">{t.settings.legalRepresentative}</Label>
            <Input id="biz-rep" value={data.legalRepresentative} onChange={(e) => update("legalRepresentative", e.target.value)} disabled={loading} data-testid="input-legal-rep" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="biz-ce">{t.settings.contactEmail}</Label>
            <Input id="biz-ce" value={data.contactEmail} onChange={(e) => update("contactEmail", e.target.value)} disabled={loading} data-testid="input-contact-email" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="biz-addr">{t.settings.businessAddress}</Label>
            <Input id="biz-addr" value={data.businessAddress} onChange={(e) => update("businessAddress", e.target.value)} disabled={loading} data-testid="input-biz-address" />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={loading || saving} data-testid="button-save-business">
            {saving ? t.common.updating : t.settings.saveBusiness}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function NotificationCard() {
  const t = useT();
  const { toast } = useToast();
  const { state, session, startLink, pollOnce, cancelLink, disable, openDeepLink } =
    useOcNotifications();
  const [busy, setBusy] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const beginPolling = (token: string) => {
    stopPolling();
    const startedAt = Date.now();
    pollTimerRef.current = setInterval(() => {
      void (async () => {
        const result = await pollOnce(token);
        if (result === "completed") {
          stopPolling();
          toast({ title: t.settings.notifLinkSuccess });
        } else if (result === "expired") {
          stopPolling();
          toast({ title: t.settings.notifLinkExpired, variant: "destructive" });
        } else if (result === "failed") {
          stopPolling();
          toast({ title: t.settings.notifLinkFailed, variant: "destructive" });
        } else if (Date.now() - startedAt > 180000) {
          stopPolling();
          cancelLink();
        }
      })();
    }, 2500);
  };

  useEffect(() => {
    const pending = getPendingOcToken();
    if (pending) beginPolling(pending);
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggle = async (next: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      if (next) {
        const s = await startLink();
        if (!s) {
          toast({ title: t.settings.notifLinkFailed, variant: "destructive" });
          return;
        }
        beginPolling(s.token);
      } else {
        stopPolling();
        cancelLink();
        await disable();
        toast({ title: t.settings.notifUnlinkSuccess });
      }
    } finally {
      setBusy(false);
    }
  };

  const closeDialog = () => {
    stopPolling();
    cancelLink();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          {t.settings.notifTitle}
        </CardTitle>
        <CardDescription>{t.settings.notifDesc}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor="oc-new-order" className="text-sm font-medium">
              {t.settings.newOrderNotif}
            </Label>
            <p className="text-xs text-muted-foreground max-w-prose">
              {t.settings.newOrderNotifDesc}
            </p>
          </div>
          <Switch
            id="oc-new-order"
            checked={state.enabled}
            disabled={!state.configured || state.loading || busy}
            onCheckedChange={handleToggle}
            data-testid="switch-oc-new-order"
          />
        </div>
        {!state.configured && !state.loading && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {t.settings.notifNotConfigured}
          </p>
        )}
      </CardContent>

      <Dialog open={session !== null} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-sm" data-testid="dialog-oc-link">
          <DialogHeader>
            <DialogTitle>{t.settings.notifLinkTitle}</DialogTitle>
            <DialogDescription>{t.settings.notifLinkDesc}</DialogDescription>
          </DialogHeader>
          {session && (
            <div className="flex flex-col items-center gap-4 py-2">
              <div className="rounded-lg bg-white p-3">
                <QRCodeSVG value={session.webLink} size={196} />
              </div>
              <Button
                className="w-full"
                onClick={() => openDeepLink(session.deepLink)}
                data-testid="button-oc-open-app"
              >
                {t.settings.notifOpenApp}
              </Button>
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t.settings.notifWaiting}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default function SettingsPage() {
  const { theme, setTheme, options } = useTheme();
  const { autoHide, setAutoHide } = useAutoHideSidebar();
  const t = useT();
  const { user } = useAuth();
  const roleAsHelp = (user?.role ?? "owner") as HelpRoleId;

  return (
    <div className="space-y-6 max-w-4xl" data-testid="page-settings">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Palette className="w-6 h-6 text-primary" />
          {t.settings.title}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t.settings.subtitle}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.settings.colorTheme}</CardTitle>
          <CardDescription>{t.settings.colorThemeDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {options.map((opt) => {
              const active = opt.id === theme;
              const themeKey = opt.id as keyof typeof t.theme;
              const themeDescKey = `${opt.id}Desc` as keyof typeof t.theme;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTheme(opt.id as ThemeId)}
                  data-testid={`button-theme-${opt.id}`}
                  data-active={active ? "true" : "false"}
                  aria-pressed={active}
                  className={cn(
                    "group relative text-left rounded-lg border-2 p-4 transition-all",
                    "hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active ? "border-primary shadow-md" : "border-border",
                  )}
                >
                  {active && (
                    <span
                      className="absolute top-2 right-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground"
                      aria-hidden
                    >
                      <Check className="w-4 h-4" />
                    </span>
                  )}
                  <div
                    className="rounded-md overflow-hidden border mb-3"
                    style={{ background: opt.swatch.background }}
                  >
                    <div className="flex h-16">
                      <div className="flex-1" style={{ background: opt.swatch.background }} />
                      <div className="w-1/3" style={{ background: opt.swatch.accent }} />
                      <div className="w-1/4" style={{ background: opt.swatch.primary }} />
                    </div>
                  </div>
                  <div className="font-semibold text-sm">{t.theme[themeKey] || opt.label}</div>
                  <p className="text-xs text-muted-foreground mt-1 leading-snug">
                    {t.theme[themeDescKey] || opt.description}
                  </p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.settings.uiBehavior}</CardTitle>
          <CardDescription>{t.settings.uiBehaviorDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor="auto-hide-sidebar" className="text-sm font-medium flex items-center gap-2">
                <PanelLeftClose className="h-4 w-4 text-muted-foreground" />
                {t.settings.autoHideSidebar}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t.settings.autoHideSidebarDesc}
              </p>
            </div>
            <Switch
              id="auto-hide-sidebar"
              checked={autoHide}
              onCheckedChange={setAutoHide}
              data-testid="switch-auto-hide-sidebar"
            />
          </div>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-5">
            <li>{t.settings.sidebarHint1}</li>
            <li>{t.settings.sidebarHint2}</li>
          </ul>
        </CardContent>
      </Card>

      <NotificationCard />

      {user?.role === "owner" && <BusinessInfoCard />}

      <HelpGuide initialRole={roleAsHelp} />
    </div>
  );
}
