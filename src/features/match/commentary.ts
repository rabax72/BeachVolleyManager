/** Generazione della telecronaca testuale a partire dagli eventi del motore. */
import type { MatchEvent, MatchSetup, TeamIndex } from '../../engine/match';
import { t } from '../../i18n';

export interface CommentaryLine {
  id: string;
  setIndex: number;
  score: [number, number];
  text: string;
  team: TeamIndex | null;
  highlight: boolean;
  kind: MatchEvent['kind'];
}

const variant = (key: string, seed: number): string => {
  const options = t(key).split('|');
  return options[seed % options.length];
};

const teamLabel = (setup: MatchSetup, team: TeamIndex): string =>
  setup.teams[team].players.map((p) => p.name.split(' ').slice(1).join(' ') || p.name).join(' / ');

export function buildCommentary(setup: MatchSetup, events: MatchEvent[]): CommentaryLine[] {
  const names = new Map<string, string>();
  for (const team of setup.teams) for (const p of team.players) names.set(p.id, p.name);
  const setsWon: [number, number] = [0, 0];
  const lines: CommentaryLine[] = [];
  events.forEach((e, i) => {
    const id = `e${i}`;
    switch (e.kind) {
      case 'point': {
        const key =
          e.cause === 'kill' && e.touches >= 9 ? 'commentary.killLong' : `commentary.${e.cause}`;
        let text = `${variant(key, e.rally)}`
          .replace('{player}', names.get(e.playerId) ?? '?')
          .replace('{other}', e.otherId ? (names.get(e.otherId) ?? '?') : '');
        if (e.setPoint !== null) {
          const isMatch = setsWon[e.setPoint] === 1;
          text += ` ${t(isMatch ? 'match.matchPoint' : 'match.setPoint', { team: teamLabel(setup, e.setPoint) })}`;
        }
        lines.push({
          id,
          setIndex: e.setIndex,
          score: e.score,
          text,
          team: e.team,
          highlight: e.highlight,
          kind: e.kind,
        });
        break;
      }
      case 'sideSwitch':
        lines.push({
          id,
          setIndex: e.setIndex,
          score: e.score,
          text: t('match.sideSwitch', { a: e.score[0], b: e.score[1] }),
          team: null,
          highlight: false,
          kind: e.kind,
        });
        break;
      case 'setEnd':
        setsWon[e.winner]++;
        lines.push({
          id,
          setIndex: e.setIndex,
          score: e.score,
          text: t('match.setEnd', {
            n: e.setIndex + 1,
            team: teamLabel(setup, e.winner),
            a: e.score[0],
            b: e.score[1],
          }),
          team: e.winner,
          highlight: true,
          kind: e.kind,
        });
        break;
      case 'matchEnd':
        lines.push({
          id,
          setIndex: e.sets.length - 1,
          score: e.sets[e.sets.length - 1],
          text: t('match.matchEnd', { team: teamLabel(setup, e.winner) }),
          team: e.winner,
          highlight: true,
          kind: e.kind,
        });
        break;
      case 'timeout':
        lines.push({
          id,
          setIndex: e.setIndex,
          score: e.score,
          text: t('match.timeoutCalled', {
            team: teamLabel(setup, e.team),
            a: e.score[0],
            b: e.score[1],
          }),
          team: e.team,
          highlight: true,
          kind: e.kind,
        });
        break;
      case 'tactics':
        lines.push({
          id,
          setIndex: e.setIndex,
          score: e.score,
          text: t('match.tacticsEvent', { team: teamLabel(setup, e.team) }),
          team: e.team,
          highlight: false,
          kind: e.kind,
        });
        break;
    }
  });
  return lines;
}

export { teamLabel };
