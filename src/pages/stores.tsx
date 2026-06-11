import { useListStores, useCreateStore, useUpdateStore, getListStoresQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Store as StoreIcon, MoreHorizontal, Pencil, Check, X, QrCode, Printer, Wallet, Monitor, CalendarClock, Coffee, Image as ImageIcon, Upload, Loader2, Star, HelpCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useRef } from "react";
import { useUpload } from "@workspace/object-storage-web";
import { Textarea } from "@/components/ui/textarea";
import { DateTimePicker } from "@/components/datetime-picker";
import QRCode from "react-qr-code";
import { formatCurrency, formatDate } from "@/lib/format";
import { VN_BANKS, findBankByBin } from "@/lib/banks";
import { BankPaymentQr, hasBankInfo } from "@/components/bank-payment-qr";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useT } from "@/lib/i18n-context";
import type { Store } from "@workspace/api-client-react";

export default function StoresPage() {
  const t = useT();
  const { data: stores = [], isLoading } = useListStores();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [qrStore, setQrStore] = useState<Store | null>(null);
  const [payQrStore, setPayQrStore] = useState<Store | null>(null);
  const [tempClosureStore, setTempClosureStore] = useState<Store | null>(null);

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">{t.common.loading}</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">{t.stores.title}</h1>
          <p className="text-muted-foreground mt-1">{t.stores.subtitle}</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="hover-elevate">
              <Plus className="w-4 h-4 mr-2" /> {t.stores.addStore}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t.stores.addStoreTitle}</DialogTitle>
              <DialogDescription>{t.stores.addStoreDesc}</DialogDescription>
            </DialogHeader>
            <StoreForm onSuccess={() => setIsCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-xl border border-card-border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.stores.storeName}</TableHead>
              <TableHead>{t.stores.address}</TableHead>
              <TableHead>{t.stores.phone}</TableHead>
              <TableHead>{t.stores.isActive}</TableHead>
              <TableHead>{t.customers.createdAt}</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stores.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  {t.stores.noStores}
                </TableCell>
              </TableRow>
            ) : (
              stores.map((store) => (
                <TableRow key={store.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center text-secondary-foreground">
                        <StoreIcon className="w-4 h-4" />
                      </div>
                      {store.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{store.address}</TableCell>
                  <TableCell>{store.phone}</TableCell>
                  <TableCell>
                    <StoreStatusBadge store={store} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(store.createdAt, "dd/MM/yyyy")}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{t.inventory.actions}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setEditingStore(store)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          {t.common.edit}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setQrStore(store)} data-testid={`menu-qr-store-${store.id}`}>
                          <QrCode className="mr-2 h-4 w-4" />
                          {t.stores.printStoreQr}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setPayQrStore(store)}
                          disabled={!hasBankInfo(store)}
                          data-testid={`menu-pay-qr-${store.id}`}
                        >
                          <Wallet className="mr-2 h-4 w-4" />
                          {t.stores.paymentQr}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTempClosureStore(store)} data-testid={`menu-temp-closure-${store.id}`}>
                          <CalendarClock className="mr-2 h-4 w-4" />
                          {isCurrentlyTempClosed(store) ? t.stores.editTempClosure : t.stores.tempClosureTitle}
                        </DropdownMenuItem>
                        <ToggleActiveMenuItem store={store} />
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editingStore} onOpenChange={(open) => !open && setEditingStore(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.stores.editStore}</DialogTitle>
            <DialogDescription>{t.stores.editStoreDesc} {editingStore?.name}.</DialogDescription>
          </DialogHeader>
          {editingStore && (
            <StoreForm store={editingStore} onSuccess={() => setEditingStore(null)} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!payQrStore} onOpenChange={(o) => !o && setPayQrStore(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.stores.paymentQr} — {payQrStore?.name}</DialogTitle>
            <DialogDescription>
              {t.stores.paymentQrDesc}
            </DialogDescription>
          </DialogHeader>
          {payQrStore && (
            <BankPaymentQr
              store={payQrStore}
              title={`${t.stores.paymentQr} — ${payQrStore.name}`}
              subTitle={payQrStore.address}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!tempClosureStore} onOpenChange={(o) => !o && setTempClosureStore(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-amber-600" />
              {t.stores.tempClosureTitle}
            </DialogTitle>
            <DialogDescription>
              <span className="font-medium">{tempClosureStore?.name}</span>
            </DialogDescription>
          </DialogHeader>
          {tempClosureStore && (
            <TempClosureForm store={tempClosureStore} onClose={() => setTempClosureStore(null)} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!qrStore} onOpenChange={(o) => !o && setQrStore(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.stores.storeQr} — {qrStore?.name}</DialogTitle>
            <DialogDescription>
              {t.stores.storeQrDesc}
            </DialogDescription>
          </DialogHeader>
          {qrStore && <StoreQrPanel store={qrStore} />}
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

function StoreQrPanel({ store }: { store: Store }) {
  const t = useT();
  const url = `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, "")}/shop/${store.slug}`;
  const handlePrint = () => {
    const w = window.open("", "_blank", "width=400,height=600");
    if (!w) return;
    const svgEl = document.getElementById("store-qr-svg");
    const safeSvg = svgEl
      ? new XMLSerializer().serializeToString(svgEl.querySelector("svg") ?? svgEl)
      : "";
    const safeName = escapeHtml(store.name ?? "");
    const safeAddress = escapeHtml(store.address ?? "");
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
    <h2>${safeAddress}</h2>
    <div class="qr">${safeSvg}</div>
    <div class="url">${safeUrl}</div>
    <p style="margin-top:16px;font-size:12px;color:#444">Quet ma QR de dat hang</p>
  </body>
</html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 250);
  };
  return (
    <div className="space-y-4">
      <div className="bg-white p-6 rounded-md flex items-center justify-center">
        <div id="store-qr-svg" className="w-[220px] h-[220px]">
          <QRCode value={url} size={220} />
        </div>
      </div>
      <div className="text-xs text-center text-muted-foreground break-all">{url}</div>
      <div className="flex justify-end">
        <Button onClick={handlePrint} data-testid="button-print-store-qr">
          <Printer className="w-4 h-4 mr-2" /> {t.stores.printBtn}
        </Button>
      </div>
    </div>
  );
}

function isCurrentlyTempClosed(store: Store): boolean {
  if (!store.tempClosureStart || !store.tempClosureEnd) return false;
  const now = new Date();
  const s = new Date(store.tempClosureStart);
  const e = new Date(store.tempClosureEnd);
  return now >= s && now <= e;
}

function isScheduledTempClosure(store: Store): boolean {
  if (!store.tempClosureStart || !store.tempClosureEnd) return false;
  return new Date() < new Date(store.tempClosureStart);
}

function StoreStatusBadge({ store }: { store: Store }) {
  const t = useT();
  if (!store.isActive) {
    return <Badge variant="secondary">{t.stores.inactive}</Badge>;
  }
  if (isCurrentlyTempClosed(store)) {
    const end = new Date(store.tempClosureEnd!);
    return (
      <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30 hover:bg-amber-500/20">
        <Coffee className="w-3 h-3 mr-1" />
        {t.stores.tempClosedUntil} {end.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
      </Badge>
    );
  }
  if (isScheduledTempClosure(store)) {
    const start = new Date(store.tempClosureStart!);
    return (
      <Badge variant="outline" className="bg-sky-500/10 text-sky-700 border-sky-500/30">
        <CalendarClock className="w-3 h-3 mr-1" />
        {t.stores.tempClosedFrom} {start.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
      </Badge>
    );
  }
  return (
    <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20">
      {t.stores.isActive}
    </Badge>
  );
}

function TempClosureForm({ store, onClose }: { store: Store; onClose: () => void }) {
  const t = useT();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateStore = useUpdateStore();
  const [start, setStart] = useState<Date | null>(
    store.tempClosureStart ? new Date(store.tempClosureStart) : null,
  );
  const [end, setEnd] = useState<Date | null>(
    store.tempClosureEnd ? new Date(store.tempClosureEnd) : null,
  );
  const [reason, setReason] = useState<string>(store.tempClosureReason ?? "");
  const isPending = updateStore.isPending;

  const submit = (clear: boolean) => {
    let payload: { tempClosureStart: string | null; tempClosureEnd: string | null; tempClosureReason: string };
    if (clear) {
      payload = { tempClosureStart: null, tempClosureEnd: null, tempClosureReason: "" };
    } else {
      if (!start || !end) {
        toast({ title: t.stores.missingTime, description: t.stores.missingTimeDesc, variant: "destructive" });
        return;
      }
      if (end <= start) {
        toast({ title: t.stores.invalidTime, description: t.stores.invalidTimeDesc, variant: "destructive" });
        return;
      }
      payload = {
        tempClosureStart: start.toISOString(),
        tempClosureEnd: end.toISOString(),
        tempClosureReason: reason.trim(),
      };
    }
    updateStore.mutate(
      { id: store.id, data: payload },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListStoresQueryKey() });
          toast({
            title: clear ? t.stores.tempClosureCanceled : t.stores.tempClosureSet,
            description: clear ? t.stores.tempClosureCanceledDesc : t.stores.tempClosureSetDesc,
          });
          onClose();
        },
        onError: (err: any) => {
          toast({ title: t.common.error, description: err?.message ?? t.stores.cannotUpdateStatus, variant: "destructive" });
        },
      },
    );
  };

  const hasExisting = !!(store.tempClosureStart && store.tempClosureEnd);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>{t.stores.tempClosureStart}</Label>
          <DateTimePicker
            value={start}
            onChange={setStart}
            placeholder={t.stores.tempClosureStart}
            testId="input-temp-closure-start"
          />
        </div>
        <div className="space-y-2">
          <Label>{t.stores.tempClosureEnd}</Label>
          <DateTimePicker
            value={end}
            onChange={setEnd}
            placeholder={t.stores.tempClosureEnd}
            minDate={start ?? undefined}
            testId="input-temp-closure-end"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="tempReason">{t.stores.tempClosureMessage}</Label>
        <Textarea
          id="tempReason"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          data-testid="input-temp-closure-reason"
        />
        <p className="text-xs text-muted-foreground">
          {t.stores.tempClosureMessageHint}
        </p>
      </div>
      <DialogFooter className="pt-2 gap-2 flex-col-reverse sm:flex-row">
        {hasExisting && (
          <Button
            type="button"
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => submit(true)}
            disabled={isPending}
            data-testid="button-clear-temp-closure"
          >
            {t.stores.cancelTempClosure}
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
          {t.common.close}
        </Button>
        <Button type="button" onClick={() => submit(false)} disabled={isPending} data-testid="button-save-temp-closure">
          {isPending ? t.stores.saving : hasExisting ? t.common.update : t.stores.setTempClosure}
        </Button>
      </DialogFooter>
    </div>
  );
}

function ToggleActiveMenuItem({ store }: { store: Store }) {
  const t = useT();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateStore = useUpdateStore();

  const handleToggle = () => {
    updateStore.mutate(
      { id: store.id, data: { isActive: !store.isActive } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListStoresQueryKey() });
          toast({
            title: t.common.success,
            description: !store.isActive ? t.stores.storeActivated : t.stores.storeDeactivated,
          });
        },
        onError: (err: any) => {
          toast({
            title: t.common.error,
            description: err.message || t.stores.cannotUpdateStatus,
            variant: "destructive",
          });
        }
      }
    );
  };

  return (
    <DropdownMenuItem onClick={handleToggle}>
      {store.isActive ? (
        <><X className="mr-2 h-4 w-4" /> {t.stores.toggleInactive}</>
      ) : (
        <><Check className="mr-2 h-4 w-4" /> {t.stores.toggleActive}</>
      )}
    </DropdownMenuItem>
  );
}

function StoreForm({ store, onSuccess }: { store?: Store, onSuccess: () => void }) {
  const t = useT();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createStore = useCreateStore();
  const updateStore = useUpdateStore();
  
  const [name, setName] = useState(store?.name || "");
  const [address, setAddress] = useState(store?.address || "");
  const [phone, setPhone] = useState(store?.phone || "");
  const [latitude, setLatitude] = useState<string>(
    store?.latitude !== null && store?.latitude !== undefined ? String(store.latitude) : "",
  );
  const [longitude, setLongitude] = useState<string>(
    store?.longitude !== null && store?.longitude !== undefined ? String(store.longitude) : "",
  );
  const [mapsUrl, setMapsUrl] = useState<string>("");
  const [isResolvingMaps, setIsResolvingMaps] = useState(false);
  const [bankBin, setBankBin] = useState<string>(store?.bankBin || "");
  const [bankAccountNumber, setBankAccountNumber] = useState<string>(store?.bankAccountNumber || "");
  const [bankAccountName, setBankAccountName] = useState<string>(store?.bankAccountName || "");
  const [enableCustomerDisplay, setEnableCustomerDisplay] = useState<boolean>(store?.enableCustomerDisplay ?? false);
  const [description, setDescription] = useState<string>(store?.description || "");
  const [images, setImages] = useState<string[]>(
    Array.isArray((store as Store & { images?: string[] } | undefined)?.images)
      ? ((store as Store & { images?: string[] }).images ?? []).slice(0, 10)
      : []
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { uploadFile } = useUpload();

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const remaining = 10 - images.length;
    if (remaining <= 0) {
      toast({ title: t.stores.maxStoreImages, variant: "destructive" });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const accepted = files.slice(0, remaining);
    const oversize = accepted.find((f) => f.size > 5 * 1024 * 1024);
    if (oversize) {
      toast({ title: t.stores.imageTooLarge, description: oversize.name, variant: "destructive" });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const notImage = accepted.find((f) => !f.type.startsWith("image/"));
    if (notImage) {
      toast({ title: t.stores.invalidFile, description: notImage.name, variant: "destructive" });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setIsUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of accepted) {
        const res = await uploadFile(file);
        if (!res) {
          toast({ title: t.stores.uploadFailed, description: file.name, variant: "destructive" });
          continue;
        }
        uploaded.push(`/api/storage${res.objectPath}`);
      }
      if (uploaded.length > 0) {
        setImages((prev) => {
          const merged = [...prev];
          for (const u of uploaded) {
            if (!merged.includes(u) && merged.length < 10) merged.push(u);
          }
          return merged;
        });
        toast({ title: t.stores.imageUploaded, description: `${uploaded.length}` });
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };
  const removeImage = (idx: number) => setImages(images.filter((_, i) => i !== idx));
  const setCover = (idx: number) => {
    if (idx === 0) return;
    const next = [...images];
    const [picked] = next.splice(idx, 1);
    next.unshift(picked);
    setImages(next);
  };

  const isPending = createStore.isPending || updateStore.isPending;

  const parseCoord = (raw: string, kind: "lat" | "lng"): { ok: true; value: number | null } | { ok: false; msg: string } => {
    const trimmed = raw.trim();
    if (!trimmed) return { ok: true, value: null };
    const n = Number(trimmed);
    if (!Number.isFinite(n)) return { ok: false, msg: kind === "lat" ? t.stores.latitude : t.stores.longitude };
    if (kind === "lat" && (n < -90 || n > 90)) return { ok: false, msg: t.stores.latitude };
    if (kind === "lng" && (n < -180 || n > 180)) return { ok: false, msg: t.stores.longitude };
    return { ok: true, value: n };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: t.common.error, description: t.stores.nameEmptyError, variant: "destructive" });
      return;
    }
    const lat = parseCoord(latitude, "lat");
    if (!lat.ok) {
      toast({ title: t.common.error, description: lat.msg, variant: "destructive" });
      return;
    }
    const lng = parseCoord(longitude, "lng");
    if (!lng.ok) {
      toast({ title: t.common.error, description: lng.msg, variant: "destructive" });
      return;
    }
    const trimmedAcc = bankAccountNumber.trim();
    const trimmedBin = bankBin.trim();
    if ((trimmedAcc && !trimmedBin) || (!trimmedAcc && trimmedBin)) {
      toast({
        title: t.stores.missingBankInfo,
        description: t.stores.missingBankInfoDesc,
        variant: "destructive",
      });
      return;
    }
    if (trimmedAcc && !/^[0-9]{4,30}$/.test(trimmedAcc)) {
      toast({
        title: t.stores.invalidAccountNumber,
        description: t.stores.invalidAccountNumberDesc,
        variant: "destructive",
      });
      return;
    }

    const payload = {
      name,
      address,
      phone,
      latitude: lat.value,
      longitude: lng.value,
      bankBin: trimmedBin,
      bankAccountNumber: trimmedAcc,
      bankAccountName: bankAccountName.trim(),
      enableCustomerDisplay,
      description: description.trim(),
      images,
    };

    if (store) {
      updateStore.mutate(
        { id: store.id, data: payload },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListStoresQueryKey() });
            toast({ title: t.common.success, description: t.stores.storeUpdated });
            onSuccess();
          },
          onError: (err: any) => {
            toast({ title: t.common.error, description: err.message, variant: "destructive" });
          }
        }
      );
    } else {
      createStore.mutate(
        { data: payload },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListStoresQueryKey() });
            toast({ title: t.common.success, description: t.stores.storeCreated });
            onSuccess();
          },
          onError: (err: any) => {
            toast({ title: t.common.error, description: err.message, variant: "destructive" });
          }
        }
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="name">{t.stores.storeName} <span className="text-destructive">*</span></Label>
          <Input id="name" value={name} onChange={e => setName(e.target.value)} data-testid="input-store-name" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">{t.stores.address}</Label>
          <Input id="address" value={address} onChange={e => setAddress(e.target.value)} data-testid="input-store-address" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">{t.stores.phone}</Label>
          <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} data-testid="input-store-phone" />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">{t.stores.description}</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t.stores.descriptionPlaceholder}
            rows={3}
            data-testid="input-store-description"
          />
        </div>
      </div>

      <div className="space-y-2 pt-2 border-t" data-testid="section-store-images">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-1.5">
            <ImageIcon className="w-4 h-4" /> {t.stores.images}
          </Label>
          <span className="text-xs text-muted-foreground">{images.length} / 10</span>
        </div>
        <p className="text-xs text-muted-foreground">{t.stores.maxStoreImages}</p>
        {images.length > 0 && (
          <div className="grid grid-cols-5 gap-2" data-testid="grid-store-images">
            {images.map((src, idx) => (
              <div
                key={src + idx}
                className={`relative group rounded-md overflow-hidden border ${idx === 0 ? "ring-2 ring-primary" : ""}`}
                data-testid={`store-image-thumb-${idx}`}
              >
                <div className="aspect-square bg-muted">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </div>
                {idx === 0 && (
                  <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <Star className="w-3 h-3 fill-current" /> {t.stores.cover}
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 flex bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  {idx !== 0 && (
                    <button
                      type="button"
                      onClick={() => setCover(idx)}
                      className="flex-1 text-[10px] py-1 hover:bg-white/10"
                      data-testid={`button-store-set-cover-${idx}`}
                      title={t.stores.setCover}
                    >
                      {t.stores.setCover}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="flex-1 text-[10px] py-1 hover:bg-red-500/40 flex items-center justify-center gap-0.5"
                    data-testid={`button-store-remove-image-${idx}`}
                    title={t.common.delete}
                  >
                    <X className="w-3 h-3" /> {t.common.delete}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {images.length < 10 && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFilesSelected}
              data-testid="input-store-image-file"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full"
              data-testid="button-store-upload-image"
            >
              {isUploading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t.stores.uploading}</>
              ) : (
                <><Upload className="w-4 h-4 mr-2" /> {t.stores.uploadImage} ({images.length}/10)</>
              )}
            </Button>
          </div>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="mapsUrl" className="flex items-center gap-1.5">
          {t.stores.mapsLinkLabel}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
                aria-label={t.stores.mapsHelpTitle}
                data-testid="button-store-maps-help"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="right" align="start" className="w-80 text-sm">
              <p className="font-semibold mb-2">{t.stores.mapsHelpTitle}</p>
              <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                <li>{t.stores.mapsHelpStep1}</li>
                <li>{t.stores.mapsHelpStep2}</li>
                <li>{t.stores.mapsHelpStep3}</li>
                <li>{t.stores.mapsHelpStep4}</li>
                <li>{t.stores.mapsHelpStep5}</li>
              </ol>
              <p className="mt-2 text-xs text-muted-foreground">{t.stores.mapsHelpTip}</p>
            </PopoverContent>
          </Popover>
        </Label>
        <div className="flex gap-2">
          <Input
            id="mapsUrl"
            type="url"
            value={mapsUrl}
            onChange={(e) => setMapsUrl(e.target.value)}
            placeholder={t.stores.mapsLinkPlaceholder}
            data-testid="input-store-maps-url"
          />
          <Button
            type="button"
            variant="secondary"
            disabled={isResolvingMaps}
            onClick={async () => {
              const raw = mapsUrl.trim();
              if (!raw) {
                toast({ title: t.common.error, description: t.stores.mapsLinkEmpty, variant: "destructive" });
                return;
              }
              setIsResolvingMaps(true);
              try {
                const res = await fetch("/api/stores/resolve-maps-url", {
                  method: "POST",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ url: raw }),
                });
                if (!res.ok) {
                  const body = await res.json().catch(() => ({} as any));
                  toast({
                    title: t.common.error,
                    description: body?.error || t.stores.mapsResolveError,
                    variant: "destructive",
                  });
                  return;
                }
                const data: { lat: number; lng: number } = await res.json();
                setLatitude(String(data.lat));
                setLongitude(String(data.lng));
                toast({ title: t.common.success, description: `${t.stores.mapsResolved} ${data.lat}, ${data.lng}` });
              } catch {
                toast({ title: t.common.error, description: t.stores.mapsResolveError, variant: "destructive" });
              } finally {
                setIsResolvingMaps(false);
              }
            }}
            data-testid="button-store-resolve-maps"
          >
            {isResolvingMaps ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t.stores.mapsResolving}</>
            ) : (
              t.stores.mapsResolveButton
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {t.stores.mapsLinkHelp}
        </p>
        {(latitude || longitude) && (
          <p className="text-xs text-foreground" data-testid="text-store-resolved-coords">
            {t.stores.mapsResolved} <span className="font-mono">{latitude || "—"}, {longitude || "—"}</span>
          </p>
        )}
      </div>

      <div className="border-t pt-4 space-y-3">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">{t.stores.bankQrSection}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>{t.stores.bankName}</Label>
            <Select
              value={bankBin || "__none__"}
              onValueChange={(v) => {
                if (v === "__none__") {
                  setBankBin("");
                  setBankAccountNumber("");
                  setBankAccountName("");
                } else {
                  setBankBin(v);
                }
              }}
            >
              <SelectTrigger data-testid="select-store-bank">
                <SelectValue placeholder={t.stores.selectBank} />
              </SelectTrigger>
              <SelectContent className="max-h-[280px]">
                <SelectItem value="__none__">{t.stores.noBankSelected}</SelectItem>
                {VN_BANKS.map((b) => (
                  <SelectItem key={b.bin} value={b.bin}>
                    {b.shortName} ({b.bin})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bankAccountNumber">{t.stores.bankAccountNumber}</Label>
            <Input
              id="bankAccountNumber"
              value={bankAccountNumber}
              onChange={(e) => setBankAccountNumber(e.target.value.replace(/[^0-9]/g, ""))}
              inputMode="numeric"
              data-testid="input-store-bank-account-number"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="bankAccountName">{t.stores.bankAccountName}</Label>
          <Input
            id="bankAccountName"
            value={bankAccountName}
            onChange={(e) => setBankAccountName(e.target.value)}
            data-testid="input-store-bank-account-name"
          />
          <p className="text-xs text-muted-foreground">
            {bankBin
              ? `${findBankByBin(bankBin)?.name ?? bankBin}`
              : t.stores.noBankSelected}
          </p>
        </div>
      </div>

      <div className="border-t pt-4 space-y-3">
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">{t.stores.enableCustomerDisplay}</span>
        </div>
        <div className="flex items-start justify-between gap-4 rounded-lg border bg-muted/20 p-3">
          <div className="space-y-1">
            <Label htmlFor="enableCustomerDisplay" className="font-medium text-sm cursor-pointer">
              {t.stores.enableCustomerDisplay}
            </Label>
          </div>
          <Switch
            id="enableCustomerDisplay"
            checked={enableCustomerDisplay}
            onCheckedChange={setEnableCustomerDisplay}
            data-testid="switch-enable-customer-display"
          />
        </div>
      </div>

      <DialogFooter className="pt-4">
        <Button type="button" variant="outline" onClick={onSuccess}>{t.common.cancel}</Button>
        <Button type="submit" disabled={isPending} data-testid="button-save-store">
          {isPending ? t.common.processing : store ? t.common.update : t.common.create}
        </Button>
      </DialogFooter>
    </form>
  );
}
