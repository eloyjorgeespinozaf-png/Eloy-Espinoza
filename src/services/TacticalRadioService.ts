/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * TacticalRadioService.ts
 * Canal de Radio Táctico en Tiempo Real (VHF/UHF PTT Voz + Mensajería Táctica + Presencia por Frecuencia)
 * Conecta en tiempo real a:
 *  - Mando Estratégico (ROL_CEO)
 *  - Órganos de Fusión (ROL_FUSION)
 *  - Órgano de Búsqueda (ROL_BUSQUEDA)
 *  - Órgano de Búsqueda de Terreno / Patrullas (ROL_TERRENO / ROL_PATRULLA)
 *
 * Transporte real vía Supabase Realtime (Presence + Broadcast) con streaming PCM 12kHz
 * universal (Chrome, Edge, Firefox, Safari/iOS, Android PWA) + WAV replay automático.
 */

import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { MilitaryRole } from '../types';
import { getOrCreateDeviceId, getDeviceName, detectDevicePlatform } from './MultiDeviceSyncService';
import { getAudioContext, playRadioPttStart, playRadioRogerBeep, playRadioEmergencyTone } from '../utils/audio';

export type RadioChannelId = 'CH1_CONJUNTA' | 'CH2_MANDO_CFI' | 'CH3_BUSQUEDA_TERRENO' | 'CH4_EMERGENCIA';

export interface RadioChannelDefinition {
  id: RadioChannelId;
  code: string;
  frequency: string;
  name: string;
  shortName: string;
  description: string;
  accent: 'emerald' | 'cyan' | 'amber' | 'rose';
  priority?: boolean;
}

export const TACTICAL_RADIO_CHANNELS: RadioChannelDefinition[] = [
  {
    id: 'CH1_CONJUNTA',
    code: 'CH-1',
    frequency: '148.500 MHz',
    name: 'Red Conjunta General',
    shortName: 'Conjunta',
    description: 'Mando, Fusión (CFI), Búsqueda (S-2) y Terreno / Patrullas',
    accent: 'emerald'
  },
  {
    id: 'CH2_MANDO_CFI',
    code: 'CH-2',
    frequency: '151.225 MHz',
    name: 'Mando ↔ Fusión (CFI)',
    shortName: 'Mando/CFI',
    description: 'Enlace estratégico Comando CEO-LCC y Central de Fusión',
    accent: 'cyan'
  },
  {
    id: 'CH3_BUSQUEDA_TERRENO',
    code: 'CH-3',
    frequency: '154.800 MHz',
    name: 'Búsqueda ↔ Terreno',
    shortName: 'Búsq/Terreno',
    description: 'Coordinación táctica S-2 y Patrullas en frontera',
    accent: 'amber'
  },
  {
    id: 'CH4_EMERGENCIA',
    code: 'CH-4',
    frequency: '162.100 MHz',
    name: 'Emergencia / Interdicción',
    shortName: 'Emergencia',
    description: 'Canal prioritario SOS, contacto directo y QRF',
    accent: 'rose',
    priority: true
  }
];

export interface RadioOperatorPresence {
  deviceId: string;
  deviceName: string;
  operatorName: string;
  role: MilitaryRole | string;
  organBadge: string;
  channelId: RadioChannelId;
  isTransmitting: boolean;
  platform: string;
  joinedAt: string;
}

export interface RadioTransmissionItem {
  id: string;
  kind: 'VOICE' | 'TEXT' | 'SYSTEM';
  channelId: RadioChannelId;
  senderDeviceId: string;
  senderName: string;
  senderRole: MilitaryRole | string;
  senderOrgan: string;
  timestamp: string;
  text?: string;
  durationSec?: number;
  audioUrl?: string; // Local WAV ObjectURL for instant replay
  priority?: boolean;
}

export interface ActiveSpeakerState {
  transmissionId: string;
  channelId: RadioChannelId;
  deviceId: string;
  operatorName: string;
  organBadge: string;
  role: MilitaryRole | string;
  startedAt: number;
  level: number; // 0..100 live audio meter
}

export interface RadioIdentity {
  deviceId: string;
  deviceName: string;
  operatorName: string;
  role: MilitaryRole | string;
  organBadge: string;
  platform: string;
}

export interface RadioSnapshot {
  connected: boolean;
  activeChannel: RadioChannelId;
  monitorEmergency: boolean;
  muted: boolean;
  rogerBeepEnabled: boolean;
  volume: number;
  isTransmitting: boolean;
  localMicLevel: number;
  micError: string | null;
  audioBlocked: boolean;
  activeSpeaker: ActiveSpeakerState | null;
  operators: RadioOperatorPresence[];
  messages: RadioTransmissionItem[];
  unreadByChannel: Record<RadioChannelId, number>;
}

const RADIO_CHANNEL_NAME = 'pii-lcc-tactical-radio-v1';
const TARGET_SAMPLE_RATE = 12000; // Crisp VHF voice-band (up to 6 kHz Nyquist), ultra-lightweight ~24KB/s
const CHUNK_FLUSH_SAMPLES = 4800; // 400ms frames (~9.6 KB raw -> ~12.8 KB base64)

export function getOrganBadgeForRole(role: string, organName?: string): string {
  if (role === 'ROL_CEO') return 'MANDO CEO';
  if (role === 'ROL_FUSION') return 'FUSIÓN CFI';
  if (role === 'ROL_BUSQUEDA') return 'BÚSQUEDA S-2';
  if (role === 'ROL_TERRENO' || role === 'ROL_PATRULLA') return 'TERRENO / PATRULLA';
  if (organName) return organName.slice(0, 18).toUpperCase();
  return 'OPERADOR';
}

function downsampleToInt16(input: Float32Array, inputSampleRate: number, outputSampleRate: number): Int16Array {
  if (inputSampleRate === outputSampleRate) {
    const out = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return out;
  }
  const ratio = inputSampleRate / outputSampleRate;
  const newLength = Math.max(1, Math.round(input.length / ratio));
  const result = new Int16Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.min(input.length, Math.round((offsetResult + 1) * ratio));
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer; i++) {
      accum += input[i];
      count++;
    }
    const sample = count > 0 ? accum / count : 0;
    const clamped = Math.max(-1, Math.min(1, sample));
    result[offsetResult] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

function int16ToBase64(int16: Int16Array): string {
  const bytes = new Uint8Array(int16.buffer, int16.byteOffset, int16.byteLength);
  let binary = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode(...bytes.subarray(i, i + step));
  }
  return btoa(binary);
}

function base64ToInt16(b64: string): Int16Array {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
}

function encodeInt16ChunksToWavUrl(chunks: Int16Array[], sampleRate: number): string | undefined {
  let totalSamples = 0;
  for (const c of chunks) totalSamples += c.length;
  if (totalSamples < sampleRate * 0.15) return undefined;

  const dataByteLength = totalSamples * 2;
  const buffer = new ArrayBuffer(44 + dataByteLength);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataByteLength, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // Byte rate
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // Bits per sample
  writeStr(36, 'data');
  view.setUint32(40, dataByteLength, true);

  let offset = 44;
  for (const chunk of chunks) {
    for (let i = 0; i < chunk.length; i++) {
      view.setInt16(offset, chunk[i], true);
      offset += 2;
    }
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

class TacticalRadioManager {
  private channel: RealtimeChannel | null = null;
  private connected = false;
  private connecting = false;
  private identity: RadioIdentity | null = null;
  private activeChannel: RadioChannelId = 'CH1_CONJUNTA';
  private monitorEmergency = true;
  private muted = false;
  private rogerBeepEnabled = true;
  private volume = 0.9;
  private isTransmitting = false;
  private localMicLevel = 0;
  private micError: string | null = null;
  private audioBlocked = false;
  private activeSpeaker: ActiveSpeakerState | null = null;
  private operators: RadioOperatorPresence[] = [];
  private messages: RadioTransmissionItem[] = [];
  private seenIds: Set<string> = new Set();
  private unreadByChannel: Record<RadioChannelId, number> = {
    CH1_CONJUNTA: 0,
    CH2_MANDO_CFI: 0,
    CH3_BUSQUEDA_TERRENO: 0,
    CH4_EMERGENCIA: 0
  };
  private listeners: Set<(snap: RadioSnapshot) => void> = new Set();
  private joinedAtIso = new Date().toISOString();

  // Local PTT recording state
  private mediaStream: MediaStream | null = null;
  private captureCtx: AudioContext | null = null;
  private captureSource: MediaStreamAudioSourceNode | null = null;
  private captureProcessor: ScriptProcessorNode | null = null;
  private pendingSamples: number[] = [];
  private localRecordedChunks: Int16Array[] = [];
  private currentTxId: string | null = null;
  private currentTxStartedAt = 0;
  private currentTxSeq = 0;
  private maxTxTimeout: ReturnType<typeof setTimeout> | null = null;

  // Remote voice playback state (per transmissionId)
  private remoteChunksByTx: Map<string, Int16Array[]> = new Map();
  private remoteMetaByTx: Map<string, { channelId: RadioChannelId; senderDeviceId: string; senderName: string; senderRole: string; senderOrgan: string; startedAt: number }> = new Map();
  private nextPlaybackTime = 0;
  private speakerStaleTimer: ReturnType<typeof setTimeout> | null = null;

  public getSnapshot(): RadioSnapshot {
    return {
      connected: this.connected,
      activeChannel: this.activeChannel,
      monitorEmergency: this.monitorEmergency,
      muted: this.muted,
      rogerBeepEnabled: this.rogerBeepEnabled,
      volume: this.volume,
      isTransmitting: this.isTransmitting,
      localMicLevel: this.localMicLevel,
      micError: this.micError,
      audioBlocked: this.audioBlocked,
      activeSpeaker: this.activeSpeaker,
      operators: [...this.operators],
      messages: [...this.messages],
      unreadByChannel: { ...this.unreadByChannel }
    };
  }

  private emit(): void {
    const snap = this.getSnapshot();
    this.listeners.forEach((cb) => {
      try {
        cb(snap);
      } catch {}
    });
  }

  public subscribe(listener: (snap: RadioSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public connect(params: { operatorName: string; role: MilitaryRole | string; organName?: string }): void {
    const devId = getOrCreateDeviceId();
    this.identity = {
      deviceId: devId,
      deviceName: getDeviceName(),
      operatorName: params.operatorName || 'Operador Táctico',
      role: params.role || 'ROL_PATRULLA',
      organBadge: getOrganBadgeForRole(String(params.role), params.organName),
      platform: detectDevicePlatform()
    };

    if (this.channel && (this.connected || this.connecting)) {
      if (this.connected) {
        void this.trackPresence();
      }
      this.emit();
      return;
    }

    this.connecting = true;
    const ch = supabase.channel(RADIO_CHANNEL_NAME, {
      config: {
        broadcast: { self: false, ack: false },
        presence: { key: devId }
      }
    });
    this.channel = ch;

    ch.on('presence', { event: 'sync' }, () => {
      this.refreshPresence();
    });
    ch.on('presence', { event: 'join' }, () => {
      this.refreshPresence();
    });
    ch.on('presence', { event: 'leave' }, () => {
      this.refreshPresence();
    });

    // Live PTT start
    ch.on('broadcast', { event: 'radio-ptt-start' }, ({ payload }) => {
      this.handleRemotePttStart(payload);
    });

    // Live voice audio frames
    ch.on('broadcast', { event: 'radio-voice-chunk' }, ({ payload }) => {
      this.handleRemoteVoiceChunk(payload);
    });

    // Live PTT end
    ch.on('broadcast', { event: 'radio-ptt-end' }, ({ payload }) => {
      this.handleRemotePttEnd(payload);
    });

    // Live text radio message / brevity code
    ch.on('broadcast', { event: 'radio-text' }, ({ payload }) => {
      this.handleRemoteText(payload);
    });

    ch.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        this.connected = true;
        this.connecting = false;
        await this.trackPresence();
        this.emit();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        this.connected = false;
        this.connecting = false;
        this.emit();
      }
    });
  }

  public updateIdentity(params: { operatorName: string; role: MilitaryRole | string; organName?: string }): void {
    if (!this.identity) {
      this.connect(params);
      return;
    }
    this.identity = {
      ...this.identity,
      operatorName: params.operatorName || this.identity.operatorName,
      role: params.role || this.identity.role,
      organBadge: getOrganBadgeForRole(String(params.role), params.organName)
    };
    if (this.connected) {
      void this.trackPresence();
    }
    this.emit();
  }

  private async trackPresence(): Promise<void> {
    if (!this.channel || !this.connected || !this.identity) return;
    try {
      await this.channel.track({
        deviceId: this.identity.deviceId,
        deviceName: this.identity.deviceName,
        operatorName: this.identity.operatorName,
        role: this.identity.role,
        organBadge: this.identity.organBadge,
        channelId: this.activeChannel,
        isTransmitting: this.isTransmitting,
        platform: this.identity.platform,
        joinedAt: this.joinedAtIso
      });
    } catch {}
  }

  private refreshPresence(): void {
    if (!this.channel) return;
    const state = this.channel.presenceState<any>();
    const list: RadioOperatorPresence[] = [];
    const seen = new Set<string>();

    Object.entries(state).forEach(([key, metas]) => {
      if (!Array.isArray(metas) || metas.length === 0) return;
      const latest = metas[metas.length - 1] || {};
      const devId = latest.deviceId || key;
      if (seen.has(devId)) return;
      seen.add(devId);
      list.push({
        deviceId: devId,
        deviceName: latest.deviceName || `Terminal ${String(devId).slice(-4)}`,
        operatorName: latest.operatorName || 'Operador',
        role: latest.role || 'ROL_PATRULLA',
        organBadge: latest.organBadge || getOrganBadgeForRole(String(latest.role)),
        channelId: (latest.channelId as RadioChannelId) || 'CH1_CONJUNTA',
        isTransmitting: Boolean(latest.isTransmitting),
        platform: latest.platform || 'Web',
        joinedAt: latest.joinedAt || new Date().toISOString()
      });
    });

    if (this.identity && !seen.has(this.identity.deviceId)) {
      list.unshift({
        deviceId: this.identity.deviceId,
        deviceName: this.identity.deviceName,
        operatorName: this.identity.operatorName,
        role: this.identity.role,
        organBadge: this.identity.organBadge,
        channelId: this.activeChannel,
        isTransmitting: this.isTransmitting,
        platform: this.identity.platform,
        joinedAt: this.joinedAtIso
      });
    }

    this.operators = list;
    this.emit();
  }

  public setActiveChannel(channelId: RadioChannelId): void {
    if (this.isTransmitting) {
      void this.stopPTT();
    }
    this.activeChannel = channelId;
    this.unreadByChannel[channelId] = 0;
    void this.trackPresence();
    this.emit();
  }

  public clearUnread(channelId?: RadioChannelId): void {
    if (channelId) {
      this.unreadByChannel[channelId] = 0;
    } else {
      this.unreadByChannel[this.activeChannel] = 0;
    }
    this.emit();
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    this.emit();
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    this.emit();
  }

  public setRogerBeepEnabled(enabled: boolean): void {
    this.rogerBeepEnabled = enabled;
    this.emit();
  }

  public setMonitorEmergency(enabled: boolean): void {
    this.monitorEmergency = enabled;
    this.emit();
  }

  public unlockAudioOutput(): void {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().then(() => {
        this.audioBlocked = false;
        this.emit();
      }).catch(() => {});
    } else {
      this.audioBlocked = false;
      this.emit();
    }
  }

  private shouldHearChannel(channelId: RadioChannelId): boolean {
    if (channelId === this.activeChannel) return true;
    if (this.monitorEmergency && channelId === 'CH4_EMERGENCIA') return true;
    return false;
  }

  private pushMessage(item: RadioTransmissionItem): void {
    if (this.seenIds.has(item.id)) return;
    this.seenIds.add(item.id);
    this.messages = [item, ...this.messages].slice(0, 60);
    if (item.channelId !== this.activeChannel) {
      this.unreadByChannel[item.channelId] = (this.unreadByChannel[item.channelId] || 0) + 1;
    }
    this.emit();
  }

  private handleRemotePttStart(payload: any): void {
    if (!payload || !payload.txId) return;
    if (payload.senderDeviceId === this.identity?.deviceId) return;

    const chId = (payload.channelId as RadioChannelId) || 'CH1_CONJUNTA';
    if (!this.shouldHearChannel(chId)) {
      this.unreadByChannel[chId] = (this.unreadByChannel[chId] || 0) + 1;
      this.emit();
      return;
    }

    this.remoteChunksByTx.set(payload.txId, []);
    this.remoteMetaByTx.set(payload.txId, {
      channelId: chId,
      senderDeviceId: payload.senderDeviceId,
      senderName: payload.senderName || 'Operador',
      senderRole: payload.senderRole || 'ROL_PATRULLA',
      senderOrgan: payload.senderOrgan || 'OPERADOR',
      startedAt: Date.now()
    });

    this.activeSpeaker = {
      transmissionId: payload.txId,
      channelId: chId,
      deviceId: payload.senderDeviceId,
      operatorName: payload.senderName || 'Operador',
      organBadge: payload.senderOrgan || 'OPERADOR',
      role: payload.senderRole || 'ROL_PATRULLA',
      startedAt: Date.now(),
      level: 35
    };
    this.resetSpeakerStaleTimer();

    if (!this.muted) {
      if (chId === 'CH4_EMERGENCIA') {
        playRadioEmergencyTone(0.11 * this.volume);
      } else if (this.rogerBeepEnabled) {
        playRadioPttStart(0.08 * this.volume);
      }
    }
    this.emit();
  }

  private handleRemoteVoiceChunk(payload: any): void {
    if (!payload || !payload.txId || !payload.pcmB64) return;
    if (payload.senderDeviceId === this.identity?.deviceId) return;

    const chId = (payload.channelId as RadioChannelId) || 'CH1_CONJUNTA';
    if (!this.shouldHearChannel(chId)) return;

    try {
      const int16 = base64ToInt16(payload.pcmB64);
      const list = this.remoteChunksByTx.get(payload.txId) || [];
      list.push(int16);
      this.remoteChunksByTx.set(payload.txId, list);

      if (!this.remoteMetaByTx.has(payload.txId)) {
        this.remoteMetaByTx.set(payload.txId, {
          channelId: chId,
          senderDeviceId: payload.senderDeviceId,
          senderName: payload.senderName || 'Operador',
          senderRole: payload.senderRole || 'ROL_PATRULLA',
          senderOrgan: payload.senderOrgan || 'OPERADOR',
          startedAt: Date.now()
        });
      }

      // Compute RMS level for live visual meter
      let sumSq = 0;
      for (let i = 0; i < int16.length; i += 4) {
        const norm = int16[i] / 32768;
        sumSq += norm * norm;
      }
      const rms = Math.sqrt(sumSq / Math.max(1, int16.length / 4));
      const meterLevel = Math.min(100, Math.round(rms * 320));

      const meta = this.remoteMetaByTx.get(payload.txId)!;
      this.activeSpeaker = {
        transmissionId: payload.txId,
        channelId: chId,
        deviceId: meta.senderDeviceId,
        operatorName: meta.senderName,
        organBadge: meta.senderOrgan,
        role: meta.senderRole,
        startedAt: meta.startedAt,
        level: Math.max(12, meterLevel)
      };
      this.resetSpeakerStaleTimer();

      if (!this.muted) {
        this.schedulePcmPlayback(int16, payload.sampleRate || TARGET_SAMPLE_RATE);
      }
      this.emit();
    } catch (err) {
      console.warn('[TacticalRadio] Voice decode warning:', err);
    }
  }

  private handleRemotePttEnd(payload: any): void {
    if (!payload || !payload.txId) return;
    if (payload.senderDeviceId === this.identity?.deviceId) return;

    const chId = (payload.channelId as RadioChannelId) || 'CH1_CONJUNTA';
    const chunks = this.remoteChunksByTx.get(payload.txId) || [];
    const meta = this.remoteMetaByTx.get(payload.txId);
    this.remoteChunksByTx.delete(payload.txId);
    this.remoteMetaByTx.delete(payload.txId);

    if (this.activeSpeaker?.transmissionId === payload.txId) {
      this.activeSpeaker = null;
      if (this.speakerStaleTimer) {
        clearTimeout(this.speakerStaleTimer);
        this.speakerStaleTimer = null;
      }
    }

    const audioUrl = encodeInt16ChunksToWavUrl(chunks, payload.sampleRate || TARGET_SAMPLE_RATE);
    const durationSec = Math.max(
      1,
      Math.round((payload.durationSec || (chunks.reduce((a, c) => a + c.length, 0) / TARGET_SAMPLE_RATE)) * 10) / 10
    );

    if (this.shouldHearChannel(chId) && !this.muted && this.rogerBeepEnabled) {
      playRadioRogerBeep(0.08 * this.volume);
    }

    this.pushMessage({
      id: payload.txId,
      kind: 'VOICE',
      channelId: chId,
      senderDeviceId: payload.senderDeviceId || meta?.senderDeviceId || 'remote',
      senderName: payload.senderName || meta?.senderName || 'Operador',
      senderRole: payload.senderRole || meta?.senderRole || 'ROL_PATRULLA',
      senderOrgan: payload.senderOrgan || meta?.senderOrgan || 'OPERADOR',
      timestamp: payload.timestamp || new Date().toISOString(),
      durationSec,
      audioUrl,
      priority: chId === 'CH4_EMERGENCIA'
    });
  }

  private handleRemoteText(payload: any): void {
    if (!payload || !payload.id || !payload.text) return;
    if (payload.senderDeviceId === this.identity?.deviceId) return;

    const chId = (payload.channelId as RadioChannelId) || 'CH1_CONJUNTA';
    if (this.shouldHearChannel(chId) && !this.muted) {
      if (chId === 'CH4_EMERGENCIA') {
        playRadioEmergencyTone(0.1 * this.volume);
      } else if (this.rogerBeepEnabled) {
        playRadioRogerBeep(0.06 * this.volume);
      }
    }

    this.pushMessage({
      id: payload.id,
      kind: 'TEXT',
      channelId: chId,
      senderDeviceId: payload.senderDeviceId,
      senderName: payload.senderName || 'Operador',
      senderRole: payload.senderRole || 'ROL_PATRULLA',
      senderOrgan: payload.senderOrgan || 'OPERADOR',
      timestamp: payload.timestamp || new Date().toISOString(),
      text: String(payload.text).slice(0, 400),
      priority: chId === 'CH4_EMERGENCIA'
    });
  }

  private schedulePcmPlayback(int16: Int16Array, sampleRate: number): void {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {
        this.audioBlocked = true;
        this.emit();
      });
    }

    const audioBuffer = ctx.createBuffer(1, int16.length, sampleRate);
    const channelData = audioBuffer.getChannelData(0);
    for (let i = 0; i < int16.length; i++) {
      channelData[i] = int16[i] / 32768;
    }

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;

    // Authentic clear VHF voice-band shaping (300Hz highpass -> 3600Hz lowpass)
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 260;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3800;

    const gain = ctx.createGain();
    gain.gain.value = Math.min(1.35, this.volume * 1.15);

    source.connect(hp);
    hp.connect(lp);
    lp.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    const startAt = Math.max(now + 0.02, this.nextPlaybackTime);
    source.start(startAt);
    this.nextPlaybackTime = startAt + audioBuffer.duration;
  }

  private resetSpeakerStaleTimer(): void {
    if (this.speakerStaleTimer) clearTimeout(this.speakerStaleTimer);
    this.speakerStaleTimer = setTimeout(() => {
      this.activeSpeaker = null;
      this.emit();
    }, 3500);
  }

  public async startPTT(): Promise<boolean> {
    if (this.isTransmitting) return true;
    if (!this.identity) return false;
    this.micError = null;
    this.unlockAudioOutput();

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.micError = 'Este navegador no soporta captura de micrófono. Puede usar mensajes de texto táctico.';
      this.emit();
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const captureCtx = new AudioCtx();
      if (captureCtx.state === 'suspended') {
        await captureCtx.resume();
      }

      const source = captureCtx.createMediaStreamSource(stream);
      // ScriptProcessorNode provides universal cross-browser PCM access (Chrome, Edge, Safari, Firefox, Mobile)
      const processor = captureCtx.createScriptProcessor(4096, 1, 1);

      this.mediaStream = stream;
      this.captureCtx = captureCtx;
      this.captureSource = source;
      this.captureProcessor = processor;
      this.pendingSamples = [];
      this.localRecordedChunks = [];

      const txId = `ptt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      this.currentTxId = txId;
      this.currentTxStartedAt = Date.now();
      this.currentTxSeq = 0;
      this.isTransmitting = true;
      this.localMicLevel = 15;

      if (!this.muted && this.rogerBeepEnabled) {
        playRadioPttStart(0.08 * this.volume);
      }

      void this.trackPresence();
      this.channel?.send({
        type: 'broadcast',
        event: 'radio-ptt-start',
        payload: {
          txId,
          channelId: this.activeChannel,
          senderDeviceId: this.identity.deviceId,
          senderName: this.identity.operatorName,
          senderRole: this.identity.role,
          senderOrgan: this.identity.organBadge,
          sampleRate: TARGET_SAMPLE_RATE,
          timestamp: new Date().toISOString()
        }
      }).catch(() => {});

      const inputRate = captureCtx.sampleRate || 48000;

      processor.onaudioprocess = (ev) => {
        if (!this.isTransmitting || !this.currentTxId || !this.identity) return;
        const input = ev.inputBuffer.getChannelData(0);

        // Compute live mic VU meter
        let sumSq = 0;
        for (let i = 0; i < input.length; i += 8) {
          sumSq += input[i] * input[i];
        }
        const rms = Math.sqrt(sumSq / Math.max(1, input.length / 8));
        this.localMicLevel = Math.min(100, Math.max(8, Math.round(rms * 380)));

        const downsampled = downsampleToInt16(input, inputRate, TARGET_SAMPLE_RATE);
        for (let i = 0; i < downsampled.length; i++) {
          this.pendingSamples.push(downsampled[i]);
        }

        if (this.pendingSamples.length >= CHUNK_FLUSH_SAMPLES) {
          this.flushPendingVoiceChunk();
        }
        this.emit();
      };

      // Silent sink so ScriptProcessorNode ticks without echoing local mic into speakers
      const silentGain = captureCtx.createGain();
      silentGain.gain.value = 0;
      source.connect(processor);
      processor.connect(silentGain);
      silentGain.connect(captureCtx.destination);

      // Safety auto-release after 60s continuous transmission (standard VHF timeout timer)
      if (this.maxTxTimeout) clearTimeout(this.maxTxTimeout);
      this.maxTxTimeout = setTimeout(() => {
        if (this.isTransmitting) {
          void this.stopPTT();
        }
      }, 60000);

      this.emit();
      return true;
    } catch (err: any) {
      const msg =
        err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError'
          ? 'Permiso de micrófono denegado. Habilite el micrófono en el navegador para hablar por radio.'
          : err?.name === 'NotFoundError'
            ? 'No se detectó micrófono en esta terminal. Puede escuchar la radio y enviar mensajes de texto.'
            : 'No se pudo activar el micrófono para transmisión PTT.';
      this.micError = msg;
      this.isTransmitting = false;
      this.emit();
      return false;
    }
  }

  private flushPendingVoiceChunk(): void {
    if (this.pendingSamples.length === 0 || !this.currentTxId || !this.identity) return;
    const chunk = new Int16Array(this.pendingSamples);
    this.pendingSamples = [];
    this.localRecordedChunks.push(chunk);

    const pcmB64 = int16ToBase64(chunk);
    const seq = this.currentTxSeq++;
    this.channel?.send({
      type: 'broadcast',
      event: 'radio-voice-chunk',
      payload: {
        txId: this.currentTxId,
        seq,
        channelId: this.activeChannel,
        senderDeviceId: this.identity.deviceId,
        senderName: this.identity.operatorName,
        senderRole: this.identity.role,
        senderOrgan: this.identity.organBadge,
        sampleRate: TARGET_SAMPLE_RATE,
        pcmB64
      }
    }).catch(() => {});
  }

  public async stopPTT(): Promise<void> {
    if (!this.isTransmitting) return;
    if (this.maxTxTimeout) {
      clearTimeout(this.maxTxTimeout);
      this.maxTxTimeout = null;
    }

    // Flush remaining audio samples before closing stream
    this.flushPendingVoiceChunk();

    const txId = this.currentTxId;
    const durationSec = Math.max(0.5, Math.round(((Date.now() - this.currentTxStartedAt) / 1000) * 10) / 10);
    const recordedChunks = [...this.localRecordedChunks];

    this.isTransmitting = false;
    this.localMicLevel = 0;
    this.currentTxId = null;
    this.localRecordedChunks = [];
    this.pendingSamples = [];

    try {
      this.captureProcessor?.disconnect();
      this.captureSource?.disconnect();
      this.captureProcessor = null;
      this.captureSource = null;
      if (this.captureCtx) {
        await this.captureCtx.close().catch(() => {});
        this.captureCtx = null;
      }
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach((t) => t.stop());
        this.mediaStream = null;
      }
    } catch {}

    if (!this.muted && this.rogerBeepEnabled) {
      playRadioRogerBeep(0.08 * this.volume);
    }

    void this.trackPresence();

    if (txId && this.identity) {
      const nowIso = new Date().toISOString();
      this.channel?.send({
        type: 'broadcast',
        event: 'radio-ptt-end',
        payload: {
          txId,
          channelId: this.activeChannel,
          senderDeviceId: this.identity.deviceId,
          senderName: this.identity.operatorName,
          senderRole: this.identity.role,
          senderOrgan: this.identity.organBadge,
          sampleRate: TARGET_SAMPLE_RATE,
          durationSec,
          timestamp: nowIso
        }
      }).catch(() => {});

      const audioUrl = encodeInt16ChunksToWavUrl(recordedChunks, TARGET_SAMPLE_RATE);
      this.pushMessage({
        id: txId,
        kind: 'VOICE',
        channelId: this.activeChannel,
        senderDeviceId: this.identity.deviceId,
        senderName: this.identity.operatorName,
        senderRole: this.identity.role,
        senderOrgan: this.identity.organBadge,
        timestamp: nowIso,
        durationSec,
        audioUrl,
        priority: this.activeChannel === 'CH4_EMERGENCIA'
      });
    }

    this.emit();
  }

  public async sendTextMessage(text: string): Promise<boolean> {
    const clean = text.trim();
    if (!clean || !this.identity) return false;

    const msgId = `rtxt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const nowIso = new Date().toISOString();

    const item: RadioTransmissionItem = {
      id: msgId,
      kind: 'TEXT',
      channelId: this.activeChannel,
      senderDeviceId: this.identity.deviceId,
      senderName: this.identity.operatorName,
      senderRole: this.identity.role,
      senderOrgan: this.identity.organBadge,
      timestamp: nowIso,
      text: clean.slice(0, 400),
      priority: this.activeChannel === 'CH4_EMERGENCIA'
    };

    this.pushMessage(item);

    if (!this.muted && this.rogerBeepEnabled) {
      playRadioRogerBeep(0.06 * this.volume);
    }

    if (this.channel && this.connected) {
      try {
        await this.channel.send({
          type: 'broadcast',
          event: 'radio-text',
          payload: item
        });
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  public disconnect(): void {
    if (this.isTransmitting) {
      void this.stopPTT();
    }
    if (this.channel) {
      supabase.removeChannel(this.channel).catch(() => {});
      this.channel = null;
    }
    this.connected = false;
    this.connecting = false;
    this.emit();
  }
}

export const tacticalRadioService = new TacticalRadioManager();
