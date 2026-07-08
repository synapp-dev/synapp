// Intradark App Header -> Figma builder
// Faithful 1:1 recreation of apps/intradark/components/organisms/app-header.tsx
// (dark theme, resting state). Builds reusable components + an assembled frame.
// Run via: Plugins -> Development -> Import plugin from manifest -> run.

// ---------------------------------------------------------------------------
// Theme (dark) — converted from packages/ui/src/styles/globals.css OKLCH values
// ---------------------------------------------------------------------------
const BG = "#0a0a0a"; // --background           oklch(0.145 0 0)
const FG = "#fafafa"; // --foreground           oklch(0.985 0 0)
const MUTED = "#a1a1a1"; // --muted-foreground   oklch(0.708 0 0)
const MUTED_BG = "#262626"; // --muted             oklch(0.269 0 0)  (kbd bg)
const BORDER = "#262626"; // --border             oklch(0.269 0 0)
const INPUT = "#262626"; // --input  (outline btn bg = input/30 in dark)
const PRIMARY = "#fafafa"; // --primary (dark)    oklch(0.985 0 0)  (badge bg)
const PRIMARY_FG = "#171717"; // --primary-foreground oklch(0.205 0 0)
const RADIUS = 8; // rounded-md = radius(0.625rem=10px) - 2px = 8px

// ---------------------------------------------------------------------------
// Lucide icon node data (exact, lucide-react v0.575.0). 24x24, stroke-based.
// ---------------------------------------------------------------------------
const ICON_DATA = {
  "panel-left": [
    ["rect", { width: 18, height: 18, x: 3, y: 3, rx: 2 }],
    ["path", { d: "M9 3v18" }],
  ],
  "chevron-right": [["path", { d: "m9 18 6-6-6-6" }]],
  command: [
    ["path", { d: "M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" }],
  ],
  "user-round": [
    ["circle", { cx: 12, cy: 8, r: 5 }],
    ["path", { d: "M20 21a8 8 0 0 0-16 0" }],
  ],
  moon: [["path", { d: "M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" }]],
  sun: [
    ["circle", { cx: 12, cy: 12, r: 4 }],
    ["path", { d: "M12 2v2" }],
    ["path", { d: "M12 20v2" }],
    ["path", { d: "m4.93 4.93 1.41 1.41" }],
    ["path", { d: "m17.66 17.66 1.41 1.41" }],
    ["path", { d: "M2 12h2" }],
    ["path", { d: "M20 12h2" }],
    ["path", { d: "m6.34 17.66-1.41 1.41" }],
    ["path", { d: "m19.07 4.93-1.41 1.41" }],
  ],
};

// Brand symbol (fills inlined; Figma's SVG importer drops <style> class blocks).
const SYMBOL_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 23.64 20.47"><g><g><g><path fill="#4c9ccb" d="M10.34,7.68l4.43-2.56-1.48,2.56-1.48,2.56h-5.91l4.43-2.56Z"/><path fill="#4c9ccb" d="M13.3,2.56l4.43-2.56-1.48,2.56-1.48,2.56h-5.91l4.43-2.56Z"/><path fill="#4c9ccb" d="M4.43,7.68l4.43-2.56-1.48,2.56-1.48,2.56H0l4.43-2.56Z"/></g><g><path fill="#00497d" d="M10.34,12.8l-4.43-2.56h5.91l1.48,2.56,1.48,2.56-4.43-2.56Z"/><path fill="#00497d" d="M4.43,12.8L0,10.23h5.91l1.48,2.56,1.48,2.56-4.43-2.55Z"/><path fill="#00497d" d="M13.3,17.91l-4.43-2.56h5.91l1.48,2.56,1.48,2.56-4.43-2.56Z"/></g><g><path fill="#0483c8" d="M14.78,10.24v-5.12l-1.48,2.56-1.48,2.56,1.48,2.56,1.48,2.56v-5.12Z"/><path fill="#0483c8" d="M17.73,5.12V0l-1.48,2.56-1.48,2.56,1.48,2.56,1.48,2.56v-5.12Z"/><path fill="#0483c8" d="M17.73,15.36v-5.12l-1.48,2.56-1.48,2.56,1.48,2.56,1.48,2.56v-5.12Z"/></g><path fill="#4c9ccb" d="M5.91,15.36v-5.12l4.43,2.56,4.43,2.56-4.43,2.56-4.43,2.56v-5.12Z"/><path fill="#0483c8" d="M5.91,5.12V0l4.43,2.56,4.43,2.56-4.43,2.56-4.43,2.56v-5.12Z"/><path fill="#00497d" d="M14.78,10.24v-5.12l4.43,2.56,4.43,2.56-4.43,2.56-4.43,2.56v-5.12Z"/></g></g></svg>';

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

// Direct sized icon node (color baked into the SVG stroke).
function makeIcon(name, size, hex) {
  const f = figma.createNodeFromSvg(iconSvg(name, hex));
  f.name = name;
  f.rescale(size / f.height);
  return f;
}

function symbolNode(size) {
  const s = figma.createNodeFromSvg(SYMBOL_SVG);
  s.name = "intradark-symbol";
  s.rescale(size / s.height);
  return s;
}

// Apply an inside border (optionally dashed) to an auto-layout node.
function border(node, hex, dashed) {
  node.strokes = [solid(hex)];
  node.strokeWeight = 1;
  node.strokeAlign = "INSIDE";
  if (dashed) node.dashPattern = [4, 4];
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------
function makeSidebarTrigger() {
  // Ghost icon button, size-7 (28px), PanelLeft icon.
  const c = figma.createComponent();
  c.name = "Sidebar Trigger";
  c.layoutMode = "HORIZONTAL";
  c.primaryAxisSizingMode = "FIXED";
  c.counterAxisSizingMode = "FIXED";
  c.resize(28, 28);
  c.primaryAxisAlignItems = "CENTER";
  c.counterAxisAlignItems = "CENTER";
  c.cornerRadius = RADIUS;
  c.fills = []; // ghost = transparent
  c.appendChild(makeIcon("panel-left", 16, FG));
  return c;
}

function makeUploadsIndicator() {
  // Outline-dashed sm button: "Uploads" + count badge.
  const c = figma.createComponent();
  c.name = "Uploads Indicator";
  c.layoutMode = "HORIZONTAL";
  c.primaryAxisSizingMode = "AUTO";
  c.counterAxisSizingMode = "FIXED";
  c.resize(c.width, 32); // h-8
  c.counterAxisAlignItems = "CENTER";
  c.paddingLeft = 12;
  c.paddingRight = 12;
  c.itemSpacing = 6; // gap-1.5
  c.cornerRadius = RADIUS;
  c.fills = [solid(INPUT, 0.3)]; // dark:bg-input/30
  border(c, BORDER, true);

  c.appendChild(text("Uploads", 14, "medium", FG));

  const badge = figma.createFrame();
  badge.name = "badge";
  badge.layoutMode = "HORIZONTAL";
  badge.primaryAxisSizingMode = "FIXED";
  badge.counterAxisSizingMode = "FIXED";
  badge.resize(20, 20); // min-w-5, leading-5
  badge.primaryAxisAlignItems = "CENTER";
  badge.counterAxisAlignItems = "CENTER";
  badge.cornerRadius = 9999;
  badge.fills = [solid(PRIMARY)];
  badge.appendChild(text("2", 10, "medium", PRIMARY_FG));
  c.appendChild(badge);
  return c;
}

function makeCommandMenu() {
  // Outline default button, fixed 240px: icon + label + kbd (pushed right).
  const c = figma.createComponent();
  c.name = "Command Menu";
  c.layoutMode = "HORIZONTAL";
  c.primaryAxisSizingMode = "FIXED";
  c.counterAxisSizingMode = "FIXED";
  c.resize(240, 36); // w-[240px] h-9
  c.counterAxisAlignItems = "CENTER";
  c.paddingLeft = 12;
  c.paddingRight = 12;
  c.itemSpacing = 8; // gap-2
  c.cornerRadius = RADIUS;
  c.fills = [solid(INPUT, 0.3)];
  border(c, BORDER, false);

  c.appendChild(makeIcon("command", 16, MUTED));
  const lbl = text("Command Menu", 14, "medium", MUTED);
  c.appendChild(lbl);
  lbl.layoutGrow = 1; // ml-auto on kbd -> label fills, kbd to the right

  const kbd = figma.createFrame();
  kbd.name = "kbd";
  kbd.layoutMode = "HORIZONTAL";
  kbd.primaryAxisSizingMode = "AUTO";
  kbd.counterAxisSizingMode = "FIXED";
  kbd.resize(kbd.width, 20); // h-5
  kbd.counterAxisAlignItems = "CENTER";
  kbd.primaryAxisAlignItems = "CENTER";
  kbd.paddingLeft = 6;
  kbd.paddingRight = 6;
  kbd.cornerRadius = 4; // rounded
  kbd.fills = [solid(MUTED_BG)];
  border(kbd, BORDER, false);
  kbd.appendChild(text("Ctrl+K", 10, "medium", MUTED));
  c.appendChild(kbd);
  return c;
}

function makeThemeToggle() {
  // Outline icon button, size-9 (36px). Dark resting state shows the Moon.
  const c = figma.createComponent();
  c.name = "Theme Toggle";
  c.layoutMode = "HORIZONTAL";
  c.primaryAxisSizingMode = "FIXED";
  c.counterAxisSizingMode = "FIXED";
  c.resize(36, 36);
  c.primaryAxisAlignItems = "CENTER";
  c.counterAxisAlignItems = "CENTER";
  c.cornerRadius = RADIUS;
  c.fills = [solid(INPUT, 0.3)];
  border(c, BORDER, false);
  c.appendChild(makeIcon("moon", 19.2, FG)); // h-[1.2rem]
  return c;
}

// ---------------------------------------------------------------------------
// Breadcrumb (assembled frame — route-driven at runtime, shown illustratively)
// ---------------------------------------------------------------------------
function crumbItem(iconName, label, isPage) {
  const f = figma.createFrame();
  f.name = "Crumb / " + label;
  f.layoutMode = "HORIZONTAL";
  f.primaryAxisSizingMode = "AUTO";
  f.counterAxisSizingMode = "AUTO";
  f.counterAxisAlignItems = "CENTER";
  f.itemSpacing = 6; // gap-1.5
  f.fills = [];
  if (iconName) {
    const ic = makeIcon(iconName, 14, isPage ? FG : MUTED); // size-3.5
    ic.opacity = 0.8; // opacity-80
    f.appendChild(ic);
  }
  f.appendChild(text(label, 14, "regular", isPage ? FG : MUTED));
  return f;
}

function buildBreadcrumb() {
  const b = figma.createFrame();
  b.name = "Breadcrumb";
  b.layoutMode = "HORIZONTAL";
  b.primaryAxisSizingMode = "AUTO";
  b.counterAxisSizingMode = "AUTO";
  b.counterAxisAlignItems = "CENTER";
  b.itemSpacing = 6; // gap-1.5
  b.fills = [];

  // Home = spinning brand symbol (h-3 = 12px)
  const home = figma.createFrame();
  home.name = "Crumb / Home";
  home.layoutMode = "HORIZONTAL";
  home.primaryAxisSizingMode = "AUTO";
  home.counterAxisSizingMode = "AUTO";
  home.counterAxisAlignItems = "CENTER";
  home.fills = [];
  home.appendChild(symbolNode(12));
  b.appendChild(home);

  b.appendChild(makeIcon("chevron-right", 14, MUTED));
  b.appendChild(crumbItem("user-round", "Players", false));
  b.appendChild(makeIcon("chevron-right", 14, MUTED));
  b.appendChild(crumbItem(null, "proKID", true)); // current page
  return b;
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------
async function main() {
  await pickFonts();

  // 1. Reusable components
  const triggerComp = makeSidebarTrigger();
  const uploadsComp = makeUploadsIndicator();
  const commandComp = makeCommandMenu();
  const themeComp = makeThemeToggle();

  // 2. Assembled header (1280 x 64, h-16, sticky bg-background)
  const header = figma.createFrame();
  header.name = "Intradark / App Header";
  header.resize(1280, 64);
  header.layoutMode = "HORIZONTAL";
  header.primaryAxisSizingMode = "FIXED";
  header.counterAxisSizingMode = "FIXED";
  header.primaryAxisAlignItems = "SPACE_BETWEEN";
  header.counterAxisAlignItems = "CENTER";
  header.itemSpacing = 8;
  header.fills = [solid(BG)];

  // Left cluster
  const left = figma.createFrame();
  left.name = "Left";
  left.layoutMode = "HORIZONTAL";
  left.counterAxisSizingMode = "AUTO";
  left.counterAxisAlignItems = "CENTER";
  left.itemSpacing = 8; // gap-2
  left.paddingLeft = 16;
  left.paddingRight = 16;
  left.fills = [];
  left.layoutGrow = 1; // flex-1
  left.primaryAxisSizingMode = "FIXED";

  const trig = triggerComp.createInstance();
  left.appendChild(trig);

  const sep = figma.createRectangle();
  sep.name = "separator";
  sep.resize(1, 16); // w-px h-4
  sep.fills = [solid(BORDER)];
  left.appendChild(sep);

  left.appendChild(buildBreadcrumb());

  // Right cluster
  const right = figma.createFrame();
  right.name = "Right";
  right.layoutMode = "HORIZONTAL";
  right.primaryAxisSizingMode = "AUTO";
  right.counterAxisSizingMode = "AUTO";
  right.counterAxisAlignItems = "CENTER";
  right.itemSpacing = 8; // gap-2
  right.paddingLeft = 16;
  right.paddingRight = 16;
  right.fills = [];

  right.appendChild(uploadsComp.createInstance());
  right.appendChild(commandComp.createInstance());

  const dot = figma.createEllipse();
  dot.name = "dot";
  dot.resize(2, 2); // h-0.5 w-0.5
  dot.fills = [solid(MUTED)];
  right.appendChild(dot);

  right.appendChild(themeComp.createInstance());

  header.appendChild(left);
  header.appendChild(right);

  // 3. Lay out artifacts on the canvas (don't disturb existing content)
  header.x = 0;
  header.y = 0;
  const comps = [triggerComp, uploadsComp, commandComp, themeComp];
  let cx = 0;
  comps.forEach((cmp) => {
    cmp.x = cx;
    cmp.y = 120; // a tidy row beneath the assembled header
    cx += cmp.width + 24;
  });

  figma.currentPage.selection = [header];
  figma.viewport.scrollAndZoomIntoView([header, ...comps]);
  figma.notify("✅ Intradark header built (font: " + FONT.fam + ")");
  figma.closePlugin();
}

main().catch((e) => {
  figma.notify("Error: " + (e && e.message ? e.message : String(e)), { error: true });
  figma.closePlugin();
});
