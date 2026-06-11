import {
  useListExpenses,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  getListExpensesQueryKey,
  useListExpenseCategories,
  useCreateExpenseCategory,
  useUpdateExpenseCategory,
  useDeleteExpenseCategory,
  getListExpenseCategoriesQueryKey,
  useListStores,
  type Expense,
  type ExpenseCategory,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Pencil, FolderTree, Paperclip, FileText, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/components/confirm-provider";
import { useStoreId } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency, formatDate } from "@/lib/format";
import { useT } from "@/lib/i18n-context";

const UNCATEGORIZED = "__uncategorized__";

function todayIso(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthToInput(periodMonth: string): string {
  return periodMonth;
}

export default function ExpensesPage() {
  const t = useT();
  const { storeId } = useStoreId();
  const { user } = useAuth();
  const isOwner = user?.role === "owner";
  const filterStoreId = storeId && storeId !== "all" ? storeId : undefined;
  const [month, setMonth] = useState<string>(currentMonth());
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: stores = [] } = useListStores();
  const visibleStores = useMemo(() => {
    if (!user) return stores;
    if (user.role === "owner") return stores;
    return stores.filter((s) => user.storeIds.includes(s.id));
  }, [stores, user]);
  const activeStores = visibleStores.filter((s) => s.isActive);

  const { data: categories = [] } = useListExpenseCategories();
  const activeCategories = (categories as ExpenseCategory[]).filter((c) => c.isActive);

  const listParams: Record<string, string> = { month };
  if (filterStoreId) listParams.storeId = filterStoreId;
  if (categoryFilter !== "all") listParams.categoryId = categoryFilter;

  const { data: expensesData = [], isLoading } = useListExpenses(listParams);
  const expenses = expensesData as Expense[];

  const total = useMemo(
    () => expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
    [expenses],
  );
  const byCategory = useMemo(() => {
    const map = new Map<string, { name: string; amount: number; count: number }>();
    for (const e of expenses) {
      const key = e.categoryId ?? UNCATEGORIZED;
      const name = e.categoryName ?? "Chưa phân loại";
      const cur = map.get(key);
      if (cur) {
        cur.amount += Number(e.amount) || 0;
        cur.count += 1;
      } else {
        map.set(key, { name, amount: Number(e.amount) || 0, count: 1 });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const canCreate = activeStores.length > 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">{t.expenses.title}</h1>
          <p className="text-muted-foreground mt-1">
            {t.expenses.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isOwner && (
            <Button
              variant="outline"
              onClick={() => setCategoriesOpen(true)}
              data-testid="button-manage-expense-categories"
            >
              <FolderTree className="w-4 h-4 mr-2" /> {t.expenses.category}
            </Button>
          )}
          <Button
            onClick={() => setCreateOpen(true)}
            disabled={!canCreate}
            data-testid="button-create-expense"
          >
            <Plus className="w-4 h-4 mr-2" /> {t.expenses.addExpense}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-card-border p-4 shadow-sm">
          <div className="text-xs uppercase text-muted-foreground tracking-wide">
            Tổng chi tháng {month}
          </div>
          <div className="text-2xl font-bold text-primary mt-1" data-testid="text-expenses-total">
            {formatCurrency(total)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {expenses.length} khoản chi
          </div>
        </div>
        <div className="bg-card rounded-xl border border-card-border p-4 shadow-sm sm:col-span-2">
          <div className="text-xs uppercase text-muted-foreground tracking-wide mb-2">
            Theo danh mục
          </div>
          {byCategory.length === 0 ? (
            <div className="text-sm text-muted-foreground">{t.common.noData}</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {byCategory.map((c, i) => (
                <Badge key={i} variant="secondary" className="font-normal">
                  {c.name}: {formatCurrency(c.amount)}
                  <span className="text-muted-foreground ml-1">({c.count})</span>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end bg-card border border-card-border rounded-xl p-4">
        <div className="space-y-1">
          <Label className="text-xs">Tháng</Label>
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value || currentMonth())}
            className="w-[180px]"
            data-testid="input-expenses-month"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t.expenses.category}</Label>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[220px]" data-testid="select-expenses-category-filter">
              <SelectValue placeholder={t.common.all} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.common.all}</SelectItem>
              {activeCategories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-xs text-muted-foreground self-center sm:ml-auto">
          {filterStoreId
            ? `${t.expenses.store}: ${visibleStores.find((s) => s.id === filterStoreId)?.name ?? ""}`
            : "Tất cả cửa hàng"}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-card-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[110px]">{t.expenses.date}</TableHead>
                <TableHead>{t.expenses.store}</TableHead>
                <TableHead>{t.expenses.category}</TableHead>
                <TableHead>{t.expenses.description}</TableHead>
                <TableHead>Đính kèm</TableHead>
                <TableHead>Người tạo</TableHead>
                <TableHead className="text-right">{t.expenses.amount}</TableHead>
                <TableHead className="w-[100px] text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    {t.common.loading}
                  </TableCell>
                </TableRow>
              ) : expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    {t.expenses.noExpenses}
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((e) => (
                  <TableRow key={e.id} data-testid={`row-expense-${e.id}`}>
                    <TableCell className="font-mono text-xs">
                      {formatDate(e.expenseDate, "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{e.storeName}</TableCell>
                    <TableCell>
                      {e.categoryName ? (
                        <Badge variant="outline" className="font-normal">
                          {e.categoryName}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">{t.common.noData}</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[260px]">
                      <span className="line-clamp-2 text-sm">{e.description || "—"}</span>
                    </TableCell>
                    <TableCell>
                      {e.attachments && e.attachments.length > 0 ? (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Paperclip className="w-3 h-3" />
                          {e.attachments.length}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {e.createdByName ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      {formatCurrency(Number(e.amount) || 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditing(e)}
                          data-testid={`button-edit-expense-${e.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <DeleteExpenseBtn id={e.id} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.expenses.addExpenseTitle}</DialogTitle>
            <DialogDescription>
              Nhập thông tin khoản chi và đính kèm hóa đơn/chứng từ nếu có.
            </DialogDescription>
          </DialogHeader>
          <ExpenseForm
            stores={activeStores}
            categories={activeCategories}
            onSuccess={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.expenses.editExpense}</DialogTitle>
          </DialogHeader>
          {editing && (
            <ExpenseForm
              stores={activeStores}
              categories={activeCategories}
              initial={editing}
              onSuccess={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={categoriesOpen} onOpenChange={setCategoriesOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.expenses.category}</DialogTitle>
            <DialogDescription>
              Phân loại chi phí để tiện cho kế toán (điện, nước, mặt bằng, lương, khác).
            </DialogDescription>
          </DialogHeader>
          <CategoriesManager />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DeleteExpenseBtn({ id }: { id: string }) {
  const t = useT();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const del = useDeleteExpense();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-destructive hover:bg-destructive/10"
      onClick={async () => {
        const ok = await confirm({
          title: t.expenses.deleteExpense,
          description: t.expenses.deleteExpenseDesc,
          confirmText: t.common.delete,
          variant: "destructive",
        });
        if (!ok) return;
        del.mutate(
          { id },
          {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
              toast({ title: t.common.deleted });
            },
            onError: (e: Error) =>
              toast({ title: t.common.error, description: e.message, variant: "destructive" }),
          },
        );
      }}
      data-testid={`button-delete-expense-${id}`}
    >
      <Trash2 className="w-4 h-4" />
    </Button>
  );
}

interface ExpenseFormProps {
  stores: { id: string; name: string; isActive: boolean }[];
  categories: ExpenseCategory[];
  initial?: Expense;
  onSuccess: () => void;
}

function ExpenseForm({ stores, categories, initial, onSuccess }: ExpenseFormProps) {
  const t = useT();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { storeId: globalStoreId } = useStoreId();
  const create = useCreateExpense();
  const update = useUpdateExpense();

  const initialStoreId =
    initial?.storeId ??
    (globalStoreId && globalStoreId !== "all" ? globalStoreId : stores[0]?.id ?? "");

  const [storeId, setStoreId] = useState(initialStoreId);
  const [categoryId, setCategoryId] = useState<string>(initial?.categoryId ?? UNCATEGORIZED);
  const [amountStr, setAmountStr] = useState<string>(
    initial ? String(Number(initial.amount) || 0) : "",
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [expenseDate, setExpenseDate] = useState<string>(
    initial?.expenseDate ?? todayIso(),
  );
  const [attachments, setAttachments] = useState<string[]>(initial?.attachments ?? []);
  const [isUploading, setIsUploading] = useState(false);

  // Make sure the selected category is still in the list when editing an
  // expense whose original category has been deactivated.
  const categoryOptions = useMemo(() => {
    const opts = [...categories];
    if (initial?.categoryId && !categories.find((c) => c.id === initial.categoryId)) {
      opts.push({
        id: initial.categoryId,
        ownerId: "",
        code: initial.categoryCode ?? "",
        name: initial.categoryName ?? "(Đã ẩn)",
        description: "",
        isActive: false,
        createdAt: "",
      });
    }
    return opts;
  }, [categories, initial]);

  async function uploadAttachment(file: File): Promise<string | null> {
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Tệp quá lớn",
        description: `${file.name} vượt quá 10 MB.`,
        variant: "destructive",
      });
      return null;
    }
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    if (!isImage && !isPdf) {
      toast({
        title: "Tệp không hợp lệ",
        description: `${file.name} không phải ảnh hoặc PDF.`,
        variant: "destructive",
      });
      return null;
    }
    try {
      const reqRes = await fetch("/api/storage/uploads/request-doc-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          contentType: file.type || "application/octet-stream",
        }),
      });
      if (!reqRes.ok) {
        const err = await reqRes.json().catch(() => ({}));
        throw new Error(err.error || "Không lấy được URL tải lên");
      }
      const { uploadURL, objectPath } = (await reqRes.json()) as {
        uploadURL: string;
        objectPath: string;
      };
      const putRes = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" },
      });
      if (!putRes.ok) throw new Error("Tải lên thất bại");
      return `/api/storage${objectPath}`;
    } catch (err) {
      const e = err instanceof Error ? err : new Error("Lỗi tải tệp");
      toast({ title: "Lỗi tải tệp", description: e.message, variant: "destructive" });
      return null;
    }
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const remaining = 10 - attachments.length;
    if (remaining <= 0) {
      toast({
        title: "Tối đa 10 tệp",
        description: "Vui lòng xóa bớt tệp đính kèm trước khi tải thêm.",
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }
    const accepted = files.slice(0, remaining);
    setIsUploading(true);
    try {
      const uploaded: string[] = [];
      for (const f of accepted) {
        const url = await uploadAttachment(f);
        if (url) uploaded.push(url);
      }
      if (uploaded.length > 0) {
        setAttachments((prev) => [...prev, ...uploaded]);
        toast({
          title: "Đã tải lên",
          description: `Đính kèm ${uploaded.length} tệp.`,
        });
      }
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  }

  function removeAttachment(idx: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(amountStr.replace(/[,\s]/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({ title: t.common.error, description: "Số tiền phải lớn hơn 0", variant: "destructive" });
      return;
    }
    if (!expenseDate) {
      toast({ title: t.common.error, description: "Chọn ngày phát sinh", variant: "destructive" });
      return;
    }
    if (!storeId) {
      toast({ title: t.common.error, description: "Chọn cửa hàng", variant: "destructive" });
      return;
    }
    const resolvedCategory = categoryId === UNCATEGORIZED ? null : categoryId;

    if (initial) {
      update.mutate(
        {
          id: initial.id,
          data: {
            categoryId: resolvedCategory,
            amount,
            description,
            expenseDate,
            attachments,
          },
        },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
            toast({ title: t.expenses.expenseUpdated });
            onSuccess();
          },
          onError: (err: Error) =>
            toast({ title: t.common.error, description: err.message, variant: "destructive" }),
        },
      );
    } else {
      create.mutate(
        {
          data: {
            storeId,
            categoryId: resolvedCategory,
            amount,
            description,
            expenseDate,
            attachments,
          },
        },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
            toast({ title: t.expenses.expenseCreated });
            onSuccess();
          },
          onError: (err: Error) =>
            toast({ title: t.common.error, description: err.message, variant: "destructive" }),
        },
      );
    }
  }

  const isPending = create.isPending || update.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2 col-span-2">
          <Label>
            {t.expenses.store} <span className="text-destructive">*</span>
          </Label>
          {initial ? (
            <Input value={initial.storeName} disabled />
          ) : (
            <Select value={storeId} onValueChange={setStoreId}>
              <SelectTrigger data-testid="select-expense-store">
                <SelectValue placeholder={t.expenses.store} />
              </SelectTrigger>
              <SelectContent>
                {stores.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="space-y-2">
          <Label>{t.expenses.category}</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger data-testid="select-expense-category">
              <SelectValue placeholder="Chưa phân loại" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNCATEGORIZED}>Chưa phân loại</SelectItem>
              {categoryOptions.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                  {!c.isActive ? " (đã ẩn)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>
            {t.expenses.date} <span className="text-destructive">*</span>
          </Label>
          <Input
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            data-testid="input-expense-date"
          />
        </div>
        <div className="space-y-2 col-span-2">
          <Label>
            {t.expenses.amount} (VNĐ) <span className="text-destructive">*</span>
          </Label>
          <Input
            type="number"
            inputMode="numeric"
            min="0"
            step="1000"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            placeholder="VD: 1500000"
            data-testid="input-expense-amount"
          />
        </div>
        <div className="space-y-2 col-span-2">
          <Label>{t.expenses.description}</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="VD: Hóa đơn tiền điện tháng 04, kỳ 01-30/04"
            data-testid="input-expense-description"
          />
        </div>
        <div className="space-y-2 col-span-2">
          <Label className="flex items-center gap-2">
            Đính kèm chứng từ
            <span className="text-xs font-normal text-muted-foreground">
              (Ảnh hoặc PDF, tối đa 10 tệp · 10 MB / tệp)
            </span>
          </Label>
          <Input
            type="file"
            multiple
            accept="image/*,application/pdf"
            onChange={handleFiles}
            disabled={isUploading || attachments.length >= 10}
            data-testid="input-expense-attachments"
          />
          {isUploading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" /> Đang tải...
            </div>
          )}
          {attachments.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
              {attachments.map((url, idx) => (
                <AttachmentPreview
                  key={url + idx}
                  url={url}
                  onRemove={() => removeAttachment(idx)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <DialogFooter className="pt-2">
        <Button type="button" variant="outline" onClick={onSuccess}>
          {t.common.cancel}
        </Button>
        <Button type="submit" disabled={isPending || isUploading} data-testid="button-submit-expense">
          {initial ? t.common.save : t.common.create}
        </Button>
      </DialogFooter>
    </form>
  );
}

function AttachmentPreview({ url, onRemove }: { url: string; onRemove: () => void }) {
  const isImg = /\.(png|jpe?g|webp|gif)$/i.test(url) || url.includes("image");
  const isPdf = /\.pdf($|\?)/i.test(url);
  // For object-storage paths we cannot infer MIME from URL alone, so render
  // an <img> by default and fall back to a file-style card if the image
  // fails to load.
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative group rounded-md border bg-muted/30 overflow-hidden">
      {!failed && !isPdf ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="block aspect-[4/3]">
          <img
            src={url}
            alt="Đính kèm"
            className="w-full h-full object-cover"
            onError={() => setFailed(true)}
          />
        </a>
      ) : (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center aspect-[4/3] p-3 text-center"
        >
          <FileText className="w-8 h-8 text-muted-foreground mb-1" />
          <span className="text-xs text-muted-foreground line-clamp-2 break-all">
            {url.split("/").pop() ?? "Tệp đính kèm"}
          </span>
        </a>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1 right-1 bg-background/90 border rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
        aria-label="Xóa đính kèm"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

function CategoriesManager() {
  const t = useT();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const { data: categories = [], isLoading } = useListExpenseCategories();
  const create = useCreateExpenseCategory();
  const update = useUpdateExpenseCategory();
  const del = useDeleteExpenseCategory();
  const list = categories as ExpenseCategory[];

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  function reset() {
    setName("");
    setCode("");
    setDescription("");
    setEditingId(null);
  }

  function startEdit(cat: ExpenseCategory) {
    setEditingId(cat.id);
    setName(cat.name);
    setCode(cat.code);
    setDescription(cat.description);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: t.common.error, description: "Tên danh mục bắt buộc", variant: "destructive" });
      return;
    }
    const onDone = (label: string) => {
      queryClient.invalidateQueries({ queryKey: getListExpenseCategoriesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
      toast({ title: label });
      reset();
    };
    const onErr = (err: Error) =>
      toast({ title: t.common.error, description: err.message, variant: "destructive" });
    if (editingId) {
      update.mutate(
        { id: editingId, data: { name, code, description } },
        { onSuccess: () => onDone(t.common.success), onError: onErr },
      );
    } else {
      create.mutate(
        { data: { name, code, description } },
        { onSuccess: () => onDone(t.common.success), onError: onErr },
      );
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: "Ẩn danh mục này?",
      description: "Danh mục sẽ không còn xuất hiện khi tạo khoản chi mới. Các khoản chi cũ vẫn giữ tên cũ.",
      confirmText: "Ẩn danh mục",
      variant: "warning",
    });
    if (!ok) return;
    del.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListExpenseCategoriesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
          toast({ title: t.common.deleted });
        },
        onError: (err: Error) =>
          toast({ title: t.common.error, description: err.message, variant: "destructive" }),
      },
    );
  }

  function handleReactivate(cat: ExpenseCategory) {
    update.mutate(
      { id: cat.id, data: { isActive: true } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListExpenseCategoriesQueryKey() });
          toast({ title: t.common.success });
        },
        onError: (err: Error) =>
          toast({ title: t.common.error, description: err.message, variant: "destructive" }),
      },
    );
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
        <div className="space-y-1 sm:col-span-1">
          <Label className="text-xs">Mã (kế toán)</Label>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="VD: 6427"
            data-testid="input-category-code"
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-xs">
            Tên danh mục <span className="text-destructive">*</span>
          </Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="VD: Tiền điện"
            data-testid="input-category-name"
          />
        </div>
        <div className="sm:col-span-3 space-y-1">
          <Label className="text-xs">{t.expenses.description}</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            data-testid="input-category-description"
          />
        </div>
        <div className="sm:col-span-3 flex justify-end gap-2">
          {editingId && (
            <Button type="button" variant="outline" onClick={reset}>
              {t.common.cancel}
            </Button>
          )}
          <Button
            type="submit"
            disabled={create.isPending || update.isPending}
            data-testid="button-submit-category"
          >
            {editingId ? t.common.save : t.common.create}
          </Button>
        </div>
      </form>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Mã</TableHead>
              <TableHead>Tên</TableHead>
              <TableHead>{t.expenses.description}</TableHead>
              <TableHead className="w-[110px]">Trạng thái</TableHead>
              <TableHead className="w-[120px] text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                  {t.common.loading}
                </TableCell>
              </TableRow>
            ) : list.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                  {t.common.noData}
                </TableCell>
              </TableRow>
            ) : (
              list.map((c) => (
                <TableRow key={c.id} data-testid={`row-category-${c.id}`}>
                  <TableCell className="font-mono text-xs">{c.code || "—"}</TableCell>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {c.description || "—"}
                  </TableCell>
                  <TableCell>
                    {c.isActive ? (
                      <Badge variant="secondary">{t.users.isActive}</Badge>
                    ) : (
                      <Badge variant="outline">Đã ẩn</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEdit(c)}
                        data-testid={`button-edit-category-${c.id}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      {c.isActive ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(c.id)}
                          data-testid={`button-delete-category-${c.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReactivate(c)}
                          data-testid={`button-reactivate-category-${c.id}`}
                        >
                          Bật lại
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
