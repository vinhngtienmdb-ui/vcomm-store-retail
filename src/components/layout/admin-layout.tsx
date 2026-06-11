import { useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Building2, Users, ShieldCheck, Menu, Settings, Home, Tags, BarChart3, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminUserMenu } from "@/components/layout/admin-user-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

interface AdminNavItem {
  href: string;
  label: string;
  icon: ReactNode;
  testId: string;
  match: (loc: string) => boolean;
}

const NAV: AdminNavItem[] = [
  {
    href: "/admin",
    label: "Quản lý chuỗi",
    icon: <Building2 className="h-4 w-4" />,
    testId: "nav-admin-chains",
    match: (loc) => loc === "/admin" || loc === "/admin/",
  },
  {
    href: "/admin/customers",
    label: "Khách hàng",
    icon: <Users className="h-4 w-4" />,
    testId: "nav-admin-customers",
    match: (loc) => loc.startsWith("/admin/customers"),
  },
  {
    href: "/admin/promotions",
    label: "Khuyến mãi",
    icon: <Tags className="h-4 w-4" />,
    testId: "nav-admin-promotions",
    match: (loc) => loc === "/admin/promotions" || loc.startsWith("/admin/promotions/edit"),
  },
  {
    href: "/admin/promotions-usage",
    label: "Đối soát khuyến mãi",
    icon: <BarChart3 className="h-4 w-4" />,
    testId: "nav-admin-promotions-usage",
    match: (loc) => loc.startsWith("/admin/promotions-usage"),
  },
  {
    href: "/admin/support-users",
    label: "Hỗ trợ data mẫu",
    icon: <LifeBuoy className="h-4 w-4" />,
    testId: "nav-admin-support-users",
    match: (loc) => loc.startsWith("/admin/support-users"),
  },
  {
    href: "/admin/settings",
    label: "Cài đặt",
    icon: <Settings className="h-4 w-4" />,
    testId: "nav-admin-settings",
    match: (loc) => loc.startsWith("/admin/settings"),
  },
];

function AdminNavList({
  location,
  onItemClick,
  testIdSuffix = "",
}: {
  location: string;
  onItemClick?: () => void;
  testIdSuffix?: string;
}) {
  return (
    <nav className="p-2 flex flex-col gap-1">
      {NAV.map((item) => {
        const active = item.match(location);
        return (
          <Link
            key={item.href}
            href={item.href}
            data-testid={`${item.testId}${testIdSuffix}`}
            onClick={onItemClick}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm whitespace-nowrap transition-colors ${
              active
                ? "bg-primary/10 text-primary font-semibold"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        );
      })}
      <div className="my-2 border-t border-border" />
      <Link
        href="/"
        data-testid={`nav-admin-home${testIdSuffix}`}
        onClick={onItemClick}
        className="flex items-center gap-2 px-3 py-2 rounded-md text-sm whitespace-nowrap transition-colors text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Home className="h-4 w-4" />
        <span>Về trang chủ</span>
      </Link>
    </nav>
  );
}

function AdminBrand() {
  return (
    <div className="flex items-center gap-2 px-4 py-4 border-b border-border">
      <div className="bg-primary/10 text-primary p-1.5 rounded-md">
        <ShieldCheck className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="font-bold text-sm leading-tight">VComm Store Admin</div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
          Quản trị nền tảng
        </div>
      </div>
    </div>
  );
}

export function AdminLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-muted/20">
      {/* Mobile: sticky top bar with hamburger button + brand. Drawer opens from left. */}
      <div className="md:hidden sticky top-0 z-30 bg-card border-b border-border">
        <div className="flex items-center gap-2 px-3 py-2">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                data-testid="button-admin-mobile-menu"
                aria-label="Mở menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-64 p-0 flex flex-col"
              data-testid="drawer-admin-mobile-menu"
            >
              <SheetTitle className="sr-only">Menu quản trị</SheetTitle>
              <SheetDescription className="sr-only">
                Điều hướng giữa các trang quản trị nền tảng.
              </SheetDescription>
              <AdminBrand />
              <AdminNavList
                location={location}
                onItemClick={() => setMobileOpen(false)}
                testIdSuffix="-mobile"
              />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <div className="bg-primary/10 text-primary p-1 rounded">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <span className="font-bold text-sm">VComm Store Admin</span>
          </div>
          <AdminUserMenu />
        </div>
      </div>

      {/* Desktop: full vertical sidebar */}
      <aside className="hidden md:block md:w-60 md:shrink-0 md:border-r border-border bg-card md:min-h-screen">
        <AdminBrand />
        <AdminNavList location={location} />
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        {/* Desktop top bar with user menu */}
        <div className="hidden md:flex sticky top-0 z-20 bg-card/95 backdrop-blur border-b border-border h-14 items-center justify-end px-4 gap-2">
          <AdminUserMenu />
        </div>
        <div className="flex-1 min-w-0">{children}</div>
      </main>
    </div>
  );
}
