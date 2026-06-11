import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/format";
import {
  Building2,
  CheckCircle2,
  XCircle,
  Users,
  Store,
  Hourglass,
  ShieldCheck,
  BarChart3,
  CalendarClock,
  PauseCircle,
  PlayCircle,
  ShoppingCart,
  Star,
  TrendingUp,
  UsersRound,
  KeyRound,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface AdminChain {
  id: string;
  email: string;
  name: string;
  phone: string;
  businessName: string | null;
  taxCode: string | null;
  businessRegNumber: string | null;
  legalRepresentative: string | null;
  businessAddress: string | null;
  contactEmail: string | null;
  plan: "trial" | "pro";
  approvalStatus: "pending" | "approved" | "rejected";
  trialEndsAt: string | null;
  approvedAt: string | null;
  rejectedReason: string | null;
  planExpiresAt: string | null;
  isSuspended: boolean;
  suspendedAt: string | null;
  suspendedReason: string | null;
  createdAt: string;
  storeCount: number;
}

interface AdminStats {
  totalChains: number;
  pendingChains: number;
  approvedChains: number;
  proChains: number;
  suspendedChains: number;
  customers: number;
  totalStores: number;
}

interface AdminChainDetail {
  chain: AdminChain;
  stores: Array<{
    id: string;
    name: string;
    isActive: boolean;
    ratingAvg: number;
    ratingCount: number;
  }>;
  stats: {
    storeCount: number;
    activeStoreCount: number;
    staffTotal: number;
    staffManagers: number;
    staffCashiers: number;
    staffBaristas: number;
    customerCount: number;
    orderCount: number;
    revenueTotal: number;
    ratingAvg: number;
    ratingCount: number;
  };
  revenueByMonth: Array<{ month: string; revenue: number; orders: number }>;
  recentOrders: Array<{
    id: string;
    code: string;
    storeName: string;
    total: number;
    status: string;
    createdAt: string;
  }>;
}

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("vi-VN") : "—");
const fmtDateTime = (d: string) => new Date(d).toLocaleString("vi-VN");

function planExpiryDays(d: string | null): number | null {
  if (!d) return null;
  const ms = new Date(d).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export default function AdminPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = useState("pending");
  const [rejectChain, setRejectChain] = useState<AdminChain | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [detailChain, setDetailChain] = useState<AdminChain | null>(null);
  const [storesChain, setStoresChain] = useState<AdminChain | null>(null);

  const statsQuery = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async (): Promise<AdminStats> => {
      const res = await fetch("/api/admin/stats", { credentials: "include" });
      if (!res.ok) throw new Error("Không tải được thống kê");
      return res.json();
    },
  });

  const chainsQuery = useQuery({
    queryKey: ["admin-chains", tab],
    queryFn: async (): Promise<AdminChain[]> => {
      const params = tab === "all" ? "" : `?status=${tab}`;
      const res = await fetch(`/api/admin/chains${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Không tải được danh sách chuỗi");
      return res.json();
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/chains/${id}/approve`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Không duyệt được");
      }
    },
    onSuccess: () => {
      toast({ title: "Đã duyệt chuỗi", description: "Chuỗi đã được nâng lên gói Pro 1 năm." });
      qc.invalidateQueries({ queryKey: ["admin-chains"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (err) =>
      toast({ title: "Lỗi", description: (err as Error).message, variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await fetch(`/api/admin/chains/${id}/reject`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Không từ chối được");
      }
    },
    onSuccess: () => {
      toast({ title: "Đã từ chối chuỗi" });
      setRejectChain(null);
      setRejectReason("");
      qc.invalidateQueries({ queryKey: ["admin-chains"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (err) =>
      toast({ title: "Lỗi", description: (err as Error).message, variant: "destructive" }),
  });

  const stats = statsQuery.data;

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6 max-w-6xl mx-auto" data-testid="page-admin">
      <div className="flex items-start sm:items-center gap-3">
        <div className="bg-primary/10 text-primary p-1.5 sm:p-2 rounded-lg shrink-0">
          <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-base sm:text-2xl font-bold leading-tight">Quản trị nền tảng VComm Store</h1>
          <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
            Duyệt chuỗi mới, theo dõi toàn hệ thống và quản lý gói thuê bao.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">Chờ duyệt</p>
            <p className="text-lg sm:text-2xl font-bold flex items-center gap-1.5 mt-1" data-testid="stat-pending">
              <Hourglass className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500 shrink-0" /> {stats?.pendingChains ?? "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">Đã duyệt</p>
            <p className="text-lg sm:text-2xl font-bold flex items-center gap-1.5 mt-1" data-testid="stat-approved">
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 shrink-0" /> {stats?.approvedChains ?? "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">Tạm dừng</p>
            <p
              className="text-lg sm:text-2xl font-bold flex items-center gap-1.5 mt-1"
              data-testid="stat-suspended"
            >
              <PauseCircle className="h-4 w-4 sm:h-5 sm:w-5 text-rose-500 shrink-0" /> {stats?.suspendedChains ?? "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">Cửa hàng</p>
            <p className="text-lg sm:text-2xl font-bold flex items-center gap-1.5 mt-1" data-testid="stat-stores">
              <Store className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" /> {stats?.totalStores ?? "—"}
            </p>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">Khách hàng đã đăng ký</p>
            <p className="text-lg sm:text-2xl font-bold flex items-center gap-1.5 mt-1" data-testid="stat-customers">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" /> {stats?.customers ?? "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
          <CardTitle className="text-base sm:text-lg">Hồ sơ đăng ký chuỗi</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Xem thông tin doanh nghiệp, MST, GPKD và quyết định duyệt nâng cấp gói Pro.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <Tabs value={tab} onValueChange={setTab}>
            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <TabsList className="w-max">
                <TabsTrigger value="pending" data-testid="tab-pending">
                  Chờ duyệt
                </TabsTrigger>
                <TabsTrigger value="approved" data-testid="tab-approved">
                  Đã duyệt
                </TabsTrigger>
                <TabsTrigger value="rejected" data-testid="tab-rejected">
                  Đã từ chối
                </TabsTrigger>
                <TabsTrigger value="suspended" data-testid="tab-suspended">
                  Tạm dừng
                </TabsTrigger>
                <TabsTrigger value="all" data-testid="tab-all">
                  Tất cả
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value={tab} className="mt-4">
              {chainsQuery.isLoading && <p className="text-muted-foreground">Đang tải...</p>}
              {chainsQuery.data && chainsQuery.data.length === 0 && (
                <p className="text-muted-foreground py-6 text-center">Không có chuỗi nào.</p>
              )}
              <div className="space-y-4">
                {chainsQuery.data?.map((c) => {
                  const expiryDays = planExpiryDays(c.planExpiresAt);
                  return (
                    <Card key={c.id} className="border-2" data-testid={`chain-${c.id}`}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              {c.businessName ?? c.name}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              Đăng ký {fmt(c.createdAt)} ·{" "}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setStoresChain(c);
                                }}
                                disabled={c.storeCount === 0}
                                data-testid={`button-chain-stores-${c.id}`}
                                className="text-primary underline-offset-2 hover:underline disabled:text-muted-foreground disabled:no-underline disabled:cursor-default font-medium inline-flex items-center gap-1"
                              >
                                <Store className="h-3 w-3" />
                                {c.storeCount} cửa hàng
                              </button>
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={c.plan === "pro" ? "default" : "secondary"}>
                              {c.plan === "pro" ? "Pro" : "Trial"}
                            </Badge>
                            <Badge
                              variant={
                                c.approvalStatus === "approved"
                                  ? "default"
                                  : c.approvalStatus === "pending"
                                    ? "secondary"
                                    : "destructive"
                              }
                            >
                              {c.approvalStatus === "approved"
                                ? "Đã duyệt"
                                : c.approvalStatus === "pending"
                                  ? "Chờ duyệt"
                                  : "Từ chối"}
                            </Badge>
                            {c.isSuspended && (
                              <Badge variant="destructive" data-testid={`badge-suspended-${c.id}`}>
                                Đã chấm dứt
                              </Badge>
                            )}
                            {c.planExpiresAt && (
                              <Badge
                                variant="outline"
                                className={
                                  expiryDays !== null && expiryDays < 0
                                    ? "border-destructive text-destructive"
                                    : expiryDays !== null && expiryDays < 14
                                      ? "border-amber-500 text-amber-600"
                                      : ""
                                }
                              >
                                <CalendarClock className="h-3 w-3 mr-1" />
                                Đến {fmt(c.planExpiresAt)}
                                {expiryDays !== null && expiryDays >= 0
                                  ? ` · còn ${expiryDays} ngày`
                                  : expiryDays !== null
                                    ? ` · quá hạn ${-expiryDays} ngày`
                                    : ""}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                          <p>
                            <span className="text-muted-foreground">Người đăng ký:</span> {c.name} ·{" "}
                            {c.email}
                          </p>
                          <p>
                            <span className="text-muted-foreground">SĐT:</span> {c.phone || "—"}
                          </p>
                          <p>
                            <span className="text-muted-foreground">MST:</span>{" "}
                            <span className="font-mono">{c.taxCode ?? "—"}</span>
                          </p>
                          <p>
                            <span className="text-muted-foreground">GPKD:</span>{" "}
                            <span className="font-mono">{c.businessRegNumber ?? "—"}</span>
                          </p>
                          <p>
                            <span className="text-muted-foreground">Đại diện pháp luật:</span>{" "}
                            {c.legalRepresentative ?? "—"}
                          </p>
                          <p>
                            <span className="text-muted-foreground">Email DN:</span>{" "}
                            {c.contactEmail ?? "—"}
                          </p>
                          <p className="sm:col-span-2">
                            <span className="text-muted-foreground">Trụ sở:</span>{" "}
                            {c.businessAddress ?? "—"}
                          </p>
                          <p>
                            <span className="text-muted-foreground">Hết trial:</span>{" "}
                            {fmt(c.trialEndsAt)}
                          </p>
                          <p>
                            <span className="text-muted-foreground">Duyệt lúc:</span>{" "}
                            {fmt(c.approvedAt)}
                          </p>
                          {c.rejectedReason && (
                            <p className="sm:col-span-2 text-destructive">
                              <span className="text-muted-foreground">Lý do từ chối:</span>{" "}
                              {c.rejectedReason}
                            </p>
                          )}
                          {c.isSuspended && c.suspendedReason && (
                            <p className="sm:col-span-2 text-destructive">
                              <span className="text-muted-foreground">Lý do tạm dừng:</span>{" "}
                              {c.suspendedReason}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2 border-t">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDetailChain(c)}
                            data-testid={`button-detail-${c.id}`}
                          >
                            <BarChart3 className="h-4 w-4 mr-1" />
                            Xem chi tiết
                          </Button>
                          {c.approvalStatus === "pending" && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => approveMutation.mutate(c.id)}
                                disabled={approveMutation.isPending}
                                data-testid={`button-approve-${c.id}`}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Duyệt & nâng Pro
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setRejectChain(c)}
                                data-testid={`button-reject-${c.id}`}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Từ chối
                              </Button>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={!!rejectChain} onOpenChange={(open) => !open && setRejectChain(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối chuỗi</DialogTitle>
            <DialogDescription>
              Vui lòng ghi rõ lý do để chủ chuỗi điều chỉnh hồ sơ.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
            placeholder="Ví dụ: Mã số thuế không khớp với tên doanh nghiệp..."
            data-testid="input-reject-reason"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectChain(null)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || rejectMutation.isPending}
              onClick={() =>
                rejectChain &&
                rejectMutation.mutate({ id: rejectChain.id, reason: rejectReason.trim() })
              }
              data-testid="button-confirm-reject"
            >
              Xác nhận từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {detailChain && (
        <ChainDetailDialog
          chain={detailChain}
          open={!!detailChain}
          onClose={() => setDetailChain(null)}
        />
      )}

      {storesChain && (
        <ChainStoresDialog
          chain={storesChain}
          open={!!storesChain}
          onClose={() => setStoresChain(null)}
        />
      )}

    </div>
  );
}

interface ChainStoreRow {
  id: string;
  name: string;
  address: string;
  district: string;
  city: string;
  phone: string;
  isActive: boolean;
  ratingAvg: number;
  ratingCount: number;
  orderCount: number;
  revenueTotal: number;
  createdAt: string;
}

function ChainStoresDialog({
  chain,
  open,
  onClose,
}: {
  chain: AdminChain;
  open: boolean;
  onClose: () => void;
}) {
  const storesQuery = useQuery({
    queryKey: ["admin-chain-stores", chain.id],
    queryFn: async (): Promise<ChainStoreRow[]> => {
      const res = await fetch(`/api/admin/chains/${chain.id}/stores`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Không tải được danh sách cửa hàng");
      return res.json();
    },
    enabled: open,
  });

  const stores = storesQuery.data ?? [];
  const activeCount = stores.filter((s) => s.isActive).length;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-3xl w-[calc(100vw-1.5rem)] sm:w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6"
        data-testid="dialog-chain-stores"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Cửa hàng của {chain.businessName ?? chain.name}
          </DialogTitle>
          <DialogDescription>
            {storesQuery.isLoading
              ? "Đang tải danh sách cửa hàng..."
              : `${stores.length} cửa hàng (đang hoạt động: ${activeCount})`}
          </DialogDescription>
        </DialogHeader>

        {storesQuery.error && (
          <p className="text-sm text-destructive">
            {(storesQuery.error as Error).message}
          </p>
        )}

        {!storesQuery.isLoading && stores.length === 0 && (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Chuỗi này chưa có cửa hàng nào.
          </p>
        )}

        {stores.length > 0 && (
          <div className="space-y-2">
            {stores.map((s) => {
              const location = [s.district, s.city].filter(Boolean).join(", ");
              return (
                <div
                  key={s.id}
                  data-testid={`chain-store-row-${s.id}`}
                  className="border border-border rounded-md p-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{s.name}</span>
                        <Badge variant={s.isActive ? "default" : "secondary"}>
                          {s.isActive ? "Đang mở" : "Tạm đóng"}
                        </Badge>
                        {s.ratingCount > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                            <Star className="h-3 w-3 fill-current" />
                            {s.ratingAvg.toFixed(1)} ({s.ratingCount})
                          </span>
                        )}
                      </div>
                      {(s.address || location) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {[s.address, location].filter(Boolean).join(" — ")}
                        </p>
                      )}
                      {s.phone && (
                        <p className="text-xs text-muted-foreground">
                          SĐT: {s.phone}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold text-emerald-600">
                        {formatCurrency(s.revenueTotal)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {s.orderCount} đơn
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        Mở {fmt(s.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ChainDetailDialog({
  chain,
  open,
  onClose,
}: {
  chain: AdminChain;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [extendMonths, setExtendMonths] = useState<string>("12");
  const [terminateReason, setTerminateReason] = useState<string>("");
  const [showTerminate, setShowTerminate] = useState<boolean>(false);
  const [newPassword, setNewPassword] = useState<string>("");
  const [showResetPwd, setShowResetPwd] = useState<boolean>(false);

  const detailQuery = useQuery({
    queryKey: ["admin-chain-detail", chain.id],
    queryFn: async (): Promise<AdminChainDetail> => {
      const res = await fetch(`/api/admin/chains/${chain.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Không tải được chi tiết chuỗi");
      return res.json();
    },
    enabled: open,
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["admin-chains"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
    qc.invalidateQueries({ queryKey: ["admin-chain-detail", chain.id] });
  };

  const extendMutation = useMutation({
    mutationFn: async (months: number) => {
      const res = await fetch(`/api/admin/chains/${chain.id}/extend`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ months }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Không gia hạn được");
      }
    },
    onSuccess: () => {
      toast({ title: "Đã gia hạn", description: "Hạn sử dụng đã được cập nhật." });
      invalidateAll();
    },
    onError: (err) =>
      toast({ title: "Lỗi", description: (err as Error).message, variant: "destructive" }),
  });

  const terminateMutation = useMutation({
    mutationFn: async (reason: string) => {
      const res = await fetch(`/api/admin/chains/${chain.id}/terminate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Không chấm dứt được");
      }
    },
    onSuccess: () => {
      toast({ title: "Đã chấm dứt", description: "Chuỗi đã bị tạm dừng truy cập." });
      setShowTerminate(false);
      setTerminateReason("");
      invalidateAll();
    },
    onError: (err) =>
      toast({ title: "Lỗi", description: (err as Error).message, variant: "destructive" }),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (password: string) => {
      const res = await fetch(`/api/admin/chains/${chain.id}/reset-password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Không đặt lại được mật khẩu");
      }
    },
    onSuccess: () => {
      toast({
        title: "Đã đặt lại mật khẩu",
        description: `Vui lòng gửi mật khẩu mới cho ${chain.email} qua kênh an toàn.`,
      });
      setShowResetPwd(false);
      setNewPassword("");
    },
    onError: (err) =>
      toast({ title: "Lỗi", description: (err as Error).message, variant: "destructive" }),
  });

  const reactivateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/chains/${chain.id}/reactivate`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Không kích hoạt lại được");
      }
    },
    onSuccess: () => {
      toast({ title: "Đã kích hoạt lại" });
      invalidateAll();
    },
    onError: (err) =>
      toast({ title: "Lỗi", description: (err as Error).message, variant: "destructive" }),
  });

  const detail = detailQuery.data;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-chain-detail">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {chain.businessName ?? chain.name}
          </DialogTitle>
          <DialogDescription>
            Tổng quan hoạt động và quản lý gói thuê bao của chuỗi.
          </DialogDescription>
        </DialogHeader>

        {detailQuery.isLoading && <p className="text-muted-foreground">Đang tải...</p>}
        {detailQuery.error && (
          <p className="text-destructive">{(detailQuery.error as Error).message}</p>
        )}

        {detail && (
          <div className="space-y-6">
            <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatTile
                icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
                label="Tổng doanh thu"
                value={formatCurrency(detail.stats.revenueTotal)}
                testId="stat-detail-revenue"
              />
              <StatTile
                icon={<ShoppingCart className="h-4 w-4 text-primary" />}
                label="Tổng đơn"
                value={String(detail.stats.orderCount)}
                testId="stat-detail-orders"
              />
              <StatTile
                icon={<Store className="h-4 w-4 text-primary" />}
                label="Cửa hàng"
                value={`${detail.stats.activeStoreCount}/${detail.stats.storeCount}`}
                hint="Đang hoạt động"
                testId="stat-detail-stores"
              />
              <StatTile
                icon={<UsersRound className="h-4 w-4 text-primary" />}
                label="Nhân viên"
                value={String(detail.stats.staffTotal)}
                hint={`QL ${detail.stats.staffManagers} · TN ${detail.stats.staffCashiers} · Pha chế ${detail.stats.staffBaristas}`}
                testId="stat-detail-staff"
              />
              <StatTile
                icon={<Users className="h-4 w-4 text-primary" />}
                label="Khách hàng"
                value={String(detail.stats.customerCount)}
                hint="Có đặt đơn"
                testId="stat-detail-customers"
              />
              <StatTile
                icon={<Star className="h-4 w-4 text-amber-500" />}
                label="Đánh giá"
                value={detail.stats.ratingAvg ? detail.stats.ratingAvg.toFixed(2) : "—"}
                hint={`${detail.stats.ratingCount} lượt`}
                testId="stat-detail-rating"
              />
            </section>

            <section>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Doanh thu 6 tháng gần nhất
              </h3>
              <div className="h-64 bg-muted/30 rounded-lg p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={detail.revenueByMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis
                      tickFormatter={(v) =>
                        v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}tr` : `${v / 1000}k`
                      }
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      formatter={(v: number) => [formatCurrency(v), "Doanh thu"]}
                      labelFormatter={(l) => `Tháng ${l}`}
                    />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="grid lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Cửa hàng trong chuỗi</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {detail.stores.length === 0 && (
                    <p className="text-muted-foreground">Chưa có cửa hàng nào.</p>
                  )}
                  {detail.stores.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between border-b last:border-0 py-1.5"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${s.isActive ? "bg-emerald-500" : "bg-muted-foreground"}`}
                        />
                        {s.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {s.ratingCount > 0 ? `${s.ratingAvg.toFixed(1)} (${s.ratingCount})` : "Chưa có đánh giá"}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">10 đơn hàng mới nhất</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  {detail.recentOrders.length === 0 && (
                    <p className="text-muted-foreground">Chưa có đơn nào.</p>
                  )}
                  {detail.recentOrders.map((o) => (
                    <div key={o.id} className="flex items-center justify-between border-b last:border-0 py-1.5">
                      <div className="min-w-0">
                        <p className="font-mono text-xs truncate">{o.code}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {o.storeName} · {fmtDateTime(o.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(o.total)}</p>
                        <p className="text-xs text-muted-foreground">{o.status}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>

            <section className="border rounded-lg p-4 space-y-3 bg-muted/20">
              <h3 className="font-semibold flex items-center gap-2">
                <CalendarClock className="h-4 w-4" /> Quản lý gói thuê bao
              </h3>
              <div className="text-sm grid sm:grid-cols-2 gap-2">
                <p>
                  <span className="text-muted-foreground">Gói:</span>{" "}
                  <span className="font-medium">{detail.chain.plan === "pro" ? "Pro" : "Trial"}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Hạn sử dụng:</span>{" "}
                  <span className="font-medium">{fmt(detail.chain.planExpiresAt)}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Trạng thái:</span>{" "}
                  {detail.chain.isSuspended ? (
                    <Badge variant="destructive">Đã chấm dứt</Badge>
                  ) : (
                    <Badge variant="default">Đang hoạt động</Badge>
                  )}
                </p>
                {detail.chain.isSuspended && detail.chain.suspendedAt && (
                  <p>
                    <span className="text-muted-foreground">Tạm dừng lúc:</span>{" "}
                    {fmtDateTime(detail.chain.suspendedAt)}
                  </p>
                )}
                {detail.chain.suspendedReason && (
                  <p className="sm:col-span-2 text-destructive">
                    <span className="text-muted-foreground">Lý do tạm dừng:</span>{" "}
                    {detail.chain.suspendedReason}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-end gap-2 pt-2 border-t">
                <div className="flex items-end gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="extend-months" className="text-xs">
                      Gia hạn (tháng)
                    </Label>
                    <Input
                      id="extend-months"
                      type="number"
                      min={1}
                      max={36}
                      value={extendMonths}
                      onChange={(e) => setExtendMonths(e.target.value)}
                      className="w-24"
                      data-testid="input-extend-months"
                    />
                  </div>
                  <Button
                    onClick={() => {
                      const n = Number(extendMonths);
                      if (!Number.isFinite(n) || n < 1 || n > 36) {
                        toast({
                          title: "Lỗi",
                          description: "Số tháng phải từ 1 đến 36",
                          variant: "destructive",
                        });
                        return;
                      }
                      extendMutation.mutate(n);
                    }}
                    disabled={extendMutation.isPending}
                    data-testid="button-extend"
                  >
                    <PlayCircle className="h-4 w-4 mr-1" />
                    Gia hạn
                  </Button>
                </div>
                <div className="flex-1" />
                <Button
                  variant="outline"
                  onClick={() => setShowResetPwd(true)}
                  data-testid="button-reset-password"
                >
                  <KeyRound className="h-4 w-4 mr-1" />
                  Đặt lại mật khẩu
                </Button>
                {detail.chain.isSuspended ? (
                  <Button
                    variant="default"
                    onClick={() => reactivateMutation.mutate()}
                    disabled={reactivateMutation.isPending}
                    data-testid="button-reactivate"
                  >
                    <PlayCircle className="h-4 w-4 mr-1" />
                    Kích hoạt lại
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    onClick={() => setShowTerminate(true)}
                    data-testid="button-terminate"
                  >
                    <PauseCircle className="h-4 w-4 mr-1" />
                    Chấm dứt
                  </Button>
                )}
              </div>
            </section>
          </div>
        )}

        <Dialog open={showTerminate} onOpenChange={setShowTerminate}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Chấm dứt sử dụng</DialogTitle>
              <DialogDescription>
                Chuỗi và toàn bộ nhân viên thuộc chuỗi sẽ không thể đăng nhập cho đến khi được kích
                hoạt lại.
              </DialogDescription>
            </DialogHeader>
            <Textarea
              value={terminateReason}
              onChange={(e) => setTerminateReason(e.target.value)}
              rows={4}
              placeholder="Lý do chấm dứt..."
              data-testid="input-terminate-reason"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTerminate(false)}>
                Hủy
              </Button>
              <Button
                variant="destructive"
                disabled={!terminateReason.trim() || terminateMutation.isPending}
                onClick={() => terminateMutation.mutate(terminateReason.trim())}
                data-testid="button-confirm-terminate"
              >
                Xác nhận chấm dứt
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showResetPwd} onOpenChange={setShowResetPwd}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Đặt lại mật khẩu chủ chuỗi</DialogTitle>
              <DialogDescription>
                Mật khẩu mới sẽ áp dụng ngay cho tài khoản <strong>{chain.email}</strong>. Hãy gửi
                cho chủ chuỗi qua kênh an toàn (SMS, gọi điện) và nhắc họ đổi lại sau khi đăng nhập.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="reset-pwd">Mật khẩu mới</Label>
              <Input
                id="reset-pwd"
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                data-testid="input-reset-password"
              />
              <p className="text-xs text-muted-foreground">
                Gợi ý: tạo mật khẩu mạnh ngẫu nhiên (chữ + số + ký tự đặc biệt).
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowResetPwd(false)}>
                Hủy
              </Button>
              <Button
                disabled={newPassword.length < 6 || resetPasswordMutation.isPending}
                onClick={() => resetPasswordMutation.mutate(newPassword)}
                data-testid="button-confirm-reset-password"
              >
                <KeyRound className="h-4 w-4 mr-1" />
                Xác nhận đặt lại
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

function StatTile({
  icon,
  label,
  value,
  hint,
  testId,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  testId?: string;
}) {
  return (
    <div className="bg-card border rounded-lg p-3" data-testid={testId}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-lg font-bold mt-0.5 truncate">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}
