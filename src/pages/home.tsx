import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Coffee, MapPin, Search, Star, Navigation, LogIn, UserPlus, Store, Phone, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import { useT } from "@/lib/i18n-context";
import { LanguageSwitcher } from "@/components/language-switcher";
import { DataPrivacyDialogTrigger } from "@/components/data-privacy-dialog";

interface PublicStore {
  id: string;
  slug: string;
  name: string;
  address: string;
  phone: string;
  description: string;
  images: string[];
  openHours: string;
  district: string;
  city: string;
  ratingAvg: number;
  ratingCount: number;
  productCount: number;
  distanceKm: number | null;
}


interface SearchHit {
  productId: string;
  productName: string;
  productPrice: number;
  productImage: string | null;
  productType: "grocery" | "beverage";
  categoryName: string | null;
  storeId: string;
  storeSlug: string;
  storeName: string;
  storeAddress: string;
  storeRating: number;
  storeRatingCount: number;
  distanceKm: number | null;
}

interface DistrictOption {
  district: string;
  city: string;
}

const formatVnd = (n: number) => new Intl.NumberFormat("vi-VN").format(n) + " ₫";

export default function HomePage() {
  const t = useT();
  const { user } = useAuth();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "denied" | "ok" | "unavailable">("idle");
  const [district, setDistrict] = useState<string>("");
  const [radiusKm, setRadiusKm] = useState<string>("30");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [galleryStore, setGalleryStore] = useState<PublicStore | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);

  useEffect(() => {
    setGalleryIndex(0);
  }, [galleryStore]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setGeoStatus("unavailable");
      return;
    }
    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoStatus("ok");
      },
      () => setGeoStatus("denied"),
      { timeout: 8000 },
    );
  }, []);

  const requestLocation = () => {
    if (!("geolocation" in navigator)) {
      setGeoStatus("unavailable");
      return;
    }
    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoStatus("ok");
      },
      () => setGeoStatus("denied"),
      { timeout: 8000 },
    );
  };

  const districtsQuery = useQuery({
    queryKey: ["storefront-districts"],
    queryFn: async (): Promise<DistrictOption[]> => {
      const res = await fetch("/api/storefront/districts");
      if (!res.ok) throw new Error(t.home.loadDistrictsError);
      return res.json();
    },
  });

  const effectiveRadius = useMemo<number | null>(() => {
    if (!coords) return null;
    const n = Number(radiusKm);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [coords, radiusKm]);

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (coords) {
      p.set("lat", String(coords.lat));
      p.set("lng", String(coords.lng));
    }
    if (district) p.set("district", district);
    if (effectiveRadius !== null) p.set("radius", String(effectiveRadius));
    return p.toString();
  }, [coords, district, effectiveRadius]);

  const storesQuery = useQuery({
    queryKey: ["home-stores", params],
    queryFn: async (): Promise<PublicStore[]> => {
      const res = await fetch(`/api/storefront/stores${params ? `?${params}` : ""}`);
      if (!res.ok) throw new Error(t.home.loadStoresError);
      return res.json();
    },
  });

  const searchParams = useMemo(() => {
    const p = new URLSearchParams();
    p.set("q", debouncedQuery);
    if (coords) {
      p.set("lat", String(coords.lat));
      p.set("lng", String(coords.lng));
    }
    return p.toString();
  }, [debouncedQuery, coords]);

  const searchQuery = useQuery({
    queryKey: ["home-search", searchParams],
    queryFn: async (): Promise<SearchHit[]> => {
      if (!debouncedQuery) return [];
      const res = await fetch(`/api/storefront/search?${searchParams}`);
      if (!res.ok) throw new Error(t.home.loadSearchError);
      return res.json();
    },
    enabled: debouncedQuery.length > 0,
  });

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="bg-primary text-primary-foreground" data-testid="home-header">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-black/25 hover:bg-black/35 px-3 py-1.5 ring-1 ring-white/20 text-white shadow-sm backdrop-blur-sm transition-colors"
          >
            <Coffee className="h-5 w-5 text-white shrink-0" />
            <span
              className="font-semibold text-white"
              style={{ textShadow: "0 1px 2px rgba(0,0,0,0.45)" }}
            >
              VComm Store Retail
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher variant="header" />
            {user ? (
              <Link href={user.role === "customer" ? "/account" : user.role === "platform_admin" ? "/admin" : "/dashboard"}>
                <Button variant="secondary" size="sm" data-testid="button-go-dashboard">
                  {user.role === "customer" ? t.home.myAccount : user.role === "platform_admin" ? t.home.adminPanel : t.home.goManage}
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="secondary" size="icon" className="sm:hidden" data-testid="button-header-login-icon" aria-label={t.home.login}>
                    <LogIn className="h-4 w-4" />
                  </Button>
                  <Button variant="secondary" size="sm" className="hidden sm:inline-flex" data-testid="button-header-login">
                    <LogIn className="h-4 w-4 mr-1" />
                    {t.home.login}
                  </Button>
                </Link>
                <Link href="/register-customer">
                  <Button variant="outline" size="icon" className="bg-transparent text-primary-foreground border-primary-foreground/40 hover:bg-primary-foreground/10 sm:hidden" data-testid="button-header-register-icon" aria-label={t.home.register}>
                    <UserPlus className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="bg-transparent text-primary-foreground border-primary-foreground/40 hover:bg-primary-foreground/10 hidden sm:inline-flex" data-testid="button-header-register">
                    <UserPlus className="h-4 w-4 mr-1" />
                    {t.home.register}
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-10 pt-4">
          <h1 className="text-3xl sm:text-4xl font-bold">{t.home.heroTitle}</h1>
          <p className="mt-2 text-primary-foreground/80 max-w-2xl">
            {t.home.heroSubtitle}
          </p>

          <div className="mt-6 grid sm:grid-cols-[1fr_auto_auto] gap-3 max-w-3xl">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.home.searchPlaceholder}
                className="pl-9 bg-background text-foreground"
                data-testid="input-search"
              />
            </div>
            <Select value={district || "all"} onValueChange={(v) => setDistrict(v === "all" ? "" : v)}>
              <SelectTrigger className="bg-background text-foreground sm:w-48" data-testid="select-district">
                <SelectValue placeholder={t.home.allDistricts} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.home.allDistricts}</SelectItem>
                {districtsQuery.data?.filter((d) => !!d.district).map((d) => (
                  <SelectItem key={d.district} value={d.district}>
                    {d.district}{d.city ? ` · ${d.city}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.5"
                value={radiusKm}
                onChange={(e) => setRadiusKm(e.target.value)}
                className="bg-background text-foreground w-20"
                data-testid="input-radius-km"
                aria-label={t.home.radiusLabel}
              />
              <span className="text-sm text-primary-foreground whitespace-nowrap">{t.home.radiusKmTo}</span>
              <Button
                variant="secondary"
                onClick={requestLocation}
                disabled={geoStatus === "loading"}
                data-testid="button-use-location"
              >
                <Navigation className="h-4 w-4 mr-1" />
                {geoStatus === "ok" ? t.home.locationGranted : geoStatus === "loading" ? t.home.locationLoading : t.home.useLocation}
              </Button>
            </div>
          </div>
          <div className="mt-3 text-xs text-primary-foreground/80">
            {geoStatus === "denied" && (
              <span data-testid="text-geo-denied">
                {t.home.geoDenied}
              </span>
            )}
            {geoStatus === "unavailable" && <span>{t.home.geoUnavailable}</span>}
            {geoStatus === "ok" && <span>{t.home.geoOk}</span>}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        {debouncedQuery && (
          <section data-testid="section-search-results">
            <h2 className="text-xl font-semibold mb-4">{t.home.searchResultsFor} "{debouncedQuery}"</h2>
            {!coords && (
              <div
                className="mb-4 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
                data-testid="banner-enable-location-products"
              >
                <Navigation className="h-4 w-4 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <span>{t.home.geoPromptForProducts}</span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={requestLocation}
                  disabled={geoStatus === "loading"}
                  data-testid="button-enable-location-products"
                >
                  {geoStatus === "loading" ? t.home.locationLoading : t.home.useLocation}
                </Button>
              </div>
            )}
            {searchQuery.isLoading && <p className="text-muted-foreground">{t.home.searching}</p>}
            {searchQuery.data && searchQuery.data.length === 0 && (
              <p className="text-muted-foreground">{t.home.noSearchResults}</p>
            )}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchQuery.data?.map((hit) => (
                <Link
                  key={`${hit.productId}-${hit.storeId}`}
                  href={`/shop/${hit.storeSlug}`}
                  data-testid={`card-result-${hit.productId}-${hit.storeId}`}
                >
                  <Card className="hover-elevate h-full">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium leading-tight">{hit.productName}</p>
                          <p className="text-xs text-muted-foreground">{hit.categoryName ?? hit.productType}</p>
                        </div>
                        <Badge variant="secondary">{formatVnd(hit.productPrice)}</Badge>
                      </div>
                      <div className="border-t pt-2 text-sm space-y-1">
                        <div className="flex items-center gap-1 font-medium">
                          <Store className="h-3.5 w-3.5" /> {hit.storeName}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                            {hit.storeRating.toFixed(1)} ({hit.storeRatingCount})
                          </span>
                          {hit.distanceKm !== null && (
                            <span className="flex items-center gap-1">
                              <Navigation className="h-3 w-3" /> {hit.distanceKm.toFixed(1)} km
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section data-testid="section-stores">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-xl font-semibold">
              {coords ? t.home.nearestStores : t.home.featuredStores}
            </h2>
            <span className="text-sm text-muted-foreground">{storesQuery.data?.length ?? 0} {t.common.stores}</span>
          </div>
          {storesQuery.isLoading && <p className="text-muted-foreground">{t.home.storesLoading}</p>}
          {storesQuery.data && storesQuery.data.length === 0 && (
            <p className="text-muted-foreground" data-testid="text-no-stores">
              {coords && Number.isFinite(parseFloat(radiusKm)) && parseFloat(radiusKm) > 0
                ? t.home.noStoresInRadius.replace("{km}", radiusKm)
                : t.home.noStoresFound}
            </p>
          )}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {storesQuery.data?.map((s) => (
              <Card key={s.id} className="hover-elevate overflow-hidden" data-testid={`card-store-${s.slug}`}>
                {s.images && s.images.length > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setGalleryStore(s);
                    }}
                    className="block w-full aspect-[16/9] bg-muted overflow-hidden hover-elevate text-left"
                    aria-label={t.home.viewGallery}
                    data-testid={`button-store-cover-${s.slug}`}
                  >
                    <img
                      src={s.images[0]}
                      alt={s.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>
                )}
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-lg leading-tight">{s.name}</h3>
                      {(s.district || s.city) && (
                        <p className="text-xs text-muted-foreground">
                          {[s.district, s.city].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                    <div className="text-right text-sm">
                      <div className="flex items-center gap-1 font-medium">
                        <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                        {s.ratingAvg.toFixed(1)}
                      </div>
                      <div className="text-xs text-muted-foreground">{s.ratingCount} {t.home.reviews}</div>
                    </div>
                  </div>
                  {s.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{s.description}</p>
                  )}
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {s.address && (
                      <div className="flex gap-1.5">
                        <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        <span className="line-clamp-2">{s.address}</span>
                      </div>
                    )}
                    {s.phone && (
                      <div className="flex gap-1.5">
                        <Phone className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        <span>{s.phone}</span>
                      </div>
                    )}
                    {s.openHours && (
                      <div className="flex gap-1.5">
                        <Clock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        <span>{s.openHours}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-xs text-muted-foreground flex items-center gap-2">
                      {s.distanceKm !== null && (
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-foreground">
                          <Navigation className="h-4 w-4" />
                          {s.distanceKm.toFixed(1)} {t.home.kmFromYou}
                        </span>
                      )}
                      <span>{s.productCount} {t.common.products}</span>
                    </span>
                    <Link href={`/shop/${s.slug}`}>
                      <Button size="sm" data-testid={`button-visit-${s.slug}`}>{t.home.visit}</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="bg-card border rounded-xl p-6 sm:p-8 grid md:grid-cols-2 gap-6 items-center">
          <div>
            <h3 className="text-2xl font-semibold">{t.home.ownerCta}</h3>
            <p className="mt-2 text-muted-foreground">
              {t.home.ownerCtaDesc}
            </p>
            <div className="mt-4 flex gap-2">
              <Link href="/register-owner">
                <Button data-testid="button-cta-register-owner">
                  <UserPlus className="h-4 w-4 mr-1" />
                  {t.home.registerOwnerBtn}
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline">{t.home.hasAccountBtn}</Button>
              </Link>
            </div>
          </div>
          <ul className="text-sm space-y-2">
            <li className="flex gap-2"><span className="text-primary">•</span> {t.home.feature1}</li>
            <li className="flex gap-2"><span className="text-primary">•</span> {t.home.feature2}</li>
            <li className="flex gap-2"><span className="text-primary">•</span> {t.home.feature3}</li>
            <li className="flex gap-2"><span className="text-primary">•</span> {t.home.feature4}</li>
          </ul>
        </section>
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground space-y-2">
        <div>{t.common.brandFooter}</div>
        <div>
          <DataPrivacyDialogTrigger className="inline-flex items-center gap-1 text-primary hover:underline text-xs" />
        </div>
      </footer>

      <Dialog open={!!galleryStore} onOpenChange={(o) => !o && setGalleryStore(null)}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-3xl max-h-[85vh] overflow-y-auto p-3 sm:p-6 gap-3">
          <DialogHeader>
            <DialogTitle>{galleryStore?.name ?? t.home.galleryTitle}</DialogTitle>
            <DialogDescription>{t.home.galleryTitle}</DialogDescription>
          </DialogHeader>
          {galleryStore && (() => {
            const imgs = galleryStore.images ?? [];
            const total = imgs.length;
            const safeIdx = total > 0 ? ((galleryIndex % total) + total) % total : 0;
            const goPrev = () => setGalleryIndex((i) => (total > 0 ? (i - 1 + total) % total : 0));
            const goNext = () => setGalleryIndex((i) => (total > 0 ? (i + 1) % total : 0));
            return (
              <div className="space-y-4">
                {total > 0 ? (
                  <div className="space-y-2" data-testid="dialog-store-gallery">
                    <div className="relative h-[40vh] sm:h-auto sm:aspect-[4/3] bg-muted rounded-md overflow-hidden flex items-center justify-center select-none">
                      <img
                        src={imgs[safeIdx]}
                        alt={`${galleryStore.name} ${safeIdx + 1}`}
                        className="w-full h-full object-contain pointer-events-none"
                        draggable={false}
                        data-testid="dialog-store-image-current"
                      />
                      {total > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={goPrev}
                            className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-background/80 hover:bg-background border flex items-center justify-center shadow"
                            aria-label={t.common.previous}
                            data-testid="button-gallery-prev"
                          >
                            <ChevronLeft className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={goNext}
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-background/80 hover:bg-background border flex items-center justify-center shadow"
                            aria-label={t.common.next}
                            data-testid="button-gallery-next"
                          >
                            <ChevronRight className="h-5 w-5" />
                          </button>
                          <span className="absolute bottom-2 right-2 text-xs px-2 py-0.5 rounded-full bg-background/80 border" data-testid="text-gallery-index">
                            {safeIdx + 1} / {total}
                          </span>
                        </>
                      )}
                    </div>
                    {total > 1 && (
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {imgs.map((src, idx) => (
                          <button
                            key={src + idx}
                            type="button"
                            onClick={() => setGalleryIndex(idx)}
                            className={`shrink-0 h-14 w-14 rounded-md overflow-hidden border-2 ${idx === safeIdx ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"}`}
                            aria-label={`${galleryStore.name} ${idx + 1}`}
                            data-testid={`button-gallery-thumb-${idx}`}
                          >
                            <img src={src} alt="" className="w-full h-full object-cover pointer-events-none" draggable={false} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t.home.noStoreImages}</p>
                )}
                <div className="border-t pt-3">
                  <p className="text-sm whitespace-pre-line" data-testid="dialog-store-description">
                    {galleryStore.description?.trim() ? galleryStore.description : t.home.noStoreDescription}
                  </p>
                </div>
                <div className="flex justify-end pt-2">
                  <Link href={`/shop/${galleryStore.slug}`}>
                    <Button data-testid="button-dialog-visit-store">{t.home.visit}</Button>
                  </Link>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
