import { format } from "date-fns";
import { vi } from "date-fns/locale";

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

export function formatDate(dateString: string | undefined | null, formatStr: string = "dd/MM/yyyy HH:mm"): string {
  if (!dateString) return "";
  try {
    return format(new Date(dateString), formatStr, { locale: vi });
  } catch (e) {
    return dateString;
  }
}
