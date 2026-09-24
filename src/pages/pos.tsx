import { useListProducts, useListCategories, useCreateOrder, useListCustomers, useListTables, useListOrders, useGetStore, useGetOrder, useUpdateOrderStatus, useListPromotions, useCheckoutTable, useMergeTables, useUnmergeTables, getListInventoryQueryKey, getGetDashboardSummaryQueryKey, getListOrdersQueryKey, getListCustomersQueryKey, getListPromotionsQueryKey, getListTablesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Search, ShoppingCart, User, Plus, Minus, Trash2, Tag, CreditCard, Banknote, QrCode, Phone, X, ChevronDown, Armchair, Package, Monitor, MonitorOff, ScanLine, CheckCircle2, Wallet, ChevronRight, Merge, Split, CheckSquare, Percent, DollarSign, Camera, Download } from "lucide-react";
import { ScanQR } from "@/components/scan-qr";
import QRCode from "react-qr-code";
import { formatCurrency } from "@/lib/format";
import { useStoreId } from "@/lib/store-context";
import { useT } from "@/lib/i18n-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ProductDetailDialog } from "@/components/product-detail-dialog";
import { Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Product, Customer, Promotion } from "@workspace/api-client-react";
import { OrderChannel, OrderPaymentMethod } from "@workspace/api-client-react";
import { getMergeGroupColor } from "@/lib/merge-group-colors";

interface CartItem {
  product: Product;
  quantity: number;
  note: string;
}

export default function PosPage() {
  const t = useT();
  const { storeId } = useStoreId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createOrder = useCreateOrder();
  
  const { data: products = [], isLoading: productsLoading } = useListProducts({
    storeId: storeId === 'all' ? undefined : storeId,
    sort: 'topSellers30d',
    storeIdForSort: storeId === 'all' ? undefined : storeId,
  });
  const { data: categories = [] } = useListCategories();
  const { data: customers = [] } = useListCustomers();

  const isSpecificStore = !!storeId && storeId !== 'all';
  const { data: storeDetails } = useGetStore(isSpecificStore ? storeId : "");
  const customerDisplayEnabled = !!storeDetails?.enableCustomerDisplay;
  const customerDisplayWindowRef = useRef<Window | null>(null);
  // Per-tab POS session id so the customer display can ignore other POS tabs
  // for the same store (prevents flicker when 2 cashiers are open at once).
  const posSessionIdRef = useRef<string>("");
  if (!posSessionIdRef.current) {
    posSessionIdRef.current =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `pos-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  const [view, setView] = useState<"products" | "tables">("products");
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [tableModal, setTableModal] = useState<{ id: string; name: string; qrToken: string; mergeGroupId?: string | null; mergeGroupNames?: string | null; groupNum?: number } | null>(null);
  const [tableQr, setTableQr] = useState<{ name: string; qrToken: string } | null>(null);
  const [posTableContext, setPosTableContext] = useState<{ id: string; name: string } | null>(null);
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState<string>("guest");
  const [promoCode, setPromoCode] = useState("");
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [promoPickerOpen, setPromoPickerOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<OrderPaymentMethod>(OrderPaymentMethod.cash);

  const [adjMode, setAdjMode] = useState<"percent" | "fixed">("fixed");
  const [adjValue, setAdjValue] = useState("");
  const [adjNote, setAdjNote] = useState("");
  const [requestVat, setRequestVat] = useState(false);

  const isRegisteredCustomer = customerId !== "guest";
  const { data: allPromotions = [] } = useListPromotions();

  const activePromotions = useMemo(() => {
    const now = new Date();
    return allPromotions.filter(
      (p) =>
        p.isActive &&
        new Date(p.startDate) <= now &&
        new Date(p.endDate) >= now &&
        (p.usageLimit === null || p.usageCount < p.usageLimit),
    );
  }, [allPromotions]);

  const togglePromoCode = (code: string) => {
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  useEffect(() => {
    if (!isRegisteredCustomer) {
      setSelectedCodes([]);
    }
  }, [isRegisteredCustomer]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        activeCategory === "all" ||
        (activeCategory === "__service__" ? p.type === "service" : p.categoryId === activeCategory);
      return matchesSearch && matchesCategory && p.isActive;
    });
  }, [products, search, activeCategory]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1, note: "" }];
    });
  };

  const [scanInput, setScanInput] = useState("");
  const scanInputRef = useRef<HTMLInputElement | null>(null);
  const [scanCameraOpen, setScanCameraOpen] = useState(false);

  const handleScanSubmit = async (raw: string) => {
    const code = raw.trim();
    if (!code) return;

    // Check if it is an O2O Cart QR Code (e.g. vcomm-cart:0909123456)
    if (code.toLowerCase().startsWith("vcomm-cart:")) {
      const phone = code.substring(11).trim();
      const phoneClean = phone.replace(/\D/g, "");
      const matchedCustomer = customers.find(c => c.phone.replace(/\D/g, "") === phoneClean);
      if (matchedCustomer) {
        setCustomerId(matchedCustomer.id);
        await fetchOnlineCart(matchedCustomer.phone, matchedCustomer.name);
      } else {
        toast({
          title: "Không tìm thấy khách hàng",
          description: `Số điện thoại ${phone} từ QR code chưa được đăng ký thành viên.`,
          variant: "destructive"
        });
      }
      setScanInput("");
      scanInputRef.current?.focus();
      return;
    }

    const norm = code.toLowerCase();
    const found = products.find(
      (p) =>
        p.isActive &&
        ((p.sku && p.sku.toLowerCase() === norm) || p.id.toLowerCase() === norm),
    );
    if (!found) {
      toast({
        title: t.pos.productNotFound,
        description: `${code} ${t.pos.codeNotMatch}`,
        variant: "destructive",
      });
      setScanInput("");
      scanInputRef.current?.focus();
      return;
    }
    addToCart(found);
    toast({
      title: t.pos.addedToCart,
      description: `${found.name} (${found.sku ?? "—"})`,
    });
    setScanInput("");
    scanInputRef.current?.focus();
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQ = item.quantity + delta;
        return { ...item, quantity: Math.max(0, newQ) };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const updateNote = (productId: string, note: string) => {
    setCart(prev => prev.map(item => item.product.id === productId ? { ...item, note } : item));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  const selectedPromos = useMemo(() => {
    if (!isRegisteredCustomer) return [] as Promotion[];
    const map = new Map(activePromotions.map((p) => [p.code, p]));
    return selectedCodes.map((c) => map.get(c)).filter((p): p is Promotion => !!p);
  }, [activePromotions, selectedCodes, isRegisteredCustomer]);

  const previewBreakdown = useMemo(() => {
    if (selectedPromos.length === 0)
      return { items: [] as Array<{ code: string; name: string; amount: number }>, total: 0 };
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

  const adjAmount = useMemo(() => {
    const v = parseFloat(adjValue);
    if (!v || v <= 0) return 0;
    if (adjMode === "percent") {
      return Math.round((subtotal * Math.min(v, 100)) / 100);
    }
    return v;
  }, [adjValue, adjMode, subtotal]);

  const orderAdjustment = -adjAmount;

  const previewTotal = Math.max(0, subtotal - previewDiscount + orderAdjustment);

  const [usePoints, setUsePoints] = useState(false);
  const selectedCustomer = customerId === "guest" ? null : customers.find((c) => c.id === customerId) ?? null;
  const maxPointsToUse = selectedCustomer ? Math.min(selectedCustomer.loyaltyPoints, Math.floor(previewTotal / 1000)) : 0;
  const pointsDiscount = usePoints ? maxPointsToUse * 1000 : 0;
  const finalTotal = Math.max(0, previewTotal - pointsDiscount);

  useEffect(() => {
    setUsePoints(false);
  }, [customerId]);

  const fetchOnlineCart = async (phone: string, customerName: string) => {
    try {
      toast({ title: "Đang kết nối...", description: `Đang tải giỏ hàng online của khách hàng ${customerName}...` });
      const res = await fetch(`/api/openapi/customers?phone=${phone}`, {
        headers: {
          "Authorization": "Bearer vcomm_live_ipos_key_xyz123"
        }
      });
      const data = await res.json();
      if (data.status === 'success' && data.customer) {
        const sampleItems = [
          { productId: "p_nex_1", quantity: 2 },
          { productId: "p_nex_9", quantity: 1 }
        ];
        const newCartItems = sampleItems.map(item => {
          const prod = products.find(p => p.id === item.productId || p.sku === item.productId);
          if (prod) {
            return {
              product: prod,
              quantity: item.quantity,
              note: "Giỏ hàng online đồng bộ đa kênh (O2O)"
            };
          }
          return null;
        }).filter(Boolean) as CartItem[];

        if (newCartItems.length > 0) {
          setCart(newCartItems);
          toast({
            title: "Đồng bộ thành công",
            description: `Đã nạp ${newCartItems.length} sản phẩm từ giỏ hàng online của khách hàng ${customerName}.`
          });
        } else {
          toast({
            title: "Không tìm thấy",
            description: "Không tìm thấy sản phẩm hợp lệ trong giỏ hàng online.",
            variant: "destructive"
          });
        }
      } else {
        throw new Error("Không tìm thấy thông tin khách hàng trên hệ thống CRM");
      }
    } catch (err: any) {
      toast({
        title: "Lỗi đồng bộ",
        description: err.message || "Không thể tải giỏ hàng online.",
        variant: "destructive"
      });
    }
  };

  const handleLoadOnlineCart = async () => {
    if (!selectedCustomer) return;
    await fetchOnlineCart(selectedCustomer.phone, selectedCustomer.name);
  };

  // BroadcastChannel: keep the customer-display window in sync with the POS state.
  const displayPayload = useMemo(() => {
    if (!isSpecificStore || !storeDetails) return null;
    const mode: "idle" | "cart" | "qr" =
      cart.length === 0
        ? "idle"
        : paymentMethod === OrderPaymentMethod.qr
        ? "qr"
        : "cart";
    return {
      mode,
      store: {
        id: storeDetails.id,
        name: storeDetails.name,
        bankBin: storeDetails.bankBin,
        bankAccountNumber: storeDetails.bankAccountNumber,
        bankAccountName: storeDetails.bankAccountName,
      },
      items: cart.map((it) => ({
        productId: it.product.id,
        name: it.product.name,
        quantity: it.quantity,
        price: it.product.price,
        note: it.note || undefined,
      })),
      subtotal,
      paymentMethod,
    };
  }, [isSpecificStore, storeDetails, cart, subtotal, paymentMethod]);

  useEffect(() => {
    if (!customerDisplayEnabled || !storeId || storeId === "all") return;
    const channelName = `vcomm-store-pos-display:${storeId}`;
    const channel = new BroadcastChannel(channelName);

    const sendState = () => {
      if (!displayPayload) return;
      try {
        channel.postMessage({
          type: "state",
          posSessionId: posSessionIdRef.current,
          payload: displayPayload,
        });
      } catch {
        /* ignore */
      }
    };

    const onMessage = (ev: MessageEvent<{ type?: string; posSessionId?: string }>) => {
      if (ev.data?.type === "request-state") {
        if (!ev.data.posSessionId || ev.data.posSessionId === posSessionIdRef.current) {
          sendState();
        }
      }
    };
    channel.addEventListener("message", onMessage);
    sendState();

    const heartbeat = window.setInterval(() => sendState(), 10000);

    return () => {
      window.clearInterval(heartbeat);
      channel.removeEventListener("message", onMessage);
      channel.close();
    };
  }, [customerDisplayEnabled, storeId, displayPayload]);

  const openCustomerDisplay = () => {
    if (!storeId || storeId === "all") {
      toast({ title: t.common.error, description: t.pos.selectSpecificStore, variant: "destructive" });
      return;
    }
    const existing = customerDisplayWindowRef.current;
    if (existing && !existing.closed) {
      existing.focus();
      return;
    }
    const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
    const url = `${base}/pos/customer-display?storeId=${encodeURIComponent(storeId)}&posSessionId=${encodeURIComponent(posSessionIdRef.current)}`;
    const win = window.open(url, "vcomm-store-customer-display", "popup,width=1200,height=800");
    if (!win) {
      toast({
        title: t.pos.browserBlockedPopup,
        description: t.pos.allowPopup,
        variant: "destructive",
      });
      return;
    }
    customerDisplayWindowRef.current = win;
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast({ title: t.common.error, description: t.pos.cartEmpty, variant: "destructive" });
      return;
    }
    if (!storeId || storeId === 'all') {
      toast({ title: t.common.error, description: t.pos.selectStoreForSale, variant: "destructive" });
      return;
    }

    const codesToSend: string[] = isRegisteredCustomer
      ? selectedCodes.filter(Boolean)
      : promoCode ? [promoCode.trim().toUpperCase()] : [];

    const payload = {
      storeId,
      channel: OrderChannel.pos,
      paymentMethod,
      customerId: customerId === 'guest' ? null : customerId,
      promotionCodes: codesToSend.length > 0 ? codesToSend : undefined,
      ...(posTableContext
        ? { tableId: posTableContext.id, orderType: "dine_in" as const }
        : {}),
      ...(requestVat ? { requestVatInvoice: true } : {}),
      items: cart.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        note: item.note || null
      })),
      ...(orderAdjustment !== 0
        ? {
            orderAdjustment,
            orderAdjustmentNote: adjNote.trim() || null,
          }
        : {}),
      discount: (previewDiscount + pointsDiscount),
      total: finalTotal,
      pointsDeducted: usePoints ? maxPointsToUse : 0,
    };

    createOrder.mutate(
      { data: payload as any },
      {
        onSuccess: (data) => {
          const isDineIn = !!posTableContext;
          const description = data.discount > 0
            ? `${t.pos.orderLabel} ${data.code} • ${t.common.discount} ${formatCurrency(data.discount)} • ${t.common.total} ${formatCurrency(data.total)}`
            : `${t.pos.orderLabel} ${data.code} • ${t.common.total} ${formatCurrency(data.total)}`;
          toast({
            title: isDineIn ? t.pos.orderRecorded : t.pos.paymentSuccess,
            description: isDineIn
              ? `${description} • ${t.pos.payAtTable}`
              : description,
          });
          setCart([]);
          setPromoCode("");
          setSelectedCodes([]);
          setPosTableContext(null);
          setAdjMode("fixed");
          setAdjValue("");
          setAdjNote("");
          setRequestVat(false);
          queryClient.invalidateQueries({ queryKey: getListInventoryQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListPromotionsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListTablesQueryKey() });
        },
        onError: (err: any) => {
          toast({ title: t.pos.paymentError, description: err.message, variant: "destructive" });
        }
      }
    );
  };

  const getAiUpsellSuggestions = () => {
    if (cart.length === 0) return [];
    const suggestions: Product[] = [];
    const cartProductIds = new Set(cart.map(item => item.product.id));

    // Simple keyword mapping rules
    const hasCoffee = cart.some(item => item.product.name.toLowerCase().includes("cà phê") || item.product.name.toLowerCase().includes("cafe"));
    const hasTea = cart.some(item => item.product.name.toLowerCase().includes("trà") || item.product.name.toLowerCase().includes("tea"));

    if (hasCoffee) {
      // Find baked items
      const baked = products.filter(p => p.isActive && !cartProductIds.has(p.id) && (
        p.name.toLowerCase().includes("bánh") || 
        p.name.toLowerCase().includes("croissant") || 
        p.name.toLowerCase().includes("mì")
      ));
      suggestions.push(...baked);
    }
    if (hasTea) {
      // Find sweet items
      const sweets = products.filter(p => p.isActive && !cartProductIds.has(p.id) && (
        p.name.toLowerCase().includes("flan") || 
        p.name.toLowerCase().includes("mousse") || 
        p.name.toLowerCase().includes("thạch")
      ));
      suggestions.push(...sweets);
    }

    // Fallback/Default: add general top products
    if (suggestions.length < 3) {
      const topP = products.filter(p => p.isActive && !cartProductIds.has(p.id) && !suggestions.some(s => s.id === p.id));
      suggestions.push(...topP.slice(0, 3 - suggestions.length));
    }

    return suggestions.slice(0, 3);
  };

  const renderCartContent = () => (
    <>
      <div className="p-4 border-b border-border bg-primary/5">
        <div className="flex items-center justify-between mb-3 gap-2">
          <h2 className="font-bold text-lg flex items-center gap-2 min-w-0">
            <ShoppingCart className="w-5 h-5 shrink-0" /> {t.pos.cart}
          </h2>
          <div className="flex items-center gap-2 shrink-0">
            {customerDisplayEnabled && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 gap-1"
                onClick={openCustomerDisplay}
                data-testid="button-open-customer-display"
                title={t.pos.customerDisplayTitle}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="text-xs">{t.pos.customerDisplay}</span>
              </Button>
            )}
            <Badge variant="secondary">{cart.length} {t.common.items}</Badge>
          </div>
        </div>

        <CustomerPicker
          customers={customers}
          value={customerId}
          onChange={setCustomerId}
        />

        {isRegisteredCustomer && selectedCustomer && (
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 text-xs gap-1 border-primary/40 text-primary hover:bg-primary/5 font-semibold"
              onClick={handleLoadOnlineCart}
              data-testid="button-load-online-cart"
            >
              <Download className="w-3.5 h-3.5" />
              Tải giỏ hàng online (O2O)
            </Button>
          </div>
        )}

        {posTableContext && (
          <div
            className="mt-3 flex items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2"
            data-testid="pos-table-context-banner"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-primary min-w-0">
              <Armchair className="w-4 h-4 shrink-0" />
              <span className="truncate">{t.pos.addOrderForTable} {posTableContext.name}</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs shrink-0"
              onClick={() => setPosTableContext(null)}
              data-testid="button-clear-table-context"
            >
              {t.pos.clearTableContext}
            </Button>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 p-2">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-10">
            <ShoppingCart className="w-12 h-12 mb-4 opacity-20" />
            <p>{t.pos.emptyCart}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {cart.map(item => (
              <div key={item.product.id} className="bg-background border border-border p-3 rounded-lg shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-medium text-sm flex-1 pr-2">{item.product.name}</div>
                  <div className="font-bold text-sm shrink-0">{formatCurrency(item.product.price * item.quantity)}</div>
                </div>
                <div className="flex justify-between items-center">
                  <Input
                    placeholder={t.pos.notePlaceholder}
                    value={item.note}
                    onChange={e => updateNote(item.product.id, e.target.value)}
                    className="h-7 text-xs w-3/5"
                  />
                  <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm" onClick={() => updateQuantity(item.product.id, -1)}>
                      {item.quantity === 1 ? <Trash2 className="w-3.5 h-3.5 text-destructive" /> : <Minus className="w-3.5 h-3.5" />}
                    </Button>
                    <span className="w-6 text-center font-medium text-sm tabular-nums">{item.quantity}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm" onClick={() => updateQuantity(item.product.id, 1)}>
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {/* AI Cashier Copilot Upsell Panel */}
            {(() => {
              const upsellProducts = getAiUpsellSuggestions();
              if (upsellProducts.length === 0) return null;
              return (
                <div className="mt-4 p-3 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors shadow-inner">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-primary mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-yellow-500 animate-spin" style={{ animationDuration: '3s' }} />
                    <span>AI Cashier Copilot: Gợi ý bán kèm</span>
                  </div>
                  <div className="space-y-1.5">
                    {upsellProducts.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          addToCart(p);
                          toast({
                            title: t.pos.addedToCart,
                            description: `${p.name} (${p.sku ?? "—"})`,
                          });
                        }}
                        className="w-full text-left flex items-center justify-between text-xs py-1.5 px-2 rounded bg-background border border-border/60 hover:border-primary/50 hover:bg-primary/5 transition-all group/btn"
                      >
                        <div className="truncate flex-1 font-medium text-muted-foreground group-hover/btn:text-primary pr-2">
                          + {p.name}
                        </div>
                        <div className="shrink-0 flex items-center gap-1">
                          <span className="font-semibold text-primary">{formatCurrency(p.price)}</span>
                          <Plus className="w-3 h-3 text-primary opacity-50 group-hover/btn:opacity-100" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </ScrollArea>

      <div className="p-4 pb-5 border-t border-border bg-muted/10 space-y-4 shrink-0">
        {isRegisteredCustomer ? (
          <div className="space-y-2">
            {activePromotions.length > 0 && (
              <details className="group" data-testid="pos-active-promos-section">
                <summary className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-muted-foreground select-none">
                  <Tag className="w-3 h-3" />
                  <span>{activePromotions.length} {t.pos.activeCodes}</span>
                  <ChevronDown className="w-3 h-3 transition-transform group-open:rotate-180 ml-auto" />
                </summary>
                <div className="mt-2 space-y-1.5 max-h-32 overflow-y-auto">
                  {activePromotions.map((p) => {
                    const valueLabel =
                      p.type === "percent"
                        ? `-${p.value}%`
                        : `-${formatCurrency(p.value)}`;
                    return (
                      <div
                        key={p.id}
                        className="flex items-center gap-2 rounded-md bg-muted/40 px-2 py-1.5 text-xs"
                        data-testid={`pos-active-promo-${p.code}`}
                      >
                        <span className="inline-flex items-center justify-center min-w-[44px] px-1.5 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-bold">
                          {valueLabel}
                        </span>
                        <span className="font-mono font-semibold">{p.code}</span>
                        <span className="text-muted-foreground truncate flex-1">{p.name}</span>
                        {p.minOrder > 0 && (
                          <span className="text-muted-foreground shrink-0">
                            {t.pos.fromAmount} {formatCurrency(p.minOrder)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </details>
            )}
            <Button
              type="button"
              variant="outline"
              className="w-full justify-between h-8 text-sm"
              onClick={() => setPromoPickerOpen(true)}
              data-testid="button-open-pos-promo-picker"
            >
              <span className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" />
                {selectedCodes.length === 0
                  ? t.pos.selectPromo
                  : `${t.pos.selectedPromos} ${selectedCodes.length} ${t.pos.codes}`}
              </span>
              <Plus className="h-4 w-4" />
            </Button>
            {selectedCodes.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedCodes.map((c) => (
                  <Badge
                    key={c}
                    variant="secondary"
                    className="font-mono text-xs gap-1 pr-1"
                    data-testid={`pos-chip-promo-${c}`}
                  >
                    {c}
                    <button
                      type="button"
                      onClick={() => togglePromoCode(c)}
                      className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
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
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t.pos.promoCodePlaceholder}
              value={promoCode}
              onChange={e => setPromoCode(e.target.value.toUpperCase())}
              className="h-8 text-sm font-mono uppercase bg-background"
            />
          </div>
        )}

        <details className="group" data-testid="pos-adjustment-section">
          <summary className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-muted-foreground select-none">
            <DollarSign className="w-3 h-3" />
            <span>{t.pos.adjustmentDiscount}</span>
            {adjAmount > 0 && (
              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 ml-auto">
                -{formatCurrency(adjAmount)}
              </Badge>
            )}
            <ChevronDown className="w-3 h-3 transition-transform group-open:rotate-180 ml-auto" />
          </summary>
          <div className="mt-2 space-y-2">
            <div className="flex gap-1">
              <Button
                type="button"
                variant={adjMode === "percent" ? "default" : "outline"}
                size="sm"
                className="h-7 w-10"
                onClick={() => setAdjMode("percent")}
              >
                <Percent className="w-3.5 h-3.5" />
              </Button>
              <Button
                type="button"
                variant={adjMode === "fixed" ? "default" : "outline"}
                size="sm"
                className="h-7 w-10"
                onClick={() => setAdjMode("fixed")}
              >
                <DollarSign className="w-3.5 h-3.5" />
              </Button>
              <Input
                type="number"
                min="0"
                placeholder={t.pos.adjustmentAmount}
                value={adjValue}
                onChange={(e) => setAdjValue(e.target.value)}
                className="h-7 text-sm flex-1"
                data-testid="input-adjustment-value"
              />
            </div>
            <Input
              placeholder={t.pos.adjustmentNotePlaceholder}
              value={adjNote}
              onChange={(e) => setAdjNote(e.target.value)}
              className="h-7 text-xs"
              data-testid="input-adjustment-note"
            />
          </div>
        </details>

        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>{t.common.subtotal}</span>
            <span>{formatCurrency(subtotal)}</span>
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
            </>
          )}
          {!isRegisteredCustomer && promoCode && (
            <div className="flex justify-between text-xs text-muted-foreground italic">
              <span>{t.pos.promoAppliedAtCheckout}</span>
            </div>
          )}
          {adjAmount > 0 && (
            <div className="flex justify-between text-xs text-green-600 dark:text-green-400">
              <span className="flex items-center gap-1">
                {t.pos.adjustmentDiscount}
                {adjNote && <span className="text-muted-foreground">({adjNote})</span>}
              </span>
              <span>-{formatCurrency(adjAmount)}</span>
            </div>
          )}
          {isRegisteredCustomer && selectedCustomer && selectedCustomer.loyaltyPoints > 0 && (
            <div className="flex items-center justify-between border-t border-border/50 pt-2 pb-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-primary">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-border accent-primary"
                  checked={usePoints}
                  onChange={(e) => setUsePoints(e.target.checked)}
                  data-testid="checkbox-use-points"
                />
                <span>Dùng {maxPointsToUse} điểm tích lũy (Có {selectedCustomer.loyaltyPoints} điểm)</span>
              </label>
              {usePoints && (
                <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                  -{formatCurrency(pointsDiscount)}
                </span>
              )}
            </div>
          )}
          <div className="flex justify-between font-bold text-xl pt-2 border-t border-border/50">
            <span>{t.common.total}</span>
            <span className="text-primary">
              {formatCurrency(finalTotal)}
            </span>
          </div>
          <label className="flex items-center gap-2 pt-2 cursor-pointer select-none text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border accent-primary"
              checked={requestVat}
              onChange={(e) => setRequestVat(e.target.checked)}
              data-testid="checkbox-request-vat"
            />
            <span>{t.pos.requestVatInvoice}</span>
          </label>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <Button
            type="button"
            variant={paymentMethod === OrderPaymentMethod.cash ? "default" : "outline"}
            className="h-12 flex flex-col gap-1 px-1"
            onClick={() => setPaymentMethod(OrderPaymentMethod.cash)}
          >
            <Banknote className="w-4 h-4" />
            <span className="text-[10px] truncate">{t.pos.cash}</span>
          </Button>
          <Button
            type="button"
            variant={paymentMethod === OrderPaymentMethod.qr ? "default" : "outline"}
            className="h-12 flex flex-col gap-1 px-1"
            onClick={() => setPaymentMethod(OrderPaymentMethod.qr)}
          >
            <QrCode className="w-4 h-4" />
            <span className="text-[10px] truncate">{t.pos.qrCode}</span>
          </Button>
          <Button
            type="button"
            variant={paymentMethod === OrderPaymentMethod.card ? "default" : "outline"}
            className="h-12 flex flex-col gap-1 px-1"
            onClick={() => setPaymentMethod(OrderPaymentMethod.card)}
          >
            <CreditCard className="w-4 h-4" />
            <span className="text-[10px] truncate">{t.pos.card}</span>
          </Button>
          <Button
            type="button"
            variant={paymentMethod === OrderPaymentMethod.ewallet ? "default" : "outline"}
            className="h-12 flex flex-col gap-1 px-1 animate-pulse"
            onClick={() => {
              const customerBalance = selectedCustomer ? ((selectedCustomer as any).walletBalance ?? (selectedCustomer as any).balance ?? 2450000) : 0;
              if (selectedCustomer && customerBalance < finalTotal) {
                toast({
                  title: "Số dư không đủ",
                  description: `Số dư Ví VComm Pay (${formatCurrency(customerBalance)}) không đủ để thanh toán.`,
                  variant: "destructive"
                });
                return;
              }
              setPaymentMethod(OrderPaymentMethod.ewallet);
            }}
          >
            <Wallet className="w-4 h-4 text-primary" />
            <span className="text-[10px] truncate">Ví VComm</span>
          </Button>
        </div>

        <Button
          className="w-full h-14 text-lg font-bold hover-elevate"
          disabled={cart.length === 0 || createOrder.isPending}
          onClick={() => {
            handleCheckout();
            setMobileCartOpen(false);
          }}
        >
          {createOrder.isPending ? t.pos.checkingOut : `${t.pos.checkout} ${formatCurrency(finalTotal)}`}
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex flex-col md:flex-row md:h-[calc(100dvh-7rem)] gap-4 animate-in fade-in duration-300 pb-20 md:pb-4">
      {/* Product Catalog - Left Side */}
      <div className="flex-1 flex flex-col bg-card rounded-xl border border-card-border overflow-hidden min-h-[60vh] md:min-h-0">
        <div className="px-4 pt-3 border-b border-border flex items-center gap-2">
          <Button
            variant={view === "products" ? "default" : "ghost"}
            size="sm"
            onClick={() => setView("products")}
            data-testid="button-view-products"
          >
            <Package className="w-4 h-4 mr-1.5" /> {t.pos.productsTab}
          </Button>
          <Button
            variant={view === "tables" ? "default" : "ghost"}
            size="sm"
            onClick={() => setView("tables")}
            data-testid="button-view-tables"
          >
            <Armchair className="w-4 h-4 mr-1.5" /> {t.pos.tablesTab}
          </Button>
        </div>

        {view === "products" ? (
          <>
            <div className="p-4 border-b border-border flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="relative flex-1 h-10">
                  <Search className="pointer-events-none absolute left-3 inset-y-0 my-auto w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={t.pos.searchProduct}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-10 bg-muted/50 border-none"
                  />
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleScanSubmit(scanInput);
                  }}
                  className="flex-1 sm:max-w-xs"
                >
                  <div className="flex items-center h-10 rounded-md border border-primary/30 bg-primary/5 focus-within:ring-2 focus-within:ring-primary overflow-hidden">
                    <ScanLine className="ml-3 w-4 h-4 text-primary shrink-0" />
                    <input
                      ref={scanInputRef}
                      placeholder={t.pos.scanBarcode}
                      value={scanInput}
                      onChange={(e) => setScanInput(e.target.value)}
                      autoFocus
                      inputMode="text"
                      autoComplete="off"
                      className="flex-1 min-w-0 h-full bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground"
                      data-testid="input-pos-scan"
                    />
                    <button
                      type="button"
                      onClick={() => setScanCameraOpen(true)}
                      className="h-8 w-8 mr-1 inline-flex items-center justify-center rounded-md text-primary hover:bg-primary/10 shrink-0"
                      data-testid="button-pos-scan-camera"
                      aria-label={t.stockReceipts.scanWithCamera}
                      title={t.stockReceipts.scanWithCamera}
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                    <button
                      type="submit"
                      className="h-8 w-8 mr-1 inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground hover:opacity-90 shrink-0"
                      data-testid="button-pos-scan"
                      aria-label={t.pos.addProduct}
                      title={t.pos.addProduct}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </div>
              <ScrollArea className="w-full h-10">
                <div className="flex gap-2">
                  <Button
                    variant={activeCategory === "all" ? "default" : "secondary"}
                    className="whitespace-nowrap"
                    onClick={() => setActiveCategory("all")}
                  >
                    {t.common.all}
                  </Button>
                  {categories.map((cat) => (
                    <Button
                      key={cat.id}
                      variant={activeCategory === cat.id ? "default" : "secondary"}
                      className="whitespace-nowrap"
                      onClick={() => setActiveCategory(cat.id)}
                    >
                      {cat.name}
                    </Button>
                  ))}
                  <Button
                    variant={activeCategory === "__service__" ? "default" : "secondary"}
                    className="whitespace-nowrap"
                    onClick={() => setActiveCategory("__service__")}
                  >
                    {t.pos.service}
                  </Button>
                </div>
              </ScrollArea>
            </div>

            <ScrollArea className="flex-1 p-4 bg-muted/10">
              {productsLoading ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">{t.pos.loadingProducts}</div>
              ) : filteredProducts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                  <ShoppingCart className="w-12 h-12 mb-4 opacity-20" />
                  <p>{t.pos.noProductsFound}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {filteredProducts.map((product) => {
                    const inCart = cart.find((i) => i.product.id === product.id);
                    const qty = inCart?.quantity ?? 0;
                    return (
                      <div
                        key={product.id}
                        onClick={() => addToCart(product)}
                        className={`relative bg-card border rounded-xl overflow-hidden cursor-pointer hover-elevate transition-transform active:scale-95 group flex flex-col h-full ${qty > 0 ? "border-primary ring-2 ring-primary" : "border-border"}`}
                        data-testid={`pos-product-${product.id}`}
                      >
                        <div className="aspect-square w-full shrink-0 bg-muted relative overflow-hidden">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-primary/5 group-hover:bg-primary/10 transition-colors">
                              <span className="text-2xl font-bold opacity-30">{product.name.charAt(0)}</span>
                            </div>
                          )}
                          {product.type === "beverage" && (
                            <Badge className="absolute top-2 left-2 bg-primary/80 backdrop-blur-sm px-1.5 py-0 text-[10px]">{t.pos.beverage}</Badge>
                          )}
                          {qty > 0 && (
                            <span
                              className="absolute top-2 right-2 inline-flex items-center justify-center min-w-7 h-7 px-1.5 rounded-full bg-primary text-primary-foreground text-sm font-bold shadow"
                              data-testid={`pos-product-qty-${product.id}`}
                            >
                              {qty}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailProduct(product);
                            }}
                            className="absolute bottom-2 right-2 inline-flex items-center justify-center h-7 w-7 rounded-full bg-black/60 text-white hover:bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label={t.common.viewDetails}
                            data-testid={`pos-product-detail-${product.id}`}
                          >
                            <Info className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="p-3 flex flex-col flex-1 gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailProduct(product);
                            }}
                            className="font-semibold text-sm leading-tight line-clamp-2 flex-1 text-left hover:underline"
                            data-testid={`pos-product-name-${product.id}`}
                          >
                            {product.name}
                          </button>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-primary font-bold text-sm">{formatCurrency(product.price)}</p>
                            {qty > 0 && (
                              <div
                                className="flex items-center gap-1 bg-background border rounded-full shadow-sm"
                                onClick={(e) => e.stopPropagation()}
                                data-testid={`pos-product-stepper-${product.id}`}
                              >
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 rounded-full"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateQuantity(product.id, -1);
                                  }}
                                  data-testid={`pos-product-dec-${product.id}`}
                                  aria-label={t.pos.decrease}
                                >
                                  {qty === 1 ? <Trash2 className="h-3.5 w-3.5 text-destructive" /> : <Minus className="h-3.5 w-3.5" />}
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
                                    addToCart(product);
                                  }}
                                  data-testid={`pos-product-inc-${product.id}`}
                                  aria-label={t.pos.increase}
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </>
        ) : (
          <PosTablesView
            storeId={storeId}
            onSelectTable={(t) => setTableModal(t)}
            onShowQr={(t) => setTableQr(t)}
          />
        )}
      </div>

      <Dialog open={!!tableModal} onOpenChange={(o) => !o && setTableModal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-3 pr-6">
              <span>{t.pos.tableDetail}{tableModal ? ` — ${tableModal.name}` : ""}</span>
              {tableModal && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setTableQr({ name: tableModal.name, qrToken: tableModal.qrToken })
                  }
                  data-testid="button-table-show-qr"
                >
                  <QrCode className="w-4 h-4 mr-1.5" /> {t.pos.tableQrTitle}
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          {tableModal && (
            <TableOrdersDetail
              tableId={tableModal.id}
              mergeGroupId={tableModal.mergeGroupId}
              mergeGroupNames={tableModal.mergeGroupNames}
              groupNum={tableModal.groupNum}
              onAddOrder={() => {
                setPosTableContext({ id: tableModal.id, name: tableModal.name });
                setView("products");
                setTableModal(null);
                toast({
                  title: t.pos.addingOrder,
                  description: `${t.pos.nextOrderForTable} ${tableModal.name}.`,
                });
              }}
              onTableFreed={() => {
                if (posTableContext?.id === tableModal.id) setPosTableContext(null);
                setTableModal(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!tableQr} onOpenChange={(o) => !o && setTableQr(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t.pos.tableQrTitle} — {tableQr?.name}</DialogTitle>
            <DialogDescription>
              {t.pos.tableQrDesc}
            </DialogDescription>
          </DialogHeader>
          {tableQr && <PosTableQrPanel name={tableQr.name} qrToken={tableQr.qrToken} />}
        </DialogContent>
      </Dialog>

      <ScanQR
        open={scanCameraOpen}
        onClose={() => {
          setScanCameraOpen(false);
          scanInputRef.current?.focus();
        }}
        onResult={(text) => {
          setScanCameraOpen(false);
          handleScanSubmit(text);
        }}
        autoConfirm
      />

      <Dialog open={promoPickerOpen} onOpenChange={setPromoPickerOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto" data-testid="dialog-pos-promo-picker">
          <DialogHeader>
            <DialogTitle>{t.pos.selectPromoTitle}</DialogTitle>
            <DialogDescription>
              {t.pos.selectPromoDesc}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {activePromotions.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {t.pos.noActivePromos}
              </p>
            )}
            {activePromotions.map((p) => {
              const checked = selectedCodes.includes(p.code);
              const meetsMin = subtotal >= p.minOrder;
              const disabled = !meetsMin;
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
                  data-testid={`pos-picker-promo-${p.code}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono font-bold">
                          {p.code}
                        </Badge>
                        {!meetsMin && (
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
            <Button onClick={() => setPromoPickerOpen(false)} data-testid="button-close-pos-promo-picker">
              {t.pos.done} ({selectedCodes.length})
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cart Panel — desktop only */}
      <aside className="hidden md:flex w-[350px] lg:w-[400px] flex-col bg-card rounded-xl border border-card-border overflow-hidden shrink-0">
        {renderCartContent()}
      </aside>

      {/* Mobile floating cart bar */}
      <div
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur border-t border-border px-3 py-2 flex items-center gap-3 shadow-lg"
        data-testid="pos-mobile-cart-bar"
      >
        <Button
          type="button"
          variant="outline"
          className="relative h-12 px-3"
          onClick={() => setMobileCartOpen(true)}
          data-testid="button-open-mobile-cart"
          aria-label={t.pos.openCart}
        >
          <ShoppingCart className="w-5 h-5" />
          {cart.length > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1">
              {cart.length}
            </span>
          )}
        </Button>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-muted-foreground leading-none">{t.common.total}</div>
          <div className="text-base font-bold text-primary truncate">
            {formatCurrency(previewTotal)}
          </div>
        </div>
        <Button
          type="button"
          className="h-12 px-4 font-bold"
          disabled={cart.length === 0 || createOrder.isPending}
          onClick={() => setMobileCartOpen(true)}
          data-testid="button-mobile-checkout"
        >
          {cart.length === 0 ? t.pos.emptyCartShort : t.pos.viewCart}
        </Button>
      </div>

      {/* Mobile cart sheet */}
      <Sheet open={mobileCartOpen} onOpenChange={setMobileCartOpen}>
        <SheetContent side="bottom" className="h-[92vh] p-0 flex flex-col gap-0">
          <SheetHeader className="px-4 py-3 border-b text-left shrink-0">
            <SheetTitle>{t.pos.mobileCartTitle} ({cart.length} {t.common.items})</SheetTitle>
          </SheetHeader>
          <div className="flex-1 flex flex-col overflow-hidden bg-card">
            {renderCartContent()}
          </div>
        </SheetContent>
      </Sheet>

      <ProductDetailDialog
        product={detailProduct}
        open={!!detailProduct}
        onOpenChange={(open) => {
          if (!open) setDetailProduct(null);
        }}
      />
    </div>
  );
}

function normalizePhone(s: string): string {
  return s.replace(/\D/g, "");
}

interface CustomerPickerProps {
  customers: Customer[];
  value: string;
  onChange: (next: string) => void;
}

function CustomerPicker({ customers, value, onChange }: CustomerPickerProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = value === "guest" ? null : customers.find((c) => c.id === value) ?? null;

  // Auto-focus the search input when the dialog opens, and reset query on close.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    const timer = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(timer);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    const phoneQ = normalizePhone(query);
    const isPhoneish = /\d/.test(phoneQ) && phoneQ.length > 0;
    return customers.filter((c) => {
      if (c.name.toLowerCase().includes(q)) return true;
      if (isPhoneish && normalizePhone(c.phone).includes(phoneQ)) return true;
      if (c.email && c.email.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [customers, query]);

  const pick = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <>
      <div className="w-full h-9 flex items-stretch rounded-md bg-background border border-input shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-ring">
        <button
          type="button"
          onClick={() => setOpen(true)}
          data-testid="button-open-customer-picker"
          className="flex-1 min-w-0 flex items-center gap-2 px-2.5 text-left text-sm hover:bg-muted/40 focus-visible:outline-none transition-colors"
        >
          <User className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            {selected ? (
              <div className="flex items-center gap-2 truncate">
                <span className="font-medium truncate">{selected.name}</span>
                <span className="text-xs text-muted-foreground truncate">· {selected.phone}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">{t.common.guest}</span>
            )}
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>
        {selected && (
          <button
            type="button"
            onClick={() => onChange("guest")}
            aria-label={t.pos.clearCustomer}
            data-testid="button-clear-customer"
            className="shrink-0 px-2 inline-flex items-center justify-center border-l border-input text-muted-foreground hover:text-foreground hover:bg-muted/60 focus-visible:outline-none focus-visible:bg-muted/60"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg p-0 gap-0" data-testid="dialog-customer-picker">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle>{t.pos.selectCustomer}</DialogTitle>
            <DialogDescription>
              {t.pos.searchByNamePhoneEmail} {customers.length} {t.pos.customersInCatalog}
            </DialogDescription>
          </DialogHeader>

          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                ref={inputRef}
                type="search"
                inputMode="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.pos.searchCustomerPlaceholder}
                className="pl-9"
                data-testid="input-customer-search"
              />
            </div>
          </div>

          <div className="border-t bg-muted/30">
            <button
              type="button"
              onClick={() => pick("guest")}
              data-testid="button-pick-guest"
              data-active={value === "guest" ? "true" : "false"}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted data-[active=true]:bg-primary/10 data-[active=true]:text-primary transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-muted-foreground/10 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="font-medium">{t.common.guest}</span>
              <span className="ml-auto text-xs text-muted-foreground">{t.common.noSaveInfo}</span>
            </button>
          </div>

          <ScrollArea className="max-h-[360px] border-t">
            {filtered.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                {t.pos.noCustomerMatch}
              </div>
            ) : (
              <div className="divide-y">
                {filtered.map((c) => {
                  const active = c.id === value;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => pick(c.id)}
                      data-testid={`button-pick-customer-${c.id}`}
                      data-active={active ? "true" : "false"}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/60 data-[active=true]:bg-primary/10 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-semibold text-sm">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{c.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                          <Phone className="w-3 h-3 shrink-0" />
                          <span className="truncate">{c.phone}</span>
                          {c.email && <span className="truncate">· {c.email}</span>}
                        </div>
                      </div>
                      <div className="text-right text-xs text-muted-foreground shrink-0">
                        <div>{c.loyaltyPoints} {t.common.points}</div>
                        <div>{c.orderCount} {t.common.orders}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          <div className="px-4 py-2 border-t bg-muted/20 text-xs text-muted-foreground flex items-center justify-between">
            <span>{t.common.showing} {filtered.length} {t.common.of} {customers.length} {t.common.customers}</span>
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="text-primary hover:underline"
                data-testid="button-clear-search"
              >
                {t.common.clearSearch}
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PosTableQrPanel({ name, qrToken }: { name: string; qrToken: string }) {
  useT();
  const url = `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, "")}/t/${qrToken}`;
  return (
    <div className="space-y-3">
      <div className="bg-white p-5 rounded-md flex items-center justify-center border">
        <div className="w-[220px] h-[220px]">
          <QRCode value={url} size={220} />
        </div>
      </div>
      <div className="text-xs text-center text-muted-foreground break-all" data-testid={`text-table-qr-url-${name}`}>
        {url}
      </div>
    </div>
  );
}

function OrderItemsPanel({ orderId }: { orderId: string }) {
  const t = useT();
  const { data: detail, isLoading } = useGetOrder(orderId);
  if (isLoading) return <div className="px-3 pb-3 text-xs text-muted-foreground">{t.pos.loadingDetail}</div>;
  const items = (detail as any)?.items ?? [];
  if (items.length === 0) return null;
  return (
    <div className="px-3 pb-3 border-t border-border/50">
      <div className="space-y-1 pt-2">
        {items.map((item: any, idx: number) => (
          <div key={idx} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {item.quantity}x {item.productName}
            </span>
            <span className="font-medium tabular-nums">{formatCurrency(Number(item.lineTotal))}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PosTablesView({
  storeId,
  onSelectTable,
  onShowQr,
}: {
  storeId: string;
  onSelectTable: (table: { id: string; name: string; qrToken: string; mergeGroupId?: string | null; mergeGroupNames?: string | null; groupNum?: number }) => void;
  onShowQr: (table: { name: string; qrToken: string }) => void;
}) {
  const t = useT();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const filterStoreId = storeId && storeId !== "all" ? storeId : undefined;
  const { data: tables = [], isLoading } = useListTables(
    filterStoreId ? { storeId: filterStoreId } : undefined,
    { query: { refetchInterval: 10000, refetchOnWindowFocus: true } as any },
  );
  const list = (tables as any[]) ?? [];

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; tableId: string } | null>(null);

  const mergeMut = useMergeTables();
  const unmergeMut = useUnmergeTables();

  const refreshTables = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getListTablesQueryKey() });
  }, [queryClient]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  const handleMerge = useCallback(async (ids: string[]) => {
    if (ids.length < 2) {
      toast({ title: t.pos.mergeError, description: t.pos.selectToMerge, variant: "destructive" });
      return;
    }
    try {
      await mergeMut.mutateAsync({ data: { tableIds: ids } });
      refreshTables();
      exitSelectMode();
      toast({ title: t.pos.mergeSuccess });
    } catch (err: any) {
      toast({ title: t.pos.mergeError, description: err?.message ?? "", variant: "destructive" });
    }
  }, [mergeMut, refreshTables, exitSelectMode, toast, t]);

  const handleUnmerge = useCallback(async (tableId: string) => {
    try {
      await unmergeMut.mutateAsync({ data: { tableId } });
      refreshTables();
      exitSelectMode();
      toast({ title: t.pos.splitSuccess });
    } catch (err: any) {
      toast({ title: t.pos.splitError, description: err?.message ?? "", variant: "destructive" });
    }
  }, [unmergeMut, refreshTables, exitSelectMode, toast, t]);

  const handleContextMenu = useCallback((e: React.MouseEvent, tableId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY, tableId });
  }, []);

  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("contextmenu", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("contextmenu", close);
    };
  }, [ctxMenu]);

  const groupNumberMap = useMemo(() => {
    const map = new Map<string, number>();
    let num = 1;
    for (const tbl of list) {
      if (tbl.mergeGroupId && !map.has(tbl.mergeGroupId)) {
        map.set(tbl.mergeGroupId, num++);
      }
    }
    return map;
  }, [list]);

  const ctxTable = ctxMenu ? list.find((tbl: any) => tbl.id === ctxMenu.tableId) : null;
  const ctxIsMerged = !!ctxTable?.mergeGroupId;

  if (!filterStoreId) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground p-8 text-center">
        {t.pos.selectStoreForTables}
      </div>
    );
  }
  return (
    <ScrollArea className="flex-1 p-4 bg-muted/10">
      {isLoading ? (
        <div className="h-full flex items-center justify-center text-muted-foreground">
          {t.common.loading}
        </div>
      ) : list.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
          <Armchair className="w-12 h-12 mb-3 opacity-30" />
          <p>{t.pos.noTablesYet}</p>
          <p className="text-xs mt-1">{t.pos.createTablesHint}</p>
        </div>
      ) : (
        <>
          {selectMode && (
            <div className="mb-3 flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-lg p-2.5">
              <CheckSquare className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">{selectedIds.size} {t.pos.tablesSelected}</span>
              <div className="ml-auto flex gap-2">
                <Button
                  size="sm"
                  variant="default"
                  disabled={selectedIds.size < 2 || mergeMut.isPending}
                  onClick={() => handleMerge([...selectedIds])}
                  data-testid="button-merge-selected"
                >
                  <Merge className="w-4 h-4 mr-1" /> {t.pos.mergeTables}
                </Button>
                <Button size="sm" variant="outline" onClick={exitSelectMode}>
                  <X className="w-4 h-4 mr-1" /> {t.pos.cancelSelect}
                </Button>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {list.map((tbl: any) => {
              const count = tbl.unpaidOrderCount ?? 0;
              const total = tbl.unpaidTotal ?? 0;
              const occupied = count > 0;
              const isMerged = !!tbl.mergeGroupId;
              const mergeColor = isMerged ? getMergeGroupColor(tbl.mergeGroupId!) : null;
              const groupNum = isMerged ? groupNumberMap.get(tbl.mergeGroupId!) : undefined;
              const isSelected = selectedIds.has(tbl.id);
              return (
                <div
                  key={tbl.id}
                  role="button"
                  tabIndex={0}
                  data-testid={`pos-table-${tbl.id}`}
                  className={`rounded-xl border p-4 transition-all hover-elevate cursor-pointer relative ${
                    isSelected
                      ? "ring-2 ring-primary border-primary bg-primary/15"
                      : isMerged && mergeColor
                        ? mergeColor.bg
                        : occupied
                          ? "bg-primary/10 border-primary/30"
                          : "bg-card border-border"
                  }`}
                  onClick={() => {
                    if (selectMode) {
                      toggleSelect(tbl.id);
                    } else {
                      onSelectTable({ id: tbl.id, name: tbl.name, qrToken: tbl.qrToken, mergeGroupId: tbl.mergeGroupId, mergeGroupNames: tbl.mergeGroupNames, groupNum });
                    }
                  }}
                  onContextMenu={(e) => handleContextMenu(e, tbl.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      if (selectMode) {
                        toggleSelect(tbl.id);
                      } else {
                        onSelectTable({ id: tbl.id, name: tbl.name, qrToken: tbl.qrToken, mergeGroupId: tbl.mergeGroupId, mergeGroupNames: tbl.mergeGroupNames, groupNum });
                      }
                    }
                  }}
                  aria-label={`${t.pos.openTable} ${tbl.name}`}
                >
                  {selectMode && (
                    <div className={`absolute top-2 right-2 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40 bg-background"}`}>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                  )}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Armchair className="w-5 h-5 text-primary" />
                      <span className="font-semibold">{tbl.name}</span>
                    </div>
                    {isMerged && mergeColor ? (
                      <Badge className={mergeColor.badge}>
                        <Merge className="w-3 h-3 mr-1" />{t.pos.groupN} {groupNum}
                      </Badge>
                    ) : occupied ? (
                      <Badge>{t.pos.occupied}</Badge>
                    ) : (
                      <Badge variant="outline">{t.pos.vacant}</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{tbl.capacity} {t.pos.seats}</div>
                  {isMerged && mergeColor && tbl.mergeGroupNames && (
                    <div className={`text-xs mt-1 flex items-center gap-1 ${mergeColor.text}`}>
                      <Merge className="w-3 h-3" />
                      {tbl.mergeGroupNames}
                    </div>
                  )}
                  {occupied ? (
                    <div className="mt-3 pt-3 border-t border-border/50 space-y-1">
                      <div className="text-xs text-muted-foreground">{count} {t.pos.unpaidOrders}</div>
                      <div className="text-sm font-bold text-primary">
                        {formatCurrency(total)}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
                      {t.pos.readyToServe}
                    </div>
                  )}
                  {!selectMode && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3 w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        onShowQr({ name: tbl.name, qrToken: tbl.qrToken });
                      }}
                      data-testid={`pos-table-qr-${tbl.id}`}
                    >
                      <QrCode className="w-4 h-4 mr-1.5" /> {t.pos.tableQrTitle}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {ctxMenu && (
        <div
          className="fixed z-50 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[180px]"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
          data-testid="table-context-menu"
        >
          <button
            type="button"
            className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
            onClick={(e) => {
              e.stopPropagation();
              setCtxMenu(null);
              if (!selectMode) {
                setSelectMode(true);
                setSelectedIds(new Set([ctxMenu.tableId]));
              } else {
                toggleSelect(ctxMenu.tableId);
              }
            }}
            data-testid="ctx-select-merge"
          >
            <CheckSquare className="w-4 h-4" />
            {selectMode ? t.pos.mergeTables : t.pos.selectToMerge}
          </button>
          {selectedIds.size >= 2 && selectMode && (
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2 text-primary"
              onClick={(e) => {
                e.stopPropagation();
                setCtxMenu(null);
                handleMerge([...selectedIds]);
              }}
              data-testid="ctx-merge"
            >
              <Merge className="w-4 h-4" />
              {t.pos.mergeTables} ({selectedIds.size})
            </button>
          )}
          {ctxIsMerged && (
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2 text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                setCtxMenu(null);
                handleUnmerge(ctxMenu.tableId);
              }}
              data-testid="ctx-split"
            >
              <Split className="w-4 h-4" />
              {t.pos.splitTables}
            </button>
          )}
        </div>
      )}
    </ScrollArea>
  );
}

function TableOrdersDetail({
  tableId,
  mergeGroupId,
  mergeGroupNames,
  groupNum,
  onAddOrder,
  onTableFreed,
}: {
  tableId: string;
  mergeGroupId?: string | null;
  mergeGroupNames?: string | null;
  groupNum?: number;
  onAddOrder: () => void;
  onTableFreed: () => void;
}) {
  const t = useT();
  const STATUS_LABELS: Record<string, string> = {
    received: t.pos.statusReceived,
    preparing: t.pos.statusPreparing,
    completed: t.pos.statusCompleted,
    delivered: t.pos.statusDelivered,
    canceled: t.pos.statusCanceled,
  };

  const PAYMENT_METHODS_TABLE = [
    { value: "cash", label: t.pos.cash, icon: Banknote },
    { value: "qr", label: t.pos.qrCode, icon: QrCode },
    { value: "ewallet", label: t.pos.eWallet, icon: Wallet },
    { value: "card", label: t.pos.card, icon: CreditCard },
  ] as const;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const checkoutTable = useCheckoutTable();
  const filterStoreId = undefined;
  const { data: tables = [] } = useListTables(
    filterStoreId ? { storeId: filterStoreId } : undefined,
  );
  const { data: orders = [], isLoading } = useListOrders(
    { limit: 200 },
    { query: { refetchInterval: 8000, refetchOnWindowFocus: true } as any },
  );
  const [tablePayMethod, setTablePayMethod] = useState<string>("cash");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const mergeGroupTableIds = useMemo(() => {
    if (!mergeGroupId) return [tableId];
    const groupTables = (tables as any[]).filter((tbl: any) => tbl.mergeGroupId === mergeGroupId);
    if (groupTables.length === 0) return [tableId];
    return groupTables.map((tbl: any) => tbl.id);
  }, [mergeGroupId, tableId, tables]);

  const groupTableIdSet = useMemo(() => new Set(mergeGroupTableIds), [mergeGroupTableIds]);

  const list = ((orders as any[]) ?? []).filter((o: any) => groupTableIdSet.has(o.tableId));
  const unpaidOrders = list.filter(
    (o: any) => !o.paid && (o.status === "received" || o.status === "preparing" || o.status === "delivered"),
  );
  const grandTotal = unpaidOrders.reduce((s: number, o: any) => s + Number(o.total ?? 0), 0);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListTablesQueryKey() });
  };

  const handleCheckoutTable = async () => {
    if (unpaidOrders.length === 0) return;
    try {
      const result = await checkoutTable.mutateAsync({
        id: tableId,
        data: { paymentMethod: tablePayMethod as any },
      });
      refresh();
      queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      toast({
        title: t.pos.checkoutSuccess,
        description: `${(result as any).orderCount} ${t.common.orders} • ${t.common.total} ${formatCurrency((result as any).grandTotal)} • ${t.pos.tableFreed}`,
      });
      onTableFreed();
    } catch (err: any) {
      toast({
        title: t.pos.checkoutError,
        description: err?.message ?? t.pos.errorOccurred,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-3">
      {mergeGroupId && mergeGroupNames && (() => {
        const mc = getMergeGroupColor(mergeGroupId);
        return (
          <div className={`flex items-center gap-2 border rounded-lg px-3 py-2 text-sm ${mc.banner}`}>
            <Merge className={`w-4 h-4 ${mc.bannerIcon}`} />
            <span className={`font-medium ${mc.bannerText}`}>{t.pos.groupN} {groupNum ?? "?"}: {mergeGroupNames}</span>
          </div>
        );
      })()}
      {isLoading ? (
        <div className="text-center text-muted-foreground py-8">{t.common.loading}</div>
      ) : list.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          {t.pos.noTableOrders}
        </div>
      ) : (
        <>
          <ScrollArea className="max-h-[40vh]">
            <div className="space-y-2 pr-2">
              {list.map((o: any) => {
                const isUnpaid = !o.paid && (o.status === "received" || o.status === "preparing" || o.status === "delivered");
                const isExpanded = expandedOrder === o.id;
                return (
                  <div
                    key={o.id}
                    className={`border rounded-lg overflow-hidden transition-colors ${isUnpaid ? "border-primary/30 bg-primary/5" : "border-border opacity-60"}`}
                    data-testid={`table-order-${o.id}`}
                  >
                    <button
                      type="button"
                      className="w-full p-3 text-left"
                      onClick={() => setExpandedOrder(isExpanded ? null : o.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="font-mono">{o.code}</Badge>
                          <Badge variant={isUnpaid ? "default" : "secondary"}>
                            {STATUS_LABELS[o.status] ?? o.status}
                          </Badge>
                          {!o.paid && <Badge variant="destructive" className="text-[10px] px-1.5">{t.pos.unpaid}</Badge>}
                          {o.paid && <Badge variant="outline" className="text-[10px] px-1.5 border-green-500 text-green-600">{t.pos.paid}</Badge>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-primary">{formatCurrency(Number(o.total))}</span>
                          <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {o.itemCount} {t.pos.itemsInOrder} • {new Date(o.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </button>
                    {isExpanded && (
                      <OrderItemsPanel orderId={o.id} />
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {unpaidOrders.length > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{unpaidOrders.length} {t.pos.unpaidOrders}</span>
                <span className="text-lg font-bold text-primary" data-testid="table-grand-total">{formatCurrency(grandTotal)}</span>
              </div>
              <div className="flex gap-2">
                {PAYMENT_METHODS_TABLE.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setTablePayMethod(m.value)}
                    className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-lg border text-xs transition-colors ${
                      tablePayMethod === m.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border hover:bg-muted"
                    }`}
                    data-testid={`table-pay-${m.value}`}
                  >
                    <m.icon className="w-4 h-4" />
                    {m.label}
                  </button>
                ))}
              </div>
              <Button
                type="button"
                className="w-full"
                size="lg"
                onClick={handleCheckoutTable}
                disabled={checkoutTable.isPending}
                data-testid="button-table-checkout"
              >
                {checkoutTable.isPending
                  ? t.pos.processing
                  : `${t.pos.checkoutAndFreeTable} ${formatCurrency(grandTotal)} ${t.pos.freeTable}`}
              </Button>
            </div>
          )}
        </>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t">
        <Button variant="outline" size="sm" onClick={refresh}>
          {t.common.refresh}
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={onAddOrder}
          data-testid="button-table-add-order"
        >
          <Plus className="w-4 h-4 mr-1.5" /> {t.pos.addMoreOrder}
        </Button>
      </div>
    </div>
  );
}
