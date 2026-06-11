import { useState, useRef, useEffect } from "react";
import { useI18n } from "@/lib/i18n-context";
import { Globe, Check } from "lucide-react";

function VietnamFlag() {
  return (
    <svg viewBox="0 0 30 20" className="w-5 h-3.5 rounded-[2px] border border-border/30 shrink-0">
      <rect width="30" height="20" fill="#DA251D" />
      <polygon points="15,4 16.76,9.41 22.5,9.41 17.87,12.99 19.63,18.41 15,14.82 10.37,18.41 12.13,12.99 7.5,9.41 13.24,9.41" fill="#FFFF00" />
    </svg>
  );
}

function UKFlag() {
  return (
    <svg viewBox="0 0 60 30" className="w-5 h-3.5 rounded-[2px] border border-border/30 shrink-0">
      <rect width="60" height="30" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4" />
      <path d="M30,0 V30 M0,15 H60" stroke="#fff" strokeWidth="10" />
      <path d="M30,0 V30 M0,15 H60" stroke="#C8102E" strokeWidth="6" />
    </svg>
  );
}

const FLAG_MAP = { vi: VietnamFlag, en: UKFlag } as const;
const LABEL_MAP = { vi: "Ti\u1ebfng Vi\u1ec7t", en: "English" } as const;

interface LanguageSwitcherProps {
  variant?: "default" | "header";
}

export function LanguageSwitcher({ variant = "default" }: LanguageSwitcherProps) {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const CurrentFlag = FLAG_MAP[lang];

  const triggerClass = variant === "header"
    ? "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20"
    : "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors border border-border bg-background text-foreground hover:bg-muted";

  return (
    <div className="relative" ref={ref} data-testid="language-switcher">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={triggerClass}
        data-testid="button-lang-trigger"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <CurrentFlag />
        <span className="hidden sm:inline">{LABEL_MAP[lang]}</span>
        <Globe className="h-3.5 w-3.5 sm:hidden" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95">
          {(["vi", "en"] as const).map((code) => {
            const Flag = FLAG_MAP[code];
            const active = lang === code;
            return (
              <button
                key={code}
                type="button"
                onClick={() => { setLang(code); setOpen(false); }}
                data-testid={`button-lang-${code}`}
                className={`flex items-center gap-2 w-full px-3 py-2.5 text-sm transition-colors ${
                  active ? "bg-accent font-medium" : "hover:bg-accent/50"
                }`}
              >
                <Flag />
                <span className="flex-1 text-left">{LABEL_MAP[code]}</span>
                {active && <Check className="h-4 w-4 text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
