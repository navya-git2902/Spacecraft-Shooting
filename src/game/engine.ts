import {
  ARENA_HALF_SIZE,
  computeComboMultiplier,
  SHIPS,
  WEAPONS,
} from './catalog.ts';
import type {
  AsteroidObstacle,
  ComboBannerEvent,
  Difficulty,
  GameMode,
  MatchSnapshot,
  PermanentUpgrades,
  PlayerInputPacket,
  PowerUpEntity,
  PowerUpType,
  ProjectileState,
  ShipId,
  ShipState,
  SkinId,
  SquadSize,
  TeamId,
  WeaponId,
} from './types.ts';

export interface SimEvent {
  type:
    | 'laser'
    | 'missile'
    | 'hit'
    | 'explosion'
    | 'powerup'
    | 'ability'
    | 'combo';
  x?: number;
  z?: number;
  colorHex?: string;
  weapon?: WeaponId;
  shipId?: string;
  banner?: ComboBannerEvent;
  heavy?: boolean;
}

export interface SimulationConfig {
  mode: GameMode;
  squadSize: SquadSize;
  difficulty: Difficulty;
  matchDurationSec: number;
  participants: Array<{
    id: string;
    name: string;
    team: TeamId;
    shipId: ShipId;
    skinId: SkinId;
    isHuman: boolean;
    controlSlot?: 1 | 2;
    upgrades?: PermanentUpgrades;
  }>;
}

interface InternalShipMeta {
  fireCooldown: number;
  aiStrafeDir: number;
  aiDecisionTimer: number;
  damageMult: number;
  fireRateMult: number;
  speedBonus: number;
  blastBonus: number;
  reactorBonus: number;
  rapidParity: number;
}

const ALL_POWERUPS: PowerUpType[] = [
  'health',
  'speed',
  'rapid_fire',
  'double_damage',
  'shield',
  'missile_upgrade',
  'energy',
];

const BOT_NAMES = [
  'Lyra-7',
  'Vega Prime',
  'Cassiopeia',
  'Altair Bot',
  'Rigel Wing',
  'Nebula AI',
  'Sirius Scout',
  'Draco Unit',
];

export class SpacecraftSimulation {
  public mode: GameMode;
  public difficulty: Difficulty;
  public asteroids: AsteroidObstacle[] = [];
  public ships: ShipState[] = [];
  public projectiles: ProjectileState[] = [];
  public powerUps: PowerUpEntity[] = [];

  public tickCount = 0;
  public elapsedTime = 0;
  public timeRemaining: number;
  public wave = 1;
  public teamAScore = 0;
  public teamBScore = 0;
  public matchOver = false;
  public winnerTeam: TeamId | 'DRAW' | undefined;
  public powerUpsCollectedByLocal = 0;
  public bossKilledByLocal = false;

  private meta = new Map<string, InternalShipMeta>();
  private inputs = new Map<string, PlayerInputPacket>();
  private idCounter = 1;
  private powerUpSpawnTimer = 2.5;
  private survivalWaveDelay = 0;
  private survivalTickScoreTimer = 0;

  constructor(config: SimulationConfig) {
    this.mode = config.mode;
    this.difficulty = config.difficulty;
    this.timeRemaining = config.mode === 'survival' ? 0 : config.matchDurationSec;

    this.initAsteroids();
    this.initShips(config);
  }

  private nextId(prefix: string): string {
    this.idCounter += 1;
    return `${prefix}_${this.idCounter}`;
  }

  private initAsteroids(): void {
    const coords = [
      { x: -14, z: -12, r: 2.3, v: 0 },
      { x: 14, z: 12, r: 2.3, v: 1 },
      { x: -15, z: 13, r: 2.0, v: 2 },
      { x: 15, z: -13, r: 2.0, v: 3 },
      { x: 0, z: -19, r: 2.5, v: 4 },
      { x: 0, z: 19, r: 2.5, v: 5 },
    ];
    this.asteroids = coords.map((c, idx) => ({
      id: `ast_${idx}`,
      x: c.x,
      z: c.z,
      radius: c.r,
      variant: c.v,
    }));
  }

  private initShips(config: SimulationConfig): void {
    const teamACount = config.participants.filter((p) => p.team === 'A').length;
    const teamBCount = config.participants.filter((p) => p.team === 'B').length;
    let idxA = 0;
    let idxB = 0;

    for (const p of config.participants) {
      const cfg = SHIPS[p.shipId];
      const upg = p.upgrades || {
        hull: 0,
        thrusters: 0,
        capacitors: 0,
        cooling: 0,
        ordnance: 0,
        reactor: 0,
      };
      const maxHp = cfg.baseHp + upg.hull * 15;
      const isTeamA = p.team === 'A';
      const totalOnTeam = isTeamA ? teamACount : teamBCount;
      const slotIdx = isTeamA ? idxA++ : idxB++;
      const spread = (slotIdx - (totalOnTeam - 1) / 2) * 8;
      const spawnX = isTeamA ? -23 : 23;
      const spawnZ = spread;
      const angle = isTeamA ? Math.PI / 2 : -Math.PI / 2;

      this.ships.push({
        id: p.id,
        name: p.name,
        team: p.team,
        shipId: p.shipId,
        skinId: p.skinId,
        isHuman: p.isHuman,
        controlSlot: p.controlSlot,
        x: spawnX,
        z: spawnZ,
        vx: 0,
        vz: 0,
        angle,
        hp: maxHp,
        maxHp,
        shield: 0,
        maxShield: 80,
        energy: 100,
        maxEnergy: 100,
        score: 0,
        kills: 0,
        deaths: 0,
        hitsLanded: 0,
        shotsFired: 0,
        combo: 0,
        maxCombo: 0,
        multiplier: 1,
        activeWeapon: 'basic',
        missiles: 3 + upg.ordnance,
        maxMissiles: 4 + upg.ordnance,
        speedBoostTimer: 0,
        rapidFireTimer: 0,
        doubleDamageTimer: 0,
        invulnTimer: 1.0,
        hitFlashTimer: 0,
        respawnTimer: 0,
        alive: true,
        telegraphTimer: 0,
      });

      this.meta.set(p.id, {
        fireCooldown: 0,
        aiStrafeDir: Math.random() > 0.5 ? 1 : -1,
        aiDecisionTimer: 0.4 + Math.random() * 0.8,
        damageMult: cfg.baseDamageMult * (1 + upg.capacitors * 0.08),
        fireRateMult: cfg.baseFireRateMult * (1 + upg.cooling * 0.07),
        speedBonus: 1 + upg.thrusters * 0.06,
        blastBonus: 1 + upg.ordnance * 0.1,
        reactorBonus: 1 + upg.reactor * 0.1,
        rapidParity: 1,
      });
    }

    if (this.mode === 'survival') {
      this.spawnSurvivalWave(1);
    }
  }

  private spawnSurvivalWave(waveNum: number): void {
    this.wave = waveNum;
    const isBossWave = waveNum % 3 === 0;
    const enemyCount = isBossWave ? 2 + Math.floor(waveNum / 3) : 2 + waveNum;
    const shipPool: ShipId[] = ['sparrow', 'dart', 'aegis', 'bastion'];

    for (let i = 0; i < enemyCount; i++) {
      const ang = (i / enemyCount) * Math.PI * 2;
      const dist = 25;
      const shipId = shipPool[(waveNum + i) % shipPool.length];
      const cfg = SHIPS[shipId];
      const hp = Math.round(cfg.baseHp * (0.75 + waveNum * 0.12));
      const id = this.nextId('wave_bot');
      this.ships.push({
        id,
        name: BOT_NAMES[(waveNum + i) % BOT_NAMES.length],
        team: 'B',
        shipId,
        skinId: 'sakura',
        isHuman: false,
        x: Math.cos(ang) * dist,
        z: Math.sin(ang) * dist,
        vx: 0,
        vz: 0,
        angle: Math.atan2(-Math.cos(ang), -Math.sin(ang)),
        hp,
        maxHp: hp,
        shield: waveNum >= 4 ? 25 : 0,
        maxShield: 60,
        energy: 100,
        maxEnergy: 100,
        score: 0,
        kills: 0,
        deaths: 0,
        hitsLanded: 0,
        shotsFired: 0,
        combo: 0,
        maxCombo: 0,
        multiplier: 1,
        activeWeapon: waveNum >= 2 ? 'double' : 'basic',
        missiles: 2,
        maxMissiles: 2,
        speedBoostTimer: 0,
        rapidFireTimer: 0,
        doubleDamageTimer: 0,
        invulnTimer: 0.8,
        hitFlashTimer: 0,
        respawnTimer: 0,
        alive: true,
        telegraphTimer: 0,
      });
      this.meta.set(id, {
        fireCooldown: 0.4 + Math.random() * 0.5,
        aiStrafeDir: i % 2 === 0 ? 1 : -1,
        aiDecisionTimer: 0.8,
        damageMult: 0.72 + waveNum * 0.06,
        fireRateMult: 0.8 + waveNum * 0.04,
        speedBonus: 0.92,
        blastBonus: 1,
        reactorBonus: 1,
        rapidParity: 1,
      });
    }

    if (isBossWave) {
      const bossId = this.nextId('boss');
      const bossHp = 380 + waveNum * 65;
      this.ships.push({
        id: bossId,
        name: `Astral Weaver Mk.${Math.floor(waveNum / 3)}`,
        team: 'B',
        shipId: 'bastion',
        skinId: 'voidgold',
        isHuman: false,
        isBoss: true,
        x: 0,
        z: -26,
        vx: 0,
        vz: 0,
        angle: 0,
        hp: bossHp,
        maxHp: bossHp,
        shield: 80,
        maxShield: 120,
        energy: 100,
        maxEnergy: 100,
        score: 0,
        kills: 0,
        deaths: 0,
        hitsLanded: 0,
        shotsFired: 0,
        combo: 0,
        maxCombo: 0,
        multiplier: 1,
        activeWeapon: 'spread',
        missiles: 99,
        maxMissiles: 99,
        speedBoostTimer: 0,
        rapidFireTimer: 0,
        doubleDamageTimer: 0,
        invulnTimer: 1.0,
        hitFlashTimer: 0,
        respawnTimer: 0,
        alive: true,
        telegraphTimer: 0,
      });
      this.meta.set(bossId, {
        fireCooldown: 0.8,
        aiStrafeDir: 1,
        aiDecisionTimer: 1.5,
        damageMult: 1.15,
        fireRateMult: 1.0,
        speedBonus: 0.65,
        blastBonus: 1.25,
        reactorBonus: 1.2,
        rapidParity: 1,
      });
    }
  }

  public setPlayerInput(playerId: string, input: PlayerInputPacket): void {
    this.inputs.set(playerId, input);
  }

  public step(dt: number): SimEvent[] {
    if (this.matchOver) return [];
    const events: SimEvent[] = [];
    this.tickCount += 1;
    this.elapsedTime += dt;

    if (this.mode !== 'survival') {
      this.timeRemaining = Math.max(0, this.timeRemaining - dt);
      if (this.timeRemaining <= 0) {
        this.finishMatch();
        return events;
      }
    } else {
      // Survival tick points for surviving
      this.survivalTickScoreTimer += dt;
      if (this.survivalTickScoreTimer >= 1.0) {
        this.survivalTickScoreTimer -= 1.0;
        for (const s of this.ships) {
          if (s.team === 'A' && s.alive) {
            s.score += 10;
            this.teamAScore += 10;
          }
        }
      }
    }

    // Power-up spawning
    this.powerUpSpawnTimer -= dt;
    if (this.powerUpSpawnTimer <= 0 && this.powerUps.length < 5) {
      this.powerUpSpawnTimer = 5.5;
      this.spawnRandomPowerUp();
    }
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      this.powerUps[i].ttl -= dt;
      if (this.powerUps[i].ttl <= 0) {
        this.powerUps.splice(i, 1);
      }
    }

    // Update ships
    for (const s of this.ships) {
      const m = this.meta.get(s.id)!;
      if (!s.alive) {
        if (this.mode !== 'survival' || s.team === 'A') {
          s.respawnTimer -= dt;
          if (s.respawnTimer <= 0) {
            this.respawnShip(s);
          }
        }
        continue;
      }

      // Tick status timers
      s.speedBoostTimer = Math.max(0, s.speedBoostTimer - dt);
      s.rapidFireTimer = Math.max(0, s.rapidFireTimer - dt);
      s.doubleDamageTimer = Math.max(0, s.doubleDamageTimer - dt);
      s.invulnTimer = Math.max(0, s.invulnTimer - dt);
      s.hitFlashTimer = Math.max(0, s.hitFlashTimer - dt);
      m.fireCooldown = Math.max(0, m.fireCooldown - dt);
      s.energy = Math.min(s.maxEnergy, s.energy + 12 * m.reactorBonus * dt);

      // Boss telegraph attack handling
      if (s.isBoss && s.telegraphTimer > 0) {
        s.telegraphTimer -= dt;
        if (s.telegraphTimer <= 0) {
          this.fireBossNova(s, events);
        }
      }

      // Determine input (Human vs AI)
      const inp = s.isHuman
        ? this.inputs.get(s.id) || {
            moveX: 0,
            moveZ: 0,
            aimX: s.x + Math.sin(s.angle) * 5,
            aimZ: s.z + Math.cos(s.angle) * 5,
            firing: false,
            fireMissile: false,
            useAbility: false,
          }
        : this.computeAiInput(s, m, dt);

      if (inp.weaponSlot && s.activeWeapon !== inp.weaponSlot) {
        s.activeWeapon = inp.weaponSlot;
      }

      // Movement
      const cfg = SHIPS[s.shipId];
      const spdMult =
        (s.speedBoostTimer > 0 ? 1.42 : 1.0) * m.speedBonus;
      const targetSpeed = cfg.baseSpeed * spdMult;
      const moveLen = Math.hypot(inp.moveX, inp.moveZ);
      const nx = moveLen > 0.01 ? inp.moveX / Math.max(1, moveLen) : 0;
      const nz = moveLen > 0.01 ? inp.moveZ / Math.max(1, moveLen) : 0;

      const accel = 10.5;
      s.vx += (nx * targetSpeed - s.vx) * Math.min(1, accel * dt);
      s.vz += (nz * targetSpeed - s.vz) * Math.min(1, accel * dt);
      s.x += s.vx * dt;
      s.z += s.vz * dt;

      // Clamp to arena bounds
      const bound = ARENA_HALF_SIZE - (s.isBoss ? 3.2 : 1.5);
      s.x = Math.max(-bound, Math.min(bound, s.x));
      s.z = Math.max(-bound, Math.min(bound, s.z));

      // Asteroid obstacle push-out
      const shipRad = s.isBoss ? 2.8 : 1.35;
      for (const ast of this.asteroids) {
        const dx = s.x - ast.x;
        const dz = s.z - ast.z;
        const dist = Math.hypot(dx, dz);
        const minDist = ast.radius + shipRad;
        if (dist < minDist && dist > 0.001) {
          const push = minDist - dist;
          s.x += (dx / dist) * push;
          s.z += (dz / dist) * push;
        }
      }

      // Aiming angle (+Z is 0 rad, +X is +PI/2 rad because sin(a), cos(a))
      const aimDx = inp.aimX - s.x;
      const aimDz = inp.aimZ - s.z;
      if (aimDx * aimDx + aimDz * aimDz > 0.05) {
        s.angle = Math.atan2(aimDx, aimDz);
      } else if (moveLen > 0.1) {
        s.angle = Math.atan2(nx, nz);
      }

      // Special ability (Shift)
      if (inp.useAbility && s.energy >= 100) {
        this.triggerSpecialAbility(s, m, nx, nz, events);
      }

      // Special missile (E)
      if (inp.fireMissile && s.missiles > 0 && m.fireCooldown <= 0) {
        this.fireWeapon(s, m, 'missile', events);
      } else if (inp.firing && m.fireCooldown <= 0) {
        this.fireWeapon(s, m, s.activeWeapon, events);
      }

      // PowerUp pickup
      for (let i = this.powerUps.length - 1; i >= 0; i--) {
        const pu = this.powerUps[i];
        const d = Math.hypot(s.x - pu.x, s.z - pu.z);
        if (d < (s.isBoss ? 3.4 : 2.1)) {
          this.applyPowerUp(s, pu, events);
          this.powerUps.splice(i, 1);
        }
      }
    }

    // Update projectiles & collisions
    this.updateProjectiles(dt, events);

    // Check Survival Wave progression / defeat
    if (this.mode === 'survival') {
      const alivePlayers = this.ships.filter((s) => s.team === 'A' && s.alive);
      if (alivePlayers.length === 0) {
        this.matchOver = true;
        this.winnerTeam = 'B';
        return events;
      }
      const aliveEnemies = this.ships.filter((s) => s.team === 'B' && s.alive);
      if (aliveEnemies.length === 0) {
        this.survivalWaveDelay += dt;
        if (this.survivalWaveDelay >= 2.2) {
          this.survivalWaveDelay = 0;
          // Prune dead wave bots before spawning next wave
          this.ships = this.ships.filter((s) => s.team === 'A');
          this.spawnSurvivalWave(this.wave + 1);
        }
      }
    }

    return events;
  }

  private triggerSpecialAbility(
    s: ShipState,
    m: InternalShipMeta,
    nx: number,
    nz: number,
    events: SimEvent[],
  ): void {
    s.energy = 0;
    events.push({
      type: 'ability',
      x: s.x,
      z: s.z,
      colorHex: SHIPS[s.shipId].accentHex,
      shipId: s.id,
    });

    if (s.shipId === 'sparrow') {
      // Phase Dash
      const dirX = Math.abs(nx) + Math.abs(nz) > 0.1 ? nx : Math.sin(s.angle);
      const dirZ = Math.abs(nx) + Math.abs(nz) > 0.1 ? nz : Math.cos(s.angle);
      const len = Math.hypot(dirX, dirZ) || 1;
      s.x = Math.max(
        -ARENA_HALF_SIZE + 2,
        Math.min(ARENA_HALF_SIZE - 2, s.x + (dirX / len) * 8.5),
      );
      s.z = Math.max(
        -ARENA_HALF_SIZE + 2,
        Math.min(ARENA_HALF_SIZE - 2, s.z + (dirZ / len) * 8.5),
      );
      s.invulnTimer = 0.65;
      s.speedBoostTimer = Math.max(s.speedBoostTimer, 2.0);
    } else if (s.shipId === 'aegis') {
      s.shield = Math.min(s.maxShield, s.shield + 55);
      s.invulnTimer = 0.4;
    } else if (s.shipId === 'dart') {
      s.rapidFireTimer = Math.max(s.rapidFireTimer, 4.2);
      s.speedBoostTimer = Math.max(s.speedBoostTimer, 4.2);
    } else {
      // bastion Salvo Barrage
      for (const offset of [-0.24, 0, 0.24]) {
        this.spawnProjectile(s, m, 'missile', s.angle + offset, 0);
      }
    }
  }

  private fireWeapon(
    s: ShipState,
    m: InternalShipMeta,
    weapon: WeaponId,
    events: SimEvent[],
  ): void {
    const cfg = WEAPONS[weapon];
    const rofMult = (s.rapidFireTimer > 0 ? 1.6 : 1.0) * m.fireRateMult;
    m.fireCooldown = cfg.cooldown / rofMult;

    if (weapon === 'missile') {
      if (s.missiles <= 0) return;
      s.missiles -= 1;
      this.spawnProjectile(s, m, 'missile', s.angle, 0);
      s.shotsFired += 1;
      events.push({ type: 'missile', x: s.x, z: s.z, weapon, shipId: s.id });
      return;
    }

    if (weapon === 'double') {
      this.spawnProjectile(s, m, 'double', s.angle, -0.45);
      this.spawnProjectile(s, m, 'double', s.angle, 0.45);
      s.shotsFired += 2;
    } else if (weapon === 'spread') {
      this.spawnProjectile(s, m, 'spread', s.angle - 0.2, 0);
      this.spawnProjectile(s, m, 'spread', s.angle, 0);
      this.spawnProjectile(s, m, 'spread', s.angle + 0.2, 0);
      s.shotsFired += 3;
    } else if (weapon === 'rapid') {
      m.rapidParity *= -1;
      this.spawnProjectile(s, m, 'rapid', s.angle, m.rapidParity * 0.35);
      s.shotsFired += 1;
    } else {
      this.spawnProjectile(s, m, 'basic', s.angle, 0);
      s.shotsFired += 1;
    }

    events.push({ type: 'laser', x: s.x, z: s.z, weapon, shipId: s.id });
  }

  private spawnProjectile(
    s: ShipState,
    m: InternalShipMeta,
    kind: WeaponId | 'boss_orb',
    angle: number,
    lateralOffset: number,
  ): void {
    const isBossOrb = kind === 'boss_orb';
    const cfg = isBossOrb ? WEAPONS.double : WEAPONS[kind];
    const dmg =
      (isBossOrb ? 14 : cfg.damage) *
      m.damageMult *
      (s.doubleDamageTimer > 0 ? 2.0 : 1.0);

    const fwdX = Math.sin(angle);
    const fwdZ = Math.cos(angle);
    const rightX = Math.cos(angle);
    const rightZ = -Math.sin(angle);
    const muzzleDist = s.isBoss ? 2.9 : 1.45;

    const speed = isBossOrb ? 21 : cfg.projectileSpeed;
    this.projectiles.push({
      id: this.nextId('proj'),
      ownerId: s.id,
      team: s.team,
      kind,
      x: s.x + fwdX * muzzleDist + rightX * lateralOffset,
      z: s.z + fwdZ * muzzleDist + rightZ * lateralOffset,
      vx: fwdX * speed,
      vz: fwdZ * speed,
      angle,
      damage: dmg,
      radius: kind === 'missile' ? 0.52 : isBossOrb ? 0.45 : 0.32,
      ttl: kind === 'missile' ? 1.85 : 1.35,
      colorHex: isBossOrb ? '#FB7185' : cfg.colorHex,
      isSplash: kind === 'missile',
      splashRadius: kind === 'missile' ? 5.2 * m.blastBonus : 0,
    });
  }

  private fireBossNova(boss: ShipState, events: SimEvent[]): void {
    const m = this.meta.get(boss.id)!;
    const count = 12;
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2 + this.elapsedTime;
      this.spawnProjectile(boss, m, 'boss_orb', ang, 0);
    }
    events.push({ type: 'missile', x: boss.x, z: boss.z, shipId: boss.id });
  }

  private updateProjectiles(dt: number, events: SimEvent[]): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx * dt;
      p.z += p.vz * dt;
      p.ttl -= dt;

      // Out of bounds
      if (
        p.ttl <= 0 ||
        Math.abs(p.x) > ARENA_HALF_SIZE + 1 ||
        Math.abs(p.z) > ARENA_HALF_SIZE + 1
      ) {
        this.resetComboOnMiss(p.ownerId);
        this.projectiles.splice(i, 1);
        continue;
      }

      // Asteroid hit
      let hitAst = false;
      for (const ast of this.asteroids) {
        if (Math.hypot(p.x - ast.x, p.z - ast.z) < ast.radius + p.radius) {
          hitAst = true;
          break;
        }
      }
      if (hitAst) {
        if (p.isSplash && p.splashRadius) {
          this.applySplashDamage(p, events);
        } else {
          this.resetComboOnMiss(p.ownerId);
        }
        events.push({
          type: 'hit',
          x: p.x,
          z: p.z,
          colorHex: p.colorHex,
        });
        this.projectiles.splice(i, 1);
        continue;
      }

      // Ship hit
      let hitShip: ShipState | null = null;
      for (const s of this.ships) {
        if (!s.alive || s.team === p.team) continue;
        const hitRad = (s.isBoss ? 2.75 : 1.35) + p.radius;
        if (Math.hypot(p.x - s.x, p.z - s.z) < hitRad) {
          hitShip = s;
          break;
        }
      }

      if (hitShip) {
        if (p.isSplash && p.splashRadius) {
          this.applySplashDamage(p, events);
        } else {
          this.applyHitDamage(p.ownerId, hitShip, p.damage, p.colorHex, events);
        }
        this.projectiles.splice(i, 1);
      }
    }
  }

  private applySplashDamage(p: ProjectileState, events: SimEvent[]): void {
    let anyHit = false;
    for (const s of this.ships) {
      if (!s.alive || s.team === p.team) continue;
      const dist = Math.hypot(p.x - s.x, p.z - s.z);
      if (dist <= (p.splashRadius || 5.2)) {
        const falloff = 1 - Math.min(0.6, (dist / (p.splashRadius || 5.2)) * 0.55);
        this.applyHitDamage(
          p.ownerId,
          s,
          p.damage * falloff,
          p.colorHex,
          events,
        );
        anyHit = true;
      }
    }
    if (!anyHit) {
      this.resetComboOnMiss(p.ownerId);
    }
    events.push({
      type: 'explosion',
      x: p.x,
      z: p.z,
      colorHex: '#FB7185',
      heavy: true,
    });
  }

  private applyHitDamage(
    attackerId: string,
    target: ShipState,
    rawDamage: number,
    colorHex: string,
    events: SimEvent[],
  ): void {
    const attacker = this.ships.find((sh) => sh.id === attackerId);
    if (target.invulnTimer > 0) return;

    target.hitFlashTimer = 0.12;
    let remainingDmg = rawDamage;

    if (target.shield > 0) {
      const absorbed = Math.min(target.shield, remainingDmg);
      target.shield -= absorbed;
      remainingDmg -= absorbed;
    } else {
      // Taking unshielded hull damage resets target's combo
      target.combo = 0;
      target.multiplier = 1;
    }

    target.hp = Math.max(0, target.hp - remainingDmg);

    // Update attacker combo & score
    if (attacker) {
      attacker.hitsLanded += 1;
      attacker.combo += 1;
      attacker.maxCombo = Math.max(attacker.maxCombo, attacker.combo);
      const prevMult = attacker.multiplier;
      const comboInfo = computeComboMultiplier(attacker.combo);
      attacker.multiplier = comboInfo.multiplier;

      const hitPoints = Math.round(15 * attacker.multiplier);
      attacker.score += hitPoints;
      if (attacker.team === 'A') this.teamAScore += hitPoints;
      else this.teamBScore += hitPoints;

      if (comboInfo.label && attacker.multiplier > prevMult) {
        events.push({
          type: 'combo',
          shipId: attacker.id,
          banner: {
            id: this.nextId('cmb'),
            playerId: attacker.id,
            playerName: attacker.name,
            text: comboInfo.label,
            multiplier: comboInfo.multiplier,
            colorHex: comboInfo.colorHex,
          },
        });
      }
    }

    events.push({
      type: 'hit',
      x: target.x,
      z: target.z,
      colorHex,
    });

    if (target.hp <= 0) {
      target.alive = false;
      target.deaths += 1;
      target.respawnTimer = 2.6;
      target.combo = 0;
      target.multiplier = 1;

      if (attacker) {
        attacker.kills += 1;
        const killBonus = (target.isBoss ? 800 : 250) * attacker.multiplier;
        attacker.score += killBonus;
        if (attacker.team === 'A') this.teamAScore += killBonus;
        else this.teamBScore += killBonus;
        if (target.isBoss && attacker.isHuman) {
          this.bossKilledByLocal = true;
        }
      }

      events.push({
        type: 'explosion',
        x: target.x,
        z: target.z,
        colorHex: target.team === 'A' ? '#38BDF8' : '#F472B6',
        heavy: true,
      });
    }
  }

  private resetComboOnMiss(ownerId: string): void {
    const s = this.ships.find((sh) => sh.id === ownerId);
    if (s && s.combo > 0) {
      s.combo = 0;
      s.multiplier = 1;
    }
  }

  private respawnShip(s: ShipState): void {
    const isTeamA = s.team === 'A';
    s.x = isTeamA ? -22 : 22;
    s.z = (Math.random() - 0.5) * 20;
    s.vx = 0;
    s.vz = 0;
    s.hp = s.maxHp;
    s.shield = 0;
    s.energy = 100;
    s.missiles = Math.max(s.missiles, 2);
    s.invulnTimer = 1.6;
    s.alive = true;
  }

  private spawnRandomPowerUp(): void {
    const type = ALL_POWERUPS[Math.floor(Math.random() * ALL_POWERUPS.length)];
    for (let tries = 0; tries < 10; tries++) {
      const x = (Math.random() - 0.5) * (ARENA_HALF_SIZE * 1.4);
      const z = (Math.random() - 0.5) * (ARENA_HALF_SIZE * 1.4);
      const blocked = this.asteroids.some(
        (a) => Math.hypot(x - a.x, z - a.z) < a.radius + 2.2,
      );
      if (!blocked) {
        this.powerUps.push({
          id: this.nextId('pu'),
          type,
          x,
          z,
          ttl: 18,
        });
        return;
      }
    }
  }

  private applyPowerUp(
    s: ShipState,
    pu: PowerUpEntity,
    events: SimEvent[],
  ): void {
    if (pu.type === 'health') {
      s.hp = Math.min(s.maxHp, s.hp + 35);
    } else if (pu.type === 'speed') {
      s.speedBoostTimer = 8.0;
    } else if (pu.type === 'rapid_fire') {
      s.rapidFireTimer = 8.0;
    } else if (pu.type === 'double_damage') {
      s.doubleDamageTimer = 8.0;
    } else if (pu.type === 'shield') {
      s.shield = Math.min(s.maxShield, s.shield + 60);
    } else if (pu.type === 'missile_upgrade') {
      s.missiles = Math.min(s.maxMissiles, s.missiles + 2);
    } else if (pu.type === 'energy') {
      s.energy = s.maxEnergy;
    }

    s.score += 50;
    if (s.team === 'A') this.teamAScore += 50;
    else this.teamBScore += 50;

    if (s.isHuman && s.controlSlot === 1) {
      this.powerUpsCollectedByLocal += 1;
    }

    events.push({
      type: 'powerup',
      x: pu.x,
      z: pu.z,
      shipId: s.id,
    });
  }

  private computeAiInput(
    s: ShipState,
    m: InternalShipMeta,
    dt: number,
  ): PlayerInputPacket {
    m.aiDecisionTimer -= dt;
    if (m.aiDecisionTimer <= 0) {
      m.aiDecisionTimer = 0.65 + Math.random() * 0.9;
      if (Math.random() < 0.35) m.aiStrafeDir *= -1;
      if (s.isBoss && s.telegraphTimer <= 0 && Math.random() < 0.35) {
        s.telegraphTimer = 1.1;
        s.telegraphType = 'nova';
      }
    }

    // Find nearest enemy
    let nearest: ShipState | null = null;
    let bestDist = Infinity;
    for (const other of this.ships) {
      if (!other.alive || other.team === s.team) continue;
      const d = Math.hypot(other.x - s.x, other.z - s.z);
      if (d < bestDist) {
        bestDist = d;
        nearest = other;
      }
    }

    if (!nearest) {
      return {
        moveX: 0,
        moveZ: 0,
        aimX: s.x,
        aimZ: s.z + 5,
        firing: false,
        fireMissile: false,
        useAbility: false,
      };
    }

    const dx = nearest.x - s.x;
    const dz = nearest.z - s.z;
    const dist = Math.max(0.001, Math.hypot(dx, dz));
    const dirX = dx / dist;
    const dirZ = dz / dist;

    // Seek powerup if low HP
    let moveX = 0;
    let moveZ = 0;
    if (s.hp < s.maxHp * 0.45 && this.powerUps.length > 0) {
      const pu = this.powerUps[0];
      const pdx = pu.x - s.x;
      const pdz = pu.z - s.z;
      const pd = Math.hypot(pdx, pdz) || 1;
      moveX = pdx / pd;
      moveZ = pdz / pd;
    } else {
      const desiredRange = s.isBoss ? 14 : 11;
      const radialFactor = dist > desiredRange + 3 ? 0.75 : dist < desiredRange - 3 ? -0.6 : 0;
      const perpX = -dirZ * m.aiStrafeDir;
      const perpZ = dirX * m.aiStrafeDir;
      moveX = dirX * radialFactor + perpX * 0.75;
      moveZ = dirZ * radialFactor + perpZ * 0.75;
    }

    const diffFireChance =
      this.difficulty === 'easy' ? 0.55 : this.difficulty === 'medium' ? 0.8 : 0.96;
    const firing = dist < 30 && Math.random() < diffFireChance;
    const fireMissile =
      s.missiles > 0 && dist < 24 && Math.random() < (this.difficulty === 'hard' ? 0.06 : 0.02);
    const useAbility = s.energy >= 100 && Math.random() < 0.04;

    // Slight aim jitter on Easy
    const jitter = this.difficulty === 'easy' ? 2.5 : this.difficulty === 'medium' ? 1.1 : 0.25;
    return {
      moveX,
      moveZ,
      aimX: nearest.x + Math.sin(this.elapsedTime * 3) * jitter,
      aimZ: nearest.z + Math.cos(this.elapsedTime * 3) * jitter,
      firing,
      fireMissile,
      useAbility,
    };
  }

  private finishMatch(): void {
    this.matchOver = true;
    if (this.teamAScore > this.teamBScore) this.winnerTeam = 'A';
    else if (this.teamBScore > this.teamAScore) this.winnerTeam = 'B';
    else this.winnerTeam = 'DRAW';
  }

  public getSnapshot(): MatchSnapshot {
    let teamAHpTotal = 0;
    let teamAMaxHpTotal = 0;
    let teamBHpTotal = 0;
    let teamBMaxHpTotal = 0;

    for (const s of this.ships) {
      if (s.team === 'A') {
        teamAHpTotal += s.alive ? Math.ceil(s.hp) : 0;
        teamAMaxHpTotal += s.maxHp;
      } else {
        teamBHpTotal += s.alive ? Math.ceil(s.hp) : 0;
        teamBMaxHpTotal += s.maxHp;
      }
    }

    return {
      tick: this.tickCount,
      timeRemaining: this.timeRemaining,
      elapsedTime: this.elapsedTime,
      wave: this.wave,
      mode: this.mode,
      teamAScore: this.teamAScore,
      teamBScore: this.teamBScore,
      teamAHpTotal,
      teamAMaxHpTotal,
      teamBHpTotal,
      teamBMaxHpTotal,
      ships: this.ships.map((s) => ({ ...s })),
      projectiles: this.projectiles.map((p) => ({ ...p })),
      powerUps: this.powerUps.map((pu) => ({ ...pu })),
      winnerTeam: this.winnerTeam,
      matchOver: this.matchOver,
    };
  }
}
