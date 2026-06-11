import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type ThemeId = "coffee" | "dark" | "ocean" | "forest" | "romance" | "tech" | "orange";

export interface ThemeOption {
  id: ThemeId;
  label: string;
  description: string;
  isDark: boolean;
  swatch: {
    background: string;
    primary: string;
    accent: string;
  };
}

export const THEMES: ThemeOption[] = [
  {
    id: "ocean",
    label: "Xanh lam (mặc định)",
    description: "Tông xanh dương mát mẻ, tinh tế.",
    isDark: false,
    swatch: { background: "#f0f6ff", primary: "#1e4f8a", accent: "#cfe1f7" },
  },
  {
    id: "coffee",
    label: "Cà phê",
    description: "Tông kem ấm với điểm nhấn nâu cà phê đậm.",
    isDark: false,
    swatch: { background: "#f9f5ee", primary: "#5a3d22", accent: "#e3cdb4" },
  },
  {
    id: "forest",
    label: "Rừng xanh",
    description: "Tông xanh lá tự nhiên, dễ chịu.",
    isDark: false,
    swatch: { background: "#f1f7ee", primary: "#205a36", accent: "#d2e6c8" },
  },
  {
    id: "romance",
    label: "Lãng mạn",
    description: "Tông hồng phấn dịu dàng, ngọt ngào và lãng mạn.",
    isDark: false,
    swatch: { background: "#fdf2f6", primary: "#d63384", accent: "#f7d6e6" },
  },
  {
    id: "dark",
    label: "Đêm rang",
    description: "Nền tối, dễ chịu cho mắt khi làm việc buổi tối.",
    isDark: true,
    swatch: { background: "#1f160e", primary: "#d3a26b", accent: "#3a2b1d" },
  },
  {
    id: "orange",
    label: "Orange",
    description: "Tông cam đỏ rực rỡ kiểu Shopee, năng động và bắt mắt.",
    isDark: false,
    swatch: { background: "#fff8f5", primary: "#ee4d2d", accent: "#ffd9cc" },
  },
  {
    id: "tech",
    label: "Công nghệ",
    description: "Xám kim loại xước với hoa văn tổ ong tinh tế.",
    isDark: false,
    swatch: { background: "#d9dde2", primary: "#3a4452", accent: "#bfc6cf" },
  },
];

const DEFAULT_THEME: ThemeId = "orange";
const STORAGE_KEY = "vcomm-store_theme";

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  options: ThemeOption[];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemeId(v: string | null): v is ThemeId {
  return (
    v === "coffee" ||
    v === "dark" ||
    v === "ocean" ||
    v === "forest" ||
    v === "romance" ||
    v === "tech" ||
    v === "orange"
  );
}

function applyThemeToDom(theme: ThemeId) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  const opt = THEMES.find((t) => t.id === theme);
  if (opt?.isDark) root.classList.add("dark");
  else root.classList.remove("dark");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    if (typeof window === "undefined") return DEFAULT_THEME;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      return isThemeId(stored) ? stored : DEFAULT_THEME;
    } catch {
      return DEFAULT_THEME;
    }
  });

  useEffect(() => {
    applyThemeToDom(theme);
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // ignore quota / private mode
    }
  }, [theme]);

  const setTheme = useCallback((next: ThemeId) => {
    setThemeState(next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, options: THEMES }),
    [theme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
