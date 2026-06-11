import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatCurrency } from "@/lib/format";
import {
  Users,
  Search,
  MoreHorizontal,
  Eye,
  KeyRound,
  Lock,
  Unlock,
  ShoppingCart,
  Wallet,
  Store,
  Calendar,
  PauseCircle,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
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

interface AdminCustomer {
  id: string;
  email: string;
  name: string;
  phone: string;
  isSuspended: boolean;
  suspendedAt: string | null;
  suspendedReason: string | null;
  createdAt: string;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
}

interface AdminCustomerDetail {
  customer: AdminCustomer;
  stats: {
    orderCount: number;
    totalSpent: number;
    lastOrderAt: string | null;
    storeCount: number;
    totalCount: number;
    canceledCount: number;
  };
  favoriteStore: {
    id: string;
    name: string;
    orderCount: number;
    totalSpent: number;
  } | null;
  storeBreakdown: Array<{
    id: string;
    name: string;
    orderCount: number;
    totalSpent: number;
  }>;
  spendByMonth: Array<{ month: string; orders: number; spent: number }>;
  recentOrders: Array<{
    id: string;
    code: string;
    storeName: string;
    total: number;
    status: string;
    paymentMethod: string;
    createdAt: string;
  }>;
}

const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("vi-VN") : "—");
const fmtDateTime = (d: string) => new Date(d).toLocaleString("vi-VN");

const ORDER_STATUS_LABELS: Record<string, string> = {
  received: "Đã nhận",
  preparing: "Đang chuẩn bị",
  completed: "Hoàn tất",
  delivered: "Đã giao",
  canceled: "Đã hủy",
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Tiền mặt",
  qr: "QR",
  ewallet: "Ví điện tử",
  card: "Thẻ",
  cod: "COD",
};

export default function AdminCustomersPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<"all" | "active" | "suspended">("all");
  const [sort, setSort] = useState<"recent" | "spent" | "orders">("recent");
  const [detailCustomer, setDetailCustomer] = useState<AdminCustomer | null>(null);
  const [suspendCustomer, setSuspendCustomer] = useState<AdminCustomer | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [resetCustomer, setResetCustomer] = useState<AdminCustomer | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState("");

  const customersQuery = useQuery({
    queryKey: ["admin-customers", { search, status: statusTab, sort }],
    queryFn: async (): Promise<AdminCustomer[]> => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusTab !== "all") params.set("status", statusTab);
      if (sort !== "recent") params.set("sort", sort);
      const url = `/api/admin/customers${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Không tải được danh sách khách hàng");
      return res.json();
    },
  });

  const customers = customersQuery.data ?? [];
  const counts = useMemo(() => {
    return {
      total: customers.length,
      active: customers.filter((c) => !c.isSuspended).length,
      suspended: customers.filter((c) => c.isSuspended).length,
      totalSpent: customers.reduce((sum, c) => sum + c.totalSpent, 0),
      totalOrders: customers.reduce((sum, c) => sum + c.orderCount, 0),
    };
  }, [customers]);

  const suspendMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await fetch(`/api/admin/customers/${id}/suspend`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Không khóa được tài khoản");
      }
    },
    onSuccess: () => {
      toast({ title: "Đã khóa tài khoản khách hàng" });
      setSuspendCustomer(null);
      setSuspendReason("");
      qc.invalidateQueries({ queryKey: ["admin-customers"] });
      qc.invalidateQueries({ queryKey: ["admin-customer-detail"] });
    },
    onError: (err) =>
      toast({ title: "Lỗi", description: (err as Error).message, variant: "destructive" }),
  });

  const reactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/customers/${id}/reactivate`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Không mở lại được tài khoản");
      }
    },
    onSuccess: () => {
      toast({ title: "Đã mở lại tài khoản" });
      qc.invalidateQueries({ queryKey: ["admin-customers"] });
      qc.invalidateQueries({ queryKey: ["admin-customer-detail"] });
    },
    onError: (err) =>
      toast({ title: "Lỗi", description: (err as Error).message, variant: "destructive" }),
  });

  const resetMutation = useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      const res = await fetch(`/api/admin/customers/${id}/reset-password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Không đặt lại được mật khẩu");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Đã đặt lại mật khẩu",
        description: "Hãy gửi mật khẩu mới cho khách hàng qua kênh an toàn.",
      });
      setResetCustomer(null);
      setResetPassword("");
      setResetPasswordConfirm("");
    },
    onError: (err) =>
      toast({ title: "Lỗi", description: (err as Error).message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6 max-w-6xl mx-auto" data-testid="page-admin-customers">
      <div className="flex items-start sm:items-center gap-3">
        <div className="bg-primary/10 text-primary p-1.5 sm:p-2 rounded-lg shrink-0">
          <Users className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-base sm:text-2xl font-bold leading-tight">Quản lý khách hàng</h1>
          <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
            Toàn bộ tài khoản khách hàng đã đăng ký trên VComm Store, lịch sử mua sắm và thao tác bảo mật.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">Tổng khách hàng</p>
            <p className="text-lg sm:text-2xl font-bold flex items-center gap-1.5 mt-1" data-testid="stat-customers-total">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" /> {counts.total}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">Đang hoạt động</p>
            <p className="text-lg sm:text-2xl font-bold flex items-center gap-1.5 mt-1 text-emerald-600" data-testid="stat-customers-active">
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" /> {counts.active}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">Đã khóa</p>
            <p className="text-lg sm:text-2xl font-bold flex items-center gap-1.5 mt-1 text-rose-500" data-testid="stat-customers-suspended">
              <PauseCircle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" /> {counts.suspended}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">Tổng chi tiêu</p>
            <p className="text-sm sm:text-xl font-bold flex items-center gap-1.5 mt-1 text-primary" data-testid="stat-customers-spent">
              <Wallet className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              <span className="truncate">{formatCurrency(counts.totalSpent)}</span>
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 leading-tight">{counts.totalOrders} đơn hợp lệ</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Danh sách khách hàng</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm tên, email, SĐT..."
                className="pl-9"
                data-testid="input-search-customer"
              />
            </div>
            <div className="flex gap-2">
              <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
                <SelectTrigger className="flex-1 sm:flex-none sm:w-52" data-testid="select-sort">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Mới đăng ký nhất</SelectItem>
                  <SelectItem value="spent">Chi tiêu nhiều nhất</SelectItem>
                  <SelectItem value="orders">Nhiều đơn nhất</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => customersQuery.refetch()}
                title="Làm mới"
                data-testid="button-refresh"
                className="shrink-0"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <Tabs value={statusTab} onValueChange={(v) => setStatusTab(v as typeof statusTab)}>
            <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
              <TabsList className="w-max">
                <TabsTrigger value="all" data-testid="tab-all">Tất cả</TabsTrigger>
                <TabsTrigger value="active" data-testid="tab-active">Đang hoạt động</TabsTrigger>
                <TabsTrigger value="suspended" data-testid="tab-suspended">Đã khóa</TabsTrigger>
              </TabsList>
            </div>
          </Tabs>

          {customersQuery.isLoading ? (
            <div className="text-center py-10 text-muted-foreground">Đang tải...</div>
          ) : customers.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto opacity-30 mb-3" />
              <p>Chưa có khách hàng nào phù hợp.</p>
            </div>
          ) : isMobile ? (
            <div className="space-y-2">
              {customers.map((c) => (
                <div
                  key={c.id}
                  className="rounded-lg border border-border p-3 bg-card"
                  data-testid={`row-customer-${c.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 text-primary rounded-full w-10 h-10 flex items-center justify-center text-sm font-semibold shrink-0">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{c.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{c.email}</div>
                          {c.phone && (
                            <div className="text-xs text-muted-foreground">{c.phone}</div>
                          )}
                        </div>
                        <CustomerActionsMenu
                          customer={c}
                          onView={() => setDetailCustomer(c)}
                          onReset={() => setResetCustomer(c)}
                          onSuspend={() => setSuspendCustomer(c)}
                          onReactivate={() => reactivateMutation.mutate(c.id)}
                          className="-mr-1 -mt-1"
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        {c.isSuspended ? (
                          <Badge variant="destructive" className="gap-1 text-[10px] py-0 px-1.5">
                            <Lock className="w-2.5 h-2.5" /> Đã khóa
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 gap-1 text-[10px] py-0 px-1.5">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Hoạt động
                          </Badge>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {c.orderCount} đơn ·{" "}
                          <span className="font-semibold text-primary">
                            {formatCurrency(c.totalSpent)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-2">Khách hàng</th>
                    <th className="text-left px-4 py-2">Liên hệ</th>
                    <th className="text-right px-4 py-2">Đơn</th>
                    <th className="text-right px-4 py-2">Chi tiêu</th>
                    <th className="text-left px-4 py-2 hidden lg:table-cell">Đơn gần nhất</th>
                    <th className="text-left px-4 py-2">Trạng thái</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/20" data-testid={`row-customer-${c.id}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="bg-primary/10 text-primary rounded-full w-9 h-9 flex items-center justify-center text-sm font-semibold shrink-0">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium truncate">{c.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm truncate">{c.email}</div>
                        <div className="text-xs text-muted-foreground">{c.phone || "—"}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">{c.orderCount}</td>
                      <td className="px-4 py-3 text-right font-semibold text-primary">
                        {formatCurrency(c.totalSpent)}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-sm text-muted-foreground">
                        {fmtDate(c.lastOrderAt)}
                      </td>
                      <td className="px-4 py-3">
                        {c.isSuspended ? (
                          <Badge variant="destructive" className="gap-1">
                            <Lock className="w-3 h-3" /> Đã khóa
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Hoạt động
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <CustomerActionsMenu
                          customer={c}
                          onView={() => setDetailCustomer(c)}
                          onReset={() => setResetCustomer(c)}
                          onSuspend={() => setSuspendCustomer(c)}
                          onReactivate={() => reactivateMutation.mutate(c.id)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <CustomerDetailDialog
        customer={detailCustomer}
        onClose={() => setDetailCustomer(null)}
        onSuspend={(c) => {
          setDetailCustomer(null);
          setSuspendCustomer(c);
        }}
        onReactivate={(c) => {
          reactivateMutation.mutate(c.id);
          setDetailCustomer(null);
        }}
        onReset={(c) => {
          setDetailCustomer(null);
          setResetCustomer(c);
        }}
      />

      {/* Suspend dialog */}
      <Dialog open={!!suspendCustomer} onOpenChange={(o) => !o && setSuspendCustomer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" /> Khóa tài khoản khách hàng
            </DialogTitle>
            <DialogDescription>
              Khách hàng <span className="font-semibold">{suspendCustomer?.name}</span> sẽ không thể đăng nhập
              và mọi phiên đang mở sẽ bị buộc đăng xuất ngay lập tức.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="suspendReason">Lý do (bắt buộc)</Label>
            <Textarea
              id="suspendReason"
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="VD: Vi phạm chính sách / Có hành vi gian lận / Khách hàng yêu cầu khóa..."
              rows={3}
              data-testid="input-suspend-reason"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendCustomer(null)}>Hủy</Button>
            <Button
              variant="destructive"
              disabled={!suspendReason.trim() || suspendMutation.isPending}
              onClick={() =>
                suspendCustomer &&
                suspendMutation.mutate({ id: suspendCustomer.id, reason: suspendReason.trim() })
              }
              data-testid="button-confirm-suspend"
            >
              {suspendMutation.isPending ? "Đang khóa..." : "Khóa tài khoản"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset password dialog */}
      <Dialog open={!!resetCustomer} onOpenChange={(o) => !o && setResetCustomer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" /> Đặt lại mật khẩu
            </DialogTitle>
            <DialogDescription>
              Đặt mật khẩu mới cho <span className="font-semibold">{resetCustomer?.name}</span>{" "}
              ({resetCustomer?.email}). Tất cả phiên đăng nhập hiện tại sẽ bị buộc đăng xuất.
              Hãy gửi mật khẩu cho khách qua kênh an toàn (gọi điện, SMS riêng).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="resetPwd">Mật khẩu mới (6-64 ký tự)</Label>
              <Input
                id="resetPwd"
                type="text"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="VD: VComm Store2026!"
                data-testid="input-reset-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="resetPwdConfirm">Xác nhận lại</Label>
              <Input
                id="resetPwdConfirm"
                type="text"
                value={resetPasswordConfirm}
                onChange={(e) => setResetPasswordConfirm(e.target.value)}
                data-testid="input-reset-password-confirm"
              />
            </div>
            {resetPassword && resetPasswordConfirm && resetPassword !== resetPasswordConfirm && (
              <p className="text-xs text-destructive">Hai mật khẩu không khớp.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetCustomer(null)}>Hủy</Button>
            <Button
              disabled={
                resetPassword.length < 6 ||
                resetPassword !== resetPasswordConfirm ||
                resetMutation.isPending
              }
              onClick={() =>
                resetCustomer && resetMutation.mutate({ id: resetCustomer.id, password: resetPassword })
              }
              data-testid="button-confirm-reset"
            >
              {resetMutation.isPending ? "Đang lưu..." : "Đặt lại mật khẩu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

function CustomerActionsMenu({
  customer,
  onView,
  onReset,
  onSuspend,
  onReactivate,
  className,
}: {
  customer: AdminCustomer;
  onView: () => void;
  onReset: () => void;
  onSuspend: () => void;
  onReactivate: () => void;
  className?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 shrink-0 ${className ?? ""}`}
          data-testid={`button-actions-${customer.id}`}
        >
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onView} data-testid={`action-view-${customer.id}`}>
          <Eye className="w-4 h-4 mr-2" /> Xem chi tiết
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onReset} data-testid={`action-reset-${customer.id}`}>
          <KeyRound className="w-4 h-4 mr-2" /> Đặt lại mật khẩu
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {customer.isSuspended ? (
          <DropdownMenuItem
            onClick={onReactivate}
            data-testid={`action-reactivate-${customer.id}`}
          >
            <Unlock className="w-4 h-4 mr-2" /> Mở lại tài khoản
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onClick={onSuspend}
            className="text-destructive focus:text-destructive"
            data-testid={`action-suspend-${customer.id}`}
          >
            <Lock className="w-4 h-4 mr-2" /> Khóa tài khoản
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CustomerDetailDialog({
  customer,
  onClose,
  onSuspend,
  onReactivate,
  onReset,
}: {
  customer: AdminCustomer | null;
  onClose: () => void;
  onSuspend: (c: AdminCustomer) => void;
  onReactivate: (c: AdminCustomer) => void;
  onReset: (c: AdminCustomer) => void;
}) {
  const detailQuery = useQuery({
    queryKey: ["admin-customer-detail", customer?.id],
    enabled: !!customer,
    queryFn: async (): Promise<AdminCustomerDetail> => {
      const res = await fetch(`/api/admin/customers/${customer!.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Không tải được chi tiết");
      return res.json();
    },
  });

  if (!customer) return null;
  const detail = detailQuery.data;

  return (
    <Dialog open={!!customer} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl w-[calc(100vw-1.5rem)] sm:w-full max-h-[92vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="bg-primary/10 text-primary rounded-full w-10 h-10 flex items-center justify-center font-bold">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="truncate">{customer.name}</div>
              <div className="text-xs font-normal text-muted-foreground truncate">{customer.email}</div>
            </div>
          </DialogTitle>
          <DialogDescription>
            Tham gia ngày {fmtDate(customer.createdAt)} · {customer.phone || "Chưa có số điện thoại"}
          </DialogDescription>
        </DialogHeader>

        {customer.isSuspended && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 flex items-start gap-2 text-sm">
            <Lock className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <div className="font-semibold text-rose-700">Tài khoản đang bị khóa</div>
              <div className="text-rose-600 text-xs mt-0.5">
                Từ {customer.suspendedAt ? fmtDateTime(customer.suspendedAt) : "—"}
              </div>
              {customer.suspendedReason && (
                <div className="text-rose-700 text-sm mt-1 italic">"{customer.suspendedReason}"</div>
              )}
            </div>
          </div>
        )}

        {detailQuery.isLoading || !detail ? (
          <div className="text-center py-10 text-muted-foreground">Đang tải...</div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Đơn hợp lệ</p>
                  <p className="text-xl font-bold flex items-center gap-2 mt-1">
                    <ShoppingCart className="w-4 h-4 text-primary" /> {detail.stats.orderCount}
                  </p>
                  {detail.stats.canceledCount > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      ({detail.stats.canceledCount} đơn đã hủy)
                    </p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Tổng chi tiêu</p>
                  <p className="text-lg font-bold flex items-center gap-2 mt-1 text-primary">
                    <Wallet className="w-4 h-4" /> {formatCurrency(detail.stats.totalSpent)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Số cửa hàng đã ghé</p>
                  <p className="text-xl font-bold flex items-center gap-2 mt-1">
                    <Store className="w-4 h-4 text-primary" /> {detail.stats.storeCount}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Đơn gần nhất</p>
                  <p className="text-sm font-semibold flex items-center gap-2 mt-1">
                    <Calendar className="w-4 h-4 text-primary" />{" "}
                    {detail.stats.lastOrderAt ? fmtDate(detail.stats.lastOrderAt) : "—"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {detail.favoriteStore && (
              <div className="rounded-lg border border-border p-3 flex items-center gap-3 bg-primary/5">
                <div className="bg-primary/15 text-primary p-2 rounded-lg">
                  <Store className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Cửa hàng yêu thích</p>
                  <p className="font-semibold truncate">{detail.favoriteStore.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {detail.favoriteStore.orderCount} đơn · {formatCurrency(detail.favoriteStore.totalSpent)}
                  </p>
                </div>
              </div>
            )}

            {detail.spendByMonth.some((m) => m.spent > 0) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> Chi tiêu 6 tháng gần đây
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={detail.spendByMonth}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" fontSize={11} />
                        <YAxis fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip
                          formatter={(value: number, key) =>
                            key === "spent" ? formatCurrency(value) : value
                          }
                        />
                        <Bar dataKey="spent" fill="hsl(var(--primary))" name="Chi tiêu" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {detail.recentOrders.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">20 đơn gần nhất</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/40 text-[10px] uppercase text-muted-foreground">
                        <tr>
                          <th className="text-left px-3 py-2">Mã</th>
                          <th className="text-left px-3 py-2">Cửa hàng</th>
                          <th className="text-left px-3 py-2 hidden sm:table-cell">Thanh toán</th>
                          <th className="text-right px-3 py-2">Tiền</th>
                          <th className="text-left px-3 py-2">Trạng thái</th>
                          <th className="text-left px-3 py-2 hidden sm:table-cell">Lúc</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {detail.recentOrders.map((o) => (
                          <tr key={o.id}>
                            <td className="px-3 py-2 font-mono">{o.code}</td>
                            <td className="px-3 py-2 truncate max-w-[150px]">{o.storeName}</td>
                            <td className="px-3 py-2 hidden sm:table-cell">
                              {PAYMENT_LABELS[o.paymentMethod] ?? o.paymentMethod}
                            </td>
                            <td className="px-3 py-2 text-right font-semibold">
                              {formatCurrency(o.total)}
                            </td>
                            <td className="px-3 py-2">
                              <Badge
                                variant={o.status === "canceled" ? "destructive" : "secondary"}
                                className="text-[10px]"
                              >
                                {ORDER_STATUS_LABELS[o.status] ?? o.status}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 hidden sm:table-cell text-muted-foreground">
                              {fmtDateTime(o.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" onClick={() => onReset(customer)} data-testid="detail-action-reset">
            <KeyRound className="w-4 h-4 mr-2" /> Đặt lại mật khẩu
          </Button>
          {customer.isSuspended ? (
            <Button onClick={() => onReactivate(customer)} data-testid="detail-action-reactivate">
              <Unlock className="w-4 h-4 mr-2" /> Mở lại tài khoản
            </Button>
          ) : (
            <Button
              variant="destructive"
              onClick={() => onSuspend(customer)}
              data-testid="detail-action-suspend"
            >
              <Lock className="w-4 h-4 mr-2" /> Khóa tài khoản
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>Đóng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
