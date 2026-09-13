/**
 * MediaWiki search, paginated. The search endpoint is the one part of this pipeline that is
 * genuinely rate-limited (DATA_SOURCES.md §1/§2: "12 rapid list=search calls triggered
 * 'too many requests'; 3–8s spacing worked") — everything else here is static-file fetches
 * with no observed limit. Spacing is applied only between SEARCH pages, never per title.
 */

const USER_AGENT = 'worauf-data-import/0 (static learner reference; contact via repo issues)';

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function searchTitles(
  host: 'en.wiktionary.org' | 'de.wiktionary.org',
  insourceRegex: string,
): Promise<string[]> {
  const titles: string[] = [];
  let offset: number | undefined;

  for (;;) {
    const url = new URL(`https://${host}/w/api.php`);
    url.searchParams.set('action', 'query');
    url.searchParams.set('list', 'search');
    url.searchParams.set('srsearch', `insource:/${insourceRegex}/`);
    url.searchParams.set('srnamespace', '0');
    url.searchParams.set('srlimit', '500');
    url.searchParams.set('format', 'json');
    if (offset !== undefined) url.searchParams.set('sroffset', String(offset));

    const res = await fetch(url, { headers: { 'user-agent': USER_AGENT } });
    if (!res.ok) throw new Error(`search ${host} failed: HTTP ${res.status}`);
    const body = (await res.json()) as {
      query?: { search?: { title: string }[] };
      continue?: { sroffset?: number };
    };

    for (const hit of body.query?.search ?? []) titles.push(hit.title);

    const next = body.continue?.sroffset;
    if (next === undefined) break;
    offset = next;
    await sleep(4000);
  }

  return titles;
}
