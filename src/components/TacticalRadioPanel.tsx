/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * TacticalRadioPanel.tsx
 * Consola Flotante de Radio Táctica VHF/UHF en Tiempo Real (PTT Voz + Mensajería + Presencia Multi-Órgano)
 * Enlaza en vivo a Mando (CEO-LCC), Órganos de Fusión (CFI), Órgano de Búsqueda (S-2) y Terreno (Patrullas).
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Radio,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  ChevronDown,
  ChevronUp,
  Play,
  Square,
  Users,
  ShieldAlert,
  Lock,
  Unlock,
  Bell,
  BellOff,
  X,
  Waves
} from 'lucide-react';
import { MilitaryRole } from '../types';
import {
  tacticalRadioService,
  TACTICAL_RADIO_CHANNELS,
  RadioChannelId,
  RadioSnapshot,
  RadioTransmissionItem
} from '../services/TacticalRadioService';

interface TacticalRadioPanelProps {
  operatorName: string;
  role: MilitaryRole | string;
  organName?: string;
  isOpen: boolean;
  onToggleOpen: (open: boolean) => void;
  onStatusChange?: (summary: {
    connected: boolean;
    totalUnread: number;
    onlineCount: number;
    isReceiving: boolean;
    isTransmitting: boolean;
    activeChannelCode: string;
  }) => void;
}

const BREVITY_CODES = [
  { label: 'QSL / Recibido', text: 'QSL — Mensaje recibido y comprendido. Cambio.' },
  { label: 'En Posición', text: 'Unidad en posición táctica asignada, sin novedad. Cambio.' },
  { label: 'Contacto Visual', text: 'CONTACTO VISUAL confirmado en sector. Mantengo vigilancia. Cambio.' },
  { label: 'Apoyo QRF', text: 'SOLICITO APOYO INMEDIATO / QRF en sector operativo. Prioridad. Cambio.' }
];

function getRolePillClasses(role: string): string {
  if (role === 'ROL_CEO') return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
  if (role === 'ROL_FUSION') return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
  if (role === 'ROL_BUSQUEDA') return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
  return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
}

function getChannelAccentClasses(accent: 'emerald' | 'cyan' | 'amber' | 'rose', active: boolean): string {
  if (!active) {
    return 'bg-[#0e1420] text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-zinc-200';
  }
  switch (accent) {
    case 'cyan':
      return 'bg-cyan-950/80 text-cyan-200 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)]';
    case 'amber':
      return 'bg-amber-950/80 text-amber-200 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]';
    case 'rose':
      return 'bg-rose-950/80 text-rose-200 border-rose-500 shadow-[0_0_14px_rgba(244,63,94,0.38)]';
    default:
      return 'bg-emerald-950/80 text-emerald-200 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]';
  }
}

export const TacticalRadioPanel: React.FC<TacticalRadioPanelProps> = ({
  operatorName,
  role,
  organName,
  isOpen,
  onToggleOpen,
  onStatusChange
}) => {
  const [snap, setSnap] = useState<RadioSnapshot>(() => tacticalRadioService.getSnapshot());
  const [textInput, setTextInput] = useState('');
  const [handsFreeLatched, setHandsFreeLatched] = useState(false);
  const [txElapsedSec, setTxElapsedSec] = useState(0);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const replayAudioRef = useRef<HTMLAudioElement | null>(null);

  // Connect / keep operator identity updated on the global tactical radio mesh
  useEffect(() => {
    tacticalRadioService.connect({ operatorName, role, organName });
  }, [operatorName, role, organName]);

  // Subscribe to real-time radio state
  useEffect(() => {
    return tacticalRadioService.subscribe((nextSnap) => {
      setSnap(nextSnap);
    });
  }, []);

  // Clear unread counter when panel is open on active channel
  useEffect(() => {
    if (isOpen && snap.unreadByChannel[snap.activeChannel] > 0) {
      tacticalRadioService.clearUnread(snap.activeChannel);
    }
  }, [isOpen, snap.activeChannel, snap.unreadByChannel]);

  // Report live summary up to header button
  useEffect(() => {
    if (!onStatusChange) return;
    const totalUnread = (Object.values(snap.unreadByChannel) as number[]).reduce((a, b) => a + b, 0);
    const activeMeta = TACTICAL_RADIO_CHANNELS.find((c) => c.id === snap.activeChannel) || TACTICAL_RADIO_CHANNELS[0];
    onStatusChange({
      connected: snap.connected,
      totalUnread,
      onlineCount: snap.operators.length,
      isReceiving: Boolean(snap.activeSpeaker),
      isTransmitting: snap.isTransmitting,
      activeChannelCode: activeMeta.code
    });
  }, [snap, onStatusChange]);

  // Live transmission timer
  useEffect(() => {
    if (!snap.isTransmitting) {
      setTxElapsedSec(0);
      setHandsFreeLatched(false);
      return;
    }
    const started = Date.now();
    const timer = setInterval(() => {
      setTxElapsedSec(Math.floor((Date.now() - started) / 1000));
    }, 250);
    return () => clearInterval(timer);
  }, [snap.isTransmitting]);

  const activeChannelMeta =
    TACTICAL_RADIO_CHANNELS.find((c) => c.id === snap.activeChannel) || TACTICAL_RADIO_CHANNELS[0];

  const totalUnread = (Object.values(snap.unreadByChannel) as number[]).reduce((a, b) => a + b, 0);

  const channelMessages = snap.messages.filter(
    (m) => m.channelId === snap.activeChannel || (snap.monitorEmergency && m.channelId === 'CH4_EMERGENCIA')
  );

  const operatorsOnActiveChannel = snap.operators.filter((op) => op.channelId === snap.activeChannel);

  const handlePttPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (handsFreeLatched) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    void tacticalRadioService.startPTT();
  };

  const handlePttPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (handsFreeLatched) return;
    if (tacticalRadioService.getSnapshot().isTransmitting) {
      void tacticalRadioService.stopPTT();
    }
  };

  const handleToggleHandsFree = async () => {
    if (snap.isTransmitting) {
      setHandsFreeLatched(false);
      await tacticalRadioService.stopPTT();
    } else {
      const ok = await tacticalRadioService.startPTT();
      if (ok) {
        setHandsFreeLatched(true);
      }
    }
  };

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    const msg = textInput.trim();
    setTextInput('');
    await tacticalRadioService.sendTextMessage(msg);
  };

  const handleReplayAudio = (msg: RadioTransmissionItem) => {
    if (!msg.audioUrl) return;
    if (playingMessageId === msg.id && replayAudioRef.current) {
      replayAudioRef.current.pause();
      replayAudioRef.current = null;
      setPlayingMessageId(null);
      return;
    }
    if (replayAudioRef.current) {
      replayAudioRef.current.pause();
      replayAudioRef.current = null;
    }
    const audio = new Audio(msg.audioUrl);
    audio.volume = snap.muted ? 0 : snap.volume;
    replayAudioRef.current = audio;
    setPlayingMessageId(msg.id);
    audio.onended = () => {
      setPlayingMessageId(null);
      replayAudioRef.current = null;
    };
    audio.onerror = () => {
      setPlayingMessageId(null);
      replayAudioRef.current = null;
    };
    audio.play().catch(() => {
      setPlayingMessageId(null);
    });
  };

  const activeLevel = snap.isTransmitting
    ? snap.localMicLevel
    : snap.activeSpeaker
      ? snap.activeSpeaker.level
      : 0;

  // Compact floating mini-transceiver pill when minimized
  if (!isOpen) {
    const isHot = snap.isTransmitting || Boolean(snap.activeSpeaker);
    return (
      <div className="fixed bottom-16 md:bottom-4 right-3 md:right-4 z-[65] flex flex-col items-end gap-1.5 font-mono select-none">
        {snap.activeSpeaker && (
          <div className="bg-rose-950/95 border border-rose-500 text-rose-100 px-3 py-1.5 rounded-lg shadow-[0_0_20px_rgba(244,63,94,0.45)] flex items-center gap-2 text-[10px] animate-pulse">
            <Waves className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="font-bold uppercase">
              AL AIRE: {snap.activeSpeaker.operatorName} ({snap.activeSpeaker.organBadge})
            </span>
          </div>
        )}

        <div
          className={`flex items-center gap-1.5 p-1.5 rounded-xl border backdrop-blur-md shadow-2xl transition-all ${
            snap.isTransmitting
              ? 'bg-rose-950/95 border-rose-500 shadow-[0_0_22px_rgba(244,63,94,0.5)]'
              : snap.activeSpeaker
                ? 'bg-emerald-950/95 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                : 'bg-[#080d16]/95 border-emerald-500/40 hover:border-emerald-400/80'
          }`}
        >
          {/* Quick Mini-PTT button */}
          <button
            type="button"
            data-sound="none"
            onPointerDown={handlePttPointerDown}
            onPointerUp={handlePttPointerUp}
            onPointerCancel={handlePttPointerUp}
            style={{ touchAction: 'none' }}
            className={`px-2.5 py-2 rounded-lg text-[10px] font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              snap.isTransmitting
                ? 'bg-rose-600 text-white shadow-inner scale-95'
                : 'bg-emerald-600 hover:bg-emerald-500 text-black'
            }`}
            title={`Mantener presionado para hablar por ${activeChannelMeta.code} (${activeChannelMeta.name})`}
          >
            <Mic className={`w-3.5 h-3.5 ${snap.isTransmitting ? 'animate-pulse' : ''}`} />
            <span>{snap.isTransmitting ? `TX ${txElapsedSec}s` : 'PTT'}</span>
          </button>

          {/* Expand Full Radio Console */}
          <button
            type="button"
            onClick={() => {
              tacticalRadioService.unlockAudioOutput();
              onToggleOpen(true);
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-left cursor-pointer"
            title="Abrir Consola de Radio Táctica en Tiempo Real"
          >
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isHot
                    ? 'bg-rose-500 animate-ping'
                    : snap.connected
                      ? 'bg-emerald-400 animate-pulse'
                      : 'bg-amber-400'
                }`}
              />
              <div>
                <div className="text-[10px] font-bold text-white leading-tight flex items-center gap-1.5">
                  <span>RADIO {activeChannelMeta.code}</span>
                  <span className="text-[9px] text-emerald-400">{activeChannelMeta.frequency}</span>
                </div>
                <div className="text-[9px] text-zinc-400 leading-tight flex items-center gap-1.5">
                  <span>{snap.operators.length} en red</span>
                  {snap.muted && <span className="text-rose-400 font-bold">• SILENCIO</span>}
                </div>
              </div>
            </div>

            {totalUnread > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-orange-500 text-black text-[9px] font-black">
                {totalUnread}
              </span>
            )}
            <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
          </button>
        </div>
      </div>
    );
  }

  // Expanded Full Tactical Radio Transceiver Console
  return (
    <div className="fixed bottom-16 md:bottom-4 right-2 sm:right-4 z-[70] w-[calc(100vw-1rem)] sm:w-[420px] max-h-[82vh] flex flex-col bg-[#070b12]/98 backdrop-blur-xl border border-emerald-500/50 rounded-2xl shadow-[0_12px_50px_rgba(0,0,0,0.85)] overflow-hidden font-mono text-left">
      {/* Header Bar */}
      <div className="px-3.5 py-2.5 bg-gradient-to-r from-[#0c1624] via-[#0a121e] to-[#0c1624] border-b border-emerald-500/30 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 shrink-0">
            <Radio className={`w-4 h-4 ${snap.isTransmitting || snap.activeSpeaker ? 'animate-pulse text-rose-400' : ''}`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider truncate">
                Radio Táctica VHF en Vivo
              </h3>
              <span
                className={`text-[8px] px-1.5 py-0.5 rounded font-bold border uppercase shrink-0 ${
                  snap.connected
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                }`}
              >
                {snap.connected ? 'ENLACE VIVO' : 'ENLAZANDO'}
              </span>
            </div>
            <p className="text-[9px] text-zinc-400 truncate">
              Mando • Fusión (CFI) • Búsqueda (S-2) • Terreno
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => tacticalRadioService.setMuted(!snap.muted)}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              snap.muted
                ? 'bg-rose-950/60 border-rose-500/50 text-rose-300'
                : 'bg-[#101827] border-zinc-700 text-emerald-300 hover:border-emerald-500/60'
            }`}
            title={snap.muted ? 'Activar altavoz de radio' : 'Silenciar altavoz de radio'}
          >
            {snap.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => tacticalRadioService.setRogerBeepEnabled(!snap.rogerBeepEnabled)}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              snap.rogerBeepEnabled
                ? 'bg-[#101827] border-cyan-500/40 text-cyan-300'
                : 'bg-[#101827] border-zinc-800 text-zinc-500'
            }`}
            title={snap.rogerBeepEnabled ? 'Roger Beep activado' : 'Roger Beep desactivado'}
          >
            {snap.rogerBeepEnabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => onToggleOpen(false)}
            className="p-1.5 rounded-lg bg-[#101827] border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 cursor-pointer"
            title="Minimizar radio (sigue escuchando en segundo plano)"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Audio Unlock Banner if browser blocked autoplay */}
      {snap.audioBlocked && (
        <div className="px-3 py-1.5 bg-amber-950/70 border-b border-amber-500/40 flex items-center justify-between gap-2 text-[10px] text-amber-200">
          <span>El navegador pausó el audio de radio.</span>
          <button
            type="button"
            onClick={() => tacticalRadioService.unlockAudioOutput()}
            className="px-2 py-0.5 rounded bg-amber-500 text-black font-bold cursor-pointer"
          >
            Activar Altavoz
          </button>
        </div>
      )}

      {/* Frequency Selector (4 Military Channels) */}
      <div className="p-2.5 bg-[#090e18] border-b border-zinc-800/80 grid grid-cols-2 gap-1.5">
        {TACTICAL_RADIO_CHANNELS.map((ch) => {
          const isActive = snap.activeChannel === ch.id;
          const unread = snap.unreadByChannel[ch.id] || 0;
          const tunedCount = snap.operators.filter((o) => o.channelId === ch.id).length;
          const isSomeoneSpeakingHere =
            snap.activeSpeaker?.channelId === ch.id ||
            (snap.isTransmitting && snap.activeChannel === ch.id);

          return (
            <button
              key={ch.id}
              type="button"
              onClick={() => {
                tacticalRadioService.unlockAudioOutput();
                tacticalRadioService.setActiveChannel(ch.id as RadioChannelId);
              }}
              className={`px-2.5 py-1.5 rounded-lg border text-left transition-all cursor-pointer relative ${getChannelAccentClasses(
                ch.accent,
                isActive
              )}`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-black tracking-wide flex items-center gap-1">
                  {ch.priority && <ShieldAlert className="w-3 h-3 text-rose-400" />}
                  {ch.code} • {ch.shortName}
                </span>
                <span className="text-[8px] opacity-80">{tunedCount} op</span>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-[9px] opacity-75">{ch.frequency}</span>
                {isSomeoneSpeakingHere && (
                  <span className="text-[8px] font-black px-1 rounded bg-rose-600 text-white animate-pulse">
                    AL AIRE
                  </span>
                )}
                {!isSomeoneSpeakingHere && unread > 0 && (
                  <span className="text-[8px] font-black px-1.5 rounded-full bg-orange-500 text-black">
                    +{unread}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Live Carrier Display + Audio VU Visualizer */}
      <div
        className={`px-3 py-2.5 border-b transition-colors ${
          snap.isTransmitting
            ? 'bg-rose-950/50 border-rose-500/50'
            : snap.activeSpeaker
              ? 'bg-emerald-950/45 border-emerald-500/50'
              : 'bg-[#060a11] border-zinc-800/80'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            {snap.isTransmitting ? (
              <div className="flex items-center gap-1.5 text-rose-300 text-[11px] font-black">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
                <span className="truncate">
                  TRANSMITIENDO EN {activeChannelMeta.code} ({String(Math.floor(txElapsedSec / 60)).padStart(2, '0')}:
                  {String(txElapsedSec % 60).padStart(2, '0')})
                </span>
              </div>
            ) : snap.activeSpeaker ? (
              <div className="flex items-center gap-1.5 text-emerald-300 text-[11px] font-black">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                <span className="truncate">
                  AL AIRE: {snap.activeSpeaker.operatorName} [{snap.activeSpeaker.organBadge}]
                </span>
              </div>
            ) : (
              <div className="text-[10px] text-zinc-300 font-bold truncate">
                {activeChannelMeta.code} // {activeChannelMeta.name} ({activeChannelMeta.frequency})
              </div>
            )}
            <div className="text-[9px] text-zinc-400 truncate mt-0.5">
              {snap.isTransmitting
                ? 'Micrófono abierto — las terminales en frecuencia escuchan en tiempo real'
                : snap.activeSpeaker
                  ? 'Recibiendo voz en tiempo real por enlace VHF cifrado'
                  : activeChannelMeta.description}
            </div>
          </div>

          {/* 10-bar Live VU Audio Meter */}
          <div className="flex items-end gap-[2px] h-6 shrink-0" aria-hidden="true">
            {Array.from({ length: 10 }).map((_, idx) => {
              const threshold = (idx + 1) * 10;
              const lit = activeLevel >= threshold;
              const barHeight = 25 + idx * 8;
              return (
                <span
                  key={idx}
                  style={{ height: `${Math.min(100, barHeight)}%` }}
                  className={`w-1 rounded-sm transition-all duration-75 ${
                    lit
                      ? snap.isTransmitting
                        ? idx > 7
                          ? 'bg-rose-400'
                          : 'bg-rose-500'
                        : idx > 7
                          ? 'bg-amber-400'
                          : 'bg-emerald-400'
                      : 'bg-zinc-800'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Live Connected Operators in Tuning Strip */}
        <div className="mt-2 pt-2 border-t border-white/5 flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <span className="text-[9px] text-zinc-500 flex items-center gap-1 shrink-0">
            <Users className="w-3 h-3 text-emerald-400" />
            <span>Sintonía ({operatorsOnActiveChannel.length}/{snap.operators.length}):</span>
          </span>
          {snap.operators.map((op) => {
            const onSame = op.channelId === snap.activeChannel;
            const chCode = TACTICAL_RADIO_CHANNELS.find((c) => c.id === op.channelId)?.code || 'CH-1';
            return (
              <span
                key={op.deviceId}
                className={`text-[9px] px-1.5 py-0.5 rounded border shrink-0 flex items-center gap-1 ${
                  op.isTransmitting
                    ? 'bg-rose-600/30 border-rose-400 text-rose-200 animate-pulse font-bold'
                    : onSame
                      ? getRolePillClasses(String(op.role))
                      : 'bg-zinc-900/80 border-zinc-800 text-zinc-500'
                }`}
                title={`${op.operatorName} (${op.organBadge}) — ${op.deviceName} — Canal ${chCode}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    op.isTransmitting ? 'bg-rose-400' : onSame ? 'bg-emerald-400' : 'bg-zinc-600'
                  }`}
                />
                <span className="font-bold">{op.organBadge}</span>
                <span className="opacity-80 max-w-[75px] truncate">{op.operatorName.split(' ')[0]}</span>
                {!onSame && <span className="text-[8px] opacity-65">({chCode})</span>}
              </span>
            );
          })}
        </div>
      </div>

      {/* Radio Traffic Feed (Voice Transmissions & Text Dispatches) */}
      <div className="flex-1 min-h-[150px] max-h-[240px] overflow-y-auto p-2.5 space-y-2 bg-[#05080f]">
        {channelMessages.length === 0 ? (
          <div className="h-full min-h-[120px] flex flex-col items-center justify-center text-center text-zinc-500 px-4">
            <Radio className="w-6 h-6 text-emerald-500/40 mb-1.5" />
            <p className="text-[11px] text-zinc-400 font-bold">Frecuencia despejada ({activeChannelMeta.frequency})</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              Mantén presionado el botón <strong className="text-emerald-400">PTT</strong> para hablar en tiempo real o envía un mensaje táctico.
            </p>
          </div>
        ) : (
          channelMessages.map((msg) => {
            const msgChannel = TACTICAL_RADIO_CHANNELS.find((c) => c.id === msg.channelId);
            const isPlaying = playingMessageId === msg.id;
            return (
              <div
                key={msg.id}
                className={`rounded-lg p-2 border text-[10px] space-y-1 ${
                  msg.priority
                    ? 'bg-rose-950/35 border-rose-500/40'
                    : msg.kind === 'VOICE'
                      ? 'bg-[#0b1320] border-emerald-500/25'
                      : 'bg-[#0b101a] border-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`text-[8px] px-1.5 py-0.5 rounded border font-bold shrink-0 ${getRolePillClasses(String(msg.senderRole))}`}>
                      {msg.senderOrgan}
                    </span>
                    <span className="text-white font-bold truncate">{msg.senderName}</span>
                    {msg.channelId !== snap.activeChannel && msgChannel && (
                      <span className="text-[8px] px-1 rounded bg-rose-600 text-white font-bold shrink-0">
                        {msgChannel.code}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] text-zinc-500 shrink-0">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>

                {msg.kind === 'VOICE' ? (
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <div className="flex items-center gap-1.5 text-emerald-300">
                      <Mic className="w-3 h-3 shrink-0" />
                      <span>Transmisión de voz ({msg.durationSec ? `${msg.durationSec}s` : 'VHF'})</span>
                    </div>
                    {msg.audioUrl ? (
                      <button
                        type="button"
                        onClick={() => handleReplayAudio(msg)}
                        className={`px-2 py-0.5 rounded border text-[9px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                          isPlaying
                            ? 'bg-emerald-500 text-black border-emerald-400'
                            : 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/60'
                        }`}
                      >
                        {isPlaying ? <Square className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
                        <span>{isPlaying ? 'Detener' : 'Reproducir'}</span>
                      </button>
                    ) : (
                      <span className="text-[9px] text-zinc-500">En vivo</span>
                    )}
                  </div>
                ) : (
                  <p className="text-zinc-200 leading-relaxed break-words">{msg.text}</p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Mic Permission / Error Notice */}
      {snap.micError && (
        <div className="px-3 py-1.5 bg-rose-950/70 border-t border-rose-500/40 text-[10px] text-rose-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <MicOff className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>{snap.micError}</span>
          </div>
          <button
            type="button"
            onClick={() => setSnap((prev) => ({ ...prev, micError: null }))}
            className="text-rose-300 hover:text-white cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Primary Push-To-Talk (PTT) & Hands-Free Controls */}
      <div className="p-2.5 bg-[#090f1a] border-t border-zinc-800 space-y-2">
        <div className="flex items-stretch gap-2">
          <button
            type="button"
            data-sound="none"
            onPointerDown={handlePttPointerDown}
            onPointerUp={handlePttPointerUp}
            onPointerCancel={handlePttPointerUp}
            style={{ touchAction: 'none' }}
            className={`flex-1 py-3 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer select-none border ${
              snap.isTransmitting
                ? 'bg-rose-600 text-white border-rose-300 shadow-[0_0_25px_rgba(244,63,94,0.65)] scale-[0.99]'
                : 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-black border-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.3)]'
            }`}
          >
            <Mic className={`w-4 h-4 ${snap.isTransmitting ? 'animate-pulse' : ''}`} />
            <span>
              {snap.isTransmitting
                ? handsFreeLatched
                  ? `AL AIRE EN ${activeChannelMeta.code} (MANOS LIBRES)`
                  : `HABLANDO EN ${activeChannelMeta.code} — SUELTE AL TERMINAR`
                : `MANTENER PARA HABLAR (PTT • ${activeChannelMeta.code})`}
            </span>
          </button>

          <button
            type="button"
            data-sound="none"
            onClick={() => void handleToggleHandsFree()}
            className={`px-2.5 py-2 rounded-xl border text-[10px] font-bold flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all shrink-0 ${
              handsFreeLatched && snap.isTransmitting
                ? 'bg-rose-900/90 border-rose-400 text-white'
                : 'bg-[#101827] hover:bg-[#172338] border-zinc-700 text-zinc-300'
            }`}
            title={handsFreeLatched ? 'Finalizar transmisión manos libres' : 'Activar transmisión manos libres sin mantener presionado'}
          >
            {handsFreeLatched && snap.isTransmitting ? (
              <Unlock className="w-3.5 h-3.5 text-rose-300" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span className="text-[8px]">{handsFreeLatched && snap.isTransmitting ? 'CORTAR' : 'LIBRE'}</span>
          </button>
        </div>

        {/* Quick Brevity Codes */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
          {BREVITY_CODES.map((b) => (
            <button
              key={b.label}
              type="button"
              onClick={() => void tacticalRadioService.sendTextMessage(b.text)}
              className="text-[9px] px-2 py-1 rounded-md bg-[#111927] hover:bg-emerald-950/70 text-zinc-300 hover:text-emerald-200 border border-zinc-800 hover:border-emerald-500/40 whitespace-nowrap cursor-pointer transition-colors"
            >
              {b.label}
            </button>
          ))}
        </div>

        {/* Quick Text Radio Input */}
        <form onSubmit={(e) => void handleSendText(e)} className="flex items-center gap-1.5">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={`Mensaje rápido por ${activeChannelMeta.code}...`}
            maxLength={350}
            className="flex-1 bg-[#05080f] border border-zinc-800 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder:text-zinc-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!textInput.trim()}
            className="px-2.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-black font-bold text-xs flex items-center gap-1 cursor-pointer"
            title="Enviar mensaje de radio"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Bottom Audio Volume & Priority Emergency Monitor */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5 text-[9px] text-zinc-400">
          <div className="flex items-center gap-1.5 flex-1 max-w-[175px]">
            <Volume2 className="w-3 h-3 text-emerald-400 shrink-0" />
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(snap.volume * 100)}
              onChange={(e) => tacticalRadioService.setVolume(Number(e.target.value) / 100)}
              className="w-full accent-emerald-500 cursor-pointer h-1"
              aria-label="Volumen de radio"
            />
            <span className="w-7 text-right">{Math.round(snap.volume * 100)}%</span>
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer hover:text-zinc-200">
            <input
              type="checkbox"
              checked={snap.monitorEmergency}
              onChange={(e) => tacticalRadioService.setMonitorEmergency(e.target.checked)}
              className="w-3 h-3 accent-rose-500 cursor-pointer"
            />
            <span className="text-rose-300 font-bold">Escucha CH-4 SOS</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default TacticalRadioPanel;
