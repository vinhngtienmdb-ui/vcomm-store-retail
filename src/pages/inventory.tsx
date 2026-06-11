import { useListInventory, useAdjustInventory, useTransferInventory, getListInventoryQueryKey, useListStores } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useStoreId } from "@/lib/store-context";
import { Box, ArrowRightLeft, Sliders, AlertTriangle, Package, Leaf } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
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
import { useT } from "@/lib/i18n-context";
import type { InventoryItem } from "@workspace/api-client-react";

export default function InventoryPage() {
  const t = useT();
  const { storeId } = useStoreId();
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const { data: inventory = [], isLoading } = useListInventory({
    storeId: storeId === 'all' ? undefined : storeId,
    kind: kindFilter === 'all' ? undefined : kindFilter as any,
    lowStockOnly: lowStockOnly || undefined
  });

  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [transferItem, setTransferItem] = useState<InventoryItem | null>(null);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">{t.inventory.title}</h1>
          <p className="text-muted-foreground mt-1">{t.inventory.subtitle}</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-card-border shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row items-center gap-4 bg-muted/20 justify-between">
          <div className="flex gap-4 items-center w-full sm:w-auto">
            <Select value={kindFilter} onValueChange={setKindFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t.inventory.classification} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.inventory.allItems}</SelectItem>
                <SelectItem value="product">{t.inventory.finishedProduct}</SelectItem>
                <SelectItem value="ingredient">{t.inventory.rawMaterial}</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center space-x-2 ml-4">
              <Switch id="low-stock" checked={lowStockOnly} onCheckedChange={setLowStockOnly} />
              <Label htmlFor="low-stock" className="text-amber-600 font-medium flex items-center cursor-pointer">
                <AlertTriangle className="w-4 h-4 mr-1"/> {t.inventory.lowStockOnly}
              </Label>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.inventory.itemName}</TableHead>
                <TableHead>{t.inventory.kind}</TableHead>
                <TableHead>{t.inventory.storeName}</TableHead>
                <TableHead className="text-right">{t.inventory.stockQty}</TableHead>
                <TableHead className="text-right">{t.inventory.minStock}</TableHead>
                <TableHead className="text-center">{t.inventory.updatedAt}</TableHead>
                <TableHead className="w-[180px] text-right">{t.inventory.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">{t.common.loading}</TableCell>
                </TableRow>
              ) : inventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    {t.inventory.noInventory}
                  </TableCell>
                </TableRow>
              ) : (
                inventory.map((item) => (
                  <TableRow key={item.id} className={item.isLow ? "bg-amber-500/5" : ""}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {item.kind === 'product' ? <Package className="w-4 h-4 text-primary" /> : <Leaf className="w-4 h-4 text-emerald-600" />}
                        {item.itemName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal text-xs">
                        {item.kind === 'product' ? t.inventory.finished : t.inventory.ingredient}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.storeName}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {item.isLow && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                        <span className={`font-bold ${item.isLow ? 'text-amber-600' : ''}`}>
                          {item.quantity} {item.unit}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{item.minQuantity} {item.unit}</TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground">{formatDate(item.updatedAt, "dd/MM HH:mm")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" className="h-8" onClick={() => setAdjustItem(item)}>
                          <Sliders className="w-3 h-3 mr-1" /> {t.inventory.adjust}
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setTransferItem(item)}>
                          <ArrowRightLeft className="w-3 h-3 text-primary" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {adjustItem && (
        <AdjustDialog item={adjustItem} onClose={() => setAdjustItem(null)} />
      )}

      {transferItem && (
        <TransferDialog item={transferItem} onClose={() => setTransferItem(null)} />
      )}
    </div>
  );
}

function AdjustDialog({ item, onClose }: { item: InventoryItem, onClose: () => void }) {
  const t = useT();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const adjust = useAdjustInventory();
  
  const [action, setAction] = useState<"set"|"add"|"sub">("set");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [minQty, setMinQty] = useState(item.minQuantity.toString());

  const handleSave = () => {
    const valNum = Number(value);
    if (isNaN(valNum)) return;

    let delta = 0;
    if (action === "set") delta = valNum - item.quantity;
    else if (action === "add") delta = valNum;
    else if (action === "sub") delta = -valNum;

    if (delta === 0 && Number(minQty) === item.minQuantity) {
      onClose();
      return;
    }

    if (!reason && delta !== 0) {
      toast({ title: t.common.error, description: t.inventory.adjustReason, variant: "destructive" });
      return;
    }

    adjust.mutate(
      { data: { storeId: item.storeId, kind: item.kind as any, itemId: item.itemId, delta, reason: reason || t.common.update, minQuantity: Number(minQty) } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListInventoryQueryKey() });
          toast({ title: t.common.success, description: t.inventory.inventoryUpdated });
          onClose();
        },
        onError: (e: any) => toast({ title: t.common.error, description: e.message, variant: "destructive" })
      }
    );
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.inventory.adjustTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex justify-between p-3 bg-muted rounded-lg text-sm">
            <span>{t.inventory.itemName}: <span className="font-bold">{item.itemName}</span></span>
            <span>{t.inventory.currentQty}: <span className="font-bold">{item.quantity} {item.unit}</span></span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Button type="button" variant={action === "set" ? "default" : "outline"} onClick={() => setAction("set")}>{t.inventory.setTo}</Button>
            <Button type="button" variant={action === "add" ? "default" : "outline"} onClick={() => setAction("add")}>{t.inventory.addQty}</Button>
            <Button type="button" variant={action === "sub" ? "default" : "outline"} onClick={() => setAction("sub")}>{t.inventory.subQty}</Button>
          </div>

          <div className="space-y-2">
            <Label>{t.inventory.newQty} ({item.unit})</Label>
            <Input type="number" value={value} onChange={e => setValue(e.target.value)} placeholder="0" />
          </div>

          <div className="space-y-2">
            <Label>{t.inventory.reason}</Label>
            <Input value={reason} onChange={e => setReason(e.target.value)} />
          </div>

          <div className="space-y-2 border-t pt-4">
            <Label>{t.inventory.minQtyLabel} ({item.unit})</Label>
            <Input type="number" value={minQty} onChange={e => setMinQty(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t.common.cancel}</Button>
          <Button onClick={handleSave} disabled={adjust.isPending}>{t.common.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TransferDialog({ item, onClose }: { item: InventoryItem, onClose: () => void }) {
  const t = useT();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const transfer = useTransferInventory();
  const { data: stores = [] } = useListStores();
  
  const [toStore, setToStore] = useState("");
  const [qty, setQty] = useState("");

  const otherStores = stores.filter(s => s.id !== item.storeId && s.isActive);

  const handleSave = () => {
    const q = Number(qty);
    if (!toStore) {
      toast({ title: t.common.error, description: t.inventory.toStore, variant: "destructive" });
      return;
    }
    if (!q || q <= 0 || q > item.quantity) {
      toast({ title: t.common.error, description: `${t.inventory.transferQty} (${item.quantity})`, variant: "destructive" });
      return;
    }

    transfer.mutate(
      { data: { fromStoreId: item.storeId, toStoreId: toStore, kind: item.kind as any, itemId: item.itemId, quantity: q } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListInventoryQueryKey() });
          toast({ title: t.common.success, description: t.inventory.transferSuccess });
          onClose();
        },
        onError: (e: any) => toast({ title: t.common.error, description: e.message, variant: "destructive" })
      }
    );
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.inventory.transferTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="bg-primary/10 text-primary p-3 rounded-lg flex items-center justify-between text-sm">
            <span className="font-medium">{item.itemName}</span>
            <span>{t.inventory.stockQty}: <strong>{item.quantity} {item.unit}</strong></span>
          </div>

          <div className="space-y-2">
            <Label>{t.inventory.fromStore}</Label>
            <Input disabled value={item.storeName} className="bg-muted" />
          </div>

          <div className="flex justify-center text-muted-foreground"><ArrowRightLeft className="w-5 h-5 rotate-90" /></div>

          <div className="space-y-2">
            <Label>{t.inventory.toStore} <span className="text-destructive">*</span></Label>
            <Select value={toStore} onValueChange={setToStore}>
              <SelectTrigger>
                <SelectValue placeholder={t.inventory.toStore} />
              </SelectTrigger>
              <SelectContent>
                {otherStores.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">{t.common.noData}</div>
                ) : (
                  otherStores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t.inventory.transferQty} ({item.unit}) <span className="text-destructive">*</span></Label>
            <Input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="0" max={item.quantity} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t.common.cancel}</Button>
          <Button onClick={handleSave} disabled={transfer.isPending}>{t.inventory.transfer}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
