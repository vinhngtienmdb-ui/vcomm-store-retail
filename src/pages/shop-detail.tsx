import { useEffect, useState, useMemo, type FormEvent } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import { QRCodeSVG } from "qrcode.react";
import promoBadge from "@/assets/promo-badge.png";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MobileCartBar } from "@/components/mobile-cart-bar";
import { ProductDetailDialog } from "@/components/product-detail-dialog";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/format";
import { useAuth } from "@/lib/auth-context";
import { useT } from "@/lib/i18n-context";
import { DirectionsButton } from "@/components/directions-button";
import { GuestNav } from "@/components/guest-nav";
import { PromoCountdown } from "@/components/promo-countdown";
import {
  Coffee,
  MapPin,
  Phone,
  Clock,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  ArrowLeft,
  CheckCircle2,
  Tag,
  Star,
  Search,
  X,
  Sparkles,
  ChevronDown,
} from "lucide-react";

interface StorefrontProduct {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  type: "grocery" | "beverage";
  price: number;
  originalPrice?: number;
  salePrice?: number | null;
  promoCode?: string | null;
  promoName?: string | null;
  promoEndsAt?: string | null;
  unit: string;
  categoryId: string | null;
  categoryName: string | null;
  imageUrl: string | null;
  images: string[];
  inStock: boolean;
}

interface StorefrontStore {
  id: string;
  slug: string;
  name: string;
  address: string;
  phone: string;
  description: string;
  images: string[];
  openHours: string;
  latitude: number | null;
  longitude: number | null;
  tempClosureStart: string | null;
  tempClosureEnd: string | null;
  tempClosureReason: string;
  productCount: number;
  categories: Array<{ id: string; name: string; kind: string; productCount: number }>;
  promotions: Array<{
    id: string;
    code: string;
    name: string;
    type: "percent" | "fixed";
    value: number;
    minOrder: number;
    endDate?: string | null;
  }>;
}

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  unit: string;
  note?: string;
}

interface OrderResult {
  id: string;
  code: string;
  storeName: string;
  subtotal: number;
  discount: number;
  total: number;
  status: string;
  pickupAt: string | null;
  paid: boolean;
  qrPayload: string;
  orderType?: string | null;
  shippingFee?: number;
  distanceKm?: number | null;
  deliveryStatus?: string | null;
  promotions?: Array<{
    promotionId: string;
    code: string;
    name: string;
    discountAmount: number;
  }>;
}

interface MyPromotion {
  id: string;
  code: string;
  name: string;
  kind: string;
  type: "percent" | "fixed";
  value: number;
  minOrder: number;
  maxDiscount: number | null;
  requiresCode: string | null;
  endDate: string;
  isUsed: boolean;
}

async function fetchMyPromotions(storeId: string): Promise<MyPromotion[]> {
  const res = await fetch(`/api/storefront/my-promotions?storeId=${encodeURIComponent(storeId)}`, {
    credentials: "include",
  });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) return [];
    throw new Error("Không tải được mã khuyến mãi");
  }
  return res.json();
}

async function fetchStore(slug: string): Promise<StorefrontStore> {
  const res = await fetch(`/api/storefront/stores/${slug}`);
  if (!res.ok) throw new Error("Không tải được thông tin cửa hàng");
  return res.json();
}

async function fetchProducts(slug: string, promoCode?: string | null): Promise<StorefrontProduct[]> {
  const qs = promoCode ? `?promo=${encodeURIComponent(promoCode)}` : "";
  const res = await fetch(`/api/storefront/stores/${slug}/products${qs}`);
  if (!res.ok) throw new Error("Không tải được sản phẩm");
  return res.json();
}

export default function ShopDetailPage() {
  const t = useT();
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [promoFilter, setPromoFilter] = useState<string | null>(() =>
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("promo") : null,
  );
  useEffect(() => {
    const sync = () => {
      const v = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("promo") : null;
      setPromoFilter(v);
    };
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const storeQ = useQuery({ queryKey: ["storefront-store", slug], queryFn: () => fetchStore(slug) });
  const productsQ = useQuery({
    queryKey: ["storefront-products", slug, promoFilter],
    queryFn: () => fetchProducts(slug, promoFilter),
  });
  const fulfillmentOptionsQ = useQuery({
    queryKey: ["storefront-delivery-options", slug],
    queryFn: async () => {
      const res = await fetch(`/api/storefront/stores/${slug}/delivery-options`);
      if (!res.ok) return [] as Array<{
        id: string;
        label: string;
        description: string | null;
        fee: number;
        requiresAddress: boolean;
      }>;
      return res.json() as Promise<Array<{
        id: string;
        label: string;
        description: string | null;
        fee: number;
        requiresAddress: boolean;
      }>>;
    },
    enabled: !!slug,
  });
  const fulfillmentOptions = fulfillmentOptionsQ.data ?? [];

  const { user } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [guestName, setGuestName] = useState(
    user?.role === "customer" ? (user.name ?? "") : "",
  );
  const [guestPhone, setGuestPhone] = useState(
    user?.role === "customer" ? (user.phone ?? "") : "",
  );
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "qr" | "ewallet" | "cod">("cod");
  const [requestVat, setRequestVat] = useState(false);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [promoPickerOpen, setPromoPickerOpen] = useState(false);
  const [promosOpen, setPromosOpen] = useState(false);
  const [note, setNote] = useState("");
  const [pickupAt, setPickupAt] = useState("");
  const [orderType, setOrderType] = useState<"pickup" | "delivery">("pickup");
  const [deliveryOptionId, setDeliveryOptionId] = useState<string | null>(null);
  const [fulfillmentTouched, setFulfillmentTouched] = useState(false);
  const selectedFulfillment = fulfillmentOptions.find((o) => o.id === deliveryOptionId) ?? null;
  useEffect(() => {
    if (deliveryOptionId === null && fulfillmentOptions.length > 0) {
      setDeliveryOptionId(fulfillmentOptions[0]!.id);
    }
  }, [fulfillmentOptions, deliveryOptionId]);
  const [fulfillmentPickerOpen, setFulfillmentPickerOpen] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryCoords, setDeliveryCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [shippingQuote, setShippingQuote] = useState<{ fee: number; distanceKm: number } | null>(null);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [orderResult, setOrderResult] = useState<OrderResult | null>(null);
  const [addressPickerOpen, setAddressPickerOpen] = useState(false);
  const [autoFilledFromDefault, setAutoFilledFromDefault] = useState(false);
  const [galleryProduct, setGalleryProduct] = useState<StorefrontProduct | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [warehouseStock, setWarehouseStock] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/inventory/warehouse-stock")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.stock)) {
          setWarehouseStock(data.stock);
        }
      })
      .catch((err) => console.error("Error fetching warehouse stock:", err));
  }, []);


  const normalizeText = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d");

  const promoMeta = useMemo(() => {
    if (!promoFilter || !productsQ.data) return null;
    const hit = productsQ.data.find((p) => p.promoCode === promoFilter);
    const storeHit = storeQ.data?.promotions.find((p) => p.code === promoFilter) ?? null;
    return {
      code: promoFilter,
      name: hit?.promoName ?? storeHit?.name ?? promoFilter,
      endDate: hit?.promoEndsAt ?? storeHit?.endDate ?? null,
    };
  }, [promoFilter, productsQ.data, storeQ.data]);

  const filteredProducts = useMemo(() => {
    if (!productsQ.data) return [];
    let list = productsQ.data;
    if (promoFilter) {
      list = list.filter((p) => p.salePrice != null && p.originalPrice != null && p.originalPrice > p.salePrice);
    }
    if (activeCategory !== "all") {
      list = list.filter((p) => p.categoryId === activeCategory);
    }
    const q = searchQuery.trim();
    if (q.length > 0) {
      const nq = normalizeText(q);
      list = list.filter((p) => {
        const haystack = [
          p.name,
          p.sku,
          p.description ?? "",
          p.categoryName ?? "",
          p.unit,
        ]
          .map(normalizeText)
          .join(" ");
        return haystack.includes(nq);
      });
    }
    if (!promoFilter) {
      list = [...list].sort((a, b) => {
        const ap = a.salePrice != null && a.originalPrice != null && a.originalPrice > a.salePrice ? 1 : 0;
        const bp = b.salePrice != null && b.originalPrice != null && b.originalPrice > b.salePrice ? 1 : 0;
        return bp - ap;
      });
    }
    return list;
  }, [productsQ.data, activeCategory, searchQuery, promoFilter]);

  const clearPromoFilter = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("promo");
    const newPath = url.pathname + (url.search ? url.search : "");
    window.history.replaceState({}, "", newPath);
    setPromoFilter(null);
  };

  const subtotal = useMemo(
    () => cart.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [cart],
  );

  const totalQty = useMemo(
    () => cart.reduce((sum, i) => sum + i.quantity, 0),
    [cart],
  );

  const isCustomerLogged = user?.role === "customer";

  interface SavedAddress {
    id: string;
    label: string;
    recipientName: string;
    recipientPhone: string;
    address: string;
    lat: number | null;
    lng: number | null;
    isDefault: boolean;
  }

  const myAddressesQ = useQuery<SavedAddress[]>({
    queryKey: ["my-addresses"],
    queryFn: async () => {
      const res = await fetch("/api/storefront/my-addresses", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isCustomerLogged,
  });

  const applySavedAddress = (a: SavedAddress) => {
    setDeliveryAddress(a.address);
    if (a.recipientName) setGuestName(a.recipientName);
    if (a.recipientPhone) setGuestPhone(a.recipientPhone);
    if (a.lat != null && a.lng != null) {
      const coords = { lat: a.lat, lng: a.lng };
      setDeliveryCoords(coords);
      void fetchShippingQuote(coords.lat, coords.lng);
    } else {
      setDeliveryCoords(null);
      setShippingQuote(null);
      setShippingError(null);
    }
    setAddressPickerOpen(false);
  };

  useEffect(() => {
    if (
      orderType === "delivery" &&
      isCustomerLogged &&
      !autoFilledFromDefault &&
      !deliveryAddress.trim() &&
      myAddressesQ.data &&
      myAddressesQ.data.length > 0
    ) {
      const def = myAddressesQ.data.find((a) => a.isDefault) ?? myAddressesQ.data[0];
      if (def) {
        applySavedAddress(def);
        setAutoFilledFromDefault(true);
      }
    }
    if (orderType !== "delivery" && autoFilledFromDefault) {
      setAutoFilledFromDefault(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderType, isCustomerLogged, myAddressesQ.data]);

  const storeIdForPromos = storeQ.data?.id ?? "";
  const myPromosQ = useQuery({
    queryKey: ["my-promotions", storeIdForPromos],
    queryFn: () => fetchMyPromotions(storeIdForPromos),
    enabled: isCustomerLogged && !!storeIdForPromos,
  });

  const selectedPromos = useMemo(() => {
    if (!myPromosQ.data) return [] as MyPromotion[];
    const set = new Set(selectedCodes);
    return myPromosQ.data.filter((p) => set.has(p.code));
  }, [myPromosQ.data, selectedCodes]);

  const previewBreakdown = useMemo(() => {
    if (selectedPromos.length === 0) return { items: [] as Array<{ code: string; name: string; amount: number }>, total: 0 };
    let running = 0;
    const items: Array<{ code: string; name: string; amount: number }> = [];
    for (const p of selectedPromos) {
      if (subtotal < p.minOrder) continue;
      const cap = p.maxDiscount ?? Number.POSITIVE_INFINITY;
      const remaining = Math.max(0, subtotal - running);
      let amt = p.type === "percent" ? Math.round((subtotal * p.value) / 100) : p.value;
      amt = Math.min(amt, cap, remaining);
      if (amt <= 0) continue;
      running += amt;
      items.push({ code: p.code, name: p.name, amount: amt });
    }
    return { items, total: running };
  }, [selectedPromos, subtotal]);

  const previewDiscount = previewBreakdown.total;
  const previewShipping = selectedFulfillment
    ? selectedFulfillment.fee
    : (orderType === "delivery" && shippingQuote ? shippingQuote.fee : 0);
  const previewTotal = Math.max(0, subtotal - previewDiscount) + previewShipping;

  const fetchShippingQuote = async (lat: number, lng: number) => {
    setShippingLoading(true);
    setShippingError(null);
    setShippingQuote(null);
    try {
      const res = await fetch(`/api/storefront/quote-shipping/${slug}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng }),
      });
      const data = await res.json();
      if (!res.ok) {
        setShippingError(data?.error ?? t.shopDetail.shippingError);
        return;
      }
      setShippingQuote({ fee: data.shippingFee, distanceKm: data.distanceKm });
    } catch {
      setShippingError(t.shopDetail.shippingError);
    } finally {
      setShippingLoading(false);
    }
  };

  const requestGeolocation = () => {
    if (!navigator.geolocation) {
      setShippingError(t.shopDetail.geolocationUnsupported);
      return;
    }
    setShippingLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setDeliveryCoords(coords);
        void fetchShippingQuote(coords.lat, coords.lng);
      },
      () => {
        setShippingLoading(false);
        setShippingError(t.shopDetail.geolocationDenied);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const togglePromoCode = (code: string) => {
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  const addToCart = (p: StorefrontProduct) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === p.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [
        ...prev,
        { productId: p.id, name: p.name, price: p.price, quantity: 1, unit: p.unit },
      ];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.productId === id ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0),
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== id));
  };

  const updateCartItemNote = (id: string, note: string) => {
    setCart((prev) =>
      prev.map((i) => (i.productId === id ? { ...i, note } : i)),
    );
  };

  const orderMut = useMutation({
    mutationFn: async () => {
      if (fulfillmentOptions.length > 0 && !selectedFulfillment) {
        throw new Error(t.shopDetail.fulfillmentRequired);
      }
      const needsAddress = selectedFulfillment
        ? selectedFulfillment.requiresAddress
        : orderType === "delivery";
      if (needsAddress) {
        if (!deliveryCoords || !deliveryAddress.trim()) {
          throw new Error(t.shopDetail.deliveryAddressRequired);
        }
      }
      const res = await fetch(`/api/storefront/stores/${slug}/orders`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestName,
          guestPhone,
          paymentMethod,
          requestVatInvoice: requestVat || undefined,
          promotionCodes: selectedCodes.length > 0 ? selectedCodes : undefined,
          note: note || undefined,
          pickupAt: pickupAt ? new Date(pickupAt).toISOString() : undefined,
          orderType: needsAddress ? "delivery" : undefined,
          deliveryOptionId: selectedFulfillment?.id ?? undefined,
          deliveryAddress: needsAddress ? deliveryAddress.trim() : undefined,
          deliveryLat: needsAddress ? deliveryCoords?.lat : undefined,
          deliveryLng: needsAddress ? deliveryCoords?.lng : undefined,
          items: cart.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            note: i.note?.trim() ? i.note.trim() : undefined,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Đặt hàng thất bại");
      return data as OrderResult;
    },
    onSuccess: (result) => {
      setOrderResult(result);
      setCart([]);
      setSelectedCodes([]);
      setNote("");
      setRatingSubmitted(false);
      setRatingValue(5);
      setRatingComment("");
      myPromosQ.refetch();
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: t.common.error,
        description: err instanceof Error ? err.message : String(err),
      });
    },
  });

  const ratingMut = useMutation({
    mutationFn: async () => {
      if (!orderResult?.id) throw new Error("Không tìm thấy đơn hàng");
      const res = await fetch(`/api/storefront/stores/${slug}/ratings`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: orderResult.id,
          rating: ratingValue,
          comment: ratingComment.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Không gửi được đánh giá");
      }
    },
    onSuccess: () => {
      setRatingSubmitted(true);
      toast({ title: t.shopDetail.rateSubmitted });
    },
    onError: (err) => {
      toast({ variant: "destructive", title: t.common.error, description: (err as Error).message });
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      toast({ variant: "destructive", title: t.shopDetail.emptyCart });
      return;
    }
    const isCustomer = user?.role === "customer";
    if (!isCustomer && (!guestName.trim() || !guestPhone.trim())) {
      toast({ variant: "destructive", title: `${t.shopDetail.yourName} / ${t.shopDetail.yourPhone}` });
      return;
    }
    if (!isCustomer && selectedCodes.length > 0) {
      toast({ variant: "destructive", title: t.shopDetail.loginForPromos });
      return;
    }
    if (fulfillmentOptions.length > 0 && !selectedFulfillment) {
      setFulfillmentTouched(true);
      toast({ variant: "destructive", title: t.shopDetail.fulfillmentRequired });
      return;
    }
    setMobileCartOpen(false);
    orderMut.mutate();
  };

  if (storeQ.isLoading || productsQ.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        {t.common.loading}
      </div>
    );
  }

  if (storeQ.error || !storeQ.data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <p className="text-destructive">{t.common.notFound}</p>
        <Link href="/">
          <Button variant="outline">{t.shopDetail.backToShops}</Button>
        </Link>
      </div>
    );
  }

  const store = storeQ.data;

  const tempClosure = (() => {
    if (!store.tempClosureStart || !store.tempClosureEnd) return null;
    const start = new Date(store.tempClosureStart);
    const end = new Date(store.tempClosureEnd);
    const now = new Date();
    if (now < start || now > end) return null;
    return { start, end, reason: store.tempClosureReason };
  })();

  if (tempClosure) {
    const fmt = (d: Date) =>
      d.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-rose-950/30">
        <GuestNav />
        <div className="container mx-auto px-4 py-10 sm:py-16 flex flex-col items-center text-center max-w-xl">
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-full bg-amber-300/40 blur-2xl animate-pulse" />
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-xl">
              <Coffee className="w-14 h-14 sm:w-16 sm:h-16 text-white" strokeWidth={1.6} />
            </div>
            <div className="absolute -top-1 -right-1 w-9 h-9 rounded-full bg-white dark:bg-card shadow-md flex items-center justify-center border-2 border-amber-200">
              <span className="text-lg" role="img" aria-label="zzz">💤</span>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            {t.shopDetail.tempClosed}
          </h1>
          <p className="text-muted-foreground mb-6 text-base sm:text-lg">
            <span className="font-semibold text-foreground">{store.name}</span>
          </p>
          <div className="w-full bg-white/80 dark:bg-card/80 backdrop-blur rounded-2xl border border-amber-200/60 dark:border-amber-900/40 shadow-lg p-5 sm:p-6 space-y-4 text-left">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t.shopDetail.tempClosed}</div>
                <div className="text-sm font-medium text-foreground mt-0.5">
                  {`${t.stores.tempClosureStart}: ${fmt(tempClosure.start)}`}
                </div>
                <div className="text-sm font-medium text-foreground">
                  {`${t.stores.tempClosureEnd}: ${fmt(tempClosure.end)}`}
                </div>
              </div>
            </div>
            {tempClosure.reason && tempClosure.reason.trim() && (
              <div className="flex items-start gap-3 border-t border-amber-100 dark:border-amber-900/40 pt-4">
                <Sparkles className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t.shopDetail.tempClosureReason}</div>
                  <div className="text-sm text-foreground mt-1 whitespace-pre-wrap leading-relaxed">
                    {tempClosure.reason}
                  </div>
                </div>
              </div>
            )}
            {store.phone && (
              <div className="flex items-start gap-3 border-t border-amber-100 dark:border-amber-900/40 pt-4">
                <Phone className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t.stores.phone}</div>
                  <a href={`tel:${store.phone}`} className="text-sm font-medium text-primary hover:underline mt-0.5 inline-block">
                    {store.phone}
                  </a>
                </div>
              </div>
            )}
          </div>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Link href="/" className="w-full sm:w-auto">
              <Button size="lg" className="w-full hover-elevate shadow-md" data-testid="button-temp-closed-home">
                <ArrowLeft className="w-4 h-4 mr-2" /> {t.common.backToHome}
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => storeQ.refetch()}
              data-testid="button-temp-closed-refresh"
            >
              {t.common.refresh}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-6">
            {t.common.brandFooter}
          </p>
        </div>
      </div>
    );
  }

  const renderCartPanel = (idPrefix: string) => (
    <div className="space-y-4">
      <div className="space-y-2 max-h-[40vh] lg:max-h-64 overflow-y-auto" data-testid={`list-cart-${idPrefix}`}>
        {cart.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            {t.shopDetail.emptyCart}
          </p>
        )}
        {cart.map((i) => (
          <div
            key={i.productId}
            className="bg-background border border-border p-3 rounded-lg shadow-sm"
            data-testid={`cart-item-${i.productId}`}
          >
            <div className="flex justify-between items-start mb-2 gap-2">
              <div className="font-medium text-sm flex-1 min-w-0">
                <p className="line-clamp-2 break-words" title={i.name}>{i.name}</p>
                <p className="text-[11px] text-muted-foreground font-normal">
                  {formatCurrency(i.price)} / {i.unit}
                </p>
              </div>
              <div className="font-bold text-sm shrink-0">
                {formatCurrency(i.price * i.quantity)}
              </div>
            </div>
            <div className="flex justify-between items-center gap-2">
              <Input
                placeholder={t.pos.notePlaceholder}
                value={i.note ?? ""}
                onChange={(e) => updateCartItemNote(i.productId, e.target.value)}
                className="h-7 text-xs flex-1 min-w-0"
                data-testid={`cart-item-note-${i.productId}`}
              />
              <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5 shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 rounded-sm"
                  onClick={() =>
                    i.quantity === 1
                      ? removeFromCart(i.productId)
                      : updateQty(i.productId, -1)
                  }
                  data-testid={`cart-item-dec-${i.productId}`}
                >
                  {i.quantity === 1 ? (
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  ) : (
                    <Minus className="h-3.5 w-3.5" />
                  )}
                </Button>
                <span className="w-6 text-center font-medium text-sm tabular-nums">
                  {i.quantity}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 rounded-sm"
                  onClick={() => updateQty(i.productId, 1)}
                  data-testid={`cart-item-inc-${i.productId}`}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {store.promotions.length > 0 && (
        <div className="relative overflow-hidden rounded-xl border-2 border-amber-300/70 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-3 shadow-sm dark:border-amber-500/40 dark:from-amber-950/40 dark:via-orange-950/40 dark:to-rose-950/40">
          <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-amber-300/30 blur-2xl" />
          <div className="absolute -bottom-6 -left-6 h-16 w-16 rounded-full bg-rose-300/30 blur-2xl" />
          <button
            type="button"
            onClick={() => setPromosOpen((v) => !v)}
            aria-expanded={promosOpen}
            className="relative flex items-center gap-1.5 w-full"
            data-testid="button-toggle-active-promos"
          >
            <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <p className="text-sm font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wide">
              {t.shopDetail.promotionAvailable}
            </p>
            <Badge className="ml-auto bg-amber-500 hover:bg-amber-500 text-white text-[10px] px-1.5 py-0 h-4">
              {store.promotions.length}
            </Badge>
            <ChevronDown
              className={`h-4 w-4 text-amber-700 dark:text-amber-300 transition-transform ${promosOpen ? "rotate-180" : ""}`}
            />
          </button>
          <div className={`relative space-y-1.5 overflow-hidden transition-all ${promosOpen ? "mt-2 max-h-[2000px] opacity-100" : "max-h-0 opacity-0"}`}>
            {store.promotions.map((p) => {
              const valueLabel =
                p.type === "percent"
                  ? `−${p.value}%`
                  : `−${formatCurrency(p.value)}`;
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-2 rounded-lg bg-white/80 dark:bg-slate-900/60 px-2.5 py-1.5 backdrop-blur-sm ring-1 ring-amber-200/60 dark:ring-amber-700/40"
                  data-testid={`active-promo-${p.code}`}
                >
                  <div className="flex-shrink-0 inline-flex items-center justify-center min-w-[52px] px-2 py-1 rounded-md bg-gradient-to-br from-rose-500 to-orange-500 text-white text-xs font-extrabold shadow-sm">
                    {valueLabel}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-200/70 dark:bg-amber-800/60 px-1.5 py-0.5 rounded">
                        {p.code}
                      </span>
                      <span className="text-xs font-medium text-foreground/90 truncate">
                        {p.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      {p.minOrder > 0 && (
                        <p className="text-[11px] text-muted-foreground">
                          {`${t.pos.minOrderRequired} ${formatCurrency(p.minOrder)}`}
                        </p>
                      )}
                      <PromoCountdown endDate={p.endDate} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3" data-testid={`form-checkout-${idPrefix}`}>
        {isCustomerLogged ? (
          <div className="space-y-1">
            <Label className="text-xs">{t.account.promotions}</Label>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-between"
              onClick={() => setPromoPickerOpen(true)}
              data-testid={`button-open-promo-picker-${idPrefix}`}
            >
              <span className="flex items-center gap-1">
                <Tag className="h-3.5 w-3.5" />
                {selectedCodes.length === 0
                  ? t.shopDetail.selectPromo
                  : `${t.pos.selectedPromos} ${selectedCodes.length} ${t.pos.codes}`}
              </span>
              <Plus className="h-4 w-4" />
            </Button>
            {selectedCodes.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {selectedCodes.map((c) => (
                  <Badge
                    key={c}
                    variant="secondary"
                    className="font-mono gap-1 pr-1"
                    data-testid={`chip-promo-${c}`}
                  >
                    {c}
                    <button
                      type="button"
                      onClick={() => togglePromoCode(c)}
                      className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                      aria-label={`${t.common.delete} ${c}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-md border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
            <p className="flex items-center gap-1">
              <Tag className="h-3 w-3" />
              {t.shopDetail.loginForPromos}
            </p>
            <Link href={`/login?next=${encodeURIComponent(`/shop/${slug}`)}`} className="text-primary underline">
              {t.login.loginButton}
            </Link>
          </div>
        )}
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}guest-name`} className="text-xs">{t.shopDetail.yourName}</Label>
          <Input id={`${idPrefix}guest-name`} value={guestName} onChange={(e) => setGuestName(e.target.value)} required data-testid={`input-guest-name-${idPrefix}`} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}guest-phone`} className="text-xs">{t.shopDetail.yourPhone}</Label>
          <Input
            id={`${idPrefix}guest-phone`}
            value={guestPhone}
            onChange={(e) => setGuestPhone(e.target.value)}
            placeholder="0901234567"
            required
            data-testid={`input-guest-phone-${idPrefix}`}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">
            {t.shopDetail.fulfillmentType} <span className="text-destructive">*</span>
          </Label>
          <Button
            type="button"
            variant="outline"
            className={`w-full h-9 justify-between ${
              !selectedFulfillment && fulfillmentTouched
                ? "border-destructive text-destructive ring-1 ring-destructive/50"
                : ""
            }`}
            onClick={() => setFulfillmentPickerOpen(true)}
            data-testid={`button-pick-fulfillment-${idPrefix}`}
          >
            <span className="truncate">
              {selectedFulfillment
                ? selectedFulfillment.label
                : t.shopDetail.pickFulfillment}
            </span>
            <span className="text-xs text-muted-foreground ml-2 shrink-0">
              {selectedFulfillment
                ? (selectedFulfillment.fee > 0
                    ? formatCurrency(selectedFulfillment.fee)
                    : t.shopDetail.fulfillmentFree)
                : t.shopDetail.changeFulfillment}
            </span>
          </Button>
          {!selectedFulfillment && fulfillmentTouched && (
            <p className="text-xs text-destructive" data-testid={`text-fulfillment-required-${idPrefix}`}>
              {t.shopDetail.fulfillmentRequired}
            </p>
          )}
        </div>
        {selectedFulfillment?.requiresAddress && (
          <div className="space-y-2 rounded-md border bg-muted/30 p-2">
            {isCustomerLogged && (myAddressesQ.data?.length ?? 0) > 0 && (
              <Button
                type="button"
                variant="secondary"
                className="w-full h-9"
                onClick={() => setAddressPickerOpen(true)}
                data-testid={`button-pick-address-${idPrefix}`}
              >
                <MapPin className="h-4 w-4 mr-1" />
                {t.account.pickFromSaved} ({myAddressesQ.data?.length ?? 0})
              </Button>
            )}
            <div className="space-y-1">
              <Label htmlFor={`${idPrefix}delivery-address`} className="text-xs">{t.shopDetail.deliveryAddress}</Label>
              <Input
                id={`${idPrefix}delivery-address`}
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder={t.shopDetail.deliveryAddressPlaceholder}
                data-testid={`input-delivery-address-${idPrefix}`}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full h-9"
              onClick={requestGeolocation}
              disabled={shippingLoading}
              data-testid={`button-geolocate-${idPrefix}`}
            >
              {shippingLoading ? t.shopDetail.geolocating : t.shopDetail.useMyLocation}
            </Button>
            {shippingError && (
              <p className="text-xs text-destructive" data-testid={`text-shipping-error-${idPrefix}`}>{shippingError}</p>
            )}
            {shippingQuote && (
              <div className="text-xs text-muted-foreground" data-testid={`text-shipping-quote-${idPrefix}`}>
                <div>{t.shopDetail.distance}: <span className="font-semibold">{shippingQuote.distanceKm} km</span></div>
                <div>{t.shopDetail.shippingFee}: <span className="font-semibold text-foreground">{formatCurrency(shippingQuote.fee)}</span></div>
              </div>
            )}
          </div>
        )}
        <div className="space-y-1">
          <Label className="text-xs">{t.shopDetail.paymentMethod}</Label>
          <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)}>
            <SelectTrigger data-testid={`select-payment-${idPrefix}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cod">{t.shopDetail.cod}</SelectItem>
              <SelectItem value="cash">{t.shopDetail.cashAtStore}</SelectItem>
              <SelectItem value="qr">{t.shopDetail.qrTransfer}</SelectItem>
              <SelectItem value="ewallet">{t.shopDetail.eWallet}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-border accent-primary"
            checked={requestVat}
            onChange={(e) => setRequestVat(e.target.checked)}
            data-testid={`checkbox-request-vat-${idPrefix}`}
          />
          <span>{t.pos.requestVatInvoice}</span>
        </label>
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}pickup-at`} className="text-xs">{t.shopDetail.pickupTime}</Label>
          <Input
            id={`${idPrefix}pickup-at`}
            type="datetime-local"
            value={pickupAt}
            onChange={(e) => setPickupAt(e.target.value)}
            min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
              .toISOString()
              .slice(0, 16)}
            data-testid={`input-pickup-at-${idPrefix}`}
          />
          <p className="text-[11px] text-muted-foreground">
            {t.shopDetail.pickupTime}
          </p>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}note`} className="text-xs">{t.pos.note}</Label>
          <Textarea
            id={`${idPrefix}note`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder={t.pos.notePlaceholder}
            data-testid={`input-note-${idPrefix}`}
          />
        </div>

        <div className="border-t pt-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t.common.subtotal}</span>
            <span data-testid={`text-subtotal-${idPrefix}`}>{formatCurrency(subtotal)}</span>
          </div>
          {previewBreakdown.items.map((it) => (
            <div key={it.code} className="flex justify-between text-green-600 text-xs" data-testid={`preview-promo-${it.code}-${idPrefix}`}>
              <span className="truncate" title={it.name}>
                <span className="font-mono font-semibold">{it.code}</span>
              </span>
              <span>-{formatCurrency(it.amount)}</span>
            </div>
          ))}
          {previewDiscount > 0 && (
            <div className="flex justify-between text-green-700 font-semibold border-t border-green-200 pt-1">
              <span>{t.common.totalDiscount}</span>
              <span>-{formatCurrency(previewDiscount)}</span>
            </div>
          )}
          {previewShipping > 0 && (
            <div className="flex justify-between text-orange-600">
              <span>{t.shopDetail.shippingFee}</span>
              <span data-testid={`text-shipping-${idPrefix}`}>+{formatCurrency(previewShipping)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-base pt-1">
            <span>{t.common.total}</span>
            <span data-testid={`text-total-${idPrefix}`}>{formatCurrency(previewTotal)}</span>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full h-12 text-base"
          disabled={(() => {
            if (orderMut.isPending || cart.length === 0) return true;
            if (fulfillmentOptions.length > 0 && !selectedFulfillment) return true;
            const needsAddress = selectedFulfillment
              ? selectedFulfillment.requiresAddress
              : orderType === "delivery";
            if (needsAddress) {
              if (!deliveryAddress.trim() || !deliveryCoords || shippingLoading) return true;
              if (!selectedFulfillment && !shippingQuote) return true;
            }
            return false;
          })()}
          data-testid={`button-place-order-${idPrefix}`}
        >
          {orderMut.isPending ? t.shopDetail.placingOrder : t.shopDetail.placeOrder}
        </Button>
      </form>
    </div>
  );

  if (orderResult) {
    const isCustomer = user?.role === "customer";
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center p-6">
        <Card className="max-w-md w-full" data-testid="card-order-success">
          <CardHeader className="text-center">
            <div className="mx-auto bg-green-500 text-white p-3 rounded-full w-fit">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <CardTitle className="mt-3">{t.shopDetail.orderSuccess}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.shopDetail.orderCode}</span>
              <span className="font-mono font-semibold" data-testid="text-order-code">{orderResult.code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.shopDetail.storeName}</span>
              <span>{orderResult.storeName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.common.subtotal}</span>
              <span>{formatCurrency(orderResult.subtotal)}</span>
            </div>
            {orderResult.promotions && orderResult.promotions.length > 0 && (
              <>
                {orderResult.promotions.map((p) => (
                  <div key={p.promotionId} className="flex justify-between text-green-600 text-xs" data-testid={`success-promo-${p.code}`}>
                    <span className="truncate" title={p.name}>
                      <span className="font-mono font-semibold">{p.code}</span> · {p.name}
                    </span>
                    <span>-{formatCurrency(p.discountAmount)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-green-700 font-semibold border-t border-green-200 pt-1">
                  <span>{t.common.totalDiscount}</span>
                  <span>-{formatCurrency(orderResult.discount)}</span>
                </div>
              </>
            )}
            {orderResult.discount > 0 && (!orderResult.promotions || orderResult.promotions.length === 0) && (
              <div className="flex justify-between text-green-600">
                <span>{t.common.discount}</span>
                <span>-{formatCurrency(orderResult.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-semibold border-t pt-2">
              <span>{t.common.total}</span>
              <span>{formatCurrency(orderResult.total)}</span>
            </div>

            {orderResult.pickupAt && (
              <div className="flex justify-between" data-testid="text-pickup-at">
                <span className="text-muted-foreground">{t.shopDetail.pickupTime}</span>
                <span>
                  {new Date(orderResult.pickupAt).toLocaleString("vi-VN", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </span>
              </div>
            )}

            <div className="flex justify-between" data-testid="text-payment-status">
              <span className="text-muted-foreground">{t.orders.payment}</span>
              <span className={orderResult.paid ? "text-emerald-600 font-medium" : "text-amber-600 font-medium"}>
                {orderResult.paid ? t.pos.paid : t.pos.unpaid}
              </span>
            </div>

            <div className="border-t pt-3 flex flex-col items-center gap-2" data-testid="section-qr">
              <p className="font-medium text-center">
                {orderResult.paid ? t.shopDetail.orderCode : t.shopDetail.scanQrToPay}
              </p>
              <div className="bg-white p-3 rounded-md border">
                <QRCodeSVG
                  value={orderResult.qrPayload}
                  size={180}
                  level="M"
                  data-testid="qr-code"
                />
              </div>
              <p className="text-[11px] text-muted-foreground text-center break-all max-w-[220px]">
                {orderResult.qrPayload}
              </p>
              <p className="text-xs text-muted-foreground text-center">
                {orderResult.paid
                  ? t.shopDetail.orderCode
                  : t.shopDetail.scanQrToPay}
              </p>
            </div>

            <p className="text-center text-muted-foreground pt-3">
              {t.shopDetail.orderSuccess}
            </p>

            {isCustomer ? (
              ratingSubmitted ? (
                <div className="border-t pt-3 text-center text-sm text-emerald-600 flex items-center justify-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> {t.shopDetail.rateSubmitted}
                </div>
              ) : (
                <div className="border-t pt-3 space-y-2" data-testid="section-rating">
                  <p className="font-medium text-center">{t.shopDetail.rateStore}</p>
                  <div className="flex justify-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setRatingValue(n)}
                        className="p-1"
                        data-testid={`rating-star-${n}`}
                      >
                        <Star
                          className={`h-7 w-7 ${
                            n <= ratingValue
                              ? "fill-amber-500 text-amber-500"
                              : "text-muted-foreground"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <Textarea
                    placeholder={t.shopDetail.ratingComment}
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                    rows={2}
                    data-testid="input-rating-comment"
                  />
                  <Button
                    className="w-full"
                    disabled={ratingMut.isPending}
                    onClick={() => ratingMut.mutate()}
                    data-testid="button-submit-rating"
                  >
                    {ratingMut.isPending ? t.shopDetail.submittingRating : t.shopDetail.submitRating}
                  </Button>
                </div>
              )
            ) : (
              <div className="border-t pt-3 text-center text-xs text-muted-foreground">
                <Link href="/register-customer" className="text-primary hover:underline">
                  {t.registerCustomer.title}
                </Link>
              </div>
            )}

            <div className="flex gap-2 pt-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setOrderResult(null)}
                data-testid="button-order-more"
              >
                {t.publicTable.orderAnother}
              </Button>
              <Button className="flex-1" onClick={() => navigate("/")} data-testid="button-back-to-shops">
                {t.shopDetail.backToShops}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20" data-testid="page-shop-detail">
      <header className="bg-primary text-primary-foreground">
        <div className="max-w-6xl mx-auto px-3 py-3 lg:px-6 lg:py-6">
          <div className="flex items-center justify-between gap-3 mb-2 lg:mb-3">
            <Link href="/" className="inline-flex items-center gap-1.5 text-primary-foreground/80 hover:text-primary-foreground text-xs lg:text-sm min-w-0">
              <ArrowLeft className="h-4 w-4 shrink-0" />
              <span className="truncate">{t.shopDetail.backToShops}</span>
            </Link>
            <GuestNav />
          </div>
          <div className="flex items-start justify-between flex-wrap gap-3 lg:gap-4">
            <div className="min-w-0 flex-1">
              <Link href="/" className="hidden lg:inline-flex items-center gap-2 mb-1 hover-elevate rounded-md px-2 py-1 -ml-2">
                <Coffee className="h-5 w-5" />
                <span className="text-sm">VComm Store Retail</span>
              </Link>
              <h1 className="text-xl lg:text-3xl font-bold leading-tight" data-testid="text-store-name">{store.name}</h1>
              {store.description && (
                <p className="text-xs lg:text-base text-primary-foreground/80 mt-1 max-w-xl line-clamp-2 lg:line-clamp-none">
                  {store.description}
                </p>
              )}
            </div>
            <div className="text-xs lg:text-sm space-y-1 w-full lg:w-auto">
              {store.address && (
                <div className="flex items-start gap-2"><MapPin className="h-4 w-4 shrink-0 mt-0.5" /><span className="line-clamp-2">{store.address}</span></div>
              )}
              {store.phone && (
                <div className="hidden lg:flex items-center gap-2"><Phone className="h-4 w-4" />{store.phone}</div>
              )}
              {store.openHours && (
                <div className="hidden lg:flex items-center gap-2"><Clock className="h-4 w-4" />{store.openHours}</div>
              )}
              <div className="pt-1">
                <DirectionsButton
                  latitude={store.latitude}
                  longitude={store.longitude}
                  address={store.address}
                  storeName={store.name}
                  variant="secondary"
                  testId="button-shop-directions"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 lg:px-6 py-4 lg:py-6 pb-28 lg:pb-6 grid lg:grid-cols-[1fr_380px] gap-6">
        <section>
          <div className="relative mb-3">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.shopDetail.searchPlaceholder}
              className="pl-9 pr-9"
              data-testid="input-shop-search"
              aria-label={t.common.search}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted"
                data-testid="button-clear-shop-search"
                aria-label={t.common.clearSearch}
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {promoMeta && (
            <div
              className="relative mb-3 flex items-center gap-3 rounded-md border-2 border-red-500/60 bg-red-500/10 px-3 pt-3 pb-9 overflow-hidden"
              data-testid="banner-promo-filter"
            >
              <img src={promoBadge} alt="" className="w-10 h-auto shrink-0 drop-shadow" />
              <div className="flex-1 min-w-0">
                <div className="text-xs uppercase tracking-wide text-red-700 dark:text-red-300 font-bold">
                  {t.productPromoGroups.badge}
                </div>
                <div className="font-semibold truncate" data-testid="text-promo-name">{promoMeta.name}</div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={clearPromoFilter}
                data-testid="button-clear-promo-filter"
                className="relative z-20"
              >
                <X className="w-4 h-4 mr-1" /> {t.productPromoGroups.viewAll}
              </Button>
              <PromoCountdown endDate={promoMeta.endDate} variant="overlay" />
            </div>
          )}

          <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-4">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="all" data-testid="tab-cat-all">{t.shopDetail.allCategories}</TabsTrigger>
              {store.categories.map((c) => (
                <TabsTrigger key={c.id} value={c.id} data-testid={`tab-cat-${c.id}`}>
                  {c.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {searchQuery.trim().length > 0 && (
            <p
              className="text-xs text-muted-foreground mb-2"
              data-testid="text-shop-search-summary"
            >
              {filteredProducts.length === 0
                ? `${t.pos.noProductsFound}: "${searchQuery.trim()}"`
                : `${t.common.showing} ${filteredProducts.length} ${t.common.products}: "${searchQuery.trim()}"`}
            </p>
          )}

          {filteredProducts.length === 0 && searchQuery.trim().length === 0 && (
            <p className="text-center text-muted-foreground py-12">{t.shopDetail.noProducts}</p>
          )}
          <div className="grid sm:grid-cols-2 gap-3" data-testid="grid-products">
            {filteredProducts.map((p) => {
              const inCart = cart.find((i) => i.productId === p.id);
              const qty = inCart?.quantity ?? 0;
              return (
                <Card
                  key={p.id}
                  className={`hover-elevate relative ${!p.inStock ? "opacity-60" : "cursor-pointer"} ${qty > 0 ? "ring-2 ring-primary" : ""}`}
                  onClick={() => {
                    setGalleryIndex(0);
                    setGalleryProduct(p);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setGalleryIndex(0);
                      setGalleryProduct(p);
                    }
                  }}
                  data-testid={`card-product-${p.id}`}
                >
                  <CardContent className="p-4 flex gap-3">
                    <div
                      className="relative w-16 h-16 rounded-md bg-muted flex items-center justify-center shrink-0 overflow-hidden"
                      data-testid={`product-image-${p.id}`}
                    >
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <Coffee className="h-7 w-7 text-muted-foreground" />
                      )}
                      {p.images && p.images.length > 1 && (
                        <span className="absolute bottom-0 right-0 bg-black/70 text-white text-[10px] px-1 rounded-tl">
                          +{p.images.length - 1}
                        </span>
                      )}
                      {qty > 0 && (
                        <span
                          className="absolute top-0 left-0 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-br rounded-tl bg-primary text-primary-foreground text-[11px] font-bold"
                          data-testid={`card-product-qty-badge-${p.id}`}
                        >
                          {qty}
                        </span>
                      )}
                    </div>
                    {p.salePrice != null && p.originalPrice != null && p.originalPrice > p.salePrice && (
                      <img
                        src={promoBadge}
                        alt={t.productPromoGroups.badge}
                        className="absolute -top-2 -right-2 w-20 h-auto pointer-events-none drop-shadow-md rotate-12 z-10"
                        data-testid={`promo-badge-${p.id}`}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p
                        className="font-medium leading-snug line-clamp-2 break-words"
                        title={p.name}
                        data-testid={`product-name-${p.id}`}
                      >
                        {p.name}
                      </p>
                      {p.categoryName && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {p.categoryName}
                        </p>
                      )}
                      {/* Warehouse Stock Display */}
                      {(() => {
                        const productStockList = warehouseStock.filter((s: any) => s.product_id === p.id || s.product_name === p.name);
                        if (productStockList.length > 0) {
                          return (
                            <div className="text-[10px] text-muted-foreground mt-1 flex flex-wrap gap-1">
                              {productStockList.map((s: any) => (
                                <span key={s.id} className="bg-muted/80 border px-1 py-0.5 rounded text-[9px] font-semibold text-primary/80">
                                  {s.store_id === "ST-01" ? "Kho Q1" : s.store_id === "ST-02" ? "Kho Cầu Giấy" : `Kho ${s.store_id}`}: {s.quantity} {p.unit || 'cái'}
                                </span>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      })()}
                      <div className="flex items-center justify-between mt-2 gap-2">
                        <div className="flex flex-col">
                          <span className="font-semibold text-primary">{formatCurrency(p.price)}</span>
                          {p.salePrice != null && p.originalPrice != null && p.originalPrice > p.salePrice && (
                            <span className="text-xs text-muted-foreground line-through">
                              {formatCurrency(p.originalPrice)}
                            </span>
                          )}
                        </div>
                        {qty > 0 ? (
                          <div
                            className="flex items-center gap-1 bg-background border rounded-full shadow-sm"
                            onClick={(e) => e.stopPropagation()}
                            data-testid={`card-product-stepper-${p.id}`}
                          >
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 rounded-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateQty(p.id, -1);
                              }}
                              data-testid={`card-product-dec-${p.id}`}
                              aria-label={t.pos.decrease}
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </Button>
                            <span className="min-w-5 text-center text-sm font-semibold tabular-nums">
                              {qty}
                            </span>
                            <Button
                              type="button"
                              size="icon"
                              variant="default"
                              className="h-7 w-7 rounded-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart(p);
                              }}
                              data-testid={`card-product-inc-${p.id}`}
                              aria-label={t.pos.increase}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            size="icon"
                            disabled={!p.inStock}
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(p);
                            }}
                            className="h-8 w-8 rounded-full shrink-0"
                            aria-label={t.shopDetail.addToCart}
                            data-testid={`button-add-${p.id}`}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <aside className="hidden lg:block lg:sticky lg:top-4 lg:self-start">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                {t.shopDetail.cart} ({totalQty})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderCartPanel("d-")}
            </CardContent>
          </Card>
        </aside>
      </main>

      <MobileCartBar
        itemCount={totalQty}
        subtotal={subtotal}
        onClick={() => setMobileCartOpen(true)}
        ctaLabel={t.pos.checkout}
        testId="shop-mobile-cart-bar"
      />

      <Sheet open={mobileCartOpen} onOpenChange={setMobileCartOpen}>
        <SheetContent
          side="bottom"
          className="h-[92vh] flex flex-col p-0 lg:hidden"
          data-testid="sheet-mobile-cart-shop"
        >
          <SheetHeader className="px-4 py-3 border-b">
            <SheetTitle className="flex items-center gap-2 text-base">
              <ShoppingBag className="h-5 w-5" /> {t.shopDetail.cart} ({totalQty})
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {renderCartPanel("m-")}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={fulfillmentPickerOpen} onOpenChange={setFulfillmentPickerOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto" data-testid="dialog-fulfillment-picker">
          <DialogHeader>
            <DialogTitle>{t.shopDetail.pickFulfillment}</DialogTitle>
            <DialogDescription>{t.shopDetail.pickFulfillmentHint}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {fulfillmentOptions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                {t.shopDetail.fulfillmentNoOptions}
              </p>
            )}
            {fulfillmentOptions.map((opt) => {
              const active = opt.id === deliveryOptionId;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setDeliveryOptionId(opt.id);
                    setOrderType(opt.requiresAddress ? "delivery" : "pickup");
                    if (!opt.requiresAddress) {
                      setShippingError(null);
                    }
                    setFulfillmentPickerOpen(false);
                  }}
                  className={`w-full text-left rounded-md border p-3 transition-colors ${
                    active
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/40"
                  }`}
                  data-testid={`button-fulfillment-option-${opt.id}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-sm">{opt.label}</div>
                    <div className="text-sm font-semibold">
                      {opt.fee > 0 ? formatCurrency(opt.fee) : t.shopDetail.fulfillmentFree}
                    </div>
                  </div>
                  {opt.description && (
                    <div className="text-xs text-muted-foreground mt-1">{opt.description}</div>
                  )}
                </button>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFulfillmentPickerOpen(false)}>
              {t.common.cancel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={promoPickerOpen} onOpenChange={setPromoPickerOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto" data-testid="dialog-promo-picker">
          <DialogHeader>
            <DialogTitle>{t.pos.selectPromoTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {myPromosQ.isLoading && (
              <p className="text-sm text-muted-foreground py-4 text-center">{t.common.loading}</p>
            )}
            {!myPromosQ.isLoading && (myPromosQ.data?.length ?? 0) === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {t.shopDetail.noPromos}
              </p>
            )}
            {(myPromosQ.data ?? []).map((p) => {
              const checked = selectedCodes.includes(p.code);
              const meetsMin = subtotal >= p.minOrder;
              const disabled = p.isUsed || !meetsMin;
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={disabled && !checked}
                  onClick={() => togglePromoCode(p.code)}
                  className={`w-full text-left rounded-lg border p-3 transition-colors ${
                    checked
                      ? "border-primary bg-primary/5"
                      : disabled
                        ? "border-dashed opacity-60 cursor-not-allowed"
                        : "hover:border-primary/40 hover:bg-muted/30"
                  }`}
                  data-testid={`picker-promo-${p.code}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono font-bold">
                          {p.code}
                        </Badge>
                        {p.isUsed && (
                          <Badge variant="secondary" className="text-xs">{t.promotions.usageCount}</Badge>
                        )}
                        {!p.isUsed && !meetsMin && (
                          <Badge variant="secondary" className="text-xs">
                            {t.pos.minOrderRequired} {formatCurrency(p.minOrder)}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium mt-1 truncate">{p.name}</p>
                      <p className="text-xs text-primary mt-0.5 font-semibold">
                        {p.type === "percent"
                          ? `${t.pos.percentOff} ${p.value}%${p.maxDiscount ? ` (${t.pos.maxDiscount} ${formatCurrency(p.maxDiscount)})` : ""}`
                          : `${t.pos.percentOff} ${formatCurrency(p.value)}`}
                      </p>
                      {p.requiresCode && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t.pos.requiresCode} <span className="font-mono">{p.requiresCode}</span>
                        </p>
                      )}
                    </div>
                    <div
                      className={`mt-1 w-5 h-5 rounded border flex items-center justify-center ${
                        checked ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40"
                      }`}
                    >
                      {checked && <CheckCircle2 className="w-4 h-4" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={() => setPromoPickerOpen(false)} data-testid="button-close-promo-picker">
              {t.pos.done} ({selectedCodes.length})
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={addressPickerOpen} onOpenChange={setAddressPickerOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto" data-testid="dialog-address-picker">
          <DialogHeader>
            <DialogTitle>{t.account.pickAddressTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {(myAddressesQ.data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {t.account.noSavedAddressesPick}
              </p>
            )}
            {(myAddressesQ.data ?? []).map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => applySavedAddress(a)}
                className="w-full text-left rounded-md border p-3 hover-elevate space-y-1"
                data-testid={`address-option-${a.id}`}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  {a.label && <span className="font-semibold text-sm">{a.label}</span>}
                  {a.isDefault && (
                    <Badge variant="default" className="text-[10px]">
                      {t.account.defaultBadge}
                    </Badge>
                  )}
                  {a.lat == null && (
                    <Badge variant="outline" className="text-[10px]">
                      {t.shopDetail.useMyLocation}
                    </Badge>
                  )}
                </div>
                <div className="text-sm">{a.address}</div>
                {(a.recipientName || a.recipientPhone) && (
                  <div className="text-xs text-muted-foreground">
                    {a.recipientName}
                    {a.recipientName && a.recipientPhone ? " — " : ""}
                    {a.recipientPhone}
                  </div>
                )}
              </button>
            ))}
          </div>
          <div className="flex justify-between gap-2 pt-2">
            <Link href="/account">
              <Button variant="outline" size="sm" data-testid="button-go-manage-addresses">
                <MapPin className="h-4 w-4 mr-1" /> {t.account.addressesTitle}
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={() => setAddressPickerOpen(false)}>
              {t.account.cancel}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ProductDetailDialog
        product={galleryProduct}
        open={!!galleryProduct}
        onOpenChange={(open) => {
          if (!open) {
            setGalleryProduct(null);
            setGalleryIndex(0);
          }
        }}
        quantityInCart={
          galleryProduct
            ? (cart.find((i) => i.productId === galleryProduct.id)?.quantity ?? 0)
            : 0
        }
        onAddToCart={
          galleryProduct && galleryProduct.inStock
            ? () => addToCart(galleryProduct)
            : undefined
        }
        onDecrement={
          galleryProduct ? () => updateQty(galleryProduct.id, -1) : undefined
        }
        onSelectProduct={setGalleryProduct}
      />
    </div>
  );
}
