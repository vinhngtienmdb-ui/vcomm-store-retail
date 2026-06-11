import { useListIngredients, useCreateIngredient, useUpdateIngredient, useDeleteIngredient, getListIngredientsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Leaf, Search, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/format";
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
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/components/confirm-provider";
import type { Ingredient } from "@workspace/api-client-react";
import { useStoreId } from "@/lib/store-context";
import { useT } from "@/lib/i18n-context";
import { useAuth } from "@/lib/auth-context";
import { ImportFromSamplesDialog } from "@/components/import-from-samples";
import { Download } from "lucide-react";

export default function IngredientsPage() {
  const t = useT();
  const [search, setSearch] = useState("");
  const { storeId } = useStoreId();
  const { data: ingredients = [], isLoading } = useListIngredients({ 
    q: search || undefined,
    storeId: storeId === 'all' ? undefined : storeId 
  });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const { user } = useAuth();
  const isOwnerScope = user?.role === "owner" || user?.role === "manager";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">{t.ingredients.title}</h1>
          <p className="text-muted-foreground mt-1">{t.ingredients.subtitle}</p>
        </div>
        <div className="flex gap-2">
        {isOwnerScope && (
          <Button variant="outline" onClick={() => setImportOpen(true)} data-testid="button-import-samples">
            <Download className="w-4 h-4 mr-2" /> {t.samples.importFromSystem}
          </Button>
        )}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="hover-elevate">
              <Plus className="w-4 h-4 mr-2" /> {t.ingredients.addIngredient}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.ingredients.addIngredientTitle}</DialogTitle>
              <DialogDescription>Định nghĩa tên, đơn vị tính và giá vốn.</DialogDescription>
            </DialogHeader>
            <IngredientForm onSuccess={() => setIsCreateOpen(false)} />
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {isOwnerScope && (
        <ImportFromSamplesDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          kind="ingredients"
          invalidateKeys={[getListIngredientsQueryKey()]}
        />
      )}

      <div className="bg-card rounded-xl border border-card-border shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border flex items-center gap-2 bg-muted/20">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder={t.common.search} 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm h-9 border-none bg-transparent shadow-none focus-visible:ring-0 px-0"
          />
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.ingredients.ingredientName}</TableHead>
                <TableHead>ĐV nhập</TableHead>
                <TableHead>ĐV sử dụng</TableHead>
                <TableHead className="text-right">Quy đổi</TableHead>
                <TableHead className="text-right">Giá vốn (1 ĐV sử dụng)</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">{t.common.loading}</TableCell>
                </TableRow>
              ) : ingredients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    {t.ingredients.noIngredients}
                  </TableCell>
                </TableRow>
              ) : (
                ingredients.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <Leaf className="w-4 h-4" />
                        </div>
                        {item.name}
                      </div>
                    </TableCell>
                    <TableCell>{item.purchaseUnit || item.unit}</TableCell>
                    <TableCell>{item.usageUnit || item.unit}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      1 {item.purchaseUnit || item.unit} = {item.conversionRate ?? 1} {item.usageUnit || item.unit}
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.cost)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingIngredient(item)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            {t.common.edit}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DeleteIngredientItem id={item.id} />
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

      <Dialog open={!!editingIngredient} onOpenChange={(open) => !open && setEditingIngredient(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.ingredients.editIngredient}</DialogTitle>
          </DialogHeader>
          {editingIngredient && (
            <IngredientForm ingredient={editingIngredient} onSuccess={() => setEditingIngredient(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DeleteIngredientItem({ id }: { id: string }) {
  const t = useT();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const deleteIngredient = useDeleteIngredient();

  const handleDelete = async () => {
    const ok = await confirm({
      title: t.ingredients.deleteIngredient,
      description: t.ingredients.deleteIngredientDesc,
      confirmText: t.common.delete,
      variant: "destructive",
    });
    if (!ok) return;
    deleteIngredient.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListIngredientsQueryKey() });
          toast({ title: t.common.deleted, description: t.ingredients.ingredientDeleted });
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

function IngredientForm({ ingredient, onSuccess }: { ingredient?: Ingredient, onSuccess: () => void }) {
  const t = useT();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createIngredient = useCreateIngredient();
  const updateIngredient = useUpdateIngredient();
  
  const [name, setName] = useState(ingredient?.name || "");
  const [unit, setUnit] = useState(ingredient?.unit || "g");
  const [purchaseUnit, setPurchaseUnit] = useState(ingredient?.purchaseUnit || ingredient?.unit || "kg");
  const [usageUnit, setUsageUnit] = useState(ingredient?.usageUnit || ingredient?.unit || "g");
  const [conversionRate, setConversionRate] = useState<string>(
    ingredient?.conversionRate ? String(ingredient.conversionRate) : "1000"
  );
  const [cost, setCost] = useState(ingredient?.cost.toString() || "");

  const isPending = createIngredient.isPending || updateIngredient.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !unit.trim() || !cost || !purchaseUnit.trim() || !usageUnit.trim()) {
      toast({ title: t.common.error, description: "Vui lòng nhập đủ thông tin", variant: "destructive" });
      return;
    }
    const conv = Number(conversionRate);
    if (!conv || conv <= 0) {
      toast({ title: t.common.error, description: "Tỉ lệ quy đổi phải > 0", variant: "destructive" });
      return;
    }

    if (ingredient) {
      updateIngredient.mutate(
        {
          id: ingredient.id,
          data: { name, unit, purchaseUnit, usageUnit, conversionRate: conv, cost: Number(cost) },
        },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListIngredientsQueryKey() });
            toast({ title: t.common.success, description: t.ingredients.ingredientUpdated });
            onSuccess();
          },
          onError: (err: any) => {
            toast({ title: t.common.error, description: err.message, variant: "destructive" });
          }
        }
      );
    } else {
      createIngredient.mutate(
        { data: { name, unit, purchaseUnit, usageUnit, conversionRate: conv, cost: Number(cost) } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListIngredientsQueryKey() });
            toast({ title: t.common.success, description: t.ingredients.ingredientCreated });
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
        <Label htmlFor="name">{t.ingredients.ingredientName} <span className="text-destructive">*</span></Label>
        <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Cà phê hạt Arabica" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="purchaseUnit">Đơn vị nhập <span className="text-destructive">*</span></Label>
          <Input
            id="purchaseUnit"
            value={purchaseUnit}
            onChange={(e) => setPurchaseUnit(e.target.value)}
            placeholder="kg, thùng, lít..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="usageUnit">Đơn vị sử dụng <span className="text-destructive">*</span></Label>
          <Input
            id="usageUnit"
            value={usageUnit}
            onChange={(e) => {
              setUsageUnit(e.target.value);
              setUnit(e.target.value);
            }}
            placeholder="g, ml, pcs..."
          />
        </div>
        <div className="space-y-2 col-span-2">
          <Label htmlFor="conversionRate">
            Tỉ lệ quy đổi (1 {purchaseUnit || "ĐV nhập"} = ? {usageUnit || "ĐV sử dụng"}){" "}
            <span className="text-destructive">*</span>
          </Label>
          <Input
            id="conversionRate"
            type="number"
            min={0}
            step="0.001"
            value={conversionRate}
            onChange={(e) => setConversionRate(e.target.value)}
            placeholder="1000"
          />
        </div>
        <div className="space-y-2 col-span-2">
          <Label htmlFor="cost">
            Giá vốn 1 {usageUnit || "ĐV sử dụng"} (VNĐ){" "}
            <span className="text-destructive">*</span>
          </Label>
          <Input id="cost" type="number" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="150" />
        </div>
      </div>
      <DialogFooter className="pt-4">
        <Button type="button" variant="outline" onClick={onSuccess}>{t.common.cancel}</Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? t.common.loading : ingredient ? t.common.save : t.common.create}
        </Button>
      </DialogFooter>
    </form>
  );
}
