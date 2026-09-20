import type { MetadataRoute } from 'next';

/**
 * A manifest is a route handler, and `output: 'export'` refuses to collect one without being
 * told it is static — the build fails outright with "export const dynamic = force-static not
 * configured on route /manifest.webmanifest". Nothing here reads a request, so saying so is
 * a statement of fact rather than a workaround.
 */
export const dynamic = 'force-static';

/**
 * Routing only — one re-export per file is the rule in `app/`, but a manifest has nothing to
 * re-export: it is a file convention Next reads from this exact path. The values are the
 * project's own, so they are stated here rather than hidden behind an indirection.
 *
 * `start_url` and `id` are `/en/` rather than `/`: `/` is only a meta refresh, and an
 * installed app that opens on a redirect spends its first frame on a redirect. English is
 * the default locale (CLAUDE.md); a reader who wants Russian switches once and the browser
 * remembers where they were.
 *
 * Colours are the light-theme `--paper` and `--ink` from `src/_app/styles/tokens.css`. They
 * cannot be read from CSS here — a manifest is JSON, not a stylesheet — so this is the one
 * place a token value is repeated, and it is repeated deliberately rather than by accident.
 *
 * `theme_color` stays ink rather than the ocker the icon set's own README suggests
 * (2026-09-20): this value tints live OS/browser chrome around the installed app, which is
 * exactly the surface §3/§15.2.2 reserves for case colour alone — nine attempts by the ocker
 * mockup to put an accent colour in chrome were found and rejected there. The icon itself is
 * a static external mark, outside that rule; the chrome tint is not.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/en/',
    name: 'worauf — German Rektion',
    short_name: 'worauf',
    description: 'Which preposition a German verb, adjective or noun takes, and in which case.',
    start_url: '/en/',
    scope: '/',
    display: 'standalone',
    background_color: '#f6f3ea',
    theme_color: '#262318',
    /*
     * SVG first — Chromium and Firefox take `sizes: 'any'` and it scales perfectly — with real
     * PNG fallbacks behind it. The 512 and 192 squares cover `purpose: 'any'`; the maskable
     * entry is its own dedicated asset with safe-zone padding, not the SVG reused, because the
     * SVG bakes in its own corner radius and platform-applied masking expects unrounded
     * artwork to crop itself (docs/screenshots aside, this is why a maskable icon is never
     * just the regular icon with a purpose label swapped on it).
     */
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
