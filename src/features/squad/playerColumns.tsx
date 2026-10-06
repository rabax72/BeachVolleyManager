import { Link } from 'react-router-dom';
import type { Column } from '../../ui/DataTable';
import type { AttributeKey, GameState, Player } from '../../engine/types';
import { fullName, marketValue, playerOverall, potentialEstimate } from '../../engine/player';
import { activePairOf } from '../../engine/pairs';
import { pairName } from '../../engine/season';
import { NATIONALITY_BY_CODE } from '../../data/names';
import { formatMoney, formatNumber, t } from '../../i18n';
import { AttrValue, Badge, Meter } from '../../ui/components';

export type ColumnKey =
  | 'name'
  | 'age'
  | 'nat'
  | 'role'
  | 'ovr'
  | 'pot'
  | 'attrs'
  | 'morale'
  | 'form'
  | 'fatigue'
  | 'status'
  | 'salary'
  | 'contract'
  | 'club'
  | 'pair'
  | 'value'
  | 'points';

const KEY_ATTRS: AttributeKey[] = ['serve', 'reception', 'setting', 'attack', 'block', 'defense'];

export function playerColumns(g: GameState, keys: ColumnKey[]): Column<Player>[] {
  const year = (season: number) => g.startYear + season - 1;
  const all: Record<ColumnKey, Column<Player>[]> = {
    name: [
      {
        key: 'name',
        header: t('common.name'),
        sortValue: (p) => `${p.lastName} ${p.firstName}`,
        render: (p) => (
          <span className="inline-flex flex-col items-start gap-0.5">
            <Link
              className="font-semibold text-sea-800 hover:underline"
              to={`/gioco/giocatore/${p.id}`}
            >
              {fullName(p)}
            </Link>
            {p.injury && (
              <Badge tone="bad">
                {t(`injury.${p.injury.key}`)} · {t('common.weeks', { n: p.injury.weeksLeft })}
              </Badge>
            )}
          </span>
        ),
      },
    ],
    age: [
      {
        key: 'age',
        header: t('common.age'),
        numeric: true,
        sortValue: (p) => p.age,
        render: (p) => p.age,
      },
    ],
    nat: [
      {
        key: 'nat',
        header: t('common.nationality'),
        sortValue: (p) => p.nationality,
        render: (p) => (
          <span title={NATIONALITY_BY_CODE[p.nationality]?.name}>
            {NATIONALITY_BY_CODE[p.nationality]?.name ?? p.nationality}
          </span>
        ),
      },
    ],
    role: [
      {
        key: 'role',
        header: t('common.role'),
        sortValue: (p) => p.role,
        render: (p) => t(`role.${p.role}`),
      },
    ],
    ovr: [
      {
        key: 'ovr',
        header: t('common.ovrShort'),
        title: t('common.overall'),
        numeric: true,
        sortValue: (p) => playerOverall(p),
        render: (p) => <AttrValue value={playerOverall(p)} label={t('common.overall')} />,
      },
    ],
    pot: [
      {
        key: 'pot',
        header: t('common.potential'),
        numeric: true,
        sortValue: (p) => {
          const k =
            p.contract.clubId === g.manager.clubId ? 100 : (g.scouting[p.id]?.knowledge ?? 0);
          return k > 0 ? potentialEstimate(p, k).max : -1;
        },
        render: (p) => {
          const k =
            p.contract.clubId === g.manager.clubId ? 100 : (g.scouting[p.id]?.knowledge ?? 0);
          if (k === 0) return <span className="text-sand-700">?</span>;
          const est = potentialEstimate(p, k);
          return est.min === est.max ? est.max : `${est.min}–${est.max}`;
        },
      },
    ],
    attrs: KEY_ATTRS.map((k) => ({
      key: k,
      header: t(`attrShort.${k}`),
      title: t(`attr.${k}`),
      numeric: true,
      sortValue: (p: Player) => p.attrs[k],
      render: (p: Player) => <AttrValue value={p.attrs[k]} label={t(`attr.${k}`)} />,
    })),
    morale: [
      {
        key: 'morale',
        header: t('common.morale'),
        sortValue: (p) => p.morale,
        render: (p) => <Meter value={p.morale} label={t('common.morale')} />,
      },
    ],
    form: [
      {
        key: 'form',
        header: t('common.form'),
        sortValue: (p) => p.form,
        render: (p) => <Meter value={p.form} label={t('common.form')} />,
      },
    ],
    fatigue: [
      {
        key: 'fatigue',
        header: t('common.fatigue'),
        sortValue: (p) => p.fatigue,
        render: (p) => <Meter value={p.fatigue} label={t('common.fatigue')} invert />,
      },
    ],
    status: [
      {
        key: 'status',
        header: t('common.status'),
        sortValue: (p) => (p.injury ? p.injury.weeksLeft : 0),
        render: (p) =>
          p.injury ? (
            <Badge tone="bad" title={t(`injury.${p.injury.key}`)}>
              {t(`injury.${p.injury.key}`)} · {p.injury.weeksLeft}s
            </Badge>
          ) : (
            <Badge tone="good">{t('common.available')}</Badge>
          ),
      },
    ],
    salary: [
      {
        key: 'salary',
        header: t('common.salary'),
        numeric: true,
        sortValue: (p) => p.contract.salary,
        render: (p) => (p.contract.clubId ? formatMoney(p.contract.salary) : '—'),
      },
    ],
    contract: [
      {
        key: 'contract',
        header: t('common.contract'),
        numeric: true,
        sortValue: (p) => (p.contract.clubId ? p.contract.untilSeason : 0),
        render: (p) =>
          p.contract.clubId ? (
            <span className={p.contract.untilSeason <= g.season ? 'font-bold text-coral-600' : ''}>
              {year(p.contract.untilSeason)}
            </span>
          ) : (
            '—'
          ),
      },
    ],
    club: [
      {
        key: 'club',
        header: t('common.club'),
        sortValue: (p) => (p.contract.clubId ? g.clubs[p.contract.clubId].name : 'ZZZ'),
        render: (p) =>
          p.contract.clubId ? (
            <span
              className={p.contract.clubId === g.manager.clubId ? 'font-semibold text-sea-800' : ''}
            >
              {g.clubs[p.contract.clubId].name}
            </span>
          ) : (
            <Badge tone="sea">{t('common.freeAgent')}</Badge>
          ),
      },
    ],
    pair: [
      {
        key: 'pair',
        header: t('common.pair'),
        sortValue: (p) => {
          const k = activePairOf(g, p.id);
          return k ? pairName(g, k.id) : 'ZZZ';
        },
        render: (p) => {
          const k = activePairOf(g, p.id);
          return k ? pairName(g, k.id) : <span className="text-sand-700">{t('squad.noPair')}</span>;
        },
      },
    ],
    value: [
      {
        key: 'value',
        header: t('market.value'),
        numeric: true,
        sortValue: (p) => marketValue(p),
        render: (p) => formatMoney(marketValue(p)),
      },
    ],
    points: [
      {
        key: 'points',
        header: t('common.points'),
        numeric: true,
        sortValue: (p) => p.points,
        render: (p) => formatNumber(p.points),
      },
    ],
  };
  return keys.flatMap((k) => all[k]);
}
