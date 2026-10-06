import { describe, expect, it } from 'vitest';
import {
  isSideSwitch,
  matchWinner,
  setPointFor,
  setTarget,
  setWinner,
  switchInterval,
} from '../scoring';

describe('regole di punteggio', () => {
  it('i primi due set vanno a 21, il terzo a 15', () => {
    expect(setTarget(0)).toBe(21);
    expect(setTarget(1)).toBe(21);
    expect(setTarget(2)).toBe(15);
  });

  it('serve uno scarto di 2 punti', () => {
    expect(setWinner(21, 19, 0)).toBe(0);
    expect(setWinner(21, 20, 0)).toBeNull();
    expect(setWinner(22, 20, 0)).toBe(0);
    expect(setWinner(28, 30, 1)).toBe(1);
    expect(setWinner(15, 13, 2)).toBe(0);
    expect(setWinner(15, 14, 2)).toBeNull();
    expect(setWinner(14, 16, 2)).toBe(1);
    expect(setWinner(20, 15, 0)).toBeNull();
  });

  it('cambio campo ogni 7 punti nei set a 21 e ogni 5 nel set a 15', () => {
    expect(switchInterval(0)).toBe(7);
    expect(switchInterval(2)).toBe(5);
    expect(isSideSwitch(4, 3, 0)).toBe(true);
    expect(isSideSwitch(10, 4, 1)).toBe(true);
    expect(isSideSwitch(5, 3, 0)).toBe(false);
    expect(isSideSwitch(3, 2, 2)).toBe(true);
    expect(isSideSwitch(6, 4, 2)).toBe(true);
    expect(isSideSwitch(4, 3, 2)).toBe(false);
    expect(isSideSwitch(0, 0, 0)).toBe(false);
  });

  it('nessun cambio campo a set concluso', () => {
    // 21-14 = 35 punti (multiplo di 7) ma il set è finito
    expect(isSideSwitch(21, 14, 0)).toBe(false);
  });

  it('riconosce il set point', () => {
    expect(setPointFor(20, 18, 0)).toBe(0);
    expect(setPointFor(20, 20, 0)).toBeNull();
    expect(setPointFor(13, 14, 2)).toBe(1);
  });

  it('la partita si vince con 2 set', () => {
    expect(matchWinner([2, 0])).toBe(0);
    expect(matchWinner([1, 2])).toBe(1);
    expect(matchWinner([1, 1])).toBeNull();
  });
});
