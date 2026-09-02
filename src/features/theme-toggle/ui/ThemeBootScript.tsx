'use client';

import { memo } from 'react';
import { themeBootScript } from '../model/theme';

/**
 * Emitted by the server so the stored theme is applied before the first paint.
 * Switching locale remounts the whole tree (see docs/adr/0001), so React renders this
 * again on the client and reports that it will not execute it — a dev-only message;
 * the production export is silent, and the theme is re-applied from storage by
 * ThemeToggle's layout effect regardless.
 */
export const ThemeBootScript = memo(function ThemeBootScript() {
  return <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: themeBootScript }} />;
});
