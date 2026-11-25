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
  Globe 
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

type TileLayerKey = 'DARK' | 'OSM' | 'SATELLITE';

const TILE_LAYERS: Record<TileLayerKey, { name: string; url: string; attribution: string; maxZoom: number }> = {
  DARK: {
    name: 'Táctico Oscuro',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CartoDB &copy; OpenStreetMap',
    maxZoom: 19
  },
  OSM: {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  },
  SATELLITE: {
    name: 'Satelital Relieve',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri World Imagery',
    maxZoom: 18
  }
};

// Tactical coordinate presets
const LOCATION_PRESETS = [
  { name: 'Frontera LCC (Pisiga/Colchane)', lat: -19.2194, lon: -68.5972, zoom: 10 },
  { name: 'Bolivia (Nacional)', lat: -16.5000, lon: -64.8000, zoom: 6 },
  { name: 'Sede Mando (La Paz/El Alto)', lat: -16.5000, lon: -68.1500, zoom: 11 },
  { name: 'Tambo Quemado / Chungará', lat: -18.2833, lon: -69.0500, zoom: 11 }
];

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

  const [activeTileKey, setActiveTileKey] = useState<TileLayerKey>('DARK');
  const [filterAlerts, setFilterAlerts] = useState<boolean>(true);
  const [filterPatrols, setFilterPatrols] = useState<boolean>(true);
  const [filterOrders, setFilterOrders] = useState<boolean>(true);
  const [mouseCoords, setMouseCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(8);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // Prevent double initialization

    // Center on Western Frontier by default
    const defaultCenter: L.LatLngExpression = [-19.2194, -68.5972];
    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 8,
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
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

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

    // 1. Iterate over Active Orders (OOA) with Interdiction Zones
    if (filterOrders && activeOrders && activeOrders.length > 0) {
      activeOrders.forEach((order, idx) => {
        let lat = -19.20 + (idx * 0.08);
        let lon = -68.60 - (idx * 0.05);

        // Check if matching alert has coords
        const matchingAlert = rawAlerts.find(a => a.id === order.intelId);
        if (matchingAlert?.coordinates) {
          const parsed = parseCoordinates(matchingAlert.coordinates);
          if (parsed) {
            lat = parsed.lat;
            lon = parsed.lon;
          }
        }

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

        // Custom Tactical Order DivIcon
        const orderIconHtml = `
          <div class="relative flex items-center justify-center cursor-pointer transform -translate-x-1/2 -translate-y-1/2 group">
            <div class="w-8 h-8 rounded-full border-2 border-amber-400 bg-[#0d1420]/90 shadow-[0_0_15px_rgba(245,158,11,0.5)] flex items-center justify-center text-amber-300 font-bold text-[10px]">
              OOA
            </div>
            <div class="absolute -bottom-4 whitespace-nowrap bg-black/80 px-1.5 py-0.2 rounded text-[9px] text-amber-300 border border-amber-500/40 font-mono">
              ${order.codeName.slice(0, 16)}
            </div>
          </div>
        `;

        const orderIcon = L.divIcon({
          html: orderIconHtml,
          className: 'custom-tactical-order-icon',
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        const orderMarker = L.marker([lat, lon], { icon: orderIcon });

        const popupContent = document.createElement('div');
        popupContent.className = 'font-mono text-xs text-zinc-200 p-2 space-y-2';
        popupContent.innerHTML = `
          <div class="flex items-center justify-between border-b border-amber-500/30 pb-1.5">
            <div class="flex items-center gap-1.5 text-amber-400 font-bold">
              <span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
              <span>ORDEN DE OPERACIONES (OOA)</span>
            </div>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700/50">${order.status}</span>
          </div>
          <div class="text-sm font-bold text-white">${order.codeName}</div>
          <div class="text-[11px] text-zinc-300">${order.objective || 'Interdicción y bloqueo de vector de contrabando'}</div>
          <div class="text-[10px] text-zinc-400 bg-black/60 p-1.5 rounded border border-zinc-800 space-y-1">
            <div><strong>Unidad Asignada:</strong> <span class="text-cyan-300">${order.assignedUnit}</span></div>
            <div><strong>Emisor:</strong> ${order.issuer}</div>
            <div><strong>Objetivo:</strong> ${order.objective || 'Control de paso fronterizo'}</div>
          </div>
        `;

        orderMarker.bindPopup(popupContent);
        markersGroup.addLayer(orderMarker);
      });
    }

    // 2. Iterate over Raw Alerts (S-2)
    if (filterAlerts && rawAlerts && rawAlerts.length > 0) {
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

        const isSelected = selectedAlertId === alert.id;
        const isCritical = alert.reliability === 'A' && alert.certainty === '1';
        const isProcessed = alert.status === 'PROCESSED';

        const colorClass = isCritical 
          ? 'border-red-500 text-red-400 bg-red-950/90 shadow-[0_0_18px_rgba(239,68,68,0.7)]' 
          : isProcessed 
          ? 'border-emerald-500 text-emerald-300 bg-emerald-950/90 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
          : 'border-amber-500 text-amber-300 bg-amber-950/90 shadow-[0_0_12px_rgba(245,158,11,0.5)]';

        const markerHtml = `
          <div class="relative flex items-center justify-center cursor-pointer transform -translate-x-1/2 -translate-y-1/2 group">
            <div class="w-7 h-7 rounded-lg border-2 ${colorClass} flex flex-col items-center justify-center font-bold text-[9px] ${isSelected ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-black scale-110' : ''}">
              <span>${alert.sourceType.slice(0, 2)}</span>
            </div>
            <div class="absolute -bottom-4 whitespace-nowrap bg-black/90 px-1 rounded text-[8px] text-zinc-300 border border-zinc-700 font-mono">
              ${alert.id.slice(-4)} [${alert.reliability}-${alert.certainty}]
            </div>
          </div>
        `;

        const alertIcon = L.divIcon({
          html: markerHtml,
          className: 'custom-tactical-alert-icon',
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        const alertMarker = L.marker([lat, lon], { icon: alertIcon });

        // Popup construction with interactive action button
        const popupDiv = document.createElement('div');
        popupDiv.className = 'font-mono text-xs text-zinc-200 p-2 space-y-2 max-w-[280px]';
        popupDiv.innerHTML = `
          <div class="flex items-center justify-between border-b border-zinc-800 pb-1.5">
            <span class="text-[10px] font-bold text-cyan-400 uppercase">REPORTE TÁCTICO S-2</span>
            <span class="text-[9px] px-1.5 py-0.2 rounded font-bold ${isCritical ? 'bg-red-950 text-red-300 border border-red-700' : 'bg-zinc-800 text-zinc-300'}">
              ${alert.status}
            </span>
          </div>

          <div class="text-xs font-bold text-white leading-tight">${alert.id}</div>
          <div class="text-[11px] text-zinc-300 line-clamp-3">${alert.details}</div>

          <div class="bg-black/60 p-2 rounded border border-zinc-800 text-[10px] space-y-1">
            <div class="flex justify-between">
              <span class="text-zinc-400">Origen:</span>
              <strong class="text-cyan-300">${alert.originSector || 'Hito Tripartito'}</strong>
            </div>
            <div class="flex justify-between">
              <span class="text-zinc-400">Matriz:</span>
              <span class="text-amber-400 font-bold">Fiabilidad: ${alert.reliability} | Certeza: ${alert.certainty}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-zinc-400">Coordenadas:</span>
              <span class="text-zinc-200">${alert.coordinates}</span>
            </div>
          </div>
        `;

        // Direct action button in popup
        const actionBtn = document.createElement('button');
        actionBtn.type = 'button';
        actionBtn.className = 'w-full py-1.5 px-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[11px] rounded transition cursor-pointer flex items-center justify-center gap-1.5 shadow-[0_0_10px_rgba(6,182,212,0.3)] mt-2';
        actionBtn.innerHTML = `<span>Procesar en CFI / Mando</span>`;
        actionBtn.onclick = () => {
          if (onSelectAlert) onSelectAlert(alert);
          if (onIssueOrderForAlert && alert.status !== 'PROCESSED') onIssueOrderForAlert(alert);
          playCyberClick('laser', 0.1);
        };
        popupDiv.appendChild(actionBtn);

        alertMarker.bindPopup(popupDiv);
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
              ${unit.name}
            </div>
          </div>
        `;

        const patrolIcon = L.divIcon({
          html: patrolHtml,
          className: 'custom-tactical-patrol-icon',
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        const patrolMarker = L.marker([lat, lon], { icon: patrolIcon });

        const popupDiv = document.createElement('div');
        popupDiv.className = 'font-mono text-xs text-zinc-200 p-2 space-y-2';
        popupDiv.innerHTML = `
          <div class="flex items-center justify-between border-b border-cyan-500/30 pb-1.5">
            <div class="flex items-center gap-1.5 text-cyan-400 font-bold">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>UNIDAD DE TERRENO</span>
            </div>
            <span class="text-[9px] px-1.5 py-0.5 rounded font-bold bg-cyan-950 text-cyan-300 border border-cyan-700/50">
              ${unit.status}
            </span>
          </div>

          <div class="text-sm font-bold text-white">${unit.name}</div>

          <div class="bg-black/60 p-2 rounded border border-zinc-800 text-[10px] space-y-1">
            <div><strong>Comandante:</strong> <span class="text-zinc-200">${unit.commander || 'S-2'}</span></div>
            <div><strong>Efectivos:</strong> <span class="text-zinc-200">${unit.personnel || 6} hombres</span></div>
            <div><strong>Último Reporte:</strong> <span class="text-zinc-400">${unit.lastReportTime}</span></div>
            <div><strong>Posición GNSS:</strong> <span class="text-cyan-300">${unit.coordinates}</span></div>
          </div>
        `;

        if (onOpenGoogleEarth) {
          const earthBtn = document.createElement('button');
          earthBtn.type = 'button';
          earthBtn.className = 'w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded transition cursor-pointer flex items-center justify-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.3)] mt-2';
          earthBtn.innerHTML = `<span>Ver Telemetría Google Earth 3D</span>`;
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

  }, [rawAlerts, tacticalUnits, activeOrders, filterAlerts, filterPatrols, filterOrders, selectedAlertId, onSelectAlert, onOpenGoogleEarth, onIssueOrderForAlert]);

  // Preset location centering
  const handleGoToLocation = (lat: number, lon: number, zoom: number) => {
    const map = mapInstanceRef.current;
    if (map) {
      map.flyTo([lat, lon], zoom, { duration: 1.2 });
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

        {/* Quick Centering Presets */}
        <div className="hidden sm:flex items-center gap-1 bg-[#090e17]/90 backdrop-blur-md p-1 rounded-lg border border-zinc-800 shadow-lg">
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

      {/* Main Leaflet Container */}
      <div 
        ref={mapContainerRef} 
        id="leaflet-tactical-cop" 
        className="w-full h-full z-0 relative focus:outline-none" 
      />

      {/* Bottom Telemetry Bar */}
      <div className="absolute bottom-2 right-2 z-[1000] bg-[#090e17]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-cyan-500/30 text-[10px] font-mono text-zinc-300 flex items-center gap-3 shadow-lg pointer-events-auto">
        <div className="flex items-center gap-1.5">
          <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
          <span>
            {mouseCoords 
              ? `${mouseCoords.lat.toFixed(4)}, ${mouseCoords.lon.toFixed(4)}`
              : '-19.2194, -68.5972'}
          </span>
        </div>
        <span className="text-zinc-600">|</span>
        <div className="text-zinc-400">
          DMS: <span className="text-white">{mouseCoords ? formatToMilitaryDMS(mouseCoords.lat, mouseCoords.lon) : "19°13'10\"S 68°35'50\"W"}</span>
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
