import { useEffect, useMemo, useState } from "react";
import { Plus, KeyRound, Lock, Unlock, Trash2, Pencil, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

interface SupportUser {
  id: string;
  email: string;
  name: string;
  phone: string;
  isActive: boolean;
  isSuspended: boolean;
  suspendedAt: string | null;
  suspendedReason: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
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
    } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return null as T;
  return res.json();
}

export default function AdminSupportUsersPage() {
  const t = useT();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "suspended">("all");
  const [rows, setRows] = useState<SupportUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<SupportUser | null>(null);
  const [resetting, setResetting] = useState<SupportUser | null>(null);
  const [suspending, setSuspending] = useState<SupportUser | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (status !== "all") params.set("status", status);
      const data = await api<SupportUser[]>(
        `/api/admin/support-users${params.toString() ? `?${params}` : ""}`,
      );
      setRows(data);
    } catch (err) {
      toast({
        title: t.common.error,
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status]);

  const handleReactivate = async (u: SupportUser) => {
    const ok = await confirm({
      title: t.adminSupportUsers.reactivateTitle,
      description: t.adminSupportUsers.reactivateDesc,
      confirmText: t.adminSupportUsers.reactivate,
    });
    if (!ok) return;
    try {
      await api(`/api/admin/support-users/${u.id}/reactivate`, { method: "POST" });
      toast({ title: t.common.success });
      load();
    } catch (err) {
      toast({
        title: t.common.error,
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (u: SupportUser) => {
    const ok = await confirm({
      title: t.adminSupportUsers.deleteTitle,
      description: t.adminSupportUsers.deleteDesc.replace("{name}", u.name),
      confirmText: t.common.delete,
      variant: "destructive",
    });
    if (!ok) return;
    try {
      await api(`/api/admin/support-users/${u.id}`, { method: "DELETE" });
      toast({ title: t.common.deleted });
      load();
    } catch (err) {
      toast({
        title: t.common.error,
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.adminSupportUsers.title}</h1>
          <p className="text-sm text-muted-foreground">{t.adminSupportUsers.subtitle}</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} data-testid="button-create-support-user">
          <Plus className="w-4 h-4 mr-2" /> {t.adminSupportUsers.addNew}
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 border rounded-md bg-card">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t.common.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-none bg-transparent shadow-none focus-visible:ring-0 px-0 h-7"
            data-testid="input-search-support"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-status-support">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.adminSupportUsers.statusAll}</SelectItem>
            <SelectItem value="active">{t.adminSupportUsers.statusActive}</SelectItem>
            <SelectItem value="suspended">{t.adminSupportUsers.statusSuspended}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.adminSupportUsers.name}</TableHead>
                <TableHead>{t.adminSupportUsers.email}</TableHead>
                <TableHead>{t.adminSupportUsers.phone}</TableHead>
                <TableHead>{t.adminSupportUsers.statusCol}</TableHead>
                <TableHead className="w-[180px] text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin inline-block mr-2" />
                    {t.common.loading}
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    {t.adminSupportUsers.empty}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((u) => (
                  <TableRow key={u.id} data-testid={`row-support-${u.id}`}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.phone}</TableCell>
                    <TableCell>
                      {u.isSuspended ? (
                        <Badge variant="destructive">
                          {t.adminSupportUsers.statusSuspended}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">{t.adminSupportUsers.statusActive}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => setEditing(u)}
                          title={t.common.edit}
                          data-testid={`button-edit-${u.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => setResetting(u)}
                          title={t.adminSupportUsers.resetPassword}
                          data-testid={`button-reset-${u.id}`}
                        >
                          <KeyRound className="w-4 h-4" />
                        </Button>
                        {u.isSuspended ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-emerald-600"
                            onClick={() => handleReactivate(u)}
                            title={t.adminSupportUsers.reactivate}
                            data-testid={`button-reactivate-${u.id}`}
                          >
                            <Unlock className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-amber-600"
                            onClick={() => setSuspending(u)}
                            title={t.adminSupportUsers.suspend}
                            data-testid={`button-suspend-${u.id}`}
                          >
                            <Lock className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDelete(u)}
                          title={t.common.delete}
                          data-testid={`button-delete-${u.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
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

      {createOpen && (
        <CreateOrEditDialog
          mode="create"
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            setCreateOpen(false);
            load();
          }}
        />
      )}
      {editing && (
        <CreateOrEditDialog
          mode="edit"
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
      {resetting && (
        <ResetPasswordDialog
          user={resetting}
          onClose={() => setResetting(null)}
          onSaved={() => setResetting(null)}
        />
      )}
      {suspending && (
        <SuspendDialog
          user={suspending}
          onClose={() => setSuspending(null)}
          onSaved={() => {
            setSuspending(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function CreateOrEditDialog({
  mode,
  initial,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  initial?: SupportUser;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useT();
  const { toast } = useToast();
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "create") {
        if (password.length < 6) {
          toast({
            title: t.common.error,
            description: t.adminSupportUsers.passwordTooShort,
            variant: "destructive",
          });
          setSubmitting(false);
          return;
        }
        await api(`/api/admin/support-users`, {
          method: "POST",
          body: JSON.stringify({ name, email, phone, password }),
        });
      } else if (initial) {
        await api(`/api/admin/support-users/${initial.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name, phone }),
        });
      }
      toast({ title: t.common.success });
      onSaved();
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
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create"
              ? t.adminSupportUsers.createTitle
              : t.adminSupportUsers.editTitle}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label>{t.adminSupportUsers.name}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              data-testid="input-support-name"
            />
          </div>
          <div className="space-y-1">
            <Label>{t.adminSupportUsers.email}</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={mode === "edit"}
              required
              data-testid="input-support-email"
            />
          </div>
          <div className="space-y-1">
            <Label>{t.adminSupportUsers.phone}</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              data-testid="input-support-phone"
            />
          </div>
          {mode === "create" && (
            <div className="space-y-1">
              <Label>{t.adminSupportUsers.password}</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
                data-testid="input-support-password"
              />
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={submitting} data-testid="button-save-support">
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t.common.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({
  user,
  onClose,
  onSaved,
}: {
  user: SupportUser;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useT();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({
        title: t.common.error,
        description: t.adminSupportUsers.passwordTooShort,
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      await api(`/api/admin/support-users/${user.id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      toast({ title: t.common.success });
      onSaved();
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
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.adminSupportUsers.resetPassword}</DialogTitle>
          <DialogDescription>
            {t.adminSupportUsers.resetPasswordDesc.replace("{name}", user.name)}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <Label>{t.adminSupportUsers.newPassword}</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
              data-testid="input-reset-password"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={submitting} data-testid="button-confirm-reset">
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t.common.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SuspendDialog({
  user,
  onClose,
  onSaved,
}: {
  user: SupportUser;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useT();
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast({
        title: t.common.error,
        description: t.adminSupportUsers.suspendReasonRequired,
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      await api(`/api/admin/support-users/${user.id}/suspend`, {
        method: "POST",
        body: JSON.stringify({ reason: reason.trim() }),
      });
      toast({ title: t.common.success });
      onSaved();
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
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.adminSupportUsers.suspend}</DialogTitle>
          <DialogDescription>
            {t.adminSupportUsers.suspendDesc.replace("{name}", user.name)}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <Label>{t.adminSupportUsers.suspendReason}</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              data-testid="input-suspend-reason"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t.common.cancel}
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={submitting}
              data-testid="button-confirm-suspend"
            >
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t.adminSupportUsers.suspend}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
