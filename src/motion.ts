import type { Variants } from 'motion/react';

const easeOut = [0.22, 1, 0.36, 1] as const;

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.24, ease: easeOut } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.16, ease: 'easeIn' } },
};

export const cardVariants: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: easeOut } },
};

export const modalBackdropVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.18 } },
  exit: { opacity: 0, transition: { duration: 0.16 } },
};

export const modalPanelVariants: Variants = {
  initial: { opacity: 0, scale: 0.98, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.22, ease: easeOut } },
  exit: { opacity: 0, scale: 0.985, y: 4, transition: { duration: 0.16 } },
};

export const staggerContainerVariants: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.055, delayChildren: 0.035 } },
};

export const staggerItemVariants: Variants = {
  initial: { opacity: 0, y: 5 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: easeOut } },
};

export const profileSwapVariants: Variants = {
  initial: { opacity: 0, x: 6 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.22, ease: easeOut } },
  exit: { opacity: 0, x: -4, transition: { duration: 0.16 } },
};

export const heroContainerVariants: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.09, delayChildren: 0.08 } },
};

export const heroItemVariants: Variants = {
  initial: { opacity: 0, y: 18, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.42, ease: easeOut } },
};

export const sectionRevealVariants: Variants = {
  initial: { opacity: 0, y: 34 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.68, ease: easeOut } },
};

export const architectureCardVariants: Variants = {
  initial: { opacity: 0, y: 30, scale: 0.985 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.58, ease: easeOut } },
};
