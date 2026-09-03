import type { Locale } from './config';
import { pluralEn, pluralRu } from './plural';

/**
 * The whole interface is about twenty strings — a table, not a library (CLAUDE.md).
 * The counters are functions because word order around a number is not the same in the
 * two languages, and a `{n}` placeholder would only postpone that problem.
 */
export type Strings = {
  readonly title: string;
  readonly description: string;
  readonly tagline: string;
  readonly browse: string;
  readonly practice: string;
  readonly toLightTheme: string;
  readonly toDarkTheme: string;
  readonly languageLabel: string;
  readonly wordsPane: string;
  readonly prepositionsPane: string;
  readonly severalPrepositions: string;
  readonly patternOfTheDay: string;
  readonly anotherPattern: string;
  readonly noSuchCombination: string;
  readonly youProbablyWant: string;
  readonly sameWordOtherPreposition: string;
  readonly patterns: (n: number) => string;
  readonly words: (n: number) => string;
  readonly prepositions: (n: number) => string;
  readonly startHere: string;
  readonly onlyPattern: string;
  readonly searchLabel: string;
  readonly searchPlaceholder: string;
  readonly clearSearch: string;
  readonly maybeYouMean: string;
  readonly approximate: string;
  readonly nothingFound: (total: number) => string;
  readonly wordsFound: (shown: number, total: number) => string;
  readonly prepositionsAvailable: (shown: number, total: number) => string;
  readonly keyboardHint: string;
  readonly pos: { readonly verb: string; readonly adj: string; readonly noun: string };
};

export const strings: Record<Locale, Strings> = {
  en: {
    title: 'worauf — German verbs, adjectives and nouns with their prepositions',
    description:
      'Which preposition goes with which German verb, adjective or noun — and in which case.',
    tagline: 'Which preposition, and which case.',
    browse: 'Browse',
    practice: 'Practice',
    toLightTheme: 'Switch to light theme',
    toDarkTheme: 'Switch to dark theme',
    languageLabel: 'Language',
    wordsPane: 'Words',
    prepositionsPane: 'Prepositions',
    severalPrepositions: 'This word governs more than one preposition',
    patternOfTheDay: 'Pattern of the day',
    anotherPattern: 'Pick any word or preposition',
    noSuchCombination: 'does not combine with',
    youProbablyWant: 'You probably want',
    sameWordOtherPreposition: 'Same word, different preposition',
    patterns: (n) => `${n} ${pluralEn(n, 'pattern', 'patterns')}`,
    words: (n) => `${n} ${pluralEn(n, 'word', 'words')}`,
    prepositions: (n) => `${n} ${pluralEn(n, 'preposition', 'prepositions')}`,
    startHere: 'Start here',
    onlyPattern: 'governs this preposition and no other',
    searchLabel: 'Search',
    searchPlaceholder: 'Word, preposition or meaning',
    clearSearch: 'Clear the search',
    maybeYouMean: 'Did you mean:',
    approximate: 'No exact match — closest spellings',
    nothingFound: (total) => `The base holds ${total} words. This one is not among them.`,
    wordsFound: (shown, total) => `${shown} of ${total} words`,
    prepositionsAvailable: (shown, total) => `${shown} of ${total} prepositions available`,
    keyboardHint: '/ search · ↑↓←→ move · Space random · Esc clear',
    pos: { verb: 'verb', adj: 'adjective', noun: 'noun' },
  },
  ru: {
    title: 'worauf — немецкие глаголы, прилагательные и существительные с предлогами',
    description:
      'Какой предлог с каким немецким глаголом, прилагательным или существительным — и в каком падеже.',
    tagline: 'Какой предлог и какой падеж.',
    browse: 'Справочник',
    practice: 'Тренажёр',
    toLightTheme: 'Переключить на светлую тему',
    toDarkTheme: 'Переключить на тёмную тему',
    languageLabel: 'Язык',
    wordsPane: 'Слова',
    prepositionsPane: 'Предлоги',
    severalPrepositions: 'У этого слова несколько предлогов',
    patternOfTheDay: 'Связка дня',
    anotherPattern: 'Выберите слово или предлог',
    noSuchCombination: 'не сочетается с',
    youProbablyWant: 'Вероятно, вам нужно',
    sameWordOtherPreposition: 'То же слово, другой предлог',
    patterns: (n) => `${n} ${pluralRu(n, 'связка', 'связки', 'связок')}`,
    words: (n) => `${n} ${pluralRu(n, 'слово', 'слова', 'слов')}`,
    prepositions: (n) => `${n} ${pluralRu(n, 'предлог', 'предлога', 'предлогов')}`,
    startHere: 'С чего начать',
    onlyPattern: 'управляет только этим предлогом',
    searchLabel: 'Поиск',
    searchPlaceholder: 'Слово, предлог или значение',
    clearSearch: 'Очистить поиск',
    maybeYouMean: 'Возможно:',
    approximate: 'Точного совпадения нет — ближайшие по написанию',
    nothingFound: (total) =>
      `В базе ${total} ${pluralRu(total, 'слово', 'слова', 'слов')}, этого среди них нет.`,
    wordsFound: (shown, total) => `найдено ${shown} ${pluralRu(shown, 'слово', 'слова', 'слов')} из ${total}`,
    prepositionsAvailable: (shown, total) => `доступно ${shown} ${pluralRu(shown, 'предлог', 'предлога', 'предлогов')} из ${total}`,
    keyboardHint: '/ поиск · ↑↓←→ переход · Пробел случайная · Esc сброс',
    pos: { verb: 'глагол', adj: 'прилагательное', noun: 'существительное' },
  },
};
