import { describe, expect, it } from 'vitest';
import { createMatch, playRally, type MatchState } from '../../../engine/match';
import { buildSetup } from '../../../engine/matchSetup';
import { CALM, makePair } from '../../../engine/__tests__/helpers';
import { buildRallyScript, FIELD, sampleScript, scriptDuration } from './rallyScript';

describe('copione grafico dello scambio', () => {
  it('produce traiettorie dentro l’area di gioco per ogni scambio', () => {
    const a = makePair('A', 12, 1001);
    const b = makePair('B', 12, 2002);
    const setup = buildSetup('m1', 5, [a.pair, b.pair], { ...a.players, ...b.players }, CALM);
    let s: MatchState = createMatch(setup);
    while (!s.finished) s = playRally(s);
    for (const e of s.events) {
      if (e.kind !== 'point' || !e.actions) continue;
      const segs = buildRallyScript(e.actions, e.sunFacing ?? 0, [0, 1], e.rally);
      expect(segs.length).toBeGreaterThan(1);
      expect(segs[segs.length - 1].final).toBe(true);
      // La palla finisce a terra
      expect(segs[segs.length - 1].ball.to.z).toBe(0);
      const total = scriptDuration(segs);
      for (let t = 0; t <= total; t += 100) {
        const f = sampleScript(segs, segs[0].players, t);
        expect(Math.abs(f.ball.x)).toBeLessThanOrEqual(FIELD.halfLength);
        expect(Math.abs(f.ball.y)).toBeLessThanOrEqual(FIELD.halfWidth);
        expect(f.ball.z).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('è deterministico dato il seed', () => {
    const actions = [
      { kind: 'serve', team: 0, player: 0, result: 'ok' },
      { kind: 'reception', team: 1, player: 1, result: 'ok', quality: 0.7 },
      { kind: 'set', team: 1, player: 0, result: 'ok', quality: 0.6 },
      { kind: 'attack', team: 1, player: 1, result: 'point' },
    ] as const;
    expect(buildRallyScript(actions, 0, [0, 1], 3)).toEqual(
      buildRallyScript(actions, 0, [0, 1], 3),
    );
  });
});
