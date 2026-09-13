import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, posix, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cacheNames, isStale, routeFor, STATIC_PREFIX } from './policy';

/**
 * Emits `out/sw.js` after `next build` has produced the export.
 *
 * It has to run afterwards rather than as part of the bundle, because the one thing the
 * worker must know — which files to precache — is a list of content-hashed names that do
 * not exist until the export is on disk. ADR 0006 chose to own that list rather than take a
 * dependency to generate it; owning it means generating it from the tree that actually
 * ships, never from a hand-kept list that can silently fall out of step.
 *
 * Runs in Node, outside the FSD graph, and is never shipped (CLAUDE.md).
 */

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = join(root, 'out');

/**
 * The locale shells, and not only `/`.
 *
 * ADR 0006 says "the root shell", singular, but `out/index.html` is a 276-byte meta refresh
 * to `/en/`: precaching only that would cache a signpost pointing at a road that is not
 * there, and opening the installed app offline would fail on the redirect. The shells the
 * refresh leads to are what make an offline cold start work, so all three are precached.
 */
const SHELLS = ['/', '/en/', '/ru/'];

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? filesUnder(full) : [full];
  });
}

/** `/_next/static/**`, as URL paths, sorted so the same tree always yields the same list. */
export function precacheList(outDir: string): string[] {
  const staticDir = join(outDir, '_next', 'static');
  const assets = filesUnder(staticDir)
    .map((file) => posix.join(STATIC_PREFIX, relative(staticDir, file).split(sep).join('/')))
    .sort();
  return [...SHELLS, ...assets];
}

/**
 * The cache version, and thus what `activate` treats as stale.
 *
 * Hashed from the asset names *and* the shell bytes. Names alone would be nearly enough —
 * they carry content hashes — but a shell whose contents changed while its name did not is
 * exactly the case that would otherwise leave a stale copy in an offline reader's cache.
 */
export function cacheVersion(outDir: string, entries: readonly string[]): string {
  const hash = createHash('sha256');
  for (const entry of entries) hash.update(entry);
  for (const shell of SHELLS) {
    const file = join(outDir, shell === '/' ? 'index.html' : join(shell, 'index.html'));
    if (existsSync(file)) hash.update(readFileSync(file));
  }
  return hash.digest('hex').slice(0, 12);
}

/**
 * The lifecycle half of the worker. Plain text on purpose: it runs in a ServiceWorkerGlobal
 * scope that the app's tsconfig does not describe, so keeping it as source here — rather
 * than as a `.js` file the linter would reject or a `.ts` file the compiler would reject —
 * is the honest option. The half that *can* be type-checked and tested is `policy.ts`,
 * spliced in above it.
 */
const lifecycle = `
const CACHES = cacheNames(VERSION);

/*
 * No skipWaiting() here, and that omission IS the update policy: a new worker installs,
 * fills its cache, then WAITS. It takes over only once the reader accepts the prompt
 * (ADR 0006). In an app that teaches cases, swapping the answers out from under someone
 * mid-session is not an improvement.
 */
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHES.static).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((name) => isStale(name, VERSION)).map((name) => caches.delete(name)),
      );
      // Take over the open page at once, so a first visit is offline-capable without a
      // reload. Activation only happens on a first install or after an accepted prompt.
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const route = routeFor(event.request, url, self.location.origin);
  if (route === 'passthrough') return;
  event.respondWith(route === 'static' ? cacheFirst(event.request) : networkFirst(event.request));
});

/** Content-hashed names: a hit is correct forever, and a miss is a genuinely new file. */
async function cacheFirst(request) {
  const cache = await caches.open(CACHES.static);
  const hit = await cache.match(request);
  if (hit) return hit;

  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

/*
 * The shell is the one thing here that CAN go stale — it decides which chunks to load — so
 * it is asked for over the network first and falls back to the cache only when there is no
 * network. The dataset cannot go stale this way: it rides inside a content-hashed chunk, so
 * a corrected case ships under a new filename that no old cache holds (ADR 0006).
 *
 * Storing the response on the way past is what makes a route, once visited, work offline.
 */
async function networkFirst(request) {
  const cache = await caches.open(CACHES.documents);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (offline) {
    const hit = await cache.match(request);
    if (hit) return hit;
    throw offline;
  }
}
`;

export function renderWorker(version: string, precache: readonly string[]): string {
  return `// GENERATED by tools/service-worker/build-sw.ts — do not edit by hand.
// Regenerated by \`npm run build\`; the precache list below is this build's own file names.

const VERSION = '${version}';
const PRECACHE = ${JSON.stringify(precache, null, 2)};

const STATIC_PREFIX = '${STATIC_PREFIX}';
${routeFor.toString()}
${cacheNames.toString()}
${isStale.toString()}
${lifecycle}`;
}

function main(): void {
  if (!existsSync(join(OUT, '_next', 'static'))) {
    throw new Error('out/_next/static is missing — run `next build` before build:sw');
  }

  const precache = precacheList(OUT);
  const version = cacheVersion(OUT, precache);
  writeFileSync(join(OUT, 'sw.js'), renderWorker(version, precache));

  const assets = precache.length - SHELLS.length;
  console.log(`out/sw.js — version ${version}, ${precache.length} precached (${assets} assets)`);
}

/** Only when run as a script: the test imports this module for its pure parts. */
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
