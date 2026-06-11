import { Link, useLocation } from "wouter";
import { LogIn, UserPlus, LayoutDashboard, UserCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useT } from "@/lib/i18n-context";

interface GuestNavProps {
  variant?: "primary" | "default";
}

export function GuestNav({ variant = "primary" }: GuestNavProps) {
  const t = useT();
  const { user, loading } = useAuth();
  const [location] = useLocation();

  if (loading) {
    return <div className="h-9 w-40" aria-hidden />;
  }

  const onPrimary = variant === "primary";
  const needsRedirect = location !== "/" && location !== "/login" && location !== "/register-customer";
  const loginHref = needsRedirect ? `/login?next=${encodeURIComponent(location)}` : "/login";
  const registerHref = needsRedirect ? `/register-customer?next=${encodeURIComponent(location)}` : "/register-customer";
  const outlineClass = onPrimary
    ? "bg-transparent text-primary-foreground border-primary-foreground/40 hover:bg-primary-foreground/10"
    : "";

  if (user) {
    if (user.role === "customer") {
      return (
        <Link href="/account">
          <Button variant="secondary" size="sm" data-testid="button-guestnav-go-account">
            <UserCircle className="h-4 w-4 mr-1" />
            {t.guestNav.myAccount}
          </Button>
        </Link>
      );
    }
    if (user.role === "platform_admin") {
      return (
        <Link href="/admin">
          <Button variant="secondary" size="sm" data-testid="button-guestnav-go-admin">
            <ShieldCheck className="h-4 w-4 mr-1" />
            {t.guestNav.adminPanel}
          </Button>
        </Link>
      );
    }
    return (
      <Link href="/dashboard">
        <Button variant="secondary" size="sm" data-testid="button-guestnav-go-dashboard">
          <LayoutDashboard className="h-4 w-4 mr-1" />
          {t.guestNav.goManage}
        </Button>
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link href={loginHref}>
        <Button variant="secondary" size="sm" data-testid="button-guestnav-login">
          <LogIn className="h-4 w-4 mr-1" />
          {t.guestNav.login}
        </Button>
      </Link>
      <Link href={registerHref}>
        <Button
          variant="outline"
          size="sm"
          className={outlineClass}
          data-testid="button-guestnav-register"
        >
          <UserPlus className="h-4 w-4 mr-1" />
          {t.guestNav.register}
        </Button>
      </Link>
    </div>
  );
}
