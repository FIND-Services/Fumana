import { useState } from "react";

// ============================================================
// Fumana platform. One application, one shared builder network.
// Build a candidate profile, switch to the employer side, and that
// same masked profile appears in search. Hire, and the impact computes.
// Zuri is the agent. Telos is the data and impact engine underneath.
// ============================================================

const T = {
  paper: "#ECEFF2", surface: "#FFFFFF", mute: "#E3E8EB", line: "#D7DEE3",
  ink: "#0C1A26", slate: "#5E6E7A", emerald: "#066E5A", vault: "#05564A",
  brass: "#B08A2E", onAccent: "#F4F7F8", alert: "#A8431F",
};
const F = { disp: "'Hanken Grotesk', sans-serif", body: "'Inter', sans-serif", mono: "'IBM Plex Mono', monospace" };
const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
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
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
`;

async function callClaude({ system, messages, expectJson }) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, system, messages }),
  });
  const data = await res.json();
  const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n").trim();
  if (!expectJson) return text;
  return JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
}
const usd = n => "$" + Math.round(n).toLocaleString("en-US");

// ---- scoring model ----
const WEIGHTS = { "Technical depth": 0.30, "Communication clarity": 0.16, "Async and remote readiness": 0.16, "Professionalism": 0.14, "Collaboration": 0.12, "Problem solving": 0.12 };
const DIMENSIONS = Object.keys(WEIGHTS);
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
const MODULES = {
  "Communication clarity": { id: "culture", title: "Culture Shock Simulator", blurb: "Western corporate communication: async updates, proactive clarification, direct feedback.", pts: 300 },
  "Async and remote readiness": { id: "async", title: "Async Operating Rhythm", blurb: "Run a remote day across time zones without losing momentum.", pts: 250 },
  "Professionalism": { id: "prof", title: "Professional Presence", blurb: "Client-ready conduct, commitments, and follow through.", pts: 200 },
  "Collaboration": { id: "collab", title: "Collaboration and Code Review", blurb: "Give and take review, pair effectively, raise blockers early.", pts: 220 },
  "Problem solving": { id: "solve", title: "Structured Problem Solving", blurb: "Frame ambiguous problems and show your reasoning.", pts: 240 },
  "Technical depth": { id: "deep", title: "Technical Deep Dive", blurb: "Close the gap on the skills employers ask for most.", pts: 320 },
};
const MAX_Q = 5;

// ---- seeded network so employer search has a pool ----
const SEED_BUILDERS = [
  { handle: "FB-2208", role: "Backend engineer", summary: "Built payment reconciliation and queue resilience for a Lagos fintech. Strong on PostgreSQL and network-loss recovery.", skills: ["Python", "PostgreSQL", "Distributed systems"], profileStrength: 88, tier: tierOf(88) },
  { handle: "FB-4417", role: "Frontend engineer", summary: "Shipped accessible React dashboards for a Nairobi health platform on low-bandwidth networks.", skills: ["React", "TypeScript", "Accessibility"], profileStrength: 81, tier: tierOf(81) },
  { handle: "FB-7731", role: "Data engineer", summary: "Built ETL and reporting pipelines across three African markets, owning data quality end to end.", skills: ["Airflow", "SQL", "Python"], profileStrength: 76, tier: tierOf(76) },
];

// ---- shared ui ----
function Btn({ children, onClick, kind, disabled, full, small }) {
  const s = { primary: { background: T.emerald, color: T.onAccent, border: "none" }, ghost: { background: "transparent", color: T.ink, border: `1px solid ${T.line}` }, sso: { background: T.surface, color: T.ink, border: `1px solid ${T.line}` } }[kind || "primary"];
  return <button onClick={onClick} disabled={disabled} style={{ ...s, fontFamily: F.disp, fontWeight: 600, fontSize: small ? 12.5 : 14, padding: small ? "8px 13px" : "12px 18px", borderRadius: 8, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1, width: full ? "100%" : "auto", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9 }}>{children}</button>;
}
function Spinner({ label }) { return <div style={{ display: "flex", alignItems: "center", gap: 10, color: T.slate, fontSize: 14 }}><span style={{ width: 14, height: 14, border: `2px solid ${T.line}`, borderTopColor: T.emerald, borderRadius: "50%", display: "inline-block", animation: "spin .8s linear infinite" }} />{label}</div>; }
const Label = ({ children }) => <div style={{ fontFamily: F.mono, fontSize: 11, color: T.slate, letterSpacing: 0.4, textTransform: "uppercase" }}>{children}</div>;
const Eyebrow = ({ children }) => <div style={{ fontFamily: F.mono, fontSize: 12, color: T.emerald }}>{children}</div>;
const Back = ({ onClick }) => <button onClick={onClick} aria-label="Go back" style={{ fontFamily: F.mono, fontSize: 12, color: T.slate, background: "transparent", border: "none", cursor: "pointer", padding: "4px 0", marginBottom: 8 }}>← back</button>;
const Hint = ({ show, children }) => show ? <div role="status" style={{ marginTop: 8, fontSize: 12.5, color: T.slate }}>{children}</div> : null;
const Card = ({ children, accent, pad }) => <div style={{ background: T.surface, border: `1px solid ${accent || T.line}`, borderRadius: 12, padding: pad ?? 22 }}>{children}</div>;
const Li = ({ children }) => <li style={{ display: "flex", gap: 9 }}><span style={{ color: T.emerald }}>.</span><span style={{ color: T.slate }}>{children}</span></li>;
function Field({ label, value, onChange, placeholder, rows }) {
  const common = { width: "100%", marginTop: 7, background: T.paper, color: T.ink, border: `1px solid ${T.line}`, borderRadius: 8, padding: 11, fontSize: 14, lineHeight: 1.5 };
  return <div style={{ marginBottom: 14 }}><Label>{label}</Label>{rows ? <textarea rows={rows} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ ...common, resize: "vertical" }} /> : <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={common} />}</div>;
}
const Centered = ({ children }) => <div style={{ minHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>{children}</div>;
const Scroll = ({ children }) => <div style={{ height: "100%", overflowY: "auto", padding: "26px 24px" }}>{children}</div>;

// ============================================================
// LANDING
// ============================================================
function Landing({ go }) {
  return <Centered><div style={{ width: "100%", maxWidth: 760 }} className="rise">
    <div style={{ fontFamily: F.disp, fontWeight: 800, fontSize: 38, letterSpacing: 4 }}>FUMANA</div>
    <p style={{ color: T.slate, fontSize: 16, marginTop: 8, maxWidth: 560 }}>The talent clearing house for African engineering. One network: builders prove their worth on one side, enterprises hire it on the other, and the impact is settled in the open.</p>
    <div className="doors" style={{ marginTop: 26 }}>
      <Card accent={T.line}>
        <Label>I am a builder</Label>
        <h3 style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 20, margin: "8px 0 6px" }}>Build a profile employers trust</h3>
        <p style={{ color: T.slate, fontSize: 14, marginBottom: 14 }}>Sign in, take the AI interview, and join the network with your identity shielded until you choose to reveal it.</p>
        <Btn onClick={() => go("candidate")}>Enter as a builder</Btn>
      </Card>
      <Card accent={T.line}>
        <Label>I am an employer</Label>
        <h3 style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 20, margin: "8px 0 6px" }}>Hire verified talent</h3>
        <p style={{ color: T.slate, fontSize: 14, marginBottom: 14 }}>Search by evidence, see bias-shielded matches, sign an SOW with liability carried for you, and see where every dollar goes.</p>
        <Btn onClick={() => go("employer")}>Enter as an employer</Btn>
      </Card>
    </div>
    <div style={{ marginTop: 18, fontFamily: F.mono, fontSize: 12, color: T.slate }}>Tip: build a profile first, then enter as an employer and search. You will find yourself in the results.</div>
    <div style={{ marginTop: 22, fontFamily: F.mono, fontSize: 11, color: T.slate }}>Powered by Telos. Designed by Lexington Advisory Group.</div>
  </div></Centered>;
}

// ============================================================
// CANDIDATE SIDE
// ============================================================
function CandidateApp({ addBuilder, exit }) {
  const [screen, setScreen] = useState("signin");
  const [profile, setProfile] = useState({ name: "", role: "", city: "", experience: "" });
  const [result, setResult] = useState(null);
  const [points, setPoints] = useState(0);
  const [published, setPublished] = useState(false);
  const nav = ["dashboard", "upskill"].includes(screen);

  function finish(r) {
    setResult(r); setPoints(120);
    const handle = "FB-" + Math.floor(1000 + Math.random() * 8999);
    const top = [...r.dimensions].sort((a, b) => b.score - a.score).slice(0, 3).map(d => d.name);
    const summary = `${profile.role || "Engineer"} with a ${r.tier.name} profile. Strongest in ${top.slice(0, 2).join(" and ")}. ${profile.experience.split(".")[0]}.`;
    addBuilder({ handle, role: profile.role || "Engineer", summary, skills: top, profileStrength: r.profileStrength, tier: r.tier, dimensions: r.dimensions, isYou: true });
    setPublished(true); setScreen("dashboard");
  }

  return <Shell role="candidate" exit={exit} nav={nav ? [["dashboard", "Dashboard"], ["upskill", "Upskilling"]] : null} active={screen} onNav={setScreen}>
    {screen === "signin" && <SignIn onNext={() => setScreen("consent")} who="builder" />}
    {screen === "consent" && <Consent onNext={() => setScreen("onboarding")} onBack={() => setScreen("signin")} />}
    {screen === "onboarding" && <Onboarding profile={profile} setProfile={setProfile} onNext={() => setScreen("assessinfo")} onBack={() => setScreen("consent")} />}
    {screen === "assessinfo" && <AssessInfo onOptIn={() => setScreen("interview")} onOptOut={() => setScreen("humanreview")} onBack={() => setScreen("onboarding")} />}
    {screen === "humanreview" && <HumanReview onSwitch={() => setScreen("interview")} />}
    {screen === "interview" && <Interview profile={profile} onBack={() => setScreen("assessinfo")} onComplete={finish} />}
    {screen === "dashboard" && result && <Dashboard profile={profile} result={result} onUpskill={() => setScreen("upskill")} published={published} />}
    {screen === "upskill" && result && <Upskill result={result} points={points} setPoints={setPoints} />}
  </Shell>;
}

function SignIn({ onNext, who }) {
  return <Centered><div style={{ width: "100%", maxWidth: 420 }} className="rise">
    <div style={{ fontFamily: F.disp, fontWeight: 800, fontSize: 28, letterSpacing: 3 }}>FUMANA</div>
    <div style={{ color: T.slate, marginTop: 6, fontSize: 15 }}>{who === "builder" ? "Build a profile employers can trust on sight." : "Engage verified African talent with the risk carried for you."}</div>
    <div style={{ marginTop: 24, display: "grid", gap: 10 }}>
      <Btn kind="sso" full onClick={onNext}>Continue with Google{who === "builder" ? "" : " Workspace"}</Btn>
      <Btn kind="sso" full onClick={onNext}>Continue with Microsoft{who === "builder" ? "" : " Entra ID"}</Btn>
      {who === "builder" && <><div style={{ display: "flex", alignItems: "center", gap: 12, color: T.slate, fontSize: 12, margin: "6px 0" }}><span style={{ flex: 1, height: 1, background: T.line }} />or<span style={{ flex: 1, height: 1, background: T.line }} /></div><Btn full onClick={onNext}>Sign up with email</Btn></>}
    </div>
    <div style={{ marginTop: 16, fontFamily: F.mono, fontSize: 11, color: T.slate, lineHeight: 1.6 }}>SSO is wired at the UI layer for this prototype. Real OIDC and SAML are a backend step.</div>
  </div></Centered>;
}

function Consent({ onNext, onBack }) {
  const [ok, setOk] = useState(false);
  return <Centered><div style={{ width: "100%", maxWidth: 480 }} className="rise">
    <Back onClick={onBack} /><Eyebrow>Step 1 of 4 . Your protection</Eyebrow>
    <h2 style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 24, margin: "8px 0 6px" }}>How Fumana protects you</h2>
    <Card pad={20}><ul style={{ listStyle: "none", display: "grid", gap: 12, fontSize: 14 }}>
      <Li><b>Bias shield.</b> Your name, photo, location, and gender stay hidden from employers until you accept an interview.</Li>
      <Li><b>You own your data.</b> Export or delete your profile at any time.</Li>
      <Li><b>Honest assessment.</b> Zuri scores your strengths and names your gaps plainly, then helps you close them.</Li>
    </ul>
      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 18, fontSize: 14, cursor: "pointer" }}><input type="checkbox" checked={ok} onChange={e => setOk(e.target.checked)} style={{ marginTop: 3 }} /><span>I understand the bias-shielded process and data terms.</span></label>
    </Card>
    <div style={{ marginTop: 16 }}><Btn full disabled={!ok} onClick={onNext}>Continue</Btn><Hint show={!ok}>Tick the box above to continue.</Hint></div>
  </div></Centered>;
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
    <div style={{ marginTop: 16, marginBottom: 30 }}><Btn full disabled={!ready} onClick={onNext}>Continue</Btn><Hint show={!ready}>Add your role and a few sentences of experience to continue.</Hint></div>
  </div></Scroll>;
}

function AssessInfo({ onOptIn, onOptOut, onBack }) {
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
      <Li>An AI model reads your experience and answers, then scores each dimension 0 to 100 with a written reason you will see.</Li>
      <Li>Your Profile Strength is a weighted average computed by the fixed formula above.</Li>
      <Li>Scores are a starting point, not a verdict. You can retake the interview.</Li>
    </ul></Card>
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

const INTERVIEW_SYS = "You are Zuri, a warm, professional AI interviewer for Fumana, assessing a builder for global remote engineering work. Conduct a brief adaptive competency interview. Ask exactly ONE question per turn, short and concrete. Adapt each question to the candidate's previous answers and their role. Across the interview, probe communication, professionalism, async and remote work, collaboration, problem solving, and technical depth. Do not score, do not summarise, do not greet repeatedly. Output only the next question.";

function Interview({ profile, onBack, onComplete }) {
  const [history, setHistory] = useState([]); const [qa, setQa] = useState([]);
  const [question, setQuestion] = useState(""); const [answer, setAnswer] = useState("");
  const [count, setCount] = useState(0); const [busy, setBusy] = useState(false);
  const [scoring, setScoring] = useState(false); const [err, setErr] = useState(false); const [started, setStarted] = useState(false);
  async function ask(hist) {
    setBusy(true); setErr(false);
    try { const msgs = hist.length ? hist : [{ role: "user", content: `My role is ${profile.role}. My experience: ${profile.experience}. Please begin the interview.` }]; const q = await callClaude({ system: INTERVIEW_SYS, messages: msgs, expectJson: false }); setQuestion(q); setHistory([...msgs, { role: "assistant", content: q }]); } catch (e) { setErr(true); } setBusy(false);
  }
  function start() { setStarted(true); ask([]); }
  async function submit() {
    if (answer.trim().length < 4) return;
    const nextQa = [...qa, { q: question, a: answer }]; setQa(nextQa);
    const newHist = [...history, { role: "user", content: answer }]; setAnswer("");
    if (count + 1 >= MAX_Q) { await score(nextQa); return; }
    setCount(count + 1); await ask(newHist);
  }
  async function score(finalQa) {
    setScoring(true); setErr(false);
    try {
      const transcript = finalQa.map((x, i) => `Q${i + 1}: ${x.q}\nA${i + 1}: ${x.a}`).join("\n\n");
      const sys = "You are the Fumana scoring model, powered by Telos. Using the builder's experience and interview transcript, score six dimensions for global remote enterprise work: " + DIMENSIONS.join(", ") + ". Technical depth draws on experience and technical answers. The others draw on the interview, not the resume alone. Score each 0 to 100 with a fair, specific one-sentence rationale grounded in what they said. Be honest, name real gaps. Return ONLY JSON, no fences. Shape: {\"dimensions\":[{\"name\":string,\"score\":number,\"rationale\":string}]}. Use exactly those six names.";
      const out = await callClaude({ system: sys, messages: [{ role: "user", content: `Experience:\n${profile.experience}\n\nInterview:\n${transcript}` }], expectJson: true });
      const dims = out.dimensions || []; const cs = composite(dims);
      onComplete({ dimensions: dims, profileStrength: cs, tier: tierOf(cs), weakest: [...dims].sort((a, b) => a.score - b.score)[0] });
    } catch (e) { setErr(true); setScoring(false); }
  }
  return <Scroll><div style={{ maxWidth: 680, margin: "0 auto" }} className="rise">
    <Back onClick={onBack} /><Eyebrow>Step 4 of 4 . AI interview with Zuri</Eyebrow>
    <h2 style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 26, margin: "8px 0 4px" }}>A short conversation, not a form</h2>
    <p style={{ color: T.slate, fontSize: 15, marginBottom: 16 }}>Zuri asks {MAX_Q} questions that adapt to your answers. Speak plainly.</p>
    {!started && <Btn onClick={start}>Begin interview with Zuri</Btn>}
    {started && <div style={{ display: "grid", gap: 12 }}>
      {qa.map((x, i) => <div key={i}><div style={{ fontSize: 14, color: T.slate }}><b style={{ color: T.emerald, fontFamily: F.mono, fontSize: 12 }}>ZURI</b> . {x.q}</div><div style={{ marginTop: 4, fontSize: 14, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 8, padding: "9px 12px" }}>{x.a}</div></div>)}
      {scoring && <Card><Spinner label="Zuri is scoring your six dimensions..." /></Card>}
      {!scoring && busy && <Card><Spinner label="Zuri is considering your answer..." /></Card>}
      {!scoring && !busy && question && <Card accent={T.emerald}>
        <div style={{ fontSize: 15, marginBottom: 10 }}><b style={{ color: T.emerald, fontFamily: F.mono, fontSize: 12 }}>ZURI</b> . {question}</div>
        <textarea rows={3} value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Answer in a few honest sentences." style={{ width: "100%", background: T.paper, color: T.ink, border: `1px solid ${T.line}`, borderRadius: 8, padding: 11, fontSize: 14, resize: "vertical" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}><span style={{ fontFamily: F.mono, fontSize: 11, color: T.slate }}>question {count + 1} of {MAX_Q}</span><Btn small disabled={answer.trim().length < 4} onClick={submit}>{count + 1 >= MAX_Q ? "Finish and score" : "Send answer"}</Btn></div>
      </Card>}
      {err && <div style={{ color: T.alert, fontSize: 14, display: "flex", gap: 12, alignItems: "center" }}>Zuri did not respond. <Btn kind="ghost" small onClick={() => (scoring ? score(qa) : ask(history))}>Try again</Btn></div>}
    </div>}
    <div style={{ height: 30 }} />
  </div></Scroll>;
}

function Dashboard({ profile, result, onUpskill, published }) {
  const tier = result.tier; const rec = MODULES[result.weakest?.name] || MODULES["Technical depth"];
  const [zuri, setZuri] = useState(""); const [zb, setZb] = useState(false); const [showCalc, setShowCalc] = useState(false);
  async function askZuri() { setZb(true); try { const sys = "You are Zuri, the career copilot inside Fumana. In three to four warm, direct sentences, tell this builder the single most valuable next move to raise their tier, grounded in their weakest dimension. No hype, no em dashes."; setZuri(await callClaude({ system: sys, messages: [{ role: "user", content: `Profile strength ${result.profileStrength}, tier ${tier.name}. Weakest: ${result.weakest?.name} at ${result.weakest?.score}. Role ${profile.role || "engineer"}.` }], expectJson: false })); } catch { setZuri("Zuri is unavailable right now."); } setZb(false); }
  return <Scroll><div style={{ maxWidth: 860, margin: "0 auto" }} className="rise">
    {published && <div style={{ marginBottom: 16, background: "rgba(6,110,90,0.06)", border: `1px solid ${T.emerald}`, borderRadius: 10, padding: "11px 14px", fontSize: 13.5, color: T.vault }}>✓ You are now in the network, identity shielded.</div>}
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
      <div><Eyebrow>Growth dashboard</Eyebrow><h2 style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 26, margin: "6px 0 2px" }}>{profile.name || "Your"} profile</h2><div style={{ color: T.slate, fontSize: 14 }}>{profile.role} . {profile.city || "location hidden"}</div></div>
      <div style={{ textAlign: "right" }}><div style={{ fontFamily: F.disp, fontWeight: 800, fontSize: 46, color: T.emerald, lineHeight: 1 }}>{result.profileStrength}</div><button onClick={() => setShowCalc(s => !s)} style={{ fontFamily: F.mono, fontSize: 11, color: T.slate, background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}>profile strength . how is this calculated</button><div><span style={{ display: "inline-block", marginTop: 6, fontFamily: F.mono, fontSize: 12, color: T.onAccent, background: tier.color, borderRadius: 5, padding: "3px 10px" }}>{tier.name} tier</span></div></div>
    </div>
    {showCalc && <div style={{ marginTop: 14 }}><Card pad={16} accent={T.brass}><Label>How this was calculated</Label><p style={{ fontSize: 13.5, color: T.slate, margin: "8px 0 10px" }}>Each dimension is scored 0 to 100 by an AI model from your experience and interview. Profile Strength is their weighted average.</p><div style={{ display: "grid", gap: 5 }}>{result.dimensions.map((d, i) => <div key={i} style={{ display: "flex", justifyContent: "space-between", fontFamily: F.mono, fontSize: 12, color: T.slate }}><span>{d.name}</span><span>{d.score} × {WEIGHTS[d.name]?.toFixed(2)}</span></div>)}<div style={{ display: "flex", justifyContent: "space-between", fontFamily: F.mono, fontSize: 12.5, color: T.emerald, borderTop: `1px solid ${T.mute}`, paddingTop: 6, marginTop: 2 }}><span>weighted average</span><span>{result.profileStrength}</span></div></div></Card></div>}
    <div className="dash" style={{ marginTop: 18 }}>
      <Card><Label>Dimension scores</Label><div style={{ display: "grid", gap: 14, marginTop: 14 }}>{result.dimensions.map((d, i) => <div key={i}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}><span style={{ color: T.ink, fontWeight: 500 }}>{d.name}</span><span style={{ fontFamily: F.mono, color: d.score < 60 ? T.alert : T.ink }}>{d.score}/100</span></div><div style={{ height: 7, background: T.mute, borderRadius: 4, marginTop: 5 }}><div style={{ height: "100%", width: `${d.score}%`, background: d.score < 60 ? T.alert : T.emerald, borderRadius: 4, animation: "grow 1s ease" }} /></div><div style={{ fontSize: 12, color: T.slate, marginTop: 4 }}>{d.rationale}</div></div>)}</div></Card>
      <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
        <Card accent={T.brass}><Label>Recommended next step</Label><div style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 17, marginTop: 8 }}>{rec.title}</div><p style={{ fontSize: 13.5, color: T.slate, margin: "6px 0 12px" }}>{rec.blurb}</p><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontFamily: F.mono, fontSize: 12, color: T.emerald }}>+{rec.pts} pts</span><Btn small onClick={onUpskill}>Start module</Btn></div><div style={{ marginTop: 10, fontSize: 12, color: T.slate }}>Weakest dimension: <b>{result.weakest?.name}</b>.</div></Card>
        <Card accent={zuri ? T.emerald : T.line}><Label>Zuri . career copilot</Label>{!zuri && !zb && <div style={{ marginTop: 10 }}><Btn kind="ghost" small onClick={askZuri}>Ask Zuri what to do next</Btn></div>}{zb && <div style={{ marginTop: 12 }}><Spinner label="Zuri is thinking..." /></div>}{zuri && <p style={{ marginTop: 10, fontSize: 14, lineHeight: 1.6 }}>{zuri}</p>}</Card>
      </div>
    </div>
    <div style={{ height: 30 }} />
  </div></Scroll>;
}

function Upskill({ result, points, setPoints }) {
  const recId = (MODULES[result.weakest?.name] || {}).id; const list = Object.values(MODULES); const [done, setDone] = useState({});
  const complete = m => { if (done[m.id]) return; setDone(d => ({ ...d, [m.id]: true })); setPoints(p => p + m.pts); };
  return <Scroll><div style={{ maxWidth: 860, margin: "0 auto" }} className="rise">
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}><div><Eyebrow>Upskilling journey</Eyebrow><h2 style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 26, margin: "6px 0 0" }}>Close the gap, earn the tier</h2></div><div style={{ textAlign: "right" }}><div style={{ fontFamily: F.disp, fontWeight: 800, fontSize: 30, color: T.brass, lineHeight: 1 }}>{points}</div><div style={{ fontFamily: F.mono, fontSize: 11, color: T.slate }}>reward points</div></div></div>
    <div className="mods" style={{ marginTop: 20 }}>{list.map(m => { const isRec = m.id === recId, finished = done[m.id]; return <Card key={m.id} accent={isRec ? T.brass : T.line}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><Label>{isRec ? "recommended for you" : "module"}</Label>{finished && <span style={{ fontFamily: F.mono, fontSize: 11, color: T.emerald }}>completed</span>}</div><div style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 17, marginTop: 8 }}>{m.title}</div><p style={{ fontSize: 13.5, color: T.slate, margin: "6px 0 14px" }}>{m.blurb}</p><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontFamily: F.mono, fontSize: 12, color: T.emerald }}>+{m.pts} pts</span><Btn kind={finished ? "ghost" : "primary"} small disabled={finished} onClick={() => complete(m)}>{finished ? "Done" : "Complete module"}</Btn></div></Card>; })}</div>
    <div style={{ marginTop: 18 }}><Card><Label>Achievements</Label><div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}><Badge on label="Profile verified" /><Badge on={result.profileStrength >= 50} label="Silver reached" /><Badge on={result.profileStrength >= 70} label="Gold reached" /><Badge on={Object.keys(done).length >= 1} label="First module" /><Badge on={points >= 500} label="500 points" /></div></Card></div>
    <div style={{ height: 30 }} />
  </div></Scroll>;
}
const Badge = ({ on, label }) => <span style={{ fontFamily: F.mono, fontSize: 12, padding: "6px 11px", borderRadius: 6, border: `1px solid ${on ? T.emerald : T.line}`, color: on ? T.emerald : T.slate, background: on ? "rgba(6,110,90,0.06)" : "transparent" }}>{on ? "✓ " : "○ "}{label}</span>;

// ============================================================
// EMPLOYER SIDE
// ============================================================
function EmployerApp({ builders, pipeline, setPipeline, exit }) {
  const [screen, setScreen] = useState("signin");
  const [tab, setTab] = useState("search");
  const [active, setActive] = useState(null); const [sow, setSow] = useState(null);
  const inApp = screen === "app";
  const shortlist = c => setPipeline(p => p.shortlisted.concat(p.interviewing, p.sow).some(x => x.handle === c.handle) ? p : ({ ...p, shortlisted: [...p.shortlisted, c] }));
  const move = (c, from, to) => setPipeline(p => ({ ...p, [from]: p[from].filter(x => x.handle !== c.handle), [to]: [...p[to], c] }));
  const openSow = c => { setActive(c); setSow(null); setTab("compliance"); };
  return <Shell role="employer" exit={exit} nav={inApp ? [["search", "Search"], ["pipeline", "Pipeline"], ["compliance", "Compliance"], ["finance", "Finance"]] : null} active={tab} onNav={setTab}>
    {screen === "signin" && <SignIn onNext={() => setScreen("app")} who="employer" />}
    {inApp && tab === "search" && <Search builders={builders} onShortlist={shortlist} chosen={[...pipeline.shortlisted, ...pipeline.interviewing, ...pipeline.sow]} />}
    {inApp && tab === "pipeline" && <Pipeline pipeline={pipeline} move={move} openSow={openSow} />}
    {inApp && tab === "compliance" && <Compliance active={active} sow={sow} setSow={setSow} />}
    {inApp && tab === "finance" && <Finance active={active} />}
  </Shell>;
}

function Search({ builders, onShortlist, chosen }) {
  const [need, setNeed] = useState("Backend engineer for a payments reconciliation service, fintech, Berlin team, async across time zones.");
  const [budget, setBudget] = useState("4500");
  const [ranked, setRanked] = useState(null); const [busy, setBusy] = useState(false);
  const ready = need.trim().length > 20 && Number(budget) > 0;
  function run() {
    setBusy(true);
    const words = need.toLowerCase();
    const scored = builders.map(b => {
      const roleHit = words.includes((b.role || "").toLowerCase().split(" ")[0]) ? 18 : 0;
      const skillHit = (b.skills || []).reduce((a, s) => a + (words.includes(s.toLowerCase()) ? 6 : 0), 0);
      const fit = Math.min(99, Math.round((b.profileStrength || 70) * 0.8 + roleHit + skillHit));
      return { ...b, fit };
    }).sort((a, b) => b.fit - a.fit);
    setTimeout(() => { setRanked(scored); setBusy(false); }, 350);
  }
  const inList = h => chosen.some(c => c.handle === h);
  return <Scroll><div style={{ maxWidth: 900, margin: "0 auto" }} className="rise">
    <Eyebrow>Procurement</Eyebrow><h2 style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 26, margin: "6px 0 4px" }}>Engage experts by evidence, not keywords</h2>
    <p style={{ color: T.slate, fontSize: 15, marginBottom: 16 }}>Describe the work and the budget. Matches are bias-shielded: identity stays hidden until you commit to an interview.</p>
    <Card><Label>What you need</Label>
      <textarea rows={3} value={need} onChange={e => setNeed(e.target.value)} style={{ width: "100%", marginTop: 7, background: T.paper, color: T.ink, border: `1px solid ${T.line}`, borderRadius: 8, padding: 11, fontSize: 14, resize: "vertical" }} />
      <div className="row2" style={{ marginTop: 12, alignItems: "end" }}>
        <div><Label>Monthly budget, USD</Label><input value={budget} onChange={e => setBudget(e.target.value.replace(/[^0-9]/g, ""))} style={{ width: "100%", marginTop: 7, background: T.paper, color: T.ink, border: `1px solid ${T.line}`, borderRadius: 8, padding: 11, fontSize: 14 }} /></div>
        <div>{busy ? <Spinner label="Matching against the network..." /> : <Btn full disabled={!ready} onClick={run}>Search the network</Btn>}<Hint show={!ready && !busy}>Describe the work and set a budget above zero.</Hint></div>
      </div>
    </Card>
    {ranked && <div style={{ marginTop: 18, display: "grid", gap: 14 }}>
      {ranked.length === 0 && <Card><p style={{ color: T.slate, fontSize: 14 }}>No builders in the network yet. Build a candidate profile first, then search.</p></Card>}
      {ranked.map((c, i) => <Card key={i} accent={c.isYou ? T.emerald : T.line}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div aria-hidden="true" style={{ width: 44, height: 44, borderRadius: 10, background: T.mute, border: `1px solid ${T.line}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.mono, color: T.slate }}>FU</div>
            <div><div style={{ fontWeight: 600 }}>{c.handle} <span style={{ color: T.slate, fontWeight: 400, fontSize: 13 }}>. {c.role}</span>{c.isYou && <span style={{ marginLeft: 8, fontFamily: F.mono, fontSize: 10, color: T.emerald, border: `1px solid ${T.emerald}`, borderRadius: 4, padding: "1px 6px" }}>new to network</span>}</div><div style={{ fontFamily: F.mono, fontSize: 11, color: T.slate }}>identity shielded</div></div>
          </div>
          <div style={{ textAlign: "right" }}><div style={{ fontFamily: F.disp, fontWeight: 800, fontSize: 24, color: T.emerald, lineHeight: 1 }}>{c.fit}%</div><div style={{ fontFamily: F.mono, fontSize: 10, color: T.slate }}>fit . computed</div></div>
        </div>
        <p style={{ fontSize: 14, color: T.ink, margin: "12px 0 10px" }}>{c.summary}</p>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 12 }}>{(c.skills || []).map((s, j) => <span key={j} style={{ fontFamily: F.mono, fontSize: 11.5, color: T.emerald, border: `1px solid ${T.line}`, borderRadius: 4, padding: "3px 8px" }}>{s}</span>)}</div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}><Btn small disabled={inList(c.handle)} onClick={() => onShortlist({ ...c, monthlyUsd: Number(budget) })}>{inList(c.handle) ? "In pipeline" : "Add to pipeline"}</Btn></div>
      </Card>)}
    </div>}
  </div></Scroll>;
}

const COLS = [["shortlisted", "Shortlisted"], ["interviewing", "Interviewing"], ["sow", "SOW pending"]];
function Pipeline({ pipeline, move, openSow }) {
  const empty = COLS.every(([k]) => pipeline[k].length === 0);
  return <Scroll><div style={{ maxWidth: 980, margin: "0 auto" }} className="rise">
    <Eyebrow>Pipeline</Eyebrow><h2 style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 26, margin: "6px 0 14px" }}>Move candidates toward a signed SOW</h2>
    {empty && <Card><p style={{ color: T.slate, fontSize: 14 }}>Your pipeline is empty. Search the network and add candidates to begin.</p></Card>}
    {!empty && <div className="kanban">{COLS.map(([key, title], ci) => <div key={key} style={{ background: T.paper, border: `1px solid ${T.line}`, borderRadius: 12, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}><Label>{title}</Label><span style={{ fontFamily: F.mono, fontSize: 11, color: T.slate }}>{pipeline[key].length}</span></div>
      <div style={{ display: "grid", gap: 10 }}>{pipeline[key].map((c, i) => <Card key={i} pad={14}><div style={{ fontWeight: 600, fontSize: 14 }}>{c.handle}</div><div style={{ color: T.slate, fontSize: 12.5, marginBottom: 8 }}>{c.role}</div><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{ci > 0 && <Btn kind="ghost" small onClick={() => move(c, key, COLS[ci - 1][0])}>← {COLS[ci - 1][1]}</Btn>}{ci < 2 && <Btn small onClick={() => move(c, key, COLS[ci + 1][0])}>{COLS[ci + 1][1]} →</Btn>}{key === "sow" && <Btn small onClick={() => openSow(c)}>Generate SOW</Btn>}</div></Card>)}{pipeline[key].length === 0 && <div style={{ color: T.slate, fontSize: 12.5, padding: "6px 2px" }}>Empty</div>}</div>
    </div>)}</div>}
  </div></Scroll>;
}

function Compliance({ active, sow, setSow }) {
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(false);
  if (!active) return <Scroll><div style={{ maxWidth: 760, margin: "0 auto" }} className="rise"><Card><p style={{ color: T.slate, fontSize: 14 }}>Move a candidate to SOW pending and select Generate SOW to open the compliance hub.</p></Card></div></Scroll>;
  async function gen() { setBusy(true); setErr(false); try { const sys = "You are the Fumana procurement engine acting as Employer of Record. Draft a concise Statement of Work for an enterprise client engaging a vetted builder through Fumana. Fumana is the legal EOR and handles IP assignment and local tax remittance. Return ONLY JSON, no fences. Shape: {\"title\":string,\"scope\":[string],\"deliverables\":[string],\"ip_clause\":string,\"eor_note\":string,\"term\":string}. Keep each line tight. No em dashes. Do not assert specific tax rates."; const out = await callClaude({ system: sys, messages: [{ role: "user", content: `Builder: ${active.handle}, ${active.role}. Monthly USD ${active.monthlyUsd}. Context: ${active.summary}` }], expectJson: true }); setSow(out); } catch (e) { setErr(true); } setBusy(false); }
  return <Scroll><div style={{ maxWidth: 820, margin: "0 auto" }} className="rise">
    <Eyebrow>Legal and compliance hub</Eyebrow><h2 style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 26, margin: "6px 0 4px" }}>Statement of Work for {active.handle}</h2>
    <p style={{ color: T.slate, fontSize: 15, marginBottom: 14 }}>Fumana signs as Employer of Record and assumes local employment liability, tax remittance, and IP assignment.</p>
    <div style={{ marginBottom: 14, display: "inline-flex", alignItems: "center", gap: 8, fontFamily: F.mono, fontSize: 12, color: T.emerald, border: `1px solid ${T.emerald}`, borderRadius: 6, padding: "5px 11px" }}>✓ liability assumed</div>
    {!sow && <div>{busy ? <Spinner label="Compliance agent is drafting the SOW..." /> : <Btn onClick={gen}>Generate localized SOW</Btn>}{err && <div style={{ marginTop: 12, color: T.alert, fontSize: 14, display: "flex", gap: 12, alignItems: "center" }}>Draft did not complete. <Btn kind="ghost" small onClick={gen}>Run again</Btn></div>}</div>}
    {sow && <Card accent={T.brass}><div style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 18 }}>{sow.title}</div><SowList label="Scope" items={sow.scope} /><SowList label="Deliverables" items={sow.deliverables} /><Mini label="IP assignment" body={sow.ip_clause} /><Mini label="Employer of Record" body={sow.eor_note} /><Mini label="Term" body={sow.term} /><div style={{ marginTop: 14 }}><Btn kind="ghost" small onClick={() => setSow(null)}>Redraft</Btn></div></Card>}
  </div></Scroll>;
}
const SowList = ({ label, items }) => <div style={{ marginTop: 12 }}><div style={{ color: T.emerald, fontSize: 12, fontFamily: F.mono, marginBottom: 6 }}>{label}</div><div style={{ display: "grid", gap: 6 }}>{(items || []).map((it, i) => <div key={i} style={{ fontSize: 14, display: "flex", gap: 8 }}><span style={{ color: T.brass }}>.</span><span>{it}</span></div>)}</div></div>;
const Mini = ({ label, body }) => <div style={{ marginTop: 10, background: T.paper, border: `1px solid ${T.line}`, borderRadius: 8, padding: 11 }}><span style={{ color: T.brass, fontSize: 12, fontWeight: 600 }}>{label}. </span><span style={{ color: T.slate, fontSize: 13 }}>{body}</span></div>;

function Finance({ active }) {
  const [statutoryPct, setStatutoryPct] = useState(18); const platformPct = 12;
  const [zuri, setZuri] = useState(""); const [zb, setZb] = useState(false);
  if (!active) return <Scroll><div style={{ maxWidth: 760, margin: "0 auto" }} className="rise"><Card><p style={{ color: T.slate, fontSize: 14 }}>Select a candidate in your pipeline, then open Finance to see the cost breakdown and impact.</p></Card></div></Scroll>;
  const total = active.monthlyUsd || 4500;
  const platform = total * platformPct / 100, statutory = total * statutoryPct / 100, builder = total - platform - statutory;
  const domestic = total * 2.4, ngn = builder * 1550 * 12, retained = ngn * 0.62;
  const rows = [{ k: "Builder net pay", v: builder, c: T.emerald }, { k: "Local statutory remittance", v: statutory, c: T.slate, note: "illustrative, set below, handled per jurisdiction" }, { k: "Fumana platform and infrastructure", v: platform, c: T.brass, note: `${platformPct}% disclosed fee` }];
  async function ask() { setZb(true); try { const sys = "You are Zuri, the Fumana marketplace economist. In three to four plain sentences, advise an employer whether this monthly budget buys strong talent for this role, using purchasing power parity context for the African market. No hype, no em dashes, no invented exact figures."; setZuri(await callClaude({ system: sys, messages: [{ role: "user", content: `Role ${active.role}. Monthly USD ${total}.` }], expectJson: false })); } catch { setZuri("Zuri is unavailable right now."); } setZb(false); }
  return <Scroll><div style={{ maxWidth: 880, margin: "0 auto" }} className="rise">
    <Eyebrow>Financial hub</Eyebrow><h2 style={{ fontFamily: F.disp, fontWeight: 700, fontSize: 26, margin: "6px 0 4px" }}>Where every dollar goes</h2>
    <p style={{ color: T.slate, fontSize: 15, marginBottom: 16 }}>Monthly engagement for {active.handle}. Figures computed from the total, with each assumption shown.</p>
    <div className="split">
      <Card><div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}><Label>Monthly total</Label><span style={{ fontFamily: F.mono, fontSize: 20 }}>{usd(total)}</span></div>
        <div style={{ display: "grid", gap: 1, background: T.line, border: `1px solid ${T.line}`, borderRadius: 8, overflow: "hidden" }}>{rows.map((r, i) => <div key={i} style={{ background: T.surface, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><div style={{ fontSize: 14, color: r.c, fontWeight: 600 }}>{r.k}</div>{r.note && <div style={{ fontFamily: F.mono, fontSize: 10.5, color: T.slate, marginTop: 2 }}>{r.note}</div>}</div><div style={{ fontFamily: F.mono, fontSize: 15, color: r.c }}>{usd(r.v)}</div></div>)}</div>
        <div style={{ marginTop: 14 }}><Label>Illustrative statutory rate: {statutoryPct}%</Label><input aria-label="Statutory rate" type="range" min="0" max="35" value={statutoryPct} onChange={e => setStatutoryPct(Number(e.target.value))} style={{ width: "100%", marginTop: 8, accentColor: T.emerald }} /><div style={{ fontFamily: F.mono, fontSize: 11, color: T.slate, marginTop: 4 }}>An assumption you control. Real remittance is computed per jurisdiction at source.</div></div>
      </Card>
      <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
        <Card accent={T.emerald}><Label>ROI vs domestic hire</Label><div style={{ fontFamily: F.disp, fontWeight: 800, fontSize: 28, color: T.emerald, marginTop: 6 }}>{usd(domestic - total)}</div><div style={{ fontSize: 13, color: T.slate }}>estimated monthly saving against an illustrative domestic equivalent of {usd(domestic)}.</div></Card>
        <Card accent={T.brass}><Label>Impact, settled in the open</Label><div style={{ fontFamily: F.mono, fontSize: 18, color: T.brass, marginTop: 6 }}>NGN {Math.round(retained).toLocaleString()}</div><div style={{ fontSize: 13, color: T.slate }}>annual local capital retained, computed: builder pay × rate × 62% retention.</div><div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>{["SDG 8", "SDG 9", "SDG 17"].map(s => <span key={s} style={{ fontFamily: F.mono, fontSize: 11, color: T.emerald, border: `1px solid ${T.line}`, borderRadius: 4, padding: "2px 7px" }}>{s}</span>)}</div></Card>
        <Card accent={zuri ? T.emerald : T.line}><Label>Zuri . marketplace economist</Label>{!zuri && !zb && <div style={{ marginTop: 10 }}><Btn kind="ghost" small onClick={ask}>Is this budget right</Btn></div>}{zb && <div style={{ marginTop: 12 }}><Spinner label="Zuri is checking the market..." /></div>}{zuri && <p style={{ marginTop: 10, fontSize: 14, lineHeight: 1.6 }}>{zuri}</p>}</Card>
      </div>
    </div>
    <div style={{ height: 30 }} />
  </div></Scroll>;
}

// ============================================================
// SHELL (shared header, role switch, nav)
// ============================================================
function Shell({ role, exit, nav, active, onNav, children }) {
  return <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 24px", borderBottom: `1px solid ${T.line}`, flexWrap: "wrap", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <button onClick={exit} style={{ fontFamily: F.disp, fontWeight: 800, fontSize: 20, letterSpacing: 3, background: "transparent", border: "none", cursor: "pointer", color: T.ink }}>FUMANA</button>
        <span style={{ color: T.slate, fontSize: 12 }}>{role} portal</span>
      </div>
      {nav && <nav style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{nav.map(([k, lbl]) => <button key={k} onClick={() => onNav(k)} style={{ fontFamily: F.body, fontSize: 13.5, fontWeight: active === k ? 600 : 400, cursor: "pointer", background: active === k ? T.surface : "transparent", color: active === k ? T.ink : T.slate, border: `1px solid ${active === k ? T.emerald : T.line}`, borderRadius: 7, padding: "7px 13px" }}>{lbl}</button>)}</nav>}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={exit} style={{ fontFamily: F.mono, fontSize: 11, color: T.slate, background: "transparent", border: `1px solid ${T.line}`, borderRadius: 6, padding: "5px 10px", cursor: "pointer" }}>switch role</button>
        <span style={{ fontFamily: F.mono, fontSize: 11, color: T.emerald }}>Powered by Telos</span>
      </div>
    </div>
    <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
  </div>;
}

// ============================================================
// ROOT
// ============================================================
export default function App() {
  const [view, setView] = useState("landing");
  const [builders, setBuilders] = useState(SEED_BUILDERS);
  const [pipeline, setPipeline] = useState({ shortlisted: [], interviewing: [], sow: [] });
  const addBuilder = b => setBuilders(prev => [b, ...prev]);
  return <div style={{ background: T.paper, minHeight: "100vh", color: T.ink, fontFamily: F.body }}>
    <style>{FONTS}</style>
    <div style={{ maxWidth: 1100, margin: "0 auto", minHeight: "100vh" }}>
      {view === "landing" && <Landing go={setView} />}
      {view === "candidate" && <CandidateApp addBuilder={addBuilder} exit={() => setView("landing")} />}
      {view === "employer" && <EmployerApp builders={builders} pipeline={pipeline} setPipeline={setPipeline} exit={() => setView("landing")} />}
    </div>
  </div>;
}
