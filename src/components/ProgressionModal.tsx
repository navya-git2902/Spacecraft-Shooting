import React, { useEffect, useState } from 'react';
import { Award, CheckCircle2, Coins, Target, Trophy, X } from 'lucide-react';
import { SHIPS } from '../game/catalog';
import { LeaderboardEntry, PlayerProfile } from '../game/types';

interface ProgressionModalProps {
  profile: PlayerProfile;
  onClose: () => void;
  onClaimMission: (missionId: string) => void;
}

export const ProgressionModal: React.FC<ProgressionModalProps> = ({
  profile,
  onClose,
  onClaimMission,
}) => {
  const [tab, setTab] = useState<'missions' | 'leaderboard' | 'achievements'>(
    'missions',
  );
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loadingLb, setLoadingLb] = useState(false);

  useEffect(() => {
    if (tab === 'leaderboard') {
      setLoadingLb(true);
      fetch('/api/leaderboard')
        .then((r) => (r.ok ? r.json() : { entries: [] }))
        .then((data: { entries: LeaderboardEntry[] }) => {
          setEntries(data.entries || []);
        })
        .catch(() => {})
        .finally(() => setLoadingLb(false));
    }
  }, [tab]);

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center p-4 bg-[#080a18]/80">
      <div className="w-full max-w-4xl max-h-[88vh] flex flex-col rounded-2xl bg-[#12162e] border border-indigo-400/25 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-indigo-400/15">
          <div className="flex items-center gap-2">
            {[
              { id: 'missions' as const, label: 'Daily Missions', icon: Target },
              { id: 'leaderboard' as const, label: 'Leaderboard', icon: Trophy },
              {
                id: 'achievements' as const,
                label: 'Achievements',
                icon: Award,
              },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    tab === t.id
                      ? 'bg-sky-400 text-slate-950'
                      : 'bg-[#0c0f22] text-slate-300 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto cosmo-scroll p-6">
          {tab === 'missions' && (
            <div className="space-y-3">
              {profile.missions.map((m) => {
                const pct = Math.min(100, Math.round((m.progress / m.target) * 100));
                const complete = m.progress >= m.target;
                return (
                  <div
                    key={m.id}
                    className="p-4 rounded-xl bg-[#0c0f22] border border-indigo-400/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-display font-bold text-sm text-white">
                          {m.title}
                        </span>
                        <span className="text-xs font-mono-num text-amber-300 flex items-center gap-1">
                          <Coins className="w-3.5 h-3.5" />+{m.rewardCoins} · +
                          {m.rewardXp} XP
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {m.description}
                      </p>
                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-sky-400 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono-num text-slate-300">
                          {m.progress}/{m.target}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!complete || m.claimed}
                      onClick={() => onClaimMission(m.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                        m.claimed
                          ? 'bg-emerald-500/15 text-emerald-300 cursor-default'
                          : complete
                            ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {m.claimed
                        ? 'Claimed'
                        : complete
                          ? 'Claim Reward'
                          : 'In Progress'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'leaderboard' && (
            <div>
              {loadingLb ? (
                <div className="text-sm text-slate-400 py-8 text-center">
                  Loading galactic rankings...
                </div>
              ) : entries.length === 0 ? (
                <div className="text-sm text-slate-400 py-8 text-center">
                  Complete a match to post your score on the leaderboard.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-indigo-400/20 text-[11px] text-slate-400">
                        <th className="py-2.5 pr-4 font-semibold">Rank</th>
                        <th className="py-2.5 pr-4 font-semibold">Pilot</th>
                        <th className="py-2.5 pr-4 font-semibold">Mode</th>
                        <th className="py-2.5 pr-4 font-semibold">Spacecraft</th>
                        <th className="py-2.5 pr-4 font-semibold text-right">
                          Kills
                        </th>
                        <th className="py-2.5 pr-4 font-semibold text-right">
                          Max Combo
                        </th>
                        <th className="py-2.5 font-semibold text-right">
                          Score
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-indigo-400/10 text-xs">
                      {entries.map((e, idx) => (
                        <tr key={e.id} className="hover:bg-white/5">
                          <td className="py-3 pr-4 font-mono-num font-bold text-amber-300">
                            #{idx + 1}
                          </td>
                          <td className="py-3 pr-4 font-semibold text-white">
                            {e.pilotName}
                          </td>
                          <td className="py-3 pr-4 capitalize text-slate-300">
                            {e.mode}
                          </td>
                          <td className="py-3 pr-4 text-sky-300">
                            {SHIPS[e.shipId]?.name || e.shipId}
                          </td>
                          <td className="py-3 pr-4 text-right font-mono-num text-slate-300">
                            {e.kills}
                          </td>
                          <td className="py-3 pr-4 text-right font-mono-num text-pink-300">
                            {e.maxCombo}x
                          </td>
                          <td className="py-3 text-right font-mono-num font-bold text-white">
                            {e.score.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === 'achievements' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {profile.achievements.map((a) => (
                <div
                  key={a.id}
                  className={`p-4 rounded-xl border flex items-start gap-3 ${
                    a.unlocked
                      ? 'bg-[#171e42] border-emerald-400/40'
                      : 'bg-[#0c0f22] border-indigo-400/15 opacity-70'
                  }`}
                >
                  <CheckCircle2
                    className={`w-5 h-5 shrink-0 mt-0.5 ${
                      a.unlocked ? 'text-emerald-300' : 'text-slate-600'
                    }`}
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display font-bold text-sm text-white">
                        {a.title}
                      </span>
                      <span className="font-mono-num text-xs text-amber-300">
                        +{a.rewardCoins}c
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {a.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
