import { describe, expect, it } from 'vitest';
import {
  advancePhase,
  allMatches,
  createTournament,
  groupStandings,
  pendingMatches,
  recordResult,
  tournamentWinner,
} from '../tournament';
import type { Tournament } from '../types';

const entries = Array.from({ length: 16 }, (_, i) => `k${i + 1}`);

/** Vince sempre la coppia con il numero di seed più basso. */
function playPhase(t: Tournament): Tournament {
  let out = t;
  for (const m of pendingMatches(out)) {
    const seedA = entries.indexOf(m.pairIds[0]);
    const seedB = entries.indexOf(m.pairIds[1]);
    const winner = seedA < seedB ? 0 : 1;
    out = recordResult(
      out,
      m.id,
      winner,
      winner === 0
        ? [
            [21, 15],
            [21, 17],
          ]
        : [
            [15, 21],
            [17, 21],
          ],
    );
  }
  return advancePhase(out);
}

describe('torneo', () => {
  it('crea 4 gironi da 4 con distribuzione a serpentina', () => {
    const t = createTournament('T', entries);
    expect(t.groups).toHaveLength(4);
    expect(t.groups[0].pairIds).toEqual(['k1', 'k8', 'k9', 'k16']);
    expect(t.groups[3].pairIds).toEqual(['k4', 'k5', 'k12', 'k13']);
    expect(allMatches(t)).toHaveLength(24);
    // Ogni coppia gioca 3 partite nel girone
    for (const g of t.groups) {
      for (const id of g.pairIds) {
        expect(g.matches.filter((m) => m.pairIds.includes(id))).toHaveLength(3);
      }
    }
  });

  it('richiede 16 coppie', () => {
    expect(() => createTournament('T', entries.slice(0, 10))).toThrow();
  });

  it('non avanza finché ci sono partite da giocare', () => {
    const t = createTournament('T', entries);
    expect(advancePhase(t)).toBe(t);
  });

  it('svolge il torneo completo con piazzamenti corretti', () => {
    let t = createTournament('T', entries);
    let guard = 0;
    while (t.phase !== 'done' && guard++ < 10) t = playPhase(t);
    expect(t.phase).toBe('done');
    expect(tournamentWinner(t)).toBe('k1');
    const counts: Record<number, number> = {};
    Object.values(t.placements).forEach((p) => (counts[p] = (counts[p] ?? 0) + 1));
    expect(counts).toEqual({ 1: 1, 2: 1, 3: 2, 5: 4, 9: 4, 13: 4 });
    expect(Object.keys(t.placements)).toHaveLength(16);
    // Teste di serie 1 e 2 in metà tabellone diverse: si incontrano in finale
    const final = t.knockout.find((m) => m.stage === 'F')!;
    expect(final.pairIds.sort()).toEqual(['k1', 'k2']);
  });

  it('classifica del girone: vittorie, poi quoziente set, poi quoziente punti', () => {
    let t = createTournament('T', entries);
    const g = t.groups[0];
    // k16 batte tutti, k1 batte k8 e k9, k8 batte k9
    const results: Record<string, 0 | 1> = {};
    for (const m of g.matches) {
      const [a, b] = m.pairIds;
      const rank = (id: string) => (id === 'k16' ? 0 : id === 'k1' ? 1 : id === 'k8' ? 2 : 3);
      results[m.id] = rank(a) < rank(b) ? 0 : 1;
    }
    for (const [id, w] of Object.entries(results)) {
      t = recordResult(
        t,
        id,
        w,
        w === 0
          ? [
              [21, 10],
              [21, 10],
            ]
          : [
              [10, 21],
              [10, 21],
            ],
      );
    }
    const st = groupStandings(t.groups[0], entries);
    expect(st.map((x) => x.pairId)).toEqual(['k16', 'k1', 'k8', 'k9']);
    expect(st[0].wins).toBe(3);
    expect(st[0].setsWon).toBe(6);
  });
});
