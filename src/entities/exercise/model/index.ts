/** Model-only door — see `@/entities/rektion/model` for why this exists. */
export type { Item, ItemKind, Option, Result, Verdict } from './schema';
export { buildItem, kindsFor, gapArticle, casesFor, isCorrect, normalise, shuffle } from './build';
export type { Random } from './build';
export {
  startSession,
  planItems,
  reduce,
  isFinished,
  score,
  defaultConfig,
  SESSION_LENGTH,
  RETRY_GAP,
} from './session';
export type { Session, SessionAction, SessionConfig } from './session';
export {
  startRun,
  advance,
  serialiseRun,
  restoreRun,
  isSavedRun,
  seededRandom,
  newSeed,
} from './run';
export type { Run, SavedRun } from './run';
