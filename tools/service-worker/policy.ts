/**
 * The service worker's routing policy: the half of it that is pure, and therefore the half
 * that can be tested at all.
 *
 * These functions are not imported by the worker — they are **serialised into it** by
 * `build-sw.ts` with `Function.prototype.toString()`, which yields the compiled JavaScript
 * with the types already stripped. So the code the tests exercise is the same code object
 * that ships, and there is no second hand-written copy to drift. That matters more here than
 * anywhere else in the project: ADR 0006 points out that a worker bug shows up on the
 * *second* visit, where nobody is looking, and CI cannot see it at all.
 *
 * Runs in Node, outside the FSD graph, never shipped as a module (CLAUDE.md).
 */

/** Everything below this prefix carries a content hash, so a cached name cannot go stale. */
export const STATIC_PREFIX = '/_next/static/';

export type Route = 'static' | 'document' | 'passthrough';

/** Just the parts of `Request` the policy reads, so a test can pass a plain object. */
export type RoutedRequest = { readonly method: string; readonly mode: string };

/**
 * `document` deliberately covers both halves of a route: the prerendered HTML that a cold
 * load asks for, and the RSC payload (`.txt`) that the App Router asks for on a soft
 * navigation. The router fetches that payload per route, so caching the shell alone does
 * not make an unvisited route work offline — see the PLAN.md write-up.
 */
export function routeFor(request: RoutedRequest, url: URL, origin: string): Route {
  if (request.method !== 'GET') return 'passthrough';
  if (url.origin !== origin) return 'passthrough';
  if (url.pathname.startsWith(STATIC_PREFIX)) return 'static';
  if (request.mode === 'navigate') return 'document';
  if (url.pathname.endsWith('.txt')) return 'document';
  return 'passthrough';
}

export function cacheNames(version: string): { static: string; documents: string } {
  return { static: `worauf-static-${version}`, documents: `worauf-documents-${version}` };
}

/**
 * Only this app's caches, and only those from another version. The prefix check is not
 * decoration: the origin may hold caches this worker never created, and deleting one of
 * those would be someone else's bug to debug.
 */
export function isStale(name: string, version: string): boolean {
  return name.startsWith('worauf-') && !name.endsWith(`-${version}`);
}
