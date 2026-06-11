import { ReactElement, ReactNode, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  ShoppingCart,
  ListOrdered,
  Package,
  Leaf,
  Box,
  Users,
  UserCircle,
  CalendarClock,
  Store as StoreIcon,
  Tags,
  BarChart3,
  Coffee,
  FolderTree,
  ShieldCheck,
  Armchair,
  Truck,
  ClipboardList,
  Receipt,
  FileText,
  Settings as SettingsIcon,
  Undo2,
  Phone,
  Bike,
} from "lucide-react";
import { useListStores } from "@workspace/api-client-react";
import { useStoreId } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-context";
import { useT } from "@/lib/i18n-context";
import type { Translations } from "@/lib/translations";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { TabsProvider, useTabs, type TabDescriptor } from "@/lib/tabs-context";
import { TabBar } from "@/components/layout/tab-bar";
import { TabHost } from "@/components/layout/tab-host";
import { StaffUserMenu } from "@/components/layout/staff-user-menu";

const Dashboard = lazy(() => import("@/pages/dashboard"));
const PosPage = lazy(() => import("@/pages/pos"));
const OrdersPage = lazy(() => import("@/pages/orders"));
const CategoriesPage = lazy(() => import("@/pages/categories"));
const ProductsPage = lazy(() => import("@/pages/products"));
const InventoryPage = lazy(() => import("@/pages/inventory"));
const StoresPage = lazy(() => import("@/pages/stores"));
const CustomersPage = lazy(() => import("@/pages/customers"));
const PromotionsPage = lazy(() => import("@/pages/promotions"));
const IngredientsPage = lazy(() => import("@/pages/ingredients"));
const TablesPage = lazy(() => import("@/pages/tables"));
const SuppliersPage = lazy(() => import("@/pages/suppliers"));
const StockReceiptsPage = lazy(() => import("@/pages/stock-receipts"));
const ExpensesPage = lazy(() => import("@/pages/expenses"));
const StaffPage = lazy(() => import("@/pages/staff"));
const ShiftsPage = lazy(() => import("@/pages/shifts"));
const ReportsPage = lazy(() => import("@/pages/reports"));
const VatInvoicesPage = lazy(() => import("@/pages/vat-invoices"));
const UsersPage = lazy(() => import("@/pages/users"));
const SettingsPage = lazy(() => import("@/pages/settings"));
const ReturnsPage = lazy(() => import("@/pages/returns"));
const CouriersPage = lazy(() => import("@/pages/couriers"));
const DeliveryOptionsPage = lazy(() => import("@/pages/delivery-options"));
const NotFound = lazy(() => import("@/pages/not-found"));

type Role = "owner" | "manager" | "cashier" | "barista" | "platform_admin" | "customer" | "courier" | "support";

function getRoleLabel(t: Translations, role: string): string {
  const map: Record<string, string> = {
    owner: t.layout.roleOwner,
    manager: t.layout.roleManager,
    cashier: t.layout.roleCashier,
    barista: t.layout.roleBarista,
    platform_admin: t.layout.rolePlatformAdmin,
    customer: t.layout.roleCustomer,
    courier: t.layout.roleCourier,
    support: t.layout.roleSupport,
  };
  return map[role] || role;
}

interface MenuItem {
  title: string;
  icon: typeof LayoutDashboard;
  path: string;
  element: ReactElement;
  roles?: Role[];
  proOnly?: boolean;
}

function getMenuItems(t: Translations): MenuItem[] {
  return [
    { title: t.layout.menuDashboard, icon: LayoutDashboard, path: "/dashboard", element: <Dashboard /> },
    { title: t.layout.menuPos, icon: ShoppingCart, path: "/pos", element: <PosPage /> },
    { title: t.layout.menuOrders, icon: ListOrdered, path: "/orders", element: <OrdersPage /> },
    { title: t.layout.menuReturns, icon: Undo2, path: "/returns", element: <ReturnsPage />, proOnly: true },
    { title: t.layout.menuCategories, icon: FolderTree, path: "/categories", element: <CategoriesPage />, roles: ["owner", "manager", "support"] },
    { title: t.layout.menuProducts, icon: Package, path: "/products", element: <ProductsPage />, roles: ["owner", "manager", "support"] },
    { title: t.layout.menuIngredients, icon: Leaf, path: "/ingredients", element: <IngredientsPage />, roles: ["owner", "manager", "support"], proOnly: true },
    { title: t.layout.menuInventory, icon: Box, path: "/inventory", element: <InventoryPage />, proOnly: true },
    { title: t.layout.menuStockReceipts, icon: ClipboardList, path: "/stock-receipts", element: <StockReceiptsPage />, roles: ["owner", "manager"], proOnly: true },
    { title: t.layout.menuExpenses, icon: Receipt, path: "/expenses", element: <ExpensesPage />, roles: ["owner", "manager"], proOnly: true },
    { title: t.layout.menuSuppliers, icon: Truck, path: "/suppliers", element: <SuppliersPage />, roles: ["owner", "manager", "support"], proOnly: true },
    { title: t.layout.menuTables, icon: Armchair, path: "/tables", element: <TablesPage />, roles: ["owner", "manager"], proOnly: true },
    { title: t.layout.menuCustomers, icon: Users, path: "/customers", element: <CustomersPage /> },
    { title: t.layout.menuStaff, icon: UserCircle, path: "/staff", element: <StaffPage />, roles: ["owner", "manager"], proOnly: true },
    { title: t.layout.menuCouriers, icon: Bike, path: "/couriers", element: <CouriersPage />, roles: ["owner", "manager"] },
    { title: t.layout.menuDeliveryOptions, icon: Truck, path: "/delivery-options", element: <DeliveryOptionsPage />, roles: ["owner", "manager"] },
    { title: t.layout.menuUsers, icon: ShieldCheck, path: "/users", element: <UsersPage />, roles: ["owner"], proOnly: true },
    { title: t.layout.menuShifts, icon: CalendarClock, path: "/shifts", element: <ShiftsPage />, roles: ["owner", "manager"], proOnly: true },
    { title: t.layout.menuStores, icon: StoreIcon, path: "/stores", element: <StoresPage />, roles: ["owner"] },
    { title: t.layout.menuPromotions, icon: Tags, path: "/promotions", element: <PromotionsPage />, roles: ["owner", "manager"] },
    { title: t.layout.menuReports, icon: BarChart3, path: "/reports", element: <ReportsPage />, roles: ["owner", "manager"], proOnly: true },
    { title: t.layout.menuVatInvoices, icon: FileText, path: "/vat-invoices", element: <VatInvoicesPage />, roles: ["owner", "manager"], proOnly: true },
    { title: t.layout.menuSettings, icon: SettingsIcon, path: "/settings", element: <SettingsPage /> },
  ];
}

const DEFAULT_MENU_PATH = "/dashboard";

function tabFromMenuItem(item: MenuItem): TabDescriptor {
  const Icon = item.icon;
  return {
    key: `menu:${item.path}`,
    title: item.title,
    element: item.element,
    icon: <Icon className="w-4 h-4" />,
    path: item.path,
    closable: true,
  };
}

export function AppLayout() {
  const { toast } = useToast();
  const t = useT();
  return (
    <TabsProvider
      maxTabs={8}
      onLimitReached={(max) =>
        toast({
          title: t.layout.tabLimitTitle,
          description: `${t.layout.tabLimitDescPre} ${max}${t.layout.tabLimitDescPost}`,
          variant: "destructive",
        })
      }
    >
      <AppLayoutInner />
    </TabsProvider>
  );
}

function AppLayoutInner() {
  const [location, navigate] = useLocation();
  const { storeId, setStoreId } = useStoreId();
  const { user } = useAuth();
  const storesEnabled = !!user && user.role !== "support";
  const { data: allStores = [] } = useListStores({
    query: { enabled: storesEnabled } as never,
  });
  const { tabs, activeKey, openTab } = useTabs();
  const t = useT();

  const menuItems = useMemo(() => getMenuItems(t), [t]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const handler = (event: MessageEvent) => {
      const data = event.data as { type?: string; url?: string } | null;
      if (data && data.type === "vcomm-store-notification-click" && typeof data.url === "string") {
        navigate(data.url);
      }
    };
    navigator.serviceWorker.addEventListener("message", handler);
    return () => {
      navigator.serviceWorker.removeEventListener("message", handler);
    };
  }, [navigate]);

  const visibleStores = useMemo(() => {
    if (!user) return allStores;
    if (user.role === "support") return [];
    if (user.role === "owner") return allStores;
    return allStores.filter((s) => user.storeIds.includes(s.id));
  }, [allStores, user]);

  const visibleMenu = useMemo(() => {
    if (!user) return [];
    const isLite = user.plan === "lite";
    if (user.role === "support") {
      const allowed = new Set(["/categories", "/products", "/ingredients", "/suppliers", "/settings"]);
      return menuItems.filter((m) => allowed.has(m.path) && !(isLite && m.proOnly));
    }
    return menuItems.filter((m) => {
      if (m.roles && !m.roles.includes(user.role)) return false;
      if (isLite && m.proOnly) return false;
      return true;
    });
  }, [user, menuItems]);

  // Build path map from VISIBLE menu only so a direct URL to a role-restricted
  // page does not silently open it as a tab. Disallowed paths fall through to
  // the not-found tab.
  const menuByPath = useMemo(() => {
    const map = new Map<string, MenuItem>();
    for (const m of visibleMenu) map.set(m.path, m);
    return map;
  }, [visibleMenu]);

  const showAllStoresOption = user?.role === "owner";

  useEffect(() => {
    if (visibleStores.length === 0) return;
    const isValid = storeId === "all" ? showAllStoresOption : visibleStores.some((s) => s.id === storeId);
    if (!isValid) {
      const fallback = visibleStores.find((s) => s.isActive) ?? visibleStores[0];
      if (fallback) setStoreId(fallback.id);
    }
  }, [storeId, visibleStores, setStoreId, showAllStoresOption]);

  // URL → ensure & focus a menu tab. Unknown staff URLs render a transient
  // NotFound tab. This effect drives the initial tab on first load and any
  // direct sidebar navigation. If the tab limit is hit, revert the URL to the
  // currently-active tab's path so the address bar never desyncs from the
  // visible content.
  // Latest tabs/activeKey are read via refs to avoid extra effect re-runs.
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;
  const activeKeyRef = useRef(activeKey);
  activeKeyRef.current = activeKey;
  useEffect(() => {
    const item = menuByPath.get(location);
    const desc: TabDescriptor = item
      ? tabFromMenuItem(item)
      : {
          key: `menu:not-found:${location}`,
          title: t.layout.notFoundTab,
          element: <NotFound />,
          path: location,
          closable: true,
        };
    const ok = openTab(desc);
    if (!ok) {
      const active = tabsRef.current.find((t) => t.key === activeKeyRef.current);
      if (active?.path && active.path !== location) {
        navigate(active.path);
      }
    }
  }, [location, openTab, menuByPath, navigate]);

  // Active tab → sync URL (so the sidebar highlight follows the active tab,
  // and refresh restores the same view). Guard with a prev-ref so the effect
  // only fires on TRUE activeKey transitions and never fights the URL→tab
  // effect that uses a stale closure value of activeKey on the same render.
  const prevActiveKeyRef = useRef<string | null>(activeKey);
  useEffect(() => {
    if (activeKey === prevActiveKeyRef.current) return;
    prevActiveKeyRef.current = activeKey;
    if (!activeKey) return;
    const active = tabs.find((t) => t.key === activeKey);
    if (active?.path && active.path !== location) {
      navigate(active.path);
    }
  }, [activeKey, tabs, location, navigate]);

  // Closed the last tab — fall back to dashboard so the user is never stuck on
  // an empty workspace. Guarded with a prev-ref so it only fires on the
  // transition from >0 → 0 and NEVER on initial mount (where tabs.length is
  // briefly 0 before the URL→tab effect populates it).
  const prevTabsLengthRef = useRef(0);
  useEffect(() => {
    if (!user) return;
    const wentEmpty = prevTabsLengthRef.current > 0 && tabs.length === 0;
    prevTabsLengthRef.current = tabs.length;
    if (wentEmpty && location !== DEFAULT_MENU_PATH) {
      navigate(DEFAULT_MENU_PATH);
    }
  }, [tabs.length, user, location, navigate]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar collapsible="icon">
          <SidebarHeader className="border-b px-4 py-3 border-border/50">
            <Link href="/">
              <div
                className="flex items-center gap-2 font-bold text-lg text-sidebar-foreground cursor-pointer"
                data-testid="link-app-home"
              >
                <div className="bg-sidebar-primary text-sidebar-primary-foreground p-1.5 rounded-md shrink-0">
                  <Coffee className="w-5 h-5" />
                </div>
                <span className="group-data-[collapsible=icon]:hidden">VComm Store</span>
              </div>
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <SidebarBody
              items={visibleMenu}
              location={location}
              groupLabel={t.layout.mainMenu}
            />
          </SidebarContent>
          <SidebarFooter className="border-t border-border/50 p-3 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
            <a
              href="tel:+84859646555"
              className="flex items-center gap-1.5 hover:text-primary font-medium"
              data-testid="link-hotline"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{t.layout.hotline}: +84 859 646 555</span>
            </a>
          </SidebarFooter>
        </Sidebar>

        <div className="flex flex-col flex-1 min-w-0">
          <header className="h-14 border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-30 flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-3">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div className="hidden sm:block text-sm font-medium text-muted-foreground">
                {user?.role === "support"
                  ? t.layout.sampleDataArea
                  : user?.role === "owner"
                  ? t.layout.chainManagement
                  : getRoleLabel(t, user?.role ?? "")}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {visibleStores.length > 0 ? (
                <Select value={storeId} onValueChange={setStoreId}>
                  <SelectTrigger className="w-[200px] h-9" data-testid="select-store">
                    <SelectValue placeholder={t.layout.selectStore} />
                  </SelectTrigger>
                  <SelectContent>
                    {showAllStoresOption && <SelectItem value="all">{t.layout.allStores}</SelectItem>}
                    {visibleStores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name} {!store.isActive && t.layout.inactiveStore}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-sm text-muted-foreground">{t.layout.notAssigned}</div>
              )}

              <StaffUserMenu />
            </div>
          </header>

          <TabBar />

          <AutoCollapseMain>
            <TabHost />
          </AutoCollapseMain>
        </div>
      </div>
    </SidebarProvider>
  );
}

function SidebarBody({
  items,
  location,
  groupLabel,
}: {
  items: MenuItem[];
  location: string;
  groupLabel: string;
}) {
  const { isMobile, setOpenMobile } = useSidebar();
  const closeOnMobile = useCallback(() => {
    if (isMobile) setOpenMobile(false);
  }, [isMobile, setOpenMobile]);

  if (isMobile) {
    return (
      <div className="p-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/80 px-1 pb-2">
          {groupLabel}
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {items.map((item) => {
            const active = location === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={closeOnMobile}
                data-testid={`nav-${item.path.replace(/\//g, "")}-mobile`}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border px-2 py-3 text-center min-h-[88px] shadow-sm transition-colors hover-elevate active-elevate-2 ${
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground border-sidebar-primary"
                    : "bg-card text-card-foreground border-border"
                }`}
              >
                <item.icon className="w-6 h-6 shrink-0" />
                <span className="text-[11px] leading-tight font-semibold line-clamp-2">
                  {item.title}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{groupLabel}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.path}>
              <SidebarMenuButton
                asChild
                isActive={location === item.path}
                tooltip={item.title}
                data-testid={`nav-${item.path.replace(/\//g, "")}`}
              >
                <Link href={item.path}>
                  <item.icon className="w-4 h-4" />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

const SIDEBAR_AUTO_HIDE_KEY = "vcomm-store_sidebar_auto_hide";

function getAutoHidePref(): boolean {
  try {
    const v = localStorage.getItem(SIDEBAR_AUTO_HIDE_KEY);
    return v === null ? true : v === "1";
  } catch {
    return true;
  }
}

const autoHideListeners = new Set<(v: boolean) => void>();
let autoHideValue = getAutoHidePref();

function useAutoHideSidebar() {
  const [autoHide, setAutoHideState] = useState(() => autoHideValue);

  useEffect(() => {
    const handler = (v: boolean) => setAutoHideState(v);
    autoHideListeners.add(handler);
    return () => { autoHideListeners.delete(handler); };
  }, []);

  const setAutoHide = useCallback((v: boolean) => {
    autoHideValue = v;
    try {
      localStorage.setItem(SIDEBAR_AUTO_HIDE_KEY, v ? "1" : "0");
    } catch {}
    autoHideListeners.forEach((fn) => fn(v));
  }, []);
  return { autoHide, setAutoHide } as const;
}

function AutoCollapseMain({ children }: { children: ReactNode }) {
  const { isMobile, setOpen } = useSidebar();
  const { autoHide } = useAutoHideSidebar();
  const handleClick = useCallback(() => {
    if (isMobile) return;
    if (!autoHide) return;
    setOpen(false);
  }, [isMobile, setOpen, autoHide]);
  return (
    <main
      className="flex-1 min-h-0 flex flex-col bg-background"
      onClick={handleClick}
      data-testid="main-content"
    >
      {children}
    </main>
  );
}

export { useAutoHideSidebar };
