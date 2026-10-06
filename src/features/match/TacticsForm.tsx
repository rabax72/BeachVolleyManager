import type { Tactics } from '../../engine/types';
import { t } from '../../i18n';
import { Select } from '../../ui/components';

const FIELDS: { key: keyof Tactics; options: string[] }[] = [
  { key: 'serveRisk', options: ['safe', 'normal', 'aggressive'] },
  { key: 'serveTarget', options: ['balanced', 'weaker', 'blocker', 'defender'] },
  { key: 'blockStyle', options: ['zone', 'read'] },
  { key: 'attackRisk', options: ['low', 'medium', 'high'] },
  { key: 'energy', options: ['conserve', 'normal', 'push'] },
];

export function TacticsForm({
  value,
  onChange,
  compact = false,
}: {
  value: Tactics;
  onChange: (t: Tactics) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`grid gap-3 ${compact ? 'grid-cols-1 sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'}`}
    >
      {FIELDS.map((f) => (
        <div key={f.key}>
          <Select
            label={t(`tactics.${f.key}`)}
            value={value[f.key]}
            options={f.options.map((o) => ({
              value: o,
              label: t(`tactics.options.${f.key}.${o}`),
            }))}
            onChange={(v) => onChange({ ...value, [f.key]: v } as Tactics)}
          />
          {!compact && <p className="mt-1 text-xs text-sand-700">{t(`tactics.help.${f.key}`)}</p>}
        </div>
      ))}
    </div>
  );
}
