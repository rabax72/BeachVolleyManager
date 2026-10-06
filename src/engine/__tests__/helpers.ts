import { generatePlayer } from '../generation';
import { createRng } from '../rng';
import type { Conditions, Pair, Player, Role } from '../types';

export const CALM: Conditions = { wind: 0, sun: 0, temperature: 26, sand: 'medium' };

export function makePair(
  id: string,
  level: number,
  seed: number,
  chemistry = 60,
): { pair: Pair; players: Record<string, Player> } {
  const rng = createRng(seed);
  const roles: Role[] = ['blocker', 'defender'];
  const ps = roles.map((role, i) => {
    const p = generatePlayer(rng, {
      id: `${id}-p${i}`,
      gender: 'M',
      level,
      age: 27,
      role,
      season: 1,
    });
    p.morale = 70;
    p.form = 70;
    p.fatigue = 0;
    p.hidden.character = 'calm';
    return p;
  });
  return {
    pair: {
      id,
      playerIds: [ps[0].id, ps[1].id],
      gender: 'M',
      chemistry,
      matchesTogether: 10,
      active: true,
      createdSeason: 1,
    },
    players: Object.fromEntries(ps.map((p) => [p.id, p])),
  };
}
