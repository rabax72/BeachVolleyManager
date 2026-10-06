import { useMemo, useState } from 'react';
import { Eye, FileSignature, Sparkles } from 'lucide-react';
import { useGame, useGameState } from '../../store/gameStore';
import { playerOverall, salaryDemand, fullName } from '../../engine/player';
import { SCOUT_COST, transferFee, YOUTH_SEARCH_COST } from '../../engine/market';
import { scoutPlayer, youthSearch } from '../../engine/actions';
import type { Gender, Player, Role } from '../../engine/types';
import { formatMoney, t } from '../../i18n';
import { Card, PageHeader, Select, Tabs } from '../../ui/components';
import { DataTable, type Column } from '../../ui/DataTable';
import { playerColumns } from '../squad/playerColumns';
import { OfferModal } from './OfferModal';
import { userPlayers } from '../../engine/pairs';

type View = 'search' | 'shortlist' | 'contracts';

export function MarketPage() {
  const g = useGameState();
  const update = useGame((s) => s.update);
  const [view, setView] = useState<View>('search');
  const [offerFor, setOfferFor] = useState<string | null>(null);
  const defaultGender: Gender | 'all' = g.manager.circuit === 'mixed' ? 'all' : g.manager.circuit;
  const [gender, setGender] = useState<Gender | 'all'>(defaultGender);
  const [role, setRole] = useState<Role | 'all'>('all');
  const [maxAge, setMaxAge] = useState(40);
  const [minOvr, setMinOvr] = useState(1);
  const [onlyFree, setOnlyFree] = useState(false);
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let base: Player[];
    if (view === 'contracts') base = userPlayers(g);
    else
      base = Object.values(g.players).filter(
        (p) =>
          !p.retired &&
          p.contract.clubId !== g.manager.clubId &&
          (view === 'search' || (g.scouting[p.id]?.knowledge ?? 0) > 0),
      );
    if (view === 'contracts') return base;
    return base.filter(
      (p) =>
        (gender === 'all' || p.gender === gender) &&
        (role === 'all' || p.role === role) &&
        p.age <= maxAge &&
        playerOverall(p) >= minOvr &&
        (!onlyFree || !p.contract.clubId) &&
        (!q || fullName(p).toLowerCase().includes(q)),
    );
  }, [g, view, gender, role, maxAge, minOvr, onlyFree, query]);

  const columns = useMemo(() => {
    const extra: Column<Player>[] = [
      {
        key: 'know',
        header: t('market.shortlist'),
        numeric: true,
        sortValue: (p) => g.scouting[p.id]?.knowledge ?? 0,
        render: (p) => `${g.scouting[p.id]?.knowledge ?? 0}%`,
      },
      {
        key: 'demand',
        header: t('common.salary'),
        numeric: true,
        sortValue: (p) => salaryDemand(p),
        render: (p) => formatMoney(salaryDemand(p)),
      },
      {
        key: 'fee',
        header: t('market.feeLabel'),
        numeric: true,
        sortValue: (p) => transferFee(p, g.manager.clubId, g.season),
        render: (p) => {
          const fee = transferFee(p, g.manager.clubId, g.season);
          return fee > 0 ? formatMoney(fee) : '—';
        },
      },
      {
        key: 'actions',
        header: <span className="sr-only">{t('common.actions')}</span>,
        render: (p) => (
          <div className="flex gap-1">
            {view !== 'contracts' && (
              <button
                className="btn btn-secondary px-2 py-1 text-xs"
                disabled={
                  g.finance.balance < SCOUT_COST || (g.scouting[p.id]?.knowledge ?? 0) >= 100
                }
                onClick={() => update((s) => scoutPlayer(s, p.id))}
                aria-label={`${t('market.scout')} ${fullName(p)}`}
                title={t('market.scoutCost', { cost: formatMoney(SCOUT_COST) })}
              >
                <Eye size={14} aria-hidden /> {t('market.scout')}
              </button>
            )}
            <button
              className="btn btn-primary px-2 py-1 text-xs"
              onClick={() => setOfferFor(p.id)}
              aria-label={`${t('market.offer')} ${fullName(p)}`}
            >
              <FileSignature size={14} aria-hidden />{' '}
              {view === 'contracts' ? t('market.renew') : t('market.offer')}
            </button>
          </div>
        ),
      },
    ];
    const base = playerColumns(
      g,
      view === 'contracts'
        ? ['name', 'age', 'role', 'ovr', 'morale', 'salary', 'contract']
        : ['name', 'age', 'nat', 'role', 'ovr', 'pot', 'club'],
    );
    return view === 'contracts'
      ? [...base, extra[1], extra[3]]
      : [...base, extra[0], extra[1], extra[2], extra[3]];
  }, [g, view, update]);

  return (
    <div>
      <PageHeader title={t('market.title')} subtitle={t('market.intro')} />
      <Tabs
        label={t('market.title')}
        value={view}
        onChange={setView}
        tabs={[
          { value: 'search', label: t('market.search') },
          { value: 'shortlist', label: t('market.shortlist') },
          { value: 'contracts', label: t('common.contract') },
        ]}
      />
      {view !== 'contracts' && (
        <Card
          className="mb-4"
          title={
            <>
              <Sparkles size={18} aria-hidden /> {t('market.youthSearch')}
            </>
          }
        >
          <p className="mb-2 text-sm text-sand-700">
            {t('market.youthSearchDesc', { cost: formatMoney(YOUTH_SEARCH_COST) })}
          </p>
          <div className="flex flex-wrap gap-2">
            {(['M', 'F'] as Gender[]).map((gd) => (
              <button
                key={gd}
                className="btn btn-secondary"
                disabled={g.finance.balance < YOUTH_SEARCH_COST}
                onClick={() => {
                  update((s) => youthSearch(s, gd));
                  setView('shortlist');
                }}
              >
                {t('market.youthSearch')} – {t(`gender.${gd}`)}
              </button>
            ))}
          </div>
        </Card>
      )}
      <Card>
        {view !== 'contracts' && (
          <div className="mb-3 flex flex-wrap items-end gap-3">
            <div>
              <label className="label" htmlFor="mk-search">
                {t('common.search')}
              </label>
              <input
                id="mk-search"
                className="input w-52"
                placeholder={t('common.searchPlaceholder')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Select
              label={t('squad.filterGender')}
              value={gender}
              onChange={setGender}
              options={[
                { value: 'all', label: t('common.all') },
                { value: 'M', label: t('gender.M') },
                { value: 'F', label: t('gender.F') },
              ]}
            />
            <Select
              label={t('squad.filterRole')}
              value={role}
              onChange={setRole}
              options={[
                { value: 'all', label: t('common.all') },
                { value: 'blocker', label: t('role.blocker') },
                { value: 'defender', label: t('role.defender') },
              ]}
            />
            <div>
              <label className="label" htmlFor="mk-age">
                {t('market.maxAge')}
              </label>
              <input
                id="mk-age"
                type="number"
                min={16}
                max={40}
                className="input w-20"
                value={maxAge}
                onChange={(e) => setMaxAge(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label" htmlFor="mk-ovr">
                {t('market.minOvr')}
              </label>
              <input
                id="mk-ovr"
                type="number"
                min={1}
                max={20}
                className="input w-20"
                value={minOvr}
                onChange={(e) => setMinOvr(Number(e.target.value))}
              />
            </div>
            <label className="flex items-center gap-2 pb-1.5 text-sm font-semibold">
              <input
                type="checkbox"
                checked={onlyFree}
                onChange={(e) => setOnlyFree(e.target.checked)}
              />
              {t('squad.onlyFree')}
            </label>
          </div>
        )}
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(p) => p.id}
          caption={t('market.title')}
          initialSort={{ key: 'ovr', dir: 'desc' }}
        />
      </Card>
      {offerFor && <OfferModal playerId={offerFor} onClose={() => setOfferFor(null)} />}
    </div>
  );
}
