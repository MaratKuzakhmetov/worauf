import { Fira_Mono, Fira_Sans, Fira_Sans_Condensed, Source_Serif_4 } from 'next/font/google';

// Self-hosted at build time: the app makes no network request at runtime.
const sans = Fira_Sans({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500'],
  variable: '--font-sans',
  display: 'swap',
});
const condensed = Fira_Sans_Condensed({
  subsets: ['latin', 'cyrillic'],
  weight: ['500', '600', '700'],
  variable: '--font-cond',
  display: 'swap',
});
const mono = Fira_Mono({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});
const serif = Source_Serif_4({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '600'],
  variable: '--font-serif',
  display: 'swap',
});

export const fontVariables = [sans, condensed, mono, serif].map((font) => font.variable).join(' ');
