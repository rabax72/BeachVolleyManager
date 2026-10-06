import type { Conditions, SandType, Tier } from '../engine/types';

/** Località balneari immaginarie. */
export interface VenueDef {
  name: string;
  /** Profilo climatico: vento medio 0–3, sole medio 0–2, temperatura media. */
  wind: number;
  sun: number;
  temp: number;
  sand: SandType;
  /** Distanza "virtuale" che pesa sui costi di viaggio (1–4). */
  distance: number;
}

export const VENUES: VenueDef[] = [
  { name: 'Marina di Solvento', wind: 1, sun: 2, temp: 29, sand: 'soft', distance: 1 },
  { name: 'Lido Corallo', wind: 1, sun: 2, temp: 31, sand: 'medium', distance: 1 },
  { name: 'Punta Salina', wind: 2, sun: 1, temp: 26, sand: 'medium', distance: 2 },
  { name: 'Capo Ventoso', wind: 3, sun: 1, temp: 24, sand: 'hard', distance: 2 },
  { name: 'Isola Brezza', wind: 2, sun: 2, temp: 28, sand: 'soft', distance: 3 },
  { name: "Riva d'Ambra", wind: 1, sun: 2, temp: 30, sand: 'medium', distance: 2 },
  { name: 'Porto Selene', wind: 1, sun: 1, temp: 27, sand: 'medium', distance: 2 },
  { name: 'Costa Dorata', wind: 0, sun: 2, temp: 33, sand: 'soft', distance: 3 },
  { name: 'Santa Maresa', wind: 2, sun: 2, temp: 29, sand: 'medium', distance: 1 },
  { name: 'Torre del Faro', wind: 2, sun: 1, temp: 25, sand: 'hard', distance: 2 },
  { name: 'Calarossa', wind: 1, sun: 2, temp: 32, sand: 'soft', distance: 3 },
  { name: 'Playa Luminosa', wind: 1, sun: 2, temp: 31, sand: 'soft', distance: 4 },
  { name: 'Nordstrand Bay', wind: 3, sun: 0, temp: 21, sand: 'hard', distance: 4 },
  { name: 'Sabbiafina', wind: 1, sun: 2, temp: 30, sand: 'soft', distance: 1 },
  { name: 'Baia dei Gabbiani', wind: 2, sun: 1, temp: 27, sand: 'medium', distance: 2 },
  { name: 'Porto Celeste', wind: 1, sun: 2, temp: 30, sand: 'medium', distance: 3 },
  { name: 'Vallemare', wind: 0, sun: 1, temp: 28, sand: 'medium', distance: 1 },
  { name: 'Lago Cristallo', wind: 1, sun: 1, temp: 25, sand: 'hard', distance: 2 },
];

export interface TierInfo {
  prizePool: number;
  entryFee: number;
  travelBase: number;
  /** Posizione massima nella classifica d'ingresso per potersi iscrivere (null = libero). */
  minRankEntry: number | null;
}

export const TIER_INFO: Record<Tier, TierInfo> = {
  open: { prizePool: 6000, entryFee: 150, travelBase: 150, minRankEntry: null },
  national: { prizePool: 16000, entryFee: 350, travelBase: 300, minRankEntry: null },
  challenger: { prizePool: 45000, entryFee: 700, travelBase: 650, minRankEntry: 44 },
  elite: { prizePool: 120000, entryFee: 1200, travelBase: 1100, minRankEntry: 22 },
};

/** Punti ranking per piazzamento al livello Elite; gli altri livelli sono scalati. */
export const PLACEMENT_POINTS: Record<number, number> = {
  1: 800,
  2: 680,
  3: 560,
  5: 400,
  9: 220,
  13: 120,
};
export const TIER_POINT_SCALE: Record<Tier, number> = {
  elite: 1,
  challenger: 0.5,
  national: 0.25,
  open: 0.1,
};
/** Quota del montepremi per piazzamento (per coppia). */
export const PRIZE_SHARE: Record<number, number> = {
  1: 0.25,
  2: 0.16,
  3: 0.1,
  5: 0.05,
  9: 0.02,
  13: 0.01,
};

/** Struttura della stagione (settimane). */
export const SEASON_WEEKS = 30;
export const TOUR_START_WEEK = 4;
export const TOUR_END_WEEK = 26;
/** Livelli dei due tornei paralleli in ogni settimana di circuito (stesso schema per M e F). */
export const EVENT_WEEKS: Record<number, [Tier, Tier]> = {
  4: ['open', 'national'],
  5: ['open', 'challenger'],
  7: ['national', 'elite'],
  8: ['open', 'national'],
  9: ['national', 'challenger'],
  11: ['open', 'elite'],
  12: ['national', 'challenger'],
  13: ['open', 'national'],
  15: ['national', 'elite'],
  16: ['open', 'challenger'],
  17: ['open', 'national'],
  19: ['national', 'elite'],
  20: ['open', 'challenger'],
  21: ['national', 'challenger'],
  23: ['open', 'elite'],
  24: ['open', 'national'],
  25: ['national', 'challenger'],
  26: ['challenger', 'elite'],
};

export function conditionsFromVenue(venue: VenueDef, roll: () => number): Conditions {
  const wind = Math.max(
    0,
    Math.min(3, Math.round(venue.wind + (roll() - 0.5) * 2)),
  ) as Conditions['wind'];
  const sun = Math.max(
    0,
    Math.min(2, Math.round(venue.sun + (roll() - 0.5) * 1.6)),
  ) as Conditions['sun'];
  return {
    wind,
    sun,
    temperature: Math.round(venue.temp + (roll() - 0.5) * 6),
    sand: venue.sand,
  };
}

export const CLUB_NAMES = [
  'Delfini Beach Team',
  'Sabbia Rossa BV',
  'Gabbiani Volley',
  'Onda Lunga Club',
  'Faro Beach Academy',
  'Corallo Volley Team',
  'Maestrale BV',
  'Scogliera Beach Club',
  'Libeccio Sand Team',
  'Conchiglia Volley',
  'Tramontana BV',
  'Pineta Beach Club',
];

export const CLUB_CITIES = [
  'Solvento',
  'Corallo',
  'Salina',
  'Ventoso',
  'Ambra',
  'Selene',
  'Maresa',
  'Faro',
  'Calarossa',
  'Sabbiafina',
  'Vallemare',
  'Cristallo',
];

export const SPONSOR_NAMES = [
  'Onda Drinks',
  'SunGuard Creme',
  'Maresalto Costruzioni',
  'Brezza Mobile',
  'Gelateria Polare',
  'Sabbiatek Sport',
  'Riva Assicurazioni',
  'Faro Energia',
  'Corallo Viaggi',
  'Ventomare Occhiali',
  'Pesca Blu Alimentari',
  'Salina Wellness',
];
