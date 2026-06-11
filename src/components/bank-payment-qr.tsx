import { Printer, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { findBankByBin } from "@/lib/banks";
import { formatCurrency } from "@/lib/format";
import { useT } from "@/lib/i18n-context";

export interface BankPaymentInfo {
  bankBin: string;
  bankAccountNumber: string;
  bankAccountName: string;
}

export function hasBankInfo(s: BankPaymentInfo | null | undefined): boolean {
  return !!(s && s.bankBin && s.bankAccountNumber);
}

function buildVietQrUrl(opts: {
  bankBin: string;
  accountNumber: string;
  accountName: string;
  amount?: number | null;
  addInfo?: string;
  template?: "compact2" | "qr_only" | "compact" | "print";
}): string {
  const tpl = opts.template ?? "compact2";
  const params = new URLSearchParams();
  if (opts.amount && opts.amount > 0) params.set("amount", String(Math.round(opts.amount)));
  if (opts.addInfo) params.set("addInfo", opts.addInfo);
  if (opts.accountName) params.set("accountName", opts.accountName);
  const qs = params.toString();
  const base = `https://img.vietqr.io/image/${encodeURIComponent(opts.bankBin)}-${encodeURIComponent(
    opts.accountNumber,
  )}-${tpl}.png`;
  return qs ? `${base}?${qs}` : base;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface BankPaymentQrProps {
  store: BankPaymentInfo & { name?: string };
  amount?: number | null;
  addInfo?: string;
  title?: string;
  subTitle?: string;
}

export function BankPaymentQr({ store, amount, addInfo, title, subTitle }: BankPaymentQrProps) {
  const t = useT();
  if (!hasBankInfo(store)) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground text-sm">
        <Wallet className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <div>{t.pos.noBankAccount}</div>
        <div className="text-xs mt-1">{t.pos.addBankAccount}</div>
      </div>
    );
  }
  const bank = findBankByBin(store.bankBin);
  const url = buildVietQrUrl({
    bankBin: store.bankBin,
    accountNumber: store.bankAccountNumber,
    accountName: store.bankAccountName,
    amount: amount ?? null,
    addInfo,
    template: "compact2",
  });
  const printUrl = buildVietQrUrl({
    bankBin: store.bankBin,
    accountNumber: store.bankAccountNumber,
    accountName: store.bankAccountName,
    amount: amount ?? null,
    addInfo,
    template: "print",
  });

  const handlePrint = () => {
    const w = window.open("", "_blank", "width=480,height=720");
    if (!w) return;
    const safeTitle = escapeHtml(title ?? t.pos.qrPayment);
    const safeSub = escapeHtml(subTitle ?? store.name ?? "");
    const safeAcc = escapeHtml(store.bankAccountNumber);
    const safeName = escapeHtml(store.bankAccountName || "");
    const safeBank = escapeHtml(bank?.shortName ?? "");
    const amtLine = amount && amount > 0 ? `<div class="amt">${escapeHtml(formatCurrency(amount))}</div>` : "";
    const memoLine = addInfo ? `<div class="memo">Noi dung: ${escapeHtml(addInfo)}</div>` : "";
    w.document.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${safeTitle}</title>
    <style>
      body { font-family: system-ui, sans-serif; text-align: center; padding: 24px; }
      h1 { font-size: 20px; margin: 0 0 4px; }
      h2 { font-size: 13px; font-weight: normal; margin: 0 0 16px; color: #555; }
      .qr img { max-width: 380px; width: 100%; }
      .amt { font-size: 20px; font-weight: bold; color: #b91c1c; margin-top: 12px; }
      .memo { font-size: 12px; color: #555; margin-top: 4px; }
      .acc { font-size: 12px; color: #333; margin-top: 8px; }
    </style>
  </head>
  <body>
    <h1>${safeTitle}</h1>
    <h2>${safeSub}</h2>
    <div class="qr"><img id="qr-img" src="${escapeHtml(printUrl)}" alt="QR" /></div>
    ${amtLine}
    ${memoLine}
    <div class="acc">${safeBank} &middot; ${safeAcc}${safeName ? ` &middot; ${safeName}` : ""}</div>
    <script>
      (function(){
        var img = document.getElementById('qr-img');
        var done = false;
        var doPrint = function(){
          if (done) return;
          done = true;
          try { window.focus(); window.print(); } catch (e) {}
        };
        if (img && img.complete && img.naturalWidth > 0) { doPrint(); }
        else if (img) {
          img.addEventListener('load', doPrint);
          img.addEventListener('error', doPrint);
        }
        setTimeout(doPrint, 5000);
      })();
    </script>
  </body>
</html>`);
    w.document.close();
    w.focus();
  };

  return (
    <div className="space-y-3" data-testid="bank-payment-qr">
      <div className="bg-white rounded-md p-3 flex items-center justify-center border">
        <img
          src={url}
          alt="VietQR"
          className="max-w-[280px] w-full h-auto"
          data-testid="img-vietqr"
        />
      </div>
      <div className="text-xs text-muted-foreground text-center space-y-1">
        <div>
          <span className="font-medium text-foreground">{bank?.shortName ?? store.bankBin}</span>
          {" · "}
          <span className="font-mono">{store.bankAccountNumber}</span>
        </div>
        {store.bankAccountName && <div>{store.bankAccountName}</div>}
        {amount && amount > 0 && (
          <div className="text-base font-bold text-primary pt-1">{formatCurrency(amount)}</div>
        )}
        {addInfo && (
          <div>
            {t.pos.transferContent}: <span className="font-mono">{addInfo}</span>
          </div>
        )}
      </div>
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={handlePrint} data-testid="button-print-payment-qr">
          <Printer className="w-4 h-4 mr-2" /> {t.pos.printQr}
        </Button>
      </div>
    </div>
  );
}
