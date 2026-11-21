import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX, X } from 'lucide-react';
import {
  DEFAULT_KEYBINDINGS,
  formatKeyCode,
  POWERUP_INFO,
  WEAPONS,
} from '../game/catalog';
import { KeyBindings, PlayerProfile, PowerUpType, WeaponId } from '../game/types';

interface SettingsModalProps {
  profile: PlayerProfile;
  onClose: () => void;
  onUpdateAudio: (music: number, sfx: number, muted: boolean) => void;
  onUpdateAimMode: (aimMode: 'mouse' | 'heading') => void;
  onUpdateKeyBindings: (kb: KeyBindings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  profile,
  onClose,
  onUpdateAudio,
  onUpdateAimMode,
  onUpdateKeyBindings,
}) => {
  const [rebinding, setRebinding] = useState<keyof KeyBindings | null>(null);

  useEffect(() => {
    if (!rebinding) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onUpdateKeyBindings({
        ...profile.keyBindings,
        [rebinding]: e.code,
      });
      setRebinding(null);
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [rebinding, profile.keyBindings, onUpdateKeyBindings]);

  const bindingRows: Array<{ key: keyof KeyBindings; label: string }> = [
    { key: 'up', label: 'Move Up / North' },
    { key: 'down', label: 'Move Down / South' },
    { key: 'left', label: 'Move Left / West' },
    { key: 'right', label: 'Move Right / East' },
    { key: 'shoot', label: 'Primary Laser Shoot' },
    { key: 'missile', label: 'Launch Plasma Missile' },
    { key: 'ability', label: 'Special Ability' },
    { key: 'pause', label: 'Pause Menu' },
  ];

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center p-4 bg-[#080a18]/80">
      <div className="w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl bg-[#12162e] border border-indigo-400/25 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-indigo-400/15">
          <h2 className="font-display text-xl font-bold text-white">
            Settings & Controls
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto cosmo-scroll p-6 space-y-6">
          {/* Audio */}
          <div className="p-4 rounded-xl bg-[#0c0f22] border border-indigo-400/20 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-display text-sm font-bold text-white">
                Cozy Synth Audio
              </span>
              <button
                type="button"
                onClick={() =>
                  onUpdateAudio(
                    profile.musicVolume,
                    profile.sfxVolume,
                    !profile.muted,
                  )
                }
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#161c3a] border border-indigo-400/25 text-xs text-slate-200 cursor-pointer"
              >
                {profile.muted ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                    <span>Muted</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-sky-300" />
                    <span>Sound On</span>
                  </>
                )}
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Music Volume</span>
                <span className="font-mono-num">
                  {Math.round(profile.musicVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={profile.musicVolume}
                onChange={(e) =>
                  onUpdateAudio(
                    Number(e.target.value),
                    profile.sfxVolume,
                    profile.muted,
                  )
                }
                className="w-full accent-sky-400"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-300">
                <span>SFX Volume</span>
                <span className="font-mono-num">
                  {Math.round(profile.sfxVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={profile.sfxVolume}
                onChange={(e) =>
                  onUpdateAudio(
                    profile.musicVolume,
                    Number(e.target.value),
                    profile.muted,
                  )
                }
                className="w-full accent-pink-400"
              />
            </div>
          </div>

          {/* Aiming */}
          <div className="p-4 rounded-xl bg-[#0c0f22] border border-indigo-400/20 flex items-center justify-between gap-4">
            <div>
              <div className="font-display text-sm font-bold text-white">
                Aiming Mode (1-Player & Online)
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Aim toward the isometric mouse cursor or along flight direction
              </div>
            </div>
            <div className="flex gap-1.5 bg-[#141936] p-1 rounded-lg">
              <button
                type="button"
                onClick={() => onUpdateAimMode('mouse')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
                  profile.aimMode === 'mouse'
                    ? 'bg-sky-400 text-slate-950'
                    : 'text-slate-300'
                }`}
              >
                Mouse Cursor
              </button>
              <button
                type="button"
                onClick={() => onUpdateAimMode('heading')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
                  profile.aimMode === 'heading'
                    ? 'bg-sky-400 text-slate-950'
                    : 'text-slate-300'
                }`}
              >
                Keyboard Heading
              </button>
            </div>
          </div>

          {/* Keybindings */}
          <div className="p-4 rounded-xl bg-[#0c0f22] border border-indigo-400/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-display text-sm font-bold text-white">
                Custom Keybindings
              </span>
              <button
                type="button"
                onClick={() => onUpdateKeyBindings({ ...DEFAULT_KEYBINDINGS })}
                className="text-xs text-sky-300 hover:text-sky-200 cursor-pointer"
              >
                Reset Defaults
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {bindingRows.map((row) => {
                const isEditing = rebinding === row.key;
                return (
                  <div
                    key={row.key}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#141936]"
                  >
                    <span className="text-xs text-slate-300">{row.label}</span>
                    <button
                      type="button"
                      onClick={() => setRebinding(row.key)}
                      className={`px-2.5 py-1 rounded text-xs font-mono-num font-bold cursor-pointer ${
                        isEditing
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-[#1f264f] text-sky-200 hover:bg-[#2a3366]'
                      }`}
                    >
                      {isEditing
                        ? 'Press Key...'
                        : formatKeyCode(profile.keyBindings[row.key])}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const HowToPlayModal: React.FC<{ onClose: () => void }> = ({
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center p-4 bg-[#080a18]/80">
      <div className="w-full max-w-3xl max-h-[88vh] flex flex-col rounded-2xl bg-[#12162e] border border-indigo-400/25 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-indigo-400/15">
          <h2 className="font-display text-xl font-bold text-white">
            Pilot Flight Manual
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close manual"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto cosmo-scroll p-6 space-y-5 text-xs text-slate-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#0c0f22] border border-indigo-400/20 space-y-2">
              <div className="font-display text-sm font-bold text-sky-300">
                Flight & Combat Controls
              </div>
              <p>
                <strong className="text-white">Move:</strong> WASD or Arrow Keys
              </p>
              <p>
                <strong className="text-white">Shoot Laser:</strong> Left Mouse
                Button or Spacebar
              </p>
              <p>
                <strong className="text-white">Plasma Missile:</strong> E Key
                (explosive AoE splash)
              </p>
              <p>
                <strong className="text-white">Special Ability:</strong> Left
                Shift (100% Energy)
              </p>
              <p>
                <strong className="text-white">Switch Weapons:</strong> Number
                Keys 1 – 4
              </p>
              <p className="text-pink-300 pt-1">
                <strong>Local 2-Player:</strong> P1 uses WASD + Space + E +
                Shift · P2 uses Arrows + Enter + / + Right Shift.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#0c0f22] border border-indigo-400/20 space-y-2">
              <div className="font-display text-sm font-bold text-amber-300">
                Combo Multiplier System
              </div>
              <p>
                Every consecutive hit builds your combo streak. Missing a shot
                or taking unshielded hull damage resets your streak!
              </p>
              <ul className="space-y-1 font-mono-num text-[11px] text-slate-200 pt-1">
                <li>2+ Hits → 2x NICE SHOT!</li>
                <li>5+ Hits → 3x DOUBLE COMBO!</li>
                <li>8+ Hits → 4x MEGA COMBO!</li>
                <li>10+ Hits → 5x UNSTOPPABLE!</li>
                <li>15+ Hits → 6x SPACE LEGEND!</li>
              </ul>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0c0f22] border border-indigo-400/20">
            <div className="font-display text-sm font-bold text-violet-300 mb-2.5">
              Arsenal Weapons (Keys 1–4 & E)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(Object.keys(WEAPONS) as WeaponId[]).map((wId) => {
                const w = WEAPONS[wId];
                return (
                  <div key={wId} className="p-2.5 rounded-lg bg-[#141936]">
                    <div
                      className="font-bold text-xs"
                      style={{ color: w.colorHex }}
                    >
                      {w.name}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {w.description}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0c0f22] border border-indigo-400/20">
            <div className="font-display text-sm font-bold text-emerald-300 mb-2.5">
              Arena Power-Ups
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(POWERUP_INFO) as PowerUpType[]).map((pu) => {
                const info = POWERUP_INFO[pu];
                return (
                  <div key={pu} className="p-2 rounded-lg bg-[#141936]">
                    <div
                      className="font-bold text-[11px]"
                      style={{ color: info.colorHex }}
                    >
                      {info.name}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {info.short}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
