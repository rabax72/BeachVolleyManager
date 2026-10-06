/**
 * Regole di punteggio del beach volley:
 * - al meglio dei 3 set; set 1 e 2 a 21, set 3 a 15;
 * - serve sempre uno scarto di almeno 2 punti;
 * - cambio campo ogni 7 punti totali (set a 21) o ogni 5 (set a 15).
 */

export const SETS_TO_WIN = 2;

export const setTarget = (setIndex: number): number => (setIndex < 2 ? 21 : 15);

export const switchInterval = (setIndex: number): number => (setIndex < 2 ? 7 : 5);

/** Vincitore del set (0 o 1) se il set è concluso, altrimenti null. */
export function setWinner(a: number, b: number, setIndex: number): 0 | 1 | null {
  const target = setTarget(setIndex);
  if (a >= target && a - b >= 2) return 0;
  if (b >= target && b - a >= 2) return 1;
  return null;
}

/** True se dopo il punteggio (a, b) le squadre devono cambiare campo. */
export function isSideSwitch(a: number, b: number, setIndex: number): boolean {
  const total = a + b;
  return total > 0 && total % switchInterval(setIndex) === 0 && setWinner(a, b, setIndex) === null;
}

/** Squadra che vincerebbe il set con il prossimo punto, se esiste. */
export function setPointFor(a: number, b: number, setIndex: number): 0 | 1 | null {
  if (setWinner(a + 1, b, setIndex) === 0) return 0;
  if (setWinner(a, b + 1, setIndex) === 1) return 1;
  return null;
}

export function matchWinner(setsWon: readonly [number, number]): 0 | 1 | null {
  if (setsWon[0] >= SETS_TO_WIN) return 0;
  if (setsWon[1] >= SETS_TO_WIN) return 1;
  return null;
}
