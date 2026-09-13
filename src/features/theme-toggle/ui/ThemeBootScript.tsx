'use client';

import { memo } from 'react';
import { themeBootScript } from '../model/theme';

/**
 * Emitted by the server so the stored theme is applied before the first paint.
 * Switching locale remounts the whole tree (see docs/adr/0001), so React renders this
 * again on the client and reports that it will not execute it — a dev-only message;
 * the production export is silent, and the theme is re-applied from storage by
 * ThemeToggle's layout effect regardless.
 *
 * `next/script` with `strategy="beforeInteractive"` is the documented way to ship an inline
 * script in the App Router, and it was considered and rejected here: its own reference says
 * such scripts are "preloaded and fetched before any first-party code" but that execution
 * "does not block page hydration", and the example places them after `{children}`. That
 * orders the script against Next's modules, which is not the guarantee this script needs —
 * it has to run before the body paints or the wrong theme flashes. A plain `<script>` first
 * in `<body>` is synchronous and does exactly that. The dev warning is the cheaper cost.
 */
export const ThemeBootScript = memo(function ThemeBootScript() {
  return <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: themeBootScript }} />;
});
