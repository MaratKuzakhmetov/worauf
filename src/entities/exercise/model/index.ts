/** Model-only door — see `@/entities/rektion/model` for why this exists. */
export type { Item, ItemKind, Option, Result, Verdict } from './schema';
export { buildItem, kindsFor, gapArticle, casesFor, isCorrect, normalise, shuffle } from './build';
export type { Random } from './build';
export {
  startSession,
  resumeSession,
  sessionFrom,
  orderCandidates,
  planItems,
  reduce,
  isFinished,
  score,
  defaultConfig,
  SESSION_LENGTH,
  RETRY_GAP,
} from './session';
export type {
  PatternWeight,
  Session,
  SessionAction,
  SessionConfig,
  StreamFor,
} from './session';
export {
  startRun,
  advance,
  serialiseRun,
  restoreRun,
  isSavedRun,
  seededRandom,
  streamsFor,
  newSeed,
} from './run';
export type { Run, SavedRun } from './run';
