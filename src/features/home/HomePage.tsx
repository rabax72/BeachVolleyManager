import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, GraduationCap, Play, Plus, Trash2, Upload } from 'lucide-react';
import { useGame } from '../../store/gameStore';
import { deleteSave, importJson, type SaveMeta } from '../../store/persistence';
import { formatDate, t } from '../../i18n';
import { LogoFull } from '../../ui/Logo';
import { ConfirmModal } from '../../ui/components';

export function HomePage() {
  const navigate = useNavigate();
  const game = useGame((s) => s.game);
  const saves = useGame((s) => s.saves);
  const loadGame = useGame((s) => s.loadGame);
  const loadState = useGame((s) => s.loadState);
  const refreshSaves = useGame((s) => s.refreshSaves);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<SaveMeta | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const open = (id: string) => {
    try {
      loadGame(id);
      navigate('/gioco');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const onImport = async (file: File) => {
    try {
      const state = importJson(await file.text());
      loadState(state, file.name.replace(/\.json$/i, ''));
      navigate('/gioco');
    } catch (e) {
      setError(t('settings.importError', { error: (e as Error).message }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sea-200 via-sea-50 to-sand-200">
      <main className="mx-auto flex max-w-3xl flex-col items-center px-4 py-8">
        {/* Il logo contiene già il nome del gioco: il titolo resta per i lettori di schermo. */}
        <h1 className="sr-only">{t('app.title')}</h1>
        <LogoFull size={340} alt={t('app.title')} />
        <p className="mt-2 text-center text-lg font-semibold text-sea-900">{t('app.subtitle')}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {game && (
            <button
              className="btn btn-primary px-5 py-2.5 text-base"
              onClick={() => navigate('/gioco')}
            >
              <Play size={18} aria-hidden /> {t('home.continue')}
            </button>
          )}
          <button
            className="btn btn-primary px-5 py-2.5 text-base"
            onClick={() => navigate('/nuova')}
          >
            <Plus size={18} aria-hidden /> {t('home.newCareer')}
          </button>
          <button
            className="btn btn-secondary px-5 py-2.5 text-base"
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={18} aria-hidden /> {t('home.import')}
          </button>
          <button
            className="btn btn-secondary px-5 py-2.5 text-base"
            onClick={() => navigate('/tutorial')}
          >
            <GraduationCap size={18} aria-hidden /> {t('home.tutorial')}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            aria-label={t('home.import')}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onImport(f);
              e.target.value = '';
            }}
          />
        </div>
        {error && (
          <p role="alert" className="mt-4 rounded-md bg-red-100 px-3 py-2 text-sm text-red-900">
            {error}
          </p>
        )}
        <section className="card mt-10 w-full">
          <h2 className="card-title">
            <FolderOpen size={18} aria-hidden /> {t('home.load')}
          </h2>
          {saves.length === 0 ? (
            <p className="text-sm text-sand-700">{t('home.noSaves')}</p>
          ) : (
            <ul className="divide-y divide-sand-100">
              {saves.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sea-900">{s.name}</div>
                    <div className="text-xs text-sand-700">
                      {s.managerName} · {s.clubName} · {t('common.seasonYear', { year: s.year })} ·{' '}
                      {t('common.weekShort', { week: s.week })} ·{' '}
                      {t('home.lastPlayed', { date: formatDate(s.updatedAt) })}
                    </div>
                  </div>
                  <button className="btn btn-primary" onClick={() => open(s.id)}>
                    {t('settings.load')}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setToDelete(s)}
                    aria-label={`${t('home.delete')} ${s.name}`}
                  >
                    <Trash2 size={16} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
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
