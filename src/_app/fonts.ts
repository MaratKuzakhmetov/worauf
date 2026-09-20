import { Atkinson_Hyperlegible, Literata } from 'next/font/google';

/*
 * §15.3: two families, not four. Self-hosted at build time (no runtime network request) —
 * loaded here as `--font-atkinson`/`--font-literata`, aliased in tokens.css to the public
 * `--font-sans`/`--font-cond`/`--font-mono`/`--font-marker`/`--font-serif` names the .module.css
 * files already reference, so this file only says which two families exist and at which
 * weights, not which component uses which.
 *
 * Atkinson Hyperlegible carries the apparatus voice AND the dense WORDS column: it replaces
 * both Shantell Sans (apparatus) and Fira Sans Condensed (the WORDS list) from §14.3, and it
 * is designed by the Braille Institute specifically to keep confusable letterforms apart —
 * exactly the `n`/`m` problem §14.1 raised against a handwritten face, closed with a font
 * whose stated purpose is the opposite. Weights 400/700 match what the source mockup's own
 * `@font-face` rules carry (§15.3) — no 500/600 cut exists for this family, so the handful of
 * selectors that ask CSS for those weights fall back to the nearest loaded one (400) under
 * ordinary font matching; nothing fails to render.
 */
const sans = Atkinson_Hyperlegible({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-atkinson',
  display: 'swap',
});

/*
 * Literata carries expanded reading: the `worauf?` logo, a word/preposition page headline,
 * example sentences, the PREPOSITIONS column (short enough not to need a condensed cut), the
 * search dropdown's matched lemma, and the trainer's prompt/answer text (§15.3, confirmed
 * against the mockup's own templates rather than assumed from the apparatus/material split).
 * A screen antiqua (TypeTogether, built for reading on screens), not a script face — its
 * serifs are structural, which is what let §15.3 re-close the §14.1 `n`/`m` objection a second
 * way, on this family's own terms rather than by inheriting Atkinson's answer to it. Weight
 * 600 only, no 700, again matching what the mockup's own font-face rules carry.
 */
const serif = Literata({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '600'],
  style: ['normal', 'italic'],
  variable: '--font-literata',
  display: 'swap',
});

export const fontVariables = [sans, serif].map((font) => font.variable).join(' ');
