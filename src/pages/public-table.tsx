import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  useGetStorefrontTable,
  useCreateStorefrontTableOrder,
  type StorefrontProduct,
  type StorefrontOrderConfirmation,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/format";
import { useT } from "@/lib/i18n-context";
import { Plus, Minus, Trash2, CheckCircle2, ShoppingBag, Utensils, Search, X, Tag, Sparkles, ChevronDown } from "lucide-react";
import { DirectionsButton } from "@/components/directions-button";
import { GuestNav } from "@/components/guest-nav";
import { MobileCartBar } from "@/components/mobile-cart-bar";
import { ProductDetailDialog } from "@/components/product-detail-dialog";
import { PromoCountdown } from "@/components/promo-countdown";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface CartLine {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  unit: string;
}

interface StorePromo {
  id: string;
  code: string;
  name: string;
  type: "percent" | "fixed";
  value: number;
  minOrder: number;
  endDate?: string | null;
}

interface StoreDetail {
  id: string;
  promotions: StorePromo[];
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

async function fetchStorefrontProducts(slug: string): Promise<StorefrontProduct[]> {
  const res = await fetch(`/api/storefront/stores/${slug}/products`);
  if (!res.ok) throw new Error("Không tải được sản phẩm");
  return res.json();
}

async function fetchStoreDetail(slug: string): Promise<StoreDetail> {
  const res = await fetch(`/api/storefront/stores/${slug}`);
  if (!res.ok) throw new Error("Không tải được thông tin cửa hàng");
  return res.json();
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

export default function PublicTablePage() {
  const t = useT();
  const params = useParams<{ token: string }>();
  const token = params.token ?? "";
  const { toast } = useToast();
  const { user } = useAuth();

  const tableQ = useGetStorefrontTable(token);
  const productsQ = useQuery({
    queryKey: ["storefront-table-products", tableQ.data?.storeSlug],
    queryFn: () => fetchStorefrontProducts(tableQ.data!.storeSlug),
    enabled: !!tableQ.data?.storeSlug,
  });

  const [cart, setCart] = useState<CartLine[]>([]);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [promoPickerOpen, setPromoPickerOpen] = useState(false);
  const [promosOpen, setPromosOpen] = useState(false);
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "qr" | "ewallet" | "cod">("cash");
  const [requestVat, setRequestVat] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [orderResult, setOrderResult] = useState<StorefrontOrderConfirmation | null>(null);

  useEffect(() => {
    if (user) {
      if (user.name && !guestName) setGuestName(user.name);
      if (user.phone && !guestPhone) setGuestPhone(user.phone);
    }
    if (!user || user.role !== "customer") {
      setSelectedCodes([]);
    }
  }, [user]);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [detailProduct, setDetailProduct] = useState<StorefrontProduct | null>(null);

  const storeSlug = tableQ.data?.storeSlug ?? "";
  const storeDetailQ = useQuery({
    queryKey: ["storefront-store-detail-table", storeSlug],
    queryFn: () => fetchStoreDetail(storeSlug),
    enabled: !!storeSlug,
  });

  const isCustomerLogged = user?.role === "customer";
  const storeIdForPromos = storeDetailQ.data?.id ?? "";
  const myPromosQ = useQuery({
    queryKey: ["my-promotions-table", storeIdForPromos],
    queryFn: () => fetchMyPromotions(storeIdForPromos),
    enabled: isCustomerLogged && !!storeIdForPromos,
  });

  const subtotal = useMemo(
    () => cart.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [cart],
  );

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
  const previewTotal = Math.max(0, subtotal - previewDiscount);

  const togglePromoCode = (code: string) => {
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  const storePromotions = storeDetailQ.data?.promotions ?? [];

  const orderMut = useCreateStorefrontTableOrder({
    mutation: {
      onSuccess: (data) => {
        setOrderResult(data);
        setCart([]);
        setNote("");
        setSelectedCodes([]);
        myPromosQ.refetch();
      },
      onError: (err: unknown) => {
        toast({
          variant: "destructive",
          title: t.common.error,
          description: err instanceof Error ? err.message : t.common.error,
        });
      },
    },
  });

  const categories = useMemo(() => {
    if (!productsQ.data) return [] as { id: string; name: string }[];
    const map = new Map<string, string>();
    for (const p of productsQ.data) {
      if (p.categoryId && p.categoryName) {
        map.set(p.categoryId, p.categoryName);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [productsQ.data]);

  const normalizeText = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d");

  const filteredProducts = useMemo(() => {
    if (!productsQ.data) return [];
    let list = productsQ.data;
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
    return list;
  }, [productsQ.data, activeCategory, searchQuery]);

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

  const totalQty = useMemo(
    () => cart.reduce((sum, i) => sum + i.quantity, 0),
    [cart],
  );

  const handleSubmit = () => {
    if (cart.length === 0) {
      toast({ variant: "destructive", title: t.publicTable.emptyCart });
      return;
    }
    if (!isCustomerLogged && selectedCodes.length > 0) {
      toast({ variant: "destructive", title: t.shopDetail.loginForPromos });
      setSelectedCodes([]);
      return;
    }
    setMobileCartOpen(false);
    orderMut.mutate({
      token,
      data: {
        guestName: guestName.trim() || undefined,
        guestPhone: guestPhone.trim() || undefined,
        note: note.trim() || undefined,
        promotionCodes: selectedCodes.length > 0 ? selectedCodes : undefined,
        paymentMethod,
        requestVatInvoice: requestVat || undefined,
        items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      },
    });
  };

  if (tableQ.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        {t.publicTable.loadingTable}
      </div>
    );
  }

  if (tableQ.error || !tableQ.data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-destructive">{t.publicTable.tableNotFound}</p>
        <p className="text-sm text-muted-foreground">
          {t.publicTable.tableInactive}
        </p>
      </div>
    );
  }

  const table = tableQ.data;

  const renderCartPanel = (idPrefix: string) => (
    <div className="space-y-3">
      {cart.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-4">
          {t.publicTable.emptyCart}
        </div>
      ) : (
        <div className="space-y-2 max-h-[40vh] lg:max-h-64 overflow-y-auto">
          {cart.map((i) => (
            <div
              key={i.productId}
              className="flex items-center gap-2 text-sm border-b pb-2"
              data-testid={`cart-line-${i.productId}`}
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium line-clamp-1">{i.name}</div>
                <div className="text-xs text-muted-foreground">
                  {formatCurrency(i.price)} / {i.unit}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  onClick={() => updateQty(i.productId, -1)}
                  data-testid={`btn-dec-${i.productId}`}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-6 text-center text-sm">{i.quantity}</span>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  onClick={() => updateQty(i.productId, 1)}
                  data-testid={`btn-inc-${i.productId}`}
                >
                  <Plus className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive"
                  onClick={() => removeFromCart(i.productId)}
                  data-testid={`btn-rm-${i.productId}`}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Separator />

      <div className="space-y-2">
        <div>
          <Label htmlFor={`${idPrefix}t-name`} className="text-xs">
            {t.publicTable.yourName}
          </Label>
          <Input
            id={`${idPrefix}t-name`}
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder={t.publicTable.yourName}
            data-testid={`input-guest-name-${idPrefix}`}
          />
        </div>
        <div>
          <Label htmlFor={`${idPrefix}t-phone`} className="text-xs">
            {t.shopDetail.yourPhone}
          </Label>
          <Input
            id={`${idPrefix}t-phone`}
            value={guestPhone}
            onChange={(e) => setGuestPhone(e.target.value)}
            placeholder="0xxxxxxxxx"
            data-testid={`input-guest-phone-${idPrefix}`}
          />
        </div>
        <div>
          <Label htmlFor={`${idPrefix}t-note`} className="text-xs">
            {t.pos.note}
          </Label>
          <Textarea
            id={`${idPrefix}t-note`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t.pos.notePlaceholder}
            rows={2}
            data-testid={`input-note-${idPrefix}`}
          />
        </div>
        <div>
          <Label className="text-xs">{t.shopDetail.paymentMethod}</Label>
          <Select
            value={paymentMethod}
            onValueChange={(v) =>
              setPaymentMethod(v as "cash" | "qr" | "ewallet" | "cod")
            }
          >
            <SelectTrigger data-testid={`select-payment-${idPrefix}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">{t.shopDetail.cashAtStore}</SelectItem>
              <SelectItem value="qr">{t.shopDetail.qrTransfer}</SelectItem>
              <SelectItem value="ewallet">{t.shopDetail.eWallet}</SelectItem>
              <SelectItem value="cod">{t.shopDetail.cod}</SelectItem>
            </SelectContent>
          </Select>
        </div>
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

      <Separator />

      {storePromotions.length > 0 && (
        <div className="relative overflow-hidden rounded-xl border-2 border-amber-300/70 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-3 shadow-sm dark:border-amber-500/40 dark:from-amber-950/40 dark:via-orange-950/40 dark:to-rose-950/40">
          <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-amber-300/30 blur-2xl" />
          <div className="absolute -bottom-6 -left-6 h-16 w-16 rounded-full bg-rose-300/30 blur-2xl" />
          <button
            type="button"
            onClick={() => setPromosOpen((v) => !v)}
            aria-expanded={promosOpen}
            className="relative flex items-center gap-1.5 w-full"
            data-testid="button-toggle-table-promos"
          >
            <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <p className="text-sm font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wide">
              {t.shopDetail.promotionAvailable}
            </p>
            <Badge className="ml-auto bg-amber-500 hover:bg-amber-500 text-white text-[10px] px-1.5 py-0 h-4">
              {storePromotions.length}
            </Badge>
            <ChevronDown
              className={`h-4 w-4 text-amber-700 dark:text-amber-300 transition-transform ${promosOpen ? "rotate-180" : ""}`}
            />
          </button>
          <div className={`relative space-y-1.5 overflow-hidden transition-all ${promosOpen ? "mt-2 max-h-[2000px] opacity-100" : "max-h-0 opacity-0"}`}>
            {storePromotions.map((p) => {
              const valueLabel =
                p.type === "percent"
                  ? `−${p.value}%`
                  : `−${formatCurrency(p.value)}`;
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-2 rounded-lg bg-white/80 dark:bg-slate-900/60 px-2.5 py-1.5 backdrop-blur-sm ring-1 ring-amber-200/60 dark:ring-amber-700/40"
                  data-testid={`table-active-promo-${p.code}`}
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
                      <PromoCountdown endDate={p.endDate} />
                    </div>
                    {p.minOrder > 0 && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {t.pos.minOrderRequired} {formatCurrency(p.minOrder)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
          <Link href={`/login?next=${encodeURIComponent(`/t/${token}`)}`} className="text-primary underline">
            {t.login.loginButton}
          </Link>
        </div>
      )}

      <Separator />

      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span>{t.common.subtotal}</span>
          <span className="font-semibold">{formatCurrency(subtotal)}</span>
        </div>
        {previewBreakdown.items.length > 0 && (
          <>
            {previewBreakdown.items.map((item) => (
              <div key={item.code} className="flex justify-between text-xs text-green-600 dark:text-green-400">
                <span className="flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  {item.code}: {item.name}
                </span>
                <span>-{formatCurrency(item.amount)}</span>
              </div>
            ))}
            <Separator />
            <div className="flex justify-between text-sm font-bold">
              <span>{t.common.total}</span>
              <span className="text-primary">{formatCurrency(previewTotal)}</span>
            </div>
          </>
        )}
      </div>

      <Button
        className="w-full h-12 text-base"
        disabled={cart.length === 0 || orderMut.isPending}
        onClick={handleSubmit}
        data-testid={`button-submit-table-order-${idPrefix}`}
      >
        {orderMut.isPending ? t.publicTable.placingOrder : t.publicTable.placeOrder}
      </Button>
    </div>
  );

  if (orderResult) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center p-6">
        <Card className="max-w-md w-full" data-testid="card-table-order-success">
          <CardHeader className="text-center">
            <div className="mx-auto bg-green-500 text-white p-3 rounded-full w-fit">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <CardTitle className="mt-3">{t.publicTable.orderSuccess}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.shopDetail.orderCode}</span>
              <span
                className="font-mono font-semibold"
                data-testid="text-table-order-code"
              >
                {orderResult.code}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.tables.tableName}</span>
              <span className="font-semibold">{table.tableName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.shopDetail.storeName}</span>
              <span>{table.storeName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.common.subtotal}</span>
              <span>{formatCurrency(orderResult.subtotal)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-base">
              <span className="font-semibold">{t.common.total}</span>
              <span className="font-bold text-primary">
                {formatCurrency(orderResult.total)}
              </span>
            </div>
            <p className="text-center text-muted-foreground pt-2">
              {t.publicTable.orderDesc}
            </p>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setOrderResult(null)}
                data-testid="button-order-more"
              >
                {t.publicTable.orderAnother}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20" data-testid="page-public-table">
      <header className="bg-primary text-primary-foreground sticky top-0 z-10 shadow">
        <div className="max-w-5xl mx-auto px-3 py-2.5 lg:px-4 lg:py-4 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <Link
              href="/shop"
              className="inline-flex items-center gap-1 text-[11px] lg:text-xs text-primary-foreground/80 hover:text-primary-foreground line-clamp-1"
            >
              {table.storeName}
            </Link>
            <h1 className="text-base lg:text-xl font-bold flex items-center gap-2 leading-tight mt-0.5">
              <Utensils className="h-4 w-4 lg:h-5 lg:w-5 shrink-0" />
              <span className="truncate">{table.tableName}</span>
            </h1>
            <p className="text-[11px] lg:text-xs text-primary-foreground/80 line-clamp-1 mt-0.5">
              {table.storeAddress}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="hidden lg:inline-flex text-xs">
                {t.publicTable.title}
              </Badge>
              <GuestNav />
            </div>
            <DirectionsButton
              latitude={table.storeLatitude}
              longitude={table.storeLongitude}
              address={table.storeAddress}
              storeName={table.storeName}
              variant="secondary"
              testId="button-table-directions"
            />
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-4 pb-28 lg:pb-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-3 space-y-3">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.shopDetail.searchPlaceholder}
                  className="pl-9 pr-9"
                  data-testid="input-table-search"
                  aria-label={t.common.search}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted"
                    data-testid="button-clear-table-search"
                    aria-label={t.common.clearSearch}
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                <Button
                  size="sm"
                  variant={activeCategory === "all" ? "default" : "outline"}
                  onClick={() => setActiveCategory("all")}
                  data-testid="filter-all"
                >
                  {t.common.all}
                </Button>
                {categories.map((c) => (
                  <Button
                    key={c.id}
                    size="sm"
                    variant={activeCategory === c.id ? "default" : "outline"}
                    onClick={() => setActiveCategory(c.id)}
                    data-testid={`filter-cat-${c.id}`}
                  >
                    {c.name}
                  </Button>
                ))}
              </div>
              {searchQuery.trim().length > 0 && (
                <p
                  className="text-xs text-muted-foreground"
                  data-testid="text-table-search-summary"
                >
                  {filteredProducts.length === 0
                    ? `${t.pos.noProductsFound}: "${searchQuery.trim()}"`
                    : `${t.common.showing} ${filteredProducts.length}: "${searchQuery.trim()}"`}
                </p>
              )}
            </CardContent>
          </Card>

          {productsQ.isLoading ? (
            <div className="text-center text-muted-foreground py-8">{t.pos.loadingProducts}</div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {t.shopDetail.noProducts}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredProducts.map((p) => {
                const inCart = cart.find((i) => i.productId === p.id);
                const qty = inCart?.quantity ?? 0;
                return (
                  <Card
                    key={p.id}
                    className={`relative hover-elevate ${p.inStock ? "cursor-pointer" : "opacity-50"} ${qty > 0 ? "ring-2 ring-primary" : ""}`}
                    onClick={() => setDetailProduct(p)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setDetailProduct(p);
                      }
                    }}
                    data-testid={`product-${p.id}`}
                  >
                    {qty > 0 && (
                      <span
                        className="absolute top-2 left-2 z-10 inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow"
                        data-testid={`product-qty-badge-${p.id}`}
                      >
                        {qty}
                      </span>
                    )}
                    {p.imageUrl && (
                      <div className="aspect-square overflow-hidden rounded-t-md bg-muted">
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardContent className="p-3 space-y-2">
                      <div className="font-semibold text-sm line-clamp-2" data-testid={`product-name-${p.id}`}>
                        {p.name}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-primary font-bold text-sm">
                          {formatCurrency(p.price)}
                        </div>
                        {p.inStock ? (
                          qty > 0 ? (
                            <div
                              className="flex items-center gap-1 bg-background border rounded-full shadow-sm"
                              onClick={(e) => e.stopPropagation()}
                              data-testid={`product-stepper-${p.id}`}
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
                                data-testid={`product-dec-${p.id}`}
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
                                data-testid={`product-inc-${p.id}`}
                                aria-label={t.pos.increase}
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              size="icon"
                              className="h-8 w-8 rounded-full shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart(p);
                              }}
                              aria-label={t.shopDetail.addToCart}
                              data-testid={`product-quick-add-${p.id}`}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          )
                        ) : null}
                      </div>
                      {!p.inStock && (
                        <Badge variant="destructive" className="text-[10px]">
                          {t.shopDetail.outOfStock}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <aside className="hidden lg:block space-y-4">
          <Card className="sticky top-24">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" /> {t.shopDetail.cart} ({totalQty})
              </CardTitle>
            </CardHeader>
            <CardContent>{renderCartPanel("d-")}</CardContent>
          </Card>
        </aside>
      </div>

      <MobileCartBar
        itemCount={totalQty}
        subtotal={subtotal}
        onClick={() => setMobileCartOpen(true)}
        ctaLabel={t.pos.viewCart}
        testId="table-mobile-cart-bar"
      />

      <Sheet open={mobileCartOpen} onOpenChange={setMobileCartOpen}>
        <SheetContent
          side="bottom"
          className="h-[92vh] flex flex-col p-0 lg:hidden"
          data-testid="sheet-mobile-cart-table"
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

      <Dialog open={promoPickerOpen} onOpenChange={setPromoPickerOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto" data-testid="dialog-table-promo-picker">
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
            <Button onClick={() => setPromoPickerOpen(false)} data-testid="button-close-table-promo-picker">
              Xong ({selectedCodes.length})
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ProductDetailDialog
        product={detailProduct}
        open={!!detailProduct}
        onOpenChange={(open) => {
          if (!open) setDetailProduct(null);
        }}
        quantityInCart={
          detailProduct
            ? (cart.find((i) => i.productId === detailProduct.id)?.quantity ?? 0)
            : 0
        }
        onAddToCart={
          detailProduct && detailProduct.inStock
            ? () => addToCart(detailProduct)
            : undefined
        }
        onDecrement={
          detailProduct ? () => updateQty(detailProduct.id, -1) : undefined
        }
      />
    </div>
  );
}
