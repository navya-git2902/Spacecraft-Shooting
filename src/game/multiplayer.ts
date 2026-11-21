import { SimEvent } from './engine';
import {
  AsteroidObstacle,
  Difficulty,
  GameMode,
  MatchSnapshot,
  PlayerInputPacket,
  RoomStatePayload,
  ShipId,
  SkinId,
  SquadSize,
  TeamId,
} from './types';

export interface OnlineClientCallbacks {
  onWelcome?: (clientId: string) => void;
  onRoomState?: (room: RoomStatePayload | null) => void;
  onRoomError?: (msg: string) => void;
  onMatchStarted?: (asteroids: AsteroidObstacle[], snapshot: MatchSnapshot) => void;
  onSnapshot?: (snapshot: MatchSnapshot, events: SimEvent[]) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export class OnlineMultiplayerClient {
  private ws: WebSocket | null = null;
  private callbacks: OnlineClientCallbacks = {};
  public clientId: string | null = null;
  public connected = false;

  public setCallbacks(cb: OnlineClientCallbacks): void {
    this.callbacks = cb;
  }

  public connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${window.location.host}/ws`;
    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onopen = () => {
      this.connected = true;
      this.callbacks.onConnectionChange?.(true);
    };

    ws.onclose = () => {
      this.connected = false;
      this.callbacks.onConnectionChange?.(false);
    };

    ws.onerror = () => {
      this.connected = false;
      this.callbacks.onConnectionChange?.(false);
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data) as {
          type: string;
          payload: Record<string, unknown>;
        };
        if (msg.type === 'welcome') {
          this.clientId = String(msg.payload.clientId);
          this.callbacks.onWelcome?.(this.clientId);
        } else if (msg.type === 'room_state') {
          this.callbacks.onRoomState?.(msg.payload as unknown as RoomStatePayload);
        } else if (msg.type === 'room_error') {
          this.callbacks.onRoomError?.(String(msg.payload.message || 'Room error'));
        } else if (msg.type === 'match_started') {
          this.callbacks.onMatchStarted?.(
            msg.payload.asteroids as AsteroidObstacle[],
            msg.payload.snapshot as MatchSnapshot,
          );
        } else if (msg.type === 'snapshot') {
          this.callbacks.onSnapshot?.(
            msg.payload.snapshot as MatchSnapshot,
            (msg.payload.events as SimEvent[]) || [],
          );
        }
      } catch {
        // ignore parse errors
      }
    };
  }

  private send(type: string, payload: Record<string, unknown>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.connect();
      return;
    }
    this.ws.send(JSON.stringify({ type, payload }));
  }

  public createRoom(opts: {
    name: string;
    mode: GameMode;
    squadSize: SquadSize;
    difficulty: Difficulty;
    shipId: ShipId;
    skinId: SkinId;
    fillBots: boolean;
  }): void {
    this.send('create_room', opts);
  }

  public joinRoom(opts: {
    roomCode: string;
    name: string;
    shipId: ShipId;
    skinId: SkinId;
  }): void {
    this.send('join_room', opts);
  }

  public leaveRoom(): void {
    this.send('leave_room', {});
    this.callbacks.onRoomState?.(null);
  }

  public updateLobbyPlayer(opts: {
    team?: TeamId;
    shipId?: ShipId;
    skinId?: SkinId;
    ready?: boolean;
    fillBots?: boolean;
  }): void {
    this.send('update_lobby_player', opts);
  }

  public startMatch(): void {
    this.send('start_match', {});
  }

  public sendInput(input: PlayerInputPacket): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type: 'input', payload: input }));
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const onlineClient = new OnlineMultiplayerClient();
