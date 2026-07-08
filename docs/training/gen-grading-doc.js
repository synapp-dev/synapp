const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, LevelFormat, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageBreak, Footer, PageNumber,
  TabStopType, TabStopPosition,
} = require("docx");
const fs = require("fs");

const CONTENT_W = 9360; // US Letter, 1" margins
const NAVY = "1F3864";
const BLUE = "2E75B6";
const LIGHT = "DDEBF7";
const GREY = "F2F2F2";
const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: "BFBFBF" };
const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };
const M = { top: 50, bottom: 50, left: 110, right: 110 };

// tier colour for the level number cell
const TIER = ["F4CCCC", "FCE4E4", "FFF2CC", "E2EFDA", "D9EAD3", "B6D7A8"];

function h1(text) { return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] }); }
function h2(text) { return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] }); }
function p(text, opts = {}) {
  return new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text, ...opts })] });
}
function bullet(text, bold) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 }, spacing: { after: 40 },
    children: bold ? [new TextRun({ text: bold, bold: true }), new TextRun({ text })] : [new TextRun({ text })],
  });
}
function cell(content, { w, fill, bold, color, align, size } = {}) {
  const paras = Array.isArray(content) ? content : [content];
  return new TableCell({
    borders, width: { size: w, type: WidthType.DXA }, margins: M,
    shading: fill ? { fill, type: ShadingType.CLEAR } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    children: paras.map((t) =>
      typeof t === "string"
        ? new Paragraph({ alignment: align, children: [new TextRun({ text: t, bold, color, size })] })
        : t),
  });
}
function headerRow(labels, widths) {
  return new TableRow({
    tableHeader: true,
    children: labels.map((l, i) => cell(l, { w: widths[i], fill: NAVY, bold: true, color: "FFFFFF" })),
  });
}

// ---- one task: title line with score box + 0–5 rubric table ----
function taskBlock(code, title, levels) {
  const out = [];
  out.push(new Paragraph({
    spacing: { before: 160, after: 60 },
    tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
    children: [
      new TextRun({ text: `${code}  ${title}`, bold: true, size: 22, color: NAVY }),
      new TextRun({ text: "\tScore: ____ / 5", bold: true, size: 22, color: BLUE }),
    ],
  }));
  const widths = [560, CONTENT_W - 560];
  out.push(new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: widths,
    rows: levels.map((desc, lvl) =>
      new TableRow({
        children: [
          cell(String(lvl), { w: widths[0], fill: TIER[lvl], bold: true, align: AlignmentType.CENTER, size: 22 }),
          cell(desc, { w: widths[1] }),
        ],
      })),
  }));
  return out;
}

function subtotal(label, max) {
  const w = [CONTENT_W - 2000, 2000];
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: w,
    rows: [new TableRow({
      children: [
        cell(label, { w: w[0], fill: LIGHT, bold: true }),
        cell(`____ / ${max}`, { w: w[1], fill: LIGHT, bold: true, align: AlignmentType.CENTER }),
      ],
    })],
  });
}

// ===================== DATA =====================
const PHASES = [
  { id: "A", name: "Phase A — Application foundation", tasks: [
    ["A1", "Local setup & run from README", [
      "Won't start, or there are no instructions to run it.",
      "Starts only after undocumented fiddling; README is incomplete.",
      "Clones and runs from the documented steps; instructions are plain but correct.",
      "Smooth setup with helper scripts and sensible defaults; minor assumptions noted.",
      "One-command setup, clear prerequisites and troubleshooting notes; tested on a clean machine.",
      "Effortless onboarding — seed data, sample accounts, copy-paste commands; a stranger is running in minutes.",
    ]],
    ["A2", "Secrets & environment management", [
      "Secrets committed to the repo, or no env handling at all.",
      "Uses env vars but no example file; unclear which are required.",
      "Real env ignored + .env.example with placeholders; the basics are covered.",
      "Example file is documented and grouped, with a comment on each variable.",
      "Config validated at boot (fails fast with a clear message); public vs secret keys correctly separated.",
      "Typed/validated config layer, documented per environment, zero chance of leaking the service key client-side.",
    ]],
    ["A3", "Site shell & navigation", [
      "Default create-next-app starter page, or nothing.",
      "A page exists but there's no real layout or navigation.",
      "Working header/nav layout; plain styling.",
      "Consistent shell with active states, branding and a responsive nav.",
      "Polished, accessible nav (keyboard/focus) with a considered information hierarchy.",
      "Commercial-grade shell — cohesive design system, transitions, dark mode; feels like a product.",
    ]],
    ["A4", "Folder structure & composition", [
      "Everything dumped in one place.",
      "Some structure, but business logic is scattered across pages.",
      "Top-level folders match the guide; reasonable separation of concerns.",
      "Domain code grouped under entities/matchmaking; pages stay thin.",
      "Clear, consistent conventions throughout; anything is easy to find.",
      "Exemplary architecture — clean module boundaries, no server logic leaking into the client, scales well.",
    ]],
    ["A5", "Git history & Conventional Commits", [
      "A single 'initial commit' dump, or secrets present in history.",
      "Many commits but vague messages (wip, fix stuff).",
      "Mostly Conventional Commits with reasonable granularity.",
      "Consistent Conventional Commits, one logical change each, tied to phases.",
      "Clean, readable history with meaningful scopes; the build story is easy to follow.",
      "Exemplary history — atomic commits with useful bodies; you could onboard a dev from the log alone.",
    ]],
  ]},
  { id: "B", name: "Phase B — Accounts, Steam & access", tasks: [
    ["B1", "Create an account (registration)", [
      "The process doesn't work.",
      "Works in theory but not a full loop (e.g. email verification on create isn't handled properly).",
      "Everything works, but feels very boilerplate.",
      "Works properly end to end with some UX polish.",
      "Proper input criteria with client- and server-side validation; rejects bad / foreign-character input.",
      "Commercial-grade flow — icons, show/hide password, custom input fields and helpful inline messages.",
    ]],
    ["B2", "Sign in / sign out", [
      "Broken — can't reliably sign in or out.",
      "Works once but the session is flaky (lost on refresh, no proper sign-out).",
      "Reliable sign in/out; session persists; plain.",
      "Redirects sensibly, remembers the intended destination, clear signed-in state.",
      "Graceful error handling (wrong password, rate limits), loading states, no flashes of the wrong UI.",
      "Seamless session UX — silent refresh, polished error copy, remember-me; feels commercial.",
    ]],
    ["B3", "Steam linking (OpenID)", [
      "Not implemented, or broken.",
      "Redirects to Steam but linking doesn't reliably complete or persist.",
      "Links once and is stored; functional but bare.",
      "Clear connect/disconnect flow with an obvious connected state.",
      "Robust against re-link edge cases; handles the OpenID return securely and validates ownership.",
      "Polished linking — Steam branding, status badges, graceful failure handling, relink/unlink.",
    ]],
    ["B4", "Steam identity captured & displayed (alias + avatar)", [
      "Not captured.",
      "Captured but not shown, or re-fetched live on every render.",
      "Alias + avatar stored at link time and shown in matches; plain.",
      "Shown consistently across match screens, with fallbacks for missing data.",
      "Cached sensibly with a refresh strategy; handles long names / missing avatars cleanly.",
      "Polished identity throughout — avatars, alias styling; signup name never leaks anywhere.",
    ]],
    ["B5", "Access control (guest / no-Steam / full)", [
      "No gating — anyone can do anything.",
      "UI hides options but the server doesn't enforce them (bypassable).",
      "Guests view-only, no-Steam blocked, enforced server-side; plain messaging.",
      "Clear, friendly prompts explaining what's required (e.g. 'link Steam to queue').",
      "Enforced at every layer (route, API, RLS), consistent and tested across cases.",
      "Seamless, guided gating — contextual CTAs, no dead ends; feels designed, not bolted on.",
    ]],
  ]},
  { id: "C", name: "Phase C — Data & security", tasks: [
    ["C1", "Schema & migrations (build from scratch)", [
      "No migrations, or the DB can't be recreated.",
      "Partial migrations; manual SQL needed to get it working.",
      "A fresh DB builds from migrations and covers the core entities.",
      "Well-ordered migrations with sensible constraints/indexes and clean naming.",
      "Normalised, thoughtful FKs and enums; repeatable and documented.",
      "Exemplary schema — constraints enforce the rules, performance considered, a pleasure to read.",
    ]],
    ["C2", "Map pool seeding", [
      "No maps.",
      "Maps hard-coded somewhere, not seeded.",
      "Map pool seeded via migration/seed; functional.",
      "Seed includes proper map data (names, images) and is easy to re-run.",
      "Realistic CS2 map pool with metadata; re-runnable seed.",
      "Polished — active-duty pool, art assets, easily configurable for testing.",
    ]],
    ["C3", "Entity documentation / diagram", [
      "None.",
      "A sentence or two; incomplete.",
      "README section listing the main entities and relationships.",
      "A clear diagram (ERD / mermaid) plus explanation.",
      "Accurate, complete diagram with cardinalities and notes on key decisions.",
      "Excellent docs — diagram plus rationale; would orient a new dev instantly.",
    ]],
    ["C4", "Row-level security", [
      "RLS off, or the table is fully open to the client.",
      "RLS on some tables but gaps remain; outcomes are still tamperable.",
      "RLS protects match/queue outcomes from client tampering; basic policies.",
      "Considered policies per table (read vs write); service role used server-side only.",
      "Comprehensive, tested policies with least privilege; can demonstrate an attack is blocked.",
      "Airtight, well-documented security model; policies are clear, minimal and provably correct.",
    ]],
  ]},
  { id: "D", name: "Phase D — Server-side matchmaking logic", tasks: [
    ["D1", "Join / leave queue", [
      "Broken.",
      "Can join but leave is flaky, or queue state gets stuck.",
      "Join/leave work and persist server-side; plain.",
      "Reflects the count, prevents double-join, clean leave with feedback.",
      "Validated and race-safe; handles disconnect/abandon; clear server responses.",
      "Robust and polished — instant feedback, every edge handled; production-grade.",
    ]],
    ["D2", "Match creation at configurable count", [
      "Doesn't create matches.",
      "Creates them, but the count is hard-coded or sometimes the wrong number.",
      "Auto-creates at a configurable required count; works.",
      "Config is clean (env/setting) and the threshold fires reliably.",
      "Atomic/transactional creation, race-safe when many join at once; no duplicate/partial matches.",
      "Bulletproof — provably no race, clean selection logic, easily tuned, well tested.",
    ]],
    ["D3", "Accept / decline handling", [
      "Broken.",
      "Accept works but decline strands players or leaves stale matches.",
      "Both work and affected players are returned sensibly; plain.",
      "Clear consequences (re-queue others, cancel match) with good feedback.",
      "Handles timeouts and partial accepts; no stuck states; fully validated.",
      "Polished accept phase — graceful for everyone; no edge case strands a player.",
    ]],
    ["D4", "Team formation / balancing", [
      "No teams formed.",
      "Teams formed but arbitrary or buggy.",
      "Two teams formed and persisted on full accept; random split.",
      "Sensible balancing heuristic, or a documented fallback if there are no ratings.",
      "Skill-aware balancing with a justified algorithm; handles odd cases.",
      "Thoughtful, demonstrably fair balancing; configurable and tested.",
    ]],
    ["D5", "Map veto logic (turn order)", [
      "No veto.",
      "Bans recorded but turn order isn't enforced.",
      "Veto runs down to one map and the server tracks turns; plain.",
      "Clear turn enforcement; rejects out-of-turn bans; ends with exactly one map.",
      "Fully validated (right captain, right stage); handles all ban sequences; no illegal states.",
      "Robust, well-modelled veto — provably correct turn logic with tested edge cases.",
    ]],
    ["D6", "Connect string issuance", [
      "Missing.",
      "Generated but not shared/consistent across players.",
      "One connect string stored per match, identical for all; placeholder is fine.",
      "Issued at the right stage and easy to retrieve.",
      "Validated and exposed only to participants; sensible format.",
      "Polished — copyable, per-match, secure access, with ready indicators.",
    ]],
    ["D7", "Request validation & authorization", [
      "None — the server trusts the client entirely.",
      "Some checks, but easily bypassed (e.g. trusts the body for identity).",
      "Validates inputs (Zod) and checks the actor is in the match; plain.",
      "Rejects wrong player / wrong stage with clear errors.",
      "Comprehensive guards on every action; consistent error shapes; identity from the session, not the body.",
      "Exemplary — every endpoint validated and authorized; impossible to act out of turn or on another's behalf.",
    ]],
    ["D8", "Active-match guard (one match at a time)", [
      "No guard — you can queue while already in a match.",
      "UI hides the queue but the server still allows it.",
      "Server rejects queueing while in an active match; plain.",
      "Clear message; cleanly defines active vs finished.",
      "Enforced everywhere; handles cancelled/abandoned matches correctly.",
      "Bulletproof — no path to double-queue; crash-mid-match edge cases handled.",
    ]],
    ["D9", "Single source of truth / state machine", [
      "State is guessed per-browser; no server authority.",
      "Server stores state but transitions are ad-hoc and inconsistent.",
      "Backend is authoritative for the stage; clients read from it.",
      "Explicit status enum with guarded transitions.",
      "Proper state machine; illegal transitions rejected; 'who is here + what stage' is queryable.",
      "Clean, well-modelled lifecycle — provably consistent, easy to reason about and extend.",
    ]],
  ]},
  { id: "E", name: "Phase E — Live updates", tasks: [
    ["E1", "Queue live updates", [
      "No live updates.",
      "Updates only on manual refresh, or a polling hack.",
      "Queue count updates across browsers without refresh; works.",
      "Smooth updates, subscribed with filters, low latency.",
      "Efficient subscriptions; handles join/leave cleanly; no flicker.",
      "Polished realtime — instant, animated counts; scales sensibly.",
    ]],
    ["E2", "Match-found push to accept", [
      "Doesn't happen without a reload.",
      "Sometimes pushes, but unreliable.",
      "All participants reach the accept step without a reload; works.",
      "Reliable, prompt transition with clear feedback.",
      "Handles missed events and reconnect; no one is left behind.",
      "Seamless — everyone lands on accept instantly; robust to flaky networks.",
    ]],
    ["E3", "Veto live updates", [
      "Not live.",
      "Updates but laggy or inconsistent between players.",
      "Bans appear for the others without a reload; works.",
      "Turn indicator updates live; smooth.",
      "Consistent across all clients; handles concurrent actions.",
      "Polished — instant, animated; never desyncs.",
    ]],
    ["E4", "Reconnect resilience", [
      "Drops state on disconnect; the UI breaks.",
      "Recovers only with a manual refresh.",
      "Re-subscribes on reconnect and re-reads state.",
      "Reconciles the UI with authoritative DB state automatically.",
      "Handles network drops gracefully with indicators; no drift.",
      "Bulletproof — invisible recovery, always consistent with server truth.",
    ]],
  ]},
  { id: "F", name: "Phase F — Player-facing screens & flow", tasks: [
    ["F1", "Play / hub screen", [
      "Missing or broken.",
      "A join button only, with no status.",
      "Join/leave plus a searching count; plain.",
      "Clear states, friendly layout; shows an active match if there is one.",
      "Polished hub that handles all entry states; responsive.",
      "Commercial-grade landing — stats, CTAs, delightful.",
    ]],
    ["F2", "Searching screen", [
      "None.",
      "A static 'searching' label with no feedback.",
      "Shows it's searching plus a count; plain.",
      "Timer/animation and a cancel option.",
      "Engaging waiting UX — elapsed time, clear cancel.",
      "Polished — animations, estimated wait; feels alive.",
    ]],
    ["F3", "Match found / accept (with timer)", [
      "Missing.",
      "Accept works but there's no timer or roster.",
      "~30s timer, accept/decline, shows who accepted (alias + avatar); plain.",
      "Clear countdown, live accept ticks, good feedback.",
      "Tense, polished accept UX; handles decline gracefully.",
      "Faceit-grade — animated, audio/visual cues; commercial feel.",
    ]],
    ["F4", "Lobby screen", [
      "Missing.",
      "Shows players but no teams, or uses signup names.",
      "Two teams; player cards with Steam alias + avatar; plain.",
      "Clean team layout, captain indicators, transitions to veto.",
      "Polished cards with roles; responsive; considered hierarchy.",
      "Commercial-grade lobby — animations, team branding, delightful.",
    ]],
    ["F5", "Veto screen", [
      "Missing.",
      "Can ban but the turn order is unclear or confusing.",
      "Map pool, turn order, banned vs remaining all clear; plain.",
      "Obvious whose turn it is; smooth ban interaction.",
      "Polished, animated bans; clear state; accessible.",
      "Faceit-grade veto — map art, animations, commercial polish.",
    ]],
    ["F6", "Server / connect screen", [
      "Missing.",
      "Shows a string but it's hard to use or copy.",
      "Connect string easy to copy; plain.",
      "Copy button and an optional ready indicator.",
      "Polished — per-player ready state, clear instructions.",
      "Commercial-grade — one-click copy, status, animations.",
    ]],
    ["F7", "Result screen", [
      "Missing.",
      "Shows nothing meaningful, or is a dead end.",
      "Simple outcome plus play-again; plain.",
      "Clear result and a path back to play.",
      "Polished summary with stats; smooth loop back.",
      "Commercial-grade — match summary, scoreboard, delight.",
    ]],
    ["F8", "Active-match restore on re-login", [
      "Returns the user to a blank hub with queue enabled.",
      "Restores only via localStorage, unreliably.",
      "Server lookup returns the user to the live match at the correct phase; works.",
      "Reliable across all phases; smooth.",
      "Robust to crashes and multiple devices; always the correct phase.",
      "Seamless — instant restore, no flicker; feels magical.",
    ]],
    ["F9", "Wrong-step redirect", [
      "Lets users sit on the wrong screen for the current state.",
      "Manual links only; easily broken.",
      "Redirects to the correct step based on state; works.",
      "Consistent guards on all match routes.",
      "Robust, deep-link safe, with no flash of the wrong screen.",
      "Bulletproof routing — always the right screen, with polished transitions.",
    ]],
    ["F10", "Responsive / mobile", [
      "Unusable at phone width.",
      "Works but layouts break at small sizes.",
      "Usable at phone width; plain.",
      "Considered responsive layouts throughout.",
      "Polished, touch-friendly mobile experience.",
      "Commercial-grade responsive — looks designed for mobile too.",
    ]],
  ]},
  { id: "G", name: "Phase G — Experience polish", tasks: [
    ["G1", "README / demo reproducibility", [
      "A reviewer can't reproduce a flow.",
      "Vague instructions with missing steps.",
      "README lets a reviewer run a full multi-account flow; plain.",
      "Step-by-step with test accounts, in about twenty minutes.",
      "Clear, tested walkthrough with screenshots and tips.",
      "Excellent — anyone reproduces the full demo effortlessly.",
    ]],
    ["G2", "Error & empty states", [
      "Crashes, or shows raw stack traces.",
      "Generic errors; developer jargon leaks through.",
      "Errors handled with plain messages.",
      "Friendly, product-quality copy in the key flows.",
      "Consistent, helpful errors and empty states throughout.",
      "Commercial-grade copy everywhere — guides the user, never a dead end.",
    ]],
    ["G3", "Stale-match cleanup UI", [
      "Leftover 'in a match' UI after cancel/finish.",
      "Sometimes clears; inconsistent.",
      "No stale match UI after cancel/finish; works.",
      "Clean transitions back to the hub.",
      "Robust across all end paths; no confusion.",
      "Flawless — state always reflects reality; polished.",
    ]],
  ]},
  { id: "H", name: "Phase H — Reliability & delivery", tasks: [
    ["H1", "Automated tests", [
      "None.",
      "A token test that doesn't cover real rules.",
      "At least three tests on real rules (veto order, team split, illegal transitions); they pass.",
      "Meaningful coverage of core logic with clear test names.",
      "Thorough tests including edge cases; run in CI or documented.",
      "Excellent suite — covers races, security and rules; fast and trustworthy.",
    ]],
    ["H2", "Strict typing", [
      "any everywhere, or type errors.",
      "Loose typing; frequent any / @ts-ignore.",
      "Strict mode on; mostly typed.",
      "Well-typed domain models with few escapes.",
      "Strong end-to-end types (DB to API to UI), Zod-inferred.",
      "Exemplary type safety — impossible states are unrepresentable.",
    ]],
    ["H3", "Deployment / live URL", [
      "Not deployed, with no explanation.",
      "Broken deploy, or only partly works.",
      "Live URL works, or the README justifies skipping it; functional.",
      "Deployed and stable with env configured.",
      "Clean production setup on hosted Supabase; works for a demo.",
      "Polished production deploy — custom domain, fast, demo-ready.",
    ]],
  ]},
];

// ===================== BUILD =====================
const children = [];

children.push(
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 },
    children: [new TextRun({ text: "CS2 Matchmaking Capstone", bold: true, size: 44, color: NAVY })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 },
    children: [new TextRun({ text: "Build-Quality Grading Sheet (0–5 per task)", size: 26, color: BLUE })] })
);

const dW = [2340, 2340, 2340, 2340];
children.push(
  new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: dW, rows: [
    new TableRow({ children: [
      cell("Candidate", { w: dW[0], fill: LIGHT, bold: true }), cell("", { w: dW[1] }),
      cell("Date", { w: dW[2], fill: LIGHT, bold: true }), cell("", { w: dW[3] }),
    ]}),
    new TableRow({ children: [
      cell("Reviewer", { w: dW[0], fill: LIGHT, bold: true }), cell("", { w: dW[1] }),
      cell("Repo / URL", { w: dW[2], fill: LIGHT, bold: true }), cell("", { w: dW[3] }),
    ]}),
  ]}),
  new Paragraph({ spacing: { after: 200 }, children: [] })
);

// master scale
children.push(h1("The 0–5 scale"));
children.push(p("Every task below is scored on the same scale. Pick the highest level the work fully reaches — if it half-meets a level, it hasn't reached it. A task that wasn't attempted scores 0."));
const sW = [620, 2200, CONTENT_W - 2820];
children.push(new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: sW, rows: [
  headerRow(["", "Level", "What it means"], sW),
  ...[
    ["Broken / missing", "Doesn't function, or isn't there."],
    ["Bare minimum, clunky", "Works in theory but not a full loop; rough edges and gaps."],
    ["Clean baseline", "Front and back both work end to end, but it's plain / boilerplate."],
    ["Exceeds slightly", "Proper end to end, plus extra functionality and some UX polish."],
    ["Extremely well made", "Clear care; robust client- and server-side validation; thoughtful experience."],
    ["A++ commercial grade", "Significantly exceeds expectations; polished, production-quality flow."],
  ].map((row, lvl) => new TableRow({ children: [
    cell(String(lvl), { w: sW[0], fill: TIER[lvl], bold: true, align: AlignmentType.CENTER, size: 22 }),
    cell(row[0], { w: sW[1], bold: true }),
    cell(row[1], { w: sW[2] }),
  ]})),
]}));
children.push(new Paragraph({ children: [new PageBreak()] }));

// brief
children.push(h1("The brief (read this to him)"));
children.push(p("“A client wants a Counter-Strike 2 matchmaking site in the spirit of Faceit. Players sign up, link Steam, queue, accept when a match is found, see teams in a lobby, veto maps, then get a server connect string and a result screen. You built it standalone: your own repo, your own Supabase, a deployable demo. Stack was fixed: Next.js, Supabase (Auth + Postgres + Realtime), shadcn/Tailwind, TypeScript, Zod, Vitest, Conventional Commits.”"));
children.push(p("The client's non-negotiables:", { bold: true }));
children.push(bullet("Default match size 2v2, but the required player count must be configurable for testing.", "Configurable size: "));
children.push(bullet("Guests can view live/finished matches but cannot queue. Queueing needs sign-in + Steam linked.", "Access rules: "));
children.push(bullet("The backend is the single source of truth for match state — every browser shows the same stage.", "Single source of truth: "));
children.push(bullet("In a live match, closing the browser and signing back in returns the player to the right step.", "Active match follows the player: "));
children.push(bullet("A player already in an active match cannot queue again until it ends.", "One match at a time: "));
children.push(bullet("Match screens show the Steam alias + avatar captured at link time — never the signup name.", "Steam identity: "));
children.push(new Paragraph({ children: [new PageBreak()] }));

// phases
let totalTasks = 0;
PHASES.forEach((ph, idx) => {
  children.push(h1(ph.name));
  ph.tasks.forEach(([code, title, levels]) => {
    taskBlock(code, title, levels).forEach((n) => children.push(n));
  });
  totalTasks += ph.tasks.length;
  children.push(new Paragraph({ spacing: { before: 120, after: 120 }, children: [] }));
  children.push(subtotal(`Phase ${ph.id} subtotal`, ph.tasks.length * 5));
  if (idx < PHASES.length - 1) children.push(new Paragraph({ children: [new PageBreak()] }));
});

// final
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(h1("Final score"));
children.push(p(`There are ${totalTasks} tasks. Add every task score for the total, then divide by the number of tasks that applied to get an average out of 5.`));
const fW = [CONTENT_W - 2600, 2600];
children.push(new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: fW, rows: [
  new TableRow({ children: [ cell("Total of all task scores", { w: fW[0], fill: LIGHT, bold: true }), cell(`____ / ${totalTasks * 5}`, { w: fW[1], align: AlignmentType.CENTER }) ]}),
  new TableRow({ children: [ cell("Tasks that applied", { w: fW[0], fill: LIGHT, bold: true }), cell(`____ / ${totalTasks}`, { w: fW[1], align: AlignmentType.CENTER }) ]}),
  new TableRow({ children: [ cell("Average score (out of 5)", { w: fW[0], fill: LIGHT, bold: true }), cell("____", { w: fW[1], align: AlignmentType.CENTER, bold: true }) ]}),
]}));
children.push(new Paragraph({ spacing: { after: 160 }, children: [] }));

children.push(h2("Grade bands"));
const bW = [1700, 2300, CONTENT_W - 4000];
children.push(new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: bW, rows: [
  headerRow(["Avg score", "Band", "Read"], bW),
  ...[
    ["4.5 – 5.0", "Exceptional", "Commercial-grade work with care and polish well beyond the brief. Hire-ready."],
    ["3.5 – 4.4", "Strong", "Solid, well-built throughout with real polish in places. Capstone passed comfortably."],
    ["2.5 – 3.4", "Competent", "Works end to end but plain, with shallow spots (often security / races / realtime). Pass with notes."],
    ["1.5 – 2.4", "Developing", "Partial and clunky; leans on patterns he can't fully stand behind. Needs rework before sign-off."],
    ["< 1.5", "Not yet", "Major tasks broken or missing. Not ready."],
  ].map((row, i) => new TableRow({ children: [
    cell(row[0], { w: bW[0], fill: i % 2 ? GREY : undefined, bold: true, align: AlignmentType.CENTER }),
    cell(row[1], { w: bW[1], fill: i % 2 ? GREY : undefined, bold: true }),
    cell(row[2], { w: bW[2], fill: i % 2 ? GREY : undefined }),
  ]})),
]}));
children.push(new Paragraph({ spacing: { after: 160 }, children: [] }));

children.push(h2("Auto-flags (raise regardless of score)"));
children.push(bullet("Secrets committed anywhere in git history — security fail."));
children.push(bullet("RLS disabled, or the service-role key reachable from the client — security fail."));
children.push(bullet("A single 'initial commit' dump instead of incremental history — process fail."));
children.push(bullet("Can't explain the data model or a security choice in conversation — fails the client's sign-off bar."));
children.push(bullet("Active-match restore via localStorage instead of server state — misunderstood the core requirement."));
children.push(new Paragraph({ spacing: { after: 160 }, children: [] }));

children.push(h2("Summary"));
const gW = [CONTENT_W / 2, CONTENT_W / 2];
children.push(new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: gW, rows: [
  new TableRow({ children: [
    cell("Three strengths", { w: gW[0], fill: NAVY, bold: true, color: "FFFFFF" }),
    cell("Three things to fix", { w: gW[1], fill: NAVY, bold: true, color: "FFFFFF" }),
  ]}),
  new TableRow({ children: [
    cell([new Paragraph("1."), new Paragraph("2."), new Paragraph("3.")], { w: gW[0] }),
    cell([new Paragraph("1."), new Paragraph("2."), new Paragraph("3.")], { w: gW[1] }),
  ]}),
]}));
children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
children.push(new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: gW, rows: [
  new TableRow({ children: [ cell("Final band", { w: gW[0], fill: LIGHT, bold: true }), cell("", { w: gW[1] }) ]}),
  new TableRow({ children: [ cell("Overall comments", { w: gW[0], fill: LIGHT, bold: true }), cell("", { w: gW[1] }) ]}),
]}));

// ===================== DOCUMENT =====================
const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 21 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, color: NAVY, font: "Arial" },
        paragraph: { spacing: { before: 200, after: 140 }, outlineLevel: 0,
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 4 } } } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, color: BLUE, font: "Arial" },
        paragraph: { spacing: { before: 180, after: 100 }, outlineLevel: 1 } },
    ],
  },
  numbering: { config: [ { reference: "bullets",
    levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 460, hanging: 280 } } } }] } ] },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 },
      margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    footers: { default: new Footer({ children: [ new Paragraph({ alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: "CS2 Capstone Grading Sheet  —  Page ", size: 16, color: "808080" }),
        new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "808080" }),
      ] }) ] }) },
    children,
  }],
});

Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(process.argv[2], buf); console.log("wrote", process.argv[2], "tasks:", totalTasks); });
