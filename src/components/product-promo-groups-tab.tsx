import { useMemo, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Calendar, Tags, Copy, Search, X, QrCode, Printer, Download } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  useListProductPromoGroups,
  useCreateProductPromoGroup,
  useUpdateProductPromoGroup,
  useDeleteProductPromoGroup,
  getListProductPromoGroupsQueryKey,
  useListProducts,
  useListStores,
  type ProductPromoGroup,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/components/confirm-provider";
import { useT } from "@/lib/i18n-context";
import { formatCurrency, formatDate } from "@/lib/format";

const ALL_STORES = "__all__";

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface FormItem {
  productId: string;
  promoPrice: string;
}

export function ProductPromoGroupsTab() {
  const t = useT();
  const { data: groups = [], isLoading } = useListProductPromoGroups();
  const [editing, setEditing] = useState<ProductPromoGroup | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">{t.common.loading}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button onClick={() => setCreateOpen(true)} className="hover-elevate" data-testid="button-open-create-promo-group">
          <Plus className="w-4 h-4 mr-2" /> {t.productPromoGroups.addGroup}
        </Button>
      </div>

      {groups.length === 0 ? (
        <div className="bg-card rounded-xl border border-dashed border-muted-foreground/20 p-12 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center text-muted-foreground mb-4">
            <Tags className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-medium">{t.productPromoGroups.empty}</h3>
          <p className="text-muted-foreground mt-1 mb-4">{t.productPromoGroups.subtitle}</p>
          <Button variant="outline" onClick={() => setCreateOpen(true)}>
            {t.common.create}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((g) => (
            <GroupCard key={g.id} group={g} onEdit={() => setEditing(g)} />
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-[min(96vw,1100px)] w-[min(96vw,1100px)] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.productPromoGroups.addGroupTitle}</DialogTitle>
          </DialogHeader>
          <GroupForm onDone={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-[min(96vw,1100px)] w-[min(96vw,1100px)] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.productPromoGroups.editGroupTitle}</DialogTitle>
          </DialogHeader>
          {editing && <GroupForm group={editing} onDone={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GroupCard({ group, onEdit }: { group: ProductPromoGroup; onEdit: () => void }) {
  const t = useT();
  const { toast } = useToast();
  const confirm = useConfirm();
  const qc = useQueryClient();
  const del = useDeleteProductPromoGroup();
  const update = useUpdateProductPromoGroup();
  const [qrOpen, setQrOpen] = useState(false);

  const now = Date.now();
  const startsMs = new Date(group.startsAt).getTime();
  const endsMs = new Date(group.endsAt).getTime();
  const inWindow = startsMs <= now && now <= endsMs;
  const expired = endsMs < now;
  const isLive = group.isActive && inWindow;

  const shareUrl = useMemo(() => {
    const path = group.storeSlug
      ? `/shop/${encodeURIComponent(group.storeSlug)}?promo=${encodeURIComponent(group.code)}`
      : `/shop?promo=${encodeURIComponent(group.code)}`;
    if (typeof window === "undefined") return path;
    return `${window.location.origin}${path}`;
  }, [group.storeSlug, group.code]);

  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: t.productPromoGroups.linkCopied });
    } catch {
      toast({ title: t.common.error, description: shareUrl, variant: "destructive" });
    }
  };

  const handleToggle = async () => {
    await update.mutateAsync({ id: group.id, data: { isActive: !group.isActive } });
    await qc.invalidateQueries({ queryKey: getListProductPromoGroupsQueryKey() });
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: t.productPromoGroups.deleteConfirm,
      description: t.productPromoGroups.deleteConfirmDesc,
      variant: "destructive",
    });
    if (!ok) return;
    try {
      await del.mutateAsync({ id: group.id });
      qc.setQueriesData<ProductPromoGroup[]>(
        { queryKey: getListProductPromoGroupsQueryKey() },
        (old) => (Array.isArray(old) ? old.filter((g) => g.id !== group.id) : old),
      );
      await qc.invalidateQueries({
        queryKey: getListProductPromoGroupsQueryKey(),
        refetchType: "all",
      });
      toast({ title: t.productPromoGroups.deleted });
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } }; message?: string }).response?.data?.error ?? (err as Error).message;
      toast({ title: t.common.error, description: msg, variant: "destructive" });
    }
  };

  return (
    <div
      className={`bg-card rounded-xl border ${isLive ? "border-primary/30 shadow-sm" : "border-card-border opacity-80"} overflow-hidden`}
      data-testid={`promo-group-card-${group.code}`}
    >
      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <Badge variant="outline" className="font-mono font-bold">{group.code}</Badge>
          <div className="flex items-center gap-1">
            {isLive && (
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                {t.productPromoGroups.statusLive}
              </Badge>
            )}
            {expired && (
              <Badge variant="secondary">{t.productPromoGroups.statusExpired}</Badge>
            )}
            {!group.isActive && !expired && (
              <Badge variant="secondary">{t.productPromoGroups.statusPaused}</Badge>
            )}
            {!isLive && !expired && group.isActive && (
              <Badge variant="secondary">{t.productPromoGroups.statusScheduled}</Badge>
            )}
          </div>
        </div>

        <div>
          <h3 className="font-bold text-lg">{group.name}</h3>
          {group.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{group.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="w-3.5 h-3.5" />
          <span>{formatDate(group.startsAt)} - {formatDate(group.endsAt)}</span>
        </div>

        <div className="text-sm">
          <span className="text-muted-foreground">{t.productPromoGroups.scope}: </span>
          <span className="font-medium">{group.storeName ?? t.productPromoGroups.scopeChain}</span>
        </div>

        <div className="text-sm">
          <span className="text-muted-foreground">{t.productPromoGroups.products}: </span>
          <span className="font-bold">{group.items.length}</span>
        </div>

        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
          {group.items.slice(0, 6).map((it) => (
            <Badge key={it.productId} variant="secondary" className="text-xs">
              {it.productName}: {formatCurrency(it.promoPrice)}
            </Badge>
          ))}
          {group.items.length > 6 && (
            <Badge variant="secondary" className="text-xs">+{group.items.length - 6}</Badge>
          )}
        </div>

        <div className="flex items-center gap-1 pt-2 border-t border-card-border">
          <Button variant="ghost" size="sm" onClick={onEdit} data-testid={`button-edit-${group.code}`}>
            <Pencil className="w-3.5 h-3.5 mr-1" /> {t.common.edit}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleToggle}>
            {group.isActive ? t.promotions.deactivate : t.promotions.activate}
          </Button>
          <Button variant="ghost" size="sm" onClick={copyShareUrl}>
            <Copy className="w-3.5 h-3.5 mr-1" /> {t.productPromoGroups.copyLink}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setQrOpen(true)} data-testid={`button-qr-${group.code}`}>
            <QrCode className="w-3.5 h-3.5 mr-1" /> {t.productPromoGroups.qrButton}
          </Button>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={handleDelete}
            data-testid={`button-delete-${group.code}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <QrShareDialog open={qrOpen} onClose={() => setQrOpen(false)} group={group} shareUrl={shareUrl} />
    </div>
  );
}

function QrShareDialog({
  open,
  onClose,
  group,
  shareUrl,
}: {
  open: boolean;
  onClose: () => void;
  group: ProductPromoGroup;
  shareUrl: string;
}) {
  const t = useT();
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const node = printRef.current;
    if (!node) return;
    const html = node.innerHTML;
    const w = window.open("", "_blank", "width=600,height=800");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>${group.code}</title>
<style>body{font-family:system-ui,sans-serif;margin:24px;text-align:center}
h1{font-size:22px;margin:8px 0}
h2{font-size:16px;color:#888;font-weight:400;margin:0 0 16px}
.url{font-size:11px;color:#666;word-break:break-all;margin-top:12px}
svg{display:block;margin:0 auto}
</style></head><body>${html}</body></html>`);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 300);
  };

  const handleDownload = () => {
    const svg = printRef.current?.querySelector("svg");
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([xml], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `promo-${group.code}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: t.productPromoGroups.qrDownloaded });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t.productPromoGroups.qrTitle}</DialogTitle>
        </DialogHeader>
        <div ref={printRef} className="flex flex-col items-center text-center bg-white text-black p-6 rounded-md">
          <h1 className="text-xl font-bold text-primary mb-1">{group.name}</h1>
          <h2 className="text-sm text-muted-foreground mb-3">{t.productPromoGroups.code}: {group.code}</h2>
          <QRCodeSVG value={shareUrl} size={240} level="M" includeMargin />
          <p className="url text-[11px] text-muted-foreground mt-3 break-all">{shareUrl}</p>
        </div>
        <DialogFooter className="flex-row gap-2 sm:gap-2">
          <Button variant="outline" onClick={handleDownload} className="flex-1" data-testid="button-qr-download">
            <Download className="w-4 h-4 mr-2" /> {t.productPromoGroups.qrDownload}
          </Button>
          <Button onClick={handlePrint} className="flex-1" data-testid="button-qr-print">
            <Printer className="w-4 h-4 mr-2" /> {t.productPromoGroups.qrPrint}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GroupForm({ group, onDone }: { group?: ProductPromoGroup; onDone: () => void }) {
  const t = useT();
  const { toast } = useToast();
  const qc = useQueryClient();
  const create = useCreateProductPromoGroup();
  const update = useUpdateProductPromoGroup();
  const { data: products = [] } = useListProducts();
  const { data: stores = [] } = useListStores();

  const [code, setCode] = useState(group?.code ?? "");
  const [name, setName] = useState(group?.name ?? "");
  const [description, setDescription] = useState(group?.description ?? "");
  const [storeId, setStoreId] = useState<string>(group?.storeId ?? ALL_STORES);
  const [startsAt, setStartsAt] = useState(
    group ? toLocalInputValue(group.startsAt) : toLocalInputValue(new Date().toISOString()),
  );
  const [endsAt, setEndsAt] = useState(
    group
      ? toLocalInputValue(group.endsAt)
      : toLocalInputValue(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()),
  );
  const [items, setItems] = useState<FormItem[]>(
    group?.items.map((i) => ({ productId: i.productId, promoPrice: String(i.promoPrice) })) ?? [],
  );
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const selectedIds = useMemo(() => new Set(items.map((i) => i.productId)), [items]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (selectedIds.has(p.id)) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q);
    });
  }, [products, search, selectedIds]);

  const toggleProduct = (productId: string, basePrice: number) => {
    setItems((prev) => {
      if (prev.find((i) => i.productId === productId)) {
        return prev.filter((i) => i.productId !== productId);
      }
      const suggested = Math.floor(basePrice * 0.9);
      return [...prev, { productId, promoPrice: String(suggested) }];
    });
  };

  const updateItemPrice = (productId: string, price: string) => {
    setItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, promoPrice: price } : i)),
    );
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({ title: t.common.error, description: t.productPromoGroups.errMissingName, variant: "destructive" });
      return;
    }
    if (!group && !code.trim()) {
      toast({ title: t.common.error, description: t.productPromoGroups.errMissingCode, variant: "destructive" });
      return;
    }
    if (items.length === 0) {
      toast({ title: t.common.error, description: t.productPromoGroups.errNoProducts, variant: "destructive" });
      return;
    }
    if (new Date(endsAt) <= new Date(startsAt)) {
      toast({ title: t.common.error, description: t.productPromoGroups.errEndBeforeStart, variant: "destructive" });
      return;
    }
    for (const it of items) {
      const n = Number(it.promoPrice);
      if (!Number.isFinite(n) || n < 0) {
        toast({ title: t.common.error, description: t.productPromoGroups.errInvalidPrice, variant: "destructive" });
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        storeId: storeId === ALL_STORES ? null : storeId,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        items: items.map((i) => ({ productId: i.productId, promoPrice: Number(i.promoPrice) })),
      };
      if (group) {
        await update.mutateAsync({ id: group.id, data: payload });
        toast({ title: t.productPromoGroups.updated });
      } else {
        await create.mutateAsync({
          data: { code: code.trim().toUpperCase(), ...payload },
        });
        toast({ title: t.productPromoGroups.created });
      }
      await qc.invalidateQueries({ queryKey: getListProductPromoGroupsQueryKey() });
      onDone();
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } }; message?: string }).response?.data?.error ?? (err as Error).message;
      toast({ title: t.common.error, description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label>{t.productPromoGroups.code}</Label>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={!!group}
            placeholder="SUMMER2026"
            data-testid="input-promo-group-code"
          />
        </div>
        <div>
          <Label>{t.productPromoGroups.name}</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.productPromoGroups.namePlaceholder}
            data-testid="input-promo-group-name"
          />
        </div>
        <div className="md:col-span-2">
          <Label>{t.productPromoGroups.description}</Label>
          <Textarea
            value={description ?? ""}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder={t.productPromoGroups.descriptionPlaceholder}
          />
        </div>
        <div>
          <Label>{t.productPromoGroups.scope}</Label>
          <Select value={storeId} onValueChange={setStoreId}>
            <SelectTrigger data-testid="select-promo-group-scope">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_STORES}>{t.productPromoGroups.scopeChain}</SelectItem>
              {stores.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div />
        <div>
          <Label>{t.productPromoGroups.startsAt}</Label>
          <Input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            data-testid="input-promo-group-starts"
          />
        </div>
        <div>
          <Label>{t.productPromoGroups.endsAt}</Label>
          <Input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            data-testid="input-promo-group-ends"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t.productPromoGroups.selectedProducts} ({items.length})</Label>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">{t.productPromoGroups.noneSelected}</p>
        ) : (
          <div className="border rounded-md max-h-60 overflow-y-auto divide-y">
            {items.map((it) => {
              const p = productMap.get(it.productId);
              if (!p) return null;
              return (
                <div key={it.productId} className="flex items-center gap-2 p-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.productPromoGroups.originalPrice}: {formatCurrency(p.price)}
                    </div>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    value={it.promoPrice}
                    onChange={(e) => updateItemPrice(it.productId, e.target.value)}
                    className="w-32"
                    data-testid={`input-promo-price-${p.id}`}
                  />
                  <Button variant="ghost" size="icon" onClick={() => toggleProduct(it.productId, p.price)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>{t.productPromoGroups.addProducts}</Label>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.productPromoGroups.searchPlaceholder}
            data-testid="input-promo-product-search"
          />
        </div>
        <div className="border rounded-md max-h-48 overflow-y-auto">
          {filteredProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground p-3 text-center italic">
              {t.productPromoGroups.noMore}
            </p>
          ) : (
            filteredProducts.slice(0, 30).map((p) => (
              <button
                type="button"
                key={p.id}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 hover:bg-accent text-left text-sm"
                onClick={() => toggleProduct(p.id, p.price)}
                data-testid={`button-add-product-${p.id}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{formatCurrency(p.price)}</div>
                </div>
                <Plus className="w-4 h-4 text-primary" />
              </button>
            ))
          )}
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={submitting}>
          {t.common.cancel}
        </Button>
        <Button onClick={handleSubmit} disabled={submitting} data-testid="button-submit-promo-group">
          {submitting ? t.common.loading : t.common.save}
        </Button>
      </DialogFooter>
    </div>
  );
}
