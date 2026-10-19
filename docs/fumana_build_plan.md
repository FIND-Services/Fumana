# Fumana build plan

A sequenced plan for the day. Four phases, in order. Each item says what to build, whether it needs a model provider, and where it lives. Hand each phase to Claude Code as its own instruction. Do not skip ahead: the later phases assume the earlier structure exists.

Powered by Telos. Designed by Lexington Advisory Group.

A note on what runs today: no model provider is wired yet, so anything marked NEEDS MODEL is built now but stays inert until a provider is chosen and lights up through the existing `/api/claude` proxy. Everything marked NO MODEL works fully today.

---

## Phase 0: foundation the rest depends on (do first)

These two are structural. Building features on the current top-nav shell means redoing them when the Carbon shell lands, so pay this down first.

1. Carbon shell, shared across both portals. NO MODEL.
   - Replace the top-nav shell with the IBM Carbon dark left side nav plus dark header, for candidate and employer both, one shared shell component.
   - Candidate nav: Growth Dashboard, Applications and Hub, Wallet and Escrow, Community Ecosystem, Experience Alchemist, Upskill and Training, Settings and Comm.
   - Employer nav: Dashboard, Engage Experts, Talent Pipeline, Saved Builders, My Team, Trust and Safety, Investments, Account.
   - Mobile bottom nav, toasts, Zuri dock gated off onboarding and interview.
   - Done when both portals render in the same Carbon shell and nothing else changed behaviorally.

2. Shared network round trip in `src/`. NO MODEL.
   - A shared in-memory store of builders that the candidate side writes to on assessment completion and the employer search reads from.
   - Seed three or four builders so search is never empty.
   - Done when a profile finished on the candidate side appears, masked, in employer search.

---

## Phase 1: things discussed but not built (finish the surface)

Build these on the Carbon shell from Phase 0.

Candidate:
3. Applications and Hub. NO MODEL. Matches, applied roles, interview invites, status per application. Reads the shared store.
4. Wallet and Escrow. NO MODEL for the UI. Balance, escrow held, payout history, payout method placeholders (M-Pesa, Paystack, Flutterwave). All display and computed, flagged that real payments are backend.
5. Community Ecosystem. NO MODEL. Fumana Squads list, peer activity, the impact portfolio and Good Citizen Points as computed counters.
6. Settings and Comm. NO MODEL. Language, notification channels (WhatsApp, SMS, email) as toggles, two-factor placeholder, and the data vault (export, delete) that anchors the data-rights work in Phase 4.
7. Async elevator pitch. NO MODEL. Wire the 60-second recorder that is currently a placeholder, reuse the interview camera capture.

Employer:
8. Rebuild Engage Experts (search) on the real architecture. NO MODEL for ranking (compute fit from the store). Bias-shielded result cards, reveal-and-interview gate that keeps identity hidden until the employer commits.
9. Talent Pipeline. NO MODEL. Kanban: Shortlisted, Interviewing, SOW pending. Cards move across columns.
10. Saved Builders, My Team, Account. NO MODEL. Saved list, seat and role management, company and billing settings.
11. Investments and the fee waterfall. NO MODEL. The transparent cost breakdown (builder pay, statutory remittance as a labelled assumption, Fumana fee) and the impact read (local capital retained, SDG tags), all computed in code.

---

## Phase 2: the ideal-state features (depth your docs promised)

These make it feel like the product in your PRDs.

Candidate:
12. Negotiation coach. NEEDS MODEL. Zuri helps a candidate think through an offer: pay bands, what to ask for, how to phrase it. Behind the proxy, inert until a provider is chosen.
13. Global Worth Simulator. NO MODEL. Given a role and target market, show purchasing-power context and an illustrative local-value view, all computed and clearly labelled illustrative.
14. Experience Alchemist as its own full step. NEEDS MODEL. Already prototyped, make it a first-class screen with save and copy.
15. FIND Squads, functional. NO MODEL. Form or join a squad, shared profile to employers, squad-level pitch.

Employer:
16. Zuri the marketplace economist. NEEDS MODEL. Budget and PPP guidance in the finance hub.
17. SOW generation. NEEDS MODEL. Localized statement of work with EOR and IP language, general and honest, no asserted tax rates.
18. Compliance hub (Trust and Safety, employer view). NO MODEL for the shell. EOR status, liability-assumed marker, per-engagement compliance checklist.

---

## Phase 3: the exceptional layer (the moat)

This is what makes it defensible rather than just featureful. Most needs no model.

19. Score transparency plus. NO MODEL. Beyond the current formula view: show every dimension's evidence, the exact bands, and a plain "why this score" per dimension.
20. Fairness posture, visible. NO MODEL. A page, for both sides, stating how the assessment guards against bias, what is tested, and the known limits. Honest, not marketing.
21. Human-in-the-loop everywhere a decision is made. NO MODEL for the request flow. Any AI decision can be sent to human review, not only opt-out before the fact.
22. Decision audit trail. NO MODEL. Every score, reveal, and status change logged with time and reason, visible to the candidate about themselves.
23. Verifiable impact, employer-facing. NO MODEL. The capital-retained and SDG view an impact investor would want, computed, sourced, labelled.

---

## Phase 4: trust, safety, and AI governance (the license to operate)

Detailed separately below. Build this last because it ties the earlier pieces together, but it is the most important phase for a platform that judges people.

See "Trust and safety and AI governance" section at the end.

---

## Sequencing summary

Phase 0 first, always. Then 1, 2, 3, 4 in order. Within a phase, NO MODEL items can all be built today. NEEDS MODEL items get built today too but stay inert until you pick a provider; they light up together through `/api/claude` with no further wiring.

---

# Trust and safety and AI governance spec

Build for both portals, on the Carbon shell. Almost none of this needs a model. This is Phase 4.

## A. Contest a score (candidate)

The right to challenge an automated decision, made real.

- On the growth dashboard, next to Profile Strength, a control: I want to contest this.
- Flow: pick the dimension, state why in plain words, optionally add context, submit.
- Result state: contest received, a human reviewer will look at this, with a reference and expected timeframe. Stubbed queue in the prototype, flagged.
- The contested dimension shows an "under review" marker until resolved.
- Log the contest in the audit trail.

## B. Human review, everywhere

- Any AI decision surface (score, a reveal recommendation, a match) carries a request human review action, not only the pre-assessment opt-out.
- Same received-and-tracked pattern as contest.

## C. Accommodations (candidate, before and during assessment)

- On the responsible-AI step, an accommodations option: extra time, text instead of camera, a written interview instead of spoken, screen-reader friendly mode.
- Honor them in the interview: text-only path already exists as the fallback, promote it to a chosen accommodation, not just an error state.
- State plainly that accommodations do not lower the bar, they remove barriers to showing real ability.
- This is both an ethics and a legal-risk control: scoring spoken English disadvantages non-native speakers and people with speech differences unless accommodations exist.

## D. Reporting surface (Trust and Safety, both sides)

- A reachable Trust and Safety screen in both portals.
- Report an issue: harassment, unfair pay, a broken commitment, a safety concern, other. Free-text plus category.
- For candidates: report an employer who breached the fair-terms pledge.
- For employers: report a builder or a platform issue.
- Received-and-tracked state, stubbed queue, flagged. Log to the audit trail.

## E. Decision audit trail (candidate, about themselves)

- A view where the candidate sees every consequential event about them: assessment completed, score issued, contested, reviewed, revealed to an employer, application status changes. Time and reason on each.
- This is the transparency backbone the other features write to.

## F. Plain-language ethics and data page (both portals)

One page, reachable from settings and from onboarding, written for a normal person, not lawyers. Sections:

1. How Zuri assesses you, in plain words. Reuse the responsible-AI content.
2. What we collect, why, and how long we keep it.
3. Your rights: see, export, delete, contest, request a human, get accommodations.
4. Bias and fairness: what we do to guard against it, and the honest limits.
5. How your identity is shielded from employers, and when it is revealed.
6. For employers: the fair-terms pledge, what it binds you to, and what breaching it means.
7. Who to contact, and how to report a problem.

Written honestly. No claim we cannot stand behind. Where something is not yet verified across jurisdictions, say general terms, not false specifics.

## G. Guardrails to state, not just build

- No unverified legal claims anywhere in the product. Cross-border data, automated-decision, and labor law across many countries go to counsel, not to copy.
- Numbers are computed in code, never model-generated. Keep that principle visible.
- The model narrates and assesses; it never invents financial or legal fact.

## Done when

- A candidate can contest a score, request human review, choose accommodations, report an issue, and read a plain page explaining all of it.
- An employer can see their obligations, report an issue, and read the same plain page from their side.
- Every consequential decision is logged where the candidate can see it.
- Nothing in the product asserts a legal specific that has not been verified.
