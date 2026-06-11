import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { CurrentTabKeyContext, useTabs } from "@/lib/tabs-context";
import { panelId } from "./tab-bar";

function tabId(key: string) {
  return `tab-${key}`;
}

export function TabHost() {
  const { tabs, activeKey } = useTabs();

  if (tabs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Chưa có tab nào được mở.
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 relative">
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <div
            key={tab.key}
            id={panelId(tab.key)}
            role="tabpanel"
            aria-labelledby={tabId(tab.key)}
            data-testid={`tab-panel-${tab.key}`}
            data-active={isActive ? "true" : "false"}
            hidden={!isActive}
            tabIndex={0}
            className="absolute inset-0 overflow-auto outline-none"
            style={{
              display: isActive ? "block" : "none",
            }}
          >
            <div className="p-4 md:p-6">
              <CurrentTabKeyContext.Provider value={tab.key}>
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center py-16 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  }
                >
                  {tab.element}
                </Suspense>
              </CurrentTabKeyContext.Provider>
            </div>
          </div>
        );
      })}
    </div>
  );
}
