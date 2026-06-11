import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StoreProvider } from "@/lib/store-context";
import { ThemeProvider } from "@/lib/theme-context";
import { I18nProvider, useT } from "@/lib/i18n-context";
import { AuthProvider, useAuth, isStaffRole } from "@/lib/auth-context";
import { AppLayout } from "@/components/layout/app-layout";
import { GlobalBrowserGuard } from "@/components/global-browser-guard";
import { ConfirmProvider } from "@/components/confirm-provider";

const HomePage = lazy(() => import("@/pages/home"));
const LoginPage = lazy(() => import("@/pages/login"));
const RegisterOwnerPage = lazy(() => import("@/pages/register-owner"));
const RegisterCustomerPage = lazy(() => import("@/pages/register-customer"));
const AdminPage = lazy(() => import("@/pages/admin"));
const ShopListPage = lazy(() => import("@/pages/shop-list"));
const ShopDetailPage = lazy(() => import("@/pages/shop-detail"));
const PublicTablePage = lazy(() => import("@/pages/public-table"));
const AccountPage = lazy(() => import("@/pages/account"));
const PosCustomerDisplayPage = lazy(() => import("@/pages/pos-customer-display"));
const PublicIntroducePage = lazy(() => import("@/pages/public-introduce"));
const PublicNotificationHelpPage = lazy(() => import("@/pages/public-notification-help"));
const CourierPortalPage = lazy(() => import("@/pages/courier-portal"));
const AdminCustomersPage = lazy(() => import("@/pages/admin-customers"));
const AdminSettingsPage = lazy(() => import("@/pages/admin-settings"));
const AdminPromotionsPage = lazy(() => import("@/pages/admin-promotions"));
const AdminPromotionsUsagePage = lazy(() => import("@/pages/admin-promotions-usage"));
const AdminSupportUsersPage = lazy(() => import("@/pages/admin-support-users"));
import { AdminLayout } from "@/components/layout/admin-layout";

function PageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function StaffShell() {
  const { user, loading } = useAuth();
  const [location] = useLocation();
  const t = useT();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        {t.app.loading}
      </div>
    );
  }
  if (!user) {
    try { sessionStorage.setItem("vcomm-store_redirect_after_login", location); } catch {}
    return <Redirect to={`/login?next=${encodeURIComponent(location)}`} />;
  }
  if (!isStaffRole(user.role) && user.role !== "support") {
    if (user.role === "platform_admin") return <Redirect to="/admin" />;
    if (user.role === "customer") return <Redirect to="/account" />;
    if (user.role === "courier") return <Redirect to="/courier" />;
    return <Redirect to="/shop" />;
  }
  if (user.role === "support") {
    const allowed = new Set(["/categories", "/products", "/ingredients", "/suppliers", "/settings"]);
    if (!allowed.has(location)) {
      return <Redirect to="/categories" />;
    }
  }
  return <AppLayout />;
}

function CourierShell() {
  const { user, loading } = useAuth();
  const [location] = useLocation();
  const t = useT();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        {t.app.loading}
      </div>
    );
  }
  if (!user) {
    try { sessionStorage.setItem("vcomm-store_redirect_after_login", location); } catch {}
    return <Redirect to={`/login?next=${encodeURIComponent(location)}`} />;
  }
  if (user.role !== "courier") {
    if (user.role === "platform_admin") return <Redirect to="/admin" />;
    if (user.role === "customer") return <Redirect to="/account" />;
    if (isStaffRole(user.role)) return <Redirect to="/dashboard" />;
    return <Redirect to="/" />;
  }
  return <CourierPortalPage />;
}

function AdminShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [location] = useLocation();
  const t = useT();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        {t.app.loading}
      </div>
    );
  }
  if (!user) {
    try { sessionStorage.setItem("vcomm-store_redirect_after_login", location); } catch {}
    return <Redirect to={`/login?next=${encodeURIComponent(location)}`} />;
  }
  if (user.role !== "platform_admin") {
    return <Redirect to="/" />;
  }
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register">
        <Redirect to="/register-owner" />
      </Route>
      <Route path="/register-owner" component={RegisterOwnerPage} />
      <Route path="/register-customer" component={RegisterCustomerPage} />
      <Route path="/shop" component={ShopListPage} />
      <Route path="/shop/:slug" component={ShopDetailPage} />
      <Route path="/account" component={AccountPage} />
      <Route path="/t/:token" component={PublicTablePage} />
      <Route path="/pos/customer-display" component={PosCustomerDisplayPage} />
      <Route path="/public/introduce" component={PublicIntroducePage} />
      <Route path="/public/helps/notificationsettingup" component={PublicNotificationHelpPage} />
      <Route path="/courier" component={CourierShell} />
      <Route path="/admin/support-users">
        <AdminShell>
          <AdminLayout>
            <AdminSupportUsersPage />
          </AdminLayout>
        </AdminShell>
      </Route>
      <Route path="/admin/customers">
        <AdminShell>
          <AdminLayout>
            <AdminCustomersPage />
          </AdminLayout>
        </AdminShell>
      </Route>
      <Route path="/admin/promotions">
        <AdminShell>
          <AdminLayout>
            <AdminPromotionsPage />
          </AdminLayout>
        </AdminShell>
      </Route>
      <Route path="/admin/promotions-usage">
        <AdminShell>
          <AdminLayout>
            <AdminPromotionsUsagePage />
          </AdminLayout>
        </AdminShell>
      </Route>
      <Route path="/admin/settings">
        <AdminShell>
          <AdminLayout>
            <AdminSettingsPage />
          </AdminLayout>
        </AdminShell>
      </Route>
      <Route path="/admin">
        <AdminShell>
          <AdminLayout>
            <AdminPage />
          </AdminLayout>
        </AdminShell>
      </Route>
      <Route component={StaffShell} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <ThemeProvider>
          <AuthProvider>
            <StoreProvider>
              <TooltipProvider>
                <ConfirmProvider>
                  <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                    <GlobalBrowserGuard>
                      <Suspense fallback={<PageFallback />}>
                        <Router />
                      </Suspense>
                    </GlobalBrowserGuard>
                  </WouterRouter>
                  <Toaster />
                </ConfirmProvider>
              </TooltipProvider>
            </StoreProvider>
          </AuthProvider>
        </ThemeProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

export default App;
