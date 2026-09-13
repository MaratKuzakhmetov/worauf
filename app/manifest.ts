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
    background_color: '#eeefea',
    theme_color: '#16191c',
    /*
     * One SVG rather than the usual pair of PNGs: there is no image tooling in this
     * repository, and a hand-written SVG is honest where a fabricated PNG would not be.
     * Chromium and Firefox accept `sizes: 'any'`; iOS will fall back to a screenshot of the
     * page until someone adds an `apple-touch-icon` PNG, which needs a real design pass.
     */
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  };
}
