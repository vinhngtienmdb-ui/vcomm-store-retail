import { useListOrders, useGetOrder, useUpdateOrderStatus, useAdjustOrderItem, useListStores, useListAvailableCouriers, useAssignOrderCourier, getListOrdersQueryKey, getGetOrderQueryKey, getListAvailableCouriersQueryKey } from "@workspace/api-client-react";
import type { OrderItemAdjustment, OrderItemDetail, AvailableCourier, Order } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useStoreId } from "@/lib/store-context";
import { formatCurrency, formatDate } from "@/lib/format";
import { OrderStatus, OrderChannel } from "@workspace/api-client-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Smartphone, Store as StoreIcon, User, ChevronRight, Check, Receipt, Wallet, AlertTriangle, Pencil, Phone, MessageCircle, Truck, MapPin, X, QrCode } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BankPaymentQr, hasBankInfo } from "@/components/bank-payment-qr";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/components/confirm-provider";
import { useTabs, useCloseSelf } from "@/lib/tabs-context";
import { useState, useEffect, useRef } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/lib/i18n-context";

export default function OrdersPage() {
  const { storeId } = useStoreId();
  const [channel, setChannel] = useState<string>("all");
  const { openTab } = useTabs();
  const t = useT();

  const KANBAN_COLUMNS = [
    { id: OrderStatus.received, title: t.orders.received, color: "border-blue-500", bg: "bg-blue-50 dark:bg-blue-950/20" },
    { id: OrderStatus.preparing, title: t.orders.preparing, color: "border-amber-500", bg: "bg-amber-50 dark:bg-amber-950/20" },
    { id: OrderStatus.completed, title: t.orders.readyCompleted, color: "border-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/20" },
  ];

  const ordersParams = {
    storeId: storeId === 'all' ? undefined : storeId,
    channel: channel === 'all' ? undefined : channel as OrderChannel,
  };
  const { data: orders = [], isLoading } = useListOrders(ordersParams, {
    query: {
      queryKey: getListOrdersQueryKey(ordersParams),
      refetchInterval: 5000,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: true,
    },
  });

  const handleOpenOrder = (orderId: string, orderCode: string) => {
    const shortCode = orderCode.slice(-6);
    openTab({
      key: `order-detail:${orderId}`,
      title: `${t.orders.tabOrderPrefix}${shortCode}`,
      icon: <Receipt className="w-4 h-4" />,
      element: <OrderDetailView orderId={orderId} />,
      closable: true,
    });
  };

  const focusedRef = useRef(false);
  useEffect(() => {
    if (focusedRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const focus = params.get("focusOrder");
    if (!focus) return;
    focusedRef.current = true;
    const match = orders.find((o) => o.id === focus);
    handleOpenOrder(focus, match?.code ?? focus);
    params.delete("focusOrder");
    const qs = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (qs ? `?${qs}` : ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  // Group orders by status
  const groupedOrders = orders.reduce((acc, order) => {
    if (!acc[order.status]) acc[order.status] = [];
    acc[order.status].push(order);
    return acc;
  }, {} as Record<string, typeof orders>);

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">{t.orders.loading}</div>;
  }

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col gap-4 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">{t.orders.title}</h1>
          <p className="text-muted-foreground mt-1">{t.orders.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder={t.orders.channelPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.orders.allChannels}</SelectItem>
              <SelectItem value={OrderChannel.pos}>{t.orders.posChannel}</SelectItem>
              <SelectItem value={OrderChannel.online}>{t.orders.onlineChannel}</SelectItem>
              <SelectItem value={OrderChannel.table}>{t.orders.tableChannel}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 md:overflow-x-auto">
        <div className="flex flex-col md:flex-row gap-4 md:h-full md:min-w-[900px] pb-4">
          {KANBAN_COLUMNS.map(col => (
            <div key={col.id} className={`w-full md:flex-1 flex flex-col rounded-xl border-t-4 border-l border-r border-b border-border/50 ${col.color} bg-card overflow-hidden`}>
              <div className="p-3 border-b border-border/50 bg-muted/10 font-bold flex justify-between items-center">
                {col.title}
                <Badge variant="secondary" className="font-mono">{groupedOrders[col.id]?.length || 0}</Badge>
              </div>
              <ScrollArea className={`md:flex-1 max-h-[60vh] md:max-h-none p-3 ${col.bg}`}>
                <div className="space-y-3">
                  {(groupedOrders[col.id] || []).map(order => (
                    <OrderCard 
                      key={order.id} 
                      order={order} 
                      onClick={() => handleOpenOrder(order.id, order.code)} 
                    />
                  ))}
                  {(!groupedOrders[col.id] || groupedOrders[col.id].length === 0) && (
                    <div className="text-center text-muted-foreground text-sm py-8 opacity-50 font-medium border-2 border-dashed border-current rounded-lg">
                      {t.orders.empty}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          ))}
          
          {/* Delivered/Canceled side column (compact) */}
          <div className="w-full md:w-[280px] flex flex-col rounded-xl border border-border/50 bg-card overflow-hidden opacity-80">
            <div className="p-3 border-b border-border/50 bg-muted/10 font-bold">{t.orders.historyToday}</div>
            <ScrollArea className="md:flex-1 max-h-[50vh] md:max-h-none p-3 bg-muted/5">
              <div className="space-y-2">
                {orders.filter(o => o.status === OrderStatus.delivered || o.status === OrderStatus.canceled).map(order => (
                  <div key={order.id} onClick={() => handleOpenOrder(order.id, order.code)} className="bg-background border border-border/50 rounded-lg p-2 text-sm cursor-pointer hover:border-primary/50" data-testid={`history-order-${order.code}`}>
                    <div className="flex justify-between items-center font-mono font-bold mb-1">
                      #{order.code}
                      <Badge variant="outline" className={`text-[10px] px-1 py-0 h-4 ${order.status === 'canceled' ? 'text-destructive' : 'text-emerald-600'}`}>
                        {order.status === 'canceled' ? t.orders.canceled : t.orders.delivered}
                      </Badge>
                    </div>
                    <div className="text-muted-foreground flex justify-between">
                      <span>{formatDate(order.createdAt, "HH:mm")}</span>
                      <span>{formatCurrency(order.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>

    </div>
  );
}

function OrderCard({ order, onClick }: { order: any, onClick: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateStatus = useUpdateOrderStatus();
  const t = useT();

  const handleNextStatus = (e: React.MouseEvent) => {
    e.stopPropagation();
    let nextStatus: OrderStatus | null = null;
    if (order.status === OrderStatus.received) nextStatus = OrderStatus.preparing;
    else if (order.status === OrderStatus.preparing) nextStatus = OrderStatus.completed;
    else if (order.status === OrderStatus.completed) nextStatus = OrderStatus.delivered;

    if (nextStatus) {
      updateStatus.mutate(
        { id: order.id, data: { status: nextStatus } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
          }
        }
      );
    }
  };

  const isOnline = order.channel === OrderChannel.online;
  const isTable = order.channel === OrderChannel.table;

  return (
    <Card 
      className={`border border-border/60 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer overflow-hidden ${isTable ? 'border-l-4 border-l-amber-500' : isOnline ? 'border-l-4 border-l-purple-500' : ''}`}
      onClick={onClick}
    >
      <div className="p-3">
        <div className="flex justify-between items-start mb-2">
          <div className="font-mono font-bold text-lg leading-none">#{order.code.slice(-6)}</div>
          <div className="flex items-center text-muted-foreground text-xs font-medium bg-muted/50 px-2 py-1 rounded-md">
            <Clock className="w-3 h-3 mr-1" />
            {formatDate(order.createdAt, "HH:mm")}
          </div>
        </div>
        
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${isTable ? 'bg-amber-50 text-amber-700 border-amber-200' : isOnline ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-slate-100 text-slate-700'}`}>
            {isTable ? <QrCode className="w-3 h-3 mr-1" /> : isOnline ? <Smartphone className="w-3 h-3 mr-1" /> : <StoreIcon className="w-3 h-3 mr-1" />}
            {isTable ? t.orders.tableChannel : isOnline ? t.orders.onlineChannel : t.orders.posChannel}
          </Badge>
          <span className="text-xs font-medium text-muted-foreground truncate flex-1 flex items-center">
            <User className="w-3 h-3 mr-1" /> {order.customerName || t.common.guest}
          </span>
        </div>

        <div className="space-y-1 mb-3">
          <div className="text-sm font-medium flex justify-between">
            <span>{order.itemCount} {t.orders.products}</span>
            <span className="text-primary font-bold">{formatCurrency(order.total)}</span>
          </div>
          {order.note && (
            <div className="text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400 p-1.5 rounded border border-amber-200/50">
              <span className="font-bold">{t.orders.note}</span> {order.note}
            </div>
          )}
        </div>

        {order.status !== OrderStatus.delivered && order.status !== OrderStatus.canceled && (
          <Button 
            className="w-full h-8 text-xs font-bold" 
            variant={order.status === OrderStatus.received ? "secondary" : "default"}
            onClick={handleNextStatus}
            disabled={updateStatus.isPending}
          >
            {order.status === OrderStatus.received && <>{t.orders.startPreparing} <ChevronRight className="w-4 h-4 ml-1"/></>}
            {order.status === OrderStatus.preparing && <>{t.orders.markComplete} <Check className="w-4 h-4 ml-1"/></>}
            {order.status === OrderStatus.completed && <>{t.orders.deliver} <Check className="w-4 h-4 ml-1"/></>}
          </Button>
        )}
      </div>
    </Card>
  );
}

function OrderDetailView({ orderId }: { orderId: string }) {
  const { data: order, isLoading } = useGetOrder(orderId, {
    query: {
      enabled: !!orderId,
      queryKey: getGetOrderQueryKey(orderId),
      refetchInterval: 5000,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: true,
    },
  });
  const { data: stores = [] } = useListStores();
  const queryClient = useQueryClient();
  const updateStatus = useUpdateOrderStatus();
  const closeSelf = useCloseSelf();
  const { toast } = useToast();
  const confirm = useConfirm();
  const t = useT();
  const [showPayQr, setShowPayQr] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState<OrderItemDetail | null>(null);
  const [pickCourierOpen, setPickCourierOpen] = useState(false);

  if (isLoading || !order) return <div className="py-12 text-center" data-testid="order-detail-loading">{t.orders.loadingDetail}</div>;

  const orderStore = stores.find((s) => s.id === order.storeId);
  const storeHasBank = hasBankInfo(orderStore);
  const canShowQr = order.status !== OrderStatus.canceled && order.total > 0;

  let nextStatus: OrderStatus | null = null;
  let nextLabel = "";
  if (order.status === OrderStatus.received) {
    nextStatus = OrderStatus.preparing;
    nextLabel = t.orders.startPreparing;
  } else if (order.status === OrderStatus.preparing) {
    nextStatus = OrderStatus.completed;
    nextLabel = t.orders.markComplete;
  } else if (order.status === OrderStatus.completed) {
    nextStatus = OrderStatus.delivered;
    nextLabel = t.orders.deliver;
  }

  const handleNextStatus = () => {
    if (!nextStatus) return;
    const target = nextStatus;
    updateStatus.mutate(
      { id: order.id, data: { status: target } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetOrderQueryKey(orderId) });
          toast({ title: `${t.orders.tabOrderPrefix}${order.code}: ${nextLabel}` });
          if (target === OrderStatus.delivered) {
            closeSelf();
          }
        },
        onError: () => {
          toast({ variant: "destructive", title: t.orders.updateFailed });
        },
      }
    );
  };

  const handleCancel = async () => {
    const ok = await confirm({
      title: `${t.orders.cancelConfirmTitle} #${order.code}?`,
      description: t.orders.cancelConfirmDesc,
      confirmText: t.orders.cancelBtn,
      cancelText: t.orders.keepBtn,
      variant: "warning",
    });
    if (!ok) return;
    updateStatus.mutate(
      { id: order.id, data: { status: OrderStatus.canceled } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetOrderQueryKey(orderId) });
          toast({ title: `${t.orders.tabOrderPrefix}${order.code} ${t.orders.orderCanceled}` });
          closeSelf();
        }
      }
    );
  };

  return (
    <div className="max-w-3xl" data-testid={`order-detail-${orderId}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold font-mono text-primary">{t.orders.tabOrderPrefix}{order.code}</h2>
        <Badge className="text-sm px-3 py-1" data-testid="badge-order-status">{order.status}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm bg-muted/30 p-4 rounded-xl mb-4">
        <div>
          <span className="text-muted-foreground block mb-1">{t.orders.customer}</span>
          <span className="font-medium">{order.customerName || t.common.guest}</span>
        </div>
        <div>
          <span className="text-muted-foreground block mb-1">{t.orders.time}</span>
          <span className="font-medium">{formatDate(order.createdAt)}</span>
        </div>
        <div>
          <span className="text-muted-foreground block mb-1">{t.orders.branch}</span>
          <span className="font-medium">{order.storeName}</span>
        </div>
        <div>
          <span className="text-muted-foreground block mb-1">{t.orders.payment}</span>
          <span className="font-medium uppercase">{order.paymentMethod}</span>
        </div>
        {order.customerPhone && (() => {
          const raw = order.customerPhone.replace(/[^\d+]/g, "");
          const zaloNumber = raw.startsWith("+84")
            ? raw.slice(1)
            : raw.startsWith("0")
              ? `84${raw.slice(1)}`
              : raw;
          return (
            <div className="col-span-2">
              <span className="text-muted-foreground block mb-1">{t.orders.phone}</span>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium font-mono">{order.customerPhone}</span>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="h-8"
                  data-testid="button-call-phone"
                >
                  <a href={`tel:${raw}`} aria-label={t.orders.callPhone}>
                    <Phone className="h-3.5 w-3.5 mr-1" />
                    {t.orders.callPhone}
                  </a>
                </Button>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="h-8 text-blue-600 hover:text-blue-700 border-blue-200"
                  data-testid="button-chat-zalo"
                >
                  <a
                    href={`https://zalo.me/${zaloNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t.orders.chatZalo}
                  >
                    <MessageCircle className="h-3.5 w-3.5 mr-1" />
                    {t.orders.chatZalo}
                  </a>
                </Button>
              </div>
            </div>
          );
        })()}
      </div>

      {order.orderType === "delivery" && (
        <DeliverySection
          order={order}
          onPickCourier={() => setPickCourierOpen(true)}
        />
      )}

      <ScrollArea className="max-h-[40vh] border rounded-lg p-0 mb-4">
        <table className="w-full text-sm">
          <thead className="bg-muted sticky top-0">
            <tr>
              <th className="text-left p-3 font-medium">{t.orders.product}</th>
              <th className="text-center p-3 font-medium">{t.orders.qty}</th>
              <th className="text-right p-3 font-medium">{t.orders.unitPrice}</th>
              <th className="text-right p-3 font-medium">{t.orders.lineTotal}</th>
              <th className="w-10 p-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {order.items.map((item, idx) => (
              <tr key={item.id ?? idx} data-testid={`order-item-row-${item.id}`}>
                <td className="p-3">
                  <div className="font-medium">{item.productName}</div>
                  {item.note && <div className="text-xs text-amber-600 mt-1">{t.orders.note} {item.note}</div>}
                </td>
                <td className="p-3 text-center">{item.quantity}</td>
                <td className="p-3 text-right">{formatCurrency(item.unitPrice)}</td>
                <td className="p-3 text-right font-medium">{formatCurrency(item.lineTotal)}</td>
                <td className="p-3 text-right">
                  {(order.status === OrderStatus.preparing || order.status === OrderStatus.completed) && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => setAdjustingItem(item)}
                      aria-label={t.orders.adjustItem}
                      title={t.orders.adjustItem}
                      data-testid={`button-adjust-item-${item.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>

      {order.adjustments && order.adjustments.length > 0 && (
        <div
          className="border border-amber-200 bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3 mb-4 space-y-2"
          data-testid="order-adjustments-history"
        >
          <div className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-200 text-sm">
            <AlertTriangle className="h-4 w-4" />
            {t.orders.adjustHistoryTitle} ({order.adjustments.length})
          </div>
          <ul className="space-y-1.5 text-sm">
            {order.adjustments.map((a: OrderItemAdjustment) => (
              <li key={a.id} className="flex flex-col" data-testid={`adjustment-${a.id}`}>
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-medium">{a.productName}</span>
                  <span className="text-muted-foreground text-xs">
                    {a.newQuantity === 0
                      ? `${t.orders.adjustHistoryRemoved} (${a.originalQuantity} → 0)`
                      : `${t.orders.adjustHistoryReducedFrom} ${a.originalQuantity} ${t.orders.adjustHistoryTo} ${a.newQuantity}`}
                    {" · "}
                    {t.orders.adjustHistoryRefund} {formatCurrency(a.refundAmount)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(a.createdAt)}
                  {a.staffName ? ` · ${t.orders.adjustHistoryBy} ${a.staffName}` : ""}
                </div>
                <div className="text-sm text-amber-900 dark:text-amber-100 whitespace-pre-wrap">
                  “{a.reason}”
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex justify-end mb-6">
        <div className="w-[250px] space-y-2 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>{t.orders.subtotal}</span>
            <span>{formatCurrency(order.subtotal)}</span>
          </div>
          {order.promotions && order.promotions.length > 0 && (
            <>
              {order.promotions.map((p) => (
                <div key={p.promotionId} className="flex justify-between text-emerald-600" data-testid={`order-promo-${p.code}`}>
                  <span className="truncate" title={p.name}>
                    <span className="font-mono font-semibold">{p.code}</span> · {p.name}
                  </span>
                  <span>-{formatCurrency(p.discountAmount)}</span>
                </div>
              ))}
              <div className="flex justify-between text-emerald-700 font-semibold border-t border-emerald-200 pt-1">
                <span>{t.orders.totalPromo}</span>
                <span>-{formatCurrency(order.discount)}</span>
              </div>
            </>
          )}
          {order.discount > 0 && (!order.promotions || order.promotions.length === 0) && (
            <div className="flex justify-between text-emerald-600">
              <span>{t.orders.promo} {order.promotionCode ? `(${order.promotionCode})` : ''}</span>
              <span>-{formatCurrency(order.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold pt-2 border-t">
            <span>{t.orders.total}</span>
            <span className="text-primary">{formatCurrency(order.total)}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-between border-t pt-4 gap-2 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {order.status !== OrderStatus.canceled && order.status !== OrderStatus.delivered && (
            <Button variant="outline" className="text-destructive border-destructive" onClick={handleCancel} data-testid="button-cancel-order">
              {t.orders.cancelOrder}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setShowPayQr(true)}
            disabled={!storeHasBank || !canShowQr}
            title={
              !storeHasBank
                ? t.orders.noBankSetup
                : !canShowQr
                ? t.orders.qrUnavailable
                : undefined
            }
            data-testid="button-create-payment-qr"
          >
            <Wallet className="w-4 h-4 mr-2" />
            {t.orders.createPaymentQr}
          </Button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="ghost" onClick={closeSelf} data-testid="button-close-order-tab">{t.orders.closeTab}</Button>
          {nextStatus && (
            <Button
              size="lg"
              onClick={handleNextStatus}
              disabled={updateStatus.isPending}
              data-testid="button-next-status-detail"
            >
              {updateStatus.isPending ? t.orders.updating : nextLabel}
              <Check className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      <AdjustItemDialog
        orderId={order.id}
        item={adjustingItem}
        open={!!adjustingItem}
        onOpenChange={(open) => {
          if (!open) setAdjustingItem(null);
        }}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetOrderQueryKey(orderId) });
          toast({ title: t.orders.adjustSuccess });
          setAdjustingItem(null);
        }}
      />

      <PickCourierDialog
        open={pickCourierOpen}
        onOpenChange={setPickCourierOpen}
        orderId={order.id}
        currentCourierId={order.courierId ?? null}
      />

      <Dialog open={showPayQr} onOpenChange={setShowPayQr}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.orders.paymentQrTitle} #{order.code}</DialogTitle>
            <DialogDescription>
              {t.orders.paymentQrDesc}
            </DialogDescription>
          </DialogHeader>
          {orderStore && storeHasBank && (
            <BankPaymentQr
              store={orderStore}
              amount={order.total}
              addInfo={order.code}
              title={`Don hang ${order.code}`}
              subTitle={orderStore.name}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AdjustItemDialog({
  orderId,
  item,
  open,
  onOpenChange,
  onSuccess,
}: {
  orderId: string;
  item: OrderItemDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const t = useT();
  const { toast } = useToast();
  const adjust = useAdjustOrderItem();
  const [newQty, setNewQty] = useState<string>("0");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens for a different item
  useEffect(() => {
    if (open && item) {
      setNewQty("0");
      setReason("");
      setError(null);
    }
  }, [open, item?.id]);

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
  };

  if (!item) return null;

  const refund = item.unitPrice * Math.max(0, item.quantity - (Number(newQty) || 0));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qtyNum = Number(newQty);
    if (!Number.isInteger(qtyNum) || qtyNum < 0 || qtyNum >= item.quantity) {
      setError(t.orders.adjustValidationQty);
      return;
    }
    if (reason.trim().length < 3) {
      setError(t.orders.adjustValidationReason);
      return;
    }
    setError(null);
    adjust.mutate(
      { id: orderId, itemId: item.id, data: { newQuantity: qtyNum, reason: reason.trim() } },
      {
        onSuccess: () => {
          onSuccess();
        },
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : t.orders.adjustFailed;
          toast({ variant: "destructive", title: t.orders.adjustFailed, description: msg });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md" data-testid="dialog-adjust-item">
        <DialogHeader>
          <DialogTitle>{t.orders.adjustItemTitle}</DialogTitle>
          <DialogDescription>{t.orders.adjustItemDesc}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg border p-3 bg-muted/40">
            <div className="font-medium" data-testid="text-adjust-product-name">{item.productName}</div>
            <div className="text-sm text-muted-foreground mt-1">
              {t.orders.adjustCurrentQty}: <span className="font-semibold tabular-nums">{item.quantity}</span>
              {" · "}
              {formatCurrency(item.unitPrice)} / {t.orders.qty.toLowerCase()}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="adjust-new-qty">{t.orders.adjustNewQty}</Label>
            <Input
              id="adjust-new-qty"
              type="number"
              min={0}
              max={item.quantity - 1}
              step={1}
              value={newQty}
              onChange={(e) => setNewQty(e.target.value)}
              data-testid="input-adjust-new-qty"
            />
            <p className="text-xs text-muted-foreground">{t.orders.adjustNewQtyHint}</p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="adjust-reason">{t.orders.adjustReason}</Label>
            <Textarea
              id="adjust-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t.orders.adjustReasonPlaceholder}
              rows={3}
              maxLength={500}
              data-testid="input-adjust-reason"
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t.orders.adjustHistoryRefund}</span>
            <span className="font-semibold text-primary tabular-nums" data-testid="text-adjust-refund">
              {formatCurrency(refund)}
            </span>
          </div>

          {error && (
            <div className="text-sm text-destructive" data-testid="text-adjust-error">{error}</div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={adjust.isPending}
              data-testid="button-adjust-cancel"
            >
              {t.common.cancel}
            </Button>
            <Button
              type="submit"
              disabled={adjust.isPending}
              data-testid="button-adjust-submit"
            >
              {adjust.isPending ? t.orders.updating : t.orders.adjustSubmit}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function toZaloNumber(raw: string): string {
  const cleaned = raw.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+84")) return cleaned.slice(1);
  if (cleaned.startsWith("0")) return `84${cleaned.slice(1)}`;
  return cleaned;
}

function DeliverySection({
  order,
  onPickCourier,
}: {
  order: Order;
  onPickCourier: () => void;
}) {
  const t = useT();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const assign = useAssignOrderCourier();
  const confirm = useConfirm();

  const courierPhoneRaw = order.courierPhone ?? "";
  const courierZaloNumber = courierPhoneRaw ? toZaloNumber(courierPhoneRaw) : "";

  const statusLabel: Record<string, string> = {
    pending_courier: t.orders.deliveryStatusPendingCourier,
    assigned: t.orders.deliveryStatusAssigned,
    picked_up: t.orders.deliveryStatusPickedUp,
    delivered: t.orders.deliveryStatusDelivered,
    failed: t.orders.deliveryStatusFailed,
  };

  const canChange =
    order.deliveryStatus !== "picked_up" && order.deliveryStatus !== "delivered";

  const handleUnassign = async () => {
    const ok = await confirm({
      title: t.orders.unassignCourier,
      description: order.courierName ?? "",
      confirmText: t.orders.unassignCourier,
      cancelText: t.common.cancel,
      variant: "warning",
    });
    if (!ok) return;
    assign.mutate(
      { id: order.id, data: { courierId: null } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetOrderQueryKey(order.id) });
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
          toast({ title: t.orders.courierUnassignedToast });
        },
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : t.orders.courierAssignFailed;
          toast({ variant: "destructive", title: t.orders.courierAssignFailed, description: msg });
        },
      },
    );
  };

  return (
    <Card
      className="p-4 mb-4 border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/10"
      data-testid="order-delivery-section"
    >
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <Truck className="h-5 w-5 text-emerald-700" />
        <span className="font-semibold text-emerald-800 dark:text-emerald-200">
          {t.orders.deliverySectionTitle}
        </span>
        {order.deliveryOptionLabel && (
          <Badge variant="secondary" data-testid="badge-delivery-option">
            {order.deliveryOptionLabel}
          </Badge>
        )}
        {order.deliveryStatus && (
          <Badge variant="outline" data-testid="badge-delivery-status">
            {statusLabel[order.deliveryStatus] ?? order.deliveryStatus}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        {order.deliveryOptionLabel && (
          <div className="sm:col-span-2">
            <span className="text-muted-foreground block mb-1">{t.shopDetail.deliveryOptionLabel}</span>
            <span className="font-medium" data-testid="text-delivery-option-label">
              {order.deliveryOptionLabel}
            </span>
          </div>
        )}
        <div className="sm:col-span-2">
          <span className="text-muted-foreground block mb-1">{t.orders.deliveryAddressLabel}</span>
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
            <span className="font-medium" data-testid="text-delivery-address">
              {order.deliveryAddress || "-"}
            </span>
          </div>
        </div>
        {typeof order.distanceKm === "number" && (
          <div>
            <span className="text-muted-foreground block mb-1">{t.orders.deliveryDistance}</span>
            <span className="font-medium">{order.distanceKm.toFixed(2)} km</span>
          </div>
        )}
        {typeof order.shippingFee === "number" && order.shippingFee > 0 && (
          <div>
            <span className="text-muted-foreground block mb-1">{t.orders.deliveryShippingFee}</span>
            <span className="font-medium">{formatCurrency(order.shippingFee)}</span>
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-emerald-200/60">
        <span className="text-muted-foreground block mb-2 text-sm">{t.orders.courierAssigned}</span>
        {order.courierId ? (
          <div className="flex flex-wrap items-center gap-2" data-testid="courier-assigned-block">
            <span className="font-medium" data-testid="text-courier-name">
              {order.courierName}
            </span>
            {order.courierPhone && (
              <span className="font-mono text-sm text-muted-foreground">{order.courierPhone}</span>
            )}
            {order.courierHasZalo && (
              <Badge variant="secondary" className="text-xs">
                {t.orders.courierZaloBadge}
              </Badge>
            )}
            {courierPhoneRaw && (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="h-8"
                data-testid="button-call-courier"
              >
                <a href={`tel:${courierPhoneRaw.replace(/[^\d+]/g, "")}`} aria-label={t.orders.callCourier}>
                  <Phone className="h-3.5 w-3.5 mr-1" />
                  {t.orders.callCourier}
                </a>
              </Button>
            )}
            {order.courierHasZalo && courierZaloNumber && (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="h-8 text-blue-600 hover:text-blue-700 border-blue-200"
                data-testid="button-zalo-courier"
              >
                <a
                  href={`https://zalo.me/${courierZaloNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t.orders.chatCourierZalo}
                >
                  <MessageCircle className="h-3.5 w-3.5 mr-1" />
                  {t.orders.chatCourierZalo}
                </a>
              </Button>
            )}
            {canChange && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={onPickCourier}
                  data-testid="button-change-courier"
                >
                  {t.orders.changeCourier}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-destructive"
                  onClick={handleUnassign}
                  disabled={assign.isPending}
                  data-testid="button-unassign-courier"
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  {t.orders.unassignCourier}
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground italic">{t.orders.courierNotAssigned}</span>
            {canChange && (
              <Button
                size="sm"
                onClick={onPickCourier}
                data-testid="button-pick-courier"
              >
                <Truck className="h-3.5 w-3.5 mr-1" />
                {t.orders.pickCourier}
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

function PickCourierDialog({
  open,
  onOpenChange,
  orderId,
  currentCourierId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  currentCourierId: string | null;
}) {
  const t = useT();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: couriers = [], isLoading } = useListAvailableCouriers(orderId, {
    query: {
      enabled: open,
      queryKey: getListAvailableCouriersQueryKey(orderId),
    },
  });
  const assign = useAssignOrderCourier();

  const handleSelect = (c: AvailableCourier) => {
    if (c.id === currentCourierId) {
      onOpenChange(false);
      return;
    }
    assign.mutate(
      { id: orderId, data: { courierId: c.id } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetOrderQueryKey(orderId) });
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
          toast({ title: t.orders.courierAssignedToast, description: c.fullName });
          onOpenChange(false);
        },
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : t.orders.courierAssignFailed;
          toast({ variant: "destructive", title: t.orders.courierAssignFailed, description: msg });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="dialog-pick-courier">
        <DialogHeader>
          <DialogTitle>{t.orders.pickCourierTitle}</DialogTitle>
          <DialogDescription>{t.orders.pickCourierDesc}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          {isLoading ? (
            <div className="py-6 text-center text-muted-foreground">{t.orders.loading}</div>
          ) : couriers.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground">
              {t.orders.noAvailableCouriers}
            </div>
          ) : (
            <ul className="space-y-2">
              {couriers.map((c) => {
                const phoneRaw = c.phone ? c.phone.replace(/[^\d+]/g, "") : "";
                const zaloNumber = c.phone ? toZaloNumber(c.phone) : "";
                return (
                  <li
                    key={c.id}
                    className={`border rounded-lg p-3 flex flex-wrap items-center gap-2 ${
                      c.isAssigned ? "border-emerald-400 bg-emerald-50/50" : ""
                    }`}
                    data-testid={`courier-row-${c.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{c.fullName}</span>
                        {c.isAssigned && (
                          <Badge variant="default" className="text-xs">
                            {t.orders.courierAssigned}
                          </Badge>
                        )}
                        {c.hasZalo && (
                          <Badge variant="secondary" className="text-xs">
                            {t.orders.courierZaloBadge}
                          </Badge>
                        )}
                      </div>
                      {c.phone && (
                        <div className="text-sm text-muted-foreground font-mono mt-0.5">
                          {c.phone}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {phoneRaw && (
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="h-8"
                          data-testid={`button-call-${c.id}`}
                        >
                          <a href={`tel:${phoneRaw}`} aria-label={t.orders.callCourier}>
                            <Phone className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      )}
                      {c.hasZalo && zaloNumber && (
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="h-8 text-blue-600 border-blue-200"
                          data-testid={`button-zalo-${c.id}`}
                        >
                          <a
                            href={`https://zalo.me/${zaloNumber}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={t.orders.chatCourierZalo}
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      )}
                      {!c.isAssigned && (
                        <Button
                          size="sm"
                          onClick={() => handleSelect(c)}
                          disabled={assign.isPending}
                          data-testid={`button-select-${c.id}`}
                        >
                          {t.orders.selectCourier}
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
