import type { AttributeKey, Attributes, Character, Pair, Player, Role } from './types';
import { ATTRIBUTE_KEYS } from './types';

export const clamp = (v: number, min: number, max: number): number =>
  v <= min ? min : v > max ? max : v;

export const ROLE_WEIGHTS: Record<Role, Record<AttributeKey, number>> = {
  blocker: {
    serve: 1.5,
    reception: 1,
    setting: 1,
    attack: 3,
    block: 3,
    defense: 0.5,
    reading: 1.5,
    stamina: 1,
    speed: 1,
    jump: 2,
    mentality: 1,
    consistency: 1,
  },
  defender: {
    serve: 1.5,
    reception: 3,
    setting: 2,
    attack: 1.5,
    block: 0.3,
    defense: 3,
    reading: 2,
    stamina: 1,
    speed: 2,
    jump: 0.7,
    mentality: 1,
    consistency: 1,
  },
};

/** Valutazione complessiva 1–20 pesata sul ruolo. */
export function overall(attrs: Attributes, role: Role): number {
  const w = ROLE_WEIGHTS[role];
  let sum = 0;
  let tot = 0;
  for (const k of ATTRIBUTE_KEYS) {
    sum += attrs[k] * w[k];
    tot += w[k];
  }
  return sum / tot;
}

export const playerOverall = (p: Player): number => overall(p.attrs, p.role);

export const fullName = (p: Pick<Player, 'firstName' | 'lastName'>): string =>
  `${p.firstName} ${p.lastName}`;

export const shortName = (p: Pick<Player, 'firstName' | 'lastName'>): string =>
  `${p.firstName.charAt(0)}. ${p.lastName}`;

/** Compatibilità caratteriale 0–1 (simmetrica). */
const COMPAT: Record<Character, Record<Character, number>> = {
  leader: {
    leader: 0.65,
    calm: 0.95,
    fiery: 0.75,
    introvert: 0.95,
    professional: 0.9,
    volatile: 0.7,
  },
  calm: {
    leader: 0.95,
    calm: 0.85,
    fiery: 0.9,
    introvert: 0.85,
    professional: 0.9,
    volatile: 0.85,
  },
  fiery: { leader: 0.75, calm: 0.9, fiery: 0.6, introvert: 0.7, professional: 0.8, volatile: 0.5 },
  introvert: {
    leader: 0.95,
    calm: 0.85,
    fiery: 0.7,
    introvert: 0.7,
    professional: 0.85,
    volatile: 0.6,
  },
  professional: {
    leader: 0.9,
    calm: 0.9,
    fiery: 0.8,
    introvert: 0.85,
    professional: 0.95,
    volatile: 0.7,
  },
  volatile: {
    leader: 0.7,
    calm: 0.85,
    fiery: 0.5,
    introvert: 0.6,
    professional: 0.7,
    volatile: 0.45,
  },
};

export const characterCompatibility = (a: Character, b: Character): number => COMPAT[a][b];

/**
 * Sinergia 0–1 di una coppia: complementarità dei ruoli + compatibilità caratteriale.
 */
export function synergy(a: Player, b: Player): number {
  const roleFit = a.role !== b.role ? 1 : 0.78;
  const compat = characterCompatibility(a.hidden.character, b.hidden.character);
  return roleFit * 0.55 + compat * 0.45;
}

/** Chimica iniziale per una coppia nuova (0–100). */
export function initialChemistry(a: Player, b: Player, remembered?: number): number {
  const base = 20 + synergy(a, b) * 20;
  if (remembered !== undefined) return Math.max(base, remembered * 0.8);
  return base;
}

/** Incremento di chimica dopo una partita giocata insieme (rendimenti decrescenti). */
export function chemistryGain(chemistry: number, won: boolean): number {
  const room = 100 - chemistry;
  return room * (won ? 0.035 : 0.025);
}

export const pairKey = (a: string, b: string): string => (a < b ? `${a}+${b}` : `${b}+${a}`);

export function pairPlayers(pair: Pair, players: Record<string, Player>): [Player, Player] {
  return [players[pair.playerIds[0]], players[pair.playerIds[1]]];
}

/** Forza complessiva di una coppia (per seeding e stime AI). */
export function pairStrength(pair: Pair, players: Record<string, Player>): number {
  const [a, b] = pairPlayers(pair, players);
  return (
    (playerOverall(a) + playerOverall(b)) / 2 + (pair.chemistry / 100) * 0.8 + synergy(a, b) * 0.5
  );
}

/** Stipendio settimanale richiesto, in base a valutazione ed età. */
export function salaryDemand(p: Player): number {
  const ovr = playerOverall(p);
  const base = 60 + Math.pow(Math.max(0, ovr - 5), 2.2) * 6;
  const ageAdj = p.age < 21 ? 0.7 : p.age > 33 ? 0.85 : 1;
  return Math.round((base * ageAdj) / 10) * 10;
}

/** Valore di mercato (indennizzo per un giocatore sotto contratto con un altro club). */
export function marketValue(p: Player): number {
  const ovr = playerOverall(p);
  const growth = Math.max(0, p.hidden.potential - ovr);
  const ageFactor = p.age <= 23 ? 1.4 : p.age <= 28 ? 1.2 : p.age <= 31 ? 1 : 0.6;
  const v = (Math.pow(Math.max(0, ovr - 4), 2.4) * 40 + growth * 600) * ageFactor;
  return Math.round(v / 100) * 100;
}

/** Arrotondamento per la visualizzazione 1–20. */
export const displayAttr = (v: number): number => clamp(Math.round(v), 1, 20);

/** Stima del potenziale visibile al manager, in base alla conoscenza dello scouting (0–100). */
export function potentialEstimate(p: Player, knowledge: number): { min: number; max: number } {
  const uncertainty = ((100 - knowledge) / 100) * 4;
  const ovr = playerOverall(p);
  const min = clamp(Math.round(p.hidden.potential - uncertainty), Math.round(ovr), 20);
  const max = clamp(Math.round(p.hidden.potential + uncertainty), min, 20);
  return { min, max };
}
