import { useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { useAuth, isStaffRole } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Coffee, LogIn } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { DataPrivacyDialogTrigger } from "@/components/data-privacy-dialog";

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useI18n();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const u = await login(email.trim(), password);
      const search = typeof window !== "undefined" ? window.location.search : "";
      const params = new URLSearchParams(search);
      const nextParam = params.get("next");
      let savedNext: string | null = null;
      try {
        savedNext = sessionStorage.getItem("vcomm-store_redirect_after_login");
        sessionStorage.removeItem("vcomm-store_redirect_after_login");
      } catch {}
      const next = (nextParam && nextParam.startsWith("/")) ? nextParam : (savedNext && savedNext.startsWith("/")) ? savedNext : null;
      if (next) {
        navigate(next);
      } else if (u.role === "platform_admin") {
        navigate("/admin");
      } else if (u.role === "customer") {
        navigate("/shop");
      } else if (u.role === "courier") {
        navigate("/courier");
      } else if (isStaffRole(u.role)) {
        navigate("/dashboard");
      } else {
        navigate("/");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.login.loginFailed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <Link
            href="/"
            className="mx-auto block w-fit space-y-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid="link-login-home"
            aria-label={t.login.homeAriaLabel}
          >
            <div className="mx-auto bg-primary text-primary-foreground p-3 rounded-xl w-fit transition-transform hover:scale-105">
              <Coffee className="h-7 w-7" />
            </div>
            <div>
              <CardTitle className="text-2xl hover:underline">VComm Store Retail</CardTitle>
              <CardDescription>{t.login.subtitle}</CardDescription>
            </div>
          </Link>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" data-testid="form-login">
            {error && (
              <Alert variant="destructive">
                <AlertDescription data-testid="text-login-error">{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">{t.login.accountLabel}</Label>
              <Input
                id="email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.login.accountPlaceholder}
                required
                autoComplete="username"
                data-testid="input-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t.login.password}</Label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                data-testid="input-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting} data-testid="button-login">
              <LogIn className="mr-2 h-4 w-4" />
              {submitting ? t.login.loggingIn : t.login.loginButton}
            </Button>
            <div className="text-sm text-center text-muted-foreground">
              {t.login.noAccount}{" "}
              <Link href="/register" className="text-primary hover:underline" data-testid="link-register">
                {t.login.registerChain}
              </Link>
            </div>
            <div className="text-sm text-center">
              <DataPrivacyDialogTrigger />
            </div>
            <div className="flex items-center justify-center border-t pt-3">
              <LanguageSwitcher />
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
