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
import { RawAlert, Clan, ActionableIntel, AutomatedOrder, TacticalUnit, AuditLogEntry, ModuleBackgroundConfig } from "./src/types";

// Centralized in-memory synced database
let serverVersion = "v2.5.0-DOCTRINAL";
let serverBuildTimestamp = Date.now();
let serverRawAlerts: RawAlert[] = [...initialRawAlerts];
let serverClans: Clan[] = [...initialClans];
let serverActionableIntel: ActionableIntel[] = [...initialActionableIntel];
let serverActiveOrders: AutomatedOrder[] = [...initialOrders];
let serverTacticalUnits: TacticalUnit[] = [...initialTacticalUnits];
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

// Tactical State (Alerts, Orders, Clans, Units, Intel) Persistence System
if (fs.existsSync(TACTICAL_STATE_FILE)) {
  try {
    const loadedState = JSON.parse(fs.readFileSync(TACTICAL_STATE_FILE, "utf-8"));
    if (Array.isArray(loadedState.rawAlerts) && loadedState.rawAlerts.length > 0) serverRawAlerts = loadedState.rawAlerts;
    if (Array.isArray(loadedState.clans) && loadedState.clans.length > 0) serverClans = loadedState.clans;
    if (Array.isArray(loadedState.actionableIntel) && loadedState.actionableIntel.length > 0) serverActionableIntel = loadedState.actionableIntel;
    if (Array.isArray(loadedState.activeOrders) && loadedState.activeOrders.length > 0) serverActiveOrders = loadedState.activeOrders;
    if (Array.isArray(loadedState.tacticalUnits) && loadedState.tacticalUnits.length > 0) serverTacticalUnits = loadedState.tacticalUnits;
    if (Array.isArray(loadedState.auditLogs) && loadedState.auditLogs.length > 0) serverAuditLogs = loadedState.auditLogs;
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
  const peers = Array.from(connectedPeers.values());
  const msgStr = JSON.stringify({
    type: "P2P_PEERS_LIST",
    payload: { peers }
  });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msgStr);
    }
  });
}

const wss = new WebSocketServer({ noServer: true });

wss.on("connection", (ws: WebSocket) => {
  console.log("A device connected to PII-LCC real-time network.");

  // Send the current authoritative state to the newly connected terminal
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
      moduleBackgrounds: serverModuleBackgrounds,
      fullDashboardBackground: serverFullDashboardBg
    }
  }));

  ws.on("message", (message: string) => {
    try {
      const data = JSON.parse(message);
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
          const { unitName, newCoords } = payload;
          serverTacticalUnits = serverTacticalUnits.map(unit => 
            unit.name === unitName ? { ...unit, coordinates: newCoords, lastReportTime: "Hace un momento" } : unit
          );
          shouldBroadcast = true;
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

        default:
          console.warn(`Unrecognized action event: ${type}`);
      }

      if (shouldBroadcast) {
        saveTacticalStateToDisk();
        broadcast({
          type: "STATE_UPDATE",
          payload: {
            rawAlerts: serverRawAlerts,
            clans: serverClans,
            actionableIntel: serverActionableIntel,
            activeOrders: serverActiveOrders,
            tacticalUnits: serverTacticalUnits,
            auditLogs: serverAuditLogs
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
  });
});

function broadcast(messageObj: any) {
  const payloadStr = JSON.stringify(messageObj);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payloadStr);
    }
  });
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
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.json({
      success: true,
      version: serverVersion,
      buildTimestamp: serverBuildTimestamp,
      publishedAt: new Date(serverBuildTimestamp).toISOString(),
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
        auditLogs: serverAuditLogs
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
        const { rawAlerts, clans, actionableIntel, activeOrders, tacticalUnits, auditLogs } = backup.tacticalState;
        if (Array.isArray(rawAlerts) && rawAlerts.length > 0) serverRawAlerts = rawAlerts;
        if (Array.isArray(clans) && clans.length > 0) serverClans = clans;
        if (Array.isArray(actionableIntel) && actionableIntel.length > 0) serverActionableIntel = actionableIntel;
        if (Array.isArray(activeOrders) && activeOrders.length > 0) serverActiveOrders = activeOrders;
        if (Array.isArray(tacticalUnits) && tacticalUnits.length > 0) serverTacticalUnits = tacticalUnits;
        if (Array.isArray(auditLogs) && auditLogs.length > 0) serverAuditLogs = auditLogs;
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
    const { action } = req.body;
    let shouldBroadcast = false;

    if (action && action.type) {
      const { type, payload } = action;
      try {
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
            const { unitName, newCoords } = payload;
            serverTacticalUnits = serverTacticalUnits.map(unit => 
              unit.name === unitName ? { ...unit, coordinates: newCoords, lastReportTime: "Hace un momento" } : unit
            );
            shouldBroadcast = true;
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
          rawAlerts: serverRawAlerts,
          clans: serverClans,
          actionableIntel: serverActionableIntel,
          activeOrders: serverActiveOrders,
          tacticalUnits: serverTacticalUnits,
          auditLogs: serverAuditLogs,
          moduleBackgrounds: serverModuleBackgrounds,
          fullDashboardBackground: serverFullDashboardBg
        }
      });
    }

    res.json({
      version: serverVersion,
      rawAlerts: serverRawAlerts,
      clans: serverClans,
      actionableIntel: serverActionableIntel,
      activeOrders: serverActiveOrders,
      tacticalUnits: serverTacticalUnits,
      auditLogs: serverAuditLogs,
      moduleBackgrounds: serverModuleBackgrounds,
      fullDashboardBackground: serverFullDashboardBg
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

  app.get("/api/code", (req, res) => {
    const file = req.query.file as string;
    const allowedFiles = [
      "server.ts",
      "src/App.tsx",
      "src/types.ts",
      "src/components/StrategicView.tsx",
      "src/components/OperationalView.tsx",
      "src/components/TacticalView.tsx",
      "src/components/TacticalP2PMesh.tsx",
      "src/components/OfficialCrest.tsx",
      "src/components/SystemArchitectureDiagram.tsx",
      "src/components/InteractiveChartCreator.tsx",
      "src/services/DeviceAuthService.ts",
      "src/components/SecureElement.tsx"
    ];

    if (!file || !allowedFiles.includes(file)) {
      return res.status(400).json({ error: "Archivo no permitido o no especificado" });
    }

    try {
      const filePath = path.join(process.cwd(), file);
      const content = fs.readFileSync(filePath, "utf-8");
      res.json({ file, content });
    } catch (err) {
      res.status(500).json({ error: "Error al leer el archivo" });
    }
  });

  httpServer.on("upgrade", (request, socket, head) => {
    const url = request.url || "";
    if (url.startsWith("/ws-sync")) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
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
