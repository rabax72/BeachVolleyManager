// Script di calibrazione (non è un test): npx tsx src/engine/dev/calibrate.ts
import { simulateMatch } from '../match';
import { buildSetup } from '../matchSetup';
import { CALM, makePair } from '../__tests__/helpers';

function rate(la: number, lb: number, n = 600, mirror = false) {
  let wins = 0;
  let pts = 0;
  let won = 0;
  let aces = 0;
  let serves = 0;
  let sideouts = 0;
  let rallies = 0;
  for (let seed = 0; seed < n; seed++) {
    const a = makePair('A', la, 1001);
    const b = makePair('B', lb, mirror ? 1001 : 2002);
    if (mirror) {
      const ren: Record<string, (typeof b.players)[string]> = {};
      for (const p of Object.values(b.players)) {
        const id = p.id.replace('A', 'B');
        ren[id] = { ...p, id };
      }
      b.players = ren;
      b.pair.playerIds = [
        b.pair.playerIds[0].replace('A', 'B'),
        b.pair.playerIds[1].replace('A', 'B'),
      ];
    }
    const { result, state } = simulateMatch(
      buildSetup('x', seed * 7919 + 1, [a.pair, b.pair], { ...a.players, ...b.players }, CALM),
      { keepEvents: true },
    );
    if (result.winner === 0) wins++;
    for (const [x, y] of result.sets) {
      pts += x + y;
      won += x;
    }
    for (const t of [0, 1])
      for (const i of [0, 1]) {
        aces += result.stats[t][i].aces;
        serves += result.stats[t][i].serves;
      }
    let prevServer = -1;
    for (const e of state.events) {
      if (e.kind === 'point') {
        rallies++;
        if (prevServer !== -1 && e.team !== prevServer) sideouts++;
        prevServer = e.team;
      }
      if (e.kind === 'setEnd') prevServer = -1;
    }
  }
  console.log(
    `${la} vs ${lb}${mirror ? ' (mirror)' : ''}: win ${(wins / n).toFixed(3)} rally ${(won / pts).toFixed(3)} ace% ${((aces / serves) * 100).toFixed(1)} sideout% ${((sideouts / rallies) * 100).toFixed(1)}`,
  );
}

rate(12, 12, 600, true);
rate(12, 12);
rate(12, 13);
rate(14, 11);
rate(15, 10);
rate(16, 8);
