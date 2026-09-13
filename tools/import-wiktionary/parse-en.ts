import { prepositionKeys } from '@/entities/preposition';
import type { GrammaticalCase } from '@/entities/rektion/model';

/**
 * The `{{+obj|de|…}}` mini-language, parsed from the raw `args["2"]` string
 * (DATA_SOURCES.md §1). Deliberately tolerant: the source itself documents ~5% malformed
 * entries (`":von"` with no case, `":für(acc/a predicate adjective)"` with junk in the case
 * slot), and a parser that throws on those would lose the other 95%.
 *
 * The discriminator is the leading colon: `:auf(acc)` is a PREPOSITION plus its case; a bare
 * `acc` / `dat` / `gen` with no colon is a caseless direct/indirect object and carries no
 * government information this project can use, so it is silently not matched — that is a
 * feature of the regex, not a gap.
 */

const CASE_WORDS: Readonly<Record<string, GrammaticalCase>> = {
  acc: 'akk',
  dat: 'dat',
  gen: 'gen',
};

export type ParsedArg = {
  readonly prep: string;
  readonly case: GrammaticalCase;
  readonly supported: boolean;
  /** The `<…>` gloss immediately following the match, if the source gave one. */
  readonly gloss?: string;
};

const TERM = /:([a-zäöüßA-ZÄÖÜ]+)\(([^)]*)\)(?:<([^>]*)>)?/g;

export function parseObjArg(raw: string): readonly ParsedArg[] {
  const found: ParsedArg[] = [];
  for (const match of raw.matchAll(TERM)) {
    const prep = match[1]?.toLowerCase();
    const caseRaw = match[2]?.trim().split(/[\s/]/)[0]?.toLowerCase();
    if (!prep || !caseRaw) continue;

    const kase = CASE_WORDS[caseRaw];
    if (!kase) continue; // malformed case slot — quarantined by omission, not a crash

    found.push({
      prep,
      case: kase,
      supported: prepositionKeys.includes(prep),
      gloss: match[3]?.trim() || undefined,
    });
  }
  return found;
}
