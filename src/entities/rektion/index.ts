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
export { caseNumber, caseLabel, findRektion } from './model/selectors';
