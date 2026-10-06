/** Costruzione dell'input del motore partita a partire dallo stato di gioco. */
import type { MatchPlayer, MatchSetup, MatchTeam } from './match';
import { autoTactics } from './match';
import { fullName, synergy } from './player';
import type { Conditions, Pair, Player, Tactics } from './types';

export function toMatchPlayer(p: Player): MatchPlayer {
  return {
    id: p.id,
    name: fullName(p),
    role: p.role,
    gender: p.gender,
    heightCm: p.heightCm,
    attrs: { ...p.attrs },
    morale: p.morale,
    form: p.form,
    fatigue: p.fatigue,
  };
}

export function buildTeam(
  pair: Pair,
  players: Record<string, Player>,
  tactics: Tactics | null,
  opponent: Pair,
  conditions: Conditions,
  analystBonus = 0,
): MatchTeam {
  const a = players[pair.playerIds[0]];
  const b = players[pair.playerIds[1]];
  const own: [MatchPlayer, MatchPlayer] = [toMatchPlayer(a), toMatchPlayer(b)];
  const opp: [MatchPlayer, MatchPlayer] = [
    toMatchPlayer(players[opponent.playerIds[0]]),
    toMatchPlayer(players[opponent.playerIds[1]]),
  ];
  return {
    pairId: pair.id,
    players: own,
    chemistry: pair.chemistry,
    synergy: synergy(a, b),
    tactics: tactics ?? autoTactics(own, opp, conditions),
    analystBonus,
  };
}

export function buildSetup(
  id: string,
  seed: number,
  pairs: [Pair, Pair],
  players: Record<string, Player>,
  conditions: Conditions,
  tactics: [Tactics | null, Tactics | null] = [null, null],
  analyst: [number, number] = [0, 0],
): MatchSetup {
  return {
    id,
    seed,
    conditions,
    teams: [
      buildTeam(pairs[0], players, tactics[0], pairs[1], conditions, analyst[0]),
      buildTeam(pairs[1], players, tactics[1], pairs[0], conditions, analyst[1]),
    ],
  };
}
