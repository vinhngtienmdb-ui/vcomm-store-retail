import { useEffect, useMemo, useState } from "react";
import { Coffee, ShoppingCart, QrCode, Wifi, WifiOff } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { findBankByBin } from "@/lib/banks";
import { useT, useI18n } from "@/lib/i18n-context";

interface DisplayCartItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  note?: string;
}

interface DisplayStoreInfo {
  id: string;
  name: string;
  bankBin: string;
  bankAccountNumber: string;
  bankAccountName: string;
}

type DisplayMode = "idle" | "cart" | "qr";

interface DisplayState {
  mode: DisplayMode;
  store: DisplayStoreInfo;
  items: DisplayCartItem[];
  subtotal: number;
  paymentMethod: "cash" | "qr" | "card";
}

interface BroadcastMessage {
  type: "state" | "request-state";
  posSessionId?: string;
  payload?: DisplayState;
}

function getQueryParams(): { storeId: string | null; posSessionId: string | null } {
  if (typeof window === "undefined") return { storeId: null, posSessionId: null };
  const params = new URLSearchParams(window.location.search);
  return {
    storeId: params.get("storeId"),
    posSessionId: params.get("posSessionId"),
  };
}

export default function PosCustomerDisplayPage() {
  const t = useT();
  const { lang } = useI18n();
  const { storeId, posSessionId } = useMemo(() => getQueryParams(), []);
  const [state, setState] = useState<DisplayState | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [lastSeenAt, setLastSeenAt] = useState<number>(0);
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const tick = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(tick);
  }, []);

  // Liveness watchdog: if no state message arrives for >15s after we were once
  // connected, mark as disconnected so the cashier knows something's off.
  useEffect(() => {
    if (!connected || !lastSeenAt) return;
    const tick = window.setInterval(() => {
      if (Date.now() - lastSeenAt > 15000) {
        setConnected(false);
      }
    }, 3000);
    return () => window.clearInterval(tick);
  }, [connected, lastSeenAt]);

  useEffect(() => {
    if (!storeId) return;
    const channelName = `vcomm-store-pos-display:${storeId}`;
    const channel = new BroadcastChannel(channelName);

    const onMessage = (ev: MessageEvent<BroadcastMessage>) => {
      const msg = ev.data;
      if (!msg || msg.type !== "state" || !msg.payload) return;
      // If the URL specified a posSessionId, only accept messages from that POS
      // tab (prevents flicker when multiple POS tabs are open for the same store).
      if (posSessionId && msg.posSessionId && msg.posSessionId !== posSessionId) {
        return;
      }
      setState(msg.payload);
      setConnected(true);
      setLastSeenAt(Date.now());
    };
    channel.addEventListener("message", onMessage);
    const requestState = () => {
      try {
        channel.postMessage({
          type: "request-state",
          ...(posSessionId ? { posSessionId } : {}),
        } satisfies BroadcastMessage);
      } catch {
        /* ignore */
      }
    };
    requestState();

    // Heartbeat: re-request state every 5s in case POS opened later
    const reqInterval = window.setInterval(() => {
      if (!connected) requestState();
    }, 5000);

    return () => {
      window.clearInterval(reqInterval);
      channel.removeEventListener("message", onMessage);
      channel.close();
    };
  }, [storeId, posSessionId, connected]);

  if (!storeId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-8 text-center">
        <h1 className="text-2xl font-bold text-destructive">{t.common.error}</h1>
        <p className="text-muted-foreground mt-2">
          URL <code>?storeId=...</code>
        </p>
      </div>
    );
  }

  const localeTag = lang === "en" ? "en-US" : "vi-VN";

  const mode: DisplayMode = state?.mode ?? "idle";
  const isQr = mode === "qr";
  const isCart = mode === "cart";
  const isIdle = mode === "idle";

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 via-background to-primary/5">
      <header className="bg-primary text-primary-foreground px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-primary-foreground/15 p-2 rounded-lg">
            <Coffee className="h-6 w-6" />
          </div>
          <div>
            <div className="font-bold text-xl leading-tight">
              {state?.store.name ?? "VComm Store Retail"}
            </div>
            <div className="text-xs text-primary-foreground/80">
              {now.toLocaleString(localeTag, { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {connected ? (
            <>
              <Wifi className="w-4 h-4 text-green-300" />
              <span>{t.posCustomerDisplay.connected}</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-amber-300" />
              <span>{t.posCustomerDisplay.waitingPos}</span>
            </>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col" data-testid={`display-mode-${mode}`}>
        {isIdle && <IdleScreen storeName={state?.store.name ?? "VComm Store"} />}
        {isCart && state && <CartScreen state={state} />}
        {isQr && state && <QrScreen state={state} />}
      </main>

      <footer className="bg-muted/40 border-t border-border px-6 py-2 text-center text-xs text-muted-foreground">
        {state?.store.name ?? "VComm Store"} — {t.common.brandFooter}
      </footer>
    </div>
  );
}

function IdleScreen({ storeName }: { storeName: string }) {
  const t = useT();
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8" data-testid="display-idle">
      <div className="rounded-full bg-primary/10 p-8 mb-6 animate-pulse">
        <Coffee className="w-24 h-24 text-primary" />
      </div>
      <h1 className="text-5xl font-bold text-primary mb-3">{t.posCustomerDisplay.welcomeTitle}</h1>
      <p className="text-2xl text-foreground/80 mb-8">{t.posCustomerDisplay.welcomeTo} {storeName}</p>
      <p className="text-lg text-muted-foreground max-w-2xl">
        {t.posCustomerDisplay.orderAtCounter}
      </p>
    </div>
  );
}

function CartScreen({ state }: { state: DisplayState }) {
  const t = useT();
  return (
    <div className="flex-1 flex flex-col p-8 max-w-5xl w-full mx-auto" data-testid="display-cart">
      <div className="flex items-center gap-3 mb-6">
        <ShoppingCart className="w-8 h-8 text-primary" />
        <h2 className="text-3xl font-bold">{t.posCustomerDisplay.yourOrder}</h2>
      </div>
      <div className="flex-1 bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
        <div className="grid grid-cols-12 gap-2 px-5 py-3 border-b bg-muted/40 text-sm font-semibold uppercase text-muted-foreground">
          <div className="col-span-7">{t.posCustomerDisplay.productCol}</div>
          <div className="col-span-2 text-center">{t.posCustomerDisplay.quantityCol}</div>
          <div className="col-span-3 text-right">{t.posCustomerDisplay.amountCol}</div>
        </div>
        <div className="flex-1 overflow-auto divide-y divide-border">
          {state.items.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">{t.posCustomerDisplay.emptyCart}</div>
          ) : (
            state.items.map((it) => (
              <div key={it.productId} className="grid grid-cols-12 gap-2 px-5 py-4 items-center">
                <div className="col-span-7">
                  <div className="font-semibold text-lg">{it.name}</div>
                  {it.note && <div className="text-xs text-muted-foreground italic mt-0.5">{t.posCustomerDisplay.noteLabel}: {it.note}</div>}
                  <div className="text-sm text-muted-foreground">{formatCurrency(it.price)} {t.posCustomerDisplay.perItem}</div>
                </div>
                <div className="col-span-2 text-center text-2xl font-bold">{it.quantity}</div>
                <div className="col-span-3 text-right text-xl font-bold text-primary">
                  {formatCurrency(it.price * it.quantity)}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="border-t bg-primary/5 px-5 py-5 flex items-center justify-between">
          <span className="text-2xl font-semibold">{t.posCustomerDisplay.total}</span>
          <span className="text-4xl font-bold text-primary" data-testid="display-total">
            {formatCurrency(state.subtotal)}
          </span>
        </div>
      </div>
      <div className="mt-4 text-center text-muted-foreground">
        {t.posCustomerDisplay.paymentMethod}: <span className="font-semibold text-foreground">{state.paymentMethod === "cash" ? t.posCustomerDisplay.cashPayment : state.paymentMethod === "qr" ? t.posCustomerDisplay.qrPayment : t.posCustomerDisplay.cardPayment}</span>
      </div>
    </div>
  );
}

function QrScreen({ state }: { state: DisplayState }) {
  const t = useT();
  const hasBank = !!(state.store.bankBin && state.store.bankAccountNumber && state.store.bankAccountName);
  const bank = state.store.bankBin ? findBankByBin(state.store.bankBin) : null;
  const qrUrl = hasBank
    ? buildVietQrUrl({
        bin: state.store.bankBin,
        account: state.store.bankAccountNumber,
        amount: state.subtotal,
        accountName: state.store.bankAccountName,
        addInfo: `${state.store.name} POS`,
      })
    : null;

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-8 p-8 max-w-6xl w-full mx-auto" data-testid="display-qr">
      <div className="flex-1 bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
        <div className="px-5 py-3 border-b bg-muted/40 text-sm font-semibold uppercase text-muted-foreground">
          {t.posCustomerDisplay.orderTitle}
        </div>
        <div className="flex-1 overflow-auto divide-y divide-border">
          {state.items.map((it) => (
            <div key={it.productId} className="px-5 py-3 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{it.name}</div>
                <div className="text-xs text-muted-foreground">{t.posCustomerDisplay.qtyLabel}: {it.quantity}</div>
              </div>
              <div className="font-bold shrink-0">{formatCurrency(it.price * it.quantity)}</div>
            </div>
          ))}
        </div>
        <div className="border-t bg-primary/5 px-5 py-4 flex items-center justify-between">
          <span className="text-xl font-semibold">{t.posCustomerDisplay.total}</span>
          <span className="text-3xl font-bold text-primary" data-testid="display-total">
            {formatCurrency(state.subtotal)}
          </span>
        </div>
      </div>

      <div className="lg:w-[420px] flex flex-col items-center justify-center bg-card rounded-xl border border-border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-3">
          <QrCode className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">{t.posCustomerDisplay.scanToPay}</h2>
        </div>
        {qrUrl ? (
          <>
            <div className="bg-white p-4 rounded-lg border-4 border-primary/20 shadow-md" data-testid="display-qr-image">
              <img src={qrUrl} alt="VietQR" className="w-72 h-72 object-contain" />
            </div>
            <div className="mt-5 w-full text-center space-y-1">
              <div className="text-sm text-muted-foreground">{t.posCustomerDisplay.bankName}</div>
              <div className="font-semibold text-lg">{bank?.shortName ?? state.store.bankBin}</div>
              <div className="text-sm text-muted-foreground mt-2">{t.posCustomerDisplay.accountNumber}</div>
              <div className="font-mono font-semibold text-lg">{state.store.bankAccountNumber}</div>
              <div className="text-sm text-muted-foreground mt-2">{t.posCustomerDisplay.accountHolder}</div>
              <div className="font-semibold uppercase">{state.store.bankAccountName}</div>
              <div className="mt-3 text-xs text-muted-foreground">
                {t.posCustomerDisplay.amountLabel}: <span className="font-bold text-primary">{formatCurrency(state.subtotal)}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            <QrCode className="w-16 h-16 mx-auto opacity-30 mb-3" />
            <p className="font-semibold text-foreground">{t.posCustomerDisplay.noBankConfig}</p>
            <p className="text-sm mt-1">{t.posCustomerDisplay.noBankConfigDesc}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function buildVietQrUrl(args: {
  bin: string;
  account: string;
  amount: number;
  accountName: string;
  addInfo: string;
}): string {
  const params = new URLSearchParams();
  if (args.amount > 0) params.set("amount", String(Math.round(args.amount)));
  if (args.addInfo) params.set("addInfo", args.addInfo);
  if (args.accountName) params.set("accountName", args.accountName);
  return `https://img.vietqr.io/image/${encodeURIComponent(args.bin)}-${encodeURIComponent(args.account)}-compact2.png?${params.toString()}`;
}
