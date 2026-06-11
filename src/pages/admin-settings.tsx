import { Check, Palette } from "lucide-react";
import { useTheme, type ThemeId } from "@/lib/theme-context";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { HelpGuide } from "@/components/help-guide";

export default function AdminSettingsPage() {
  const { theme, setTheme, options } = useTheme();

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-4xl" data-testid="page-admin-settings">
      <div>
        <h1 className="text-base sm:text-2xl font-bold flex items-center gap-2">
          <Palette className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
          Cài đặt
        </h1>
        <p className="hidden sm:block text-sm text-muted-foreground mt-1">
          Tùy chỉnh giao diện quản trị. Thay đổi áp dụng ngay và lưu trên thiết bị này.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Chủ đề màu sắc</CardTitle>
          <CardDescription>Chọn một trong các bộ màu dưới đây.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {options.map((opt) => {
              const active = opt.id === theme;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTheme(opt.id as ThemeId)}
                  data-testid={`button-admin-theme-${opt.id}`}
                  data-active={active ? "true" : "false"}
                  aria-pressed={active}
                  className={cn(
                    "group relative text-left rounded-lg border-2 p-3 sm:p-4 transition-all",
                    "hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active ? "border-primary shadow-md" : "border-border",
                  )}
                >
                  {active && (
                    <span
                      className="absolute top-2 right-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground"
                      aria-hidden
                    >
                      <Check className="w-4 h-4" />
                    </span>
                  )}
                  <div
                    className="rounded-md overflow-hidden border mb-3"
                    style={{ background: opt.swatch.background }}
                  >
                    <div className="flex h-16">
                      <div className="flex-1" style={{ background: opt.swatch.background }} />
                      <div className="w-1/3" style={{ background: opt.swatch.accent }} />
                      <div className="w-1/4" style={{ background: opt.swatch.primary }} />
                    </div>
                  </div>
                  <div className="font-semibold text-sm">{opt.label}</div>
                  <p className="text-xs text-muted-foreground mt-1 leading-snug">
                    {opt.description}
                  </p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <HelpGuide initialRole="platform_admin" />
    </div>
  );
}
