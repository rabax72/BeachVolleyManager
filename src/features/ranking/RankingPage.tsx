import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGameState } from '../../store/gameStore';
import {
  entryPoints,
  pairEntryPoints,
  pairEntryRanking,
  playerRanking,
} from '../../engine/ranking';
import { isUserPair } from '../../engine/pairs';
import { fullName } from '../../engine/player';
import { pairName, seasonYear } from '../../engine/season';
import type { Gender, Pair, Player } from '../../engine/types';
import { NATIONALITY_BY_CODE } from '../../data/names';
import { formatNumber, t } from '../../i18n';
import { Card, PageHeader, Tabs } from '../../ui/components';
import { DataTable, type Column } from '../../ui/DataTable';
import { PlayerAvatar } from '../../ui/avatar/Avatar';

type Leader = 'aces' | 'kills' | 'blocks' | 'digs' | 'titles';

export function RankingPage() {
  const g = useGameState();
  const [gender, setGender] = useState<Gender>(g.manager.circuit === 'F' ? 'F' : 'M');
  const ranking = useMemo(() => playerRanking(g.players, gender), [g, gender]);
  const position = useMemo(() => new Map(ranking.map((p, i) => [p.id, i + 1])), [ranking]);
  const pairs = useMemo(() => pairEntryRanking(g.pairs, g.players, gender), [g, gender]);
  const pairPos = useMemo(() => new Map(pairs.map((p, i) => [p.id, i + 1])), [pairs]);

  const playerCols: Column<Player>[] = [
    {
      key: 'rank',
      header: t('common.rank'),
      numeric: true,
      sortValue: (p) => position.get(p.id) ?? 0,
      render: (p) => position.get(p.id),
    },
    {
      key: 'name',
      header: t('common.name'),
      sortValue: (p) => p.lastName,
      render: (p) => (
        <span className="inline-flex items-center gap-2">
          <PlayerAvatar player={p} size={26} decorative />
          <Link
            className={`hover:underline ${p.contract.clubId === g.manager.clubId ? 'font-bold text-sea-800' : 'text-sea-900'}`}
            to={`/gioco/giocatore/${p.id}`}
          >
            {fullName(p)}
          </Link>
        </span>
      ),
    },
    {
      key: 'nat',
      header: t('common.nationality'),
      sortValue: (p) => p.nationality,
      render: (p) => NATIONALITY_BY_CODE[p.nationality]?.name ?? p.nationality,
    },
    {
      key: 'age',
      header: t('common.age'),
      numeric: true,
      sortValue: (p) => p.age,
      render: (p) => p.age,
    },
    {
      key: 'club',
      header: t('common.club'),
      sortValue: (p) => (p.contract.clubId ? g.clubs[p.contract.clubId].name : ''),
      render: (p) => (p.contract.clubId ? g.clubs[p.contract.clubId].name : t('common.freeAgent')),
    },
    {
      key: 'titles',
      header: t('common.titles'),
      numeric: true,
      sortValue: (p) => p.season.titles,
      render: (p) => p.season.titles,
    },
    {
      key: 'points',
      header: t('common.points'),
      numeric: true,
      sortValue: (p) => p.points,
      render: (p) => formatNumber(p.points),
    },
    {
      key: 'entry',
      header: t('ranking.entryPoints'),
      numeric: true,
      sortValue: (p) => entryPoints(p),
      render: (p) => formatNumber(entryPoints(p)),
    },
  ];
  const pairCols: Column<Pair>[] = [
    {
      key: 'rank',
      header: t('common.rank'),
      numeric: true,
      sortValue: (p) => pairPos.get(p.id) ?? 0,
      render: (p) => pairPos.get(p.id),
    },
    {
      key: 'pair',
      header: t('common.pair'),
      sortValue: (p) => pairName(g, p.id),
      render: (p) => (
        <span className={isUserPair(g, p) ? 'font-bold text-sea-800' : ''}>
          {pairName(g, p.id)}
        </span>
      ),
    },
    {
      key: 'chem',
      header: t('common.chemistry'),
      numeric: true,
      sortValue: (p) => p.chemistry,
      render: (p) => Math.round(p.chemistry),
    },
    {
      key: 'pts',
      header: t('ranking.entryPoints'),
      numeric: true,
      sortValue: (p) => pairEntryPoints(p, g.players),
      render: (p) => formatNumber(pairEntryPoints(p, g.players)),
    },
  ];

  const leaders = (key: Leader) =>
    [...ranking]
      .sort((a, b) => b.season[key] - a.season[key])
      .slice(0, 5)
      .filter((p) => p.season[key] > 0);

  return (
    <div>
      <PageHeader
        title={t('ranking.title')}
        subtitle={t('common.seasonYear', { year: seasonYear(g) })}
      />
      <Tabs
        label={t('common.gender')}
        value={gender}
        onChange={setGender}
        tabs={[
          { value: 'M', label: t('gender.M') },
          { value: 'F', label: t('gender.F') },
        ]}
      />
      <div className="grid gap-4 xl:grid-cols-[3fr_2fr]">
        <Card title={t('ranking.individual', { gender: t(`gender.${gender}`).toLowerCase() })}>
          <DataTable
            rows={ranking}
            columns={playerCols}
            rowKey={(p) => p.id}
            caption={t('ranking.individual', { gender: t(`gender.${gender}`) })}
          />
        </Card>
        <div className="space-y-4">
          <Card title={t('ranking.entryRanking')}>
            <DataTable
              rows={pairs}
              columns={pairCols}
              rowKey={(p) => p.id}
              pageSize={25}
              caption={t('ranking.entryRanking')}
            />
          </Card>
          <Card title={t('ranking.leaders')}>
            <div className="grid gap-3 sm:grid-cols-2">
              {(['titles', 'aces', 'kills', 'blocks', 'digs'] as Leader[]).map((k) => (
                <div key={k}>
                  <h3 className="mb-1 text-xs font-bold text-sand-700 uppercase">
                    {t(`ranking.statCategories.${k}`)}
                  </h3>
                  <ol className="space-y-0.5 text-sm">
                    {leaders(k).map((p) => (
                      <li key={p.id} className="flex justify-between gap-2">
                        <span>{fullName(p)}</span>
                        <span className="font-semibold tabular-nums">{p.season[k]}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
