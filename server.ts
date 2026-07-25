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
import { RawAlert, Clan, ActionableIntel, AutomatedOrder, TacticalUnit, AuditLogEntry } from "./src/types";

// Centralized in-memory synced database
let serverVersion = "v2.4.0-CAD";
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
      auditLogs: serverAuditLogs
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

        default:
          console.warn(`Unrecognized action event: ${type}`);
      }

      if (shouldBroadcast) {
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
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  const httpServer = createHttpServer(app);

  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "active", 
      connectedTerminals: wss.clients.size,
      serverTime: Date.now()
    });
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


        }
      } catch (err) {
        console.error("Error processing HTTP action:", err);
      }
    }

    if (shouldBroadcast) {
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

    res.json({
      version: serverVersion,
      rawAlerts: serverRawAlerts,
      clans: serverClans,
      actionableIntel: serverActionableIntel,
      activeOrders: serverActiveOrders,
      tacticalUnits: serverTacticalUnits,
      auditLogs: serverAuditLogs
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
    // Bundle the app along with the special instructions file specifically for mobile devices and tablets
    const cmd = `tar -czf "${archivePath}" --exclude=node_modules --exclude=dist --exclude=.git --exclude=.cache --exclude=.npm --exclude=*.tar.gz INSTRUCCIONES_MOVIL.html public src index.html package.json vite.config.ts`;

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
    console.log(`[Server] Upgrade request received for URL: ${url}`);
    if (url.startsWith("/ws-sync")) {
      console.log(`[Server] Handling /ws-sync upgrade...`);
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      console.log(`[Server] Upgrade request ignored/unhandled for URL: ${url}`);
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
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
