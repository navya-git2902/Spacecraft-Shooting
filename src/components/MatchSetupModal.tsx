import React, { useEffect, useState } from 'react';
import {
  Bot,
  Globe,
  Play,
  RefreshCw,
  Shield,
  Users,
  User,
  X,
  Zap,
} from 'lucide-react';
import { SHIPS, SKINS } from '../game/catalog';
import {
  Difficulty,
  GameMode,
  PlayerProfile,
  PlaySubMode,
  RoomStatePayload,
  ShipId,
  SkinId,
  SquadSize,
  TeamId,
} from '../game/types';

interface OpenRoomSummary {
  roomCode: string;
  mode: GameMode;
  squadSize: SquadSize;
  playerCount: number;
  maxPlayers: number;
}

interface MatchSetupModalProps {
  profile: PlayerProfile;
  onlineConnected: boolean;
  roomState: RoomStatePayload | null;
  roomError: string | null;
  localClientId: string | null;
  onClose: () => void;
  onSelectShip: (shipId: ShipId) => void;
  onSelectSkin: (skinId: SkinId) => void;
  onUpdatePilotName: (name: string) => void;
  onStartOfflineMatch: (opts: {
    mode: GameMode;
    subMode: 'ai' | 'local2p';
    squadSize: SquadSize;
    difficulty: Difficulty;
  }) => void;
  onConnectOnline: () => void;
  onCreateRoom: (opts: {
    mode: GameMode;
    squadSize: SquadSize;
    difficulty: Difficulty;
    fillBots: boolean;
  }) => void;
  onJoinRoom: (roomCode: string) => void;
  onLeaveRoom: () => void;
  onUpdateLobbyPlayer: (opts: {
    team?: TeamId;
    shipId?: ShipId;
    skinId?: SkinId;
    ready?: boolean;
    fillBots?: boolean;
  }) => void;
  onStartOnlineMatch: () => void;
}

export const MatchSetupModal: React.FC<MatchSetupModalProps> = ({
  profile,
  onlineConnected,
  roomState,
  roomError,
  localClientId,
  onClose,
  onSelectShip,
  onSelectSkin,
  onUpdatePilotName,
  onStartOfflineMatch,
  onConnectOnline,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  onUpdateLobbyPlayer,
  onStartOnlineMatch,
}) => {
  const [mode, setMode] = useState<GameMode>('duo');
  const [subMode, setSubMode] = useState<PlaySubMode>('ai');
  const [squadSize, setSquadSize] = useState<SquadSize>(2);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [fillBots, setFillBots] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [openRooms, setOpenRooms] = useState<OpenRoomSummary[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  const fetchOpenRooms = async () => {
    setLoadingRooms(true);
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data = (await res.json()) as { rooms: OpenRoomSummary[] };
        setOpenRooms(data.rooms || []);
      }
    } catch {
      // ignore fetch error
    } finally {
      setLoadingRooms(false);
    }
  };

  useEffect(() => {
    if (subMode === 'online') {
      onConnectOnline();
      fetchOpenRooms();
    }
  }, [subMode]);

  const localLobbyPlayer = roomState?.players.find(
    (p) => p.clientId === localClientId,
  );
  const isHost = Boolean(localLobbyPlayer?.isHost);

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center p-4 bg-[#080a18]/80">
      <div className="w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl bg-[#12162e] border border-indigo-400/25 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-indigo-400/15">
          <div>
            <h2 className="font-display text-xl font-bold text-white">
              Match Setup & Hangar
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Choose combat mode, multiplayer format, and spacecraft
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close setup"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto cosmo-scroll p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Mode & Multiplayer */}
          <div className="lg:col-span-5 space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Pilot Callsign
              </label>
              <input
                type="text"
                maxLength={20}
                value={profile.pilotName}
                onChange={(e) => onUpdatePilotName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c0f22] border border-indigo-400/25 text-sm text-white focus:outline-none focus:border-sky-400"
              />
            </div>

            {/* Game Mode */}
            <div>
              <div className="text-xs font-semibold text-slate-300 mb-2">
                Game Mode
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'duo' as GameMode, label: 'Duo 1v1', sub: '1 vs 1 Duel' },
                  {
                    id: 'squad' as GameMode,
                    label: 'Squad',
                    sub: 'Team Battle',
                  },
                  {
                    id: 'survival' as GameMode,
                    label: 'Survival',
                    sub: 'Waves & Boss',
                  },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setMode(m.id);
                      if (m.id === 'survival' && subMode === 'online') {
                        setSubMode('ai');
                      }
                    }}
                    className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                      mode === m.id
                        ? 'bg-sky-400/15 border-sky-400 text-white'
                        : 'bg-[#0c0f22] border-indigo-400/20 text-slate-300 hover:border-indigo-400/40'
                    }`}
                  >
                    <div className="font-display text-sm font-bold whitespace-nowrap">
                      {m.label}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {m.sub}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Squad Size */}
            {mode === 'squad' && (
              <div>
                <div className="text-xs font-semibold text-slate-300 mb-2">
                  Squad Size
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {([2, 3, 4] as SquadSize[]).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setSquadSize(sz)}
                      className={`py-2 px-3 rounded-lg border text-xs font-mono-num font-bold transition-colors cursor-pointer ${
                        squadSize === sz
                          ? 'bg-violet-500/25 border-violet-400 text-white'
                          : 'bg-[#0c0f22] border-indigo-400/20 text-slate-300'
                      }`}
                    >
                      {sz}v{sz}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Multiplayer Format */}
            <div>
              <div className="text-xs font-semibold text-slate-300 mb-2">
                Play Format
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSubMode('ai')}
                  className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    subMode === 'ai'
                      ? 'bg-sky-400/15 border-sky-400 text-white'
                      : 'bg-[#0c0f22] border-indigo-400/20 text-slate-300'
                  }`}
                >
                  <Bot className="w-3.5 h-3.5 text-sky-300" />
                  <span>Solo / AI</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSubMode('local2p')}
                  className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    subMode === 'local2p'
                      ? 'bg-pink-400/15 border-pink-400 text-white'
                      : 'bg-[#0c0f22] border-indigo-400/20 text-slate-300'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-pink-300" />
                  <span>Local 2P</span>
                </button>
                <button
                  type="button"
                  disabled={mode === 'survival'}
                  onClick={() => setSubMode('online')}
                  className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-colors whitespace-nowrap ${
                    mode === 'survival'
                      ? 'opacity-40 cursor-not-allowed bg-[#0c0f22] border-indigo-400/10 text-slate-500'
                      : subMode === 'online'
                        ? 'bg-emerald-400/15 border-emerald-400 text-white cursor-pointer'
                        : 'bg-[#0c0f22] border-indigo-400/20 text-slate-300 cursor-pointer'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Online</span>
                </button>
              </div>
              {subMode === 'local2p' && (
                <p className="text-[11px] text-pink-200/80 mt-2">
                  P1: WASD + Space (Shoot) + E (Missile) + Shift (Ability) · P2:
                  Arrow Keys + Enter (Shoot) + Slash (Missile) + Right Shift
                  (Ability)
                </p>
              )}
            </div>

            {/* Difficulty */}
            <div>
              <div className="text-xs font-semibold text-slate-300 mb-2">
                AI Difficulty
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold capitalize transition-colors cursor-pointer ${
                      difficulty === d
                        ? 'bg-amber-400/20 border-amber-400 text-amber-200'
                        : 'bg-[#0c0f22] border-indigo-400/20 text-slate-300'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Online Room Controls */}
            {subMode === 'online' && (
              <div className="p-4 rounded-xl bg-[#0c0f22] border border-indigo-400/20 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">
                    Online Matchmaking Room
                  </span>
                  <span
                    className={
                      onlineConnected ? 'text-emerald-300' : 'text-amber-300'
                    }
                  >
                    {onlineConnected ? 'Connected' : 'Connecting...'}
                  </span>
                </div>

                {roomError && (
                  <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-400/30 text-xs text-rose-200">
                    {roomError}
                  </div>
                )}

                {!roomState ? (
                  <>
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span>Fill empty slots with labeled AI bots</span>
                      <button
                        type="button"
                        onClick={() => setFillBots(!fillBots)}
                        className={`px-2.5 py-1 rounded-md border text-[11px] font-semibold cursor-pointer ${
                          fillBots
                            ? 'bg-sky-400/20 border-sky-400 text-sky-200'
                            : 'bg-slate-800 border-slate-600 text-slate-400'
                        }`}
                      >
                        {fillBots ? 'Bots: On' : 'Humans Only'}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        onCreateRoom({ mode, squadSize, difficulty, fillBots })
                      }
                      className="w-full py-2.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-display font-bold text-xs tracking-wide cursor-pointer"
                    >
                      Create {mode === 'duo' ? '1v1' : `${squadSize}v${squadSize}`}{' '}
                      Room
                    </button>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Room code (e.g. NOVA42)"
                        maxLength={8}
                        value={joinCode}
                        onChange={(e) =>
                          setJoinCode(e.target.value.toUpperCase())
                        }
                        className="flex-1 px-3 py-2 rounded-lg bg-[#12162e] border border-indigo-400/25 text-xs font-mono-num text-white uppercase focus:outline-none focus:border-sky-400"
                      />
                      <button
                        type="button"
                        onClick={() => joinCode && onJoinRoom(joinCode)}
                        className="px-4 py-2 rounded-lg bg-sky-400 hover:bg-sky-300 text-slate-950 font-semibold text-xs cursor-pointer"
                      >
                        Join
                      </button>
                    </div>

                    <div className="pt-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                        <span>Open Public Rooms</span>
                        <button
                          type="button"
                          onClick={fetchOpenRooms}
                          className="flex items-center gap-1 text-sky-300 hover:text-sky-200 cursor-pointer"
                        >
                          <RefreshCw
                            className={`w-3 h-3 ${loadingRooms ? 'animate-spin' : ''}`}
                          />
                          <span>Refresh</span>
                        </button>
                      </div>
                      {openRooms.length === 0 ? (
                        <div className="text-[11px] text-slate-500">
                          No open rooms yet — create one and share the code.
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-24 overflow-y-auto cosmo-scroll">
                          {openRooms.map((r) => (
                            <div
                              key={r.roomCode}
                              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#151a36] text-xs"
                            >
                              <span className="font-mono-num text-sky-300 font-bold">
                                {r.roomCode}
                              </span>
                              <span className="text-slate-400">
                                {r.mode === 'duo'
                                  ? 'Duo'
                                  : `Squad ${r.squadSize}v${r.squadSize}`}{' '}
                                · {r.playerCount}/{r.maxPlayers}
                              </span>
                              <button
                                type="button"
                                onClick={() => onJoinRoom(r.roomCode)}
                                className="px-2 py-0.5 rounded bg-sky-400/20 text-sky-200 hover:bg-sky-400/30 text-[11px] cursor-pointer"
                              >
                                Join
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[11px] text-slate-400">
                          Room Code
                        </div>
                        <div className="font-mono-num text-lg font-bold text-emerald-300">
                          {roomState.roomCode}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={onLeaveRoom}
                        className="px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-200 text-xs hover:bg-rose-500/30 cursor-pointer"
                      >
                        Leave Room
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {roomState.players.map((pl) => (
                        <div
                          key={pl.clientId}
                          className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#141936] text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-emerald-300" />
                            <span className="font-semibold text-white">
                              {pl.name}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              HUMAN {pl.isHost ? '· HOST' : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={
                                pl.team === 'A'
                                  ? 'text-sky-300 font-semibold'
                                  : 'text-pink-300 font-semibold'
                              }
                            >
                              Team {pl.team}
                            </span>
                            <span className="text-slate-400">
                              {SHIPS[pl.shipId].name}
                            </span>
                          </div>
                        </div>
                      ))}
                      {roomState.fillBots && (
                        <div className="text-[11px] text-slate-400">
                          Empty team slots will be filled with clearly-marked AI
                          BOTS on match start.
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateLobbyPlayer({
                            team: localLobbyPlayer?.team === 'A' ? 'B' : 'A',
                          })
                        }
                        className="flex-1 py-2 rounded-lg bg-[#1a2042] text-xs text-slate-200 hover:bg-[#232b56] cursor-pointer"
                      >
                        Switch Team
                      </button>
                      {isHost && (
                        <button
                          type="button"
                          onClick={onStartOnlineMatch}
                          className="flex-1 py-2 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-display font-bold text-xs cursor-pointer"
                        >
                          Launch Online Match
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Spacecraft & Skin Selector */}
          <div className="lg:col-span-7 space-y-5">
            <div>
              <div className="text-xs font-semibold text-slate-300 mb-2">
                Select Spacecraft
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(Object.keys(SHIPS) as ShipId[]).map((id) => {
                  const s = SHIPS[id];
                  const selected = profile.selectedShip === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        onSelectShip(id);
                        if (roomState) onUpdateLobbyPlayer({ shipId: id });
                      }}
                      className={`p-4 rounded-xl border text-left transition-colors cursor-pointer ${
                        selected
                          ? 'bg-[#192044] border-sky-400'
                          : 'bg-[#0c0f22] border-indigo-400/20 hover:border-indigo-400/45'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-display font-bold text-sm text-white">
                          {s.name}
                        </span>
                        <span
                          className="text-[11px] font-semibold"
                          style={{ color: s.accentHex }}
                        >
                          {s.role}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-snug mb-3">
                        {s.description}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] font-mono-num text-slate-300">
                        <span className="flex items-center gap-1">
                          <Shield className="w-3 h-3 text-emerald-300" />
                          {s.baseHp + profile.upgrades.hull * 15} HP
                        </span>
                        <span className="flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-300" />
                          {s.abilityName}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Ship Ability Detail & Skins */}
            <div className="p-4 rounded-xl bg-[#0c0f22] border border-indigo-400/20 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-sky-300">
                    Special Ability:{' '}
                    {SHIPS[profile.selectedShip].abilityName}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {SHIPS[profile.selectedShip].abilityDesc}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-indigo-400/15">
                <div className="text-xs font-semibold text-slate-300 mb-2">
                  Spacecraft Skin
                </div>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(SKINS) as SkinId[]).map((skinId) => {
                    const sk = SKINS[skinId];
                    const unlocked = profile.unlockedSkins.includes(skinId);
                    const active = profile.selectedSkin === skinId;
                    return (
                      <button
                        key={skinId}
                        type="button"
                        disabled={!unlocked}
                        onClick={() => {
                          onSelectSkin(skinId);
                          if (roomState) onUpdateLobbyPlayer({ skinId });
                        }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                          !unlocked
                            ? 'opacity-45 cursor-not-allowed bg-[#11152c] border-indigo-400/10 text-slate-500'
                            : active
                              ? 'bg-sky-400/15 border-sky-400 text-white cursor-pointer'
                              : 'bg-[#121733] border-indigo-400/20 text-slate-300 cursor-pointer hover:border-indigo-400/50'
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-sm inline-block"
                          style={{ backgroundColor: sk.trimHex }}
                        />
                        <span>{sk.name}</span>
                        {!unlocked && (
                          <span className="text-[10px] text-amber-300">
                            ({sk.cost}c in Upgrades)
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="px-6 py-4 border-t border-indigo-400/15 flex items-center justify-between bg-[#0f1328]">
          <div className="text-xs text-slate-400">
            Selected: {SHIPS[profile.selectedShip].name} ·{' '}
            {SKINS[profile.selectedSkin].name}
          </div>
          {subMode !== 'online' ? (
            <button
              type="button"
              onClick={() =>
                onStartOfflineMatch({
                  mode,
                  subMode,
                  squadSize,
                  difficulty,
                })
              }
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-display font-bold text-sm cursor-pointer"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>Launch Battle</span>
            </button>
          ) : (
            <div className="text-xs text-slate-300">
              {roomState
                ? isHost
                  ? 'Click "Launch Online Match" above when pilots are ready.'
                  : 'Waiting for room host to launch the match...'
                : 'Create or join an online room to start.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
