/**
 * Tratti dell'avatar cartoon di un giocatore, ricavati in modo deterministico dai suoi dati.
 * Non vengono salvati: lo stesso giocatore ha sempre lo stesso aspetto, mentre espressione
 * e cerotto seguono morale e infortuni del momento.
 */
import { createRng, hashSeed } from '../../engine/rng';
import type { Player } from '../../engine/types';

export const SKIN_TONES = ['#f6d7c0', '#edc0a0', '#d9a27c', '#b97c55', '#8d5a3b', '#5e3b26'];
export const HAIR_COLORS = ['#1f1a17', '#3b2a20', '#6b4a2e', '#8e3b1f', '#d9b25f', '#ece0b8'];
const GREY_HAIR = '#a7a29c';

/** Pesi di carnagione e colore di capelli per nazionalità (stessi indici delle tabelle sopra). */
const NATIONALITY_WEIGHTS: Record<string, { skin: number[]; hair: number[] }> = {
  VAL: { skin: [1, 3, 3, 2, 1, 0], hair: [3, 4, 3, 1, 1, 0] },
  LUS: { skin: [1, 2, 3, 3, 2, 1], hair: [4, 4, 2, 0, 1, 0] },
  NOR: { skin: [4, 3, 1, 0, 0, 0], hair: [0, 1, 2, 1, 4, 3] },
  ELV: { skin: [3, 3, 2, 1, 0, 0], hair: [1, 2, 3, 1, 3, 1] },
  CAS: { skin: [1, 3, 3, 2, 1, 0], hair: [3, 4, 3, 1, 1, 0] },
  OST: { skin: [4, 3, 1, 0, 0, 0], hair: [1, 2, 3, 1, 3, 1] },
  WES: { skin: [2, 2, 2, 2, 2, 1], hair: [2, 2, 3, 2, 3, 1] },
  KAL: { skin: [1, 2, 3, 2, 1, 0], hair: [4, 4, 2, 0, 0, 0] },
};
const DEFAULT_WEIGHTS = { skin: [1, 1, 1, 1, 1, 1], hair: [1, 1, 1, 1, 1, 1] };

export type MaleHair = 'short' | 'buzz' | 'spiky' | 'curly' | 'bald' | 'manBun';
export type FemaleHair = 'ponytail' | 'bun' | 'bob' | 'long' | 'braid' | 'pixie';
export type FacialHair = 'none' | 'stubble' | 'beard' | 'mustache';
export type Accessory = 'none' | 'cap' | 'visor' | 'headband' | 'sunglasses';
export type Mood = 'happy' | 'content' | 'neutral' | 'sad';

export interface AvatarTraits {
  female: boolean;
  skin: string;
  hairColor: string;
  hair: MaleHair | FemaleHair;
  facialHair: FacialHair;
  accessory: Accessory;
  accessoryColor: string;
  earrings: boolean;
  /** Mezza larghezza delle spalle nel viewBox 64×64. */
  shoulders: number;
  jersey: string;
  mood: Mood;
  injured: boolean;
}

/** Colori delle canotte: indice = numero del club (c0 è il club del manager). */
const CLUB_COLORS = [
  '#0b6375',
  '#c2412a',
  '#2f6fb3',
  '#2f8a4a',
  '#7a3f98',
  '#d48a1a',
  '#1f8f8a',
  '#b0306a',
  '#4a5a6a',
  '#8a5a2b',
  '#3d7a2a',
  '#a33a3a',
  '#2a4a8a',
];
const FREE_AGENT_COLOR = '#8a8178';
const ACCESSORY_COLORS = ['#f2b705', '#e2583e', '#ffffff', '#0e7a8f', '#2f8a4a'];

export function jerseyColor(clubId: string | null): string {
  if (!clubId) return FREE_AGENT_COLOR;
  const n = Number(clubId.replace(/\D/g, ''));
  return CLUB_COLORS[n % CLUB_COLORS.length];
}

export function moodFromMorale(morale: number): Mood {
  if (morale >= 70) return 'happy';
  if (morale >= 45) return 'content';
  if (morale >= 25) return 'neutral';
  return 'sad';
}

type AvatarSource = Pick<
  Player,
  'id' | 'firstName' | 'lastName' | 'gender' | 'role' | 'nationality' | 'age' | 'morale' | 'injury'
> & { contract: Pick<Player['contract'], 'clubId'> };

export function avatarTraits(p: AvatarSource): AvatarTraits {
  const rng = createRng(hashSeed('avatar', p.id, p.firstName, p.lastName));
  const w = NATIONALITY_WEIGHTS[p.nationality] ?? DEFAULT_WEIGHTS;
  const female = p.gender === 'F';
  const skinIdx = rng.weighted([0, 1, 2, 3, 4, 5], w.skin);
  // Le carnagioni più scure hanno capelli prevalentemente scuri
  const hairWeights = skinIdx >= 4 ? [6, 3, 1, 0, 0, 0] : w.hair;
  let hairColor = HAIR_COLORS[rng.weighted([0, 1, 2, 3, 4, 5], hairWeights)];
  if (p.age >= 33 && rng.chance((p.age - 31) * 0.12)) hairColor = GREY_HAIR;

  const hair = female
    ? rng.weighted<FemaleHair>(
        ['ponytail', 'bun', 'bob', 'long', 'braid', 'pixie'],
        [4, 2, 2, 2, 2, 1],
      )
    : rng.weighted<MaleHair>(
        ['short', 'buzz', 'spiky', 'curly', 'bald', 'manBun'],
        [4, 3, 2, 2, p.age >= 28 ? 1.5 : 0.2, 1],
      );
  const facialHair: FacialHair = female
    ? 'none'
    : rng.weighted<FacialHair>(
        ['none', 'stubble', 'beard', 'mustache'],
        [5, 3, p.age >= 24 ? 2 : 0.3, 0.6],
      );
  const accessory = rng.weighted<Accessory>(
    ['none', 'cap', 'visor', 'headband', 'sunglasses'],
    [5, 1.4, 1.4, 1.2, 1.2],
  );
  const broad = p.role === 'blocker';
  return {
    female,
    skin: SKIN_TONES[skinIdx],
    hairColor,
    hair,
    facialHair,
    accessory,
    accessoryColor: rng.pick(ACCESSORY_COLORS),
    earrings: female && rng.chance(0.5),
    shoulders: female ? (broad ? 20 : 18.5) : broad ? 24 : 21.5,
    jersey: jerseyColor(p.contract.clubId),
    mood: moodFromMorale(p.morale),
    injured: p.injury !== null,
  };
}

/** Scurisce un colore esadecimale (0–1). */
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.round(v * (1 - amount));
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
