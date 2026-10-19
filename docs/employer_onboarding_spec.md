# Employer onboarding spec

Build the employer side in `src/` on the same IBM Carbon shell and Fumana palette as the candidate portal. This spec covers onboarding only: welcome, auth, company-info, alignment. Then land in the employer app shell.

Powered by Telos. Designed by Lexington Advisory Group.

---

## Shell and routing

- Same dark header, left side nav, mobile bottom nav, toasts, and Zuri copilot dock as the candidate portal.
- Employer sidebar nav (build the shell now, screens can be stubs except where noted): Dashboard, Engage Experts, Talent Pipeline, Saved Builders, My Team, Trust and Safety, Investments, Account.
- Onboarding screens do not show the Zuri dock, same gating rule as the candidate side.
- Route order: `welcome` → `auth` → `company-info` → `alignment` → app (`dashboard`).
- Hold onboarding state in a `company` object at the shell, same pattern as the candidate `profile` object.

## Carbon and brand

- IBM Plex Sans and Plex Mono. Square corners. Bordered tiles, no soft shadows.
- Palette: paper `#F2F4F7`, surface `#FFFFFF`, ink `#0C1A26`, slate `#5E6E7A`, emerald `#066E5A` as the one accent, brass `#B08A2E` on verification only, alert `#A8431F`.
- Every button, input, and tile matches the candidate portal components. Reuse them.

---

## Screen 1: welcome

- Headline: hire verified African talent with the risk carried for you.
- One short line: search by evidence, not keywords, with identity shielded until you commit.
- Primary button: get started, advances to auth.

## Screen 2: auth

- Enterprise SSO only: Continue with Google Workspace, Continue with Microsoft Entra ID.
- Stubbed at the UI layer, flagged in small mono text that real OIDC and SAML are a backend step.
- Advances to company-info.

## Screen 3: company-info (employer profile creation)

Bordered tile form. Fields:

- Company name (required)
- Work email domain (required), helper text: used to verify your organization
- Industry (required)
- Company size (select: 1 to 50, 51 to 200, 201 to 1000, 1000 plus)
- Headquarters country
- Short description of what the team is hiring for (textarea, optional)

Gating: name, domain, and industry required. Disabled continue shows a one-line reason. Back returns to auth.

## Screen 4: alignment (the fair-terms pledge)

This is the employer committing to worker protections. Framed as protections the employer signs, not surveillance of the worker.

Intro line: Fumana matches you with shielded builders. In return, you commit to fair terms. These protect the builder and keep the network trusted.

Three commitments, each a bordered tile the employer toggles on, all three required to continue:

1. Fair pay. I will pay within a fair band for the role and region, not below local market for equivalent skill.
2. Reasonable hours. I will agree a working-hours and timezone-overlap expectation, not round-the-clock availability.
3. No covert monitoring. I will not covertly monitor or surveil the builder. Any work tracking is agreed and visible to them.

Each tile: bold title, one-line plain description, a checkbox or toggle that turns the left border emerald when on.

Below the three: a single confirm line, I agree to these terms as a condition of using Fumana, and a primary button, enter Fumana, disabled until all three are on. Disabled state shows: accept all three commitments to continue.

Back returns to company-info. On continue, land on the employer dashboard.

---

## After onboarding

- Land on `dashboard`. A simple Carbon dashboard tile is fine for now: company name, a welcome line, and a primary button to Engage Experts.
- Leave Engage Experts, Talent Pipeline, Saved Builders, My Team, Trust and Safety, Investments, and Account as clean stub screens with accurate one-line descriptions. We build them next, in order.

## Model calls

- None in onboarding. Do not wire any provider here.
- Later screens that need a model (Zuri economist, SOW draft) go through the same `/api/claude` proxy seam, unset for now.

## Done when

- A user can move welcome to auth to company-info to alignment to dashboard.
- All three alignment commitments are required, and the gating explains itself.
- Carbon shell, Fumana palette, Zuri dock gated off during onboarding.
- Responsive: forms and tiles collapse to one column on mobile.
