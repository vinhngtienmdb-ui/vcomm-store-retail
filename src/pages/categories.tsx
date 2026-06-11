import { useListCategories, useCreateCategory, useDeleteCategory, getListCategoriesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, List, Grid } from "lucide-react";
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
import { CategoryKind } from "@workspace/api-client-react";
import { useT } from "@/lib/i18n-context";
import { useAuth } from "@/lib/auth-context";
import { ImportFromSamplesDialog } from "@/components/import-from-samples";
import { Download } from "lucide-react";

export default function CategoriesPage() {
  const { data: categories = [], isLoading } = useListCategories();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const t = useT();
  const { user } = useAuth();
  const isOwnerScope = user?.role === "owner" || user?.role === "manager";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">{t.categories.title}</h1>
          <p className="text-muted-foreground mt-1">{t.categories.subtitle}</p>
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
              <Plus className="w-4 h-4 mr-2" /> {t.categories.addCategory}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.categories.addCategoryTitle}</DialogTitle>
            </DialogHeader>
            <CategoryForm onSuccess={() => setIsCreateOpen(false)} />
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {isOwnerScope && (
        <ImportFromSamplesDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          kind="categories"
          invalidateKeys={[getListCategoriesQueryKey()]}
        />
      )}

      <div className="bg-card rounded-xl border border-card-border shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.categories.categoryName}</TableHead>
                <TableHead>{t.categories.categoryType}</TableHead>
                <TableHead className="text-right">{t.categories.productCount}</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">{t.common.loading}</TableCell>
                </TableRow>
              ) : categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                    {t.categories.noCategories}
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {cat.kind === CategoryKind.beverage ? <List className="w-4 h-4 text-primary" /> : <Grid className="w-4 h-4 text-emerald-600" />}
                        {cat.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal text-xs">
                        {cat.kind === CategoryKind.beverage ? t.categories.beverage : t.categories.grocery}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{cat.productCount}</TableCell>
                    <TableCell className="text-right">
                      <DeleteCategoryBtn id={cat.id} productCount={cat.productCount} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function DeleteCategoryBtn({ id, productCount }: { id: string, productCount: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const deleteCategory = useDeleteCategory();
  const t = useT();

  const handleDelete = async () => {
    if (productCount > 0) {
      toast({ title: t.categories.cannotDelete, description: t.categories.categoryHasProducts, variant: "destructive" });
      return;
    }
    const ok = await confirm({
      title: t.categories.deleteCategory,
      description: t.categories.deleteCategoryDesc,
      confirmText: t.categories.deleteCategoryBtn,
      variant: "destructive",
    });
    if (!ok) return;
    deleteCategory.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
          toast({ title: t.common.deleted, description: t.categories.categoryDeleted });
        },
      },
    );
  };

  return (
    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={handleDelete} disabled={productCount > 0}>
      <Trash2 className="w-4 h-4" />
    </Button>
  );
}

function CategoryForm({ onSuccess }: { onSuccess: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createCategory = useCreateCategory();
  const t = useT();
  
  const [name, setName] = useState("");
  const [kind, setKind] = useState<CategoryKind>(CategoryKind.beverage);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: t.common.error, description: t.categories.nameEmpty, variant: "destructive" });
      return;
    }

    createCategory.mutate(
      { data: { name, kind } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
          toast({ title: t.common.success, description: t.categories.categoryCreated });
          onSuccess();
        },
        onError: (err: any) => {
          toast({ title: t.common.error, description: err.message, variant: "destructive" });
        }
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>{t.categories.categoryName} <span className="text-destructive">*</span></Label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder={t.categories.categoryNamePlaceholder} />
      </div>
      <div className="space-y-2">
        <Label>{t.categories.categoryType}</Label>
        <Select value={kind} onValueChange={(v) => setKind(v as CategoryKind)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={CategoryKind.beverage}>{t.categories.beverage}</SelectItem>
            <SelectItem value={CategoryKind.grocery}>{t.categories.grocery}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DialogFooter className="pt-4">
        <Button type="button" variant="outline" onClick={onSuccess}>{t.common.cancel}</Button>
        <Button type="submit" disabled={createCategory.isPending}>{t.common.create}</Button>
      </DialogFooter>
    </form>
  );
}
