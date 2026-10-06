/** Generazione procedurale di giocatori, staff e mondo. */
import {
  NATIONALITIES,
  NATIONALITY_BY_CODE,
  STAFF_FIRST_NAMES,
  STAFF_LAST_NAMES,
} from '../data/names';
import type { Rng } from './rng';
import type {
  AttributeKey,
  Attributes,
  Character,
  Gender,
  Player,
  Role,
  StaffMember,
  StaffRole,
} from './types';
import { ATTRIBUTE_KEYS } from './types';
import { clamp, overall, salaryDemand } from './player';

const ROLE_BIAS: Record<Role, Partial<Record<AttributeKey, number>>> = {
  blocker: { block: 3, attack: 2, jump: 2, reception: -1.5, defense: -2, speed: -1, setting: -0.5 },
  defender: {
    defense: 3,
    reception: 2.5,
    setting: 1.5,
    speed: 2,
    block: -3.5,
    jump: -1,
    attack: -0.5,
  },
};

const CHARACTERS: Character[] = [
  'leader',
  'calm',
  'fiery',
  'introvert',
  'professional',
  'volatile',
];
const CHARACTER_WEIGHTS = [1.2, 2, 1.3, 1.2, 2, 0.8];

export interface PlayerGenOptions {
  id: string;
  gender: Gender;
  /** Livello medio desiderato degli attributi (1–20). */
  level: number;
  age: number;
  role?: Role;
  nationality?: string;
  season: number;
}

export function emptySeasonStats(): Player['season'] {
  return {
    matches: 0,
    wins: 0,
    aces: 0,
    kills: 0,
    blocks: 0,
    digs: 0,
    serveErrors: 0,
    tournaments: 0,
    titles: 0,
  };
}

export function pickNationality(rng: Rng): string {
  return rng.weighted(
    NATIONALITIES.map((n) => n.code),
    NATIONALITIES.map((n) => n.weight),
  );
}

/** Margine di crescita atteso in base all'età. */
function growthHeadroom(rng: Rng, age: number): number {
  if (age <= 19) return clamp(rng.normal(5, 2), 1.5, 9);
  if (age <= 22) return clamp(rng.normal(3.5, 1.5), 0.8, 7);
  if (age <= 25) return clamp(rng.normal(1.8, 1), 0.3, 4);
  if (age <= 28) return clamp(rng.normal(0.8, 0.5), 0, 2);
  return clamp(rng.normal(0.2, 0.3), 0, 1);
}

export function generatePlayer(rng: Rng, o: PlayerGenOptions): Player {
  const nat = NATIONALITY_BY_CODE[o.nationality ?? pickNationality(rng)];
  const role: Role = o.role ?? (rng.chance(0.5) ? 'blocker' : 'defender');
  const firstName = rng.pick(o.gender === 'M' ? nat.male : nat.female);
  const lastName = rng.pick(nat.surnames);
  const baseHeight =
    o.gender === 'M' ? (role === 'blocker' ? 198 : 188) : role === 'blocker' ? 185 : 175;
  const heightCm = Math.round(clamp(rng.normal(baseHeight, 4.5), baseHeight - 14, baseHeight + 14));
  const bias = ROLE_BIAS[role];
  const attrs = {} as Attributes;
  for (const k of ATTRIBUTE_KEYS) {
    const v = o.level + (bias[k] ?? 0) + rng.normal(0, 1.7);
    attrs[k] = clamp(Math.round(v * 10) / 10, 1, 20);
  }
  // L'altezza influenza leggermente salto e muro.
  const hAdv = (heightCm - baseHeight) / 10;
  attrs.block = clamp(attrs.block + hAdv * 0.6, 1, 20);
  // I giovanissimi sono fisicamente acerbi, i veterani più esperti.
  if (o.age <= 20) {
    attrs.stamina = clamp(attrs.stamina - 1, 1, 20);
    attrs.reading = clamp(attrs.reading - 1.5, 1, 20);
  } else if (o.age >= 31) {
    attrs.reading = clamp(attrs.reading + 1.2, 1, 20);
    attrs.speed = clamp(attrs.speed - 0.8, 1, 20);
  }
  const ovr = overall(attrs, role);
  const potential = clamp(ovr + growthHeadroom(rng, o.age), ovr, 20);
  const p: Player = {
    id: o.id,
    firstName,
    lastName,
    nationality: nat.code,
    gender: o.gender,
    age: o.age,
    heightCm,
    hand: rng.chance(0.12) ? 'left' : 'right',
    role,
    attrs,
    hidden: {
      potential: Math.ceil(potential * 10) / 10,
      injuryProneness: clamp(Math.round(rng.normal(8, 3.5)), 1, 20),
      character: rng.weighted(CHARACTERS, CHARACTER_WEIGHTS),
      ambition: clamp(Math.round(rng.normal(11, 4)), 1, 20),
    },
    contract: { clubId: null, salary: 0, untilSeason: o.season },
    morale: Math.round(clamp(rng.normal(68, 10), 30, 95)),
    form: Math.round(clamp(rng.normal(65, 10), 35, 95)),
    fatigue: Math.round(clamp(rng.normal(10, 6), 0, 35)),
    injury: null,
    points: 0,
    prevPoints: 0,
    season: emptySeasonStats(),
    career: [],
    retired: false,
    refusals: 0,
  };
  p.contract.salary = salaryDemand(p);
  return p;
}

/** Età per un giocatore affermato del circuito. */
export function circuitAge(rng: Rng): number {
  return clamp(Math.round(rng.normal(27, 4.2)), 19, 37);
}

export const STAFF_ROLES: StaffRole[] = ['coach', 'fitness', 'physio', 'analyst'];

export const staffSalary = (level: number, role: StaffRole): number =>
  Math.round(((role === 'coach' ? 140 : 100) * Math.pow(level, 1.6)) / 10) * 10;

export function generateStaff(rng: Rng, id: string, role: StaffRole, level: number): StaffMember {
  return {
    id,
    name: `${rng.pick(STAFF_FIRST_NAMES)} ${rng.pick(STAFF_LAST_NAMES)}`,
    role,
    level,
    weeklySalary: staffSalary(level, role),
  };
}
