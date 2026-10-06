/** Store globale (Zustand): stato di gioco, partita in diretta, impostazioni. */
import { create } from 'zustand';
import {
  aiDecisions,
  callTimeout,
  createMatch,
  finishMatch,
  playRally,
  setTactics,
  toResult,
  type MatchState,
  type TeamIndex,
} from '../engine/match';
import { newGame, type NewGameOptions } from '../engine/newGame';
import {
  advanceTournamentMut,
  advanceWeek,
  applyMatchResultMut,
  produce,
  tournamentMatchSetup,
  userSide,
} from '../engine/season';
import { allMatches } from '../engine/tournament';
import type { GameState, Tactics } from '../engine/types';
import { setLanguage } from '../i18n';
import { listSaves, newSlotId, readSave, writeSave, type SaveMeta } from './persistence';

export interface LiveMatch {
  defId: string;
  matchId: string;
  side: TeamIndex;
  state: MatchState;
}

export interface Settings {
  language: string;
  /** Millisecondi tra un punto e l'altro nella partita commentata. */
  matchSpeed: number;
  /** Rappresentazione grafica del campo nella partita in diretta. */
  showCourt: boolean;
  autosave: boolean;
}

const SETTINGS_KEY = 'bvm:settings';
const DEFAULT_SETTINGS: Settings = {
  language: 'it',
  matchSpeed: 900,
  showCourt: true,
  autosave: true,
};

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw
      ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) }
      : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

interface GameStore {
  game: GameState | null;
  slotId: string | null;
  slotName: string | null;
  live: LiveMatch | null;
  settings: Settings;
  saves: SaveMeta[];
  /** Messaggio temporaneo (toast). */
  toast: string | null;

  startNewGame(opts: NewGameOptions): void;
  loadGame(slotId: string): void;
  loadState(state: GameState, name: string): void;
  saveGame(name?: string, asNew?: boolean): void;
  refreshSaves(): void;
  quit(): void;
  /** Applica una trasformazione pura allo stato di gioco. */
  update(fn: (g: GameState) => GameState): void;
  advanceWeek(): void;
  updateSettings(patch: Partial<Settings>): void;
  showToast(msg: string | null): void;

  startLive(defId: string, matchId: string): void;
  liveStep(): void;
  liveTimeout(): void;
  liveTactics(t: Tactics): void;
  liveFinish(): void;
  /** Registra il risultato della partita in diretta nel torneo e chiude la vista live. */
  liveCommit(): void;
}

export const useGame = create<GameStore>((set, get) => {
  const initial = loadSettings();
  setLanguage(initial.language);

  const autosave = (): void => {
    const { game, slotId, slotName, settings } = get();
    if (!game || !settings.autosave) return;
    try {
      const id = slotId ?? newSlotId();
      const name = slotName ?? `${game.clubs[game.manager.clubId].name}`;
      writeSave(id, name, game);
      set({ slotId: id, slotName: name, saves: listSaves() });
    } catch {
      set({ toast: 'Salvataggio automatico non riuscito' });
    }
  };

  return {
    game: null,
    slotId: null,
    slotName: null,
    live: null,
    settings: initial,
    saves: listSaves(),
    toast: null,

    startNewGame(opts) {
      const game = newGame(opts);
      set({ game, slotId: null, slotName: null, live: null });
      autosave();
    },
    loadGame(slotId) {
      const game = readSave(slotId);
      const meta = listSaves().find((m) => m.id === slotId);
      set({ game, slotId, slotName: meta?.name ?? slotId, live: null });
    },
    loadState(state, name) {
      set({ game: state, slotId: null, slotName: name, live: null });
      autosave();
    },
    saveGame(name, asNew = false) {
      const { game, slotId, slotName } = get();
      if (!game) return;
      const id = asNew || !slotId ? newSlotId() : slotId;
      const finalName = name ?? slotName ?? game.clubs[game.manager.clubId].name;
      writeSave(id, finalName, game);
      set({ slotId: id, slotName: finalName, saves: listSaves() });
    },
    refreshSaves() {
      set({ saves: listSaves() });
    },
    quit() {
      set({ game: null, slotId: null, slotName: null, live: null });
    },
    update(fn) {
      const { game } = get();
      if (!game) return;
      set({ game: fn(game) });
    },
    advanceWeek() {
      const { game, live } = get();
      if (!game || live) return;
      set({ game: advanceWeek(game) });
      autosave();
    },
    updateSettings(patch) {
      const settings = { ...get().settings, ...patch };
      setLanguage(settings.language);
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      } catch {
        // impostazioni non persistenti: si prosegue comunque
      }
      set({ settings });
    },
    showToast(msg) {
      set({ toast: msg });
    },

    startLive(defId, matchId) {
      const { game, live } = get();
      if (!game || live) return;
      const t = game.tournaments[defId];
      const m = t && allMatches(t).find((x) => x.id === matchId);
      if (!m || m.winner !== null) return;
      const side = userSide(game, m.pairIds);
      if (side === null) return;
      const setup = tournamentMatchSetup(game, defId, matchId);
      set({ live: { defId, matchId, side, state: createMatch(setup) } });
    },
    liveStep() {
      const { live } = get();
      if (!live || live.state.finished) return;
      const opp: TeamIndex = live.side === 0 ? 1 : 0;
      const next = playRally(aiDecisions(live.state, opp));
      set({ live: { ...live, state: next } });
    },
    liveTimeout() {
      const { live } = get();
      if (!live) return;
      set({ live: { ...live, state: callTimeout(live.state, live.side) } });
    },
    liveTactics(tactics) {
      const { live } = get();
      if (!live) return;
      set({ live: { ...live, state: setTactics(live.state, live.side, tactics) } });
    },
    liveFinish() {
      const { live } = get();
      if (!live) return;
      const ai: [boolean, boolean] = live.side === 0 ? [false, true] : [true, false];
      set({ live: { ...live, state: finishMatch(live.state, ai) } });
    },
    liveCommit() {
      const { live, game } = get();
      if (!live || !game || !live.state.finished) return;
      const result = toResult(live.state);
      const next = produce(game, (s) => {
        applyMatchResultMut(s, live.defId, live.matchId, result);
        advanceTournamentMut(s, live.defId);
      });
      set({ game: next, live: null });
      autosave();
    },
  };
});

/** Stato di gioco garantito (le pagine sotto /gioco sono protette da RequireGame). */
export function useGameState(): GameState {
  const g = useGame((s) => s.game);
  if (!g) throw new Error('Nessuna partita caricata');
  return g;
}
