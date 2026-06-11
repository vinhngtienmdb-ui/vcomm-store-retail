import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { AlertTriangle, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  getClientEnv,
  isAlreadyOpenedExternal,
  redirectIOSZaloToSafari,
  shouldForceExternalBrowser,
} from "@/lib/browser-guard";

const EXCLUDED_PATH_PREFIXES = ["/pos/customer-display"];

interface Props {
  children: ReactNode;
}

export function GlobalBrowserGuard({ children }: Props) {
  const [location] = useLocation();
  const env = useMemo(() => getClientEnv(), []);
  const [redirecting, setRedirecting] = useState(false);

  const excluded = EXCLUDED_PATH_PREFIXES.some((p) => location.startsWith(p));

  useEffect(() => {
    if (excluded) return undefined;
    if (shouldForceExternalBrowser()) {
      setRedirecting(true);
      const t = setTimeout(() => {
        redirectIOSZaloToSafari();
      }, 120);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [excluded]);

  if (excluded) return <>{children}</>;

  if (env.isIOS && env.isZalo && !isAlreadyOpenedExternal()) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/10 via-background to-accent/20 p-5"
        data-testid="browser-guard-redirect"
      >
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="p-6 text-center space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-primary/10 p-3">
                <Loader2 className="size-7 text-primary animate-spin" />
              </div>
            </div>
            <h1 className="text-xl font-bold text-foreground">
              Đang mở bằng Safari…
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed">
              Hệ thống đang chuyển bạn từ Zalo sang Safari để dùng camera, quét
              QR và đăng nhập ổn định hơn trên iPhone.
            </p>
            <Button
              type="button"
              size="lg"
              className="w-full"
              onClick={() => redirectIOSZaloToSafari()}
              data-testid="button-browser-guard-open"
            >
              <ExternalLink className="mr-2 size-4" />
              Mở ngay
            </Button>
            {redirecting && (
              <p className="text-xs text-muted-foreground">
                Nếu không tự chuyển, hãy bấm "Mở ngay".
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (env.isIOS && env.isZalo && isAlreadyOpenedExternal()) {
    const baseUrl = import.meta.env.BASE_URL;
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-gradient-to-b from-destructive/10 via-background to-accent/20 p-5"
        data-testid="browser-guard-warning"
      >
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="p-6 text-center space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-destructive/10 p-3">
                <AlertTriangle className="size-7 text-destructive" />
              </div>
            </div>
            <h1 className="text-xl font-bold text-destructive">
              Cảnh báo bảo mật
            </h1>
            <p className="text-base text-foreground leading-relaxed">
              Để bảo mật cho người dùng, vui lòng không mở ứng dụng trực tiếp
              bằng Zalo trên iPhone.
            </p>
            <p className="text-sm text-muted-foreground">
              Gợi ý: trong Zalo, chọn menu góc trên có dấu <strong>...</strong>{" "}
              → <strong>Mở bằng Safari</strong>.
            </p>
            <img
              src={`${baseUrl}images/warning/zalowarning.png`}
              alt="Hướng dẫn mở bằng Safari"
              className="rounded-2xl w-full"
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
