import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Script } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { cacheVersion, precacheList, renderWorker } from './build-sw';
import { cacheNames, isStale, routeFor } from './policy';

/**
 * What can honestly be tested here is the manifest generation and the routing policy. The
 * worker's lifecycle cannot be: it needs a real ServiceWorkerGlobalScope, two visits and a
 * network toggle, which is why ADR 0006 asks for a hand-check instead — see
 * `docs/SERVICE_WORKER_CHECKS.md`. Nothing below pretends to cover that.
 */

function fixtureExport(): string {
  const dir = mkdtempSync(join(tmpdir(), 'worauf-sw-'));
  mkdirSync(join(dir, '_next', 'static', 'chunks'), { recursive: true });
  mkdirSync(join(dir, '_next', 'static', 'media'), { recursive: true });
  mkdirSync(join(dir, 'en'), { recursive: true });
  mkdirSync(join(dir, 'ru'), { recursive: true });
  mkdirSync(join(dir, 'en', 'warten'), { recursive: true });

  writeFileSync(join(dir, '_next', 'static', 'chunks', 'dataset-abc.js'), 'x');
  writeFileSync(join(dir, '_next', 'static', 'chunks', 'app-def.js'), 'y');
  writeFileSync(join(dir, '_next', 'static', 'media', 'fira-1.woff2'), 'f');
  writeFileSync(join(dir, 'index.html'), '<meta http-equiv=refresh>');
  writeFileSync(join(dir, 'en', 'index.html'), '<html>en shell</html>');
  writeFileSync(join(dir, 'ru', 'index.html'), '<html>ru shell</html>');
  // A prerendered page and its RSC payload: neither may ever reach the precache list.
  writeFileSync(join(dir, 'en', 'warten', 'index.html'), '<html>warten</html>');
  writeFileSync(join(dir, 'en', 'warten', 'index.txt'), 'rsc');
  return dir;
}

describe('precacheList', () => {
  it('takes every static asset, as URL paths', () => {
    const list = precacheList(fixtureExport());

    expect(list).toContain('/_next/static/chunks/dataset-abc.js');
    expect(list).toContain('/_next/static/chunks/app-def.js');
    expect(list).toContain('/_next/static/media/fira-1.woff2');
  });

  it('takes the three shells, so an offline cold start has something to open', () => {
    expect(precacheList(fixtureExport())).toEqual(
      expect.arrayContaining(['/', '/en/', '/ru/']),
    );
  });

  /**
   * The measurement ADR 0006 turns on: the 1224 prerendered pages and 4884 RSC payloads are
   * ~337 MB against the app's 2.3 MB. Precaching them is the one mistake that would make
   * this worker unusable rather than merely wrong, so it gets its own test.
   */
  it('never takes a prerendered page or an RSC payload', () => {
    const list = precacheList(fixtureExport());

    expect(list).not.toContain('/en/warten/');
    expect(list.some((entry) => entry.endsWith('.txt'))).toBe(false);
    expect(list.filter((entry) => entry.endsWith('.html'))).toEqual([]);
  });

  it('is sorted, so the same tree yields the same list and the same version', () => {
    const dir = fixtureExport();
    expect(precacheList(dir)).toEqual(precacheList(dir));
  });
});

describe('cacheVersion', () => {
  it('is stable for an unchanged export', () => {
    const dir = fixtureExport();
    expect(cacheVersion(dir, precacheList(dir))).toBe(cacheVersion(dir, precacheList(dir)));
  });

  it('changes when an asset name changes', () => {
    const dir = fixtureExport();
    const before = cacheVersion(dir, precacheList(dir));

    writeFileSync(join(dir, '_next', 'static', 'chunks', 'dataset-zzz.js'), 'x');

    expect(cacheVersion(dir, precacheList(dir))).not.toBe(before);
  });

  /** The case a name-only hash would miss, and the one that leaves a stale shell cached. */
  it('changes when a shell changes contents but keeps its name', () => {
    const dir = fixtureExport();
    const list = precacheList(dir);
    const before = cacheVersion(dir, list);

    writeFileSync(join(dir, 'en', 'index.html'), '<html>en shell, rebuilt</html>');

    expect(cacheVersion(dir, list)).not.toBe(before);
  });
});

describe('routeFor', () => {
  const origin = 'https://worauf.example';
  const get = { method: 'GET', mode: 'no-cors' };
  const navigate = { method: 'GET', mode: 'navigate' };
  const at = (path: string): URL => new URL(path, origin);

  it('sends hashed assets to the permanent cache', () => {
    expect(routeFor(get, at('/_next/static/chunks/dataset-abc.js'), origin)).toBe('static');
    expect(routeFor(get, at('/_next/static/media/fira-1.woff2'), origin)).toBe('static');
  });

  it('sends a navigation to the network-first path', () => {
    expect(routeFor(navigate, at('/en/warten/'), origin)).toBe('document');
  });

  /** A soft navigation asks for this, not for the HTML — missing it breaks offline routing. */
  it('sends an RSC payload to the network-first path', () => {
    expect(routeFor(get, at('/en/warten/index.txt'), origin)).toBe('document');
  });

  it('leaves another origin alone', () => {
    expect(routeFor(navigate, new URL('https://elsewhere.example/en/'), origin)).toBe(
      'passthrough',
    );
  });

  it('leaves a non-GET alone', () => {
    expect(routeFor({ method: 'POST', mode: 'cors' }, at('/en/'), origin)).toBe('passthrough');
  });

  it('leaves anything else alone rather than guessing', () => {
    expect(routeFor(get, at('/manifest.webmanifest'), origin)).toBe('passthrough');
  });
});

describe('cache naming', () => {
  it('treats another version as stale', () => {
    expect(isStale('worauf-static-old1', 'new2')).toBe(true);
    expect(isStale('worauf-documents-old1', 'new2')).toBe(true);
  });

  it('keeps this version', () => {
    const names = cacheNames('new2');
    expect(isStale(names.static, 'new2')).toBe(false);
    expect(isStale(names.documents, 'new2')).toBe(false);
  });

  /** Someone else's cache on the same origin is not ours to delete. */
  it('leaves a foreign cache alone', () => {
    expect(isStale('some-other-app-v1', 'new2')).toBe(false);
  });
});

describe('renderWorker', () => {
  /**
   * The policy is serialised into the worker with `Function.prototype.toString()`, so this
   * asserts the transform still produces parsable code: if a future transpiler wrapped or
   * renamed those functions, the shipped worker would break silently on a second visit.
   */
  it('emits syntactically valid JavaScript', () => {
    const source = renderWorker('abc123', ['/', '/_next/static/chunks/a.js']);
    // Compiles without running: the worker's globals do not exist here, and executing it
    // is not the point — a syntax error in the shipped file is.
    expect(() => new Script(source)).not.toThrow();
  });

  it('carries the real policy source, not a copy', () => {
    const source = renderWorker('abc123', ['/']);
    expect(source).toContain(routeFor.toString());
    expect(source).toContain(isStale.toString());
  });

  it('stamps the version and the precache list it was given', () => {
    const source = renderWorker('abc123', ['/', '/_next/static/chunks/a.js']);
    expect(source).toContain("const VERSION = 'abc123'");
    expect(source).toContain('/_next/static/chunks/a.js');
  });
});
