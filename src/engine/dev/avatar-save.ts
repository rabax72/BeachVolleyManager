// Salvataggio di prova per controllare gli avatar: npx tsx src/engine/dev/avatar-save.ts <file>
import { writeFileSync } from 'node:fs';
import { newGame } from '../newGame';
import { userPlayers } from '../pairs';

const s = newGame({
  managerName: 'Demo',
  clubName: 'Avatar BV',
  circuit: 'mixed',
  difficulty: 'normal',
  seed: 31,
});
const roster = userPlayers(s);
const morale = [95, 60, 35, 10, 80, 50];
roster.forEach((p, i) => {
  p.morale = morale[i % morale.length];
  if (i % 2 === 1) p.injury = { key: 'ankleSprain', weeksLeft: 2 };
});
writeFileSync(process.argv[2], JSON.stringify(s));
console.log(
  roster
    .map((p) => `${p.firstName} ${p.lastName} ${p.morale}${p.injury ? ' infortunato' : ''}`)
    .join('\n'),
);
