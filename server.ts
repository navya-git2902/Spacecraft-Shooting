import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { SpacecraftSimulation } from './src/game/engine.ts';
import type {
  Difficulty,
  GameMode,
  LeaderboardEntry,
  PlayerInputPacket,
  RoomPlayerInfo,
  RoomStatePayload,
  ShipId,
  SkinId,
  SquadSize,
  TeamId,
} from './src/game/types.ts';

const PORT = 3000;
const LEADERBOARD_FILE = path.resolve('/tmp', 'spacecraft_shooting_leaderboard.json');

interface ServerClient {
  id: string;
  ws: WebSocket;
  roomCode: string | null;
  name: string;
}

interface OnlineRoom {
  roomCode: string;
  mode: GameMode;
  squadSize: SquadSize;
  difficulty: Difficulty;
  fillBots: boolean;
  status: 'lobby' | 'playing' | 'ended';
  players: Map<string, RoomPlayerInfo>;
  sim: SpacecraftSimulation | null;
  loopTimer: NodeJS.Timeout | null;
}

const clients = new Map<string, ServerClient>();
const rooms = new Map<string, OnlineRoom>();
let leaderboard: LeaderboardEntry[] = loadInitialLeaderboard();

function loadInitialLeaderboard(): LeaderboardEntry[] {
  try {
    if (fs.existsSync(LEADERBOARD_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(LEADERBOARD_FILE, 'utf-8'));
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore read errors
  }
  return [
    {
      id: 'seed_1',
      pilotName: 'Commander Lyra',
      score: 4850,
      mode: 'squad',
      shipId: 'sparrow',
      kills: 11,
      maxCombo: 9,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'seed_2',
      pilotName: 'Captain Orion',
      score: 4120,
      mode: 'survival',
      shipId: 'bastion',
      kills: 16,
      maxCombo: 7,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'seed_3',
      pilotName: 'Vega Drift',
      score: 3390,
      mode: 'duo',
      shipId: 'dart',
      kills: 7,
      maxCombo: 6,
      createdAt: new Date().toISOString(),
    },
  ];
}

function saveLeaderboard(): void {
  try {
    fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(leaderboard.slice(0, 50)));
  } catch {
    // ignore write errors
  }
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function serializeRoomState(room: OnlineRoom): RoomStatePayload {
  return {
    roomCode: room.roomCode,
    mode: room.mode,
    squadSize: room.squadSize,
    difficulty: room.difficulty,
    fillBots: room.fillBots,
    status: room.status,
    players: Array.from(room.players.values()),
  };
}

function broadcastToRoom(room: OnlineRoom, type: string, payload: unknown): void {
  const msg = JSON.stringify({ type, payload });
  for (const playerId of room.players.keys()) {
    const client = clients.get(playerId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(msg);
    }
  }
}

function leaveCurrentRoom(client: ServerClient): void {
  if (!client.roomCode) return;
  const room = rooms.get(client.roomCode);
  client.roomCode = null;
  if (!room) return;

  room.players.delete(client.id);
  if (room.players.size === 0) {
    if (room.loopTimer) clearInterval(room.loopTimer);
    rooms.delete(room.roomCode);
    return;
  }

  // Ensure at least one host remains
  const hasHost = Array.from(room.players.values()).some((p) => p.isHost);
  if (!hasHost) {
    const first = room.players.values().next().value;
    if (first) first.isHost = true;
  }

  broadcastToRoom(room, 'room_state', serializeRoomState(room));
}

function startRoomMatch(room: OnlineRoom): void {
  if (room.loopTimer) {
    clearInterval(room.loopTimer);
    room.loopTimer = null;
  }

  const participants: Array<{
    id: string;
    name: string;
    team: TeamId;
    shipId: ShipId;
    skinId: SkinId;
    isHuman: boolean;
  }> = [];

  for (const p of room.players.values()) {
    participants.push({
      id: p.clientId,
      name: p.name,
      team: p.team,
      shipId: p.shipId,
      skinId: p.skinId,
      isHuman: true,
    });
  }

  // Fill remaining slots with clearly-labeled AI bots if enabled
  if (room.fillBots) {
    const targetPerTeam = room.mode === 'duo' ? 1 : room.squadSize;
    const countA = participants.filter((p) => p.team === 'A').length;
    const countB = participants.filter((p) => p.team === 'B').length;
    const botShips: ShipId[] = ['sparrow', 'aegis', 'dart', 'bastion'];

    for (let i = countA; i < targetPerTeam; i++) {
      participants.push({
        id: `bot_A_${i}`,
        name: `Bot Alpha-${i + 1}`,
        team: 'A',
        shipId: botShips[i % botShips.length],
        skinId: 'aurora',
        isHuman: false,
      });
    }
    for (let i = countB; i < targetPerTeam; i++) {
      participants.push({
        id: `bot_B_${i}`,
        name: `Bot Nova-${i + 1}`,
        team: 'B',
        shipId: botShips[(i + 1) % botShips.length],
        skinId: 'sakura',
        isHuman: false,
      });
    }
  }

  room.status = 'playing';
  room.sim = new SpacecraftSimulation({
    mode: room.mode,
    squadSize: room.squadSize,
    difficulty: room.difficulty,
    matchDurationSec: 120,
    participants,
  });

  broadcastToRoom(room, 'room_state', serializeRoomState(room));
  broadcastToRoom(room, 'match_started', {
    asteroids: room.sim.asteroids,
    snapshot: room.sim.getSnapshot(),
  });

  const tickMs = 50; // 20Hz authoritative simulation
  room.loopTimer = setInterval(() => {
    if (!room.sim) return;
    const events = room.sim.step(tickMs / 1000);
    const snapshot = room.sim.getSnapshot();
    broadcastToRoom(room, 'snapshot', { snapshot, events });

    if (snapshot.matchOver) {
      room.status = 'ended';
      if (room.loopTimer) {
        clearInterval(room.loopTimer);
        room.loopTimer = null;
      }
      broadcastToRoom(room, 'room_state', serializeRoomState(room));
    }
  }, tickMs);
}

async function bootstrap() {
  const app = express();
  app.use(express.json({ limit: '64kb' }));

  // Public Room Browser Endpoint
  app.get('/api/rooms', (_req, res) => {
    const openRooms = Array.from(rooms.values())
      .filter((r) => r.status === 'lobby')
      .map((r) => ({
        roomCode: r.roomCode,
        mode: r.mode,
        squadSize: r.squadSize,
        playerCount: r.players.size,
        maxPlayers: r.mode === 'duo' ? 2 : r.squadSize * 2,
      }));
    res.json({ rooms: openRooms });
  });

  // Leaderboard Endpoints
  app.get('/api/leaderboard', (_req, res) => {
    const sorted = [...leaderboard].sort((a, b) => b.score - a.score).slice(0, 25);
    res.json({ entries: sorted });
  });

  app.post('/api/leaderboard', (req, res) => {
    const body = req.body as Partial<LeaderboardEntry> | undefined;
    if (
      !body ||
      typeof body.pilotName !== 'string' ||
      typeof body.score !== 'number' ||
      !Number.isFinite(body.score) ||
      body.score < 0
    ) {
      res.status(400).json({ error: 'Invalid leaderboard entry' });
      return;
    }

    const validModes: GameMode[] = ['duo', 'squad', 'survival'];
    const validShips: ShipId[] = ['sparrow', 'aegis', 'dart', 'bastion'];
    const mode: GameMode = validModes.includes(body.mode as GameMode)
      ? (body.mode as GameMode)
      : 'duo';
    const shipId: ShipId = validShips.includes(body.shipId as ShipId)
      ? (body.shipId as ShipId)
      : 'sparrow';

    const entry: LeaderboardEntry = {
      id: `lb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      pilotName: body.pilotName.trim().slice(0, 24) || 'Nova Pilot',
      score: Math.min(999999, Math.floor(body.score)),
      mode,
      shipId,
      kills: Math.max(0, Math.min(999, Math.floor(Number(body.kills) || 0))),
      maxCombo: Math.max(0, Math.min(999, Math.floor(Number(body.maxCombo) || 0))),
      createdAt: new Date().toISOString(),
      isOnline: Boolean(body.isOnline),
    };

    leaderboard.push(entry);
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, 50);
    saveLeaderboard();

    res.status(201).json({ entry, entries: leaderboard.slice(0, 25) });
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    const clientId = `pilot_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 7)}`;
    const client: ServerClient = {
      id: clientId,
      ws,
      roomCode: null,
      name: 'Nova Pilot',
    };
    clients.set(clientId, client);

    ws.send(JSON.stringify({ type: 'welcome', payload: { clientId } }));

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as {
          type: string;
          payload?: Record<string, unknown>;
        };
        const p = msg.payload || {};

        if (msg.type === 'create_room') {
          leaveCurrentRoom(client);
          const pilotName = String(p.name || 'Host Pilot').trim().slice(0, 20) || 'Host Pilot';
          const mode: GameMode =
            p.mode === 'squad' ? 'squad' : 'duo';
          const squadSize: SquadSize =
            p.squadSize === 3 || p.squadSize === 4 ? p.squadSize : 2;
          const difficulty: Difficulty =
            p.difficulty === 'easy' || p.difficulty === 'hard'
              ? p.difficulty
              : 'medium';
          const shipId: ShipId =
            p.shipId === 'aegis' || p.shipId === 'dart' || p.shipId === 'bastion'
              ? p.shipId
              : 'sparrow';
          const skinId: SkinId =
            p.skinId === 'sakura' || p.skinId === 'voidgold' || p.skinId === 'aurora'
              ? p.skinId
              : 'starlight';

          client.name = pilotName;
          const roomCode = generateRoomCode();
          const room: OnlineRoom = {
            roomCode,
            mode,
            squadSize,
            difficulty,
            fillBots: p.fillBots !== false,
            status: 'lobby',
            players: new Map(),
            sim: null,
            loopTimer: null,
          };
          room.players.set(client.id, {
            clientId: client.id,
            name: pilotName,
            team: 'A',
            shipId,
            skinId,
            ready: true,
            isHost: true,
            isHuman: true,
          });
          rooms.set(roomCode, room);
          client.roomCode = roomCode;
          ws.send(
            JSON.stringify({
              type: 'room_state',
              payload: serializeRoomState(room),
            }),
          );
        } else if (msg.type === 'join_room') {
          const code = String(p.roomCode || '').trim().toUpperCase();
          const room = rooms.get(code);
          if (!room) {
            ws.send(
              JSON.stringify({
                type: 'room_error',
                payload: { message: `Room "${code}" not found.` },
              }),
            );
            return;
          }
          if (room.status !== 'lobby') {
            ws.send(
              JSON.stringify({
                type: 'room_error',
                payload: { message: 'Match already in progress in this room.' },
              }),
            );
            return;
          }
          const maxCap = room.mode === 'duo' ? 2 : room.squadSize * 2;
          if (room.players.size >= maxCap) {
            ws.send(
              JSON.stringify({
                type: 'room_error',
                payload: { message: 'Room is full.' },
              }),
            );
            return;
          }

          leaveCurrentRoom(client);
          const pilotName = String(p.name || 'Wingmate').trim().slice(0, 20) || 'Wingmate';
          const shipId: ShipId =
            p.shipId === 'aegis' || p.shipId === 'dart' || p.shipId === 'bastion'
              ? p.shipId
              : 'sparrow';
          const skinId: SkinId =
            p.skinId === 'sakura' || p.skinId === 'voidgold' || p.skinId === 'aurora'
              ? p.skinId
              : 'starlight';

          // Auto-balance team assignment
          const countA = Array.from(room.players.values()).filter(
            (pl) => pl.team === 'A',
          ).length;
          const countB = Array.from(room.players.values()).filter(
            (pl) => pl.team === 'B',
          ).length;
          const team: TeamId = countB < countA ? 'B' : 'A';

          client.name = pilotName;
          client.roomCode = code;
          room.players.set(client.id, {
            clientId: client.id,
            name: pilotName,
            team,
            shipId,
            skinId,
            ready: false,
            isHost: false,
            isHuman: true,
          });
          broadcastToRoom(room, 'room_state', serializeRoomState(room));
        } else if (msg.type === 'leave_room') {
          leaveCurrentRoom(client);
        } else if (msg.type === 'update_lobby_player') {
          if (!client.roomCode) return;
          const room = rooms.get(client.roomCode);
          if (!room || room.status !== 'lobby') return;
          const pl = room.players.get(client.id);
          if (!pl) return;
          if (p.team === 'A' || p.team === 'B') pl.team = p.team;
          if (
            p.shipId === 'sparrow' ||
            p.shipId === 'aegis' ||
            p.shipId === 'dart' ||
            p.shipId === 'bastion'
          ) {
            pl.shipId = p.shipId;
          }
          if (
            p.skinId === 'starlight' ||
            p.skinId === 'sakura' ||
            p.skinId === 'voidgold' ||
            p.skinId === 'aurora'
          ) {
            pl.skinId = p.skinId;
          }
          if (typeof p.ready === 'boolean') pl.ready = p.ready;
          if (pl.isHost && typeof p.fillBots === 'boolean') {
            room.fillBots = p.fillBots;
          }
          broadcastToRoom(room, 'room_state', serializeRoomState(room));
        } else if (msg.type === 'start_match') {
          if (!client.roomCode) return;
          const room = rooms.get(client.roomCode);
          if (!room) return;
          const pl = room.players.get(client.id);
          if (!pl?.isHost) return;
          startRoomMatch(room);
        } else if (msg.type === 'input') {
          if (!client.roomCode) return;
          const room = rooms.get(client.roomCode);
          if (!room || !room.sim || room.status !== 'playing') return;
          const inp: PlayerInputPacket = {
            moveX: Number(p.moveX) || 0,
            moveZ: Number(p.moveZ) || 0,
            aimX: Number(p.aimX) || 0,
            aimZ: Number(p.aimZ) || 0,
            firing: Boolean(p.firing),
            fireMissile: Boolean(p.fireMissile),
            useAbility: Boolean(p.useAbility),
            weaponSlot:
              p.weaponSlot === 'basic' ||
              p.weaponSlot === 'rapid' ||
              p.weaponSlot === 'double' ||
              p.weaponSlot === 'spread' ||
              p.weaponSlot === 'missile'
                ? p.weaponSlot
                : undefined,
          };
          room.sim.setPlayerInput(client.id, inp);
        }
      } catch {
        // ignore malformed client messages
      }
    });

    ws.on('close', () => {
      leaveCurrentRoom(client);
      clients.delete(clientId);
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Spacecraft Shooting server listening on port ${PORT}`);
  });
}

bootstrap();
