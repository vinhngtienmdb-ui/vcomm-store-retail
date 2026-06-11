import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format";

interface PromoEntry {
  promotionId: string;
  code: string;
  name: string;
  orderCount: number;
  totalDiscount: number;
}
interface ChainEntry {
  chainId: string;
  chainName: string;
  chainEmail: string;
  businessName: string;
  orderCount: number;
  totalDiscount: number;
  promotions: PromoEntry[];
}
interface UsageResponse {
  from: string | null;
  to: string | null;
  totals: { orderCount: number; totalDiscount: number; chainCount: number };
  chains: ChainEntry[];
}

interface OrderRow {
  orderId: string;
  orderCode: string;
  orderTotal: number;
  createdAt: string;
  storeName: string;
  promotionCode: string;
  promotionName: string;
  discountAmount: number;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });

function todayLocalISODate() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}
function firstOfMonthISODate() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export default function AdminPromotionsUsagePage() {
  const [from, setFrom] = useState<string>(firstOfMonthISODate());
  const [to, setTo] = useState<string>(todayLocalISODate());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [details, setDetails] = useState<{
    chainId: string;
    chainName: string;
    promoCode?: string;
  } | null>(null);

  const queryKey = useMemo(() => ["admin-promo-usage", from, to], [from, to]);
  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: async (): Promise<UsageResponse> => {
      const params = new URLSearchParams();
      if (from) params.set("from", new Date(from + "T00:00:00").toISOString());
      if (to) params.set("to", new Date(to + "T23:59:59").toISOString());
      const res = await fetch(`/api/admin/promotions/usage?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Không tải được dữ liệu");
      return res.json();
    },
  });

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exportCsv = () => {
    if (!data) return;
    const lines: string[] = [
      "Chuỗi,Email,Mã KM,Tên KM,Số đơn,Tổng giảm (VND)",
    ];
    for (const c of data.chains) {
      for (const p of c.promotions) {
        const name = `${c.businessName || c.chainName}`.replace(/"/g, '""');
        const email = c.chainEmail.replace(/"/g, '""');
        const pname = p.name.replace(/"/g, '""');
        lines.push(
          `"${name}","${email}","${p.code}","${pname}",${p.orderCount},${p.totalDiscount}`,
        );
      }
    }
    const blob = new Blob(["\uFEFF" + lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `doi-soat-khuyen-mai_${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Đối soát khuyến mãi nền tảng</h1>
        <p className="text-sm text-muted-foreground">
          Số lượt và tổng tiền giảm cho mỗi chuỗi khi khách dùng mã của hệ thống. Dùng để
          đối chiếu và hoàn tiền cho chuỗi.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div>
            <Label htmlFor="from" className="text-xs">Từ ngày</Label>
            <Input
              id="from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 w-44"
              data-testid="input-from"
            />
          </div>
          <div>
            <Label htmlFor="to" className="text-xs">Đến ngày</Label>
            <Input
              id="to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 w-44"
              data-testid="input-to"
            />
          </div>
          <Button
            variant="outline"
            onClick={exportCsv}
            disabled={!data || data.chains.length === 0}
            data-testid="button-export-csv"
          >
            <Download className="h-4 w-4 mr-1.5" />
            Xuất CSV
          </Button>
        </CardContent>
      </Card>

      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs text-muted-foreground font-medium">
                Số chuỗi sử dụng
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold" data-testid="stat-chain-count">
                {data.totals.chainCount}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs text-muted-foreground font-medium">
                Tổng số lượt áp dụng
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold" data-testid="stat-order-count">
                {data.totals.orderCount}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs text-muted-foreground font-medium">
                Tổng giảm (cần hoàn)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-emerald-700" data-testid="stat-total-discount">
                {formatCurrency(data.totals.totalDiscount)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {isLoading && (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Đang tải...</CardContent></Card>
      )}
      {error && (
        <Card><CardContent className="p-8 text-center text-destructive">Không tải được dữ liệu</CardContent></Card>
      )}
      {data && data.chains.length === 0 && (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            Chưa có lượt sử dụng mã nền tảng trong khoảng thời gian này.
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {data?.chains.map((c) => {
          const isOpen = expanded.has(c.chainId);
          return (
            <Card key={c.chainId} data-testid={`row-chain-${c.chainId}`}>
              <CardContent className="p-0">
                <button
                  type="button"
                  onClick={() => toggle(c.chainId)}
                  className="w-full p-4 flex items-center gap-3 text-left hover:bg-muted/40"
                  data-testid={`toggle-chain-${c.chainId}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">
                      {c.businessName || c.chainName}
                    </div>
                    <div className="text-xs text-muted-foreground">{c.chainEmail}</div>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <div className="text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[10px]">
                        {c.orderCount} lượt
                      </Badge>
                    </div>
                    <div className="font-semibold text-emerald-700 mt-1">
                      {formatCurrency(c.totalDiscount)}
                    </div>
                  </div>
                  <div className="text-muted-foreground">
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t bg-muted/20 p-4 space-y-2">
                    {c.promotions.map((p) => (
                      <div
                        key={p.promotionId}
                        className="flex items-center gap-3 bg-card border rounded-md p-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className="font-mono">{p.code}</Badge>
                            <span className="text-sm font-medium">{p.name}</span>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                          {p.orderCount} lượt
                        </div>
                        <div className="font-semibold text-emerald-700 whitespace-nowrap min-w-[100px] text-right">
                          {formatCurrency(p.totalDiscount)}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setDetails({
                              chainId: c.chainId,
                              chainName: c.businessName || c.chainName,
                              promoCode: p.code,
                            })
                          }
                          data-testid={`button-detail-${c.chainId}-${p.code}`}
                        >
                          Xem đơn
                        </Button>
                      </div>
                    ))}
                    <div className="flex justify-end pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setDetails({
                            chainId: c.chainId,
                            chainName: c.businessName || c.chainName,
                          })
                        }
                        data-testid={`button-detail-all-${c.chainId}`}
                      >
                        Xem toàn bộ đơn của chuỗi
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {details && (
        <OrdersDetailDialog
          chainId={details.chainId}
          chainName={details.chainName}
          promoCode={details.promoCode}
          from={from}
          to={to}
          onClose={() => setDetails(null)}
        />
      )}
    </div>
  );
}

function OrdersDetailDialog({
  chainId,
  chainName,
  promoCode,
  from,
  to,
  onClose,
}: {
  chainId: string;
  chainName: string;
  promoCode?: string;
  from: string;
  to: string;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-promo-usage-detail", chainId, promoCode ?? "all", from, to],
    queryFn: async (): Promise<OrderRow[]> => {
      const params = new URLSearchParams();
      if (from) params.set("from", new Date(from + "T00:00:00").toISOString());
      if (to) params.set("to", new Date(to + "T23:59:59").toISOString());
      if (promoCode) params.set("promoCode", promoCode);
      const res = await fetch(
        `/api/admin/promotions/usage/${chainId}/orders?${params.toString()}`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error("Không tải được");
      return res.json();
    },
  });

  const total = (data ?? []).reduce((s, r) => s + r.discountAmount, 0);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            Đơn áp dụng mã{promoCode ? ` ${promoCode}` : ""} · {chainName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-auto">
          {isLoading && (
            <div className="text-sm text-muted-foreground py-6 text-center">Đang tải...</div>
          )}
          {data && data.length === 0 && (
            <div className="text-sm text-muted-foreground py-6 text-center">Không có đơn nào.</div>
          )}
          {data && data.length > 0 && (
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr>
                  <th className="text-left py-2">Mã đơn</th>
                  <th className="text-left py-2">Thời gian</th>
                  <th className="text-left py-2">Cửa hàng</th>
                  <th className="text-left py-2">Mã KM</th>
                  <th className="text-right py-2">Tổng đơn</th>
                  <th className="text-right py-2">Giảm</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.orderId + r.promotionCode} className="border-b last:border-0">
                    <td className="py-2 font-mono text-xs">#{r.orderCode}</td>
                    <td className="py-2 text-xs">{fmtDate(r.createdAt)}</td>
                    <td className="py-2 text-xs">{r.storeName}</td>
                    <td className="py-2">
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        {r.promotionCode}
                      </Badge>
                    </td>
                    <td className="py-2 text-right">{formatCurrency(r.orderTotal)}</td>
                    <td className="py-2 text-right text-emerald-700 font-medium">
                      {formatCurrency(r.discountAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t font-semibold">
                  <td colSpan={5} className="py-2 text-right">Tổng giảm:</td>
                  <td className="py-2 text-right text-emerald-700">{formatCurrency(total)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
