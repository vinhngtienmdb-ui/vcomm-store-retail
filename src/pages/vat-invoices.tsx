import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListOrders,
  useListStores,
  useUpdateOrderVatInvoiceStatus,
  getListOrdersQueryKey,
  ListOrdersVatInvoiceStatus,
  OrderVatInvoiceStatus,
  type Order,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useT } from "@/lib/i18n-context";
import { formatCurrency, formatDate } from "@/lib/format";
import { Loader2, FileCheck2, FileClock, FileX2, Download } from "lucide-react";

type Tab = "pending" | "issued" | "none";

export default function VatInvoicesPage() {
  const t = useT();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("pending");
  const [storeFilter, setStoreFilter] = useState<string>("all");

  const { data: stores = [] } = useListStores();

  const tabToStatus: Record<Tab, ListOrdersVatInvoiceStatus> = {
    pending: ListOrdersVatInvoiceStatus.pending,
    issued: ListOrdersVatInvoiceStatus.issued,
    none: ListOrdersVatInvoiceStatus.none,
  };

  const queryParams = useMemo(
    () => ({
      vatInvoiceStatus: tabToStatus[tab],
      ...(storeFilter !== "all" ? { storeId: storeFilter } : {}),
      limit: 200,
    }),
    [tab, storeFilter],
  );

  const { data: orders = [], isLoading } = useListOrders(queryParams);
  const updateMutation = useUpdateOrderVatInvoiceStatus();

  const handleUpdate = (order: Order, status: OrderVatInvoiceStatus) => {
    updateMutation.mutate(
      { id: order.id, data: { status } },
      {
        onSuccess: () => {
          toast({ title: t.vatInvoices.updateSuccess });
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
        },
        onError: (err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          toast({
            title: t.vatInvoices.updateFailed,
            description: message,
            variant: "destructive",
          });
        },
      },
    );
  };

  const statusLabel = (status: OrderVatInvoiceStatus): string => {
    if (status === OrderVatInvoiceStatus.issued) return t.vatInvoices.statusIssued;
    if (status === OrderVatInvoiceStatus.pending) return t.vatInvoices.statusPending;
    return t.vatInvoices.statusNone;
  };

  const csvEscape = (v: unknown): string => {
    const s = v == null ? "" : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const handleExportCsv = () => {
    if (!orders.length) {
      toast({ title: t.vatInvoices.exportCsvEmpty, variant: "destructive" });
      return;
    }
    const headers = [
      t.vatInvoices.colCode,
      t.vatInvoices.colDate,
      t.vatInvoices.colStore,
      t.vatInvoices.colCustomer,
      t.vatInvoices.colCustomerPhone,
      t.vatInvoices.colTotal,
      t.vatInvoices.colStatus,
      t.vatInvoices.issuedAt,
    ];
    const rows = orders.map((o) => [
      o.code,
      formatDate(o.createdAt),
      o.storeName ?? "",
      o.customerName ?? t.vatInvoices.guestCustomer,
      o.customerPhone ?? "",
      o.total,
      statusLabel(o.vatInvoiceStatus),
      o.vatInvoiceIssuedAt ? formatDate(o.vatInvoiceIssuedAt) : "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map(csvEscape).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vat-invoices-${tab}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderStatusBadge = (status: OrderVatInvoiceStatus) => {
    if (status === OrderVatInvoiceStatus.issued) {
      return (
        <Badge variant="default" className="gap-1">
          <FileCheck2 className="w-3 h-3" />
          {t.vatInvoices.statusIssued}
        </Badge>
      );
    }
    if (status === OrderVatInvoiceStatus.pending) {
      return (
        <Badge variant="secondary" className="gap-1">
          <FileClock className="w-3 h-3" />
          {t.vatInvoices.statusPending}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1 text-muted-foreground">
        <FileX2 className="w-3 h-3" />
        {t.vatInvoices.statusNone}
      </Badge>
    );
  };

  const renderRowActions = (order: Order) => {
    const status = order.vatInvoiceStatus;
    if (status === OrderVatInvoiceStatus.none) {
      return (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleUpdate(order, OrderVatInvoiceStatus.pending)}
          disabled={updateMutation.isPending}
          data-testid={`button-mark-pending-${order.id}`}
          title={t.vatInvoices.actionRequestHint}
        >
          {t.vatInvoices.actionRequest}
        </Button>
      );
    }
    if (status === OrderVatInvoiceStatus.pending) {
      return (
        <div className="flex gap-2 justify-end">
          <Button
            size="sm"
            onClick={() => handleUpdate(order, OrderVatInvoiceStatus.issued)}
            disabled={updateMutation.isPending}
            data-testid={`button-mark-issued-${order.id}`}
          >
            {t.vatInvoices.actionIssue}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleUpdate(order, OrderVatInvoiceStatus.none)}
            disabled={updateMutation.isPending}
            data-testid={`button-revert-${order.id}`}
          >
            {t.vatInvoices.actionRevert}
          </Button>
        </div>
      );
    }
    return (
      <span className="text-xs text-muted-foreground">
        {order.vatInvoiceIssuedAt
          ? `${t.vatInvoices.issuedAt} ${formatDate(order.vatInvoiceIssuedAt)}`
          : ""}
      </span>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t.vatInvoices.title}</h1>
        <p className="text-sm text-muted-foreground">{t.vatInvoices.subtitle}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {t.vatInvoices.storeFilter}:
          </span>
          <Select value={storeFilter} onValueChange={setStoreFilter}>
            <SelectTrigger className="w-[220px]" data-testid="select-store-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.vatInvoices.allStores}</SelectItem>
              {stores.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCsv}
          disabled={isLoading || orders.length === 0}
          className="ml-auto"
          data-testid="button-export-vat-csv"
        >
          <Download className="w-4 h-4 mr-1" />
          {t.vatInvoices.exportCsv}
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList>
          <TabsTrigger value="pending" data-testid="tab-pending">
            {t.vatInvoices.tabPending}
          </TabsTrigger>
          <TabsTrigger value="issued" data-testid="tab-issued">
            {t.vatInvoices.tabIssued}
          </TabsTrigger>
          <TabsTrigger value="none" data-testid="tab-none">
            {t.vatInvoices.tabNone}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.vatInvoices.colCode}</TableHead>
                  <TableHead>{t.vatInvoices.colDate}</TableHead>
                  <TableHead>{t.vatInvoices.colStore}</TableHead>
                  <TableHead>{t.vatInvoices.colCustomer}</TableHead>
                  <TableHead>{t.vatInvoices.colCustomerPhone}</TableHead>
                  <TableHead className="text-right">{t.vatInvoices.colTotal}</TableHead>
                  <TableHead>{t.vatInvoices.colStatus}</TableHead>
                  <TableHead className="text-right">{t.vatInvoices.colActions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10">
                      <Loader2 className="w-5 h-5 animate-spin inline" />
                    </TableCell>
                  </TableRow>
                ) : orders.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-10 text-muted-foreground"
                    >
                      {t.vatInvoices.empty}
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => (
                    <TableRow key={order.id} data-testid={`row-vat-${order.id}`}>
                      <TableCell className="font-mono text-xs">{order.code}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {formatDate(order.createdAt)}
                      </TableCell>
                      <TableCell>{order.storeName}</TableCell>
                      <TableCell>
                        {order.customerName || t.vatInvoices.guestCustomer}
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-mono text-xs">
                        {order.customerPhone ? (
                          <a
                            href={`tel:${order.customerPhone}`}
                            className="hover:underline text-primary"
                            data-testid={`link-phone-${order.id}`}
                          >
                            {order.customerPhone}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(order.total)}
                      </TableCell>
                      <TableCell>{renderStatusBadge(order.vatInvoiceStatus)}</TableCell>
                      <TableCell className="text-right">{renderRowActions(order)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
