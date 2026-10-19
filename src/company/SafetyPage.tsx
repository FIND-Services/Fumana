import { BadgeCheck, Database, EyeOff, FileCheck2, ShieldCheck, UserCheck } from 'lucide-react';
import { PolicyPageLayout, type PolicySection } from './PolicyPageLayout';

const sections: PolicySection[] = [
  { icon: EyeOff, title: 'Identity shielding', body: 'Candidate identities stay masked while employers explore the talent network. Personal identity is revealed only at the appropriate interview stage, reducing snap judgements before evidence is reviewed.' },
  { icon: FileCheck2, title: 'Explainable assessment', body: 'Candidates can see their six assessment dimensions, the scoring formula, supporting rationale, and the answers used. A candidate may contest a result or request a human review.' },
  { icon: UserCheck, title: 'Candidate control', body: 'Candidates can choose written or text-only accommodations, decline the AI interview, ask for a person to assess them, export their information, report conduct, or delete their account data.' },
  { icon: BadgeCheck, title: 'Employer accountability', body: 'Employers are measured for Africa hiring readiness and agree to fair terms. Their pipeline records interview and engagement decisions, while reports of broken commitments or harassment go to a human review queue.' },
  { icon: Database, title: 'Private information boundaries', body: 'Raw assessment transcripts, experience notes, CVs, and uploaded media are stored separately from the public talent profile. Database access rules restrict private records to their owner and authorised workflows.' },
  { icon: ShieldCheck, title: 'Human escalation', body: 'Safety reports and assessment disputes are not decided by an automated chat response. They enter a review queue where a person can investigate, add a resolution, and close the case.' },
];

export function SafetyPage() {
  return <PolicyPageLayout eyebrow="Trust centre" title="Safety is built into every introduction." intro="Fumana helps candidates show their ability without giving away more personal information than a hiring decision needs. Employers get evidence, clear commitments, and a human route when something needs review." sections={sections} />;
}
