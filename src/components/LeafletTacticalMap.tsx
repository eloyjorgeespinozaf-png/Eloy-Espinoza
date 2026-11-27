/**
 * LeafletTacticalMap.tsx
 * Cuadro Operacional Común (COP) - Centro de Situación Táctico (PII-LCC CAD-C2).
 * Integración interactiva de OpenStreetMap / CartoDB / Satelital con Leaflet.js
 * centrado en Bolivia y zonas de frontera militar, con iteración de reportes S-2,
 * unidades de patrulla y órdenes OOA en tiempo real.
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import L from 'leaflet';
import { 
  RawAlert, 
  TacticalUnit, 
  AutomatedOrder, 
  ActionableIntel 
} from '../types';
import { parseCoordinates, formatToMilitaryDMS } from '../utils/geo';
import { 
  Map as MapIcon, 
  Layers, 
  Navigation, 
  Compass, 
  Shield, 
  AlertTriangle, 
  Radio, 
  Maximize2, 
  Filter, 
  Crosshair, 
  Clock, 
  Eye, 
  CheckCircle2, 
  Globe,
  X
} from 'lucide-react';
import { playSyntheticBeep, playCyberClick } from '../utils/audio';

interface LeafletTacticalMapProps {
  rawAlerts: RawAlert[];
  tacticalUnits: TacticalUnit[];
  activeOrders: AutomatedOrder[];
  actionableIntel?: ActionableIntel[];
  selectedAlertId?: string | null;
  onSelectAlert?: (alert: RawAlert) => void;
  onOpenGoogleEarth?: (unit: TacticalUnit) => void;
  onIssueOrderForAlert?: (alert: RawAlert) => void;
}

type TileLayerKey = 'HYBRID' | 'DARK' | 'OSM' | 'SATELLITE';

const TILE_LAYERS: Record<TileLayerKey, { name: string; url: string; attribution: string; maxZoom: number }> = {
  HYBRID: {
    name: 'Híbrido',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps',
    maxZoom: 20
  },
  DARK: {
    name: 'Táctico',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CartoDB &copy; OpenStreetMap',
    maxZoom: 19
  },
  OSM: {
    name: 'Calles OSM',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  },
  SATELLITE: {
    name: 'Satélite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri World Imagery',
    maxZoom: 18
  }
};

const BOLIVIA_NATIONAL_CENTER: [number, number] = [-16.5000, -64.6000];

// Tactical coordinate presets
const LOCATION_PRESETS = [
  { name: 'Bolivia (Nacional)', lat: -16.5000, lon: -64.6000, zoom: 6 },
  { name: 'Frontera LCC (Pisiga/Colchane)', lat: -19.2194, lon: -68.5972, zoom: 10 },
  { name: 'Sede Mando (La Paz/El Alto)', lat: -16.5000, lon: -68.1500, zoom: 11 },
  { name: 'Tambo Quemado / Chungará', lat: -18.2833, lon: -69.0500, zoom: 11 }
];

function escapeHtmlSafe(raw: string): string {
  return String(raw || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const LeafletTacticalMap: React.FC<LeafletTacticalMapProps> = ({
  rawAlerts,
  tacticalUnits,
  activeOrders,
  selectedAlertId,
  onSelectAlert,
  onOpenGoogleEarth,
  onIssueOrderForAlert
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const currentTileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const zonesLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const alertMarkersByIdRef = useRef<Map<string, L.Marker>>(new Map());
  const knownAlertIdsRef = useRef<Set<string> | null>(null);
  const hasFittedInitialBoundsRef = useRef<boolean>(false);

  const [activeTileKey, setActiveTileKey] = useState<TileLayerKey>('HYBRID');
  const [filterAlerts, setFilterAlerts] = useState<boolean>(true);
  const [filterPatrols, setFilterPatrols] = useState<boolean>(true);
  const [filterOrders, setFilterOrders] = useState<boolean>(true);
  const [mouseCoords, setMouseCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(6);
  const [incomingRawAlert, setIncomingRawAlert] = useState<RawAlert | null>(null);

  // Initialize Map centered across Bolivia
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // Prevent double initialization

    const map = L.map(mapContainerRef.current, {
      center: BOLIVIA_NATIONAL_CENTER,
      zoom: 6,
      zoomControl: false,
      attributionControl: true
    });

    // Add zoom control in top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Add scale bar in bottom-left
    L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);

    // Initial tile layer
    const initialTile = TILE_LAYERS[activeTileKey];
    const tileLayer = L.tileLayer(initialTile.url, {
      attribution: initialTile.attribution,
      maxZoom: initialTile.maxZoom
    }).addTo(map);
    currentTileLayerRef.current = tileLayer;

    // Layer groups for markers and interdiction zones
    const zonesGroup = L.layerGroup().addTo(map);
    const markersGroup = L.layerGroup().addTo(map);
    zonesLayerGroupRef.current = zonesGroup;
    markersLayerGroupRef.current = markersGroup;

    // Track mouse coordinates
    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      setMouseCoords({ lat: e.latlng.lat, lon: e.latlng.lng });
    });

    map.on('zoomend', () => {
      setZoomLevel(map.getZoom());
    });

    mapInstanceRef.current = map;

    // Ensure map redraws when DOM layout settles
    const resizeTimer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      clearTimeout(resizeTimer);
      alertMarkersByIdRef.current.clear();
      hasFittedInitialBoundsRef.current = false;
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Auto-detect newly transmitted Raw Field Reports and fly the COP map directly to them
  useEffect(() => {
    if (knownAlertIdsRef.current === null) {
      knownAlertIdsRef.current = new Set((rawAlerts || []).map((a) => a.id));
      return;
    }

    const newlyArrived = (rawAlerts || []).find((a) => !knownAlertIdsRef.current!.has(a.id));
    (rawAlerts || []).forEach((a) => knownAlertIdsRef.current!.add(a.id));

    if (newlyArrived) {
      setFilterAlerts(true);
      setIncomingRawAlert(newlyArrived);
      const parsed = parseCoordinates(newlyArrived.coordinates);
      if (parsed && mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([parsed.lat, parsed.lon], 11, { duration: 1.0 });
        window.setTimeout(() => {
          const m = alertMarkersByIdRef.current.get(newlyArrived.id);
          if (m) m.openPopup();
        }, 550);
      }
      const timer = window.setTimeout(() => {
        setIncomingRawAlert((curr) => (curr?.id === newlyArrived.id ? null : curr));
      }, 10000);
      return () => window.clearTimeout(timer);
    }
  }, [rawAlerts]);

  // Update TileLayer when user changes layer preset
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (currentTileLayerRef.current) {
      map.removeLayer(currentTileLayerRef.current);
    }

    const tileDef = TILE_LAYERS[activeTileKey];
    const newLayer = L.tileLayer(tileDef.url, {
      attribution: tileDef.attribution,
      maxZoom: tileDef.maxZoom
    }).addTo(map);
    newLayer.bringToBack();

    currentTileLayerRef.current = newLayer;
  }, [activeTileKey]);

  // Render & Iterate over Tactical Data: Alerts, Patrols, Orders
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerGroupRef.current;
    const zonesGroup = zonesLayerGroupRef.current;
    if (!map || !markersGroup || !zonesGroup) return;

    markersGroup.clearLayers();
    zonesGroup.clearLayers();
    alertMarkersByIdRef.current.clear();

    const allPlottedCoords: [number, number][] = [];
    const patrolPositions: { lat: number; lon: number }[] = [];
    (tacticalUnits || []).forEach((u) => {
      const p = parseCoordinates(u.coordinates);
      if (p) patrolPositions.push(p);
    });

    // 1. Iterate over Active Orders (OOA) with Interdiction Zones
    if (filterOrders && activeOrders && activeOrders.length > 0) {
      activeOrders.forEach((order, idx) => {
        let lat = -19.20 + (idx * 0.08);
        let lon = -68.60 - (idx * 0.05);

        const orderParsed = order.coordinates ? parseCoordinates(order.coordinates) : null;
        if (orderParsed) {
          lat = orderParsed.lat;
          lon = orderParsed.lon;
        } else {
          const matchingAlert = rawAlerts.find(a => a.id === order.rawAlertId || a.id === order.intelId);
          if (matchingAlert?.coordinates) {
            const parsed = parseCoordinates(matchingAlert.coordinates);
            if (parsed) {
              lat = parsed.lat;
              lon = parsed.lon;
            }
          }
        }

        allPlottedCoords.push([lat, lon]);

        // Draw Interdiction Perimeter Circle (2.5 km)
        const zoneCircle = L.circle([lat, lon], {
          radius: 2800,
          color: order.status === 'COMPLETED' ? '#10b981' : '#f59e0b',
          weight: 2,
          dashArray: '6, 6',
          fillColor: order.status === 'COMPLETED' ? '#10b981' : '#f59e0b',
          fillOpacity: 0.12
        });
        zonesGroup.addLayer(zoneCircle);

        const orderIconHtml = `
          <div class="relative flex items-center justify-center cursor-pointer transform -translate-x-1/2 -translate-y-1/2 group">
            <div class="w-8 h-8 rounded-full border-2 border-amber-400 bg-[#0d1420]/90 shadow-[0_0_15px_rgba(245,158,11,0.5)] flex items-center justify-center text-amber-300 font-bold text-[10px]">
              OOA
            </div>
            <div class="absolute -bottom-4 whitespace-nowrap bg-black/80 px-1.5 py-0.2 rounded text-[9px] text-amber-300 border border-amber-500/40 font-mono">
              ${escapeHtmlSafe(order.codeName.slice(0, 16))}
            </div>
          </div>
        `;

        const orderIcon = L.divIcon({
          html: orderIconHtml,
          className: 'custom-tactical-order-icon',
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        const orderMarker = L.marker([lat, lon], { icon: orderIcon, zIndexOffset: 400 });

        const popupContent = document.createElement('div');
        popupContent.className = 'font-mono text-xs text-zinc-200 p-2 space-y-2';
        const headerDiv = document.createElement('div');
        headerDiv.className = 'flex items-center justify-between border-b border-amber-500/30 pb-1.5 gap-2';
        const titleSpan = document.createElement('span');
        titleSpan.className = 'text-amber-400 font-bold text-[10px]';
        titleSpan.textContent = 'ORDEN DE OPERACIONES (OOA)';
        const statusSpan = document.createElement('span');
        statusSpan.className = 'text-[9px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700/50';
        statusSpan.textContent = order.status;
        headerDiv.appendChild(titleSpan);
        headerDiv.appendChild(statusSpan);
        popupContent.appendChild(headerDiv);

        const codeDiv = document.createElement('div');
        codeDiv.className = 'text-sm font-bold text-white';
        codeDiv.textContent = order.codeName;
        popupContent.appendChild(codeDiv);

        const objDiv = document.createElement('div');
        objDiv.className = 'text-[11px] text-zinc-300';
        objDiv.textContent = order.objective || 'Interdicción y bloqueo de vector de contrabando';
        popupContent.appendChild(objDiv);

        const metaBox = document.createElement('div');
        metaBox.className = 'text-[10px] text-zinc-400 bg-black/60 p-1.5 rounded border border-zinc-800 space-y-1';
        metaBox.textContent = `Unidad: ${order.assignedUnit} | Emisor: ${order.issuer}`;
        popupContent.appendChild(metaBox);

        orderMarker.bindPopup(popupContent);
        markersGroup.addLayer(orderMarker);
      });
    }

    // 2. Iterate over Raw Alerts (Reportes en Crudo S-2) with radar circle, anti-overlap & high z-index
    if (filterAlerts && rawAlerts && rawAlerts.length > 0) {
      const placedAlerts: { lat: number; lon: number }[] = [];

      rawAlerts.forEach((alert, idx) => {
        let lat = -19.2194 + (idx * 0.04);
        let lon = -68.5972 + (idx * 0.035);

        if (alert.coordinates) {
          const parsed = parseCoordinates(alert.coordinates);
          if (parsed) {
            lat = parsed.lat;
            lon = parsed.lon;
          }
        }

        allPlottedCoords.push([lat, lon]);

        const isSelected = selectedAlertId === alert.id;
        const isCritical = alert.reliability === 'A' && alert.certainty === '1';
        const isPending = alert.status === 'PENDING';
        const isProcessed = alert.status === 'PROCESSED';

        // Radar ring centered on exact GPS coordinate of the raw report
        const alertRing = L.circle([lat, lon], {
          radius: isSelected ? 2400 : isPending ? 1800 : 1000,
          color: isSelected ? '#facc15' : isCritical ? '#ef4444' : isPending ? '#f97316' : '#10b981',
          weight: isSelected ? 2.5 : 1.5,
          dashArray: isPending ? '5, 5' : undefined,
          fillColor: isCritical ? '#ef4444' : isPending ? '#f97316' : '#10b981',
          fillOpacity: isSelected ? 0.22 : 0.12
        });
        zonesGroup.addLayer(alertRing);

        // Anti-overlap offset if sharing exact GPS with a patrol or another raw report
        let markerLat = lat;
        let markerLon = lon;
        const overlapsPatrol = patrolPositions.some(
          (p) => Math.hypot(p.lat - lat, p.lon - lon) < 0.0028
        );
        const overlapsAlertCount = placedAlerts.filter(
          (a) => Math.hypot(a.lat - lat, a.lon - lon) < 0.0028
        ).length;

        if (overlapsPatrol || overlapsAlertCount > 0) {
          const angle = ((overlapsAlertCount + (overlapsPatrol ? 1 : 0)) * 55 + idx * 19) * (Math.PI / 180);
          const radiusDeg = 0.0032 + overlapsAlertCount * 0.0014;
          markerLat = lat + Math.sin(angle) * radiusDeg;
          markerLon = lon + Math.cos(angle) * radiusDeg;

          zonesGroup.addLayer(
            L.polyline(
              [
                [lat, lon],
                [markerLat, markerLon]
              ],
              {
                color: isSelected ? '#facc15' : '#f97316',
                weight: 1.5,
                dashArray: '3, 3',
                opacity: 0.9
              }
            )
          );
        }
        placedAlerts.push({ lat: markerLat, lon: markerLon });

        const colorClass = isCritical
          ? 'border-red-500 text-red-300 bg-red-950/95 shadow-[0_0_18px_rgba(239,68,68,0.8)]'
          : isProcessed
          ? 'border-emerald-500 text-emerald-300 bg-emerald-950/95 shadow-[0_0_12px_rgba(16,185,129,0.55)]'
          : 'border-orange-500 text-orange-200 bg-[#231004]/95 shadow-[0_0_16px_rgba(249,115,22,0.8)]';

        const unitOrSource = escapeHtmlSafe((alert.originUnit || alert.sourceName || 'S-2').slice(0, 16));
        const pingHtml = isPending
          ? '<span style="position:absolute;inset:-6px;border-radius:10px;border:2px solid #f97316;opacity:0.75;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></span>'
          : '';

        const markerHtml = `
          <div class="relative flex items-center justify-center cursor-pointer transform -translate-x-1/2 -translate-y-1/2 group">
            <div class="relative w-8 h-8 rounded-lg border-2 ${colorClass} flex flex-col items-center justify-center font-bold text-[9px] ${isSelected ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-black scale-110' : ''}">
              ${pingHtml}
              <span>⚠${escapeHtmlSafe(alert.sourceType.slice(0, 2))}</span>
            </div>
            <div class="absolute -bottom-5 whitespace-nowrap bg-[#180c04]/95 px-1.5 py-0.5 rounded text-[8.5px] text-orange-200 border border-orange-500/70 font-mono font-bold shadow-md">
              S-2 • ${unitOrSource}
            </div>
          </div>
        `;

        const alertIcon = L.divIcon({
          html: markerHtml,
          className: 'custom-tactical-alert-icon',
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        const alertMarker = L.marker([markerLat, markerLon], {
          icon: alertIcon,
          zIndexOffset: isSelected ? 1150 : 850
        });

        // Safe DOM popup construction
        const popupDiv = document.createElement('div');
        popupDiv.className = 'font-mono text-xs text-zinc-200 p-2 space-y-2 max-w-[280px]';

        const topRow = document.createElement('div');
        topRow.className = 'flex items-center justify-between border-b border-orange-500/40 pb-1.5 gap-2';
        const topTitle = document.createElement('span');
        topTitle.className = 'text-[10px] font-bold text-orange-400 uppercase';
        topTitle.textContent = `REPORTE CRUDO S-2 (${alert.sourceType})`;
        const topStatus = document.createElement('span');
        topStatus.className = `text-[9px] px-1.5 py-0.5 rounded font-bold ${
          isPending ? 'bg-orange-950 text-orange-300 border border-orange-600' : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
        }`;
        topStatus.textContent = alert.status;
        topRow.appendChild(topTitle);
        topRow.appendChild(topStatus);
        popupDiv.appendChild(topRow);

        const sourceLine = document.createElement('div');
        sourceLine.className = 'text-xs font-bold text-white leading-tight';
        sourceLine.textContent = alert.originUnit ? `${alert.originUnit} — ${alert.sourceName}` : alert.sourceName;
        popupDiv.appendChild(sourceLine);

        const detailsLine = document.createElement('div');
        detailsLine.className = 'text-[11px] text-zinc-200 bg-black/40 p-1.5 rounded border border-zinc-800';
        detailsLine.textContent = alert.details;
        popupDiv.appendChild(detailsLine);

        if (alert.mediaUrl && (alert.mediaUrl.startsWith('data:image') || alert.mediaUrl.startsWith('http'))) {
          const imgEl = document.createElement('img');
          imgEl.src = alert.mediaUrl;
          imgEl.alt = 'Evidencia S-2';
          imgEl.className = 'w-full h-24 object-cover rounded border border-orange-500/40';
          popupDiv.appendChild(imgEl);
        }

        const metaGrid = document.createElement('div');
        metaGrid.className = 'bg-black/60 p-2 rounded border border-zinc-800 text-[10px] space-y-1';
        const rows: [string, string][] = [
          ['Sector:', alert.originSector || 'Territorio Nacional Bolivia'],
          ['Evaluación:', `Fiabilidad ${alert.reliability} | Certeza ${alert.certainty}`],
          ['GPS:', alert.coordinates]
        ];
        rows.forEach(([k, v]) => {
          const r = document.createElement('div');
          r.className = 'flex justify-between gap-2';
          const kEl = document.createElement('span');
          kEl.className = 'text-zinc-400 shrink-0';
          kEl.textContent = k;
          const vEl = document.createElement('strong');
          vEl.className = 'text-cyan-300 text-right truncate';
          vEl.textContent = v;
          r.appendChild(kEl);
          r.appendChild(vEl);
          metaGrid.appendChild(r);
        });
        popupDiv.appendChild(metaGrid);

        const actionBtn = document.createElement('button');
        actionBtn.type = 'button';
        actionBtn.className = 'w-full py-1.5 px-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[11px] rounded transition cursor-pointer flex items-center justify-center gap-1.5 shadow-[0_0_10px_rgba(6,182,212,0.3)] mt-1';
        actionBtn.textContent = 'Procesar en CFI / Mando';
        actionBtn.onclick = () => {
          if (onSelectAlert) onSelectAlert(alert);
          if (onIssueOrderForAlert && alert.status !== 'PROCESSED') onIssueOrderForAlert(alert);
          playCyberClick('laser', 0.1);
        };
        popupDiv.appendChild(actionBtn);

        alertMarker.bindPopup(popupDiv);
        alertMarker.on('click', () => {
          if (onSelectAlert) onSelectAlert(alert);
        });
        alertMarkersByIdRef.current.set(alert.id, alertMarker);
        markersGroup.addLayer(alertMarker);
      });
    }

    // 3. Iterate over Tactical Units (Patrols)
    if (filterPatrols && tacticalUnits && tacticalUnits.length > 0) {
      tacticalUnits.forEach((unit, idx) => {
        let lat = -19.24 + (idx * 0.05);
        let lon = -68.58 + (idx * 0.04);

        if (unit.coordinates) {
          const parsed = parseCoordinates(unit.coordinates);
          if (parsed) {
            lat = parsed.lat;
            lon = parsed.lon;
          }
        }

        allPlottedCoords.push([lat, lon]);

        const isMoving = unit.status === 'PATROLLING';
        const isInterdicting = unit.status === 'INTERCEPTING';

        const statusColor = isInterdicting
          ? 'border-red-400 bg-red-950 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.6)]'
          : isMoving
          ? 'border-cyan-400 bg-cyan-950 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.5)]'
          : 'border-emerald-400 bg-emerald-950 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.5)]';

        const patrolHtml = `
          <div class="relative flex items-center justify-center cursor-pointer transform -translate-x-1/2 -translate-y-1/2 group">
            <div class="w-8 h-8 rounded-full border-2 ${statusColor} flex items-center justify-center font-bold text-xs">
              🛡️
            </div>
            <div class="absolute -bottom-4 whitespace-nowrap bg-black/90 px-1 rounded text-[8px] text-cyan-300 border border-cyan-500/40 font-mono">
              ${escapeHtmlSafe(unit.name)}
            </div>
          </div>
        `;

        const patrolIcon = L.divIcon({
          html: patrolHtml,
          className: 'custom-tactical-patrol-icon',
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        const patrolMarker = L.marker([lat, lon], { icon: patrolIcon, zIndexOffset: 500 });

        const popupDiv = document.createElement('div');
        popupDiv.className = 'font-mono text-xs text-zinc-200 p-2 space-y-2';

        const pHead = document.createElement('div');
        pHead.className = 'flex items-center justify-between border-b border-cyan-500/30 pb-1.5 gap-2';
        const pTitle = document.createElement('span');
        pTitle.className = 'text-cyan-400 font-bold text-[10px]';
        pTitle.textContent = 'UNIDAD DE TERRENO';
        const pStat = document.createElement('span');
        pStat.className = 'text-[9px] px-1.5 py-0.5 rounded font-bold bg-cyan-950 text-cyan-300 border border-cyan-700/50';
        pStat.textContent = unit.status;
        pHead.appendChild(pTitle);
        pHead.appendChild(pStat);
        popupDiv.appendChild(pHead);

        const pName = document.createElement('div');
        pName.className = 'text-sm font-bold text-white';
        pName.textContent = unit.name;
        popupDiv.appendChild(pName);

        const pMeta = document.createElement('div');
        pMeta.className = 'bg-black/60 p-2 rounded border border-zinc-800 text-[10px] space-y-1';
        [
          `Comandante: ${unit.commander || 'S-2'}`,
          `Sector: ${unit.sector || 'Territorio Nacional'}`,
          `Efectivos: ${unit.personnel || 6} hombres`,
          `Posición GNSS: ${unit.coordinates}`
        ].forEach((line) => {
          const row = document.createElement('div');
          row.textContent = line;
          pMeta.appendChild(row);
        });
        popupDiv.appendChild(pMeta);

        if (onOpenGoogleEarth) {
          const earthBtn = document.createElement('button');
          earthBtn.type = 'button';
          earthBtn.className = 'w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded transition cursor-pointer flex items-center justify-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.3)] mt-2';
          earthBtn.textContent = 'Ver Telemetría Google Earth 3D';
          earthBtn.onclick = () => {
            onOpenGoogleEarth(unit);
            playCyberClick('laser', 0.1);
          };
          popupDiv.appendChild(earthBtn);
        }

        patrolMarker.bindPopup(popupDiv);
        markersGroup.addLayer(patrolMarker);
      });
    }

    // Fit all patrols & raw reports nationwide once on initial mount
    if (!hasFittedInitialBoundsRef.current && allPlottedCoords.length > 0) {
      hasFittedInitialBoundsRef.current = true;
      if (allPlottedCoords.length === 1) {
        map.setView(allPlottedCoords[0], 11, { animate: false });
      } else {
        map.fitBounds(L.latLngBounds(allPlottedCoords), { padding: [50, 50], maxZoom: 11 });
      }
    }
  }, [rawAlerts, tacticalUnits, activeOrders, filterAlerts, filterPatrols, filterOrders, selectedAlertId, onSelectAlert, onOpenGoogleEarth, onIssueOrderForAlert]);

  // Focus a specific raw alert on the COP map
  const handleFocusAlert = useCallback((alert: RawAlert) => {
    setFilterAlerts(true);
    const parsed = parseCoordinates(alert.coordinates);
    if (parsed && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([parsed.lat, parsed.lon], 12, { duration: 0.85 });
      window.setTimeout(() => {
        const m = alertMarkersByIdRef.current.get(alert.id);
        if (m) m.openPopup();
      }, 450);
    }
    if (onSelectAlert) onSelectAlert(alert);
    playSyntheticBeep(980, 0.06);
  }, [onSelectAlert]);

  // Fit all patrols & raw alerts across Bolivia
  const handleFitAllBolivia = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const pts: [number, number][] = [];
    (tacticalUnits || []).forEach((u) => {
      const p = parseCoordinates(u.coordinates);
      if (p) pts.push([p.lat, p.lon]);
    });
    (rawAlerts || []).forEach((a) => {
      const p = parseCoordinates(a.coordinates);
      if (p) pts.push([p.lat, p.lon]);
    });
    if (pts.length > 1) {
      map.flyToBounds(L.latLngBounds(pts), { padding: [50, 50], maxZoom: 12, duration: 0.8 });
    } else if (pts.length === 1) {
      map.flyTo(pts[0], 11, { duration: 0.8 });
    } else {
      map.flyTo(BOLIVIA_NATIONAL_CENTER, 6, { duration: 0.8 });
    }
    playSyntheticBeep(880, 0.06);
  }, [tacticalUnits, rawAlerts]);

  // Preset location centering
  const handleGoToLocation = (lat: number, lon: number, zoom: number) => {
    const map = mapInstanceRef.current;
    if (map) {
      map.flyTo([lat, lon], zoom, { duration: 1.0 });
      playSyntheticBeep(980, 0.08);
    }
  };

  return (
    <div className="relative w-full aspect-[4/3] bg-[#080c14] border border-[#1e293b] rounded-xl overflow-hidden flex flex-col shadow-2xl">
      
      {/* Top Map Control Bar */}
      <div className="absolute top-2 left-2 right-2 z-[1000] flex flex-wrap items-center justify-between gap-2 pointer-events-auto">
        
        {/* Layer Selector (Dark, OSM, Satellite) */}
        <div className="flex items-center gap-1 bg-[#090e17]/90 backdrop-blur-md p-1 rounded-lg border border-cyan-500/30 shadow-lg">
          {(Object.keys(TILE_LAYERS) as TileLayerKey[]).map((key) => {
            const isActive = activeTileKey === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setActiveTileKey(key);
                  playCyberClick('crisp', 0.08);
                }}
                className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-cyan-600 text-white shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                {TILE_LAYERS[key].name}
              </button>
            );
          })}
        </div>

        {/* Tactical Filter Toggles */}
        <div className="flex items-center gap-1 bg-[#090e17]/90 backdrop-blur-md p-1 rounded-lg border border-zinc-800 shadow-lg">
          <button
            type="button"
            onClick={() => setFilterAlerts(p => !p)}
            className={`px-2 py-1 rounded text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
              filterAlerts
                ? 'bg-red-950/80 text-red-300 border border-red-500/40'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Mostrar u ocultar reportes tácticos S-2"
          >
            <span>Alertas S-2</span>
            <span className="text-[9px] bg-red-900/60 px-1 rounded">{rawAlerts.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterPatrols(p => !p)}
            className={`px-2 py-1 rounded text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
              filterPatrols
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Mostrar u ocultar patrullas tácticas en terreno"
          >
            <span>Patrullas</span>
            <span className="text-[9px] bg-emerald-900/60 px-1 rounded">{tacticalUnits.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterOrders(p => !p)}
            className={`px-2 py-1 rounded text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
              filterOrders
                ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Mostrar u ocultar perímetros de interdicción OOA"
          >
            <span>Órdenes OOA</span>
            <span className="text-[9px] bg-amber-900/60 px-1 rounded">{activeOrders.length}</span>
          </button>
        </div>

        {/* Quick Centering Presets & Fit All */}
        <div className="hidden sm:flex items-center gap-1 bg-[#090e17]/90 backdrop-blur-md p-1 rounded-lg border border-zinc-800 shadow-lg">
          <button
            type="button"
            onClick={handleFitAllBolivia}
            className="px-2 py-1 rounded text-[10px] font-mono font-bold text-cyan-300 hover:bg-cyan-950/60 transition cursor-pointer flex items-center gap-1"
            title="Encuadrar todas las patrullas y reportes crudos S-2 en Bolivia"
          >
            <Maximize2 className="w-3 h-3" />
            <span>Ver Todo</span>
          </button>
          {LOCATION_PRESETS.slice(0, 2).map((loc) => (
            <button
              key={loc.name}
              type="button"
              onClick={() => handleGoToLocation(loc.lat, loc.lon, loc.zoom)}
              className="px-2 py-1 rounded text-[10px] font-mono text-zinc-300 hover:text-cyan-300 hover:bg-zinc-800 transition cursor-pointer"
            >
              {loc.name.split(' ')[0]}
            </button>
          ))}
        </div>

      </div>

      {/* Live Incoming Raw S-2 Report Arrival Callout Banner */}
      {incomingRawAlert && (
        <div className="absolute top-14 left-2 right-12 sm:right-auto sm:max-w-md z-[1000] bg-[#1f0d04]/95 backdrop-blur-md border-2 border-orange-500 rounded-xl px-3 py-2 shadow-[0_0_25px_rgba(249,115,22,0.55)] flex items-center justify-between gap-2 animate-fade-in pointer-events-auto">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-ping shrink-0" />
            <div className="min-w-0 text-[10px] font-mono text-left">
              <div className="text-orange-300 font-bold uppercase truncate">
                NUEVO REPORTE EN CRUDO S-2 • {incomingRawAlert.sourceType}
              </div>
              <div className="text-white truncate">
                {incomingRawAlert.originUnit || incomingRawAlert.sourceName} — {incomingRawAlert.coordinates}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => handleFocusAlert(incomingRawAlert)}
              className="px-2 py-1 rounded bg-orange-500 hover:bg-orange-400 text-black font-bold text-[9px] font-mono cursor-pointer"
            >
              Centrar
            </button>
            <button
              type="button"
              onClick={() => setIncomingRawAlert(null)}
              className="p-1 text-orange-300 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Leaflet Container */}
      <div 
        ref={mapContainerRef} 
        id="leaflet-tactical-cop" 
        className="w-full h-full z-0 relative focus:outline-none" 
      />

      {/* Quick-Jump Strip for Latest Raw S-2 Field Reports (Bottom Left above scale) */}
      {rawAlerts.length > 0 && (
        <div className="absolute bottom-9 left-2 z-[1000] max-w-[65%] sm:max-w-[55%] bg-[#0a0f1a]/92 backdrop-blur-md border border-orange-500/45 rounded-lg p-1.5 shadow-xl pointer-events-auto">
          <div className="flex items-center gap-1.5 text-[9px] font-mono text-orange-300 font-bold uppercase mb-1 px-1">
            <AlertTriangle className="w-3 h-3 animate-pulse shrink-0" />
            <span>Reportes Crudos S-2 ({rawAlerts.length})</span>
          </div>
          <div className="flex flex-wrap gap-1 max-h-14 overflow-y-auto">
            {rawAlerts.slice(0, 4).map((alert) => {
              const isSelected = selectedAlertId === alert.id;
              const isPending = alert.status === 'PENDING';
              return (
                <button
                  key={alert.id}
                  type="button"
                  onClick={() => handleFocusAlert(alert)}
                  title={`${alert.sourceType} • ${alert.originUnit || alert.sourceName}: ${alert.details}`}
                  className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border flex items-center gap-1 transition-all cursor-pointer max-w-[175px] ${
                    isSelected
                      ? 'bg-orange-500 text-black border-yellow-300'
                      : isPending
                      ? 'bg-orange-950/80 text-orange-200 border-orange-500/50 hover:bg-orange-900/80'
                      : 'bg-zinc-900/90 text-emerald-300 border-emerald-500/40 hover:bg-zinc-800'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      isPending ? 'bg-orange-400 animate-ping' : 'bg-emerald-400'
                    }`}
                  />
                  <span className="truncate">
                    {alert.sourceType} • {(alert.originUnit || alert.sourceName).slice(0, 14)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom Telemetry Bar */}
      <div className="absolute bottom-2 right-2 z-[1000] bg-[#090e17]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-cyan-500/30 text-[10px] font-mono text-zinc-300 flex items-center gap-3 shadow-lg pointer-events-auto">
        <div className="flex items-center gap-1.5">
          <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
          <span>
            {mouseCoords 
              ? `${mouseCoords.lat.toFixed(4)}, ${mouseCoords.lon.toFixed(4)}`
              : '-16.5000, -64.6000'}
          </span>
        </div>
        <span className="text-zinc-600">|</span>
        <div className="text-zinc-400">
          DMS: <span className="text-white">{mouseCoords ? formatToMilitaryDMS(mouseCoords.lat, mouseCoords.lon) : "16°30'00\"S 64°36'00\"W"}</span>
        </div>
        <span className="text-zinc-600">|</span>
        <div className="text-cyan-400 font-bold">
          Zoom: {zoomLevel}x
        </div>
      </div>

    </div>
  );
};
export default LeafletTacticalMap;
