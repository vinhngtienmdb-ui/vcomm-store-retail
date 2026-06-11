import { useListStaff, useCreateStaff, useUpdateStaff, useDeleteStaff, getListStaffQueryKey, useListStores } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, UserCircle, Search, MoreHorizontal, Pencil, Check, X, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/format";
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
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/components/confirm-provider";
import type { Staff } from "@workspace/api-client-react";
import { StaffRole } from "@workspace/api-client-react";
import { useStoreId } from "@/lib/store-context";
import { useT } from "@/lib/i18n-context";
import type { Translations } from "@/lib/translations";

function getRoleLabels(t: Translations): Record<string, string> {
  return {
    [StaffRole.owner]: t.layout.roleOwner,
    [StaffRole.manager]: t.layout.roleManager,
    [StaffRole.barista]: t.layout.roleBarista,
    [StaffRole.cashier]: t.layout.roleCashier,
  };
}

export default function StaffPage() {
  const t = useT();
  const ROLE_LABELS = getRoleLabels(t);
  const { storeId } = useStoreId();
  const { data: staffList = [], isLoading } = useListStaff({
    storeId: storeId === 'all' ? undefined : storeId
  });
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">{t.staff.title}</h1>
          <p className="text-muted-foreground mt-1">{t.staff.subtitle}</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="hover-elevate">
              <Plus className="w-4 h-4 mr-2" /> {t.staff.addStaff}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.staff.addStaffTitle}</DialogTitle>
            </DialogHeader>
            <StaffForm onSuccess={() => setIsCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-xl border border-card-border shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.staff.title}</TableHead>
                <TableHead>{t.staff.role}</TableHead>
                <TableHead>{t.shifts.store}</TableHead>
                <TableHead>{t.staff.phone}</TableHead>
                <TableHead>{t.shifts.status}</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">{t.common.loading}</TableCell>
                </TableRow>
              ) : staffList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    {t.staff.noStaff}
                  </TableCell>
                </TableRow>
              ) : (
                staffList.map((staff) => (
                  <TableRow key={staff.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-secondary/50 text-secondary-foreground flex items-center justify-center font-semibold text-xs">
                          {staff.name.charAt(0).toUpperCase()}
                        </div>
                        {staff.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-medium">
                        {ROLE_LABELS[staff.role] || staff.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {staff.storeName || "Toàn hệ thống"}
                    </TableCell>
                    <TableCell>{staff.phone}</TableCell>
                    <TableCell>
                      <Badge variant={staff.isActive ? "default" : "secondary"} className={staff.isActive ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20" : ""}>
                        {staff.isActive ? "Đang làm" : "Đã nghỉ"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingStaff(staff)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            {t.common.edit}
                          </DropdownMenuItem>
                          <ToggleActiveMenuItem staff={staff} />
                          <DropdownMenuSeparator />
                          <DeleteStaffItem id={staff.id} />
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={!!editingStaff} onOpenChange={(open) => !open && setEditingStaff(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.staff.editStaff}</DialogTitle>
          </DialogHeader>
          {editingStaff && (
            <StaffForm staff={editingStaff} onSuccess={() => setEditingStaff(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ToggleActiveMenuItem({ staff }: { staff: Staff }) {
  const t = useT();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateStaff = useUpdateStaff();

  const handleToggle = () => {
    updateStaff.mutate(
      { id: staff.id, data: { isActive: !staff.isActive } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListStaffQueryKey() });
          toast({ title: t.common.success, description: `Nhân viên đã chuyển sang trạng thái ${!staff.isActive ? 'Đang làm' : 'Đã nghỉ'}.` });
        }
      }
    );
  };

  return (
    <DropdownMenuItem onClick={handleToggle}>
      {staff.isActive ? (
        <><X className="mr-2 h-4 w-4" /> Đánh dấu đã nghỉ</>
      ) : (
        <><Check className="mr-2 h-4 w-4" /> Đánh dấu đang làm</>
      )}
    </DropdownMenuItem>
  );
}

function DeleteStaffItem({ id }: { id: string }) {
  const t = useT();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const deleteStaff = useDeleteStaff();

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Xóa hồ sơ nhân viên?",
      description: "Hồ sơ và lịch sử ca làm sẽ bị xóa. Hành động này không thể hoàn tác.",
      confirmText: "Xóa nhân viên",
      variant: "destructive",
    });
    if (!ok) return;
    deleteStaff.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListStaffQueryKey() });
          toast({ title: t.common.deleted, description: "Đã xóa hồ sơ nhân viên." });
        },
      },
    );
  };

  return (
    <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:bg-destructive/10">
      <Trash2 className="mr-2 h-4 w-4" /> {t.common.delete}
    </DropdownMenuItem>
  );
}

function StaffForm({ staff, onSuccess }: { staff?: Staff, onSuccess: () => void }) {
  const t = useT();
  const ROLE_LABELS = getRoleLabels(t);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();
  const { data: stores = [] } = useListStores();
  
  const [name, setName] = useState(staff?.name || "");
  const [phone, setPhone] = useState(staff?.phone || "");
  const [email, setEmail] = useState(staff?.email || "");
  const [role, setRole] = useState<StaffRole>(staff?.role || StaffRole.cashier);
  const [storeId, setStoreId] = useState(staff?.storeId || "all");

  const isPending = createStaff.isPending || updateStaff.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast({ title: t.common.error, description: "Tên và SĐT không được để trống", variant: "destructive" });
      return;
    }

    const payload = {
      name,
      phone,
      email,
      role,
      storeId: storeId === "all" ? null : storeId
    };

    if (staff) {
      updateStaff.mutate(
        { id: staff.id, data: payload },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListStaffQueryKey() });
            toast({ title: t.common.success, description: t.staff.staffUpdated });
            onSuccess();
          },
          onError: (err: any) => {
            toast({ title: t.common.error, description: err.message, variant: "destructive" });
          }
        }
      );
    } else {
      createStaff.mutate(
        { data: payload as any },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListStaffQueryKey() });
            toast({ title: t.common.success, description: t.staff.staffCreated });
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
      <div className="space-y-2">
        <Label htmlFor="name">{t.staff.name} <span className="text-destructive">*</span></Label>
        <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Trần Thị B" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">{t.staff.phone} <span className="text-destructive">*</span></Label>
          <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0901234567" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">{t.staff.email}</Label>
          <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nvb@example.com" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t.staff.role}</Label>
          <Select value={role} onValueChange={(v) => setRole(v as StaffRole)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ROLE_LABELS).map(([val, label]) => (
                <SelectItem key={val} value={val}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t.staff.assignedStores}</Label>
          <Select value={storeId} onValueChange={setStoreId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toàn hệ thống (Quản lý)</SelectItem>
              {stores.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter className="pt-4">
        <Button type="button" variant="outline" onClick={onSuccess}>{t.common.cancel}</Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? t.pos.processing : staff ? t.common.save : t.common.create}
        </Button>
      </DialogFooter>
    </form>
  );
}
