import { useCallback, useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export interface PushState {
  supported: boolean;
  permission: NotificationPermission | "unsupported";
  subscribed: boolean;
  loading: boolean;
}

async function ensureServiceWorker(): Promise<ServiceWorkerRegistration> {
  const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;
  return reg;
}

export function usePushNotifications(): {
  state: PushState;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  refresh: () => Promise<void>;
} {
  const supported = isPushSupported();
  const [state, setState] = useState<PushState>({
    supported,
    permission: supported ? Notification.permission : "unsupported",
    subscribed: false,
    loading: supported,
  });

  const refresh = useCallback(async () => {
    if (!supported) {
      setState({ supported: false, permission: "unsupported", subscribed: false, loading: false });
      return;
    }
    try {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      setState({
        supported: true,
        permission: Notification.permission,
        subscribed: !!sub,
        loading: false,
      });
    } catch {
      setState({
        supported: true,
        permission: Notification.permission,
        subscribed: false,
        loading: false,
      });
    }
  }, [supported]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const enable = useCallback(async () => {
    if (!supported) return;
    setState((s) => ({ ...s, loading: true }));
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState((s) => ({ ...s, permission, loading: false }));
        return;
      }
      const keyRes = await fetch("/api/push/public-key", { credentials: "include" });
      if (!keyRes.ok) throw new Error("no key");
      const { publicKey } = (await keyRes.json()) as { publicKey: string };
      const reg = await ensureServiceWorker();
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        });
      }
      const raw = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      await fetch("/api/push/subscribe", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: raw.endpoint,
          keys: { p256dh: raw.keys?.p256dh, auth: raw.keys?.auth },
          userAgent: navigator.userAgent.slice(0, 280),
        }),
      });
      setState({ supported: true, permission, subscribed: true, loading: false });
    } catch (err) {
      console.error("enable push failed", err);
      setState((s) => ({ ...s, loading: false }));
    }
  }, [supported]);

  const disable = useCallback(async () => {
    if (!supported) return;
    setState((s) => ({ ...s, loading: true }));
    try {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe().catch(() => undefined);
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        }).catch(() => undefined);
      }
      setState((s) => ({ ...s, subscribed: false, loading: false }));
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  }, [supported]);

  return { state, enable, disable, refresh };
}
