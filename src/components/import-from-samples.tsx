import { useEffect, useMemo, useState } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { Search, Loader2, ImageIcon, Check, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useT } from "@/lib/i18n-context";
import { formatCurrency } from "@/lib/format";

export type SampleKind = "categories" | "ingredients" | "products" | "suppliers";

interface SampleRow {
  id: string;
  name: string;
  subtitle?: string;
}

interface SampleProductRow {
  id: string;
  name: string;
  type: "grocery" | "beverage" | "service";
  categoryId: string | null;
  categoryName: string | null;
  price: number;
  imageUrl: string | null;
  images: string[];
  recipeItemCount: number;
  sku: string | null;
}

interface SampleCategoryOpt {
  id: string;
  name: string;
  kind: string;
}

interface StoreOpt {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  kind: SampleKind;
  stores?: StoreOpt[];
  invalidateKeys: QueryKey[];
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const d = await res.json();
      if (d?.error) msg = d.error;
    } catch {
      // ignore json parse errors, keep default msg
    }
    throw new Error(msg);
  }
  return res.json();
}

export function ImportFromSamplesDialog({
  open,
  onOpenChange,
  kind,
  stores = [],
  invalidateKeys,
}: Props) {
  const t = useT();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<SampleRow[]>([]);
  const [productItems, setProductItems] = useState<SampleProductRow[]>([]);
  const [categoryOpts, setCategoryOpts] = useState<SampleCategoryOpt[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [storeId, setStoreId] = useState<string>("");
  const [expanded, setExpanded] = useState(false);

  const firstStoreId = stores[0]?.id ?? "";
  useEffect(() => {
    if (!open) return;
    setSearch("");
    setSelected(new Set());
    setCategoryFilter("all");
    if (kind === "suppliers" && firstStoreId) {
      setStoreId((prev) => prev || firstStoreId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, kind, firstStoreId]);

  // Load sample categories once for the products picker filter.
  useEffect(() => {
    if (!open || kind !== "products") return;
    let cancelled = false;
    fetchJson<SampleCategoryOpt[]>("/api/samples/categories")
      .then((rows) => {
        if (cancelled) return;
        const usable = rows.filter((r) => r.kind === "product" || r.kind === "beverage");
        setCategoryOpts(usable);
      })
      .catch(() => {
        if (!cancelled) setCategoryOpts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, kind]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (kind === "products" && categoryFilter !== "all") params.set("categoryId", categoryFilter);
    fetchJson<any[]>(`/api/samples/${kind}${params.toString() ? `?${params}` : ""}`)
      .then((rows) => {
        if (cancelled) return;
        if (kind === "products") {
          const mapped: SampleProductRow[] = rows.map((r) => ({
            id: r.id,
            name: r.name,
            type: r.type,
            categoryId: r.categoryId,
            categoryName: r.categoryName,
            price: Number(r.price) || 0,
            imageUrl: r.imageUrl ?? null,
            images: Array.isArray(r.images) ? r.images : [],
            recipeItemCount: Number(r.recipeItemCount) || 0,
            sku: r.sku ?? null,
          }));
          setProductItems(mapped);
        } else {
          const mapped: SampleRow[] = rows.map((r) => {
            let subtitle = "";
            if (kind === "categories") subtitle = r.kind;
            else if (kind === "ingredients")
              subtitle = `${r.purchaseUnit || r.unit} → ${r.usageUnit || r.unit} (×${r.conversionRate})`;
            else if (kind === "suppliers")
              subtitle = [r.contactName, r.phone].filter(Boolean).join(" · ");
            return { id: r.id, name: r.name, subtitle };
          });
          setItems(mapped);
        }
      })
      .catch((err: Error) => {
        if (cancelled) return;
        toast({ title: t.common.error, description: err.message, variant: "destructive" });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, kind, search, categoryFilter]);

  const currentIds = useMemo(
    () => (kind === "products" ? productItems.map((p) => p.id) : items.map((i) => i.id)),
    [kind, productItems, items],
  );
  const allSelected = currentIds.length > 0 && currentIds.every((id) => selected.has(id));

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(currentIds));
    }
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (selected.size === 0) {
      toast({ title: t.common.error, description: t.samples.pickAtLeastOne, variant: "destructive" });
      return;
    }
    if (kind === "suppliers" && !storeId) {
      toast({ title: t.common.error, description: t.samples.pickStore, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { ids: Array.from(selected) };
      if (kind === "suppliers") body.storeId = storeId;
      const result = await fetchJson<{
        imported: number;
        createdCategories?: number;
        createdIngredients?: number;
      }>(`/api/samples/${kind}/import`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      const extras: string[] = [];
      if (result.createdCategories) extras.push(`${t.samples.createdCategories}: ${result.createdCategories}`);
      if (result.createdIngredients) extras.push(`${t.samples.createdIngredients}: ${result.createdIngredients}`);
      toast({
        title: t.common.success,
        description: [`${t.samples.imported}: ${result.imported}`, ...extras].join(" · "),
      });
      for (const key of invalidateKeys) {
        queryClient.invalidateQueries({ queryKey: key });
      }
      onOpenChange(false);
    } catch (err) {
      toast({
        title: t.common.error,
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={
          expanded
            ? "w-[98vw] max-w-[98vw] sm:max-w-[98vw] lg:max-w-[98vw] h-[95vh] max-h-[95vh] flex flex-col"
            : "w-[95vw] sm:max-w-4xl lg:max-w-5xl flex flex-col"
        }
      >
        <DialogHeader>
          <div className="flex items-start justify-between gap-2 pr-8">
            <div className="space-y-1.5">
              <DialogTitle>{t.samples.importTitle}</DialogTitle>
              <DialogDescription>{t.samples.importDesc}</DialogDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => setExpanded((v) => !v)}
              aria-label={expanded ? t.samples.shrinkDialog : t.samples.expandDialog}
              title={expanded ? t.samples.shrinkDialog : t.samples.expandDialog}
              data-testid="button-toggle-expand-samples"
            >
              {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          </div>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted/20">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t.common.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-none bg-transparent shadow-none focus-visible:ring-0 px-0 h-7"
              data-testid="input-sample-search"
            />
          </div>
          {kind === "products" && (
            <div className="space-y-1">
              <Label className="text-xs">{t.samples.filterByCategory}</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger data-testid="select-sample-product-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.samples.allCategories}</SelectItem>
                  {categoryOpts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {kind === "suppliers" && (
            <div className="space-y-1">
              <Label className="text-xs">{t.samples.targetStore}</Label>
              <Select value={storeId} onValueChange={setStoreId}>
                <SelectTrigger data-testid="select-sample-store">
                  <SelectValue placeholder={t.samples.pickStore} />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex items-center justify-between px-2 py-2 border rounded-md bg-muted/30">
            <label
              className="flex items-center gap-2 text-sm font-medium cursor-pointer select-none"
              data-testid="label-toggle-all-samples"
            >
              <Checkbox
                checked={allSelected && currentIds.length > 0}
                onCheckedChange={toggleAll}
                data-testid="checkbox-toggle-all-samples"
              />
              <span>{t.samples.selectAll}</span>
              <span className="text-xs text-muted-foreground">
                ({currentIds.length})
              </span>
            </label>
            <span className="text-xs text-muted-foreground">
              {t.samples.selectedCount}: {selected.size}
            </span>
          </div>
          <div
            className={
              expanded
                ? "flex-1 min-h-[300px] overflow-y-auto border rounded-md"
                : "max-h-[60vh] min-h-[300px] overflow-y-auto border rounded-md"
            }
          >
            {loading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> {t.common.loading}
              </div>
            ) : kind === "products" ? (
              productItems.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  {t.samples.empty}
                </div>
              ) : (
                <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-3">
                  {productItems.map((p) => {
                    const cover = p.imageUrl || p.images[0] || null;
                    const isOn = selected.has(p.id);
                    return (
                      <li
                        key={p.id}
                        onClick={() => toggle(p.id)}
                        className={`relative rounded-lg border bg-card cursor-pointer overflow-hidden transition-all hover-elevate ${
                          isOn ? "border-primary ring-2 ring-primary/50" : "border-border"
                        }`}
                        data-testid={`row-sample-${p.id}`}
                      >
                        <div className="aspect-square bg-muted/40 flex items-center justify-center overflow-hidden">
                          {cover ? (
                            <img
                              src={cover}
                              alt={p.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
                          )}
                          {isOn && (
                            <div className="absolute top-1.5 right-1.5 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center shadow">
                              <Check className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <div className="p-2 space-y-1">
                          <div className="font-medium text-sm leading-tight line-clamp-2">
                            {p.name}
                          </div>
                          <div className="text-xs text-primary font-semibold">
                            {formatCurrency(p.price)}
                          </div>
                          <div className="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
                            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4">
                              {p.type === "beverage"
                                ? t.products.beverage
                                : p.type === "service"
                                ? t.products.service
                                : t.products.grocery}
                            </Badge>
                            {p.categoryName && (
                              <span className="truncate">· {p.categoryName}</span>
                            )}
                            {p.recipeItemCount > 0 && (
                              <span>· {p.recipeItemCount} {t.samples.ingredientsShort}</span>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )
            ) : items.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                {t.samples.empty}
              </div>
            ) : (
              <ul className="divide-y">
                {items.map((it) => (
                  <li
                    key={it.id}
                    className="flex items-start gap-3 px-3 py-2 hover:bg-muted/40 cursor-pointer"
                    onClick={() => toggle(it.id)}
                    data-testid={`row-sample-${it.id}`}
                  >
                    <Checkbox
                      checked={selected.has(it.id)}
                      onCheckedChange={() => toggle(it.id)}
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate">{it.name}</div>
                      {it.subtitle && (
                        <div className="text-xs text-muted-foreground truncate">
                          {it.subtitle}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || selected.size === 0}
            data-testid="button-submit-import-samples"
          >
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t.samples.importBtn}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
