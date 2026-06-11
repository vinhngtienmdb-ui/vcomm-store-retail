import { Link } from "wouter";
import {
  ShoppingBag,
  QrCode,
  Store,
  Users,
  Gift,
  Package,
  ChefHat,
  BarChart3,
  Monitor,
  RefreshCcw,
  Wallet,
  Receipt,
  MapPin,
  Smartphone,
  Sparkles,
  CheckCircle2,
  Coffee,
  ArrowRight,
  TrendingUp,
  Clock,
  ShieldCheck,
  Tag,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useT } from "@/lib/i18n-context";

const HERO_IMG =
  "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?auto=format&fit=crop&w=1400&q=80";
const SHOP_IMG =
  "https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=1200&q=80";
const POS_IMG =
  "https://images.unsplash.com/photo-1556745753-b2904692b3cd?auto=format&fit=crop&w=1200&q=80";
const MOBILE_IMG =
  "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1200&q=80";
const ANALYTICS_IMG =
  "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80";
const NEARBY_IMG =
  "https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1200&q=80";

export default function PublicIntroducePage() {
  const t = useT();
  const features = [
    { icon: ShoppingBag, key: "pos" },
    { icon: QrCode, key: "qrTable" },
    { icon: Store, key: "online" },
    { icon: Package, key: "inventory" },
    { icon: ChefHat, key: "recipe" },
    { icon: Tag, key: "promo" },
    { icon: Gift, key: "loyalty" },
    { icon: Users, key: "staff" },
    { icon: Layers, key: "multiStore" },
    { icon: Monitor, key: "dualScreen" },
    { icon: RefreshCcw, key: "returns" },
    { icon: Wallet, key: "expense" },
    { icon: Receipt, key: "vietqr" },
    { icon: BarChart3, key: "reports" },
    { icon: MapPin, key: "maps" },
    { icon: Smartphone, key: "mobile" },
  ] as const;

  const pains = ["pain1", "pain2", "pain3", "pain4"] as const;
  const benefits = ["benefit1", "benefit2", "benefit3", "benefit4"] as const;
  const stats = [
    { value: "+35%", key: "statRevenue", icon: TrendingUp },
    { value: "5x", key: "statSpeed", icon: Clock },
    { value: "100%", key: "statSecure", icon: ShieldCheck },
    { value: "24/7", key: "statSupport", icon: Sparkles },
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-amber-50 text-foreground">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500 via-pink-500 to-orange-500" />
        <div
          aria-hidden
          className="absolute inset-0 opacity-20 mix-blend-overlay"
          style={{
            backgroundImage: `url(${HERO_IMG})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div
          aria-hidden
          className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-amber-300/40 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-40 -left-40 h-[28rem] w-[28rem] rounded-full bg-rose-300/40 blur-3xl"
        />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-white">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur ring-1 ring-white/30 text-xs font-semibold uppercase tracking-wider mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            {t.introduce.heroBadge}
          </div>
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <Link href="/">
                <a
                  className="inline-flex items-center gap-2 mb-5 hover-elevate active-elevate-2 rounded-xl px-1 -mx-1 transition-opacity"
                  data-testid="link-introduce-home"
                >
                  <div className="bg-white text-rose-600 p-2.5 rounded-xl shadow-lg">
                    <Coffee className="h-7 w-7" />
                  </div>
                  <span className="text-2xl font-extrabold tracking-tight drop-shadow">
                    VComm Store Retail
                  </span>
                </a>
              </Link>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight drop-shadow-md">
                {t.introduce.heroTitle}
              </h1>
              <p className="mt-5 text-lg sm:text-xl text-white/90 leading-relaxed">
                {t.introduce.heroSubtitle}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/register-owner">
                  <Button
                    size="lg"
                    className="bg-white text-rose-600 hover:bg-amber-50 font-bold shadow-xl"
                    data-testid="button-introduce-register"
                  >
                    {t.introduce.ctaPrimary} <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
                <a href="#features">
                  <Button
                    size="lg"
                    variant="outline"
                    className="bg-transparent border-white text-white hover:bg-white/15 hover:text-white font-semibold"
                    data-testid="button-introduce-learn"
                  >
                    {t.introduce.ctaSecondary}
                  </Button>
                </a>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="relative">
                <div className="absolute -inset-3 bg-white/20 rounded-3xl blur-xl" />
                <img
                  src={SHOP_IMG}
                  alt=""
                  loading="lazy"
                  className="relative rounded-2xl shadow-2xl ring-4 ring-white/40 aspect-[4/3] w-full object-cover"
                />
                <div className="absolute -bottom-5 -left-5 bg-white text-foreground rounded-xl shadow-xl px-4 py-3 flex items-center gap-3">
                  <div className="bg-rose-500 text-white p-2 rounded-lg">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground font-medium">
                      {t.introduce.heroBadgeRev}
                    </div>
                    <div className="text-lg font-extrabold">+35%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pain points */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-block text-xs uppercase tracking-widest font-bold text-rose-600 mb-3">
            {t.introduce.painEyebrow}
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold">{t.introduce.painTitle}</h2>
          <p className="mt-4 text-muted-foreground text-lg">{t.introduce.painSubtitle}</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {pains.map((k) => (
            <Card key={k} className="border-rose-200/60 bg-rose-50/40">
              <CardContent className="p-5 flex gap-3">
                <div className="text-rose-600 shrink-0">
                  <CheckCircle2 className="h-6 w-6 rotate-45" />
                </div>
                <p className="text-foreground font-medium leading-relaxed">
                  {t.introduce[k]}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Stats band */}
      <section className="bg-gradient-to-r from-rose-600 via-pink-600 to-orange-500 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.key} className="text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-3">
                  <Icon className="h-6 w-6" />
                </div>
                <div className="text-4xl sm:text-5xl font-black drop-shadow">{s.value}</div>
                <div className="mt-1 text-sm sm:text-base text-white/90 font-medium">
                  {t.introduce[s.key]}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-block text-xs uppercase tracking-widest font-bold text-rose-600 mb-3">
            {t.introduce.featuresEyebrow}
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold">{t.introduce.featuresTitle}</h2>
          <p className="mt-4 text-muted-foreground text-lg">{t.introduce.featuresSubtitle}</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map(({ icon: Icon, key }) => (
            <Card
              key={key}
              className="group border-rose-100 hover:border-rose-300 transition-all hover:shadow-lg hover:-translate-y-0.5"
            >
              <CardContent className="p-5">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 text-white flex items-center justify-center shadow-md mb-3 group-hover:scale-110 transition-transform">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="font-bold text-foreground mb-1">
                  {t.introduce.feat[key].title}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t.introduce.feat[key].desc}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Showcase rows */}
      <section className="bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 space-y-20">
          <ShowcaseRow
            image={NEARBY_IMG}
            eyebrow={t.introduce.showcaseNearbyEyebrow}
            title={t.introduce.showcaseNearbyTitle}
            desc={t.introduce.showcaseNearbyDesc}
            bullets={[
              t.introduce.showcaseNearbyB1,
              t.introduce.showcaseNearbyB2,
              t.introduce.showcaseNearbyB3,
              t.introduce.showcaseNearbyB4,
            ]}
          />
          <ShowcaseRow
            reverse
            image={POS_IMG}
            eyebrow={t.introduce.showcaseSalesEyebrow}
            title={t.introduce.showcaseSalesTitle}
            desc={t.introduce.showcaseSalesDesc}
            bullets={[
              t.introduce.showcaseSalesB1,
              t.introduce.showcaseSalesB2,
              t.introduce.showcaseSalesB3,
            ]}
          />
          <ShowcaseRow
            image={MOBILE_IMG}
            eyebrow={t.introduce.showcaseOrderEyebrow}
            title={t.introduce.showcaseOrderTitle}
            desc={t.introduce.showcaseOrderDesc}
            bullets={[
              t.introduce.showcaseOrderB1,
              t.introduce.showcaseOrderB2,
              t.introduce.showcaseOrderB3,
            ]}
          />
          <ShowcaseRow
            reverse
            image={ANALYTICS_IMG}
            eyebrow={t.introduce.showcaseGrowEyebrow}
            title={t.introduce.showcaseGrowTitle}
            desc={t.introduce.showcaseGrowDesc}
            bullets={[
              t.introduce.showcaseGrowB1,
              t.introduce.showcaseGrowB2,
              t.introduce.showcaseGrowB3,
            ]}
          />
        </div>
      </section>

      {/* Benefits */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-block text-xs uppercase tracking-widest font-bold text-rose-600 mb-3">
            {t.introduce.benefitsEyebrow}
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold">{t.introduce.benefitsTitle}</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {benefits.map((k) => (
            <div
              key={k}
              className="flex gap-4 p-5 rounded-2xl bg-gradient-to-br from-rose-50 to-amber-50 ring-1 ring-rose-100"
            >
              <div className="shrink-0 w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center shadow">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <p className="text-foreground font-medium leading-relaxed">
                {t.introduce[k]}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-600 via-pink-600 to-orange-500" />
        <div
          aria-hidden
          className="absolute -top-20 -right-20 h-80 w-80 rounded-full bg-amber-300/30 blur-3xl"
        />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center text-white">
          <h2 className="text-3xl sm:text-5xl font-black drop-shadow">
            {t.introduce.ctaTitle}
          </h2>
          <p className="mt-5 text-lg sm:text-xl text-white/90 max-w-2xl mx-auto">
            {t.introduce.ctaSubtitle}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/register-owner">
              <Button
                size="lg"
                className="bg-white text-rose-600 hover:bg-amber-50 font-bold shadow-xl"
                data-testid="button-introduce-cta-register"
              >
                {t.introduce.ctaPrimary} <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
            <Link href="/login">
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent border-white text-white hover:bg-white/15 hover:text-white font-semibold"
                data-testid="button-introduce-cta-login"
              >
                {t.introduce.ctaLogin}
              </Button>
            </Link>
          </div>
          <p className="mt-6 text-white/80 text-sm">{t.introduce.ctaFinePrint}</p>
        </div>
      </section>

      <footer className="bg-slate-900 text-slate-300 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2 font-bold text-white">
            <Coffee className="h-5 w-5" /> VComm Store Retail
          </div>
          <div className="text-slate-400">{t.introduce.footerTagline}</div>
        </div>
      </footer>
    </div>
  );
}

interface ShowcaseRowProps {
  image: string;
  eyebrow: string;
  title: string;
  desc: string;
  bullets: string[];
  reverse?: boolean;
}

function ShowcaseRow({ image, eyebrow, title, desc, bullets, reverse }: ShowcaseRowProps) {
  return (
    <div className="grid md:grid-cols-2 gap-10 items-center">
      <div className={reverse ? "md:order-2" : ""}>
        <div className="text-xs uppercase tracking-widest font-bold text-rose-600 mb-3">
          {eyebrow}
        </div>
        <h3 className="text-2xl sm:text-3xl font-extrabold mb-4 leading-tight">{title}</h3>
        <p className="text-muted-foreground text-lg mb-5 leading-relaxed">{desc}</p>
        <ul className="space-y-3">
          {bullets.map((b, i) => (
            <li key={i} className="flex gap-3">
              <CheckCircle2 className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
              <span className="text-foreground font-medium">{b}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className={reverse ? "md:order-1" : ""}>
        <div className="relative">
          <div className="absolute -inset-2 bg-gradient-to-br from-rose-300/40 to-amber-300/40 rounded-3xl blur-xl" />
          <img
            src={image}
            alt=""
            loading="lazy"
            className="relative rounded-2xl shadow-2xl ring-1 ring-rose-100 aspect-[4/3] w-full object-cover"
          />
        </div>
      </div>
    </div>
  );
}
