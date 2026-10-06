/**
 * Generatore pseudo-casuale deterministico (mulberry32).
 * Lo stato è un singolo intero a 32 bit, quindi è serializzabile e riprendibile.
 */
export interface Rng {
  /** Numero in [0, 1). */
  next(): number;
  /** Intero in [min, max] inclusi. */
  int(min: number, max: number): number;
  /** Float in [min, max). */
  range(min: number, max: number): number;
  chance(p: number): boolean;
  pick<T>(items: readonly T[]): T;
  weighted<T>(items: readonly T[], weights: readonly number[]): T;
  /** Distribuzione approssimativamente normale (Box-Muller). */
  normal(mean: number, sd: number): number;
  shuffle<T>(items: readonly T[]): T[];
  /** Stato corrente, da salvare per riprendere la sequenza. */
  getState(): number;
}

export function mulberry32Step(state: number): [value: number, nextState: number] {
  const next = (state + 0x6d2b79f5) | 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [value, next];
}

export function createRng(seed: number): Rng {
  let state = seed | 0;
  const next = (): number => {
    const [v, s] = mulberry32Step(state);
    state = s;
    return v;
  };
  const rng: Rng = {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    range: (min, max) => min + next() * (max - min),
    chance: (p) => next() < p,
    pick: (items) => {
      if (items.length === 0) throw new Error('pick() su array vuoto');
      return items[Math.floor(next() * items.length)];
    },
    weighted: (items, weights) => {
      const total = weights.reduce((a, b) => a + b, 0);
      let r = next() * total;
      for (let i = 0; i < items.length; i++) {
        r -= weights[i];
        if (r < 0) return items[i];
      }
      return items[items.length - 1];
    },
    normal: (mean, sd) => {
      const u = Math.max(next(), 1e-12);
      const v = next();
      return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
    shuffle: (items) => {
      const out = [...items];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
    getState: () => state,
  };
  return rng;
}

/** Hash FNV-1a di più parti in un seed a 32 bit. */
export function hashSeed(...parts: (string | number)[]): number {
  let h = 0x811c9dc5;
  const str = parts.join('|');
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h | 0;
}

/** Seed casuale per nuove partite quando l'utente non ne specifica uno. */
export function randomSeed(): number {
  return (Math.random() * 0xffffffff) | 0;
}
