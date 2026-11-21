import React from 'react';
import {
  FastForward,
  Pause,
  Play,
  Rocket,
  Shield,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import { WEAPONS } from '../game/catalog';
import { ProjectedShipLabel } from '../game/spaceScene';
import {
  ComboBannerEvent,
  MatchSnapshot,
  ShipState,
  WeaponId,
} from '../game/types';

interface GameplayHudProps {
  snapshot: MatchSnapshot;
  projectedLabels: ProjectedShipLabel[];
  localShipId: string;
  p2ShipId?: string;
  comboBanner: ComboBannerEvent | null;
  muted: boolean;
  isReplayMode?: boolean;
  replayPaused?: boolean;
  replaySpeed?: 1 | 2;
  replayProgress?: number;
  onSelectWeapon: (w: WeaponId) => void;
  onPause: () => void;
  onToggleMute: () => void;
  onReplayTogglePause?: () => void;
  onReplayToggleSpeed?: () => void;
  onReplaySeek?: (frac: number) => void;
  onExitReplay?: () => void;
}

function formatTimer(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, '0')}`;
}

export const GameplayHud: React.FC<GameplayHudProps> = ({
  snapshot,
  projectedLabels,
  localShipId,
  p2ShipId,
  comboBanner,
  muted,
  isReplayMode,
  replayPaused,
  replaySpeed,
  replayProgress,
  onSelectWeapon,
  onPause,
  onToggleMute,
  onReplayTogglePause,
  onReplayToggleSpeed,
  onReplaySeek,
  onExitReplay,
}) => {
  const localShip: ShipState | undefined =
    snapshot.ships.find((s) => s.id === localShipId) || snapshot.ships[0];
  const p2Ship: ShipState | undefined = p2ShipId
    ? snapshot.ships.find((s) => s.id === p2ShipId)
    : undefined;

  const weaponSlots: Array<{ key: string; id: WeaponId }> = [
    { key: '1', id: 'basic' },
    { key: '2', id: 'rapid' },
    { key: '3', id: 'double' },
    { key: '4', id: 'spread' },
  ];

  const teamAPct =
    snapshot.teamAMaxHpTotal > 0
      ? Math.round((snapshot.teamAHpTotal / snapshot.teamAMaxHpTotal) * 100)
      : 0;
  const teamBPct =
    snapshot.teamBMaxHpTotal > 0
      ? Math.round((snapshot.teamBHpTotal / snapshot.teamBMaxHpTotal) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-10 pointer-events-none">
      {/* World-projected floating health bars & pilot identifiers */}
      {projectedLabels.map((lbl) => {
        if (!lbl.visible) return null;
        const hpPct = Math.max(0, Math.min(100, (lbl.hp / lbl.maxHp) * 100));
        const isTeamA = lbl.team === 'A';
        return (
          <div
            key={lbl.id}
            style={{
              transform: `translate(${Math.round(lbl.screenX)}px, ${Math.round(lbl.screenY)}px) translate(-50%, -100%)`,
            }}
            className="absolute top-0 left-0 flex flex-col items-center"
          >
            <div className="flex items-center gap-1 text-[10px] font-semibold tracking-tight text-white bg-[#0b0d1d]/85 px-1.5 py-0.5 rounded">
              <span
                className={
                  lbl.isBoss
                    ? 'text-amber-300 font-bold'
                    : isTeamA
                      ? 'text-sky-300'
                      : 'text-pink-300'
                }
              >
                {lbl.name}
              </span>
              {!lbl.isHuman && !lbl.isBoss && (
                <span className="text-[9px] text-slate-400">BOT</span>
              )}
              {lbl.isBoss && (
                <span className="text-[9px] text-rose-400 font-bold">BOSS</span>
              )}
            </div>
            <div
              className={`mt-0.5 h-1.5 rounded-full bg-slate-900/90 overflow-hidden border border-white/15 ${
                lbl.isBoss ? 'w-28' : 'w-14'
              }`}
            >
              <div
                className={`h-full ${
                  lbl.isBoss
                    ? 'bg-rose-400'
                    : isTeamA
                      ? 'bg-sky-400'
                      : 'bg-pink-400'
                }`}
                style={{ width: `${hpPct}%` }}
              />
            </div>
            {lbl.shield > 0 && (
              <div className="w-12 h-1 mt-0.5 rounded-full bg-blue-300/80" />
            )}
          </div>
        );
      })}

      {/* Top Perimeter HUD */}
      <div className="flex items-start justify-between gap-4 p-4">
        {/* Top-Left: Team A / Local Pilot Status */}
        {localShip && (
          <div className="px-4 py-2.5 rounded-xl bg-[#101326]/90 border border-sky-400/25 min-w-[210px]">
            <div className="flex items-center justify-between gap-3">
              <span className="font-display text-xs font-bold text-sky-300 truncate max-w-[120px]">
                {localShip.name}
              </span>
              <span className="font-mono-num text-xs font-bold text-white">
                {localShip.score.toLocaleString()} PTS
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-all"
                  style={{
                    width: `${Math.max(0, (localShip.hp / localShip.maxHp) * 100)}%`,
                  }}
                />
              </div>
              <span className="font-mono-num text-[11px] text-slate-200 w-12 text-right">
                {Math.ceil(localShip.hp)} HP
              </span>
            </div>
            {localShip.shield > 0 && (
              <div className="mt-1 flex items-center gap-1.5 text-[10px] font-mono-num text-blue-300">
                <Shield className="w-3 h-3" />
                <span>Shield {Math.ceil(localShip.shield)}</span>
              </div>
            )}
            <div className="mt-1.5 flex items-center gap-2.5 text-[11px] font-mono-num text-slate-400">
              <span>{localShip.kills} KO</span>
              <span aria-hidden="true">·</span>
              <span
                className={
                  localShip.multiplier > 1 ? 'text-amber-300 font-bold' : ''
                }
              >
                {localShip.multiplier}x ({localShip.combo} streak)
              </span>
            </div>
          </div>
        )}

        {/* Top-Center: Match Scoreboard & Timer */}
        <div className="px-5 py-2.5 rounded-xl bg-[#101326]/92 border border-indigo-400/25 flex items-center gap-5">
          <div className="text-right">
            <div className="text-[10px] font-semibold text-sky-300">
              {snapshot.mode === 'duo' ? 'PLAYER A' : 'TEAM A'}
            </div>
            <div className="font-mono-num text-lg font-bold text-white leading-tight">
              {snapshot.teamAScore.toLocaleString()}
            </div>
            <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden ml-auto mt-1">
              <div
                className="h-full bg-sky-400"
                style={{ width: `${teamAPct}%` }}
              />
            </div>
          </div>

          <div className="text-center px-3 border-x border-indigo-400/20">
            <div className="text-[10px] font-semibold text-slate-400">
              {snapshot.mode === 'survival'
                ? `WAVE ${snapshot.wave}`
                : 'TIME'}
            </div>
            <div className="font-mono-num text-xl font-bold text-amber-300 leading-tight">
              {snapshot.mode === 'survival'
                ? formatTimer(snapshot.elapsedTime)
                : formatTimer(snapshot.timeRemaining)}
            </div>
          </div>

          <div className="text-left">
            <div className="text-[10px] font-semibold text-pink-300">
              {snapshot.mode === 'survival'
                ? 'HOSTILES'
                : snapshot.mode === 'duo'
                  ? 'RIVAL B'
                  : 'TEAM B'}
            </div>
            <div className="font-mono-num text-lg font-bold text-white leading-tight">
              {snapshot.teamBScore.toLocaleString()}
            </div>
            <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-pink-400"
                style={{ width: `${teamBPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Top-Right: P2 status (if Local 2P) + Mute & Pause */}
        <div className="flex items-start gap-2.5 pointer-events-auto">
          {p2Ship && (
            <div className="px-3.5 py-2 rounded-xl bg-[#101326]/90 border border-pink-400/25 min-w-[165px] pointer-events-none">
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-xs font-bold text-pink-300">
                  {p2Ship.name}
                </span>
                <span className="font-mono-num text-xs font-bold text-white">
                  {p2Ship.score}
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-pink-400"
                  style={{
                    width: `${Math.max(0, (p2Ship.hp / p2Ship.maxHp) * 100)}%`,
                  }}
                />
              </div>
              <div className="mt-1 text-[10px] font-mono-num text-slate-400">
                {Math.ceil(p2Ship.hp)} HP · {p2Ship.missiles} MSL
              </div>
            </div>
          )}

          {!isReplayMode && (
            <>
              <button
                type="button"
                onClick={onToggleMute}
                aria-label={muted ? 'Unmute' : 'Mute'}
                className="p-2.5 rounded-xl bg-[#101326]/90 border border-indigo-400/25 text-slate-200 hover:border-sky-400 cursor-pointer"
              >
                {muted ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-sky-300" />
                )}
              </button>
              <button
                type="button"
                onClick={onPause}
                aria-label="Pause game"
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#101326]/90 border border-indigo-400/25 text-xs font-semibold text-white hover:border-sky-400 cursor-pointer"
              >
                <Pause className="w-4 h-4" />
                <span>Pause</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Combo Milestone Banner */}
      {comboBanner && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 px-6 py-2.5 rounded-xl bg-[#141832]/95 border border-amber-400/50 shadow-xl text-center">
          <div
            className="font-display text-xl font-bold tracking-wider"
            style={{ color: comboBanner.colorHex }}
          >
            {comboBanner.text} · {comboBanner.multiplier}X
          </div>
          <div className="text-[11px] text-slate-300">
            {comboBanner.playerName}
          </div>
        </div>
      )}

      {/* Bottom Weapon / Ability Dock OR Replay Controls */}
      {isReplayMode ? (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-4 px-5 py-3 rounded-xl bg-[#101326]/95 border border-indigo-400/30 shadow-xl">
          <span className="font-display text-xs font-bold text-sky-300 whitespace-nowrap">
            3D MATCH REPLAY
          </span>
          <button
            type="button"
            onClick={onReplayTogglePause}
            className="p-2 rounded-lg bg-sky-400 text-slate-950 cursor-pointer"
          >
            {replayPaused ? (
              <Play className="w-4 h-4 fill-slate-950" />
            ) : (
              <Pause className="w-4 h-4 fill-slate-950" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={replayProgress || 0}
            onChange={(e) => onReplaySeek?.(Number(e.target.value))}
            className="w-44 accent-sky-400"
          />
          <button
            type="button"
            onClick={onReplayToggleSpeed}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#1a2042] text-xs font-mono-num text-white cursor-pointer"
          >
            <FastForward className="w-3.5 h-3.5 text-amber-300" />
            <span>{replaySpeed || 1}x</span>
          </button>
          <button
            type="button"
            onClick={onExitReplay}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-200 text-xs font-semibold cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Exit</span>
          </button>
        </div>
      ) : (
        localShip && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#101326]/92 border border-indigo-400/25">
            {/* Active Buff Indicators */}
            {(localShip.speedBoostTimer > 0 ||
              localShip.rapidFireTimer > 0 ||
              localShip.doubleDamageTimer > 0) && (
              <div className="hidden md:flex items-center gap-2 pr-3 border-r border-indigo-400/20 text-[11px] font-mono-num">
                {localShip.speedBoostTimer > 0 && (
                  <span className="text-sky-300">
                    SPD {Math.ceil(localShip.speedBoostTimer)}s
                  </span>
                )}
                {localShip.rapidFireTimer > 0 && (
                  <span className="text-violet-300">
                    ROF {Math.ceil(localShip.rapidFireTimer)}s
                  </span>
                )}
                {localShip.doubleDamageTimer > 0 && (
                  <span className="text-pink-300">
                    2X {Math.ceil(localShip.doubleDamageTimer)}s
                  </span>
                )}
              </div>
            )}

            {/* Weapon Selector */}
            <div className="flex items-center gap-1.5">
              {weaponSlots.map((slot) => {
                const w = WEAPONS[slot.id];
                const active = localShip.activeWeapon === slot.id;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => onSelectWeapon(slot.id)}
                    className={`px-2.5 py-1.5 rounded-lg border text-xs transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-sky-400/20 border-sky-400 text-white'
                        : 'bg-[#0b0e1e] border-indigo-400/20 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="font-mono-num text-[10px] mr-1 text-slate-400">
                      {slot.key}
                    </span>
                    <span className="font-semibold">{w.name.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>

            {/* Missiles */}
            <div className="flex items-center gap-1.5 pl-3 border-l border-indigo-400/20 text-xs font-mono-num">
              <Rocket className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-white font-bold">{localShip.missiles}</span>
              <span className="text-[10px] text-slate-400">[E]</span>
            </div>

            {/* Special Ability Charge */}
            <div className="flex items-center gap-2 pl-3 border-l border-indigo-400/20">
              <Zap
                className={`w-3.5 h-3.5 ${
                  localShip.energy >= 100 ? 'text-amber-300' : 'text-slate-500'
                }`}
              />
              <div className="w-20 h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full ${
                    localShip.energy >= 100 ? 'bg-amber-400' : 'bg-indigo-400'
                  }`}
                  style={{ width: `${Math.min(100, localShip.energy)}%` }}
                />
              </div>
              <span className="text-[10px] font-mono-num text-slate-300">
                [SHIFT]
              </span>
            </div>
          </div>
        )
      )}
    </div>
  );
};
