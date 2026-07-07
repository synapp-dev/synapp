# -*- coding: utf-8 -*-
"""Generates full-bleed A4 cover images for the outgoing client documents.

Renders an HTML cover (dark ink, Intradark wordmark, teal/blue accent bar,
faint Merkaba geometry, document meta block) to PNG via headless Chrome at
2x scale, into scripts/assets/covers/. convert-handover-docs.py places the
PNG as a full-page image on page one of each .docx.
"""
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / "assets" / "covers"
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

WORDMARK_WHITE = """<svg class="wm" viewBox="0 0 234.83 39.18" xmlns="http://www.w3.org/2000/svg" fill="#ffffff"><path d="M0,3.15C0,1.37,1.37,0,3.15,0c1.68,0,3.05,1.37,3.05,3.15s-1.37,3.16-3.05,3.16c-1.78,0-3.15-1.37-3.15-3.16ZM.76,10.84h4.63v27.89H.76V10.84Z"/><path d="M32.41,22.95c0-5.7-3.1-8.6-7.79-8.6s-7.99,2.95-7.99,8.96v15.42h-4.63V10.84h4.63v3.97c1.83-2.9,5.19-4.48,8.96-4.48,6.46,0,11.4,3.97,11.4,11.96v16.44h-4.58v-15.78Z"/><path d="M44.32,14.66h-3.61v-3.82h3.61V3.82h4.63v7.02h7.28v3.82h-7.28v16.44c0,2.75,1.02,3.71,3.87,3.71h3.41v3.92h-4.17c-4.94,0-7.73-2.04-7.73-7.63V14.66Z"/><path d="M65.18,38.73h-4.63V10.84h4.63v4.53c1.58-3.1,4.58-5.04,9.01-5.04v4.78h-1.22c-4.43,0-7.79,1.98-7.79,8.45v15.16Z"/><path d="M89.76,10.38c5.19,0,8.75,2.65,10.38,5.55v-5.09h4.68v27.89h-4.68v-5.19c-1.68,3-5.29,5.65-10.43,5.65-7.43,0-13.18-5.85-13.18-14.5s5.75-14.3,13.23-14.3ZM90.68,14.4c-5.09,0-9.41,3.71-9.41,10.28s4.33,10.43,9.41,10.43,9.47-3.82,9.47-10.38-4.38-10.33-9.47-10.33Z"/><path d="M122.07,10.08c3.71,0,7.28,1.73,9.21,4.38V1.07h7.23v37.66h-7.23v-4.17c-1.68,2.6-4.83,4.63-9.26,4.63-7.18,0-12.88-5.85-12.88-14.66s5.7-14.45,12.93-14.45ZM123.85,16.33c-3.82,0-7.43,2.85-7.43,8.19s3.61,8.4,7.43,8.4,7.48-2.95,7.48-8.29-3.56-8.29-7.48-8.29Z"/><path d="M155.25,10.08c4.53,0,7.63,2.14,9.31,4.48v-4.02h7.18v28.19h-7.18v-4.12c-1.68,2.44-4.88,4.58-9.36,4.58-7.12,0-12.82-5.85-12.82-14.66s5.7-14.45,12.87-14.45ZM157.08,16.33c-3.82,0-7.43,2.85-7.43,8.19s3.61,8.4,7.43,8.4,7.48-2.95,7.48-8.29-3.56-8.29-7.48-8.29Z"/><path d="M184.56,38.73h-7.12V10.53h7.12v4.38c1.78-2.9,4.73-4.78,8.65-4.78v7.48h-1.88c-4.22,0-6.77,1.63-6.77,7.07v14.04Z"/><path d="M196.72,1.07h7.12v21.42l9.46-11.96h9.26l-12.42,14.15,12.52,14.04h-9.26l-9.57-12.01v12.01h-7.12V1.07Z"/><path d="M227.06,34.83c0-2.28,1.62-3.89,3.89-3.89s3.87,1.61,3.87,3.89-1.61,3.87-3.87,3.87-3.89-1.63-3.89-3.87ZM228.07,34.83c0,1.75,1.11,2.94,2.89,2.94s2.9-1.19,2.9-2.94-1.13-2.96-2.9-2.96-2.89,1.19-2.89,2.96ZM231.94,35.24l.95,1.5h-1.42l-.79-1.37h-.11v1.37h-1.22v-3.91h1.92c.84,0,1.41.51,1.41,1.28,0,.53-.27.93-.73,1.13ZM230.55,33.88v.57h.58c.17,0,.31-.09.31-.29s-.15-.27-.31-.27h-.58Z"/></svg>"""

MERKABA = """<svg class="merkaba" viewBox="0 0 23.64 20.47" xmlns="http://www.w3.org/2000/svg" fill="#ffffff"><path d="M10.34,7.68l4.43-2.56-1.48,2.56-1.48,2.56h-5.91l4.43-2.56Z"/><path d="M13.3,2.56l4.43-2.56-1.48,2.56-1.48,2.56h-5.91l4.43-2.56Z"/><path d="M4.43,7.68l4.43-2.56-1.48,2.56-1.48,2.56H0l4.43-2.56Z"/><path d="M10.34,12.8l-4.43-2.56h5.91l1.48,2.56,1.48,2.56-4.43-2.56Z"/><path d="M4.43,12.8L0,10.23h5.91l1.48,2.56,1.48,2.56-4.43-2.55Z"/><path d="M13.3,17.91l-4.43-2.56h5.91l1.48,2.56,1.48,2.56-4.43-2.56Z"/><path d="M14.78,10.24v-5.12l-1.48,2.56-1.48,2.56,1.48,2.56,1.48,2.56v-5.12Z"/><path d="M17.73,5.12V0l-1.48,2.56-1.48,2.56,1.48,2.56,1.48,2.56v-5.12Z"/><path d="M17.73,15.36v-5.12l-1.48,2.56-1.48,2.56,1.48,2.56,1.48,2.56v-5.12Z"/><path d="M5.91,15.36v-5.12l4.43,2.56,4.43,2.56-4.43,2.56-4.43,2.56v-5.12Z"/><path d="M5.91,5.12V0l4.43,2.56,4.43,2.56-4.43,2.56-4.43,2.56v-5.12Z"/><path d="M14.78,10.24v-5.12l4.43,2.56,4.43,2.56-4.43,2.56-4.43,2.56v-5.12Z"/></svg>"""

CSS = """
* { margin:0; padding:0; box-sizing:border-box; }
html,body { width:827px; height:1169px; }
body { font-family:'Segoe UI', system-ui, sans-serif; color:#e7eef5; overflow:hidden;
       background:linear-gradient(160deg,#0a1a2b 0%,#0d2438 52%,#091725 100%);
       -webkit-print-color-adjust:exact; position:relative; }
.glow { position:absolute; width:900px; height:700px; left:-180px; top:180px; border-radius:50%;
        background:radial-gradient(closest-side, rgba(4,131,200,.16), transparent 70%); }
.glow2 { position:absolute; width:700px; height:600px; right:-220px; bottom:-120px; border-radius:50%;
         background:radial-gradient(closest-side, rgba(0,132,144,.13), transparent 70%); }
.merkaba { position:absolute; width:760px; right:-230px; top:300px; opacity:.045; transform:rotate(-8deg); }
.docnum { position:absolute; top:96px; right:64px; font-family:Georgia,serif; font-size:200px; font-weight:700;
          color:rgba(255,255,255,.05); line-height:1; letter-spacing:-6px; }
.page { position:relative; z-index:2; height:100%; padding:64px 68px 0 68px; display:flex; flex-direction:column; }
.topbar { display:flex; justify-content:space-between; align-items:center; }
.wm { height:34px; width:auto; }
.conf { font-size:10px; letter-spacing:3.5px; color:#6f8598; font-weight:600; }
.rule { margin-top:26px; height:1px; background:rgba(255,255,255,.13); position:relative; }
.rule::before { content:''; position:absolute; left:0; top:-1px; width:96px; height:3px;
                background:linear-gradient(90deg,#00a4b2,#0483c8); }
.hero { margin-top:170px; max-width:600px; }
.eyebrow { font-size:12.5px; letter-spacing:5px; color:#2ec3cf; font-weight:700; }
h1 { font-family:Georgia,'Times New Roman',serif; font-size:57px; font-weight:700; color:#fff;
     line-height:1.14; margin-top:26px; letter-spacing:.2px; }
.subtitle { margin-top:26px; font-size:16.5px; line-height:1.65; color:#9fb3c8; max-width:520px; }
.meta { margin-top:auto; padding:34px 0 40px 0; border-top:1px solid rgba(255,255,255,.13);
        display:grid; grid-template-columns:1.5fr 1.6fr .7fr .85fr; column-gap:26px; }
.meta .label { font-size:9.5px; letter-spacing:2.6px; color:#66809a; font-weight:700; margin-bottom:10px; }
.meta .v  { font-size:13.5px; color:#e7eef5; font-weight:600; line-height:1.5; }
.meta .s  { font-size:10.5px; color:#8ba0b3; margin-top:3px; line-height:1.5; white-space:nowrap; }
.bar { position:absolute; left:0; right:0; bottom:0; height:12px; z-index:3;
       background:linear-gradient(90deg,#008490 0%,#0483c8 55%,#00497d 100%); }
"""

def cover_html(num, eyebrow, title, subtitle, reference):
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>{CSS}</style></head><body>
<div class="glow"></div><div class="glow2"></div>{MERKABA}<div class="docnum">{num}</div>
<div class="page">
  <div class="topbar">{WORDMARK_WHITE}<div class="conf">COMMERCIAL IN CONFIDENCE</div></div>
  <div class="rule"></div>
  <div class="hero">
    <div class="eyebrow">{eyebrow}</div>
    <h1>{title}</h1>
    <div class="subtitle">{subtitle}</div>
  </div>
  <div class="meta">
    <div><div class="label">PREPARED FOR</div><div class="v">Bullyproof Australia</div><div class="s">Amayda Pty Ltd &middot; Attn: Glenn Rushton</div></div>
    <div><div class="label">PREPARED BY</div><div class="v">Intradark Pty Ltd</div><div class="s">ABN 38 696 182 457 &middot; Aaron J. Girton</div></div>
    <div><div class="label">DATE</div><div class="v">7 July 2026</div></div>
    <div><div class="label">REFERENCE</div><div class="v">{reference}</div></div>
  </div>
</div>
<div class="bar"></div>
</body></html>"""

COVERS = {
    "sow-completion-register": ("01", "BULLYPROOF PLATFORM &middot; PHASE 1",
        "Completion &amp; Deliverables Register",
        "What the Agreement required, what is delivered, and the boundary on new work.",
        "FINAL issue"),
    "final-acceptance-letter": ("02", "BULLYPROOF PLATFORM &middot; PHASE 1",
        "Final Delivery &amp; Request for Acceptance",
        "Formal delivery for User Acceptance Testing under clause 7.1 of the Formal Variation Agreement.",
        "Clause 7.1"),
    "admin-user-guide": ("03", "BULLYPROOF PLATFORM &middot; DELIVERABLE D6",
        "Administrator User Guide",
        "Operating the platform day to day: schools, users, lessons, reporting and certification.",
        "Deliverable D6"),
    "phase1-uat-checklist": ("04", "BULLYPROOF PLATFORM &middot; PHASE 1",
        "Phase 1 UAT Checklist",
        "Step-by-step verification for every completed item, with the checks already verified marked.",
        "UAT pack"),
    "variation-deliverables-verification": ("05", "BULLYPROOF PLATFORM &middot; PHASE 1",
        "Deliverables Verification Register",
        "Every Variation Agreement deliverable mapped to its implementation and its evidence.",
        "Verification"),
    "01-M2-M8-classification": ("06", "BULLYPROOF PLATFORM &middot; SCOPE RECONCILIATION",
        "M2-M8 Scope Classification",
        "Every item from the 22 June document classified A, B, C or D, using your own categories.",
        "M2-M8"),
    "system-administrator-guide": ("07", "BULLYPROOF PLATFORM &middot; DELIVERABLE D6",
        "System Administrator Guide",
        "Architecture, configuration, deployment and technical operation of the platform.",
        "Deliverable D6"),
}

if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    only = set(sys.argv[1:])
    for key, (num, eyebrow, title, subtitle, ref) in COVERS.items():
        if only and key not in only:
            continue
        html_path = OUT / f"{key}.html"
        html_path.write_text(cover_html(num, eyebrow, title, subtitle, ref), encoding="utf-8")
        png_path = OUT / f"{key}.png"
        subprocess.run([CHROME, "--headless", "--disable-gpu", "--force-device-scale-factor=2",
                        f"--screenshot={png_path}", "--window-size=827,1169",
                        html_path.resolve().as_uri()], capture_output=True, timeout=120)
        print(f"{key}.png", "ok" if png_path.exists() else "FAILED")
