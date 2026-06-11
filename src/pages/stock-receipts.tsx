import {
  useListStockReceipts,
  useCreateStockReceipt,
  useGetStockReceipt,
  getListStockReceiptsQueryKey,
  getListInventoryQueryKey,
  useListSuppliers,
  useListProducts,
  useListIngredients,
  useListStores,
  CreateStockReceiptItemInputKind,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Trash2, Eye, ClipboardList, ScanLine, Camera } from "lucide-react";
import { ScanQR } from "@/components/scan-qr";
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
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useStoreId } from "@/lib/store-context";
import { useT } from "@/lib/i18n-context";

type Receipt = {
  id: string;
  code: string;
  storeId: string;
  storeName: string;
  supplierId?: string | null;
  supplierName?: string | null;
  receivedAt: string;
  receivedByName?: string | null;
  totalCost: number;
  itemCount: number;
  note: string;
};

export default function StockReceiptsPage() {
  const t = useT();
  const { storeId } = useStoreId();
  const filterStoreId = storeId && storeId !== "all" ? storeId : undefined;
  const { data: receipts = [], isLoading } = useListStockReceipts(
    filterStoreId ? { storeId: filterStoreId } : undefined,
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);

  const list = useMemo(() => receipts as unknown as Receipt[], [receipts]);
  const { data: stores = [] } = useListStores();
  const activeStores = stores.filter((s) => s.isActive);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">{t.stockReceipts.title}</h1>
          <p className="text-muted-foreground mt-1">
            {t.stockReceipts.subtitle}
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          disabled={activeStores.length === 0}
          data-testid="button-create-receipt"
        >
          <Plus className="w-4 h-4 mr-2" /> {t.stockReceipts.addReceipt}
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-card-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.stockReceipts.receiptCode}</TableHead>
                <TableHead>{t.stockReceipts.store}</TableHead>
                <TableHead>{t.stockReceipts.supplier}</TableHead>
                <TableHead>{t.stockReceipts.createdAt}</TableHead>
                <TableHead>{t.stockReceipts.itemName}</TableHead>
                <TableHead className="text-right">{t.stockReceipts.quantity}</TableHead>
                <TableHead className="text-right">{t.stockReceipts.totalAmount}</TableHead>
                <TableHead className="w-[80px] text-right">{t.stockReceipts.viewReceipt}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    {t.common.loading}
                  </TableCell>
                </TableRow>
              ) : list.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    {t.stockReceipts.noReceipts}
                  </TableCell>
                </TableRow>
              ) : (
                list.map((r) => (
                  <TableRow key={r.id} data-testid={`row-receipt-${r.id}`}>
                    <TableCell className="font-medium">
                      <Badge variant="outline" className="font-mono">
                        {r.code}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.storeName}</TableCell>
                    <TableCell>{r.supplierName ?? "—"}</TableCell>
                    <TableCell>
                      {new Date(r.receivedAt).toLocaleString("vi-VN", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </TableCell>
                    <TableCell>{r.receivedByName ?? "—"}</TableCell>
                    <TableCell className="text-right">{r.itemCount}</TableCell>
                    <TableCell className="text-right font-medium">
                      {Number(r.totalCost).toLocaleString("vi-VN")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setViewId(r.id)}
                        data-testid={`button-view-${r.id}`}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.stockReceipts.addReceiptTitle}</DialogTitle>
          </DialogHeader>
          <ReceiptForm onSuccess={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewId} onOpenChange={(o) => !o && setViewId(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t.stockReceipts.viewReceipt}</DialogTitle>
          </DialogHeader>
          {viewId && <ReceiptDetail id={viewId} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReceiptDetail({ id }: { id: string }) {
  const t = useT();
  const { data, isLoading } = useGetStockReceipt(id);
  if (isLoading || !data) return <div className="text-center text-muted-foreground py-8">{t.common.loading}</div>;
  const r = data as any;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-muted-foreground">{t.stockReceipts.receiptCode}</div>
          <div className="font-mono font-medium">{r.code}</div>
        </div>
        <div>
          <div className="text-muted-foreground">{t.stockReceipts.store}</div>
          <div>{r.storeName}</div>
        </div>
        <div>
          <div className="text-muted-foreground">{t.stockReceipts.supplier}</div>
          <div>{r.supplierName ?? "—"}</div>
        </div>
        <div>
          <div className="text-muted-foreground">{t.stockReceipts.createdAt}</div>
          <div>{new Date(r.receivedAt).toLocaleString("vi-VN")}</div>
        </div>
        {r.note && (
          <div className="col-span-2">
            <div className="text-muted-foreground">{t.stockReceipts.receiptNote}</div>
            <div>{r.note}</div>
          </div>
        )}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t.stockReceipts.product}</TableHead>
            <TableHead>{t.stockReceipts.itemName}</TableHead>
            <TableHead className="text-right">{t.stockReceipts.quantity}</TableHead>
            <TableHead>{t.stockReceipts.itemName}</TableHead>
            <TableHead className="text-right">{t.stockReceipts.unitCost}</TableHead>
            <TableHead className="text-right">{t.stockReceipts.itemTotal}</TableHead>
            <TableHead>{t.stockReceipts.createdAt}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {r.items.map((it: any) => (
            <TableRow key={it.id}>
              <TableCell>
                <Badge variant="outline" className="font-normal text-xs">
                  {it.kind === "product" ? t.stockReceipts.product : t.stockReceipts.ingredient}
                </Badge>
              </TableCell>
              <TableCell className="font-medium">{it.itemName}</TableCell>
              <TableCell className="text-right">{it.quantity}</TableCell>
              <TableCell>{it.unit}</TableCell>
              <TableCell className="text-right">
                {Number(it.unitCost).toLocaleString("vi-VN")}
              </TableCell>
              <TableCell className="text-right font-medium">
                {Number(it.lineTotal).toLocaleString("vi-VN")}
              </TableCell>
              <TableCell>
                {it.expirationDate
                  ? new Date(it.expirationDate).toLocaleDateString("vi-VN")
                  : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex justify-end items-center gap-3 border-t pt-3">
        <span className="text-muted-foreground">{t.common.total}:</span>
        <span className="text-lg font-bold text-primary">
          {Number(r.totalCost).toLocaleString("vi-VN")}đ
        </span>
      </div>
    </div>
  );
}

type LineDraft = {
  key: number;
  kind: CreateStockReceiptItemInputKind;
  itemId: string;
  quantity: number;
  unitCost: number;
  expirationDate: string;
  lotCode: string;
};

function ReceiptForm({ onSuccess }: { onSuccess: () => void }) {
  const t = useT();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { storeId } = useStoreId();
  const { data: stores = [] } = useListStores();
  const activeStores = stores.filter((s) => s.isActive);
  const initialStoreId =
    storeId && storeId !== "all" ? storeId : activeStores[0]?.id ?? "";

  const [selectedStore, setSelectedStore] = useState(initialStoreId);
  const [supplierId, setSupplierId] = useState<string>("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([
    {
      key: 1,
      kind: CreateStockReceiptItemInputKind.product,
      itemId: "",
      quantity: 1,
      unitCost: 0,
      expirationDate: "",
      lotCode: "",
    },
  ]);
  const nextKey = useMemo(() => Math.max(0, ...lines.map((l) => l.key)) + 1, [lines]);
  const [scanCode, setScanCode] = useState("");
  const [scanCameraOpen, setScanCameraOpen] = useState(false);

  const applyScannedCode = (rawCode: string) => {
    const code = rawCode.trim();
    if (!code) return;
    const product = (products as any[]).find(
      (p) => (p.sku ?? "").toString().toLowerCase() === code.toLowerCase(),
    );
    if (!product) {
      toast({
        title: t.stockReceipts.scanNotFound,
        description: code,
        variant: "destructive",
      });
      setScanCode("");
      return;
    }
    setLines((prev) => {
      const existingIdx = prev.findIndex(
        (l) =>
          l.kind === CreateStockReceiptItemInputKind.product &&
          l.itemId === product.id,
      );
      if (existingIdx >= 0) {
        const copy = prev.slice();
        copy[existingIdx] = {
          ...copy[existingIdx],
          quantity: (Number(copy[existingIdx].quantity) || 0) + 1,
        };
        return copy;
      }
      const emptyIdx = prev.findIndex((l) => !l.itemId);
      const newLine: LineDraft = {
        key: Math.max(0, ...prev.map((l) => l.key)) + 1,
        kind: CreateStockReceiptItemInputKind.product,
        itemId: product.id,
        quantity: 1,
        unitCost: Number(product.cost ?? product.purchasePrice ?? 0) || 0,
        expirationDate: "",
        lotCode: "",
      };
      if (emptyIdx >= 0) {
        const copy = prev.slice();
        copy[emptyIdx] = { ...newLine, key: prev[emptyIdx].key };
        return copy;
      }
      return [...prev, newLine];
    });
    toast({ title: t.stockReceipts.scanAdded, description: product.name });
    setScanCode("");
  };

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    applyScannedCode(scanCode);
  };

  const { data: suppliers = [] } = useListSuppliers(
    selectedStore ? { storeId: selectedStore } : undefined,
  );
  const { data: products = [] } = useListProducts(
    selectedStore ? { storeId: selectedStore } : undefined,
  );
  const { data: ingredients = [] } = useListIngredients(
    selectedStore ? { storeId: selectedStore } : undefined,
  );

  const create = useCreateStockReceipt();

  const total = lines.reduce(
    (sum, l) => sum + (l.itemId ? l.quantity * l.unitCost : 0),
    0,
  );

  const handleAddLine = () => {
    setLines((p) => [
      ...p,
      {
        key: nextKey,
        kind: CreateStockReceiptItemInputKind.product,
        itemId: "",
        quantity: 1,
        unitCost: 0,
        expirationDate: "",
        lotCode: "",
      },
    ]);
  };

  const handleRemoveLine = (key: number) => {
    setLines((p) => (p.length === 1 ? p : p.filter((l) => l.key !== key)));
  };

  const handleChangeLine = (key: number, patch: Partial<LineDraft>) => {
    setLines((p) =>
      p.map((l) => {
        if (l.key !== key) return l;
        const merged = { ...l, ...patch };
        if (patch.kind && patch.kind !== l.kind) {
          merged.itemId = "";
        }
        if (patch.itemId !== undefined && patch.itemId !== l.itemId && patch.itemId !== "") {
          const opts =
            (merged.kind === CreateStockReceiptItemInputKind.product
              ? products
              : ingredients) as any[];
          const picked = opts.find((it) => it.id === patch.itemId);
          if (picked) {
            const rate = Number(picked.conversionRate ?? 1) || 1;
            merged.quantity = rate;
            const cost = Number(picked.cost ?? picked.purchasePrice ?? 0) || 0;
            merged.unitCost = rate > 0 ? cost / rate : cost;
          }
        }
        return merged;
      }),
    );
  };

  const lineConversion = (l: LineDraft) => {
    const opts =
      (l.kind === CreateStockReceiptItemInputKind.product ? products : ingredients) as any[];
    const picked = opts.find((it) => it.id === l.itemId);
    if (!picked) return null;
    const rate = Number(picked.conversionRate ?? 1) || 1;
    const purchaseUnit = picked.purchaseUnit ?? "";
    const targetUnit =
      l.kind === CreateStockReceiptItemInputKind.product
        ? picked.sellUnit ?? ""
        : picked.usageUnit ?? picked.unit ?? "";
    return { rate, purchaseUnit, targetUnit };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStore) {
      toast({ title: t.common.error, description: t.stockReceipts.store, variant: "destructive" });
      return;
    }
    const cleanLines = lines.filter((l) => l.itemId);
    if (cleanLines.length === 0) {
      toast({ title: t.common.error, description: t.stockReceipts.noItems, variant: "destructive" });
      return;
    }
    for (const l of cleanLines) {
      if (l.quantity <= 0) {
        toast({ title: t.common.error, description: t.stockReceipts.quantity, variant: "destructive" });
        return;
      }
      if (l.unitCost < 0) {
        toast({ title: t.common.error, description: t.stockReceipts.unitCost, variant: "destructive" });
        return;
      }
    }
    create.mutate(
      {
        data: {
          storeId: selectedStore,
          supplierId: supplierId || null,
          note,
          items: cleanLines.map((l) => ({
            kind: l.kind,
            itemId: l.itemId,
            quantity: l.quantity,
            unitCost: l.unitCost,
            expirationDate: l.expirationDate || null,
            lotCode: l.lotCode,
          })),
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListStockReceiptsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListInventoryQueryKey() });
          toast({ title: t.stockReceipts.receiptCreated });
          onSuccess();
        },
        onError: (e: any) => {
          toast({
            title: t.common.error,
            description: e?.message ?? t.common.error,
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>{t.stockReceipts.store} <span className="text-destructive">*</span></Label>
          <select
            className="w-full border rounded-md h-10 px-3 bg-background"
            value={selectedStore}
            onChange={(e) => {
              setSelectedStore(e.target.value);
              setSupplierId("");
            }}
            data-testid="select-receipt-store"
          >
            {activeStores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>{t.stockReceipts.supplier}</Label>
          <select
            className="w-full border rounded-md h-10 px-3 bg-background"
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            data-testid="select-receipt-supplier"
          >
            <option value="">{t.common.noSelection}</option>
            {(suppliers as any[]).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[220px] space-y-1">
            <Label htmlFor="scan-sku" className="flex items-center gap-1.5">
              <ScanLine className="w-4 h-4" /> {t.stockReceipts.scanSku}
            </Label>
            <form onSubmit={handleScanSubmit}>
              <div className="flex gap-2">
                <Input
                  id="scan-sku"
                  value={scanCode}
                  onChange={(e) => setScanCode(e.target.value)}
                  placeholder={t.stockReceipts.scanSkuPlaceholder}
                  autoComplete="off"
                  data-testid="input-scan-sku"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setScanCameraOpen(true)}
                  data-testid="button-open-scan-camera"
                  title={t.stockReceipts.scanWithCamera}
                >
                  <Camera className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">{t.stockReceipts.scanWithCamera}</span>
                </Button>
              </div>
            </form>
            <p className="text-xs text-muted-foreground">{t.stockReceipts.scanSkuHint}</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleAddLine}>
            <Plus className="w-4 h-4 mr-1" /> {t.stockReceipts.addItem}
          </Button>
        </div>
        <ScanQR
          open={scanCameraOpen}
          onClose={() => setScanCameraOpen(false)}
          onResult={(text) => applyScannedCode(text)}
        />
        <div className="border rounded-md overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">{t.stockReceipts.product}</TableHead>
                <TableHead>{t.stockReceipts.itemName}</TableHead>
                <TableHead className="w-[100px]">{t.stockReceipts.quantity}</TableHead>
                <TableHead className="w-[120px]">{t.stockReceipts.unitCost}</TableHead>
                <TableHead className="w-[160px]">{t.stockReceipts.createdAt}</TableHead>
                <TableHead className="w-[40px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((l) => {
                const opts =
                  l.kind === CreateStockReceiptItemInputKind.product ? products : ingredients;
                return (
                  <TableRow key={l.key}>
                    <TableCell>
                      <select
                        className="w-full border rounded-md h-9 px-2 bg-background text-sm"
                        value={l.kind}
                        onChange={(e) =>
                          handleChangeLine(l.key, {
                            kind: e.target.value as CreateStockReceiptItemInputKind,
                          })
                        }
                        data-testid={`select-line-kind-${l.key}`}
                      >
                        <option value={CreateStockReceiptItemInputKind.product}>
                          {t.stockReceipts.product}
                        </option>
                        <option value={CreateStockReceiptItemInputKind.ingredient}>
                          {t.stockReceipts.ingredient}
                        </option>
                      </select>
                    </TableCell>
                    <TableCell>
                      <select
                        className="w-full border rounded-md h-9 px-2 bg-background text-sm"
                        value={l.itemId}
                        onChange={(e) =>
                          handleChangeLine(l.key, { itemId: e.target.value })
                        }
                        data-testid={`select-line-item-${l.key}`}
                      >
                        <option value="">{t.common.noSelection}</option>
                        {(opts as any[]).map((it: any) => (
                          <option key={it.id} value={it.id}>
                            {it.name}
                            {l.kind === CreateStockReceiptItemInputKind.product
                              ? ` (${it.sellUnit ?? it.purchaseUnit ?? ""})`
                              : ` (${it.usageUnit ?? it.unit ?? ""})`}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={l.quantity}
                        onChange={(e) =>
                          handleChangeLine(l.key, {
                            quantity: Number(e.target.value || 0),
                          })
                        }
                        data-testid={`input-line-qty-${l.key}`}
                      />
                      {(() => {
                        const c = lineConversion(l);
                        if (!c) return null;
                        return (
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {c.targetUnit ? `${t.stockReceipts.quantityIn} ${c.targetUnit}` : ""}
                            {c.rate > 1 && c.purchaseUnit && c.targetUnit
                              ? ` · ${t.stockReceipts.conversionPrefix} 1 ${c.purchaseUnit} = ${c.rate} ${c.targetUnit}`
                              : ""}
                          </p>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        step="100"
                        value={l.unitCost}
                        onChange={(e) =>
                          handleChangeLine(l.key, {
                            unitCost: Number(e.target.value || 0),
                          })
                        }
                        data-testid={`input-line-cost-${l.key}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        value={l.expirationDate}
                        onChange={(e) =>
                          handleChangeLine(l.key, { expirationDate: e.target.value })
                        }
                        data-testid={`input-line-exp-${l.key}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleRemoveLine(l.key)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-end gap-3 text-sm">
          <span className="text-muted-foreground">{t.common.subtotal}:</span>
          <span className="font-bold text-primary">
            {total.toLocaleString("vi-VN")}đ
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t.stockReceipts.receiptNote}</Label>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
      </div>

      <DialogFooter className="pt-2">
        <Button type="button" variant="outline" onClick={onSuccess}>
          {t.common.cancel}
        </Button>
        <Button type="submit" disabled={create.isPending} data-testid="button-submit-receipt">
          <ClipboardList className="w-4 h-4 mr-2" /> {t.common.save}
        </Button>
      </DialogFooter>
    </form>
  );
}
