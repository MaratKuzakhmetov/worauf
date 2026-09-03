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
  },
};
