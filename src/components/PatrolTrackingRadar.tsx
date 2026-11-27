/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Mapa Táctico de Seguimiento de Patrullas en Tiempo Real (PII-LCC)
 * Permite a la Central de Fusión (CFI) y al Mando Estratégico (CEO-LCC)
 * visualizar el movimiento en vivo, trayectoria GPS y telemetría de las patrullas sobre Maps.
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import L from 'leaflet';
import { TacticalUnit, RawAlert, ActionableIntel } from '../types';
import { parseCoordinates, calculateDistanceKm } from '../utils/geo';
import { BOLIVIA_LOCATIONS } from '../utils/boliviaLocations';
import {
  Navigation,
  MapPin,
  Crosshair,
  Wifi,
  Globe,
  Map as MapIcon,
  Maximize2,
  ExternalLink,
  Compass,
  Route,
  RotateCcw,
  Target,
  AlertTriangle,
  Radio,
  X
} from 'lucide-react';

interface PatrolTrackingRadarProps {
  tacticalUnits: TacticalUnit[];
  rawAlerts?: RawAlert[];
  actionableIntel?: ActionableIntel[];
  selectedUnitName?: string | null;
  selectedAlertId?: string | null;
  onSelectUnit?: (unitName: string) => void;
  onSelectAlert?: (alert: RawAlert) => void;
  onOpenGoogleEarth?: (unit: TacticalUnit) => void;
  height?: number | string;
  isCompact?: boolean;
  title?: string;
}

type MapTileMode = 'GOOGLE_HYBRID' | 'GOOGLE_STREETS' | 'SATELLITE' | 'DARK';

interface TrailPoint {
  lat: number;
  lon: number;
  time: string;
  timestampMs: number;
}

const MAP_TILE_CONFIG: Record<
  MapTileMode,
  { label: string; url: string; attribution: string; maxZoom: number }
> = {
  GOOGLE_HYBRID: {
    label: 'Híbrido',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps',
    maxZoom: 20
  },
  GOOGLE_STREETS: {
    label: 'Maps',
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps',
    maxZoom: 20
  },
  SATELLITE: {
    label: 'Satélite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri World Imagery',
    maxZoom: 18
  },
  DARK: {
    label: 'Táctico',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    maxZoom: 19
  }
};

const BOLIVIA_CENTER: [number, number] = [-16.5, -64.6];

function escapeHtml(raw: string): string {
  return String(raw || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatReportTime(raw?: string): string {
  if (!raw) return 'Sin reporte';
  const parsed = Date.parse(raw);
  if (Number.isFinite(parsed)) {
    const d = new Date(parsed);
    return d.toLocaleTimeString('es-BO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }
  return raw;
}

function calculateBearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const dLambda = toRad(lon2 - lon1);
  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function bearingToCardinal(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  return dirs[Math.round(deg / 45) % 8];
}

function getUnitColor(status: TacticalUnit['status']): string {
  if (status === 'INTERCEPTING') return '#3b82f6';
  if (status === 'PATROLLING') return '#10b981';
  if (status === 'STATIONARY') return '#eab308';
  return '#64748b';
}

function buildPatrolMarkerIcon(
  unit: TacticalUnit,
  isSelected: boolean,
  headingDeg: number
): L.DivIcon {
  const color = getUnitColor(unit.status);
  const isMoving = unit.status === 'PATROLLING' || unit.status === 'INTERCEPTING';
  const safeName = escapeHtml(unit.name);
  const ringGlow = isSelected
    ? 'box-shadow:0 0 0 3px #38bdf8, 0 0 18px rgba(56,189,248,0.85);'
    : `box-shadow:0 0 12px ${color}aa;`;

  return L.divIcon({
    className: 'cfi-live-patrol-marker',
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-50%);pointer-events:auto;">
        <div style="position:relative;width:30px;height:30px;display:flex;align-items:center;justify-content:center;">
          ${
            isMoving
              ? `<span style="position:absolute;inset:-4px;border-radius:9999px;border:2px solid ${color};opacity:0.55;animation:ping 1.8s cubic-bezier(0,0,0.2,1) infinite;"></span>`
              : ''
          }
          <div style="width:24px;height:24px;border-radius:9999px;background:#070b12;border:2.5px solid ${color};${ringGlow}display:flex;align-items:center;justify-content:center;transform:rotate(${Math.round(headingDeg)}deg);transition:transform 0.35s ease;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg">
              <polygon points="12,2 21,21 12,16 3,21" />
            </svg>
          </div>
        </div>
        <div style="margin-top:2px;background:rgba(7,11,18,0.92);border:1px solid ${
          isSelected ? '#38bdf8' : color
        };color:${isSelected ? '#ffffff' : '#e2e8f0'};font-family:monospace;font-size:10px;font-weight:700;padding:1px 6px;border-radius:4px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.75);">
          ${safeName}
        </div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });
}

function buildAlertMarkerIcon(alert: RawAlert, isSelected: boolean): L.DivIcon {
  const isPending = alert.status === 'PENDING';
  const accentColor = isPending ? '#f97316' : '#10b981';
  const originShort = (alert.originUnit || alert.sourceName || 'S-2').slice(0, 16);
  const safeLabel = escapeHtml(`⚠ ${alert.sourceType} • ${originShort}`);
  const ringStyle = isSelected
    ? 'box-shadow:0 0 0 3px #facc15, 0 0 20px rgba(250,204,21,0.9);'
    : `box-shadow:0 0 14px ${accentColor}cc;`;

  return L.divIcon({
    className: 'cfi-live-alert-marker',
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-50%);pointer-events:auto;cursor:pointer;">
        <div style="position:relative;width:28px;height:28px;display:flex;align-items:center;justify-content:center;">
          ${
            isPending
              ? '<span style="position:absolute;inset:-6px;border-radius:9999px;border:2.5px solid #f97316;opacity:0.8;animation:ping 1.4s cubic-bezier(0,0,0.2,1) infinite;"></span>'
              : ''
          }
          <div style="width:24px;height:24px;border-radius:6px;background:rgba(28,12,4,0.95);border:2px solid ${accentColor};${ringStyle}display:flex;align-items:center;justify-content:center;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="${accentColor}" stroke="#070b12" stroke-width="1.8" xmlns="http://www.w3.org/2000/svg">
              <polygon points="12,2 22,20 2,20" />
            </svg>
          </div>
        </div>
        <div style="margin-top:2px;background:rgba(20,10,4,0.94);border:1.5px solid ${
          isSelected ? '#facc15' : accentColor
        };color:${isSelected ? '#fef08a' : '#fed7aa'};font-family:monospace;font-size:9.5px;font-weight:800;padding:1.5px 6px;border-radius:4px;white-space:nowrap;box-shadow:0 2px 10px rgba(0,0,0,0.85);">
          ${safeLabel}
        </div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });
}

export const PatrolTrackingRadar: React.FC<PatrolTrackingRadarProps> = ({
  tacticalUnits = [],
  rawAlerts = [],
  selectedUnitName = null,
  selectedAlertId = null,
  onSelectUnit,
  onSelectAlert,
  onOpenGoogleEarth,
  height = 460,
  title = 'CENTRO DE FUSIÓN (CFI) // MAPA DE SEGUIMIENTO DE PATRULLAS EN VIVO'
}) => {
  const [internalSelectedUnit, setInternalSelectedUnit] = useState<string | null>(selectedUnitName);
  const [internalSelectedAlertId, setInternalSelectedAlertId] = useState<string | null>(selectedAlertId);
  const [rightPanelTab, setRightPanelTab] = useState<'PATROLS' | 'REPORTS'>('PATROLS');
  const [incomingAlertBanner, setIncomingAlertBanner] = useState<RawAlert | null>(null);
  const [activeLayer, setActiveLayer] = useState<'ALL' | 'UNITS_ONLY' | 'ALERTS_ONLY'>('ALL');
  const [tileMode, setTileMode] = useState<MapTileMode>('GOOGLE_HYBRID');
  const [autoFollow, setAutoFollow] = useState<boolean>(true);
  const [trailHistory, setTrailHistory] = useState<Record<string, TrailPoint[]>>({});
  const [headings, setHeadings] = useState<Record<string, number>>({});
  const [mapZoom, setMapZoom] = useState<number>(6);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const patrolMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const patrolTrailsLayerRef = useRef<L.LayerGroup | null>(null);
  const alertsLayerRef = useRef<L.LayerGroup | null>(null);
  const markerAnimFramesRef = useRef<Map<string, number>>(new Map());
  const hasFittedInitialBoundsRef = useRef<boolean>(false);
  const onSelectUnitRef = useRef(onSelectUnit);
  const onSelectAlertRef = useRef(onSelectAlert);
  const knownAlertIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    onSelectUnitRef.current = onSelectUnit;
  }, [onSelectUnit]);

  useEffect(() => {
    onSelectAlertRef.current = onSelectAlert;
  }, [onSelectAlert]);

  // Synchronize internal selection with props
  useEffect(() => {
    if (selectedUnitName !== undefined) {
      setInternalSelectedUnit(selectedUnitName);
      if (selectedUnitName) {
        setInternalSelectedAlertId(null);
      }
    }
  }, [selectedUnitName]);

  useEffect(() => {
    if (selectedAlertId !== undefined && selectedAlertId !== null) {
      setInternalSelectedAlertId(selectedAlertId);
      setInternalSelectedUnit(null);
    }
  }, [selectedAlertId]);

  // Auto-detect newly transmitted raw field reports and highlight/focus them live on the map
  useEffect(() => {
    if (knownAlertIdsRef.current === null) {
      knownAlertIdsRef.current = new Set((rawAlerts || []).map((a) => a.id));
      return;
    }

    const newlyArrived = (rawAlerts || []).find((a) => !knownAlertIdsRef.current!.has(a.id));
    (rawAlerts || []).forEach((a) => knownAlertIdsRef.current!.add(a.id));

    if (newlyArrived) {
      setIncomingAlertBanner(newlyArrived);
      setInternalSelectedAlertId(newlyArrived.id);
      setInternalSelectedUnit(null);
      if (activeLayer === 'UNITS_ONLY') {
        setActiveLayer('ALL');
      }
      const parsed = parseCoordinates(newlyArrived.coordinates);
      if (parsed && mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([parsed.lat, parsed.lon], Math.max(mapInstanceRef.current.getZoom(), 11), {
          duration: 0.9
        });
      }
      const timer = window.setTimeout(() => {
        setIncomingAlertBanner((curr) => (curr?.id === newlyArrived.id ? null : curr));
      }, 9000);
      return () => window.clearTimeout(timer);
    }
  }, [rawAlerts, activeLayer]);

  // Initialize Leaflet Map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: BOLIVIA_CENTER,
      zoom: 6,
      zoomControl: false,
      attributionControl: true
    });

    L.control.zoom({ position: 'topleft' }).addTo(map);
    L.control.scale({ imperial: false, position: 'bottomright' }).addTo(map);

    const tileCfg = MAP_TILE_CONFIG[tileMode];
    tileLayerRef.current = L.tileLayer(tileCfg.url, {
      attribution: tileCfg.attribution,
      maxZoom: tileCfg.maxZoom
    }).addTo(map);

    patrolTrailsLayerRef.current = L.layerGroup().addTo(map);
    alertsLayerRef.current = L.layerGroup().addTo(map);

    map.on('zoomend', () => {
      setMapZoom(map.getZoom());
    });

    mapInstanceRef.current = map;

    const resizeTimer = setTimeout(() => {
      map.invalidateSize();
    }, 180);

    return () => {
      clearTimeout(resizeTimer);
      markerAnimFramesRef.current.forEach((rafId) => cancelAnimationFrame(rafId));
      markerAnimFramesRef.current.clear();
      patrolMarkersRef.current.clear();
      map.remove();
      mapInstanceRef.current = null;
      tileLayerRef.current = null;
      patrolTrailsLayerRef.current = null;
      alertsLayerRef.current = null;
      hasFittedInitialBoundsRef.current = false;
    };
  }, []);

  // Switch tile layer cleanly
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    const tileCfg = MAP_TILE_CONFIG[tileMode];
    tileLayerRef.current = L.tileLayer(tileCfg.url, {
      attribution: tileCfg.attribution,
      maxZoom: tileCfg.maxZoom
    }).addTo(map);
    tileLayerRef.current.bringToBack();
  }, [tileMode]);

  // Track real geographic coordinate updates to build live route trail & heading
  useEffect(() => {
    const nowTime = new Date().toLocaleTimeString('es-BO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    const nowMs = Date.now();

    setTrailHistory((prev) => {
      let changed = false;
      const next = { ...prev };
      const nextHeadings: Record<string, number> = {};

      tacticalUnits.forEach((unit) => {
        const parsed = parseCoordinates(unit.coordinates);
        if (!parsed) return;
        const list = prev[unit.id] || [];
        const last = list[list.length - 1];

        if (!last) {
          next[unit.id] = [{ lat: parsed.lat, lon: parsed.lon, time: nowTime, timestampMs: nowMs }];
          changed = true;
        } else {
          const movedDeg = Math.hypot(parsed.lat - last.lat, parsed.lon - last.lon);
          if (movedDeg > 0.00008) {
            const bearing = calculateBearingDeg(last.lat, last.lon, parsed.lat, parsed.lon);
            nextHeadings[unit.id] = bearing;
            next[unit.id] = [
              ...list.slice(-59),
              { lat: parsed.lat, lon: parsed.lon, time: nowTime, timestampMs: nowMs }
            ];
            changed = true;
          }
        }
      });

      if (Object.keys(nextHeadings).length > 0) {
        setHeadings((hPrev) => ({ ...hPrev, ...nextHeadings }));
      }
      return changed ? next : prev;
    });
  }, [tacticalUnits]);

  const handleSelect = useCallback((unitName: string) => {
    setInternalSelectedUnit((prev) => (prev === unitName ? null : unitName));
    setInternalSelectedAlertId(null);
    if (onSelectUnitRef.current) {
      onSelectUnitRef.current(unitName);
    }
  }, []);

  const handleSelectAlertOnMap = useCallback((alert: RawAlert) => {
    setInternalSelectedAlertId(alert.id);
    setInternalSelectedUnit(null);
    const parsed = parseCoordinates(alert.coordinates);
    if (parsed && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([parsed.lat, parsed.lon], Math.max(mapInstanceRef.current.getZoom(), 12), {
        duration: 0.75
      });
    }
    if (onSelectAlertRef.current) {
      onSelectAlertRef.current(alert);
    }
  }, []);

  // Render & smoothly animate Patrol Markers + Live Movement Polylines on Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    const trailsLayer = patrolTrailsLayerRef.current;
    if (!map || !trailsLayer) return;

    const showUnits = activeLayer === 'ALL' || activeLayer === 'UNITS_ONLY';
    trailsLayer.clearLayers();

    const activeIds = new Set<string>();
    const validLatLngs: [number, number][] = [];

    if (showUnits) {
      tacticalUnits.forEach((unit) => {
        const parsed = parseCoordinates(unit.coordinates);
        if (!parsed) return;

        activeIds.add(unit.id);
        validLatLngs.push([parsed.lat, parsed.lon]);

        const isSelected = internalSelectedUnit === unit.name;
        const unitColor = getUnitColor(unit.status);
        const headingDeg = headings[unit.id] ?? 0;

        // Draw live movement breadcrumb trail & waypoint nodes
        const history = trailHistory[unit.id] || [];
        if (history.length > 1) {
          const trailCoords: L.LatLngExpression[] = history.map((pt) => [pt.lat, pt.lon]);
          L.polyline(trailCoords, {
            color: isSelected ? '#38bdf8' : unitColor,
            weight: isSelected ? 4 : 3,
            opacity: 0.85,
            dashArray: '8 6'
          }).addTo(trailsLayer);

          // Subtle glow underlay for movement path
          L.polyline(trailCoords, {
            color: unitColor,
            weight: 8,
            opacity: 0.18
          }).addTo(trailsLayer);

          history.slice(0, -1).forEach((pt, idx) => {
            const dot = L.circleMarker([pt.lat, pt.lon], {
              radius: idx === 0 ? 4 : 3,
              fillColor: idx === 0 ? '#ffffff' : unitColor,
              color: '#070b12',
              weight: 1.5,
              fillOpacity: 0.9
            });
            dot.bindTooltip(`${unit.name} • ${pt.time}`, { direction: 'top', offset: [0, -4] });
            dot.addTo(trailsLayer);
          });
        }

        // Create or smoothly animate existing patrol marker
        const existingMarker = patrolMarkersRef.current.get(unit.id);
        const icon = buildPatrolMarkerIcon(unit, isSelected, headingDeg);

        if (!existingMarker) {
          const marker = L.marker([parsed.lat, parsed.lon], {
            icon,
            zIndexOffset: isSelected ? 1000 : 500
          }).addTo(map);

          marker.on('click', () => {
            handleSelect(unit.name);
          });

          patrolMarkersRef.current.set(unit.id, marker);
        } else {
          existingMarker.setIcon(icon);
          existingMarker.setZIndexOffset(isSelected ? 1000 : 500);

          const startLatLng = existingMarker.getLatLng();
          const delta = Math.hypot(parsed.lat - startLatLng.lat, parsed.lon - startLatLng.lng);

          if (delta > 0.00002) {
            // Cancel prior animation for this unit
            const prevRaf = markerAnimFramesRef.current.get(unit.id);
            if (prevRaf) cancelAnimationFrame(prevRaf);

            const startTime = performance.now();
            const durationMs = 550;
            const startLat = startLatLng.lat;
            const startLng = startLatLng.lng;
            const endLat = parsed.lat;
            const endLng = parsed.lon;

            const step = (now: number) => {
              const t = Math.min(1, (now - startTime) / durationMs);
              // Cubic ease-out
              const ease = 1 - Math.pow(1 - t, 3);
              existingMarker.setLatLng([
                startLat + (endLat - startLat) * ease,
                startLng + (endLng - startLng) * ease
              ]);
              if (t < 1) {
                const nextRaf = requestAnimationFrame(step);
                markerAnimFramesRef.current.set(unit.id, nextRaf);
              } else {
                markerAnimFramesRef.current.delete(unit.id);
              }
            };
            const firstRaf = requestAnimationFrame(step);
            markerAnimFramesRef.current.set(unit.id, firstRaf);
          }
        }
      });
    }

    // Remove markers for units no longer present or hidden by filter
    patrolMarkersRef.current.forEach((marker, unitId) => {
      if (!activeIds.has(unitId)) {
        const raf = markerAnimFramesRef.current.get(unitId);
        if (raf) cancelAnimationFrame(raf);
        markerAnimFramesRef.current.delete(unitId);
        map.removeLayer(marker);
        patrolMarkersRef.current.delete(unitId);
      }
    });

    // Fit all patrols once on first load
    if (!hasFittedInitialBoundsRef.current && validLatLngs.length > 0) {
      hasFittedInitialBoundsRef.current = true;
      if (validLatLngs.length === 1) {
        map.setView(validLatLngs[0], 12, { animate: false });
      } else {
        const bounds = L.latLngBounds(validLatLngs);
        map.fitBounds(bounds, { padding: [55, 55], maxZoom: 12 });
      }
    }
  }, [tacticalUnits, activeLayer, internalSelectedUnit, trailHistory, headings, handleSelect]);

  // Render Raw S-2 Field Reports on Map (never hidden behind patrols; with radar ring & leader line)
  useEffect(() => {
    const alertsLayer = alertsLayerRef.current;
    if (!alertsLayer) return;

    alertsLayer.clearLayers();
    if (activeLayer !== 'ALL' && activeLayer !== 'ALERTS_ONLY') return;

    const unitPositions: { lat: number; lon: number }[] = [];
    (tacticalUnits || []).forEach((u) => {
      const p = parseCoordinates(u.coordinates);
      if (p) unitPositions.push(p);
    });

    const placedAlertPositions: { lat: number; lon: number }[] = [];

    (rawAlerts || []).forEach((alert, idx) => {
      const parsed = parseCoordinates(alert.coordinates);
      if (!parsed) return;

      const isSelected = internalSelectedAlertId === alert.id;
      const isPending = alert.status === 'PENDING';

      // Draw pulsing tactical radar circle centered on exact GPS coordinate of the raw report
      L.circle([parsed.lat, parsed.lon], {
        radius: isSelected ? 2200 : isPending ? 1500 : 900,
        color: isSelected ? '#facc15' : isPending ? '#f97316' : '#10b981',
        weight: isSelected ? 2.5 : 1.5,
        dashArray: isPending ? '5 5' : undefined,
        fillColor: isPending ? '#f97316' : '#10b981',
        fillOpacity: isSelected ? 0.2 : 0.1
      }).addTo(alertsLayer);

      // Anti-overlap: if a patrol or another alert occupies the exact same spot, offset beacon slightly NE and draw leader line
      let markerLat = parsed.lat;
      let markerLon = parsed.lon;
      const overlapsPatrol = unitPositions.some(
        (up) => Math.hypot(up.lat - parsed.lat, up.lon - parsed.lon) < 0.0028
      );
      const overlapsAlertCount = placedAlertPositions.filter(
        (ap) => Math.hypot(ap.lat - parsed.lat, ap.lon - parsed.lon) < 0.0028
      ).length;

      if (overlapsPatrol || overlapsAlertCount > 0) {
        const angle = ((overlapsAlertCount + (overlapsPatrol ? 1 : 0)) * 55 + idx * 17) * (Math.PI / 180);
        const radiusDeg = 0.0032 + overlapsAlertCount * 0.0014;
        markerLat = parsed.lat + Math.sin(angle) * radiusDeg;
        markerLon = parsed.lon + Math.cos(angle) * radiusDeg;

        L.polyline(
          [
            [parsed.lat, parsed.lon],
            [markerLat, markerLon]
          ],
          {
            color: isSelected ? '#facc15' : '#f97316',
            weight: 1.5,
            dashArray: '3 3',
            opacity: 0.9
          }
        ).addTo(alertsLayer);
      }

      placedAlertPositions.push({ lat: markerLat, lon: markerLon });

      const marker = L.marker([markerLat, markerLon], {
        icon: buildAlertMarkerIcon(alert, isSelected),
        zIndexOffset: isSelected ? 1150 : 850
      });

      marker.on('click', () => {
        handleSelectAlertOnMap(alert);
      });

      marker.addTo(alertsLayer);
    });
  }, [rawAlerts, tacticalUnits, activeLayer, internalSelectedAlertId, handleSelectAlertOnMap]);

  const activeUnit = useMemo(() => {
    return tacticalUnits.find((u) => u.name === internalSelectedUnit) || null;
  }, [tacticalUnits, internalSelectedUnit]);

  const activeUnitParsed = useMemo(() => {
    return activeUnit ? parseCoordinates(activeUnit.coordinates) : null;
  }, [activeUnit]);

  const activeAlert = useMemo(() => {
    return (rawAlerts || []).find((a) => a.id === internalSelectedAlertId) || null;
  }, [rawAlerts, internalSelectedAlertId]);

  const activeAlertParsed = useMemo(() => {
    return activeAlert ? parseCoordinates(activeAlert.coordinates) : null;
  }, [activeAlert]);

  const pendingAlertsCount = useMemo(() => {
    return (rawAlerts || []).filter((a) => a.status === 'PENDING').length;
  }, [rawAlerts]);

  // Auto-follow selected patrol in real time as it moves on Maps
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !autoFollow || !activeUnitParsed) return;
    const targetZoom = Math.max(map.getZoom(), 12);
    map.flyTo([activeUnitParsed.lat, activeUnitParsed.lon], targetZoom, {
      duration: 0.75
    });
  }, [activeUnitParsed?.lat, activeUnitParsed?.lon, internalSelectedUnit, autoFollow]);

  // Nearest Bolivian locality nationwide for the selected patrol
  const nearestLocality = useMemo(() => {
    if (!activeUnitParsed) return null;
    let minKm = Infinity;
    let nearest: (typeof BOLIVIA_LOCATIONS)[0] | null = null;
    for (const loc of BOLIVIA_LOCATIONS) {
      const dist = calculateDistanceKm(activeUnitParsed, { lat: loc.lat, lon: loc.lon });
      if (dist !== null && dist < minKm) {
        minKm = dist;
        nearest = loc;
      }
    }
    return nearest ? { loc: nearest, distanceKm: minKm } : null;
  }, [activeUnitParsed]);

  // Compute total distance traveled along active unit's live trail
  const activeUnitTrailStats = useMemo(() => {
    if (!activeUnit) return { points: 0, distanceKm: 0, headingDeg: 0 };
    const pts = trailHistory[activeUnit.id] || [];
    let totalKm = 0;
    for (let i = 1; i < pts.length; i++) {
      const seg = calculateDistanceKm(
        { lat: pts[i - 1].lat, lon: pts[i - 1].lon },
        { lat: pts[i].lat, lon: pts[i].lon }
      );
      if (seg !== null) totalKm += seg;
    }
    return {
      points: pts.length,
      distanceKm: totalKm,
      headingDeg: headings[activeUnit.id] ?? 0
    };
  }, [activeUnit, trailHistory, headings]);

  const handleFitAllPatrols = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const points: [number, number][] = [];
    if (activeLayer !== 'ALERTS_ONLY') {
      tacticalUnits.forEach((u) => {
        const parsed = parseCoordinates(u.coordinates);
        if (parsed) points.push([parsed.lat, parsed.lon]);
      });
    }
    if (activeLayer !== 'UNITS_ONLY') {
      (rawAlerts || []).forEach((a) => {
        const parsed = parseCoordinates(a.coordinates);
        if (parsed) points.push([parsed.lat, parsed.lon]);
      });
    }
    if (points.length === 0) {
      map.flyTo(BOLIVIA_CENTER, 6, { duration: 0.7 });
    } else if (points.length === 1) {
      map.flyTo(points[0], 13, { duration: 0.7 });
    } else {
      map.flyToBounds(L.latLngBounds(points), { padding: [55, 55], maxZoom: 13, duration: 0.7 });
    }
  };

  const handleFocusUnitOnMap = (unit: TacticalUnit) => {
    setInternalSelectedUnit(unit.name);
    setInternalSelectedAlertId(null);
    if (onSelectUnitRef.current) {
      onSelectUnitRef.current(unit.name);
    }
    const parsed = parseCoordinates(unit.coordinates);
    if (parsed && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([parsed.lat, parsed.lon], 13, { duration: 0.8 });
    }
  };

  const handleClearTrails = () => {
    const nowTime = new Date().toLocaleTimeString('es-BO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    const reset: Record<string, TrailPoint[]> = {};
    tacticalUnits.forEach((u) => {
      const p = parseCoordinates(u.coordinates);
      if (p) {
        reset[u.id] = [{ lat: p.lat, lon: p.lon, time: nowTime, timestampMs: Date.now() }];
      }
    });
    setTrailHistory(reset);
  };

  const mapHeightStyle = typeof height === 'number' ? `${Math.max(height, 440)}px` : height;

  return (
    <div className="bg-[#070b12] border border-[#1a2333] rounded-xl overflow-hidden shadow-2xl flex flex-col text-left">
      {/* Top Header */}
      <div className="bg-[#0b101c] border-b border-[#1a2333] p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <MapIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                {title}
              </h3>
              <span className="flex items-center gap-1 text-[9px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-bold uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                MAPS EN VIVO
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              {tacticalUnits.length} Patrullas en red • {rawAlerts.length} Reportes Crudos S-2 ({pendingAlertsCount} pendientes) // Seguimiento en vivo sobre mapa real
            </p>
          </div>
        </div>

        {/* Controls: Map Style, Layers, Follow & Fit All */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Map Base Style Selector */}
          <div className="flex bg-[#121826] border border-[#1e2738] rounded-lg p-0.5 text-[9px] font-mono">
            {(Object.keys(MAP_TILE_CONFIG) as MapTileMode[]).map((modeKey) => (
              <button
                key={modeKey}
                type="button"
                onClick={() => setTileMode(modeKey)}
                className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                  tileMode === modeKey
                    ? 'bg-cyan-500 text-black font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {MAP_TILE_CONFIG[modeKey].label}
              </button>
            ))}
          </div>

          {/* Layer filter toggles */}
          <div className="flex bg-[#121826] border border-[#1e2738] rounded-lg p-0.5 text-[9px] font-mono">
            <button
              type="button"
              onClick={() => setActiveLayer('ALL')}
              className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                activeLayer === 'ALL' ? 'bg-emerald-500 text-black font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              TODOS
            </button>
            <button
              type="button"
              onClick={() => setActiveLayer('UNITS_ONLY')}
              className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                activeLayer === 'UNITS_ONLY' ? 'bg-emerald-500 text-black font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              PATRULLAS
            </button>
            <button
              type="button"
              onClick={() => setActiveLayer('ALERTS_ONLY')}
              className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                activeLayer === 'ALERTS_ONLY' ? 'bg-orange-500 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              REPORTES S-2 ({rawAlerts.length})
            </button>
          </div>

          {/* Follow Selected Patrol Toggle */}
          <button
            type="button"
            onClick={() => setAutoFollow((prev) => !prev)}
            className={`px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold border flex items-center gap-1 transition-colors cursor-pointer ${
              autoFollow
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                : 'bg-[#121826] border-[#1e2738] text-slate-400 hover:text-white'
            }`}
            title="Centrar automáticamente el mapa cuando se mueve la patrulla seleccionada"
          >
            <Target className="w-3 h-3" />
            <span>{autoFollow ? 'SEGUIR: ON' : 'SEGUIR: OFF'}</span>
          </button>

          {/* Fit All Patrols */}
          <button
            type="button"
            onClick={handleFitAllPatrols}
            className="px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold bg-[#121826] hover:bg-[#1a2336] border border-[#1e2738] text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
            title="Encuadrar todas las patrullas activas en el territorio"
          >
            <Maximize2 className="w-3 h-3 text-cyan-400" />
            <span>VER TODAS</span>
          </button>

          {/* Clear Trail */}
          <button
            type="button"
            onClick={handleClearTrails}
            className="px-2 py-1 rounded-lg text-[9px] font-mono bg-[#121826] hover:bg-[#1a2336] border border-[#1e2738] text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
            title="Reiniciar estelas de recorrido"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Main Container: Live Interactive Maps View (Left) + Telemetry Cards (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 relative">
        {/* Left / Center: Live Interactive Leaflet / Google Maps Canvas */}
        <div
          className="lg:col-span-8 bg-[#050810] relative overflow-hidden border-b lg:border-b-0 lg:border-r border-[#1a2333]"
          style={{ minHeight: mapHeightStyle }}
        >
          <div
            ref={mapContainerRef}
            className="w-full h-full z-0"
            style={{ height: mapHeightStyle }}
          />

          {/* Incoming Raw Field Report Live Notification Banner (Top Left/Center) */}
          {incomingAlertBanner && (
            <div className="absolute top-3 left-12 right-3 sm:right-auto sm:max-w-md z-[450] bg-[#1d0d04]/95 backdrop-blur-md border-2 border-orange-500 rounded-xl px-3 py-2 shadow-[0_0_25px_rgba(249,115,22,0.5)] flex items-center justify-between gap-2 animate-fade-in">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-ping shrink-0" />
                <div className="min-w-0 text-[10px] font-mono">
                  <div className="text-orange-300 font-bold uppercase truncate">
                    NUEVO REPORTE CRUDO S-2 • {incomingAlertBanner.sourceType}
                  </div>
                  <div className="text-white truncate">
                    {incomingAlertBanner.originUnit || incomingAlertBanner.sourceName} — {incomingAlertBanner.coordinates}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleSelectAlertOnMap(incomingAlertBanner)}
                  className="px-2 py-1 rounded bg-orange-500 hover:bg-orange-400 text-black font-bold text-[9px] font-mono cursor-pointer"
                >
                  Centrar
                </button>
                <button
                  type="button"
                  onClick={() => setIncomingAlertBanner(null)}
                  className="p-1 text-orange-300 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Live HUD Legend Overlay (Bottom Left) */}
          <div className="absolute bottom-3 left-3 z-[400] bg-[#080d1a]/90 backdrop-blur-md border border-[#1e2738] p-2.5 rounded-lg text-[9px] font-mono space-y-1 shadow-lg text-left pointer-events-none">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-[#10b981] rounded-full inline-block animate-pulse" />
              <span className="text-white font-bold">
                Patrullas Activas ({tacticalUnits.filter((u) => u.status !== 'OFFLINE').length})
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-[#3b82f6] rounded-full inline-block" />
              <span className="text-slate-300">En Interdicción Directa</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-[#f97316] rounded-sm inline-block animate-pulse" />
              <span className="text-orange-300 font-bold">
                Reportes Crudos S-2 ({rawAlerts.length})
              </span>
            </div>
            <div className="flex items-center gap-1.5 pt-0.5 border-t border-[#1e2738] text-cyan-300">
              <Route className="w-3 h-3" />
              <span>Estela GPS en vivo • Zoom {mapZoom}x</span>
            </div>
          </div>

          {/* Selected Raw Report Tactical Overlay Card (Top Right) */}
          {activeAlert && activeAlertParsed && (
            <div className="absolute top-3 right-3 z-[420] bg-[#140c06]/95 backdrop-blur-md border-2 border-orange-500/75 p-3 rounded-lg text-xs font-mono shadow-2xl animate-fade-in text-left max-w-xs">
              <div className="flex items-center justify-between gap-2 border-b border-orange-500/30 pb-1.5 mb-2">
                <div className="flex items-center gap-1.5 text-orange-400 font-bold truncate">
                  <AlertTriangle className="w-3.5 h-3.5 animate-pulse shrink-0" />
                  <span className="truncate">REPORTE CRUDO // {activeAlert.sourceType}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                      activeAlert.status === 'PENDING'
                        ? 'bg-orange-500/25 text-orange-300 border border-orange-500/50'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    {activeAlert.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => setInternalSelectedAlertId(null)}
                    className="text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-1 text-[10px] text-slate-200">
                <p className="font-bold text-white truncate">
                  {activeAlert.originUnit || activeAlert.sourceName}
                </p>
                <p>
                  <span className="text-slate-400">SECTOR:</span>{' '}
                  <span className="text-orange-200">{activeAlert.originSector || 'Territorio Nacional'}</span>
                </p>
                <p>
                  <span className="text-slate-400">GPS:</span>{' '}
                  <b className="text-yellow-300">{activeAlert.coordinates}</b>
                </p>
                <p>
                  <span className="text-slate-400">EVALUACIÓN:</span>{' '}
                  <span className="text-amber-300 font-bold">
                    {activeAlert.reliability}-{activeAlert.certainty}
                  </span>{' '}
                  <span className="text-slate-500">• {formatReportTime(activeAlert.timestamp)}</span>
                </p>
                <p className="bg-black/50 p-1.5 rounded border border-orange-500/25 text-slate-200 leading-snug max-h-20 overflow-y-auto">
                  {activeAlert.details}
                </p>
                {activeAlert.mediaUrl &&
                  (activeAlert.mediaUrl.startsWith('data:image') || activeAlert.mediaUrl.startsWith('http')) && (
                    <img
                      src={activeAlert.mediaUrl}
                      alt="Evidencia del reporte"
                      className="w-full h-24 object-cover rounded border border-orange-500/40 mt-1"
                    />
                  )}
                <div className="pt-1.5 flex items-center gap-1.5">
                  <a
                    href={`https://www.google.com/maps?q=${activeAlertParsed.lat.toFixed(6)},${activeAlertParsed.lon.toFixed(6)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-orange-600/25 hover:bg-orange-600/40 border border-orange-500/60 text-orange-200 text-[9px] font-bold py-1 px-2 rounded flex items-center justify-center gap-1 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Google Maps</span>
                  </a>
                  {onSelectAlert && (
                    <button
                      type="button"
                      onClick={() => onSelectAlert(activeAlert)}
                      className="flex-1 bg-cyan-600/25 hover:bg-cyan-600/40 border border-cyan-500/60 text-cyan-200 text-[9px] font-bold py-1 px-2 rounded flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <Radio className="w-3 h-3" />
                      <span>Analizar CFI</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Selected Unit Live Movement Telemetry Overlay (Top Right) */}
          {activeUnit && activeUnitParsed && (
            <div className="absolute top-3 right-3 z-[400] bg-[#0c1322]/95 backdrop-blur-md border border-cyan-500/45 p-3 rounded-lg text-xs font-mono shadow-2xl animate-fade-in text-left max-w-xs">
              <div className="flex items-center justify-between gap-2 border-b border-[#1e2738] pb-1.5 mb-2">
                <div className="flex items-center gap-1.5 text-cyan-400 font-bold truncate">
                  <Crosshair className="w-3.5 h-3.5 animate-pulse shrink-0" />
                  <span className="truncate">{activeUnit.name}</span>
                </div>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold shrink-0">
                  {activeUnit.status}
                </span>
              </div>

              <div className="space-y-1 text-[10px] text-slate-300">
                <p>
                  <span className="text-slate-500">DMS:</span>{' '}
                  <b className="text-white">{activeUnit.coordinates}</b>
                </p>
                <p>
                  <span className="text-slate-500">DEC:</span>{' '}
                  <span className="text-cyan-200">
                    {activeUnitParsed.lat.toFixed(5)}, {activeUnitParsed.lon.toFixed(5)}
                  </span>
                </p>
                <p>
                  <span className="text-slate-500">COMANDANTE:</span> {activeUnit.commander || 'Cmdte. Terreno'}
                </p>
                <p>
                  <span className="text-slate-500">SECTOR:</span> {activeUnit.sector || 'Territorio Nacional'}
                </p>
                {nearestLocality && (
                  <p className="text-cyan-300 font-bold">
                    <span>REF. TERRITORIAL:</span> {nearestLocality.loc.name} ({nearestLocality.loc.department}) a{' '}
                    {nearestLocality.distanceKm.toFixed(1)} km
                  </p>
                )}
                <div className="flex items-center justify-between pt-1 border-t border-[#1e2738] text-[9px]">
                  <span className="flex items-center gap-1 text-emerald-300">
                    <Compass className="w-3 h-3" />
                    Rumbo: {bearingToCardinal(activeUnitTrailStats.headingDeg)} ({Math.round(activeUnitTrailStats.headingDeg)}°)
                  </span>
                  <span className="text-slate-300">
                    Recorrido: <b>{activeUnitTrailStats.distanceKm.toFixed(2)} km</b> ({activeUnitTrailStats.points} pts)
                  </span>
                </div>
                <p className="text-slate-400 text-[9px]">
                  Último GNSS: <span className="text-emerald-400">{formatReportTime(activeUnit.lastReportTime)}</span>
                </p>
                <div className="pt-1.5 flex items-center gap-1.5">
                  <a
                    href={`https://www.google.com/maps?q=${activeUnitParsed.lat.toFixed(6)},${activeUnitParsed.lon.toFixed(6)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-500/50 text-emerald-300 text-[9px] font-bold py-1 px-2 rounded flex items-center justify-center gap-1 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Abrir Google Maps</span>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Tactical Units & Live Raw Reports Feed */}
        <div className="lg:col-span-4 bg-[#0a0f1d] p-4 flex flex-col justify-between space-y-3">
          <div className="space-y-3">
            {/* 2-Tab Switcher: PATRULLAS | REPORTES S-2 */}
            <div className="flex items-center gap-1.5 border-b border-[#1a2333] pb-2">
              <button
                type="button"
                onClick={() => setRightPanelTab('PATROLS')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-mono font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                  rightPanelTab === 'PATROLS'
                    ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300'
                    : 'bg-[#0f1526] border-[#1e2738] text-slate-400 hover:text-white'
                }`}
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>PATRULLAS ({tacticalUnits.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setRightPanelTab('REPORTS')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-mono font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                  rightPanelTab === 'REPORTS'
                    ? 'bg-orange-500/20 border-orange-500/60 text-orange-300'
                    : 'bg-[#0f1526] border-[#1e2738] text-slate-400 hover:text-white'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>REPORTES S-2 ({rawAlerts.length})</span>
                {pendingAlertsCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-orange-500 text-black text-[9px] font-black animate-pulse">
                    {pendingAlertsCount}
                  </span>
                )}
              </button>
            </div>

            {/* Scrollable list: either Patrols or Raw S-2 Reports */}
            {rightPanelTab === 'REPORTS' ? (
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {rawAlerts.length === 0 ? (
                  <div className="text-center py-8 text-xs font-mono text-slate-500">
                    No se han transmitido reportes en crudo S-2 todavía.
                  </div>
                ) : (
                  rawAlerts.map((alert) => {
                    const isSelected = internalSelectedAlertId === alert.id;
                    const parsed = parseCoordinates(alert.coordinates);
                    const isPending = alert.status === 'PENDING';

                    return (
                      <div
                        key={alert.id}
                        onClick={() => handleSelectAlertOnMap(alert)}
                        className={`p-3 rounded-lg border transition-all cursor-pointer text-left space-y-1.5 ${
                          isSelected
                            ? 'bg-orange-950/50 border-orange-400 shadow-md ring-1 ring-orange-400/40'
                            : 'bg-[#120d0a] border-orange-900/40 hover:border-orange-500/60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                isPending ? 'bg-orange-400 animate-ping' : 'bg-emerald-400'
                              }`}
                            />
                            <span className="text-[11px] font-mono font-bold text-orange-200 uppercase truncate">
                              {alert.sourceType} • {alert.originUnit || alert.sourceName}
                            </span>
                          </div>
                          <span
                            className={`text-[8px] font-mono px-1.5 py-0.5 rounded font-bold shrink-0 ${
                              isPending
                                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            }`}
                          >
                            {alert.status}
                          </span>
                        </div>

                        <p className="text-[10px] font-mono text-slate-200 line-clamp-2 leading-snug">
                          {alert.details}
                        </p>

                        <div className="bg-black/50 px-2 py-1 rounded border border-orange-900/30 flex items-center justify-between gap-2 text-[9px] font-mono">
                          <span className="text-yellow-300 font-bold truncate">{alert.coordinates}</span>
                          <span className="text-slate-400 shrink-0">{formatReportTime(alert.timestamp)}</span>
                        </div>

                        <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                          <span className="truncate">{alert.originSector || 'Territorio Nacional'}</span>
                          {parsed && (
                            <span className="text-orange-300 font-bold shrink-0">Ver en Mapa →</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {tacticalUnits.length === 0 ? (
                <div className="text-center py-8 text-xs font-mono text-slate-500">
                  No hay patrullas registradas en la red táctica.
                </div>
              ) : (
                (tacticalUnits || []).map((unit) => {
                  const isSelected = internalSelectedUnit === unit.name;
                  const isMoving = unit.status === 'PATROLLING' || unit.status === 'INTERCEPTING';
                  const parsed = parseCoordinates(unit.coordinates);
                  const ptsCount = (trailHistory[unit.id] || []).length;

                  return (
                    <div
                      key={unit.id}
                      onClick={() => handleFocusUnitOnMap(unit)}
                      className={`p-3 rounded-lg border transition-all cursor-pointer text-left space-y-2 ${
                        isSelected
                          ? 'bg-cyan-950/40 border-cyan-500 shadow-md ring-1 ring-cyan-500/30'
                          : 'bg-[#0f1526] border-[#1e2738] hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              isMoving ? 'bg-emerald-400 animate-ping' : 'bg-yellow-400'
                            }`}
                          />
                          <span className="text-xs font-mono font-bold text-white uppercase truncate">
                            {unit.name}
                          </span>
                        </div>
                        <span
                          className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase shrink-0 ${
                            unit.status === 'INTERCEPTING'
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                              : unit.status === 'PATROLLING'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : unit.status === 'STATIONARY'
                              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {unit.status}
                        </span>
                      </div>

                      {/* Sector & Coordinates */}
                      <div className="bg-[#080c16] px-2.5 py-1.5 rounded border border-[#182236] space-y-1 text-[10px] font-mono">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-400 flex items-center gap-1 shrink-0">
                            <MapPin className="w-3 h-3 text-emerald-400" />
                            <span>GPS:</span>
                          </span>
                          <span className="text-white font-bold truncate">{unit.coordinates}</span>
                        </div>
                        <div className="flex items-center justify-between text-[9px] text-slate-400">
                          <span className="truncate">{unit.sector || 'Sector Nacional'}</span>
                          {ptsCount > 1 && (
                            <span className="text-cyan-300 font-bold shrink-0">
                              Ruta: {ptsCount} pts
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Telemetry stats */}
                      <div className="grid grid-cols-3 gap-1 text-[9px] font-mono text-slate-400 pt-0.5">
                        <div>
                          <span>Batería:</span> <b className="text-emerald-400">{unit.battery ?? 92}%</b>
                        </div>
                        <div>
                          <span>Combust:</span> <b className="text-cyan-400">{unit.fuel ?? 85}%</b>
                        </div>
                        <div>
                          <span>Efectivos:</span> <b className="text-white">{unit.personnel || 4}</b>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[8px] font-mono text-slate-500 pt-1 border-t border-[#1a2333]">
                        <span className="truncate">Comando: {unit.commander || 'S-2 Terreno'}</span>
                        <span className="text-emerald-400 shrink-0">{formatReportTime(unit.lastReportTime)}</span>
                      </div>

                      {/* Quick Map Actions: Focus / Google Maps / Google Earth 3D */}
                      <div className="grid grid-cols-2 gap-1.5">
                        {parsed ? (
                          <a
                            href={`https://www.google.com/maps?q=${parsed.lat.toFixed(6)},${parsed.lon.toFixed(6)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="bg-emerald-950/60 hover:bg-emerald-900/70 border border-emerald-500/40 hover:border-emerald-400 text-emerald-300 hover:text-white text-[9px] font-mono py-1 px-2 rounded flex items-center justify-center gap-1 transition-colors"
                            title={`Ver ${unit.name} directamente en Google Maps`}
                          >
                            <ExternalLink className="w-3 h-3 text-emerald-400" />
                            <span>Google Maps</span>
                          </a>
                        ) : (
                          <div />
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenGoogleEarth) {
                              onOpenGoogleEarth(unit);
                            }
                          }}
                          className="bg-[#0a1628] hover:bg-[#112440] border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 hover:text-white text-[9px] font-mono py-1 px-2 rounded flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          title={`Visualizar ${unit.name} en Google Earth 3D en tiempo real`}
                        >
                          <Globe className="w-3 h-3 text-cyan-400" />
                          <span>Earth 3D</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            )}
          </div>

          {/* Quick status bar on footer */}
          <div className="bg-[#0d1424] p-2 rounded-lg border border-[#1b253b] flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <Wifi className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span>Sincronización P2P / WebSocket:</span>
            </span>
            <span className="text-emerald-400 font-bold">100% EN LÍNEA</span>
          </div>
        </div>
      </div>
    </div>
  );
};
