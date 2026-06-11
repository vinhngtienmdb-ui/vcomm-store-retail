import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Plus,
  Tags,
  MoreHorizontal,
  Pencil,
  Trash2,
  Calendar,
  Percent,
  Banknote,
  Truck,
  UserPlus,
  Gift,
  ShieldCheck,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/components/confirm-provider";

type PromoKind = "new_account" | "percent_invoice" | "percent_shipping" | "fixed";

interface PlatformPromo {
  id: string;
  code: string;
  name: string;
  kind: PromoKind;
  type: "percent" | "fixed";
  value: number;
  minOrder: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  perCustomerLimit: number;
  requiresCode: string | null;
  autoIssueOnSignup: boolean;
  startDate: string;
  endDate: string;
  isActive: boolean;
  usageCount: number;
  isPlatform: boolean;
}

const KIND_LABELS: Record<string, string> = {
  new_account: "Tài khoản mới",
  percent_invoice: "% trên hoá đơn",
  percent_shipping: "% trên phí ship",
  fixed: "Số tiền cố định",
};

function kindIcon(kind: string) {
  if (kind === "new_account") return <UserPlus className="w-5 h-5" />;
  if (kind === "percent_invoice") return <Percent className="w-5 h-5" />;
  if (kind === "percent_shipping") return <Truck className="w-5 h-5" />;
  return <Banknote className="w-5 h-5" />;
}

function isPercentKind(kind: string): boolean {
  return kind === "percent_invoice" || kind === "percent_shipping";
}

const QKEY = ["admin-platform-promotions"] as const;

async function fetchPromos(): Promise<PlatformPromo[]> {
  const res = await fetch("/api/admin/promotions", { credentials: "include" });
  if (!res.ok) throw new Error("Không tải được khuyến mãi nền tảng");
  return res.json();
}

export default function AdminPromotionsPage() {
  const { data: promotions = [], isLoading } = useQuery({ queryKey: QKEY, queryFn: fetchPromos });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editing, setEditing] = useState<PlatformPromo | null>(null);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
            <ShieldCheck className="h-7 w-7" /> Khuyến mãi nền tảng
          </h1>
          <p className="text-muted-foreground mt-1">
            Mã khuyến mãi do hệ thống phát hành (chào mừng tài khoản mới, dịp lễ...). Tất cả các
            chuỗi đều thấy và có thể áp dụng được cho khách của họ, nhưng không thể chỉnh sửa.
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-open-create-platform-promo">
              <Plus className="w-4 h-4 mr-2" /> Tạo mã nền tảng
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Tạo mã khuyến mãi nền tảng</DialogTitle>
            </DialogHeader>
            <PromotionForm onSuccess={() => setIsCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Đang tải...</div>
      ) : promotions.length === 0 ? (
        <div className="bg-card rounded-xl border border-dashed border-muted-foreground/20 p-12 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center text-muted-foreground mb-4">
            <Tags className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-medium">Chưa có mã khuyến mãi nền tảng</h3>
          <p className="text-muted-foreground mt-1 mb-4">
            Tạo mã chào mừng hoặc mã dịp lễ để áp dụng trên toàn hệ thống.
          </p>
          <Button onClick={() => setIsCreateOpen(true)} variant="outline">
            Tạo ngay
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {promotions.map((promo) => (
            <div
              key={promo.id}
              className={`bg-card rounded-xl border ${
                promo.isActive ? "border-primary/20 shadow-sm" : "border-card-border opacity-70"
              } overflow-hidden relative`}
              data-testid={`platform-promo-card-${promo.code}`}
            >
              <div className="p-5">
                <div className="flex justify-between items-start mb-3 gap-2">
                  <Badge variant="outline" className="font-mono text-sm bg-muted font-bold px-2 py-1">
                    {promo.code}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <Badge
                      variant={promo.isActive ? "default" : "secondary"}
                      className={
                        promo.isActive
                          ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20"
                          : ""
                      }
                    >
                      {promo.isActive ? "Đang chạy" : "Đã dừng"}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditing(promo)}>
                          <Pencil className="mr-2 h-4 w-4" /> Chỉnh sửa
                        </DropdownMenuItem>
                        <ToggleActiveItem promo={promo} />
                        <DropdownMenuSeparator />
                        <DeleteItem id={promo.id} />
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <h3 className="font-bold text-lg mb-1">{promo.name}</h3>
                <div className="flex flex-wrap gap-1 mb-3">
                  <Badge variant="secondary" className="gap-1">
                    {kindIcon(promo.kind)}
                    {KIND_LABELS[promo.kind] ?? promo.kind}
                  </Badge>
                  <Badge className="bg-violet-500/10 text-violet-600 border-violet-500/20">
                    Hệ thống
                  </Badge>
                </div>
                <div className="text-2xl font-bold text-primary mb-4">
                  {isPercentKind(promo.kind) ? <>Giảm {promo.value}%</> : <>Giảm {formatCurrency(promo.value)}</>}
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Đơn tối thiểu:</span>
                    <span className="font-medium text-foreground">{formatCurrency(promo.minOrder)}</span>
                  </div>
                  {promo.maxDiscount !== null && (
                    <div className="flex items-center justify-between">
                      <span>Giảm tối đa:</span>
                      <span className="font-medium text-foreground">{formatCurrency(promo.maxDiscount)}</span>
                    </div>
                  )}
                  {promo.usageLimit !== null && (
                    <div className="flex items-center justify-between">
                      <span>Số lượng:</span>
                      <span className="font-medium text-foreground">
                        {promo.usageCount}/{promo.usageLimit}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span>Mỗi khách:</span>
                    <span className="font-medium text-foreground">{promo.perCustomerLimit} lần</span>
                  </div>
                  {promo.autoIssueOnSignup && (
                    <div className="flex items-center gap-1 text-emerald-600">
                      <Gift className="w-3.5 h-3.5" /> Tự động phát khi đăng ký
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> Hạn dùng:
                    </span>
                    <span>
                      {formatDate(promo.startDate, "dd/MM HH:mm")} - {formatDate(promo.endDate, "dd/MM HH:mm")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa khuyến mãi nền tảng</DialogTitle>
          </DialogHeader>
          {editing && <PromotionForm promo={editing} onSuccess={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ToggleActiveItem({ promo }: { promo: PlatformPromo }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const m = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/promotions/${promo.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !promo.isActive }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Lỗi");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QKEY });
      toast({ title: "Đã cập nhật", description: `Khuyến mãi đã ${!promo.isActive ? "kích hoạt" : "dừng"}.` });
    },
  });
  return <DropdownMenuItem onClick={() => m.mutate()}>Thay đổi trạng thái</DropdownMenuItem>;
}

function DeleteItem({ id }: { id: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const m = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/promotions/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Xoá thất bại");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QKEY });
      toast({ title: "Đã xoá", description: "Đã xoá mã khuyến mãi nền tảng." });
    },
  });
  const handle = async () => {
    const ok = await confirm({
      title: "Xoá mã khuyến mãi nền tảng?",
      description: "Tất cả các chuỗi sẽ không còn thấy mã này.",
      confirmText: "Xoá",
      variant: "destructive",
    });
    if (ok) m.mutate();
  };
  return (
    <DropdownMenuItem onClick={handle} className="text-destructive focus:bg-destructive/10">
      <Trash2 className="mr-2 h-4 w-4" /> Xoá
    </DropdownMenuItem>
  );
}

function PromotionForm({ promo, onSuccess }: { promo?: PlatformPromo; onSuccess: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [code, setCode] = useState(promo?.code || "");
  const [name, setName] = useState(promo?.name || "");
  const [kind, setKind] = useState<PromoKind>(promo?.kind ?? "fixed");
  const [value, setValue] = useState(promo?.value.toString() ?? "");
  const [minOrder, setMinOrder] = useState(promo?.minOrder.toString() ?? "0");
  const [maxDiscount, setMaxDiscount] = useState(
    promo?.maxDiscount !== null && promo?.maxDiscount !== undefined ? String(promo.maxDiscount) : "",
  );
  const [usageLimit, setUsageLimit] = useState(
    promo?.usageLimit !== null && promo?.usageLimit !== undefined ? String(promo.usageLimit) : "",
  );
  const [perCustomerLimit, setPerCustomerLimit] = useState(promo?.perCustomerLimit?.toString() ?? "1");
  const [requiresCode, setRequiresCode] = useState(promo?.requiresCode ?? "");
  const [autoIssueOnSignup, setAutoIssueOnSignup] = useState(promo?.autoIssueOnSignup ?? false);

  const toLocalDateTimeInput = (iso?: string | Date) => {
    const dt = iso ? new Date(iso) : new Date();
    const off = dt.getTimezoneOffset();
    return new Date(dt.getTime() - off * 60_000).toISOString().slice(0, 16);
  };
  const [startDate, setStartDate] = useState(
    promo?.startDate ? toLocalDateTimeInput(promo.startDate) : toLocalDateTimeInput(),
  );
  const endDefaultDate = new Date();
  endDefaultDate.setMonth(endDefaultDate.getMonth() + 1);
  const [endDate, setEndDate] = useState(
    promo?.endDate ? toLocalDateTimeInput(promo.endDate) : toLocalDateTimeInput(endDefaultDate),
  );

  const m = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const url = promo ? `/api/admin/promotions/${promo.id}` : "/api/admin/promotions";
      const res = await fetch(url, {
        method: promo ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Lỗi");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QKEY });
      toast({ title: "Thành công", description: promo ? "Đã cập nhật" : "Đã tạo mã mới" });
      onSuccess();
    },
    onError: (err: Error) => toast({ title: "Lỗi", description: err.message, variant: "destructive" }),
  });

  const isPercent = isPercentKind(kind);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim() || !value) {
      toast({ title: "Lỗi", description: "Vui lòng điền đủ thông tin bắt buộc", variant: "destructive" });
      return;
    }
    const payload: Record<string, unknown> = {
      name,
      kind,
      value: Number(value),
      minOrder: Number(minOrder || 0),
      maxDiscount: maxDiscount.trim() ? Number(maxDiscount) : null,
      usageLimit: usageLimit.trim() ? Number(usageLimit) : null,
      perCustomerLimit: Math.max(1, Number(perCustomerLimit || 1)),
      requiresCode: requiresCode.trim() ? requiresCode.trim().toUpperCase() : null,
      autoIssueOnSignup,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
    };
    if (!promo) payload["code"] = code.trim().toUpperCase();
    m.mutate(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="form-platform-promo">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="code">
            Mã KM <span className="text-destructive">*</span>
          </Label>
          <Input
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="WELCOME15K"
            disabled={!!promo}
            className="font-mono uppercase"
            data-testid="input-platform-promo-code"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="kind">Loại</Label>
          <Select value={kind} onValueChange={(v) => setKind(v as PromoKind)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new_account">Tài khoản mới</SelectItem>
              <SelectItem value="percent_invoice">% trên hoá đơn</SelectItem>
              <SelectItem value="percent_shipping">% trên phí ship</SelectItem>
              <SelectItem value="fixed">Số tiền cố định (VNĐ)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">
          Tên chiến dịch <span className="text-destructive">*</span>
        </Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Quà chào mừng khách hàng mới" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="value">
            Mức giảm ({isPercent ? "%" : "VNĐ"}) <span className="text-destructive">*</span>
          </Label>
          <Input id="value" type="number" value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="minOrder">Đơn tối thiểu (VNĐ)</Label>
          <Input id="minOrder" type="number" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} />
        </div>
      </div>

      {isPercent && (
        <div className="space-y-2">
          <Label htmlFor="maxDiscount">Giảm tối đa (VNĐ) — bỏ trống nếu không giới hạn</Label>
          <Input id="maxDiscount" type="number" value={maxDiscount} onChange={(e) => setMaxDiscount(e.target.value)} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="usageLimit">Số lượng tổng</Label>
          <Input
            id="usageLimit"
            type="number"
            min="1"
            value={usageLimit}
            onChange={(e) => setUsageLimit(e.target.value)}
            placeholder="Không giới hạn"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="perCustomerLimit">Mỗi khách dùng tối đa</Label>
          <Input
            id="perCustomerLimit"
            type="number"
            min="1"
            value={perCustomerLimit}
            onChange={(e) => setPerCustomerLimit(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="requiresCode">Áp dụng cùng mã (kết hợp)</Label>
        <Input
          id="requiresCode"
          value={requiresCode}
          onChange={(e) => setRequiresCode(e.target.value.toUpperCase())}
          placeholder="Để trống nếu không yêu cầu"
          className="font-mono uppercase"
        />
      </div>

      <div className="flex items-center justify-between rounded-md border p-3">
        <div className="space-y-0.5">
          <Label htmlFor="autoIssueOnSignup" className="cursor-pointer">
            Tự động phát khi đăng ký tài khoản
          </Label>
          <p className="text-xs text-muted-foreground">
            Bật cho mã chào mừng — khách mới đăng ký sẽ tự nhận. Tắt cho mã dịp lễ công khai.
          </p>
        </div>
        <Switch id="autoIssueOnSignup" checked={autoIssueOnSignup} onCheckedChange={setAutoIssueOnSignup} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Từ ngày & giờ</Label>
          <Input id="startDate" type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">Đến ngày & giờ</Label>
          <Input id="endDate" type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      <DialogFooter className="pt-4">
        <Button type="button" variant="outline" onClick={onSuccess}>
          Huỷ
        </Button>
        <Button type="submit" disabled={m.isPending} data-testid="button-submit-platform-promo">
          {m.isPending ? "Đang xử lý..." : promo ? "Cập nhật" : "Tạo mới"}
        </Button>
      </DialogFooter>
    </form>
  );
}
