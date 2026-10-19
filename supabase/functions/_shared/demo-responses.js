// Canonical demo-mode responses for both local Vite middleware and the
// deployed Supabase llm-proxy. Keep every response aligned with the JSON or
// plain-text contract expected by src/App.jsx.

function lastUserText(messages) {
  const message = [...(messages || [])].reverse().find(item => item?.role === "user");
  return String(message?.content || "");
}

function hash(text) {
  let value = 0;
  for (const char of String(text || "")) value = ((value * 31) + char.charCodeAt(0)) >>> 0;
  return value;
}

function pick(items, seed) {
  return items[hash(seed) % items.length];
}

const CV_INTERVIEW_QUESTIONS = [
  "Start with your most recent work, paid or unpaid. What were you responsible for, and who benefited from it?",
  "What tools, technologies, or practical methods did you use most often in that work?",
  "Tell me about one result you are proud of. What changed because of what you did?",
  "What did you study formally, teach yourself, or learn through apprenticeships and community work?",
  "Which languages do you use professionally, and how comfortable are you communicating in each one?",
  "Was there any recognition, promotion, difficult problem, or extra responsibility that should appear on your CV?",
  "Think about work outside a formal job title. Have you freelanced, volunteered, mentored, built a personal project, or helped a family business?",
  "Is there anything important about your experience that employers often miss when they first read your CV?",
];

const ASSESSMENT_QUESTIONS = [
  "Describe the hardest technical problem you solved recently. How did you isolate the cause, and what changed after your fix?",
  "Tell me about a time you explained a technical decision to someone without your background. How did you check that they understood?",
  "Walk me through how you keep a teammate in another time zone unblocked while you are offline.",
  "Tell me about a commitment that became difficult to meet. How did you communicate it, and what did you do next?",
  "Describe a disagreement during review or delivery. How did you protect the working relationship while resolving the issue?",
  "Tell me about a task with unclear instructions. How did you reduce the uncertainty before committing to a solution?",
  "Give an example of feedback that changed how you work. What did you apply afterward?",
  "Describe a production issue where your first theory was wrong. What evidence changed your mind?",
  "Tell me about a handoff that went especially well or badly. What made the difference?",
  "When priorities compete, how do you decide what to finish, what to defer, and what to communicate?",
  "Describe a time you helped a less-experienced teammate succeed without taking over their work.",
  "Tell me about a decision you documented for people who would read it later. What did you include and why?",
];

const SCORING_VARIANTS = [
  [
    ["Technical depth", 78, "The examples show sound production debugging and a methodical approach to finding root causes."],
    ["Communication clarity", 71, "The answers are structured and understandable, though some could reach the main point sooner."],
    ["Async and remote readiness", 84, "The candidate describes proactive status sharing, written handoffs, and attention to time-zone gaps."],
    ["Professionalism", 76, "The tone remains measured and solution-focused when discussing disagreement and delivery pressure."],
    ["Collaboration", 69, "There is credible review experience, but fewer concrete examples of mentoring or shared ownership."],
    ["Problem solving", 82, "The candidate reduces ambiguity, tests assumptions, and uses evidence before committing to a fix."],
  ],
  [
    ["Technical depth", 72, "The candidate demonstrates practical delivery experience, with room to explain deeper design tradeoffs."],
    ["Communication clarity", 80, "The answers use concrete context, action, and result with little unnecessary detail."],
    ["Async and remote readiness", 77, "The candidate understands written updates and handoffs but gives limited evidence of sustained remote work."],
    ["Professionalism", 81, "The examples show accountability, calm escalation, and respect for commitments."],
    ["Collaboration", 75, "The candidate gives useful examples of review, feedback, and helping teammates move forward."],
    ["Problem solving", 74, "The reasoning is sensible, though the evidence could show more explicit validation and measurement."],
  ],
  [
    ["Technical depth", 85, "The candidate explains a difficult system problem with specific evidence, constraints, and corrective action."],
    ["Communication clarity", 74, "The substance is strong, but a few answers need a clearer headline before the supporting detail."],
    ["Async and remote readiness", 73, "The candidate has workable remote habits but could make blockers and ownership more visible in writing."],
    ["Professionalism", 79, "The candidate takes responsibility and communicates changes without blaming others."],
    ["Collaboration", 82, "The examples show thoughtful review, knowledge sharing, and respect for different viewpoints."],
    ["Problem solving", 86, "The candidate separates symptoms from causes and changes direction when the evidence does not fit."],
  ],
];

const CV_VARIANTS = [
  {
    personal_statement: "Backend engineer with production experience building payment reconciliation and resilient queue systems, with a strong focus on data integrity under real network conditions.",
    skills: ["Python", "PostgreSQL", "Distributed systems", "Queue reliability", "API design"],
    experience: [
      { role: "Backend Engineer", organisation: "Lagos fintech", period: "2021 to present", outcomes: ["Built payment reconciliation that reduced manual corrections", "Hardened a job queue against network-loss failures"] },
      { role: "Software Developer", organisation: "Freelance and community projects", period: "2019 to 2021", outcomes: ["Delivered internal tools for small businesses", "Mentored two self-taught developers"] },
    ],
    education: ["BSc Computer Science"],
    tools: ["Python", "PostgreSQL", "Docker", "Git"],
    languages: ["English", "Yoruba"],
    integrity_note: "Every line was drawn only from what the candidate said, and nothing was invented.",
  },
  {
    personal_statement: "Product-minded software engineer experienced in shipping web applications, improving delivery workflows, and supporting teammates across distributed projects.",
    skills: ["JavaScript", "React", "API integration", "Testing", "Technical communication"],
    experience: [
      { role: "Software Engineer", organisation: "Digital services team", period: "2022 to present", outcomes: ["Delivered customer-facing workflow improvements", "Reduced repeated support work through clearer tooling and documentation"] },
    ],
    education: ["Self-directed software development training"],
    tools: ["JavaScript", "React", "Git", "REST APIs"],
    languages: ["English"],
    integrity_note: "Every line was drawn only from what the candidate said, and nothing was invented.",
  },
];

const ALCHEMIST_VARIANTS = [
  {
    role: "Backend Engineer",
    headline: "Payments-focused backend engineer who builds resilient services for real operating conditions.",
    outcomes: [
      "Built payment reconciliation that reduced manual corrections, based on ownership of the reconciliation flow.",
      "Hardened a job queue for network-loss recovery, based on debugging failures under unreliable connectivity.",
      "Supported junior developers through review and practical mentoring.",
    ],
    skills: ["Python", "PostgreSQL", "Distributed systems", "Queue reliability", "API design", "Technical mentoring"],
    integrityNote: "Each outcome is grounded only in the supplied experience, and nothing was added beyond it.",
  },
  {
    role: "Software Engineer",
    headline: "Delivery-focused software engineer who turns unclear requirements into maintainable product improvements.",
    outcomes: [
      "Translated loosely defined requests into scoped deliverables with clear acceptance points.",
      "Improved team handoffs through written implementation notes and visible progress updates.",
      "Resolved recurring defects by tracing their underlying workflow rather than patching symptoms.",
    ],
    skills: ["Requirements analysis", "Web development", "Debugging", "Documentation", "Collaboration", "Delivery planning"],
    integrityNote: "Each outcome is grounded only in the supplied experience, and nothing was added beyond it.",
  },
];

const COACH_VARIANTS = [
  {
    band: { low: 3800, mid: 4800, high: 6000 },
    askFor: ["A written scope and milestone schedule", "A mid-point compensation review tied to agreed outcomes", "Coverage for required tools and training"],
    phrasing: "Thank you for the offer. Based on the scope and my production experience, I was expecting a figure closer to the middle of the market range. Can we review that together?",
    note: "Illustrative guidance only, not a quote or guarantee.",
  },
  {
    band: { low: 2800, mid: 3800, high: 5000 },
    askFor: ["Clear ownership boundaries", "A written review point after the first three months", "The equipment and connectivity budget needed for reliable delivery"],
    phrasing: "I am interested in the role. Considering the responsibilities and expected ownership, could we discuss moving the monthly figure closer to the middle of the range?",
    note: "Illustrative guidance only, not a quote or guarantee.",
  },
];

const SOW_VARIANTS = [
  {
    title: "Statement of Work: Backend engineering engagement",
    scope: ["Design and maintain agreed backend services", "Own reliability and data integrity for assigned components"],
    deliverables: ["Production-ready services with tests and documentation", "Weekly written status updates and a monthly delivery review"],
    ip_clause: "Work product created within the engagement is assigned to Fumana as IP custodian and licensed to the client under the agreed terms.",
    eor_note: "Fumana acts as Employer of Record and manages applicable local employment administration and remittance.",
    term: "Rolling monthly engagement with 30 days written notice by either party.",
  },
  {
    title: "Statement of Work: Product engineering engagement",
    scope: ["Deliver agreed product improvements from reviewed requirements", "Maintain implementation quality, documentation, and handoff readiness"],
    deliverables: ["Completed milestones accepted against written criteria", "Documented decisions, tests, and operational handoff notes"],
    ip_clause: "Engagement work product is held by Fumana as IP custodian and licensed to the client according to the governing agreement.",
    eor_note: "Fumana serves as Employer of Record and handles relevant local employment administration without asserting jurisdiction-specific rates here.",
    term: "Initial three-month term, renewable by written agreement, with the notice provisions in the governing agreement.",
  },
];

const ECONOMICS_RESPONSES = [
  "The budget appears competitive for many experienced African professionals in this role, although the real position depends on seniority and location. In purchasing-power terms it can support a strong professional standard of living in several major hubs. The employer should still compare the offer with current local costs and the level of ownership expected.",
  "This budget sits within a credible cross-border range for the role rather than reading as obviously underpriced. Its local purchasing power may be stronger than the same nominal comparison suggests, but housing, imported goods, and city-level costs vary widely. Treat the range as context and validate it with the builder before finalising terms.",
  "The figure can be attractive in parts of the African talent market when the scope and benefits are proportionate. Purchasing power is likely to differ materially by city and by exposure to imported costs. The honest next step is to test the budget against the actual responsibilities, local expenses, and retention expectations.",
];

const TRAJECTORY_RESPONSES = [
  "Communication clarity is the highest-leverage move because it carries meaningful weight and currently trails the stronger dimensions. Improving how quickly the candidate states context, action, and result should lift the composite more efficiently than polishing an already strong area.",
  "Async and remote readiness is the best next intervention because the score leaves visible room for improvement in a heavily used workplace skill. Stronger written handoffs, blocker updates, and ownership signals would improve both the measured dimension and day-to-day employer confidence.",
  "Collaboration is the clearest leverage point because the technical foundation is already stronger than the evidence of shared delivery. Adding consistent review, mentoring, and disagreement-resolution habits should improve the weakest part of the profile without overstating technical growth.",
];

const CULTURE_RESPONSES = [
  "The strongest instinct is proactive async communication: status and blockers are shared before someone has to ask. The area to sharpen is responding to direct review comments without reading brevity as hostility.",
  "The strongest instinct is taking ownership when instructions are incomplete. The area to sharpen is making disagreement explicit earlier, with a short written recommendation and the tradeoff behind it.",
  "The strongest instinct is keeping colleagues informed across time zones. The area to sharpen is separating urgent issues from normal updates so the team can act without unnecessary escalation.",
];

const COPILOT_RESPONSES = [
  "Your most useful next move is to turn one strong project into a short evidence-based case study. State the problem, your decision, and the measurable result, then use that same structure in interviews and your profile.",
  "Focus this week on your weakest assessment dimension instead of adding another broad skill. Complete one targeted module, practise one concrete example, and then retake the assessment so the improvement is visible.",
  "Make your remote-work evidence easier to trust. Write one example showing how you communicated a blocker, handed work across time zones, and kept delivery moving while you were offline.",
  "Strengthen the proof behind your technical claims. Pick one difficult bug or design decision and document the evidence you gathered, the alternatives you rejected, and the result.",
];

const ECON_FX_RESPONSES = [
  "The employer's USD cost is unchanged because the engagement is denominated in dollars; what changes is the local-currency value and the retained capital derived from it. A weaker local currency may increase near-term purchasing power for the builder, though imported costs can rise quickly. The honest caveat is that exchange-rate movement does not affect every household expense at the same speed.",
  "The contract budget remains stable in USD while its local equivalent moves with the exchange rate. That can improve or reduce local purchasing power depending on direction, location, and exposure to imported goods. Retained-capital figures should therefore be refreshed at payment time rather than treated as permanent.",
];

const COMP_FX_RESPONSES = [
  "The employer's contractual obligation remains the agreed USD amount. Local remittance values can be recalculated using the applicable rate at payment time, while the underlying term stays unchanged. An exchange-rate move alone does not require redrafting unless the agreement contains a specific adjustment clause.",
  "Because the engagement is denominated in USD, the employer obligation does not change solely because the local currency moved. Local payroll and remittance amounts may adjust when converted at payment time. Review the contract only if its existing currency or review clauses require a formal update.",
];

export function demoText(system, messages) {
  const lo = String(system || "").toLowerCase();
  const user = lastUserText(messages);
  const seed = `${system}\n${user}`;

  if ((lo.includes("currency") || lo.includes("devaluat") || lo.includes("exchange rate")) && lo.includes("economics agent")) return pick(ECON_FX_RESPONSES, seed);
  if ((lo.includes("currency") || lo.includes("devaluat") || lo.includes("exchange rate")) && lo.includes("compliance agent")) return pick(COMP_FX_RESPONSES, seed);

  if (lo.includes("scoring model") || lo.includes("score six dimensions")) {
    const dimensions = pick(SCORING_VARIANTS, seed).map(([name, score, rationale]) => ({ name, score, rationale }));
    return JSON.stringify({ dimensions });
  }

  if (lo.includes("ingestion agent") || lo.includes("curriculum")) return JSON.stringify(pick(CV_VARIANTS, seed));

  if (lo.includes("generate") && lo.includes("behavioral interview questions")) {
    const total = Math.max(1, Number((/generate\s+(\d+)/i.exec(system) || [])[1] || 6));
    const offset = hash(user) % ASSESSMENT_QUESTIONS.length;
    const questions = Array.from({ length: total }, (_, index) => ASSESSMENT_QUESTIONS[(offset + index) % ASSESSMENT_QUESTIONS.length]);
    return JSON.stringify({ questions });
  }

  if (lo.includes("interviewer inside fumana") && lo.includes("next behavioral question")) {
    return JSON.stringify({ question: pick(ASSESSMENT_QUESTIONS, seed) });
  }

  if ((lo.includes("you are zuri") && lo.includes("build a cv")) || lo.includes("warm, patient interview")) {
    const asked = Number((/asked\s+(\d+)/i.exec(user) || [])[1] || 0);
    return JSON.stringify({ question: CV_INTERVIEW_QUESTIONS[asked % CV_INTERVIEW_QUESTIONS.length], done: asked >= 6 });
  }

  if (lo.includes("alchemist") || lo.includes("transmute") || lo.includes("ats")) return JSON.stringify(pick(ALCHEMIST_VARIANTS, seed));
  if (lo.includes("negotiation") || lo.includes("pay band")) return JSON.stringify(pick(COACH_VARIANTS, seed));
  if (lo.includes("statement of work") || lo.includes("compliance agent")) return JSON.stringify(pick(SOW_VARIANTS, seed));
  if (lo.includes("trajectory") || lo.includes("highest-leverage")) return pick(TRAJECTORY_RESPONSES, seed);
  if (lo.includes("culture shock") || lo.includes("communication readiness")) return pick(CULTURE_RESPONSES, seed);
  if (lo.includes("economist") || lo.includes("economics agent") || lo.includes("ppp") || lo.includes("purchasing power") || lo.includes("budget")) return pick(ECONOMICS_RESPONSES, seed);
  return pick(COPILOT_RESPONSES, seed);
}
