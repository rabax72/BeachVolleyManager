import type { ReactNode } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useGame } from './store/gameStore';
import { AppShell } from './ui/AppShell';
import { HomePage } from './features/home/HomePage';
import { NewGamePage } from './features/home/NewGamePage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { SquadPage } from './features/squad/SquadPage';
import { PlayerPage } from './features/squad/PlayerPage';
import { PairsPage } from './features/pairs/PairsPage';
import { TrainingPage } from './features/training/TrainingPage';
import { StaffPage } from './features/staff/StaffPage';
import { CalendarPage } from './features/calendar/CalendarPage';
import { TournamentPage } from './features/calendar/TournamentPage';
import { MatchPage } from './features/match/MatchPage';
import { MarketPage } from './features/market/MarketPage';
import { FinancePage } from './features/finance/FinancePage';
import { RankingPage } from './features/ranking/RankingPage';
import { HistoryPage } from './features/ranking/HistoryPage';
import { SettingsPage } from './features/settings/SettingsPage';

function RequireGame({ children }: { children: ReactNode }) {
  const game = useGame((s) => s.game);
  return game ? children : <Navigate to="/" replace />;
}

export function App() {
  // La lingua è globale: cambiando impostazione si rimonta l'albero con i nuovi testi.
  const language = useGame((s) => s.settings.language);
  return (
    <HashRouter key={language}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/nuova" element={<NewGamePage />} />
        <Route
          path="/gioco"
          element={
            <RequireGame>
              <AppShell />
            </RequireGame>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="rosa" element={<SquadPage />} />
          <Route path="giocatore/:id" element={<PlayerPage />} />
          <Route path="coppie" element={<PairsPage />} />
          <Route path="allenamento" element={<TrainingPage />} />
          <Route path="staff" element={<StaffPage />} />
          <Route path="calendario" element={<CalendarPage />} />
          <Route path="torneo/:id" element={<TournamentPage />} />
          <Route path="partita" element={<MatchPage />} />
          <Route path="mercato" element={<MarketPage />} />
          <Route path="finanze" element={<FinancePage />} />
          <Route path="ranking" element={<RankingPage />} />
          <Route path="storico" element={<HistoryPage />} />
          <Route path="impostazioni" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
