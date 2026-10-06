/**
 * Lezioni del tutorial. I testi sono nel dizionario (tutorial.items.<id>); le schermate
 * in public/tutorial/ sono generate da `npm run manual` (scripts/manual/build-manual.ts).
 */
import type { LucideIcon } from 'lucide-react';
import {
  CalendarDays,
  Dumbbell,
  Flag,
  History,
  Radio,
  Search,
  Sparkles,
  Trophy,
  Users,
  UsersRound,
  Wallet,
} from 'lucide-react';

export interface Lesson {
  id: string;
  icon: LucideIcon;
  /** Schermata in public/tutorial/ */
  image: string;
  /** Pagina del gioco da aprire con «Prova ora» (relativa a /gioco). */
  route: string;
}

export const LESSONS: Lesson[] = [
  { id: 'goal', icon: Flag, image: 'dashboard.jpg', route: '' },
  { id: 'time', icon: CalendarDays, image: 'calendar.jpg', route: 'calendario' },
  { id: 'players', icon: Users, image: 'player.jpg', route: 'rosa' },
  { id: 'pairs', icon: UsersRound, image: 'pairs.jpg', route: 'coppie' },
  { id: 'tournaments', icon: Trophy, image: 'tournament.jpg', route: 'calendario' },
  { id: 'match', icon: Radio, image: 'match.jpg', route: 'partita' },
  { id: 'training', icon: Dumbbell, image: 'training.jpg', route: 'allenamento' },
  { id: 'finance', icon: Wallet, image: 'finance.jpg', route: 'finanze' },
  { id: 'market', icon: Search, image: 'market.jpg', route: 'mercato' },
  { id: 'seasons', icon: History, image: 'history.jpg', route: 'storico' },
  { id: 'firstSeason', icon: Sparkles, image: 'ranking.jpg', route: 'ranking' },
];

const READ_KEY = 'bvm:tutorial-read';
const BANNER_KEY = 'bvm:tutorial-banner-dismissed';

/** Lezioni lette (per browser): comodità locale, non fa parte del salvataggio. */
export function loadRead(): string[] {
  try {
    const raw = localStorage.getItem(READ_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function saveRead(ids: string[]): void {
  try {
    localStorage.setItem(READ_KEY, JSON.stringify(ids));
  } catch {
    // localStorage non disponibile: il progresso non viene ricordato
  }
}

export function isBannerDismissed(): boolean {
  try {
    return localStorage.getItem(BANNER_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissBanner(): void {
  try {
    localStorage.setItem(BANNER_KEY, '1');
  } catch {
    // ignorato
  }
}
