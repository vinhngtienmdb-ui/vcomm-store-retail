import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { LogOut, UserCog, Lock, Building2, BadgeCheck, Sparkles, Check, Bell, BellOff } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useT } from "@/lib/i18n-context";
import { usePushNotifications } from "@/lib/push-notifications";
import type { Translations } from "@/lib/translations";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function getRoleLabel(t: Translations, role: string): string {
  const map: Record<string, string> = {
    owner: t.layout.roleOwner,
    manager: t.layout.roleManager,
    cashier: t.layout.roleCashier,
    barista: t.layout.roleBarista,
    platform_admin: t.layout.rolePlatformAdmin,
    customer: t.layout.roleCustomer,
    courier: t.layout.roleCourier,
    support: t.layout.roleSupport,
  };
  return map[role] || role;
}

export function StaffUserMenu() {
  const { user, logout, refresh } = useAuth();
  const { toast } = useToast();
  const t = useT();
  const [, navigate] = useLocation();

  const push = usePushNotifications();
  const canUsePush =
    !!user && ["owner", "manager", "cashier", "barista"].includes(user.role);
  const [profileOpen, setProfileOpen] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [bizName, setBizName] = useState("");
  const [bizTaxCode, setBizTaxCode] = useState("");
  const [bizRegNumber, setBizRegNumber] = useState("");
  const [bizLegalRep, setBizLegalRep] = useState("");
  const [bizAddress, setBizAddress] = useState("");
  const [bizContactEmail, setBizContactEmail] = useState("");
  const [pwdCurrent, setPwdCurrent] = useState("");
  const [pwdNew, setPwdNew] = useState("");
  const [pwdConfirm, setPwdConfirm] = useState("");

  const openProfile = () => {
    setProfileName(user?.name ?? "");
    setProfileEmail(user?.email ?? "");
    setProfilePhone(user?.phone ?? "");
    setProfileOpen(true);
  };

  useEffect(() => {
    if (!profileOpen) return;
    if (user?.role !== "owner") return;
    let cancelled = false;
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => {
        if (cancelled || !u) return;
        setBizName(u.businessName ?? "");
        setBizTaxCode(u.taxCode ?? "");
        setBizRegNumber(u.businessRegNumber ?? "");
        setBizLegalRep(u.legalRepresentative ?? "");
        setBizAddress(u.businessAddress ?? "");
        setBizContactEmail(u.contactEmail ?? "");
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [profileOpen, user?.role]);
  const openPwd = () => {
    setPwdCurrent("");
    setPwdNew("");
    setPwdConfirm("");
    setPwdOpen(true);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const updateProfileMutation = useMutation({
    mutationFn: async (body: {
      name: string;
      email: string;
      phone: string;
      businessName?: string;
      taxCode?: string;
      businessRegNumber?: string;
      legalRepresentative?: string;
      businessAddress?: string;
      contactEmail?: string;
    }) => {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? t.layout.profileUpdateFailed);
      }
      return res.json();
    },
    onSuccess: async () => {
      await refresh();
      toast({ title: t.layout.profileUpdated });
      setProfileOpen(false);
    },
    onError: (err) =>
      toast({
        title: t.layout.errorTitle,
        description: (err as Error).message,
        variant: "destructive",
      }),
  });

  const upgradeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/auth/upgrade-to-pro", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? t.layout.upgradeFailed);
      }
      return res.json();
    },
    onSuccess: async () => {
      await refresh();
      toast({ title: t.layout.upgradeSuccess });
      setUpgradeOpen(false);
      setPlanOpen(false);
    },
    onError: (err) =>
      toast({
        title: t.layout.errorTitle,
        description: (err as Error).message,
        variant: "destructive",
      }),
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (body: { currentPassword: string; newPassword: string }) => {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? t.layout.passwordChangeFailed);
      }
      return res.json();
    },
    onSuccess: () => {
      setPwdOpen(false);
      setPwdCurrent("");
      setPwdNew("");
      setPwdConfirm("");
      toast({
        title: t.layout.passwordChanged,
        description: t.layout.passwordChangedDesc,
      });
    },
    onError: (err) =>
      toast({
        title: t.layout.errorTitle,
        description: (err as Error).message,
        variant: "destructive",
      }),
  });

  if (!user) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2" data-testid="button-user-menu">
            <div className="bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center text-xs font-semibold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-sm font-medium leading-none">{user.name}</div>
              <div className="text-xs text-muted-foreground">
                {getRoleLabel(t, user.role)}
              </div>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel>
            <div className="text-sm">{user.name}</div>
            <div className="text-xs text-muted-foreground truncate">{user.email}</div>
            <Badge className="mt-1" variant="secondary">
              {getRoleLabel(t, user.role)}
            </Badge>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={openProfile} data-testid="button-edit-profile">
            <UserCog className="mr-2 h-4 w-4" /> {t.layout.editProfile}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={openPwd} data-testid="button-change-password">
            <Lock className="mr-2 h-4 w-4" /> {t.layout.changePassword}
          </DropdownMenuItem>
          {user.role === "owner" && (
            <DropdownMenuItem onClick={() => setPlanOpen(true)} data-testid="button-plan-info">
              <BadgeCheck className="mr-2 h-4 w-4" /> {t.layout.planInfo}
            </DropdownMenuItem>
          )}
          {canUsePush && push.state.supported && (
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                if (push.state.loading) return;
                if (push.state.subscribed) {
                  void push.disable();
                } else {
                  void push.enable();
                }
              }}
              data-testid="button-toggle-push"
            >
              {push.state.subscribed ? (
                <>
                  <BellOff className="mr-2 h-4 w-4" /> {t.layout.disablePush}
                </>
              ) : (
                <>
                  <Bell className="mr-2 h-4 w-4" /> {t.layout.enablePush}
                </>
              )}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleLogout}
            className="text-destructive focus:text-destructive"
            data-testid="button-logout"
          >
            <LogOut className="mr-2 h-4 w-4" /> {t.layout.logout}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BadgeCheck className="h-5 w-5" /> {t.layout.planInfoTitle}
            </DialogTitle>
            <DialogDescription>{t.layout.planInfoDesc}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="text-sm">
                <div className="text-muted-foreground">{t.layout.planCurrentLabel}</div>
                <div className="text-base font-semibold mt-0.5">
                  {user.plan === "pro"
                    ? t.layout.planProName
                    : user.plan === "lite"
                      ? t.layout.planLiteName
                      : t.layout.planTrialName}
                </div>
              </div>
              <Badge variant={user.plan === "pro" ? "default" : "secondary"}>
                {user.plan === "pro" ? "PRO" : user.plan === "lite" ? "LITE" : "TRIAL"}
              </Badge>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-sm font-medium mb-2">
                {user.plan === "pro" ? t.layout.planProFeaturesTitle : t.layout.planLiteFeaturesTitle}
              </div>
              <ul className="space-y-1.5 text-sm">
                {(user.plan === "pro" ? t.layout.planProFeatures : t.layout.planLiteFeatures).map(
                  (f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ),
                )}
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanOpen(false)}>
              {t.layout.cancel}
            </Button>
            {user.plan === "lite" && (
              <Button onClick={() => setUpgradeOpen(true)} data-testid="button-upgrade-pro">
                <Sparkles className="mr-2 h-4 w-4" /> {t.layout.upgradeToProBtn}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" /> {t.layout.upgradeConfirmTitle}
            </DialogTitle>
            <DialogDescription>{t.layout.upgradeConfirmDesc}</DialogDescription>
          </DialogHeader>
          <div className="rounded-md border p-3">
            <div className="text-sm font-medium mb-2">{t.layout.planProFeaturesTitle}</div>
            <ul className="space-y-1.5 text-sm">
              {t.layout.planProFeatures.map((f, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpgradeOpen(false)}>
              {t.layout.cancel}
            </Button>
            <Button
              onClick={() => upgradeMutation.mutate()}
              disabled={upgradeMutation.isPending}
              data-testid="button-confirm-upgrade"
            >
              {t.layout.upgradeConfirmBtn}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" /> {t.layout.editProfile}
            </DialogTitle>
            <DialogDescription>{t.layout.profileDialogDesc}</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateProfileMutation.mutate({
                name: profileName.trim(),
                email: profileEmail.trim(),
                phone: profilePhone.trim(),
                ...(user.role === "owner"
                  ? {
                      businessName: bizName.trim(),
                      taxCode: bizTaxCode.trim(),
                      businessRegNumber: bizRegNumber.trim(),
                      legalRepresentative: bizLegalRep.trim(),
                      businessAddress: bizAddress.trim(),
                      contactEmail: bizContactEmail.trim(),
                    }
                  : {}),
              });
            }}
            className="space-y-3"
          >
            <div className="space-y-1.5">
              <Label htmlFor="staff-profile-name">{t.layout.profileNameLabel}</Label>
              <Input
                id="staff-profile-name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                required
                maxLength={120}
                data-testid="input-profile-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-profile-email">{t.layout.profileEmailLabel}</Label>
              <Input
                id="staff-profile-email"
                type="email"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                required
                maxLength={160}
                data-testid="input-profile-email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-profile-phone">{t.layout.profilePhoneLabel}</Label>
              <Input
                id="staff-profile-phone"
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                maxLength={40}
                data-testid="input-profile-phone"
              />
            </div>
            {user.role === "owner" && (
              <div className="space-y-3 pt-3 border-t">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Building2 className="h-4 w-4 text-primary" />
                  {t.settings.businessTitle}
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="staff-biz-name">{t.settings.businessName}</Label>
                    <Input id="staff-biz-name" value={bizName} onChange={(e) => setBizName(e.target.value)} maxLength={200} data-testid="input-biz-name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="staff-biz-tax">{t.settings.taxCode}</Label>
                    <Input id="staff-biz-tax" value={bizTaxCode} onChange={(e) => setBizTaxCode(e.target.value)} maxLength={40} data-testid="input-biz-tax" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="staff-biz-reg">{t.settings.businessRegNumber}</Label>
                    <Input id="staff-biz-reg" value={bizRegNumber} onChange={(e) => setBizRegNumber(e.target.value)} maxLength={60} data-testid="input-biz-reg" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="staff-biz-rep">{t.settings.legalRepresentative}</Label>
                    <Input id="staff-biz-rep" value={bizLegalRep} onChange={(e) => setBizLegalRep(e.target.value)} maxLength={120} data-testid="input-biz-rep" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="staff-biz-ce">{t.settings.contactEmail}</Label>
                    <Input id="staff-biz-ce" value={bizContactEmail} onChange={(e) => setBizContactEmail(e.target.value)} maxLength={160} data-testid="input-biz-contact-email" />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="staff-biz-addr">{t.settings.businessAddress}</Label>
                    <Input id="staff-biz-addr" value={bizAddress} onChange={(e) => setBizAddress(e.target.value)} maxLength={300} data-testid="input-biz-address" />
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setProfileOpen(false)}>
                {t.layout.cancel}
              </Button>
              <Button
                type="submit"
                disabled={
                  !profileName.trim() ||
                  !profileEmail.trim() ||
                  updateProfileMutation.isPending
                }
                data-testid="button-save-profile"
              >
                {t.layout.saveChanges}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={pwdOpen} onOpenChange={setPwdOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" /> {t.layout.changePassword}
            </DialogTitle>
            <DialogDescription>{t.layout.changePasswordDialogDesc}</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (pwdNew !== pwdConfirm) {
                toast({
                  title: t.layout.errorTitle,
                  description: t.layout.passwordMismatch,
                  variant: "destructive",
                });
                return;
              }
              changePasswordMutation.mutate({
                currentPassword: pwdCurrent,
                newPassword: pwdNew,
              });
            }}
            className="space-y-3"
          >
            <div className="space-y-1.5">
              <Label htmlFor="staff-pwd-current">{t.layout.currentPasswordLabel}</Label>
              <PasswordInput
                id="staff-pwd-current"
                value={pwdCurrent}
                onChange={(e) => setPwdCurrent(e.target.value)}
                required
                data-testid="input-current-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-pwd-new">{t.layout.newPasswordLabel}</Label>
              <PasswordInput
                id="staff-pwd-new"
                value={pwdNew}
                onChange={(e) => setPwdNew(e.target.value)}
                required
                minLength={6}
                maxLength={64}
                data-testid="input-new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-pwd-confirm">{t.layout.confirmPasswordLabel}</Label>
              <PasswordInput
                id="staff-pwd-confirm"
                value={pwdConfirm}
                onChange={(e) => setPwdConfirm(e.target.value)}
                required
                minLength={6}
                maxLength={64}
                data-testid="input-confirm-password"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPwdOpen(false)}>
                {t.layout.cancel}
              </Button>
              <Button
                type="submit"
                disabled={
                  !pwdCurrent || pwdNew.length < 6 || changePasswordMutation.isPending
                }
                data-testid="button-save-password"
              >
                {t.layout.changePassword}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
