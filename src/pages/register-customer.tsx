import { useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Coffee, UserPlus } from "lucide-react";
import { useT } from "@/lib/i18n-context";

export default function RegisterCustomerPage() {
  const t = useT();
  const { registerCustomer } = useAuth();
  const [, navigate] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await registerCustomer({
        email: username.trim(),
        password,
        name: name.trim(),
        phone: phone.trim() || undefined,
      });
      const search = typeof window !== "undefined" ? window.location.search : "";
      const params = new URLSearchParams(search);
      const nextParam = params.get("next");
      const next = nextParam && nextParam.startsWith("/") ? nextParam : "/account";
      navigate(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.registerCustomer.registerFailed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4">
          <ArrowLeft className="h-3.5 w-3.5" /> {t.common.backToHome}
        </Link>
        <Card>
          <CardHeader className="text-center space-y-3">
            <div className="mx-auto bg-primary text-primary-foreground p-3 rounded-xl w-fit">
              <Coffee className="h-7 w-7" />
            </div>
            <div>
              <CardTitle className="text-2xl">{t.registerCustomer.title}</CardTitle>
              <CardDescription>
                {t.registerCustomer.subtitle}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="form-register-customer">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription data-testid="text-customer-register-error">{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="name">{t.registerCustomer.nameLabel}</Label>
                <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} data-testid="input-name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">{t.registerCustomer.usernameLabel}</Label>
                <Input
                  id="username"
                  required
                  minLength={3}
                  maxLength={160}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t.registerCustomer.usernamePlaceholder}
                  autoComplete="username"
                  data-testid="input-email"
                />
                <p className="text-xs text-muted-foreground">{t.registerCustomer.usernameHelp}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t.registerCustomer.phoneLabel}</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t.registerCustomer.phonePlaceholder} data-testid="input-phone" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t.registerCustomer.passwordLabel}</Label>
                <PasswordInput id="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} data-testid="input-password" />
              </div>
              <Button type="submit" className="w-full" disabled={submitting} data-testid="button-submit-register-customer">
                <UserPlus className="h-4 w-4 mr-1" />
                {submitting ? t.registerCustomer.submitting : t.registerCustomer.submitButton}
              </Button>
              <div className="text-sm text-center text-muted-foreground">
                {t.registerCustomer.hasAccount}{" "}
                <Link href="/login" className="text-primary hover:underline">{t.registerCustomer.loginLink}</Link>
              </div>
              <div className="text-sm text-center text-muted-foreground border-t pt-3">
                {t.registerCustomer.isOwner}{" "}
                <Link href="/register-owner" className="text-primary hover:underline">{t.registerCustomer.registerChain}</Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
