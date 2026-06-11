import { useListProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useListCategories, useGetRecipe, useSetRecipe, useListIngredients, getListProductsQueryKey, getGetRecipeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Plus, Package, Search, MoreHorizontal, Pencil, Trash2, ChefHat, Check, ImageIcon, X, Star, Upload, Loader2, LayoutGrid, Rows3, Camera } from "lucide-react";
import { ScanQR } from "@/components/scan-qr";
import { useUpload } from "@workspace/object-storage-web";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/components/confirm-provider";
import type { Product, RecipeItem } from "@workspace/api-client-react";
import { ProductType } from "@workspace/api-client-react";
import { useStoreId } from "@/lib/store-context";
import { useT } from "@/lib/i18n-context";
import { useAuth } from "@/lib/auth-context";
import { ImportFromSamplesDialog } from "@/components/import-from-samples";
import { Download } from "lucide-react";

export default function ProductsPage() {
  const t = useT();
  const { storeId } = useStoreId();
  const [search, setSearch] = useState("");
  const [scanSearchOpen, setScanSearchOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "card">(() => {
    if (typeof window === "undefined") return "table";
    return (localStorage.getItem("vcomm-store_products_view") as "table" | "card") || "table";
  });
  const changeViewMode = (m: "table" | "card") => {
    setViewMode(m);
    if (typeof window !== "undefined") localStorage.setItem("vcomm-store_products_view", m);
  };
  
  const { data: products = [], isLoading } = useListProducts({
    storeId: storeId === 'all' ? undefined : storeId,
    q: search || undefined,
    type: typeFilter === 'all' ? undefined : typeFilter as ProductType
  });
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [recipeProduct, setRecipeProduct] = useState<Product | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const { user } = useAuth();
  const isOwnerScope = user?.role === "owner" || user?.role === "manager";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">{t.products.title}</h1>
          <p className="text-muted-foreground mt-1">{t.products.subtitle}</p>
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
              <Plus className="w-4 h-4 mr-2" /> {t.products.addProduct}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl sm:max-w-[70vw] sm:w-[70vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t.products.addProductTitle}</DialogTitle>
            </DialogHeader>
            <ProductForm onSuccess={() => setIsCreateOpen(false)} />
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {isOwnerScope && (
        <ImportFromSamplesDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          kind="products"
          invalidateKeys={[getListProductsQueryKey()]}
        />
      )}

      <div className="bg-card rounded-xl border border-card-border shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3 bg-muted/20">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t.products.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-10"
              data-testid="input-product-search"
            />
            <button
              type="button"
              onClick={() => setScanSearchOpen(true)}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-7 h-7 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
              aria-label={t.stockReceipts.scanWithCamera}
              title={t.stockReceipts.scanWithCamera}
              data-testid="button-scan-product-search"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <ScanQR
            open={scanSearchOpen}
            onClose={() => setScanSearchOpen(false)}
            onResult={(text) => setSearch(text.trim())}
            autoConfirm
          />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t.products.productType} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.common.all}</SelectItem>
              <SelectItem value={ProductType.beverage}>{t.products.beverage}</SelectItem>
              <SelectItem value={ProductType.grocery}>{t.products.grocery}</SelectItem>
              <SelectItem value={ProductType.service}>{t.products.service}</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1 ml-auto border rounded-md p-0.5 bg-background">
            <Button
              type="button"
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              className="h-8 px-2"
              onClick={() => changeViewMode("table")}
              title={t.products.viewTable}
              data-testid="button-view-table"
            >
              <Rows3 className="w-4 h-4" />
              <span className="hidden md:inline ml-1.5">{t.products.viewTable}</span>
            </Button>
            <Button
              type="button"
              variant={viewMode === "card" ? "default" : "ghost"}
              size="sm"
              className="h-8 px-2"
              onClick={() => changeViewMode("card")}
              title={t.products.viewCard}
              data-testid="button-view-card"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden md:inline ml-1.5">{t.products.viewCard}</span>
            </Button>
          </div>
        </div>

        {viewMode === "card" ? (
          <div className="p-4">
            {isLoading ? (
              <div className="h-32 flex items-center justify-center text-muted-foreground">{t.common.loading}</div>
            ) : products.length === 0 ? (
              <div className="h-32 flex items-center justify-center text-muted-foreground">{t.products.noProducts}</div>
            ) : (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="group border border-card-border rounded-lg overflow-hidden bg-card hover-elevate flex flex-col"
                    data-testid={`card-product-${product.id}`}
                  >
                    <div className="aspect-square bg-muted relative overflow-hidden">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <Package className="w-10 h-10 opacity-40" />
                        </div>
                      )}
                      <div className="absolute top-1.5 right-1.5 flex gap-1">
                        {product.type === ProductType.beverage && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-5 bg-primary/10 text-primary border-primary/30 backdrop-blur">
                            {t.products.beverageShort}
                          </Badge>
                        )}
                        {product.type === ProductType.service && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-5 bg-orange-500/10 text-orange-600 border-orange-500/30 backdrop-blur">
                            {t.products.serviceBadge}
                          </Badge>
                        )}
                        {!product.isActive && (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0 h-5 backdrop-blur">
                            {t.products.inactive}
                          </Badge>
                        )}
                      </div>
                      <div className="absolute top-1.5 left-1.5 opacity-0 group-hover:opacity-100 transition">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="secondary" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem onClick={() => setEditingProduct(product)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              {t.common.edit}
                            </DropdownMenuItem>
                            {product.type === ProductType.beverage && (
                              <DropdownMenuItem onClick={() => setRecipeProduct(product)}>
                                <ChefHat className="mr-2 h-4 w-4" />
                                {t.products.recipe}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DeleteProductItem id={product.id} />
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <div className="p-3 flex flex-col gap-1 flex-1">
                      <div className="font-medium text-sm line-clamp-2 leading-tight" title={product.name}>
                        {product.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {product.sku || t.products.noSku}
                        {product.categoryName ? ` · ${product.categoryName}` : ""}
                      </div>
                      <div className="mt-auto flex items-baseline justify-between pt-1.5">
                        <span className="font-bold text-primary text-sm">{formatCurrency(product.price)}</span>
                        <span className="text-[11px] text-muted-foreground">{formatCurrency(product.cost)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.products.title}</TableHead>
                <TableHead>{t.products.category}</TableHead>
                <TableHead className="text-right">{t.products.sellingPrice}</TableHead>
                <TableHead className="text-right">{t.products.costPrice}</TableHead>
                <TableHead className="text-center">{t.products.status}</TableHead>
                <TableHead className="w-[120px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">{t.common.loading}</TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    {t.products.noProducts}
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-muted border overflow-hidden shrink-0 flex items-center justify-center text-muted-foreground">
                          {product.imageUrl ? <img src={product.imageUrl} className="w-full h-full object-cover" alt="" /> : <Package className="w-5 h-5 opacity-50" />}
                        </div>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {product.name}
                            {product.type === ProductType.beverage && <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-primary/5 text-primary border-primary/20">{t.products.beverageShort}</Badge>}
                            {product.type === ProductType.service && <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-orange-500/10 text-orange-600 border-orange-500/20">{t.products.serviceBadge}</Badge>}
                          </div>
                          <div className="text-xs text-muted-foreground">{product.sku || t.products.noSku}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{product.categoryName || "—"}</TableCell>
                    <TableCell className="text-right font-bold text-primary">{formatCurrency(product.price)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatCurrency(product.cost)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={product.isActive ? "default" : "secondary"} className={product.isActive ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20" : ""}>
                        {product.isActive ? t.products.active : t.products.inactive}
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
                          <DropdownMenuItem onClick={() => setEditingProduct(product)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            {t.common.edit}
                          </DropdownMenuItem>
                          {product.type === ProductType.beverage && (
                            <DropdownMenuItem onClick={() => setRecipeProduct(product)}>
                              <ChefHat className="mr-2 h-4 w-4" />
                              {t.products.recipe}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DeleteProductItem id={product.id} />
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
        <DialogContent className="max-w-xl sm:max-w-[70vw] sm:w-[70vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.products.editProduct}</DialogTitle>
          </DialogHeader>
          {editingProduct && (
            <ProductForm product={editingProduct} onSuccess={() => setEditingProduct(null)} />
          )}
        </DialogContent>
      </Dialog>

      {/* Recipe Dialog */}
      <Dialog open={!!recipeProduct} onOpenChange={(open) => !open && setRecipeProduct(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t.products.recipeTitle}: {recipeProduct?.name}</DialogTitle>
          </DialogHeader>
          {recipeProduct && (
            <RecipeForm productId={recipeProduct.id} onSuccess={() => setRecipeProduct(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DeleteProductItem({ id }: { id: string }) {
  const t = useT();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const deleteProduct = useDeleteProduct();

  const handleDelete = async () => {
    const ok = await confirm({
      title: t.products.deleteProductConfirm,
      description: t.products.deleteHint,
      confirmText: t.products.deleteProduct,
      variant: "destructive",
    });
    if (!ok) return;
    deleteProduct.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.setQueriesData<Product[]>(
            { queryKey: getListProductsQueryKey() },
            (old) => (Array.isArray(old) ? old.filter((p) => p.id !== id) : old),
          );
          queryClient.invalidateQueries({
            queryKey: getListProductsQueryKey(),
            refetchType: "all",
          });
          toast({ title: t.common.deleted, description: t.products.productDeleted });
        },
        onError: (err: unknown) => {
          const e = err as { response?: { data?: { error?: string } }; message?: string };
          const description = e?.response?.data?.error ?? e?.message ?? t.products.cannotDelete;
          toast({ title: t.products.cannotDelete, description, variant: "destructive" });
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

function ProductForm({ product, onSuccess }: { product?: Product, onSuccess: () => void }) {
  const t = useT();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const { data: categories = [] } = useListCategories();
  
  const [name, setName] = useState(product?.name || "");
  const [type, setType] = useState<ProductType>(product?.type || ProductType.grocery);
  const [categoryId, setCategoryId] = useState(product?.categoryId || "none");
  const [price, setPrice] = useState(product?.price.toString() || "");
  const [cost, setCost] = useState(product?.cost.toString() || "");
  const [sku, setSku] = useState(product?.sku || "");
  const [scanSkuOpen, setScanSkuOpen] = useState(false);
  const [purchaseUnit, setPurchaseUnit] = useState(product?.purchaseUnit || "thùng");
  const [sellUnit, setSellUnit] = useState(product?.sellUnit || "ly");
  const [conversionRate, setConversionRate] = useState<string>(
    product?.conversionRate ? String(product.conversionRate) : "1",
  );
  const [shelfLifeDays, setShelfLifeDays] = useState(
    product?.shelfLifeDays != null ? String(product.shelfLifeDays) : "",
  );
  const [isActive, setIsActive] = useState(product ? product.isActive : true);
  const [description, setDescription] = useState(product?.description ?? "");
  const initialImages = (() => {
    if (!product) return [] as string[];
    const list = (product as Product & { images?: string[] }).images ?? [];
    if (list.length > 0) return list.slice(0, 5);
    return product.imageUrl ? [product.imageUrl] : [];
  })();
  const [images, setImages] = useState<string[]>(initialImages);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { uploadFile } = useUpload();

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const remainingSlots = 5 - images.length;
    if (remainingSlots <= 0) {
      toast({ title: t.products.maxImages, description: t.products.maxImagesExceeded, variant: "destructive" });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const accepted = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      toast({ title: t.products.maxImagesExceeded, description: t.products.maxImages, variant: "destructive" });
    }

    const oversize = accepted.find((f) => f.size > 5 * 1024 * 1024);
    if (oversize) {
      toast({ title: t.products.imageTooLarge, description: oversize.name, variant: "destructive" });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const notImage = accepted.find((f) => !f.type.startsWith("image/"));
    if (notImage) {
      toast({ title: t.products.invalidFile, description: notImage.name, variant: "destructive" });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of accepted) {
        const res = await uploadFile(file);
        if (!res) {
          toast({ title: t.products.uploadFailed, description: file.name, variant: "destructive" });
          continue;
        }
        const url = `/api/storage${res.objectPath}`;
        uploaded.push(url);
      }
      if (uploaded.length > 0) {
        setImages((prev) => {
          const merged = [...prev];
          for (const u of uploaded) {
            if (!merged.includes(u) && merged.length < 5) merged.push(u);
          }
          return merged;
        });
        toast({ title: t.products.imageUploaded, description: `${uploaded.length}` });
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

  const isPending = createProduct.isPending || updateProduct.isPending;

  const filteredCategories = categories;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price || !cost) {
      toast({ title: t.common.error, description: t.products.requiredFields, variant: "destructive" });
      return;
    }

    const trimmedShelfLife = shelfLifeDays.trim();
    const parsedShelfLife = trimmedShelfLife === "" ? null : Number(trimmedShelfLife);
    const payload = {
      name,
      type,
      categoryId: categoryId === "none" ? null : categoryId,
      price: Number(price),
      cost: Number(cost),
      sku: sku || null,
      purchaseUnit,
      sellUnit,
      conversionRate: Math.max(Number(conversionRate) || 1, 0.0001),
      shelfLifeDays:
        type === ProductType.grocery && parsedShelfLife !== null && Number.isFinite(parsedShelfLife) && parsedShelfLife >= 0
          ? Math.floor(parsedShelfLife)
          : null,
      isActive,
      images,
      imageUrl: images[0] ?? null,
      description: description.trim() ? description.trim() : null,
    };

    if (product) {
      const { type: _type, ...updatePayload } = payload;
      updateProduct.mutate(
        { id: product.id, data: updatePayload },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
            toast({ title: t.common.success, description: t.products.productUpdated });
            onSuccess();
          },
          onError: (err: any) => toast({ title: t.common.error, description: err.message, variant: "destructive" })
        }
      );
    } else {
      createProduct.mutate(
        { data: payload as any },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
            toast({ title: t.common.success, description: t.products.productCreated });
            onSuccess();
          },
          onError: (err: any) => toast({ title: t.common.error, description: err.message, variant: "destructive" })
        }
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t.products.productName} <span className="text-destructive">*</span></Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Cà phê sữa đá" />
        </div>
        <div className="space-y-2">
          <Label>{t.products.sku}</Label>
          <div className="flex gap-2">
            <Input
              value={sku}
              onChange={e => setSku(e.target.value)}
              placeholder="CFS01"
              data-testid="input-product-sku"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setScanSkuOpen(true)}
              aria-label={t.stockReceipts.scanWithCamera}
              title={t.stockReceipts.scanWithCamera}
              data-testid="button-scan-product-sku"
            >
              <Camera className="w-4 h-4" />
            </Button>
          </div>
          <ScanQR
            open={scanSkuOpen}
            onClose={() => setScanSkuOpen(false)}
            onResult={(text) => setSku(text.trim())}
            autoConfirm
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t.products.productType}</Label>
          <Select value={type} onValueChange={(v) => { setType(v as ProductType); setCategoryId("none"); }} disabled={!!product}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ProductType.beverage}>{t.products.beverage}</SelectItem>
              <SelectItem value={ProductType.grocery}>{t.products.grocery}</SelectItem>
              <SelectItem value={ProductType.service}>{t.products.service}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t.products.category}</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t.common.noSelection}</SelectItem>
              {filteredCategories.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t.products.sellingPrice} (VNĐ) <span className="text-destructive">*</span></Label>
          <Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="29000" />
        </div>
        <div className="space-y-2">
          <Label>{t.products.costPrice} (VNĐ) <span className="text-destructive">*</span></Label>
          <Input type="number" value={cost} onChange={e => setCost(e.target.value)} placeholder="15000" />
          {type === ProductType.beverage && <p className="text-[10px] text-muted-foreground">{t.products.autoUpdateCost}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t.products.purchaseUnit}</Label>
          <Input
            value={purchaseUnit}
            onChange={(e) => setPurchaseUnit(e.target.value)}
            placeholder="thùng, kg..."
            data-testid="input-product-purchase-unit"
          />
          <p className="text-[10px] text-muted-foreground">{t.products.purchaseUnitHint}</p>
        </div>
        <div className="space-y-2">
          <Label>{t.products.sellUnit}</Label>
          <Input
            value={sellUnit}
            onChange={(e) => setSellUnit(e.target.value)}
            placeholder="ly, chai, gói..."
            data-testid="input-product-sell-unit"
          />
          <p className="text-[10px] text-muted-foreground">{t.products.sellUnitHint}</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t.products.conversionRate}</Label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            1 {purchaseUnit || t.products.purchaseUnit} =
          </span>
          <Input
            type="number"
            min={0}
            step="0.01"
            className="w-32"
            value={conversionRate}
            onChange={(e) => setConversionRate(e.target.value)}
            data-testid="input-product-conversion-rate"
          />
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {sellUnit || t.products.sellUnit}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground">{t.products.conversionRateHint}</p>
      </div>

      {type === ProductType.grocery && (
        <div className="space-y-2">
          <Label>{t.products.shelfLifeDays}</Label>
          <Input
            type="number"
            min="0"
            max="3650"
            value={shelfLifeDays}
            onChange={(e) => setShelfLifeDays(e.target.value)}
            placeholder={t.products.shelfLifePlaceholder}
            data-testid="input-product-shelf-life"
          />
          <p className="text-[10px] text-muted-foreground">
            {t.products.shelfLifeHint}
          </p>
        </div>
      )}

      <div className="space-y-2 pt-2 border-t">
        <Label htmlFor="product-description">{t.products.description}</Label>
        <Textarea
          id="product-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t.products.description}
          rows={3}
          data-testid="input-product-description"
        />
      </div>

      <div className="space-y-2 pt-2 border-t" data-testid="section-product-images">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-1.5">
            <ImageIcon className="w-4 h-4" /> {t.products.images}
          </Label>
          <span className="text-xs text-muted-foreground">{images.length} / 5</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {t.products.maxImages}
        </p>

        {images.length > 0 && (
          <div className="grid grid-cols-5 gap-2" data-testid="grid-product-images">
            {images.map((src, idx) => (
              <div
                key={src + idx}
                className={`relative group rounded-md overflow-hidden border ${
                  idx === 0 ? "ring-2 ring-primary" : ""
                }`}
                data-testid={`image-thumb-${idx}`}
              >
                <div className="aspect-square bg-muted">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </div>
                {idx === 0 && (
                  <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <Star className="w-3 h-3 fill-current" /> {t.products.cover}
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 flex bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  {idx !== 0 && (
                    <button
                      type="button"
                      onClick={() => setCover(idx)}
                      className="flex-1 text-[10px] py-1 hover:bg-white/10"
                      data-testid={`button-set-cover-${idx}`}
                      title={t.products.setCover}
                    >
                      {t.products.setCover}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="flex-1 text-[10px] py-1 hover:bg-red-500/40 flex items-center justify-center gap-0.5"
                    data-testid={`button-remove-image-${idx}`}
                    title={t.common.delete}
                  >
                    <X className="w-3 h-3" /> {t.common.delete}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {images.length < 5 && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFilesSelected}
              data-testid="input-product-image-file"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full"
              data-testid="button-upload-image"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t.products.uploading}
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" /> {t.products.uploadImage} ({images.length}/5)
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {product && (
        <div className="flex items-center space-x-2 pt-2 border-t mt-4">
          <input type="checkbox" id="isActive" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4 rounded border-gray-300" />
          <Label htmlFor="isActive" className="font-normal cursor-pointer">{t.products.isActiveLabel}</Label>
        </div>
      )}

      <DialogFooter className="pt-4">
        <Button type="button" variant="outline" onClick={onSuccess}>{t.common.cancel}</Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? t.common.processing : product ? t.common.update : t.common.create}
        </Button>
      </DialogFooter>
    </form>
  );
}

function RecipeForm({ productId, onSuccess }: { productId: string, onSuccess: () => void }) {
  const t = useT();
  const { data: recipe, isLoading: recipeLoading } = useGetRecipe(productId, { query: { enabled: !!productId, queryKey: getGetRecipeQueryKey(productId) }});
  const { data: ingredients = [], isLoading: ingredientsLoading } = useListIngredients();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const setRecipe = useSetRecipe();
  
  const [items, setItems] = useState<{ingredientId: string, quantity: number, tempId: number}[]>([]);
  const [initDone, setInitDone] = useState(false);

  if (!initDone && recipe) {
    setItems(recipe.items.map((r, i) => ({ ingredientId: r.ingredientId, quantity: r.quantity, tempId: i })));
    setInitDone(true);
  }

  const handleSave = () => {
    // Filter out invalid items
    const validItems = items.filter(i => i.ingredientId && i.quantity > 0).map(i => ({ ingredientId: i.ingredientId, quantity: i.quantity }));
    
    setRecipe.mutate(
      { productId, data: { items: validItems } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetRecipeQueryKey(productId) });
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() }); // Cost updates
          toast({ title: t.common.success, description: t.products.recipeCostUpdated });
          onSuccess();
        },
        onError: (err: any) => toast({ title: t.common.error, description: err.message, variant: "destructive" })
      }
    );
  };

  if (recipeLoading || ingredientsLoading) return <div className="py-8 text-center">{t.common.loading}</div>;

  const totalCost = items.reduce((sum, item) => {
    const ing = ingredients.find(i => i.id === item.ingredientId);
    return sum + (ing ? ing.cost * item.quantity : 0);
  }, 0);

  return (
    <div className="space-y-4">
      <div className="bg-muted/30 p-4 rounded-xl border border-border">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium flex items-center"><ChefHat className="w-4 h-4 mr-2"/> {t.products.ingredientName}</h3>
          <Button size="sm" variant="outline" onClick={() => setItems([...items, { ingredientId: "", quantity: 0, tempId: Date.now() }])}>
            <Plus className="w-4 h-4 mr-2" /> {t.products.addIngredient}
          </Button>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm border border-dashed rounded-lg">{t.common.noData}</div>
        ) : (
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={item.tempId} className="flex items-center gap-2">
                <Select value={item.ingredientId} onValueChange={(v) => {
                  const newItems = [...items];
                  newItems[idx].ingredientId = v;
                  setItems(newItems);
                }}>
                  <SelectTrigger className="flex-1 bg-background">
                    <SelectValue placeholder={t.products.selectIngredient} />
                  </SelectTrigger>
                  <SelectContent>
                    {ingredients.map(ing => (
                      <SelectItem key={ing.id} value={ing.id}>{ing.name} ({ing.unit}) - {formatCurrency(ing.cost)}/{ing.unit}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="w-[120px]">
                  <Input 
                    type="number" 
                    placeholder={t.products.amount} 
                    value={item.quantity || ""} 
                    onChange={e => {
                      const newItems = [...items];
                      newItems[idx].quantity = Number(e.target.value);
                      setItems(newItems);
                    }}
                    className="bg-background"
                  />
                </div>
                
                <div className="w-[100px] text-right text-sm text-muted-foreground flex items-center justify-end gap-2">
                  <span>
                    {(() => {
                      const ing = ingredients.find(i => i.id === item.ingredientId);
                      return ing ? formatCurrency(ing.cost * item.quantity) : "0đ";
                    })()}
                  </span>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setItems(items.filter((_, i) => i !== idx))}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 pt-4 border-t flex justify-between items-center">
          <span className="font-medium text-muted-foreground">{t.products.costPrice}</span>
          <span className="font-bold text-lg text-primary">{formatCurrency(totalCost)}</span>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onSuccess}>{t.common.cancel}</Button>
        <Button onClick={handleSave} disabled={setRecipe.isPending}>
          {setRecipe.isPending ? t.common.processing : t.products.saveRecipe}
        </Button>
      </DialogFooter>
    </div>
  );
}
