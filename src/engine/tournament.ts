/**
 * Formato torneo: 16 coppie, 4 gironi da 4 (girone all'italiana), le prime due di ogni
 * girone ai quarti di finale, poi semifinali e finale.
 * Piazzamenti: 1, 2, 3 (semifinalisti), 5 (quarti), 9 (terze nei gironi), 13 (quarte).
 */
import type { Group, GroupStanding, MatchSummary, Tournament, TournamentPhase } from './types';

export const TOURNAMENT_SIZE = 16;
const GROUP_NAMES = ['A', 'B', 'C', 'D'];
/** Distribuzione a serpentina delle teste di serie nei gironi. */
const SNAKE: number[][] = [
  [0, 7, 8, 15],
  [1, 6, 9, 14],
  [2, 5, 10, 13],
  [3, 4, 11, 12],
];
/** Accoppiamenti del girone per giornata (indici di posizione nel girone). */
const ROUND_ROBIN: [number, number][][] = [
  [
    [0, 3],
    [1, 2],
  ],
  [
    [0, 2],
    [1, 3],
  ],
  [
    [0, 1],
    [2, 3],
  ],
];

export const PHASES: TournamentPhase[] = ['group1', 'group2', 'group3', 'QF', 'SF', 'F', 'done'];

function match(id: string, a: string, b: string, stage: string): MatchSummary {
  return { id, pairIds: [a, b], winner: null, sets: [], stage };
}

/** Crea il torneo con le iscrizioni già ordinate per testa di serie (la migliore per prima). */
export function createTournament(defId: string, seededEntries: string[]): Tournament {
  if (seededEntries.length !== TOURNAMENT_SIZE) {
    throw new Error(`Servono ${TOURNAMENT_SIZE} coppie, ricevute ${seededEntries.length}`);
  }
  const groups: Group[] = SNAKE.map((idx, g) => {
    const pairIds = idx.map((i) => seededEntries[i]);
    const matches: MatchSummary[] = [];
    ROUND_ROBIN.forEach((round, r) =>
      round.forEach(([x, y], k) =>
        matches.push(
          match(`${defId}:G${GROUP_NAMES[g]}${r + 1}${k}`, pairIds[x], pairIds[y], `G${r + 1}`),
        ),
      ),
    );
    return { name: GROUP_NAMES[g], pairIds, matches };
  });
  return {
    defId,
    phase: 'group1',
    entries: [...seededEntries],
    groups,
    knockout: [],
    placements: {},
  };
}

/** Tutte le partite del torneo (gironi + eliminazione diretta). */
export function allMatches(t: Tournament): MatchSummary[] {
  return [...t.groups.flatMap((g) => g.matches), ...t.knockout];
}

const phaseStage: Partial<Record<TournamentPhase, string>> = {
  group1: 'G1',
  group2: 'G2',
  group3: 'G3',
  QF: 'QF',
  SF: 'SF',
  F: 'F',
};

/** Partite della fase corrente (giocate e non). */
export function phaseMatches(t: Tournament): MatchSummary[] {
  const stage = phaseStage[t.phase];
  if (!stage) return [];
  return allMatches(t).filter((m) => m.stage === stage);
}

export const pendingMatches = (t: Tournament): MatchSummary[] =>
  phaseMatches(t).filter((m) => m.winner === null);

/** Registra il risultato di una partita (funzione pura). */
export function recordResult(
  t: Tournament,
  matchId: string,
  winner: 0 | 1,
  sets: [number, number][],
): Tournament {
  const upd = (m: MatchSummary): MatchSummary =>
    m.id === matchId ? { ...m, winner, sets: sets.map((s) => [s[0], s[1]]) } : m;
  return {
    ...t,
    groups: t.groups.map((g) => ({ ...g, matches: g.matches.map(upd) })),
    knockout: t.knockout.map(upd),
  };
}

export function groupStandings(g: Group, seedOrder: string[]): GroupStanding[] {
  const table: Record<string, GroupStanding> = {};
  for (const id of g.pairIds) {
    table[id] = {
      pairId: id,
      played: 0,
      wins: 0,
      setsWon: 0,
      setsLost: 0,
      pointsWon: 0,
      pointsLost: 0,
    };
  }
  const h2h: Record<string, string> = {};
  for (const m of g.matches) {
    if (m.winner === null) continue;
    const [a, b] = m.pairIds;
    const ta = table[a];
    const tb = table[b];
    ta.played++;
    tb.played++;
    const w = m.winner === 0 ? ta : tb;
    w.wins++;
    h2h[`${a}>${b}`] = m.winner === 0 ? a : b;
    h2h[`${b}>${a}`] = m.winner === 0 ? a : b;
    for (const [x, y] of m.sets) {
      ta.pointsWon += x;
      ta.pointsLost += y;
      tb.pointsWon += y;
      tb.pointsLost += x;
      if (x > y) {
        ta.setsWon++;
        tb.setsLost++;
      } else {
        tb.setsWon++;
        ta.setsLost++;
      }
    }
  }
  const ratio = (w: number, l: number): number => (l === 0 ? w + 1000 : w / l);
  return Object.values(table).sort((x, y) => {
    if (y.wins !== x.wins) return y.wins - x.wins;
    // Scontro diretto se solo due a pari vittorie
    const tied = Object.values(table).filter((s) => s.wins === x.wins);
    if (tied.length === 2) {
      const w = h2h[`${x.pairId}>${y.pairId}`];
      if (w) return w === x.pairId ? -1 : 1;
    }
    const sr = ratio(y.setsWon, y.setsLost) - ratio(x.setsWon, x.setsLost);
    if (sr !== 0) return sr;
    const pr = ratio(y.pointsWon, y.pointsLost) - ratio(x.pointsWon, x.pointsLost);
    if (pr !== 0) return pr;
    return seedOrder.indexOf(x.pairId) - seedOrder.indexOf(y.pairId);
  });
}

const winnerOf = (m: MatchSummary): string => {
  if (m.winner === null) throw new Error(`Partita ${m.id} non conclusa`);
  return m.pairIds[m.winner];
};
const loserOf = (m: MatchSummary): string => {
  if (m.winner === null) throw new Error(`Partita ${m.id} non conclusa`);
  return m.pairIds[m.winner === 0 ? 1 : 0];
};

/**
 * Passa alla fase successiva se tutte le partite della fase corrente sono concluse.
 * Restituisce il torneo invariato altrimenti.
 */
export function advancePhase(t: Tournament): Tournament {
  if (t.phase === 'done' || pendingMatches(t).length > 0) return t;
  const placements = { ...t.placements };
  let knockout = [...t.knockout];
  let phase: TournamentPhase;
  switch (t.phase) {
    case 'group1':
      phase = 'group2';
      break;
    case 'group2':
      phase = 'group3';
      break;
    case 'group3': {
      const st = t.groups.map((g) => groupStandings(g, t.entries));
      st.forEach((s) => {
        placements[s[2].pairId] = 9;
        placements[s[3].pairId] = 13;
      });
      const [A, B, C, D] = st;
      knockout = [
        match(`${t.defId}:QF0`, A[0].pairId, B[1].pairId, 'QF'),
        match(`${t.defId}:QF1`, C[0].pairId, D[1].pairId, 'QF'),
        match(`${t.defId}:QF2`, B[0].pairId, A[1].pairId, 'QF'),
        match(`${t.defId}:QF3`, D[0].pairId, C[1].pairId, 'QF'),
      ];
      phase = 'QF';
      break;
    }
    case 'QF': {
      const qf = knockout.filter((m) => m.stage === 'QF');
      qf.forEach((m) => (placements[loserOf(m)] = 5));
      knockout.push(
        match(`${t.defId}:SF0`, winnerOf(qf[0]), winnerOf(qf[1]), 'SF'),
        match(`${t.defId}:SF1`, winnerOf(qf[2]), winnerOf(qf[3]), 'SF'),
      );
      phase = 'SF';
      break;
    }
    case 'SF': {
      const sf = knockout.filter((m) => m.stage === 'SF');
      sf.forEach((m) => (placements[loserOf(m)] = 3));
      knockout.push(match(`${t.defId}:F`, winnerOf(sf[0]), winnerOf(sf[1]), 'F'));
      phase = 'F';
      break;
    }
    case 'F': {
      const f = knockout.find((m) => m.stage === 'F');
      if (!f) throw new Error('Finale mancante');
      placements[winnerOf(f)] = 1;
      placements[loserOf(f)] = 2;
      phase = 'done';
      break;
    }
  }
  return { ...t, phase, knockout, placements };
}

/** Vincitore del torneo, se concluso. */
export function tournamentWinner(t: Tournament): string | null {
  return Object.entries(t.placements).find(([, p]) => p === 1)?.[0] ?? null;
}
