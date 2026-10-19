/** @type {import('tailwindcss').Config} */
// Preflight (Tailwind's global reset) is disabled so Tailwind only adds utility
// classes and never touches the inline-styled app shell. The Tailwind-based
// marketing views (marketing.tsx) and the inline-styled app coexist.
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  corePlugins: { preflight: false },
  theme: { extend: {} },
  plugins: [],
}
