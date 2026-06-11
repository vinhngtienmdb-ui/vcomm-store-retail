import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ImageIcon, Plus, Minus, ShoppingBag } from "lucide-react";
import { useT } from "@/lib/i18n-context";
import { formatCurrency } from "@/lib/format";

export interface ProductDetailLike {
  id?: string;
  name: string;
  description?: string | null;
  images?: string[] | null;
  imageUrl?: string | null;
  price?: number;
  inStock?: boolean;
}

interface Props {
  product: ProductDetailLike | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Số lượng hiện đang có trong giỏ. Khi truyền > 0 sẽ hiển thị stepper. */
  quantityInCart?: number;
  /** Callback thêm vào giỏ (tăng 1). Khi truyền sẽ hiện CTA "Thêm vào giỏ". */
  onAddToCart?: () => void;
  /** Callback giảm 1 trong giỏ. */
  onDecrement?: () => void;
}

function getImages(p: ProductDetailLike): string[] {
  const list = (p.images ?? []).filter((s) => typeof s === "string" && s.length > 0);
  if (list.length > 0) return list;
  if (p.imageUrl) return [p.imageUrl];
  return [];
}

export function ProductDetailDialog({
  product,
  open,
  onOpenChange,
  quantityInCart = 0,
  onAddToCart,
  onDecrement,
}: Props) {
  const t = useT();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (open) setIndex(0);
  }, [open, product?.name]);

  if (!product) return null;
  const images = getImages(product);
  const current = images[index] ?? images[0];
  const hasImages = images.length > 0;
  const hasMany = images.length > 1;
  const inStock = product.inStock !== false;
  const showCart = !!onAddToCart;

  const prev = () => setIndex((i) => (i - 1 + images.length) % images.length);
  const next = () => setIndex((i) => (i + 1) % images.length);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto p-0" data-testid="dialog-product-detail">
        <DialogHeader className="px-5 pt-5">
          <DialogTitle data-testid="text-product-detail-name">{product.name}</DialogTitle>
          {product.description ? (
            <DialogDescription className="sr-only">{product.description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <div className="px-5 pb-5 space-y-3">
          {hasImages ? (
            <div className="relative aspect-square w-full rounded-md overflow-hidden bg-muted">
              <img
                src={current}
                alt={product.name}
                className="w-full h-full object-cover"
                data-testid="img-product-detail-main"
              />
              {hasMany && (
                <>
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full opacity-90"
                    onClick={prev}
                    aria-label="Previous"
                    data-testid="button-product-detail-prev"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full opacity-90"
                    onClick={next}
                    aria-label="Next"
                    data-testid="button-product-detail-next"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                  <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
                    {index + 1} / {images.length}
                  </span>
                </>
              )}
            </div>
          ) : (
            <div className="aspect-square w-full rounded-md bg-muted flex items-center justify-center text-muted-foreground">
              <ImageIcon className="h-10 w-10 opacity-40" />
            </div>
          )}

          {hasMany && (
            <div className="flex gap-2 overflow-x-auto" data-testid="product-detail-thumbnails">
              {images.map((src, i) => (
                <button
                  key={src + i}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={`shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 ${
                    i === index ? "border-primary" : "border-transparent"
                  }`}
                  data-testid={`product-detail-thumb-${i}`}
                  aria-label={`image ${i + 1}`}
                >
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {typeof product.price === "number" && (
            <div className="text-2xl font-bold text-primary" data-testid="text-product-detail-price">
              {formatCurrency(product.price)}
            </div>
          )}

          {product.description ? (
            <div className="space-y-1" data-testid="section-product-detail-description">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t.products.description}
              </p>
              <p className="text-sm whitespace-pre-wrap leading-relaxed" data-testid="text-product-detail-description">
                {product.description}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic" data-testid="text-product-detail-no-description">
              {t.products.description}: —
            </p>
          )}
        </div>

        {showCart && (
          <div
            className="sticky bottom-0 left-0 right-0 border-t bg-background px-5 py-3 flex items-center gap-3"
            data-testid="product-detail-cta-bar"
          >
            {quantityInCart > 0 && onDecrement ? (
              <div className="flex items-center gap-2 flex-1">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-11 w-11 rounded-full"
                  onClick={onDecrement}
                  aria-label={t.pos.decrease}
                  data-testid="button-product-detail-dec"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span
                  className="min-w-10 text-center text-lg font-bold tabular-nums"
                  data-testid="text-product-detail-qty"
                >
                  {quantityInCart}
                </span>
                <Button
                  type="button"
                  size="icon"
                  variant="default"
                  className="h-11 w-11 rounded-full"
                  onClick={onAddToCart}
                  disabled={!inStock}
                  aria-label={t.pos.increase}
                  data-testid="button-product-detail-inc"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  className="flex-1 h-11"
                  onClick={() => onOpenChange(false)}
                  data-testid="button-product-detail-done"
                >
                  {t.common.confirm}
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                className="w-full h-12 text-base"
                onClick={onAddToCart}
                disabled={!inStock}
                data-testid="button-product-detail-add"
              >
                <ShoppingBag className="h-4 w-4 mr-2" />
                {inStock ? t.shopDetail.addToCart : t.shopDetail.outOfStock}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
