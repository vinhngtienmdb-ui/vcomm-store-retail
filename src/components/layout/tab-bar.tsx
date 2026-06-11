import { X } from "lucide-react";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import { useTabs } from "@/lib/tabs-context";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

function tabId(key: string) {
  return `tab-${key}`;
}
export function panelId(key: string) {
  return `tab-panel-${key}`;
}

export function TabBar() {
  const { tabs, activeKey, focusTab, closeTab } = useTabs();
  const tabRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  if (tabs.length === 0) return null;

  const focusByIndex = (idx: number) => {
    const target = tabs[(idx + tabs.length) % tabs.length];
    if (!target) return;
    focusTab(target.key);
    tabRefs.current.get(target.key)?.focus();
  };

  return (
    <div
      className="border-b border-border bg-gradient-to-b from-muted/60 to-muted/20 px-2 pt-2 shrink-0"
      data-testid="tab-bar"
    >
      <ScrollArea className="w-full">
        <div className="flex items-end gap-1 min-w-max" role="tablist" aria-label="Cửa sổ đang mở">
          {tabs.map((tab, idx) => {
            const active = tab.key === activeKey;
            const closable = tab.closable !== false;
            return (
              <div
                key={tab.key}
                ref={(el) => {
                  if (el) tabRefs.current.set(tab.key, el);
                  else tabRefs.current.delete(tab.key);
                }}
                role="tab"
                aria-selected={active}
                aria-controls={panelId(tab.key)}
                id={tabId(tab.key)}
                tabIndex={active ? 0 : -1}
                onClick={() => focusTab(tab.key)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    focusTab(tab.key);
                  } else if (e.key === "ArrowRight") {
                    e.preventDefault();
                    focusByIndex(idx + 1);
                  } else if (e.key === "ArrowLeft") {
                    e.preventDefault();
                    focusByIndex(idx - 1);
                  } else if (e.key === "Home") {
                    e.preventDefault();
                    focusByIndex(0);
                  } else if (e.key === "End") {
                    e.preventDefault();
                    focusByIndex(tabs.length - 1);
                  } else if (
                    closable &&
                    (e.ctrlKey || e.metaKey) &&
                    (e.key === "w" || e.key === "W")
                  ) {
                    e.preventDefault();
                    closeTab(tab.key);
                  }
                }}
                onAuxClick={(e) => {
                  if (e.button === 1 && closable) {
                    e.preventDefault();
                    closeTab(tab.key);
                  }
                }}
                data-testid={`tab-${tab.key}`}
                className={cn(
                  "group relative flex items-center gap-2 select-none cursor-pointer",
                  "h-9 pl-3 pr-1.5 rounded-t-lg border border-b-0 transition-all",
                  "max-w-[220px] min-w-[120px] outline-none",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                  active
                    ? "bg-background border-border text-foreground font-semibold -mb-px pb-[1px] z-10 shadow-sm"
                    : "bg-muted/30 border-border/40 text-muted-foreground hover:bg-background/70 hover:text-foreground hover:border-border/70",
                )}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-[3px] rounded-t-lg bg-primary"
                  />
                )}
                {tab.icon && (
                  <span
                    className={cn(
                      "shrink-0 [&>svg]:w-4 [&>svg]:h-4",
                      active ? "text-primary" : "text-current opacity-70",
                    )}
                  >
                    {tab.icon}
                  </span>
                )}
                <span
                  className="truncate text-sm"
                  title={tab.title}
                  data-testid={`tab-title-${tab.key}`}
                >
                  {tab.title}
                </span>
                {closable ? (
                  <button
                    type="button"
                    aria-label={`Đóng tab ${tab.title}`}
                    title="Đóng"
                    tabIndex={-1}
                    data-testid={`button-close-tab-${tab.key}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab.key);
                    }}
                    className={cn(
                      "ml-auto inline-flex items-center justify-center w-5 h-5 rounded",
                      "text-muted-foreground/70 hover:bg-muted hover:text-foreground",
                      "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
                      active && "opacity-100",
                    )}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <span className="ml-auto w-5 h-5" aria-hidden />
                )}
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" className="h-1.5" />
      </ScrollArea>
    </div>
  );
}
