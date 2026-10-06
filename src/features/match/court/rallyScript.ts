/**
 * Copione grafico di uno scambio: traduce la sequenza di tocchi del motore in movimenti della
 * palla e dei giocatori su un campo visto dall'alto. È puramente estetico: le traiettorie usano
 * un RNG proprio (seminato dal numero del rally), quindi non influenzano la simulazione.
 *
 * Coordinate in metri: rete su x = 0, campo 16 × 8 m (x ∈ [-8, 8], y ∈ [-4, 4]),
 * zona libera fino a x = ±11, y = ±6. `z` è l'altezza della palla.
 */
import { createRng } from '../../../engine/rng';
import type { RallyAction, TeamIndex } from '../../../engine/match';

export interface Vec {
  x: number;
  y: number;
}
export interface Vec3 extends Vec {
  z: number;
}
export type Positions = [[Vec, Vec], [Vec, Vec]];
export interface Actor {
  team: TeamIndex;
  player: number;
}

export interface Segment {
  /** Durata in ms a velocità normale. */
  duration: number;
  /** Traiettoria della palla; `arc` è l'altezza aggiuntiva a metà percorso. */
  ball: { from: Vec3; to: Vec3; arc: number };
  /** Posizioni dei giocatori a fine segmento (si muovono durante il segmento). */
  players: Positions;
  /** Tocco eseguito in questo segmento. */
  action?: RallyAction;
  /** Giocatori in salto (attacco, muro). */
  jumps?: Actor[];
  /** Pausa finale a palla ferma. */
  final?: boolean;
}

export const FIELD = { halfLength: 11, halfWidth: 6, courtHalfLength: 8, courtHalfWidth: 4 };

const clampVec = (p: Vec): Vec => ({
  x: Math.max(-10.6, Math.min(10.6, p.x)),
  y: Math.max(-5.6, Math.min(5.6, p.y)),
});
const lerpVec = (a: Vec, b: Vec, t: number): Vec => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});
const clonePositions = (p: Positions): Positions => [
  [{ ...p[0][0] }, { ...p[0][1] }],
  [{ ...p[1][0] }, { ...p[1][1] }],
];
const other = (t: TeamIndex): TeamIndex => (t === 0 ? 1 : 0);

/** Segno della metà campo di una squadra: -1 a sinistra, +1 a destra. */
const half = (team: TeamIndex, leftTeam: TeamIndex): number => (team === leftTeam ? -1 : 1);

/** Schieramento al momento del servizio. */
export function serveFormation(
  serving: TeamIndex,
  server: number,
  leftTeam: TeamIndex,
  sy = 1.2,
): Positions {
  const d = half(serving, leftTeam);
  const recv = other(serving);
  const pos: Positions = [
    [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ],
    [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ],
  ];
  pos[serving][server] = { x: d * 9.2, y: sy };
  pos[serving][1 - server] = { x: d * 2.5, y: -sy * 0.6 };
  pos[recv][0] = { x: -d * 5.5, y: -2 };
  pos[recv][1] = { x: -d * 5.5, y: 2 };
  return pos;
}

export function buildRallyScript(
  actions: readonly RallyAction[],
  leftTeam: TeamIndex,
  blockers: readonly [number, number],
  seed: number,
): Segment[] {
  const first = actions[0];
  if (!first || first.kind !== 'serve') return [];
  const rng = createRng(seed);
  const segs: Segment[] = [];
  const sy = rng.pick([-1, 1]) * rng.range(0.4, 2.6);
  let pos = serveFormation(first.team, first.player, leftTeam, sy);
  let ball: Vec3 = { x: half(first.team, leftTeam) * 9.4, y: sy, z: 1 };
  let attackY = 0;

  const place = (team: TeamIndex, i: number, p: Vec): void => {
    pos = clonePositions(pos);
    pos[team][i] = clampVec(p);
  };
  const go = (duration: number, to: Vec3, arc: number, extra: Partial<Segment> = {}): void => {
    const target = { ...clampVec(to), z: to.z };
    segs.push({ duration, ball: { from: ball, to: target, arc }, players: pos, ...extra });
    ball = target;
  };

  // Lancio di palla: intanto i giocatori prendono posizione.
  go(800, { ...ball, z: 3.2 }, 0.3, { action: first });

  for (let i = 0; i < actions.length; i++) {
    const a = actions[i];
    const next = actions[i + 1];
    const d = half(a.team, leftTeam);
    const o = other(a.team);
    switch (a.kind) {
      case 'serve': {
        if (a.result === 'error') {
          if (rng.chance(0.5)) {
            go(650, { x: d * 0.2, y: sy * 0.4, z: 1.3 }, 2.2, { action: a });
            go(350, { x: d * 0.9, y: sy * 0.4, z: 0 }, 0.2);
          } else {
            const land = { x: -d * rng.range(8.6, 10.2), y: rng.range(-3.5, 3.5), z: 0 };
            go(950, land, 3.4, { action: a });
          }
          break;
        }
        if (!next) break;
        // Dopo il servizio: muratore a rete, difensore in fondo.
        const bl = blockers[a.team];
        place(a.team, bl, { x: d * 1, y: 0 });
        place(a.team, 1 - bl, { x: d * 5.5, y: 0 });
        const rp = pos[next.team][next.player];
        if (a.result === 'point') {
          const land = {
            x: rp.x + rng.range(-1.5, 1.5),
            y: rp.y + rng.pick([-1, 1]) * rng.range(1, 1.8),
            z: 0,
          };
          place(next.team, next.player, lerpVec(rp, land, 0.55));
          go(950, land, 2.2, { action: a });
        } else {
          go(1000, { ...rp, z: 0.6 }, 2.8, { action: a });
        }
        break;
      }
      case 'reception':
      case 'dig': {
        if (a.result === 'error') break;
        const q = a.quality ?? 0.5;
        const spot = {
          x: d * (1.4 + (1 - q) * 3),
          y: rng.range(-1.2, 1.2) + (1 - q) * rng.range(-1.8, 1.8),
        };
        place(a.team, 1 - a.player, spot);
        attackY = rng.pick([-1, 1]) * rng.range(1.2, 3);
        place(a.team, a.player, { x: d * 4, y: attackY });
        go(a.kind === 'dig' ? 900 : 850, { ...spot, z: 2.8 }, 2.4 + q, { action: a });
        break;
      }
      case 'set': {
        const sp = pos[a.team][a.player];
        if (a.result === 'error') {
          go(650, { x: sp.x + d * 0.8, y: sp.y + rng.range(-1, 1), z: 0 }, 1, { action: a });
          break;
        }
        // L'attaccante rincorre, la squadra avversaria si schiera: muro e difesa.
        place(a.team, 1 - a.player, { x: d * 1.3, y: attackY });
        place(o, blockers[o], { x: -d * 0.5, y: attackY });
        place(o, 1 - blockers[o], { x: -d * 5.8, y: -attackY * 0.5 });
        go(750, { x: d * 0.9, y: attackY, z: 3.4 }, 1.6, { action: a });
        break;
      }
      case 'attack': {
        const jumps: Actor[] = [
          { team: a.team, player: a.player },
          { team: o, player: blockers[o] },
        ];
        if (a.result === 'error') {
          if (rng.chance(0.4)) {
            go(320, { x: d * 0.15, y: attackY, z: 1.5 }, 0, { action: a, jumps });
            go(400, { x: d * 1.2, y: attackY + rng.range(-1, 1), z: 0 }, 0.3);
          } else {
            const wide = rng.chance(0.5);
            const land = wide
              ? { x: -d * rng.range(3, 7), y: (attackY >= 0 ? 1 : -1) * rng.range(4.4, 5.5) }
              : { x: -d * rng.range(8.4, 10), y: rng.range(-3.5, 3.5) };
            go(520, { ...land, z: 0 }, 0.8, { action: a, jumps });
          }
          break;
        }
        if (next?.kind === 'block') {
          go(260, { x: d * 0.25, y: attackY, z: 3.1 }, 0, { action: a, jumps });
          const drop = { x: d * rng.range(1, 2.6), y: attackY + rng.range(-1.2, 1.2), z: 0 };
          go(450, drop, 0.5, { action: next, jumps: [jumps[1]] });
          i++;
          break;
        }
        // Schiacciata o pallonetto sopra il muro.
        const shot = rng.chance(0.3);
        const defender = next?.kind === 'dig' ? next.player : 1 - blockers[o];
        const dp = pos[o][defender];
        if (a.result === 'point') {
          const land = {
            x: -d * rng.range(shot ? 2 : 3, 7.5),
            y: Math.max(-3.8, Math.min(3.8, dp.y + rng.pick([-1, 1]) * rng.range(2, 3.5))),
          };
          place(o, defender, lerpVec(dp, land, 0.5));
          go(shot ? 800 : 380, { ...land, z: 0 }, shot ? 2.4 : 0, { action: a, jumps });
        } else {
          const spot = { x: dp.x + rng.range(-1.2, 1.2), y: dp.y + rng.range(-1.5, 1.5) };
          place(o, defender, spot);
          go(shot ? 800 : 420, { ...spot, z: 0.5 }, shot ? 2.4 : 0, { action: a, jumps });
        }
        break;
      }
      case 'block':
        // Gestito insieme all'attacco che lo precede.
        break;
    }
  }

  // Pausa finale a palla ferma.
  go(900, { ...ball, z: 0 }, 0, { final: true });
  return segs;
}

/** Durata complessiva del copione a velocità normale. */
export const scriptDuration = (segs: readonly Segment[]): number =>
  segs.reduce((a, s) => a + s.duration, 0);

export interface Frame {
  players: Positions;
  ball: Vec3;
  /** Indice del segmento corrente. */
  seg: number;
  /** Avanzamento nel segmento corrente, 0–1. */
  p: number;
}

const ease = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/** Fotogramma del copione all'istante `t` (ms), partendo dalle posizioni `start`. */
export function sampleScript(segs: readonly Segment[], start: Positions, t: number): Frame {
  let acc = 0;
  let k = 0;
  while (k < segs.length - 1 && t >= acc + segs[k].duration) acc += segs[k++].duration;
  const seg = segs[k];
  const p = Math.max(0, Math.min(1, (t - acc) / seg.duration));
  const prev = k === 0 ? start : segs[k - 1].players;
  // I giocatori arrivano in posizione un po' prima della palla.
  const m = ease(Math.min(1, p * 1.3));
  const players = [0, 1].map((team) =>
    [0, 1].map((i) => lerpVec(prev[team][i], seg.players[team][i], m)),
  ) as Positions;
  const { from, to, arc } = seg.ball;
  const ball = {
    ...lerpVec(from, to, p),
    z: from.z + (to.z - from.z) * p + 4 * arc * p * (1 - p),
  };
  return { players, ball, seg: k, p };
}
