import { useState, useEffect, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useListStores } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/components/confirm-provider";
import { Plus, Pencil, KeyRound, Bike, Lock, Unlock, Trash2, X } from "lucide-react";
import { formatDate } from "@/lib/format";
import { useT } from "@/lib/i18n-context";

interface WorkingSlot {
  day: number;
  from: string;
  to: string;
}

interface Courier {
  id: string;
  userId: string;
  fullName: string;
  cccd: string;
  phone: string;
  hasZalo: boolean;
  workingHours: WorkingSlot[];
  isActive: boolean;
  suspendedAt: string | null;
  suspendedReason: string | null;
  createdAt: string;
  storeIds: string[];
}

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return null as T;
  return res.json();
}

const CCCD_REGEX = /^\d{9}(\d{3})?$/;

export default function CouriersPage() {
  const t = useT();
  const { user: me } = useAuth();
  const { toast } = useToast();
  const confirm = useConfirm();
  const qc = useQueryClient();
  const { data: stores = [] } = useListStores();

  const couriersQuery = useQuery<Courier[]>({
    queryKey: ["/api/couriers"],
    queryFn: () => jsonFetch<Courier[]>("/api/couriers"),
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Courier | null>(null);
  const [resetTarget, setResetTarget] = useState<Courier | null>(null);
  const [resetPwd, setResetPwd] = useState("");

  const [fullName, setFullName] = useState("");
  const [cccd, setCccd] = useState("");
  const [phone, setPhone] = useState("");
  const [hasZalo, setHasZalo] = useState(false);
  const [storeIds, setStoreIds] = useState<string[]>([]);
  const [slots, setSlots] = useState<WorkingSlot[]>([]);

  useEffect(() => {
    if (open && editing) {
      setFullName(editing.fullName);
      setCccd(editing.cccd);
      setPhone(editing.phone ?? "");
      setHasZalo(editing.hasZalo);
      setStoreIds(editing.storeIds ?? []);
      setSlots(editing.workingHours ?? []);
    } else if (open) {
      setFullName("");
      setCccd("");
      setPhone("");
      setHasZalo(false);
      setStoreIds([]);
      setSlots([]);
    }
  }, [open, editing]);

  const createMut = useMutation({
    mutationFn: (input: {
      fullName: string;
      cccd: string;
      phone: string;
      hasZalo: boolean;
      workingHours: WorkingSlot[];
      storeIds: string[];
    }) =>
      jsonFetch<Courier>("/api/couriers", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/couriers"] });
      toast({ title: t.couriers.courierCreated, description: t.couriers.defaultLoginHint });
      setOpen(false);
    },
    onError: (err: unknown) =>
      toast({
        variant: "destructive",
        title: t.common.error,
        description: err instanceof Error ? err.message : String(err),
      }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...input }: { id: string } & Record<string, unknown>) =>
      jsonFetch<Courier>(`/api/couriers/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/couriers"] });
      toast({ title: t.couriers.courierUpdated });
      setOpen(false);
    },
    onError: (err: unknown) =>
      toast({
        variant: "destructive",
        title: t.common.error,
        description: err instanceof Error ? err.message : String(err),
      }),
  });

  const resetMut = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      jsonFetch<{ ok: true }>(`/api/couriers/${id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ password }),
      }),
    onSuccess: () => {
      toast({ title: t.users.passwordReset });
      setResetTarget(null);
      setResetPwd("");
    },
    onError: (err) =>
      toast({ variant: "destructive", title: t.common.error, description: (err as Error).message }),
  });

  const suspendMut = useMutation({
    mutationFn: ({ id, suspend }: { id: string; suspend: boolean }) =>
      jsonFetch<{ ok: true }>(
        `/api/couriers/${id}/${suspend ? "suspend" : "unsuspend"}`,
        { method: "POST", body: JSON.stringify({}) },
      ),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["/api/couriers"] });
      toast({ title: vars.suspend ? t.couriers.suspendedToast : t.couriers.unsuspendedToast });
    },
    onError: (err) =>
      toast({ variant: "destructive", title: t.common.error, description: (err as Error).message }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) =>
      jsonFetch<null>(`/api/couriers/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/couriers"] });
      toast({ title: t.couriers.deletedToast });
    },
    onError: (err) =>
      toast({ variant: "destructive", title: t.common.error, description: (err as Error).message }),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (storeIds.length === 0) {
      toast({ variant: "destructive", title: t.couriers.selectAtLeastOneStore });
      return;
    }
    if (editing) {
      updateMut.mutate({
        id: editing.id,
        fullName,
        phone,
        hasZalo,
        workingHours: slots,
        storeIds,
      });
    } else {
      if (!CCCD_REGEX.test(cccd)) {
        toast({ variant: "destructive", title: t.couriers.invalidCccd });
        return;
      }
      createMut.mutate({
        fullName,
        cccd,
        phone,
        hasZalo,
        workingHours: slots,
        storeIds,
      });
    }
  };

  const toggleStore = (id: string) => {
    setStoreIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const addSlot = () => setSlots((s) => [...s, { day: 1, from: "08:00", to: "17:00" }]);
  const removeSlot = (i: number) => setSlots((s) => s.filter((_, idx) => idx !== i));
  const updateSlot = (i: number, patch: Partial<WorkingSlot>) =>
    setSlots((s) => s.map((slot, idx) => (idx === i ? { ...slot, ...patch } : slot)));

  if (me?.role !== "owner" && me?.role !== "manager") {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t.users.subtitle}
          </CardContent>
        </Card>
      </div>
    );
  }

  const dayLabels = [
    t.couriers.days.sun,
    t.couriers.days.mon,
    t.couriers.days.tue,
    t.couriers.days.wed,
    t.couriers.days.thu,
    t.couriers.days.fri,
    t.couriers.days.sat,
  ];

  return (
    <div className="p-6 space-y-6" data-testid="page-couriers">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bike className="h-6 w-6 text-primary" />
            {t.couriers.title}
          </h1>
          <p className="text-muted-foreground text-sm">{t.couriers.subtitle}</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
          data-testid="button-add-courier"
        >
          <Plus className="mr-2 h-4 w-4" />
          {t.couriers.addCourier}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.couriers.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.couriers.fullName}</TableHead>
                <TableHead>{t.couriers.cccd}</TableHead>
                <TableHead>{t.couriers.phone}</TableHead>
                <TableHead>{t.couriers.hasZalo}</TableHead>
                <TableHead>{t.couriers.assignedStores}</TableHead>
                <TableHead>{t.couriers.status}</TableHead>
                <TableHead>{t.expenses.date}</TableHead>
                <TableHead className="text-right">{t.inventory.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {couriersQuery.isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-6">
                    {t.common.loading}
                  </TableCell>
                </TableRow>
              )}
              {!couriersQuery.isLoading && (couriersQuery.data ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-6">
                    {t.couriers.noCouriers}
                  </TableCell>
                </TableRow>
              )}
              {(couriersQuery.data ?? []).map((c) => (
                <TableRow key={c.id} data-testid={`row-courier-${c.id}`}>
                  <TableCell className="font-medium">{c.fullName}</TableCell>
                  <TableCell className="font-mono text-sm">{c.cccd}</TableCell>
                  <TableCell>{c.phone || "—"}</TableCell>
                  <TableCell>
                    {c.hasZalo ? (
                      <Badge variant="secondary">{t.couriers.yes}</Badge>
                    ) : (
                      <Badge variant="outline">{t.couriers.no}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[220px]">
                    {(c.storeIds ?? [])
                      .map((id) => stores.find((s) => s.id === id)?.name)
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </TableCell>
                  <TableCell>
                    {c.isActive ? (
                      <Badge variant="secondary">{t.couriers.active}</Badge>
                    ) : (
                      <Badge variant="destructive">{t.couriers.suspended}</Badge>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(c.createdAt, "dd/MM/yyyy")}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setResetTarget(c);
                          setResetPwd("");
                        }}
                        title={t.users.resetPassword}
                        data-testid={`button-reset-pwd-${c.id}`}
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditing(c);
                          setOpen(true);
                        }}
                        data-testid={`button-edit-${c.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {c.isActive ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            const ok = await confirm({
                              title: t.couriers.confirmSuspend,
                              variant: "destructive",
                            });
                            if (ok) suspendMut.mutate({ id: c.id, suspend: true });
                          }}
                          title={t.couriers.suspend}
                          data-testid={`button-suspend-${c.id}`}
                        >
                          <Lock className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            const ok = await confirm({
                              title: t.couriers.confirmUnsuspend,
                            });
                            if (ok) suspendMut.mutate({ id: c.id, suspend: false });
                          }}
                          title={t.couriers.unsuspend}
                          data-testid={`button-unsuspend-${c.id}`}
                        >
                          <Unlock className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          const ok = await confirm({
                            title: t.couriers.confirmDelete,
                            variant: "destructive",
                          });
                          if (ok) deleteMut.mutate(c.id);
                        }}
                        title={t.couriers.delete}
                        data-testid={`button-delete-${c.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? `${t.couriers.editCourier}: ${editing.fullName}` : t.couriers.addCourier}
            </DialogTitle>
            <DialogDescription>{t.couriers.defaultLoginHint}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4" data-testid="form-courier">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t.couriers.fullName}</Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  data-testid="input-courier-fullname"
                />
              </div>
              <div className="space-y-2">
                <Label>{t.couriers.phone}</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  data-testid="input-courier-phone"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t.couriers.cccd}</Label>
              <Input
                value={cccd}
                onChange={(e) => setCccd(e.target.value.replace(/\D/g, ""))}
                disabled={!!editing}
                required={!editing}
                placeholder="012345678901"
                data-testid="input-courier-cccd"
              />
              <p className="text-xs text-muted-foreground">{t.couriers.cccdHint}</p>
            </div>
            <div className="flex items-center justify-between border rounded-md p-3">
              <Label htmlFor="has-zalo">{t.couriers.hasZalo}</Label>
              <Switch id="has-zalo" checked={hasZalo} onCheckedChange={setHasZalo} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t.couriers.workingHours}</Label>
                <Button type="button" size="sm" variant="outline" onClick={addSlot}>
                  <Plus className="h-3 w-3 mr-1" />
                  {t.couriers.addSlot}
                </Button>
              </div>
              <div className="space-y-2">
                {slots.length === 0 && (
                  <p className="text-sm text-muted-foreground border rounded-md p-3">
                    {t.common.noData}
                  </p>
                )}
                {slots.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 border rounded-md p-2">
                    <Select
                      value={String(s.day)}
                      onValueChange={(v) => updateSlot(i, { day: Number(v) })}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {dayLabels.map((label, d) => (
                          <SelectItem key={d} value={String(d)}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="time"
                      value={s.from}
                      onChange={(e) => updateSlot(i, { from: e.target.value })}
                      className="w-28"
                    />
                    <span className="text-sm text-muted-foreground">→</span>
                    <Input
                      type="time"
                      value={s.to}
                      onChange={(e) => updateSlot(i, { to: e.target.value })}
                      className="w-28"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeSlot(i)}
                      className="ml-auto"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t.couriers.assignedStores}</Label>
              <div className="space-y-2 border rounded-md p-3 max-h-40 overflow-y-auto">
                {stores.length === 0 && (
                  <p className="text-sm text-muted-foreground">{t.stores.noStores}</p>
                )}
                {stores.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={storeIds.includes(s.id)}
                      onChange={() => toggleStore(s.id)}
                      data-testid={`checkbox-courier-store-${s.id}`}
                    />
                    <span>{s.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {t.common.cancel}
              </Button>
              <Button
                type="submit"
                disabled={createMut.isPending || updateMut.isPending}
                data-testid="button-submit-courier"
              >
                {editing ? t.common.save : t.couriers.addCourier}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetTarget} onOpenChange={(o) => !o && setResetTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" /> {t.users.resetPassword}
            </DialogTitle>
            <DialogDescription>
              {resetTarget?.fullName} — CCCD {resetTarget?.cccd}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reset-pwd">{t.account.newPassword}</Label>
            <Input
              id="reset-pwd"
              type="text"
              value={resetPwd}
              onChange={(e) => setResetPwd(e.target.value)}
              placeholder="Tối thiểu 6 ký tự"
              data-testid="input-courier-reset-password"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetTarget(null)}>
              {t.common.cancel}
            </Button>
            <Button
              disabled={resetPwd.length < 6 || resetMut.isPending}
              onClick={() =>
                resetTarget && resetMut.mutate({ id: resetTarget.id, password: resetPwd })
              }
              data-testid="button-confirm-courier-reset"
            >
              <KeyRound className="h-4 w-4 mr-1" />
              {t.common.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
