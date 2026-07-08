// Intradark App Sidebar -> Figma builder
// Faithful 1:1 recreation of apps/intradark/components/organisms/app-sidebar.tsx
// (dark theme, expanded state). Builds reusable components + an assembled frame.
// Run via: Plugins -> Development -> Import plugin from manifest -> run.

// ---------------------------------------------------------------------------
// Theme (dark) — converted from packages/ui/src/styles/globals.css OKLCH values
// ---------------------------------------------------------------------------
const SIDEBAR_BG = "#171717"; // --sidebar          oklch(0.205 0 0)
const FG = "#fafafa"; // --sidebar-foreground       oklch(0.985 0 0)
const ACCENT = "#262626"; // --sidebar-accent       oklch(0.269 0 0)  (hover)
const BORDER = "#262626"; // --sidebar-border
const ACTIVE_BG = "#fafafa"; // --primary (dark)    oklch(0.985 0 0)
const ACTIVE_FG = "#171717"; // --primary-foreground oklch(0.205 0 0)
const MUTED = "#a1a1a1"; // --muted-foreground      oklch(0.708 0 0)
const RADIUS = 6; // rounded-md = radius(0.625rem) - 2px ≈ 8px; menu uses md ≈ 6px

// ---------------------------------------------------------------------------
// Lucide icon node data (exact, lucide-react v0.575.0). 24x24, stroke-based.
// ---------------------------------------------------------------------------
const ICON_DATA = {
  shield: [["path", { d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" }]],
  play: [["path", { d: "M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" }]],
  "layout-dashboard": [
    ["rect", { width: 7, height: 9, x: 3, y: 3, rx: 1 }],
    ["rect", { width: 7, height: 5, x: 14, y: 3, rx: 1 }],
    ["rect", { width: 7, height: 9, x: 14, y: 12, rx: 1 }],
    ["rect", { width: 7, height: 5, x: 3, y: 16, rx: 1 }],
  ],
  newspaper: [
    ["path", { d: "M15 18h-5" }],
    ["path", { d: "M18 14h-8" }],
    ["path", { d: "M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-4 0v-9a2 2 0 0 1 2-2h2" }],
    ["rect", { width: 8, height: 4, x: 10, y: 6, rx: 1 }],
  ],
  "message-square": [["path", { d: "M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z" }]],
  film: [
    ["rect", { width: 18, height: 18, x: 3, y: 3, rx: 2 }],
    ["path", { d: "M7 3v18" }],
    ["path", { d: "M3 7.5h4" }],
    ["path", { d: "M3 12h18" }],
    ["path", { d: "M3 16.5h4" }],
    ["path", { d: "M17 3v18" }],
    ["path", { d: "M17 7.5h4" }],
    ["path", { d: "M17 16.5h4" }],
  ],
  users: [
    ["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }],
    ["path", { d: "M16 3.128a4 4 0 0 1 0 7.744" }],
    ["path", { d: "M22 21v-2a4 4 0 0 0-3-3.87" }],
    ["circle", { cx: 9, cy: 7, r: 4 }],
  ],
  "user-round": [
    ["circle", { cx: 12, cy: 8, r: 5 }],
    ["path", { d: "M20 21a8 8 0 0 0-16 0" }],
  ],
  swords: [
    ["polyline", { points: "14.5 17.5 3 6 3 3 6 3 17.5 14.5" }],
    ["line", { x1: 13, x2: 19, y1: 19, y2: 13 }],
    ["line", { x1: 16, x2: 20, y1: 16, y2: 20 }],
    ["line", { x1: 19, x2: 21, y1: 21, y2: 19 }],
    ["polyline", { points: "14.5 6.5 18 3 21 3 21 6 17.5 9.5" }],
    ["line", { x1: 5, x2: 9, y1: 14, y2: 18 }],
    ["line", { x1: 7, x2: 4, y1: 17, y2: 20 }],
    ["line", { x1: 3, x2: 5, y1: 19, y2: 21 }],
  ],
  "calendar-days": [
    ["path", { d: "M8 2v4" }],
    ["path", { d: "M16 2v4" }],
    ["rect", { width: 18, height: 18, x: 3, y: 4, rx: 2 }],
    ["path", { d: "M3 10h18" }],
    ["path", { d: "M8 14h.01" }],
    ["path", { d: "M12 14h.01" }],
    ["path", { d: "M16 14h.01" }],
    ["path", { d: "M8 18h.01" }],
    ["path", { d: "M12 18h.01" }],
    ["path", { d: "M16 18h.01" }],
  ],
  medal: [
    ["path", { d: "M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15" }],
    ["path", { d: "M11 12 5.12 2.2" }],
    ["path", { d: "m13 12 5.88-9.8" }],
    ["path", { d: "M8 7h8" }],
    ["circle", { cx: 12, cy: 17, r: 5 }],
    ["path", { d: "M12 18v-2h-.5" }],
  ],
  "book-open": [
    ["path", { d: "M12 7v14" }],
    ["path", { d: "M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" }],
  ],
  wrench: [["path", { d: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z" }]],
  "chevrons-right": [
    ["path", { d: "m6 17 5-5-5-5" }],
    ["path", { d: "m13 17 5-5-5-5" }],
  ],
};

// Brand logos (fills inlined; Figma's SVG importer drops <style> class blocks).
const SYMBOL_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 23.64 20.47"><g><g><g><path fill="#4c9ccb" d="M10.34,7.68l4.43-2.56-1.48,2.56-1.48,2.56h-5.91l4.43-2.56Z"/><path fill="#4c9ccb" d="M13.3,2.56l4.43-2.56-1.48,2.56-1.48,2.56h-5.91l4.43-2.56Z"/><path fill="#4c9ccb" d="M4.43,7.68l4.43-2.56-1.48,2.56-1.48,2.56H0l4.43-2.56Z"/></g><g><path fill="#00497d" d="M10.34,12.8l-4.43-2.56h5.91l1.48,2.56,1.48,2.56-4.43-2.56Z"/><path fill="#00497d" d="M4.43,12.8L0,10.23h5.91l1.48,2.56,1.48,2.56-4.43-2.55Z"/><path fill="#00497d" d="M13.3,17.91l-4.43-2.56h5.91l1.48,2.56,1.48,2.56-4.43-2.56Z"/></g><g><path fill="#0483c8" d="M14.78,10.24v-5.12l-1.48,2.56-1.48,2.56,1.48,2.56,1.48,2.56v-5.12Z"/><path fill="#0483c8" d="M17.73,5.12V0l-1.48,2.56-1.48,2.56,1.48,2.56,1.48,2.56v-5.12Z"/><path fill="#0483c8" d="M17.73,15.36v-5.12l-1.48,2.56-1.48,2.56,1.48,2.56,1.48,2.56v-5.12Z"/></g><path fill="#4c9ccb" d="M5.91,15.36v-5.12l4.43,2.56,4.43,2.56-4.43,2.56-4.43,2.56v-5.12Z"/><path fill="#0483c8" d="M5.91,5.12V0l4.43,2.56,4.43,2.56-4.43,2.56-4.43,2.56v-5.12Z"/><path fill="#00497d" d="M14.78,10.24v-5.12l4.43,2.56,4.43,2.56-4.43,2.56-4.43,2.56v-5.12Z"/></g></g></svg>';

const WORDMARK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 234.83 39.18"><g fill="#ffffff"><path d="M0,3.15C0,1.37,1.37,0,3.15,0c1.68,0,3.05,1.37,3.05,3.15s-1.37,3.16-3.05,3.16c-1.78,0-3.15-1.37-3.15-3.16ZM.76,10.84h4.63v27.89H.76V10.84Z"/><path d="M32.41,22.95c0-5.7-3.1-8.6-7.79-8.6s-7.99,2.95-7.99,8.96v15.42h-4.63V10.84h4.63v3.97c1.83-2.9,5.19-4.48,8.96-4.48,6.46,0,11.4,3.97,11.4,11.96v16.44h-4.58v-15.78Z"/><path d="M44.32,14.66h-3.61v-3.82h3.61V3.82h4.63v7.02h7.28v3.82h-7.28v16.44c0,2.75,1.02,3.71,3.87,3.71h3.41v3.92h-4.17c-4.94,0-7.73-2.04-7.73-7.63V14.66Z"/><path d="M65.18,38.73h-4.63V10.84h4.63v4.53c1.58-3.1,4.58-5.04,9.01-5.04v4.78h-1.22c-4.43,0-7.79,1.98-7.79,8.45v15.16Z"/><path d="M89.76,10.38c5.19,0,8.75,2.65,10.38,5.55v-5.09h4.68v27.89h-4.68v-5.19c-1.68,3-5.29,5.65-10.43,5.65-7.43,0-13.18-5.85-13.18-14.5s5.75-14.3,13.23-14.3ZM90.68,14.4c-5.09,0-9.41,3.71-9.41,10.28s4.33,10.43,9.41,10.43,9.47-3.82,9.47-10.38-4.38-10.33-9.47-10.33Z"/><path d="M122.07,10.08c3.72,0,7.28,1.73,9.21,4.38V1.07h7.23v37.66h-7.23v-4.17c-1.68,2.6-4.83,4.63-9.26,4.63-7.18,0-12.88-5.85-12.88-14.66s5.7-14.45,12.93-14.45ZM123.85,16.33c-3.82,0-7.43,2.85-7.43,8.19s3.61,8.4,7.43,8.4,7.48-2.95,7.48-8.29-3.56-8.29-7.48-8.29Z"/><path d="M155.25,10.08c4.53,0,7.63,2.14,9.31,4.48v-4.02h7.18v28.19h-7.18v-4.12c-1.68,2.44-4.88,4.58-9.36,4.58-7.12,0-12.82-5.85-12.82-14.66s5.7-14.45,12.87-14.45ZM157.08,16.33c-3.82,0-7.43,2.85-7.43,8.19s3.61,8.4,7.43,8.4,7.48-2.95,7.48-8.29-3.56-8.29-7.48-8.29Z"/><path d="M184.56,38.73h-7.12V10.53h7.12v4.38c1.78-2.9,4.73-4.78,8.65-4.78v7.48h-1.88c-4.22,0-6.77,1.63-6.77,7.07v14.04Z"/><path d="M196.72,1.07h7.12v21.42l9.46-11.96h9.26l-12.42,14.15,12.52,14.04h-9.26l-9.57-12.01v12.01h-7.12V1.07Z"/></g><path fill="#ffffff" d="M227.06,34.83c0-2.28,1.62-3.89,3.89-3.89s3.87,1.61,3.87,3.89-1.61,3.87-3.87,3.87-3.89-1.63-3.89-3.87ZM228.07,34.83c0,1.75,1.11,2.94,2.89,2.94s2.9-1.19,2.9-2.94-1.13-2.96-2.9-2.96-2.89,1.19-2.89,2.96ZM231.94,35.24l.95,1.5h-1.42l-.79-1.37h-.11v1.37h-1.22v-3.91h1.92c.84,0,1.41.51,1.41,1.28,0,.53-.27.93-.73,1.13ZM230.55,33.88v.57h.58c.17,0,.31-.09.31-.29s-.15-.27-.31-.27h-.58Z"/></svg>';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function hx(h) {
  h = h.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
  };
}
function solid(hex, opacity) {
  const p = { type: "SOLID", color: hx(hex) };
  if (opacity != null) p.opacity = opacity;
  return p;
}

let FONT = { fam: "Inter", styles: { regular: "Regular", medium: "Medium", semibold: "Semi Bold", bold: "Bold" } };

async function pickFonts() {
  const avail = await figma.listAvailableFontsAsync();
  const have = new Set(avail.map((f) => f.fontName.family + "|" + f.fontName.style));
  const prefs = ["Geist", "Inter", "Roboto", "Helvetica Neue", "Arial"];
  let fam = prefs.find((p) => have.has(p + "|Regular")) || "Roboto";
  const pick = (cands) => {
    for (const s of cands) if (have.has(fam + "|" + s)) return s;
    return "Regular";
  };
  const styles = {
    regular: pick(["Regular"]),
    medium: pick(["Medium", "Regular"]),
    semibold: pick(["Semi Bold", "SemiBold", "Bold", "Medium"]),
    bold: pick(["Bold", "Semi Bold", "Medium"]),
  };
  FONT = { fam, styles };
  for (const s of new Set(Object.values(styles))) {
    await figma.loadFontAsync({ family: fam, style: s });
  }
}

function text(chars, size, styleKey, hex, opacity) {
  const t = figma.createText();
  t.fontName = { family: FONT.fam, style: FONT.styles[styleKey] };
  t.characters = chars;
  t.fontSize = size;
  t.fills = [solid(hex, opacity)];
  t.lineHeight = { unit: "PERCENT", value: 100 };
  return t;
}

function iconSvg(name, hex) {
  const nodes = ICON_DATA[name] || [];
  let parts = "";
  for (const [tag, a] of nodes) {
    if (tag === "path") parts += `<path d="${a.d}"/>`;
    else if (tag === "rect") parts += `<rect x="${a.x}" y="${a.y}" width="${a.width}" height="${a.height}" rx="${a.rx || 0}"/>`;
    else if (tag === "circle") parts += `<circle cx="${a.cx}" cy="${a.cy}" r="${a.r}"/>`;
    else if (tag === "line") parts += `<line x1="${a.x1}" y1="${a.y1}" x2="${a.x2}" y2="${a.y2}"/>`;
    else if (tag === "polyline") parts += `<polyline points="${a.points}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${hex}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${parts}</svg>`;
}

function setIconColor(node, hex) {
  const p = solid(hex);
  const targets = node.findAll((n) => "strokes" in n);
  for (const t of targets) {
    try {
      if (t.strokes && t.strokes.length) t.strokes = [p];
    } catch (e) {}
  }
}

// Build a 16x16 icon component from lucide data.
function makeIconComponent(name) {
  const f = figma.createNodeFromSvg(iconSvg(name, FG));
  f.name = "vector";
  f.rescale(16 / f.height);
  const c = figma.createComponent();
  c.name = "icon / " + name;
  c.clipsContent = false;
  c.resize(16, 16);
  c.fills = [];
  c.appendChild(f);
  f.x = 0;
  f.y = 0;
  return c;
}

const ICONS = {};

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------
function makeNavItemVariant(state) {
  const fg = state === "Active" ? ACTIVE_FG : FG;
  const c = figma.createComponent();
  c.name = "State=" + state;
  c.layoutMode = "HORIZONTAL";
  c.primaryAxisSizingMode = "FIXED";
  c.counterAxisSizingMode = "FIXED";
  c.resize(240, 32); // h-8, full menu width
  c.counterAxisAlignItems = "CENTER";
  c.primaryAxisAlignItems = "MIN";
  c.paddingLeft = 8;
  c.paddingRight = 8;
  c.itemSpacing = 8; // gap-2
  c.cornerRadius = RADIUS;
  c.fills = state === "Active" ? [solid(ACTIVE_BG)] : [];
  if (state === "Disabled") c.opacity = 0.5;

  const icon = ICONS["layout-dashboard"].createInstance();
  setIconColor(icon, fg);
  const lbl = text("Menu item", 14, state === "Active" ? "semibold" : "regular", fg);
  c.appendChild(icon);
  c.appendChild(lbl);
  return c;
}

function makeSectionLabel() {
  const c = figma.createComponent();
  c.name = "Section Label";
  c.layoutMode = "HORIZONTAL";
  c.primaryAxisSizingMode = "AUTO";
  c.counterAxisSizingMode = "AUTO";
  c.counterAxisAlignItems = "CENTER";
  c.itemSpacing = 8;
  c.paddingBottom = 4; // mb-1
  c.fills = [];

  const chip = figma.createFrame();
  chip.name = "chip";
  chip.layoutMode = "HORIZONTAL";
  chip.primaryAxisSizingMode = "AUTO";
  chip.counterAxisSizingMode = "AUTO";
  chip.counterAxisAlignItems = "CENTER";
  chip.paddingLeft = 8;
  chip.paddingRight = 8;
  chip.paddingTop = 2;
  chip.paddingBottom = 2;
  chip.cornerRadius = RADIUS;
  chip.fills = [solid(MUTED, 0.1)]; // bg-muted-foreground/10
  chip.appendChild(text("Section", 12, "regular", MUTED));

  const sep = figma.createRectangle();
  sep.name = "separator";
  sep.resize(40, 1);
  sep.fills = [solid(BORDER)];

  c.appendChild(chip);
  c.appendChild(sep);
  return c;
}

function makeNavUser() {
  const c = figma.createComponent();
  c.name = "Nav User";
  c.layoutMode = "HORIZONTAL";
  c.primaryAxisSizingMode = "FIXED";
  c.counterAxisSizingMode = "FIXED";
  c.resize(240, 48); // size lg = h-12
  c.counterAxisAlignItems = "CENTER";
  c.paddingLeft = 8;
  c.paddingRight = 8;
  c.itemSpacing = 8;
  c.cornerRadius = RADIUS;
  c.fills = [];

  const av = figma.createFrame();
  av.name = "avatar";
  av.resize(32, 32);
  av.cornerRadius = 8; // rounded-lg
  av.fills = [solid("#2f2f2f")];
  av.layoutMode = "HORIZONTAL";
  av.primaryAxisAlignItems = "CENTER";
  av.counterAxisAlignItems = "CENTER";
  av.appendChild(text("J", 13, "medium", FG));

  const col = figma.createFrame();
  col.name = "labels";
  col.layoutMode = "VERTICAL";
  col.primaryAxisSizingMode = "AUTO";
  col.counterAxisSizingMode = "AUTO";
  col.itemSpacing = 1;
  col.fills = [];
  col.appendChild(text("jourdain", 14, "medium", FG));
  col.appendChild(text("agirton@intradark.com", 12, "regular", MUTED));

  const ch = ICONS["chevrons-right"].createInstance();
  setIconColor(ch, MUTED);
  ch.opacity = 0.5;

  c.appendChild(av);
  c.appendChild(col);
  c.appendChild(ch);
  col.layoutGrow = 1; // push chevron to the right
  return c;
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------
let navDefault, navActive, sectionLabelComp, navUserComp;

function navRow(label, iconName, active) {
  const inst = (active ? navActive : navDefault).createInstance();
  inst.name = "Nav Item / " + label;
  inst.layoutAlign = "STRETCH";
  const t = inst.findOne((n) => n.type === "TEXT");
  if (t) t.characters = label;
  const ic = inst.findOne((n) => n.type === "INSTANCE");
  if (ic) {
    try {
      ic.swapComponent(ICONS[iconName]);
    } catch (e) {}
    setIconColor(ic, active ? ACTIVE_FG : FG);
  }
  return inst;
}

function buildGroup(title, items) {
  const g = figma.createFrame();
  g.name = "Group / " + title;
  g.layoutMode = "VERTICAL";
  g.primaryAxisSizingMode = "AUTO";
  g.counterAxisSizingMode = "FIXED";
  g.layoutAlign = "STRETCH";
  g.paddingLeft = 8;
  g.paddingRight = 8;
  g.paddingTop = 8;
  g.paddingBottom = 8;
  g.itemSpacing = 0; // gap-0
  g.fills = [];

  const sl = sectionLabelComp.createInstance();
  const slt = sl.findOne((n) => n.type === "TEXT");
  if (slt) slt.characters = title;
  sl.layoutAlign = "MIN"; // max-w-fit, do not stretch
  g.appendChild(sl);

  const menu = figma.createFrame();
  menu.name = "Menu";
  menu.layoutMode = "VERTICAL";
  menu.primaryAxisSizingMode = "AUTO";
  menu.counterAxisSizingMode = "FIXED";
  menu.layoutAlign = "STRETCH";
  menu.itemSpacing = 4; // gap-1
  menu.fills = [];
  for (const it of items) menu.appendChild(navRow(it.label, it.icon, it.active));
  g.appendChild(menu);
  return g;
}

async function main() {
  await pickFonts();

  // 1. Icon components
  for (const name of Object.keys(ICON_DATA)) ICONS[name] = makeIconComponent(name);

  // 2. Reusable components
  navDefault = makeNavItemVariant("Default");
  navActive = makeNavItemVariant("Active");
  const navDisabled = makeNavItemVariant("Disabled");
  const navSet = figma.combineAsVariants([navDefault, navActive, navDisabled], figma.currentPage);
  navSet.name = "Nav Item";
  navSet.layoutMode = "VERTICAL";
  navSet.itemSpacing = 12;
  navSet.paddingTop = navSet.paddingBottom = navSet.paddingLeft = navSet.paddingRight = 16;
  navSet.fills = [solid(SIDEBAR_BG)];

  sectionLabelComp = makeSectionLabel();
  navUserComp = makeNavUser();

  // 3. Assembled sidebar
  const sidebar = figma.createFrame();
  sidebar.name = "Intradark / App Sidebar";
  sidebar.resize(256, 932);
  sidebar.layoutMode = "VERTICAL";
  sidebar.primaryAxisSizingMode = "FIXED";
  sidebar.counterAxisSizingMode = "FIXED";
  sidebar.primaryAxisAlignItems = "SPACE_BETWEEN";
  sidebar.itemSpacing = 0;
  sidebar.fills = [solid(SIDEBAR_BG)];

  const top = figma.createFrame();
  top.name = "Top";
  top.layoutMode = "VERTICAL";
  top.primaryAxisSizingMode = "AUTO";
  top.counterAxisSizingMode = "FIXED";
  top.layoutAlign = "STRETCH";
  top.itemSpacing = 8;
  top.fills = [];

  // Header + logo
  const header = figma.createFrame();
  header.name = "Header";
  header.layoutMode = "VERTICAL";
  header.primaryAxisSizingMode = "AUTO";
  header.counterAxisSizingMode = "FIXED";
  header.layoutAlign = "STRETCH";
  header.paddingLeft = 8;
  header.paddingRight = 8;
  header.paddingTop = 8;
  header.paddingBottom = 16; // p-2 + mb-2
  header.fills = [];

  const logoRow = figma.createFrame();
  logoRow.name = "Logo";
  logoRow.layoutMode = "HORIZONTAL";
  logoRow.primaryAxisSizingMode = "FIXED";
  logoRow.counterAxisSizingMode = "AUTO";
  logoRow.layoutAlign = "STRETCH";
  logoRow.primaryAxisAlignItems = "CENTER";
  logoRow.counterAxisAlignItems = "CENTER";
  logoRow.itemSpacing = 4; // gap-1
  logoRow.paddingTop = 16;
  logoRow.paddingBottom = 16; // my-4
  logoRow.fills = [];

  const sym = figma.createNodeFromSvg(SYMBOL_SVG);
  sym.name = "intradark-symbol";
  sym.rescale(12 / sym.height); // h-3
  const wm = figma.createNodeFromSvg(WORDMARK_SVG);
  wm.name = "intradark-wordmark";
  wm.rescale(16 / wm.height); // h-4
  logoRow.appendChild(sym);
  logoRow.appendChild(wm);
  header.appendChild(logoRow);

  // Content
  const content = figma.createFrame();
  content.name = "Content";
  content.layoutMode = "VERTICAL";
  content.primaryAxisSizingMode = "AUTO";
  content.counterAxisSizingMode = "FIXED";
  content.layoutAlign = "STRETCH";
  content.itemSpacing = 8;
  content.fills = [];
  content.appendChild(
    buildGroup("Platform", [
      { label: "Admin", icon: "shield" },
      { label: "Play", icon: "play" },
      { label: "Dashboard", icon: "layout-dashboard", active: true },
    ]),
  );
  content.appendChild(
    buildGroup("Community", [
      { label: "News", icon: "newspaper" },
      { label: "Forums", icon: "message-square" },
      { label: "Media", icon: "film" },
    ]),
  );
  content.appendChild(
    buildGroup("Competitive", [
      { label: "Teams", icon: "users" },
      { label: "Players", icon: "user-round" },
      { label: "Scrims", icon: "swords" },
      { label: "Tournaments", icon: "calendar-days" },
      { label: "Leaderboards", icon: "medal" },
    ]),
  );
  content.appendChild(
    buildGroup("Knowledge", [
      { label: "Theory", icon: "book-open" },
      { label: "Utility", icon: "wrench" },
    ]),
  );

  top.appendChild(header);
  top.appendChild(content);

  // Footer
  const footer = figma.createFrame();
  footer.name = "Footer";
  footer.layoutMode = "VERTICAL";
  footer.primaryAxisSizingMode = "AUTO";
  footer.counterAxisSizingMode = "FIXED";
  footer.layoutAlign = "STRETCH";
  footer.paddingLeft = 8;
  footer.paddingRight = 8;
  footer.paddingTop = 8;
  footer.paddingBottom = 8;
  footer.fills = [];
  const nu = navUserComp.createInstance();
  nu.layoutAlign = "STRETCH";
  footer.appendChild(nu);

  sidebar.appendChild(top);
  sidebar.appendChild(footer);

  // 4. Lay out artifacts on the canvas (don't disturb existing content)
  sidebar.x = 0;
  sidebar.y = 0;
  navSet.x = 360;
  navSet.y = 0;
  sectionLabelComp.x = 360;
  sectionLabelComp.y = 220;
  navUserComp.x = 360;
  navUserComp.y = 300;
  // icon components in a tidy grid
  const iconNames = Object.keys(ICONS);
  iconNames.forEach((n, i) => {
    ICONS[n].x = 360 + (i % 7) * 28;
    ICONS[n].y = 380 + Math.floor(i / 7) * 28;
  });

  figma.currentPage.selection = [sidebar];
  figma.viewport.scrollAndZoomIntoView([sidebar, navSet]);
  figma.notify("✅ Intradark sidebar built (font: " + FONT.fam + ")");
  figma.closePlugin();
}

main().catch((e) => {
  figma.notify("Error: " + (e && e.message ? e.message : String(e)), { error: true });
  figma.closePlugin();
});
