import { useState, type ReactNode } from "react";
import { useT } from "@/lib/i18n-context";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShieldCheck } from "lucide-react";

export function DataPrivacyDialogTrigger({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          "inline-flex items-center gap-1 text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
        }
        data-testid="link-data-privacy"
      >
        <ShieldCheck className="h-3.5 w-3.5" />
        {children ?? t.dataPrivacy.linkLabel}
      </button>
      <DataPrivacyDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

export function DataPrivacyDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" data-testid="dialog-data-privacy">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {t.dataPrivacy.title}
          </DialogTitle>
          <DialogDescription>{t.dataPrivacy.subtitle}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm leading-relaxed">
          <p>{t.dataPrivacy.paragraph1}</p>
          <p>{t.dataPrivacy.paragraph2}</p>
          <p>{t.dataPrivacy.paragraph3}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
