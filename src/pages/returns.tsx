import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStoreId } from "@/lib/store-context";
import { useToast } from "@/hooks/use-toast";
import { Undo2, RefreshCw, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useT } from "@/lib/i18n-context";
import type { Translations } from "@/lib/translations";

interface ReturnRow {
  id: string;
  orderId: string;
  orderCode: string;
  orderTotal: number;
  orderStatus: string;
  storeId: string;
  storeName: string;
  customerUserId: string;
  customerName: string;
  customerPhone: string;
  kind: "cancel_refund" | "exchange";
  reasonCode: string;
  reasonLabel: string;
  note: string | null;
  status: "pending" | "approved" | "rejected";
  staffNote: string | null;
  processedAt: string | null;
  requestedAt: string;
}

interface ReturnStats {
  pendingCount: number;
  monthCount: number;
  approvedThisMonth: number;
  rejectedThisMonth: number;
  byReason: { reasonCode: string; reasonLabel: string; count: number }[];
  byKind: { kind: string; count: number }[];
}

function getKindLabels(t: Translations): Record<string, { label: string; cls: string }> {
  return {
    cancel_refund: { label: t.returns.cancelRefund, cls: "bg-red-100 text-red-700" },
    exchange: { label: t.returns.exchange, cls: "bg-blue-100 text-blue-700" },
  };
}

function getStatusLabels(t: Translations): Record<string, { label: string; cls: string; icon: typeof Clock }> {
  return {
    pending: { label: t.returns.pending, cls: "bg-amber-100 text-amber-700", icon: Clock },
    approved: { label: t.returns.approved, cls: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
    rejected: { label: t.returns.rejected, cls: "bg-rose-100 text-rose-700", icon: XCircle },
  };
}

const formatVnd = (n: number) => new Intl.NumberFormat("vi-VN").format(n) + " ₫";
const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });

export default function ReturnsPage() {
  const t = useT();
  const KIND_LABELS = getKindLabels(t);
  const STATUS_LABELS = getStatusLabels(t);
  const { storeId } = useStoreId();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [processing, setProcessing] = useState<{ row: ReturnRow; decision: "approve" | "reject" } | null>(null);
  const [staffNote, setStaffNote] = useState("");

  const filterStoreId = storeId === "all" ? undefined : storeId;

  const listKey = ["staff-returns", filterStoreId, statusFilter] as const;
  const listQuery = useQuery({
    queryKey: listKey,
    queryFn: async (): Promise<ReturnRow[]> => {
      const params = new URLSearchParams({ status: statusFilter });
      if (filterStoreId) params.set("storeId", filterStoreId);
      const res = await fetch(`/api/returns?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Không tải được danh sách yêu cầu");
      return res.json();
    },
  });

  const statsKey = ["staff-return-stats", filterStoreId] as const;
  const statsQuery = useQuery({
    queryKey: statsKey,
    queryFn: async (): Promise<ReturnStats> => {
      const params = new URLSearchParams();
      if (filterStoreId) params.set("storeId", filterStoreId);
      const res = await fetch(`/api/dashboard/return-stats?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Không tải được thống kê");
      return res.json();
    },
  });

  const processMutation = useMutation({
    mutationFn: async (vars: {
      id: string;
      decision: "approve" | "reject";
      staffNote: string;
    }) => {
      const res = await fetch(`/api/returns/${vars.id}/process`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: vars.decision,
          staffNote: vars.staffNote || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Không xử lý được yêu cầu");
      }
      return res.json();
    },
    onSuccess: async (_, vars) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["staff-returns"] }),
        qc.invalidateQueries({ queryKey: ["staff-return-stats"] }),
        qc.invalidateQueries({ queryKey: ["dashboard-return-stats"] }),
      ]);
      toast({
        title: vars.decision === "approve" ? t.returns.returnApproved : t.returns.returnRejected,
        description:
          vars.decision === "approve"
            ? "Đã cập nhật trạng thái đơn (nếu là hoàn tiền) và thông báo khách hàng."
            : "Yêu cầu đã được đánh dấu từ chối.",
      });
      setProcessing(null);
      setStaffNote("");
    },
    onError: (err) =>
      toast({
        variant: "destructive",
        title: t.common.error,
        description: err instanceof Error ? err.message : "Không xử lý được",
      }),
  });

  const stats = statsQuery.data;
  const list = listQuery.data ?? [];

  const filterTabs = useMemo(
    () => [
      { value: "pending", label: t.returns.pending },
      { value: "approved", label: t.returns.approved },
      { value: "rejected", label: t.returns.rejected },
      { value: "all", label: t.common.all },
    ],
    [t],
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Undo2 className="h-6 w-6 text-primary" />
            {t.returns.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t.returns.subtitle}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            listQuery.refetch();
            statsQuery.refetch();
          }}
        >
          <RefreshCw className="h-4 w-4 mr-1.5" />
          {t.common.refresh}
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label={t.returns.pending}
          value={stats?.pendingCount ?? 0}
          cls="text-amber-600"
          testid="stat-pending"
        />
        <StatCard
          label={`${t.common.all} - ${t.reports.thisMonth}`}
          value={stats?.monthCount ?? 0}
          cls="text-foreground"
          testid="stat-month"
        />
        <StatCard
          label={`${t.returns.approved} (${t.reports.thisMonth})`}
          value={stats?.approvedThisMonth ?? 0}
          cls="text-emerald-600"
          testid="stat-approved"
        />
        <StatCard
          label={`${t.returns.rejected} (${t.reports.thisMonth})`}
          value={stats?.rejectedThisMonth ?? 0}
          cls="text-rose-600"
          testid="stat-rejected"
        />
      </div>

      {stats && (stats.byReason.length > 0 || stats.byKind.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t.returns.reason} ({t.reports.thisMonth})</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.byReason.length === 0 ? (
                <div className="text-sm text-muted-foreground">{t.common.noData}</div>
              ) : (
                <div className="space-y-2">
                  {stats.byReason.map((r) => (
                    <div
                      key={r.reasonCode}
                      className="flex items-center justify-between text-sm border-b border-border/40 pb-1.5 last:border-0 last:pb-0"
                    >
                      <span>{r.reasonLabel}</span>
                      <span className="font-semibold">{r.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t.returns.kind} ({t.reports.thisMonth})</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.byKind.length === 0 ? (
                <div className="text-sm text-muted-foreground">{t.common.noData}</div>
              ) : (
                <div className="space-y-2">
                  {stats.byKind.map((r) => (
                    <div
                      key={r.kind}
                      className="flex items-center justify-between text-sm border-b border-border/40 pb-1.5 last:border-0 last:pb-0"
                    >
                      <span>{KIND_LABELS[r.kind]?.label ?? r.kind}</span>
                      <span className="font-semibold">{r.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {filterTabs.map((tab) => {
          const active = tab.value === statusFilter;
          return (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              data-testid={`filter-${tab.value}`}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border hover:bg-muted"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {listQuery.isLoading && (
        <div className="text-center py-10 text-muted-foreground">{t.common.loading}</div>
      )}
      {listQuery.error && (
        <div className="text-center py-10 text-destructive">
          {(listQuery.error as Error).message}
        </div>
      )}
      {!listQuery.isLoading && list.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t.returns.noReturns}
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {list.map((r) => {
          const k = KIND_LABELS[r.kind] ?? { label: r.kind, cls: "" };
          const s = STATUS_LABELS[r.status] ?? { label: r.status, cls: "", icon: Clock };
          const StatusIcon = s.icon;
          return (
            <Card key={r.id} data-testid={`row-return-${r.id}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">#{r.orderCode}</span>
                      <Badge className={k.cls}>{k.label}</Badge>
                      <Badge className={s.cls}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {s.label}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {r.customerName} · {r.customerPhone || "—"} · {r.storeName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t.returns.requestedAt}: {formatDateTime(r.requestedAt)}
                      {r.processedAt && ` · ${t.returns.processedAt}: ${formatDateTime(r.processedAt)}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatVnd(r.orderTotal)}</div>
                    <div className="text-xs text-muted-foreground">{t.returns.orderCode}: {r.orderStatus}</div>
                  </div>
                </div>

                <div className="bg-muted/40 rounded-md p-3 text-sm space-y-1">
                  <div>
                    <span className="text-muted-foreground">{t.returns.reason}: </span>
                    <span className="font-medium">{r.reasonLabel}</span>
                  </div>
                  {r.note && (
                    <div>
                      <span className="text-muted-foreground">{t.orders.noteLabel}: </span>
                      <span>{r.note}</span>
                    </div>
                  )}
                  {r.staffNote && (
                    <div>
                      <span className="text-muted-foreground">{t.returns.staffNote}: </span>
                      <span>{r.staffNote}</span>
                    </div>
                  )}
                </div>

                {r.status === "pending" && (
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setProcessing({ row: r, decision: "reject" });
                        setStaffNote("");
                      }}
                      data-testid={`button-reject-${r.id}`}
                    >
                      <XCircle className="h-4 w-4 mr-1.5" />
                      {t.returns.reject}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setProcessing({ row: r, decision: "approve" });
                        setStaffNote("");
                      }}
                      data-testid={`button-approve-${r.id}`}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1.5" />
                      {t.returns.approve}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!processing} onOpenChange={(o) => !o && setProcessing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {processing?.decision === "approve" ? t.returns.approveConfirm : t.returns.rejectConfirm}
            </DialogTitle>
          </DialogHeader>
          {processing && (
            <div className="space-y-3 text-sm">
              <div>
                {t.returns.orderCode} <strong>#{processing.row.orderCode}</strong> –{" "}
                {KIND_LABELS[processing.row.kind].label}
              </div>
              <div className="text-muted-foreground">
                {t.returns.customer}: {processing.row.customerName}
              </div>
              {processing.decision === "approve" &&
                processing.row.kind === "cancel_refund" && (
                  <div className="text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded p-2">
                    Khi duyệt, đơn hàng sẽ được chuyển sang trạng thái <strong>Đã huỷ</strong>{" "}
                    và mục theo dõi hạn dùng của khách sẽ được dời khỏi danh sách.
                  </div>
                )}
              <div className="space-y-1">
                <label className="text-xs font-medium">{t.returns.addNote}</label>
                <Textarea
                  value={staffNote}
                  onChange={(e) => setStaffNote(e.target.value)}
                  rows={3}
                  placeholder={t.returns.notePlaceholder}
                  data-testid="input-staff-note"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setProcessing(null)}
              disabled={processMutation.isPending}
            >
              {t.common.close}
            </Button>
            <Button
              onClick={() =>
                processing &&
                processMutation.mutate({
                  id: processing.row.id,
                  decision: processing.decision,
                  staffNote,
                })
              }
              disabled={processMutation.isPending}
              data-testid="button-confirm-process"
            >
              {processMutation.isPending ? t.pos.processing : t.common.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  label,
  value,
  cls,
  testid,
}: {
  label: string;
  value: number;
  cls: string;
  testid: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-2xl font-bold mt-1 ${cls}`} data-testid={testid}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

void Select;
void SelectContent;
void SelectItem;
void SelectTrigger;
void SelectValue;
