export { authoredFile, authoredEntry, authoredPattern, grammaticalCase, partOfSpeech } from './model/schema';
export type {
  Rektion,
  AuthoredFile,
  AuthoredEntry,
  AuthoredPattern,
  GrammaticalCase,
  PartOfSpeech,
  Bilingual,
  Example,
} from './model/schema';
export { rektionen } from './model/dataset.generated';
export { caseNumber, caseTag, caseLabel, findRektion } from './model/selectors';
export {
  words,
  findWord,
  findPattern,
  wordsWithPreposition,
  prepositionCounts,
  headword,
} from './model/words';
export type { WordEntry } from './model/words';
export { PatternCard } from './ui/PatternCard';
