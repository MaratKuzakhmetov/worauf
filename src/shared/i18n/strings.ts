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
  readonly practiceIntro: string;
  readonly startSession: string;
  readonly finishSession: string;
  readonly next: string;
  readonly why: string;
  readonly yourAnswer: string;
  readonly correctAnswer: string;
  readonly openInBrowser: string;
  readonly sessionOver: string;
  readonly again: string;
  readonly reviewMissed: string;
  readonly trainerKeys: string;
  readonly distractorNote: string;
  readonly kind: {
    readonly article: string;
    readonly preposition: string;
    readonly case: string;
  };
  readonly whyWechsel: (lemma: string, prep: string, kase: string) => string;
  readonly whyFixed: (prep: string, kase: string) => string;
  readonly scoreLine: (right: number, total: number) => string;
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
    practiceIntro:
      'Twelve items. Every wrong option is one you could plausibly have picked — most of them are the same preposition in another case.',
    startSession: 'Start',
    finishSession: 'Finish',
    next: 'Next',
    why: 'Why',
    yourAnswer: 'your answer',
    correctAnswer: 'correct',
    openInBrowser: 'Open in the browser',
    sessionOver: 'Session over',
    again: 'Again',
    reviewMissed: 'Missed',
    trainerKeys: '1–4 choose · Enter next · Esc finish',
    distractorNote: 'Wrong options lead with the same preposition in a different case',
    kind: {
      article: 'Preposition and article',
      preposition: 'Which preposition?',
      case: 'Which case?',
    },
    whyWechsel: (lemma, prep, kase) =>
      `${lemma} ${prep} is always ${kase}. The wo → Dativ / wohin → Akkusativ rule works for places, but a prepositional object is not a place: the case belongs to the pattern. You have to know it, not derive it.`,
    whyFixed: (prep, kase) =>
      `${prep} always takes ${kase}, wherever it appears — the case is not the hard part here, the preposition is.`,
    scoreLine: (right, total) => `${right} of ${total} right`,
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
    practiceIntro:
      'Двенадцать заданий. Каждый неверный вариант — тот, который можно было выбрать всерьёз: чаще всего это тот же предлог в другом падеже.',
    startSession: 'Начать',
    finishSession: 'Закончить',
    next: 'Дальше',
    why: 'Почему',
    yourAnswer: 'ваш ответ',
    correctAnswer: 'верно',
    openInBrowser: 'Открыть в справочнике',
    sessionOver: 'Сессия закончена',
    again: 'Ещё раз',
    reviewMissed: 'С ошибкой',
    trainerKeys: '1–4 выбор · Enter дальше · Esc закончить',
    distractorNote: 'Неверные варианты начинаются с того же предлога в другом падеже',
    kind: {
      article: 'Предлог и артикль',
      preposition: 'Какой предлог?',
      case: 'Какой падеж?',
    },
    whyWechsel: (lemma, prep, kase) =>
      `${lemma} ${prep} — всегда ${kase}. Правило «wo → Dativ / wohin → Akkusativ» работает для места, но предложное дополнение — не место: падеж принадлежит связке. Его надо знать, а не выводить.`,
    whyFixed: (prep, kase) =>
      `${prep} везде требует ${kase} — падеж здесь не самое трудное, трудное здесь предлог.`,
    scoreLine: (right, total) => `${right} из ${total} верно`,
    pos: { verb: 'глагол', adj: 'прилагательное', noun: 'существительное' },
  },
};
