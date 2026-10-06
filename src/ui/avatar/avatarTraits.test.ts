import { describe, expect, it } from 'vitest';
import { newGame } from '../../engine/newGame';
import { avatarTraits, jerseyColor, moodFromMorale, shade } from './avatarTraits';

const game = newGame({
  managerName: 'A',
  clubName: 'B',
  circuit: 'mixed',
  difficulty: 'normal',
  seed: 99,
});
const players = Object.values(game.players);

describe('avatar', () => {
  it('è deterministico per lo stesso giocatore', () => {
    for (const p of players.slice(0, 50))
      expect(avatarTraits(p)).toEqual(avatarTraits(structuredClone(p)));
  });

  it("l'espressione segue il morale", () => {
    expect(moodFromMorale(90)).toBe('happy');
    expect(moodFromMorale(70)).toBe('happy');
    expect(moodFromMorale(55)).toBe('content');
    expect(moodFromMorale(30)).toBe('neutral');
    expect(moodFromMorale(10)).toBe('sad');
    const p = players[0];
    expect(avatarTraits({ ...p, morale: 10 }).mood).toBe('sad');
    // Cambiare il morale non cambia l'aspetto
    const happy = avatarTraits({ ...p, morale: 95 });
    const sad = avatarTraits({ ...p, morale: 5 });
    expect({ ...happy, mood: null }).toEqual({ ...sad, mood: null });
  });

  it('mostra il cerotto solo se infortunato', () => {
    const p = players[1];
    expect(avatarTraits({ ...p, injury: null }).injured).toBe(false);
    expect(avatarTraits({ ...p, injury: { key: 'ankleSprain', weeksLeft: 2 } }).injured).toBe(true);
  });

  it('rispetta il genere e varia tra i giocatori', () => {
    const male = ['short', 'buzz', 'spiky', 'curly', 'bald', 'manBun'];
    for (const p of players) {
      const tr = avatarTraits(p);
      expect(tr.female).toBe(p.gender === 'F');
      if (p.gender === 'F') expect(tr.facialHair).toBe('none');
      else expect(male).toContain(tr.hair);
    }
    const looks = new Set(
      players.map((p) => {
        const tr = avatarTraits(p);
        return `${tr.skin}${tr.hair}${tr.hairColor}${tr.accessory}`;
      }),
    );
    expect(looks.size).toBeGreaterThan(players.length * 0.4);
  });

  it('colori: canotta per club e sfumature valide', () => {
    expect(jerseyColor('c0')).toBe(jerseyColor('c0'));
    expect(jerseyColor('c1')).not.toBe(jerseyColor('c2'));
    expect(jerseyColor(null)).toMatch(/^#[0-9a-f]{6}$/);
    expect(shade('#ffffff', 0.5)).toBe('#808080');
    expect(shade('#000000', 0.3)).toBe('#000000');
  });
});
