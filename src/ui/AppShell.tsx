/** Struttura dell'app di gioco: barra laterale di navigazione e barra superiore. */
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  BarChart3,
  CalendarDays,
  Dumbbell,
  FastForward,
  History,
  LayoutDashboard,
  Menu,
  Radio,
  Search,
  Settings,
  Users,
  UsersRound,
  Wallet,
  X,
  ClipboardList,
  GraduationCap,
} from 'lucide-react';
import { useGame } from '../store/gameStore';
import { formatMoney, t } from '../i18n';
import { SEASON_WEEKS } from '../data/world';
import { seasonYear } from '../engine/season';
import { Logo } from './Logo';
import { ErrorBoundary } from './ErrorBoundary';

const NAV = [
  { to: '/gioco', key: 'dashboard', icon: LayoutDashboard, end: true },
  { to: '/gioco/rosa', key: 'squad', icon: Users },
  { to: '/gioco/coppie', key: 'pairs', icon: UsersRound },
  { to: '/gioco/allenamento', key: 'training', icon: Dumbbell },
  { to: '/gioco/staff', key: 'staff', icon: ClipboardList },
  { to: '/gioco/calendario', key: 'calendar', icon: CalendarDays },
  { to: '/gioco/partita', key: 'match', icon: Radio },
  { to: '/gioco/mercato', key: 'market', icon: Search },
  { to: '/gioco/finanze', key: 'finance', icon: Wallet },
  { to: '/gioco/ranking', key: 'ranking', icon: BarChart3 },
  { to: '/gioco/storico', key: 'history', icon: History },
  { to: '/gioco/tutorial', key: 'tutorial', icon: GraduationCap },
  { to: '/gioco/impostazioni', key: 'settings', icon: Settings },
] as const;

function Toast() {
  const toast = useGame((s) => s.toast);
  const showToast = useGame((s) => s.showToast);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => showToast(null), 3500);
    return () => clearTimeout(id);
  }, [toast, showToast]);
  if (!toast) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed right-4 bottom-4 z-50 max-w-sm rounded-md bg-sea-900 px-4 py-3 text-sm text-white shadow-lg"
    >
      {toast}
    </div>
  );
}

export function AppShell() {
  const game = useGame((s) => s.game);
  const live = useGame((s) => s.live);
  const advance = useGame((s) => s.advanceWeek);
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);
  if (!game) return null;
  const club = game.clubs[game.manager.clubId];
  const balance = game.finance.balance;

  const nav = (
    <nav aria-label={t('nav.mainNav')} className="flex flex-col gap-0.5 p-2">
      {NAV.map(({ to, key, icon: Icon, ...rest }) => (
        <NavLink
          key={to}
          to={to}
          end={'end' in rest}
          className={({ isActive }) =>
            `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-semibold ${
              isActive ? 'bg-sea-700 text-white' : 'text-sea-50 hover:bg-sea-800'
            }`
          }
        >
          <Icon size={18} aria-hidden />
          <span>{t(`nav.${key}`)}</span>
          {key === 'match' && live && (
            <span
              className="ml-auto h-2.5 w-2.5 rounded-full bg-coral-500"
              aria-label={t('match.title')}
            />
          )}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 bg-sea-900 lg:block">
        <div className="flex items-center gap-2 px-4 py-4">
          <Logo size={32} />
          <span className="text-sm leading-tight font-extrabold text-white">{t('app.title')}</span>
        </div>
        {nav}
      </aside>
      {open && (
        <div className="fixed inset-0 z-40 bg-sea-900/50 lg:hidden" onClick={() => setOpen(false)}>
          <aside
            className="h-full w-64 overflow-y-auto bg-sea-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-4">
              <span className="font-extrabold text-white">{t('app.title')}</span>
              <button
                className="btn text-white"
                onClick={() => setOpen(false)}
                aria-label={t('nav.closeMenu')}
              >
                <X size={20} aria-hidden />
              </button>
            </div>
            {nav}
          </aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-sand-200 bg-white/95 px-4 py-2 backdrop-blur">
          <button
            className="btn btn-secondary lg:hidden"
            onClick={() => setOpen(true)}
            aria-label={t('nav.menu')}
            aria-expanded={open}
          >
            <Menu size={18} aria-hidden />
          </button>
          <div className="min-w-0">
            <div className="font-extrabold text-sea-900">{club.name}</div>
            <div className="text-xs text-sand-700">
              {game.manager.name} · {t('common.seasonYear', { year: seasonYear(game) })} ·{' '}
              {t('dashboard.week', { week: game.week, total: SEASON_WEEKS })}
            </div>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-sand-700">{t('finance.balance')}</div>
              <div
                className={`font-bold tabular-nums ${balance < 0 ? 'text-coral-600' : 'text-palm-700'}`}
              >
                {formatMoney(balance)}
              </div>
            </div>
            <button
              className="btn btn-primary"
              onClick={advance}
              disabled={!!live || game.gameOver}
              title={live ? t('tournament.liveBlocked') : t('dashboard.advanceHint')}
            >
              <FastForward size={16} aria-hidden />
              {t('dashboard.advance')}
            </button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1600px] flex-1 p-4">
          <ErrorBoundary resetKey={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
      <Toast />
    </div>
  );
}
