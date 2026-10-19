import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { getCalApi } from '@calcom/embed-react';
import {
  BrainCircuit, LineChart, Shield, Calculator, BookOpen, Briefcase,
  Search, ArrowRight, ArrowUpRight, Check, AlertTriangle, BadgeCheck, ChevronDown, X,
} from 'lucide-react';
import { BrandHome, SignInPortalDialog } from './Auth';
import { CONTACT_URL, apiHeaders } from './lib/backend';
import { showOpenFeedbackSurvey } from './lib/posthog';
import {
  architectureCardVariants,
  heroContainerVariants,
  heroItemVariants,
  modalBackdropVariants,
  modalPanelVariants,
  profileSwapVariants,
  sectionRevealVariants,
  staggerContainerVariants,
  staggerItemVariants,
} from './motion';

// Fumana marketing entry point: landing -> role selection -> auth form.
// Tailwind-styled and kept separate from the inline-styled app shell.

// --- LANDING PAGE ---
export function LandingPage({
  onSignInClick,
  onPlacementClick,
}: {
  onSignInClick: (role: 'builder' | 'employer') => void;
  onPlacementClick: () => void;
}) {
  const profiles = [
    {
      id: 'amara', name: 'Amara K.', location: 'LOS-NGA', match: 94, tier: 'Top 1%', salary: '$40K-$50K',
      metrics: [
        { label: 'Intl. Readiness (30% WT)', value: 96 },
        { label: 'Skills Match (25% WT)', value: 92 },
        { label: 'Growth Potential (20% WT)', value: 98 },
      ],
    },
    {
      id: 'james', name: 'James A.', location: 'NBO-KEN', match: 89, tier: 'Gold', salary: '$36K-$46K',
      metrics: [
        { label: 'Intl. Readiness (30% WT)', value: 91 },
        { label: 'Skills Match (25% WT)', value: 88 },
        { label: 'Growth Potential (20% WT)', value: 93 },
      ],
    },
  ];
  const [selectedProfile, setSelectedProfile] = useState(profiles[0]);
  const [rolePickerOpen, setRolePickerOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactMenuOpen, setContactMenuOpen] = useState(false);
  const [policiesOpen, setPoliciesOpen] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState('');
  const [highlightedCard, setHighlightedCard] = useState('');
  const highlightTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (highlightTimer.current) window.clearTimeout(highlightTimer.current);
  }, []);

  useEffect(() => {
    void (async () => {
      const cal = await getCalApi({ namespace: 'book-a-demo' });
      cal('ui', {
        cssVarsPerTheme: { light: { 'cal-brand': '#066E5A' }, dark: { 'cal-brand': '#066E5A' } },
        hideEventTypeDetails: false,
        layout: 'month_view',
      });
    })();
  }, []);

  const highlightFromNav = (id: string) => {
    setHighlightedCard(id);
    if (highlightTimer.current) window.clearTimeout(highlightTimer.current);
    highlightTimer.current = window.setTimeout(() => setHighlightedCard(''), 3000);
  };
  const signalPulse = (id: string) => ({
    animate: highlightedCard === id
      ? {
          scale: [1, 1.018, 1.006, 1.018, 1],
          boxShadow: ['0 0 0 0 rgba(6,110,90,0)', '0 0 0 7px rgba(6,110,90,.22)', '0 0 0 2px rgba(6,110,90,.1)', '0 0 0 7px rgba(6,110,90,.18)', '0 0 0 0 rgba(6,110,90,0)'],
          borderColor: ['#D7DEE3', '#066E5A', '#066E5A', '#066E5A', '#D7DEE3'],
        }
      : { scale: 1, boxShadow: '0 0 0 0 rgba(6,110,90,0)', borderColor: '#D7DEE3' },
    transition: { duration: highlightedCard === id ? 3 : 0.18, times: [0, 0.16, 0.48, 0.76, 1] },
  });

  async function openFeedback() {
    setFeedbackNotice('');
    const shown = await showOpenFeedbackSurvey();
    if (!shown) {
      setFeedbackNotice('Feedback is temporarily unavailable. Please try again shortly.');
      window.setTimeout(() => setFeedbackNotice(''), 4000);
    }
  }

  return (
    <>
      <div aria-hidden={rolePickerOpen || contactOpen || undefined}>
      <motion.nav initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="fixed w-full z-50 bg-[#FFFFFF]/95 backdrop-blur-md border-b border-[#D7DEE3]">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <BrandHome />
            <div className="hidden md:flex space-x-6">
              <a href="#assessment" onClick={() => highlightFromNav('assessment')} className="text-[#5E6E7A] hover:text-[#0C1A26] text-sm transition-colors">Assessment</a>
              <a href="#matching" onClick={() => highlightFromNav('matching')} className="text-[#5E6E7A] hover:text-[#0C1A26] text-sm transition-colors">Matching</a>
              <a href="#upskilling" onClick={() => highlightFromNav('upskilling')} className="text-[#5E6E7A] hover:text-[#0C1A26] text-sm transition-colors">Upskilling</a>
              <a href="#roi" onClick={() => highlightFromNav('roi')} className="text-[#5E6E7A] hover:text-[#0C1A26] text-sm transition-colors">Employer ROI</a>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Search size={16} className="text-[#5E6E7A] hover:text-[#0C1A26] cursor-pointer" />
            <button
              onClick={() => setRolePickerOpen(true)}
              className="px-4 py-2 bg-[#E3E8EB] text-[#0C1A26] hover:bg-[#D7DEE3] transition-colors text-sm font-medium"
            >
              Sign In
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <motion.header variants={heroContainerVariants} initial="initial" animate="animate" className="pt-32 pb-24 px-6 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 border-b border-[#D7DEE3]">
        <motion.div variants={heroItemVariants} className="lg:w-1/2 space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 bg-[#FFFFFF] border border-[#D7DEE3]">
            <div className="w-2 h-2 bg-[#0C1A26]"></div>
            <span className="font-['IBM_Plex_Mono',monospace] text-xs text-[#5E6E7A] uppercase tracking-wide">
              System Live &bull; V2.4
            </span>
          </div>

          <h1 className="text-5xl lg:text-7xl font-semibold text-[#0C1A26] leading-[1.05] tracking-tight">
            African talent.<br />
            Global scale.
          </h1>

          <p className="text-lg text-[#5E6E7A] max-w-xl leading-relaxed">
            Systematically connecting verified African professionals to global enterprise requirements through Telos assessment, verified upskilling, and bidirectional matching.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button
              onClick={onPlacementClick}
              className="flex items-center justify-center space-x-2 bg-[#066E5A] text-[#F4F7F8] px-6 py-3 font-medium hover:bg-[#05564A] transition-colors"
            >
              <span>Initialize Placement</span>
              <ArrowRight size={18} />
            </button>
            <button className="flex items-center justify-center space-x-2 bg-[#FFFFFF] border border-[#D7DEE3] text-[#0C1A26] px-6 py-3 font-medium hover:bg-[#E3E8EB] transition-colors">
              <span>View Technical Docs</span>
            </button>
          </div>
        </motion.div>

        {/* Hero Visual - Strict Data Dashboard */}
        <motion.div variants={heroItemVariants} className="lg:w-1/2 w-full">
          <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }} className="bg-[#FFFFFF] border border-[#D7DEE3] flex flex-col shadow-[0_24px_70px_rgba(12,26,38,0.09)]">

            {/* Header Data */}
            <div className="bg-[#E3E8EB] h-10 flex items-center px-4 border-b border-[#D7DEE3] justify-between">
              <span className="font-['IBM_Plex_Mono',monospace] text-xs text-[#5E6E7A] uppercase tracking-wider">
                ID: Match_Engine_Active
              </span>
              <span className="font-['IBM_Plex_Mono',monospace] text-xs text-[#0C1A26]">
                REQ: 8992-REACT
              </span>
            </div>

            <div className="flex flex-1 min-h-[360px]">
              {/* Sidebar Roster */}
              <div className="w-1/3 bg-[#F2F4F7] border-r border-[#D7DEE3] p-4">
                <div className="font-['IBM_Plex_Mono',monospace] text-[10px] text-[#5E6E7A] uppercase tracking-wider mb-4 border-b border-[#D7DEE3] pb-2">
                  Pool Pipeline
                </div>
                <motion.div variants={staggerContainerVariants} initial="initial" animate="animate" className="space-y-2">
                  {profiles.map((profile) => {
                    const selected = profile.id === selectedProfile.id;
                    return <motion.button variants={staggerItemVariants} key={profile.id} type="button" aria-pressed={selected} onClick={() => setSelectedProfile(profile)} className={`w-full text-left p-3 cursor-pointer transition-colors border ${selected ? 'bg-[#FFFFFF] border-[#0C1A26]' : 'border-transparent hover:bg-[#E3E8EB]'}`}>
                      <div className={`text-sm ${selected ? 'font-semibold text-[#0C1A26]' : 'font-medium text-[#5E6E7A]'}`}>{profile.name}</div>
                      <div className={`font-['IBM_Plex_Mono',monospace] text-xs mt-1 ${selected ? 'text-[#0C1A26]' : 'text-[#5E6E7A]'}`}>{profile.match}% MATCH</div>
                    </motion.button>;
                  })}
                </motion.div>
              </div>

              {/* Main Profile Data */}
              <AnimatePresence mode="wait" initial={false}>
              <motion.div key={selectedProfile.id} variants={profileSwapVariants} initial="initial" animate="animate" exit="exit" className="w-2/3 p-6 bg-[#FFFFFF]">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h3 className="text-xl font-semibold text-[#0C1A26]">{selectedProfile.name}</h3>
                    <p className="font-['IBM_Plex_Mono',monospace] text-xs text-[#5E6E7A] mt-1 uppercase">LOC: {selectedProfile.location}</p>
                  </div>
                  <div className="px-2 py-1 border border-[#B08A2E] flex items-center gap-1.5">
                    <BadgeCheck size={14} className="text-[#B08A2E]" />
                    <span className="font-['IBM_Plex_Mono',monospace] text-[10px] font-bold text-[#B08A2E] uppercase">Tier: {selectedProfile.tier}</span>
                  </div>
                </div>

                <div className="space-y-6">
                  {selectedProfile.metrics.map((metric) => <div key={metric.label}>
                    <div className="flex justify-between font-['IBM_Plex_Mono',monospace] text-xs mb-2">
                      <span className="text-[#5E6E7A] uppercase">{metric.label}</span>
                      <span className="text-[#0C1A26] font-semibold">{metric.value}/100</span>
                    </div>
                    <div className="w-full bg-[#E3E8EB] h-1"><div className="bg-[#0C1A26] h-1 transition-all duration-300" style={{ width: `${metric.value}%` }}></div></div>
                  </div>)}
                </div>

                <div className="mt-10 flex justify-between items-center border-t border-[#D7DEE3] pt-4">
                  <div className="font-['IBM_Plex_Mono',monospace] text-xs">
                    <span className="text-[#5E6E7A]">EXP_SALARY:</span> <span className="font-semibold text-[#0C1A26]">{selectedProfile.salary}</span>
                  </div>
                  <button className="bg-[#E3E8EB] text-[#0C1A26] px-4 py-2 text-sm font-medium hover:bg-[#D7DEE3] transition-colors flex items-center gap-2">
                    Action: Review <ArrowUpRight size={14} />
                  </button>
                </div>
              </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      </motion.header>

      {/* ROI Calculator Section */}
      <motion.section variants={sectionRevealVariants} initial="initial" whileInView="animate" viewport={{ once: true, amount: 0.12 }} className="py-24 bg-[#0C1A26] text-[#EEF3F8]" id="roi">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div variants={sectionRevealVariants} initial="initial" whileInView="animate" viewport={{ once: true, amount: 0.35 }} className="space-y-6">
              <div className="font-['IBM_Plex_Mono',monospace] text-xs text-[#C2CCD4] uppercase tracking-wider mb-2">
                [ Module: Arbitrage_Calc ]
              </div>
              <h2 className="text-4xl lg:text-5xl font-semibold tracking-tight text-[#EEF3F8] leading-tight">
                Global quality. <br />
                <span className="text-[#C2CCD4] font-light">Asymmetric cost.</span>
              </h2>
              <p className="text-[#C2CCD4] text-lg leading-relaxed max-w-md pt-2">
                By bridging the purchasing power parity (PPP) gap, global employers unlock dramatic savings while offering African professionals 4x their local market salary.
              </p>

              <div className="pt-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-[#EEF3F8] flex items-center justify-center text-[#0C1A26]"><Check size={14} strokeWidth={3} /></div>
                  <span className="text-[#EEF3F8] font-medium text-sm">Same skill level, verified by Telos</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-[#EEF3F8] flex items-center justify-center text-[#0C1A26]"><Check size={14} strokeWidth={3} /></div>
                  <span className="text-[#EEF3F8] font-medium text-sm">Strong English/French (C1/C2)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-[#EEF3F8] flex items-center justify-center text-[#0C1A26]"><Check size={14} strokeWidth={3} /></div>
                  <span className="text-[#EEF3F8] font-medium text-sm">Excellent timezone overlap</span>
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0, transition: { duration: 0.68 } }} viewport={{ once: true, amount: 0.25 }} {...signalPulse('roi')} className="bg-[#FFFFFF] text-[#0C1A26] border border-[#D7DEE3] shadow-md">
              <div className="p-4 bg-[#E3E8EB] border-b border-[#D7DEE3] flex justify-between items-center">
                <span className="font-['IBM_Plex_Mono',monospace] text-xs font-semibold text-[#0C1A26] uppercase tracking-wider">
                  ROLE: SR_FULL_STACK
                </span>
                <Calculator size={16} className="text-[#5E6E7A]" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#D7DEE3]">
                <div className="p-6 space-y-4">
                  <div className="font-['IBM_Plex_Mono',monospace] text-sm font-semibold text-[#5E6E7A] uppercase">
                    OPT_A: US-Based
                  </div>
                  <div className="space-y-3 font-['IBM_Plex_Mono',monospace] text-xs text-[#5E6E7A]">
                    <div className="flex justify-between"><span>Base_Salary</span> <span className="font-medium text-[#0C1A26]">$150,000</span></div>
                    <div className="flex justify-between"><span>Benefits</span> <span className="font-medium text-[#0C1A26]">$30,000</span></div>
                    <div className="flex justify-between"><span>Taxes_ER</span> <span className="font-medium text-[#0C1A26]">$15,000</span></div>
                  </div>
                  <div className="pt-4 border-t border-[#D7DEE3] flex justify-between items-center font-['IBM_Plex_Mono',monospace] font-semibold text-sm text-[#0C1A26]">
                    <span>TOTAL_A</span>
                    <span>$195,000/YR</span>
                  </div>
                </div>

                <div className="p-6 space-y-4 bg-[#F2F4F7]">
                  <div className="font-['IBM_Plex_Mono',monospace] text-sm font-semibold text-[#0C1A26] uppercase border-b border-[#D7DEE3] pb-1 inline-block">
                    OPT_B: FUMANA
                  </div>
                  <div className="space-y-3 font-['IBM_Plex_Mono',monospace] text-xs text-[#5E6E7A]">
                    <div className="flex justify-between"><span>Base_Salary</span> <span className="font-medium text-[#0C1A26]">$45,000</span></div>
                    <div className="flex justify-between"><span>Platform_12%</span> <span className="font-medium text-[#0C1A26]">$5,400</span></div>
                    <div className="flex justify-between"><span>Payment_Proc</span> <span className="font-medium text-[#0C1A26]">$500</span></div>
                  </div>
                  <div className="pt-4 border-t border-[#D7DEE3] flex justify-between items-center font-['IBM_Plex_Mono',monospace] font-semibold text-sm text-[#0C1A26]">
                    <span>TOTAL_B</span>
                    <span>$50,900/YR</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#066E5A] p-5 flex justify-between items-center">
                <span className="font-['IBM_Plex_Mono',monospace] font-medium text-xs text-[#F4F7F8] uppercase tracking-wide">
                  NET_SAVINGS_COMPUTED
                </span>
                <span className="font-['IBM_Plex_Mono',monospace] text-2xl font-semibold text-[#F4F7F8]">
                  $144,100/YR
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* 4 Pillars Grid System */}
      <motion.section variants={sectionRevealVariants} initial="initial" whileInView="animate" viewport={{ once: true, amount: 0.1 }} className="py-24 bg-[#F2F4F7] border-y border-[#D7DEE3]" id="architecture">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div variants={sectionRevealVariants} initial="initial" whileInView="animate" viewport={{ once: true, amount: 0.45 }} className="mb-16 max-w-2xl space-y-4">
            <h2 className="text-3xl font-semibold text-[#0C1A26]">Intelligence architecture</h2>
            <p className="text-lg text-[#5E6E7A]">
              Moving beyond basic keywords. Our system evaluates, upskills, and matches professionals utilizing four distinct structural pillars.
            </p>
          </motion.div>

          <motion.div variants={staggerContainerVariants} initial="initial" whileInView="animate" viewport={{ once: true, amount: 0.12 }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div variants={architectureCardVariants} whileInView="animate" viewport={{ once: true, amount: 0.18 }} whileHover={{ y: -5 }} {...signalPulse('assessment')} className="bg-[#FFFFFF] p-8 border border-[#D7DEE3] hover:border-[#C2CCD4] transition-colors" id="assessment">
              <div className="w-10 h-10 bg-[#E3E8EB] flex items-center justify-center mb-6 text-[#0C1A26]">
                <BrainCircuit size={20} />
              </div>
              <h3 className="text-xl font-semibold text-[#0C1A26] mb-3">Telos assessment</h3>
              <p className="text-[#5E6E7A] text-sm leading-relaxed mb-8">
                Standard tools fail to capture talent nuance. Telos performs zero-hallucination audits of technical history, cross-cultural competency, and remote infrastructure resilience.
              </p>

              <div className="bg-[#F2F4F7] p-4 border border-[#D7DEE3] space-y-3 font-['IBM_Plex_Mono',monospace]">
                <div className="flex justify-between text-xs items-center">
                  <span className="text-[#5E6E7A] uppercase">Resilience Index</span>
                  <span className="text-[#0C1A26] font-semibold">91/100</span>
                </div>
                <div className="flex justify-between text-xs items-center border-t border-[#D7DEE3] pt-3">
                  <span className="text-[#5E6E7A] uppercase">Infrastructure Check</span>
                  <span className="text-[#A8431F] font-semibold flex items-center gap-1"><AlertTriangle size={12} /> 42/100</span>
                </div>
              </div>
            </motion.div>

            <motion.div variants={architectureCardVariants} whileInView="animate" viewport={{ once: true, amount: 0.18 }} whileHover={{ y: -5 }} {...signalPulse('upskilling')} className="bg-[#FFFFFF] p-8 border border-[#D7DEE3] hover:border-[#C2CCD4] transition-colors" id="upskilling">
              <div className="w-10 h-10 bg-[#E3E8EB] flex items-center justify-center mb-6 text-[#0C1A26]">
                <BookOpen size={20} />
              </div>
              <h3 className="text-xl font-semibold text-[#0C1A26] mb-3">Integrated upskilling ecosystem</h3>
              <p className="text-[#5E6E7A] text-sm leading-relaxed mb-8">
                Identify skills gaps via LMS learning paths. Candidates earn points and increase visibility profiles, tracked via metadata tiers.
              </p>

              <div className="flex gap-2">
                <div className="flex-1 bg-[#F2F4F7] border border-[#D7DEE3] py-2 text-center">
                  <span className="font-['IBM_Plex_Mono',monospace] text-[10px] text-[#5E6E7A] uppercase">Bronze</span>
                </div>
                <div className="flex-1 bg-[#F2F4F7] border border-[#D7DEE3] py-2 text-center">
                  <span className="font-['IBM_Plex_Mono',monospace] text-[10px] text-[#0C1A26] uppercase">Silver</span>
                </div>
                <div className="flex-1 bg-[#FFFFFF] border border-[#B08A2E] py-2 text-center">
                  <span className="font-['IBM_Plex_Mono',monospace] text-[10px] text-[#B08A2E] font-bold uppercase">Gold</span>
                </div>
                <div className="flex-1 bg-[#FFFFFF] border border-[#B08A2E] py-2 text-center">
                  <span className="font-['IBM_Plex_Mono',monospace] text-[10px] text-[#B08A2E] font-bold uppercase">Top 1%</span>
                </div>
              </div>
            </motion.div>

            <motion.div variants={architectureCardVariants} whileInView="animate" viewport={{ once: true, amount: 0.18 }} whileHover={{ y: -5 }} {...signalPulse('matching')} className="bg-[#FFFFFF] p-8 border border-[#D7DEE3] hover:border-[#C2CCD4] transition-colors" id="matching">
              <div className="w-10 h-10 bg-[#E3E8EB] flex items-center justify-center mb-6 text-[#0C1A26]">
                <LineChart size={20} />
              </div>
              <h3 className="text-xl font-semibold text-[#0C1A26] mb-3">Bidirectional accountability</h3>
              <p className="text-[#5E6E7A] text-sm leading-relaxed mb-8">
                We don't just score candidates; we rate employers. Enterprise partners are assessed on their "Africa Hiring Readiness" metrics.
              </p>

              <div className="bg-[#F2F4F7] border border-[#D7DEE3] p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-6 h-6 bg-[#0C1A26] flex items-center justify-center"><Briefcase size={12} className="text-[#FFFFFF]" /></div>
                  <div className="text-sm font-semibold text-[#0C1A26]">Employer: Acme Corp</div>
                </div>
                <div className="font-['IBM_Plex_Mono',monospace] text-xs">
                  <div className="flex justify-between text-[#5E6E7A] mb-1 uppercase">
                    <span>Hiring Readiness</span>
                    <span className="text-[#0C1A26] font-semibold">88/100</span>
                  </div>
                  <div className="w-full bg-[#E3E8EB] h-1"><div className="bg-[#0C1A26] h-1" style={{ width: '88%' }}></div></div>
                </div>
              </div>
            </motion.div>

            <motion.div variants={architectureCardVariants} whileInView="animate" viewport={{ once: true, amount: 0.18 }} whileHover={{ y: -5 }} className="bg-[#FFFFFF] p-8 border border-[#D7DEE3] hover:border-[#C2CCD4] transition-colors">
              <div className="w-10 h-10 bg-[#E3E8EB] flex items-center justify-center mb-6 text-[#0C1A26]">
                <Shield size={20} />
              </div>
              <h3 className="text-xl font-semibold text-[#0C1A26] mb-3">Micro-internships</h3>
              <p className="text-[#5E6E7A] text-sm leading-relaxed mb-6">
                Test talent before committing. Post 1-4 week project-based tasks. The Try Africa Talent module reduces enterprise risk.
              </p>

              <div className="bg-[#E3E8EB] border-l-4 border-[#0C1A26] p-4">
                <div className="font-['IBM_Plex_Mono',monospace] text-xs font-semibold text-[#0C1A26] uppercase mb-2">Initiative Logic:</div>
                <ul className="list-none text-sm text-[#0C1A26] space-y-2">
                  <li className="flex gap-2 items-start"><Check size={16} className="shrink-0 mt-0.5 text-[#5E6E7A]" /> First project module is 100% FREE.</li>
                  <li className="flex gap-2 items-start"><Check size={16} className="shrink-0 mt-0.5 text-[#5E6E7A]" /> Historical conversion to full-time at 40%+.</li>
                </ul>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* Strict Footer Section */}
      <motion.footer variants={sectionRevealVariants} initial="initial" whileInView="animate" viewport={{ once: true, amount: 0.08 }} className="bg-[#FFFFFF] pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-10 mb-16">
            <div className="col-span-1 md:col-span-2 space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-[#0C1A26]"></div>
                <span className="font-semibold text-lg text-[#0C1A26] tracking-tight">FUMANA</span>
              </div>
              <p className="text-[#5E6E7A] text-sm max-w-sm leading-relaxed">
                The Africa Talent Bridge. Connecting exceptional African technical professionals with the global remote economy through structural matching.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-[#0C1A26] mb-4 text-sm">Company</h4>
              <ul className="m-0 list-none space-y-3 p-0 text-sm font-['IBM_Plex_Sans',sans-serif]">
                <li><a href="/safety" className="text-[#5E6E7A] no-underline hover:text-[#0C1A26] hover:underline transition-colors">Safety</a></li>
                <li>
                  <button type="button" aria-expanded={contactMenuOpen} onClick={() => setContactMenuOpen((open) => !open)} className="flex items-center gap-1 border-0 bg-transparent p-0 text-[#5E6E7A] no-underline hover:text-[#0C1A26] hover:underline transition-colors">
                    Contact <motion.span animate={{ rotate: contactMenuOpen ? 180 : 0 }} transition={{ duration: 0.18 }}><ChevronDown size={14} /></motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {contactMenuOpen && <motion.ul initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }} className="mb-0 ml-4 mt-2 list-none space-y-2 border-l border-[#D7DEE3] pl-3">
                      <li><button type="button" onClick={() => setContactOpen(true)} className="border-0 bg-transparent p-0 text-[#5E6E7A] no-underline hover:text-[#0C1A26] hover:underline">Inquire</button></li>
                      <li><button type="button" data-cal-namespace="book-a-demo" data-cal-link="f-i-n-d/book-a-demo" data-cal-config='{"layout":"month_view","useSlotsViewOnSmallScreen":"true"}' className="border-0 bg-transparent p-0 text-[#5E6E7A] no-underline hover:text-[#0C1A26] hover:underline">Talk to a human</button></li>
                    </motion.ul>}
                  </AnimatePresence>
                </li>
                <li>
                  <button type="button" aria-expanded={policiesOpen} onClick={() => setPoliciesOpen((open) => !open)} className="flex items-center gap-1 border-0 bg-transparent p-0 text-[#5E6E7A] no-underline hover:text-[#0C1A26] hover:underline transition-colors">
                    Policies <motion.span animate={{ rotate: policiesOpen ? 180 : 0 }} transition={{ duration: 0.18 }}><ChevronDown size={14} /></motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {policiesOpen && <motion.ul initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }} className="mb-0 ml-4 mt-2 list-none space-y-2 border-l border-[#D7DEE3] pl-3">
                      <li><a href="/terms" className="text-[#5E6E7A] no-underline hover:text-[#0C1A26] hover:underline">Terms</a></li>
                      <li><a href="/privacy" className="text-[#5E6E7A] no-underline hover:text-[#0C1A26] hover:underline">Privacy</a></li>
                    </motion.ul>}
                  </AnimatePresence>
                </li>
                <li><button type="button" onClick={openFeedback} className="border-0 bg-transparent p-0 text-[#5E6E7A] no-underline hover:text-[#0C1A26] hover:underline transition-colors">Share Feedback</button></li>
              </ul>
              {feedbackNotice && <p role="status" className="mt-3 text-xs leading-relaxed text-[#A03020]">{feedbackNotice}</p>}
            </div>

            <div>
              <h4 className="font-semibold text-[#0C1A26] mb-4 text-sm">Enterprise</h4>
              <ul className="list-none space-y-3 text-sm font-['IBM_Plex_Sans',sans-serif]">
                <li><a href="#" className="text-[#5E6E7A] no-underline hover:text-[#0C1A26] hover:underline transition-colors">Post Requisition</a></li>
                <li><a href="#" className="text-[#5E6E7A] no-underline hover:text-[#0C1A26] hover:underline transition-colors">Micro-internships</a></li>
                <li><a href="#" className="text-[#5E6E7A] no-underline hover:text-[#0C1A26] hover:underline transition-colors">Global Solutions</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-[#0C1A26] mb-4 text-sm">Builder node</h4>
              <ul className="list-none space-y-3 text-sm font-['IBM_Plex_Sans',sans-serif]">
                <li><a href="#" className="text-[#5E6E7A] no-underline hover:text-[#0C1A26] hover:underline transition-colors">Zuri Assessment</a></li>
                <li><a href="#" className="text-[#5E6E7A] no-underline hover:text-[#0C1A26] hover:underline transition-colors">LMS Access</a></li>
                <li><a href="#" className="text-[#5E6E7A] no-underline hover:text-[#0C1A26] hover:underline transition-colors">Tier Status</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-[#D7DEE3] pt-8 text-center">
            <div className="font-['IBM_Plex_Mono',monospace] text-xs text-[#5E6E7A]">
              &copy; 2026 FIND Services Limited. Powered by Telos. Designed by Lexington Advisory Group.
            </div>
          </div>
        </div>
      </motion.footer>
      </div>
      <SignInPortalDialog
        open={rolePickerOpen}
        onClose={() => setRolePickerOpen(false)}
        onSelect={(role) => {
          setRolePickerOpen(false);
          onSignInClick(role);
        }}
      />
      <ContactDialog open={contactOpen} onClose={() => setContactOpen(false)} />
    </>
  );
}

function ContactDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open, onClose]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setStatus('');
    try {
      const response = await fetch(CONTACT_URL, { method: 'POST', headers: await apiHeaders(), body: JSON.stringify({ name, email, message }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Your message could not be sent.');
      setSent(true); setName(''); setEmail(''); setMessage('');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Your message could not be sent.');
    } finally { setBusy(false); }
  }

  return <AnimatePresence>
    {open && <motion.div variants={modalBackdropVariants} initial="initial" animate="animate" exit="exit" className="fixed inset-0 z-[120] grid place-items-center bg-[#0C1A26]/60 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <motion.div variants={modalPanelVariants} role="dialog" aria-modal="true" aria-labelledby="contact-title" className="w-full max-w-lg border border-[#D7DEE3] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#D7DEE3] px-5 py-4">
          <div><div className="font-['IBM_Plex_Mono',monospace] text-[10px] uppercase tracking-wider text-[#066E5A]">Company contact</div><h2 id="contact-title" className="m-0 mt-1 text-2xl font-semibold text-[#0C1A26]">Contact us</h2></div>
          <button type="button" onClick={onClose} aria-label="Close contact form" className="grid h-9 w-9 place-items-center border border-[#D7DEE3] bg-white text-[#5E6E7A] hover:text-[#0C1A26]"><X size={18} /></button>
        </div>
        {sent ? <div className="space-y-4 p-6 text-center"><div className="mx-auto grid h-11 w-11 place-items-center bg-[#E7F4F0] text-[#066E5A]"><Check size={21} /></div><h3 className="m-0 text-xl font-semibold text-[#0C1A26]">Message sent</h3><p className="m-0 text-sm text-[#5E6E7A]">Thank you. The Fumana team will reply by email within 3-5 days.</p><button type="button" onClick={() => { setSent(false); onClose(); }} className="w-full bg-[#066E5A] p-3 font-medium text-white hover:bg-[#05564A]">Done</button></div>
        : <form onSubmit={submit} className="space-y-4 p-5 sm:p-6">
          <label className="block text-xs font-medium uppercase tracking-wide text-[#5E6E7A]">Name<input autoFocus required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5 block w-full border border-[#D7DEE3] bg-white p-3 text-sm normal-case tracking-normal text-[#0C1A26] outline-none focus:border-[#066E5A]" /></label>
          <label className="block text-xs font-medium uppercase tracking-wide text-[#5E6E7A]">Email Address<input type="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 block w-full border border-[#D7DEE3] bg-white p-3 text-sm normal-case tracking-normal text-[#0C1A26] outline-none focus:border-[#066E5A]" /></label>
          <label className="block text-xs font-medium uppercase tracking-wide text-[#5E6E7A]">Message<textarea required minLength={10} maxLength={5000} rows={5} value={message} onChange={(event) => setMessage(event.target.value)} className="mt-1.5 block w-full resize-y border border-[#D7DEE3] bg-white p-3 text-sm normal-case tracking-normal text-[#0C1A26] outline-none focus:border-[#066E5A]" /></label>
          {status && <p role="alert" className="m-0 text-sm text-[#A03020]">{status}</p>}
          <button type="submit" disabled={busy} className="w-full bg-[#066E5A] p-3 font-medium text-white hover:bg-[#05564A] disabled:opacity-60">{busy ? 'Sending…' : 'Send message'}</button>
        </form>}
      </motion.div>
    </motion.div>}
  </AnimatePresence>;
}
