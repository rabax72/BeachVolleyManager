import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, LogOut, Save, Trash2, Upload } from 'lucide-react';
import { useGame, useGameState } from '../../store/gameStore';
import {
  deleteSave,
  exportJson,
  importJson,
  storageUsageKb,
  type SaveMeta,
} from '../../store/persistence';
import { formatDate, LANGUAGES, t } from '../../i18n';
import { Badge, Card, ConfirmModal, PageHeader, Select } from '../../ui/components';

const SPEED_OPTIONS = [
  { value: '1600', key: 'slow' },
  { value: '900', key: 'normal' },
  { value: '350', key: 'fast' },
  { value: '60', key: 'instant' },
];

export function SettingsPage() {
  const g = useGameState();
  const navigate = useNavigate();
  const { saves, slotId, slotName, settings } = useGame();
  const { saveGame, loadGame, loadState, updateSettings, showToast, quit, refreshSaves } =
    useGame.getState();
  const [name, setName] = useState(slotName ?? g.clubs[g.manager.clubId].name);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<SaveMeta | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const doExport = () => {
    const blob = new Blob([exportJson(g)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(slotName ?? 'beach-volley-manager').replace(/[^\w-]+/g, '_')}-s${g.season}w${g.week}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const doImport = async (file: File) => {
    try {
      loadState(importJson(await file.text()), file.name.replace(/\.json$/i, ''));
      showToast(t('settings.importOk'));
      setError(null);
    } catch (e) {
      setError(t('settings.importError', { error: (e as Error).message }));
    }
  };

  const trySave = (asNew: boolean) => {
    try {
      saveGame(name.trim() || undefined, asNew);
      showToast(t('settings.saved'));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div>
      <PageHeader title={t('settings.title')} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={t('settings.saves')} className="lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-end gap-2">
            <div>
              <label className="label" htmlFor="slot-name">
                {t('settings.slotName')}
              </label>
              <input
                id="slot-name"
                className="input w-64"
                value={name}
                maxLength={50}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" onClick={() => trySave(false)}>
              <Save size={16} aria-hidden /> {t('settings.saveNow')}
            </button>
            <button className="btn btn-secondary" onClick={() => trySave(true)}>
              {t('settings.saveAs')}
            </button>
            <button className="btn btn-secondary" onClick={doExport}>
              <Download size={16} aria-hidden /> {t('settings.export')}
            </button>
            <button className="btn btn-secondary" onClick={() => fileRef.current?.click()}>
              <Upload size={16} aria-hidden /> {t('settings.import')}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              aria-label={t('settings.import')}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void doImport(f);
                e.target.value = '';
              }}
            />
          </div>
          {error && (
            <p role="alert" className="mb-3 rounded-md bg-red-100 px-3 py-2 text-sm text-red-900">
              {error}
            </p>
          )}
          <ul className="divide-y divide-sand-100">
            {saves.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <span className="font-semibold">{s.name}</span>{' '}
                  {s.id === slotId && <Badge tone="sea">{t('settings.current')}</Badge>}
                  <div className="text-xs text-sand-700">
                    {s.clubName} · {t('common.seasonYear', { year: s.year })} ·{' '}
                    {t('common.weekShort', { week: s.week })} · {formatDate(s.updatedAt)}
                  </div>
                </div>
                <button
                  className="btn btn-secondary"
                  disabled={s.id === slotId}
                  onClick={() => {
                    loadGame(s.id);
                    navigate('/gioco');
                  }}
                >
                  {t('settings.load')}
                </button>
                <button
                  className="btn btn-secondary"
                  disabled={s.id === slotId}
                  onClick={() => setToDelete(s)}
                  aria-label={`${t('home.delete')} ${s.name}`}
                >
                  <Trash2 size={16} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-sand-700">
            {t('settings.storageUsage', { kb: storageUsageKb() })}
          </p>
        </Card>
        <Card title={t('settings.title')}>
          <div className="space-y-3">
            <Select
              label={t('settings.language')}
              value={settings.language}
              options={LANGUAGES.map((l) => ({ value: l.code, label: l.label }))}
              onChange={(language) => updateSettings({ language })}
            />
            <Select
              label={t('settings.matchSpeed')}
              value={String(settings.matchSpeed)}
              options={SPEED_OPTIONS.map((o) => ({
                value: o.value,
                label: t(`match.speeds.${o.key}`),
              }))}
              onChange={(v) => updateSettings({ matchSpeed: Number(v) })}
            />
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={settings.autosave}
                onChange={(e) => updateSettings({ autosave: e.target.checked })}
              />
              {t('settings.autosave')}
            </label>
            <button
              className="btn btn-secondary"
              onClick={() => {
                quit();
                navigate('/');
              }}
            >
              <LogOut size={16} aria-hidden /> {t('settings.quit')}
            </button>
          </div>
        </Card>
        <Card title={t('settings.about')}>
          <p className="text-sm">{t('settings.aboutText')}</p>
          <p className="mt-2 text-xs text-sand-700">{t('settings.seed', { seed: g.seed })}</p>
          <p className="text-xs text-sand-700">{t('settings.version', { v: g.saveVersion })}</p>
        </Card>
      </div>
      <ConfirmModal
        open={!!toDelete}
        title={t('home.delete')}
        message={t('home.deleteConfirm', { name: toDelete?.name ?? '' })}
        danger
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) deleteSave(toDelete.id);
          refreshSaves();
        }}
      />
    </div>
  );
}
