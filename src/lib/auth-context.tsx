import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

export type UserRole =
  | "platform_admin"
  | "owner"
  | "manager"
  | "cashier"
  | "barista"
  | "customer"
  | "courier"
  | "support";

export interface CurrentUser {
  id: string;
  email: string;
  contactEmail?: string;
  name: string;
  phone: string;
  role: UserRole;
  isActive: boolean;
  ownerId: string;
  storeIds: string[];
  plan: "trial" | "lite" | "pro";
  approvalStatus: "pending" | "approved" | "rejected";
  trialEndsAt: string | null;
  avatarUrl: string | null;
  createdAt: string;
  shouldShowSampleImportPrompt?: boolean;
}

export interface RegisterOwnerInput {
  email: string;
  password: string;
  name: string;
  phone?: string;
  businessName?: string;
  taxCode?: string;
  businessRegNumber?: string;
  legalRepresentative?: string;
  businessAddress?: string;
  contactEmail?: string;
  plan?: "lite" | "pro";
  firstStore: {
    name: string;
    address: string;
    phone?: string;
    description?: string;
    openHours?: string;
    district?: string;
    city?: string;
    latitude?: number | null;
    longitude?: number | null;
  };
}

export interface RegisterCustomerInput {
  email: string;
  password: string;
  name: string;
  phone?: string;
  referralCode?: string;
}

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<CurrentUser>;
  registerOwner: (input: RegisterOwnerInput) => Promise<CurrentUser>;
  registerCustomer: (input: RegisterCustomerInput) => Promise<CurrentUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
      if (Array.isArray(data?.details) && data.details.length > 0) {
        const fields = data.details
          .map((d: { path?: Array<string | number>; message?: string }) => {
            const path = Array.isArray(d.path) ? d.path.join(".") : "";
            return path ? `${path}${d.message ? `: ${d.message}` : ""}` : d.message || "";
          })
          .filter(Boolean)
          .join("; ");
        if (fields) msg = `${msg} (${fields})`;
      }
    } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return null as T;
  return res.json();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  const resetClientCache = () => {
    queryClient.cancelQueries();
    queryClient.removeQueries();
    queryClient.clear();
  };

  const refresh = async () => {
    try {
      const u = await api<CurrentUser>("/api/auth/me");
      setUser(u);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const login = async (email: string, password: string) => {
    const u = await api<CurrentUser>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    resetClientCache();
    setUser(u);
    return u;
  };

  const registerOwner = async (input: RegisterOwnerInput) => {
    const u = await api<CurrentUser>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
    resetClientCache();
    setUser(u);
    return u;
  };

  const registerCustomer = async (input: RegisterCustomerInput) => {
    const u = await api<CurrentUser>("/api/auth/register-customer", {
      method: "POST",
      body: JSON.stringify(input),
    });
    resetClientCache();
    setUser(u);
    return u;
  };

  const logout = async () => {
    await api<null>("/api/auth/logout", { method: "POST" });
    setUser(null);
    resetClientCache();
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, refresh, login, registerOwner, registerCustomer, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function isStaffRole(role: UserRole): boolean {
  return role === "owner" || role === "manager" || role === "cashier" || role === "barista";
}
