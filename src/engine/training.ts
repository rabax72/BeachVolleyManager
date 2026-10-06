/** Allenamento settimanale, progressione, invecchiamento, fatica, forma e infortuni. */
import type { Rng } from './rng';
import type {
  AttributeKey,
  InjuryKey,
  Player,
  StaffMember,
  StaffRole,
  TrainingFocus,
  TrainingIntensity,
  TrainingPlan,
} from './types';
import { ATTRIBUTE_KEYS, MENTAL_KEYS, PHYSICAL_KEYS } from './types';
import { clamp, playerOverall } from './player';

export const DEFAULT_PLAN: TrainingPlan = { focus: 'balanced', intensity: 'medium' };

export interface StaffLevels {
  coach: number;
  fitness: number;
  physio: number;
  analyst: number;
}

/** Livelli dello staff del club (0 se il ruolo è scoperto). */
export function staffLevels(staff: StaffMember[]): StaffLevels {
  const lv = (r: StaffRole): number => staff.find((s) => s.role === r)?.level ?? 0;
  return {
    coach: lv('coach'),
    fitness: lv('fitness'),
    physio: lv('physio'),
    analyst: lv('analyst'),
  };
}

/** Staff medio attribuito ai club gestiti dall'AI. */
export const AI_STAFF: StaffLevels = { coach: 2, fitness: 2, physio: 2, analyst: 0 };

/** Peso dell'allenamento su ciascun attributo per un dato focus. */
export function focusWeights(focus: TrainingFocus): Partial<Record<AttributeKey, number>> {
  switch (focus) {
    case 'rest':
      return {};
    case 'balanced':
      return Object.fromEntries(ATTRIBUTE_KEYS.map((k) => [k, 0.3]));
    case 'physical':
      return Object.fromEntries(PHYSICAL_KEYS.map((k) => [k, 0.75]));
    case 'mental':
      return Object.fromEntries(MENTAL_KEYS.map((k) => [k, 0.75]));
    case 'serve':
      return { serve: 1.2, consistency: 0.2 };
    case 'reception':
      return { reception: 1.2, reading: 0.2 };
    case 'setting':
      return { setting: 1.2, consistency: 0.2 };
    case 'attack':
      return { attack: 1.2, jump: 0.2 };
    case 'block':
      return { block: 1.2, jump: 0.2 };
    case 'defense':
      return { defense: 1.2, speed: 0.2 };
  }
}

const INTENSITY: Record<TrainingIntensity, { growth: number; fatigue: number; risk: number }> = {
  low: { growth: 0.6, fatigue: 4, risk: 0 },
  medium: { growth: 1, fatigue: 8, risk: 0.003 },
  high: { growth: 1.45, fatigue: 14, risk: 0.009 },
};

export function ageGrowthFactor(age: number): number {
  if (age <= 20) return 1.6;
  if (age <= 23) return 1.3;
  if (age <= 26) return 1;
  if (age <= 29) return 0.6;
  if (age <= 32) return 0.3;
  return 0.12;
}

const INJURY_WEEKS: Record<InjuryKey, [number, number]> = {
  ankleSprain: [2, 4],
  shoulderStrain: [2, 5],
  kneeTendinitis: [3, 6],
  backPain: [1, 3],
  fingerSprain: [1, 2],
  calfStrain: [2, 3],
  heatStroke: [1, 1],
  abdominalStrain: [2, 4],
};
export const INJURY_KEYS = Object.keys(INJURY_WEEKS) as InjuryKey[];

export function rollInjury(rng: Rng, physio: number): { key: InjuryKey; weeksLeft: number } {
  const key = rng.pick(INJURY_KEYS);
  const [min, max] = INJURY_WEEKS[key];
  const weeks = rng.int(min, max);
  return { key, weeksLeft: Math.max(1, weeks - (physio >= 4 ? 1 : 0)) };
}

export interface TrainingOutcome {
  player: Player;
  injured: boolean;
  overtrained: boolean;
  /** Variazione della valutazione complessiva. */
  delta: number;
}

/**
 * Applica una settimana di allenamento e recupero a un giocatore (funzione pura).
 * `matchesPlayed` sono le partite disputate nella settimana: riducono il carico di
 * allenamento ma aumentano esperienza e fatica (la fatica da partita è già applicata).
 */
export function weeklyTraining(
  player: Player,
  plan: TrainingPlan,
  staff: StaffLevels,
  rng: Rng,
  matchesPlayed: number,
): TrainingOutcome {
  const p: Player = { ...player, attrs: { ...player.attrs } };
  const before = playerOverall(player);
  const injuredNow = p.injury !== null;
  const effectivePlan: TrainingPlan = injuredNow
    ? { focus: 'rest', intensity: 'low' }
    : matchesPlayed > 0
      ? { focus: plan.focus, intensity: 'low' }
      : plan;
  const intensity = INTENSITY[effectivePlan.intensity];
  const weights = focusWeights(effectivePlan.focus);
  const ovr = playerOverall(p);
  const gap = p.hidden.potential - ovr;
  const potentialFactor = gap <= 0 ? 0.05 : Math.min(1, gap / 2) + 0.15;
  const ageF = ageGrowthFactor(p.age);

  // Crescita
  for (const k of Object.keys(weights) as AttributeKey[]) {
    const w = weights[k] ?? 0;
    const isPhysical = PHYSICAL_KEYS.includes(k);
    const staffF = isPhysical ? 0.75 + staff.fitness * 0.12 : 0.75 + staff.coach * 0.12;
    const gain =
      0.07 * w * intensity.growth * staffF * ageF * potentialFactor * (0.6 + rng.next() * 0.8);
    p.attrs[k] = clamp(p.attrs[k] + gain, 1, 20);
  }
  // Esperienza da partita
  if (matchesPlayed > 0) {
    p.attrs.reading = clamp(p.attrs.reading + 0.012 * matchesPlayed * ageF, 1, 20);
    p.attrs.mentality = clamp(p.attrs.mentality + 0.008 * matchesPlayed, 1, 20);
  }
  // Declino fisico dopo i 30 anni
  if (p.age > 30) {
    const decline = (p.age - 30) * 0.009;
    for (const k of PHYSICAL_KEYS)
      p.attrs[k] = clamp(p.attrs[k] - decline * (0.7 + rng.next() * 0.6), 1, 20);
    if (p.age > 33) {
      for (const k of ['attack', 'block', 'defense'] as AttributeKey[]) {
        p.attrs[k] = clamp(p.attrs[k] - decline * 0.4, 1, 20);
      }
    }
  }

  // Fatica: carico di allenamento meno il recupero
  const recovery =
    (16 + p.attrs.stamina * 0.4) *
    (1 + staff.fitness * 0.06) *
    (effectivePlan.focus === 'rest' ? 1.6 : 1);
  const load = effectivePlan.focus === 'rest' ? 0 : intensity.fatigue;
  p.fatigue = clamp(Math.round(p.fatigue + load - recovery), 0, 100);

  // Sovrallenamento
  const overtrained = !injuredNow && effectivePlan.intensity === 'high' && p.fatigue > 70;
  if (overtrained) p.morale = clamp(p.morale - 4, 0, 100);

  // Forma: tende a un valore che dipende da fatica e morale
  const target = 78 - p.fatigue * 0.45 + (p.morale - 55) * 0.3;
  p.form = Math.round(clamp(p.form + (target - p.form) * 0.35 + rng.normal(0, 4), 5, 100));

  // Morale: deriva lenta verso un valore neutro
  p.morale = Math.round(clamp(p.morale + (62 - p.morale) * 0.08, 0, 100));

  // Infortuni
  let injured = false;
  if (p.injury) {
    const extra = rng.chance(staff.physio * 0.1) ? 1 : 0;
    const left = p.injury.weeksLeft - 1 - extra;
    p.injury = left > 0 ? { ...p.injury, weeksLeft: left } : null;
  } else {
    const risk =
      (0.002 +
        (p.hidden.injuryProneness / 20) * 0.006 +
        Math.max(0, p.fatigue - 45) * 0.0011 +
        intensity.risk +
        matchesPlayed * 0.0025) *
      (1 - staff.physio * 0.1);
    if (rng.chance(risk)) {
      p.injury = rollInjury(rng, staff.physio);
      p.morale = clamp(p.morale - 6, 0, 100);
      injured = true;
    }
  }
  return { player: p, injured, overtrained, delta: playerOverall(p) - before };
}

/** Fatica accumulata dopo una partita, in base all'energia residua. */
export function matchFatigue(endEnergy: number, rallies: number): number {
  return Math.round(2 + (100 - endEnergy) * 0.1 + rallies * 0.015);
}
