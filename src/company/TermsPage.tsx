import { Database, FileCheck2, Scale, ShieldCheck, UserCheck } from 'lucide-react';
import { PolicyPageLayout, type PolicySection } from './PolicyPageLayout';

const sections: PolicySection[] = [
  { icon: UserCheck, title: 'Use an accurate account', body: 'Provide truthful account, assessment, company, and hiring information. Do not impersonate another person or organisation, share access credentials, or attempt to bypass identity and company checks.' },
  { icon: Scale, title: 'Fair platform conduct', body: 'Do not discriminate, harass, manipulate assessments, scrape private profiles, misuse candidate information, or make misleading employment promises. Employers must honour the fair terms presented during an engagement.' },
  { icon: FileCheck2, title: 'Assessments are decision support', body: 'Telos scores and Zuri guidance support human decisions; they are not guarantees of employment or performance. Candidates may question a score and employers remain responsible for lawful, fair hiring decisions.' },
  { icon: Database, title: 'Your content and data', body: 'You keep responsibility for information you submit. You allow Fumana to process it only as needed to provide matching, assessment, profile, safety, and account services described in the product and privacy notice.' },
  { icon: ShieldCheck, title: 'Account action', body: 'Fumana may restrict or close accounts that threaten users, platform security, assessment integrity, or fair hiring. You may sign out or request account deletion from your settings.' },
];

export function TermsPage() {
  return <PolicyPageLayout eyebrow="Company policies" title="Terms of use" intro="These terms explain the basic rules for using Fumana as a candidate, employer, or authorised reviewer." sections={sections} />;
}
