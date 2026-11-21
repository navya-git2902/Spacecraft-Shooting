import type {
  Achievement,
  DailyMission,
  KeyBindings,
  PermanentUpgrades,
  PowerUpType,
  ShipConfig,
  ShipId,
  SkinConfig,
  SkinId,
  WeaponConfig,
  WeaponId,
} from './types.ts';

export const ARENA_HALF_SIZE = 34;

export const SHIPS: Record<ShipId, ShipConfig> = {
  sparrow: {
    id: 'sparrow',
    name: 'Nova Sparrow',
    role: 'Agile Interceptor',
    description: 'Sleek all-rounder built for crisp weaving and sustained combo streaks.',
    abilityName: 'Phase Dash',
    abilityDesc: 'Blink forward with brief invulnerability and speed burst.',
    baseHp: 100,
    baseSpeed: 15.5,
    baseDamageMult: 1.0,
    baseFireRateMult: 1.0,
    accentHex: '#38BDF8',
    hullHex: '#E0F2FE',
    trimHex: '#0284C7',
  },
  aegis: {
    id: 'aegis',
    name: 'Nebula Aegis',
    role: 'Shielded Cruiser',
    description: 'Armored celestial defender with protective pulse barriers.',
    abilityName: 'Aegis Pulse',
    abilityDesc: 'Projects a 55 HP energy shield and repels nearby bolts.',
    baseHp: 120,
    baseSpeed: 13.0,
    baseDamageMult: 1.05,
    baseFireRateMult: 0.95,
    accentHex: '#A78BFA',
    hullHex: '#EDE9FE',
    trimHex: '#7C3AED',
  },
  dart: {
    id: 'dart',
    name: 'Comet Dart',
    role: 'Hyper Striker',
    description: 'Razor-fast twin-wing craft with overclocked plasma repeaters.',
    abilityName: 'Starburst Overdrive',
    abilityDesc: 'Grants 4 seconds of hyper fire-rate and thruster surge.',
    baseHp: 90,
    baseSpeed: 18.0,
    baseDamageMult: 0.95,
    baseFireRateMult: 1.2,
    accentHex: '#F472B6',
    hullHex: '#FCE7F3',
    trimHex: '#DB2777',
  },
  bastion: {
    id: 'bastion',
    name: 'Orion Bastion',
    role: 'Ordnance Specialist',
    description: 'Heavy gunship carrying twin missile racks and reinforced plating.',
    abilityName: 'Salvo Barrage',
    abilityDesc: 'Launches an immediate triple-spread plasma missile volley.',
    baseHp: 115,
    baseSpeed: 13.8,
    baseDamageMult: 1.15,
    baseFireRateMult: 0.9,
    accentHex: '#34D399',
    hullHex: '#D1FAE5',
    trimHex: '#059669',
  },
};

export const SKINS: Record<SkinId, SkinConfig> = {
  starlight: {
    id: 'starlight',
    name: 'Starlight Classic',
    cost: 0,
    hullHex: '#E2E8F0',
    trimHex: '#38BDF8',
    glowHex: '#38BDF8',
  },
  sakura: {
    id: 'sakura',
    name: 'Sakura Nebula',
    cost: 180,
    hullHex: '#FDF2F8',
    trimHex: '#F472B6',
    glowHex: '#EC4899',
  },
  voidgold: {
    id: 'voidgold',
    name: 'Void Gold',
    cost: 320,
    hullHex: '#1E1B4B',
    trimHex: '#FBBF24',
    glowHex: '#F59E0B',
  },
  aurora: {
    id: 'aurora',
    name: 'Aurora Mint',
    cost: 260,
    hullHex: '#0F172A',
    trimHex: '#34D399',
    glowHex: '#2DD4BF',
  },
};

export const WEAPONS: Record<WeaponId, WeaponConfig> = {
  basic: {
    id: 'basic',
    name: 'Pulse Laser',
    damage: 14,
    cooldown: 0.24,
    projectileSpeed: 38,
    colorHex: '#38BDF8',
    description: 'Balanced high-velocity cyan plasma bolt.',
  },
  rapid: {
    id: 'rapid',
    name: 'Rapid Repeater',
    damage: 8,
    cooldown: 0.11,
    projectileSpeed: 42,
    colorHex: '#A78BFA',
    description: 'Ultra-fast alternating twin laser stream.',
  },
  double: {
    id: 'double',
    name: 'Twin Cannon',
    damage: 11,
    cooldown: 0.28,
    projectileSpeed: 36,
    colorHex: '#F472B6',
    description: 'Parallel dual plasma cannons for heavy bursts.',
  },
  spread: {
    id: 'spread',
    name: 'Prism Spread',
    damage: 9,
    cooldown: 0.36,
    projectileSpeed: 34,
    colorHex: '#FBBF24',
    description: '3-way wide-arc volley ideal for close dogfights.',
  },
  missile: {
    id: 'missile',
    name: 'Plasma Missile',
    damage: 38,
    cooldown: 0.65,
    projectileSpeed: 28,
    colorHex: '#FB7185',
    description: 'Explosive warhead with area-of-effect plasma blast.',
  },
};

export const POWERUP_INFO: Record<
  PowerUpType,
  { name: string; short: string; colorHex: string; description: string }
> = {
  health: {
    name: 'Health Boost',
    short: '+35 HP',
    colorHex: '#34D399',
    description: 'Restores 35 hull health immediately.',
  },
  speed: {
    name: 'Speed Boost',
    short: 'SPD+',
    colorHex: '#38BDF8',
    description: 'Boosts thruster velocity by 40% for 8s.',
  },
  rapid_fire: {
    name: 'Rapid Fire',
    short: 'ROF+',
    colorHex: '#A78BFA',
    description: 'Increases weapon fire rate by 60% for 8s.',
  },
  double_damage: {
    name: 'Double Damage',
    short: '2X DMG',
    colorHex: '#F472B6',
    description: 'Doubles projectile damage for 8s.',
  },
  shield: {
    name: 'Shield Barrier',
    short: 'SHIELD',
    colorHex: '#60A5FA',
    description: 'Absorbs up to 60 incoming damage and protects combo.',
  },
  missile_upgrade: {
    name: 'Missile Pack',
    short: '+2 MSL',
    colorHex: '#FB7185',
    description: 'Adds 2 plasma missiles and boosts blast yield.',
  },
  energy: {
    name: 'Energy Cell',
    short: 'ENERGY',
    colorHex: '#FBBF24',
    description: 'Instantly refills Special Ability charge to 100%.',
  },
};

export interface UpgradeSpec {
  key: keyof PermanentUpgrades;
  name: string;
  description: string;
  bonusPerLevel: string;
  baseCost: number;
  costStep: number;
  maxLevel: number;
}

export const UPGRADE_SPECS: UpgradeSpec[] = [
  {
    key: 'hull',
    name: 'Titanium Hull Plating',
    description: 'Reinforces structural frame for higher base health.',
    bonusPerLevel: '+15 Max HP',
    baseCost: 80,
    costStep: 70,
    maxLevel: 5,
  },
  {
    key: 'thrusters',
    name: 'Ion Thruster Array',
    description: 'Improves strafing acceleration and top cruise speed.',
    bonusPerLevel: '+6% Move Speed',
    baseCost: 85,
    costStep: 75,
    maxLevel: 5,
  },
  {
    key: 'capacitors',
    name: 'Plasma Capacitors',
    description: 'Amplifies energy yield across all laser weapons.',
    bonusPerLevel: '+8% Weapon Damage',
    baseCost: 100,
    costStep: 85,
    maxLevel: 5,
  },
  {
    key: 'cooling',
    name: 'Cryo Cooling Coils',
    description: 'Reduces weapon cycle delay for sustained barrages.',
    bonusPerLevel: '+7% Fire Rate',
    baseCost: 95,
    costStep: 80,
    maxLevel: 5,
  },
  {
    key: 'ordnance',
    name: 'Ordnance Magazine',
    description: 'Expands missile rack capacity and splash radius.',
    bonusPerLevel: '+1 Max Missile & +10% Blast',
    baseCost: 110,
    costStep: 90,
    maxLevel: 5,
  },
  {
    key: 'reactor',
    name: 'Starlight Reactor Core',
    description: 'Accelerates passive energy recharge for special abilities.',
    bonusPerLevel: '+10% Recharge Rate',
    baseCost: 90,
    costStep: 80,
    maxLevel: 5,
  },
];

export const DEFAULT_KEYBINDINGS: KeyBindings = {
  up: 'KeyW',
  down: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  shoot: 'Space',
  missile: 'KeyE',
  ability: 'ShiftLeft',
  pause: 'Escape',
};

export const DEFAULT_MISSIONS: DailyMission[] = [
  {
    id: 'm_hits',
    title: 'Precision Pilot',
    description: 'Land 35 combo-building hits across matches',
    target: 35,
    progress: 0,
    rewardCoins: 120,
    rewardXp: 150,
    claimed: false,
    metric: 'combo_hits',
  },
  {
    id: 'm_kills',
    title: 'Nebula Ace',
    description: 'Eliminate 10 rival spacecraft',
    target: 10,
    progress: 0,
    rewardCoins: 150,
    rewardXp: 180,
    claimed: false,
    metric: 'kills',
  },
  {
    id: 'm_wins',
    title: 'Squadron Victory',
    description: 'Win 2 matches in Duo, Squad, or Survival',
    target: 2,
    progress: 0,
    rewardCoins: 200,
    rewardXp: 240,
    claimed: false,
    metric: 'matches_won',
  },
];

export const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'ach_first_win',
    title: 'First Orbit',
    description: 'Win your first match in any mode.',
    unlocked: false,
    rewardCoins: 100,
  },
  {
    id: 'ach_double_combo',
    title: 'Rhythm Gunner',
    description: 'Reach a 5x hit streak (3x Score Multiplier).',
    unlocked: false,
    rewardCoins: 120,
  },
  {
    id: 'ach_space_legend',
    title: 'Space Legend',
    description: 'Achieve a 15-hit consecutive combo streak.',
    unlocked: false,
    rewardCoins: 250,
  },
  {
    id: 'ach_boss_slayer',
    title: 'Dreadnought Hunter',
    description: 'Defeat an Astral Weaver Boss in Survival Mode.',
    unlocked: false,
    rewardCoins: 300,
  },
  {
    id: 'ach_squad_captain',
    title: 'Squadron Captain',
    description: 'Win a Squad Mode match (2v2, 3v3, or 4v4).',
    unlocked: false,
    rewardCoins: 160,
  },
];

export function computeComboMultiplier(combo: number): {
  multiplier: number;
  label: string | null;
  colorHex: string;
} {
  if (combo >= 15) {
    return { multiplier: 6, label: 'SPACE LEGEND!', colorHex: '#FBBF24' };
  }
  if (combo >= 10) {
    return { multiplier: 5, label: 'UNSTOPPABLE!', colorHex: '#F472B6' };
  }
  if (combo >= 8) {
    return { multiplier: 4, label: 'MEGA COMBO!', colorHex: '#A78BFA' };
  }
  if (combo >= 5) {
    return { multiplier: 3, label: 'DOUBLE COMBO!', colorHex: '#38BDF8' };
  }
  if (combo >= 2) {
    return { multiplier: 2, label: 'NICE SHOT!', colorHex: '#34D399' };
  }
  return { multiplier: 1, label: null, colorHex: '#E2E8F0' };
}

export function formatKeyCode(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code === 'Space') return 'SPACE';
  if (code === 'ShiftLeft' || code === 'ShiftRight') return 'SHIFT';
  if (code === 'Escape') return 'ESC';
  if (code.startsWith('Arrow')) return code.slice(5).toUpperCase();
  return code;
}
