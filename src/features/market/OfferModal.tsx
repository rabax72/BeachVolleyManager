import { useState } from 'react';
import { useGame, useGameState } from '../../store/gameStore';
import { makeOffer } from '../../engine/actions';
import {
  askingSalary,
  MAX_CONTRACT_YEARS,
  MAX_REFUSALS,
  transferFee,
  type NegotiationResult,
} from '../../engine/market';
import { fullName, salaryDemand } from '../../engine/player';
import { formatMoney, t } from '../../i18n';
import { Modal } from '../../ui/components';

export function OfferModal({ playerId, onClose }: { playerId: string; onClose: () => void }) {
  const g = useGameState();
  const update = useGame((s) => s.update);
  const p = g.players[playerId];
  const own = p.contract.clubId === g.manager.clubId;
  const [salary, setSalary] = useState(Math.max(p.contract.salary, salaryDemand(p)));
  const [years, setYears] = useState(2);
  const [result, setResult] = useState<NegotiationResult | null>(null);
  const fee = transferFee(p, g.manager.clubId, g.season);
  // L'indicazione è volutamente approssimata: il giocatore non rivela la cifra esatta.
  const hint = Math.round(askingSalary(p, g, years) / 50) * 50;

  const submit = () => {
    let res: NegotiationResult | null = null;
    update((state) => {
      const out = makeOffer(state, playerId, { salary, years });
      res = out.result;
      return out.state;
    });
    setResult(res);
  };

  return (
    <Modal
      open
      title={`${own ? t('market.renew') : t('market.makeOffer')}: ${fullName(p)}`}
      onClose={onClose}
    >
      <div className="space-y-4 text-sm">
        {fee > 0 && (
          <p className="font-semibold">{t('market.fee', { amount: formatMoney(fee) })}</p>
        )}
        <p className="text-sand-700">{t('market.asking', { amount: formatMoney(hint) })}</p>
        <div>
          <label className="label" htmlFor="offer-salary">
            {t('market.offerSalary')}
          </label>
          <div className="flex items-center gap-3">
            <input
              id="offer-salary"
              type="range"
              min={50}
              max={Math.max(3000, hint * 2)}
              step={10}
              value={salary}
              onChange={(e) => setSalary(Number(e.target.value))}
              className="flex-1"
            />
            <input
              type="number"
              className="input w-28"
              min={0}
              step={10}
              value={salary}
              aria-label={t('market.offerSalary')}
              onChange={(e) => setSalary(Math.max(0, Number(e.target.value)))}
            />
          </div>
        </div>
        <div>
          <span className="label" id="offer-years">
            {t('market.offerYears')}
          </span>
          <div className="flex gap-2" role="radiogroup" aria-labelledby="offer-years">
            {Array.from({ length: MAX_CONTRACT_YEARS }, (_, i) => i + 1).map((y) => (
              <button
                key={y}
                role="radio"
                aria-checked={years === y}
                className={`btn ${years === y ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setYears(y)}
              >
                {y}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-sand-700">
          {t('market.refusals', { n: g.players[playerId].refusals, max: MAX_REFUSALS })}
        </p>
        {result && (
          <p
            role="status"
            className={`rounded-md px-3 py-2 font-semibold ${result.accepted ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-900'}`}
          >
            {t(`market.result.${result.reason}`, {
              counter: result.counter ? formatMoney(result.counter) : '',
            })}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <button className="btn btn-secondary" onClick={onClose}>
            {t('common.close')}
          </button>
          {!result?.accepted && (
            <button className="btn btn-primary" onClick={submit}>
              {own ? t('market.renew') : t('market.makeOffer')}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
