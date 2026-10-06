/** Gestione delle coppie: formazione, scioglimento, riaccoppiamento AI. */
import type { GameState, Gender, Pair, Player } from './types';
import { initialChemistry, pairKey, playerOverall } from './player';

export const newId = (state: GameState, prefix: string): string => `${prefix}${state.nextId++}`;

export const isUserPlayer = (state: GameState, p: Player): boolean =>
  p.contract.clubId === state.manager.clubId && !p.retired;

export const userPlayers = (state: GameState): Player[] =>
  Object.values(state.players).filter((p) => isUserPlayer(state, p));

export const isUserPair = (state: GameState, pair: Pair): boolean =>
  pair.active && pair.playerIds.every((id) => isUserPlayer(state, state.players[id]));

export const userPairs = (state: GameState): Pair[] =>
  Object.values(state.pairs).filter((p) => isUserPair(state, p));

/** Coppia attiva di cui fa parte il giocatore, se esiste. */
export function activePairOf(state: GameState, playerId: string): Pair | undefined {
  return Object.values(state.pairs).find((p) => p.active && p.playerIds.includes(playerId));
}

/** Disattiva una coppia memorizzando la chimica raggiunta (muta lo stato). */
export function dissolvePairMut(state: GameState, pairId: string): void {
  const pair = state.pairs[pairId];
  if (!pair || !pair.active) return;
  pair.active = false;
  state.chemistryMemory[pairKey(pair.playerIds[0], pair.playerIds[1])] = pair.chemistry;
  // Le coppie inattive restano finché i tornei della stagione le referenziano:
  // vengono eliminate a fine stagione.
}

/** Crea una coppia (muta lo stato). I due giocatori non devono essere in coppie attive. */
export function formPairMut(state: GameState, a: Player, b: Player): Pair {
  const remembered = state.chemistryMemory[pairKey(a.id, b.id)];
  const pair: Pair = {
    id: newId(state, 'k'),
    playerIds: a.role === 'blocker' || b.role !== 'blocker' ? [a.id, b.id] : [b.id, a.id],
    gender: a.gender,
    chemistry: Math.round(initialChemistry(a, b, remembered)),
    matchesTogether: 0,
    active: true,
    createdSeason: state.season,
  };
  state.pairs[pair.id] = pair;
  return pair;
}

export type PairError =
  'notInClub' | 'differentGender' | 'samePlayer' | 'alreadyPaired' | 'retired';

export function canFormUserPair(state: GameState, aId: string, bId: string): PairError | null {
  const a = state.players[aId];
  const b = state.players[bId];
  if (!a || !b || aId === bId) return 'samePlayer';
  if (a.retired || b.retired) return 'retired';
  if (!isUserPlayer(state, a) || !isUserPlayer(state, b)) return 'notInClub';
  if (a.gender !== b.gender) return 'differentGender';
  if (activePairOf(state, aId) || activePairOf(state, bId)) return 'alreadyPaired';
  return null;
}

/** Calo di morale per chi viene separato dal partner. */
export const SPLIT_MORALE_PENALTY = 6;

/**
 * Riaccoppia i giocatori AI rimasti senza partner (muta lo stato).
 * Preferisce combinazioni bloccatore + difensore di livello simile.
 */
export function repairAiPairsMut(state: GameState): void {
  for (const gender of ['M', 'F'] as Gender[]) {
    const paired = new Set<string>();
    for (const p of Object.values(state.pairs))
      if (p.active) p.playerIds.forEach((id) => paired.add(id));
    const free = Object.values(state.players)
      .filter(
        (p) =>
          p.gender === gender &&
          !p.retired &&
          !paired.has(p.id) &&
          p.contract.clubId !== state.manager.clubId,
      )
      .map((p) => ({ p, ovr: playerOverall(p) }))
      .sort((x, y) => y.ovr - x.ovr || x.p.id.localeCompare(y.p.id));
    while (free.length >= 2) {
      const first = free.shift()!;
      let bestIdx = 0;
      let bestScore = -Infinity;
      for (let i = 0; i < Math.min(free.length, 6); i++) {
        const c = free[i];
        const score = c.ovr + (c.p.role !== first.p.role ? 1.5 : 0) - i * 0.05;
        if (score > bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }
      const [second] = free.splice(bestIdx, 1);
      formPairMut(state, first.p, second.p);
    }
  }
}
