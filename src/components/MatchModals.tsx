import React from 'react';
import {
  Coins,
  Film,
  Home,
  Play,
  RotateCcw,
  Trophy,
  Wrench,
} from 'lucide-react';
import { SHIPS } from '../game/catalog';
import { MatchResultSummary } from '../game/types';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
  canRestart: boolean;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onMainMenu,
  canRestart,
}) => {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-[#070916]/80">
      <div className="w-full max-w-sm rounded-2xl bg-[#12162e] border border-indigo-400/30 p-6 shadow-2xl space-y-5">
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold text-white">
            Match Paused
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Press ESC or Resume to return to combat
          </p>
        </div>

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={onResume}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-display font-bold text-sm cursor-pointer"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>Resume Battle</span>
          </button>

          {canRestart && (
            <button
              type="button"
              onClick={onRestart}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1a2042] hover:bg-[#232b56] text-white font-semibold text-sm cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-amber-300" />
              <span>Restart Match</span>
            </button>
          )}

          <button
            type="button"
            onClick={onMainMenu}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#0c0f22] border border-indigo-400/20 hover:border-rose-400/40 text-slate-200 font-semibold text-sm cursor-pointer"
          >
            <Home className="w-4 h-4 text-rose-300" />
            <span>Main Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface GameOverModalProps {
  summary: MatchResultSummary;
  newAchievements: string[];
  hasReplay: boolean;
  onPlayAgain: () => void;
  onWatchReplay: () => void;
  onOpenUpgrades: () => void;
  onMainMenu: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  summary,
  newAchievements,
  hasReplay,
  onPlayAgain,
  onWatchReplay,
  onOpenUpgrades,
  onMainMenu,
}) => {
  const headline =
    summary.winnerTeam === 'DRAW'
      ? 'DRAW MATCH'
      : summary.victoryForLocal
        ? 'VICTORY!'
        : 'DEFEAT';

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-[#070916]/85">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-[#12162e] border border-indigo-400/30 shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-indigo-400/15 text-center bg-[#0f1328]">
          <div
            className={`font-display text-3xl font-bold tracking-wider ${
              summary.winnerTeam === 'DRAW'
                ? 'text-amber-300'
                : summary.victoryForLocal
                  ? 'text-sky-300'
                  : 'text-rose-400'
            }`}
          >
            {headline}
          </div>
          <div className="text-xs text-slate-300 mt-1">
            {summary.mode === 'survival'
              ? `Survived to Wave ${summary.waveReached || 1}`
              : summary.winnerTeam === 'DRAW'
                ? 'Scores tied at time expiration'
                : `Team ${summary.winnerTeam} wins the sector`}
            {' · '}
            {SHIPS[summary.shipUsed].name}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto cosmo-scroll p-6 space-y-5">
          {/* Team Scores & Rewards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-[#0c0f22] border border-sky-400/25">
              <div className="text-[11px] text-sky-300">Team A Score</div>
              <div className="font-mono-num text-xl font-bold text-white mt-0.5">
                {summary.teamAScore.toLocaleString()}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#0c0f22] border border-pink-400/25">
              <div className="text-[11px] text-pink-300">Team B Score</div>
              <div className="font-mono-num text-xl font-bold text-white mt-0.5">
                {summary.teamBScore.toLocaleString()}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#0c0f22] border border-amber-400/25">
              <div className="text-[11px] text-amber-300 flex items-center gap-1">
                <Coins className="w-3.5 h-3.5" />
                <span>Coins Earned</span>
              </div>
              <div className="font-mono-num text-xl font-bold text-amber-300 mt-0.5">
                +{summary.coinsEarned}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#0c0f22] border border-violet-400/25">
              <div className="text-[11px] text-violet-300">Max Combo</div>
              <div className="font-mono-num text-xl font-bold text-white mt-0.5">
                {summary.localPlayerMaxCombo} hits
              </div>
            </div>
          </div>

          {newAchievements.length > 0 && (
            <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-400/35 flex items-center gap-3 text-xs text-emerald-200">
              <Trophy className="w-4 h-4 text-amber-300 shrink-0" />
              <span>
                Unlocked Achievements: {newAchievements.join(', ')}
              </span>
            </div>
          )}

          {/* Match Scoreboard Table */}
          <div className="overflow-x-auto rounded-xl border border-indigo-400/15 bg-[#0c0f22]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-indigo-400/15 text-slate-400">
                  <th className="py-2.5 px-3">Pilot</th>
                  <th className="py-2.5 px-3">Team</th>
                  <th className="py-2.5 px-3">Craft</th>
                  <th className="py-2.5 px-3 text-right">KO / D</th>
                  <th className="py-2.5 px-3 text-right">Accuracy</th>
                  <th className="py-2.5 px-3 text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-400/10">
                {[...summary.ships]
                  .sort((a, b) => b.score - a.score)
                  .map((s) => {
                    const acc =
                      s.shotsFired > 0
                        ? Math.round((s.hitsLanded / s.shotsFired) * 100)
                        : 0;
                    return (
                      <tr key={s.id}>
                        <td className="py-2.5 px-3 font-semibold text-white">
                          {s.name}{' '}
                          {!s.isHuman && (
                            <span className="text-[10px] text-slate-400">
                              {s.isBoss ? 'BOSS' : 'BOT'}
                            </span>
                          )}
                        </td>
                        <td
                          className={`py-2.5 px-3 font-semibold ${
                            s.team === 'A' ? 'text-sky-300' : 'text-pink-300'
                          }`}
                        >
                          Team {s.team}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">
                          {SHIPS[s.shipId].name}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono-num text-slate-300">
                          {s.kills} / {s.deaths}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono-num text-slate-300">
                          {acc}%
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono-num font-bold text-white">
                          {s.score.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-indigo-400/15 bg-[#0f1328] flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onMainMenu}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#1a2042] hover:bg-[#232b56] text-slate-200 text-xs font-semibold cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>Main Menu</span>
            </button>
            <button
              type="button"
              onClick={onOpenUpgrades}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#1a2042] hover:bg-[#232b56] text-amber-300 text-xs font-semibold cursor-pointer"
            >
              <Wrench className="w-4 h-4" />
              <span>Upgrades</span>
            </button>
            {hasReplay && (
              <button
                type="button"
                onClick={onWatchReplay}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#1a2042] hover:bg-[#232b56] text-sky-300 text-xs font-semibold cursor-pointer"
              >
                <Film className="w-4 h-4" />
                <span>Watch Replay</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onPlayAgain}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-display font-bold text-sm cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Play Again</span>
          </button>
        </div>
      </div>
    </div>
  );
};
