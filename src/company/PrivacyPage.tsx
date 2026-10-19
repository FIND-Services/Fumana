import { Database, EyeOff, FileCheck2, ShieldCheck, UserCheck } from 'lucide-react';
import { PolicyPageLayout, type PolicySection } from './PolicyPageLayout';

const sections: PolicySection[] = [
  { icon: Database, title: 'Information we process', body: 'This may include account details, candidate experience and assessment answers, generated scores, CV and media uploads, employer organisation details, pipeline activity, safety reports, and a limited audit history.' },
  { icon: FileCheck2, title: 'Why it is used', body: 'Information is used to authenticate accounts, operate assessments, build candidate profiles, perform matching, support hiring workflows, improve skills guidance, prevent abuse, and respond to disputes or data requests.' },
  { icon: EyeOff, title: 'What employers see', body: 'Employers first see a masked professional profile. Private documents and raw assessment material are not part of the public talent pool. Identity is revealed only through the controlled hiring workflow.' },
  { icon: ShieldCheck, title: 'How it is protected', body: 'Fumana uses authenticated sessions, owner-based database permissions, private storage boundaries, and server-side provider credentials. No security system is perfect, so access is kept to what each workflow needs.' },
  { icon: UserCheck, title: 'Your choices', body: 'You can review profile information, request human assessment review, contest a score, access the data controls in Settings, and request deletion. Signing out ends the active browser session.' },
];

export function PrivacyPage() {
  return <PolicyPageLayout eyebrow="Company policies" title="Privacy notice" intro="This notice describes the information Fumana uses, why it is needed, and the controls available to candidates and employers." sections={sections} />;
}
