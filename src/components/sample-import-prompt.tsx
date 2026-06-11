import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Loader2,
  ImageIcon,
  Check,
  Maximize2,
  Minimize2,
  ZoomIn,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useT } from "@/lib/i18n-context";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency } from "@/lib/format";

interface SampleProduct {
  id: string;
  name: string;
  type: "grocery" | "beverage" | "service";
  categoryId: string | null;
  categoryName: string | null;
  price: number;
  imageUrl: string | null;
  images: string[];
  recipeItemCount: number;
}

interface SampleCategoryOpt {
  id: string;
  name: string;
  kind: string;
}

export function SampleImportPrompt() {
  const t = useT();
  const { toast } = useToast();
  const { user, refresh } = useAuth();
  const [open, setOpen] = useState(false);
  const [samples, setSamples] = useState<SampleProduct[]>([]);
  const [categoryOpts, setCategoryOpts] = useState<SampleCategoryOpt[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);

  // Open when current user is a fresh owner.
  useEffect(() => {
    if (!user) return;
    if (user.role !== "owner") return;
    if (!user.shouldShowSampleImportPrompt) return;
    setOpen(true);
  }, [user]);

  // Load categories once when opened.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch("/api/samples/categories", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("load"))))
      .then((rows: SampleCategoryOpt[]) => {
        if (cancelled) return;
        setCategoryOpts(
          rows.filter((r) => r.kind === "product" || r.kind === "beverage"),
        );
      })
      .catch(() => {
        if (!cancelled) setCategoryOpts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Load (and reload) products on search / filter change.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (categoryFilter !== "all") params.set("categoryId", categoryFilter);
    fetch(`/api/samples/products${params.toString() ? `?${params}` : ""}`, {
      credentials: "include",
    })
      .then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(t.sampleImportPrompt.loadFailed)),
      )
      .then((rows: any[]) => {
        if (cancelled) return;
        const mapped: SampleProduct[] = rows.map((r) => ({
          id: r.id,
          name: r.name,
          type: r.type,
          categoryId: r.categoryId ?? null,
          categoryName: r.categoryName ?? null,
          price: Number(r.price) || 0,
          imageUrl: r.imageUrl ?? null,
          images: Array.isArray(r.images) ? r.images : [],
          recipeItemCount: Number(r.recipeItemCount) || 0,
        }));
        setSamples(mapped);
      })
      .catch(() => {
        if (!cancelled)
          toast({ title: t.sampleImportPrompt.loadFailed, variant: "destructive" });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, search, categoryFilter]);

  const currentIds = useMemo(() => samples.map((s) => s.id), [samples]);
  const allVisibleSelected =
    currentIds.length > 0 && currentIds.every((id) => selected.has(id));

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelected((prev) => {
      if (allVisibleSelected) {
        const next = new Set(prev);
        for (const id of currentIds) next.delete(id);
        return next;
      }
      const next = new Set(prev);
      for (const id of currentIds) next.add(id);
      return next;
    });
  };

  const dismiss = async () => {
    try {
      await fetch("/api/auth/dismiss-sample-prompt", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ignore
    }
    setOpen(false);
    await refresh();
  };

  const handleImport = async () => {
    if (selected.size === 0) {
      await dismiss();
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/samples/products/import", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || t.sampleImportPrompt.importFailed);
      }
      toast({ title: t.sampleImportPrompt.importedToast });
      await dismiss();
    } catch (err) {
      toast({
        title: t.sampleImportPrompt.importFailed,
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v && !submitting) void dismiss();
        }}
      >
        <DialogContent
          className={
            expanded
              ? "w-[98vw] max-w-[98vw] sm:max-w-[98vw] lg:max-w-[98vw] h-[95vh] max-h-[95vh] flex flex-col"
              : "w-[95vw] sm:max-w-4xl lg:max-w-5xl max-h-[90vh] flex flex-col"
          }
        >
          <DialogHeader>
            <div className="flex items-start justify-between gap-2 pr-8">
              <div className="space-y-1.5">
                <DialogTitle>{t.sampleImportPrompt.title}</DialogTitle>
                <DialogDescription>
                  {t.sampleImportPrompt.description}
                </DialogDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => setExpanded((v) => !v)}
                aria-label={
                  expanded ? t.samples.shrinkDialog : t.samples.expandDialog
                }
                title={expanded ? t.samples.shrinkDialog : t.samples.expandDialog}
                data-testid="button-toggle-expand-prompt"
              >
                {expanded ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </Button>
            </div>
          </DialogHeader>

          <div className="flex flex-col gap-3 flex-1 min-h-0">
            <div className="grid sm:grid-cols-[1fr_minmax(180px,260px)] gap-2">
              <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted/20">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t.common.search}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="border-none bg-transparent shadow-none focus-visible:ring-0 px-0 h-7"
                  data-testid="input-sample-prompt-search"
                />
              </div>
              <div className="space-y-1">
                <Label className="sr-only">{t.samples.filterByCategory}</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger data-testid="select-sample-prompt-category">
                    <SelectValue placeholder={t.samples.filterByCategory} />
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
            </div>

            <div className="flex items-center justify-between px-2 py-2 border rounded-md bg-muted/30 text-sm">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={toggleAllVisible}
                disabled={currentIds.length === 0}
                data-testid="button-toggle-all-prompt"
              >
                {allVisibleSelected
                  ? t.sampleImportPrompt.deselectAll
                  : t.sampleImportPrompt.selectAll}
                <span className="ml-1 text-xs text-muted-foreground">
                  ({currentIds.length})
                </span>
              </Button>
              <span className="text-xs text-muted-foreground">
                {t.sampleImportPrompt.selectedCount}: {selected.size}
              </span>
            </div>

            <div
              className={
                expanded
                  ? "flex-1 min-h-[300px] overflow-y-auto border rounded-md"
                  : "flex-1 min-h-[300px] max-h-[60vh] overflow-y-auto border rounded-md"
              }
            >
              {loading ? (
                <div className="flex items-center justify-center py-10 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />{" "}
                  {t.common.loading}
                </div>
              ) : samples.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground text-sm">
                  {t.sampleImportPrompt.empty}
                </div>
              ) : (
                <ul
                  className={`grid gap-3 p-3 ${
                    expanded
                      ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
                      : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
                  }`}
                >
                  {samples.map((p) => {
                    const cover = p.imageUrl || p.images[0] || null;
                    const isOn = selected.has(p.id);
                    return (
                      <li
                        key={p.id}
                        onClick={() => toggle(p.id)}
                        className={`group relative rounded-lg border bg-card cursor-pointer overflow-hidden transition-all hover-elevate ${
                          isOn
                            ? "border-primary ring-2 ring-primary/50"
                            : "border-border"
                        }`}
                        data-testid={`row-sample-prompt-${p.id}`}
                      >
                        <div className="relative aspect-square bg-muted/40 flex items-center justify-center overflow-hidden">
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
                          {cover && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setZoomUrl(cover);
                              }}
                              className="hidden md:flex absolute bottom-1.5 left-1.5 items-center gap-1 bg-background/85 backdrop-blur text-foreground rounded-md px-1.5 py-1 text-[10px] font-medium shadow opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                              aria-label={t.sampleImportPrompt.zoomImage}
                              title={t.sampleImportPrompt.zoomImage}
                              data-testid={`button-zoom-${p.id}`}
                            >
                              <ZoomIn className="w-3 h-3" />
                            </button>
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
                            <Badge
                              variant="secondary"
                              className="text-[10px] py-0 px-1.5 h-4"
                            >
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
                              <span>
                                · {p.recipeItemCount} {t.samples.ingredientsShort}
                              </span>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={dismiss}
              disabled={submitting}
              data-testid="button-skip-sample-prompt"
            >
              {t.sampleImportPrompt.skip}
            </Button>
            <Button
              type="button"
              onClick={handleImport}
              disabled={submitting || selected.size === 0}
              data-testid="button-import-sample-prompt"
            >
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {submitting
                ? t.sampleImportPrompt.importing
                : t.sampleImportPrompt.importSelected}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={zoomUrl !== null}
        onOpenChange={(v) => {
          if (!v) setZoomUrl(null);
        }}
      >
        <DialogContent className="w-[95vw] max-w-5xl p-2 bg-background/95 backdrop-blur">
          <DialogHeader className="sr-only">
            <DialogTitle>{t.sampleImportPrompt.zoomImage}</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <button
              type="button"
              onClick={() => setZoomUrl(null)}
              aria-label={t.common.close}
              className="absolute top-2 right-2 z-10 bg-background/80 hover:bg-background rounded-full p-1.5 shadow"
              data-testid="button-close-zoom"
            >
              <X className="w-4 h-4" />
            </button>
            {zoomUrl && (
              <img
                src={zoomUrl}
                alt=""
                className="w-full h-auto max-h-[85vh] object-contain rounded-md"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
