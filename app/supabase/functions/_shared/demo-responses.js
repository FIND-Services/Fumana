// Demo-mode pre-built responses for POST /api/claude.
//
// When DEMO_MODE=true, the proxy returns these instead of calling any provider,
// so the whole app is live with no API key. Each response is the { text } string
// the app expects: JSON-stringified for the JSON features, plain text otherwise.
// Routing is by system-prompt content, most specific first.

// The five fixed interview questions already in the app (INTERVIEW_SCRIPT).
const INTERVIEW_QUESTIONS = [
  "Tell me about a time you had to explain something technical to someone who did not share your background. How did you make sure they understood?",
  "Tell me about a time you disagreed with a manager or a client about how something should be done. What did you do?",
  "Walk me through how you keep a teammate in another country unblocked when you are offline for several hours.",
  "Tell me about a time you were given a task without clear instructions. How did you decide what to build?",
  "Describe the hardest technical problem you have solved. How did you find the root cause, and what did you change?",
];

// (2) Scoring: the exact JSON specified for demo mode.
const SCORING = '{"dimensions":[{"name":"Technical depth","score":78,"rationale":"Demonstrated solid production experience with a specific debugging case that showed systematic root-cause analysis."},{"name":"Communication clarity","score":71,"rationale":"Responses were structured and direct, though some answers could be more concise under time pressure."},{"name":"Async and remote readiness","score":84,"rationale":"Showed clear understanding of async communication patterns and proactive status sharing across time zones."},{"name":"Professionalism","score":76,"rationale":"Tone was consistently measured and solution-focused, including when describing a disagreement with a manager."},{"name":"Collaboration","score":69,"rationale":"Evidence of code review participation but limited examples of proactive knowledge sharing with junior team members."},{"name":"Problem solving","score":82,"rationale":"Methodical approach to ambiguity with a clear example of scoping down before building."}],"marketability":"This builder presents well for mid-to-senior remote engineering roles with European or North American teams. Communication style is professional and direct.","recommendations":["Run the Culture Shock Simulator to sharpen your async update pattern before your first enterprise interview.","Add one specific collaboration example to your profile, ideally a code review or a mentoring moment.","Your problem solving score is strong. Document it in the Experience Alchemist so employers can see the reasoning, not just the outcome."]}';

// (4) CV Builder extraction.
const CV = JSON.stringify({
  personal_statement: "Backend engineer with production experience building payment reconciliation and resilient queue systems for a Lagos fintech, strong on data integrity under real network conditions.",
  skills: ["Python", "PostgreSQL", "Distributed systems", "Queue reliability", "API design"],
  experience: [
    { role: "Backend Engineer", organisation: "Lagos fintech", period: "2021 to present", outcomes: ["Built payment reconciliation that cut manual corrections", "Hardened the job queue for network-loss recovery"] },
    { role: "Software Developer", organisation: "Freelance and community projects", period: "2019 to 2021", outcomes: ["Delivered internal tools for small businesses", "Mentored two self-taught developers into their first roles"] },
  ],
  education: ["BSc Computer Science"],
  tools: ["Python", "PostgreSQL", "Docker", "Git"],
  languages: ["English", "Yoruba"],
  integrity_note: "Every line in this document was drawn only from what you said in this interview. Nothing was inferred or invented.",
});

// (3) Experience Alchemist.
const ALCHEMIST = JSON.stringify({
  role: "Backend Engineer",
  headline: "Payments-focused backend engineer who ships resilient systems on real infrastructure.",
  outcomes: [
    "Built payment reconciliation that reduced manual corrections, based on your account of owning the reconciliation flow end to end.",
    "Hardened a job queue for network-loss recovery, based on your description of debugging queue failures under poor connectivity.",
    "Mentored two self-taught developers into their first roles, based on your note about supporting junior peers.",
  ],
  skills: ["Python", "PostgreSQL", "Distributed systems", "Queue reliability", "API design"],
  integrityNote: "Each outcome is grounded only in what you wrote. Nothing was added beyond your description.",
});

// (5) Negotiation Coach.
const COACH = JSON.stringify({
  band: { low: 3800, mid: 4800, high: 6000 },
  askFor: [
    "A written scope and a clear milestone schedule before you start.",
    "A mid-point review tied to a small rate step-up if you are meeting the bar.",
    "Coverage of the tools and any certification the role expects.",
  ],
  phrasing: "Thank you for the offer. Based on the scope and my experience with production payment systems, I was expecting a figure closer to the mid four thousands. Can we look at that?",
  note: "Illustrative guidance based on typical ranges for this role and region. You decide.",
});

// (11) Beat 4 currency move: the two Telos agents narrate the re-derivation,
// one plain-text paragraph each. Routed on "currency" plus the agent name,
// checked before the generic economist and SOW matches below.
const ECON_FX = "Because the engagement is denominated in USD, the employer's dollar cost is unchanged by the move; what moved is the local-currency value of that budget and the retained capital derived from it. In purchasing-power terms a weaker naira lets the builder's pay stretch further locally, though unevenly because imported goods reprice quickly; a stronger naira does the reverse. The honest read: the dollar budget is stable, it is the local value of that budget that moved.";
const COMP_FX = "The Statement of Work is denominated in USD, so the employer's contractual obligation does not change with the currency move. Statutory remittance is computed at source in local currency, so local-currency amounts adjust at payment time under the existing terms. No term needs to be redrafted for an FX move alone; any change would follow the engagement's review clause.";

// (7) SOW generation.
const SOW = JSON.stringify({
  title: "Statement of Work: Senior Backend Engineer engagement",
  scope: ["Design and maintain backend services for the client's platform", "Own data integrity and reliability for the assigned services"],
  deliverables: ["Production-ready services with tests and documentation", "Weekly written status updates and a monthly review"],
  ip_clause: "All work product is assigned to Fumana as IP custodian and licensed to the client under the engagement terms.",
  eor_note: "Fumana acts as the legal Employer of Record and assumes local employment liability and tax remittance for the builder.",
  term: "Rolling monthly engagement; either party may end it with 30 days written notice.",
});

export function demoText(system, messages) {
  const lo = (system || "").toLowerCase();
  const lastUser = [...(messages || [])].reverse().find(m => m && m.role === "user");
  const userContent = lastUser ? String(lastUser.content || "") : "";

  // (11) Beat 4 currency-move narrations. Checked first: these prompts also
  // contain "economics agent" / "compliance agent", which would otherwise fall
  // into the generic economist and SOW branches below.
  if ((lo.includes("currency") || lo.includes("devaluat") || lo.includes("exchange rate")) && lo.includes("economics agent")) return ECON_FX;
  if ((lo.includes("currency") || lo.includes("devaluat") || lo.includes("exchange rate")) && lo.includes("compliance agent")) return COMP_FX;
  // (2) Scoring
  if (lo.includes("scoring model") || lo.includes("score six dimensions")) return SCORING;
  // (4) CV Builder extraction (before the interview match: extraction is not "You are Zuri")
  if (lo.includes("ingestion agent") || lo.includes("curriculum")) return CV;
  // (1) Interview questions (adaptive CV interview): rotate the five fixed questions
  if (lo.includes("you are zuri") && lo.includes("interview")) {
    const asked = Number((/asked (\d+)/i.exec(userContent) || [])[1] || 0);
    return JSON.stringify({ question: INTERVIEW_QUESTIONS[asked % INTERVIEW_QUESTIONS.length], done: asked >= 5 });
  }
  // (3) Experience Alchemist
  if (lo.includes("alchemist") || lo.includes("transmute") || lo.includes("ats")) return ALCHEMIST;
  // (5) Negotiation Coach
  if (lo.includes("negotiation") || lo.includes("pay band")) return COACH;
  // (6) Zuri economist: two sentences of PPP-aware market context
  if (lo.includes("economist") || lo.includes("economics agent") || lo.includes("ppp") || lo.includes("purchasing power") || lo.includes("budget")) {
    return "For this role, the monthly figure sits at the competitive end of the African talent market and clears local cost of living in most major hubs with room to spare. In purchasing-power terms it buys a strong professional standard of living, so the budget reads as fair rather than underpriced.";
  }
  // (7) SOW generation
  if (lo.includes("statement of work") || lo.includes("compliance agent")) return SOW;
  // (8) Trajectory Forecast narrative
  if (lo.includes("trajectory") || lo.includes("highest-leverage")) {
    return "Communication clarity is your highest-leverage move right now: it carries a heavy weight in the formula and sits below your other scores, so a focused push there lifts your composite more than an equal gain anywhere else. Taking that one dimension to 75 is projected to add several points to your Profile Strength.";
  }
  // (9) Culture Shock Simulator completion
  if (lo.includes("culture shock") || lo.includes("communication readiness")) {
    return "Your strongest instinct is proactive async communication: you share status and blockers before being asked. The area to sharpen is engaging fully with critical code review, treating terse feedback as normal and replying to each comment.";
  }
  // (10) Copilot and career coach: warm, specific two sentences, tier-aware
  const tier = (/(top 1%|gold|silver|bronze)/i.exec(userContent) || [])[1] || "your current tier";
  return `You are within reach of the next level from ${tier}, and the fastest lever is one focused upskilling module on your weakest dimension. Finish it this week, then re-run your assessment to watch the score move.`;
}
