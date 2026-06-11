import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { useT } from "@/lib/i18n-context";
import { cn } from "@/lib/utils";

interface PromoCountdownProps {
  endDate: string | null | undefined;
  className?: string;
  variant?: "inline" | "overlay";
}

function diffParts(endMs: number, nowMs: number) {
  const total = Math.max(0, endMs - nowMs);
  const sec = Math.floor(total / 1000);
  return {
    total,
    days: Math.floor(sec / 86400),
    hours: Math.floor((sec % 86400) / 3600),
    minutes: Math.floor((sec % 3600) / 60),
    seconds: sec % 60,
  };
}

export function PromoCountdown({ endDate, className, variant = "inline" }: PromoCountdownProps) {
  const t = useT();
  const endMs = endDate ? new Date(endDate).getTime() : NaN;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!Number.isFinite(endMs)) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [endMs]);

  if (!Number.isFinite(endMs)) return null;

  const { total, days, hours, minutes, seconds } = diffParts(endMs, now);
  const expired = total <= 0;
  const urgent = !expired && total < 24 * 60 * 60 * 1000;

  const pad = (n: number) => n.toString().padStart(2, "0");
  const text = expired
    ? t.promoCountdown.expired
    : `${t.promoCountdown.endsIn} ${days > 0 ? `${days}${t.promoCountdown.dShort} ` : ""}${pad(hours)}${t.promoCountdown.hShort} ${pad(minutes)}${t.promoCountdown.mShort} ${pad(seconds)}${t.promoCountdown.sShort}`;

  if (variant === "overlay") {
    return (
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-1 flex items-end justify-center z-10",
          className,
        )}
        data-testid={expired ? "promo-countdown-expired" : "promo-countdown"}
      >
        <div
          className={cn(
            "inline-flex items-center gap-2 px-4 py-1.5 rounded-full font-mono font-extrabold tabular-nums text-base sm:text-lg shadow-lg ring-2 backdrop-blur-md",
            expired
              ? "bg-slate-900/85 text-slate-200 ring-slate-400/40"
              : urgent
                ? "bg-red-600/90 text-white ring-red-300/60 animate-pulse"
                : "bg-amber-500/90 text-white ring-amber-200/60",
          )}
          title={new Date(endMs).toLocaleString()}
        >
          <Clock className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
          <span className="whitespace-nowrap">{text}</span>
        </div>
      </div>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-mono font-bold tabular-nums text-xs",
        expired
          ? "text-muted-foreground"
          : urgent
            ? "text-red-600 dark:text-red-400"
            : "text-amber-700 dark:text-amber-300",
        className,
      )}
      data-testid={expired ? "promo-countdown-expired" : "promo-countdown"}
      title={new Date(endMs).toLocaleString()}
    >
      <Clock className="h-3 w-3 shrink-0" />
      <span className="whitespace-nowrap">{text}</span>
    </span>
  );
}
