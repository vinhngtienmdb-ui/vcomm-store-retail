import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, HelpCircle, Info, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n-context";

export type ConfirmVariant = "default" | "destructive" | "warning" | "info";

export interface ConfirmOptions {
  title?: string;
  description?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmCtx = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmCtx);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}

const VARIANT_META: Record<ConfirmVariant, { Icon: typeof AlertTriangle; iconWrap: string; actionClass?: string }> = {
  default: {
    Icon: HelpCircle,
    iconWrap: "bg-primary/10 text-primary",
  },
  info: {
    Icon: Info,
    iconWrap: "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
  },
  warning: {
    Icon: AlertTriangle,
    iconWrap: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
  },
  destructive: {
    Icon: Trash2,
    iconWrap: "bg-destructive/10 text-destructive",
    actionClass: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  },
};

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((o) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setOpts(o);
    });
  }, []);

  const settle = (v: boolean) => {
    const r = resolverRef.current;
    resolverRef.current = null;
    setOpts(null);
    r?.(v);
  };

  const t = useT();
  const variant = opts?.variant ?? "default";
  const { Icon, iconWrap, actionClass } = VARIANT_META[variant];

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      <AlertDialog open={!!opts} onOpenChange={(open) => { if (!open) settle(false); }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-start gap-3">
              <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", iconWrap)}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 space-y-1.5">
                <AlertDialogTitle>{opts?.title ?? t.common.confirm}</AlertDialogTitle>
                {opts?.description ? (
                  <AlertDialogDescription asChild>
                    <div>{opts.description}</div>
                  </AlertDialogDescription>
                ) : null}
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => settle(false)} data-testid="confirm-cancel">
              {opts?.cancelText ?? t.common.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => settle(true)}
              className={actionClass}
              data-testid="confirm-ok"
            >
              {opts?.confirmText ?? t.common.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmCtx.Provider>
  );
}
