import { useListPromotions, useCreatePromotion, useUpdatePromotion, useDeletePromotion, getListPromotionsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Tags, MoreHorizontal, Pencil, Trash2, Calendar, Percent, Banknote, Truck, UserPlus, Gift, ShieldCheck } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductPromoGroupsTab } from "@/components/product-promo-groups-tab";
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
import { useT } from "@/lib/i18n-context";
import type { Promotion } from "@workspace/api-client-react";
import { PromotionKind } from "@workspace/api-client-react";

function kindIcon(kind: string) {
  if (kind === "new_account") return <UserPlus className="w-5 h-5" />;
  if (kind === "percent_invoice") return <Percent className="w-5 h-5" />;
  if (kind === "percent_shipping") return <Truck className="w-5 h-5" />;
  return <Banknote className="w-5 h-5" />;
}

function isPercentKind(kind: string): boolean {
  return kind === "percent_invoice" || kind === "percent_shipping";
}

export default function PromotionsPage() {
  const t = useT();
  const { data: promotions = [], isLoading } = useListPromotions();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);

  const KIND_LABELS: Record<string, string> = {
    new_account: t.promotions.kindNewAccount,
    percent_invoice: t.promotions.kindPercentInvoice,
    percent_shipping: t.promotions.kindPercentShipping,
    fixed: t.promotions.kindFixed,
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">{t.common.loading}</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">{t.promotions.title}</h1>
          <p className="text-muted-foreground mt-1">
            {t.promotions.subtitle}
          </p>
        </div>
      </div>

      <Tabs defaultValue="codes" className="w-full">
        <TabsList>
          <TabsTrigger value="codes" data-testid="tab-promo-codes">
            {t.promotions.tabCodes}
          </TabsTrigger>
          <TabsTrigger value="products" data-testid="tab-promo-products">
            {t.promotions.tabProducts}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="codes" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="hover-elevate" data-testid="button-open-create-promo">
                  <Plus className="w-4 h-4 mr-2" /> {t.promotions.addPromo}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{t.promotions.addPromoTitle}</DialogTitle>
                </DialogHeader>
                <PromotionForm onSuccess={() => setIsCreateOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 gap-4">
        {promotions.length === 0 ? (
          <div className="bg-card rounded-xl border border-dashed border-muted-foreground/20 p-12 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center text-muted-foreground mb-4">
              <Tags className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-medium">{t.promotions.noPromos}</h3>
            <p className="text-muted-foreground mt-1 mb-4">{t.promotions.subtitle}</p>
            <Button onClick={() => setIsCreateOpen(true)} variant="outline">{t.common.create}</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {promotions.map((promo) => (
              <div
                key={promo.id}
                className={`bg-card rounded-xl border ${promo.isActive ? 'border-primary/20 shadow-sm' : 'border-card-border opacity-70'} overflow-hidden relative group`}
                data-testid={`promo-card-${promo.code}`}
              >
                <div className="p-5">
                  <div className="flex justify-between items-start mb-3 gap-2">
                    <Badge variant="outline" className="font-mono text-sm bg-muted font-bold px-2 py-1">
                      {promo.code}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Badge
                        variant={promo.isActive ? "default" : "secondary"}
                        className={promo.isActive ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20" : ""}
                      >
                        {promo.isActive ? t.promotions.statusActive : t.promotions.statusInactive}
                      </Badge>
                      {!(promo as Promotion & { isPlatform?: boolean }).isPlatform && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingPromo(promo)}>
                              <Pencil className="mr-2 h-4 w-4" /> {t.common.edit}
                            </DropdownMenuItem>
                            <ToggleActiveMenuItem promo={promo} />
                            <DropdownMenuSeparator />
                            <DeletePromoItem id={promo.id} />
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>

                  <h3 className="font-bold text-lg mb-1">{promo.name}</h3>
                  <div className="flex flex-wrap gap-1 mb-3">
                    <Badge variant="secondary" className="gap-1">
                      {kindIcon(promo.kind)}
                      {KIND_LABELS[promo.kind] ?? promo.kind}
                    </Badge>
                    {(promo as Promotion & { isPlatform?: boolean }).isPlatform && (
                      <Badge className="bg-violet-500/10 text-violet-600 border-violet-500/20 gap-1">
                        <ShieldCheck className="w-3 h-3" /> {t.layout.rolePlatformAdmin}
                      </Badge>
                    )}
                  </div>
                  <div className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
                    {isPercentKind(promo.kind) ? (
                      <>{promo.value}%</>
                    ) : (
                      <>{formatCurrency(promo.value)}</>
                    )}
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>{t.promotions.minOrder}:</span>
                      <span className="font-medium text-foreground">{formatCurrency(promo.minOrder)}</span>
                    </div>
                    {promo.maxDiscount !== null && promo.maxDiscount !== undefined && (
                      <div className="flex items-center justify-between">
                        <span>{t.promotions.maxDiscount}:</span>
                        <span className="font-medium text-foreground">{formatCurrency(promo.maxDiscount)}</span>
                      </div>
                    )}
                    {promo.usageLimit !== null && promo.usageLimit !== undefined && (
                      <div className="flex items-center justify-between">
                        <span>{t.promotions.usageLimit}:</span>
                        <span className="font-medium text-foreground">
                          {promo.usageCount}/{promo.usageLimit}
                        </span>
                      </div>
                    )}
                    {(promo.usageLimit === null || promo.usageLimit === undefined) && (
                      <div className="flex items-center justify-between">
                        <span>{t.promotions.usageCount}:</span>
                        <span className="font-medium text-foreground">{promo.usageCount}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span>{t.promotions.usageLimit}:</span>
                      <span className="font-medium text-foreground">{promo.perCustomerLimit}</span>
                    </div>
                    {promo.requiresCode && (
                      <div className="flex items-center justify-between">
                        <span>{t.promotions.requiresCode}:</span>
                        <span className="font-mono font-semibold text-foreground">{promo.requiresCode}</span>
                      </div>
                    )}
                    {promo.autoIssueOnSignup && (
                      <div className="flex items-center gap-1 text-emerald-600">
                        <Gift className="w-3.5 h-3.5" /> {t.promotions.kindNewAccount}
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {t.promotions.endDate}:</span>
                      <span>{formatDate(promo.startDate, "dd/MM HH:mm")} - {formatDate(promo.endDate, "dd/MM HH:mm")}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!editingPromo} onOpenChange={(open) => !open && setEditingPromo(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.promotions.editPromo}</DialogTitle>
          </DialogHeader>
          {editingPromo && (
            <PromotionForm promo={editingPromo} onSuccess={() => setEditingPromo(null)} />
          )}
        </DialogContent>
      </Dialog>
        </TabsContent>

        <TabsContent value="products" className="mt-4">
          <ProductPromoGroupsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ToggleActiveMenuItem({ promo }: { promo: Promotion }) {
  const t = useT();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  // Register callbacks at the hook level so they fire even after the
  // dropdown menu (and this component) unmounts on item-select.
  const updatePromo = useUpdatePromotion({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPromotionsQueryKey() });
        toast({ title: t.common.success, description: t.promotions.promoUpdated });
      },
    },
  });

  const handleToggle = () => {
    updatePromo.mutate({ id: promo.id, data: { isActive: !promo.isActive } });
  };

  return (
    <DropdownMenuItem onClick={handleToggle}>
      {promo.isActive ? t.promotions.deactivate : t.promotions.activate}
    </DropdownMenuItem>
  );
}

function DeletePromoItem({ id }: { id: string }) {
  const t = useT();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const deletePromo = useDeletePromotion({
    mutation: {
      onSuccess: () => {
        queryClient.setQueriesData<{ id: string }[]>(
          { queryKey: getListPromotionsQueryKey() },
          (old) => (Array.isArray(old) ? old.filter((p) => p.id !== id) : old),
        );
        queryClient.invalidateQueries({
          queryKey: getListPromotionsQueryKey(),
          refetchType: "all",
        });
        toast({ title: t.common.deleted, description: t.promotions.promoDeleted });
      },
      onError: (err: unknown) => {
        const e = err as { response?: { data?: { error?: string } }; message?: string };
        toast({
          title: t.common.error,
          description: e?.response?.data?.error ?? e?.message,
          variant: "destructive",
        });
      },
    },
  });

  const handleDelete = async () => {
    const ok = await confirm({
      title: t.promotions.deletePromo,
      description: t.promotions.deletePromoDesc,
      confirmText: t.common.delete,
      variant: "destructive",
    });
    if (!ok) return;
    deletePromo.mutate({ id });
  };

  return (
    <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:bg-destructive/10">
      <Trash2 className="mr-2 h-4 w-4" /> {t.common.delete}
    </DropdownMenuItem>
  );
}

function PromotionForm({ promo, onSuccess }: { promo?: Promotion; onSuccess: () => void }) {
  const t = useT();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createPromo = useCreatePromotion();
  const updatePromo = useUpdatePromotion();

  const [code, setCode] = useState(promo?.code || "");
  const [name, setName] = useState(promo?.name || "");
  const [kind, setKind] = useState<PromotionKind>(promo?.kind ?? PromotionKind.fixed);
  const [value, setValue] = useState(promo?.value.toString() ?? "");
  const [minOrder, setMinOrder] = useState(promo?.minOrder.toString() ?? "0");
  const [maxDiscount, setMaxDiscount] = useState(
    promo?.maxDiscount !== null && promo?.maxDiscount !== undefined ? String(promo.maxDiscount) : "",
  );
  const [usageLimit, setUsageLimit] = useState(
    promo?.usageLimit !== null && promo?.usageLimit !== undefined ? String(promo.usageLimit) : "",
  );
  const [perCustomerLimit, setPerCustomerLimit] = useState(
    promo?.perCustomerLimit?.toString() ?? "1",
  );
  const [requiresCode, setRequiresCode] = useState(promo?.requiresCode ?? "");
  const [autoIssueOnSignup, setAutoIssueOnSignup] = useState(promo?.autoIssueOnSignup ?? false);

  const toLocalDateTimeInput = (iso?: string | Date) => {
    const dt = iso ? new Date(iso) : new Date();
    const off = dt.getTimezoneOffset();
    return new Date(dt.getTime() - off * 60_000).toISOString().slice(0, 16);
  };
  const startDefault = promo?.startDate ? toLocalDateTimeInput(promo.startDate) : toLocalDateTimeInput();
  const [startDate, setStartDate] = useState(startDefault);

  const endDefaultDate = new Date();
  endDefaultDate.setMonth(endDefaultDate.getMonth() + 1);
  const endDefault = promo?.endDate ? toLocalDateTimeInput(promo.endDate) : toLocalDateTimeInput(endDefaultDate);
  const [endDate, setEndDate] = useState(endDefault);

  const isPending = createPromo.isPending || updatePromo.isPending;
  const isPercent = isPercentKind(kind);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim() || !value) {
      toast({ title: t.common.error, description: t.common.confirm, variant: "destructive" });
      return;
    }

    const payload = {
      code: code.trim().toUpperCase(),
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

    if (promo) {
      const { code: _code, ...updatePayload } = payload;
      updatePromo.mutate(
        { id: promo.id, data: updatePayload },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListPromotionsQueryKey() });
            toast({ title: t.common.success, description: t.promotions.promoUpdated });
            onSuccess();
          },
          onError: (err: any) => {
            toast({ title: t.common.error, description: err.message, variant: "destructive" });
          },
        },
      );
    } else {
      createPromo.mutate(
        { data: payload as any },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListPromotionsQueryKey() });
            toast({ title: t.common.success, description: t.promotions.promoCreated });
            onSuccess();
          },
          onError: (err: any) => {
            toast({ title: t.common.error, description: err.message, variant: "destructive" });
          },
        },
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="form-promotion">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="code">{t.promotions.code} <span className="text-destructive">*</span></Label>
          <Input
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="SUMMER20"
            disabled={!!promo}
            className="font-mono uppercase"
            data-testid="input-code"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="kind">{t.promotions.type}</Label>
          <Select value={kind} onValueChange={(v) => setKind(v as PromotionKind)}>
            <SelectTrigger data-testid="select-kind">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={PromotionKind.new_account}>{t.promotions.kindNewAccount}</SelectItem>
              <SelectItem value={PromotionKind.percent_invoice}>{t.promotions.kindPercentInvoice}</SelectItem>
              <SelectItem value={PromotionKind.percent_shipping}>{t.promotions.kindPercentShipping}</SelectItem>
              <SelectItem value={PromotionKind.fixed}>{t.promotions.kindFixed}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">{t.promotions.name} <span className="text-destructive">*</span></Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} data-testid="input-name" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="value">
            {t.promotions.value} ({isPercent ? "%" : "VNĐ"}) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="value"
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={isPercent ? "20" : "50000"}
            data-testid="input-value"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="minOrder">{t.promotions.minOrder} (VNĐ)</Label>
          <Input
            id="minOrder"
            type="number"
            value={minOrder}
            onChange={(e) => setMinOrder(e.target.value)}
            placeholder="0"
            data-testid="input-min-order"
          />
        </div>
      </div>

      {isPercent && (
        <div className="space-y-2">
          <Label htmlFor="maxDiscount">{t.promotions.maxDiscount} (VNĐ)</Label>
          <Input
            id="maxDiscount"
            type="number"
            value={maxDiscount}
            onChange={(e) => setMaxDiscount(e.target.value)}
            placeholder="100000"
            data-testid="input-max-discount"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="usageLimit">{t.promotions.usageLimit}</Label>
          <Input
            id="usageLimit"
            type="number"
            min="1"
            value={usageLimit}
            onChange={(e) => setUsageLimit(e.target.value)}
            placeholder={t.promotions.unlimited}
            data-testid="input-usage-limit"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="perCustomerLimit">{t.promotions.usageLimit}</Label>
          <Input
            id="perCustomerLimit"
            type="number"
            min="1"
            value={perCustomerLimit}
            onChange={(e) => setPerCustomerLimit(e.target.value)}
            data-testid="input-per-customer-limit"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="requiresCode">{t.promotions.requiresCode}</Label>
        <Input
          id="requiresCode"
          value={requiresCode}
          onChange={(e) => setRequiresCode(e.target.value.toUpperCase())}
          className="font-mono uppercase"
          data-testid="input-requires-code"
        />
      </div>

      <div className="flex items-center justify-between rounded-md border p-3">
        <div className="space-y-0.5">
          <Label htmlFor="autoIssueOnSignup" className="cursor-pointer">
            {t.promotions.kindNewAccount}
          </Label>
        </div>
        <Switch
          id="autoIssueOnSignup"
          checked={autoIssueOnSignup}
          onCheckedChange={setAutoIssueOnSignup}
          data-testid="switch-auto-issue"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">{t.promotions.startDate}</Label>
          <Input id="startDate" type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">{t.promotions.endDate}</Label>
          <Input id="endDate" type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      <DialogFooter className="pt-4">
        <Button type="button" variant="outline" onClick={onSuccess}>{t.common.cancel}</Button>
        <Button type="submit" disabled={isPending} data-testid="button-submit-promo">
          {isPending ? t.common.processing : promo ? t.common.update : t.common.create}
        </Button>
      </DialogFooter>
    </form>
  );
}
