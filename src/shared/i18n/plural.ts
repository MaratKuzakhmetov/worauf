/**
 * Russian agrees a counted noun by the LAST TWO digits, not by "one or more": 21 связка,
 * 23 связки, 25 связок, and 11–14 always take the last form. English needs none of this,
 * which is exactly why it gets skipped — the interface counted `203 связок` and `3 связок`
 * for a while, in an application whose whole subject is getting German endings right.
 */

export function pluralRu(n: number, one: string, few: string, many: string): string {
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 14) return many;
  const last = n % 10;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

export function pluralEn(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}
