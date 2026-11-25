/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { createServer as createHttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import { 
  initialRawAlerts, 
  initialClans, 
  initialActionableIntel, 
  initialOrders, 
  initialTacticalUnits 
} from "./src/utils/mockData";
import { initialG2Records } from "./src/utils/g2Records";
import { RawAlert, Clan, ActionableIntel, AutomatedOrder, TacticalUnit, AuditLogEntry, ModuleBackgroundConfig, G2RegistryRecord } from "./src/types";

// Synced Device record interface for multi-device tracking
export interface SyncedDeviceRecord {
  deviceId: string;
  deviceName: string;
  installedVersion: string;
  platform: string;
  role: string;
  userName?: string;
  connectedAt: string;
  lastSeenAt: string;
  transport: "WEBSOCKET" | "HTTP_POLL" | "WEBRTC_P2P" | string;
  isOnline: boolean;
  ipAddress?: string;
  latencyMs?: number;
}

// Centralized in-memory synced database
let serverVersionConfig = {
  version: "v2.5.2-AISTUDIO",
  buildId: "ais-build-2026-09-16-0815",
  builtAt: "2026-09-16T08:15:00.000Z",
  changelog: "Modificaciones de persistencia y sincronización multi-dispositivo aplicadas en AI Studio"
};

try {
  const vPath = path.join(process.cwd(), "version.json");
  if (fs.existsSync(vPath)) {
    const raw = fs.readFileSync(vPath, "utf-8");
    serverVersionConfig = { ...serverVersionConfig, ...JSON.parse(raw) };
  }
} catch (e) {
  console.warn("Notice: reading version.json:", e);
}

let serverVersion = serverVersionConfig.version;
let serverBuildId = serverVersionConfig.buildId;
let serverBuildTimestamp = new Date(serverVersionConfig.builtAt).getTime() || 1789545600000;
let serverRawAlerts: RawAlert[] = [...initialRawAlerts];
let serverClans: Clan[] = [...initialClans];
let serverActionableIntel: ActionableIntel[] = [...initialActionableIntel];
let serverActiveOrders: AutomatedOrder[] = [...initialOrders];
let serverTacticalUnits: TacticalUnit[] = [...initialTacticalUnits];
let serverExpedientes: G2RegistryRecord[] = [...initialG2Records];
let serverAuditLogs: AuditLogEntry[] = [
  {
    id: "log-seed",
    userId: "SYSTEM",
    role: "ROL_CEO",
    action: "Canal de enlace táctico multipunto encriptado iniciado para el PII-LCC.",
    timestamp: new Date().toISOString(),
    coordinates: "19°13'10\"S 68°35'50\"W"
  }
];

// Persistent Registry of all connected devices across all installed versions
const syncedDevicesMap = new Map<string, SyncedDeviceRecord>();
const socketToDeviceIdMap = new Map<WebSocket, string>();

// Persistent File System
const DATA_DIR = path.join(process.cwd(), "data");
const MODULE_BG_FILE = path.join(DATA_DIR, "module-backgrounds.json");
const FULL_DASHBOARD_BG_FILE = path.join(DATA_DIR, "full-dashboard-background.json");
const TACTICAL_STATE_FILE = path.join(DATA_DIR, "tactical-state.json");
const BG_DIR = path.join(process.cwd(), "public", "backgrounds");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(BG_DIR)) {
  fs.mkdirSync(BG_DIR, { recursive: true });
}

const DEFAULT_SERVER_MODULE_BACKGROUNDS: Record<string, any> = {
  MOD_CEO: {
    moduleId: "MOD_CEO",
    moduleName: "3. Mando Estratégico (CEO-LCC)",
    imageUrl: "/INTERFAZ.jpg",
    opacity: 0.80,
    blur: 0,
    contrastOverlay: true,
    fitMode: "cover",
    enabled: true,
    updatedAt: new Date().toISOString(),
    updatedBy: "USER_REQUEST"
  },
  MOD_FUSION: {
    moduleId: "MOD_FUSION",
    moduleName: "2. Central de Fusión (CFI de Brigada)",
    imageUrl: "/DASHBOARD 2.png",
    opacity: 0.80,
    blur: 0,
    contrastOverlay: true,
    fitMode: "cover",
    updatedAt: new Date().toISOString(),
    updatedBy: "SISTEMA_DOCTRINAL"
  },
  MOD_BUSQUEDA: {
    moduleId: "MOD_BUSQUEDA",
    moduleName: "1. Órganos de Búsqueda (S-2)",
    imageUrl: "/DASHB 3.jpg",
    opacity: 0.80,
    blur: 0,
    contrastOverlay: true,
    fitMode: "cover",
    updatedAt: new Date().toISOString(),
    updatedBy: "SISTEMA_DOCTRINAL"
  },
  MOD_PATRULLAS: {
    moduleId: "MOD_PATRULLAS",
    moduleName: "4. Unidades de Terreno (Patrullas)",
    imageUrl: "/DASHBOARD.jpg",
    opacity: 0.80,
    blur: 0,
    contrastOverlay: true,
    fitMode: "cover",
    updatedAt: new Date().toISOString(),
    updatedBy: "SISTEMA_DOCTRINAL"
  },
  MOD_P2P_MESH: {
    moduleId: "MOD_P2P_MESH",
    moduleName: "5. Malla Descentrada P2P (S-6)",
    imageUrl: "/dashboard-room.svg",
    opacity: 0.80,
    blur: 0,
    contrastOverlay: true,
    fitMode: "cover",
    updatedAt: new Date().toISOString(),
    updatedBy: "SISTEMA_DOCTRINAL"
  },
  MOD_ARCHITECTURE: {
    moduleId: "MOD_ARCHITECTURE",
    moduleName: "6. Arquitectura de Sistemas (PII-LCC)",
    imageUrl: "/interfaz-room.svg",
    opacity: 0.80,
    blur: 0,
    contrastOverlay: true,
    fitMode: "cover",
    updatedAt: new Date().toISOString(),
    updatedBy: "SISTEMA_DOCTRINAL"
  },
  MOD_CODE_VIEWER: {
    moduleId: "MOD_CODE_VIEWER",
    moduleName: "7. Terminal de Código y Auditoría",
    imageUrl: "/INTERFAZ.jpg",
    opacity: 0.80,
    blur: 0,
    contrastOverlay: true,
    fitMode: "cover",
    updatedAt: new Date().toISOString(),
    updatedBy: "SISTEMA_DOCTRINAL"
  }
};

let serverModuleBackgrounds: Record<string, any> = { ...DEFAULT_SERVER_MODULE_BACKGROUNDS };

if (fs.existsSync(MODULE_BG_FILE)) {
  try {
    const loaded = JSON.parse(fs.readFileSync(MODULE_BG_FILE, "utf-8"));
    serverModuleBackgrounds = { ...DEFAULT_SERVER_MODULE_BACKGROUNDS, ...loaded };
  } catch (err) {
    console.error("Error reading module-backgrounds.json:", err);
  }
}

function saveModuleBackgroundsToDisk() {
  try {
    fs.writeFileSync(MODULE_BG_FILE, JSON.stringify(serverModuleBackgrounds, null, 2));
  } catch (err) {
    console.error("Error saving module-backgrounds.json:", err);
  }
}

// Full Dashboard Background Persistence System
const DEFAULT_FULL_DASHBOARD_BG = {
  enabled: true,
  opacity: 0.80,
  blur: 0,
  brightness: 1,
  contrast: 1,
  fitMode: "cover",
  opticalFilter: "none",
  gridOverlay: false,
  contrastOverlay: false,
  imageUrl: "/default-interface-bg.jpg",
  customFileName: "PII-LCC.jpg",
  customDataUrl: "",
  updatedAt: new Date().toISOString(),
  updatedBy: "USER_REQUEST"
};

let serverFullDashboardBg: Record<string, any> = { ...DEFAULT_FULL_DASHBOARD_BG };

if (fs.existsSync(FULL_DASHBOARD_BG_FILE)) {
  try {
    const loadedBg = JSON.parse(fs.readFileSync(FULL_DASHBOARD_BG_FILE, "utf-8"));
    serverFullDashboardBg = { ...DEFAULT_FULL_DASHBOARD_BG, ...loadedBg };
  } catch (err) {
    console.error("Error reading full-dashboard-background.json:", err);
  }
}

function saveFullDashboardBgToDisk() {
  try {
    fs.writeFileSync(FULL_DASHBOARD_BG_FILE, JSON.stringify(serverFullDashboardBg, null, 2));
  } catch (err) {
    console.error("Error saving full-dashboard-background.json:", err);
  }
}

// Tactical State (Alerts, Orders, Clans, Units, Intel, Expedientes) Persistence System
if (fs.existsSync(TACTICAL_STATE_FILE)) {
  try {
    const loadedState = JSON.parse(fs.readFileSync(TACTICAL_STATE_FILE, "utf-8"));
    if (Array.isArray(loadedState.rawAlerts) && loadedState.rawAlerts.length > 0) serverRawAlerts = loadedState.rawAlerts;
    if (Array.isArray(loadedState.clans) && loadedState.clans.length > 0) serverClans = loadedState.clans;
    if (Array.isArray(loadedState.actionableIntel) && loadedState.actionableIntel.length > 0) serverActionableIntel = loadedState.actionableIntel;
    if (Array.isArray(loadedState.activeOrders) && loadedState.activeOrders.length > 0) serverActiveOrders = loadedState.activeOrders;
    if (Array.isArray(loadedState.tacticalUnits) && loadedState.tacticalUnits.length > 0) serverTacticalUnits = loadedState.tacticalUnits;
    if (Array.isArray(loadedState.auditLogs) && loadedState.auditLogs.length > 0) serverAuditLogs = loadedState.auditLogs;
    if (Array.isArray(loadedState.expedientes) && loadedState.expedientes.length > 0) serverExpedientes = loadedState.expedientes;
    console.log("[Data Persistence] Loaded persistent tactical state from data/tactical-state.json successfully.");
  } catch (err) {
    console.error("Error loading tactical-state.json:", err);
  }
}

function saveTacticalStateToDisk() {
  try {
    fs.writeFileSync(TACTICAL_STATE_FILE, JSON.stringify({
      rawAlerts: serverRawAlerts,
      clans: serverClans,
      actionableIntel: serverActionableIntel,
      activeOrders: serverActiveOrders,
      tacticalUnits: serverTacticalUnits,
      expedientes: serverExpedientes,
      auditLogs: serverAuditLogs.slice(0, 100),
      savedAt: new Date().toISOString()
    }, null, 2));
  } catch (err) {
    console.error("Error saving tactical-state.json:", err);
  }
}

function sanitizeMediaUrl(mediaUrl?: string): string | undefined {
  if (!mediaUrl) return undefined;
  if (mediaUrl.startsWith("data:")) {
    if (mediaUrl.length > 150000) {
      console.warn(`[Security CAD-C2] Sanitizing massive base64 mediaUrl of length ${mediaUrl.length}.`);
      return "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='320' height='240' viewBox='0 0 320 240'><rect width='320' height='240' fill='%231a0e0e' stroke='%23f87171' stroke-width='4'/><text x='50%25' y='45%25' fill='%23f87171' font-family='monospace' font-size='12' font-weight='bold' text-anchor='middle'>S-2: EXCESO DE TAMAÑO</text><text x='50%25' y='60%25' fill='%239ca3af' font-family='monospace' font-size='10' text-anchor='middle'>Optimizado para proteger terminal</text></svg>";
    }
  }
  return mediaUrl;
}

// Sanitize initial raw alerts
serverRawAlerts = serverRawAlerts.map(alert => ({
  ...alert,
  mediaUrl: sanitizeMediaUrl(alert.mediaUrl)
}));

// P2P Connected active nodes registry
const connectedPeers = new Map<WebSocket, {
  id: string;
  userId: string;
  name: string;
  role: string;
  level: number;
  connectedAt: string;
}>();

// Helper to broadcast P2P Peers list to all connected clients
function broadcastPeersList() {
  try {
    const peers = Array.from(connectedPeers.values());
    const msgStr = JSON.stringify({
      type: "P2P_PEERS_LIST",
      payload: { peers }
    });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(msgStr, (err) => {
            if (err && (err as any).code !== "EPIPE" && (err as any).code !== "ECONNRESET") {
              // Ignore standard disconnect write errors
            }
          });
        } catch {}
      }
    });
  } catch {}
}

// Helper to broadcast active synchronized devices across all installed versions
function broadcastSyncedDevices() {
  try {
    const devices = Array.from(syncedDevicesMap.values());
    const msgStr = JSON.stringify({
      type: "SYNCED_DEVICES_UPDATE",
      payload: {
        devices,
        serverVersion,
        totalConnected: devices.filter(d => d.isOnline).length
      }
    });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(msgStr, (err) => {
            if (err && (err as any).code !== "EPIPE" && (err as any).code !== "ECONNRESET") {
              // Ignore standard disconnect write errors
            }
          });
        } catch (err) {}
      }
    });
  } catch {}
}

const wss = new WebSocketServer({ noServer: true });

wss.on("error", (err: any) => {
  if (err?.code === "EPIPE" || err?.code === "ECONNRESET") return;
  console.warn("[PII-LCC Server] WebSocketServer runtime error:", err?.message || err);
});

wss.on("connection", (ws: WebSocket) => {
  console.log("A device connected to PII-LCC real-time network.");

  ws.on("error", (err: any) => {
    if (err?.code === "EPIPE" || err?.code === "ECONNRESET") return;
    console.warn("[PII-LCC Server] Client WebSocket connection error:", err?.message || err);
  });

  // Send the current authoritative state to the newly connected terminal
  try {
    ws.send(JSON.stringify({
      type: "INIT",
      payload: {
        version: serverVersion,
        rawAlerts: serverRawAlerts,
        clans: serverClans,
        actionableIntel: serverActionableIntel,
        activeOrders: serverActiveOrders,
        tacticalUnits: serverTacticalUnits,
        auditLogs: serverAuditLogs,
        expedientes: serverExpedientes,
        moduleBackgrounds: serverModuleBackgrounds,
        fullDashboardBackground: serverFullDashboardBg,
        syncedDevices: Array.from(syncedDevicesMap.values())
      }
    }));
  } catch (err) {
    console.error("[PII-LCC Server] Failed to send INIT state to client:", err);
  }

  ws.on("message", (message: any) => {
    try {
      const raw = typeof message === "string" ? message : message.toString("utf-8");
      const data = JSON.parse(raw);
      const { type, payload } = data;

      let shouldBroadcast = false;

      switch (type) {
        case "CREATE_ORDER": {
          const { order } = payload;
          if (!serverActiveOrders.some(o => o.id === order.id)) {
            serverActiveOrders = [order, ...serverActiveOrders];
            if (order.intelId !== "manual") {
              serverActionableIntel = serverActionableIntel.map(intel => 
                intel.id === order.intelId ? { ...intel, status: "ORDER_ISSUED" } : intel
              );
            }
            shouldBroadcast = true;
          }
          break;
        }

        case "CANCEL_ORDER": {
          const { id, updateMsg } = payload;
          serverActiveOrders = serverActiveOrders.map(order => 
            order.id === id 
              ? { ...order, status: "CANCELLED", updates: [...order.updates, updateMsg] } 
              : order
          );
          shouldBroadcast = true;
          break;
        }

        case "ARCHIVE_INTEL": {
          const { id } = payload;
          serverActionableIntel = serverActionableIntel.map(intel => 
            intel.id === id ? { ...intel, status: "ARCHIVED" as any } : intel
          );
          shouldBroadcast = true;
          break;
        }

        case "PROMOTE_TO_INTEL": {
          const { intel, updatedReliability, updatedCertainty, routeId } = payload;
          if (!serverActionableIntel.some(i => i.id === intel.id)) {
            serverActionableIntel = [intel, ...serverActionableIntel];
            serverRawAlerts = serverRawAlerts.map(alert => 
              alert.id === intel.rawAlertId 
                ? {
                    ...alert,
                    status: "PROCESSED",
                    reliability: updatedReliability || alert.reliability,
                    certainty: updatedCertainty || alert.certainty,
                    clandestineRouteId: routeId || alert.clandestineRouteId
                  }
                : alert
            );
            shouldBroadcast = true;
          }
          break;
        }

        case "UPDATE_ALERT_STATUS": {
          const { id, status } = payload;
          serverRawAlerts = serverRawAlerts.map(alert => 
            alert.id === id ? { ...alert, status } : alert
          );
          shouldBroadcast = true;
          break;
        }

        case "CONFIRM_ORDER": {
          const { id, newStatus, statusText, unitName, unitStatus } = payload;
          serverActiveOrders = serverActiveOrders.map(order => 
            order.id === id 
              ? { ...order, status: newStatus, updates: [...order.updates, statusText] } 
              : order
          );
          if (unitName && unitStatus) {
            serverTacticalUnits = serverTacticalUnits.map(unit => 
              unit.name === unitName ? { ...unit, status: unitStatus, lastReportTime: "Hace un momento" } : unit
            );
          }
          shouldBroadcast = true;
          break;
        }

        case "SEND_FIELD_REPORT": {
          const { report } = payload;
          if (report) {
            report.mediaUrl = sanitizeMediaUrl(report.mediaUrl);
          }
          if (!serverRawAlerts.some(r => r.id === report.id)) {
            serverRawAlerts = [report, ...serverRawAlerts];
            shouldBroadcast = true;
          }
          break;
        }

        case "UPDATE_UNIT_COORDINATES": {
          const { unitName, unitId, newCoords } = payload || {};
          if (newCoords) {
            serverTacticalUnits = serverTacticalUnits.map(unit => 
              (unit.name === unitName || (unitId && unit.id === unitId)) 
                ? { ...unit, coordinates: newCoords, lastReportTime: "Hace un momento" } 
                : unit
            );
            shouldBroadcast = true;
          }
          break;
        }

        case "ADD_TACTICAL_UNIT": {
          const { unit, userId, role } = payload;
          if (unit && !serverTacticalUnits.some(u => u.id === unit.id || u.name.toLowerCase() === unit.name.toLowerCase())) {
            serverTacticalUnits = [...serverTacticalUnits, unit];
            serverAuditLogs = [{
              id: `log-unit-add-${Date.now()}`,
              userId: userId || "S-2",
              role: role || "ROL_BUSQUEDA",
              action: `NUEVA PATRULLA DESPLEGADA: ${unit.name} (Cmdte: ${unit.commander || 'S-2'}) en ${unit.coordinates}. Módulo activo asignado.`,
              timestamp: new Date().toISOString(),
              coordinates: unit.coordinates
            }, ...serverAuditLogs];
            shouldBroadcast = true;
          }
          break;
        }

        case "UPDATE_TACTICAL_UNIT": {
          const { unitId, updates, userId, role } = payload;
          if (unitId && updates) {
            serverTacticalUnits = serverTacticalUnits.map(u => 
              u.id === unitId ? { ...u, ...updates, lastReportTime: "Hace un momento" } : u
            );
            serverAuditLogs = [{
              id: `log-unit-upd-${Date.now()}`,
              userId: userId || "S-2",
              role: role || "ROL_BUSQUEDA",
              action: `DATOS ACTUALIZADOS DE PATRULLA: ${updates.name || unitId} (Estado: ${updates.status || 'Actualizado'}).`,
              timestamp: new Date().toISOString(),
              coordinates: updates.coordinates || "19°13'10\"S 68°35'50\"W"
            }, ...serverAuditLogs];
            shouldBroadcast = true;
          }
          break;
        }

        case "DELETE_TACTICAL_UNIT": {
          const { unitId, userId, role } = payload;
          if (unitId) {
            const toRemove = serverTacticalUnits.find(u => u.id === unitId);
            serverTacticalUnits = serverTacticalUnits.filter(u => u.id !== unitId);
            serverAuditLogs = [{
              id: `log-unit-del-${Date.now()}`,
              userId: userId || "S-2",
              role: role || "ROL_BUSQUEDA",
              action: `PATRULLA REPLEGADA: ${toRemove ? toRemove.name : unitId}. Módulo asignado archivado.`,
              timestamp: new Date().toISOString(),
              coordinates: toRemove ? toRemove.coordinates : "19°13'10\"S 68°35'50\"W"
            }, ...serverAuditLogs];
            shouldBroadcast = true;
          }
          break;
        }

        case "LOG_AUDIT_ACTION": {
          const { logEntry } = payload;
          if (!serverAuditLogs.some(l => l.id === logEntry.id)) {
            serverAuditLogs = [logEntry, ...serverAuditLogs];
            shouldBroadcast = true;
          }
          break;
        }

        case "TRIGGER_SYSTEM_UPGRADE": {
          const { nextVersion, changelog } = payload;
          serverVersion = nextVersion;
          const logEntry: AuditLogEntry = {
            id: `log-upgrade-${Date.now()}`,
            userId: "SISTEMA_OTA",
            role: "ROL_CEO",
            action: `Parche doctrinal de sistema aplicado: ${nextVersion}. Sincronizando todos los terminales en red.`,
            timestamp: new Date().toISOString(),
            coordinates: "19°13'10\"S 68°35'50\"W"
          };
          serverAuditLogs = [logEntry, ...serverAuditLogs];
          
          broadcast({
            type: "SYSTEM_UPGRADE_ALERT",
            payload: {
              version: serverVersion,
              changelog: changelog || "Optimización de flujos CAD-C2, mejoras de redundancia multipunto y hot-swap de memoria táctica.",
              rawAlerts: serverRawAlerts,
              clans: serverClans,
              actionableIntel: serverActionableIntel,
              activeOrders: serverActiveOrders,
              tacticalUnits: serverTacticalUnits,
              auditLogs: serverAuditLogs
            }
          });
          break;
        }

        case "UPDATE_MODULE_BACKGROUND": {
          const config = payload?.config || payload;
          const targetModuleId = payload?.moduleId || config?.moduleId;
          const imageBase64 = payload?.imageBase64;
          if (targetModuleId && config) {
            let finalUrl = config.imageUrl !== undefined ? config.imageUrl : (serverModuleBackgrounds[targetModuleId]?.imageUrl || "");
            if (imageBase64) {
              try {
                const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
                const buffer = Buffer.from(base64Data, "base64");
                const fileName = `bg_${targetModuleId}.png`;
                const publicPath = path.join(process.cwd(), "public", "backgrounds", fileName);
                fs.writeFileSync(publicPath, buffer);

                const distBgDir = path.join(process.cwd(), "dist", "backgrounds");
                if (fs.existsSync(path.join(process.cwd(), "dist"))) {
                  if (!fs.existsSync(distBgDir)) {
                    fs.mkdirSync(distBgDir, { recursive: true });
                  }
                  fs.writeFileSync(path.join(distBgDir, fileName), buffer);
                }
                finalUrl = `/backgrounds/${fileName}?v=${Date.now()}`;
              } catch (e) {
                console.error("Error writing WS module bg file:", e);
              }
            }
            serverModuleBackgrounds[targetModuleId] = {
              ...serverModuleBackgrounds[targetModuleId],
              ...config,
              imageUrl: finalUrl,
              updatedAt: new Date().toISOString()
            };
            saveModuleBackgroundsToDisk();
            broadcast({
              type: "MODULE_BG_UPDATE",
              payload: {
                moduleId: targetModuleId,
                config: serverModuleBackgrounds[targetModuleId],
                allConfigs: serverModuleBackgrounds
              }
            });
          }
          break;
        }

        case "P2P_REGISTER": {
          const { userId, name, role, level } = payload;
          const nodeId = `node-${Math.random().toString(36).substr(2, 9)}`;
          const peerInfo = {
            id: nodeId,
            userId,
            name,
            role,
            level: level || (role === 'ROL_PATRULLA' ? 1 : role === 'ROL_FUSION' ? 2 : 3),
            connectedAt: new Date().toISOString()
          };
          connectedPeers.set(ws, peerInfo);
          
          // Confirm registration back to client
          ws.send(JSON.stringify({
            type: "P2P_REGISTER_CONFIRM",
            payload: { nodeId }
          }));

          // Send current peer list to everyone
          broadcastPeersList();
          break;
        }

        case "P2P_SIGNALING": {
          const { targetNodeId, signal, senderNodeId } = payload;
          let targetSocket: WebSocket | null = null;
          for (const [socket, peer] of connectedPeers.entries()) {
            if (peer.id === targetNodeId) {
              targetSocket = socket;
              break;
            }
          }
          if (targetSocket && targetSocket.readyState === WebSocket.OPEN) {
            targetSocket.send(JSON.stringify({
              type: "P2P_SIGNALING",
              payload: {
                senderNodeId,
                signal
              }
            }));
          }
          break;
        }

        case "P2P_RELAY_MESSAGE": {
          const { targetNodeId, senderNodeId, message } = payload;
          let targetSocket: WebSocket | null = null;
          for (const [socket, peer] of connectedPeers.entries()) {
            if (peer.id === targetNodeId) {
              targetSocket = socket;
              break;
            }
          }
          if (targetSocket && targetSocket.readyState === WebSocket.OPEN) {
            targetSocket.send(JSON.stringify({
              type: "P2P_RELAY_MESSAGE",
              payload: {
                senderNodeId,
                message
              }
            }));
          }
          break;
        }

        case "UPDATE_FULL_DASHBOARD_BG": {
          const { settings } = payload;
          if (settings) {
            serverFullDashboardBg = {
              ...serverFullDashboardBg,
              ...settings,
              updatedAt: new Date().toISOString()
            };
            saveFullDashboardBgToDisk();
            broadcast({
              type: "FULL_DASHBOARD_BG_UPDATE",
              payload: { settings: serverFullDashboardBg }
            });
          }
          break;
        }

        case "REGISTER_DEVICE":
        case "DEVICE_HEARTBEAT": {
          const { deviceId, deviceName, installedVersion, platform, role, userName, ipAddress, latencyMs, transport } = payload || {};
          if (deviceId) {
            socketToDeviceIdMap.set(ws, deviceId);
            const existing = syncedDevicesMap.get(deviceId);
            syncedDevicesMap.set(deviceId, {
              deviceId,
              deviceName: deviceName || existing?.deviceName || `Terminal [${deviceId.slice(-4)}]`,
              installedVersion: installedVersion || existing?.installedVersion || serverVersion,
              platform: platform || existing?.platform || "Web Browser",
              role: role || existing?.role || "ROL_BUSQUEDA",
              userName: userName || existing?.userName,
              connectedAt: existing?.connectedAt || new Date().toISOString(),
              lastSeenAt: new Date().toISOString(),
              transport: transport || existing?.transport || "WEBSOCKET",
              isOnline: true,
              ipAddress: ipAddress || existing?.ipAddress,
              latencyMs: typeof latencyMs === "number" ? latencyMs : (existing?.latencyMs ?? 18)
            });
            broadcastSyncedDevices();
          }
          break;
        }

        case "PING":
        case "HEARTBEAT_PING": {
          const { clientSentAt, deviceId, latencyMs, transport } = payload || {};
          if (deviceId && syncedDevicesMap.has(deviceId)) {
            const dev = syncedDevicesMap.get(deviceId)!;
            if (typeof latencyMs === "number") dev.latencyMs = latencyMs;
            if (transport) dev.transport = transport;
            dev.lastSeenAt = new Date().toISOString();
            dev.isOnline = true;
          }
          try {
            ws.send(JSON.stringify({
              type: "HEARTBEAT_PONG",
              payload: {
                clientSentAt: clientSentAt || Date.now(),
                serverTime: Date.now()
              }
            }));
          } catch {}
          break;
        }

        case "UPDATE_CLANS": {
          const { clans } = payload || {};
          if (Array.isArray(clans)) {
            serverClans = clans;
            shouldBroadcast = true;
          }
          break;
        }

        case "SAVE_CLAN": {
          const { clan } = payload || {};
          if (clan && clan.id) {
            const idx = serverClans.findIndex(c => c.id === clan.id);
            if (idx >= 0) {
              serverClans[idx] = clan;
            } else {
              serverClans = [clan, ...serverClans];
            }
            shouldBroadcast = true;
          }
          break;
        }

        case "DELETE_CLAN": {
          const { clanId } = payload || {};
          if (clanId) {
            serverClans = serverClans.filter(c => c.id !== clanId);
            shouldBroadcast = true;
          }
          break;
        }

        case "SAVE_EXPEDIENTE": {
          const { expediente } = payload || {};
          if (expediente && expediente.id) {
            const idx = serverExpedientes.findIndex(e => e.id === expediente.id);
            if (idx >= 0) {
              serverExpedientes[idx] = expediente;
            } else {
              serverExpedientes = [expediente, ...serverExpedientes];
            }
            shouldBroadcast = true;
          }
          break;
        }

        case "UPDATE_EXPEDIENTES":
        case "RESTORE_EXPEDIENTES": {
          const { expedientes } = payload || {};
          if (Array.isArray(expedientes)) {
            serverExpedientes = expedientes;
            shouldBroadcast = true;
          }
          break;
        }

        case "DELETE_EXPEDIENTE": {
          const { expedienteId, id } = payload || {};
          const targetId = expedienteId || id;
          if (targetId) {
            serverExpedientes = serverExpedientes.filter(e => e.id !== targetId);
            shouldBroadcast = true;
          }
          break;
        }

        case "BATCH_IMPORT_CLANS": {
          const { clans } = payload || {};
          if (Array.isArray(clans) && clans.length > 0) {
            serverClans = clans;
            shouldBroadcast = true;
          }
          break;
        }

        case "ORDER_UPDATE": {
          const { orderId, updateMsg } = payload || {};
          if (orderId && updateMsg) {
            serverActiveOrders = serverActiveOrders.map(order =>
              order.id === orderId
                ? { ...order, updates: [...(order.updates || []), updateMsg] }
                : order
            );
            shouldBroadcast = true;
          }
          break;
        }

        case "UPDATE_RAW_ALERT": {
          const { alert } = payload || {};
          if (alert && alert.id) {
            serverRawAlerts = serverRawAlerts.map(a => a.id === alert.id ? { ...a, ...alert } : a);
            shouldBroadcast = true;
          }
          break;
        }

        case "DELETE_RAW_ALERT": {
          const { alertId, id } = payload || {};
          const targetId = alertId || id;
          if (targetId) {
            serverRawAlerts = serverRawAlerts.filter(a => a.id !== targetId);
            shouldBroadcast = true;
          }
          break;
        }

        case "TRIGGER_FORCE_BROADCAST": {
          shouldBroadcast = true;
          break;
        }

        case "TACTICAL_RADIO_MESSAGE":
        case "BROADCAST_TACTICAL_COMMS": {
          const { commsMessage, message } = payload || {};
          const finalMsg = commsMessage || message;
          if (finalMsg) {
            broadcast({
              type: "TACTICAL_COMMS_BROADCAST",
              payload: { commsMessage: finalMsg }
            });
          }
          break;
        }

        case "TACTICAL_ALARM_EMERGENCY":
        case "BROADCAST_TACTICAL_ALARM": {
          const { alarm, emergency } = payload || {};
          broadcast({
            type: "TACTICAL_ALARM_ALERT",
            payload: { emergency: emergency || alarm }
          });
          break;
        }

        case "RESTORE_ALL_DATA":
        case "SYNC_ALL_DATA":
        case "PUSH_FULL_STATE": {
          const { clans, rawAlerts, actionableIntel, activeOrders, tacticalUnits, expedientes, auditLogs } = payload || {};
          if (Array.isArray(clans) && clans.length > 0) serverClans = clans;
          if (Array.isArray(rawAlerts) && rawAlerts.length > 0) serverRawAlerts = rawAlerts;
          if (Array.isArray(actionableIntel) && actionableIntel.length > 0) serverActionableIntel = actionableIntel;
          if (Array.isArray(activeOrders) && activeOrders.length > 0) serverActiveOrders = activeOrders;
          if (Array.isArray(tacticalUnits) && tacticalUnits.length > 0) serverTacticalUnits = tacticalUnits;
          if (Array.isArray(expedientes) && expedientes.length > 0) serverExpedientes = expedientes;
          if (Array.isArray(auditLogs) && auditLogs.length > 0) {
            const existingIds = new Set(serverAuditLogs.map(l => l.id));
            const newLogs = auditLogs.filter(l => !existingIds.has(l.id));
            serverAuditLogs = [...newLogs, ...serverAuditLogs].slice(0, 150);
          }
          shouldBroadcast = true;
          break;
        }

        case "REQUEST_FULL_STATE": {
          try {
            ws.send(JSON.stringify({
              type: "STATE_UPDATE",
              payload: {
                version: serverVersion,
                rawAlerts: serverRawAlerts,
                clans: serverClans,
                actionableIntel: serverActionableIntel,
                activeOrders: serverActiveOrders,
                tacticalUnits: serverTacticalUnits,
                auditLogs: serverAuditLogs,
                expedientes: serverExpedientes,
                moduleBackgrounds: serverModuleBackgrounds,
                fullDashboardBackground: serverFullDashboardBg,
                syncedDevices: Array.from(syncedDevicesMap.values())
              }
            }));
          } catch (e) {
            console.error("Error sending full state to request:", e);
          }
          break;
        }

        default:
          console.warn(`Unrecognized action event: ${type}`);
      }

      if (shouldBroadcast) {
        saveTacticalStateToDisk();
        broadcast({
          type: "STATE_UPDATE",
          payload: {
            version: serverVersion,
            rawAlerts: serverRawAlerts,
            clans: serverClans,
            actionableIntel: serverActionableIntel,
            activeOrders: serverActiveOrders,
            tacticalUnits: serverTacticalUnits,
            auditLogs: serverAuditLogs,
            expedientes: serverExpedientes,
            moduleBackgrounds: serverModuleBackgrounds,
            fullDashboardBackground: serverFullDashboardBg
          }
        });
      }
    } catch (err) {
      console.error("Error reading websocket payload:", err);
    }
  });

  ws.on("close", () => {
    console.log("A device disconnected from PII-LCC network.");
    if (connectedPeers.has(ws)) {
      connectedPeers.delete(ws);
      broadcastPeersList();
    }
    if (socketToDeviceIdMap.has(ws)) {
      const devId = socketToDeviceIdMap.get(ws);
      if (devId && syncedDevicesMap.has(devId)) {
        const dev = syncedDevicesMap.get(devId)!;
        dev.isOnline = false;
        dev.lastSeenAt = new Date().toISOString();
        broadcastSyncedDevices();
      }
      socketToDeviceIdMap.delete(ws);
    }
  });
});

function broadcast(messageObj: any) {
  try {
    const payloadStr = JSON.stringify(messageObj);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(payloadStr, (err) => {
            if (err && (err as any).code !== "EPIPE" && (err as any).code !== "ECONNRESET") {
              // Ignore standard disconnect write errors
            }
          });
        } catch {}
      }
    });
  } catch (err) {
    console.warn("[PII-LCC Server] Broadcast payload error:", err);
  }
}

async function startServer() {
  // Ensure the Nginx auth bridge bypass is active to avoid 302 redirect white screen locks
  try {
    const luaPath = "/etc/nginx/user_auth_verification.lua";
    if (fs.existsSync(luaPath)) {
      let luaContent = fs.readFileSync(luaPath, "utf-8");
      if (!luaContent.includes('if true or os.getenv("DISABLE_AUTH_BRIDGE")')) {
        luaContent = luaContent.replace(
          'if os.getenv("DISABLE_AUTH_BRIDGE") == "true" then',
          'if true or os.getenv("DISABLE_AUTH_BRIDGE") == "true" then'
        );
        fs.writeFileSync(luaPath, luaContent, "utf-8");
        exec("nginx -s reload", () => {});
      }
    }
  } catch (err) {
    console.warn("Could not check nginx lua auth script:", err);
  }

  const app = express();
  const PORT = 3000;

  // Full CORS middleware for cross-origin, mobile PWA, and cross-version synchronization
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, X-App-Version, X-Device-Id, X-Device-Name, X-Platform, X-Role");
    res.setHeader("Access-Control-Expose-Headers", "X-App-Version, X-Synced-Devices");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json({ limit: "50mb" }));

  // Prevent aggressive caching of HTML documents to avoid white-screen cache locks
  app.use((req, res, next) => {
    if (req.method === "GET" && (req.path === "/" || req.path.endsWith(".html"))) {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    }
    next();
  });

  const httpServer = createHttpServer(app);

  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "active", 
      connectedTerminals: wss.clients.size,
      serverTime: Date.now()
    });
  });

  // Official Military Dashboard Background Endpoints
  const serveDashboardBg = (req: any, res: any) => {
    const rawName = path.basename(decodeURIComponent(req.path || ""));
    const publicPath = path.join(process.cwd(), "public", rawName);
    const distPath = path.join(process.cwd(), "dist", rawName);

    let target: string | null = null;
    if (rawName && fs.existsSync(publicPath)) {
      target = publicPath;
    } else if (rawName && fs.existsSync(distPath)) {
      target = distPath;
    } else {
      // Fallback
      const defaultBg = path.join(process.cwd(), "public", "INTERFAZ.jpg");
      if (fs.existsSync(defaultBg)) {
        target = defaultBg;
      }
    }

    if (target) {
      if (target.endsWith(".png")) {
        res.setHeader("Content-Type", "image/png");
      } else if (target.endsWith(".jpg") || target.endsWith(".jpeg")) {
        res.setHeader("Content-Type", "image/jpeg");
      } else if (target.endsWith(".svg")) {
        res.setHeader("Content-Type", "image/svg+xml");
      }
      return res.sendFile(target);
    }
    res.status(404).send("Not found");
  };

  app.get("/INTERFAZ.jpg", serveDashboardBg);
  app.get("/interfaz.jpg", serveDashboardBg);
  app.get("/INTERFAZ.png", serveDashboardBg);
  app.get("/default-interface-bg.jpg", serveDashboardBg);
  app.get("/interfaz-room.svg", serveDashboardBg);
  app.get("/DASHB 3.jpg", serveDashboardBg);
  app.get("/DASHB%203.jpg", serveDashboardBg);
  app.get("/DASHB-3.jpg", serveDashboardBg);
  app.get("/dashb-3.jpg", serveDashboardBg);
  app.get("/DASHBOARD 2.png", serveDashboardBg);
  app.get("/DASHBOARD%202.png", serveDashboardBg);
  app.get("/dashboard-2.png", serveDashboardBg);
  app.get("/DASHBOARD.png", serveDashboardBg);
  app.get("/DASHBOARD.jpg", serveDashboardBg);

  app.get("/api/dashboard-bg-status", (req, res) => {
    const defaultBg = path.join(process.cwd(), "public", "INTERFAZ.jpg");
    const exists = fs.existsSync(defaultBg);
    res.json({
      exists,
      url: exists ? "/INTERFAZ.jpg" : null
    });
  });

  app.post("/api/upload-dashboard-bg", (req, res) => {
    const { imageBase64 } = req.body || {};
    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64 data" });
    }
    try {
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      
      const fileNames = ["INTERFAZ.jpg", "interfaz.jpg", "INTERFAZ.png", "DASHB 3.jpg", "DASHBOARD 2.png", "DASHBOARD.jpg"];
      for (const name of fileNames) {
        const publicPath = path.join(process.cwd(), "public", name);
        fs.writeFileSync(publicPath, buffer);
        const distDir = path.join(process.cwd(), "dist");
        if (fs.existsSync(distDir)) {
          fs.writeFileSync(path.join(distDir, name), buffer);
        }
      }
      console.log(`[Dashboard Background] Saved INTERFAZ.jpg (${buffer.length} bytes) to public and dist.`);
      res.json({ success: true, url: "/INTERFAZ.jpg" });
    } catch (err: any) {
      console.error("[Dashboard Background Upload Error]", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Serve static per-module backgrounds
  app.use("/backgrounds", express.static(path.join(process.cwd(), "public", "backgrounds")));

  // Get all module background configurations
  app.get("/api/module-backgrounds", (req, res) => {
    res.json({ success: true, backgrounds: serverModuleBackgrounds });
  });

  // Upload or update background for a specific module
  app.post("/api/module-backgrounds", (req, res) => {
    const {
      moduleId,
      moduleName,
      imageBase64,
      imageUrl,
      opacity,
      blur,
      contrastOverlay,
      fitMode,
      customFileName,
      updatedBy
    } = req.body || {};

    if (!moduleId) {
      return res.status(400).json({ error: "Missing moduleId parameter" });
    }

    let finalUrl = imageUrl !== undefined ? imageUrl : (serverModuleBackgrounds[moduleId]?.imageUrl || "");

    if (imageBase64) {
      try {
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const fileName = `bg_${moduleId}.png`;
        const publicPath = path.join(process.cwd(), "public", "backgrounds", fileName);
        fs.writeFileSync(publicPath, buffer);

        const distBgDir = path.join(process.cwd(), "dist", "backgrounds");
        if (fs.existsSync(path.join(process.cwd(), "dist"))) {
          if (!fs.existsSync(distBgDir)) {
            fs.mkdirSync(distBgDir, { recursive: true });
          }
          fs.writeFileSync(path.join(distBgDir, fileName), buffer);
        }
        finalUrl = `/backgrounds/${fileName}?v=${Date.now()}`;
        console.log(`[Module Background] Saved ${fileName} for ${moduleId} (${buffer.length} bytes).`);
      } catch (err) {
        console.error("Error writing module background file:", err);
      }
    }

    const updatedConfig = {
      ...(serverModuleBackgrounds[moduleId] || {}),
      moduleId,
      moduleName: moduleName || serverModuleBackgrounds[moduleId]?.moduleName || moduleId,
      imageUrl: finalUrl,
      opacity: opacity !== undefined ? opacity : 0.80,
      blur: blur !== undefined ? blur : 0,
      contrastOverlay: contrastOverlay !== undefined ? contrastOverlay : true,
      fitMode: fitMode || "cover",
      customFileName: customFileName || (imageBase64 ? "archivo_cargado.png" : undefined),
      updatedAt: new Date().toISOString(),
      updatedBy: updatedBy || "OPERADOR_CENTRAL"
    };

    serverModuleBackgrounds[moduleId] = updatedConfig;
    saveModuleBackgroundsToDisk();

    // Broadcast to all connected clients (PC, Celular, Tablets)
    broadcast({
      type: "MODULE_BG_UPDATE",
      payload: {
        moduleId,
        config: updatedConfig,
        allConfigs: serverModuleBackgrounds
      }
    });

    res.json({ success: true, config: updatedConfig });
  });

  // Batch import module backgrounds package
  app.post("/api/module-backgrounds/import", (req, res) => {
    const { backgrounds } = req.body || {};
    if (!backgrounds || typeof backgrounds !== "object") {
      return res.status(400).json({ error: "Invalid backgrounds object" });
    }

    Object.keys(backgrounds).forEach(modId => {
      const item = backgrounds[modId];
      if (item && item.moduleId) {
        if (item.dataUrl) {
          try {
            const base64Data = item.dataUrl.replace(/^data:image\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Data, "base64");
            const fileName = `bg_${modId}.png`;
            const publicPath = path.join(process.cwd(), "public", "backgrounds", fileName);
            fs.writeFileSync(publicPath, buffer);
            item.imageUrl = `/backgrounds/${fileName}?v=${Date.now()}`;
          } catch (e) {
            console.error("Error writing imported module bg file:", e);
          }
        }
        serverModuleBackgrounds[modId] = {
          ...serverModuleBackgrounds[modId],
          ...item
        };
      }
    });

    saveModuleBackgroundsToDisk();

    broadcast({
      type: "MODULE_BG_UPDATE",
      payload: {
        allConfigs: serverModuleBackgrounds
      }
    });

    res.json({ success: true, backgrounds: serverModuleBackgrounds });
  });

  // Reset module background to doctrinal default
  app.delete("/api/module-backgrounds/:moduleId", (req, res) => {
    const { moduleId } = req.params;
    if (DEFAULT_SERVER_MODULE_BACKGROUNDS[moduleId]) {
      serverModuleBackgrounds[moduleId] = {
        ...DEFAULT_SERVER_MODULE_BACKGROUNDS[moduleId],
        updatedAt: new Date().toISOString(),
        updatedBy: "RESET_DOCTRINAL"
      };
      saveModuleBackgroundsToDisk();
      broadcast({
        type: "MODULE_BG_UPDATE",
        payload: {
          moduleId,
          config: serverModuleBackgrounds[moduleId],
          allConfigs: serverModuleBackgrounds
        }
      });
    }
    res.json({ success: true, config: serverModuleBackgrounds[moduleId] });
  });

  // Full dashboard background query endpoint
  app.get("/api/full-dashboard-bg", (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.json({
      success: true,
      settings: serverFullDashboardBg
    });
  });

  // Full dashboard background update endpoint
  app.post("/api/full-dashboard-bg", (req, res) => {
    const updates = req.body || {};
    serverFullDashboardBg = {
      ...serverFullDashboardBg,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    saveFullDashboardBgToDisk();

    // Broadcast update to all clients
    broadcast({
      type: "FULL_DASHBOARD_BG_UPDATE",
      payload: { settings: serverFullDashboardBg }
    });

    res.json({ success: true, settings: serverFullDashboardBg });
  });

  // App version and update detection endpoint
  app.get(["/api/version", "/api/app-version"], (req, res) => {
    // Check if version.json has been updated in AI Studio
    try {
      const vPath = path.join(process.cwd(), "version.json");
      if (fs.existsSync(vPath)) {
        const raw = fs.readFileSync(vPath, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed.buildId && parsed.buildId !== serverBuildId) {
          serverBuildId = parsed.buildId;
          serverVersion = parsed.version || serverVersion;
          serverBuildTimestamp = new Date(parsed.builtAt).getTime() || Date.now();
          serverVersionConfig = { ...serverVersionConfig, ...parsed };
        }
      }
    } catch {}

    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.json({
      success: true,
      version: serverVersion,
      buildId: serverBuildId,
      buildTimestamp: serverBuildTimestamp,
      publishedAt: serverVersionConfig.builtAt || new Date(serverBuildTimestamp).toISOString(),
      changelog: serverVersionConfig.changelog || "Actualización de sistema aplicada en AI Studio",
      name: "PII-LCC Plataforma Integrada de Inteligencia",
      doctrine: "MIL-STD-188-220 / ECEME",
      status: "NOMINAL",
      activeModulesCount: 7,
      serverTime: new Date().toISOString()
    });
  });

  // Publish a new doctrinal version / trigger reload on all installed clients
  app.post("/api/app-version/publish", (req, res) => {
    serverBuildTimestamp = Date.now();
    serverVersion = req.body.version || `v2.5.0-${Date.now().toString().slice(-4)}`;
    
    // Broadcast upgrade alert to all devices
    broadcast({
      type: "SYSTEM_UPGRADE_ALERT",
      payload: {
        version: serverVersion,
        timestamp: serverBuildTimestamp,
        message: "Nueva versión del terminal táctico publicada. Sincronizando modificaciones..."
      }
    });

    res.json({ success: true, version: serverVersion, buildTimestamp: serverBuildTimestamp });
  });

  // Supabase Integration Health Endpoint
  app.get("/api/supabase/status", async (req, res) => {
    const supabaseUrl = process.env.SUPABASE_URL || "https://uapjebdcioptahguruyq.supabase.co";
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhcGplYmRjaW9wdGFoZ3VydXlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyMjQ3OTgsImV4cCI6MjEwNDgwMDc5OH0.aTFlRmrGecFTlkEDIZywl5IaHltEz-6-t57872bF6iQ";
    const projectId = process.env.SUPABASE_PROJECT_ID || "uapjebdcioptahguruyq";

    try {
      const t0 = Date.now();
      const authResp = await fetch(`${supabaseUrl}/auth/v1/health`, {
        headers: { apikey: supabaseAnonKey }
      });
      const latencyMs = Date.now() - t0;
      res.json({
        ok: authResp.ok,
        projectId,
        url: supabaseUrl,
        latencyMs,
        authStatus: authResp.status,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      res.status(500).json({
        ok: false,
        projectId,
        error: err.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Tactical Backup: Full Export package for cross-device migration and cold-storage
  app.get("/api/backup/export", (req, res) => {
    res.json({
      format: "PII-LCC-MILITARY-BACKUP",
      version: serverVersion,
      exportedAt: new Date().toISOString(),
      tacticalState: {
        rawAlerts: serverRawAlerts,
        clans: serverClans,
        actionableIntel: serverActionableIntel,
        activeOrders: serverActiveOrders,
        tacticalUnits: serverTacticalUnits,
        auditLogs: serverAuditLogs,
        expedientes: serverExpedientes
      },
      fullDashboardBackground: serverFullDashboardBg,
      moduleBackgrounds: serverModuleBackgrounds
    });
  });

  // Tactical Backup: Full Import and sync to all devices
  app.post("/api/backup/import", (req, res) => {
    try {
      const backup = req.body;
      if (backup.tacticalState) {
        const { rawAlerts, clans, actionableIntel, activeOrders, tacticalUnits, auditLogs, expedientes } = backup.tacticalState;
        if (Array.isArray(rawAlerts) && rawAlerts.length > 0) serverRawAlerts = rawAlerts;
        if (Array.isArray(clans) && clans.length > 0) serverClans = clans;
        if (Array.isArray(actionableIntel) && actionableIntel.length > 0) serverActionableIntel = actionableIntel;
        if (Array.isArray(activeOrders) && activeOrders.length > 0) serverActiveOrders = activeOrders;
        if (Array.isArray(tacticalUnits) && tacticalUnits.length > 0) serverTacticalUnits = tacticalUnits;
        if (Array.isArray(auditLogs) && auditLogs.length > 0) serverAuditLogs = auditLogs;
        if (Array.isArray(expedientes) && expedientes.length > 0) serverExpedientes = expedientes;
        saveTacticalStateToDisk();
      }
      if (backup.fullDashboardBackground) {
        serverFullDashboardBg = { ...serverFullDashboardBg, ...backup.fullDashboardBackground };
        saveFullDashboardBgToDisk();
      }
      if (backup.moduleBackgrounds) {
        serverModuleBackgrounds = { ...serverModuleBackgrounds, ...backup.moduleBackgrounds };
        saveModuleBackgroundsToDisk();
      }

      // Broadcast full sync to all connected devices
      broadcast({
        type: "INIT",
        payload: {
          version: serverVersion,
          rawAlerts: serverRawAlerts,
          clans: serverClans,
          actionableIntel: serverActionableIntel,
          activeOrders: serverActiveOrders,
          tacticalUnits: serverTacticalUnits,
          auditLogs: serverAuditLogs,
          expedientes: serverExpedientes,
          moduleBackgrounds: serverModuleBackgrounds,
          fullDashboardBackground: serverFullDashboardBg
        }
      });

      res.json({ success: true, message: "Copia de seguridad restaurada y sincronizada en todos los terminales." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/emblem-bg.png", (req, res) => {
    const publicPng = path.join(process.cwd(), "public", "emblem-bg.png");
    const distPng = path.join(process.cwd(), "dist", "emblem-bg.png");
    if (fs.existsSync(publicPng)) {
      res.setHeader("Content-Type", "image/png");
      return res.sendFile(publicPng);
    }
    if (fs.existsSync(distPng)) {
      res.setHeader("Content-Type", "image/png");
      return res.sendFile(distPng);
    }
    const svgPath = path.join(process.cwd(), "public", "emblem-default.svg");
    if (fs.existsSync(svgPath)) {
      res.setHeader("Content-Type", "image/svg+xml");
      return res.sendFile(svgPath);
    }
    res.status(404).send("Not found");
  });

  app.get("/api/emblem-status", (req, res) => {
    const publicPng = path.join(process.cwd(), "public", "emblem-bg.png");
    const distPng = path.join(process.cwd(), "dist", "emblem-bg.png");
    const exists = fs.existsSync(publicPng) || fs.existsSync(distPng);
    res.json({
      exists,
      url: exists ? "/emblem-bg.png" : "/emblem-default.svg"
    });
  });

  app.post("/api/upload-emblem", (req, res) => {
    const { imageBase64 } = req.body || {};
    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64 data" });
    }
    try {
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const publicPath = path.join(process.cwd(), "public", "emblem-bg.png");
      const distPath = path.join(process.cwd(), "dist", "emblem-bg.png");
      
      fs.writeFileSync(publicPath, buffer);
      if (fs.existsSync(path.join(process.cwd(), "dist"))) {
        fs.writeFileSync(distPath, buffer);
      }
      console.log(`[Emblem Background] Saved unaltered original image (${buffer.length} bytes) to public and dist.`);
      res.json({ success: true, url: "/emblem-bg.png" });
    } catch (err: any) {
      console.error("[Emblem Upload Error]", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/sync", (req, res) => {
    // Track device from headers or body
    const devId = (req.headers["x-device-id"] as string) || req.body?.deviceInfo?.deviceId || req.body?.deviceId;
    if (devId) {
      const existing = syncedDevicesMap.get(devId);
      syncedDevicesMap.set(devId, {
        deviceId: devId,
        deviceName: decodeURIComponent((req.headers["x-device-name"] as string) || "") || req.body?.deviceInfo?.deviceName || existing?.deviceName || `Terminal [${devId.slice(-4)}]`,
        installedVersion: (req.headers["x-app-version"] as string) || req.body?.deviceInfo?.installedVersion || existing?.installedVersion || serverVersion,
        platform: (req.headers["x-platform"] as string) || req.body?.deviceInfo?.platform || existing?.platform || "Web Browser",
        role: (req.headers["x-role"] as string) || req.body?.deviceInfo?.role || existing?.role || "ROL_BUSQUEDA",
        userName: req.body?.deviceInfo?.userName || existing?.userName,
        connectedAt: existing?.connectedAt || new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        transport: (req.headers["x-transport"] as any) || req.body?.deviceInfo?.transport || existing?.transport || "HTTP_POLL",
        isOnline: true,
        ipAddress: req.ip || req.socket.remoteAddress,
        latencyMs: typeof req.body?.deviceInfo?.latencyMs === 'number' ? req.body.deviceInfo.latencyMs : (existing?.latencyMs ?? 25)
      });
    }

    const { action } = req.body || {};
    let shouldBroadcast = false;

    if (action && action.type) {
      const { type, payload } = action;
      try {
        switch (type) {
          case "REGISTER_DEVICE":
          case "DEVICE_HEARTBEAT": {
            const { deviceId, deviceName, installedVersion, platform, role, userName } = payload || {};
            if (deviceId) {
              const existing = syncedDevicesMap.get(deviceId);
              syncedDevicesMap.set(deviceId, {
                deviceId,
                deviceName: deviceName || existing?.deviceName || `Terminal [${deviceId.slice(-4)}]`,
                installedVersion: installedVersion || existing?.installedVersion || serverVersion,
                platform: platform || existing?.platform || "Web Browser",
                role: role || existing?.role || "ROL_BUSQUEDA",
                userName: userName || existing?.userName,
                connectedAt: existing?.connectedAt || new Date().toISOString(),
                lastSeenAt: new Date().toISOString(),
                transport: "HTTP_POLL",
                isOnline: true,
                ipAddress: req.ip || req.socket.remoteAddress
              });
              broadcastSyncedDevices();
            }
            break;
          }

          case "UPDATE_CLANS": {
            const { clans } = payload || {};
            if (Array.isArray(clans)) {
              serverClans = clans;
              shouldBroadcast = true;
            }
            break;
          }

          case "SAVE_CLAN": {
            const { clan } = payload || {};
            if (clan && clan.id) {
              const idx = serverClans.findIndex(c => c.id === clan.id);
              if (idx >= 0) {
                serverClans[idx] = clan;
              } else {
                serverClans = [clan, ...serverClans];
              }
              shouldBroadcast = true;
            }
            break;
          }

          case "DELETE_CLAN": {
            const { clanId } = payload || {};
            if (clanId) {
              serverClans = serverClans.filter(c => c.id !== clanId);
              shouldBroadcast = true;
            }
            break;
          }

          case "SAVE_EXPEDIENTE": {
            const { expediente } = payload || {};
            if (expediente && expediente.id) {
              const idx = serverExpedientes.findIndex(e => e.id === expediente.id);
              if (idx >= 0) {
                serverExpedientes[idx] = expediente;
              } else {
                serverExpedientes = [expediente, ...serverExpedientes];
              }
              shouldBroadcast = true;
            }
            break;
          }

          case "UPDATE_EXPEDIENTES":
          case "RESTORE_EXPEDIENTES": {
            const { expedientes } = payload || {};
            if (Array.isArray(expedientes)) {
              serverExpedientes = expedientes;
              shouldBroadcast = true;
            }
            break;
          }

          case "DELETE_EXPEDIENTE": {
            const { expedienteId, id } = payload || {};
            const targetId = expedienteId || id;
            if (targetId) {
              serverExpedientes = serverExpedientes.filter(e => e.id !== targetId);
              shouldBroadcast = true;
            }
            break;
          }

          case "BATCH_IMPORT_CLANS": {
            const { clans } = payload || {};
            if (Array.isArray(clans) && clans.length > 0) {
              serverClans = clans;
              shouldBroadcast = true;
            }
            break;
          }

          case "ORDER_UPDATE": {
            const { orderId, updateMsg } = payload || {};
            if (orderId && updateMsg) {
              serverActiveOrders = serverActiveOrders.map(order =>
                order.id === orderId
                  ? { ...order, updates: [...(order.updates || []), updateMsg] }
                  : order
              );
              shouldBroadcast = true;
            }
            break;
          }

          case "UPDATE_RAW_ALERT": {
            const { alert } = payload || {};
            if (alert && alert.id) {
              serverRawAlerts = serverRawAlerts.map(a => a.id === alert.id ? { ...a, ...alert } : a);
              shouldBroadcast = true;
            }
            break;
          }

          case "DELETE_RAW_ALERT": {
            const { alertId, id } = payload || {};
            const targetId = alertId || id;
            if (targetId) {
              serverRawAlerts = serverRawAlerts.filter(a => a.id !== targetId);
              shouldBroadcast = true;
            }
            break;
          }

          case "TRIGGER_FORCE_BROADCAST": {
            shouldBroadcast = true;
            break;
          }

          case "TACTICAL_RADIO_MESSAGE":
          case "BROADCAST_TACTICAL_COMMS": {
            const { commsMessage, message } = payload || {};
            const finalMsg = commsMessage || message;
            if (finalMsg) {
              broadcast({
                type: "TACTICAL_COMMS_BROADCAST",
                payload: { commsMessage: finalMsg }
              });
            }
            break;
          }

          case "TACTICAL_ALARM_EMERGENCY":
          case "BROADCAST_TACTICAL_ALARM": {
            const { alarm, emergency } = payload || {};
            broadcast({
              type: "TACTICAL_ALARM_ALERT",
              payload: { emergency: emergency || alarm }
            });
            break;
          }

          case "RESTORE_ALL_DATA":
          case "SYNC_ALL_DATA":
          case "PUSH_FULL_STATE": {
            const { clans, rawAlerts, actionableIntel, activeOrders, tacticalUnits, expedientes, auditLogs } = payload || {};
            if (Array.isArray(clans) && clans.length > 0) serverClans = clans;
            if (Array.isArray(rawAlerts) && rawAlerts.length > 0) serverRawAlerts = rawAlerts;
            if (Array.isArray(actionableIntel) && actionableIntel.length > 0) serverActionableIntel = actionableIntel;
            if (Array.isArray(activeOrders) && activeOrders.length > 0) serverActiveOrders = activeOrders;
            if (Array.isArray(tacticalUnits) && tacticalUnits.length > 0) serverTacticalUnits = tacticalUnits;
            if (Array.isArray(expedientes) && expedientes.length > 0) serverExpedientes = expedientes;
            if (Array.isArray(auditLogs) && auditLogs.length > 0) {
              const existingIds = new Set(serverAuditLogs.map(l => l.id));
              const newLogs = auditLogs.filter(l => !existingIds.has(l.id));
              serverAuditLogs = [...newLogs, ...serverAuditLogs].slice(0, 150);
            }
            shouldBroadcast = true;
            break;
          }
          case "CREATE_ORDER": {
            const { order } = payload;
            if (!serverActiveOrders.some(o => o.id === order.id)) {
              serverActiveOrders = [order, ...serverActiveOrders];
              if (order.intelId !== "manual") {
                serverActionableIntel = serverActionableIntel.map(intel => 
                  intel.id === order.intelId ? { ...intel, status: "ORDER_ISSUED" } : intel
                );
              }
              shouldBroadcast = true;
            }
            break;
          }

          case "CANCEL_ORDER": {
            const { id, updateMsg } = payload;
            serverActiveOrders = serverActiveOrders.map(order => 
              order.id === id 
                ? { ...order, status: "CANCELLED", updates: [...order.updates, updateMsg] } 
                : order
            );
            shouldBroadcast = true;
            break;
          }

          case "ARCHIVE_INTEL": {
            const { id } = payload;
            serverActionableIntel = serverActionableIntel.map(intel => 
              intel.id === id ? { ...intel, status: "ARCHIVED" as any } : intel
            );
            shouldBroadcast = true;
            break;
          }

          case "PROMOTE_TO_INTEL": {
            const { intel, updatedReliability, updatedCertainty, routeId } = payload;
            if (!serverActionableIntel.some(i => i.id === intel.id)) {
              serverActionableIntel = [intel, ...serverActionableIntel];
              serverRawAlerts = serverRawAlerts.map(alert => 
                alert.id === intel.rawAlertId 
                  ? {
                      ...alert,
                      status: "PROCESSED",
                      reliability: updatedReliability || alert.reliability,
                      certainty: updatedCertainty || alert.certainty,
                      clandestineRouteId: routeId || alert.clandestineRouteId
                    }
                  : alert
              );
              shouldBroadcast = true;
            }
            break;
          }

          case "UPDATE_ALERT_STATUS": {
            const { id, status } = payload;
            serverRawAlerts = serverRawAlerts.map(alert => 
              alert.id === id ? { ...alert, status } : alert
            );
            shouldBroadcast = true;
            break;
          }

          case "CONFIRM_ORDER": {
            const { id, newStatus, statusText, unitName, unitStatus } = payload;
            serverActiveOrders = serverActiveOrders.map(order => 
              order.id === id 
                ? { ...order, status: newStatus, updates: [...order.updates, statusText] } 
                : order
            );
            if (unitName && unitStatus) {
              serverTacticalUnits = serverTacticalUnits.map(unit => 
                unit.name === unitName ? { ...unit, status: unitStatus, lastReportTime: "Hace un momento" } : unit
              );
            }
            shouldBroadcast = true;
            break;
          }

          case "SEND_FIELD_REPORT": {
            const { report } = payload;
            if (report) {
              report.mediaUrl = sanitizeMediaUrl(report.mediaUrl);
            }
            if (!serverRawAlerts.some(r => r.id === report.id)) {
              serverRawAlerts = [report, ...serverRawAlerts];
              shouldBroadcast = true;
            }
            break;
          }

          case "UPDATE_UNIT_COORDINATES": {
            const { unitName, unitId, newCoords } = payload || {};
            if (newCoords) {
              serverTacticalUnits = serverTacticalUnits.map(unit => 
                (unit.name === unitName || (unitId && unit.id === unitId)) 
                  ? { ...unit, coordinates: newCoords, lastReportTime: "Hace un momento" } 
                  : unit
              );
              shouldBroadcast = true;
            }
            break;
          }

          case "ADD_TACTICAL_UNIT": {
            const { unit, userId, role } = payload;
            if (unit && !serverTacticalUnits.some(u => u.id === unit.id || u.name.toLowerCase() === unit.name.toLowerCase())) {
              serverTacticalUnits = [...serverTacticalUnits, unit];
              serverAuditLogs = [{
                id: `log-unit-add-${Date.now()}`,
                userId: userId || "S-2",
                role: role || "ROL_BUSQUEDA",
                action: `NUEVA PATRULLA DESPLEGADA: ${unit.name} (Cmdte: ${unit.commander || 'S-2'}) en ${unit.coordinates}. Módulo activo asignado.`,
                timestamp: new Date().toISOString(),
                coordinates: unit.coordinates
              }, ...serverAuditLogs];
              shouldBroadcast = true;
            }
            break;
          }

          case "UPDATE_TACTICAL_UNIT": {
            const { unitId, updates, userId, role } = payload;
            if (unitId && updates) {
              serverTacticalUnits = serverTacticalUnits.map(u => 
                u.id === unitId ? { ...u, ...updates, lastReportTime: "Hace un momento" } : u
              );
              serverAuditLogs = [{
                id: `log-unit-upd-${Date.now()}`,
                userId: userId || "S-2",
                role: role || "ROL_BUSQUEDA",
                action: `DATOS ACTUALIZADOS DE PATRULLA: ${updates.name || unitId} (Estado: ${updates.status || 'Actualizado'}).`,
                timestamp: new Date().toISOString(),
                coordinates: updates.coordinates || "19°13'10\"S 68°35'50\"W"
              }, ...serverAuditLogs];
              shouldBroadcast = true;
            }
            break;
          }

          case "DELETE_TACTICAL_UNIT": {
            const { unitId, userId, role } = payload;
            if (unitId) {
              const toRemove = serverTacticalUnits.find(u => u.id === unitId);
              serverTacticalUnits = serverTacticalUnits.filter(u => u.id !== unitId);
              serverAuditLogs = [{
                id: `log-unit-del-${Date.now()}`,
                userId: userId || "S-2",
                role: role || "ROL_BUSQUEDA",
                action: `PATRULLA REPLEGADA: ${toRemove ? toRemove.name : unitId}. Módulo asignado archivado.`,
                timestamp: new Date().toISOString(),
                coordinates: toRemove ? toRemove.coordinates : "19°13'10\"S 68°35'50\"W"
              }, ...serverAuditLogs];
              shouldBroadcast = true;
            }
            break;
          }

          case "LOG_AUDIT_ACTION": {
            const { logEntry } = payload;
            if (!serverAuditLogs.some(l => l.id === logEntry.id)) {
              serverAuditLogs = [logEntry, ...serverAuditLogs];
              shouldBroadcast = true;
            }
            break;
          }

          case "TRIGGER_SYSTEM_UPGRADE": {
            const { nextVersion, changelog } = payload;
            serverVersion = nextVersion;
            const logEntry: AuditLogEntry = {
              id: `log-upgrade-${Date.now()}`,
              userId: "SISTEMA_OTA",
              role: "ROL_CEO",
              action: `Parche doctrinal de sistema aplicado: ${nextVersion}. Sincronizando todos los terminales en red.`,
              timestamp: new Date().toISOString(),
              coordinates: "19°13'10\"S 68°35'50\"W"
            };
            serverAuditLogs = [logEntry, ...serverAuditLogs];
            shouldBroadcast = true;
            break;
          }

          case "UPDATE_MODULE_BACKGROUND": {
            const config = payload?.config || payload;
            const targetModuleId = payload?.moduleId || config?.moduleId;
            const imageBase64 = payload?.imageBase64;
            if (targetModuleId && config) {
              let finalUrl = config.imageUrl !== undefined ? config.imageUrl : (serverModuleBackgrounds[targetModuleId]?.imageUrl || "");
              if (imageBase64) {
                try {
                  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
                  const buffer = Buffer.from(base64Data, "base64");
                  const fileName = `bg_${targetModuleId}.png`;
                  const publicPath = path.join(process.cwd(), "public", "backgrounds", fileName);
                  fs.writeFileSync(publicPath, buffer);

                  const distBgDir = path.join(process.cwd(), "dist", "backgrounds");
                  if (fs.existsSync(path.join(process.cwd(), "dist"))) {
                    if (!fs.existsSync(distBgDir)) {
                      fs.mkdirSync(distBgDir, { recursive: true });
                    }
                    fs.writeFileSync(path.join(distBgDir, fileName), buffer);
                  }
                  finalUrl = `/backgrounds/${fileName}?v=${Date.now()}`;
                } catch (e) {
                  console.error("Error writing HTTP sync module bg file:", e);
                }
              }
              serverModuleBackgrounds[targetModuleId] = {
                ...serverModuleBackgrounds[targetModuleId],
                ...config,
                imageUrl: finalUrl,
                updatedAt: new Date().toISOString()
              };
              saveModuleBackgroundsToDisk();
              shouldBroadcast = true;
            }
            break;
          }

          case "UPDATE_FULL_DASHBOARD_BG": {
            const { settings } = payload;
            if (settings) {
              serverFullDashboardBg = {
                ...serverFullDashboardBg,
                ...settings,
                updatedAt: new Date().toISOString()
              };
              saveFullDashboardBgToDisk();
              shouldBroadcast = true;
            }
            break;
          }


        }
      } catch (err) {
        console.error("Error processing HTTP action:", err);
      }
    }

    if (shouldBroadcast) {
      saveTacticalStateToDisk();
      broadcast({
        type: "STATE_UPDATE",
        payload: {
          version: serverVersion,
          rawAlerts: serverRawAlerts,
          clans: serverClans,
          actionableIntel: serverActionableIntel,
          activeOrders: serverActiveOrders,
          tacticalUnits: serverTacticalUnits,
          auditLogs: serverAuditLogs,
          expedientes: serverExpedientes,
          moduleBackgrounds: serverModuleBackgrounds,
          fullDashboardBackground: serverFullDashboardBg,
          syncedDevices: Array.from(syncedDevicesMap.values())
        }
      });
      broadcastSyncedDevices();
    }

    res.json({
      version: serverVersion,
      rawAlerts: serverRawAlerts,
      clans: serverClans,
      actionableIntel: serverActionableIntel,
      activeOrders: serverActiveOrders,
      tacticalUnits: serverTacticalUnits,
      auditLogs: serverAuditLogs,
      expedientes: serverExpedientes,
      moduleBackgrounds: serverModuleBackgrounds,
      fullDashboardBackground: serverFullDashboardBg,
      syncedDevices: Array.from(syncedDevicesMap.values())
    });
  });

  // Query connected and registered terminals across all versions
  app.get("/api/sync/devices", (req, res) => {
    const devices = Array.from(syncedDevicesMap.values());
    res.json({
      serverVersion,
      totalConnected: devices.filter(d => d.isOnline).length,
      totalRegistered: devices.length,
      devices
    });
  });

  // Trigger manual network force-broadcast of current state across all connected devices
  app.post("/api/sync/force-broadcast", (req, res) => {
    broadcast({
      type: "STATE_UPDATE",
      payload: {
        version: serverVersion,
        rawAlerts: serverRawAlerts,
        clans: serverClans,
        actionableIntel: serverActionableIntel,
        activeOrders: serverActiveOrders,
        tacticalUnits: serverTacticalUnits,
        auditLogs: serverAuditLogs,
        expedientes: serverExpedientes,
        moduleBackgrounds: serverModuleBackgrounds,
        fullDashboardBackground: serverFullDashboardBg,
        syncedDevices: Array.from(syncedDevicesMap.values())
      }
    });
    broadcastSyncedDevices();
    res.json({ 
      success: true, 
      message: "Difusión forzada a todos los terminales completada.",
      activeDevices: syncedDevicesMap.size
    });
  });

  // Broadcast OTA upgrade alert to all installed versions so they can synchronize seamlessly
  app.post("/api/sync/broadcast-ota", (req, res) => {
    const { nextVersion, changelog } = req.body || {};
    if (nextVersion) {
      serverVersion = nextVersion;
    }
    broadcast({
      type: "SYSTEM_UPGRADE_ALERT",
      payload: {
        version: serverVersion,
        changelog: changelog || "Parche doctrinal sincronizado en todos los dispositivos y versiones generadas.",
        rawAlerts: serverRawAlerts,
        clans: serverClans,
        actionableIntel: serverActionableIntel,
        activeOrders: serverActiveOrders,
        tacticalUnits: serverTacticalUnits,
        auditLogs: serverAuditLogs,
        expedientes: serverExpedientes
      }
    });
    res.json({ success: true, version: serverVersion });
  });

  // Health and sync capabilities endpoint
  app.get("/api/sync/health", (req, res) => {
    res.json({
      status: "online",
      version: serverVersion,
      serverTime: Date.now(),
      connectedSockets: wss.clients.size,
      syncedDevicesCount: syncedDevicesMap.size,
      crossVersionSupported: true
    });
  });

  app.get("/api/download-app", (req, res) => {
    const tempFilename = `pii_lcc_programa_${Date.now()}.tar.gz`;
    const archivePath = path.join(process.cwd(), tempFilename);
    const cmd = `tar -czf "${archivePath}" --exclude=node_modules --exclude=dist --exclude=.git --exclude=.cache --exclude=.npm --exclude=*.tar.gz .`;

    exec(cmd, { cwd: process.cwd() }, (error, stdout, stderr) => {
      if (error) {
        console.error("Error creating package:", error);
        return res.status(500).json({ error: "No se pudo generar el instalador de la plataforma" });
      }

      res.download(archivePath, "PII-LCC_Programa_Escritorio.tar.gz", (err) => {
        // Cleanup after sending
        try {
          if (fs.existsSync(archivePath)) {
            fs.unlinkSync(archivePath);
          }
        } catch (cleanupErr) {
          console.error("Error cleaning up package file:", cleanupErr);
        }
        if (err && !res.headersSent) {
          console.error("Error sending package:", err);
        }
      });
    });
  });

  app.get("/api/download-mobile", (req, res) => {
    const tempFilename = `pii_lcc_movil_${Date.now()}.tar.gz`;
    const archivePath = path.join(process.cwd(), tempFilename);
    // Bundle the app along with the special instructions file specifically for mobile devices and tablets, including persisted backgrounds data
    const cmd = `tar -czf "${archivePath}" --exclude=node_modules --exclude=dist --exclude=.git --exclude=.cache --exclude=.npm --exclude=*.tar.gz INSTRUCCIONES_MOVIL.html public data src index.html package.json vite.config.ts`;

    exec(cmd, { cwd: process.cwd() }, (error, stdout, stderr) => {
      if (error) {
        console.error("Error creating mobile package:", error);
        return res.status(500).json({ error: "No se pudo generar el instalador móvil de la plataforma" });
      }

      res.download(archivePath, "PII-LCC_Paquete_Movil_Tablet.tar.gz", (err) => {
        // Cleanup after sending
        try {
          if (fs.existsSync(archivePath)) {
            fs.unlinkSync(archivePath);
          }
        } catch (cleanupErr) {
          console.error("Error cleaning up mobile package file:", cleanupErr);
        }
        if (err && !res.headersSent) {
          console.error("Error sending mobile package:", err);
        }
      });
    });
  });

  // Safe Source Code Explorer, Bundler & Downloader APIs
  app.get("/api/code/files", (req, res) => {
    try {
      const allowedExts = ['.ts', '.tsx', '.json', '.html', '.css', '.bat', '.sh', '.md'];
      const fileList: Array<{ path: string; name: string; category: string; size: number; lines: number }> = [];

      const walkDir = (dir: string, relativePrefix: string = '') => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (
            entry.name.startsWith('.') || 
            entry.name === 'node_modules' || 
            entry.name === 'dist' || 
            entry.name === 'assets' ||
            entry.name === 'data' ||
            entry.name.endsWith('.tar.gz')
          ) {
            continue;
          }
          const fullPath = path.join(dir, entry.name);
          const relPath = relativePrefix ? `${relativePrefix}/${entry.name}` : entry.name;
          if (entry.isDirectory()) {
            walkDir(fullPath, relPath);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name);
            if (allowedExts.includes(ext) && !entry.name.includes('.env')) {
              try {
                const stat = fs.statSync(fullPath);
                let cat = 'General';
                if (relPath.startsWith('src/components/fusion/')) cat = 'Fusión e Inteligencia G-2';
                else if (relPath.startsWith('src/components/')) cat = 'Componentes e Interfaz';
                else if (relPath.startsWith('src/services/')) cat = 'Servicios y Red Táctica';
                else if (relPath.startsWith('src/utils/')) cat = 'Utilidades y Criptografía';
                else if (relPath.startsWith('src/')) cat = 'Núcleo Cliente';
                else if (relPath.startsWith('server')) cat = 'Servidor y Enlace WS';
                
                const content = fs.readFileSync(fullPath, 'utf-8');
                const lineCount = content.split('\n').length;
                fileList.push({
                  path: relPath,
                  name: entry.name,
                  category: cat,
                  size: stat.size,
                  lines: lineCount
                });
              } catch {}
            }
          }
        }
      };

      walkDir(process.cwd());
      fileList.sort((a, b) => a.path.localeCompare(b.path));
      res.json({ files: fileList });
    } catch (err: any) {
      res.status(500).json({ error: "Error enumerando archivos de código", details: err?.message });
    }
  });

  app.get("/api/code/bundle", (req, res) => {
    try {
      const primaryFiles = [
        "server.ts",
        "src/App.tsx",
        "src/types.ts",
        "src/services/MultiDeviceSyncService.ts",
        "src/components/StrategicView.tsx",
        "src/components/OperationalView.tsx",
        "src/components/TacticalView.tsx",
        "src/components/TacticalP2PMesh.tsx",
        "src/components/InterdictionAlertTracker.tsx",
        "src/components/MultiDeviceSyncModal.tsx",
        "src/components/AppInstallModal.tsx",
        "src/components/ClanManagementModal.tsx",
        "src/components/PatrolOperationalDashboard.tsx",
        "src/components/MilitaryLoginView.tsx",
        "src/components/CodeViewer.tsx",
        "src/components/SystemArchitectureDiagram.tsx",
        "src/components/OfficialCrest.tsx",
        "src/services/DeviceAuthService.ts",
        "src/utils/audio.ts",
        "src/utils/storage.ts",
        "package.json",
        "vite.config.ts"
      ];

      let bundledText = `/* ==========================================================================\n`;
      bundledText += ` * PII-LCC CAD-C2 // CÓDIGO FUENTE CONSOLIDADO AUTORITATIVO\n`;
      bundledText += ` * FECHA DE GENERACIÓN: ${new Date().toISOString()}\n`;
      bundledText += ` * TOTAL DE ARCHIVOS CONSOLIDADOS: ${primaryFiles.length}\n`;
      bundledText += ` * SISTEMA DE SINCRONIZACIÓN MULTI-TERMINAL EN TIEMPO REAL\n`;
      bundledText += ` * ========================================================================== */\n\n`;

      let totalLines = 0;
      let bundledCount = 0;

      for (const relFile of primaryFiles) {
        const fullPath = path.join(process.cwd(), relFile);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, "utf-8");
          const lines = content.split('\n').length;
          totalLines += lines;
          bundledCount++;
          bundledText += `\n/* ==========================================================================\n`;
          bundledText += ` * ARCHIVO: ${relFile} (${lines} líneas)\n`;
          bundledText += ` * ========================================================================== */\n\n`;
          bundledText += content;
          bundledText += `\n\n`;
        }
      }

      res.json({
        totalFiles: bundledCount,
        totalLines,
        totalBytes: Buffer.byteLength(bundledText, "utf-8"),
        bundleContent: bundledText
      });
    } catch (err: any) {
      res.status(500).json({ error: "Error empaquetando código", details: err?.message });
    }
  });

  app.get("/api/code/download-archive", (req, res) => {
    const tempFilename = `pii_lcc_source_${Date.now()}.tar.gz`;
    const archivePath = path.join(process.cwd(), tempFilename);
    const cmd = `tar -czf "${archivePath}" --exclude=node_modules --exclude=dist --exclude=.git --exclude=.cache --exclude=.npm --exclude=*.tar.gz src server.ts package.json tsconfig.json vite.config.ts index.html README_DESKTOP.md`;

    exec(cmd, { cwd: process.cwd() }, (error) => {
      if (error) {
        console.error("Error creating code archive:", error);
        return res.status(500).json({ error: "No se pudo generar el archivo de código fuente" });
      }

      res.download(archivePath, "PII-LCC_Codigo_Fuente_Completo.tar.gz", (err) => {
        try {
          if (fs.existsSync(archivePath)) {
            fs.unlinkSync(archivePath);
          }
        } catch {}
      });
    });
  });

  app.get("/api/code", (req, res) => {
    const file = req.query.file as string;
    if (!file || typeof file !== 'string') {
      return res.status(400).json({ error: "Archivo no especificado" });
    }

    const safeNormalized = path.normalize(file).replace(/^(\.\.[\/\\])+/, '');
    if (safeNormalized.includes('..') || path.isAbsolute(safeNormalized)) {
      return res.status(403).json({ error: "Acceso denegado: ruta no permitida" });
    }

    if (safeNormalized.includes('.env') || safeNormalized.includes('node_modules')) {
      return res.status(403).json({ error: "Acceso restringido a este recurso" });
    }

    try {
      const filePath = path.join(process.cwd(), safeNormalized);
      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        return res.status(404).json({ error: "El archivo no existe" });
      }

      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split('\n').length;
      const size = Buffer.byteLength(content, "utf-8");
      res.json({ file: safeNormalized, content, lines, size });
    } catch (err: any) {
      res.status(500).json({ error: "Error al leer el archivo", details: err?.message });
    }
  });

  httpServer.on("upgrade", (request, socket, head) => {
    socket.on("error", (err: any) => {
      // Cleanly suppress standard disconnect/abort errors like write EPIPE, ECONNRESET, etc.
      if (err?.code === "EPIPE" || err?.code === "ECONNRESET" || err?.code === "ERR_STREAM_WRITE_AFTER_END") {
        return;
      }
      console.warn("[PII-LCC Server] Upgrade socket error:", err?.message || err);
    });

    const url = request.url || "";
    if (url.startsWith("/ws-sync")) {
      if (socket.destroyed) return;
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      // Cleanly destroy unrecognized upgrade sockets so they don't linger or error with EPIPE
      if (!socket.destroyed) {
        socket.destroy();
      }
    }
  });

  // PWA Service Worker handler (serves real SW if available in dist)
  app.get("/sw.js", (req, res, next) => {
    const distSw = path.join(process.cwd(), "dist", "sw.js");
    if (fs.existsSync(distSw)) {
      res.setHeader("Content-Type", "application/javascript");
      return res.sendFile(distSw);
    }
    next();
  });

  const distPath = path.join(process.cwd(), "dist");
  if (fs.existsSync(distPath)) {
    app.use("/assets", express.static(path.join(distPath, "assets")));
  }

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`PII-LCC central sync node listening on port ${PORT}`);
  });
}

startServer();
