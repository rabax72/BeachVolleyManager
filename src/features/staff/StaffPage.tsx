import { useState } from 'react';
import { Star, UserPlus, UserX } from 'lucide-react';
import { useGame, useGameState } from '../../store/gameStore';
import { fireStaff, hireStaff } from '../../engine/actions';
import { STAFF_ROLES } from '../../engine/generation';
import { hiringFee, severance } from '../../engine/staff';
import type { StaffMember } from '../../engine/types';
import { formatMoney, t } from '../../i18n';
import { Card, ConfirmModal, PageHeader } from '../../ui/components';

function Stars({ level }: { level: number }) {
  return (
    <span
      className="inline-flex"
      aria-label={t('common.level', { n: level })}
      title={t('common.level', { n: level })}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={14}
          aria-hidden
          className={i < level ? 'fill-sand-400 text-sand-500' : 'text-sand-200'}
        />
      ))}
    </span>
  );
}

export function StaffPage() {
  const g = useGameState();
  const update = useGame((s) => s.update);
  const [toFire, setToFire] = useState<StaffMember | null>(null);

  return (
    <div>
      <PageHeader title={t('staff.title')} />
      <h2 className="mb-2 text-lg font-bold text-sea-900">{t('staff.current')}</h2>
      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {STAFF_ROLES.map((role) => {
          const m = g.staff.find((s) => s.role === role);
          return (
            <Card key={role} title={t(`staff.roles.${role}`)}>
              <p className="mb-2 text-xs text-sand-700">{t(`staff.effects.${role}`)}</p>
              {m ? (
                <div className="space-y-1 text-sm">
                  <div className="font-semibold">{m.name}</div>
                  <Stars level={m.level} />
                  <div>
                    {formatMoney(m.weeklySalary)} {t('common.perWeek')}
                  </div>
                  <button className="btn btn-secondary mt-2" onClick={() => setToFire(m)}>
                    <UserX size={16} aria-hidden /> {t('staff.fire')}
                  </button>
                </div>
              ) : (
                <p className="font-semibold text-coral-600">{t('staff.vacant')}</p>
              )}
            </Card>
          );
        })}
      </div>
      <Card title={t('staff.market')}>
        <div className="overflow-x-auto">
          <table className="table-dense">
            <thead>
              <tr>
                <th scope="col">{t('common.name')}</th>
                <th scope="col">{t('common.role')}</th>
                <th scope="col">{t('ranking.filterTier')}</th>
                <th scope="col" className="text-right">
                  {t('common.salary')}
                </th>
                <th scope="col" className="text-right">
                  {t('common.cost')}
                </th>
                <th scope="col">
                  <span className="sr-only">{t('common.actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {[...g.staffMarket]
                .sort((a, b) => a.role.localeCompare(b.role) || b.level - a.level)
                .map((c) => {
                  const current = g.staff.find((s) => s.role === c.role);
                  const cost = hiringFee(c) + (current ? severance(current) : 0);
                  return (
                    <tr key={c.id}>
                      <td className="font-semibold">{c.name}</td>
                      <td>{t(`staff.roles.${c.role}`)}</td>
                      <td>
                        <Stars level={c.level} />
                      </td>
                      <td className="num">
                        {formatMoney(c.weeklySalary)} {t('common.perWeek')}
                      </td>
                      <td
                        className="num"
                        title={t('staff.hireCost', {
                          fee: formatMoney(hiringFee(c)),
                          severance: formatMoney(current ? severance(current) : 0),
                        })}
                      >
                        {formatMoney(cost)}
                      </td>
                      <td>
                        <button
                          className="btn btn-primary"
                          disabled={g.finance.balance < cost}
                          onClick={() => update((s) => hireStaff(s, c.id))}
                        >
                          <UserPlus size={16} aria-hidden /> {t('staff.hire')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </Card>
      <ConfirmModal
        open={!!toFire}
        title={t('staff.fire')}
        message={
          toFire
            ? `${toFire.name} — ${t('staff.severance', { amount: formatMoney(severance(toFire)) })}`
            : ''
        }
        danger
        onClose={() => setToFire(null)}
        onConfirm={() => toFire && update((s) => fireStaff(s, toFire.id))}
      />
    </div>
  );
}
