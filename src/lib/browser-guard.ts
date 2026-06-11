export interface ClientEnv {
  ua: string;
  isIOS: boolean;
  isAndroid: boolean;
  isWindows: boolean;
  isZalo: boolean;
  isSafariIOS: boolean;
}

export function getClientEnv(): ClientEnv {
  if (typeof navigator === "undefined" || typeof window === "undefined") {
    return {
      ua: "",
      isIOS: false,
      isAndroid: false,
      isWindows: false,
      isZalo: false,
      isSafariIOS: false,
    };
  }

  const ua =
    navigator.userAgent ||
    navigator.vendor ||
    (window as unknown as { opera?: string }).opera ||
    "";

  const isIOS =
    /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  const isAndroid = /Android/i.test(ua);
  const isWindows = /Windows NT/i.test(ua);
  const isZalo = /Zalo/i.test(ua);

  const isSafariIOS =
    isIOS &&
    /Safari/i.test(ua) &&
    !/CriOS|FxiOS|EdgiOS|OPiOS|Zalo/i.test(ua);

  return { ua, isIOS, isAndroid, isWindows, isZalo, isSafariIOS };
}

export function shouldForceExternalBrowser(): boolean {
  if (typeof window === "undefined") return false;
  const env = getClientEnv();
  const url = new URL(window.location.href);
  const alreadyOpened = url.searchParams.get("opened_external") === "1";
  return env.isIOS && env.isZalo && !alreadyOpened;
}

export function buildExternalUrl(): string {
  const url = new URL(window.location.href);
  url.searchParams.set("opened_external", "1");
  return url.toString();
}

export function redirectIOSZaloToSafari(): void {
  const nextUrl = buildExternalUrl();
  window.location.replace(nextUrl);
}

export function isAlreadyOpenedExternal(): boolean {
  if (typeof window === "undefined") return false;
  return new URL(window.location.href).searchParams.get("opened_external") === "1";
}
