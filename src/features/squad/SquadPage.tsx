import { useMemo, useState } from 'react';
import { useGameState } from '../../store/gameStore';
import { userPlayers } from '../../engine/pairs';
import { fullName } from '../../engine/player';
import { MAX_ROSTER } from '../../engine/market';
import type { Gender, Role } from '../../engine/types';
import { t } from '../../i18n';
import { Card, PageHeader, Select, Tabs } from '../../ui/components';
import { DataTable } from '../../ui/DataTable';
import { playerColumns } from './playerColumns';

type View = 'roster' | 'all';

export function SquadPage() {
  const g = useGameState();
  const [view, setView] = useState<View>('roster');
  const [gender, setGender] = useState<Gender | 'all'>('all');
  const [role, setRole] = useState<Role | 'all'>('all');
  const [query, setQuery] = useState('');
  const [onlyFree, setOnlyFree] = useState(false);

  const rows = useMemo(() => {
    const base =
      view === 'roster' ? userPlayers(g) : Object.values(g.players).filter((p) => !p.retired);
    const q = query.trim().toLowerCase();
    return base.filter(
      (p) =>
        (gender === 'all' || p.gender === gender) &&
        (role === 'all' || p.role === role) &&
        (!onlyFree || !p.contract.clubId) &&
        (!q || fullName(p).toLowerCase().includes(q)),
    );
  }, [g, view, gender, role, query, onlyFree]);

  const columns = useMemo(
    () =>
      playerColumns(
        g,
        view === 'roster'
          ? [
              'name',
              'age',
              'role',
              'ovr',
              'pot',
              'attrs',
              'morale',
              'form',
              'fatigue',
              'salary',
              'contract',
              'pair',
            ]
          : ['name', 'age', 'nat', 'role', 'ovr', 'pot', 'attrs', 'points', 'club', 'pair'],
      ),
    [g, view],
  );

  return (
    <div>
      <PageHeader
        title={t('squad.title')}
        subtitle={t('squad.rosterCount', { n: userPlayers(g).length, max: MAX_ROSTER })}
      />
      <Tabs
        label={t('squad.title')}
        value={view}
        onChange={setView}
        tabs={[
          { value: 'roster', label: t('squad.myRoster') },
          { value: 'all', label: t('squad.allPlayers') },
        ]}
      />
      <Card>
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <div>
            <label className="label" htmlFor="sq-search">
              {t('common.search')}
            </label>
            <input
              id="sq-search"
              className="input w-56"
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
          {view === 'all' && (
            <label className="flex items-center gap-2 pb-1.5 text-sm font-semibold">
              <input
                type="checkbox"
                checked={onlyFree}
                onChange={(e) => setOnlyFree(e.target.checked)}
              />
              {t('squad.onlyFree')}
            </label>
          )}
        </div>
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(p) => p.id}
          caption={t('squad.title')}
          initialSort={{ key: view === 'roster' ? 'ovr' : 'points', dir: 'desc' }}
          rowClassName={(p) =>
            p.contract.clubId === g.manager.clubId && view === 'all' ? 'bg-sea-50' : ''
          }
        />
      </Card>
    </div>
  );
}
