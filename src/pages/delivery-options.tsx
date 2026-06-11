import { useState, useEffect, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListStores,
  useListDeliveryOptions,
  useCreateDeliveryOption,
  useUpdateDeliveryOption,
  useDeleteDeliveryOption,
  getListDeliveryOptionsQueryKey,
  type DeliveryOption,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Pencil, Trash2, Truck } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { useT } from "@/lib/i18n-context";

export default function DeliveryOptionsPage() {
  const t = useT();
  const { user: me } = useAuth();
  const { toast } = useToast();
  const confirm = useConfirm();
  const qc = useQueryClient();

  const { data: stores = [] } = useListStores();
  const { data: options = [], isLoading } = useListDeliveryOptions();

  const createMut = useCreateDeliveryOption();
  const updateMut = useUpdateDeliveryOption();
  const deleteMut = useDeleteDeliveryOption();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DeliveryOption | null>(null);

  const [storeId, setStoreId] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [fee, setFee] = useState("0");
  const [requiresAddress, setRequiresAddress] = useState(false);
  const [sortOrder, setSortOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setStoreId(editing.storeId);
      setLabel(editing.label);
      setDescription(editing.description ?? "");
      setFee(String(editing.fee));
      setRequiresAddress(editing.requiresAddress);
      setSortOrder(String(editing.sortOrder));
      setIsActive(editing.isActive);
    } else {
      setStoreId(stores[0]?.id ?? "");
      setLabel("");
      setDescription("");
      setFee("0");
      setRequiresAddress(false);
      setSortOrder("0");
      setIsActive(true);
    }
  }, [open, editing, stores]);

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

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getListDeliveryOptionsQueryKey() });
  };

  const onError = (err: unknown) =>
    toast({
      variant: "destructive",
      title: t.common.error,
      description: err instanceof Error ? err.message : String(err),
    });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!storeId) {
      toast({ variant: "destructive", title: t.deliveryOptions.selectStore });
      return;
    }
    const feeNum = Math.max(0, Math.round(Number(fee) || 0));
    const sortNum = Math.round(Number(sortOrder) || 0);
    const desc = description.trim() ? description.trim() : null;

    if (editing) {
      updateMut.mutate(
        {
          id: editing.id,
          data: {
            label: label.trim(),
            description: desc,
            fee: feeNum,
            requiresAddress,
            sortOrder: sortNum,
            isActive,
          },
        },
        {
          onSuccess: () => {
            invalidate();
            toast({ title: t.deliveryOptions.updated });
            setOpen(false);
          },
          onError,
        },
      );
    } else {
      createMut.mutate(
        {
          data: {
            storeId,
            label: label.trim(),
            description: desc,
            fee: feeNum,
            requiresAddress,
            sortOrder: sortNum,
            isActive,
          },
        },
        {
          onSuccess: () => {
            invalidate();
            toast({ title: t.deliveryOptions.created });
            setOpen(false);
          },
          onError,
        },
      );
    }
  };

  const handleDelete = async (row: DeliveryOption) => {
    const ok = await confirm({
      title: t.deliveryOptions.confirmDelete,
      description: row.label,
      variant: "destructive",
    });
    if (!ok) return;
    deleteMut.mutate(
      { id: row.id },
      {
        onSuccess: () => {
          invalidate();
          toast({ title: t.deliveryOptions.deleted });
        },
        onError,
      },
    );
  };

  return (
    <div className="p-6 space-y-6" data-testid="page-delivery-options">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" />
            {t.deliveryOptions.title}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t.deliveryOptions.subtitle}
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
          data-testid="button-add-delivery-option"
        >
          <Plus className="mr-2 h-4 w-4" />
          {t.deliveryOptions.addOption}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.deliveryOptions.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.deliveryOptions.store}</TableHead>
                <TableHead>{t.deliveryOptions.label}</TableHead>
                <TableHead>{t.deliveryOptions.fee}</TableHead>
                <TableHead>{t.deliveryOptions.requiresAddress}</TableHead>
                <TableHead>{t.deliveryOptions.sortOrder}</TableHead>
                <TableHead>{t.deliveryOptions.status}</TableHead>
                <TableHead className="text-right">{t.inventory.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                    {t.common.loading}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && options.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                    {t.deliveryOptions.empty}
                  </TableCell>
                </TableRow>
              )}
              {options.map((o) => (
                <TableRow key={o.id} data-testid={`row-delivery-option-${o.id}`}>
                  <TableCell className="font-medium">{o.storeName}</TableCell>
                  <TableCell>
                    <div className="font-medium">{o.label}</div>
                    {o.description && (
                      <div className="text-xs text-muted-foreground">{o.description}</div>
                    )}
                  </TableCell>
                  <TableCell>{formatCurrency(o.fee)}</TableCell>
                  <TableCell>
                    {o.requiresAddress ? (
                      <Badge variant="secondary">{t.deliveryOptions.yes}</Badge>
                    ) : (
                      <Badge variant="outline">{t.deliveryOptions.no}</Badge>
                    )}
                  </TableCell>
                  <TableCell>{o.sortOrder}</TableCell>
                  <TableCell>
                    {o.isActive ? (
                      <Badge variant="secondary">{t.deliveryOptions.active}</Badge>
                    ) : (
                      <Badge variant="destructive">{t.deliveryOptions.inactive}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditing(o);
                          setOpen(true);
                        }}
                        data-testid={`button-edit-${o.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(o)}
                        data-testid={`button-delete-${o.id}`}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? t.deliveryOptions.editOption : t.deliveryOptions.addOption}
            </DialogTitle>
            <DialogDescription>{t.deliveryOptions.subtitle}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4" data-testid="form-delivery-option">
            <div className="space-y-2">
              <Label>{t.deliveryOptions.store}</Label>
              <Select
                value={storeId}
                onValueChange={setStoreId}
                disabled={!!editing}
              >
                <SelectTrigger data-testid="select-store">
                  <SelectValue placeholder={t.deliveryOptions.selectStore} />
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
            <div className="space-y-2">
              <Label>{t.deliveryOptions.label}</Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                required
                maxLength={200}
                data-testid="input-label"
              />
            </div>
            <div className="space-y-2">
              <Label>{t.deliveryOptions.description}</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                maxLength={1000}
                data-testid="input-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t.deliveryOptions.fee}</Label>
                <Input
                  type="number"
                  min={0}
                  step={1000}
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  required
                  data-testid="input-fee"
                />
              </div>
              <div className="space-y-2">
                <Label>{t.deliveryOptions.sortOrder}</Label>
                <Input
                  type="number"
                  step={1}
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  data-testid="input-sort"
                />
              </div>
            </div>
            <div className="flex items-start justify-between gap-3 rounded-md border p-3">
              <div>
                <div className="font-medium text-sm">{t.deliveryOptions.requiresAddress}</div>
                <p className="text-xs text-muted-foreground">
                  {t.deliveryOptions.requiresAddressHint}
                </p>
              </div>
              <Switch
                checked={requiresAddress}
                onCheckedChange={setRequiresAddress}
                data-testid="switch-requires-address"
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label className="font-medium text-sm">{t.deliveryOptions.isActive}</Label>
              <Switch
                checked={isActive}
                onCheckedChange={setIsActive}
                data-testid="switch-is-active"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {t.common.cancel}
              </Button>
              <Button
                type="submit"
                disabled={createMut.isPending || updateMut.isPending}
                data-testid="button-submit-delivery-option"
              >
                {editing ? t.common.save : t.deliveryOptions.addOption}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
