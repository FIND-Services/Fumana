import { motion } from 'motion/react';
import { ArrowLeft, type LucideIcon } from 'lucide-react';
import { BrandHome } from '../Auth';
import { pageVariants, staggerContainerVariants, staggerItemVariants } from '../motion';

export type PolicySection = { icon: LucideIcon; title: string; body: string };

export function PolicyPageLayout({ eyebrow, title, intro, sections }: { eyebrow: string; title: string; intro: string; sections: PolicySection[] }) {
  return <div className="min-h-screen bg-[#F2F4F7] text-[#0C1A26]">
    <nav className="border-b border-[#D7DEE3] bg-white"><div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6"><BrandHome /><a href="/" className="flex items-center gap-2 text-sm text-[#5E6E7A] no-underline transition-colors hover:text-[#0C1A26] hover:underline"><ArrowLeft size={15} /> Back home</a></div></nav>
    <motion.main variants={pageVariants} initial="initial" animate="animate" className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
      <div className="max-w-3xl"><div className="font-['IBM_Plex_Mono',monospace] text-xs uppercase tracking-[0.18em] text-[#066E5A]">{eyebrow}</div><h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">{title}</h1><p className="mt-6 text-lg leading-8 text-[#5E6E7A]">{intro}</p></div>
      <motion.div variants={staggerContainerVariants} initial="initial" animate="animate" className="mt-14 grid gap-px border border-[#D7DEE3] bg-[#D7DEE3] md:grid-cols-2">
        {sections.map(({ icon: Icon, title: sectionTitle, body }) => <motion.section key={sectionTitle} variants={staggerItemVariants} className="bg-white p-7 sm:p-9"><div className="mb-5 grid h-10 w-10 place-items-center bg-[#E7F4F0] text-[#066E5A]"><Icon size={20} /></div><h2 className="m-0 text-xl font-semibold">{sectionTitle}</h2><p className="mb-0 mt-3 text-sm leading-7 text-[#5E6E7A]">{body}</p></motion.section>)}
      </motion.div>
      <div className="mt-10 border-l-2 border-[#066E5A] bg-white p-5 text-sm leading-6 text-[#5E6E7A]">Need help or want to exercise a data or safety right? Return home and choose <strong className="text-[#0C1A26]">Company → Contact → Inquire</strong>.</div>
    </motion.main>
    <footer className="border-t border-[#D7DEE3] bg-white px-6 py-8 text-center font-['IBM_Plex_Mono',monospace] text-xs text-[#5E6E7A]">© 2026 FIND Services Limited. Fumana.</footer>
  </div>;
}
