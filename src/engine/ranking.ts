/** Ranking del circuito: punti individuali, classifica d'ingresso delle coppie. */
import { PLACEMENT_POINTS, TIER_POINT_SCALE } from '../data/world';
import type { Gender, Pair, Player, Tier } from './types';

/** Punti assegnati a ciascun giocatore per un piazzamento. */
export const placementPoints = (tier: Tier, placement: number): number =>
  Math.round((PLACEMENT_POINTS[placement] ?? 0) * TIER_POINT_SCALE[tier]);

/** Punti validi per l'ingresso nei tornei: stagione corrente + metà della precedente. */
export const entryPoints = (p: Player): number => p.points + p.prevPoints * 0.5;

export const pairEntryPoints = (pair: Pair, players: Record<string, Player>): number =>
  entryPoints(players[pair.playerIds[0]]) + entryPoints(players[pair.playerIds[1]]);

/** Classifica individuale della stagione per genere. */
export function playerRanking(players: Record<string, Player>, gender: Gender): Player[] {
  return Object.values(players)
    .filter((p) => p.gender === gender && !p.retired)
    .sort(
      (a, b) => b.points - a.points || entryPoints(b) - entryPoints(a) || a.id.localeCompare(b.id),
    );
}

/** Classifica d'ingresso delle coppie attive (posizione 1 = migliore). */
export function pairEntryRanking(
  pairs: Record<string, Pair>,
  players: Record<string, Player>,
  gender: Gender,
): Pair[] {
  return Object.values(pairs)
    .filter((p) => p.active && p.gender === gender)
    .sort(
      (a, b) =>
        pairEntryPoints(b, players) - pairEntryPoints(a, players) || a.id.localeCompare(b.id),
    );
}

export function pairEntryPosition(
  pairId: string,
  pairs: Record<string, Pair>,
  players: Record<string, Player>,
): number {
  const pair = pairs[pairId];
  return pairEntryRanking(pairs, players, pair.gender).findIndex((p) => p.id === pairId) + 1;
}
