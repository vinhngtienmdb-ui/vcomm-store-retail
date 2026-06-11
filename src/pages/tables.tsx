import {
  useListTables,
  useCreateTable,
  useUpdateTable,
  useDeleteTable,
  useMergeTables,
  useUnmergeTables,
  getListTablesQueryKey,
  useListStores,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useCallback } from "react";
import { Plus, Trash2, QrCode, Pencil, Printer, Merge, Split } from "lucide-react";
import { getMergeGroupColor } from "@/lib/merge-group-colors";
import QRCode from "react-qr-code";
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
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/components/confirm-provider";
import { useStoreId } from "@/lib/store-context";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/lib/i18n-context";

type TableRowData = {
  id: string;
  storeId: string;
  storeName: string;
  name: string;
  capacity: number;
  qrToken: string;
  note: string;
  isActive: boolean;
  mergeGroupId?: string | null;
  mergeGroupNames?: string | null;
  currentOrderCode?: string | null;
  currentOrderStatus?: string | null;
  currentOrderTotal?: number | null;
};

export default function TablesPage() {
  const t = useT();
  const { storeId } = useStoreId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: stores = [] } = useListStores();
  const filterStoreId = storeId && storeId !== "all" ? storeId : undefined;
  const { data: tables = [], isLoading } = useListTables(
    filterStoreId ? { storeId: filterStoreId } : undefined,
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<TableRowData | null>(null);
  const [qrTable, setQrTable] = useState<TableRowData | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const mergeMut = useMergeTables();
  const unmergeMut = useUnmergeTables();

  const list = useMemo(() => tables as unknown as TableRowData[], [tables]);
  const activeStores = stores.filter((s) => s.isActive);

  const groupNumberMap = useMemo(() => {
    const map = new Map<string, number>();
    let num = 1;
    for (const tbl of list) {
      if (tbl.mergeGroupId && !map.has(tbl.mergeGroupId)) {
        map.set(tbl.mergeGroupId, num++);
      }
    }
    return map;
  }, [list]);

  const refreshTables = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getListTablesQueryKey() });
  }, [queryClient]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleMerge = useCallback(async () => {
    const ids = [...selectedIds];
    if (ids.length < 2) {
      toast({ title: t.tables.mergeError, description: t.tables.selectToMerge, variant: "destructive" });
      return;
    }
    try {
      await mergeMut.mutateAsync({ data: { tableIds: ids } });
      refreshTables();
      setSelectedIds(new Set());
      toast({ title: t.tables.mergeSuccess });
    } catch (err: any) {
      toast({ title: t.tables.mergeError, description: err?.message ?? "", variant: "destructive" });
    }
  }, [selectedIds, mergeMut, refreshTables, toast, t]);

  const handleUnmerge = useCallback(async (tableId: string) => {
    try {
      await unmergeMut.mutateAsync({ data: { tableId } });
      refreshTables();
      toast({ title: t.tables.splitSuccess });
    } catch (err: any) {
      toast({ title: t.tables.splitError, description: err?.message ?? "", variant: "destructive" });
    }
  }, [unmergeMut, refreshTables, toast, t]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">{t.tables.title}</h1>
          <p className="text-muted-foreground mt-1">
            {t.tables.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size >= 2 && (
            <Button
              variant="default"
              className="hover-elevate"
              onClick={handleMerge}
              disabled={mergeMut.isPending}
              data-testid="button-merge-tables"
            >
              <Merge className="w-4 h-4 mr-2" /> {t.tables.mergeTables} ({selectedIds.size})
            </Button>
          )}
          {selectedIds.size > 0 && (
            <Button variant="outline" onClick={() => setSelectedIds(new Set())}>
              {t.pos.cancelSelect}
            </Button>
          )}
          <Button
            className="hover-elevate"
            onClick={() => setCreateOpen(true)}
            disabled={activeStores.length === 0}
            data-testid="button-create-table"
          >
            <Plus className="w-4 h-4 mr-2" /> {t.tables.addTable}
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-card-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <span className="sr-only">Select</span>
                </TableHead>
                <TableHead>{t.tables.tableName}</TableHead>
                <TableHead>{t.expenses.store}</TableHead>
                <TableHead className="text-right">{t.tables.capacity}</TableHead>
                <TableHead>{t.tables.mergedGroup}</TableHead>
                <TableHead>{t.shifts.status}</TableHead>
                <TableHead className="w-[220px] text-right">{t.inventory.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    {t.common.loading}
                  </TableCell>
                </TableRow>
              ) : list.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    {t.tables.noTables}
                  </TableCell>
                </TableRow>
              ) : (
                list.map((tbl) => {
                  const isMerged = !!tbl.mergeGroupId;
                  const mergeColor = isMerged ? getMergeGroupColor(tbl.mergeGroupId!) : null;
                  const isSelected = selectedIds.has(tbl.id);
                  return (
                    <TableRow
                      key={tbl.id}
                      data-testid={`row-table-${tbl.id}`}
                      className={isMerged && mergeColor ? mergeColor.row : ""}
                    >
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(tbl.id)}
                          className="h-4 w-4 rounded border-gray-300 accent-primary cursor-pointer"
                          data-testid={`checkbox-table-${tbl.id}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{tbl.name}</TableCell>
                      <TableCell className="text-muted-foreground">{tbl.storeName}</TableCell>
                      <TableCell className="text-right">{tbl.capacity}</TableCell>
                      <TableCell>
                        {isMerged && mergeColor ? (
                          <div className="flex items-center gap-1.5">
                            <Badge className={`${mergeColor.badge} text-xs`}>
                              <Merge className="w-3 h-3 mr-1" />
                              {t.tables.groupN} {groupNumberMap.get(tbl.mergeGroupId!)}
                            </Badge>
                            {tbl.mergeGroupNames && (
                              <span className="text-xs text-muted-foreground">
                                {t.tables.mergedWith}: {tbl.mergeGroupNames}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {tbl.isActive ? (
                          <Badge variant="secondary">{t.pos.occupied}</Badge>
                        ) : (
                          <Badge variant="outline">{t.products.inactive}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isMerged && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUnmerge(tbl.id)}
                              disabled={unmergeMut.isPending}
                              data-testid={`button-split-${tbl.id}`}
                              className="text-destructive hover:text-destructive"
                            >
                              <Split className="w-4 h-4 mr-1" /> {t.tables.splitTables}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setQrTable(tbl)}
                            data-testid={`button-qr-${tbl.id}`}
                          >
                            <QrCode className="w-4 h-4 mr-1" /> {t.tables.showQr}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditing(tbl)}
                            data-testid={`button-edit-${tbl.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <DeleteTableBtn id={tbl.id} />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.tables.addTableTitle}</DialogTitle>
          </DialogHeader>
          <TableForm onSuccess={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.tables.editTable}</DialogTitle>
          </DialogHeader>
          {editing && (
            <TableForm initial={editing} onSuccess={() => setEditing(null)} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!qrTable} onOpenChange={(o) => !o && setQrTable(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.tables.qrCode} — {qrTable?.name}</DialogTitle>
          </DialogHeader>
          {qrTable && <TableQrPanel table={qrTable} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function TableQrPanel({ table }: { table: TableRowData }) {
  const t = useT();
  const url = `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, "")}/t/${table.qrToken}`;
  const handlePrint = () => {
    const w = window.open("", "_blank", "width=400,height=600");
    if (!w) return;
    const svgEl = document.getElementById("qr-svg");
    const safeSvg = svgEl
      ? new XMLSerializer().serializeToString(svgEl.querySelector("svg") ?? svgEl)
      : "";
    const safeName = escapeHtml(table.name ?? "");
    const safeStore = escapeHtml(table.storeName ?? "");
    const safeUrl = escapeHtml(url);
    w.document.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>QR ${safeName}</title>
    <style>
      body { font-family: system-ui, sans-serif; text-align: center; padding: 24px; }
      h1 { font-size: 22px; margin: 0 0 4px; }
      h2 { font-size: 14px; font-weight: normal; margin: 0 0 16px; color: #555; }
      .qr { display: inline-block; padding: 16px; background: #fff; border: 1px solid #ddd; border-radius: 8px; }
      .url { font-size: 11px; color: #777; word-break: break-all; margin-top: 12px; }
    </style>
  </head>
  <body>
    <h1>${safeName}</h1>
    <h2>${safeStore}</h2>
    <div class="qr">${safeSvg}</div>
    <div class="url">${safeUrl}</div>
    <p style="margin-top:16px;font-size:12px;color:#444">Quet ma QR de goi mon tai ban</p>
  </body>
</html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 250);
  };
  return (
    <div className="space-y-4">
      <div className="bg-white p-6 rounded-md flex items-center justify-center" id="qr-wrap">
        <div id="qr-svg" className="w-[220px] h-[220px]">
          <QRCode value={url} size={220} />
        </div>
      </div>
      <div className="text-xs text-center text-muted-foreground break-all">{url}</div>
      <div className="flex justify-end">
        <Button onClick={handlePrint} data-testid="button-print-qr">
          <Printer className="w-4 h-4 mr-2" /> {t.tables.showQr}
        </Button>
      </div>
    </div>
  );
}

function DeleteTableBtn({ id }: { id: string }) {
  const t = useT();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const del = useDeleteTable();
  const handleDelete = async () => {
    const ok = await confirm({
      title: t.tables.deleteTable,
      description: t.tables.deleteTableDesc,
      confirmText: t.common.delete,
      variant: "destructive",
    });
    if (!ok) return;
    del.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTablesQueryKey() });
          toast({ title: t.common.deleted, description: t.tables.tableDeleted });
        },
        onError: (e: any) => {
          toast({
            title: t.common.error,
            description: e.message ?? "Không xóa được",
            variant: "destructive",
          });
        },
      },
    );
  };
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-destructive hover:bg-destructive/10"
      onClick={handleDelete}
    >
      <Trash2 className="w-4 h-4" />
    </Button>
  );
}

function TableForm({
  initial,
  onSuccess,
}: {
  initial?: TableRowData;
  onSuccess: () => void;
}) {
  const t = useT();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { storeId } = useStoreId();
  const { data: stores = [] } = useListStores();
  const create = useCreateTable();
  const update = useUpdateTable();

  const activeStores = stores.filter((s) => s.isActive);
  const initialStoreId = initial?.storeId ?? (storeId !== "all" ? storeId : activeStores[0]?.id ?? "");

  const [name, setName] = useState(initial?.name ?? "");
  const [capacity, setCapacity] = useState<number>(initial?.capacity ?? 4);
  const [note, setNote] = useState(initial?.note ?? "");
  const [selectedStore, setSelectedStore] = useState(initialStoreId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: t.common.error, description: "Tên bàn không được trống", variant: "destructive" });
      return;
    }
    if (initial) {
      update.mutate(
        { id: initial.id, data: { name, capacity, note } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListTablesQueryKey() });
            toast({ title: t.tables.tableUpdated });
            onSuccess();
          },
          onError: (e: any) =>
            toast({ title: t.common.error, description: e.message, variant: "destructive" }),
        },
      );
    } else {
      if (!selectedStore) {
        toast({ title: t.common.error, description: "Chọn cửa hàng", variant: "destructive" });
        return;
      }
      create.mutate(
        { data: { storeId: selectedStore, name, capacity, note } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListTablesQueryKey() });
            toast({ title: t.tables.tableCreated });
            onSuccess();
          },
          onError: (e: any) =>
            toast({ title: t.common.error, description: e.message, variant: "destructive" }),
        },
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!initial && (
        <div className="space-y-2">
          <Label>{t.expenses.store} <span className="text-destructive">*</span></Label>
          <select
            className="w-full border rounded-md h-10 px-3 bg-background"
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            data-testid="select-table-store"
          >
            {activeStores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="space-y-2">
        <Label>{t.tables.tableName} <span className="text-destructive">*</span></Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Bàn 1"
          data-testid="input-table-name"
        />
      </div>
      <div className="space-y-2">
        <Label>{t.tables.capacity}</Label>
        <Input
          type="number"
          min={1}
          value={capacity}
          onChange={(e) => setCapacity(Math.max(1, Number(e.target.value || 1)))}
          data-testid="input-table-capacity"
        />
      </div>
      <div className="space-y-2">
        <Label>Ghi chú</Label>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
      </div>
      <DialogFooter className="pt-4">
        <Button type="button" variant="outline" onClick={onSuccess}>
          {t.common.cancel}
        </Button>
        <Button
          type="submit"
          disabled={create.isPending || update.isPending}
          data-testid="button-submit-table"
        >
          {initial ? t.common.save : t.common.create}
        </Button>
      </DialogFooter>
    </form>
  );
}
