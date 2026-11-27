/**
 * CloudRealtimeMesh.ts
 * Global Real-Time Multi-Terminal Presence & Bidirectional Interaction Mesh
 * powered by Supabase Realtime (Presence + Broadcast).
 *
 * Works natively across ALL deployments simultaneously:
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

class CloudRealtimeMeshManager {
  private channel: RealtimeChannel | null = null;
  private isSubscribed = false;
  private isConnecting = false;
  private identity: CloudMeshIdentity | null = null;
  private connectedAtIso = new Date().toISOString();
  private presenceDevices: Map<string, SyncedDeviceRecord> = new Map();
  private expressDevices: Map<string, SyncedDeviceRecord> = new Map();
  private activityLog: CloudMeshActivityEvent[] = [];
  private actionListeners: Set<(packet: CloudMeshActionPacket) => void> = new Set();
  private pingReplyListeners: Set<(reply: CloudMeshPingReply) => void> = new Set();
  private statusListeners: Set<(connected: boolean) => void> = new Set();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private pendingPings: Map<string, number> = new Map();
  private lastKnownCloudLatencyMs: number | null = null;

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
    this.activityLog = [entry, ...this.activityLog].slice(0, 40);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('cloud-mesh-activity', {
          detail: { event: entry, log: this.activityLog }
        })
      );
    }
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

    // Start with Express devices (if any)
    for (const [id, dev] of this.expressDevices.entries()) {
      merged.set(id, { ...dev });
    }

    // Overlay real-time Supabase Cloud Presence (authoritative for live multi-network & Vercel terminals)
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

    // Ensure local terminal always appears when identity is active
    if (this.identity && !merged.has(this.identity.deviceId)) {
      merged.set(this.identity.deviceId, {
        deviceId: this.identity.deviceId,
        deviceName: this.identity.deviceName,
        installedVersion: this.identity.installedVersion,
        platform: this.identity.platform,
        role: this.identity.role,
        userName: this.identity.userName,
        connectedAt: this.connectedAtIso,
        lastSeenAt: new Date().toISOString(),
        transport: this.isSubscribed ? 'SUPABASE_REALTIME' : 'LOCAL',
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
        latencyMs: this.lastKnownCloudLatencyMs ?? undefined
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
      nextMap.set(devId, {
        deviceId: devId,
        deviceName: latest.deviceName || `Terminal [${String(devId).slice(-4)}]`,
        installedVersion: latest.installedVersion || 'v2.6.3-OTA',
        platform: latest.platform || 'Web Browser',
        role: latest.role || 'ROL_CEO',
        userName: latest.userName,
        connectedAt: latest.connectedAt || new Date().toISOString(),
        lastSeenAt: latest.lastSeenAt || new Date().toISOString(),
        transport: 'SUPABASE_REALTIME',
        isOnline: true,
        ipAddress: latest.origin,
        latencyMs: latest.latencyMs
      });
    });

    this.presenceDevices = nextMap;
    this.emitDevicesUpdate();
  }

  public connect(identity: CloudMeshIdentity): void {
    this.identity = {
      ...identity,
      origin: typeof window !== 'undefined' ? window.location.host : 'terminal'
    };

    if (this.channel && (this.isSubscribed || this.isConnecting)) {
      if (this.isSubscribed) {
        this.trackCurrentIdentity();
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

    // 2. Presence join (other terminal enters!)
    channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      this.syncPresenceSnapshot();
      const joined = Array.isArray(newPresences) ? newPresences[0] : null;
      const joinedId = joined?.deviceId || key;
      if (joinedId && joinedId !== myDevId) {
        const name = joined?.deviceName || `Terminal [${String(joinedId).slice(-4)}]`;
        const operator = joined?.userName ? ` (${joined.userName})` : '';
        this.pushActivity({
          kind: 'JOIN',
          deviceId: joinedId,
          deviceName: name,
          role: joined?.role,
          userName: joined?.userName,
          summary: `Ingresó a la red táctica${operator} [${joined?.platform || 'Web'}]`
        });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('cloud-mesh-terminal-joined', {
              detail: {
                deviceId: joinedId,
                deviceName: name,
                role: joined?.role,
                userName: joined?.userName,
                platform: joined?.platform
              }
            })
          );
        }
      }
    });

    // 3. Presence leave (other terminal disconnects)
    channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      this.syncPresenceSnapshot();
      const left = Array.isArray(leftPresences) ? leftPresences[0] : null;
      const leftId = left?.deviceId || key;
      if (leftId && leftId !== myDevId) {
        this.pushActivity({
          kind: 'LEAVE',
          deviceId: leftId,
          deviceName: left?.deviceName || `Terminal [${String(leftId).slice(-4)}]`,
          role: left?.role,
          userName: left?.userName,
          summary: 'Salió o perdió conexión de la red táctica'
        });
      }
    });

    // 4. Real-time tactical actions broadcast
    channel.on('broadcast', { event: 'tactical-action' }, ({ payload }) => {
      const packet = payload as CloudMeshActionPacket;
      if (!packet || !packet.type) return;
      if (packet.senderDeviceId === this.identity?.deviceId) return;

      const labelMap: Record<string, string> = {
        SEND_FIELD_REPORT: 'Envió una nueva alerta de campo S-2',
        PROMOTE_TO_INTEL: 'Validó inteligencia accionable en CFI',
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
        TACTICAL_RADIO_MESSAGE: 'Transmitió mensaje radial táctico',
        TRIGGER_FORCE_BROADCAST: 'Solicitó sincronización total de flota',
        FULL_STATE_SNAPSHOT: 'Envió estado táctico completo para sincronización',
        UPDATE_ALERT_STATUS: 'Actualizó estado de alerta'
      };

      if (packet.type !== 'LOG_AUDIT_ACTION') {
        this.pushActivity({
          kind: packet.type === 'TACTICAL_RADIO_MESSAGE' ? 'RADIO' : packet.type === 'FULL_STATE_SNAPSHOT' ? 'SYNC' : 'ACTION',
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

      // Immediately reply with PONG so the sender gets real RTT confirmation from this terminal!
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
        this.statusListeners.forEach((cb) => cb(true));
        await this.trackCurrentIdentity();
        this.startHeartbeat();
        this.emitDevicesUpdate();
        console.log('[CloudRealtimeMesh] Connected to Supabase Realtime Global Tactical Mesh.');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        this.isSubscribed = false;
        this.isConnecting = false;
        this.statusListeners.forEach((cb) => cb(false));
      }
    });
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      if (this.isSubscribed) {
        this.trackCurrentIdentity();
      }
    }, 20000);
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
      this.trackCurrentIdentity();
    }
  }

  public async broadcastAction(type: string, payload: any): Promise<boolean> {
    if (!this.channel || !this.isSubscribed || !this.identity) {
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
    // Cleanup old pending pings after 15s
    setTimeout(() => this.pendingPings.delete(pingId), 15000);

    if (!this.channel || !this.isSubscribed || !this.identity) {
      return { pingId, sent: false, cloudConnected: false };
    }

    try {
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
