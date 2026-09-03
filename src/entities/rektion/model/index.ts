/**
 * The slice's MODEL-ONLY door.
 *
 * `../index.ts` is the door for application code and re-exports everything here plus the
 * React components. This one exists because two consumers run under a plain Node loader
 * that cannot read a CSS module: the build tooling in `tools/`, and the exercise entity,
 * which the tooling imports in turn. Naming the door beats letting every consumer reach
 * for its own file path, which is what was happening before.
 */
export {
  authoredFile,
  authoredEntry,
  authoredPattern,
  grammaticalCase,
  partOfSpeech,
} from './schema';
export type {
  Rektion,
  AuthoredFile,
  AuthoredEntry,
  AuthoredPattern,
  GrammaticalCase,
  PartOfSpeech,
  Bilingual,
  Example,
} from './schema';
export { rektionen } from './dataset.generated';
export { findPreposition, checkCaseAgreement, counterpartDeterminer, tokenize } from './german';
export type { PrepositionSighting, CaseCheck } from './german';
export { caseNumber, caseTag, caseLabel, findRektion, patternHeadword } from './selectors';
export {
  words,
  findWord,
  findPattern,
  wordsWithPreposition,
  prepositionCounts,
  headword,
} from './words';
export type { WordEntry } from './words';
