import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GameplayHud } from './components/GameplayHud';
import { HangarUpgradesModal } from './components/HangarUpgradesModal';
import { GameOverModal, PauseModal } from './components/MatchModals';
import { MatchSetupModal } from './components/MatchSetupModal';
import { ProgressionModal } from './components/ProgressionModal';
import {
  HowToPlayModal,
  SettingsModal,
} from './components/SettingsHelpModal';
import { OfflineIndicator } from './components/PWAInstallButton';
import { TitleScreen } from './components/TitleScreen';
import { soundEngine } from './game/audio';
import { SKINS } from './game/catalog';
import { SimEvent, SimulationConfig, SpacecraftSimulation } from './game/engine';
import { onlineClient } from './game/multiplayer';
import {
  applyMatchProgression,
  getUpgradeCost,
  loadLastReplay,
  loadProfile,
  saveLastReplay,
  saveProfile,
} from './game/progression';
import { ProjectedShipLabel, SpaceArenaRenderer } from './game/spaceScene';
import {
  ComboBannerEvent,
  Difficulty,
  GameMode,
  KeyBindings,
  MatchReplayData,
  MatchResultSummary,
  MatchSnapshot,
  PermanentUpgrades,
  PlayerInputPacket,
  PlayerProfile,
  PlaySubMode,
  ReplayFrame,
  RoomStatePayload,
  ShipId,
  SkinId,
  SquadSize,
  TeamId,
  WeaponId,
} from './game/types';

type ScreenState = 'menu' | 'playing' | 'paused' | 'gameover' | 'replay';
type OverlayModal =
  | 'none'
  | 'setup'
  | 'upgrades'
  | 'progression'
  | 'settings'
  | 'help';

interface ActiveMatchMeta {
  mode: GameMode;
  subMode: PlaySubMode;
  squadSize: SquadSize;
  difficulty: Difficulty;
  localShipId: string;
  p2ShipId?: string;
  config?: SimulationConfig;
}

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<SpaceArenaRenderer | null>(null);

  const [profile, setProfile] = useState<PlayerProfile>(() => {
    const loaded = loadProfile();
    soundEngine.setVolumes(loaded.musicVolume, loaded.sfxVolume, loaded.muted);
    return loaded;
  });

  const [screen, setScreen] = useState<ScreenState>('menu');
  const [modal, setModal] = useState<OverlayModal>('none');
  const [webglLost, setWebglLost] = useState(false);

  // HUD & Match States
  const [hudSnapshot, setHudSnapshot] = useState<MatchSnapshot | null>(null);
  const [projectedLabels, setProjectedLabels] = useState<ProjectedShipLabel[]>([]);
  const [comboBanner, setComboBanner] = useState<ComboBannerEvent | null>(null);
  const [matchSummary, setMatchSummary] = useState<MatchResultSummary | null>(null);
  const [newAchievements, setNewAchievements] = useState<string[]>([]);
  const [hasReplay, setHasReplay] = useState<boolean>(() => Boolean(loadLastReplay()));

  // Replay States
  const [replayPaused, setReplayPaused] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState<1 | 2>(1);
  const [replayProgress, setReplayProgress] = useState(0);

  // Online Multiplayer States
  const [onlineConnected, setOnlineConnected] = useState(false);
  const [localClientId, setLocalClientId] = useState<string | null>(null);
  const [roomState, setRoomState] = useState<RoomStatePayload | null>(null);
  const [roomError, setRoomError] = useState<string | null>(null);

  // Mutable refs for 60fps loop isolation
  const screenRef = useRef<ScreenState>('menu');
  const profileRef = useRef<PlayerProfile>(profile);
  const simRef = useRef<SpacecraftSimulation | null>(null);
  const showcaseSimRef = useRef<SpacecraftSimulation | null>(null);
  const activeMetaRef = useRef<ActiveMatchMeta | null>(null);
  const onlineSnapshotRef = useRef<MatchSnapshot | null>(null);
  const hitstopRef = useRef(0);
  const comboTimerRef = useRef<number | null>(null);

  // Input refs
  const heldKeysRef = useRef<Set<string>>(new Set());
  const mouseDownRef = useRef(false);
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pendingMissileP1Ref = useRef(false);
  const pendingAbilityP1Ref = useRef(false);
  const pendingMissileP2Ref = useRef(false);
  const pendingAbilityP2Ref = useRef(false);
  const selectedWeaponP1Ref = useRef<WeaponId>('basic');
  const onlineInputAccumRef = useRef(0);

  // Replay refs
  const recordedFramesRef = useRef<ReplayFrame[]>([]);
  const recordAccumRef = useRef(0);
  const replayDataRef = useRef<MatchReplayData | null>(null);
  const replayTimeRef = useRef(0);
  const replayPausedRef = useRef(false);
  const replaySpeedRef = useRef<1 | 2>(1);

  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);

  useEffect(() => {
    profileRef.current = profile;
    saveProfile(profile);
    soundEngine.setVolumes(profile.musicVolume, profile.sfxVolume, profile.muted);
  }, [profile]);

  useEffect(() => {
    replayPausedRef.current = replayPaused;
  }, [replayPaused]);

  useEffect(() => {
    replaySpeedRef.current = replaySpeed;
  }, [replaySpeed]);

  const showComboBanner = useCallback((banner: ComboBannerEvent) => {
    setComboBanner(banner);
    if (comboTimerRef.current !== null) {
      window.clearTimeout(comboTimerRef.current);
    }
    comboTimerRef.current = window.setTimeout(() => {
      setComboBanner(null);
    }, 1700);
  }, []);

  const handleSimEvents = useCallback(
    (events: SimEvent[], localId: string) => {
      const renderer = rendererRef.current;
      for (const ev of events) {
        if (ev.type === 'laser' && ev.shipId === localId && ev.weapon) {
          soundEngine.playLaser(ev.weapon);
        } else if (ev.type === 'missile') {
          soundEngine.playMissile();
        } else if (ev.type === 'hit') {
          if (renderer && ev.x !== undefined && ev.z !== undefined) {
            renderer.spawnExplosion(
              ev.x,
              ev.z,
              ev.colorHex || '#38BDF8',
              10,
              7,
            );
          }
          soundEngine.playHit();
        } else if (ev.type === 'explosion') {
          if (renderer && ev.x !== undefined && ev.z !== undefined) {
            renderer.spawnExplosion(
              ev.x,
              ev.z,
              ev.colorHex || '#FB7185',
              ev.heavy ? 36 : 18,
              ev.heavy ? 14 : 9,
            );
            if (ev.heavy) {
              renderer.addCameraShake(0.62);
              hitstopRef.current = 0.04;
            }
          }
          soundEngine.playExplosion();
        } else if (ev.type === 'powerup' && ev.shipId === localId) {
          soundEngine.playPowerUp();
        } else if (ev.type === 'ability' && ev.shipId === localId) {
          soundEngine.playAbility();
        } else if (ev.type === 'combo' && ev.banner) {
          if (ev.shipId === localId) {
            soundEngine.playComboMilestone(ev.banner.multiplier);
            showComboBanner(ev.banner);
          }
        }
      }
    },
    [showComboBanner],
  );

  const finalizeMatch = useCallback((finalSnapshot: MatchSnapshot) => {
    const meta = activeMetaRef.current;
    if (!meta) return;

    const localShip =
      finalSnapshot.ships.find((s) => s.id === meta.localShipId) ||
      finalSnapshot.ships[0];
    const victory =
      meta.mode === 'survival'
        ? false
        : finalSnapshot.winnerTeam === (localShip?.team || 'A');

    const accuracy =
      localShip && localShip.shotsFired > 0
        ? Math.round((localShip.hitsLanded / localShip.shotsFired) * 100)
        : 0;

    const baseCoins = Math.round((localShip?.score || 0) / 35);
    const coinsEarned = Math.max(
      25,
      baseCoins + (victory ? 80 : 25) + (meta.mode === 'survival' ? finalSnapshot.wave * 20 : 0),
    );
    const xpEarned = Math.max(40, Math.round(coinsEarned * 1.4));

    const summary: MatchResultSummary = {
      mode: meta.mode,
      subMode: meta.subMode,
      squadSize: meta.squadSize,
      difficulty: meta.difficulty,
      winnerTeam: finalSnapshot.winnerTeam || 'DRAW',
      victoryForLocal: victory,
      durationSec: Math.round(finalSnapshot.elapsedTime),
      teamAScore: finalSnapshot.teamAScore,
      teamBScore: finalSnapshot.teamBScore,
      localPlayerScore: localShip?.score || 0,
      localPlayerKills: localShip?.kills || 0,
      localPlayerDeaths: localShip?.deaths || 0,
      localPlayerAccuracy: accuracy,
      localPlayerMaxCombo: localShip?.maxCombo || 0,
      coinsEarned,
      xpEarned,
      shipUsed: localShip?.shipId || profileRef.current.selectedShip,
      ships: finalSnapshot.ships,
      waveReached: meta.mode === 'survival' ? finalSnapshot.wave : undefined,
    };

    const sim = simRef.current;
    const { updatedProfile, newlyUnlockedAchievements } = applyMatchProgression(
      profileRef.current,
      summary,
      sim?.powerUpsCollectedByLocal || 0,
      sim?.bossKilledByLocal || false,
    );

    setProfile(updatedProfile);
    setNewAchievements(newlyUnlockedAchievements);
    setMatchSummary(summary);

    // Save Replay
    if (recordedFramesRef.current.length > 4) {
      const replayObj: MatchReplayData = {
        id: `rep_${Date.now()}`,
        dateIso: new Date().toISOString(),
        mode: meta.mode,
        winnerLabel:
          summary.winnerTeam === 'DRAW'
            ? 'Draw'
            : `Team ${summary.winnerTeam} Victory`,
        durationSec: finalSnapshot.elapsedTime,
        frames: recordedFramesRef.current,
      };
      saveLastReplay(replayObj);
      setHasReplay(true);
    }

    // Submit score to server leaderboard
    if (localShip && localShip.score > 0) {
      fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pilotName: updatedProfile.pilotName,
          score: localShip.score,
          mode: meta.mode,
          shipId: localShip.shipId,
          kills: localShip.kills,
          maxCombo: localShip.maxCombo,
          isOnline: meta.subMode === 'online',
        }),
      }).catch(() => {});
    }

    soundEngine.playMatchEnd(victory);
    setScreen('gameover');
    screenRef.current = 'gameover';
  }, []);

  const buildLocalInputPacket = useCallback((ship: { x: number; z: number; angle: number } | undefined): PlayerInputPacket => {
    const kb = profileRef.current.keyBindings;
    const held = heldKeysRef.current;
    const isLocal2P = activeMetaRef.current?.subMode === 'local2p';

    // Screen-aligned isometric directions: Up = (-1, -1), Right = (+1, -1)
    let sx = 0;
    let sy = 0;
    if (held.has(kb.up) || (!isLocal2P && held.has('ArrowUp'))) sy -= 1;
    if (held.has(kb.down) || (!isLocal2P && held.has('ArrowDown'))) sy += 1;
    if (held.has(kb.left) || (!isLocal2P && held.has('ArrowLeft'))) sx -= 1;
    if (held.has(kb.right) || (!isLocal2P && held.has('ArrowRight'))) sx += 1;

    // Convert screen axes to isometric world X/Z (camera at +32, +38, +32)
    const moveX = sx + sy;
    const moveZ = sy - sx;

    let aimX = (ship?.x || 0) + Math.sin(ship?.angle || 0) * 8;
    let aimZ = (ship?.z || 0) + Math.cos(ship?.angle || 0) * 8;

    if (profileRef.current.aimMode === 'mouse' && !isLocal2P && rendererRef.current) {
      const worldPt = rendererRef.current.getAimWorldPoint(
        mousePosRef.current.x,
        mousePosRef.current.y,
      );
      if (worldPt) {
        aimX = worldPt.x;
        aimZ = worldPt.z;
      }
    } else if (Math.abs(moveX) + Math.abs(moveZ) > 0.1) {
      aimX = (ship?.x || 0) + moveX * 10;
      aimZ = (ship?.z || 0) + moveZ * 10;
    }

    const firing = held.has(kb.shoot) || (!isLocal2P && mouseDownRef.current);
    const fireMissile = pendingMissileP1Ref.current;
    const useAbility = pendingAbilityP1Ref.current;
    pendingMissileP1Ref.current = false;
    pendingAbilityP1Ref.current = false;

    return {
      moveX,
      moveZ,
      aimX,
      aimZ,
      firing,
      fireMissile,
      useAbility,
      weaponSlot: selectedWeaponP1Ref.current,
    };
  }, []);

  const buildP2InputPacket = useCallback((ship: { x: number; z: number; angle: number } | undefined): PlayerInputPacket => {
    const held = heldKeysRef.current;
    let sx = 0;
    let sy = 0;
    if (held.has('ArrowUp')) sy -= 1;
    if (held.has('ArrowDown')) sy += 1;
    if (held.has('ArrowLeft')) sx -= 1;
    if (held.has('ArrowRight')) sx += 1;

    const moveX = sx + sy;
    const moveZ = sy - sx;
    const aimX =
      Math.abs(moveX) + Math.abs(moveZ) > 0.1
        ? (ship?.x || 0) + moveX * 10
        : (ship?.x || 0) + Math.sin(ship?.angle || 0) * 8;
    const aimZ =
      Math.abs(moveX) + Math.abs(moveZ) > 0.1
        ? (ship?.z || 0) + moveZ * 10
        : (ship?.z || 0) + Math.cos(ship?.angle || 0) * 8;

    const fireMissile = pendingMissileP2Ref.current;
    const useAbility = pendingAbilityP2Ref.current;
    pendingMissileP2Ref.current = false;
    pendingAbilityP2Ref.current = false;

    return {
      moveX,
      moveZ,
      aimX,
      aimZ,
      firing: held.has('Enter'),
      fireMissile,
      useAbility,
    };
  }, []);

  // Mount Three.js Arena Once
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const renderer = new SpaceArenaRenderer(container, () => setWebglLost(true));
    rendererRef.current = renderer;

    // Create ambient AI showcase skirmish for live Title Screen background
    const showcase = new SpacecraftSimulation({
      mode: 'squad',
      squadSize: 2,
      difficulty: 'medium',
      matchDurationSec: 9999,
      participants: [
        { id: 'demo_1', name: 'Sparrow-1', team: 'A', shipId: 'sparrow', skinId: 'starlight', isHuman: false },
        { id: 'demo_2', name: 'Aegis-2', team: 'A', shipId: 'aegis', skinId: 'aurora', isHuman: false },
        { id: 'demo_3', name: 'Dart-1', team: 'B', shipId: 'dart', skinId: 'sakura', isHuman: false },
        { id: 'demo_4', name: 'Bastion-2', team: 'B', shipId: 'bastion', skinId: 'voidgold', isHuman: false },
      ],
    });
    showcaseSimRef.current = showcase;
    renderer.syncAsteroids(showcase.asteroids);

    let uiSyncAccum = 0;

    renderer.scheduleLoop((dt) => {
      const currentScreen = screenRef.current;

      if (currentScreen === 'menu' || currentScreen === 'gameover') {
        const sc = showcaseSimRef.current;
        if (sc) {
          sc.step(dt);
          const snap = sc.getSnapshot();
          renderer.syncSnapshot(snap, dt, undefined, true);
        } else {
          renderer.renderMenuIdle(dt);
        }
        renderer.renderFrame();
        return;
      }

      if (currentScreen === 'paused') {
        renderer.renderFrame();
        return;
      }

      if (currentScreen === 'replay') {
        const rData = replayDataRef.current;
        if (rData && rData.frames.length > 0) {
          if (!replayPausedRef.current) {
            replayTimeRef.current += dt * replaySpeedRef.current;
            if (replayTimeRef.current >= rData.durationSec) {
              replayTimeRef.current = 0;
            }
          }
          const frac = Math.min(1, replayTimeRef.current / Math.max(0.1, rData.durationSec));
          const idx = Math.min(
            rData.frames.length - 1,
            Math.floor(frac * (rData.frames.length - 1)),
          );
          const f = rData.frames[idx];
          const synthSnap: MatchSnapshot = {
            tick: idx,
            timeRemaining: Math.max(0, rData.durationSec - f.t),
            elapsedTime: f.t,
            wave: 1,
            mode: rData.mode,
            teamAScore: f.teamAScore,
            teamBScore: f.teamBScore,
            teamAHpTotal: 100,
            teamAMaxHpTotal: 100,
            teamBHpTotal: 100,
            teamBMaxHpTotal: 100,
            ships: f.ships.map((sh) => ({
              ...sh,
              isHuman: false,
              vx: 0,
              vz: 0,
              maxShield: 80,
              energy: 100,
              maxEnergy: 100,
              kills: 0,
              deaths: 0,
              hitsLanded: 0,
              shotsFired: 0,
              combo: 0,
              maxCombo: 0,
              multiplier: 1,
              activeWeapon: 'basic',
              missiles: 0,
              maxMissiles: 4,
              speedBoostTimer: 0,
              rapidFireTimer: 0,
              doubleDamageTimer: 0,
              invulnTimer: 0,
              hitFlashTimer: 0,
              respawnTimer: 0,
              telegraphTimer: 0,
            })),
            projectiles: f.projectiles.map((pr) => ({
              ...pr,
              ownerId: '',
              team: 'A',
              kind: pr.kind as WeaponId,
              vx: 0,
              vz: 0,
              damage: 0,
              radius: 0.3,
              ttl: 1,
            })),
            powerUps: f.powerUps.map((pu) => ({ ...pu, ttl: 10 })),
            matchOver: false,
          };
          const labels = renderer.syncSnapshot(synthSnap, dt, f.ships[0]?.id, false);
          uiSyncAccum += dt;
          if (uiSyncAccum >= 0.05) {
            uiSyncAccum = 0;
            setHudSnapshot(synthSnap);
            setProjectedLabels(labels);
            setReplayProgress(frac);
          }
        }
        renderer.renderFrame();
        return;
      }

      // Active Playing Mode
      if (hitstopRef.current > 0) {
        hitstopRef.current = Math.max(0, hitstopRef.current - dt);
        renderer.renderFrame();
        return;
      }

      const meta = activeMetaRef.current;
      if (meta?.subMode === 'online') {
        const snap = onlineSnapshotRef.current;
        if (snap) {
          const localShip = snap.ships.find((s) => s.id === meta.localShipId);
          onlineInputAccumRef.current += dt;
          if (onlineInputAccumRef.current >= 0.05) {
            onlineInputAccumRef.current = 0;
            onlineClient.sendInput(buildLocalInputPacket(localShip));
          }
          const labels = renderer.syncSnapshot(snap, dt, meta.localShipId, false);
          uiSyncAccum += dt;
          if (uiSyncAccum >= 0.04) {
            uiSyncAccum = 0;
            setHudSnapshot(snap);
            setProjectedLabels(labels);
          }
        }
        renderer.renderFrame();
        return;
      }

      // Local / AI Simulation
      const sim = simRef.current;
      if (sim && meta) {
        const p1 = sim.ships.find((s) => s.id === meta.localShipId);
        sim.setPlayerInput(meta.localShipId, buildLocalInputPacket(p1));
        if (meta.p2ShipId) {
          const p2 = sim.ships.find((s) => s.id === meta.p2ShipId);
          sim.setPlayerInput(meta.p2ShipId, buildP2InputPacket(p2));
        }

        const events = sim.step(dt);
        handleSimEvents(events, meta.localShipId);
        const snap = sim.getSnapshot();

        // Record replay frames every 0.15s
        recordAccumRef.current += dt;
        if (recordAccumRef.current >= 0.15 && recordedFramesRef.current.length < 620) {
          recordAccumRef.current = 0;
          recordedFramesRef.current.push({
            t: snap.elapsedTime,
            teamAScore: snap.teamAScore,
            teamBScore: snap.teamBScore,
            ships: snap.ships.map((sh) => ({
              id: sh.id,
              name: sh.name,
              team: sh.team,
              shipId: sh.shipId,
              skinId: sh.skinId,
              isBoss: sh.isBoss,
              x: sh.x,
              z: sh.z,
              angle: sh.angle,
              hp: sh.hp,
              maxHp: sh.maxHp,
              shield: sh.shield,
              alive: sh.alive,
              score: sh.score,
            })),
            projectiles: snap.projectiles.map((pr) => ({
              id: pr.id,
              x: pr.x,
              z: pr.z,
              angle: pr.angle,
              kind: pr.kind,
              colorHex: pr.colorHex,
            })),
            powerUps: snap.powerUps.map((pu) => ({
              id: pu.id,
              type: pu.type,
              x: pu.x,
              z: pu.z,
            })),
          });
        }

        const labels = renderer.syncSnapshot(snap, dt, meta.localShipId, false);
        uiSyncAccum += dt;
        if (uiSyncAccum >= 0.04) {
          uiSyncAccum = 0;
          setHudSnapshot(snap);
          setProjectedLabels(labels);
        }

        if (snap.matchOver) {
          finalizeMatch(snap);
        }
      }

      renderer.renderFrame();
    });

    return () => {
      renderer.dispose();
      rendererRef.current = null;
    };
  }, [buildLocalInputPacket, buildP2InputPacket, finalizeMatch, handleSimEvents]);

  // Global Keyboard & Mouse Listeners
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      soundEngine.unlock();
      if (e.repeat) return;
      heldKeysRef.current.add(e.code);

      const kb = profileRef.current.keyBindings;
      const curScreen = screenRef.current;

      if (e.code === kb.pause || e.code === 'Escape') {
        if (curScreen === 'playing') {
          setScreen('paused');
          screenRef.current = 'paused';
        } else if (curScreen === 'paused') {
          setScreen('playing');
          screenRef.current = 'playing';
        }
        return;
      }

      if (curScreen !== 'playing') return;

      if (e.code === kb.missile) pendingMissileP1Ref.current = true;
      if (e.code === kb.ability) pendingAbilityP1Ref.current = true;
      if (e.code === 'Slash') pendingMissileP2Ref.current = true;
      if (e.code === 'ShiftRight') pendingAbilityP2Ref.current = true;

      if (e.code === 'Digit1') selectedWeaponP1Ref.current = 'basic';
      if (e.code === 'Digit2') selectedWeaponP1Ref.current = 'rapid';
      if (e.code === 'Digit3') selectedWeaponP1Ref.current = 'double';
      if (e.code === 'Digit4') selectedWeaponP1Ref.current = 'spread';
    };

    const onKeyUp = (e: KeyboardEvent) => {
      heldKeysRef.current.delete(e.code);
    };

    const onBlur = () => {
      heldKeysRef.current.clear();
      mouseDownRef.current = false;
    };

    const onMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseDown = (e: MouseEvent) => {
      soundEngine.unlock();
      if (e.button === 0 && screenRef.current === 'playing') {
        // Ignore clicks on HUD buttons
        const target = e.target as HTMLElement | null;
        if (target && target.closest('button')) return;
        mouseDownRef.current = true;
      }
    };

    const onMouseUp = () => {
      mouseDownRef.current = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  // Online WebSocket callbacks
  useEffect(() => {
    onlineClient.setCallbacks({
      onConnectionChange: (conn) => setOnlineConnected(conn),
      onWelcome: (id) => setLocalClientId(id),
      onRoomState: (r) => {
        setRoomState(r);
        setRoomError(null);
      },
      onRoomError: (msg) => setRoomError(msg),
      onMatchStarted: (asteroids, snap) => {
        soundEngine.unlock();
        soundEngine.startMusic();
        const myId = onlineClient.clientId || snap.ships[0]?.id || 'local';
        activeMetaRef.current = {
          mode: snap.mode,
          subMode: 'online',
          squadSize: 2,
          difficulty: 'medium',
          localShipId: myId,
        };
        selectedWeaponP1Ref.current = 'basic';
        recordedFramesRef.current = [];
        recordAccumRef.current = 0;
        onlineSnapshotRef.current = snap;
        rendererRef.current?.syncAsteroids(asteroids);
        setHudSnapshot(snap);
        setModal('none');
        setScreen('playing');
        screenRef.current = 'playing';
      },
      onSnapshot: (snap, events) => {
        onlineSnapshotRef.current = snap;
        const myId = activeMetaRef.current?.localShipId || '';
        handleSimEvents(events, myId);
        if (snap.matchOver && screenRef.current === 'playing') {
          finalizeMatch(snap);
        }
      },
    });
  }, [finalizeMatch, handleSimEvents]);

  const startOfflineMatch = useCallback(
    (opts: {
      mode: GameMode;
      subMode: 'ai' | 'local2p';
      squadSize: SquadSize;
      difficulty: Difficulty;
    }) => {
      soundEngine.unlock();
      soundEngine.startMusic();

      const p = profileRef.current;
      const participants: SimulationConfig['participants'] = [];
      const shipPool: ShipId[] = ['sparrow', 'aegis', 'dart', 'bastion'];
      const skinPool: SkinId[] = ['starlight', 'sakura', 'voidgold', 'aurora'];

      const p1Id = 'player_1';
      let p2Id: string | undefined;

      participants.push({
        id: p1Id,
        name: p.pilotName || 'Player 1',
        team: 'A',
        shipId: p.selectedShip,
        skinId: p.selectedSkin,
        isHuman: true,
        controlSlot: 1,
        upgrades: p.upgrades,
      });

      if (opts.mode === 'duo') {
        if (opts.subMode === 'local2p') {
          p2Id = 'player_2';
          participants.push({
            id: p2Id,
            name: 'Player 2',
            team: 'B',
            shipId: 'dart',
            skinId: 'sakura',
            isHuman: true,
            controlSlot: 2,
          });
        } else {
          participants.push({
            id: 'rival_ai',
            name: 'Vega Prime',
            team: 'B',
            shipId: 'dart',
            skinId: 'sakura',
            isHuman: false,
          });
        }
      } else if (opts.mode === 'squad') {
        if (opts.subMode === 'local2p') {
          p2Id = 'player_2';
          participants.push({
            id: p2Id,
            name: 'Player 2',
            team: 'A',
            shipId: 'aegis',
            skinId: 'aurora',
            isHuman: true,
            controlSlot: 2,
          });
        }
        // Fill Team A teammates
        while (participants.filter((x) => x.team === 'A').length < opts.squadSize) {
          const idx = participants.length;
          participants.push({
            id: `ally_${idx}`,
            name: `Wing-${idx}`,
            team: 'A',
            shipId: shipPool[idx % shipPool.length],
            skinId: skinPool[idx % skinPool.length],
            isHuman: false,
          });
        }
        // Fill Team B opponents
        for (let i = 0; i < opts.squadSize; i++) {
          participants.push({
            id: `enemy_${i}`,
            name: `Nova-${i + 1}`,
            team: 'B',
            shipId: shipPool[(i + 1) % shipPool.length],
            skinId: 'sakura',
            isHuman: false,
          });
        }
      } else {
        // Survival mode (optional local P2 wingmate)
        if (opts.subMode === 'local2p') {
          p2Id = 'player_2';
          participants.push({
            id: p2Id,
            name: 'Player 2',
            team: 'A',
            shipId: 'aegis',
            skinId: 'aurora',
            isHuman: true,
            controlSlot: 2,
          });
        }
      }

      const config: SimulationConfig = {
        mode: opts.mode,
        squadSize: opts.squadSize,
        difficulty: opts.difficulty,
        matchDurationSec: 120,
        participants,
      };

      const sim = new SpacecraftSimulation(config);
      simRef.current = sim;
      activeMetaRef.current = {
        mode: opts.mode,
        subMode: opts.subMode,
        squadSize: opts.squadSize,
        difficulty: opts.difficulty,
        localShipId: p1Id,
        p2ShipId: p2Id,
        config,
      };
      selectedWeaponP1Ref.current = 'basic';
      recordedFramesRef.current = [];
      recordAccumRef.current = 0;
      rendererRef.current?.syncAsteroids(sim.asteroids);
      setHudSnapshot(sim.getSnapshot());
      setComboBanner(null);
      setModal('none');
      setScreen('playing');
      screenRef.current = 'playing';
    },
    [],
  );

  const handleRestartMatch = useCallback(() => {
    const meta = activeMetaRef.current;
    if (!meta || meta.subMode === 'online') return;
    startOfflineMatch({
      mode: meta.mode,
      subMode: meta.subMode,
      squadSize: meta.squadSize,
      difficulty: meta.difficulty,
    });
  }, [startOfflineMatch]);

  const handleStartReplay = useCallback(() => {
    const rep = loadLastReplay();
    if (!rep || rep.frames.length === 0) return;
    replayDataRef.current = rep;
    replayTimeRef.current = 0;
    setReplayPaused(false);
    setReplaySpeed(1);
    setReplayProgress(0);
    setModal('none');
    setScreen('replay');
    screenRef.current = 'replay';
  }, []);

  const handleBuyUpgrade = (key: keyof PermanentUpgrades) => {
    setProfile((prev) => {
      const lvl = prev.upgrades[key];
      const cost = getUpgradeCost(key, lvl);
      if (lvl >= 5 || prev.coins < cost) return prev;
      soundEngine.playPowerUp();
      return {
        ...prev,
        coins: prev.coins - cost,
        upgrades: { ...prev.upgrades, [key]: lvl + 1 },
      };
    });
  };

  const handleUnlockOrSelectSkin = (skinId: SkinId) => {
    setProfile((prev) => {
      if (prev.unlockedSkins.includes(skinId)) {
        return { ...prev, selectedSkin: skinId };
      }
      const cost = SKINS[skinId].cost;
      if (prev.coins < cost) return prev;
      soundEngine.playPowerUp();
      return {
        ...prev,
        coins: prev.coins - cost,
        unlockedSkins: [...prev.unlockedSkins, skinId],
        selectedSkin: skinId,
      };
    });
  };

  const handleClaimMission = (missionId: string) => {
    setProfile((prev) => {
      const target = prev.missions.find((m) => m.id === missionId);
      if (!target || target.claimed || target.progress < target.target) return prev;
      soundEngine.playPowerUp();
      const nextXp = prev.xp + target.rewardXp;
      return {
        ...prev,
        coins: prev.coins + target.rewardCoins,
        xp: nextXp,
        level: Math.max(1, Math.floor(nextXp / 350) + 1),
        missions: prev.missions.map((m) =>
          m.id === missionId ? { ...m, claimed: true } : m,
        ),
      };
    });
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0b0d1d]">
      {/* Isolated Three.js WebGL Mount Container */}
      <div ref={canvasMountRef} className="fixed inset-0 z-0" />

      {webglLost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0d1d]/95 p-6 text-center">
          <div className="max-w-md rounded-2xl bg-[#141830] border border-indigo-400/30 p-6">
            <h2 className="font-display text-xl font-bold text-white">
              3D Graphics Context Interrupted
            </h2>
            <p className="text-xs text-slate-300 mt-2">
              Your browser reset the WebGL context. Reload the page to restore
              the 3D isometric space arena.
            </p>
          </div>
        </div>
      )}

      {/* Title Screen */}
      {screen === 'menu' && (
        <TitleScreen
          profile={profile}
          hasReplay={hasReplay}
          onPlay={() => {
            soundEngine.unlock();
            soundEngine.startMusic();
            setModal('setup');
          }}
          onOpenUpgrades={() => setModal('upgrades')}
          onOpenProgression={() => setModal('progression')}
          onOpenSettings={() => setModal('settings')}
          onOpenHelp={() => setModal('help')}
          onWatchReplay={handleStartReplay}
          onToggleMute={() =>
            setProfile((p) => ({ ...p, muted: !p.muted }))
          }
        />
      )}

      {/* Active Gameplay or Replay HUD */}
      {(screen === 'playing' || screen === 'paused' || screen === 'replay') &&
        hudSnapshot && (
          <GameplayHud
            snapshot={hudSnapshot}
            projectedLabels={projectedLabels}
            localShipId={activeMetaRef.current?.localShipId || 'player_1'}
            p2ShipId={activeMetaRef.current?.p2ShipId}
            comboBanner={comboBanner}
            muted={profile.muted}
            isReplayMode={screen === 'replay'}
            replayPaused={replayPaused}
            replaySpeed={replaySpeed}
            replayProgress={replayProgress}
            onSelectWeapon={(w) => {
              selectedWeaponP1Ref.current = w;
            }}
            onPause={() => {
              setScreen('paused');
              screenRef.current = 'paused';
            }}
            onToggleMute={() =>
              setProfile((p) => ({ ...p, muted: !p.muted }))
            }
            onReplayTogglePause={() => setReplayPaused((v) => !v)}
            onReplayToggleSpeed={() =>
              setReplaySpeed((s) => (s === 1 ? 2 : 1))
            }
            onReplaySeek={(frac) => {
              if (replayDataRef.current) {
                replayTimeRef.current = frac * replayDataRef.current.durationSec;
                setReplayProgress(frac);
              }
            }}
            onExitReplay={() => {
              setScreen('menu');
              screenRef.current = 'menu';
            }}
          />
        )}

      {/* Pause Modal */}
      {screen === 'paused' && (
        <PauseModal
          canRestart={activeMetaRef.current?.subMode !== 'online'}
          onResume={() => {
            setScreen('playing');
            screenRef.current = 'playing';
          }}
          onRestart={handleRestartMatch}
          onMainMenu={() => {
            if (activeMetaRef.current?.subMode === 'online') {
              onlineClient.leaveRoom();
            }
            setScreen('menu');
            screenRef.current = 'menu';
          }}
        />
      )}

      {/* Game Over Match Summary Modal */}
      {screen === 'gameover' && matchSummary && (
        <GameOverModal
          summary={matchSummary}
          newAchievements={newAchievements}
          hasReplay={hasReplay}
          onPlayAgain={() => {
            if (activeMetaRef.current?.subMode === 'online') {
              setScreen('menu');
              screenRef.current = 'menu';
              setModal('setup');
            } else {
              handleRestartMatch();
            }
          }}
          onWatchReplay={handleStartReplay}
          onOpenUpgrades={() => {
            setScreen('menu');
            screenRef.current = 'menu';
            setModal('upgrades');
          }}
          onMainMenu={() => {
            if (activeMetaRef.current?.subMode === 'online') {
              onlineClient.leaveRoom();
            }
            setScreen('menu');
            screenRef.current = 'menu';
          }}
        />
      )}

      {/* Menu Overlay Modals */}
      {modal === 'setup' && (
        <MatchSetupModal
          profile={profile}
          onlineConnected={onlineConnected}
          roomState={roomState}
          roomError={roomError}
          localClientId={localClientId}
          onClose={() => setModal('none')}
          onSelectShip={(shipId) =>
            setProfile((p) => ({ ...p, selectedShip: shipId }))
          }
          onSelectSkin={(skinId) =>
            setProfile((p) => ({ ...p, selectedSkin: skinId }))
          }
          onUpdatePilotName={(pilotName) =>
            setProfile((p) => ({ ...p, pilotName }))
          }
          onStartOfflineMatch={startOfflineMatch}
          onConnectOnline={() => onlineClient.connect()}
          onCreateRoom={(opts) =>
            onlineClient.createRoom({
              ...opts,
              name: profile.pilotName,
              shipId: profile.selectedShip,
              skinId: profile.selectedSkin,
            })
          }
          onJoinRoom={(roomCode) =>
            onlineClient.joinRoom({
              roomCode,
              name: profile.pilotName,
              shipId: profile.selectedShip,
              skinId: profile.selectedSkin,
            })
          }
          onLeaveRoom={() => onlineClient.leaveRoom()}
          onUpdateLobbyPlayer={(opts) => onlineClient.updateLobbyPlayer(opts)}
          onStartOnlineMatch={() => onlineClient.startMatch()}
        />
      )}

      {modal === 'upgrades' && (
        <HangarUpgradesModal
          profile={profile}
          onClose={() => setModal('none')}
          onBuyUpgrade={handleBuyUpgrade}
          onUnlockOrSelectSkin={handleUnlockOrSelectSkin}
        />
      )}

      {modal === 'progression' && (
        <ProgressionModal
          profile={profile}
          onClose={() => setModal('none')}
          onClaimMission={handleClaimMission}
        />
      )}

      {modal === 'settings' && (
        <SettingsModal
          profile={profile}
          onClose={() => setModal('none')}
          onUpdateAudio={(musicVolume, sfxVolume, muted) =>
            setProfile((p) => ({ ...p, musicVolume, sfxVolume, muted }))
          }
          onUpdateAimMode={(aimMode) =>
            setProfile((p) => ({ ...p, aimMode }))
          }
          onUpdateKeyBindings={(keyBindings: KeyBindings) =>
            setProfile((p) => ({ ...p, keyBindings }))
          }
        />
      )}

      {modal === 'help' && (
        <HowToPlayModal onClose={() => setModal('none')} />
      )}

      <OfflineIndicator />
    </div>
  );
}
