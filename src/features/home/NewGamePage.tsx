import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useGame } from '../../store/gameStore';
import { hashSeed, randomSeed } from '../../engine/rng';
import type { CircuitChoice, Difficulty } from '../../engine/types';
import { t } from '../../i18n';
import { Logo } from '../../ui/Logo';

export function NewGamePage() {
  const navigate = useNavigate();
  const startNewGame = useGame((s) => s.startNewGame);
  const [managerName, setManagerName] = useState(t('newGame.defaultManager'));
  const [clubName, setClubName] = useState(t('newGame.defaultClub'));
  const [circuit, setCircuit] = useState<CircuitChoice>('M');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [seed, setSeed] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = seed.trim();
    const numeric =
      trimmed === ''
        ? randomSeed()
        : /^-?\d+$/.test(trimmed)
          ? Number(trimmed) | 0
          : hashSeed(trimmed);
    startNewGame({ managerName, clubName, circuit, difficulty, seed: numeric });
    navigate('/gioco');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sea-100 to-sand-100">
      <main className="mx-auto max-w-xl px-4 py-10">
        <button className="btn btn-ghost mb-4" onClick={() => navigate('/')}>
          <ArrowLeft size={16} aria-hidden /> {t('common.back')}
        </button>
        <div className="mb-6 flex items-center gap-3">
          <Logo size={48} />
          <h1 className="text-3xl font-extrabold text-sea-900">{t('newGame.title')}</h1>
        </div>
        <form className="card space-y-5" onSubmit={submit}>
          <div>
            <label className="label" htmlFor="ng-manager">
              {t('newGame.managerName')}
            </label>
            <input
              id="ng-manager"
              className="input w-full"
              value={managerName}
              maxLength={40}
              required
              onChange={(e) => setManagerName(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="ng-club">
              {t('newGame.clubName')}
            </label>
            <input
              id="ng-club"
              className="input w-full"
              value={clubName}
              maxLength={40}
              required
              onChange={(e) => setClubName(e.target.value)}
            />
          </div>
          <fieldset>
            <legend className="label">{t('newGame.circuit')}</legend>
            <div className="flex flex-wrap gap-2">
              {(['M', 'F', 'mixed'] as CircuitChoice[]).map((c) => (
                <label
                  key={c}
                  className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold ${circuit === c ? 'border-sea-600 bg-sea-50' : 'border-sand-300 bg-white'}`}
                >
                  <input
                    type="radio"
                    name="circuit"
                    value={c}
                    checked={circuit === c}
                    onChange={() => setCircuit(c)}
                  />
                  {t(`circuit.${c}`)}
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-sand-700">{t('newGame.circuitHelp')}</p>
          </fieldset>
          <fieldset>
            <legend className="label">{t('newGame.difficulty')}</legend>
            <div className="flex flex-wrap gap-2">
              {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => (
                <label
                  key={d}
                  className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold ${difficulty === d ? 'border-sea-600 bg-sea-50' : 'border-sand-300 bg-white'}`}
                >
                  <input
                    type="radio"
                    name="difficulty"
                    value={d}
                    checked={difficulty === d}
                    onChange={() => setDifficulty(d)}
                  />
                  {t(`difficulty.${d}`)}
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-sand-700">
              {t(`newGame.difficultyHelp.${difficulty}`)}
            </p>
          </fieldset>
          <div>
            <label className="label" htmlFor="ng-seed">
              {t('newGame.seed')}
            </label>
            <input
              id="ng-seed"
              className="input w-full"
              value={seed}
              maxLength={30}
              onChange={(e) => setSeed(e.target.value)}
              aria-describedby="ng-seed-help"
            />
            <p id="ng-seed-help" className="mt-1 text-xs text-sand-700">
              {t('newGame.seedHelp')}
            </p>
          </div>
          <button type="submit" className="btn btn-primary w-full py-2.5 text-base">
            {t('newGame.start')}
          </button>
        </form>
      </main>
    </div>
  );
}
