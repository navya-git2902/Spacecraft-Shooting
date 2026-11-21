import {
  DEFAULT_ACHIEVEMENTS,
  DEFAULT_KEYBINDINGS,
  DEFAULT_MISSIONS,
  SKINS,
  UPGRADE_SPECS,
} from './catalog';
import {
  MatchReplayData,
  MatchResultSummary,
  PermanentUpgrades,
  PlayerProfile,
  SkinId,
} from './types';

const PROFILE_KEY = 'spacecraft_shooting_profile_v1';
const REPLAY_KEY = 'spacecraft_shooting_last_replay_v1';

export function createDefaultProfile(): PlayerProfile {
  return {
    pilotName: 'Nova Pilot',
    coins: 220,
    xp: 0,
    level: 1,
    selectedShip: 'sparrow',
    selectedSkin: 'starlight',
    unlockedSkins: ['starlight'],
    upgrades: {
      hull: 0,
      thrusters: 0,
      capacitors: 0,
      cooling: 0,
      ordnance: 0,
      reactor: 0,
    },
    missions: DEFAULT_MISSIONS.map((m) => ({ ...m })),
    achievements: DEFAULT_ACHIEVEMENTS.map((a) => ({ ...a })),
    keyBindings: { ...DEFAULT_KEYBINDINGS },
    musicVolume: 0.38,
    sfxVolume: 0.65,
    muted: false,
    aimMode: 'mouse',
  };
}

export function loadProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return createDefaultProfile();
    const parsed = JSON.parse(raw) as Partial<PlayerProfile>;
    const base = createDefaultProfile();
    return {
      ...base,
      ...parsed,
      upgrades: { ...base.upgrades, ...(parsed.upgrades || {}) },
      keyBindings: { ...base.keyBindings, ...(parsed.keyBindings || {}) },
      missions: parsed.missions?.length ? parsed.missions : base.missions,
      achievements: parsed.achievements?.length
        ? parsed.achievements
        : base.achievements,
      unlockedSkins: parsed.unlockedSkins?.length
        ? parsed.unlockedSkins
        : base.unlockedSkins,
    };
  } catch {
    return createDefaultProfile();
  }
}

export function saveProfile(profile: PlayerProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // ignore storage quota errors
  }
}

export function getUpgradeCost(key: keyof PermanentUpgrades, currentLevel: number): number {
  const spec = UPGRADE_SPECS.find((s) => s.key === key);
  if (!spec) return 9999;
  return spec.baseCost + currentLevel * spec.costStep;
}

export function applyMatchProgression(
  profile: PlayerProfile,
  summary: MatchResultSummary,
  powerUpsCollected: number,
  bossKilled: boolean,
): {
  updatedProfile: PlayerProfile;
  newlyUnlockedAchievements: string[];
} {
  const next: PlayerProfile = {
    ...profile,
    coins: profile.coins + summary.coinsEarned,
    xp: profile.xp + summary.xpEarned,
    missions: profile.missions.map((m) => ({ ...m })),
    achievements: profile.achievements.map((a) => ({ ...a })),
  };
  next.level = Math.max(1, Math.floor(next.xp / 350) + 1);

  for (const m of next.missions) {
    if (m.claimed) continue;
    if (m.metric === 'kills') {
      m.progress = Math.min(m.target, m.progress + summary.localPlayerKills);
    } else if (m.metric === 'combo_hits') {
      m.progress = Math.min(m.target, m.progress + summary.localPlayerMaxCombo);
    } else if (m.metric === 'matches_won' && summary.victoryForLocal) {
      m.progress = Math.min(m.target, m.progress + 1);
    } else if (m.metric === 'powerups') {
      m.progress = Math.min(m.target, m.progress + powerUpsCollected);
    } else if (m.metric === 'boss_kills' && bossKilled) {
      m.progress = Math.min(m.target, m.progress + 1);
    }
  }

  const newlyUnlockedAchievements: string[] = [];
  const unlock = (id: string) => {
    const ach = next.achievements.find((a) => a.id === id);
    if (ach && !ach.unlocked) {
      ach.unlocked = true;
      next.coins += ach.rewardCoins;
      newlyUnlockedAchievements.push(ach.title);
    }
  };

  if (summary.victoryForLocal) unlock('ach_first_win');
  if (summary.localPlayerMaxCombo >= 5) unlock('ach_double_combo');
  if (summary.localPlayerMaxCombo >= 15) unlock('ach_space_legend');
  if (bossKilled) unlock('ach_boss_slayer');
  if (summary.mode === 'squad' && summary.victoryForLocal) {
    unlock('ach_squad_captain');
  }

  saveProfile(next);
  return { updatedProfile: next, newlyUnlockedAchievements };
}

export function canUnlockSkin(profile: PlayerProfile, skinId: SkinId): boolean {
  if (profile.unlockedSkins.includes(skinId)) return false;
  return profile.coins >= SKINS[skinId].cost;
}

export function saveLastReplay(replay: MatchReplayData): void {
  try {
    localStorage.setItem(REPLAY_KEY, JSON.stringify(replay));
  } catch {
    // ignore storage quota errors
  }
}

export function loadLastReplay(): MatchReplayData | null {
  try {
    const raw = localStorage.getItem(REPLAY_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as MatchReplayData;
  } catch {
    return null;
  }
}
