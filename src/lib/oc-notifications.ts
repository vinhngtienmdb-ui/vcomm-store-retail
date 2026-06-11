import { useCallback, useEffect, useRef, useState } from "react";

const PENDING_TOKEN_KEY = "vcomm-store_oc_pending_token";

export interface OcLinkSession {
  token: string;
  deepLink: string;
  webLink: string;
}

export interface OcState {
  configured: boolean;
  enabled: boolean;
  loading: boolean;
}

interface StatusResponse {
  configured: boolean;
  enabled: boolean;
  subscriptions: { id: string; deviceLabel: string; createdAt: string }[];
}

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(String(res.status));
  return (await res.json()) as T;
}

export type LinkOutcome = "completed" | "expired" | "failed";

export function useOcNotifications(): {
  state: OcState;
  session: OcLinkSession | null;
  refresh: () => Promise<void>;
  startLink: () => Promise<OcLinkSession | null>;
  pollOnce: (token: string) => Promise<"pending" | LinkOutcome>;
  cancelLink: () => void;
  disable: () => Promise<void>;
  openDeepLink: (deepLink: string) => void;
} {
  const [state, setState] = useState<OcState>({
    configured: false,
    enabled: false,
    loading: true,
  });
  const [session, setSession] = useState<OcLinkSession | null>(null);
  const startedAtRef = useRef<number>(0);

  const refresh = useCallback(async () => {
    try {
      const data = await apiGet<StatusResponse>("/api/oc/status");
      setState({ configured: data.configured, enabled: data.enabled, loading: false });
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const startLink = useCallback(async (): Promise<OcLinkSession | null> => {
    try {
      const returnUrl = window.location.href;
      const res = await fetch("/api/oc/link-token", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnUrl }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as OcLinkSession;
      sessionStorage.setItem(PENDING_TOKEN_KEY, data.token);
      startedAtRef.current = Date.now();
      setSession(data);
      return data;
    } catch {
      return null;
    }
  }, []);

  const pollOnce = useCallback(
    async (token: string): Promise<"pending" | LinkOutcome> => {
      try {
        const data = await apiGet<{ status: string; subscriptionId: string | null }>(
          `/api/oc/link-token/${encodeURIComponent(token)}`,
        );
        if (data.status === "completed" && data.subscriptionId) {
          sessionStorage.removeItem(PENDING_TOKEN_KEY);
          setSession(null);
          setState((s) => ({ ...s, enabled: true }));
          return "completed";
        }
        if (data.status === "expired") {
          sessionStorage.removeItem(PENDING_TOKEN_KEY);
          setSession(null);
          return "expired";
        }
        return "pending";
      } catch {
        return "failed";
      }
    },
    [],
  );

  const cancelLink = useCallback(() => {
    sessionStorage.removeItem(PENDING_TOKEN_KEY);
    setSession(null);
  }, []);

  const disable = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      await fetch("/api/oc/unlink", { method: "POST", credentials: "include" });
      setState((s) => ({ ...s, enabled: false, loading: false }));
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  const openDeepLink = useCallback((deepLink: string) => {
    window.location.href = deepLink;
  }, []);

  return {
    state,
    session,
    refresh,
    startLink,
    pollOnce,
    cancelLink,
    disable,
    openDeepLink,
  };
}

export function getPendingOcToken(): string | null {
  return sessionStorage.getItem(PENDING_TOKEN_KEY);
}
