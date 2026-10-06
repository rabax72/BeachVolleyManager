/** Testi derivati dallo stato di gioco (notizie, obiettivi, nomi dei tornei). */
import type {
  BoardObjective,
  GameState,
  NewsItem,
  SponsorObjective,
  Transaction,
  TournamentDef,
} from '../engine/types';
import { formatMoney, hasKey, t, tg, type Params } from '../i18n';

const MONEY_PARAMS = ['prize', 'amount', 'grant', 'salary', 'weekly', 'cost'];

export function newsText(n: NewsItem, g: GameState): string {
  const p: Params = { ...n.params };
  for (const k of MONEY_PARAMS) if (typeof p[k] === 'number') p[k] = formatMoney(p[k] as number);
  if (p.placement !== undefined) p.placementLabel = t(`tournament.placement.${p.placement}`);
  if (typeof p.tier === 'string') p.tier = t(`tier.${p.tier}`);
  if (typeof p.injury === 'string') p.injury = t(`injury.${p.injury}`).toLowerCase();
  if (typeof p.gender === 'string') p.genderLabel = t(`gender.${p.gender}`).toLowerCase();
  if (typeof p.role === 'string') p.roleLabel = t(`staff.roles.${p.role}`).toLowerCase();
  if (typeof p.attr === 'string') p.attrLabel = t(`attr.${p.attr}`).toLowerCase();
  if (typeof p.until === 'number') p.untilYear = g.startYear + p.until - 1;
  // Il parametro g (genere del giocatore) sceglie la variante femminile del testo
  return tg(n.key, typeof n.params.g === 'string' ? n.params.g : undefined, p);
}

export const tournamentTitle = (d: TournamentDef): string => `${t(`tier.${d.tier}`)} ${d.name}`;

export function transactionLabel(tr: Transaction): string {
  // Le etichette degli eventi sono frasi complete: nei movimenti basta la categoria.
  if (tr.label.startsWith('event.')) return t('finance.kinds.event');
  return hasKey(tr.label) ? t(tr.label) : tr.label;
}

export function objectiveText(o: SponsorObjective | BoardObjective, g: GameState): string {
  const key =
    o.target === 1 && hasKey(`objective.${o.kind}_one`)
      ? `objective.${o.kind}_one`
      : `objective.${o.kind}`;
  return t(key, {
    target: o.kind === 'finance' ? formatMoney(o.target) : o.target,
    tier: o.tier ? t(`tier.${o.tier}`) : '',
    year: g.startYear + g.season - 1,
  });
}

export const yearOf = (g: GameState, season: number): number => g.startYear + season - 1;
