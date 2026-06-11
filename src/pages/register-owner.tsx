import { useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Coffee, ArrowLeft, Building2, Store } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useT } from "@/lib/i18n-context";
import { DataPrivacyDialogTrigger } from "@/components/data-privacy-dialog";

export default function RegisterOwnerPage() {
  const t = useT();
  const { registerOwner } = useAuth();
  const [, navigate] = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Account
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [plan, setPlan] = useState<"lite" | "pro">("lite");
  // First store
  const [storeName, setStoreName] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [storeDistrict, setStoreDistrict] = useState("");
  const [storeCity, setStoreCity] = useState("TP.HCM");
  const [storeOpenHours, setStoreOpenHours] = useState("07:00 - 22:00 hàng ngày");
  const [storeDescription, setStoreDescription] = useState("");
  const [consent, setConsent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await registerOwner({
        email: account.trim(),
        password,
        name: name.trim(),
        phone: phone.trim() || undefined,
        plan,
        firstStore: {
          name: storeName.trim(),
          address: storeAddress.trim(),
          phone: storePhone.trim() || undefined,
          description: storeDescription.trim() || undefined,
          openHours: storeOpenHours.trim() || undefined,
          district: storeDistrict.trim() || undefined,
          city: storeCity.trim() || undefined,
        },
      });
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.registerOwner.registerFailed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4">
          <ArrowLeft className="h-3.5 w-3.5" /> {t.common.backToHome}
        </Link>
        <Card>
          <CardHeader className="text-center space-y-3">
            <div className="mx-auto bg-primary text-primary-foreground p-3 rounded-xl w-fit">
              <Coffee className="h-7 w-7" />
            </div>
            <div>
              <CardTitle className="text-2xl">{t.registerOwner.title}</CardTitle>
              <CardDescription>
                {t.registerOwner.subtitle}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8" data-testid="form-register-owner">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription data-testid="text-register-error">{error}</AlertDescription>
                </Alert>
              )}

              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-primary/10 text-primary p-1.5 rounded">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <h3 className="font-semibold">{t.registerOwner.section1}</h3>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="account">{t.registerOwner.accountLabel}</Label>
                    <Input id="account" required value={account} onChange={(e) => setAccount(e.target.value)} placeholder={t.registerOwner.accountPlaceholder} data-testid="input-email" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">{t.registerOwner.passwordLabel}</Label>
                    <PasswordInput id="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} data-testid="input-password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">{t.registerOwner.nameLabel}</Label>
                    <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} data-testid="input-name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t.registerOwner.phoneLabel}</Label>
                    <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t.registerOwner.phonePlaceholder} data-testid="input-phone" />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>{t.registerOwner.planLabel}</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPlan("lite")}
                        className={`text-left rounded-lg border p-3 transition-colors ${
                          plan === "lite"
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-border hover:border-primary/50"
                        }`}
                        data-testid="button-plan-lite"
                      >
                        <div className="font-semibold text-sm">{t.registerOwner.planLite}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t.registerOwner.planLiteDesc}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPlan("pro")}
                        className={`text-left rounded-lg border p-3 transition-colors ${
                          plan === "pro"
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-border hover:border-primary/50"
                        }`}
                        data-testid="button-plan-pro"
                      >
                        <div className="font-semibold text-sm">{t.registerOwner.planPro}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t.registerOwner.planProDesc}
                        </p>
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-primary/10 text-primary p-1.5 rounded">
                    <Store className="h-4 w-4" />
                  </div>
                  <h3 className="font-semibold">{t.registerOwner.section3}</h3>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="storeName">{t.registerOwner.storeNameLabel}</Label>
                    <Input id="storeName" required value={storeName} onChange={(e) => setStoreName(e.target.value)} data-testid="input-store-name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="storePhone">{t.registerOwner.storePhoneLabel}</Label>
                    <Input id="storePhone" value={storePhone} onChange={(e) => setStorePhone(e.target.value)} data-testid="input-store-phone" />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="storeAddress">{t.registerOwner.storeAddressLabel}</Label>
                    <Input id="storeAddress" required value={storeAddress} onChange={(e) => setStoreAddress(e.target.value)} data-testid="input-store-address" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="storeDistrict">{t.registerOwner.districtLabel}</Label>
                    <Input id="storeDistrict" value={storeDistrict} onChange={(e) => setStoreDistrict(e.target.value)} placeholder={t.registerOwner.districtPlaceholder} data-testid="input-store-district" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="storeCity">{t.registerOwner.cityLabel}</Label>
                    <Input id="storeCity" value={storeCity} onChange={(e) => setStoreCity(e.target.value)} data-testid="input-store-city" />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="storeOpenHours">{t.registerOwner.openHoursLabel}</Label>
                    <Input id="storeOpenHours" value={storeOpenHours} onChange={(e) => setStoreOpenHours(e.target.value)} data-testid="input-store-hours" />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="storeDescription">{t.registerOwner.storeDescriptionLabel}</Label>
                    <Textarea id="storeDescription" value={storeDescription} onChange={(e) => setStoreDescription(e.target.value)} rows={2} data-testid="input-store-description" />
                  </div>
                </div>
              </section>

              <label className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30 cursor-pointer">
                <Checkbox
                  checked={consent}
                  onCheckedChange={(v) => setConsent(v === true)}
                  data-testid="checkbox-consent"
                  className="mt-0.5"
                />
                <span className="text-sm text-foreground leading-relaxed">
                  {t.registerOwner.consentLabel}
                </span>
              </label>

              <Button type="submit" className="w-full" disabled={submitting || !consent} data-testid="button-submit-register-owner">
                {submitting ? t.registerOwner.submitting : t.registerOwner.submitButton}
              </Button>

              <div className="text-sm text-center text-muted-foreground">
                {t.registerOwner.hasAccount}{" "}
                <Link href="/login" className="text-primary hover:underline">{t.registerOwner.loginLink}</Link>
              </div>

              <div className="border rounded-lg p-4 bg-muted/30 space-y-2 text-xs leading-relaxed">
                <div className="font-semibold text-sm text-foreground">
                  {t.dataPrivacy.title}
                </div>
                <p className="text-muted-foreground">{t.dataPrivacy.paragraph1}</p>
                <p className="text-muted-foreground">{t.dataPrivacy.paragraph2}</p>
                <p className="text-muted-foreground">{t.dataPrivacy.paragraph3}</p>
                <div className="pt-1">
                  <DataPrivacyDialogTrigger />
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
