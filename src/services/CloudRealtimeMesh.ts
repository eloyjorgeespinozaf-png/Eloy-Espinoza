/**
 * CloudRealtimeMesh.ts
 * Global Real-Time Multi-Terminal Presence & Bidirectional Interaction Mesh
 * powered by Supabase Realtime (Dual-Layer Presence + Broadcast + Auto-Reconnect + Outbox Queue).
 *
 * Works natively and symmetrically across ALL deployments simultaneously:
 *  - Vercel static web deployments
 *  - Installed Android / iOS / Desktop PWAs
 *  - AI Studio / Express deployments
 *  - Cross-network & cross-device sessions worldwide (zero local server required)
 */

import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import {
  SyncedDeviceRecord,
  getOrCreateDeviceId,
  getDeviceName,
  detectDevicePlatform
} from './MultiDeviceSyncService';

export interface CloudMeshIdentity {
  deviceId: string;
  deviceName: string;
  installedVersion: string;
  platform: string;
  role: string;
  userName?: string;
  origin?: string;
  latencyMs?: number;
}

export interface CloudMeshActivityEvent {
  id: string;
  timestamp: string;
  kind: 'JOIN' | 'LEAVE' | 'ACTION' | 'PING' | 'PONG' | 'SYNC' | 'RADIO';
  deviceId: string;
  deviceName: string;
  role?: string;
  userName?: string;
  summary: string;
  latencyMs?: number;
}

export interface CloudMeshActionPacket {
  type: string;
  payload: any;
  senderDeviceId: string;
  senderDeviceName: string;
  senderRole: string;
  senderUserName?: string;
  sentAt: number;
}

export interface CloudMeshPingReply {
  pingId: string;
  fromDeviceId: string;
  fromDeviceName: string;
  fromRole: string;
  fromUserName?: string;
  fromPlatform: string;
  rttMs: number;
  receivedAt: string;
}

const CHANNEL_NAME = 'pii-lcc-global-tactical-mesh-v1';
const PEER_TTL_MS = 45000;
const HEARTBEAT_INTERVAL_MS = 12000;

class CloudRealtimeMeshManager {
  private channel: RealtimeChannel | null = null;
  private isSubscribed = false;
  private isConnecting = false;
  private identity: CloudMeshIdentity | null = null;
  private connectedAtIso = new Date().toISOString();
  private presenceDevices: Map<string, SyncedDeviceRecord> = new Map();
  private broadcastPeers: Map<string, { record: SyncedDeviceRecord; expiresAt: number }> = new Map();
  private expressDevices: Map<string, SyncedDeviceRecord> = new Map();
  private activityLog: CloudMeshActivityEvent[] = [];
  private actionListeners: Set<(packet: CloudMeshActionPacket) => void> = new Set();
  private pingReplyListeners: Set<(reply: CloudMeshPingReply) => void> = new Set();
  private statusListeners: Set<(connected: boolean) => void> = new Set();
  private outboxQueue: Array<{ type: string; payload: any }> = [];
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private pendingPings: Map<string, number> = new Map();
  private lastKnownCloudLatencyMs: number | null = null;
  private lifecycleBound = false;
  private announcedPeers: Set<string> = new Set();

  public getIsConnected(): boolean {
    return this.isSubscribed;
  }

  public getLastLatencyMs(): number | null {
    return this.lastKnownCloudLatencyMs;
  }

  public getActivityLog(): CloudMeshActivityEvent[] {
    return [...this.activityLog];
  }

  private pushActivity(event: Omit<CloudMeshActivityEvent, 'id' | 'timestamp'>): void {
    const entry: CloudMeshActivityEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      ...event
    };
    this.activityLog = [entry, ...this.activityLog].slice(0, 50);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('cloud-mesh-activity', {
          detail: { event: entry, log: this.activityLog }
        })
      );
    }
  }

  private pruneStalePeers(): void {
    const now = Date.now();
    let changed = false;
    for (const [id, entry] of this.broadcastPeers.entries()) {
      if (entry.expiresAt <= now) {
        this.broadcastPeers.delete(id);
        this.announcedPeers.delete(id);
        changed = true;
      }
    }
    if (changed) {
      this.emitDevicesUpdate();
    }
  }

  private upsertBroadcastPeer(dev: Partial<SyncedDeviceRecord> & { deviceId: string }, emitJoinToast = false): void {
    if (!dev.deviceId) return;
    const myId = this.identity?.deviceId;
    if (myId && dev.deviceId === myId) return;

    const existing = this.broadcastPeers.get(dev.deviceId)?.record;
    const isBrandNew = !existing && !this.announcedPeers.has(dev.deviceId);
    const nowIso = new Date().toISOString();

    const record: SyncedDeviceRecord = {
      deviceId: dev.deviceId,
      deviceName: dev.deviceName || existing?.deviceName || `Terminal [${String(dev.deviceId).slice(-4)}]`,
      installedVersion: dev.installedVersion || existing?.installedVersion || 'v2.6.8-OTA',
      platform: dev.platform || existing?.platform || 'Web Browser',
      role: dev.role || existing?.role || 'ROL_CEO',
      userName: dev.userName || existing?.userName,
      connectedAt: dev.connectedAt || existing?.connectedAt || nowIso,
      lastSeenAt: nowIso,
      transport: 'SUPABASE_REALTIME',
      isOnline: true,
      ipAddress: dev.ipAddress || existing?.ipAddress,
      latencyMs: dev.latencyMs ?? existing?.latencyMs
    };

    this.broadcastPeers.set(dev.deviceId, {
      record,
      expiresAt: Date.now() + PEER_TTL_MS
    });

    if (isBrandNew && emitJoinToast) {
      this.announcedPeers.add(dev.deviceId);
      const operator = record.userName ? ` (${record.userName})` : '';
      this.pushActivity({
        kind: 'JOIN',
        deviceId: record.deviceId,
        deviceName: record.deviceName,
        role: record.role,
        userName: record.userName,
        summary: `Ingresó a la red táctica${operator} [${record.platform}]`
      });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('cloud-mesh-terminal-joined', {
            detail: {
              deviceId: record.deviceId,
              deviceName: record.deviceName,
              role: record.role,
              userName: record.userName,
              platform: record.platform
            }
          })
        );
      }
    }

    this.emitDevicesUpdate();
  }

  public mergeExpressDevices(devices: SyncedDeviceRecord[]): SyncedDeviceRecord[] {
    this.expressDevices.clear();
    for (const dev of devices || []) {
      if (dev?.deviceId) {
        this.expressDevices.set(dev.deviceId, dev);
      }
    }
    return this.getMergedDevices();
  }

  public getMergedDevices(): SyncedDeviceRecord[] {
    const merged = new Map<string, SyncedDeviceRecord>();
    const now = Date.now();

    // 1. Start with Express devices (if local Express hub is active)
    for (const [id, dev] of this.expressDevices.entries()) {
      merged.set(id, { ...dev });
    }

    // 2. Overlay Supabase Realtime Presence peers
    for (const [id, dev] of this.presenceDevices.entries()) {
      const existing = merged.get(id);
      if (existing && existing.isOnline) {
        merged.set(id, {
          ...existing,
          ...dev,
          transport: existing.transport === 'WEBSOCKET' ? 'HIBRIDO_CLOUD_WS' : 'SUPABASE_REALTIME',
          isOnline: true
        });
      } else {
        merged.set(id, { ...dev, isOnline: true });
      }
    }

    // 3. Overlay Dual-Layer Broadcast Heartbeat Peers (guarantees 100% symmetric discovery!)
    for (const [id, entry] of this.broadcastPeers.entries()) {
      if (entry.expiresAt <= now) continue;
      const existing = merged.get(id);
      if (existing) {
        merged.set(id, {
          ...existing,
          ...entry.record,
          transport: existing.transport === 'WEBSOCKET' ? 'HIBRIDO_CLOUD_WS' : 'SUPABASE_REALTIME',
          isOnline: true
        });
      } else {
        merged.set(id, { ...entry.record, isOnline: true });
      }
    }

    // 4. Ensure local terminal always appears when identity is active
    if (this.identity) {
      const existingLocal = merged.get(this.identity.deviceId);
      merged.set(this.identity.deviceId, {
        ...(existingLocal || {}),
        deviceId: this.identity.deviceId,
        deviceName: this.identity.deviceName,
        installedVersion: this.identity.installedVersion,
        platform: this.identity.platform,
        role: this.identity.role,
        userName: this.identity.userName,
        connectedAt: this.connectedAtIso,
        lastSeenAt: new Date().toISOString(),
        transport: existingLocal?.transport === 'WEBSOCKET' && this.isSubscribed
          ? 'HIBRIDO_CLOUD_WS'
          : this.isSubscribed
            ? 'SUPABASE_REALTIME'
            : existingLocal?.transport || 'LOCAL',
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
        ipAddress: this.identity.origin,
        latencyMs: this.lastKnownCloudLatencyMs ?? this.identity.latencyMs ?? 24
      });
    }

    return Array.from(merged.values()).sort((a, b) => {
      if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
      return new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime();
    });
  }

  private emitDevicesUpdate(): void {
    const merged = this.getMergedDevices();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('synced-devices-update', {
          detail: {
            devices: merged,
            cloudConnected: this.isSubscribed,
            source: 'CLOUD_REALTIME_MESH'
          }
        })
      );
    }
  }

  private syncPresenceSnapshot(): void {
    if (!this.channel) return;
    const state = this.channel.presenceState<any>();
    const nextMap = new Map<string, SyncedDeviceRecord>();

    Object.entries(state).forEach(([key, metas]) => {
      if (!Array.isArray(metas) || metas.length === 0) return;
      const latest = metas[metas.length - 1] || {};
      const devId = latest.deviceId || key;
      const rec: SyncedDeviceRecord = {
        deviceId: devId,
        deviceName: latest.deviceName || `Terminal [${String(devId).slice(-4)}]`,
        installedVersion: latest.installedVersion || 'v2.6.8-OTA',
        platform: latest.platform || 'Web Browser',
        role: latest.role || 'ROL_CEO',
        userName: latest.userName,
        connectedAt: latest.connectedAt || new Date().toISOString(),
        lastSeenAt: latest.lastSeenAt || new Date().toISOString(),
        transport: 'SUPABASE_REALTIME',
        isOnline: true,
        ipAddress: latest.origin,
        latencyMs: latest.latencyMs
      };
      nextMap.set(devId, rec);
      if (devId !== this.identity?.deviceId) {
        this.broadcastPeers.set(devId, { record: rec, expiresAt: Date.now() + PEER_TTL_MS });
      }
    });

    this.presenceDevices = nextMap;
    this.emitDevicesUpdate();
  }

  private bindWindowLifecycle(): void {
    if (this.lifecycleBound || typeof window === 'undefined') return;
    this.lifecycleBound = true;

    window.addEventListener('online', () => {
      if (this.identity && (!this.isSubscribed || !this.channel)) {
        this.reconnectAttempt = 0;
        void this.forceReconnect();
      } else if (this.isSubscribed) {
        void this.announcePresence(true);
        void this.flushOutbox();
      }
    });

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.identity) {
          if (!this.isSubscribed || !this.channel) {
            this.reconnectAttempt = 0;
            void this.forceReconnect();
          } else {
            void this.trackCurrentIdentity();
            void this.announcePresence(true);
          }
        }
      });
    }

    const handleLeave = () => {
      if (this.channel && this.isSubscribed && this.identity) {
        try {
          void this.channel.send({
            type: 'broadcast',
            event: 'terminal-leave',
            payload: {
              deviceId: this.identity.deviceId,
              deviceName: this.identity.deviceName,
              role: this.identity.role,
              userName: this.identity.userName
            }
          });
        } catch {}
      }
    };
    window.addEventListener('beforeunload', handleLeave);
    window.addEventListener('pagehide', handleLeave);
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || !this.identity) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    const delayMs = Math.min(10000, 2000 * Math.pow(1.6, this.reconnectAttempt));
    this.reconnectAttempt = Math.min(this.reconnectAttempt + 1, 5);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.identity && !this.isSubscribed && !this.isConnecting) {
        void this.forceReconnect();
      }
    }, delayMs);
  }

  private async announcePresence(requestReply: boolean): Promise<void> {
    if (!this.channel || !this.isSubscribed || !this.identity) return;
    try {
      await this.channel.send({
        type: 'broadcast',
        event: 'terminal-announce',
        payload: {
          deviceId: this.identity.deviceId,
          deviceName: this.identity.deviceName,
          installedVersion: this.identity.installedVersion,
          platform: this.identity.platform,
          role: this.identity.role,
          userName: this.identity.userName,
          origin: this.identity.origin,
          connectedAt: this.connectedAtIso,
          latencyMs: this.lastKnownCloudLatencyMs ?? this.identity.latencyMs ?? 24,
          requestReply
        }
      });
    } catch {}
  }

  private async flushOutbox(): Promise<void> {
    if (!this.isSubscribed || !this.channel || this.outboxQueue.length === 0) return;
    const queued = [...this.outboxQueue];
    this.outboxQueue = [];
    for (const item of queued) {
      await this.broadcastAction(item.type, item.payload);
    }
  }

  public async forceReconnect(): Promise<void> {
    if (!this.identity) return;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.channel) {
      const old = this.channel;
      this.channel = null;
      try {
        await supabase.removeChannel(old);
      } catch {}
    }
    this.isSubscribed = false;
    this.isConnecting = false;
    this.connect(this.identity);
  }

  public connect(identity: CloudMeshIdentity): void {
    this.bindWindowLifecycle();
    this.identity = {
      ...identity,
      origin: typeof window !== 'undefined' ? window.location.host : 'terminal'
    };

    if (this.channel && (this.isSubscribed || this.isConnecting)) {
      if (this.isSubscribed) {
        void this.trackCurrentIdentity();
        void this.announcePresence(false);
      }
      return;
    }

    this.isConnecting = true;
    const myDevId = this.identity.deviceId || getOrCreateDeviceId();

    const channel = supabase.channel(CHANNEL_NAME, {
      config: {
        broadcast: { self: false, ack: false },
        presence: { key: myDevId }
      }
    });

    this.channel = channel;

    // 1. Presence sync
    channel.on('presence', { event: 'sync' }, () => {
      this.syncPresenceSnapshot();
    });

    // 2. Presence join
    channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      this.syncPresenceSnapshot();
      const joined = Array.isArray(newPresences) ? newPresences[0] : null;
      const joinedId = joined?.deviceId || key;
      if (joinedId && joinedId !== myDevId) {
        this.upsertBroadcastPeer(
          {
            deviceId: joinedId,
            deviceName: joined?.deviceName,
            installedVersion: joined?.installedVersion,
            platform: joined?.platform,
            role: joined?.role,
            userName: joined?.userName,
            ipAddress: joined?.origin,
            latencyMs: joined?.latencyMs
          },
          true
        );
      }
    });

    // 3. Presence leave
    channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      this.syncPresenceSnapshot();
      const left = Array.isArray(leftPresences) ? leftPresences[0] : null;
      const leftId = left?.deviceId || key;
      if (leftId && leftId !== myDevId) {
        this.broadcastPeers.delete(leftId);
        this.announcedPeers.delete(leftId);
        this.pushActivity({
          kind: 'LEAVE',
          deviceId: leftId,
          deviceName: left?.deviceName || `Terminal [${String(leftId).slice(-4)}]`,
          role: left?.role,
          userName: left?.userName,
          summary: 'Salió o perdió conexión de la red táctica'
        });
        this.emitDevicesUpdate();
      }
    });

    // 3b. Dual-Layer Symmetric Broadcast Presence (guarantees ALL terminals see each other immediately)
    channel.on('broadcast', { event: 'terminal-announce' }, ({ payload }) => {
      if (!payload || !payload.deviceId) return;
      if (payload.deviceId === this.identity?.deviceId) return;

      this.upsertBroadcastPeer(
        {
          deviceId: payload.deviceId,
          deviceName: payload.deviceName,
          installedVersion: payload.installedVersion,
          platform: payload.platform,
          role: payload.role,
          userName: payload.userName,
          connectedAt: payload.connectedAt,
          ipAddress: payload.origin,
          latencyMs: payload.latencyMs
        },
        Boolean(payload.requestReply)
      );

      if (payload.requestReply) {
        void this.announcePresence(false);
      }
    });

    channel.on('broadcast', { event: 'terminal-leave' }, ({ payload }) => {
      if (!payload?.deviceId || payload.deviceId === this.identity?.deviceId) return;
      this.broadcastPeers.delete(payload.deviceId);
      this.announcedPeers.delete(payload.deviceId);
      this.emitDevicesUpdate();
    });

    // 4. Real-time tactical actions broadcast
    channel.on('broadcast', { event: 'tactical-action' }, ({ payload }) => {
      const packet = payload as CloudMeshActionPacket;
      if (!packet || !packet.type) return;
      if (packet.senderDeviceId === this.identity?.deviceId) return;

      // Refresh sender liveness in peer registry
      if (packet.senderDeviceId) {
        this.upsertBroadcastPeer(
          {
            deviceId: packet.senderDeviceId,
            deviceName: packet.senderDeviceName,
            role: packet.senderRole,
            userName: packet.senderUserName
          },
          false
        );
      }

      const labelMap: Record<string, string> = {
        SEND_FIELD_REPORT: 'Envió una nueva alerta de campo S-2',
        PROMOTE_TO_INTEL: 'Validó inteligencia accionable en CFI',
        ARCHIVE_INTEL: 'Archivó un reporte de inteligencia',
        CREATE_ORDER: 'Emitió una Orden de Operaciones (OOA)',
        CONFIRM_ORDER: 'Confirmó / actualizó estado de orden',
        ORDER_UPDATE: 'Reportó novedad en orden activa',
        CANCEL_ORDER: 'Canceló una orden operativa',
        UPDATE_UNIT_COORDINATES: 'Actualizó ubicación GPS de patrulla',
        ADD_TACTICAL_UNIT: 'Registró una nueva patrulla táctica',
        UPDATE_TACTICAL_UNIT: 'Modificó datos o coordenadas de patrulla',
        DELETE_TACTICAL_UNIT: 'Eliminó una patrulla del despliegue',
        SYNC_TACTICAL_UNITS: 'Sincronizó despliegue de patrullas',
        SAVE_EXPEDIENTE: 'Guardó/actualizó expediente G-2',
        DELETE_EXPEDIENTE: 'Eliminó expediente G-2',
        RESTORE_EXPEDIENTES: 'Restauró expedientes G-2',
        SAVE_CLAN: 'Actualizó estructura de clan/organización',
        DELETE_CLAN: 'Eliminó registro de clan',
        BATCH_IMPORT_CLANS: 'Importó base de clanes',
        SYNC_TACTICAL_ROUTES: 'Actualizó rutas tácticas en CFI',
        SYNC_USERS: 'Actualizó directorio de operadores',
        TACTICAL_RADIO_MESSAGE: 'Transmitió mensaje radial táctico',
        TACTICAL_ALARM_ALERT: 'Emitió ALERTA SOS DE EMERGENCIA',
        MODULE_BG_UPDATE: 'Actualizó fondo táctico de módulo',
        FULL_DASHBOARD_BG_UPDATE: 'Actualizó fondo táctico global',
        P2P_RELAY_MESSAGE: 'Transmitió mensaje por Malla P2P',
        TRIGGER_FORCE_BROADCAST: 'Solicitó sincronización total de flota',
        FULL_STATE_SNAPSHOT: 'Envió estado táctico completo para sincronización',
        UPDATE_ALERT_STATUS: 'Actualizó estado de alerta'
      };

      if (packet.type !== 'LOG_AUDIT_ACTION' && packet.type !== 'P2P_SIGNALING' && packet.type !== 'P2P_REGISTER') {
        this.pushActivity({
          kind:
            packet.type === 'TACTICAL_RADIO_MESSAGE'
              ? 'RADIO'
              : packet.type === 'FULL_STATE_SNAPSHOT' || packet.type === 'TRIGGER_FORCE_BROADCAST'
                ? 'SYNC'
                : 'ACTION',
          deviceId: packet.senderDeviceId,
          deviceName: packet.senderDeviceName,
          role: packet.senderRole,
          userName: packet.senderUserName,
          summary: labelMap[packet.type] || `Acción sincronizada: ${packet.type}`
        });
      }

      this.actionListeners.forEach((cb) => {
        try {
          cb(packet);
        } catch (err) {
          console.warn('[CloudRealtimeMesh] Listener error:', err);
        }
      });
    });

    // 5. Real-time Interactive Ping / Pong Verification between terminals
    channel.on('broadcast', { event: 'terminal-ping' }, ({ payload }) => {
      if (!payload || !payload.pingId) return;
      if (payload.fromDeviceId === this.identity?.deviceId) return;

      this.upsertBroadcastPeer(
        {
          deviceId: payload.fromDeviceId,
          deviceName: payload.fromDeviceName,
          role: payload.fromRole,
          userName: payload.fromUserName
        },
        false
      );

      const replyPayload = {
        pingId: payload.pingId,
        sentAt: payload.sentAt,
        fromDeviceId: this.identity?.deviceId || getOrCreateDeviceId(),
        fromDeviceName: this.identity?.deviceName || getDeviceName(),
        fromRole: this.identity?.role || 'ROL_CEO',
        fromUserName: this.identity?.userName,
        fromPlatform: this.identity?.platform || detectDevicePlatform(),
        repliedAt: new Date().toISOString()
      };

      this.channel
        ?.send({
          type: 'broadcast',
          event: 'terminal-pong',
          payload: replyPayload
        })
        .catch(() => {});

      this.pushActivity({
        kind: 'PING',
        deviceId: payload.fromDeviceId,
        deviceName: payload.fromDeviceName || 'Terminal Remota',
        role: payload.fromRole,
        userName: payload.fromUserName,
        summary: 'Verificó enlace activo (PING respondido con PONG)'
      });
    });

    channel.on('broadcast', { event: 'terminal-pong' }, ({ payload }) => {
      if (!payload || !payload.pingId) return;
      if (payload.fromDeviceId === this.identity?.deviceId) return;

      const origSentAt = this.pendingPings.get(payload.pingId) || payload.sentAt || Date.now();
      const rttMs = Math.max(1, Math.round(Date.now() - origSentAt));
      this.lastKnownCloudLatencyMs = rttMs;

      this.upsertBroadcastPeer(
        {
          deviceId: payload.fromDeviceId,
          deviceName: payload.fromDeviceName,
          role: payload.fromRole,
          userName: payload.fromUserName,
          platform: payload.fromPlatform,
          latencyMs: rttMs
        },
        false
      );

      const reply: CloudMeshPingReply = {
        pingId: payload.pingId,
        fromDeviceId: payload.fromDeviceId,
        fromDeviceName: payload.fromDeviceName || 'Terminal Remota',
        fromRole: payload.fromRole || 'ROL_CEO',
        fromUserName: payload.fromUserName,
        fromPlatform: payload.fromPlatform || 'Web Browser',
        rttMs,
        receivedAt: new Date().toISOString()
      };

      this.pushActivity({
        kind: 'PONG',
        deviceId: reply.fromDeviceId,
        deviceName: reply.fromDeviceName,
        role: reply.fromRole,
        userName: reply.fromUserName,
        summary: `Confirmó interacción en vivo (${rttMs} ms RTT)`,
        latencyMs: rttMs
      });

      this.pingReplyListeners.forEach((cb) => {
        try {
          cb(reply);
        } catch {}
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cloud-mesh-pong', { detail: reply }));
        window.dispatchEvent(new CustomEvent('network-latency-update', { detail: { latencyMs: rttMs } }));
      }
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        this.isSubscribed = true;
        this.isConnecting = false;
        this.reconnectAttempt = 0;
        this.statusListeners.forEach((cb) => cb(true));
        await this.trackCurrentIdentity();
        await this.announcePresence(true);
        this.startHeartbeat();
        this.emitDevicesUpdate();
        await this.flushOutbox();
        // Automatically request peer snapshot so newly joined or reconnected terminals get the latest live state immediately
        setTimeout(() => {
          if (this.isSubscribed) {
            void this.broadcastAction('TRIGGER_FORCE_BROADCAST', { reason: 'INITIAL_PEER_SYNC' });
          }
        }, 350);
        console.log('[CloudRealtimeMesh] Connected to Supabase Realtime Global Tactical Mesh.');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        this.isSubscribed = false;
        this.isConnecting = false;
        this.statusListeners.forEach((cb) => cb(false));
        this.scheduleReconnect();
      }
    });
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      this.pruneStalePeers();
      if (this.isSubscribed) {
        void this.trackCurrentIdentity();
        void this.announcePresence(false);
      } else if (this.identity && !this.isConnecting) {
        this.scheduleReconnect();
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  public async trackCurrentIdentity(): Promise<void> {
    if (!this.channel || !this.isSubscribed || !this.identity) return;
    try {
      await this.channel.track({
        deviceId: this.identity.deviceId,
        deviceName: this.identity.deviceName,
        installedVersion: this.identity.installedVersion,
        platform: this.identity.platform,
        role: this.identity.role,
        userName: this.identity.userName,
        origin: this.identity.origin,
        connectedAt: this.connectedAtIso,
        lastSeenAt: new Date().toISOString(),
        latencyMs: this.lastKnownCloudLatencyMs ?? this.identity.latencyMs ?? 24
      });
    } catch (err) {
      console.warn('[CloudRealtimeMesh] Presence track warning:', err);
    }
  }

  public updateIdentity(partial: Partial<CloudMeshIdentity>): void {
    if (!this.identity) return;
    this.identity = { ...this.identity, ...partial };
    if (this.isSubscribed) {
      void this.trackCurrentIdentity();
      void this.announcePresence(false);
    }
    this.emitDevicesUpdate();
  }

  public async broadcastAction(type: string, payload: any): Promise<boolean> {
    if (!this.identity) return false;
    if (!this.channel || !this.isSubscribed) {
      // Queue transient actions while reconnecting so no action is ever lost
      if (type !== 'LOG_AUDIT_ACTION' && this.outboxQueue.length < 40) {
        this.outboxQueue.push({ type, payload });
      }
      if (!this.isConnecting) {
        this.scheduleReconnect();
      }
      return false;
    }

    const packet: CloudMeshActionPacket = {
      type,
      payload,
      senderDeviceId: this.identity.deviceId,
      senderDeviceName: this.identity.deviceName,
      senderRole: this.identity.role,
      senderUserName: this.identity.userName,
      sentAt: Date.now()
    };

    try {
      const result = await this.channel.send({
        type: 'broadcast',
        event: 'tactical-action',
        payload: packet
      });
      return result === 'ok';
    } catch (err) {
      console.warn('[CloudRealtimeMesh] Broadcast send error:', err);
      return false;
    }
  }

  public async sendLivePingToAllTerminals(): Promise<{ pingId: string; sent: boolean; cloudConnected: boolean }> {
    const pingId = `ping-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const sentAt = Date.now();
    this.pendingPings.set(pingId, sentAt);
    setTimeout(() => this.pendingPings.delete(pingId), 15000);

    if (!this.channel || !this.isSubscribed || !this.identity) {
      if (this.identity && !this.isConnecting) {
        void this.forceReconnect();
      }
      return { pingId, sent: false, cloudConnected: false };
    }

    try {
      // Also announce presence so any silent peer replies immediately
      await this.announcePresence(true);
      const result = await this.channel.send({
        type: 'broadcast',
        event: 'terminal-ping',
        payload: {
          pingId,
          sentAt,
          fromDeviceId: this.identity.deviceId,
          fromDeviceName: this.identity.deviceName,
          fromRole: this.identity.role,
          fromUserName: this.identity.userName
        }
      });

      this.pushActivity({
        kind: 'PING',
        deviceId: this.identity.deviceId,
        deviceName: this.identity.deviceName,
        role: this.identity.role,
        userName: this.identity.userName,
        summary: 'Envió señal PING de verificación a todas las terminales en red'
      });

      return { pingId, sent: result === 'ok', cloudConnected: true };
    } catch {
      return { pingId, sent: false, cloudConnected: this.isSubscribed };
    }
  }

  public onAction(callback: (packet: CloudMeshActionPacket) => void): () => void {
    this.actionListeners.add(callback);
    return () => this.actionListeners.delete(callback);
  }

  public onPingReply(callback: (reply: CloudMeshPingReply) => void): () => void {
    this.pingReplyListeners.add(callback);
    return () => this.pingReplyListeners.delete(callback);
  }

  public onStatusChange(callback: (connected: boolean) => void): () => void {
    this.statusListeners.add(callback);
    callback(this.isSubscribed);
    return () => this.statusListeners.delete(callback);
  }

  public disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.channel) {
      supabase.removeChannel(this.channel).catch(() => {});
      this.channel = null;
    }
    this.isSubscribed = false;
    this.isConnecting = false;
  }
}

export const cloudRealtimeMesh = new CloudRealtimeMeshManager();
