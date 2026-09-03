import type { Locale } from './config';

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
  readonly patterns: string;
  readonly words: string;
  readonly prepositions: string;
  readonly startHere: string;
  readonly onlyPattern: string;
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
    patterns: 'patterns',
    words: 'words',
    prepositions: 'prepositions',
    startHere: 'Start here',
    onlyPattern: 'governs this preposition and no other',
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
    patterns: 'связок',
    words: 'слов',
    prepositions: 'предлогов',
    startHere: 'С чего начать',
    onlyPattern: 'управляет только этим предлогом',
    pos: { verb: 'глагол', adj: 'прилагательное', noun: 'существительное' },
  },
};
