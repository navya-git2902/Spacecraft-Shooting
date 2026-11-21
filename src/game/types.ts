export type GameMode = 'duo' | 'squad' | 'survival';
export type PlaySubMode = 'ai' | 'local2p' | 'online';
export type SquadSize = 2 | 3 | 4;
export type Difficulty = 'easy' | 'medium' | 'hard';
export type TeamId = 'A' | 'B';

export type ShipId = 'sparrow' | 'aegis' | 'dart' | 'bastion';
export type SkinId = 'starlight' | 'sakura' | 'voidgold' | 'aurora';

export type WeaponId = 'basic' | 'rapid' | 'double' | 'spread' | 'missile';

export type PowerUpType =
  | 'health'
  | 'speed'
  | 'rapid_fire'
  | 'double_damage'
  | 'shield'
  | 'missile_upgrade'
  | 'energy';

export interface KeyBindings {
  up: string;
  down: string;
  left: string;
  right: string;
  shoot: string;
  missile: string;
  ability: string;
  pause: string;
}

export interface PermanentUpgrades {
  hull: number;       // +15 max HP per level (0..5)
  thrusters: number;  // +6% speed per level (0..5)
  capacitors: number; // +8% weapon damage per level (0..5)
  cooling: number;    // +7% fire rate per level (0..5)
  ordnance: number;   // +1 max missile & +10% blast per level (0..5)
  reactor: number;    // +10% ability recharge per level (0..5)
}

export interface ShipConfig {
  id: ShipId;
  name: string;
  role: string;
  description: string;
  abilityName: string;
  abilityDesc: string;
  baseHp: number;
  baseSpeed: number;
  baseDamageMult: number;
  baseFireRateMult: number;
  accentHex: string;
  hullHex: string;
  trimHex: string;
}

export interface SkinConfig {
  id: SkinId;
  name: string;
  cost: number;
  hullHex: string;
  trimHex: string;
  glowHex: string;
}

export interface WeaponConfig {
  id: WeaponId;
  name: string;
  damage: number;
  cooldown: number; // seconds
  projectileSpeed: number;
  colorHex: string;
  description: string;
}

export interface ShipState {
  id: string;
  name: string;
  team: TeamId;
  shipId: ShipId;
  skinId: SkinId;
  isHuman: boolean;
  isBoss?: boolean;
  controlSlot?: 1 | 2; // 1 = P1, 2 = P2 (local)
  x: number;
  z: number;
  vx: number;
  vz: number;
  angle: number;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  energy: number;
  maxEnergy: number;
  score: number;
  kills: number;
  deaths: number;
  hitsLanded: number;
  shotsFired: number;
  combo: number;
  maxCombo: number;
  multiplier: number;
  activeWeapon: WeaponId;
  missiles: number;
  maxMissiles: number;
  speedBoostTimer: number;
  rapidFireTimer: number;
  doubleDamageTimer: number;
  invulnTimer: number;
  hitFlashTimer: number;
  respawnTimer: number;
  alive: boolean;
  // Windup telegraph for boss or heavy abilities
  telegraphTimer: number;
  telegraphType?: 'barrage' | 'nova';
}

export interface ProjectileState {
  id: string;
  ownerId: string;
  team: TeamId;
  kind: WeaponId | 'boss_orb';
  x: number;
  z: number;
  vx: number;
  vz: number;
  angle: number;
  damage: number;
  radius: number;
  ttl: number;
  colorHex: string;
  isSplash?: boolean;
  splashRadius?: number;
}

export interface PowerUpEntity {
  id: string;
  type: PowerUpType;
  x: number;
  z: number;
  ttl: number;
}

export interface AsteroidObstacle {
  id: string;
  x: number;
  z: number;
  radius: number;
  variant: number;
}

export interface ComboBannerEvent {
  id: string;
  playerId: string;
  playerName: string;
  text: string;
  multiplier: number;
  colorHex: string;
}

export interface MatchSnapshot {
  tick: number;
  timeRemaining: number;
  elapsedTime: number;
  wave: number;
  mode: GameMode;
  teamAScore: number;
  teamBScore: number;
  teamAHpTotal: number;
  teamAMaxHpTotal: number;
  teamBHpTotal: number;
  teamBMaxHpTotal: number;
  ships: ShipState[];
  projectiles: ProjectileState[];
  powerUps: PowerUpEntity[];
  winnerTeam?: TeamId | 'DRAW';
  matchOver: boolean;
}

export interface MatchResultSummary {
  mode: GameMode;
  subMode: PlaySubMode;
  squadSize?: SquadSize;
  difficulty: Difficulty;
  winnerTeam: TeamId | 'DRAW';
  victoryForLocal: boolean;
  durationSec: number;
  teamAScore: number;
  teamBScore: number;
  localPlayerScore: number;
  localPlayerKills: number;
  localPlayerDeaths: number;
  localPlayerAccuracy: number;
  localPlayerMaxCombo: number;
  coinsEarned: number;
  xpEarned: number;
  shipUsed: ShipId;
  ships: ShipState[];
  waveReached?: number;
}

export interface ReplayFrame {
  t: number;
  ships: Array<{
    id: string;
    name: string;
    team: TeamId;
    shipId: ShipId;
    skinId: SkinId;
    isBoss?: boolean;
    x: number;
    z: number;
    angle: number;
    hp: number;
    maxHp: number;
    shield: number;
    alive: boolean;
    score: number;
  }>;
  projectiles: Array<{
    id: string;
    x: number;
    z: number;
    angle: number;
    kind: string;
    colorHex: string;
  }>;
  powerUps: Array<{
    id: string;
    type: PowerUpType;
    x: number;
    z: number;
  }>;
  teamAScore: number;
  teamBScore: number;
}

export interface MatchReplayData {
  id: string;
  dateIso: string;
  mode: GameMode;
  winnerLabel: string;
  durationSec: number;
  frames: ReplayFrame[];
}

export interface DailyMission {
  id: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  rewardCoins: number;
  rewardXp: number;
  claimed: boolean;
  metric: 'kills' | 'combo_hits' | 'matches_won' | 'powerups' | 'boss_kills';
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  rewardCoins: number;
}

export interface LeaderboardEntry {
  id: string;
  pilotName: string;
  score: number;
  mode: GameMode;
  shipId: ShipId;
  kills: number;
  maxCombo: number;
  createdAt: string;
  isOnline?: boolean;
}

export interface PlayerProfile {
  pilotName: string;
  coins: number;
  xp: number;
  level: number;
  selectedShip: ShipId;
  selectedSkin: SkinId;
  unlockedSkins: SkinId[];
  upgrades: PermanentUpgrades;
  missions: DailyMission[];
  achievements: Achievement[];
  keyBindings: KeyBindings;
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
  aimMode: 'mouse' | 'heading';
}

// Online Room Types
export interface RoomPlayerInfo {
  clientId: string;
  name: string;
  team: TeamId;
  shipId: ShipId;
  skinId: SkinId;
  ready: boolean;
  isHost: boolean;
  isHuman: true;
}

export interface RoomStatePayload {
  roomCode: string;
  mode: GameMode;
  squadSize: SquadSize;
  difficulty: Difficulty;
  fillBots: boolean;
  status: 'lobby' | 'playing' | 'ended';
  players: RoomPlayerInfo[];
}

export interface PlayerInputPacket {
  moveX: number;
  moveZ: number;
  aimX: number;
  aimZ: number;
  firing: boolean;
  fireMissile: boolean;
  useAbility: boolean;
  weaponSlot?: WeaponId;
}
