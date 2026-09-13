import { Fira_Mono, Fira_Sans, Fira_Sans_Condensed, Shantell_Sans } from 'next/font/google';

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
/*
 * The apparatus voice (docs/DESIGN.md §14.3): headings, pane labels, buttons, counts.
 *
 * It never touches German. A marker face rounds off exactly the strokes that separate `n`
 * from `m`, and `auf den` vs `auf dem` is the entire product — the measurement is in
 * `design/sketchbook/Legibility.dc.html`. Cyrillic is loaded because the RU interface
 * chrome needs it; the German material stays on Fira either way.
 *
 * Source Serif 4 was dropped here rather than kept alongside: §14.3 replaces the
 * grotesk/antiqua split with a marker/grotesk one, and a third family earned nothing.
 */
const marker = Shantell_Sans({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '600', '700'],
  variable: '--font-marker',
  display: 'swap',
});

export const fontVariables = [sans, condensed, mono, marker]
  .map((font) => font.variable)
  .join(' ');
