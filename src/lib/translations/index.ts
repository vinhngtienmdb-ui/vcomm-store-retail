import { vi } from "./vi";
import { en } from "./en";

export type Translations = typeof vi;
export type Lang = "vi" | "en";

export const translations: Record<Lang, Translations> = { vi, en };

export const LANG_OPTIONS: { value: Lang; nativeLabel: string }[] = [
  { value: "vi", nativeLabel: "Tieng Viet" },
  { value: "en", nativeLabel: "English" },
];
