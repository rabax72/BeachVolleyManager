/**
 * Persistenza su localStorage: slot multipli compressi (lz-string), indice dei salvataggi,
 * export/import JSON e migrazioni tra versioni (`saveVersion`).
 */
import LZ from 'lz-string';
import { emptyTierCount } from '../engine/finance';
import { SAVE_VERSION } from '../engine/newGame';
import type { GameState } from '../engine/types';

const INDEX_KEY = 'bvm:saves';
const SLOT_PREFIX = 'bvm:save:';

export interface SaveMeta {
  id: string;
  name: string;
  managerName: string;
  clubName: string;
  season: number;
  week: number;
  year: number;
  updatedAt: string;
  saveVersion: number;
}

/** Accesso sicuro a localStorage (può non essere disponibile o pieno). */
function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function listSaves(): SaveMeta[] {
  const raw = storage()?.getItem(INDEX_KEY);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw) as SaveMeta[];
    return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

function writeIndex(list: SaveMeta[]): void {
  storage()?.setItem(INDEX_KEY, JSON.stringify(list));
}

export function metaFor(id: string, name: string, s: GameState): SaveMeta {
  return {
    id,
    name,
    managerName: s.manager.name,
    clubName: s.clubs[s.manager.clubId]?.name ?? '',
    season: s.season,
    week: s.week,
    year: s.startYear + s.season - 1,
    updatedAt: new Date().toISOString(),
    saveVersion: s.saveVersion,
  };
}

export const compress = (s: GameState): string => LZ.compressToUTF16(JSON.stringify(s));
export const decompress = (data: string): unknown =>
  JSON.parse(LZ.decompressFromUTF16(data) ?? 'null');

export function writeSave(id: string, name: string, s: GameState): SaveMeta {
  const st = storage();
  if (!st) throw new Error('localStorage non disponibile');
  st.setItem(SLOT_PREFIX + id, compress(s));
  const meta = metaFor(id, name, s);
  writeIndex([...listSaves().filter((m) => m.id !== id), meta]);
  return meta;
}

export function readSave(id: string): GameState {
  const data = storage()?.getItem(SLOT_PREFIX + id);
  if (!data) throw new Error('Salvataggio non trovato');
  return migrate(decompress(data));
}

export function deleteSave(id: string): void {
  storage()?.removeItem(SLOT_PREFIX + id);
  writeIndex(listSaves().filter((m) => m.id !== id));
}

export function storageUsageKb(): number {
  const st = storage();
  if (!st) return 0;
  let total = 0;
  for (let i = 0; i < st.length; i++) {
    const k = st.key(i);
    if (k?.startsWith('bvm:')) total += (st.getItem(k)?.length ?? 0) * 2;
  }
  return Math.round(total / 1024);
}

export const newSlotId = (): string => `slot-${Date.now().toString(36)}`;

// ---------------------------------------------------------------- Export / import

export const exportJson = (s: GameState): string => JSON.stringify(s);

export function importJson(text: string): GameState {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('JSON non valido');
  }
  return migrate(raw);
}

// ---------------------------------------------------------------- Migrazioni

type Migration = (s: Record<string, unknown>) => Record<string, unknown>;

/**
 * Migrazioni: la chiave è la versione di partenza. Ogni funzione porta il salvataggio
 * alla versione successiva. Per una nuova versione: incrementare SAVE_VERSION e aggiungere qui.
 */
export const MIGRATIONS: Record<number, Migration> = {
  // v1 → v2: introdotte statistiche stagionali del club e storia del club.
  1: (s) => ({
    ...s,
    clubSeason: s.clubSeason ?? {
      titles: emptyTierCount(),
      semifinals: 0,
      entries: emptyTierCount(),
      prizeMoney: 0,
    },
    clubHistory: s.clubHistory ?? [],
    saveVersion: 2,
  }),
};

const REQUIRED_KEYS = [
  'seed',
  'manager',
  'season',
  'week',
  'players',
  'pairs',
  'clubs',
  'calendar',
  'finance',
];

export function migrate(raw: unknown): GameState {
  if (!raw || typeof raw !== 'object') throw new Error('Formato non riconosciuto');
  let s = raw as Record<string, unknown>;
  for (const k of REQUIRED_KEYS) if (!(k in s)) throw new Error(`Campo mancante: ${k}`);
  let version = typeof s.saveVersion === 'number' ? s.saveVersion : 1;
  if (version > SAVE_VERSION) throw new Error(`Versione ${version} non supportata`);
  while (version < SAVE_VERSION) {
    const m = MIGRATIONS[version];
    if (!m) throw new Error(`Migrazione mancante dalla versione ${version}`);
    s = m(s);
    version = s.saveVersion as number;
  }
  return s as unknown as GameState;
}
