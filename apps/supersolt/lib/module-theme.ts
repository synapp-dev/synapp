/**
 * Module colour identities.
 *
 * Every functional area of the app owns a hue, used on hero cards, detail
 * drawers, and accent chrome, so users learn "green screen = money in,
 * copper screen = ordering" without reading a heading. Hues are spaced
 * around the wheel so no two adjacent modules read alike:
 *
 *   sales/revenue  emerald  (money in - established on dashboard + sales)
 *   inventory      indigo   (stock intelligence - established on insights)
 *   purchasing     amber    (money out: orders, invoices, suppliers)
 *   stock ops      sky      (counting, waste, locations - proposed)
 *   workforce      rose     (people - proposed, Phase 2)
 *   p&l            violet   (profit synthesis - proposed, Phase 2)
 *   agent          brand    (Supersolt ink #231f20 + logo green #bcdb8b)
 *
 * Each theme is a bundle of full literal class strings (never build these
 * dynamically - Tailwind only ships classes it can see).
 */

export type ModuleThemeKey =
  | "sales"
  | "inventory"
  | "purchasing"
  | "stock"
  | "workforce"
  | "pnl";

export type ModuleTheme = {
  /** Dark hero surface + base text. */
  hero: string;
  /** Small uppercase kicker text on the hero. */
  heroKicker: string;
  /** Secondary/description text on the hero. */
  heroSubtle: string;
  /** Frosted chip on the hero. */
  heroChip: string;
  /** Interactive frosted pill (e.g. View PDF) on the hero. */
  heroPill: string;
  /** Sheet close-button tint when the hero sits under it. */
  heroCloseButton: string;
  /** Animated blob overlay class (defined in packages/ui globals.css). */
  heroBlobs: string;
};

export const MODULE_THEMES: Record<ModuleThemeKey, ModuleTheme> = {
  sales: {
    hero: "bg-emerald-950 text-green-50",
    heroKicker: "text-emerald-200/90",
    heroSubtle: "text-emerald-200/70",
    heroChip:
      "inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-medium text-emerald-50",
    heroPill:
      "inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-xs font-medium text-emerald-50 transition-colors hover:bg-white/20",
    heroCloseButton:
      "[&>button]:text-emerald-100 [&>button]:opacity-80 hover:[&>button]:opacity-100",
    heroBlobs: "net-revenue-hero-shifting-blobs",
  },
  inventory: {
    hero: "bg-slate-950 text-slate-100",
    heroKicker: "text-indigo-200/90",
    heroSubtle: "text-indigo-200/70",
    heroChip:
      "inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-medium text-indigo-100",
    heroPill:
      "inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-xs font-medium text-indigo-100 transition-colors hover:bg-white/20",
    heroCloseButton:
      "[&>button]:text-indigo-100 [&>button]:opacity-80 hover:[&>button]:opacity-100",
    heroBlobs: "inventory-hero-shifting-blobs",
  },
  purchasing: {
    hero: "bg-amber-950 text-amber-50",
    heroKicker: "text-amber-200/90",
    heroSubtle: "text-amber-200/70",
    heroChip:
      "inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-medium text-amber-50",
    heroPill:
      "inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-xs font-medium text-amber-50 transition-colors hover:bg-white/20",
    heroCloseButton:
      "[&>button]:text-amber-100 [&>button]:opacity-80 hover:[&>button]:opacity-100",
    heroBlobs: "purchasing-hero-shifting-blobs",
  },
  stock: {
    hero: "bg-sky-950 text-sky-50",
    heroKicker: "text-sky-200/90",
    heroSubtle: "text-sky-200/70",
    heroChip:
      "inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-medium text-sky-50",
    heroPill:
      "inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-xs font-medium text-sky-50 transition-colors hover:bg-white/20",
    heroCloseButton:
      "[&>button]:text-sky-100 [&>button]:opacity-80 hover:[&>button]:opacity-100",
    heroBlobs: "stock-hero-shifting-blobs",
  },
  workforce: {
    hero: "bg-rose-950 text-rose-50",
    heroKicker: "text-rose-200/90",
    heroSubtle: "text-rose-200/70",
    heroChip:
      "inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-medium text-rose-50",
    heroPill:
      "inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-xs font-medium text-rose-50 transition-colors hover:bg-white/20",
    heroCloseButton:
      "[&>button]:text-rose-100 [&>button]:opacity-80 hover:[&>button]:opacity-100",
    heroBlobs: "workforce-hero-shifting-blobs",
  },
  pnl: {
    hero: "bg-violet-950 text-violet-50",
    heroKicker: "text-violet-200/90",
    heroSubtle: "text-violet-200/70",
    heroChip:
      "inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-medium text-violet-50",
    heroPill:
      "inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-xs font-medium text-violet-50 transition-colors hover:bg-white/20",
    heroCloseButton:
      "[&>button]:text-violet-100 [&>button]:opacity-80 hover:[&>button]:opacity-100",
    heroBlobs: "pnl-hero-shifting-blobs",
  },
};
