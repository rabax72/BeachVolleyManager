import { describe, expect, it } from 'vitest';
import { newGame, SAVE_VERSION } from '../engine/newGame';
import { advanceWeek } from '../engine/season';
import { compress, decompress, exportJson, importJson, migrate } from './persistence';

const opts = {
  managerName: 'T',
  clubName: 'C',
  circuit: 'F' as const,
  difficulty: 'easy' as const,
  seed: 4242,
};

describe('persistenza', () => {
  it('compressione e decompressione restituiscono lo stesso stato', () => {
    const s = advanceWeek(newGame(opts));
    expect(migrate(decompress(compress(s)))).toEqual(s);
  });

  it('export/import JSON e ripresa della partita', () => {
    let s = newGame(opts);
    for (let i = 0; i < 5; i++) s = advanceWeek(s);
    const restored = importJson(exportJson(s));
    expect(restored).toEqual(s);
    // La partita ripresa prosegue identica all'originale
    expect(advanceWeek(restored)).toEqual(advanceWeek(s));
  });

  it('migra un salvataggio della versione 1', () => {
    const s = newGame(opts) as unknown as Record<string, unknown>;
    const v1: Record<string, unknown> = { ...s, saveVersion: 1 };
    delete v1.clubHistory;
    delete v1.clubSeason;
    const migrated = migrate(v1);
    expect(migrated.saveVersion).toBe(SAVE_VERSION);
    expect(migrated.clubHistory).toEqual([]);
    expect(migrated.clubSeason.semifinals).toBe(0);
  });

  it('rifiuta file non validi o di versioni future', () => {
    expect(() => importJson('non json')).toThrow();
    expect(() => importJson('{"foo": 1}')).toThrow();
    const s = newGame(opts);
    expect(() => migrate({ ...s, saveVersion: SAVE_VERSION + 1 })).toThrow();
  });
});
