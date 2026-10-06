/** Mercato: trattative contrattuali, indennizzi, svincoli, scouting. */
import { createRng, hashSeed } from './rng';
import type { Difficulty, GameState, Player } from './types';
import { clamp, marketValue, playerOverall, salaryDemand } from './player';

export const MAX_ROSTER = 10;
export const MAX_CONTRACT_YEARS = 3;
export const MAX_REFUSALS = 3;

export interface ContractOffer {
  salary: number;
  years: number;
}

export type NegotiationReason =
  | 'accepted'
  | 'lowSalary'
  | 'lowAmbition'
  | 'unhappy'
  | 'tooManyRefusals'
  | 'rosterFull'
  | 'noBudget'
  | 'retired';

export interface NegotiationResult {
  accepted: boolean;
  reason: NegotiationReason;
  /** Stipendio che il giocatore accetterebbe (controproposta). */
  counter?: number;
  transferFee: number;
}

/** Indennizzo da pagare al club attuale (0 se svincolato o già nel club). */
export function transferFee(p: Player, userClubId: string, season: number): number {
  if (!p.contract.clubId || p.contract.clubId === userClubId) return 0;
  const yearsLeft = Math.max(0, p.contract.untilSeason - season) + 1;
  return Math.round((marketValue(p) * (0.5 + yearsLeft * 0.25)) / 100) * 100;
}

const NEGOTIATION_HARDNESS: Record<Difficulty, number> = { easy: 0.9, normal: 1, hard: 1.12 };

/**
 * Stipendio minimo richiesto: dipende dal valore, dall'ambizione rispetto alla
 * reputazione del club, dal morale (per i rinnovi) e dalla durata.
 */
export function askingSalary(p: Player, state: GameState, years: number): number {
  const club = state.clubs[state.manager.clubId];
  const own = p.contract.clubId === club.id;
  const base = salaryDemand(p);
  const ambitionGap = Math.max(0, p.hidden.ambition / 4 - club.reputation); // 0..4
  const moraleAdj = own ? (60 - p.morale) * 0.006 : 0;
  // I giovani preferiscono contratti lunghi, i veterani brevi
  const lengthAdj = p.age < 25 ? -(years - 1) * 0.03 : p.age > 31 ? (years - 1) * 0.06 : 0;
  const mult =
    (1 + ambitionGap * 0.12 + moraleAdj + lengthAdj) *
    NEGOTIATION_HARDNESS[state.manager.difficulty];
  return Math.round((base * mult) / 10) * 10;
}

export function evaluateOffer(
  state: GameState,
  playerId: string,
  offer: ContractOffer,
): NegotiationResult {
  const p = state.players[playerId];
  const club = state.clubs[state.manager.clubId];
  const fee = transferFee(p, club.id, state.season);
  const fail = (reason: NegotiationReason, counter?: number): NegotiationResult => ({
    accepted: false,
    reason,
    counter,
    transferFee: fee,
  });
  if (p.retired) return fail('retired');
  if (p.refusals >= MAX_REFUSALS) return fail('tooManyRefusals');
  const own = p.contract.clubId === club.id;
  const roster = Object.values(state.players).filter(
    (x) => x.contract.clubId === club.id && !x.retired,
  );
  if (!own && roster.length >= MAX_ROSTER) return fail('rosterFull');
  if (!own && state.finance.balance < fee) return fail('noBudget');

  // Giocatori molto ambiziosi rifiutano club di bassa reputazione a prescindere
  const ovr = playerOverall(p);
  if (!own && p.hidden.ambition >= 15 && ovr >= 14 && club.reputation < 2.5)
    return fail('lowAmbition');
  if (own && p.morale < 25) return fail('unhappy');

  const asking = askingSalary(p, state, offer.years);
  // Piccola componente casuale deterministica per tentativo
  const neg = state.negotiations[playerId];
  const rng = createRng(hashSeed(state.seed, 'neg', playerId, state.season, neg?.attempts ?? 0));
  const tolerance = rng.range(0.94, 1.02);
  if (offer.salary >= asking * tolerance) {
    return { accepted: true, reason: 'accepted', transferFee: fee };
  }
  return fail('lowSalary', Math.round((asking * rng.range(1, 1.06)) / 10) * 10);
}

/** Costo di risoluzione anticipata di un contratto (svincolo). */
export function releaseCost(p: Player, season: number): number {
  const seasonsLeft = Math.max(0, p.contract.untilSeason - season) + 1;
  return Math.round((p.contract.salary * 30 * seasonsLeft * 0.3) / 10) * 10;
}

// ---------------------------------------------------------------- Scouting

export const SCOUT_COST = 400;
export const YOUTH_SEARCH_COST = 2500;

/** Conoscenza guadagnata con una missione di osservazione. */
export const scoutGain = (analystLevel: number): number => clamp(35 + analystLevel * 8, 0, 100);
