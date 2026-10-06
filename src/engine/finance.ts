/** Finanze: transazioni, sponsor, obiettivi della dirigenza. */
import { PRIZE_SHARE, SPONSOR_NAMES } from '../data/world';
import type { Rng } from './rng';
import type {
  BoardObjective,
  Difficulty,
  GameState,
  Sponsor,
  SponsorObjective,
  Tier,
  Transaction,
} from './types';

export const emptyTierCount = (): Record<Tier, number> => ({
  open: 0,
  national: 0,
  challenger: 0,
  elite: 0,
});

export const DIFFICULTY_MULT: Record<Difficulty, number> = { easy: 1.4, normal: 1, hard: 0.7 };

export const prizeFor = (prizePool: number, placement: number): number =>
  Math.round((prizePool * (PRIZE_SHARE[placement] ?? 0)) / 10) * 10;

/** Contributo della dirigenza a inizio stagione. */
export function boardGrant(reputation: number, difficulty: Difficulty): number {
  return Math.round(((25000 + reputation * 9000) * DIFFICULTY_MULT[difficulty]) / 100) * 100;
}

export const STARTING_BALANCE: Record<Difficulty, number> = {
  easy: 90000,
  normal: 65000,
  hard: 45000,
};

const MAX_TRANSACTIONS = 400;

/** Aggiunge una transazione e aggiorna il saldo (muta lo stato passato: usare su bozze). */
export function addTransaction(
  state: GameState,
  kind: Transaction['kind'],
  amount: number,
  label: string,
): void {
  if (amount === 0) return;
  state.finance.balance += amount;
  state.finance.transactions.push({ season: state.season, week: state.week, kind, amount, label });
  if (state.finance.transactions.length > MAX_TRANSACTIONS) {
    state.finance.transactions.splice(0, state.finance.transactions.length - MAX_TRANSACTIONS);
  }
}

// ---------------------------------------------------------------- Sponsor

function sponsorObjective(rng: Rng, reputation: number): SponsorObjective {
  const r = Math.round(reputation);
  const opts: SponsorObjective[] =
    r <= 1
      ? [
          { kind: 'semifinals', target: 2 },
          { kind: 'titles', target: 1, tier: 'open' },
          { kind: 'rankTop', target: 40 },
        ]
      : r <= 2
        ? [
            { kind: 'semifinals', target: 4 },
            { kind: 'titles', target: 1, tier: 'national' },
            { kind: 'rankTop', target: 25 },
            { kind: 'tierEntries', target: 2, tier: 'challenger' },
          ]
        : r <= 3
          ? [
              { kind: 'semifinals', target: 6 },
              { kind: 'titles', target: 1, tier: 'challenger' },
              { kind: 'rankTop', target: 12 },
              { kind: 'tierEntries', target: 3, tier: 'elite' },
            ]
          : [
              { kind: 'titles', target: 1, tier: 'elite' },
              { kind: 'rankTop', target: 5 },
              { kind: 'semifinals', target: 8 },
            ];
  return rng.pick(opts);
}

export function generateSponsorOffers(
  rng: Rng,
  reputation: number,
  season: number,
  nextId: () => string,
): Sponsor[] {
  const names = rng.shuffle(SPONSOR_NAMES).slice(0, 3);
  return names.map((name, i) => {
    const weekly =
      Math.round(((180 + reputation * 230) * rng.range(0.75, 1.25) * (1 - i * 0.08)) / 10) * 10;
    return {
      id: nextId(),
      name,
      weeklyIncome: weekly,
      bonus: Math.round((weekly * rng.range(8, 14)) / 100) * 100,
      objective: sponsorObjective(rng, reputation),
      untilSeason: season + (rng.chance(0.4) ? 1 : 0),
    };
  });
}

export const MAX_SPONSORS = 2;

// ---------------------------------------------------------------- Valutazione obiettivi

export interface SeasonClubStats {
  titles: Record<Tier, number>;
  semifinals: number;
  entries: Record<Tier, number>;
  /** Miglior posizione nel ranking individuale di un giocatore del club. */
  bestRank: number | null;
}

const tierAtLeast = (tier: Tier, min: Tier): boolean => {
  const order: Tier[] = ['open', 'national', 'challenger', 'elite'];
  return order.indexOf(tier) >= order.indexOf(min);
};

export function objectiveProgress(
  obj: SponsorObjective | BoardObjective,
  stats: SeasonClubStats,
  balance: number,
): { value: number; met: boolean } {
  switch (obj.kind) {
    case 'titles':
    case 'titleTier': {
      const min = obj.tier ?? 'open';
      const value = (Object.entries(stats.titles) as [Tier, number][])
        .filter(([t]) => tierAtLeast(t, min))
        .reduce((a, [, n]) => a + n, 0);
      return { value, met: value >= obj.target };
    }
    case 'semifinals':
      return { value: stats.semifinals, met: stats.semifinals >= obj.target };
    case 'rankTop':
      return {
        value: stats.bestRank ?? 0,
        met: stats.bestRank !== null && stats.bestRank <= obj.target,
      };
    case 'tierEntries': {
      const min = obj.tier ?? 'open';
      const value = (Object.entries(stats.entries) as [Tier, number][])
        .filter(([t]) => tierAtLeast(t, min))
        .reduce((a, [, n]) => a + n, 0);
      return { value, met: value >= obj.target };
    }
    case 'finance':
      return { value: balance, met: balance >= obj.target };
  }
}

export function boardObjectiveFor(reputation: number): BoardObjective {
  if (reputation < 1.8) return { kind: 'tierEntries', target: 1, tier: 'challenger' };
  if (reputation < 2.6) return { kind: 'rankTop', target: 20 };
  if (reputation < 3.4) return { kind: 'titleTier', target: 1, tier: 'challenger' };
  if (reputation < 4.2) return { kind: 'rankTop', target: 6 };
  return { kind: 'titleTier', target: 1, tier: 'elite' };
}

/** Soglie (settimane consecutive in rosso) per le conseguenze del bilancio negativo. */
export const NEGATIVE_WARNING_WEEKS = 4;
export const NEGATIVE_CUT_WEEKS = 8;
export const NEGATIVE_FIRED_WEEKS = 14;
