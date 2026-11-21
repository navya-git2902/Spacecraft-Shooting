import React from 'react';
import { Check, Coins, Lock, Sparkles, X } from 'lucide-react';
import { SKINS, UPGRADE_SPECS } from '../game/catalog';
import { getUpgradeCost } from '../game/progression';
import { PermanentUpgrades, PlayerProfile, SkinId } from '../game/types';

interface HangarUpgradesModalProps {
  profile: PlayerProfile;
  onClose: () => void;
  onBuyUpgrade: (key: keyof PermanentUpgrades) => void;
  onUnlockOrSelectSkin: (skinId: SkinId) => void;
}

export const HangarUpgradesModal: React.FC<HangarUpgradesModalProps> = ({
  profile,
  onClose,
  onBuyUpgrade,
  onUnlockOrSelectSkin,
}) => {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center p-4 bg-[#080a18]/80">
      <div className="w-full max-w-4xl max-h-[88vh] flex flex-col rounded-2xl bg-[#12162e] border border-indigo-400/25 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-indigo-400/15">
          <div>
            <h2 className="font-display text-xl font-bold text-white">
              Spacecraft Upgrades & Skins
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Permanent engineering upgrades apply across all local and AI modes
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0c0f22] border border-amber-400/30 text-amber-300 font-mono-num text-sm font-bold">
              <Coins className="w-4 h-4" />
              <span>{profile.coins} Coins</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close upgrades"
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto cosmo-scroll p-6 space-y-6">
          {/* Hardware Upgrades */}
          <div>
            <h3 className="font-display text-sm font-bold text-sky-300 mb-3">
              Permanent Systems
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {UPGRADE_SPECS.map((spec) => {
                const lvl = profile.upgrades[spec.key];
                const isMax = lvl >= spec.maxLevel;
                const cost = getUpgradeCost(spec.key, lvl);
                const canAfford = profile.coins >= cost && !isMax;

                return (
                  <div
                    key={spec.key}
                    className="p-4 rounded-xl bg-[#0c0f22] border border-indigo-400/20 flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display font-bold text-sm text-white">
                          {spec.name}
                        </span>
                        <span className="font-mono-num text-xs text-sky-300">
                          LVL {lvl}/{spec.maxLevel}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {spec.description}
                      </p>
                      <div className="text-xs text-emerald-300 font-medium mt-1.5">
                        {spec.bonusPerLevel} per tier
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-indigo-400/10">
                      <div className="flex gap-1">
                        {Array.from({ length: spec.maxLevel }).map((_, i) => (
                          <span
                            key={i}
                            className={`w-5 h-1.5 rounded-sm ${
                              i < lvl ? 'bg-sky-400' : 'bg-slate-700'
                            }`}
                          />
                        ))}
                      </div>
                      <button
                        type="button"
                        disabled={!canAfford}
                        onClick={() => onBuyUpgrade(spec.key)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-mono-num font-bold transition-colors ${
                          isMax
                            ? 'bg-emerald-500/20 text-emerald-300 cursor-default'
                            : canAfford
                              ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        {isMax ? 'MAXED' : `Upgrade · ${cost}c`}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Spacecraft Skins */}
          <div>
            <h3 className="font-display text-sm font-bold text-pink-300 mb-3">
              Hull Paint Finishes
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {(Object.keys(SKINS) as SkinId[]).map((skinId) => {
                const sk = SKINS[skinId];
                const unlocked = profile.unlockedSkins.includes(skinId);
                const equipped = profile.selectedSkin === skinId;
                const canAfford = profile.coins >= sk.cost;

                return (
                  <div
                    key={skinId}
                    className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                      equipped
                        ? 'bg-[#171e42] border-sky-400'
                        : 'bg-[#0c0f22] border-indigo-400/20'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="w-5 h-5 rounded-md border border-white/20"
                          style={{
                            background: `linear-gradient(135deg, ${sk.hullHex}, ${sk.trimHex})`,
                          }}
                        />
                        <span className="font-display font-bold text-sm text-white">
                          {sk.name}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={!unlocked && !canAfford}
                      onClick={() => onUnlockOrSelectSkin(skinId)}
                      className={`w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                        equipped
                          ? 'bg-sky-400/20 text-sky-200 cursor-default'
                          : unlocked
                            ? 'bg-indigo-500/30 hover:bg-indigo-500/45 text-white cursor-pointer'
                            : canAfford
                              ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold cursor-pointer'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {equipped ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Equipped</span>
                        </>
                      ) : unlocked ? (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Equip</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Unlock · {sk.cost}c</span>
                        </>
                      )}
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
