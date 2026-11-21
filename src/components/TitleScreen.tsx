import React from 'react';
import {
  Award,
  BookOpen,
  Coins,
  Play,
  Sliders,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  Wrench,
} from 'lucide-react';
import { PlayerProfile } from '../game/types';
import { PWAInstallButton } from './PWAInstallButton';

interface TitleScreenProps {
  profile: PlayerProfile;
  hasReplay: boolean;
  onPlay: () => void;
  onOpenUpgrades: () => void;
  onOpenProgression: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onWatchReplay: () => void;
  onToggleMute: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  profile,
  hasReplay,
  onPlay,
  onOpenUpgrades,
  onOpenProgression,
  onOpenSettings,
  onOpenHelp,
  onWatchReplay,
  onToggleMute,
}) => {
  const unclaimedMissions = profile.missions.filter(
    (m) => !m.claimed && m.progress >= m.target,
  ).length;

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-6 md:p-10">
      {/* Top Bar: Pilot identity & quick audio/help */}
      <div className="flex items-center justify-between gap-4 pointer-events-auto">
        <div className="flex items-center gap-4 px-4 py-2.5 rounded-xl bg-[#101326]/90 border border-indigo-400/20">
          <div className="text-sm font-semibold text-sky-300 whitespace-nowrap">
            {profile.pilotName}
          </div>
          <span className="text-indigo-400/50" aria-hidden="true">
            ·
          </span>
          <div className="text-xs text-slate-300 font-mono-num whitespace-nowrap">
            LVL {profile.level}
          </div>
          <span className="text-indigo-400/50" aria-hidden="true">
            ·
          </span>
          <div className="flex items-center gap-1.5 text-xs font-mono-num text-amber-300 whitespace-nowrap">
            <Coins className="w-3.5 h-3.5" />
            <span>{profile.coins}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <PWAInstallButton />
          <button
            type="button"
            onClick={onOpenHelp}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#101326]/90 border border-indigo-400/20 text-xs font-medium text-slate-200 hover:border-sky-400/50 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-sky-300" />
            <span>How to Play</span>
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#101326]/90 border border-indigo-400/20 text-xs font-medium text-slate-200 hover:border-sky-400/50 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
          >
            <Sliders className="w-4 h-4 text-violet-300" />
            <span>Settings</span>
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={profile.muted ? 'Unmute audio' : 'Mute audio'}
            className="p-2.5 rounded-xl bg-[#101326]/90 border border-indigo-400/20 text-slate-200 hover:border-sky-400/50 hover:text-white transition-colors cursor-pointer"
          >
            {profile.muted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-sky-300" />
            )}
          </button>
        </div>
      </div>

      {/* Center-Left Hero Lockup leaving 3D isometric space showcase visible */}
      <div className="max-w-xl my-auto pointer-events-auto">
        <div className="mb-5">
          {/* Bespoke inline SVG Title Emblem & Lockup */}
          <svg
            viewBox="0 0 460 118"
            className="w-full max-w-[440px] h-auto drop-shadow-[0_6px_24px_rgba(56,189,248,0.22)]"
            role="img"
            aria-label="Spacecraft Shooting"
          >
            <defs>
              <linearGradient id="shipTitleGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#E0F2FE" />
                <stop offset="50%" stopColor="#38BDF8" />
                <stop offset="100%" stopColor="#F472B6" />
              </linearGradient>
              <linearGradient id="accentWing" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#38BDF8" />
                <stop offset="100%" stopColor="#A78BFA" />
              </linearGradient>
            </defs>
            {/* Geometric Isometric Spacecraft Icon */}
            <g transform="translate(8, 18)">
              <polygon
                points="42,4 74,44 54,48 42,68 30,48 10,44"
                fill="url(#accentWing)"
                opacity="0.92"
              />
              <polygon
                points="42,10 52,42 42,58 32,42"
                fill="#F8FAFC"
              />
              <polygon points="42,20 47,36 42,42 37,36" fill="#0EA5E9" />
              <line
                x1="12"
                y1="62"
                x2="72"
                y2="62"
                stroke="#F472B6"
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.7"
              />
            </g>
            <text
              x="98"
              y="56"
              fill="url(#shipTitleGrad)"
              fontFamily="Chakra Petch, sans-serif"
              fontWeight="700"
              fontSize="40"
              letterSpacing="1.5"
            >
              SPACECRAFT
            </text>
            <text
              x="100"
              y="98"
              fill="#F8FAFC"
              fontFamily="Chakra Petch, sans-serif"
              fontWeight="600"
              fontSize="30"
              letterSpacing="5.5"
            >
              SHOOTING
            </text>
          </svg>
        </div>

        <p className="text-slate-300 text-sm md:text-base leading-relaxed max-w-md mb-7">
          Cozy 3D isometric space combat. Pilot custom starfighters across Duo
          1v1 duels, Squad 2v2–4v4 battles, and Survival boss waves.
        </p>

        {/* Primary Play CTA + Secondary Action Strip */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onPlay}
            className="flex items-center gap-3 px-7 py-3.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-display font-bold text-base tracking-wide transition-colors shadow-[0_8px_28px_rgba(56,189,248,0.3)] whitespace-nowrap cursor-pointer"
          >
            <Play className="w-5 h-5 fill-slate-950" />
            <span>Play Match</span>
          </button>

          <button
            type="button"
            onClick={onOpenUpgrades}
            className="flex items-center gap-2.5 px-5 py-3.5 rounded-xl bg-[#141830]/95 hover:bg-[#1b2142] border border-indigo-400/25 text-slate-100 font-medium text-sm transition-colors whitespace-nowrap cursor-pointer"
          >
            <Wrench className="w-4 h-4 text-amber-300" />
            <span>Upgrades</span>
          </button>

          <button
            type="button"
            onClick={onOpenProgression}
            className="flex items-center gap-2.5 px-5 py-3.5 rounded-xl bg-[#141830]/95 hover:bg-[#1b2142] border border-indigo-400/25 text-slate-100 font-medium text-sm transition-colors whitespace-nowrap cursor-pointer"
          >
            <Trophy className="w-4 h-4 text-pink-400" />
            <span>
              Leaderboard & Missions
              {unclaimedMissions > 0 ? ` (${unclaimedMissions})` : ''}
            </span>
          </button>

          {hasReplay && (
            <button
              type="button"
              onClick={onWatchReplay}
              className="flex items-center gap-2 px-4 py-3.5 rounded-xl bg-[#141830]/95 hover:bg-[#1b2142] border border-indigo-400/25 text-sky-300 font-medium text-sm transition-colors whitespace-nowrap cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Last Replay</span>
            </button>
          )}
        </div>
      </div>

      {/* Bottom single-line control hint */}
      <div className="flex items-center justify-between text-xs text-slate-400 pointer-events-auto">
        <div className="flex items-center gap-2.5">
          <span>WASD Move</span>
          <span aria-hidden="true">·</span>
          <span>Mouse / Space Shoot</span>
          <span aria-hidden="true">·</span>
          <span>E Missile</span>
          <span aria-hidden="true">·</span>
          <span>Shift Ability</span>
          <span aria-hidden="true">·</span>
          <span>1–4 Weapons</span>
          <span aria-hidden="true">·</span>
          <span>Esc Pause</span>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-slate-400">
          <Award className="w-3.5 h-3.5 text-violet-300" />
          <span>
            {profile.achievements.filter((a) => a.unlocked).length}/
            {profile.achievements.length} Achievements
          </span>
        </div>
      </div>
    </div>
  );
};
