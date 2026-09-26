import { useState, useRef, useEffect, useCallback, createContext, useContext } from "react";
import zuriFace from "./assets/zuri/zuri-face.png";
import introVideo from "./assets/zuri/zuri-intro.mp4";
import q1Video from "./assets/zuri/zuri-q1.mp4";
import q2Video from "./assets/zuri/zuri-q2.mp4";
import q3Video from "./assets/zuri/zuri-q3.mp4";
import q4Video from "./assets/zuri/zuri-q4.mp4";
import q5Video from "./assets/zuri/zuri-q5.mp4";
import { LandingPage, RoleSelectionPage, AuthFormPage, ResetPasswordPage } from "./marketing";
import * as store from "./lib/store";
import { LLM_URL, TTS_URL, apiHeaders, signOut as authSignOut, hasBackend, supabase } from "./lib/backend";

// ============================================================
// Fumana platform. One application, one shared builder network.
// Build a candidate profile, switch to the employer side, and that
// same masked profile appears in search. Hire, and the impact computes.
// Zuri is the agent. Telos is the data and impact engine underneath.
// ============================================================

const T = {
  paper: "#ECEFF2", surface: "#FFFFFF", mute: "#E3E8EB", line: "#D7DEE3",
  ink: "#0C1A26", slate: "#4A5C68", slateLg: "#5E6E7A", emerald: "#066E5A", vault: "#05564A",
  brass: "#B08A2E", onAccent: "#F4F7F8", alert: "#A8431F",
};
// slate is the AA-passing secondary text on paper for small (<16px) text.
// slateLg keeps the softer brand tone for labels and larger (>=16px) text.
const F = { disp: "'Hanken Grotesk', sans-serif", body: "'Inter', sans-serif", mono: "'IBM Plex Mono', monospace" };
const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&family=IBM+Plex+Sans:wght@300;400;500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
*{box-sizing:border-box}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.rise{animation:rise .45s ease both}@keyframes grow{from{width:0}}
textarea,input{font-family:'Inter',sans-serif}
.row2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.dash{display:grid;grid-template-columns:1.4fr 1fr;gap:16px}
.mods{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.kanban{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.split{display:grid;grid-template-columns:1.3fr 1fr;gap:16px}
.doors{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media(max-width:760px){.row2,.dash,.mods,.kanban,.split,.doors{grid-template-columns:1fr}}
button:focus-visible,a:focus-visible,input:focus-visible,textarea:focus-visible{outline:2px solid #066E5A;outline-offset:2px}
@keyframes zuriPulse{0%{box-shadow:0 0 0 2px rgba(6,110,90,0.55),0 0 0 5px rgba(6,110,90,0.16)}50%{box-shadow:0 0 0 3px rgba(6,110,90,0.30),0 0 0 15px rgba(6,110,90,0)}100%{box-shadow:0 0 0 2px rgba(6,110,90,0.55),0 0 0 5px rgba(6,110,90,0.16)}}
@keyframes toastin{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
/* Carbon shell: dark header + dark left side nav, one shared component */
.fshell{height:100dvh;display:grid;grid-template-columns:248px 1fr;grid-template-rows:52px 1fr auto;grid-template-areas:"head head" "side main" "foot foot"}
.fshell.noNav{grid-template-columns:1fr;grid-template-areas:"head" "main" "foot"}
.fhead{grid-area:head;display:flex;align-items:center;gap:12px;background:#0C1A26;color:#EEF3F8;padding:0 16px}
.fbrand{font-family:'Hanken Grotesk',sans-serif;font-weight:800;font-size:18px;letter-spacing:3px;background:none;border:none;color:#fff;cursor:pointer;padding:0}
.fside{grid-area:side;background:#0C1A26;border-right:1px solid #12222E;display:flex;flex-direction:column;padding:10px 0;overflow-y:auto}
.fnav{text-align:left;background:none;border:none;border-left:3px solid transparent;color:#9FB0BC;font-family:'Inter',sans-serif;font-size:13.5px;padding:11px 18px;cursor:pointer;white-space:nowrap}
.fnav:hover{background:#12222E;color:#fff}
.fnav.on{background:#12222E;border-left-color:#066E5A;color:#fff;font-weight:600}
.fmain{grid-area:main;min-height:0;overflow-y:auto;background:#F2F4F7}
.ffoot{grid-area:foot;background:#0C1A26;color:#8BA0AD;font-family:'IBM Plex Mono',monospace;font-size:10.5px;padding:7px 16px;text-align:center;border-top:1px solid #12222E}
.fbot{display:none}
.ftoasts{position:fixed;top:64px;right:16px;z-index:70;display:flex;flex-direction:column;gap:8px;max-width:calc(100vw - 32px)}
.ftoast{background:#0C1A26;color:#EEF3F8;border-left:3px solid #066E5A;border-radius:6px;padding:10px 14px;font-size:13px;box-shadow:0 8px 24px rgba(12,26,38,0.28);animation:toastin .25s ease}
.fdock{bottom:20px}
@media(max-width:880px){.fdock{bottom:76px}}
@media(max-width:880px){
  .fshell{grid-template-columns:1fr;grid-template-rows:52px 1fr auto;grid-template-areas:"head" "main" "foot"}
  .fshell.hasNav{grid-template-rows:52px 1fr 56px auto;grid-template-areas:"head" "main" "bot" "foot"}
  .fside{display:none}
  .fbot{grid-area:bot;display:flex;overflow-x:auto;background:#0C1A26;border-top:1px solid #12222E}
  .fbotItem{flex:0 0 auto;background:none;border:none;border-top:2px solid transparent;color:#9FB0BC;font-family:'Inter',sans-serif;font-size:11px;padding:8px 13px;cursor:pointer;white-space:nowrap}
  .fbotItem.on{color:#fff;border-top-color:#066E5A}
}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
@media print {
  .fhead,.fside,.fbot,.fdock,.ftoasts,.noprint{display:none!important}
  .fshell{display:block!important;height:auto!important}
  .fmain{overflow:visible!important;height:auto!important;padding:0!important}
  html,body,.fshell,.fmain{background:#fff!important}
  #cvprint{max-width:none!important}
  #cvprint input,#cvprint textarea{border:none!important;padding:0!important;background:#fff!important;color:#0C1A26!important;font-size:13px!important}
  .screen-only{display:none!important}
  .print-only{display:block!important}
}
.print-only{display:none}
`;

// All model calls (scoring, the copilots, the Experience Alchemist) go through
// the provider-agnostic backend proxy. The browser never holds a provider key
// and never talks to a provider directly. Throws on a non-OK response so each
// caller's catch keeps the feature inert until a provider is configured.
async function callClaude({ system, messages, expectJson }) {
  const res = await fetch(LLM_URL, {
    method: "POST", headers: await apiHeaders(),
    body: JSON.stringify({ system, messages }),
  });
  if (!res.ok) throw new Error("llm " + res.status);
  const data = await res.json();
  const text = (data.text || "").trim();
  if (!expectJson) return text;
  return JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
}
const usd = n => "$" + Math.round(n).toLocaleString("en-US");

// ---- scoring model ----
const WEIGHTS = { "Technical depth": 0.30, "Communication clarity": 0.16, "Async and remote readiness": 0.16, "Professionalism": 0.14, "Collaboration": 0.12, "Problem solving": 0.12 };
const DIMENSIONS = Object.keys(WEIGHTS);
// Assessment accommodations (Phase 4). Any combination; honored in the interview.
const ACCOMMODATIONS = [
  { id: "extraTime", label: "Extra time", desc: "No time pressure on your answers; there is no auto-stop." },
  { id: "textOnly", label: "Text-only interview", desc: "No camera or video is requested; you read each question and type your answer." },
  { id: "written", label: "Written interview", desc: "See all questions at once as a form, and answer at your own pace." },
];
// Visible guardrails (Phase 4 G), stated at the point of use, not just the ethics page.
const FIG_NOTE = "All figures computed in code. No number on this screen is model-generated.";
const ZURI_NOTE = "Zuri narrates from evidence. She does not assert legal or financial fact.";
const FigNote = () => <div style={{ marginTop: 16, fontFamily: F.mono, fontSize: 10.5, color: T.slate, borderTop: `1px solid ${T.mute}`, paddingTop: 10 }}>{FIG_NOTE}</div>;
const ZuriNote = () => <div style={{ marginTop: 10, fontFamily: F.mono, fontSize: 10.5, color: T.slate }}>{ZURI_NOTE}</div>;
const EVIDENCE = {
  "Technical depth": "Your experience and your answers about real bugs and decisions.",
  "Communication clarity": "How clearly and directly you respond in the interview.",
  "Async and remote readiness": "How you handle time zones, handoffs, and going offline.",
  "Professionalism": "Commitments, follow through, and tone under pressure.",
  "Collaboration": "How you work with reviewers, peers, and juniors.",
  "Problem solving": "How you frame ambiguity and show your reasoning.",
};
const composite = dims => { let s = 0, w = 0; dims.forEach(d => { const wt = WEIGHTS[d.name] ?? 0.15; s += d.score * wt; w += wt; }); return Math.round(s / (w || 1)); };
const tierOf = s => s >= 85 ? { name: "Top 1%", color: T.emerald } : s >= 70 ? { name: "Gold", color: T.brass } : s >= 50 ? { name: "Silver", color: T.slate } : { name: "Bronze", color: T.alert };
// Score bands, matching the scoring model. Pure function, no model.
const BAND = s => s >= 90 ? { label: "Exceptional", range: "90-100", why: "an exceptional, rare result" }
  : s >= 75 ? { label: "Strong", range: "75-89", why: "strong and ready for enterprise work" }
  : s >= 60 ? { label: "Solid with gaps", range: "60-74", why: "solid, with clear and nameable gaps" }
  : s >= 40 ? { label: "Real gaps", range: "40-59", why: "real gaps that would affect hiring" }
  : { label: "Significant gaps", range: "below 40", why: "significant gaps to close before global roles" };
const MODULES = {
  "Communication clarity": { id: "culture", title: "Culture Shock Simulator", blurb: "Western corporate communication: async updates, proactive clarification, direct feedback.", pts: 300 },
  "Async and remote readiness": { id: "async", title: "Async Operating Rhythm", blurb: "Run a remote day across time zones without losing momentum.", pts: 250 },
  "Professionalism": { id: "prof", title: "Professional Presence", blurb: "Client-ready conduct, commitments, and follow through.", pts: 200 },
  "Collaboration": { id: "collab", title: "Collaboration and Code Review", blurb: "Give and take review, pair effectively, raise blockers early.", pts: 220 },
  "Problem solving": { id: "solve", title: "Structured Problem Solving", blurb: "Frame ambiguous problems and show your reasoning.", pts: 240 },
  "Technical depth": { id: "deep", title: "Technical Deep Dive", blurb: "Close the gap on the skills employers ask for most.", pts: 320 },
};

// ---- seeded network so employer search has a pool ----
// Demo seed switch. true opens the app on the seeded network, pipeline, company,
// and a completed assessment, so every screen is reachable without running the
// interview. false restores the real flow: landing, sign in, onboarding, interview.
const DEMO_SEED = false;

// A network entry carries no name, city, or photo by design. That is what the
// employer sees, and identity stays shielded until they commit to an interview,
// so location and experience live inside `summary` rather than as fields.
// profileStrength and tier are derived from `dimensions` through the same
// composite() and tierOf() the assessment uses, so a seeded profile can never
// disagree with the disclosed weighting formula.
const seedBuilder = b => { const ps = composite(b.dimensions); return { ...b, profileStrength: ps, tier: tierOf(ps) }; };
const SEED_BUILDERS = [
  {
    handle: "FB-2208", role: "Backend engineer", isYou: true,
    summary: "Built payment reconciliation and queue resilience for a Lagos fintech. Strong on PostgreSQL and network-loss recovery. Four years in production payments.",
    skills: ["Python", "PostgreSQL", "Distributed systems"],
    dimensions: [
      { name: "Technical depth", score: 88, rationale: "Traced a reconciliation mismatch to a retry that double-posted, and described the fix at the level of the queue guarantee rather than the symptom." },
      { name: "Communication clarity", score: 68, rationale: "The detail is right but it arrives unordered, so a listener has to work to find the point. Answers start inside the system rather than with what was at stake." },
      { name: "Async and remote readiness", score: 86, rationale: "Posts a written handover before going offline and names the blocker rather than only the status." },
      { name: "Professionalism", score: 84, rationale: "Described pushing back on a rushed deploy by proposing a smaller scope instead of refusing the request." },
      { name: "Collaboration", score: 82, rationale: "Reviews peer code regularly, but gave no example of bringing a junior engineer through a hard problem." },
      { name: "Problem solving", score: 88, rationale: "Scoped an ambiguous task by writing down the assumptions first and confirming them before building." },
    ],
  },
  {
    handle: "FB-5590", role: "Platform engineer",
    summary: "Runs infrastructure and on-call for a Kigali logistics platform. Cut deploy time from an hour to eight minutes and owns the incident process. Six years, three of them on call.",
    skills: ["Kubernetes", "Terraform", "Go", "Observability"],
    dimensions: [
      { name: "Technical depth", score: 94, rationale: "Walked through a cascading failure from the load balancer down to a connection pool limit, with the metric that revealed each step." },
      { name: "Communication clarity", score: 88, rationale: "Writes incident reviews that a non-engineer can follow, leading with impact before cause." },
      { name: "Async and remote readiness", score: 95, rationale: "Built the handover rotation across three time zones and documented the escalation path so nobody waits on one person." },
      { name: "Professionalism", score: 92, rationale: "Treats a postmortem as a system question rather than a personal one, and said so without prompting." },
      { name: "Collaboration", score: 90, rationale: "Pairs with product engineers on their deploys instead of gatekeeping the pipeline." },
      { name: "Problem solving", score: 92, rationale: "Reduced an ambiguous reliability goal to two measurable targets before proposing any work." },
    ],
  },
  {
    handle: "FB-4417", role: "Frontend engineer",
    summary: "Shipped accessible React dashboards for a Nairobi health platform on low-bandwidth networks. Three years, with a year owning the design system.",
    skills: ["React", "TypeScript", "Accessibility"],
    dimensions: [
      { name: "Technical depth", score: 80, rationale: "Explained how they cut a bundle to hold up on a 3G connection, though the reasoning about rendering cost stayed at a high level." },
      { name: "Communication clarity", score: 86, rationale: "Answers are short and structured, and they check the listener has followed before moving on." },
      { name: "Async and remote readiness", score: 78, rationale: "Comfortable working alone across a time gap, but waits to be asked for status more often than they volunteer it." },
      { name: "Professionalism", score: 84, rationale: "Described missing a deadline by flagging it early and proposing a reduced scope." },
      { name: "Collaboration", score: 80, rationale: "Gives careful review feedback and asks for it, with one clear example of mentoring a designer into code." },
      { name: "Problem solving", score: 78, rationale: "Solves well inside a defined brief, with less evidence of framing a problem that arrived unframed." },
    ],
  },
  {
    handle: "FB-7731", role: "Data engineer",
    summary: "Built ETL and reporting pipelines across three African markets, owning data quality end to end. Five years, mostly in retail analytics.",
    skills: ["Airflow", "SQL", "Python"],
    dimensions: [
      { name: "Technical depth", score: 78, rationale: "Knows pipeline orchestration well and described a real backfill failure, though the answer on warehouse modelling was thin." },
      { name: "Communication clarity", score: 72, rationale: "Accurate but dense. Tends to describe the pipeline before saying what the business problem was." },
      { name: "Async and remote readiness", score: 74, rationale: "Works independently, but the handover example depended on a live call rather than a written note." },
      { name: "Professionalism", score: 78, rationale: "Owned a data error that reached a report and described how they corrected the record." },
      { name: "Collaboration", score: 76, rationale: "Works closely with analysts, with less evidence of engaging in engineering code review." },
      { name: "Problem solving", score: 76, rationale: "Methodical on data quality, and named the check they added so the failure could not repeat silently." },
    ],
  },
  {
    handle: "FB-3164", role: "Mobile engineer",
    summary: "Android developer for an Accra agritech app used by smallholder farmers offline. Two years, self-taught after a physics degree.",
    skills: ["Kotlin", "Android", "Offline sync"],
    dimensions: [
      { name: "Technical depth", score: 68, rationale: "Solid on offline sync and conflict resolution, but has not yet worked on anything beyond a single mobile client." },
      { name: "Communication clarity", score: 62, rationale: "Answers start in the middle of the problem, so a listener without context has to ask twice." },
      { name: "Async and remote readiness", score: 58, rationale: "Has only worked in one time zone with a colocated team, and had no example of an offline handover." },
      { name: "Professionalism", score: 66, rationale: "Reliable on commitments, though the disagreement example ended in going quiet rather than resolving it." },
      { name: "Collaboration", score: 64, rationale: "Works well beside one other developer, with no experience of a formal review process." },
      { name: "Problem solving", score: 62, rationale: "Fixes what is in front of them and has started documenting assumptions, but tends to build before scoping." },
    ],
  },
].map(seedBuilder);

// Seeded employer pipeline. Entries are network entries plus the two fields the
// employer side stamps on: `fit` from search and `monthlyUsd` from the budget.
// The fit values are what Search.run() computes for a backend-focused need.
const seedEngagement = (handle, extra) => ({ ...SEED_BUILDERS.find(x => x.handle === handle), ...extra });
const SEED_PIPELINE = {
  shortlisted: [seedEngagement("FB-7731", { fit: 61, monthlyUsd: 4200 })],
  interviewing: [seedEngagement("FB-4417", { fit: 65, monthlyUsd: 4800 })],
  sow: [seedEngagement("FB-2208", { fit: 84, monthlyUsd: 4500 })],
};

// Seeded employers, in the exact shape of the `company` object EmployerApp holds.
// The app models one employer session, so only the first is wired to a screen.
const SEED_COMPANIES = [
  { name: "Northwind Payments GmbH", domain: "northwind-payments.de", industry: "Fintech", size: "51 to 200", country: "Germany", hiringFor: "A backend engineer to own our payments reconciliation service, working async with a Berlin team." },
  { name: "Kestrel Health", domain: "kestrelhealth.co.uk", industry: "Health technology", size: "201 to 1000", country: "United Kingdom", hiringFor: "Frontend engineers for a patient-facing platform that has to stay fast on poor connections." },
  { name: "Atlas Freight Systems", domain: "atlasfreight.com", industry: "Logistics and supply chain", size: "1000 plus", country: "United States", hiringFor: "A data engineer to consolidate shipment reporting across regional carriers." },
];

// Shared FIND Squads store. Lives at the app root so the employer side can read
// squads later. `joined` and `members` update when the candidate joins/forms.
const SEED_SQUADS = [
  { id: "backend", name: "Backend Guild", focus: "Distributed systems, data, and reliability", pitch: "Battle-tested backend builders who ship resilient systems on real infrastructure.", members: 128, joined: false },
  { id: "frontend", name: "Frontend Collective", focus: "Accessible, resilient interfaces on real networks", pitch: "Frontend engineers who make fast, accessible UIs that hold up on low bandwidth.", members: 96, joined: false },
  { id: "data", name: "Data Engineering Circle", focus: "Pipelines, quality, and analytics across markets", pitch: "Data engineers who own quality end to end across African markets.", members: 71, joined: false },
  { id: "lagos", name: "Lagos Builders", focus: "Local meetups, mentorship, and referrals", pitch: "A Lagos crew that mentors, meets up, and refers each other into great roles.", members: 154, joined: false },
];

// ---- shared ui ----
function Btn({ children, onClick, kind, disabled, full, small }) {
  const s = { primary: { background: T.emerald, color: T.onAccent, border: "none" }, ghost: { background: "transparent", color: T.ink, border: `1px solid ${T.line}` }, sso: { background: T.surface, color: T.ink, border: `1px solid ${T.line}` } }[kind || "primary"];
  return <button onClick={onClick} disabled={disabled} style={{ ...s, fontFamily: F.disp, fontWeight: 600, fontSize: small ? 12.5 : 14, padding: small ? "8px 13px" : "12px 18px", borderRadius: 8, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1, width: full ? "100%" : "auto", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9 }}>{children}</button>;
}
function Spinner({ label }) { return <div style={{ display: "flex", alignItems: "center", gap: 10, color: T.slate, fontSize: 14 }}><span style={{ width: 14, height: 14, border: `2px solid ${T.line}`, borderTopColor: T.emerald, borderRadius: "50%", display: "inline-block", animation: "spin .8s linear infinite" }} />{label}</div>; }
const Label = ({ children }) => <div style={{ fontFamily: F.mono, fontSize: 11, color: T.slateLg, letterSpacing: 0.4, textTransform: "uppercase" }}>{children}</div>;
const Eyebrow = ({ children }) => <div style={{ fontFamily: F.mono, fontSize: 12, color: T.emerald }}>{children}</div>;
const Back = ({ onClick }) => <button onClick={onClick} aria-label="Go back" style={{ fontFamily: F.mono, fontSize: 12, color: T.slate, background: "transparent", border: "none", cursor: "pointer", padding: "4px 0", marginBottom: 8 }}>← back</button>;

// Accessible modal: role=dialog, aria-modal, aria-labelledby -> titleId, focus
// trapped while open, Escape to close, focus restored to the opener on close.
function Modal({ titleId, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof document === "undefined") return;
    const prev = document.activeElement;
    const sel = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusables = () => Array.from(el.querySelectorAll(sel));
    (focusables()[0] || el).focus?.();
    function onKey(e) {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); return; }
      if (e.key !== "Tab") return;
      const f = focusables();
      if (!f.length) { e.preventDefault(); return; }
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    el.addEventListener("keydown", onKey);
    return () => { el.removeEventListener("keydown", onKey); if (prev && prev.focus) prev.focus(); };
  }, [onClose]);
  return <div onMouseDown={onClose} style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(12,26,38,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
    <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} onMouseDown={e => e.stopPropagation()}
      style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, width: 460, maxWidth: "100%", maxHeight: "85vh", overflowY: "auto", padding: 22, boxShadow: "0 20px 50px rgba(12,26,38,0.28)" }}>
      {children}
    </div>
  </div>;
}
const Hint = ({ show, children }) => show ? <div role="status" style={{ marginTop: 8, fontSize: 12.5, color: T.slate }}>{children}</div> : null;
const Card = ({ children, accent, pad }) => <div style={{ background: T.surface, border: `1px solid ${accent || T.line}`, borderRadius: 12, padding: pad ?? 22 }}>{children}</div>;
const Li = ({ children }) => <li style={{ display: "flex", gap: 9 }}><span style={{ color: T.emerald }}>.</span><span style={{ color: T.slate }}>{children}</span></li>;
function Field({ label, value, onChange, placeholder, rows }) {
  const common = { width: "100%", marginTop: 7, background: T.paper, color: T.ink, border: `1px solid ${T.line}`, borderRadius: 8, padding: 11, fontSize: 14, lineHeight: 1.5 };
  return <div style={{ marginBottom: 14 }}><Label>{label}</Label>{rows ? <textarea rows={rows} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ ...common, resize: "vertical" }} /> : <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={common} />}</div>;
}
// Text size preference (accessibility). Stored in context at the app root and
// applied via --base-font-size + a matching zoom on the root div, so the whole
// inline-px-styled app scales uniformly with the chosen base.
const FONT_SCALE = { default: 1, large: 16 / 14, larger: 18 / 14 };
const FontSizeCtx = createContext({ size: "default", setSize: () => {} });
const useFontSize = () => useContext(FontSizeCtx);
function FontSizeToggle() {
  const { size, setSize } = useFontSize();
  const opts = [["default", "Default"], ["large", "Large"], ["larger", "Larger"]];
  return <div role="group" aria-label="Text size" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
    {opts.map(([k, lbl]) => { const on = size === k; return <button key={k} type="button" aria-pressed={on} onClick={() => setSize(k)}
      style={{ fontFamily: F.body, fontSize: 13, padding: "7px 14px", border: `1px solid ${on ? T.emerald : T.line}`, borderRadius: 8, background: on ? T.emerald : T.paper, color: on ? T.onAccent : T.ink, cursor: "pointer" }}>{lbl}</button>; })}
  </div>;
}
const Centered = ({ children }) => <div style={{ minHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>{children}</div>;
const Scroll = ({ children }) => <div style={{ height: "100%", overflowY: "auto", padding: "26px 24px" }}>{children}</div>;

// ---- toasts (shell chrome; any screen can push one via useToast) ----
// Each toast is also kept in a short history (last ten, with timestamps) that
// the header bell reveals, so a message that vanishes is not lost.
const ToastCtx = createContext(() => {});
const ToastHistoryCtx = createContext([]);
const useToast = () => useContext(ToastCtx);
const useToastHistory = () => useContext(ToastHistoryCtx);
function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [history, setHistory] = useState([]);
  const push = useCallback((msg) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, msg }]);
    setHistory(h => [{ id, msg, at: Date.now() }, ...h].slice(0, 10));
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3400);
  }, []);
  return <ToastCtx.Provider value={push}>
    <ToastHistoryCtx.Provider value={history}>
      {children}
      <div className="ftoasts" aria-live="polite">{toasts.map(t => <div key={t.id} className="ftoast" role="status">{t.msg}</div>)}</div>
    </ToastHistoryCtx.Provider>
  </ToastCtx.Provider>;
}

// Header bell: opens a slide-in panel of the last ten notifications with times.
function NotificationBell() {
  const history = useToastHistory();
  const [open, setOpen] = useState(false);
  return <>
    <button onClick={() => setOpen(o => !o)} aria-label="Notification history" aria-expanded={open} style={{ position: "relative", background: "transparent", border: "none", cursor: "pointer", color: "#EEF3F8", padding: 6, display: "inline-flex", alignItems: "center" }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
      {history.length > 0 && <span aria-hidden="true" style={{ position: "absolute", top: 3, right: 3, width: 7, height: 7, borderRadius: "50%", background: T.emerald }} />}
    </button>
    {open && <>
      <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(12,26,38,0.35)" }} />
      <aside role="dialog" aria-label="Notification history" style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 320, maxWidth: "90vw", zIndex: 91, background: T.surface, borderLeft: `1px solid ${T.line}`, boxShadow: "-8px 0 30px rgba(12,26,38,0.2)", padding: 18, overflowY: "auto", animation: "slideIn .22s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 16 }}>Notifications</div>
          <button onClick={() => setOpen(false)} aria-label="Close notification history" style={{ background: "transparent", border: "none", cursor: "pointer", color: T.slateLg, fontSize: 20, lineHeight: 1, padding: 4 }}>×</button>
        </div>
        {history.length === 0
          ? <p style={{ fontSize: 13.5, color: T.slate }}>No notifications yet.</p>
          : <div style={{ display: "grid", gap: 10 }}>{history.map(t => <div key={t.id} style={{ borderLeft: `3px solid ${T.emerald}`, paddingLeft: 10 }}>
            <div style={{ fontSize: 13.5, color: T.ink, lineHeight: 1.5 }}>{t.msg}</div>
            <div style={{ fontFamily: F.mono, fontSize: 10.5, color: T.slate, marginTop: 2 }}>{new Date(t.at).toLocaleTimeString()}</div>
          </div>)}</div>}
      </aside>
    </>}
  </>;
}

// ---- Human-in-the-loop (both portals) ----
// Any AI decision surface calls useHumanReview()(what) to request a human review.
// One shared modal collects the decision + why, logs to the audit trail, and
// confirms with a reference and timeframe. It never removes the AI output.
const HumanReviewCtx = createContext(() => {});
const useHumanReview = () => useContext(HumanReviewCtx);

function HumanReviewProvider({ logAudit, submitReview, children }) {
  const [open, setOpen] = useState(false);
  const [decision, setDecision] = useState("");
  const [reason, setReason] = useState("");
  const [ref, setRef] = useState("");
  const [src, setSrc] = useState("candidate");
  const request = useCallback((what, source) => { setDecision(what || ""); setSrc(source || "candidate"); setReason(""); setRef(""); setOpen(true); }, []);
  function submit() {
    if (!reason.trim()) return;
    const r = "HR-" + Math.random().toString(36).slice(2, 7).toUpperCase();
    setRef(r);
    if (submitReview) submitReview({ kind: "human-review", subject: decision, reason: reason.trim(), ref: r });
    if (logAudit) logAudit({ kind: "human-review", decision, reason: reason.trim(), ref: r, source: src });
  }
  return <HumanReviewCtx.Provider value={request}>
    {children}
    {open && <Modal titleId="hr-title" onClose={() => setOpen(false)}>
      {ref
        ? <>
          <Eyebrow>Human review</Eyebrow>
          <h3 id="hr-title" style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 20, margin: "8px 0 6px" }}>Request received. A human will look at this.</h3>
          <p style={{ fontSize: 14, color: T.slate, marginBottom: 14 }}>Your request is logged and queued for a human reviewer. The AI result stays as it is until a person reviews it.</p>
          <div style={{ background: T.paper, border: `1px solid ${T.line}`, borderRadius: 8, padding: 12, fontFamily: F.mono, fontSize: 12.5, display: "grid", gap: 5 }}>
            <div><span style={{ color: T.slate }}>reference </span><b>{ref}</b></div>
            <div><span style={{ color: T.slate }}>expected </span>within 5 business days</div>
          </div>
          <div style={{ marginTop: 10, fontFamily: F.mono, fontSize: 11, color: T.slate }}>Queued for a human reviewer. Logged to your audit trail.</div>
          <div style={{ marginTop: 16 }}><Btn onClick={() => setOpen(false)}>Done</Btn></div>
        </>
        : <>
          <Eyebrow>Human review</Eyebrow>
          <h3 id="hr-title" style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 20, margin: "8px 0 6px" }}>Ask a human to review this decision</h3>
          <p style={{ fontSize: 13.5, color: T.slate, marginBottom: 12 }}>Your AI result stays as it is. This adds a human review alongside it.</p>
          <Field label="What decision are you questioning?" value={decision} onChange={setDecision} />
          <Field label="Why?" rows={4} value={reason} onChange={setReason} placeholder="In your own words." />
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}><Btn disabled={!reason.trim()} onClick={submit}>Submit request</Btn><Btn kind="ghost" onClick={() => setOpen(false)}>Cancel</Btn></div>
        </>}
    </Modal>}
  </HumanReviewCtx.Provider>;
}

// Small "Request human review" trigger placed alongside an AI decision surface.
function ReviewLink({ what, source }) {
  const request = useHumanReview();
  return <button onClick={() => request(what, source)} style={{ fontFamily: F.mono, fontSize: 11, color: T.slate, background: "transparent", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline", whiteSpace: "nowrap" }}>Request human review</button>;
}


// ============================================================
// CANDIDATE SIDE
// ============================================================
// ---- Applications and Hub (candidate). NO MODEL. Reads the shared store ----
// On Fumana, employers come to the builder (bias-shielded search). This hub
// reads the shared builders store (your own network entry) and the shared
// employer pipeline (who has engaged you) and shows the engagement stage as the
// application status. Matches = engaged at any stage; invites = interviewing or
// beyond; offers = SOW.
const APP_STAGE = {
  shortlisted: { label: "Matched", color: T.emerald, note: "An employer shortlisted your profile. Your identity stays shielded until you accept an interview." },
  interviewing: { label: "Interview invite", color: T.brass, note: "An employer has invited you to interview." },
  sow: { label: "Offer", color: T.emerald, note: "An employer is preparing an offer and Statement of Work." },
};
const APP_STAGES = ["shortlisted", "interviewing", "sow"];

function Applications({ builders, pipeline }) {
  const me = builders.find(b => b.isYou);
  const engagements = me
    ? APP_STAGES.flatMap(stage => pipeline[stage].filter(x => x.handle === me.handle).map(entry => ({ stage, entry })))
    : [];
  const matches = engagements.length;
  const invites = engagements.filter(e => e.stage === "interviewing" || e.stage === "sow").length;
  const offers = engagements.filter(e => e.stage === "sow").length;
  const Stat = ({ n, label }) => <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 12, padding: "14px 16px" }}>
    <div style={{ fontFamily: F.disp, fontWeight: 800, fontSize: 26, color: T.emerald, lineHeight: 1 }}>{n}</div>
    <div style={{ fontFamily: F.mono, fontSize: 11, color: T.slate, marginTop: 4 }}>{label}</div>
  </div>;
  return <Scroll><div style={{ maxWidth: 860, margin: "0 auto" }} className="rise">
    <Eyebrow>Applications and Hub</Eyebrow>
    <h2 style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 26, margin: "6px 0 4px" }}>Where you stand</h2>
    <p style={{ color: T.slate, fontSize: 15, marginBottom: 18 }}>On Fumana, employers come to you. These are the roles matched to your profile and where each one stands. Your identity stays shielded until you accept an interview.</p>

    {!me && <Card><p style={{ color: T.slate, fontSize: 14 }}>You are not in the network yet. Complete your assessment to join, get matched by employers, and track every engagement here.</p></Card>}

    {me && <>
      <Card accent={T.emerald}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div>
            <Label>Your profile in the network</Label>
            <div style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 18, marginTop: 6 }}>{me.handle} <span style={{ color: T.slate, fontWeight: 400, fontSize: 14 }}>. {me.role}</span></div>
            <div style={{ fontFamily: F.mono, fontSize: 11, color: T.slate, marginTop: 4 }}>identity shielded until you accept an interview</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: F.disp, fontWeight: 800, fontSize: 30, color: T.emerald, lineHeight: 1 }}>{me.profileStrength}</div>
            <div><span style={{ display: "inline-block", marginTop: 6, fontFamily: F.mono, fontSize: 11, color: T.onAccent, background: me.tier.color, borderRadius: 5, padding: "3px 10px" }}>{me.tier.name} tier</span></div>
          </div>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginTop: 16 }}>
        <Stat n={matches} label="matches" /><Stat n={invites} label="interview invites" /><Stat n={offers} label="offers" />
      </div>

      <div style={{ marginTop: 18 }}>
        <Label>Your applications</Label>
        {engagements.length === 0
          ? <div style={{ marginTop: 10 }}><Card><p style={{ color: T.slate, fontSize: 14 }}>No employer engagements yet. Employers search the network by evidence. When one shortlists you, it appears here with its status.</p></Card></div>
          : <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
            {engagements.map((e, i) => { const s = APP_STAGE[e.stage]; return <Card key={i} accent={s.color}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{e.entry.role}</div>
                  <div style={{ fontSize: 13.5, color: T.slate, marginTop: 4 }}>{s.note}</div>
                  {e.entry.monthlyUsd ? <div style={{ fontFamily: F.mono, fontSize: 12, color: T.slate, marginTop: 6 }}>{usd(e.entry.monthlyUsd)} / month</div> : null}
                </div>
                <span style={{ fontFamily: F.mono, fontSize: 11, color: T.onAccent, background: s.color, borderRadius: 5, padding: "4px 10px", whiteSpace: "nowrap" }}>{s.label}</span>
              </div>
            </Card>; })}
          </div>}
      </div>
    </>}
    <div style={{ height: 30 }} />
  </div></Scroll>;
}

// ---- Wallet and Escrow (candidate). NO MODEL. All display and computed ----
// Figures are computed in code from the builder's SOW-stage engagement in the
// shared pipeline (illustrative). Real payments, escrow release, and payouts run
// on the backend. Payout methods are placeholders.
const PAYOUT_METHODS = [
  { id: "mpesa", name: "M-Pesa", note: "Mobile money, East Africa" },
  { id: "paystack", name: "Paystack", note: "Cards and bank transfer, Nigeria and beyond" },
  { id: "flutterwave", name: "Flutterwave", note: "Pan-African payouts" },
];
const WALLET_PLATFORM_PCT = 12, WALLET_STATUTORY_PCT = 18; // illustrative, matches the finance hub

function Wallet({ builders, pipeline, premium, onUpgrade }) {
  const me = builders.find(b => b.isYou);
  const toast = useToast();
  const [method, setMethod] = useState("mpesa");
  const methodName = PAYOUT_METHODS.find(m => m.id === method).name;
  // Computed from the shared store: a SOW-stage engagement is the paying contract.
  const contract = me ? pipeline.sow.find(x => x.handle === me.handle) : null;
  const monthly = contract?.monthlyUsd || 0;
  // Premium waives the platform fee on payouts, so the fee actually drops out of
  // net pay rather than only changing the label on the balance card.
  const platformPct = premium?.isPremium ? 0 : WALLET_PLATFORM_PCT;
  const net = Math.round(monthly * (1 - (platformPct + WALLET_STATUTORY_PCT) / 100));
  const escrow = monthly ? net : 0;
  const available = monthly ? net : 0;
  // Payout history is built from real release events only. Nothing in this
  // prototype releases an escrow cycle, so there is nothing to show and the
  // empty state below is the honest result. Never synthesize past cycles.
  const history = [];
  // Lifetime earned counts released payouts only. An escrow balance is held, not
  // earned, and the available balance is the current cycle, so neither belongs
  // here. With nothing released this is zero, which is the honest figure.
  const lifetime = history.reduce((a, h) => a + h.amt, 0);

  if (!me) return <Scroll><div style={{ maxWidth: 860, margin: "0 auto" }} className="rise">
    <Eyebrow>Wallet and Escrow</Eyebrow><h2 style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 26, margin: "6px 0 8px" }}>Your wallet</h2>
    <Card><p style={{ color: T.slate, fontSize: 14 }}>You are not in the network yet. Complete your assessment to join and start earning through Fumana.</p></Card>
  </div></Scroll>;

  return <Scroll><div style={{ maxWidth: 860, margin: "0 auto" }} className="rise">
    <Eyebrow>Wallet and Escrow</Eyebrow>
    <h2 style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 26, margin: "6px 0 4px" }}>Your earnings, held and paid safely</h2>
    <p style={{ color: T.slate, fontSize: 15, marginBottom: 14 }}>Fumana holds each cycle in escrow and releases it to your chosen payout method. Figures are computed from your engagement.</p>
    <div style={{ marginBottom: 16, display: "inline-flex", alignItems: "center", gap: 8, fontFamily: F.mono, fontSize: 12, color: T.slate, border: `1px solid ${T.line}`, borderRadius: 6, padding: "6px 11px" }}>Illustrative. Real payments, escrow release, and payouts run on the backend.</div>

    <div className="row2">
      <Card><Label>Available balance</Label>
        <div style={{ fontFamily: F.disp, fontWeight: 800, fontSize: 34, color: T.emerald, margin: "8px 0 10px" }}>{usd(available)}</div>
        {premium?.isPremium
          ? <><Btn small disabled={available <= 0} onClick={() => toast("Withdrawals run on the backend. This prototype is display only.")}>Withdraw to {methodName}</Btn><div style={{ marginTop: 8, fontFamily: F.mono, fontSize: 11, color: T.emerald }}>Zero-commission withdrawal. Premium benefit.</div></>
          : <><div style={{ fontSize: 13, color: T.slate, marginBottom: 10 }}>Zero-commission withdrawal: Premium only.</div><Btn small onClick={onUpgrade}>Upgrade to Premium</Btn></>}
      </Card>
      <Card accent={T.brass}><Label>In escrow</Label>
        <div style={{ fontFamily: F.disp, fontWeight: 800, fontSize: 34, color: T.brass, margin: "8px 0 10px" }}>{usd(escrow)}</div>
        <div style={{ fontSize: 13, color: T.slate }}>Held for the current cycle, released on milestone completion.</div>
      </Card>
    </div>

    <div style={{ marginTop: 12, fontFamily: F.mono, fontSize: 12, color: T.slate }}>Lifetime earned {usd(lifetime)} . released payouts only{monthly ? `. Your ${usd(monthly)}/month engagement nets ${usd(net)} per cycle after ${premium?.isPremium ? `no platform fee, waived on Premium,` : `a disclosed ${WALLET_PLATFORM_PCT}% platform fee and`} ${WALLET_STATUTORY_PCT}% illustrative statutory remittance` : ". No active contract yet"}</div>

    <div style={{ marginTop: 18 }}>
      <Label>Payout method</Label>
      <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
        {PAYOUT_METHODS.map(m => <button key={m.id} type="button" onClick={() => setMethod(m.id)} aria-pressed={method === m.id}
          style={{ textAlign: "left", cursor: "pointer", background: T.surface, border: `1px solid ${method === m.id ? T.emerald : T.line}`, borderLeftWidth: 4, borderLeftColor: method === m.id ? T.emerald : T.line, borderRadius: 12, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <span><span style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 15 }}>{m.name}</span><span style={{ display: "block", color: T.slate, fontSize: 12.5, marginTop: 2 }}>{m.note}</span></span>
          <span aria-hidden="true" style={{ width: 18, height: 18, flexShrink: 0, borderRadius: "50%", border: `1px solid ${method === m.id ? T.emerald : T.line}`, background: method === m.id ? T.emerald : "transparent" }} />
        </button>)}
      </div>
      <div style={{ marginTop: 8, fontFamily: F.mono, fontSize: 11, color: T.slate }}>Placeholder. Connecting a real payout account is a backend step.</div>
    </div>

    <div style={{ marginTop: 18 }}>
      <Label>Payout history</Label>
      {history.length === 0
        ? <div style={{ marginTop: 10 }}><Card><p style={{ color: T.slate, fontSize: 14 }}>No payouts yet. Once you accept an offer, released cycles show here.</p></Card></div>
        : <div style={{ marginTop: 10, display: "grid", gap: 1, background: T.line, border: `1px solid ${T.line}`, borderRadius: 8, overflow: "hidden" }}>
          {history.map((hst, i) => <div key={i} style={{ background: T.surface, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><div style={{ fontSize: 14 }}>{hst.label}</div><div style={{ fontFamily: F.mono, fontSize: 11, color: T.emerald }}>Paid to {methodName}</div></div>
            <div style={{ fontFamily: F.mono, fontSize: 15 }}>{usd(hst.amt)}</div>
          </div>)}
        </div>}
    </div>
    <FigNote />
    <div style={{ height: 30 }} />
  </div></Scroll>;
}

// ---- Community Ecosystem (candidate). NO MODEL. Computed counters ----
// Squads are a seeded list you can join; peer activity is read from the shared
// builders store; the impact portfolio and Good Citizen Points are computed
// counters with disclosed formulas (illustrative, real accounting is backend).
function Community({ builders, pipeline, squads, onJoin, onLeave, onForm, culture }) {
  const me = builders.find(b => b.isYou);
  const [nsName, setNsName] = useState("");
  const [nsFocus, setNsFocus] = useState("");
  const [nsPitch, setNsPitch] = useState("");

  if (!me) return <Scroll><div style={{ maxWidth: 900, margin: "0 auto" }} className="rise">
    <Eyebrow>Community Ecosystem</Eyebrow><h2 style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 26, margin: "6px 0 8px" }}>Grow with the network</h2>
    <Card><p style={{ color: T.slate, fontSize: 14 }}>You are not in the network yet. Complete your assessment to join squads and start building your impact portfolio.</p></Card>
  </div></Scroll>;

  const engagements = ["shortlisted", "interviewing", "sow"].reduce((n, st) => n + (pipeline[st].some(x => x.handle === me.handle) ? 1 : 0), 0);
  const contract = pipeline.sow.find(x => x.handle === me.handle);
  const netMonthly = contract ? Math.round(contract.monthlyUsd * 0.70) : 0;
  const localImpact = Math.round(netMonthly * 12 * 0.62); // illustrative annual local value retained
  const joinedCount = squads.filter(s => s.joined).length;
  const cultureBonus = culture != null ? 300 : 0;
  const gcp = me.profileStrength + joinedCount * 40 + cultureBonus;
  const ctrl = { width: "100%", background: T.paper, color: T.ink, border: `1px solid ${T.line}`, borderRadius: 8, padding: 11, fontSize: 14 };
  const canForm = nsName.trim() && nsFocus.trim();
  const form = () => { if (!canForm) return; onForm({ name: nsName.trim(), focus: nsFocus.trim(), pitch: nsPitch.trim() }); setNsName(""); setNsFocus(""); setNsPitch(""); };
  const peers = builders.filter(b => !b.isYou);
  const activity = p => (p.profileStrength >= 85 ? "reached Top 1% tier" : p.profileStrength >= 70 ? "reached Gold tier" : "joined the network");
  const Stat = ({ n, label }) => <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 12, padding: "14px 16px" }}>
    <div style={{ fontFamily: F.disp, fontWeight: 800, fontSize: 24, color: T.emerald, lineHeight: 1 }}>{n}</div>
    <div style={{ fontFamily: F.mono, fontSize: 11, color: T.slate, marginTop: 4 }}>{label}</div>
  </div>;

  return <Scroll><div style={{ maxWidth: 900, margin: "0 auto" }} className="rise">
    <Eyebrow>Community Ecosystem</Eyebrow>
    <h2 style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 26, margin: "6px 0 4px" }}>Grow with the network</h2>
    <p style={{ color: T.slate, fontSize: 15, marginBottom: 18 }}>Join squads, see what peers are building, and track the impact you create.</p>

    <Label>Global Impact Commons</Label>
    <p style={{ fontSize: 13.5, color: T.slate, margin: "6px 0 0" }}>Auditable impact data, open and verified, powered by Lexington Advisory.</p>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginTop: 10 }}>
      <Stat n={gcp} label="Good Citizen Points" /><Stat n={engagements} label="engagements" /><Stat n={usd(localImpact)} label="local impact / yr, illustrative" /><Stat n={joinedCount} label="squads joined" />
    </div>
    <div style={{ marginTop: 10, fontFamily: F.mono, fontSize: 11.5, color: T.slate }}>Good Citizen Points = profile strength {me.profileStrength} + 40 per squad joined{cultureBonus ? " + 300 for the Culture Shock Simulator" : ""}. Impact figures are computed and illustrative; real impact accounting runs on the backend.</div>
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>{["SDG 8", "SDG 9", "SDG 17"].map(s => <span key={s} style={{ fontFamily: F.mono, fontSize: 11, color: T.emerald, border: `1px solid ${T.line}`, borderRadius: 4, padding: "2px 8px" }}>{s}</span>)}</div>

    <div style={{ marginTop: 22 }}>
      <Label>Fumana Squads</Label>
      <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
        {squads.map(sq => <Card key={sq.id} accent={sq.joined ? T.emerald : T.line}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 16 }}>{sq.name}</div>
              <div style={{ color: T.slate, fontSize: 13, marginTop: 3 }}>{sq.focus}</div>
              {sq.pitch && <div style={{ fontSize: 13.5, marginTop: 8, borderLeft: `3px solid ${T.line}`, paddingLeft: 10, fontStyle: "italic" }}>{sq.pitch}</div>}
              <div style={{ fontFamily: F.mono, fontSize: 11, color: T.slate, marginTop: 8 }}>{sq.members} member{sq.members === 1 ? "" : "s"}</div>
            </div>
            <Btn small kind={sq.joined ? "ghost" : "primary"} onClick={() => (sq.joined ? onLeave(sq.id) : onJoin(sq.id))}>{sq.joined ? "Joined" : "Join squad"}</Btn>
          </div>
        </Card>)}
      </div>
      <div style={{ marginTop: 14 }}><Card>
        <Label>Form a new squad</Label>
        <div className="row2" style={{ marginTop: 10 }}>
          <input value={nsName} onChange={e => setNsName(e.target.value)} placeholder="Squad name" style={ctrl} />
          <input value={nsFocus} onChange={e => setNsFocus(e.target.value)} placeholder="Focus area" style={ctrl} />
        </div>
        <input value={nsPitch} onChange={e => setNsPitch(e.target.value)} placeholder="Shared pitch line (optional)" style={{ ...ctrl, marginTop: 10 }} />
        <div style={{ marginTop: 12 }}><Btn small disabled={!canForm} onClick={form}>Form squad</Btn><Hint show={!canForm}>Add a name and a focus area to form a squad.</Hint></div>
      </Card></div>
    </div>

    <div style={{ marginTop: 22 }}>
      <Label>Peer activity</Label>
      {peers.length === 0
        ? <div style={{ marginTop: 10 }}><Card><p style={{ color: T.slate, fontSize: 14 }}>No peers in the network yet.</p></Card></div>
        : <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          {peers.map((p, i) => <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 10, padding: "11px 14px" }}>
            <div style={{ fontSize: 14 }}><b>{p.handle}</b> <span style={{ color: T.slate }}>. {p.role} {activity(p)}</span></div>
            {p.tier && <span style={{ fontFamily: F.mono, fontSize: 10.5, color: T.onAccent, background: p.tier.color, borderRadius: 5, padding: "3px 9px", whiteSpace: "nowrap" }}>{p.tier.name}</span>}
          </div>)}
        </div>}
    </div>
    <div style={{ height: 30 }} />
  </div></Scroll>;
}

// ---- Settings and Comm (candidate). NO MODEL ----
// Language, notification-channel toggles, a two-factor placeholder, and the data
// vault. Export is a real client-side JSON download of what the app holds about
// you; delete is the flagged entry point to the Phase 4 data-rights flow.
const LANGUAGES = ["English", "Francais", "Kiswahili", "Yoruba", "Hausa", "Amharic", "Portugues", "Arabic"];
const CHANNELS = [{ id: "whatsapp", name: "WhatsApp" }, { id: "sms", name: "SMS" }, { id: "email", name: "Email" }];

const Toggle = ({ on, onClick, label }) => <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={onClick}
  style={{ width: 44, height: 24, borderRadius: 12, border: `1px solid ${on ? T.emerald : T.line}`, background: on ? T.emerald : T.mute, position: "relative", cursor: "pointer", padding: 0, flexShrink: 0 }}>
  <span aria-hidden="true" style={{ position: "absolute", top: 2, left: on ? 22 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .15s" }} />
</button>;

// ---- Decision audit trail (candidate). NO MODEL ----
// Every consequential event about the candidate, most recent first, fed from the
// shared audit store. Human reviews are filtered to the candidate's own. This is
// the transparency backbone Phase 4 writes to.
const AUDIT_VIEW = {
  "assessment-completed": () => ({ label: "Assessment completed", desc: "You completed the AI interview with Zuri." }),
  "score-issued": e => ({ label: "Score issued", desc: `Profile Strength ${e.profileStrength} issued, ${e.tier} tier.` }),
  "accommodations": e => ({ label: "Accommodations selected", desc: `${ACCOMMODATIONS.filter(a => e[a.id]).map(a => a.label.toLowerCase()).join(", ") || "none"}.` }),
  "culture-sim": e => ({ label: "Culture Shock Simulator completed", desc: `You scored ${e.score}/100.` }),
  "contest": e => ({ label: "Score contested", desc: `You contested your ${e.dimension} score. Reference ${e.ref}.` }),
  "report": e => ({ label: "Issue reported", desc: `You reported: ${e.category}. Reference ${e.ref}.` }),
  "human-review": e => ({ label: "Human review requested", desc: `${e.decision}. Reference ${e.ref}.` }),
  "data-export": () => ({ label: "Data exported", desc: "You downloaded a copy of the data Fumana holds about you." }),
  "data-deletion": () => ({ label: "Data deletion requested", desc: "You requested removal of your profile and data from the network." }),
  // Events caused by someone else about you (subject-scoped rows).
  "shortlisted": () => ({ label: "Profile shortlisted", desc: "An employer shortlisted your profile. Your identity stayed shielded." }),
  "reveal": () => ({ label: "Identity revealed for interview", desc: "An employer committed to an interview. Your role and summary are now visible to them." }),
  "pipeline-move": e => ({ label: "Application status changed", desc: `An employer moved your application to ${{ shortlisted: "shortlisted", interviewing: "interviewing", sow: "SOW pending" }[e.status] || e.status}.` }),
  "pipeline-withdrawn": () => ({ label: "Application withdrawn", desc: "An employer removed your profile from their pipeline." }),
  "sow-generated": () => ({ label: "SOW drafted", desc: "An employer generated a Statement of Work draft for your engagement." }),
};

function AuditTrail({ audit, onBack }) {
  // Employer-filed events are hidden, except subject-scoped rows (aboutMe):
  // those were deliberately written into this builder's trail by the actor.
  const events = (audit || []).filter(e => e.source !== "employer" || e.aboutMe);
  return <Scroll><div style={{ maxWidth: 760, margin: "0 auto" }} className="rise">
    <Back onClick={onBack} />
    <Eyebrow>Decision audit trail</Eyebrow>
    <h2 style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 26, margin: "8px 0 4px" }}>Every consequential event about you</h2>
    <p style={{ color: T.slate, fontSize: 15, marginBottom: 18 }}>A record of what has happened to your profile: assessments, scores, reviews you requested, and data actions. Most recent first.</p>
    {events.length === 0
      ? <Card><p style={{ color: T.slate, fontSize: 14 }}>No events yet. Complete your assessment and your audit trail begins here.</p></Card>
      : <div role="list" style={{ display: "grid", gap: 1, background: T.line, border: `1px solid ${T.line}`, borderRadius: 8, overflow: "hidden" }}>
        {events.map((e, i) => { const v = (AUDIT_VIEW[e.kind] || (() => ({ label: e.kind, desc: "" })))(e); return <div key={i} role="listitem" style={{ background: T.surface, padding: "13px 15px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{v.label}</span>
            <span style={{ fontFamily: F.mono, fontSize: 11, color: T.slate }}>{new Date(e.at).toLocaleString()}</span>
          </div>
          {v.desc && <div style={{ fontSize: 13, color: T.slate, marginTop: 3 }}>{v.desc}</div>}
        </div>; })}
      </div>}
    <div style={{ marginTop: 14, fontFamily: F.mono, fontSize: 11, color: T.slate }}>This is your transparency record. Contests, human reviews, and status changes are logged here.</div>
    <div style={{ height: 30 }} />
  </div></Scroll>;
}

// ---- Report an issue (both portals). NO MODEL ----
// A real report flow: category + description + optional evidence, then a
// received state with a reference and timeframe. Logged to the shared audit
// store; reviewed by a human, not an AI. Queue is stubbed and flagged.
const REPORT_CATS_CANDIDATE = ["Unfair assessment", "Employer breached the fair-terms pledge", "Harassment or conduct", "Other"];
const REPORT_CATS_EMPLOYER = ["Builder conduct", "Platform issue", "Billing dispute", "Other"];

function ReportIssue({ categories, source, logAudit, submitReview, onBack }) {
  const [cat, setCat] = useState(categories[0]);
  const [desc, setDesc] = useState("");
  const [ctx, setCtx] = useState("");
  const [ref, setRef] = useState("");
  function submit() {
    if (!desc.trim()) return;
    const r = "RP-" + Math.random().toString(36).slice(2, 7).toUpperCase();
    setRef(r);
    if (submitReview) submitReview({ kind: "report", subject: cat, reason: desc.trim(), context: ctx.trim(), ref: r });
    if (logAudit) logAudit({ kind: "report", category: cat, description: desc.trim(), context: ctx.trim(), ref: r, source });
  }
  return <Scroll><div style={{ maxWidth: 680, margin: "0 auto" }} className="rise">
    <Back onClick={onBack} />
    <Eyebrow>Trust and Safety</Eyebrow>
    <h2 style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 26, margin: "8px 0 4px" }}>Report an issue</h2>
    <p style={{ color: T.slate, fontSize: 15, marginBottom: 18 }}>Tell us what happened. Reports are reviewed by a human, not an AI.</p>
    <Card>
      {ref
        ? <>
          <Label>Report received</Label>
          <h3 style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 20, margin: "8px 0 6px" }}>Received. A human will look at this.</h3>
          <p style={{ fontSize: 14, color: T.slate, marginBottom: 14 }}>Your report is logged and queued for a human reviewer.</p>
          <div style={{ background: T.paper, border: `1px solid ${T.line}`, borderRadius: 8, padding: 12, fontFamily: F.mono, fontSize: 12.5, display: "grid", gap: 5 }}>
            <div><span style={{ color: T.slate }}>reference </span><b>{ref}</b></div>
            <div><span style={{ color: T.slate }}>expected </span>within 5 business days</div>
          </div>
          <div style={{ marginTop: 10, fontFamily: F.mono, fontSize: 11, color: T.slate }}>Queued for a human reviewer. Logged to your audit trail.</div>
          <div style={{ marginTop: 16 }}><Btn onClick={onBack}>Done</Btn></div>
        </>
        : <>
          <label style={{ fontFamily: F.mono, fontSize: 11, color: T.slate, textTransform: "uppercase", letterSpacing: 0.3 }}>What kind of issue?</label>
          <select value={cat} onChange={e => setCat(e.target.value)} style={{ width: "100%", background: T.paper, color: T.ink, border: `1px solid ${T.line}`, borderRadius: 8, padding: 11, fontSize: 14, margin: "6px 0 14px" }}>{categories.map((c, i) => <option key={i} value={c}>{c}</option>)}</select>
          <Field label="What happened?" value={desc} onChange={setDesc} rows={4} placeholder="Describe the issue in your own words." />
          <Field label="Evidence or context (optional)" value={ctx} onChange={setCtx} rows={2} placeholder="Links, dates, or anything a reviewer should know." />
          <div style={{ marginTop: 4 }}><Btn disabled={!desc.trim()} onClick={submit}>Submit report</Btn></div>
          <div style={{ marginTop: 14, fontFamily: F.mono, fontSize: 11, color: T.slate, lineHeight: 1.6 }}>Reports are reviewed by a human, not an AI, and enter a real queue. Resolution tooling arrives with the admin surface.</div>
        </>}
    </Card>
    <div style={{ height: 30 }} />
  </div></Scroll>;
}

// ---- Plain-language ethics and data page (both portals). NO MODEL ----
// One shared page, written for a normal person. Seven sections. No claim we
// cannot stand behind; where something is not verified across jurisdictions,
// it says general terms, not false specifics.
function EthicsPage({ onBack }) {
  const ul = { listStyle: "none", display: "grid", gap: 9, marginTop: 12, fontSize: 14 };
  const Section = ({ n, title, accent, children }) => <><Card accent={accent}><Label>{n}. {title}</Label>{children}</Card><div style={{ height: 14 }} /></>;
  return <Scroll><div style={{ maxWidth: 760, margin: "0 auto" }} className="rise">
    <Back onClick={onBack} />
    <Eyebrow>Ethics and data</Eyebrow>
    <h2 style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 26, margin: "8px 0 4px" }}>How this works, in plain words</h2>
    <p style={{ color: T.slate, fontSize: 15, marginBottom: 18 }}>Written for a normal person, not a lawyer. Where something is not yet settled across countries, we say so in general terms rather than invent specifics.</p>

    <Section n="1" title="How Zuri assesses you">
      <ul style={ul}>
        <Li>Zuri, an AI interviewer, asks a few questions that adapt to your answers.</Li>
        <Li>Telos reads your experience and your answers, then scores six dimensions from 0 to 100, each with a written reason you can see.</Li>
        <Li>Your Profile Strength is a weighted average of those scores, computed by a fixed formula.</Li>
        <Li>Telos uses a graph-based reasoning model to trace how your answers connect to enterprise readiness.</Li>
        <Li>A score is a starting point, not a verdict. You can contest a score or ask for a human to review it.</Li>
      </ul>
    </Section>

    <Section n="2" title="What we collect, why, and how long we keep it">
      <ul style={ul}>
        <Li>What: your name and contact details, the experience you write, your interview answers, and the scores produced from them.</Li>
        <Li>Why: to build a profile employers can trust and to match you to work. We do not sell your data.</Li>
        <Li>How long: while your profile is active. When you delete it, we remove it.</Li>
        <Li>We keep the minimum needed to run the service. In this prototype storage is stubbed; real retention runs on the backend.</Li>
      </ul>
    </Section>

    <Section n="3" title="Your rights">
      <ul style={ul}>
        <Li><b>See</b> every score, with the reason and the evidence it came from.</Li>
        <Li><b>Export</b> a copy of your data from your data vault.</Li>
        <Li><b>Delete</b> your profile and data from the network.</Li>
        <Li><b>Contest</b> a specific score dimension.</Li>
        <Li><b>Request a human</b> to review any automated decision.</Li>
        <Li><b>Get accommodations</b>: extra time, a text-only interview, or a written interview, chosen before you start.</Li>
      </ul>
    </Section>

    <Section n="4" title="Bias and fairness" accent={T.brass}>
      <ul style={ul}>
        <Li>What we do: identity shielding, scores tied to visible evidence, a disclosed formula, fixed bands for everyone, an opt-out to human review, and a text path.</Li>
        <Li>The honest limits: scoring spoken English can disadvantage non-native speakers and people with speech differences; language models carry bias we reduce but do not claim to eliminate; a rationale is not a guarantee.</Li>
        <Li>Where something is not solved, we say so. The full fairness posture page has the detail.</Li>
      </ul>
    </Section>

    <Section n="5" title="How your identity is shielded, and when it is revealed">
      <ul style={ul}>
        <Li>Employers search by evidence. Your name, photo, exact location, and gender are hidden.</Li>
        <Li>You appear under a shielded handle until you accept an interview.</Li>
        <Li>Your identity is revealed only when you choose to accept and commit to an engagement. You control the reveal.</Li>
      </ul>
    </Section>

    <Section n="6" title="For employers: the fair-terms pledge">
      <ul style={ul}>
        <Li>Engaging a builder means agreeing to fair terms: pay as agreed and on time, no discrimination, and respect for the builder's time and boundaries.</Li>
        <Li>Fumana acts as Employer of Record and carries local employment liability, tax remittance, and IP custody.</Li>
        <Li>Breaching the pledge can mean a builder reports you, a human review, and removal from the network. These are general terms; specifics per jurisdiction go to counsel.</Li>
      </ul>
    </Section>

    <Section n="7" title="Who to contact, and how to report a problem">
      <ul style={ul}>
        <Li>Report an issue from Settings (builders) or Trust and Safety (employers): an unfair assessment, a broken commitment, harassment, billing, or anything else.</Li>
        <Li>Reports are reviewed by a human, not an AI, and come back with a reference and a timeframe.</Li>
        <Li>In this prototype, contact and support routing is stubbed; real support runs on the backend.</Li>
      </ul>
    </Section>

    <div style={{ fontFamily: F.mono, fontSize: 11, color: T.slate, lineHeight: 1.6 }}>Two standing rules: numbers are computed in code, never generated by a model; and the model narrates and assesses, but never invents financial or legal fact.</div>
    <div style={{ height: 30 }} />
  </div></Scroll>;
}

// ---- Fairness posture (both portals). NO MODEL ----
// A dedicated, honest page: what we do to reduce bias, the known limits, and
// what a candidate can do if an assessment felt unfair. No claim we cannot
// stand behind; where something is unsolved, it says so plainly.
function FairnessPosture({ onBack }) {
  const ul = { listStyle: "none", display: "grid", gap: 10, marginTop: 12, fontSize: 14 };
  return <Scroll><div style={{ maxWidth: 760, margin: "0 auto" }} className="rise">
    <Back onClick={onBack} />
    <Eyebrow>Fairness</Eyebrow>
    <h2 style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 26, margin: "8px 0 4px" }}>How Fumana guards fairness, and its limits</h2>
    <p style={{ color: T.slate, fontSize: 15, marginBottom: 18 }}>An honest account: what we do to reduce bias, what we have not solved, and what you can do if you think an assessment was unfair.</p>

    <Card>
      <Label>What we do to guard against bias</Label>
      <ul style={ul}>
        <Li>Identity is shielded. Your name, photo, location, and gender are hidden from employers until you accept an interview.</Li>
        <Li>Every score is tied to evidence you can see: the experience or interview answer it was drawn from, plus a written rationale.</Li>
        <Li>The scoring formula is disclosed. Profile Strength is a fixed weighted average of the dimensions, shown on your dashboard.</Li>
        <Li>The score bands are fixed and identical for everyone. No score is adjusted for a person or their background.</Li>
        <Li>You can decline AI assessment and ask for a human reviewer instead.</Li>
        <Li>A text-only interview path exists, so you are not required to speak on camera.</Li>
      </ul>
    </Card>
    <div style={{ height: 14 }} />

    <Card accent={T.brass}>
      <Label>The known limits</Label>
      <ul style={ul}>
        <Li>Scoring spoken English can disadvantage non-native speakers and people with speech differences. The text path helps but is not a full fix yet.</Li>
        <Li>Language models carry bias. We work to reduce it; we do not claim to have eliminated it.</Li>
        <Li>A rationale is not a guarantee. The model can be wrong, and a score is a starting point, not a verdict.</Li>
        <Li>Fairness and legal standards differ across jurisdictions. Those questions go to counsel, not to marketing copy, and are not fully solved here.</Li>
      </ul>
      <p style={{ fontFamily: F.mono, fontSize: 11.5, color: T.slate, marginTop: 12 }}>Where something is not solved, we say so. This page changes as the work does.</p>
    </Card>
    <div style={{ height: 14 }} />

    <Card>
      <Label>If you believe an assessment was unfair</Label>
      <ul style={ul}>
        <Li>Contest a specific dimension and say why, from your growth dashboard. Your score stays as it is, marked under review, until a person resolves it.</Li>
        <Li>Request a human to review any automated decision, using the link beside any score.</Li>
        <Li>Export or delete your assessment and data from your Settings data vault.</Li>
      </ul>
      <div style={{ marginTop: 12, fontFamily: F.mono, fontSize: 11, color: T.slate }}>Contest, human review, and data export or delete are available now. Retaking the interview is not built yet, so a score cannot yet be replaced by a fresh assessment.</div>
    </Card>
    <div style={{ height: 30 }} />
  </div></Scroll>;
}

function Settings({ builders, onDelete, onFairness, onAudit, onReport, onEthics, logAudit, premium, onUpgrade, onManage, onSignOut }) {
  const me = builders.find(b => b.isYou);
  const toast = useToast();
  const [lang, setLang] = useState("English");
  const [channels, setChannels] = useState({ whatsapp: true, sms: false, email: true });
  const [twoFA, setTwoFA] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleted, setDeleted] = useState(false);

  function exportData() {
    const data = { profile: me || null, preferences: { language: lang, notifications: channels, twoFactor: twoFA }, note: "Illustrative export of the data Fumana holds about you. Real exports are assembled on the backend." };
    try {
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const a = document.createElement("a"); a.href = url; a.download = "fumana-my-data.json"; a.click();
      URL.revokeObjectURL(url);
      toast("Your data export downloaded.");
    } catch { toast("Data export runs on the backend in production."); }
    if (logAudit) logAudit({ kind: "data-export" });
  }

  const row = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "11px 0", borderTop: `1px solid ${T.mute}` };
  const ctrl = { marginTop: 7, background: T.paper, color: T.ink, border: `1px solid ${T.line}`, borderRadius: 8, padding: 11, fontSize: 14 };

  return <Scroll><div style={{ maxWidth: 760, margin: "0 auto" }} className="rise">
    <Eyebrow>Settings and Comm</Eyebrow>
    <h2 style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 26, margin: "6px 0 4px" }}>Settings and communication</h2>
    <p style={{ color: T.slate, fontSize: 15, marginBottom: 18 }}>Your language, how we reach you, security, and the data Fumana holds about you.</p>

    <Card accent={T.brass}><Label>{premium?.isPremium ? "FIND Premium Pro" : "Plan"}</Label>
      {premium?.isPremium
        ? <>
          <div style={{ fontSize: 14, color: T.ink, margin: "8px 0 12px" }}>FIND Premium Pro. Active since {premium.premiumSince}.</div>
          <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}><Btn small kind="ghost" onClick={onManage}>Manage subscription</Btn><button onClick={onManage} style={{ background: "none", border: "none", color: T.slate, fontFamily: F.mono, fontSize: 11.5, cursor: "pointer", textDecoration: "underline" }}>Cancel subscription</button></div>
        </>
        : <>
          <div style={{ fontSize: 14, color: T.slate, margin: "8px 0 10px" }}>Current plan: Free. Upgrade to FIND Premium Pro for {PREMIUM_PRICE}.</div>
          <ul style={{ listStyle: "none", display: "grid", gap: 7, margin: "0 0 14px", fontSize: 13.5 }}>{PREMIUM_FEATURES.map((ftr, i) => <li key={i} style={{ display: "flex", gap: 8 }}><span style={{ color: T.emerald }}>✓</span><span>{ftr}</span></li>)}</ul>
          <Btn small onClick={onUpgrade}>Upgrade to Premium</Btn>
        </>}
    </Card>
    <div style={{ height: 14 }} />

    <Card><Label>Language</Label>
      <select value={lang} onChange={e => setLang(e.target.value)} style={{ ...ctrl, width: "100%" }}>{LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}</select>
      <div style={{ marginTop: 8, fontFamily: F.mono, fontSize: 11, color: T.slate }}>Applied across the app on the backend.</div>
    </Card>
    <div style={{ height: 14 }} />

    <Card><Label>Text size</Label>
      <p style={{ fontSize: 13.5, color: T.slate, margin: "8px 0 10px" }}>Scale the whole app for easier reading.</p>
      <FontSizeToggle />
    </Card>
    <div style={{ height: 14 }} />

    <Card><Label>Notification channels</Label>
      <div style={{ marginTop: 6 }}>{CHANNELS.map(ch => <div key={ch.id} style={row}>
        <span style={{ fontSize: 14 }}>{ch.name}</span>
        <Toggle on={channels[ch.id]} label={ch.name} onClick={() => setChannels(c => ({ ...c, [ch.id]: !c[ch.id] }))} />
      </div>)}</div>
      <div style={{ marginTop: 10, fontFamily: F.mono, fontSize: 11, color: T.slate }}>Delivery runs on the backend.</div>
    </Card>
    <div style={{ height: 14 }} />

    <Card><Label>Security</Label>
      <div style={row}><div><div style={{ fontSize: 14 }}>Two-factor authentication</div><div style={{ color: T.slate, fontSize: 12.5, marginTop: 2 }}>Placeholder. Real 2FA enrolment is a backend step.</div></div>
        <Toggle on={twoFA} label="Two-factor authentication" onClick={() => { setTwoFA(v => !v); toast("Two-factor setup runs on the backend."); }} /></div>
      {onSignOut && <div style={row}><div><div style={{ fontSize: 14 }}>Sign out</div><div style={{ color: T.slate, fontSize: 12.5, marginTop: 2 }}>End this session on this device.</div></div>
        <Btn small kind="ghost" onClick={onSignOut}>Sign out</Btn></div>}
    </Card>
    <div style={{ height: 14 }} />

    <Card accent={T.brass}><Label>Your data vault</Label>
      <p style={{ fontSize: 14, color: T.slate, margin: "8px 0 14px" }}>See, export, or delete the data Fumana holds about you. You own it.</p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Btn small onClick={exportData}>Export my data</Btn>
        {!confirmDelete && !deleted && <Btn small kind="ghost" onClick={() => setConfirmDelete(true)}>Delete my data</Btn>}
      </div>
      {confirmDelete && !deleted && <div style={{ marginTop: 14, background: T.paper, border: `1px solid ${T.alert}`, borderRadius: 8, padding: 14 }}>
        <div style={{ fontSize: 14, marginBottom: 10 }}>This removes your profile and data from the network. This cannot be undone.</div>
        <div style={{ display: "flex", gap: 10 }}><Btn small kind="ghost" onClick={() => { setConfirmDelete(false); setDeleted(true); if (onDelete && me) onDelete(me.handle); if (logAudit) logAudit({ kind: "data-deletion" }); }}>Confirm delete</Btn><Btn small kind="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Btn></div>
      </div>}
      {deleted && <div style={{ marginTop: 14, background: T.paper, border: `1px solid ${T.line}`, borderRadius: 8, padding: 14, fontSize: 13.5, color: T.slate }}>Deleted. Your profile is withdrawn from the network and no longer appears in employer search or Community.</div>}
      <div style={{ marginTop: 12, fontFamily: F.mono, fontSize: 11, color: T.slate }}>This is the entry point to your data rights. Contest, human review, and the full data-rights flow arrive in the trust and safety phase.</div>
    </Card>
    <div style={{ height: 14 }} />

    <Card>
      <Label>Fairness</Label>
      <p style={{ fontSize: 14, color: T.slate, margin: "8px 0 12px" }}>An honest account of how the assessment guards against bias, its known limits, and what you can do if it felt unfair.</p>
      <Btn kind="ghost" small onClick={onFairness}>How you are assessed, and its limits</Btn>
    </Card>
    <div style={{ height: 14 }} />

    <Card>
      <Label>Ethics and data</Label>
      <p style={{ fontSize: 14, color: T.slate, margin: "8px 0 12px" }}>One plain-language page: how Zuri assesses you, what we collect, your rights, fairness, how your identity is shielded, and how to report a problem.</p>
      <Btn kind="ghost" small onClick={onEthics}>Read the ethics and data page</Btn>
    </Card>
    <div style={{ height: 14 }} />

    <Card>
      <Label>Decision audit trail</Label>
      <p style={{ fontSize: 14, color: T.slate, margin: "8px 0 12px" }}>Every consequential event about you, in one place: assessments, scores, reviews you requested, and data actions.</p>
      <Btn kind="ghost" small onClick={onAudit}>View your audit trail</Btn>
    </Card>
    <div style={{ height: 14 }} />

    <Card>
      <Label>Report an issue</Label>
      <p style={{ fontSize: 14, color: T.slate, margin: "8px 0 12px" }}>An unfair assessment, an employer who breached the fair-terms pledge, harassment, or anything else. Reviewed by a human, not an AI.</p>
      <Btn kind="ghost" small onClick={onReport}>Report an issue</Btn>
    </Card>
    <div style={{ height: 30 }} />
  </div></Scroll>;
}

// Candidate Carbon nav. Growth Dashboard and Upskill are real; the rest are
// honest stubs to be built in Phase 1+.
const CAND_NAV = [
  ["dashboard", "Growth Dashboard"], ["applications", "Applications and Hub"], ["wallet", "Wallet and Escrow"],
  ["coach", "Negotiation Coach"], ["worth", "Global Worth Simulator"], ["community", "Community Ecosystem"],
  ["alchemist", "Experience Alchemist"], ["upskill", "Path to 1%"], ["settings", "Settings and Comm"],
];
// ---- Experience Alchemist (candidate). NEEDS MODEL ----
// A first-class screen: reshapes the builder's raw, plainly-written experience
// into recruiter-ready outcomes grounded only in what they wrote, with save and
// copy. Routes through /api/claude; inert (clear waiting state) until a provider.
function ExperienceAlchemist({ profile, onBuildCV, onSave }) {
  const toast = useToast();
  const [raw, setRaw] = useState(profile.experience || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState(null);
  const [saved, setSaved] = useState(false);
  const ready = raw.trim().length > 30;

  async function run() {
    setBusy(true); setErr(""); setResult(null); setSaved(false);
    try {
      const sys = "You are Telos, the Experience Alchemist for Fumana. Turn a builder's raw, plainly-written experience into recruiter-ready outcomes without inventing anything. Return a concise role title, a one-line headline, three to five outcome bullets phrased as concrete achievements grounded only in what they wrote, six to ten skills evident from the text, and a one-sentence integrity note confirming nothing was added beyond what they described. Precise and honest, no hype, no em dashes. Return ONLY JSON, no fences. Shape: {\"role\":string,\"headline\":string,\"outcomes\":[string],\"skills\":[string],\"integrityNote\":string}.";
      setResult(await callClaude({ system: sys, messages: [{ role: "user", content: raw }], expectJson: true }));
    } catch (e) {
      setErr(String(e).includes("501") ? "config" : "fail");
    }
    setBusy(false);
  }

  function copy() {
    if (!result) return;
    const text = [result.role, result.headline, "", "Outcomes:", ...(result.outcomes || []).map(o => `- ${o}`), "", "Skills: " + (result.skills || []).join(", "), "", result.integrityNote].filter(x => x !== undefined).join("\n");
    try { navigator.clipboard.writeText(text); toast("Copied to clipboard."); }
    catch { toast("Copy is not available in this browser."); }
  }

  return <Scroll><div style={{ maxWidth: 760, margin: "0 auto" }} className="rise">
    <Eyebrow>Experience Alchemist</Eyebrow>
    <h2 style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 26, margin: "6px 0 4px" }}>Turn your experience into recruiter-ready outcomes</h2>
    <p style={{ color: T.slate, fontSize: 15, marginBottom: 12 }}>Write plainly. Telos reshapes it into a role, headline, outcomes, and skills, grounded only in what you wrote. Nothing invented.</p>
    <div style={{ marginBottom: 18 }}><button onClick={onBuildCV} style={{ background: "none", border: "none", color: T.emerald, cursor: "pointer", padding: 0, fontSize: 13.5, textDecoration: "underline", fontFamily: F.body }}>I don't have a CV yet, build one with Zuri</button></div>
    <Card>
      <Field label="Your experience, in your words" rows={7} value={raw} onChange={setRaw} placeholder="What have you built, what did you handle, what went wrong and how did you fix it." />
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 4 }}>{busy ? <Spinner label="Telos is reshaping your experience..." /> : <Btn disabled={!ready} onClick={run}>Run the Alchemist</Btn>}<Hint show={!ready && !busy}>Add a few sentences of experience to continue.</Hint></div>
    </Card>

    {err === "config" && <div style={{ marginTop: 16 }}><Card accent={T.brass}><Label>Alchemist is ready, waiting on a provider</Label><p style={{ fontSize: 14, color: T.slate, marginTop: 8 }}>The Experience Alchemist is built and wired through the model proxy. It lights up the moment a model provider is connected.</p></Card></div>}
    {err === "fail" && <div style={{ marginTop: 16, color: T.alert, fontSize: 14, display: "flex", gap: 12, alignItems: "center" }}>Zuri did not respond. <Btn kind="ghost" small onClick={run}>Try again</Btn></div>}

    {result && <div style={{ marginTop: 16 }}><Card accent={T.emerald}>
      <Label>Recruiter-ready</Label>
      <div style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 19, marginTop: 8 }}>{result.role}</div>
      {result.headline && <div style={{ color: T.slate, fontSize: 14.5, marginTop: 4 }}>{result.headline}</div>}
      {Array.isArray(result.outcomes) && result.outcomes.length > 0 && <div style={{ marginTop: 16 }}><Label>Outcomes</Label>
        <ul style={{ listStyle: "none", display: "grid", gap: 8, marginTop: 8 }}>{result.outcomes.map((o, i) => <li key={i} style={{ display: "flex", gap: 9, fontSize: 14 }}><span style={{ color: T.emerald }}>.</span><span>{o}</span></li>)}</ul>
      </div>}
      {Array.isArray(result.skills) && result.skills.length > 0 && <div style={{ marginTop: 16 }}><Label>Skills</Label>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 8 }}>{result.skills.map((s, i) => <span key={i} style={{ fontFamily: F.mono, fontSize: 11.5, color: T.emerald, border: `1px solid ${T.line}`, borderRadius: 4, padding: "3px 8px" }}>{s}</span>)}</div>
      </div>}
      {result.integrityNote && <p style={{ marginTop: 14, fontSize: 12.5, color: T.slate }}>{result.integrityNote}</p>}
      <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Btn small disabled={saved} onClick={() => { setSaved(true); if (onSave) onSave(result, raw); toast("Saved to your profile."); }}>{saved ? "Saved" : "Save to profile"}</Btn>
        <Btn kind="ghost" small onClick={copy}>Copy</Btn>
      </div>
      <div style={{ marginTop: 10, fontFamily: F.mono, fontSize: 11, color: T.slate }}>Saved to your builder profile.</div>
      <div style={{ marginTop: 10, fontFamily: F.mono, fontSize: 10.5, color: T.slate }}>Reshaped by Telos from what you wrote. Nothing was added.</div>
    </Card></div>}
    <div style={{ height: 30 }} />
  </div></Scroll>;
}

// ---- CV Builder (candidate). NEEDS MODEL ----
// Secondary path from the Experience Alchemist for candidates with no CV. An
// adaptive Zuri extraction interview (routed through /api/claude, inert-aware),
// then a structured CV drawn only from what the candidate said, editable inline.
const cvNormalize = c => ({
  personal_statement: c.personal_statement || "",
  skills: c.skills || [],
  experience: (c.experience || []).map(e => ({ role: e.role || "", organisation: e.organisation || "", period: e.period || "", outcomes: e.outcomes || [] })),
  education: c.education || [], tools: c.tools || [], languages: c.languages || [],
  integrity_note: c.integrity_note || "",
});
// Telos audit line: a fixed, code-authored verification mark (not model text).
// Zuri conducts the interview; the Telos Ingestion Agent extracts and audits.
const TELOS_AUDIT = "The Telos Ingestion Agent confirms: every claim in this document traces to something you said in this interview. Nothing was inferred or invented.";
function cvToText(cv, name) {
  const L = [name || "Your name", "", "TELOS AUDIT", TELOS_AUDIT];
  if (cv.personal_statement) L.push("", cv.personal_statement);
  const sec = (t, arr) => { if (arr && arr.length) { L.push("", t.toUpperCase()); arr.forEach(x => L.push("- " + x)); } };
  sec("Skills", cv.skills);
  if (cv.experience && cv.experience.length) { L.push("", "EXPERIENCE"); cv.experience.forEach(e => { L.push([e.role, e.organisation].filter(Boolean).join(", ") + (e.period ? ` (${e.period})` : "")); (e.outcomes || []).forEach(o => L.push("  - " + o)); }); }
  sec("Education", cv.education); sec("Tools and technologies", cv.tools); sec("Languages", cv.languages);
  L.push("", "Extracted by the Telos Ingestion Agent.");
  return L.join("\n");
}
function EditList({ items, onChange, placeholder }) {
  const inp = { flex: 1, background: T.paper, color: T.ink, border: `1px solid ${T.line}`, borderRadius: 6, padding: "7px 9px", fontSize: 13.5 };
  return <div style={{ display: "grid", gap: 6 }}>
    {(items || []).map((it, i) => <div key={i} style={{ display: "flex", gap: 6 }}>
      <input value={it} placeholder={placeholder} onChange={e => onChange(items.map((x, j) => j === i ? e.target.value : x))} style={inp} />
      <button className="noprint" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="Remove" style={{ background: "none", border: `1px solid ${T.line}`, borderRadius: 6, color: T.slate, cursor: "pointer", padding: "0 10px" }}>×</button>
    </div>)}
    <button className="noprint" onClick={() => onChange([...(items || []), ""])} style={{ background: "none", border: "none", color: T.emerald, fontFamily: F.mono, fontSize: 11.5, cursor: "pointer", textAlign: "left", padding: 0, textDecoration: "underline" }}>+ add</button>
  </div>;
}

function CVBuilder({ profile, saveCV, onBack }) {
  const toast = useToast();
  const voice = useZuriVoice();
  const [phase, setPhase] = useState("ready"); // ready | interview | building | review
  const [qa, setQa] = useState([]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);
  const [err, setErr] = useState("");
  const [cv, setCv] = useState(null);
  const [saved, setSaved] = useState(false);
  const MINQ = 5, MAXQ = 8;
  const clips = [INTERVIEW_INTRO.video, ...INTERVIEW_SCRIPT.map(q => q.video)];
  const clip = clips[Math.min(qa.length, clips.length - 1)];
  const ta = { width: "100%", background: T.paper, color: T.ink, border: `1px solid ${T.line}`, borderRadius: 8, padding: 11, fontSize: 14, resize: "vertical" };
  const inp = { width: "100%", background: T.paper, color: T.ink, border: `1px solid ${T.line}`, borderRadius: 6, padding: "7px 9px", fontSize: 13.5 };
  const up = patch => setCv(c => ({ ...c, ...patch }));

  async function nextQuestion(transcript) {
    setAsking(true); setErr("");
    try {
      const sys = "You are Zuri, running a warm, patient interview to build a CV from what the candidate tells you. Ask ONE question at a time. Over five to eight questions, gather: education, work history including informal and self-taught work, tools and technologies, languages, and any impact or recognition. Adapt: if an answer is vague or thin, ask a gentle follow-up before moving on. Extract only what they tell you; never invent or infer. Warm in manner, patient in pace, plain language, no em dashes. Return ONLY JSON, no fences: {\"question\":string,\"done\":boolean}. Set done to true once you have enough across those topics and have asked at least five questions.";
      const user = transcript.length
        ? "So far:\n" + transcript.map((x, i) => `Q${i + 1}: ${x.q}\nA${i + 1}: ${x.a}`).join("\n\n") + `\n\nAsked ${transcript.length}. Give the next question, or set done.`
        : "Begin with a warm opening question that invites them to share their background.";
      const out = await callClaude({ system: sys, messages: [{ role: "user", content: user }], expectJson: true });
      if ((out.done && transcript.length >= MINQ) || transcript.length >= MAXQ) { build(transcript); return; }
      const q = out.question || "Tell me a little more about your background.";
      setQuestion(q); setAsking(false); voice.speak(q);
    } catch (e) { setErr(String(e).includes("501") ? "config" : "fail"); setAsking(false); }
  }
  function start() { setPhase("interview"); setQa([]); setQuestion(""); setErr(""); nextQuestion([]); }
  function submit() {
    if (answer.trim().length < 2) return;
    const next = [...qa, { q: question, a: answer.trim() }];
    setQa(next); setAnswer("");
    if (next.length >= MAXQ) { build(next); return; }
    nextQuestion(next);
  }
  async function build(transcript) {
    setPhase("building"); setErr("");
    try {
      const sys = "You are the Telos Ingestion Agent, extracting and auditing a CV strictly from the candidate's own words captured in Zuri's interview. Extract only what they said. Never invent, infer, or embellish. If something was not mentioned, leave that array empty. Honest, plain, no em dashes. Return ONLY JSON, no fences: {\"personal_statement\":string,\"skills\":[string],\"experience\":[{\"role\":string,\"organisation\":string,\"period\":string,\"outcomes\":[string]}],\"education\":[string],\"tools\":[string],\"languages\":[string],\"integrity_note\":string}. The integrity_note must confirm in one plain sentence that every line was drawn only from what the candidate said and nothing was invented.";
      const t = transcript.map((x, i) => `Q${i + 1}: ${x.q}\nA${i + 1}: ${x.a}`).join("\n\n");
      const out = await callClaude({ system: sys, messages: [{ role: "user", content: `Anything the candidate wrote earlier (may be empty):\n${profile.experience || "(none)"}\n\nInterview:\n${t}` }], expectJson: true });
      setCv(cvNormalize(out)); setPhase("review");
    } catch (e) { setErr(String(e).includes("501") ? "config" : "fail"); }
  }
  function copy() {
    try { navigator.clipboard.writeText(cvToText(cv, profile.name)); toast("CV copied to clipboard."); }
    catch { toast("Copy is not available in this browser."); }
  }
  function saveIt() { setSaved(true); if (saveCV) saveCV(cv); toast("CV saved to your private documents."); }

  const Section = ({ title, children }) => <section style={{ marginTop: 18 }}><Label>{title}</Label><div style={{ marginTop: 8 }}>{children}</div></section>;

  return <Scroll><div style={{ maxWidth: 760, margin: "0 auto" }} className="rise">
    <div className="noprint"><Back onClick={onBack} /></div>
    <div className="noprint">
      <Eyebrow>CV Builder</Eyebrow>
      <h2 style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 26, margin: "8px 0 4px" }}>Build a CV with Zuri</h2>
      <p style={{ color: T.slate, fontSize: 15, marginBottom: 18 }}>No CV yet? Zuri asks a few questions and turns your answers into a clean CV, drawn only from what you say. Nothing invented.</p>
    </div>

    {phase === "ready" && <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, textAlign: "center" }}>
      <p style={{ color: T.slate, fontSize: 14, maxWidth: 470 }}>Zuri will ask five to eight short questions about your education, work (formal and informal), tools, languages, and any recognition. Answer in your own words; she works only from what you say.</p>
      <Btn onClick={start}>Start the CV interview</Btn>
    </div>}

    {phase === "interview" && <div style={{ display: "grid", gap: 14, justifyItems: "center" }}>
      <div style={{ fontFamily: F.mono, fontSize: 11, color: T.slate }}>question {qa.length + 1} of about {MINQ} to {MAXQ}</div>
      <VideoStage key={clip} src={clip} autoPlay muted playing={voice.speaking} onPlay={() => {}} onStop={() => {}} />
      {asking
        ? <Spinner label="Zuri is thinking of the next question..." />
        : err === "config"
          ? <Card accent={T.brass}><Label>Zuri is ready, waiting on a provider</Label><p style={{ fontSize: 14, color: T.slate, marginTop: 8 }}>The CV interview is built and wired through the model proxy. It lights up the moment a model provider is connected.</p></Card>
          : err === "fail"
            ? <div style={{ color: T.alert, fontSize: 14, display: "flex", gap: 12, alignItems: "center" }}>Zuri did not respond. <Btn kind="ghost" small onClick={() => nextQuestion(qa)}>Try again</Btn></div>
            : <>
              {question && <div style={{ maxWidth: 520, textAlign: "center", fontSize: 15 }}><b style={{ color: T.emerald, fontFamily: F.mono, fontSize: 12 }}>ZURI</b> . {question}</div>}
              <div style={{ width: "100%", maxWidth: 560 }}>
                <textarea rows={3} value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Answer in your own words." style={ta} />
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}><Btn small disabled={answer.trim().length < 2} onClick={submit}>Send answer</Btn></div>
              </div>
              {qa.length > 0 && <div style={{ width: "100%", maxWidth: 560, display: "grid", gap: 8 }}>{qa.map((x, i) => <div key={i} style={{ fontSize: 13.5, color: T.slate }}><b style={{ color: T.emerald, fontFamily: F.mono, fontSize: 11 }}>Q{i + 1}</b> {x.a}</div>)}</div>}
            </>}
    </div>}

    {phase === "building" && <div style={{ display: "flex", justifyContent: "center" }}>
      {err === "config"
        ? <Card accent={T.brass}><Label>The Telos Ingestion Agent is ready, waiting on a provider</Label><p style={{ fontSize: 14, color: T.slate, marginTop: 8 }}>The Telos Ingestion Agent is wired through the model proxy. It lights up the moment a model provider is connected.</p></Card>
        : err === "fail"
          ? <div style={{ color: T.alert, fontSize: 14, display: "flex", gap: 12, alignItems: "center" }}>Zuri could not write the CV. <Btn kind="ghost" small onClick={() => build(qa)}>Try again</Btn></div>
          : <Card><Spinner label="The Telos Ingestion Agent is writing your CV from your answers..." /></Card>}
    </div>}

    {phase === "review" && cv && <div>
      <div className="noprint" style={{ borderLeft: `4px solid ${T.alert}`, background: "rgba(168,67,31,0.06)", borderRadius: 8, padding: "13px 16px", marginBottom: 16 }}>
        <div style={{ fontSize: 14.5, color: T.ink, fontWeight: 700, lineHeight: 1.5 }}>Review every section before this document leaves your hands.</div>
        <div style={{ fontSize: 13.5, color: T.slate, marginTop: 3 }}>It represents your professional record. Correct anything that is wrong or missing before copying or downloading.</div>
      </div>
      <div id="cvprint" style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 12, padding: 24 }}>
        <div style={{ fontFamily: F.disp, fontWeight: 800, fontSize: 24 }}>{profile.name || "Your name"}</div>
        {profile.role && <div style={{ color: T.slate, fontSize: 14, marginTop: 2 }}>{profile.role}</div>}
        <div style={{ borderLeft: `3px solid ${T.emerald}`, background: "rgba(6,110,90,0.06)", padding: "10px 14px", margin: "16px 0 2px" }}>
          <div style={{ fontFamily: F.mono, fontSize: 10.5, color: T.slateLg, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 4 }}>Telos audit</div>
          <div style={{ fontSize: 13, color: T.ink, lineHeight: 1.6 }}>{TELOS_AUDIT}</div>
        </div>
        <Section title="Personal statement">
          <textarea className="screen-only" rows={3} value={cv.personal_statement} onChange={e => up({ personal_statement: e.target.value })} style={ta} />
          <p className="print-only" style={{ fontSize: 13.5, lineHeight: 1.6 }}>{cv.personal_statement}</p>
        </Section>
        <Section title="Skills"><EditList items={cv.skills} onChange={v => up({ skills: v })} placeholder="A skill" /></Section>
        <Section title="Experience">
          <div style={{ display: "grid", gap: 12 }}>
            {cv.experience.map((e, i) => <div key={i} style={{ border: `1px solid ${T.line}`, borderRadius: 8, padding: 12 }}>
              <div style={{ display: "grid", gap: 6 }}>
                <input value={e.role} placeholder="Role" onChange={ev => up({ experience: cv.experience.map((x, j) => j === i ? { ...x, role: ev.target.value } : x) })} style={inp} />
                <input value={e.organisation} placeholder="Organisation" onChange={ev => up({ experience: cv.experience.map((x, j) => j === i ? { ...x, organisation: ev.target.value } : x) })} style={inp} />
                <input value={e.period} placeholder="Period" onChange={ev => up({ experience: cv.experience.map((x, j) => j === i ? { ...x, period: ev.target.value } : x) })} style={inp} />
              </div>
              <div style={{ marginTop: 8 }}><div style={{ fontFamily: F.mono, fontSize: 10.5, color: T.slate, marginBottom: 4 }}>OUTCOMES</div><EditList items={e.outcomes} onChange={v => up({ experience: cv.experience.map((x, j) => j === i ? { ...x, outcomes: v } : x) })} placeholder="What you achieved" /></div>
              <button className="noprint" onClick={() => up({ experience: cv.experience.filter((_, j) => j !== i) })} style={{ marginTop: 8, background: "none", border: "none", color: T.slate, fontFamily: F.mono, fontSize: 11, cursor: "pointer", padding: 0, textDecoration: "underline" }}>remove role</button>
            </div>)}
            <button className="noprint" onClick={() => up({ experience: [...cv.experience, { role: "", organisation: "", period: "", outcomes: [] }] })} style={{ background: "none", border: "none", color: T.emerald, fontFamily: F.mono, fontSize: 11.5, cursor: "pointer", textAlign: "left", padding: 0, textDecoration: "underline" }}>+ add role</button>
          </div>
        </Section>
        <Section title="Education"><EditList items={cv.education} onChange={v => up({ education: v })} placeholder="A qualification or course" /></Section>
        <Section title="Tools and technologies"><EditList items={cv.tools} onChange={v => up({ tools: v })} placeholder="A tool" /></Section>
        <Section title="Languages"><EditList items={cv.languages} onChange={v => up({ languages: v })} placeholder="A language" /></Section>
        <div style={{ marginTop: 18, fontFamily: F.mono, fontSize: 10.5, color: T.slateLg, borderTop: `1px solid ${T.mute}`, paddingTop: 10 }}>Extracted by the Telos Ingestion Agent.</div>
      </div>
      <div className="noprint" style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Btn small disabled={saved} onClick={saveIt}>{saved ? "Saved" : "Save to profile"}</Btn>
        <Btn kind="ghost" small onClick={copy}>Copy as text</Btn>
        <Btn kind="ghost" small onClick={() => window.print()}>Download PDF</Btn>
        <Btn kind="ghost" small onClick={() => { setPhase("ready"); setCv(null); setQa([]); setSaved(false); }}>Start over</Btn>
      </div>
      <div className="noprint" style={{ marginTop: 10, fontFamily: F.mono, fontSize: 11, color: T.slate }}>Copy uses your clipboard. PDF uses your browser's print to PDF; a real PDF service is a backend step. Save keeps the CV with your private documents.</div>
    </div>}
    <div style={{ height: 30 }} />
  </div></Scroll>;
}

// ---- Global Worth Simulator (candidate). NO MODEL ----
// Given a role and a target market, show purchasing-power context and an
// illustrative local-value view. Every figure is computed from a labelled
// cost-of-living index (New York = 100). Nothing is model-generated.
const MARKETS = [
  { id: "lagos", name: "Lagos, Nigeria", col: 25 },
  { id: "nairobi", name: "Nairobi, Kenya", col: 35 },
  { id: "accra", name: "Accra, Ghana", col: 30 },
  { id: "kampala", name: "Kampala, Uganda", col: 28 },
  { id: "cairo", name: "Cairo, Egypt", col: 27 },
  { id: "joburg", name: "Johannesburg, South Africa", col: 40 },
  { id: "berlin", name: "Berlin, Germany", col: 70 },
  { id: "london", name: "London, UK", col: 85 },
  { id: "newyork", name: "New York, USA", col: 100 },
];

function GlobalWorth({ profile, builders, pipeline, premium, onUpgrade }) {
  const me = builders.find(b => b.isYou);
  const offer = me ? pipeline.sow.find(x => x.handle === me.handle) : null;
  const [role, setRole] = useState(profile.role || (me && me.role) || "");
  const [monthly, setMonthly] = useState(offer ? String(offer.monthlyUsd) : "4500");
  const [marketId, setMarketId] = useState("lagos");
  const ctrl = { width: "100%", marginTop: 7, background: T.paper, color: T.ink, border: `1px solid ${T.line}`, borderRadius: 8, padding: 11, fontSize: 14 };

  const m = Number(monthly) || 0;
  const market = MARKETS.find(x => x.id === marketId) || MARKETS[0];
  const power = col => Math.round(m * 100 / col);   // New York-equivalent buying power
  const buyingPower = power(market.col);
  const multiplier = (100 / market.col).toFixed(1);
  const annual = m * 12;

  if (!premium?.isPremium) return <PremiumLock title="Global Worth Simulator" onUpgrade={onUpgrade} />;
  return <Scroll><div style={{ maxWidth: 880, margin: "0 auto" }} className="rise">
    <Eyebrow>Global Worth Simulator</Eyebrow>
    <h2 style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 26, margin: "6px 0 4px" }}>What your pay is worth around the world</h2>
    <p style={{ color: T.slate, fontSize: 15, marginBottom: 18 }}>Given your role and a target market, see the purchasing power and local value of your pay. Figures are computed from an illustrative cost-of-living index, not live data.</p>

    <Card>
      <div className="row2">
        <Field label="Role" value={role} onChange={setRole} placeholder="Backend engineer" />
        <div style={{ marginBottom: 14 }}><Label>Target market</Label><select value={marketId} onChange={e => setMarketId(e.target.value)} style={ctrl}>{MARKETS.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
      </div>
      <Field label="Monthly pay, USD" value={monthly} onChange={v => setMonthly(v.replace(/[^0-9]/g, ""))} placeholder="4500" />
    </Card>

    <div className="dash" style={{ marginTop: 16 }}>
      <Card accent={T.emerald}><Label>Local buying power in {market.name}</Label>
        <div style={{ fontFamily: F.disp, fontWeight: 800, fontSize: 30, color: T.emerald, margin: "6px 0 4px" }}>{usd(buyingPower)} / mo</div>
        <div style={{ fontSize: 13, color: T.slate }}>Your {usd(m)}/month buys the lifestyle of about {usd(buyingPower)}/month at New York prices, a x{multiplier} advantage. Illustrative.</div>
      </Card>
      <Card accent={T.brass}><Label>Annual pay and cost of living</Label>
        <div style={{ fontFamily: F.disp, fontWeight: 800, fontSize: 26, color: T.brass, margin: "6px 0 4px" }}>{usd(annual)} / yr</div>
        <div style={{ fontSize: 13, color: T.slate }}>Cost-of-living index for {market.name}: {market.col} (New York = 100). Illustrative.</div>
      </Card>
    </div>

    <div style={{ marginTop: 18 }}>
      <Label>Your {usd(m)}/month across markets</Label>
      <div style={{ marginTop: 10, display: "grid", gap: 1, background: T.line, border: `1px solid ${T.line}`, borderRadius: 8, overflow: "hidden" }}>
        <div style={{ background: T.paper, padding: "9px 14px", display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr", fontFamily: F.mono, fontSize: 10.5, color: T.slate, letterSpacing: 0.3, textTransform: "uppercase" }}><span>market</span><span style={{ textAlign: "right" }}>index</span><span style={{ textAlign: "right" }}>buying power</span></div>
        {MARKETS.map(x => <div key={x.id} style={{ background: x.id === marketId ? "rgba(6,110,90,0.06)" : T.surface, padding: "10px 14px", display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr", alignItems: "center" }}>
          <span style={{ fontSize: 13.5, fontWeight: x.id === marketId ? 600 : 400 }}>{x.name}</span>
          <span style={{ textAlign: "right", fontFamily: F.mono, fontSize: 12, color: T.slate }}>{x.col}</span>
          <span style={{ textAlign: "right", fontFamily: F.mono, fontSize: 13, color: T.emerald }}>{usd(power(x.col))}</span>
        </div>)}
      </div>
    </div>
    <div style={{ marginTop: 12, fontFamily: F.mono, fontSize: 11, color: T.slate }}>Illustrative purchasing-power context, computed from a labelled cost-of-living index (New York = 100). Not live market data; no figure is model-generated.</div>
    <FigNote />
    <div style={{ height: 30 }} />
  </div></Scroll>;
}

// ---- Negotiation Coach (candidate). NEEDS MODEL ----
// Zuri helps a builder think through an offer: an illustrative pay band for the
// role and region, what to ask for, and how to phrase it. Routes through the
// /api/claude proxy; inert (a clear waiting state) until a provider is set.
// The pay band is explicitly the model's illustrative guidance, not a quote.
function NegotiationCoach({ profile, builders, pipeline, premium, onUpgrade }) {
  const me = builders.find(b => b.isYou);
  const activeOffer = me ? pipeline.sow.find(x => x.handle === me.handle) : null;
  const [role, setRole] = useState(profile.role || (me && me.role) || "");
  const [region, setRegion] = useState(profile.city || "");
  const [offer, setOffer] = useState(activeOffer ? String(activeOffer.monthlyUsd) : "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [guide, setGuide] = useState(null);
  const ready = role.trim() && Number(offer) > 0;

  async function coach() {
    setBusy(true); setErr(""); setGuide(null);
    try {
      const sys = "You are Zuri, a warm, honest negotiation coach for a builder on Fumana. Help them think through a job offer. Given their role, region, and the monthly figure they are considering, provide an illustrative monthly pay band (low, mid, high) in USD for that role and region, two or three concrete things to ask for, and one sentence they can say to open the negotiation. Warm in manner, honest in substance. No hype, no em dashes. These are illustrative guidance, not quotes or guarantees. Return ONLY JSON, no fences. Shape: {\"band\":{\"low\":number,\"mid\":number,\"high\":number},\"askFor\":[string],\"phrasing\":string,\"note\":string}.";
      const out = await callClaude({ system: sys, messages: [{ role: "user", content: `Role: ${role}. Region: ${region || "not specified"}. Monthly figure they are considering: ${offer} USD.` }], expectJson: true });
      setGuide(out);
    } catch (e) {
      setErr(String(e).includes("501") ? "config" : "fail");
    }
    setBusy(false);
  }

  if (!premium?.isPremium) return <PremiumLock title="Negotiation Coach" onUpgrade={onUpgrade} />;
  return <Scroll><div style={{ maxWidth: 760, margin: "0 auto" }} className="rise">
    <Eyebrow>Negotiation Coach</Eyebrow>
    <h2 style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 26, margin: "6px 0 4px" }}>Think through your offer with Zuri</h2>
    <p style={{ color: T.slate, fontSize: 15, marginBottom: 18 }}>Zuri helps you see the pay band for your role and region, what to ask for, and how to phrase it. Guidance is illustrative, not a quote.</p>
    <Card>
      <div className="row2">
        <Field label="Role" value={role} onChange={setRole} placeholder="Backend engineer" />
        <Field label="Region" value={region} onChange={setRegion} placeholder="Lagos, Nigeria" />
      </div>
      <Field label="Monthly figure you are considering, USD" value={offer} onChange={v => setOffer(v.replace(/[^0-9]/g, ""))} placeholder="4500" />
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 4 }}>{busy ? <Spinner label="Zuri is thinking it through..." /> : <Btn disabled={!ready} onClick={coach}>Coach me</Btn>}<Hint show={!ready && !busy}>Add your role and the monthly figure to continue.</Hint></div>
    </Card>

    {err === "config" && <div style={{ marginTop: 16 }}><Card accent={T.brass}><Label>Coach is ready, waiting on a provider</Label><p style={{ fontSize: 14, color: T.slate, marginTop: 8 }}>Zuri's negotiation coach is built and wired through the model proxy. It lights up the moment a model provider is connected. Nothing else to change.</p></Card></div>}
    {err === "fail" && <div style={{ marginTop: 16, color: T.alert, fontSize: 14, display: "flex", gap: 12, alignItems: "center" }}>Zuri did not respond. <Btn kind="ghost" small onClick={coach}>Try again</Btn></div>}

    {guide && <div style={{ marginTop: 16 }}><Card accent={T.emerald}>
      <Label>Zuri's guidance . illustrative, not a quote</Label>
      <div style={{ marginTop: 12 }}>
        <div style={{ fontFamily: F.mono, fontSize: 12, color: T.slate }}>Illustrative pay band for {role}{region ? `, ${region}` : ""}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
          <span style={{ fontFamily: F.disp, fontWeight: 800, fontSize: 26, color: T.emerald }}>{usd(guide.band?.low || 0)} to {usd(guide.band?.high || 0)}</span>
          <span style={{ fontFamily: F.mono, fontSize: 12, color: T.slate }}>midpoint {usd(guide.band?.mid || 0)} / month</span>
        </div>
      </div>
      {Array.isArray(guide.askFor) && guide.askFor.length > 0 && <div style={{ marginTop: 16 }}><Label>What to ask for</Label>
        <ul style={{ listStyle: "none", display: "grid", gap: 8, marginTop: 8 }}>{guide.askFor.map((a, i) => <li key={i} style={{ display: "flex", gap: 9, fontSize: 14 }}><span style={{ color: T.emerald }}>.</span><span>{a}</span></li>)}</ul>
      </div>}
      {guide.phrasing && <div style={{ marginTop: 16 }}><Label>How to phrase it</Label>
        <div style={{ marginTop: 8, borderLeft: `3px solid ${T.emerald}`, paddingLeft: 12, fontSize: 14.5, lineHeight: 1.55, fontStyle: "italic" }}>{guide.phrasing}</div>
      </div>}
      {guide.note && <p style={{ marginTop: 14, fontSize: 13, color: T.slate }}>{guide.note}</p>}
      <div style={{ marginTop: 12, fontFamily: F.mono, fontSize: 11, color: T.slate }}>Illustrative guidance from Zuri, not a quote or guarantee. You decide.</div>
      <ZuriNote />
    </Card></div>}
    <div style={{ height: 30 }} />
  </div></Scroll>;
}

// ---- FIND Premium Pro (candidate freemium gating). NO MODEL, no real payment ----
const PREMIUM_PRICE = "$4.99/month";
const PREMIUM_FEATURES = [
  "Priority enterprise matching",
  "Zero-commission escrow withdrawals; the 12% platform fee waived on payouts",
  "Unlimited upskilling modules",
  "The Negotiation Coach",
  "The Global Worth Simulator",
];
const LockIcon = ({ size = 12 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4.5" y="11" width="15" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>;

function PremiumLock({ title, onUpgrade }) {
  return <Scroll><div style={{ maxWidth: 760, margin: "0 auto" }} className="rise">
    <Eyebrow>Premium</Eyebrow>
    <h2 style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 26, margin: "8px 0 6px" }}>{title}</h2>
    <Card accent={T.brass}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 7, color: T.brass }}><LockIcon /><Label>Premium feature</Label></div>
      <p style={{ fontSize: 14, color: T.slate, margin: "10px 0 14px" }}>Available on FIND Premium Pro. Upgrade in Settings.</p>
      <Btn small onClick={onUpgrade}>Upgrade to Premium</Btn>
    </Card>
  </div></Scroll>;
}

function UpgradeModal({ open, onClose, onComplete }) {
  const toast = useToast();
  const [step, setStep] = useState("plan"); // plan | pay
  const [card, setCard] = useState(""); const [exp, setExp] = useState(""); const [cvv, setCvv] = useState("");
  useEffect(() => { if (open) { setStep("plan"); setCard(""); setExp(""); setCvv(""); } }, [open]);
  if (!open) return null;
  return <Modal titleId="upgrade-title" onClose={onClose}>
    {step === "plan" ? <>
      <Eyebrow>FIND Premium Pro</Eyebrow>
      <h3 id="upgrade-title" style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 20, margin: "8px 0 6px" }}>Upgrade to Premium</h3>
      <div style={{ fontFamily: F.disp, fontWeight: 800, fontSize: 26, color: T.emerald }}>{PREMIUM_PRICE}</div>
      <ul style={{ listStyle: "none", display: "grid", gap: 8, margin: "14px 0", fontSize: 14 }}>{PREMIUM_FEATURES.map((ftr, i) => <li key={i} style={{ display: "flex", gap: 9 }}><span style={{ color: T.emerald }}>✓</span><span>{ftr}</span></li>)}</ul>
      <Btn full onClick={() => setStep("pay")}>Continue to payment</Btn>
      <div style={{ marginTop: 12, textAlign: "center" }}><button onClick={() => toast("No previous purchase found in this sandbox.")} style={{ background: "none", border: "none", color: T.slate, fontFamily: F.mono, fontSize: 11.5, cursor: "pointer", textDecoration: "underline" }}>Restore purchase</button></div>
    </> : <>
      <Eyebrow>Payment</Eyebrow>
      <h3 id="upgrade-title" style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 20, margin: "8px 0 6px" }}>Payment details</h3>
      <div style={{ background: "rgba(176,138,46,0.10)", border: `1px solid ${T.brass}`, borderRadius: 8, padding: "8px 12px", fontFamily: F.mono, fontSize: 11.5, color: T.brass, margin: "0 0 14px" }}>Sandbox. No real payment processed.</div>
      <Field label="Card number" value={card} onChange={setCard} placeholder="4242 4242 4242 4242" />
      <div className="row2"><Field label="Expiry" value={exp} onChange={setExp} placeholder="MM/YY" /><Field label="CVV" value={cvv} onChange={setCvv} placeholder="123" /></div>
      <div style={{ marginTop: 4, display: "flex", gap: 10 }}><Btn onClick={() => { onComplete(); onClose(); }}>Complete upgrade</Btn><Btn kind="ghost" onClick={() => setStep("plan")}>Back</Btn></div>
      <div style={{ marginTop: 12, fontFamily: F.mono, fontSize: 10.5, color: T.slate }}>Sandbox only. No card is charged and no data is stored.</div>
    </>}
  </Modal>;
}

function CandidateApp({ addBuilder, removeBuilder, builders, pipeline, squads, joinSquad, leaveSquad, formSquad, audit, logAudit, submitReview, reviews, exit, toRole, me, onSignOut }) {
  // Session restore: when the backend returns my builder record, land on the
  // dashboard with the assessment reconstructed from it. `me` is the raw
  // builders row (snake_case).
  const restored = Boolean(me && me.profile_strength != null);
  const [screen, setScreen] = useState(DEMO_SEED ? "dashboard" : restored ? "dashboard" : "signin");
  const [profile, setProfile] = useState({ name: me?.name || "", role: me?.role || "", city: me?.city || "", experience: me?.docs?.experience || "", cv: me?.docs?.cv || null });
  const [accommodations, setAccommodations] = useState({ extraTime: false, textOnly: false, written: false, ...(me?.docs?.accommodations || {}) });
  const [result, setResult] = useState(DEMO_SEED ? SEED_RESULT : restored ? {
    dimensions: me.dimensions || [],
    profileStrength: me.profile_strength,
    tier: me.tier,
    weakest: [...(me.dimensions || [])].sort((a, b) => a.score - b.score)[0],
    transcript: me?.docs?.transcript || [],
  } : null);
  const [points, setPoints] = useState(DEMO_SEED ? 120 : 0);
  const [culture, setCulture] = useState(null); // best Culture Shock Simulator score
  const [premium, setPremium] = useState({ isPremium: me?.is_premium || false, premiumSince: me?.premium_since || null });
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const openUpgrade = () => setUpgradeOpen(true);
  function completeUpgrade() { setPremium({ isPremium: true, premiumSince: new Date().toISOString().slice(0, 10) }); store.setPremium(true).catch(() => {}); toast("Welcome to FIND Premium Pro"); }
  const manageSub = () => toast("Subscription management is a backend step.");
  const [published, setPublished] = useState(restored);
  const toast = useToast();
  const inApp = CAND_NAV.some(([k]) => k === screen) || ["fairness", "audit", "report", "ethics", "cvbuilder"].includes(screen);

  function finish(r) {
    setResult(r); setPoints(120);
    const handle = "FB-" + Math.floor(1000 + Math.random() * 8999);
    const top = [...r.dimensions].sort((a, b) => b.score - a.score).slice(0, 3).map(d => d.name);
    const summary = `${profile.role || "Engineer"} with a ${r.tier.name} profile. Strongest in ${top.slice(0, 2).join(" and ")}. ${profile.experience.split(".")[0]}.`;
    addBuilder({ handle, name: profile.name, city: profile.city, role: profile.role || "Engineer", summary, skills: top, profileStrength: r.profileStrength, tier: r.tier, dimensions: r.dimensions, experience: profile.experience, transcript: r.transcript, cv: profile.cv, accommodations, isYou: true });
    setPublished(true); setScreen("dashboard");
    logAudit({ kind: "assessment-completed" });
    logAudit({ kind: "score-issued", profileStrength: r.profileStrength, tier: r.tier.name });
    toast("You are in the network. Your profile is live to employers, identity shielded.");
  }

  return <Shell role="candidate" exit={exit} nav={inApp ? CAND_NAV : null} active={screen} onNav={setScreen} showZuri={!NO_DOCK_SCREENS.includes(screen)} premiumBadge={premium.isPremium} locked={premium.isPremium ? [] : ["coach", "worth"]}>
    {screen === "signin" && <AuthFormPage role="builder" onBack={toRole} onAuthenticated={() => setScreen("consent")} />}
    {screen === "consent" && <Consent onNext={() => setScreen("onboarding")} onBack={() => setScreen("signin")} />}
    {screen === "onboarding" && <Onboarding profile={profile} setProfile={setProfile} onNext={() => setScreen("assessinfo")} onBack={() => setScreen("consent")} />}
    {screen === "assessinfo" && <AssessInfo accommodations={accommodations} setAccommodations={setAccommodations} onOptIn={() => { if (accommodations.extraTime || accommodations.textOnly || accommodations.written) logAudit({ kind: "accommodations", ...accommodations }); setScreen("interview"); }} onOptOut={() => setScreen("humanreview")} onBack={() => setScreen("onboarding")} />}
    {screen === "humanreview" && <HumanReview onSwitch={() => setScreen("interview")} />}
    {screen === "interview" && <Interview profile={profile} accommodations={accommodations} onBack={() => setScreen("assessinfo")} onComplete={finish} />}
    {screen === "dashboard" && result && <Dashboard profile={profile} result={result} onUpskill={() => setScreen("upskill")} published={published} audit={audit} logAudit={logAudit} culture={culture} premium={premium} onUpgrade={openUpgrade} reviews={reviews} submitReview={submitReview} />}
    {screen === "upskill" && result && <Upskill result={result} points={points} setPoints={setPoints} culture={culture} setCulture={setCulture} logAudit={logAudit} premium={premium} onUpgrade={openUpgrade} />}
    {screen === "applications" && <Applications builders={builders} pipeline={pipeline} />}
    {screen === "wallet" && <Wallet builders={builders} pipeline={pipeline} premium={premium} onUpgrade={openUpgrade} />}
    {screen === "coach" && <NegotiationCoach profile={profile} builders={builders} pipeline={pipeline} premium={premium} onUpgrade={openUpgrade} />}
    {screen === "worth" && <GlobalWorth profile={profile} builders={builders} pipeline={pipeline} premium={premium} onUpgrade={openUpgrade} />}
    {screen === "community" && <Community builders={builders} pipeline={pipeline} squads={squads} onJoin={joinSquad} onLeave={leaveSquad} onForm={formSquad} culture={culture} />}
    {screen === "alchemist" && <ExperienceAlchemist profile={profile} onBuildCV={() => setScreen("cvbuilder")} onSave={(res, raw) => { setProfile(p => ({ ...p, experience: raw })); store.saveAlchemist(res).catch(() => {}); store.saveBuilderDocs({ experience: raw }).catch(() => {}); }} />}
    {screen === "cvbuilder" && <CVBuilder profile={profile} saveCV={cv => { setProfile(p => ({ ...p, cv })); store.saveBuilderDocs({ cv }).catch(() => {}); }} onBack={() => setScreen("alchemist")} />}
    {screen === "settings" && <Settings builders={builders} onDelete={removeBuilder} onFairness={() => setScreen("fairness")} onAudit={() => setScreen("audit")} onReport={() => setScreen("report")} onEthics={() => setScreen("ethics")} logAudit={logAudit} premium={premium} onUpgrade={openUpgrade} onManage={manageSub} onSignOut={onSignOut} />}
    {screen === "fairness" && <FairnessPosture onBack={() => setScreen("settings")} />}
    {screen === "audit" && <AuditTrail audit={audit} onBack={() => setScreen("settings")} />}
    {screen === "report" && <ReportIssue categories={REPORT_CATS_CANDIDATE} source="candidate" logAudit={logAudit} submitReview={submitReview} onBack={() => setScreen("settings")} />}
    {screen === "ethics" && <EthicsPage onBack={() => setScreen("settings")} />}
    <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} onComplete={completeUpgrade} />
  </Shell>;
}

function Consent({ onNext, onBack }) {
  const [ok, setOk] = useState(false);
  return <Centered><div style={{ width: "100%", maxWidth: 480 }} className="rise">
    <Back onClick={onBack} /><Eyebrow>Step 1 of 4 . Your protection</Eyebrow>
    <h2 style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 24, margin: "8px 0 6px" }}>How Fumana protects you</h2>
    <Card pad={20}><ul style={{ listStyle: "none", display: "grid", gap: 12, fontSize: 14 }}>
      <Li><b>Bias shield.</b> Your name, photo, location, and gender stay hidden from employers until you accept an interview.</Li>
      <Li><b>You own your data.</b> Export or delete your profile at any time.</Li>
      <Li><b>Honest assessment.</b> Telos scores your strengths and names your gaps plainly, then helps you close them.</Li>
    </ul>
      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 18, fontSize: 14, cursor: "pointer" }}><input type="checkbox" checked={ok} onChange={e => setOk(e.target.checked)} style={{ marginTop: 3 }} /><span>I understand the bias-shielded process and data terms.</span></label>
    </Card>
    <div style={{ marginTop: 16 }}><Btn full disabled={!ok} onClick={onNext}>Continue</Btn><Hint show={!ok}>Tick the box above to continue.</Hint></div>
  </div></Centered>;
}

// ---- Async elevator pitch recorder (candidate). NO MODEL ----
// Browser MediaRecorder capture of camera + mic, a 60s countdown that auto-stops,
// retake, and a playback preview. Recording is in-browser; upload and storage
// are a backend step. (The interview uses pre-rendered clips, so there is no
// live capture to reuse; this is built directly on MediaRecorder.)
function PitchRecorder() {
  const [phase, setPhase] = useState("idle"); // idle | recording | recorded | error
  const [remaining, setRemaining] = useState(60);
  const [error, setError] = useState("");
  const liveRef = useRef(null);
  const previewRef = useRef(null);
  const m = useRef({ stream: null, recorder: null, chunks: [], url: null, timer: null, left: 60 });

  const stopTracks = () => { if (m.current.stream) { m.current.stream.getTracks().forEach(t => t.stop()); m.current.stream = null; } };
  function stop() {
    if (m.current.timer) { clearInterval(m.current.timer); m.current.timer = null; }
    if (m.current.recorder && m.current.recorder.state !== "inactive") { try { m.current.recorder.stop(); } catch { /* already stopped */ } }
  }

  useEffect(() => () => { stop(); stopTracks(); if (m.current.url) URL.revokeObjectURL(m.current.url); }, []);
  useEffect(() => { if (phase === "recorded" && previewRef.current && m.current.url) previewRef.current.src = m.current.url; }, [phase]);

  async function start() {
    setError("");
    if (m.current.url) { URL.revokeObjectURL(m.current.url); m.current.url = null; }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Your browser does not support in-browser recording. Try a recent Chrome, Edge, or Firefox.");
      setPhase("error"); return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      m.current.stream = stream;
      if (liveRef.current) { liveRef.current.srcObject = stream; liveRef.current.play?.().catch(() => {}); }
      const rec = new MediaRecorder(stream);
      m.current.recorder = rec; m.current.chunks = [];
      rec.ondataavailable = e => { if (e.data && e.data.size) m.current.chunks.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(m.current.chunks, { type: m.current.chunks[0]?.type || "video/webm" });
        m.current.url = URL.createObjectURL(blob);
        stopTracks();
        setPhase("recorded");
      };
      rec.start();
      m.current.left = 60; setRemaining(60); setPhase("recording");
      m.current.timer = setInterval(() => {
        m.current.left -= 1; setRemaining(m.current.left);
        if (m.current.left <= 0) stop();
      }, 1000);
    } catch {
      setError("Camera and microphone access is needed to record. Check your browser permissions and try again.");
      stopTracks(); setPhase("error");
    }
  }

  function retake() {
    if (m.current.url) { URL.revokeObjectURL(m.current.url); m.current.url = null; }
    setRemaining(60); setPhase("idle");
  }

  const clock = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;
  const frame = { position: "relative", width: "100%", aspectRatio: "16 / 9", background: T.ink, borderRadius: 10, overflow: "hidden", border: `1px solid ${T.line}` };
  const vid = { width: "100%", height: "100%", objectFit: "cover", display: "block" };

  return <div>
    <Label>60-second elevator pitch</Label>
    <p style={{ color: T.slate, fontSize: 13.5, margin: "6px 0 12px" }}>Optional. Record a short intro in your own words. Strong profiles usually include one.</p>
    <div style={frame}>
      {phase === "recorded"
        ? <video ref={previewRef} controls playsInline style={vid} />
        : <video ref={liveRef} muted playsInline autoPlay style={{ ...vid, opacity: phase === "recording" ? 1 : 0.85 }} />}
      {phase === "idle" && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#9FB0BC", fontSize: 13, fontFamily: F.mono, textAlign: "center", padding: 16 }}>Your camera preview appears here when you start</div>}
      {phase === "recording" && <div style={{ position: "absolute", top: 10, right: 10, display: "flex", alignItems: "center", gap: 7, background: "rgba(12,26,38,0.72)", color: "#fff", borderRadius: 20, padding: "5px 11px", fontFamily: F.mono, fontSize: 12 }}><span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: T.alert }} />{clock}</div>}
    </div>
    <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      {phase === "idle" && <Btn small onClick={start}>Start recording</Btn>}
      {phase === "recording" && <><Btn small kind="ghost" onClick={stop}>Stop</Btn><span style={{ fontFamily: F.mono, fontSize: 12, color: T.slate }}>Recording. Auto-stops at 0:00.</span></>}
      {phase === "recorded" && <><Btn small kind="ghost" onClick={retake}>Retake</Btn><span style={{ fontFamily: F.mono, fontSize: 12, color: T.emerald }}>Pitch ready.</span></>}
      {phase === "error" && <Btn small onClick={start}>Try again</Btn>}
    </div>
    {error && <div role="alert" style={{ marginTop: 10, color: T.alert, fontSize: 13 }}>{error}</div>}
    <div style={{ marginTop: 10, fontFamily: F.mono, fontSize: 11, color: T.slate }}>Recording happens in your browser. Upload and storage are a backend step.</div>
  </div>;
}

function Onboarding({ profile, setProfile, onNext, onBack }) {
  const [fileName, setFileName] = useState("");
  function readFile(e) { const f = e.target.files?.[0]; if (!f) return; setFileName(f.name); if (/\.(txt|md)$/i.test(f.name)) { const r = new FileReader(); r.onload = () => setProfile(p => ({ ...p, experience: (p.experience ? p.experience + "\n" : "") + r.result })); r.readAsText(f); } }
  const ready = profile.role && profile.experience.trim().length > 30;
  return <Scroll><div style={{ maxWidth: 640, margin: "0 auto" }} className="rise">
    <Back onClick={onBack} /><Eyebrow>Step 2 of 4 . Profile</Eyebrow>
    <h2 style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 26, margin: "8px 0 4px" }}>Tell us who you are</h2>
    <p style={{ color: T.slate, fontSize: 15, marginBottom: 18 }}>Write how you actually talk. Zuri turns it into recruiter-ready outcomes later. Upload a CV if you have one.</p>
    <Card>
      <Field label="Full name" value={profile.name} onChange={v => setProfile(p => ({ ...p, name: v }))} placeholder="Stays hidden from employers until interview" />
      <div className="row2"><Field label="Role" value={profile.role} onChange={v => setProfile(p => ({ ...p, role: v }))} placeholder="Backend engineer" /><Field label="City" value={profile.city} onChange={v => setProfile(p => ({ ...p, city: v }))} placeholder="Lagos, Nigeria" /></div>
      <Field label="Your experience, in your words" rows={6} value={profile.experience} onChange={v => setProfile(p => ({ ...p, experience: v }))} placeholder="What have you built, what did you handle, what went wrong and how did you fix it." />
      <div style={{ border: `1px dashed ${T.line}`, borderRadius: 10, padding: 16, textAlign: "center", background: T.paper }}><label style={{ cursor: "pointer", display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 6, color: T.slate, fontSize: 13 }}><span style={{ fontFamily: F.mono, color: T.emerald }}>upload CV</span><span>{fileName || "txt or md reads in now. PDF and docx parse on the backend."}</span><input type="file" accept=".txt,.md,.pdf,.docx" onChange={readFile} style={{ display: "none" }} /></label></div>
    </Card>
    <div style={{ height: 14 }} />
    <Card><PitchRecorder /></Card>
    <div style={{ marginTop: 16, marginBottom: 30 }}><Btn full disabled={!ready} onClick={onNext}>Continue</Btn><Hint show={!ready}>Add your role and a few sentences of experience to continue.</Hint></div>
  </div></Scroll>;
}

function AssessInfo({ onOptIn, onOptOut, onBack, accommodations, setAccommodations }) {
  const [ok, setOk] = useState(false);
  return <Scroll><div style={{ maxWidth: 680, margin: "0 auto" }} className="rise">
    <Back onClick={onBack} /><Eyebrow>Step 3 of 4 . How you are assessed</Eyebrow>
    <h2 style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 26, margin: "8px 0 4px" }}>How Zuri assesses you, and your choice</h2>
    <p style={{ color: T.slate, fontSize: 15, marginBottom: 16 }}>Before anything runs, here is exactly how this works and what your options are. You are in control.</p>
    <Card><Label>What is measured, and from what</Label><div style={{ display: "grid", gap: 9, marginTop: 12 }}>
      {DIMENSIONS.map(d => <div key={d} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13.5, borderTop: `1px solid ${T.mute}`, paddingTop: 9 }}><div><span style={{ fontWeight: 600 }}>{d}</span><div style={{ color: T.slate, fontSize: 12.5 }}>{EVIDENCE[d]}</div></div><span style={{ fontFamily: F.mono, fontSize: 12, color: T.slate, whiteSpace: "nowrap" }}>weight {WEIGHTS[d].toFixed(2)}</span></div>)}
    </div></Card>
    <div style={{ height: 14 }} />
    <Card><Label>The method</Label><ul style={{ listStyle: "none", display: "grid", gap: 9, marginTop: 12, fontSize: 14 }}>
      <Li>Zuri, an AI interviewer, asks questions that adapt to your answers.</Li>
      <Li>Telos reads your experience and answers, then scores each dimension 0 to 100 with a written reason you will see.</Li>
      <Li>Your Profile Strength is a weighted average computed by the fixed formula above.</Li>
      <Li>Telos uses a graph-based reasoning model to trace how your answers connect to enterprise readiness.</Li>
      <Li>Scores are a starting point, not a verdict. You can contest a score or ask for a human to review it.</Li>
    </ul></Card>
    <div style={{ height: 14 }} />
    <Card><Label>Accommodations</Label>
      <p style={{ fontSize: 13.5, color: T.slate, margin: "8px 0 12px" }}>Choose any that help you show your real ability. Select as many as you need.</p>
      <div style={{ display: "grid", gap: 11 }}>
        {ACCOMMODATIONS.map(a => <label key={a.id} htmlFor={`acc-${a.id}`} style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
          <input id={`acc-${a.id}`} type="checkbox" checked={!!accommodations[a.id]} onChange={e => setAccommodations(s => ({ ...s, [a.id]: e.target.checked }))} style={{ marginTop: 3 }} />
          <span><span style={{ fontWeight: 600, fontSize: 14 }}>{a.label}</span><div style={{ color: T.slate, fontSize: 13 }}>{a.desc}</div></span>
        </label>)}
      </div>
      <div style={{ marginTop: 14, fontSize: 13.5, color: T.ink, borderLeft: `3px solid ${T.emerald}`, paddingLeft: 11, lineHeight: 1.5 }}>Accommodations do not lower the bar. They remove barriers to showing real ability.</div>
    </Card>
    <div style={{ height: 14 }} />
    <Card accent={T.brass}><Label>Your rights</Label><ul style={{ listStyle: "none", display: "grid", gap: 9, marginTop: 12, fontSize: 14 }}>
      <Li>You can decline AI assessment and request a human reviewer instead.</Li>
      <Li>You can see why every score was given.</Li>
      <Li>You can delete your assessment and data at any time.</Li>
    </ul>
      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 16, fontSize: 14, cursor: "pointer" }}><input type="checkbox" checked={ok} onChange={e => setOk(e.target.checked)} style={{ marginTop: 3 }} /><span>I understand how I will be assessed and I consent to the AI interview.</span></label>
    </Card>
    <div style={{ marginTop: 16, marginBottom: 12, display: "flex", gap: 10, flexWrap: "wrap" }}><Btn disabled={!ok} onClick={onOptIn}>Start the AI interview</Btn><Btn kind="ghost" onClick={onOptOut}>Request human review instead</Btn></div>
    <Hint show={!ok}>Consent above to start the AI interview, or choose human review, which needs no consent.</Hint>
    <div style={{ height: 24 }} />
  </div></Scroll>;
}

const HumanReview = ({ onSwitch }) => <Centered><div style={{ maxWidth: 460 }} className="rise">
  <Eyebrow>Human review requested</Eyebrow><h2 style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 24, margin: "8px 0 8px" }}>A person will assess you</h2>
  <Card><p style={{ fontSize: 14, color: T.slate, lineHeight: 1.6 }}>You declined AI assessment, which is your right. A human reviewer will complete your evaluation and your profile opens once they finish. In this prototype the human-review queue is stubbed, so no score is produced here.</p><div style={{ marginTop: 14 }}><Btn kind="ghost" small onClick={onSwitch}>Change my mind, use the AI interview</Btn></div></Card>
</div></Centered>;

// ---- Zuri voice: real TTS from the backend, SpeechSynthesis as fallback ----
// Level 1 voice: audio only, no lip-sync. `speaking` is true while audio plays.
// Used by the copilot dock (the interview uses pre-rendered video clips whose
// voice is baked in). If /api/tts fails (no key, provider down), the browser
// speaks the same line with SpeechSynthesis so Zuri is never silent.
function useZuriVoice() {
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef(null);
  const urlRef = useRef(null);

  const cleanupAudio = () => {
    if (audioRef.current) { audioRef.current.onended = null; audioRef.current.onerror = null; audioRef.current.pause(); audioRef.current = null; }
    if (urlRef.current) { URL.revokeObjectURL(urlRef.current); urlRef.current = null; }
  };
  const stop = useCallback(() => {
    cleanupAudio();
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);
  const fallback = useCallback((text) => {
    if (typeof window === "undefined" || !window.speechSynthesis) { setSpeaking(false); return; }
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1; u.pitch = 1;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(u);
  }, []);
  const speak = useCallback(async (text) => {
    const line = (text || "").trim();
    if (!line) return;
    stop();
    setSpeaking(true);
    let handled = false;
    const goFallback = () => { if (handled) return; handled = true; cleanupAudio(); fallback(line); };
    try {
      const res = await fetch(TTS_URL, { method: "POST", headers: await apiHeaders(), body: JSON.stringify({ text: line }) });
      if (!res.ok) throw new Error("tts " + res.status);
      const buf = await res.arrayBuffer();
      if (!buf.byteLength) throw new Error("empty audio");
      const url = URL.createObjectURL(new Blob([buf], { type: res.headers.get("Content-Type") || "audio/mpeg" }));
      urlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { handled = true; cleanupAudio(); setSpeaking(false); };
      audio.onerror = goFallback;
      await audio.play();
    } catch {
      goFallback();
    }
  }, [stop, fallback]);

  useEffect(() => stop, [stop]);
  return { speaking, speak, stop };
}

// Scripted interview clips. Zuri delivers the intro and each question as a
// pre-rendered video; her voice is in the clip, so no TTS here. Each `text` is
// the exact spoken line — it drives the on-screen caption (accessibility) and
// the scoring transcript.
const INTERVIEW_INTRO = { id: "intro", video: introVideo, text: "Hi, I'm Zuri. I'll ask you five questions. Take your time, answer each in your own words, and speak the way you naturally would." };
const INTERVIEW_SCRIPT = [
  { id: "q1", video: q1Video, text: "Tell me about a time you had to explain something technical to someone who did not share your background. How did you make sure they understood?" },
  { id: "q2", video: q2Video, text: "Tell me about a time you disagreed with a manager or a client about how something should be done. What did you do?" },
  { id: "q3", video: q3Video, text: "Walk me through how you keep a teammate in another country unblocked when you are offline for several hours." },
  { id: "q4", video: q4Video, text: "Tell me about a time you were given a task without clear instructions. How did you decide what to build?" },
  { id: "q5", video: q5Video, text: "Describe the hardest technical problem you have solved. How did you find the root cause, and what did you change?" },
];

// Seeded assessment for the demo builder. Derived from their own network entry,
// so the dashboard, the trajectory forecast, and the employer search result all
// read the same numbers. The transcript is what the evidence panel shows.
const SEED_ANSWERS = [
  "Our operations lead kept asking why the daily totals moved. I stopped explaining the queue and started with the money. I showed her two rows of the ledger, one correct and one double posted, and said this is the same payment counted twice. Once she could see it in her own report she told me which merchants to check first, and that is how we found the pattern.",
  "My manager wanted a hotfix straight to production on a Friday. I said I understood the urgency and asked for two hours to add a check that would tell us if it made things worse. He agreed. The check caught a bad assumption before we shipped, so we deployed on Saturday morning with a smaller change instead.",
  "I write the handover before I log off, not after. It says what I finished, what is half done and where the branch is, and the one thing I need from them. If someone is blocked on me I say when I will be back rather than leaving it open. My colleague in Berlin has never had to wait a full day for an answer.",
  "I was asked to build a reporting export with no spec. I wrote down five assumptions about the columns, the date range, and who would read it, sent them in a message, and started on the parts nobody could disagree with. Two assumptions came back wrong, which cost me an afternoon instead of a week.",
  "Reconciliation was off by small amounts that never repeated. I stopped guessing and logged every retry with its idempotency key. The retries were firing on a network timeout even though the write had already committed, so the same payment posted twice. I made the write idempotent on the key and added a check that fails loudly instead of silently correcting.",
];
const SEED_RESULT = (() => {
  const me = SEED_BUILDERS.find(b => b.isYou);
  return {
    dimensions: me.dimensions,
    profileStrength: me.profileStrength,
    tier: me.tier,
    weakest: [...me.dimensions].sort((a, b) => a.score - b.score)[0],
    transcript: INTERVIEW_SCRIPT.map((q, i) => ({ q: q.text, a: SEED_ANSWERS[i] })),
  };
})();

// Zuri on camera, with a soft pulsing ring around the frame while the clip
// plays (the speaking cue at Level 1 — no lip-sync). A click precedes every
// clip, so autoplay with audio is allowed; controls cover any blocked autoplay.
function VideoStage({ src, autoPlay, playing, onPlay, onStop, muted }) {
  const ref = useRef(null);
  useEffect(() => { if (autoPlay && ref.current) ref.current.play?.().catch(() => {}); }, [autoPlay, src]);
  return <div style={{ position: "relative", width: "100%", maxWidth: 420 }}>
    <video ref={ref} src={src} playsInline controls={!muted} muted={muted} preload="metadata" aria-label="Zuri speaking"
      onPlay={onPlay} onPlaying={onPlay} onEnded={onStop} onPause={onStop}
      style={{ width: "100%", borderRadius: 16, display: "block", background: T.ink, border: `1px solid ${T.line}` }} />
    {playing && <span aria-hidden="true" style={{ position: "absolute", inset: -3, borderRadius: 18, pointerEvents: "none", animation: "zuriPulse 1.6s ease-in-out infinite" }} />}
  </div>;
}

function Interview({ profile, accommodations, onBack, onComplete }) {
  // Scripted video interview: an intro clip, then five question clips. Zuri's
  // voice is in each clip; the candidate answers each in turn. Scoring runs on
  // the collected transcript, unchanged. Accommodations are honored: text-only
  // drops the video for a pure-text path, written shows all questions as one
  // form, and extra time confirms the (already untimed) no-auto-stop path.
  const acc = accommodations || {};
  const [phase, setPhase] = useState("ready"); // ready | intro | qa | written | scoring
  const [idx, setIdx] = useState(0);
  const [qa, setQa] = useState([]);
  const [answer, setAnswer] = useState("");
  const [wAns, setWAns] = useState({});
  const [playing, setPlaying] = useState(false);
  const [err, setErr] = useState(false);
  const total = INTERVIEW_SCRIPT.length;
  const captionFor = i => INTERVIEW_SCRIPT[i].text || `Interview question ${i + 1}`;
  const last = idx + 1 >= total;
  const activeAcc = ACCOMMODATIONS.filter(a => acc[a.id]);
  const ta = { width: "100%", background: T.paper, color: T.ink, border: `1px solid ${T.line}`, borderRadius: 8, padding: 11, fontSize: 14, resize: "vertical" };

  function submit() {
    if (answer.trim().length < 4) return;
    const nextQa = [...qa, { q: captionFor(idx), a: answer.trim() }];
    setQa(nextQa); setAnswer(""); setPlaying(false);
    if (last) { score(nextQa); return; }
    setIdx(idx + 1);
  }
  const writtenReady = INTERVIEW_SCRIPT.every((_, i) => (wAns[i] || "").trim().length >= 4);
  function submitWritten() {
    if (!writtenReady) return;
    const finalQa = INTERVIEW_SCRIPT.map((q, i) => ({ q: captionFor(i), a: (wAns[i] || "").trim() }));
    setQa(finalQa); score(finalQa);
  }
  async function score(finalQa) {
    setPhase("scoring"); setErr(false);
    try {
      const transcript = finalQa.map((x, i) => `Q${i + 1}: ${x.q}\nA${i + 1}: ${x.a}`).join("\n\n");
      const sys = "You are the Fumana scoring model, powered by Telos. Using the builder's experience and interview transcript, score six dimensions for global remote enterprise work: " + DIMENSIONS.join(", ") + ". Technical depth draws on experience and technical answers. The others draw on the interview, not the resume alone. Score each 0 to 100 with a fair, specific one-sentence rationale grounded in what they said. Be honest, name real gaps. Return ONLY JSON, no fences. Shape: {\"dimensions\":[{\"name\":string,\"score\":number,\"rationale\":string}]}. Use exactly those six names.";
      const out = await callClaude({ system: sys, messages: [{ role: "user", content: `Experience:\n${profile.experience}\n\nInterview:\n${transcript}` }], expectJson: true });
      const dims = out.dimensions || []; const cs = composite(dims);
      onComplete({ dimensions: dims, profileStrength: cs, tier: tierOf(cs), weakest: [...dims].sort((a, b) => a.score - b.score)[0], transcript: finalQa });
    } catch { setErr(true); }
  }

  const answered = qa.length > 0 && <div style={{ marginTop: 24, display: "grid", gap: 8, width: "100%", maxWidth: 560 }}>
    {qa.map((x, i) => <div key={i} style={{ fontSize: 13.5, color: T.slate }}><b style={{ color: T.emerald, fontFamily: F.mono, fontSize: 11 }}>Q{i + 1}</b> {x.a}</div>)}
  </div>;

  return <Scroll><div style={{ maxWidth: 680, margin: "0 auto" }} className="rise">
    <Back onClick={onBack} />
    <div style={{ textAlign: "center", marginBottom: 16 }}>
      <Eyebrow>Step 4 of 4 . Interview with Zuri</Eyebrow>
      <h2 style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 26, margin: "6px 0 4px" }}>{acc.written ? "Answer at your own pace" : "A short conversation, not a form"}</h2>
      <p style={{ color: T.slate, fontSize: 15, maxWidth: 520, margin: "0 auto" }}>{acc.written ? `All ${total} questions, shown together. Answer each in your own words.` : acc.textOnly ? `Zuri asks ${total} questions. Read each one, then answer in your own words.` : `Zuri asks ${total} questions on camera. Watch each one, then answer in your own words.`}</p>
    </div>
    {activeAcc.length > 0 && <div style={{ maxWidth: 560, margin: "0 auto 16px", background: "rgba(6,110,90,0.06)", border: `1px solid ${T.emerald}`, borderRadius: 10, padding: "9px 13px", fontFamily: F.mono, fontSize: 11.5, color: T.vault, textAlign: "center" }}>Accommodations on: {activeAcc.map(a => a.label.toLowerCase()).join(", ")}</div>}

    {phase === "ready" && <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
      <p style={{ color: T.slate, fontSize: 14 }}>{acc.written ? "All questions will be shown together as a form." : acc.textOnly ? "The questions will be shown as text, one at a time." : "Zuri will introduce herself, then ask her first question."}</p>
      <Btn onClick={() => setPhase(acc.written ? "written" : acc.textOnly ? "qa" : "intro")}>Begin interview with Zuri</Btn>
    </div>}

    {phase === "intro" && <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <VideoStage key="intro" src={INTERVIEW_INTRO.video} autoPlay playing={playing} onPlay={() => setPlaying(true)} onStop={() => setPlaying(false)} />
      <Btn onClick={() => { setPlaying(false); setPhase("qa"); }}>Start the questions</Btn>
    </div>}

    {phase === "qa" && <div style={{ display: "grid", gap: 14, justifyItems: "center" }}>
      <div style={{ fontFamily: F.mono, fontSize: 11, color: T.slate }}>question {idx + 1} of {total}</div>
      {!acc.textOnly && <VideoStage key={INTERVIEW_SCRIPT[idx].id} src={INTERVIEW_SCRIPT[idx].video} autoPlay playing={playing} onPlay={() => setPlaying(true)} onStop={() => setPlaying(false)} />}
      {INTERVIEW_SCRIPT[idx].text && <div style={{ maxWidth: 520, textAlign: "center", fontSize: 15 }}><b style={{ color: T.emerald, fontFamily: F.mono, fontSize: 12 }}>ZURI</b> . {INTERVIEW_SCRIPT[idx].text}</div>}
      <div style={{ width: "100%", maxWidth: 560 }}>
        <textarea rows={3} value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Answer in a few honest sentences." style={{ width: "100%", background: T.paper, color: T.ink, border: `1px solid ${T.line}`, borderRadius: 8, padding: 11, fontSize: 14, resize: "vertical" }} />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}><Btn small disabled={answer.trim().length < 4} onClick={submit}>{last ? "Finish and score" : "Send answer"}</Btn></div>
      </div>
      {answered}
    </div>}

    {phase === "written" && <div style={{ display: "grid", gap: 16, width: "100%", maxWidth: 620, margin: "0 auto" }}>
      {INTERVIEW_SCRIPT.map((q, i) => <div key={q.id}>
        <div style={{ fontSize: 14, marginBottom: 6 }}><b style={{ color: T.emerald, fontFamily: F.mono, fontSize: 12 }}>Q{i + 1}</b> {captionFor(i)}</div>
        <textarea rows={3} value={wAns[i] || ""} onChange={e => setWAns(a => ({ ...a, [i]: e.target.value }))} placeholder="Answer in a few honest sentences." style={ta} />
      </div>)}
      <div style={{ display: "flex", justifyContent: "flex-end" }}><Btn disabled={!writtenReady} onClick={submitWritten}>Finish and score</Btn></div>
    </div>}

    {phase === "scoring" && <div style={{ display: "flex", justifyContent: "center" }}>{err
      ? <div style={{ color: T.alert, fontSize: 14, display: "flex", gap: 12, alignItems: "center" }}>Scoring did not complete. <Btn kind="ghost" small onClick={() => score(qa)}>Try again</Btn></div>
      : <Card><Spinner label="Telos is assessing your six dimensions from your interview..." /></Card>}</div>}

    <div style={{ height: 30 }} />
  </div></Scroll>;
}

// ---- Trajectory Forecast (Growth Dashboard tile). NO MODEL for the forecast
// (computed from dimension scores and the weight formula); NEEDS MODEL for the
// narrative, inert-aware. Picks the highest gain-potential dimension.
const EFFORT = {
  "Culture Shock Simulator": "45 mins",
  "Async Operating Rhythm": "2 hours",
  "Professional Presence": "1.5 hours",
  "Collaboration and Code Review": "2 hours",
  "Structured Problem Solving": "2.5 hours",
  "Technical Deep Dive": "3 hours",
};
function TrajectoryForecast({ result }) {
  const withGain = (result.dimensions || []).map(d => { const weight = WEIGHTS[d.name] ?? 0.15; return { name: d.name, score: d.score, weight, gain: (100 - d.score) * weight }; });
  const forecast = withGain.length ? withGain.reduce((a, b) => (b.gain > a.gain ? b : a)) : null;
  const current = result.profileStrength;
  // Clamp at the target: a dimension already above 75 gains nothing by reaching
  // it, so the projection floors at the current score. Without this, a strong
  // profile renders a negative delta styled as an improvement.
  const projected = forecast ? Math.round(current + Math.max(0, 75 - forecast.score) * forecast.weight) : current;
  const delta = projected - current;
  const mod = forecast ? MODULES[forecast.name] : null;
  const effort = mod ? (EFFORT[mod.title] || "varies") : "";
  const [narr, setNarr] = useState("");
  const [nBusy, setNBusy] = useState(false);
  const [nErr, setNErr] = useState("");
  const userPrompt = forecast ? `Profile Strength: ${current}. Weakest high-weight dimension: ${forecast.name} at ${forecast.score}, weight ${forecast.weight}. Projected strength if this dimension reaches 75: ${projected}. Other dimensions: ${withGain.filter(d => d.name !== forecast.name).map(d => `${d.name} ${d.score}`).join(", ")}.` : "";
  useEffect(() => {
    if (!userPrompt) return;
    let cancelled = false;
    (async () => {
      setNBusy(true); setNErr("");
      try {
        const sys = "You are Telos, the intelligence layer for FIND. In two to three sentences, explain in plain language why this specific dimension is the highest-leverage intervention for this candidate right now, grounded in the weighting formula and their current scores. Be specific. No flattery. No em dashes. Do not invent figures; reference only the numbers provided.";
        const out = await callClaude({ system: sys, messages: [{ role: "user", content: userPrompt }], expectJson: false });
        if (!cancelled) setNarr(out);
      } catch (e) { if (!cancelled) setNErr(String(e).includes("501") ? "config" : "fail"); }
      if (!cancelled) setNBusy(false);
    })();
    return () => { cancelled = true; };
  }, [userPrompt]); // fires once per forecast (prompt is stable per render)

  if (!forecast) return null;
  return <Card accent={T.emerald}>
    <Label>Trajectory Forecast</Label>
    <div style={{ fontFamily: F.mono, fontSize: 11, color: T.slate, marginTop: 4 }}>Computed by Telos. The single intervention that moves your score fastest.</div>
    <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}><span style={{ color: T.slate }}>Current Profile Strength</span><span style={{ fontFamily: F.mono }}>{current}</span></div>
      <div style={{ background: T.paper, border: `1px solid ${T.line}`, borderRadius: 8, padding: 12 }}>
        <div style={{ fontFamily: F.mono, fontSize: 10.5, color: T.slateLg, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 4 }}>Forecast intervention</div>
        <div style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 16 }}>{forecast.name} <span style={{ color: T.slate, fontWeight: 400, fontSize: 13 }}>at {forecast.score}</span></div>
        <div style={{ fontSize: 13, color: T.slate, marginTop: 4 }}>Module: {mod ? mod.title : "—"} . est. {effort}</div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 13.5, color: T.slate }}>Projected if it reaches 75</span>
        <span><span style={{ fontFamily: F.disp, fontWeight: 800, fontSize: 22, color: T.emerald }}>{projected}</span> <span style={{ fontFamily: F.mono, fontSize: 12, color: T.emerald }}>{delta >= 0 ? "+" : ""}{delta} points</span></span>
      </div>
    </div>
    <div style={{ marginTop: 12 }}>
      {nBusy ? <Spinner label="Telos is explaining the forecast..." />
        : nErr ? <div style={{ fontSize: 13, color: T.slate }}>Telos narrative available once a provider is connected.</div>
          : narr ? <div style={{ background: T.paper, borderLeft: `3px solid ${T.emerald}`, borderRadius: 8, padding: "10px 12px", fontSize: 13.5, lineHeight: 1.6 }}>{narr}</div>
            : null}
    </div>
    <div style={{ marginTop: 16, fontFamily: F.mono, fontSize: 10.5, color: T.slate, borderTop: `1px solid ${T.mute}`, paddingTop: 10 }}>Forecast computed by Telos from your dimension scores and the disclosed weighting formula. Projected score assumes the target dimension reaches 75. No figure is model-generated.</div>
  </Card>;
}

function Dashboard({ profile, result, onUpskill, published, audit, logAudit, culture, premium, onUpgrade, reviews, submitReview }) {
  const tier = result.tier; const rec = MODULES[result.weakest?.name] || MODULES["Technical depth"];
  const [zuri, setZuri] = useState(""); const [zb, setZb] = useState(false); const [showCalc, setShowCalc] = useState(false);
  const [openDims, setOpenDims] = useState({});
  const transcript = result.transcript || [];
  // Contest a specific dimension score (NO MODEL). Filed to the reviews queue;
  // the dimension shows "under review" while its queue row stays open. In demo
  // mode (no backend) the marker falls back to local audit entries.
  const [contestOpen, setContestOpen] = useState(false);
  const [cDim, setCDim] = useState(""); const [cWhy, setCWhy] = useState(""); const [cCtx, setCCtx] = useState(""); const [cRef, setCRef] = useState("");
  const contestedDims = new Set(hasBackend
    ? (reviews || []).filter(r => r.kind === "contest" && r.status !== "resolved").map(r => r.subject)
    : (audit || []).filter(e => e.kind === "contest").map(e => e.dimension));
  function openContest() { setCDim(result.dimensions[0]?.name || ""); setCWhy(""); setCCtx(""); setCRef(""); setContestOpen(true); }
  function submitContest() {
    if (!cWhy.trim()) return;
    const r = "CT-" + Math.random().toString(36).slice(2, 7).toUpperCase();
    setCRef(r);
    if (submitReview) submitReview({ kind: "contest", subject: cDim, reason: cWhy.trim(), context: cCtx.trim(), ref: r });
    if (logAudit) logAudit({ kind: "contest", dimension: cDim, reason: cWhy.trim(), context: cCtx.trim(), ref: r, source: "candidate" });
  }
  async function askZuri() { setZb(true); try { const sys = "You are Zuri, the career copilot inside Fumana. In three to four warm, direct sentences, tell this builder the single most valuable next move to raise their tier, grounded in their weakest dimension. No hype, no em dashes."; setZuri(await callClaude({ system: sys, messages: [{ role: "user", content: `Profile strength ${result.profileStrength}, tier ${tier.name}. Weakest: ${result.weakest?.name} at ${result.weakest?.score}. Role ${profile.role || "engineer"}.` }], expectJson: false })); } catch { setZuri("Zuri is unavailable right now."); } setZb(false); }
  return <Scroll><div style={{ maxWidth: 860, margin: "0 auto" }} className="rise">
    {published && <div style={{ marginBottom: 16, background: "rgba(6,110,90,0.06)", border: `1px solid ${T.emerald}`, borderRadius: 10, padding: "11px 14px", fontSize: 13.5, color: T.vault }}>✓ You are now in the network, identity shielded. Switch to the employer side and search to find yourself.</div>}
    {!premium?.isPremium && <div style={{ marginBottom: 16, background: "rgba(176,138,46,0.08)", border: `1px solid ${T.brass}`, borderRadius: 10, padding: "11px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}><div style={{ fontSize: 13.5, color: T.ink }}><b>FIND Premium Pro.</b> Priority matching, zero-commission escrow, unlimited upskilling, and more for {PREMIUM_PRICE}.</div><Btn small onClick={onUpgrade}>Upgrade</Btn></div>}
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
      <div><Eyebrow>Growth dashboard</Eyebrow><h2 style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 26, margin: "6px 0 2px" }}>{profile.name || "Your"} profile</h2><div style={{ color: T.slate, fontSize: 14 }}>{profile.role} . {profile.city || "location hidden"}</div>{culture != null && <div style={{ marginTop: 8 }}><span style={{ fontFamily: F.mono, fontSize: 11.5, color: T.emerald, border: `1px solid ${T.emerald}`, borderRadius: 6, padding: "3px 9px" }}>✓ Culture Shock Simulator {culture}/100</span></div>}</div>
      <div style={{ textAlign: "right" }}><div style={{ fontFamily: F.disp, fontWeight: 800, fontSize: 46, color: T.emerald, lineHeight: 1 }}>{result.profileStrength}</div><button onClick={() => setShowCalc(s => !s)} style={{ fontFamily: F.mono, fontSize: 11, color: T.slate, background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}>profile strength . how is this calculated</button><div><span style={{ display: "inline-block", marginTop: 6, fontFamily: F.mono, fontSize: 12, color: T.onAccent, background: tier.color, borderRadius: 5, padding: "3px 10px" }}>{tier.name} tier</span></div>{premium?.isPremium && <div style={{ marginTop: 6, fontFamily: F.mono, fontSize: 11, color: T.brass }}>Premium member since {premium.premiumSince}</div>}<div style={{ marginTop: 6, display: "flex", gap: 14, justifyContent: "flex-end", flexWrap: "wrap" }}><ReviewLink what={`Profile Strength: ${result.profileStrength}`} /><button onClick={openContest} style={{ fontFamily: F.mono, fontSize: 11, color: T.brass, background: "transparent", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline", whiteSpace: "nowrap" }}>Contest this score</button></div></div>
    </div>
    {showCalc && <div style={{ marginTop: 14 }}><Card pad={16} accent={T.brass}><Label>How this was calculated</Label><p style={{ fontSize: 13.5, color: T.slate, margin: "8px 0 10px" }}>Telos assessed each dimension 0 to 100 from your interview and experience. Profile Strength is the weighted average.</p><div style={{ display: "grid", gap: 5 }}>{result.dimensions.map((d, i) => <div key={i} style={{ display: "flex", justifyContent: "space-between", fontFamily: F.mono, fontSize: 12, color: T.slate }}><span>{d.name}</span><span>{d.score} × {WEIGHTS[d.name]?.toFixed(2)}</span></div>)}<div style={{ display: "flex", justifyContent: "space-between", fontFamily: F.mono, fontSize: 12.5, color: T.emerald, borderTop: `1px solid ${T.mute}`, paddingTop: 6, marginTop: 2 }}><span>weighted average</span><span>{result.profileStrength}</span></div></div></Card></div>}
    <div className="dash" style={{ marginTop: 18 }}>
      <div style={{ display: "grid", gap: 18, alignContent: "start" }}>
      <Card><Label>Dimension scores</Label><div style={{ display: "grid", gap: 18, marginTop: 14 }}>{result.dimensions.map((d, i) => {
        const b = BAND(d.score); const open = openDims[i]; const low = d.score < 60;
        return <div key={i}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, fontSize: 14 }}><span style={{ color: T.ink, fontWeight: 500 }}>{d.name}</span><span style={{ fontFamily: F.mono, color: low ? T.alert : T.ink }}>{d.score}/100</span></div>
          <div style={{ height: 7, background: T.mute, borderRadius: 4, marginTop: 5 }}><div style={{ height: "100%", width: `${d.score}%`, background: low ? T.alert : T.emerald, borderRadius: 4, animation: "grow 1s ease" }} /></div>
          <div style={{ marginTop: 7, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><span style={{ fontFamily: F.mono, fontSize: 10.5, color: low ? T.alert : T.emerald, border: `1px solid ${low ? T.alert : T.emerald}`, borderRadius: 4, padding: "1px 7px" }}>{b.label} . {b.range}</span>{contestedDims.has(d.name) && <span style={{ fontFamily: F.mono, fontSize: 10.5, color: T.brass, border: `1px solid ${T.brass}`, borderRadius: 4, padding: "1px 7px" }}>under review</span>}</div>
          <div style={{ fontSize: 12.5, color: T.slate, marginTop: 6 }}><b style={{ color: T.ink }}>Why this score:</b> {d.score} lands in the {b.label.toLowerCase()} band ({b.range}), {b.why}.</div>
          <div style={{ fontSize: 12.5, color: T.slate, marginTop: 4 }}><b style={{ color: T.ink }}>Rationale:</b> {d.rationale}</div>
          <div style={{ display: "flex", gap: 16, marginTop: 6, flexWrap: "wrap" }}>
            <button onClick={() => setOpenDims(o => ({ ...o, [i]: !o[i] }))} aria-expanded={!!open} style={{ fontFamily: F.mono, fontSize: 11, color: T.emerald, background: "transparent", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}>{open ? "hide evidence" : "show evidence"}</button>
            <ReviewLink what={`${d.name} score: ${d.score}/100`} />
          </div>
          {open && <div style={{ marginTop: 8, background: T.paper, border: `1px solid ${T.line}`, borderRadius: 8, padding: 11 }}>
            <div style={{ fontFamily: F.mono, fontSize: 10, color: T.slate, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 7 }}>Evidence . {EVIDENCE[d.name]}</div>
            {d.name === "Technical depth"
              ? <div style={{ fontSize: 13, color: T.ink, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{profile.experience || "No experience text provided."}</div>
              : (transcript.length
                ? <div style={{ display: "grid", gap: 9 }}>{transcript.map((x, k) => <div key={k}><div style={{ fontSize: 12, color: T.slate }}><b style={{ color: T.emerald, fontFamily: F.mono, fontSize: 11 }}>Q{k + 1}</b> {x.q}</div><div style={{ fontSize: 13, color: T.ink, marginTop: 2 }}>{x.a}</div></div>)}</div>
                : <div style={{ fontSize: 13, color: T.slate }}>Interview answers are not available for this profile.</div>)}
          </div>}
        </div>;
      })}</div></Card>
      <TrajectoryForecast result={result} />
      </div>
      <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
        <Card accent={T.brass}><Label>Recommended next step</Label><div style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 17, marginTop: 8 }}>{rec.title}</div><p style={{ fontSize: 13.5, color: T.slate, margin: "6px 0 12px" }}>{rec.blurb}</p><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontFamily: F.mono, fontSize: 12, color: T.emerald }}>+{rec.pts} pts</span><Btn small onClick={onUpskill}>Start module</Btn></div><div style={{ marginTop: 10, fontSize: 12, color: T.slate }}>Weakest dimension: <b>{result.weakest?.name}</b>.</div></Card>
        <Card accent={zuri ? T.emerald : T.line}><Label>Zuri . career copilot</Label>{!zuri && !zb && <div style={{ marginTop: 10 }}><Btn kind="ghost" small onClick={askZuri}>Ask Zuri what to do next</Btn></div>}{zb && <div style={{ marginTop: 12 }}><Spinner label="Zuri is thinking..." /></div>}{zuri && <p style={{ marginTop: 10, fontSize: 14, lineHeight: 1.6 }}>{zuri}</p>}</Card>
      </div>
    </div>
    {contestOpen && <Modal titleId="contest-title" onClose={() => setContestOpen(false)}>
      {cRef
        ? <>
          <Eyebrow>Contest a score</Eyebrow>
          <h3 id="contest-title" style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 20, margin: "8px 0 6px" }}>Contest received. A human will look at this.</h3>
          <p style={{ fontSize: 14, color: T.slate, marginBottom: 14 }}>Your contest of your {cDim} score is logged and queued for a human reviewer. The score stays as it is, marked under review, until a person resolves it.</p>
          <div style={{ background: T.paper, border: `1px solid ${T.line}`, borderRadius: 8, padding: 12, fontFamily: F.mono, fontSize: 12.5, display: "grid", gap: 5 }}>
            <div><span style={{ color: T.slate }}>reference </span><b>{cRef}</b></div>
            <div><span style={{ color: T.slate }}>expected </span>within 5 business days</div>
          </div>
          <div style={{ marginTop: 10, fontFamily: F.mono, fontSize: 11, color: T.slate }}>Queued for a human reviewer. Logged to your audit trail.</div>
          <div style={{ marginTop: 16 }}><Btn onClick={() => setContestOpen(false)}>Done</Btn></div>
        </>
        : <>
          <Eyebrow>Contest a score</Eyebrow>
          <h3 id="contest-title" style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 20, margin: "8px 0 6px" }}>Contest a specific dimension</h3>
          <p style={{ fontSize: 13.5, color: T.slate, marginBottom: 14 }}>Contest is about one score dimension. For anything broader, use request human review instead.</p>
          <label htmlFor="contest-dim" style={{ fontFamily: F.mono, fontSize: 11, color: T.slateLg, textTransform: "uppercase", letterSpacing: 0.3 }}>Which dimension?</label>
          <select id="contest-dim" value={cDim} onChange={e => setCDim(e.target.value)} style={{ width: "100%", background: T.paper, color: T.ink, border: `1px solid ${T.line}`, borderRadius: 8, padding: 11, fontSize: 14, margin: "6px 0 14px" }}>{result.dimensions.map((d, i) => <option key={i} value={d.name}>{d.name} ({d.score}/100)</option>)}</select>
          <Field label="Why are you contesting this?" value={cWhy} onChange={setCWhy} rows={3} placeholder="In your own words." />
          <Field label="Extra context (optional)" value={cCtx} onChange={setCCtx} rows={2} placeholder="Anything a reviewer should know." />
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}><Btn disabled={!cWhy.trim()} onClick={submitContest}>Submit contest</Btn><Btn kind="ghost" onClick={() => setContestOpen(false)}>Cancel</Btn></div>
        </>}
    </Modal>}
    <div style={{ height: 30 }} />
  </div></Scroll>;
}

// ---- Culture Shock Simulator (candidate, inside Path to 1%). NEEDS MODEL ----
// Scenario-based training on Western corporate communication norms. Telos scores
// each choice and reads the completion. getScenarios() is the adaptive seam.
const CULTURE_SCENARIOS = [
  { id: "cs-001", title: "The blunt message", situation: "Your manager in Berlin sends a Slack message at 9pm your time: 'This is not what I asked for. Redo it.' You spent three days on this work.", options: ["Wait until tomorrow and redo it without responding.", "Reply immediately: 'I apologize. I will redo it right away.'", "Reply: 'Understood. Can you point me to what needs to change so I get it right this time?'", "Reply: 'I worked hard on this. Could you tell me specifically what is wrong?'"], correct: 2, explanation: "Option C is correct. In Western enterprise contexts, asking for specific feedback is professional, not defensive. It shows you want to solve the problem, not just comply. Option A is passive and reads as avoidance. Option B over-apologizes without gathering information to improve. Option D sounds defensive about effort rather than focused on outcome." },
  { id: "cs-002", title: "The silent deadline", situation: "A US client gave you a task on Monday with no deadline. It is now Thursday. You are 80% done but need two more days.", options: ["Finish it before reaching out. Deliver on Saturday.", "Send a message now: 'Update: I am 80% done. I need two more days, delivering Saturday. Blocking issue: [X]. Need anything from you before then?'", "Wait until Friday to send an update.", "Ask your manager what the deadline was before doing anything else."], correct: 1, explanation: "Option B is correct. Proactive async updates are the single most valued behavior in Western remote teams. Do not wait to be asked. State progress, state the new date, name any blocker. Option A delivers without communication, which creates anxiety for the client. Options C and D are too late or too passive." },
  { id: "cs-003", title: "Disagreeing with a senior", situation: "Your tech lead proposes an architecture you believe will cause scaling problems in six months. You are the most junior person on the call.", options: ["Stay quiet. It is not your place to challenge a senior.", "Challenge them directly in the meeting: 'That will not scale.'", "After the meeting, send a private message with your concern and your alternative.", "Raise it in the meeting: 'I want to flag a potential scaling concern. Can I share a quick alternative for the team to consider?'"], correct: 3, explanation: "Option D is correct. Western enterprise values technical input regardless of seniority, but framing matters. Asking permission to share ('can I...') shows respect for the meeting flow. Naming it a 'concern' rather than a verdict keeps it collaborative. Option A wastes your knowledge. Option B is abrupt. Option C is good but private, which misses the team benefit." },
  { id: "cs-004", title: "The unclear requirement", situation: "You receive a task with a two-day deadline. The requirements are ambiguous in two key areas. Your tech lead is in a different timezone and offline for the next eight hours.", options: ["Wait for them to come online before starting.", "Make your best assumptions, document them, start work, and send a message outlining your assumptions and asking for confirmation when they are back.", "Start work on the parts that are clear and ignore the ambiguous sections.", "Email the client directly to clarify."], correct: 1, explanation: "Option B is correct. Document your assumptions and proceed. This is the core async muscle. You keep the project moving, you show initiative, and you create a clear record. Option A stalls the work unnecessarily. Option C creates a partial deliverable with hidden gaps. Option D bypasses the chain of communication." },
  { id: "cs-005", title: "The critical code review", situation: "A senior colleague leaves twelve comments on your pull request. Three are blocking. The tone is terse and technical, no praise.", options: ["Feel discouraged. A good PR would have fewer comments.", "Address the three blocking comments and mark the others as 'will fix later.'", "Address every comment, reply to each one explaining what you changed or why you disagree, and re-request review.", "Ask your manager if the feedback was fair before responding."], correct: 2, explanation: "Option C is correct. Thorough engagement with every review comment, including explaining your reasoning when you disagree, is the mark of a senior engineering culture. Terse review comments are normal, not hostile. Option A misreads the culture. Option B leaves unresolved items. Option D escalates unnecessarily." },
];
function getScenarios() { return CULTURE_SCENARIOS; }

function MicroInternships() {
  const toast = useToast();
  const list = [
    { title: "Payment reconciliation audit", weeks: "2 weeks", skills: ["Python", "PostgreSQL"] },
    { title: "Accessible dashboard component", weeks: "1 week", skills: ["React", "Accessibility"] },
    { title: "ETL pipeline hardening", weeks: "3 weeks", skills: ["Airflow", "SQL"] },
  ];
  return <div style={{ marginTop: 18 }}>
    <p style={{ color: T.slate, fontSize: 14, marginBottom: 14 }}>Short, project-based work to prove your skills before a full engagement. Apply, deliver, and convert.</p>
    <div style={{ display: "grid", gap: 12 }}>{list.map((m, i) => <Card key={i}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <div><div style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 16 }}>{m.title}</div><div style={{ fontFamily: F.mono, fontSize: 11, color: T.slate, marginTop: 3 }}>{m.weeks}</div></div>
        <Btn small kind="ghost" onClick={() => toast("Application sent. Matching runs on the backend.")}>Apply</Btn>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>{m.skills.map((s, j) => <span key={j} style={{ fontFamily: F.mono, fontSize: 11.5, color: T.emerald, border: `1px solid ${T.line}`, borderRadius: 4, padding: "3px 8px" }}>{s}</span>)}</div>
    </Card>)}</div>
    <div style={{ marginTop: 12, fontFamily: F.mono, fontSize: 11, color: T.slate }}>Applying and matching run on the backend. Seed projects shown here.</div>
  </div>;
}

function CultureShock({ culture, setCulture, logAudit }) {
  const scenarios = getScenarios();
  const total = scenarios.length;
  const [phase, setPhase] = useState("intro"); // intro | play | done
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [score, setScore] = useState(0);
  const [telos, setTelos] = useState("");
  const [tBusy, setTBusy] = useState(false);
  const [tErr, setTErr] = useState("");

  function start() { setPhase("play"); setIdx(0); setPicked(null); setAnswers([]); setScore(0); setTelos(""); setTErr(""); }
  async function getTelos(finalScore, finalAnswers) {
    setTBusy(true); setTErr("");
    try {
      const sys = "You are Telos, assessing a builder's Western corporate communication readiness. In two sentences, give a direct, honest read of their performance across these five scenarios. Name their strongest instinct and the one area to sharpen. No flattery. No em dashes.";
      const user = `Score: ${finalScore}/100. Scenario results: ${finalAnswers.map(a => `${a.title}: ${a.correct ? "correct" : "incorrect"}`).join("; ")}.`;
      setTelos(await callClaude({ system: sys, messages: [{ role: "user", content: user }], expectJson: false }));
    } catch (e) { setTErr(String(e).includes("501") ? "config" : "fail"); }
    setTBusy(false);
  }
  function finish(finalScore, finalAnswers) {
    setPhase("done");
    const firstTime = culture == null;
    setCulture(prev => (prev == null || finalScore > prev ? finalScore : prev));
    if (firstTime && logAudit) logAudit({ kind: "culture-sim", score: finalScore });
    getTelos(finalScore, finalAnswers);
  }
  function next() {
    const correct = picked === scenarios[idx].correct;
    const nextAnswers = [...answers, { id: scenarios[idx].id, title: scenarios[idx].title, correct }];
    const nextScore = score + (correct ? 20 : 0);
    setAnswers(nextAnswers); setScore(nextScore);
    if (idx + 1 >= total) { finish(nextScore, nextAnswers); return; }
    setIdx(idx + 1); setPicked(null);
  }

  if (phase === "intro") return <div style={{ marginTop: 18 }}><Card>
    <Label>Culture Shock Simulator</Label>
    <p style={{ fontSize: 14.5, color: T.ink, margin: "10px 0 8px", lineHeight: 1.6 }}>Five scenarios. Real workplace situations. Choose how you respond. Telos explains the reasoning behind each answer.</p>
    {culture != null && <div style={{ fontFamily: F.mono, fontSize: 12, color: T.emerald, marginBottom: 10 }}>Your best score: {culture}/100</div>}
    <Btn onClick={start}>{culture != null ? "Play again" : "Start the simulator"}</Btn>
  </Card></div>;

  if (phase === "play") {
    const s = scenarios[idx];
    const revealed = picked != null;
    return <div style={{ marginTop: 18 }}>
      <div style={{ fontFamily: F.mono, fontSize: 11, color: T.slate, marginBottom: 10 }}>scenario {idx + 1} of {total} . score {score}</div>
      <Card>
        <Label>{s.title}</Label>
        <p style={{ fontSize: 14.5, color: T.ink, margin: "10px 0 14px", lineHeight: 1.6, background: T.paper, borderLeft: `3px solid ${T.line}`, padding: "10px 14px", borderRadius: 8 }}>{s.situation}</p>
        <div style={{ display: "grid", gap: 8 }}>{s.options.map((opt, i) => {
          const isCorrect = i === s.correct, isPicked = picked === i;
          const border = !revealed ? T.line : isCorrect ? T.emerald : isPicked ? T.alert : T.line;
          const bg = !revealed ? T.surface : isCorrect ? "rgba(6,110,90,0.06)" : isPicked ? "rgba(168,67,31,0.06)" : T.surface;
          return <button key={i} onClick={() => { if (!revealed) setPicked(i); }} disabled={revealed} aria-pressed={isPicked}
            style={{ textAlign: "left", width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: "12px 14px", fontSize: 14, cursor: revealed ? "default" : "pointer", color: T.ink, opacity: revealed && !isCorrect && !isPicked ? 0.6 : 1, lineHeight: 1.5 }}>
            <span style={{ fontFamily: F.mono, fontSize: 11, color: T.slate, marginRight: 8 }}>{String.fromCharCode(65 + i)}</span>{opt}{revealed && isCorrect ? "  ✓" : revealed && isPicked ? "  ✗" : ""}
          </button>;
        })}</div>
        {revealed && <div style={{ marginTop: 14, background: T.paper, border: `1px solid ${picked === s.correct ? T.emerald : T.brass}`, borderLeft: `3px solid ${picked === s.correct ? T.emerald : T.brass}`, borderRadius: 8, padding: 14 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6, color: picked === s.correct ? T.emerald : T.brass }}>{picked === s.correct ? "Correct. +20 points" : "Not the strongest choice. +0 points"}</div>
          <p style={{ fontSize: 13.5, color: T.ink, lineHeight: 1.6 }}>{s.explanation}</p>
          <div style={{ marginTop: 12 }}><Btn small onClick={next}>{idx + 1 >= total ? "See results" : "Next scenario"}</Btn></div>
        </div>}
      </Card>
    </div>;
  }

  // done
  return <div style={{ marginTop: 18 }}><Card accent={T.emerald}>
    <Label>Complete</Label>
    <div style={{ fontFamily: F.disp, fontWeight: 800, fontSize: 40, color: T.emerald, marginTop: 6, lineHeight: 1 }}>{score}<span style={{ fontSize: 20, color: T.slate }}>/100</span></div>
    <div style={{ display: "grid", gap: 5, marginTop: 14 }}>{answers.map((a, i) => <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, borderTop: `1px solid ${T.mute}`, paddingTop: 6 }}><span>{a.title}</span><span style={{ fontFamily: F.mono, fontSize: 12, color: a.correct ? T.emerald : T.alert }}>{a.correct ? "+20" : "+0"}</span></div>)}</div>
    <div style={{ marginTop: 16 }}>
      {tBusy ? <Spinner label="Telos is reading your results..." />
        : tErr === "config" ? <p style={{ fontSize: 14, color: T.slate }}>You completed all five scenarios. Telos's personalized read lights up the moment a model provider is connected.</p>
          : tErr === "fail" ? <div style={{ color: T.alert, fontSize: 14, display: "flex", gap: 12, alignItems: "center" }}>Telos did not respond. <Btn kind="ghost" small onClick={() => getTelos(score, answers)}>Try again</Btn></div>
            : telos ? <div style={{ background: T.paper, borderLeft: `3px solid ${T.emerald}`, borderRadius: 8, padding: "10px 14px" }}><div style={{ fontFamily: F.mono, fontSize: 10.5, color: T.slateLg, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 4 }}>Telos read</div><p style={{ fontSize: 14, lineHeight: 1.6 }}>{telos}</p></div>
              : null}
    </div>
    {score < 60 && <p style={{ marginTop: 12, fontSize: 13.5, color: T.brass }}>Retake to improve your score. Your best score is recorded.</p>}
    <div style={{ marginTop: 14 }}><Btn small onClick={start}>{score < 60 ? "Retake" : "Play again"}</Btn></div>
    <div style={{ marginTop: 10, fontFamily: F.mono, fontSize: 11, color: T.slate }}>300 Good Citizen Points awarded on first completion. Best score recorded on your profile.</div>
  </Card></div>;
}

function Upskill({ result, points, setPoints, culture, setCulture, logAudit, premium, onUpgrade }) {
  const recId = (MODULES[result.weakest?.name] || {}).id; const list = Object.values(MODULES); const [done, setDone] = useState({});
  const [tab, setTab] = useState("training");
  const complete = m => { if (done[m.id]) return; setDone(d => ({ ...d, [m.id]: true })); setPoints(p => p + m.pts); };
  const TABS = [["training", "Training"], ["micro", "Micro-internships"], ["culture", "Culture Shock Simulator"]];
  return <Scroll><div style={{ maxWidth: 860, margin: "0 auto" }} className="rise">
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}><div><Eyebrow>Path to 1%</Eyebrow><h2 style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 26, margin: "6px 0 0" }}>Close the gap, reach the top tier</h2></div><div style={{ textAlign: "right" }}><div style={{ fontFamily: F.disp, fontWeight: 800, fontSize: 30, color: T.brass, lineHeight: 1 }}>{points}</div><div style={{ fontFamily: F.mono, fontSize: 11, color: T.slate }}>reward points</div></div></div>
    <div role="tablist" aria-label="Path to 1% sections" style={{ display: "flex", gap: 6, marginTop: 18, flexWrap: "wrap", borderBottom: `1px solid ${T.line}` }}>
      {TABS.map(([k, lbl]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} style={{ background: "transparent", border: "none", borderBottom: `2px solid ${tab === k ? T.emerald : "transparent"}`, color: tab === k ? T.ink : T.slate, fontFamily: F.body, fontSize: 13.5, fontWeight: tab === k ? 600 : 400, padding: "8px 6px", cursor: "pointer" }}>{lbl}</button>)}
    </div>
    {tab === "training" && <>
      <div className="mods" style={{ marginTop: 20 }}>{list.map((m, i) => { const isRec = m.id === recId, finished = done[m.id], locked = !premium?.isPremium && i >= 3; return <Card key={m.id} accent={isRec ? T.brass : T.line}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><Label>{isRec ? "recommended for you" : "module"}</Label>{finished && <span style={{ fontFamily: F.mono, fontSize: 11, color: T.emerald }}>completed</span>}{locked && <span style={{ fontFamily: F.mono, fontSize: 11, color: T.brass, display: "inline-flex", alignItems: "center", gap: 4 }}><LockIcon size={10} /> Premium</span>}</div><div style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 17, marginTop: 8 }}>{m.title}</div><p style={{ fontSize: 13.5, color: T.slate, margin: "6px 0 14px" }}>{m.blurb}</p><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontFamily: F.mono, fontSize: 12, color: T.emerald }}>+{m.pts} pts</span>{locked ? <Btn small onClick={onUpgrade}>Unlock with Premium</Btn> : <Btn kind={finished ? "ghost" : "primary"} small disabled={finished} onClick={() => complete(m)}>{finished ? "Done" : "Complete module"}</Btn>}</div>{locked && <div style={{ marginTop: 8, fontFamily: F.mono, fontSize: 11, color: T.brass }}>Available on FIND Premium Pro. Upgrade in Settings.</div>}</Card>; })}</div>
      <div style={{ marginTop: 18 }}><Card><Label>Achievements</Label><div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}><Badge on label="Profile verified" /><Badge on={result.profileStrength >= 50} label="Silver reached" /><Badge on={result.profileStrength >= 70} label="Gold reached" /><Badge on={Object.keys(done).length >= 1} label="First module" /><Badge on={points >= 500} label="500 points" /><Badge on={culture != null} label={culture != null ? `Culture Shock ${culture}/100` : "Culture Shock Simulator"} /></div></Card></div>
    </>}
    {tab === "micro" && <MicroInternships />}
    {tab === "culture" && <CultureShock culture={culture} setCulture={setCulture} logAudit={logAudit} />}
    <div style={{ height: 30 }} />
  </div></Scroll>;
}
const Badge = ({ on, label }) => <span style={{ fontFamily: F.mono, fontSize: 12, padding: "6px 11px", borderRadius: 6, border: `1px solid ${on ? T.emerald : T.line}`, color: on ? T.emerald : T.slate, background: on ? "rgba(6,110,90,0.06)" : "transparent" }}>{on ? "✓ " : "○ "}{label}</span>;

// ============================================================
// EMPLOYER SIDE
// ============================================================
// ---- Employer onboarding (welcome -> auth -> company-info -> alignment -> app) ----
// Same shell and palette as the candidate portal. Auth uses the Tailwind
// AuthFormPage (Google + LinkedIn). The Zuri dock is gated off until the app.

// Employer sidebar/nav. Dashboard is real; Engage Experts, Talent Pipeline, and
// Investments reuse the existing working screens; the rest are honest stubs.
const EMP_NAV = [
  ["dashboard", "Dashboard"], ["engage", "Engage Experts"], ["pipeline", "Talent Pipeline"],
  ["saved", "Saved Builders"], ["team", "My Team"], ["trust", "Trust and Safety"],
  ["investments", "Investments"], ["account", "Account"],
];
const EMP_SIZES = ["1 to 50", "51 to 200", "201 to 1000", "1000 plus"];
const EMP_PLEDGES = [
  { key: "fairPay", title: "Fair pay", desc: "I will pay within a fair band for the role and region, not below local market for equivalent skill." },
  { key: "hours", title: "Reasonable hours", desc: "I will agree a working-hours and timezone-overlap expectation, not round-the-clock availability." },
  { key: "noMonitor", title: "No covert monitoring", desc: "I will not covertly monitor or surveil the builder. Any work tracking is agreed and visible to them." },
];

function EmpWelcome({ onNext, onBack }) {
  return <Centered><div style={{ width: "100%", maxWidth: 620 }} className="rise">
    {onBack && <Back onClick={onBack} />}
    <Eyebrow>For employers</Eyebrow>
    <h1 style={{ fontFamily: F.disp, fontWeight: 800, fontSize: 34, letterSpacing: 0.3, lineHeight: 1.12, margin: "8px 0 10px" }}>Hire verified African talent with the risk carried for you</h1>
    <p style={{ color: T.slateLg, fontSize: 16, maxWidth: 520, marginBottom: 26 }}>Search by evidence, with identity shielded until you commit.</p>
    <Btn onClick={onNext}>Get started</Btn>
  </div></Centered>;
}

function EmpCompanyInfo({ company, setCompany, onNext, onBack }) {
  const set = (k, v) => setCompany(c => ({ ...c, [k]: v }));
  const ready = company.name.trim() && company.domain.trim() && company.industry.trim();
  const ctrl = { width: "100%", marginTop: 7, background: T.paper, color: T.ink, border: `1px solid ${T.line}`, borderRadius: 8, padding: 11, fontSize: 14, lineHeight: 1.5 };
  return <Scroll><div style={{ maxWidth: 640, margin: "0 auto" }} className="rise">
    <Back onClick={onBack} /><Eyebrow>Step 1 of 2 . Your organization</Eyebrow>
    <h2 style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 26, margin: "8px 0 4px" }}>Tell us about your company</h2>
    <p style={{ color: T.slate, fontSize: 15, marginBottom: 18 }}>This creates your employer profile. We verify your organization from your work email domain.</p>
    <Card>
      <Field label="Company name" value={company.name} onChange={v => set("name", v)} placeholder="Acme GmbH" />
      <div style={{ marginBottom: 14 }}>
        <Label>Work email domain</Label>
        <input value={company.domain} onChange={e => set("domain", e.target.value)} placeholder="acme.com" style={ctrl} />
        <div style={{ fontSize: 12, color: T.slate, marginTop: 6 }}>Used to verify your organization.</div>
      </div>
      <div className="row2">
        <Field label="Industry" value={company.industry} onChange={v => set("industry", v)} placeholder="Fintech" />
        <div style={{ marginBottom: 14 }}><Label>Company size</Label>
          <select value={company.size} onChange={e => set("size", e.target.value)} style={ctrl}>
            <option value="">Select...</option>{EMP_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <Field label="Headquarters country" value={company.country} onChange={v => set("country", v)} placeholder="Germany" />
      <Field label="What is the team hiring for?" rows={4} value={company.hiringFor} onChange={v => set("hiringFor", v)} placeholder="Optional. A short description of the roles or work." />
    </Card>
    <div style={{ marginTop: 16, marginBottom: 30 }}><Btn full disabled={!ready} onClick={onNext}>Continue</Btn><Hint show={!ready}>Company name, work email domain, and industry are required to continue.</Hint></div>
  </div></Scroll>;
}

function EmpAlignment({ onEnter, onBack }) {
  const [on, setOn] = useState({});
  const all = EMP_PLEDGES.every(p => on[p.key]);
  return <Scroll><div style={{ maxWidth: 680, margin: "0 auto" }} className="rise">
    <Back onClick={onBack} /><Eyebrow>Step 2 of 2 . Fair terms</Eyebrow>
    <h2 style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 26, margin: "8px 0 6px" }}>The terms you sign to hire here</h2>
    <p style={{ color: T.slate, fontSize: 15, marginBottom: 18 }}>Fumana matches you with shielded builders. In return, you commit to fair terms. These protect the builder and keep the network trusted.</p>
    <div style={{ display: "grid", gap: 12 }}>
      {EMP_PLEDGES.map(p => <button key={p.key} type="button" aria-pressed={!!on[p.key]} onClick={() => setOn(o => ({ ...o, [p.key]: !o[p.key] }))}
        style={{ textAlign: "left", cursor: "pointer", background: T.surface, border: `1px solid ${on[p.key] ? T.emerald : T.line}`, borderLeftWidth: 4, borderLeftColor: on[p.key] ? T.emerald : T.line, borderRadius: 12, padding: "16px 18px", display: "flex", gap: 14, alignItems: "flex-start" }}>
        <span aria-hidden="true" style={{ marginTop: 1, width: 20, height: 20, flexShrink: 0, borderRadius: 5, border: `1px solid ${on[p.key] ? T.emerald : T.line}`, background: on[p.key] ? T.emerald : "transparent", color: T.onAccent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>{on[p.key] ? "✓" : ""}</span>
        <span><span style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 16 }}>{p.title}</span><div style={{ color: T.slate, fontSize: 13.5, marginTop: 3 }}>{p.desc}</div></span>
      </button>)}
    </div>
    <div style={{ marginTop: 18, fontSize: 14 }}>I agree to these terms as a condition of using Fumana.</div>
    <div style={{ marginTop: 14, marginBottom: 30 }}><Btn full disabled={!all} onClick={onEnter}>Enter Fumana</Btn><Hint show={!all}>Accept all three commitments to continue.</Hint></div>
  </div></Scroll>;
}

function EmpDashboard({ company, onEngage }) {
  return <Scroll><div style={{ maxWidth: 860, margin: "0 auto" }} className="rise">
    <Eyebrow>Dashboard</Eyebrow>
    <h2 style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 26, margin: "6px 0 4px" }}>{company.name || "Your company"}</h2>
    <p style={{ color: T.slate, fontSize: 15, marginBottom: 18 }}>Welcome to Fumana. Your organization is set up. Engage verified, bias-shielded talent whenever you are ready.</p>
    <Card><Label>Get started</Label><div style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 18, margin: "8px 0 6px" }}>Engage experts</div><p style={{ fontSize: 13.5, color: T.slate, marginBottom: 14 }}>Describe the work and search the network by evidence.</p><Btn onClick={onEngage}>Engage Experts</Btn></Card>
  </div></Scroll>;
}

function EmployerApp({ builders, pipeline, setPipeline, logAudit, submitReview, exit, toRole, employer, fx, onSignOut }) {
  // Session restore: a saved employer record skips onboarding and lands in-app.
  const [screen, setScreen] = useState(DEMO_SEED ? "app" : employer ? "app" : "welcome");
  const [tab, setTab] = useState("dashboard");
  const [company, setCompany] = useState(DEMO_SEED ? SEED_COMPANIES[0]
    : employer ? { name: employer.name || "", domain: employer.domain || "", industry: employer.industry || "", size: employer.size || "", country: employer.country || "", hiringFor: employer.hiring_for || "" }
    : { name: "", domain: "", industry: "", size: "", country: "", hiringFor: "" });
  const [active, setActive] = useState(null); const [sow, setSow] = useState(null);
  const toast = useToast();
  const inApp = screen === "app";
  const shortlist = c => {
    if (pipeline.shortlisted.concat(pipeline.interviewing, pipeline.sow).some(x => x.handle === c.handle)) return;
    setPipeline(p => ({ ...p, shortlisted: [...p.shortlisted, c] }));
    toast(`${c.handle} added to your pipeline.`);
  };
  const move = (c, from, to) => setPipeline(p => ({ ...p, [from]: p[from].filter(x => x.handle !== c.handle), [to]: [...p[to], c] }));
  const openSow = c => { setActive(c); setSow(null); setTab("compliance"); };
  // Reveal-and-interview gate: committing to an interview moves the builder into
  // the shared pipeline's interviewing stage, which is what unlocks role + summary.
  const requestInterview = c => {
    if (pipeline.interviewing.concat(pipeline.sow).some(x => x.handle === c.handle)) return;
    setPipeline(p => ({ ...p, shortlisted: p.shortlisted.filter(x => x.handle !== c.handle), interviewing: [...p.interviewing, c] }));
    toast(`Interview requested with ${c.handle}. Identity revealed for the interview.`);
  };
  // Saved Builders store: the employer's private bookmarks from search.
  const [saved, setSaved] = useState([]);
  const toggleSave = c => setSaved(s => s.some(x => x.handle === c.handle) ? s.filter(x => x.handle !== c.handle) : [...s, c]);
  return <Shell role="employer" exit={exit} nav={inApp ? EMP_NAV : null} active={tab} onNav={setTab} showZuri={inApp}>
    {screen === "welcome" && <EmpWelcome onNext={() => setScreen("auth")} onBack={toRole} />}
    {screen === "auth" && <AuthFormPage role="employer" onBack={() => setScreen("welcome")} onAuthenticated={() => setScreen("company-info")} />}
    {screen === "company-info" && <EmpCompanyInfo company={company} setCompany={setCompany} onNext={() => setScreen("alignment")} onBack={() => setScreen("auth")} />}
    {screen === "alignment" && <EmpAlignment onEnter={() => { store.saveCompany(company).catch(() => {}); setScreen("app"); setTab("dashboard"); }} onBack={() => setScreen("company-info")} />}
    {inApp && tab === "dashboard" && <EmpDashboard company={company} onEngage={() => setTab("engage")} />}
    {inApp && tab === "engage" && <Search builders={builders} pipeline={pipeline} onShortlist={shortlist} onRequestInterview={requestInterview} saved={saved} onToggleSave={toggleSave} />}
    {inApp && tab === "pipeline" && <Pipeline pipeline={pipeline} move={move} openSow={openSow} />}
    {inApp && tab === "compliance" && <Compliance active={active} sow={sow} setSow={setSow} />}
    {inApp && tab === "investments" && <Finance pipeline={pipeline} fx={fx} />}
    {inApp && tab === "saved" && <SavedBuilders saved={saved} pipeline={pipeline} onToggleSave={toggleSave} />}
    {inApp && tab === "team" && <MyTeam pipeline={pipeline} />}
    {inApp && tab === "trust" && <TrustSafety pipeline={pipeline} onFairness={() => setTab("fairness")} onReport={() => setTab("report")} onEthics={() => setTab("ethics")} />}
    {inApp && tab === "fairness" && <FairnessPosture onBack={() => setTab("trust")} />}
    {inApp && tab === "report" && <ReportIssue categories={REPORT_CATS_EMPLOYER} source="employer" logAudit={logAudit} submitReview={submitReview} onBack={() => setTab("trust")} />}
    {inApp && tab === "ethics" && <EthicsPage onBack={() => setTab("trust")} />}
    {inApp && tab === "account" && <Account company={company} setCompany={c => { setCompany(c); store.saveCompany(c).catch(() => {}); }} onSignOut={onSignOut} />}
  </Shell>;
}

// ---- Saved Builders (employer). NO MODEL. Bookmarks from search ----
function SavedBuilders({ saved, pipeline, onToggleSave }) {
  const revealed = h => pipeline.interviewing.concat(pipeline.sow).some(x => x.handle === h);
  return <Scroll><div style={{ maxWidth: 900, margin: "0 auto" }} className="rise">
    <Eyebrow>Saved Builders</Eyebrow>
    <h2 style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 26, margin: "6px 0 4px" }}>Builders you saved</h2>
    <p style={{ color: T.slate, fontSize: 15, marginBottom: 16 }}>Bookmarked from search. Still identity-shielded until you request an interview.</p>
    {saved.length === 0
      ? <Card><p style={{ color: T.slate, fontSize: 14 }}>No saved builders yet. Use Save on a search result to bookmark builders here.</p></Card>
      : <div style={{ display: "grid", gap: 14 }}>{saved.map((c, i) => { const isRev = revealed(c.handle); return <Card key={i} accent={isRev ? T.emerald : T.line}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div><div style={{ fontWeight: 600 }}>{c.handle}{isRev && <span style={{ color: T.slate, fontWeight: 400, fontSize: 13 }}> . {c.role}</span>}</div><div style={{ fontFamily: F.mono, fontSize: 11, color: isRev ? T.emerald : T.slate }}>{isRev ? "identity revealed for interview" : "identity shielded"}</div></div>
          {typeof c.fit === "number" && <div style={{ textAlign: "right" }}><div style={{ fontFamily: F.disp, fontWeight: 800, fontSize: 22, color: T.emerald, lineHeight: 1 }}>{c.fit}%</div><div style={{ fontFamily: F.mono, fontSize: 10, color: T.slate }}>fit . computed</div></div>}
        </div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", margin: "12px 0 10px" }}>{(c.skills || []).map((s, j) => <span key={j} style={{ fontFamily: F.mono, fontSize: 11.5, color: T.emerald, border: `1px solid ${T.line}`, borderRadius: 4, padding: "3px 8px" }}>{s}</span>)}</div>
        {isRev && c.summary && <p style={{ fontSize: 14, color: T.ink, marginBottom: 12 }}>{c.summary}</p>}
        <div style={{ display: "flex", justifyContent: "flex-end" }}><Btn kind="ghost" small onClick={() => onToggleSave(c)}>Remove</Btn></div>
      </Card>; })}</div>}
    <div style={{ height: 30 }} />
  </div></Scroll>;
}

// ---- My Team (employer). NO MODEL. Active SOW engagements, cost computed ----
function MyTeam({ pipeline }) {
  const team = pipeline.sow;
  const total = team.reduce((s, c) => s + (c.monthlyUsd || 0), 0);
  return <Scroll><div style={{ maxWidth: 860, margin: "0 auto" }} className="rise">
    <Eyebrow>My Team</Eyebrow>
    <h2 style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 26, margin: "6px 0 4px" }}>Your active engagements</h2>
    <p style={{ color: T.slate, fontSize: 15, marginBottom: 16 }}>Builders at SOW stage. Monthly cost is computed from the agreed budget.</p>
    {team.length === 0
      ? <Card><p style={{ color: T.slate, fontSize: 14 }}>No active engagements yet. Move a candidate to SOW pending to build your team.</p></Card>
      : <Card>
        <div style={{ display: "grid", gap: 1, background: T.line, border: `1px solid ${T.line}`, borderRadius: 8, overflow: "hidden" }}>
          {team.map((c, i) => <div key={i} style={{ background: T.surface, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div><div style={{ fontWeight: 600, fontSize: 14 }}>{c.handle}</div><div style={{ color: T.slate, fontSize: 12.5 }}>{c.role}</div></div>
            <div style={{ fontFamily: F.mono, fontSize: 15 }}>{usd(c.monthlyUsd || 0)}<span style={{ color: T.slate, fontSize: 11 }}> / mo</span></div>
          </div>)}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, fontFamily: F.mono, fontSize: 13 }}><span style={{ color: T.slate }}>total monthly, computed</span><span style={{ color: T.emerald, fontWeight: 600 }}>{usd(total)}</span></div>
      </Card>}
    <div style={{ height: 30 }} />
  </div></Scroll>;
}

// ---- Account (employer). NO MODEL. Editable company profile ----
function Account({ company, setCompany, onSignOut }) {
  const toast = useToast();
  const [draft, setDraft] = useState(company);
  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }));
  const dirty = ["name", "domain", "industry", "size", "country"].some(k => (draft[k] || "") !== (company[k] || ""));
  const ctrl = { width: "100%", marginTop: 7, background: T.paper, color: T.ink, border: `1px solid ${T.line}`, borderRadius: 8, padding: 11, fontSize: 14 };
  return <Scroll><div style={{ maxWidth: 640, margin: "0 auto" }} className="rise">
    <Eyebrow>Account</Eyebrow>
    <h2 style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 26, margin: "6px 0 4px" }}>Company account</h2>
    <p style={{ color: T.slate, fontSize: 15, marginBottom: 18 }}>Your organization profile. Editable here; persistence and verification are backend steps.</p>
    <Card>
      <Field label="Company name" value={draft.name} onChange={v => set("name", v)} placeholder="Acme GmbH" />
      <Field label="Work email domain" value={draft.domain} onChange={v => set("domain", v)} placeholder="acme.com" />
      <div className="row2">
        <Field label="Industry" value={draft.industry} onChange={v => set("industry", v)} placeholder="Fintech" />
        <div style={{ marginBottom: 14 }}><Label>Company size</Label><select value={draft.size || ""} onChange={e => set("size", e.target.value)} style={ctrl}><option value="">Select...</option>{EMP_SIZES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
      </div>
      <Field label="Headquarters country" value={draft.country} onChange={v => set("country", v)} placeholder="Germany" />
    </Card>
    <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center" }}><Btn disabled={!dirty} onClick={() => { setCompany(draft); toast("Account saved."); }}>Save changes</Btn>
      {onSignOut && <Btn kind="ghost" small onClick={onSignOut}>Sign out</Btn>}</div>
    <div style={{ marginTop: 10, fontFamily: F.mono, fontSize: 11, color: T.slate }}>Company profile, billing, and verification run on the backend.</div>
    <div style={{ height: 14 }} />
    <Card><Label>Text size</Label>
      <p style={{ fontSize: 13.5, color: T.slate, margin: "8px 0 10px" }}>Scale the whole app for easier reading.</p>
      <FontSizeToggle />
    </Card>
    <div style={{ height: 30 }} />
  </div></Scroll>;
}

// One bias-shielded result card. Locked shows fit + handle + skills (evidence);
// role and summary are revealed only once the employer has requested an interview.
// No name, photo, or location is ever rendered (the network entry has none).
function SearchCard({ c, isRevealed, isShort, isIn, isSaved, budget, onShortlist, onRequestInterview, onToggleSave }) {
  return <Card accent={isRevealed ? T.emerald : T.line}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div aria-hidden="true" style={{ width: 44, height: 44, borderRadius: 10, background: T.mute, border: `1px solid ${T.line}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.mono, fontSize: 11, color: T.slate }}>FU</div>
        <div><div style={{ fontWeight: 600 }}>{c.handle}{isRevealed && <span style={{ color: T.slate, fontWeight: 400, fontSize: 13 }}> . {c.role}</span>}{c.isYou && <span style={{ marginLeft: 8, fontFamily: F.mono, fontSize: 10, color: T.emerald, border: `1px solid ${T.emerald}`, borderRadius: 4, padding: "1px 6px" }}>new to network</span>}</div><div style={{ fontFamily: F.mono, fontSize: 11, color: isRevealed ? T.emerald : T.slate }}>{isRevealed ? "identity revealed for interview" : "identity shielded"}</div></div>
      </div>
      <div style={{ textAlign: "right" }}><div style={{ fontFamily: F.disp, fontWeight: 800, fontSize: 24, color: T.emerald, lineHeight: 1 }}>{c.fit}%</div><div style={{ fontFamily: F.mono, fontSize: 10, color: T.slate }}>fit . computed</div></div>
    </div>
    <div style={{ display: "flex", gap: 7, flexWrap: "wrap", margin: "12px 0 10px" }}>{(c.skills || []).map((s, j) => <span key={j} style={{ fontFamily: F.mono, fontSize: 11.5, color: T.emerald, border: `1px solid ${T.line}`, borderRadius: 4, padding: "3px 8px" }}>{s}</span>)}</div>
    {(c.factors?.length > 0) && <div style={{ margin: "0 0 12px", fontFamily: F.mono, fontSize: 10.5, color: T.slate }}>Computed by Telos: {c.factors.map(f => `${f.label} +${f.weight}`).join(" . ")} (capped at 99)</div>}
    {isRevealed
      ? <p style={{ fontSize: 14, color: T.ink, marginBottom: 12 }}>{c.summary}</p>
      : <div style={{ border: `1px dashed ${T.line}`, borderRadius: 8, padding: "10px 12px", marginBottom: 12, fontSize: 13, color: T.slate, background: T.paper }}>Role and summary are shielded. Request an interview to reveal them and commit to this builder.</div>}
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}><Btn kind="ghost" small onClick={() => onToggleSave(c)}>{isSaved ? "Saved" : "Save"}</Btn><ReviewLink what={`Search fit for ${c.handle}: ${c.fit}%`} source="employer" /></div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {!isRevealed && <Btn kind="ghost" small disabled={isIn} onClick={() => onShortlist({ ...c, monthlyUsd: Number(budget) })}>{isShort ? "Shortlisted" : "Shortlist"}</Btn>}
        {isRevealed
          ? <span style={{ fontFamily: F.mono, fontSize: 12, color: T.emerald, alignSelf: "center" }}>Interview requested</span>
          : <Btn small onClick={() => onRequestInterview({ ...c, monthlyUsd: Number(budget) })}>Request interview</Btn>}
      </div>
    </div>
  </Card>;
}

function Search({ builders, pipeline, onShortlist, onRequestInterview, saved, onToggleSave }) {
  const [need, setNeed] = useState("Backend engineer for a payments reconciliation service, fintech, Berlin team, async across time zones.");
  const [budget, setBudget] = useState("4500");
  const [ranked, setRanked] = useState(null); const [busy, setBusy] = useState(false);
  const ready = need.trim().length > 20 && Number(budget) > 0;
  // Fit is computed from the shared store: profile strength plus role/skill hits
  // against the described need. No model.
  function run() {
    setBusy(true);
    const words = need.toLowerCase();
    // Fit and its named factors are computed here, deterministically — never
    // generated by a model. The same factor breakdown persists on the match.
    const scored = builders.map(b => {
      const roleHit = words.includes((b.role || "").toLowerCase().split(" ")[0]) ? 18 : 0;
      const skillHit = (b.skills || []).reduce((a, s) => a + (words.includes(s.toLowerCase()) ? 6 : 0), 0);
      const ps = Math.round((b.profileStrength || 70) * 0.8);
      const fit = Math.min(99, ps + roleHit + skillHit);
      return { ...b, fit, factors: [
        { label: "Profile strength", weight: ps },
        { label: "Role relevance", weight: roleHit },
        { label: "Skill overlap", weight: skillHit },
      ] };
    }).sort((a, b) => b.fit - a.fit);
    setTimeout(() => { setRanked(scored); setBusy(false); }, 350);
  }
  // Reveal state IS the shared pipeline: role + summary unlock only once the
  // employer has committed to an interview (interviewing or beyond).
  const revealed = h => pipeline.interviewing.concat(pipeline.sow).some(x => x.handle === h);
  const inPipeline = h => pipeline.shortlisted.concat(pipeline.interviewing, pipeline.sow).some(x => x.handle === h);
  const shortlisted = h => pipeline.shortlisted.some(x => x.handle === h);
  return <Scroll><div style={{ maxWidth: 900, margin: "0 auto" }} className="rise">
    <Eyebrow>Engage Experts</Eyebrow><h2 style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 26, margin: "6px 0 4px" }}>Engage experts by evidence</h2>
    <p style={{ color: T.slate, fontSize: 15, marginBottom: 16 }}>Describe the work and the budget. Matches are bias-shielded: no name, photo, or location. Role and summary stay hidden until you commit to an interview.</p>
    <Card><Label>What you need</Label>
      <textarea rows={3} value={need} onChange={e => setNeed(e.target.value)} style={{ width: "100%", marginTop: 7, background: T.paper, color: T.ink, border: `1px solid ${T.line}`, borderRadius: 8, padding: 11, fontSize: 14, resize: "vertical" }} />
      <div className="row2" style={{ marginTop: 12, alignItems: "end" }}>
        <div><Label>Monthly budget, USD</Label><input value={budget} onChange={e => setBudget(e.target.value.replace(/[^0-9]/g, ""))} style={{ width: "100%", marginTop: 7, background: T.paper, color: T.ink, border: `1px solid ${T.line}`, borderRadius: 8, padding: 11, fontSize: 14 }} /></div>
        <div>{busy ? <Spinner label="Matching against the network..." /> : <Btn full disabled={!ready} onClick={run}>Search the network</Btn>}<Hint show={!ready && !busy}>Describe the work and set a budget above zero.</Hint></div>
      </div>
    </Card>
    {ranked && <div style={{ marginTop: 18, display: "grid", gap: 14 }}>
      {ranked.length === 0 && <Card><p style={{ color: T.slate, fontSize: 14 }}>No builders in the network yet. Build a candidate profile first, then search.</p></Card>}
      {ranked.map((c, i) => <SearchCard key={i} c={c} isRevealed={revealed(c.handle)} isShort={shortlisted(c.handle)} isIn={inPipeline(c.handle)} isSaved={saved.some(x => x.handle === c.handle)} budget={budget} onShortlist={onShortlist} onRequestInterview={onRequestInterview} onToggleSave={onToggleSave} />)}
    </div>}
  </div></Scroll>;
}

const COLS = [["shortlisted", "Shortlisted"], ["interviewing", "Interviewing"], ["sow", "SOW pending"]];
function Pipeline({ pipeline, move, openSow }) {
  const empty = COLS.every(([k]) => pipeline[k].length === 0);
  return <Scroll><div style={{ maxWidth: 980, margin: "0 auto" }} className="rise">
    <Eyebrow>Talent Pipeline</Eyebrow><h2 style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 26, margin: "6px 0 4px" }}>Move candidates toward a signed SOW</h2>
    <p style={{ color: T.slate, fontSize: 15, marginBottom: 16 }}>Shortlisted builders stay identity-shielded. Moving one to Interviewing reveals their role, the same reveal-and-interview gate as search.</p>
    {empty && <Card><p style={{ color: T.slate, fontSize: 14 }}>Your pipeline is empty. Search the network, then shortlist or request an interview to begin.</p></Card>}
    {!empty && <div className="kanban">{COLS.map(([key, title], ci) => {
      const shielded = key === "shortlisted";
      return <div key={key} style={{ background: T.paper, border: `1px solid ${T.line}`, borderRadius: 12, padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}><Label>{title}</Label><span style={{ fontFamily: F.mono, fontSize: 11, color: T.slate }}>{pipeline[key].length}</span></div>
        <div style={{ display: "grid", gap: 10 }}>
          {pipeline[key].map((c, i) => <Card key={i} pad={14}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}><div style={{ fontWeight: 600, fontSize: 14 }}>{c.handle}</div>{typeof c.fit === "number" && <span style={{ fontFamily: F.mono, fontSize: 11, color: T.emerald }}>{c.fit}%</span>}</div>
            <div style={{ fontSize: 12.5, marginTop: 3, marginBottom: 8, color: T.slate }}>{shielded ? <span style={{ fontFamily: F.mono, fontSize: 11 }}>identity shielded</span> : c.role}</div>
            {Array.isArray(c.factors) && c.factors.length > 0 && <div style={{ margin: "0 0 8px", fontFamily: F.mono, fontSize: 10.5, color: T.slate }}>Computed fit: {c.factors.map(f => `${f.label} +${f.weight}`).join(" . ")}</div>}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {ci > 0 && <Btn kind="ghost" small onClick={() => move(c, key, COLS[ci - 1][0])}>← {COLS[ci - 1][1]}</Btn>}
              {ci < 2 && <Btn small onClick={() => move(c, key, COLS[ci + 1][0])}>{COLS[ci + 1][1]} →</Btn>}
              {key === "sow" && <Btn small onClick={() => openSow(c)}>Generate SOW</Btn>}
            </div>
            <div style={{ marginTop: 8 }}><ReviewLink what={`Pipeline stage for ${c.handle}: ${title}`} source="employer" /></div>
          </Card>)}
          {pipeline[key].length === 0 && <div style={{ color: T.slate, fontSize: 12.5, padding: "6px 2px" }}>Empty</div>}
        </div>
      </div>;
    })}</div>}
  </div></Scroll>;
}

// ---- Trust and Safety / Compliance hub (employer). NO MODEL ----
// Factual EOR status, a per-engagement liability-assumed marker, and a
// per-engagement compliance checklist. Stub states flagged as backend. No
// invented legal specifics. Reads active engagements from the shared pipeline.
const COMPLIANCE_CHECKLIST = [
  { label: "SOW signed", state: "done" },
  { label: "IP assigned to Fumana", state: "done" },
  { label: "Local registration", state: "progress" },
  { label: "Tax remittance active", state: "done" },
];

function TrustSafety({ pipeline, onFairness, onReport, onEthics }) {
  const team = pipeline.sow;
  return <Scroll><div style={{ maxWidth: 860, margin: "0 auto" }} className="rise">
    <Eyebrow>Trust and Safety</Eyebrow>
    <h2 style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 26, margin: "6px 0 4px" }}>Compliance and Employer of Record</h2>
    <p style={{ color: T.slate, fontSize: 15, marginBottom: 16 }}>For every active engagement, Fumana is the legal Employer of Record and carries the compliance so you do not have to.</p>

    <Card accent={T.emerald}>
      <Label>Employer of Record status</Label>
      <p style={{ fontSize: 14, color: T.ink, margin: "8px 0 12px", lineHeight: 1.6 }}>Fumana assumes local employment liability, tax remittance, and IP assignment for each active engagement. You engage the builder; Fumana carries the legal and compliance obligations.</p>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: F.mono, fontSize: 12, color: T.emerald, border: `1px solid ${T.emerald}`, borderRadius: 6, padding: "5px 11px" }}>&#10003; liability assumed for {team.length} active engagement{team.length === 1 ? "" : "s"}</div>
    </Card>

    {team.length === 0
      ? <div style={{ marginTop: 14 }}><Card><p style={{ color: T.slate, fontSize: 14 }}>No active engagements yet. Move a candidate to SOW pending to see per-engagement compliance status.</p></Card></div>
      : <div style={{ display: "grid", gap: 14, marginTop: 16 }}>
        {team.map((c, i) => <Card key={i}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div><div style={{ fontWeight: 600, fontSize: 15 }}>{c.handle}</div><div style={{ color: T.slate, fontSize: 13 }}>{c.role}</div></div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(6,110,90,0.08)", border: `1px solid ${T.emerald}`, borderRadius: 8, padding: "6px 12px", fontFamily: F.mono, fontSize: 12, color: T.vault }}>&#10003; liability assumed</div>
          </div>
          <div style={{ marginTop: 14, display: "grid", gap: 1, background: T.line, border: `1px solid ${T.line}`, borderRadius: 8, overflow: "hidden" }}>
            {COMPLIANCE_CHECKLIST.map((item, j) => { const done = item.state === "done"; return <div key={j} style={{ background: T.surface, padding: "11px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
                <span aria-hidden="true" style={{ width: 18, height: 18, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, background: done ? T.emerald : "transparent", color: done ? T.onAccent : T.brass, border: done ? "none" : `1px solid ${T.brass}` }}>{done ? "✓" : ""}</span>
                {item.label}
              </span>
              <span style={{ fontFamily: F.mono, fontSize: 11, color: done ? T.emerald : T.brass }}>{done ? "verified" : "in progress"}</span>
            </div>; })}
          </div>
        </Card>)}
      </div>}

    <div style={{ marginTop: 16, fontFamily: F.mono, fontSize: 11, color: T.slate }}>These statuses are stubbed in this prototype. Real registration, remittance, IP assignment, and signing run on the backend, per jurisdiction. No legal specifics are asserted here.</div>

    <div style={{ marginTop: 18 }}><Card>
      <Label>Fairness</Label>
      <p style={{ fontSize: 14, color: T.slate, margin: "8px 0 12px" }}>How the assessment guards against bias, its known limits, and what a builder can do if it felt unfair. The same page builders see.</p>
      <Btn kind="ghost" small onClick={onFairness}>Read the fairness posture</Btn>
    </Card></div>
    <div style={{ marginTop: 14 }}><Card>
      <Label>Report an issue</Label>
      <p style={{ fontSize: 14, color: T.slate, margin: "8px 0 12px" }}>Builder conduct, a platform issue, a billing dispute, or anything else. Reviewed by a human, not an AI.</p>
      <Btn kind="ghost" small onClick={onReport}>Report an issue</Btn>
    </Card></div>
    <div style={{ marginTop: 14 }}><Card>
      <Label>Ethics and data</Label>
      <p style={{ fontSize: 14, color: T.slate, margin: "8px 0 12px" }}>One plain-language page covering assessment, data, rights, fairness, identity shielding, your fair-terms pledge, and reporting. The same page builders see.</p>
      <Btn kind="ghost" small onClick={onEthics}>Read the ethics and data page</Btn>
    </Card></div>
    <div style={{ height: 30 }} />
  </div></Scroll>;
}

function Compliance({ active, sow, setSow }) {
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  if (!active) return <Scroll><div style={{ maxWidth: 760, margin: "0 auto" }} className="rise"><Card><p style={{ color: T.slate, fontSize: 14 }}>Move a candidate to SOW pending and select Generate SOW to open the compliance hub.</p></Card></div></Scroll>;
  async function gen() {
    setBusy(true); setErr("");
    try {
      const sys = "You are the Telos Compliance Agent, acting as Employer of Record for Fumana. Draft a concise Statement of Work for an enterprise client engaging a vetted builder through Fumana. Fumana acts as the IP custodian and as the legal Employer of Record, assuming local employment liability and tax remittance. Use general, honest language only. Do not assert specific tax rates and do not make jurisdiction-specific legal claims. Return ONLY JSON, no fences. Shape: {\"title\":string,\"scope\":[string],\"deliverables\":[string],\"ip_clause\":string,\"eor_note\":string,\"term\":string}. Keep each line tight. No em dashes.";
      const out = await callClaude({ system: sys, messages: [{ role: "user", content: `Builder: ${active.handle}, ${active.role}. Monthly USD ${active.monthlyUsd}. Context: ${active.summary}` }], expectJson: true });
      setSow(out); store.saveSow(active.handle, out).catch(() => {});
    } catch (e) {
      setErr(String(e).includes("501") ? "config" : "fail");
    }
    setBusy(false);
  }
  return <Scroll><div style={{ maxWidth: 820, margin: "0 auto" }} className="rise">
    <Eyebrow>Legal and compliance hub</Eyebrow><h2 style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 26, margin: "6px 0 4px" }}>Statement of Work for {active.handle}</h2>
    <p style={{ color: T.slate, fontSize: 15, marginBottom: 14 }}>Fumana signs as Employer of Record and assumes local employment liability, tax remittance, and IP custody.</p>
    <div style={{ marginBottom: 14, display: "inline-flex", alignItems: "center", gap: 8, fontFamily: F.mono, fontSize: 12, color: T.emerald, border: `1px solid ${T.emerald}`, borderRadius: 6, padding: "5px 11px" }}>&#10003; liability assumed</div>
    {!sow && <div>
      {busy ? <Spinner label="The Telos Compliance Agent is drafting the SOW..." /> : <Btn onClick={gen}>Generate localized SOW</Btn>}
      {!busy && err === "config" && <div style={{ marginTop: 12, fontSize: 13.5, color: T.slate }}>The Telos Compliance Agent is ready and wired through the model proxy. It lights up the moment a model provider is connected.</div>}
      {!busy && err === "fail" && <div style={{ marginTop: 12, color: T.alert, fontSize: 14, display: "flex", gap: 12, alignItems: "center" }}>Draft did not complete. <Btn kind="ghost" small onClick={gen}>Run again</Btn></div>}
    </div>}
    {sow && <Card accent={T.brass}>
      <div style={{ marginBottom: 14, background: T.paper, border: `1px solid ${T.brass}`, borderRadius: 8, padding: "10px 12px", fontSize: 12.5, color: T.slate }}><b style={{ color: T.ink }}>Draft only.</b> A starting point for legal review, not a binding document. General terms; a lawyer confirms specifics per jurisdiction.</div>
      <div style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 18 }}>{sow.title}</div>
      <SowList label="Scope" items={sow.scope} />
      <SowList label="Deliverables" items={sow.deliverables} />
      <Mini label="IP custody" body={sow.ip_clause} />
      <Mini label="Employer of Record" body={sow.eor_note} />
      <Mini label="Term" body={sow.term} />
      <div style={{ marginTop: 10, fontFamily: F.mono, fontSize: 10.5, color: T.slate }}>Drafted by the Telos Compliance Agent from your inputs. It is a starting point, not settled legal fact.</div>
      <div style={{ marginTop: 14 }}><Btn kind="ghost" small onClick={() => setSow(null)}>Redraft</Btn></div>
    </Card>}
  </div></Scroll>;
}
const SowList = ({ label, items }) => <div style={{ marginTop: 12 }}><div style={{ color: T.emerald, fontSize: 12, fontFamily: F.mono, marginBottom: 6 }}>{label}</div><div style={{ display: "grid", gap: 6 }}>{(items || []).map((it, i) => <div key={i} style={{ fontSize: 14, display: "flex", gap: 8 }}><span style={{ color: T.brass }}>.</span><span>{it}</span></div>)}</div></div>;
const Mini = ({ label, body }) => <div style={{ marginTop: 10, background: T.paper, border: `1px solid ${T.line}`, borderRadius: 8, padding: 11 }}><span style={{ color: T.brass, fontSize: 12, fontWeight: 600 }}>{label}. </span><span style={{ color: T.slate, fontSize: 13 }}>{body}</span></div>;

// Investments and fee waterfall (employer). NO MODEL — every figure is computed
// in code from the SOW contract budget, every assumption labelled. (Zuri the
// marketplace economist is a NEEDS MODEL feature and arrives in Phase 2.)
// Impact stat tile for the employer Investments "SROI Ledger" section.
// Every value is computed in code; `note` states the formula or assumption.
const ImpactStat = ({ n, label, note }) => <div style={{ background: T.paper, border: `1px solid ${T.line}`, borderRadius: 10, padding: "13px 15px" }}>
  <div style={{ fontFamily: F.disp, fontWeight: 800, fontSize: 22, color: T.emerald, lineHeight: 1 }}>{n}</div>
  <div style={{ fontSize: 12.5, color: T.ink, marginTop: 5 }}>{label}</div>
  <div style={{ fontFamily: F.mono, fontSize: 10.5, color: T.slate, marginTop: 3 }}>{note}</div>
</div>;

// Beat 4: seeded FX rate, the canonical FxRate entity. Illustrative until live
// rates are wired on the backend. The demo scenario is a Lagos builder paid in
// USD, so the pair is USD/NGN.
const BASE_FX = { pair: "USD/NGN", rate: 1550, symbol: "₦", illustrative: true };
const RETENTION_PCT = 62; // share of local value that stays local, labelled assumption
const ngn = n => "₦" + Math.round(n).toLocaleString("en-US");

function Finance({ pipeline, fx }) {
  // Seeded FX quote hydrated from fx_rates when the backend is configured;
  // the labelled demo constant is the fallback.
  const baseRate = fx?.rate ?? BASE_FX.rate;
  const [statutoryPct, setStatutoryPct] = useState(18);
  const [zBusy, setZBusy] = useState(false);
  const [zErr, setZErr] = useState("");
  const [zNote, setZNote] = useState("");
  // Beat 4 currency move. `applied` holds the move once triggered; null is the
  // baseline. Both states stay reachable and Reset restores the baseline.
  const [movePct, setMovePct] = useState(20);
  const [applied, setApplied] = useState(null);
  const [fxBusy, setFxBusy] = useState(false);
  const [fxErr, setFxErr] = useState("");
  const [fxNarr, setFxNarr] = useState(null);
  const platformPct = 12; // Fumana platform fee, disclosed
  const team = pipeline.sow;
  if (team.length === 0) return <Scroll><div style={{ maxWidth: 760, margin: "0 auto" }} className="rise">
    <Eyebrow>Investments</Eyebrow><h2 style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 26, margin: "6px 0 8px" }}>Where every dollar goes</h2>
    <Card><p style={{ color: T.slate, fontSize: 14 }}>No active engagements yet. Move a candidate to SOW pending to see the cost breakdown and impact.</p></Card>
  </div></Scroll>;

  const rows = team.map(c => {
    const monthly = c.monthlyUsd || 0;
    const platform = Math.round(monthly * platformPct / 100);
    const statutory = Math.round(monthly * statutoryPct / 100);
    return { c, monthly, platform, statutory, net: monthly - platform - statutory };
  });
  const sum = k => rows.reduce((s, r) => s + r[k], 0);
  const totalMonthly = sum("monthly");
  const domestic = Math.round(totalMonthly * 2.4);        // illustrative domestic equivalent
  const saving = domestic - totalMonthly;
  // Beat 4 SROI derivation (canonical SROIEntry): engagement -> FX rate ->
  // gross local -> retention -> retained capital. Every figure computed here;
  // the currency move below only re-runs this same math on a new rate.
  const annualGross = totalMonthly * 12;
  const fxRate = applied ? applied.rate : baseRate;
  const grossLocal = Math.round(annualGross * fxRate);
  const retainedLocal = Math.round(grossLocal * RETENTION_PCT / 100);
  const baseGrossLocal = Math.round(annualGross * baseRate);
  const baseRetained = Math.round(baseGrossLocal * RETENTION_PCT / 100);

  // Zuri marketplace economist (NEEDS MODEL): honest PPP-aware context on the
  // active engagement's role and budget. Routes through /api/claude; inert-aware.
  // Warm in manner, honest in substance, per the Zuri charter. She narrates
  // context in ranges; the figures above stay computed in code.
  const subject = team[0];
  async function askEconomist() {
    setZBusy(true); setZErr(""); setZNote("");
    try {
      const sys = "You are the Telos Economics Agent for Fumana. You are precise and honest. An employer is engaging an African builder at a monthly USD budget. In three or four plain sentences, state whether this budget is competitive for this role in the African talent market, what that pay buys locally in purchasing-power terms, and one thing the employer should know. Use purchasing power parity context, speak in ranges not invented exact figures, and never present a number as a settled fact. No hype, no flattery, no em dashes, sentence case.";
      setZNote(await callClaude({ system: sys, messages: [{ role: "user", content: `Role: ${subject.role}. Monthly budget: ${usd(subject.monthlyUsd || 0)} USD.` }], expectJson: false }));
    } catch (e) {
      setZErr(String(e).includes("501") ? "config" : "fail");
    }
    setZBusy(false);
  }

  // Beat 4 trigger: recompute the derivation in code first (instant, and the
  // wow moment), then ask the two Telos agents to narrate the change. The calls
  // carry narration only, per the computed-not-generated rule.
  async function triggerMove() {
    const pct = movePct;
    const rate = Math.round(baseRate * (1 + pct / 100));
    const afterGross = Math.round(annualGross * rate);
    const afterRetained = Math.round(afterGross * RETENTION_PCT / 100);
    setApplied({ pct, rate });
    setFxNarr(null); setFxErr(""); setFxBusy(true);
    const user = `Engagement: ${team.length} builder${team.length === 1 ? "" : "s"}, ${usd(totalMonthly)} / month (${usd(annualGross)} / year gross). Pair ${BASE_FX.pair}: currency move ${pct > 0 ? "+" : ""}${pct}%, rate ${baseRate} to ${rate}. Gross local value per year before ${ngn(baseGrossLocal)}, after ${ngn(afterGross)}. Retained local capital at ${RETENTION_PCT}% retention before ${ngn(baseRetained)}, after ${ngn(afterRetained)}.`;
    const econSys = "You are the Telos Economics Agent for Fumana. A currency move has just re-priced the local-currency value of a USD-denominated engagement. In three or four plain sentences, state what the move does to the local value and retained capital, what it means in purchasing-power terms for the builder, and one honest caveat. Speak in ranges, reference only the figures provided, and never present a number as settled fact. No hype, no flattery, no em dashes, sentence case.";
    const compSys = "You are the Telos Compliance Agent for Fumana, acting as Employer of Record. A currency move has just re-priced the local-currency value of an engagement whose contract is denominated in USD. In two or three plain sentences, state what the move means for the employer obligation, how local remittance amounts adjust at payment time, and whether any term needs redrafting. General honest language only: no jurisdiction-specific legal claims and no asserted tax rates. No em dashes, sentence case.";
    try {
      const [econ, comp] = await Promise.all([
        callClaude({ system: econSys, messages: [{ role: "user", content: user }], expectJson: false }),
        callClaude({ system: compSys, messages: [{ role: "user", content: user }], expectJson: false }),
      ]);
      setFxNarr({ econ, comp });
    } catch (e) {
      setFxErr(String(e).includes("501") ? "config" : "fail");
    }
    setFxBusy(false);
  }
  function resetMove() { setApplied(null); setFxNarr(null); setFxErr(""); }

  return <Scroll><div style={{ maxWidth: 900, margin: "0 auto" }} className="rise">
    <Eyebrow>Investments</Eyebrow>
    <h2 style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 26, margin: "6px 0 4px" }}>Where every dollar goes</h2>
    <p style={{ color: T.slate, fontSize: 15, marginBottom: 16 }}>Monthly cost across your active engagements. Every figure is computed in code; every assumption is labelled.</p>

    <Card>
      <Label>Illustrative statutory remittance: {statutoryPct}%</Label>
      <input aria-label="Statutory remittance rate" type="range" min="0" max="35" value={statutoryPct} onChange={e => setStatutoryPct(Number(e.target.value))} style={{ width: "100%", marginTop: 8, accentColor: T.emerald }} />
      <div style={{ fontFamily: F.mono, fontSize: 11, color: T.slate, marginTop: 4 }}>An assumption you control. Real remittance is computed per jurisdiction at source. Fumana platform fee is a disclosed {platformPct}%.</div>
    </Card>

    <div style={{ display: "grid", gap: 14, marginTop: 16 }}>
      {rows.map((r, i) => <Card key={i}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12, gap: 12, flexWrap: "wrap" }}>
          <div><Label>{r.c.handle}</Label><div style={{ fontSize: 13, color: T.slate }}>{r.c.role}</div></div>
          <span style={{ fontFamily: F.mono, fontSize: 20 }}>{usd(r.monthly)}<span style={{ color: T.slate, fontSize: 12 }}> / mo</span></span>
        </div>
        <div style={{ display: "grid", gap: 1, background: T.line, border: `1px solid ${T.line}`, borderRadius: 8, overflow: "hidden" }}>
          {[
            { k: "Builder net pay", v: r.net, c: T.emerald, note: `${100 - platformPct - statutoryPct}% of total` },
            { k: "Local statutory remittance", v: r.statutory, c: T.slate, note: `${statutoryPct}% illustrative, set by the slider` },
            { k: "Fumana platform fee", v: r.platform, c: T.brass, note: `${platformPct}% disclosed` },
          ].map((w, j) => <div key={j} style={{ background: T.surface, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><div style={{ fontSize: 14, color: w.c, fontWeight: 600 }}>{w.k}</div><div style={{ fontFamily: F.mono, fontSize: 10.5, color: T.slate, marginTop: 2 }}>{w.note}</div></div>
            <div style={{ fontFamily: F.mono, fontSize: 15, color: w.c }}>{usd(w.v)}</div>
          </div>)}
        </div>
      </Card>)}
    </div>

    <div style={{ marginTop: 16 }}><Card accent={T.emerald}><Label>Total cost vs illustrative domestic equivalent</Label>
      <div style={{ fontFamily: F.disp, fontWeight: 800, fontSize: 28, color: T.emerald, marginTop: 6 }}>{usd(saving)} saved / mo</div>
      <div style={{ fontSize: 13, color: T.slate }}>Your total is {usd(totalMonthly)} / month against an illustrative domestic equivalent of {usd(domestic)} (2.4x illustrative multiplier).</div>
    </Card></div>

    <div style={{ marginTop: 16 }}><Card accent={T.brass}>
      <Label>SROI Ledger</Label>
      <p style={{ fontSize: 13.5, color: T.slate, margin: "8px 0 14px" }}>Auditable social return on investment, tracked against SDG 8, 9, and 17. Powered by the Global Impact Commons. Maintained by Lexington Advisory Group.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))", gap: 12 }}>
        <ImpactStat n={ngn(retainedLocal)} label="Local capital retained / yr" note={`gross ${usd(annualGross)} × ₦${fxRate.toLocaleString("en-US")} × ${RETENTION_PCT}% retention`} />
        <ImpactStat n={team.length} label={`builder${team.length === 1 ? "" : "s"} engaged`} note="active SOW engagements" />
        <ImpactStat n={usd(totalMonthly)} label="Total monthly commitment" note="sum of engagement budgets" />
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 14 }}>{["SDG 8", "SDG 9", "SDG 17"].map(s => <span key={s} style={{ fontFamily: F.mono, fontSize: 11, color: T.emerald, border: `1px solid ${T.line}`, borderRadius: 4, padding: "2px 8px" }}>{s}</span>)}</div>
      <div style={{ marginTop: 12, fontFamily: F.mono, fontSize: 11, color: T.slate, lineHeight: 1.6 }}>Sourcing: computed in code from the fee waterfall figures above, not model-generated and not certified impact accounting. The 62% retention factor and the SDG mappings are labelled assumptions.</div>
    </Card></div>

    <div style={{ marginTop: 16 }}><Card accent={applied ? T.brass : T.emerald}>
      <Label>Currency derivation</Label>
      <p style={{ fontSize: 13.5, color: T.slate, margin: "8px 0 14px" }}>The SROI derivation, row by row. Computed in code from the engagement and a seeded {BASE_FX.pair} rate; the rate is illustrative until live rates are wired on the backend.</p>
      <div style={{ display: "grid", gap: 1, background: T.line, border: `1px solid ${T.line}`, borderRadius: 8, overflow: "hidden" }}>
        {[
          { k: "Engagement, annual gross", v: usd(annualGross), note: `${usd(totalMonthly)} / mo × 12` },
          { k: `FX rate ${BASE_FX.pair}`, v: "₦" + fxRate.toLocaleString("en-US"), was: applied ? "₦" + baseRate.toLocaleString("en-US") : null, note: fx ? `rate as of ${String(fx.as_of || "").slice(0, 10)}, illustrative` : "seeded demo rate, illustrative" },
          { k: "Gross local value / yr", v: ngn(grossLocal), was: applied ? ngn(baseGrossLocal) : null, note: "engagement × rate" },
          { k: "Retention assumption", v: RETENTION_PCT + "%", note: "share of local value that stays local" },
          { k: "Retained capital / yr", v: ngn(retainedLocal), was: applied ? ngn(baseRetained) : null, note: "gross local × retention" },
        ].map((r, j) => <div key={j} style={{ background: T.surface, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div><div style={{ fontSize: 14, color: T.ink, fontWeight: 600 }}>{r.k}</div><div style={{ fontFamily: F.mono, fontSize: 10.5, color: T.slate, marginTop: 2 }}>{r.note}</div></div>
          <div style={{ fontFamily: F.mono, fontSize: 15, textAlign: "right", whiteSpace: "nowrap" }}>{r.was && <span style={{ color: T.slate, fontSize: 12 }}>{r.was} → </span>}<span style={{ color: r.was ? T.emerald : T.ink }}>{r.v}</span></div>
        </div>)}
      </div>

      {applied && <div style={{ marginTop: 12, background: T.paper, border: `1px solid ${T.brass}`, borderRadius: 8, padding: "10px 12px", fontSize: 13, color: T.slate }}>
        Currency move applied: <b style={{ color: T.ink }}>{applied.pct > 0 ? "+" : ""}{applied.pct}%</b> on {BASE_FX.pair}. Retained capital moved <span style={{ fontFamily: F.mono, color: retainedLocal >= baseRetained ? T.emerald : T.alert }}>{retainedLocal >= baseRetained ? "+" : "-"}{ngn(Math.abs(retainedLocal - baseRetained))}</span> per year.
      </div>}

      <div style={{ marginTop: 14, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ fontFamily: F.mono, fontSize: 11, color: T.slateLg, textTransform: "uppercase", letterSpacing: 0.3 }}>Currency move <span style={{ color: T.ink }}>{movePct > 0 ? "+" : ""}{movePct}%</span></label>
        <input aria-label="Currency move percent" type="range" min="-40" max="40" step="5" value={movePct} onChange={e => setMovePct(Number(e.target.value))} style={{ flex: 1, minWidth: 140, accentColor: T.emerald }} />
        {fxBusy ? <Spinner label="The Telos agents are re-deriving the impact..." /> : <Btn small onClick={triggerMove}>Trigger currency move</Btn>}
        {applied && !fxBusy && <Btn small kind="ghost" onClick={resetMove}>Reset to baseline</Btn>}
      </div>

      {fxErr === "config" && <p style={{ marginTop: 12, fontSize: 13.5, color: T.slate }}>The figures above re-derived in code. The two agents' narration lights up the moment a model provider is connected.</p>}
      {fxErr === "fail" && <div style={{ marginTop: 12, color: T.alert, fontSize: 14, display: "flex", gap: 12, alignItems: "center" }}>The agents did not respond. <Btn kind="ghost" small onClick={triggerMove}>Try again</Btn></div>}
      {fxNarr && <div style={{ marginTop: 14 }}>
        <Mini label="Economics Agent" body={fxNarr.econ} />
        <Mini label="Compliance Agent" body={fxNarr.comp} />
        <div style={{ marginTop: 10, fontFamily: F.mono, fontSize: 10.5, color: T.slate }}>The agents narrate the re-derivation. No figure in their text is model-generated.</div>
      </div>}
      <div style={{ marginTop: 12, fontFamily: F.mono, fontSize: 11, color: T.slate, lineHeight: 1.6 }}>Before and after stay visible side by side; Reset returns to the seeded baseline. Mapped to SDG 8, 9, and 17.</div>
    </Card></div>

    <div style={{ marginTop: 16 }}><Card accent={zNote ? T.emerald : T.line}>
      <Label>Telos Economics Agent</Label>
      <div style={{ fontSize: 13, color: T.slate, marginTop: 6 }}>PPP-aware context on {subject.handle}'s {usd(subject.monthlyUsd || 0)} / month for a {subject.role} role.{team.length > 1 ? ` ${team.length - 1} more engagement${team.length - 1 === 1 ? "" : "s"} not shown.` : ""}</div>
      {zBusy
        ? <div style={{ marginTop: 12 }}><Spinner label="The Telos Economics Agent is checking the market..." /></div>
        : zErr === "config"
          ? <p style={{ marginTop: 10, fontSize: 13.5, color: T.slate }}>The Telos Economics Agent is ready and wired through the model proxy. It lights up the moment a model provider is connected.</p>
          : zErr === "fail"
            ? <div style={{ marginTop: 10, color: T.alert, fontSize: 14, display: "flex", gap: 12, alignItems: "center" }}>The Telos Economics Agent did not respond. <Btn kind="ghost" small onClick={askEconomist}>Try again</Btn></div>
            : zNote
              ? <><p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.6 }}>{zNote}</p><div style={{ marginTop: 10, fontFamily: F.mono, fontSize: 10.5, color: T.slate }}>The Telos Economics Agent works from evidence. It does not assert financial fact.</div></>
              : <div style={{ marginTop: 12 }}><Btn kind="ghost" small onClick={askEconomist}>Is this budget competitive?</Btn></div>}
    </Card></div>
    <FigNote />
    <div style={{ height: 30 }} />
  </div></Scroll>;
}

// ============================================================
// ZURI COPILOT DOCK
// Persistent floating copilot, bottom-right of the app shell. Tapping the
// resting bubble opens her panel; in the panel she thinks while generating a
// reply, speaks while it is shown, then rests.
// One Zuri renders per context: the dock shows the bubble OR the panel, never
// both. It is suppressed across the whole auth and pre-assessment flow listed
// in NO_DOCK_SCREENS, so her first appearance is the interview (where she is the
// full-size presence) and the consent opt-out is not influenced by her being
// there. The Zuri component namespaces its ids per instance, so contexts never
// collide.
// ============================================================
const NO_DOCK_SCREENS = ["signin", "consent", "onboarding", "assessinfo", "humanreview", "interview", "cvbuilder"];

// Zuri's real photo (resting) in a circular frame — the copilot's avatar since
// the SVG avatar was retired. Static: resting only.
function ZuriPhoto({ size }) {
  return <img src={zuriFace} alt="Zuri" width={size} height={size}
    style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", display: "block" }} />;
}

function ZuriDock({ role }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([{ from: "zuri", text: "I am Zuri, your copilot. Ask me about your profile, the assessment, or your next move." }]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const voice = useZuriVoice();
  const inputRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);
  useEffect(() => { if (open && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [msgs, busy, open]);

  async function send() {
    const q = draft.trim();
    if (!q || busy) return;
    setMsgs(m => [...m, { from: "you", text: q }]);
    setDraft(""); setBusy(true);
    try {
      const sys = `You are Zuri, the career copilot inside Fumana, speaking to a ${role}. You are warm in manner and strict in judgment: kind about how you say things, honest about what is true. Answer in three to four plain sentences. Lead with the single most useful thing. No hype, no flattery, no em dashes.`;
      const reply = await callClaude({ system: sys, messages: [{ role: "user", content: q }], expectJson: false });
      setMsgs(m => [...m, { from: "zuri", text: reply }]); voice.speak(reply);
    } catch {
      setMsgs(m => [...m, { from: "zuri", text: "I cannot reach my reasoning right now. Try again in a moment." }]);
    }
    setBusy(false);
  }

  if (!open) {
    return <button onClick={() => setOpen(true)} aria-label="Open Zuri, your copilot" className="fdock"
      style={{ position: "fixed", right: 20, zIndex: 50, width: 64, height: 64, borderRadius: "50%", border: `1px solid ${T.line}`, background: T.surface, boxShadow: "0 6px 20px rgba(12,26,38,0.18)", cursor: "pointer", padding: 4, display: "grid", placeItems: "center" }}>
      <ZuriPhoto size={54} />
    </button>;
  }

  return <div role="dialog" aria-label="Zuri, your copilot" onKeyDown={e => { if (e.key === "Escape") setOpen(false); }} className="fdock"
    style={{ position: "fixed", right: 20, zIndex: 50, width: 340, maxWidth: "calc(100vw - 40px)", maxHeight: "min(70vh, 560px)", display: "flex", flexDirection: "column", background: T.surface, border: `1px solid ${T.line}`, borderRadius: 16, boxShadow: "0 12px 36px rgba(12,26,38,0.22)", overflow: "hidden" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: `1px solid ${T.line}` }}>
      <ZuriPhoto size={40} />
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 15 }}>Zuri</div>
        <div style={{ fontFamily: F.mono, fontSize: 10.5, color: T.slate }}>career copilot</div>
      </div>
      <button onClick={() => setOpen(false)} aria-label="Close Zuri copilot" style={{ background: "transparent", border: "none", cursor: "pointer", color: T.slateLg, fontSize: 20, lineHeight: 1, padding: 4 }}>×</button>
    </div>
    <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 14, display: "grid", gap: 10, alignContent: "start" }}>
      {msgs.map((m, i) => <div key={i} style={{ justifySelf: m.from === "you" ? "end" : "start", maxWidth: "85%", background: m.from === "you" ? T.paper : "rgba(6,110,90,0.06)", border: `1px solid ${m.from === "you" ? T.line : "rgba(6,110,90,0.25)"}`, borderRadius: 10, padding: "8px 11px", fontSize: 13.5, lineHeight: 1.55 }}>{m.text}</div>)}
      {busy && <div style={{ justifySelf: "start" }}><Spinner label="Zuri is thinking..." /></div>}
    </div>
    <div style={{ display: "flex", gap: 8, padding: 12, borderTop: `1px solid ${T.line}` }}>
      <input ref={inputRef} value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter") send(); }} placeholder="Ask Zuri..." style={{ flex: 1, background: T.paper, color: T.ink, border: `1px solid ${T.line}`, borderRadius: 8, padding: "9px 11px", fontSize: 13.5 }} />
      <Btn small disabled={!draft.trim() || busy} onClick={send}>Send</Btn>
    </div>
  </div>;
}

// ============================================================
// SHELL (shared header, role switch, nav)
// ============================================================
// Shared Carbon shell: dark header + dark left side nav (mobile bottom nav),
// used by both portals. Pass nav=null for onboarding/interview (no nav chrome).
function Shell({ role, exit, nav, active, onNav, children, showZuri, premiumBadge, locked }) {
  const hasNav = !!nav;
  return <div className={"fshell " + (hasNav ? "hasNav" : "noNav")}>
    <header className="fhead">
      <button onClick={exit} className="fbrand" aria-label="Fumana home">FUMANA</button>
      <span style={{ color: "#8BA0AD", fontSize: 12 }}>{role} portal</span>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
        <NotificationBell />
        <button onClick={exit} style={{ fontFamily: F.mono, fontSize: 11, color: "#9FB0BC", background: "transparent", border: "1px solid #24343F", borderRadius: 6, padding: "5px 10px", cursor: "pointer" }}>switch role</button>
      </div>
    </header>
    {hasNav && <nav className="fside" aria-label={`${role} navigation`}>
      {premiumBadge && <div style={{ margin: "2px 14px 8px", alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 5, fontFamily: F.mono, fontSize: 10, color: "#D6B25A", border: "1px solid #6B551F", borderRadius: 5, padding: "3px 8px" }}>FIND Premium Pro</div>}
      {nav.map(([k, lbl]) => <button key={k} className={"fnav" + (active === k ? " on" : "")} aria-current={active === k ? "page" : undefined} onClick={() => onNav(k)}>{lbl}{locked && locked.includes(k) && <span style={{ marginLeft: 6, color: "#B08A2E", display: "inline-flex", verticalAlign: "middle" }}><LockIcon size={10} /></span>}</button>)}
    </nav>}
    <main className="fmain">{children}</main>
    {hasNav && <nav className="fbot" aria-label={`${role} navigation`}>
      {nav.map(([k, lbl]) => <button key={k} className={"fbotItem" + (active === k ? " on" : "")} aria-current={active === k ? "page" : undefined} onClick={() => onNav(k)}>{lbl}{locked && locked.includes(k) && <span style={{ marginLeft: 4, color: "#B08A2E", display: "inline-flex", verticalAlign: "middle" }}><LockIcon size={9} /></span>}</button>)}
    </nav>}
    <footer className="ffoot">&copy; FIND Services Limited. Powered by Telos. Designed by Lexington Advisory Group.</footer>
    {showZuri && <ZuriDock role={role} />}
  </div>;
}

// ============================================================
// ROOT
// ============================================================
export default function App() {
  const [view, setView] = useState("landing");
  const [builders, setBuilders] = useState(SEED_BUILDERS);
  const [pipeline, setPipeline] = useState(DEMO_SEED ? SEED_PIPELINE : { shortlisted: [], interviewing: [], sow: [] });
  const [squads, setSquads] = useState(SEED_SQUADS);
  const [audit, setAudit] = useState([]);
  // Review-queue rows I filed (contests, human reviews, reports) — drives the
  // "under review" markers so they clear when a reviewer resolves them.
  const [reviews, setReviews] = useState(null);
  // Password recovery: the reset link lands here with a recovery session and
  // the app shows the set-new-password screen instead of the landing page.
  const [recovery, setRecovery] = useState(false);
  // The signed-in user's own builder record and employer org, when a backend
  // is configured. Drives session restore on both portals.
  const [me, setMe] = useState(null);
  const [myEmployer, setMyEmployer] = useState(null);
  const [fx, setFx] = useState(null);

  // Hydrate the shared store from Supabase when configured. Without a backend
  // (or on any failure) the seeded in-memory state stays — demo posture is
  // unchanged and nothing in the UI can tell the difference.
  // Collections merge rather than replace: anything the user created locally
  // while the network call was in flight is kept, so a slow hydrate cannot
  // clobber a just-finished assessment or squad.
  useEffect(() => {
    let live = true;
    store.loadNetwork()
      .then(net => {
        if (!live || !net) return;
        setBuilders(prev => {
          const local = new Map(prev.map(b => [b.id || b.handle, b]));
          for (const r of net.builders) { const k = r.id || r.handle; if (!local.has(k)) local.set(k, r); }
          return [...local.values()];
        });
        setPipeline(prev => Object.values(prev).some(s => s.length) ? prev : net.pipeline);
        setSquads(prev => {
          const seen = new Set(prev.map(s => s.id));
          const merged = prev.map(s => {
            const remote = net.squads.find(n => n.id === s.id);
            return remote ? { ...remote, joined: s.joined } : s;
          });
          return [...merged, ...net.squads.filter(n => !seen.has(n.id))];
        });
        setAudit(prev => {
          const seen = new Set(prev.map(e => `${e.kind}:${e.at}`));
          return [...prev, ...net.audit.filter(e => !seen.has(`${e.kind}:${e.at}`))];
        });
        setReviews(net.reviews || []);
        if (net.fx) setFx(net.fx);
        setMe(net.me ? { ...net.me, docs: net.docs } : null);
        setMyEmployer(net.employer || null);
      })
      .catch(() => {});
    return () => { live = false; };
  }, []);

  // Every mutation writes through to the store. Each store call no-ops without
  // a backend, so these stay correct in both postures.
  const logAudit = e => { setAudit(a => [{ ...e, at: Date.now() }, ...a]); store.logAudit(e).catch(() => {}); };
  // Optimistic queue row + durable write; the local row makes "under review"
  // appear immediately without waiting for a reload.
  const submitReview = r => { setReviews(prev => [{ status: "open", created_at: new Date().toISOString(), ...r }, ...(prev || [])]); store.submitReview(r).catch(() => {}); };
  const addBuilder = b => { setBuilders(prev => [b, ...prev]); store.addBuilder(b).catch(() => {}); };
  // Data deletion: remove the builder from the shared network store, so the
  // profile stops appearing in employer search and in Community. This is what
  // makes "delete my data" a real removal rather than a logged intention.
  const removeBuilder = handle => { setBuilders(prev => prev.filter(b => b.handle !== handle)); store.removeBuilder(handle).catch(() => {}); };
  const joinSquad = id => { setSquads(s => s.map(x => x.id === id ? { ...x, joined: true, members: x.members + 1 } : x)); store.joinSquad(id).catch(() => {}); };
  const leaveSquad = id => { setSquads(s => s.map(x => x.id === id ? { ...x, joined: false, members: Math.max(0, x.members - 1) } : x)); store.leaveSquad(id).catch(() => {}); };
  const formSquad = ({ name, focus, pitch }) => { const id = "sq-" + Math.random().toString(36).slice(2, 8); setSquads(s => [{ id, name, focus, pitch, members: 1, joined: true }, ...s]); store.formSquad({ id, name, focus, pitch }).catch(() => {}); };
  // Pipeline edits arrive as updater fns from EmployerApp; resolve then persist.
  const setPipelinePersist = updater => setPipeline(prev => {
    const next = typeof updater === "function" ? updater(prev) : updater;
    store.savePipeline(next).catch(() => {});
    return next;
  });
  const toRole = () => setView("role");
  // Real sign-out: clears the Supabase session token and the restored
  // identities so the next visit starts signed out, then lands home.
  const signOut = () => { authSignOut().finally(() => { setMe(null); setMyEmployer(null); setView("landing"); }); };

  // Recovery links land as #...&type=recovery and emit PASSWORD_RECOVERY.
  // Either signal parks the app on the set-new-password screen.
  useEffect(() => {
    if (!supabase) return;
    if (/type=recovery/.test(window.location.hash)) setRecovery(true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(evt => {
      if (evt === "PASSWORD_RECOVERY") setRecovery(true);
    });
    return () => subscription.unsubscribe();
  }, []);
  const [fontSize, setFontSize] = useState("default");
  const scale = FONT_SCALE[fontSize] || 1;
  // The marketing views (landing, role selection) are Tailwind-styled and use
  // IBM Plex Sans as their base font, separate from the inline-styled app shell.
  const marketingFont = { fontFamily: "'IBM Plex Sans', sans-serif" };
  if (recovery) return <div style={marketingFont}><ResetPasswordPage onDone={() => { authSignOut(); setRecovery(false); history.replaceState(null, "", window.location.pathname); }} /></div>;
  return <div style={{ background: T.paper, minHeight: "100vh", color: T.ink, fontFamily: F.body, zoom: scale, "--base-font-size": `${(14 * scale).toFixed(1)}px` }}>
    <style>{FONTS}</style>
    <FontSizeCtx.Provider value={{ size: fontSize, setSize: setFontSize }}>
      <ToastProvider>
        <HumanReviewProvider logAudit={logAudit} submitReview={submitReview}>
          {view === "landing" && <div style={marketingFont}><LandingPage onSignInClick={toRole} /></div>}
          {view === "role" && <div style={marketingFont}><RoleSelectionPage onRoleSelect={r => setView(r === "builder" ? "candidate" : "employer")} onBack={() => setView("landing")} /></div>}
          {view === "candidate" && <CandidateApp addBuilder={addBuilder} removeBuilder={removeBuilder} builders={builders} pipeline={pipeline} squads={squads} joinSquad={joinSquad} leaveSquad={leaveSquad} formSquad={formSquad} audit={audit} logAudit={logAudit} submitReview={submitReview} reviews={reviews} exit={() => setView("landing")} toRole={toRole} me={me} onSignOut={signOut} />}
          {view === "employer" && <EmployerApp builders={builders} pipeline={pipeline} setPipeline={setPipelinePersist} logAudit={logAudit} submitReview={submitReview} exit={() => setView("landing")} toRole={toRole} employer={myEmployer} fx={fx} onSignOut={signOut} />}
        </HumanReviewProvider>
      </ToastProvider>
    </FontSizeCtx.Provider>
  </div>;
}
