import { useState, useEffect, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useListStores } from "@workspace/api-client-react";
import { useAuth, type CurrentUser } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
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
import { Plus, Pencil, ShieldCheck, KeyRound } from "lucide-react";
import { formatDate } from "@/lib/format";
import { useT } from "@/lib/i18n-context";
import type { Translations } from "@/lib/translations";

type UserRole = "manager" | "cashier" | "barista";

function getRoleLabel(t: Translations): Record<string, string> {
  return {
    owner: t.layout.roleOwner,
    manager: t.layout.roleManager,
    cashier: t.layout.roleCashier,
    barista: t.layout.roleBarista,
  };
}

const ROLE_COLOR: Record<string, string> = {
  owner: "bg-primary text-primary-foreground",
  manager: "bg-blue-500 text-white",
  cashier: "bg-green-500 text-white",
  barista: "bg-orange-500 text-white",
};

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

export default function UsersPage() {
  const t = useT();
  const ROLE_LABEL = getRoleLabel(t);
  const { user: me } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: stores = [] } = useListStores();

  const usersQuery = useQuery<CurrentUser[]>({
    queryKey: ["/api/users"],
    queryFn: () => jsonFetch<CurrentUser[]>("/api/users"),
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CurrentUser | null>(null);
  const [resetTarget, setResetTarget] = useState<CurrentUser | null>(null);
  const [resetPwd, setResetPwd] = useState("");

  const resetPasswordMut = useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) =>
      jsonFetch<{ ok: true; email: string }>(`/api/users/${id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ password }),
      }),
    onSuccess: (_data, vars) => {
      toast({
        title: t.users.passwordReset,
        description: `Mật khẩu của ${resetTarget?.name ?? "nhân viên"} đã được cập nhật. Vui lòng gửi qua kênh an toàn.`,
      });
      setResetTarget(null);
      setResetPwd("");
      void vars;
    },
    onError: (err) =>
      toast({ variant: "destructive", title: t.common.error, description: (err as Error).message }),
  });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("cashier");
  const [storeIds, setStoreIds] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (open && editing) {
      setName(editing.name);
      setEmail(editing.email);
      setPhone(editing.phone ?? "");
      setPassword("");
      setRole(editing.role === "owner" ? "manager" : (editing.role as UserRole));
      setStoreIds(editing.storeIds ?? []);
      setIsActive(editing.isActive);
    } else if (open) {
      setName("");
      setEmail("");
      setPhone("");
      setPassword("");
      setRole("cashier");
      setStoreIds([]);
      setIsActive(true);
    }
  }, [open, editing]);

  const createMut = useMutation({
    mutationFn: (input: {
      email: string;
      password: string;
      name: string;
      phone?: string;
      role: UserRole;
      storeIds: string[];
    }) =>
      jsonFetch<CurrentUser>("/api/users", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: t.users.userCreated });
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
      jsonFetch<CurrentUser>(`/api/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: t.users.userUpdated });
      setOpen(false);
    },
    onError: (err: unknown) =>
      toast({
        variant: "destructive",
        title: t.common.error,
        description: err instanceof Error ? err.message : String(err),
      }),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (editing) {
      const payload: Record<string, unknown> = {
        name,
        phone,
        role,
        storeIds,
        isActive,
      };
      if (password) payload["password"] = password;
      updateMut.mutate({ id: editing.id, ...payload });
    } else {
      if (!password || password.length < 6) {
        toast({
          variant: "destructive",
          title: "Mật khẩu cần tối thiểu 6 ký tự",
        });
        return;
      }
      createMut.mutate({
        email: email.trim(),
        password,
        name,
        phone,
        role,
        storeIds,
      });
    }
  };

  const toggleStore = (id: string) => {
    setStoreIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  if (me?.role !== "owner") {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Chỉ chủ chuỗi mới có quyền quản lý tài khoản.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="page-users">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            {t.users.title}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t.users.subtitle}
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
          data-testid="button-add-user"
        >
          <Plus className="mr-2 h-4 w-4" />
          {t.users.addUser}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.users.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.users.name}</TableHead>
                <TableHead>{t.users.email}</TableHead>
                <TableHead>{t.staff.phone}</TableHead>
                <TableHead>{t.users.role}</TableHead>
                <TableHead>{t.shifts.store}</TableHead>
                <TableHead>{t.shifts.status}</TableHead>
                <TableHead>{t.expenses.date}</TableHead>
                <TableHead className="text-right">{t.inventory.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersQuery.isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-6">
                    {t.common.loading}
                  </TableCell>
                </TableRow>
              )}
              {!usersQuery.isLoading && (usersQuery.data ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-6">
                    {t.users.noUsers}
                  </TableCell>
                </TableRow>
              )}
              {(usersQuery.data ?? []).map((u) => (
                <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.phone || "—"}</TableCell>
                  <TableCell>
                    <Badge className={ROLE_COLOR[u.role] ?? ""}>{ROLE_LABEL[u.role]}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[220px]">
                    {u.role === "owner"
                      ? "Toàn chuỗi"
                      : (u.storeIds ?? [])
                          .map((id) => stores.find((s) => s.id === id)?.name)
                          .filter(Boolean)
                          .join(", ") || "—"}
                  </TableCell>
                  <TableCell>
                    {u.isActive ? (
                      <Badge variant="secondary">{t.shifts.open}</Badge>
                    ) : (
                      <Badge variant="outline">{t.shifts.closed}</Badge>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(u.createdAt, "dd/MM/yyyy")}</TableCell>
                  <TableCell className="text-right">
                    {u.id !== me.id && u.role !== "owner" && (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setResetTarget(u);
                            setResetPwd("");
                          }}
                          title={t.users.resetPassword}
                          data-testid={`button-reset-pwd-${u.id}`}
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditing(u);
                            setOpen(true);
                          }}
                          data-testid={`button-edit-${u.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? `${t.common.edit}: ${editing.name}` : t.users.addUser}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Cập nhật vai trò, cửa hàng và trạng thái cho nhân viên."
                : "Tạo tài khoản đăng nhập mới cho nhân viên trong chuỗi."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4" data-testid="form-user">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t.users.name}</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required data-testid="input-user-name" />
              </div>
              <div className="space-y-2">
                <Label>{t.staff.phone}</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} data-testid="input-user-phone" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t.users.email} {editing && <span className="text-xs text-muted-foreground">({t.common.noChange.toLowerCase()})</span>}</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required={!editing}
                disabled={!!editing}
                data-testid="input-user-email"
              />
            </div>
            <div className="space-y-2">
              <Label>
                {t.login.password} {editing && <span className="text-xs text-muted-foreground">(để trống nếu không đổi)</span>}
              </Label>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={editing ? 0 : 6}
                required={!editing}
                data-testid="input-user-password"
              />
            </div>
            <div className="space-y-2">
              <Label>{t.users.role}</Label>
              <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                <SelectTrigger data-testid="select-user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">{t.layout.roleManager}</SelectItem>
                  <SelectItem value="cashier">{t.layout.roleCashier}</SelectItem>
                  <SelectItem value="barista">{t.layout.roleBarista}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t.staff.assignedStores}</Label>
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
                      data-testid={`checkbox-store-${s.id}`}
                    />
                    <span>{s.name}</span>
                  </label>
                ))}
              </div>
            </div>
            {editing && (
              <div className="flex items-center justify-between">
                <Label htmlFor="active">{t.users.isActive}</Label>
                <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {t.common.cancel}
              </Button>
              <Button type="submit" disabled={createMut.isPending || updateMut.isPending} data-testid="button-submit-user">
                {editing ? t.common.save : t.users.addUser}
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
              Mật khẩu mới sẽ áp dụng ngay cho{" "}
              <strong>{resetTarget?.name}</strong> ({resetTarget?.email}). Hãy gửi cho nhân viên qua
              kênh an toàn và nhắc họ đổi lại sau khi đăng nhập.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reset-pwd-staff">{t.account.newPassword}</Label>
            <Input
              id="reset-pwd-staff"
              type="text"
              value={resetPwd}
              onChange={(e) => setResetPwd(e.target.value)}
              placeholder="Tối thiểu 6 ký tự"
              data-testid="input-staff-reset-password"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetTarget(null)}>
              {t.common.cancel}
            </Button>
            <Button
              disabled={resetPwd.length < 6 || resetPasswordMut.isPending}
              onClick={() =>
                resetTarget && resetPasswordMut.mutate({ id: resetTarget.id, password: resetPwd })
              }
              data-testid="button-confirm-staff-reset"
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
