/**
 * MultiDeviceSyncService.ts
 * Engine for Cross-Device and Cross-Version Synchronization (PII-LCC CAD-C2).
 * Guarantees interoperability across:
 *  - Installed PWAs on Mobile (Android / iOS)
 *  - Installed PWAs on Desktop (Windows / Mac / Linux)
 *  - Web browser terminals across different generated versions
 *  - Cross-tab / multi-window instant synchronization via BroadcastChannel
 *  - Remote Sync Hub configuration for standalone / cross-origin deployments
 */

import { safeStorage } from '../utils/storage';
import { cloudRealtimeMesh } from './CloudRealtimeMesh';
import { SUPABASE_CONFIG } from '../lib/supabase';

export interface SyncedDeviceRecord {
  deviceId: string;
  deviceName: string;
  installedVersion: string;
  platform: 'Android PWA' | 'iOS PWA' | 'Desktop PWA' | 'Web Browser' | string;
  role: string;
  userName?: string;
  connectedAt: string;
  lastSeenAt: string;
  transport: 'WEBSOCKET' | 'HTTP_POLL' | 'WEBRTC_P2P' | string;
  isOnline: boolean;
  ipAddress?: string;
  latencyMs?: number;
}

export interface SyncEngineStatus {
  isOnline: boolean;
  activeTransport: 'WEBSOCKET' | 'HTTP_POLL' | 'OFFLINE';
  serverVersion: string;
  localVersion: string;
  activeNodeUrl: string;
  registeredDeviceId: string;
  registeredDeviceName: string;
  lastSyncTimestamp: number;
  connectedDevices: SyncedDeviceRecord[];
  isCrossVersionCompatible: boolean;
}

const STORAGE_KEYS = {
  DEVICE_ID: 'PII_LCC_DEVICE_ID',
  DEVICE_NAME: 'PII_LCC_DEVICE_NAME',
  CUSTOM_SYNC_HUB: 'PII_LCC_CUSTOM_SYNC_HUB',
  LAST_SYNC_TS: 'PII_LCC_LAST_SYNC_TIMESTAMP',
  OFFLINE_QUEUE: 'PII_LCC_OFFLINE_SYNC_QUEUE'
};

// Detect platform accurately
export function detectDevicePlatform(): 'Android PWA' | 'iOS PWA' | 'Desktop PWA' | 'Web Browser' {
  if (typeof window === 'undefined') return 'Web Browser';

  const userAgent = navigator.userAgent || '';
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                       (navigator as any).standalone === true || 
                       document.referrer.includes('android-app://');

  const isAndroid = /Android/i.test(userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);

  if (isStandalone) {
    if (isAndroid) return 'Android PWA';
    if (isIOS) return 'iOS PWA';
    return 'Desktop PWA';
  }

  if (isAndroid) return 'Android PWA';
  if (isIOS) return 'iOS PWA';
  return 'Web Browser';
}

// Generate or retrieve persistent Device ID
export function getOrCreateDeviceId(): string {
  let devId = safeStorage.getItem(STORAGE_KEYS.DEVICE_ID);
  if (!devId) {
    const randomSuffix = Math.random().toString(36).substring(2, 9).toUpperCase();
    devId = `NODE-${randomSuffix}`;
    safeStorage.setItem(STORAGE_KEYS.DEVICE_ID, devId);
  }
  return devId;
}

// Get or set Device Name
export function getDeviceName(): string {
  const saved = safeStorage.getItem(STORAGE_KEYS.DEVICE_NAME);
  if (saved) return saved;

  const platform = detectDevicePlatform();
  const id = getOrCreateDeviceId();
  const defaultName = `${platform} [${id.slice(-4)}]`;
  return defaultName;
}

export function setDeviceName(name: string): void {
  safeStorage.setItem(STORAGE_KEYS.DEVICE_NAME, name.trim());
}

// Remote Sync Hub URL resolution
export function getActiveSyncHubUrl(): string {
  const custom = safeStorage.getItem(STORAGE_KEYS.CUSTOM_SYNC_HUB);
  if (custom && custom.startsWith('http')) {
    return custom.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
}

export function setCustomSyncHubUrl(url: string | null): void {
  if (!url) {
    safeStorage.removeItem(STORAGE_KEYS.CUSTOM_SYNC_HUB);
  } else {
    const cleaned = url.trim().replace(/\/+$/, '');
    safeStorage.setItem(STORAGE_KEYS.CUSTOM_SYNC_HUB, cleaned);
  }
}

// WebSocket URL resolution (supports both same-origin and configured remote hub)
export function getSyncWebSocketUrl(): string {
  const hubUrl = getActiveSyncHubUrl();
  if (!hubUrl) {
    const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = typeof window !== 'undefined' ? window.location.host : 'localhost:3000';
    return `${protocol}//${host}/ws-sync`;
  }

  try {
    const parsed = new URL(hubUrl);
    const wsProtocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${parsed.host}/ws-sync`;
  } catch {
    return `wss://${window.location.host}/ws-sync`;
  }
}

// Local BroadcastChannel for 0ms cross-tab / multi-window synchronization
let localSyncChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    localSyncChannel = new BroadcastChannel('pii_lcc_cross_device_sync_bus');
  }
} catch (e) {
  console.warn('[MultiDeviceSync] BroadcastChannel not supported in this environment');
}

export function broadcastLocalTabSync(type: string, payload: any): void {
  if (localSyncChannel) {
    try {
      localSyncChannel.postMessage({
        type,
        payload,
        deviceId: getOrCreateDeviceId(),
        timestamp: Date.now()
      });
    } catch (err) {
      console.warn('[MultiDeviceSync] BroadcastChannel postMessage error:', err);
    }
  }
}

export function subscribeToLocalTabSync(callback: (type: string, payload: any, senderDeviceId: string) => void): () => void {
  if (!localSyncChannel) return () => {};

  const handler = (event: MessageEvent) => {
    if (event.data && event.data.type) {
      // Don't process self-broadcasts
      if (event.data.deviceId !== getOrCreateDeviceId()) {
        callback(event.data.type, event.data.payload, event.data.deviceId);
      }
    }
  };

  localSyncChannel.addEventListener('message', handler);
  return () => {
    localSyncChannel?.removeEventListener('message', handler);
  };
}

/**
 * Normalizes incoming state payloads across ALL versions (past, present, future).
 * Ensures that if an older version misses fields or uses legacy structure,
 * the application handles it without throwing exceptions.
 */
export function normalizeCrossVersionState(state: any): {
  version: string;
  rawAlerts: any[];
  clans: any[];
  actionableIntel: any[];
  activeOrders: any[];
  tacticalUnits: any[];
  auditLogs: any[];
  expedientes: any[];
  moduleBackgrounds: Record<string, any>;
  fullDashboardBackground: Record<string, any>;
} {
  if (!state || typeof state !== 'object') {
    return {
      version: 'v2.5.0-DOCTRINAL',
      rawAlerts: [],
      clans: [],
      actionableIntel: [],
      activeOrders: [],
      tacticalUnits: [],
      auditLogs: [],
      expedientes: [],
      moduleBackgrounds: {},
      fullDashboardBackground: {}
    };
  }

  return {
    version: state.version || state.serverVersion || 'v2.5.0-DOCTRINAL',
    rawAlerts: Array.isArray(state.rawAlerts) ? state.rawAlerts : (Array.isArray(state.alerts) ? state.alerts : []),
    clans: Array.isArray(state.clans) ? state.clans : [],
    actionableIntel: Array.isArray(state.actionableIntel) ? state.actionableIntel : (Array.isArray(state.intel) ? state.intel : []),
    activeOrders: Array.isArray(state.activeOrders) ? state.activeOrders : (Array.isArray(state.orders) ? state.orders : []),
    tacticalUnits: Array.isArray(state.tacticalUnits) ? state.tacticalUnits : (Array.isArray(state.units) ? state.units : []),
    auditLogs: Array.isArray(state.auditLogs) ? state.auditLogs : (Array.isArray(state.logs) ? state.logs : []),
    expedientes: Array.isArray(state.expedientes) ? state.expedientes : (Array.isArray(state.g2Records) ? state.g2Records : []),
    moduleBackgrounds: state.moduleBackgrounds && typeof state.moduleBackgrounds === 'object' ? state.moduleBackgrounds : {},
    fullDashboardBackground: state.fullDashboardBackground && typeof state.fullDashboardBackground === 'object' ? state.fullDashboardBackground : {}
  };
}

/**
 * Fetches connected devices from both the Express sync server (if active)
 * and the global Supabase Realtime Cloud Mesh (always active on Vercel & PWAs).
 */
export async function fetchConnectedDevicesList(): Promise<SyncedDeviceRecord[]> {
  const hubUrl = getActiveSyncHubUrl();
  try {
    const res = await fetch(`${hubUrl}/api/sync/devices`, {
      headers: {
        'X-Device-Id': getOrCreateDeviceId(),
        'X-Device-Name': encodeURIComponent(getDeviceName()),
        'X-Platform': detectDevicePlatform()
      }
    });
    const ct = res.headers.get('content-type') || '';
    if (res.ok && ct.includes('application/json')) {
      const data = await res.json();
      if (Array.isArray(data.devices)) {
        return cloudRealtimeMesh.mergeExpressDevices(data.devices);
      }
    }
  } catch {
    // Express hub unavailable (e.g. static Vercel deploy) — fall back to Cloud Realtime Mesh
  }
  return cloudRealtimeMesh.getMergedDevices();
}

/**
 * Triggers a manual full-state network broadcast request across all devices.
 */
export async function triggerForceBroadcastAcrossAllDevices(): Promise<boolean> {
  const cloudSent = await cloudRealtimeMesh.broadcastAction('TRIGGER_FORCE_BROADCAST', {
    requestedAt: Date.now()
  });

  const hubUrl = getActiveSyncHubUrl();
  try {
    const res = await fetch(`${hubUrl}/api/sync/force-broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': getOrCreateDeviceId()
      }
    });
    if (res.ok) return true;
  } catch {
    // Non-blocking on static deployments
  }
  return cloudSent;
}

/**
 * Triggers an OTA upgrade broadcast to all installed versions so they can update.
 */
export async function triggerOtaUpgradeBroadcast(nextVersion?: string): Promise<boolean> {
  const hubUrl = getActiveSyncHubUrl();
  try {
    const res = await fetch(`${hubUrl}/api/sync/broadcast-ota`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': getOrCreateDeviceId()
      },
      body: JSON.stringify({
        nextVersion: nextVersion || 'v2.5.0-DOCTRINAL',
        changelog: 'Sincronización unificada de terminales móviles, de escritorio y versiones generadas.'
      })
    });
    return res.ok;
  } catch (err) {
    console.warn('[MultiDeviceSync] Error triggering OTA upgrade broadcast:', err);
    return false;
  }
}

/**
 * Sends a real-time tactical action to the central sync hub via HTTP fallback if socket is unavailable.
 */
export async function sendDirectSyncAction(type: string, payload: any): Promise<boolean> {
  const hubUrl = getActiveSyncHubUrl();
  try {
    const res = await fetch(`${hubUrl}/api/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': getOrCreateDeviceId(),
        'X-Device-Name': encodeURIComponent(getDeviceName()),
        'X-Platform': detectDevicePlatform()
      },
      body: JSON.stringify({
        action: { type, payload }
      })
    });
    return res.ok;
  } catch (err) {
    console.warn('[MultiDeviceSync] Error sending direct sync action:', err);
    return false;
  }
}

/**
 * Measures round-trip time (RTT latency) in milliseconds to the active sync hub or Supabase Cloud.
 */
export async function measureServerLatency(): Promise<number> {
  const hubUrl = getActiveSyncHubUrl();
  const endpoints = [
    `${hubUrl}/api/version?t=${Date.now()}`,
    `${hubUrl}/version.json?t=${Date.now()}`,
    `${SUPABASE_CONFIG.url}/auth/v1/settings`
  ];

  for (const endpoint of endpoints) {
    const start = performance.now();
    try {
      const headers: Record<string, string> = {};
      if (endpoint.startsWith(SUPABASE_CONFIG.url)) {
        headers['apikey'] = SUPABASE_CONFIG.anonKey;
      } else {
        headers['X-Device-Id'] = getOrCreateDeviceId();
      }
      const res = await fetch(endpoint, {
        cache: 'no-store',
        headers
      });
      if (res.ok) {
        return Math.max(1, Math.round(performance.now() - start));
      }
    } catch {
      // try next endpoint
    }
  }
  return cloudRealtimeMesh.getLastLatencyMs() ?? 0;
}

/**
 * Broadcasts patrol / tactical unit GPS coordinates in real-time to all devices.
 */
export async function broadcastUnitCoordinatesSync(unitName: string, newCoords: string, unitId?: string): Promise<boolean> {
  broadcastLocalTabSync('UPDATE_UNIT_COORDINATES', { unitName, unitId, newCoords });
  const cloudOk = await cloudRealtimeMesh.broadcastAction('UPDATE_UNIT_COORDINATES', {
    unitName,
    unitId,
    newCoords
  });
  const httpOk = await sendDirectSyncAction('UPDATE_UNIT_COORDINATES', { unitName, unitId, newCoords });
  return cloudOk || httpOk;
}

/**
 * Broadcasts an encrypted tactical comms radio message across all devices in real-time.
 */
export async function broadcastTacticalCommsSync(message: {
  senderName: string;
  role: string;
  text: string;
  channel?: string;
  timestamp?: string;
}): Promise<boolean> {
  const finalMsg = {
    ...message,
    id: `comms-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: message.timestamp || new Date().toISOString()
  };
  broadcastLocalTabSync('TACTICAL_COMMS_BROADCAST', { commsMessage: finalMsg });
  const cloudOk = await cloudRealtimeMesh.broadcastAction('TACTICAL_RADIO_MESSAGE', {
    commsMessage: finalMsg
  });
  const httpOk = await sendDirectSyncAction('TACTICAL_RADIO_MESSAGE', { commsMessage: finalMsg });
  return cloudOk || httpOk;
}


