import { describe, expect, it } from 'vitest';
import {
  callTimeout,
  canCallTimeout,
  createMatch,
  playRally,
  setTactics,
  simulateMatch,
  type MatchState,
} from '../match';
import { buildSetup } from '../matchSetup';
import { setWinner } from '../scoring';
import type { Conditions } from '../types';
import { CALM, makePair } from './helpers';

function setupFor(
  levelA: number,
  levelB: number,
  seed: number,
  conditions: Conditions = CALM,
  sameSeed = false,
) {
  const a = makePair('A', levelA, 1001);
  const b = makePair('B', levelB, sameSeed ? 1001 : 2002);
  const players = { ...a.players, ...b.players };
  return buildSetup(`m${seed}`, seed, [a.pair, b.pair], players, conditions);
}

describe('motore partita', () => {
  it('è deterministico dato il seed', () => {
    const r1 = simulateMatch(setupFor(12, 12, 42)).result;
    const r2 = simulateMatch(setupFor(12, 12, 42)).result;
    expect(r1).toEqual(r2);
    const r3 = simulateMatch(setupFor(12, 12, 43)).result;
    expect(JSON.stringify(r3)).not.toEqual(JSON.stringify(r1));
  });

  it('la partita passo-passo coincide con la simulazione rapida', () => {
    const setup = setupFor(12, 13, 77);
    let s: MatchState = createMatch(setup);
    while (!s.finished) s = playRally(s);
    const fast = simulateMatch(setup, { aiControl: [false, false] }).result;
    expect(s.sets).toEqual(fast.sets);
  });

  it('rispetta le regole dei set in ogni partita simulata', () => {
    for (let seed = 0; seed < 300; seed++) {
      const { result } = simulateMatch(setupFor(11, 12, seed));
      const wonByWinner = result.sets.filter(
        ([a, b], i) => setWinner(a, b, i) === result.winner,
      ).length;
      expect(wonByWinner).toBe(2);
      expect(result.sets.length === 2 || result.sets.length === 3).toBe(true);
      result.sets.forEach(([a, b], i) => {
        const target = i < 2 ? 21 : 15;
        expect(Math.max(a, b)).toBeGreaterThanOrEqual(target);
        expect(Math.abs(a - b)).toBeGreaterThanOrEqual(2);
        // Oltre il target si vince esattamente con 2 punti di scarto
        if (Math.max(a, b) > target) expect(Math.abs(a - b)).toBe(2);
      });
    }
  });

  it('segnala il cambio campo ogni 7 punti (5 nel terzo set)', () => {
    let s: MatchState = createMatch(setupFor(12, 12, 7));
    while (!s.finished) s = playRally(s);
    for (const e of s.events) {
      if (e.kind === 'sideSwitch') {
        const total = e.score[0] + e.score[1];
        expect(total % (e.setIndex < 2 ? 7 : 5)).toBe(0);
      }
    }
    const switches = s.events.filter((e) => e.kind === 'sideSwitch' && e.setIndex === 0);
    const firstSet = s.sets[0];
    expect(switches.length).toBe(Math.floor((firstSet[0] + firstSet[1] - 1) / 7));
  });

  it('alterna correttamente i battitori', () => {
    let s: MatchState = createMatch(setupFor(12, 12, 9));
    const lastByTeam: [number, number] = [-1, -1];
    let prevTeam = -1;
    let turns = 0;
    for (let i = 0; i < 60 && !s.finished && s.setIndex === 0; i++) {
      if (s.servingTeam !== prevTeam) {
        const last = lastByTeam[s.servingTeam];
        if (last !== -1) expect(s.currentServer).toBe(1 - last);
        lastByTeam[s.servingTeam] = s.currentServer;
        prevTeam = s.servingTeam;
        turns++;
      }
      s = playRally(s);
    }
    expect(turns).toBeGreaterThan(5);
  });

  it('timeout: massimo uno per set per squadra', () => {
    let s = createMatch(setupFor(12, 12, 11));
    expect(canCallTimeout(s, 0)).toBe(true);
    s = callTimeout(s, 0);
    expect(canCallTimeout(s, 0)).toBe(false);
    expect(canCallTimeout(s, 1)).toBe(true);
    const again = callTimeout(s, 0);
    expect(again).toBe(s);
    while (s.setIndex === 0 && !s.finished) s = playRally(s);
    expect(canCallTimeout(s, 0)).toBe(true);
  });

  it('il cambio tattico è registrato e non altera lo stato precedente', () => {
    const s0 = createMatch(setupFor(12, 12, 12));
    const s1 = setTactics(s0, 0, { ...s0.tactics[0], serveRisk: 'aggressive' });
    expect(s0.tactics[0].serveRisk).not.toBe('aggressive');
    expect(s1.tactics[0].serveRisk).toBe('aggressive');
    expect(s1.events.at(-1)?.kind).toBe('tactics');
  });

  it('produce statistiche coerenti con il punteggio', () => {
    const { result } = simulateMatch(setupFor(12, 12, 99));
    const totalPoints = result.sets.reduce((a, [x, y]) => a + x + y, 0);
    expect(result.rallies).toBe(totalPoints);
  });

  it('il vento forte aumenta gli errori al servizio', () => {
    const windy: Conditions = { wind: 3, sun: 0, temperature: 26, sand: 'medium' };
    let calmErr = 0;
    let windErr = 0;
    for (let seed = 0; seed < 150; seed++) {
      const tactics = {
        serveRisk: 'normal',
        serveTarget: 'balanced',
        blockStyle: 'zone',
        attackRisk: 'medium',
        energy: 'normal',
      } as const;
      const a = makePair('A', 12, 1001);
      const b = makePair('B', 12, 2002);
      const players = { ...a.players, ...b.players };
      const c = simulateMatch(
        buildSetup('c', seed, [a.pair, b.pair], players, CALM, [tactics, tactics]),
        { aiControl: [false, false] },
      ).result;
      const w = simulateMatch(
        buildSetup('w', seed, [a.pair, b.pair], players, windy, [tactics, tactics]),
        { aiControl: [false, false] },
      ).result;
      for (const t of [0, 1])
        for (const i of [0, 1]) {
          calmErr += c.stats[t][i].serveErrors;
          windErr += w.stats[t][i].serveErrors;
        }
    }
    expect(windErr).toBeGreaterThan(calmErr);
  });
});

describe('bilanciamento statistico', () => {
  const N = 1000;

  it(`una coppia chiaramente superiore vince tra il 75% e il 95% su ${N} partite`, () => {
    let wins = 0;
    for (let seed = 0; seed < N; seed++) {
      if (simulateMatch(setupFor(14, 11, seed * 7919 + 1)).result.winner === 0) wins++;
    }
    const rate = wins / N;
    expect(rate).toBeGreaterThanOrEqual(0.75);
    expect(rate).toBeLessThanOrEqual(0.95);
  });

  it('coppie equivalenti vincono circa la metà delle volte', () => {
    let wins = 0;
    for (let seed = 0; seed < N; seed++) {
      if (simulateMatch(setupFor(12, 12, seed * 104729 + 3, CALM, true)).result.winner === 0)
        wins++;
    }
    // Coppie con attributi identici
    expect(wins / N).toBeGreaterThan(0.42);
    expect(wins / N).toBeLessThan(0.58);
  });

  it("l'upset resta possibile anche con grande divario", () => {
    let upsets = 0;
    for (let seed = 0; seed < N; seed++) {
      if (simulateMatch(setupFor(15, 10, seed + 17)).result.winner === 1) upsets++;
    }
    expect(upsets).toBeGreaterThan(0);
  });
});
