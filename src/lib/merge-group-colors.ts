const MERGE_GROUP_PALETTES = [
  {
    bg: "bg-amber-50 border-amber-400 dark:bg-amber-950/30 dark:border-amber-600",
    badge: "bg-amber-500 hover:bg-amber-600 text-white",
    text: "text-amber-700 dark:text-amber-400",
    banner: "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700",
    bannerIcon: "text-amber-600",
    bannerText: "text-amber-800 dark:text-amber-300",
    row: "bg-amber-50/50 dark:bg-amber-950/20",
  },
  {
    bg: "bg-blue-50 border-blue-400 dark:bg-blue-950/30 dark:border-blue-600",
    badge: "bg-blue-500 hover:bg-blue-600 text-white",
    text: "text-blue-700 dark:text-blue-400",
    banner: "bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700",
    bannerIcon: "text-blue-600",
    bannerText: "text-blue-800 dark:text-blue-300",
    row: "bg-blue-50/50 dark:bg-blue-950/20",
  },
  {
    bg: "bg-emerald-50 border-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-600",
    badge: "bg-emerald-500 hover:bg-emerald-600 text-white",
    text: "text-emerald-700 dark:text-emerald-400",
    banner: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700",
    bannerIcon: "text-emerald-600",
    bannerText: "text-emerald-800 dark:text-emerald-300",
    row: "bg-emerald-50/50 dark:bg-emerald-950/20",
  },
  {
    bg: "bg-purple-50 border-purple-400 dark:bg-purple-950/30 dark:border-purple-600",
    badge: "bg-purple-500 hover:bg-purple-600 text-white",
    text: "text-purple-700 dark:text-purple-400",
    banner: "bg-purple-50 dark:bg-purple-950/30 border-purple-300 dark:border-purple-700",
    bannerIcon: "text-purple-600",
    bannerText: "text-purple-800 dark:text-purple-300",
    row: "bg-purple-50/50 dark:bg-purple-950/20",
  },
  {
    bg: "bg-rose-50 border-rose-400 dark:bg-rose-950/30 dark:border-rose-600",
    badge: "bg-rose-500 hover:bg-rose-600 text-white",
    text: "text-rose-700 dark:text-rose-400",
    banner: "bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-700",
    bannerIcon: "text-rose-600",
    bannerText: "text-rose-800 dark:text-rose-300",
    row: "bg-rose-50/50 dark:bg-rose-950/20",
  },
  {
    bg: "bg-teal-50 border-teal-400 dark:bg-teal-950/30 dark:border-teal-600",
    badge: "bg-teal-500 hover:bg-teal-600 text-white",
    text: "text-teal-700 dark:text-teal-400",
    banner: "bg-teal-50 dark:bg-teal-950/30 border-teal-300 dark:border-teal-700",
    bannerIcon: "text-teal-600",
    bannerText: "text-teal-800 dark:text-teal-300",
    row: "bg-teal-50/50 dark:bg-teal-950/20",
  },
  {
    bg: "bg-orange-50 border-orange-400 dark:bg-orange-950/30 dark:border-orange-600",
    badge: "bg-orange-500 hover:bg-orange-600 text-white",
    text: "text-orange-700 dark:text-orange-400",
    banner: "bg-orange-50 dark:bg-orange-950/30 border-orange-300 dark:border-orange-700",
    bannerIcon: "text-orange-600",
    bannerText: "text-orange-800 dark:text-orange-300",
    row: "bg-orange-50/50 dark:bg-orange-950/20",
  },
  {
    bg: "bg-cyan-50 border-cyan-400 dark:bg-cyan-950/30 dark:border-cyan-600",
    badge: "bg-cyan-500 hover:bg-cyan-600 text-white",
    text: "text-cyan-700 dark:text-cyan-400",
    banner: "bg-cyan-50 dark:bg-cyan-950/30 border-cyan-300 dark:border-cyan-700",
    bannerIcon: "text-cyan-600",
    bannerText: "text-cyan-800 dark:text-cyan-300",
    row: "bg-cyan-50/50 dark:bg-cyan-950/20",
  },
] as const;

export type MergeGroupPalette = (typeof MERGE_GROUP_PALETTES)[number];

function hashGroupId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function getMergeGroupColor(mergeGroupId: string): MergeGroupPalette {
  const idx = hashGroupId(mergeGroupId) % MERGE_GROUP_PALETTES.length;
  return MERGE_GROUP_PALETTES[idx];
}
