import { describe, expect, it } from 'vitest';
import { localePath, localeUrl } from './urls';

const onDomain = { origin: 'https://worauf.app', basePath: '' };
const onGithubPages = { origin: 'https://maratkuzakhmetov.github.io', basePath: '/worauf' };

describe('localePath', () => {
  it('always carries the locale segment, including the default one', () => {
    // A default locale served without a segment would give one page two URLs (ADR 0002).
    expect(localePath('en', onDomain)).toBe('/en/');
    expect(localePath('ru', onDomain)).toBe('/ru/');
  });

  it('includes basePath when the site is not at a domain root', () => {
    expect(localePath('en', onGithubPages)).toBe('/worauf/en/');
  });

  it('always ends in a slash, matching trailingSlash: true', () => {
    for (const config of [onDomain, onGithubPages]) {
      expect(localePath('en', config).endsWith('/')).toBe(true);
    }
  });
});

describe('localeUrl', () => {
  it('is fully qualified — Google ignores a relative hreflang', () => {
    expect(localeUrl('en', onDomain)).toBe('https://worauf.app/en/');
    expect(localeUrl('ru', onDomain)).toBe('https://worauf.app/ru/');
  });

  it('does not drop basePath, which is the bug this module exists to prevent', () => {
    expect(localeUrl('ru', onGithubPages)).toBe('https://maratkuzakhmetov.github.io/worauf/ru/');
  });

  it('normalises a sloppy config rather than emitting a double slash', () => {
    expect(localeUrl('en', { origin: 'https://worauf.app/', basePath: '/worauf/' })).toBe(
      'https://worauf.app/worauf/en/',
    );
    expect(localeUrl('en', { origin: 'https://worauf.app', basePath: 'worauf' })).toBe(
      'https://worauf.app/worauf/en/',
    );
  });
});
