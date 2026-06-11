import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coffee, MapPin, Phone, Clock, Package } from "lucide-react";
import { DirectionsButton } from "@/components/directions-button";
import { GuestNav } from "@/components/guest-nav";
import { useT } from "@/lib/i18n-context";

interface PublicStore {
  id: string;
  slug: string;
  name: string;
  address: string;
  phone: string;
  description: string;
  openHours: string;
  latitude: number | null;
  longitude: number | null;
  productCount: number;
}

async function fetchStores(): Promise<PublicStore[]> {
  const res = await fetch("/api/storefront/stores");
  if (!res.ok) throw new Error("Không tải được danh sách cửa hàng");
  return res.json();
}

export default function ShopListPage() {
  const t = useT();
  const { data, isLoading, error } = useQuery({
    queryKey: ["storefront-stores"],
    queryFn: fetchStores,
  });

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="bg-primary text-primary-foreground">
        <div className="max-w-5xl mx-auto px-6 pt-6 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-3 hover-elevate rounded-md px-2 py-1">
            <div className="bg-primary-foreground/15 p-2 rounded-lg">
              <Coffee className="h-6 w-6" />
            </div>
            <span className="font-semibold">VComm Store Retail</span>
          </Link>
          <GuestNav />
        </div>
        <div className="max-w-5xl mx-auto px-6 pb-10 pt-6">
          <h1 className="text-4xl font-bold">{t.shopList.title}</h1>
          <p className="mt-3 text-primary-foreground/80 max-w-2xl">
            {t.shopList.subtitle}
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10" data-testid="page-shop-list">
        {isLoading && (
          <p className="text-center text-muted-foreground py-12">{t.shopList.loadingStores}</p>
        )}
        {error && (
          <p className="text-center text-destructive py-12">{(error as Error).message}</p>
        )}
        {data && data.length === 0 && (
          <p className="text-center text-muted-foreground py-12">
            {t.shopList.noActiveStores}
          </p>
        )}
        <div className="grid md:grid-cols-2 gap-5">
          {data?.map((s) => (
            <Card key={s.id} className="hover-elevate" data-testid={`card-store-${s.slug}`}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{s.name}</span>
                  <span className="text-xs font-normal text-muted-foreground flex items-center gap-1">
                    <Package className="h-3 w-3" /> {s.productCount} {t.common.products}
                  </span>
                </CardTitle>
                {s.description && <CardDescription>{s.description}</CardDescription>}
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {s.address && (
                  <div className="flex gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{s.address}</span>
                  </div>
                )}
                {s.phone && (
                  <div className="flex gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{s.phone}</span>
                  </div>
                )}
                {s.openHours && (
                  <div className="flex gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{s.openHours}</span>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-2 mt-3">
                  <Link href={`/shop/${s.slug}`} className="flex-1">
                    <Button className="w-full" data-testid={`button-view-${s.slug}`}>
                      {t.shopList.viewMenu}
                    </Button>
                  </Link>
                  <DirectionsButton
                    latitude={s.latitude}
                    longitude={s.longitude}
                    address={s.address}
                    storeName={s.name}
                    size="default"
                    testId={`button-directions-${s.slug}`}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        {t.common.brandFooter}
      </footer>
    </div>
  );
}
