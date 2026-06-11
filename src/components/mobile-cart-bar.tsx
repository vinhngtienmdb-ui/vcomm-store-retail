import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { useT } from "@/lib/i18n-context";

interface Props {
  itemCount: number;
  subtotal: number;
  onClick: () => void;
  ctaLabel?: string;
  testId?: string;
}

export function MobileCartBar({
  itemCount,
  subtotal,
  onClick,
  ctaLabel,
  testId = "mobile-cart-bar",
}: Props) {
  const t = useT();
  const label = ctaLabel ?? t.pos.viewCart;
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 lg:hidden border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]"
      data-testid={testId}
    >
      <div className="max-w-5xl mx-auto px-3 py-2 flex items-center gap-2">
        <button
          type="button"
          onClick={onClick}
          className="relative flex items-center justify-center h-11 w-11 rounded-full bg-primary/10 text-primary shrink-0"
          aria-label={label}
          data-testid={`${testId}-icon`}
        >
          <ShoppingBag className="h-5 w-5" />
          {itemCount > 0 && (
            <span
              className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[11px] font-bold flex items-center justify-center"
              data-testid={`${testId}-badge`}
            >
              {itemCount > 99 ? "99+" : itemCount}
            </span>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] text-muted-foreground leading-tight truncate">
            {itemCount === 0
              ? t.pos.emptyCart
              : `${itemCount} ${t.pos.itemsSelected}`}
          </div>
          <div
            className="text-base font-bold text-foreground leading-tight truncate"
            data-testid={`${testId}-subtotal`}
          >
            {formatCurrency(subtotal)}
          </div>
        </div>
        <Button
          type="button"
          onClick={onClick}
          disabled={itemCount === 0}
          className="shrink-0 h-11 px-4"
          data-testid={`${testId}-cta`}
        >
          {label}
        </Button>
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" aria-hidden="true" />
    </div>
  );
}
