import {
  useListSuppliers,
  useCreateSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
  getListSuppliersQueryKey,
  useListStores,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/components/confirm-provider";
import { useStoreId } from "@/lib/store-context";
import { useT } from "@/lib/i18n-context";
import { useAuth } from "@/lib/auth-context";
import { ImportFromSamplesDialog } from "@/components/import-from-samples";
import { Download } from "lucide-react";

type Supplier = {
  id: string;
  storeId: string;
  storeName: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  taxCode: string;
  note: string;
  isActive: boolean;
};

export default function SuppliersPage() {
  const t = useT();
  const { storeId } = useStoreId();
  const filterStoreId = storeId && storeId !== "all" ? storeId : undefined;
  const { data: suppliers = [], isLoading } = useListSuppliers(
    filterStoreId ? { storeId: filterStoreId } : undefined,
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const { user } = useAuth();
  const isOwnerScope = user?.role === "owner" || user?.role === "manager";
  const [editing, setEditing] = useState<Supplier | null>(null);

  const list = useMemo(() => suppliers as unknown as Supplier[], [suppliers]);
  const { data: stores = [] } = useListStores();
  const activeStores = stores.filter((s) => s.isActive);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">{t.suppliers.title}</h1>
          <p className="text-muted-foreground mt-1">
            {t.suppliers.subtitle}
          </p>
        </div>
        <div className="flex gap-2">
        {isOwnerScope && (
          <Button
            variant="outline"
            onClick={() => setImportOpen(true)}
            disabled={activeStores.length === 0}
            data-testid="button-import-samples"
          >
            <Download className="w-4 h-4 mr-2" /> {t.samples.importFromSystem}
          </Button>
        )}
        <Button
          onClick={() => setCreateOpen(true)}
          disabled={activeStores.length === 0}
          data-testid="button-create-supplier"
        >
          <Plus className="w-4 h-4 mr-2" /> {t.suppliers.addSupplier}
        </Button>
        </div>
      </div>

      {isOwnerScope && (
        <ImportFromSamplesDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          kind="suppliers"
          stores={activeStores.map((s) => ({ id: s.id, name: s.name }))}
          invalidateKeys={[getListSuppliersQueryKey()]}
        />
      )}

      <div className="bg-card rounded-xl border border-card-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.suppliers.supplierName}</TableHead>
                <TableHead>{t.expenses.store}</TableHead>
                <TableHead>{t.suppliers.contactPerson}</TableHead>
                <TableHead>{t.suppliers.phone}</TableHead>
                <TableHead>{t.suppliers.email}</TableHead>
                <TableHead>Mã số thuế</TableHead>
                <TableHead>{t.shifts.status}</TableHead>
                <TableHead className="w-[120px] text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    {t.common.loading}
                  </TableCell>
                </TableRow>
              ) : list.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    {t.suppliers.noSuppliers}
                  </TableCell>
                </TableRow>
              ) : (
                list.map((s) => (
                  <TableRow key={s.id} data-testid={`row-supplier-${s.id}`}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-muted-foreground">{s.storeName}</TableCell>
                    <TableCell>{s.contactName || "—"}</TableCell>
                    <TableCell>{s.phone || "—"}</TableCell>
                    <TableCell>{s.email || "—"}</TableCell>
                    <TableCell>{s.taxCode || "—"}</TableCell>
                    <TableCell>
                      {s.isActive ? (
                        <Badge variant="secondary">Hoạt động</Badge>
                      ) : (
                        <Badge variant="outline">Tắt</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditing(s)}
                          data-testid={`button-edit-supplier-${s.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <DeleteSupplierBtn id={s.id} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.suppliers.addSupplierTitle}</DialogTitle>
          </DialogHeader>
          <SupplierForm onSuccess={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.suppliers.editSupplier}</DialogTitle>
          </DialogHeader>
          {editing && <SupplierForm initial={editing} onSuccess={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DeleteSupplierBtn({ id }: { id: string }) {
  const t = useT();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const del = useDeleteSupplier();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-destructive hover:bg-destructive/10"
      onClick={async () => {
        const ok = await confirm({
          title: t.suppliers.deleteSupplier,
          description: t.suppliers.deleteSupplierDesc,
          confirmText: t.common.delete,
          variant: "destructive",
        });
        if (!ok) return;
        del.mutate(
          { id },
          {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: getListSuppliersQueryKey() });
              toast({ title: t.common.deleted });
            },
            onError: (e: any) =>
              toast({ title: t.common.error, description: e.message, variant: "destructive" }),
          },
        );
      }}
    >
      <Trash2 className="w-4 h-4" />
    </Button>
  );
}

function SupplierForm({
  initial,
  onSuccess,
}: {
  initial?: Supplier;
  onSuccess: () => void;
}) {
  const t = useT();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { storeId } = useStoreId();
  const { data: stores = [] } = useListStores();
  const create = useCreateSupplier();
  const update = useUpdateSupplier();
  const activeStores = stores.filter((s) => s.isActive);
  const initialStoreId =
    initial?.storeId ?? (storeId !== "all" ? storeId : activeStores[0]?.id ?? "");

  const [selectedStore, setSelectedStore] = useState(initialStoreId);
  const [name, setName] = useState(initial?.name ?? "");
  const [contactName, setContactName] = useState(initial?.contactName ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [taxCode, setTaxCode] = useState(initial?.taxCode ?? "");
  const [note, setNote] = useState(initial?.note ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: t.common.error, description: "Tên nhà cung cấp bắt buộc", variant: "destructive" });
      return;
    }
    const payload = { name, contactName, phone, email, address, taxCode, note };
    if (initial) {
      update.mutate(
        { id: initial.id, data: payload },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListSuppliersQueryKey() });
            toast({ title: t.suppliers.supplierUpdated });
            onSuccess();
          },
          onError: (e: any) =>
            toast({ title: t.common.error, description: e.message, variant: "destructive" }),
        },
      );
    } else {
      if (!selectedStore) {
        toast({ title: t.common.error, description: "Chọn cửa hàng", variant: "destructive" });
        return;
      }
      create.mutate(
        { data: { storeId: selectedStore, ...payload } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListSuppliersQueryKey() });
            toast({ title: t.suppliers.supplierCreated });
            onSuccess();
          },
          onError: (e: any) =>
            toast({ title: t.common.error, description: e.message, variant: "destructive" }),
        },
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!initial && (
        <div className="space-y-2">
          <Label>{t.expenses.store} <span className="text-destructive">*</span></Label>
          <select
            className="w-full border rounded-md h-10 px-3 bg-background"
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            data-testid="select-supplier-store"
          >
            {activeStores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2 col-span-2">
          <Label>{t.suppliers.supplierName} <span className="text-destructive">*</span></Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            data-testid="input-supplier-name"
          />
        </div>
        <div className="space-y-2">
          <Label>{t.suppliers.contactPerson}</Label>
          <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{t.suppliers.phone}</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{t.suppliers.email}</Label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Mã số thuế</Label>
          <Input value={taxCode} onChange={(e) => setTaxCode(e.target.value)} />
        </div>
        <div className="space-y-2 col-span-2">
          <Label>{t.suppliers.address}</Label>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div className="space-y-2 col-span-2">
          <Label>Ghi chú</Label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
        </div>
      </div>
      <DialogFooter className="pt-2">
        <Button type="button" variant="outline" onClick={onSuccess}>
          {t.common.cancel}
        </Button>
        <Button
          type="submit"
          disabled={create.isPending || update.isPending}
          data-testid="button-submit-supplier"
        >
          {initial ? t.common.save : t.common.create}
        </Button>
      </DialogFooter>
    </form>
  );
}
