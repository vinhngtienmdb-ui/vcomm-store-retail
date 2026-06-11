import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export interface TabDescriptor {
  key: string;
  title: string;
  element: ReactNode;
  icon?: ReactNode;
  path?: string;
  closable?: boolean;
}

export interface TabsContextValue {
  tabs: TabDescriptor[];
  activeKey: string | null;
  /** Returns true if the tab was opened or focused; false if the tab limit was hit. */
  openTab: (tab: TabDescriptor) => boolean;
  focusTab: (key: string) => void;
  closeTab: (key: string) => void;
  closeOthers: (key: string) => void;
  setTabTitle: (key: string, title: string) => void;
  maxTabs: number;
}

const TabsContext = createContext<TabsContextValue | null>(null);

const CurrentTabKeyContext = createContext<string | null>(null);

export const DEFAULT_MAX_TABS = 8;

export function TabsProvider({
  children,
  maxTabs = DEFAULT_MAX_TABS,
  onLimitReached,
}: {
  children: ReactNode;
  maxTabs?: number;
  onLimitReached?: (max: number) => void;
}) {
  const [tabs, setTabs] = useState<TabDescriptor[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const limitCallbackRef = useRef(onLimitReached);
  limitCallbackRef.current = onLimitReached;

  // Mirror the latest committed state in refs so action callbacks can decide
  // outcomes synchronously without relying on stale closures or performing
  // side effects inside setState updaters (which would violate purity under
  // Strict Mode double-invoke).
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;
  const activeKeyRef = useRef(activeKey);
  activeKeyRef.current = activeKey;

  const openTab = useCallback(
    (tab: TabDescriptor): boolean => {
      const prev = tabsRef.current;
      const exists = prev.some((t) => t.key === tab.key);
      if (exists) {
        if (activeKeyRef.current !== tab.key) setActiveKey(tab.key);
        return true;
      }
      if (prev.length >= maxTabs) {
        limitCallbackRef.current?.(maxTabs);
        return false;
      }
      setTabs([...prev, { closable: true, ...tab }]);
      setActiveKey(tab.key);
      return true;
    },
    [maxTabs],
  );

  const focusTab = useCallback((key: string) => {
    if (!tabsRef.current.some((t) => t.key === key)) return;
    if (activeKeyRef.current !== key) setActiveKey(key);
  }, []);

  const closeTab = useCallback((key: string) => {
    const prev = tabsRef.current;
    const idx = prev.findIndex((t) => t.key === key);
    if (idx < 0) return;
    if (prev[idx].closable === false) return;
    const next = prev.filter((t) => t.key !== key);
    setTabs(next);
    if (activeKeyRef.current === key) {
      if (next.length === 0) {
        setActiveKey(null);
      } else {
        const neighbor = next[Math.min(idx, next.length - 1)];
        setActiveKey(neighbor?.key ?? null);
      }
    }
  }, []);

  const closeOthers = useCallback((key: string) => {
    const prev = tabsRef.current;
    const keep = prev.find((t) => t.key === key);
    if (!keep) return;
    const stays = prev.filter((t) => t.key === key || t.closable === false);
    const merged = stays.some((t) => t.key === key) ? stays : [keep, ...stays];
    setTabs(merged);
    if (activeKeyRef.current !== key) setActiveKey(key);
  }, []);

  const setTabTitle = useCallback((key: string, title: string) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.key === key);
      if (idx < 0) return prev;
      const copy = prev.slice();
      copy[idx] = { ...copy[idx], title };
      return copy;
    });
  }, []);

  const value = useMemo<TabsContextValue>(
    () => ({
      tabs,
      activeKey,
      openTab,
      focusTab,
      closeTab,
      closeOthers,
      setTabTitle,
      maxTabs,
    }),
    [tabs, activeKey, openTab, focusTab, closeTab, closeOthers, setTabTitle, maxTabs],
  );

  return <TabsContext.Provider value={value}>{children}</TabsContext.Provider>;
}

export function useTabs(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) {
    throw new Error("useTabs must be used inside a <TabsProvider>");
  }
  return ctx;
}

export function useOptionalTabs(): TabsContextValue | null {
  return useContext(TabsContext);
}

export function useCurrentTabKey(): string | null {
  return useContext(CurrentTabKeyContext);
}

export function useCloseSelf(): () => void {
  const tabs = useOptionalTabs();
  const key = useCurrentTabKey();
  return useCallback(() => {
    if (tabs && key) tabs.closeTab(key);
  }, [tabs, key]);
}

export { CurrentTabKeyContext };

export function useEnsureTab(tab: TabDescriptor | null) {
  const { openTab } = useTabs();
  const lastKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!tab) return;
    if (lastKeyRef.current === tab.key) {
      openTab(tab);
      return;
    }
    lastKeyRef.current = tab.key;
    openTab(tab);
  }, [tab?.key, tab?.title, openTab, tab]);
}
