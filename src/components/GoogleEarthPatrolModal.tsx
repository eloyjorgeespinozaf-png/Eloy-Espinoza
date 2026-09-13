/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Modal Táctico de Visualización 3D en Google Earth en Tiempo Real (PII-LCC)
 * Accesible desde el Mando Estratégico (CEO-LCC), Fusión (CFI) y Órganos de Búsqueda (Terreno)
 * Soporta rastreo satelital físico GNSS del dispositivo real y exportación de KML de alta precisión.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TacticalUnit } from '../types';
import {
  parseCoordinates,
  formatToMilitaryDMS,
  getGoogleEarthWebUrl,
  generatePatrolKml,
  generateDeviceRealLocationKml,
  downloadKmlFile,
  calculateDistanceKm
} from '../utils/geo';
import {
  useDeviceLocation,
  detectDevicePlatform,
  DeviceLocationState
} from '../utils/deviceLocation';
import { useAuth } from '../context/AuthContext';
import {
  Globe,
  ExternalLink,
  Download,
  Copy,
  Check,
  MapPin,
  Compass,
  Radio,
  Shield,
  Layers,
  Activity,
  Maximize2,
  Navigation,
  X,
  Play,
  Pause,
  RotateCcw,
  Eye,
  Smartphone,
  Laptop,
  Crosshair,
  RefreshCw,
  Satellite,
  Share2,
  AlertCircle
} from 'lucide-react';
import {
  playCyberClick,
  playCyberAccessGranted,
  playCyberAlert,
  playSyntheticBeep,
  playChime
} from '../utils/audio';

interface GoogleEarthPatrolModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPatrol?: TacticalUnit | null;
  allPatrols?: TacticalUnit[];
  onSelectPatrol?: (patrol: TacticalUnit) => void;
  onUpdatePatrolCoordinates?: (patrolId: string, newCoords: string) => void;
  initialMode?: 'DEVICE_REAL_LOCATION' | 'PATROL_UNIT';
}

// Frontier landmarks for distance correlation
const FRONTIER_WAYPOINTS = [
  { name: 'Hito 14 (Frontera)', coords: '19°14\'20"S 68°34\'10"W' },
  { name: 'Salar de Coipasa', coords: '19°22\'00"S 68°16\'00"W' },
  { name: 'Paso Pisiga', coords: '19°35\'00"S 68°38\'00"W' },
  { name: 'Hito 18 (Clandestino)', coords: '19°28\'10"S 68°36\'40"W' },
  { name: 'Tambo Quemado', coords: '18°17\'00"S 69°02\'00"W' }
];

export default function GoogleEarthPatrolModal({
  isOpen,
  onClose,
  selectedPatrol,
  allPatrols = [],
  onSelectPatrol,
  onUpdatePatrolCoordinates,
  initialMode
}: GoogleEarthPatrolModalProps) {
  const { user } = useAuth();
  const currentRole = user?.role || 'ROL_TERRENO';

  // Target source: real device hardware GPS vs deployed tactical patrol
  const [targetSource, setTargetSource] = useState<'DEVICE_REAL_LOCATION' | 'PATROL_UNIT'>(() => {
    if (initialMode) return initialMode;
    return selectedPatrol ? 'PATROL_UNIT' : 'DEVICE_REAL_LOCATION';
  });

  const [activeUnit, setActiveUnit] = useState<TacticalUnit | null>(null);
  const [cameraAltitude, setCameraAltitude] = useState<number>(1800); // 800, 1800, 6000
  const [cameraTilt, setCameraTilt] = useState<number>(55);
  const [cameraHeading, setCameraHeading] = useState<number>(15);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedCoords, setCopiedCoords] = useState<boolean>(false);
  const [isSimulatingLiveGps, setIsSimulatingLiveGps] = useState<boolean>(false);
  const [radarAngle, setRadarAngle] = useState<number>(0);
  const [syncStatusBanner, setSyncStatusBanner] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Hook for live device GNSS positioning
  const {
    location: deviceLocation,
    isTracking: isDeviceTracking,
    isLoading: isDeviceLoading,
    error: deviceGpsError,
    refreshLocation: refreshDeviceGps,
    startTracking: startDeviceTracking,
    stopTracking: stopDeviceTracking
  } = useDeviceLocation(isOpen);

  // Auto start tracking when modal opens
  useEffect(() => {
    if (isOpen) {
      startDeviceTracking();
    } else {
      stopDeviceTracking();
    }
  }, [isOpen, startDeviceTracking, stopDeviceTracking]);

  // Sync active unit when selectedPatrol changes
  useEffect(() => {
    if (selectedPatrol) {
      setActiveUnit(selectedPatrol);
      if (!initialMode) {
        setTargetSource('PATROL_UNIT');
      }
    } else if (allPatrols.length > 0 && !activeUnit) {
      setActiveUnit(allPatrols[0]);
    }
  }, [selectedPatrol, allPatrols, initialMode]);

  // Keep activeUnit up-to-date with latest allPatrols data
  useEffect(() => {
    if (activeUnit && allPatrols.length > 0) {
      const refreshed = allPatrols.find(p => p.id === activeUnit.id || p.name === activeUnit.name);
      if (refreshed) setActiveUnit(refreshed);
    }
  }, [allPatrols]);

  // Parse active unit coordinates
  const parsedUnitCoords = useMemo(() => {
    if (!activeUnit?.coordinates) return { lat: -19.219444, lon: -68.597222 };
    const p = parseCoordinates(activeUnit.coordinates);
    return p || { lat: -19.219444, lon: -68.597222 };
  }, [activeUnit]);

  // Current effective coordinates based on target source
  const effectiveCoords = useMemo(() => {
    if (targetSource === 'DEVICE_REAL_LOCATION') {
      if (deviceLocation && (deviceLocation.lat !== 0 || deviceLocation.lon !== 0)) {
        return { lat: deviceLocation.lat, lon: deviceLocation.lon };
      }
    }
    return parsedUnitCoords;
  }, [targetSource, deviceLocation, parsedUnitCoords]);

  // Effective coordinates formatted in DMS
  const effectiveDms = useMemo(() => {
    if (targetSource === 'DEVICE_REAL_LOCATION') {
      if (deviceLocation && deviceLocation.dms && deviceLocation.dms !== 'NO DISPONIBLE') {
        return deviceLocation.dms;
      }
    }
    return activeUnit?.coordinates || formatToMilitaryDMS(effectiveCoords.lat, effectiveCoords.lon);
  }, [targetSource, deviceLocation, activeUnit, effectiveCoords]);

  // Real-time animated radar sweep on the canvas
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setRadarAngle(prev => (prev + 3) % 360);
    }, 40);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Optional simulated patrol GPS movement
  useEffect(() => {
    if (!isSimulatingLiveGps || !activeUnit || targetSource === 'DEVICE_REAL_LOCATION') return;

    const interval = setInterval(() => {
      const latDelta = (Math.random() - 0.48) * 0.0003;
      const lonDelta = (Math.random() - 0.48) * 0.0003;
      const newLat = parsedUnitCoords.lat + latDelta;
      const newLon = parsedUnitCoords.lon + lonDelta;
      const newDms = formatToMilitaryDMS(newLat, newLon);

      if (onUpdatePatrolCoordinates) {
        onUpdatePatrolCoordinates(activeUnit.id, newDms);
      } else {
        setActiveUnit(prev => prev ? { ...prev, coordinates: newDms } : null);
      }
    }, 2800);

    return () => clearInterval(interval);
  }, [isSimulatingLiveGps, activeUnit, parsedUnitCoords, onUpdatePatrolCoordinates, targetSource]);

  // Distances to frontier landmarks
  const landmarkDistances = useMemo(() => {
    if (!effectiveCoords) return [];
    return FRONTIER_WAYPOINTS.map(wp => {
      const dist = calculateDistanceKm(effectiveCoords, wp.coords);
      return { ...wp, distanceKm: dist };
    });
  }, [effectiveCoords]);

  // Render 3D terrain representation on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isOpen) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Dark Altiplano Satellite Background with elevation contour gradient
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, '#060d17');
    bgGrad.addColorStop(0.5, '#0b1626');
    bgGrad.addColorStop(1, '#08101a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Topographic contour lines
    ctx.save();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.07)';
    ctx.lineWidth = 1;
    for (let r = 40; r < Math.max(w, h); r += 45) {
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Grid coordinates lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    for (let x = 0; x < w; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Rotating Radar Sweep Line
    const rad = (radarAngle * Math.PI) / 180;
    const radarLength = Math.max(w, h);
    const grad = ctx.createLinearGradient(
      w / 2,
      h / 2,
      w / 2 + Math.cos(rad) * radarLength,
      h / 2 + Math.sin(rad) * radarLength
    );
    grad.addColorStop(0, 'rgba(6, 182, 212, 0.5)');
    grad.addColorStop(1, 'rgba(6, 182, 212, 0)');

    ctx.strokeStyle = grad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w / 2, h / 2);
    ctx.lineTo(w / 2 + Math.cos(rad) * radarLength, h / 2 + Math.sin(rad) * radarLength);
    ctx.stroke();

    // Draw GNSS Accuracy Circle if in Real Device Mode
    if (targetSource === 'DEVICE_REAL_LOCATION' && deviceLocation?.accuracy) {
      const accuracyRadiusPx = Math.min(100, Math.max(15, deviceLocation.accuracy * 1.5));
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.fillStyle = 'rgba(6, 182, 212, 0.08)';
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, accuracyRadiusPx, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#38bdf8';
      ctx.font = '9px monospace';
      ctx.fillText(`Margen GPS ±${deviceLocation.accuracy}m`, w / 2 - 35, h / 2 + accuracyRadiusPx + 12);
    }

    // Center Tactical Target / Device Beacon
    const cx = w / 2;
    const cy = h / 2;

    const isRealDevice = targetSource === 'DEVICE_REAL_LOCATION';
    const beaconColor = isRealDevice ? '#10b981' : '#38bdf8';

    // Target rings
    ctx.strokeStyle = beaconColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = beaconColor;
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();

    // Crosshairs
    ctx.strokeStyle = beaconColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 24, cy);
    ctx.lineTo(cx - 16, cy);
    ctx.moveTo(cx + 16, cy);
    ctx.lineTo(cx + 24, cy);
    ctx.moveTo(cx, cy - 24);
    ctx.lineTo(cx, cy - 16);
    ctx.moveTo(cx, cy + 16);
    ctx.lineTo(cx, cy + 24);
    ctx.stroke();

    // Label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px monospace';
    const labelTitle = isRealDevice ? '📍 MI DISPOSITIVO (GPS REAL)' : (activeUnit?.name || 'PATRULLA LCC');
    ctx.fillText(labelTitle, cx + 18, cy - 10);

    ctx.fillStyle = isRealDevice ? '#34d399' : '#38bdf8';
    ctx.font = '10px monospace';
    ctx.fillText(effectiveDms, cx + 18, cy + 5);

    if (isRealDevice && deviceLocation?.accuracy) {
      ctx.fillStyle = '#facc15';
      ctx.font = '9px monospace';
      ctx.fillText(`PRECISIÓN GNSS: ±${deviceLocation.accuracy}m | ${detectDevicePlatform()}`, cx + 18, cy + 18);
    } else if (activeUnit?.commander) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px monospace';
      ctx.fillText(`Mando: ${activeUnit.commander} | ${activeUnit.status}`, cx + 18, cy + 18);
    }

    // Draw waypoints / frontier points
    landmarkDistances.slice(0, 3).forEach((lm, idx) => {
      const angle = (idx * 120 + 30) * (Math.PI / 180);
      const distPx = 100 + idx * 30;
      const lx = cx + Math.cos(angle) * distPx;
      const ly = cy + Math.sin(angle) * distPx;

      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(lx, ly, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px monospace';
      ctx.fillText(`${lm.name} (${lm.distanceKm || '?'}km)`, lx + 6, ly + 3);
    });

    ctx.restore();
  }, [isOpen, radarAngle, effectiveCoords, effectiveDms, targetSource, deviceLocation, activeUnit, landmarkDistances]);

  if (!isOpen) return null;

  const currentEarthUrl = getGoogleEarthWebUrl(
    effectiveCoords.lat,
    effectiveCoords.lon,
    cameraAltitude,
    cameraAltitude * 0.9,
    cameraHeading,
    cameraTilt
  );

  const handleOpenGoogleEarth = () => {
    playCyberClick();
    window.open(currentEarthUrl, '_blank', 'noopener,noreferrer');
  };

  // KML download for Real Physical Device Location
  const handleDownloadRealDeviceKml = () => {
    playCyberAccessGranted();
    const lat = effectiveCoords.lat;
    const lon = effectiveCoords.lon;
    const accuracy = deviceLocation?.accuracy || null;
    const altitude = deviceLocation?.altitude || 3820;
    const speed = deviceLocation?.speed || null;
    const heading = deviceLocation?.heading || null;

    const kml = generateDeviceRealLocationKml({
      lat,
      lon,
      accuracy,
      altitude,
      speed,
      heading,
      operatorName: user?.name || 'Operador Táctico LCC',
      role: currentRole,
      devicePlatform: detectDevicePlatform(),
      timestamp: new Date().toISOString()
    });

    const filename = `PII-LCC_Ubicacion_Real_Dispositivo_${new Date().toISOString().substring(0, 10)}`;
    downloadKmlFile(filename, kml);

    setSyncStatusBanner(`ARCHIVO KML GENERADO CON ÉXITO: Descarga de coordenadas reales (${effectiveDms}).`);
    setTimeout(() => setSyncStatusBanner(null), 4000);
  };

  // KML download for Selected Tactical Patrol
  const handleDownloadPatrolKml = () => {
    if (!activeUnit) return;
    playCyberClick();
    const kml = generatePatrolKml(activeUnit.name, parsedUnitCoords.lat, parsedUnitCoords.lon, {
      status: activeUnit.status,
      commander: activeUnit.commander,
      frequency: activeUnit.frequency,
      sector: activeUnit.sector,
      battery: activeUnit.battery,
      personnel: activeUnit.personnel,
      coordinatesDms: activeUnit.coordinates
    });
    const filename = `PII-LCC_${activeUnit.name.replace(/\s+/g, '_')}_GoogleEarth`;
    downloadKmlFile(filename, kml);
  };

  // Sync real device location into selected patrol
  const handleSyncRealGpsToPatrol = () => {
    if (!activeUnit || !deviceLocation || !onUpdatePatrolCoordinates) return;
    playCyberAccessGranted();
    const newCoords = deviceLocation.dms;
    onUpdatePatrolCoordinates(activeUnit.id, newCoords);
    setSyncStatusBanner(`POSICIÓN GPS REAL EN VIVO VINCULADA: ${activeUnit.name} sincronizada en ${newCoords}.`);
    setTimeout(() => setSyncStatusBanner(null), 4000);
  };

  const handleCopyLink = () => {
    playCyberClick();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(currentEarthUrl).catch(e => console.warn('Clipboard write failed:', e));
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (e) {
      console.warn('Copy link error:', e);
    }
  };

  const handleCopyCoords = () => {
    playCyberClick();
    try {
      const text = `${effectiveCoords.lat.toFixed(6)}, ${effectiveCoords.lon.toFixed(6)} (${effectiveDms})`;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(e => console.warn('Clipboard write failed:', e));
      }
      setCopiedCoords(true);
      setTimeout(() => setCopiedCoords(false), 2500);
    } catch (e) {
      console.warn('Copy coords error:', e);
    }
  };

  const devicePlatform = detectDevicePlatform();
  const isRealGpsActive = deviceLocation && deviceLocation.isLive;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in font-sans">
      <div className="bg-[#080d17] border-2 border-cyan-500/40 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-[0_0_50px_rgba(6,182,212,0.25)] overflow-hidden text-zinc-100">
        
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-[#0a1628] via-[#0d1f38] to-[#0a1628] border-b border-cyan-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-500/50 text-cyan-400">
              <Globe className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm sm:text-base font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span>Google Earth 3D // Generador KML & Telemetría GNSS</span>
                </h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full animate-pulse font-bold flex items-center gap-1">
                  <Satellite className="w-3 h-3 text-emerald-400" />
                  {isRealGpsActive ? 'GNSS REAL ACTIVO' : 'GPS EN VIVO'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono">
                Genera la ubicación real y actual en KML donde está instalada la app para visualización satelital en Google Earth
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700 transition-colors cursor-pointer"
            title="Cerrar Visualizador"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Source Switcher: MI DISPOSITIVO (GPS REAL) vs PATRULLAS EN TERRENO */}
        <div className="px-5 py-2.5 bg-[#050a12] border-b border-white/5 flex flex-wrap items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5">
            {/* Real Device Location Selector Button */}
            <button
              type="button"
              onClick={() => {
                setTargetSource('DEVICE_REAL_LOCATION');
                playCyberClick();
                refreshDeviceGps();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer border ${
                targetSource === 'DEVICE_REAL_LOCATION'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  : 'bg-[#0a1628] hover:bg-[#10243e] text-zinc-300 border-white/10'
              }`}
            >
              <Smartphone className={`w-3.5 h-3.5 ${targetSource === 'DEVICE_REAL_LOCATION' ? 'text-emerald-400 animate-pulse' : 'text-zinc-400'}`} />
              <span>📍 MI DISPOSITIVO (GPS REAL EN VIVO)</span>
              {deviceLocation?.accuracy && (
                <span className="text-[10px] bg-emerald-950 px-1.5 py-0.2 border border-emerald-500/40 rounded text-emerald-400 font-bold">
                  ±{deviceLocation.accuracy}m
                </span>
              )}
            </button>

            {/* Patrols divider */}
            {allPatrols.length > 0 && (
              <>
                <span className="text-zinc-600 text-xs px-1">|</span>
                <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold whitespace-nowrap hidden sm:inline">
                  Patrullas:
                </span>
                {allPatrols.map(patrol => {
                  const isSelected = targetSource === 'PATROL_UNIT' && (activeUnit?.id === patrol.id || activeUnit?.name === patrol.name);
                  return (
                    <button
                      key={patrol.id}
                      type="button"
                      onClick={() => {
                        setTargetSource('PATROL_UNIT');
                        setActiveUnit(patrol);
                        if (onSelectPatrol) onSelectPatrol(patrol);
                        playCyberClick();
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-500 text-black font-bold shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                          : 'bg-[#0e1726] hover:bg-[#15233a] text-zinc-300 border border-white/10'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${
                        patrol.status === 'INTERCEPTING' ? 'bg-rose-400 animate-ping' : 'bg-emerald-400'
                      }`} />
                      <span>{patrol.name}</span>
                    </button>
                  );
                })}
              </>
            )}
          </div>

          {/* Quick Real Device Refresh Button */}
          <button
            type="button"
            onClick={() => {
              playCyberClick();
              refreshDeviceGps();
            }}
            disabled={isDeviceLoading}
            className="px-2.5 py-1 rounded-lg text-[11px] font-mono bg-[#111e33] hover:bg-[#172b49] text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Refrescar lectura física satelital del sensor GPS del dispositivo"
          >
            <RefreshCw className={`w-3 h-3 ${isDeviceLoading ? 'animate-spin' : ''}`} />
            <span>{isDeviceLoading ? 'Adquiriendo GPS...' : 'Actualizar GPS'}</span>
          </button>
        </div>

        {/* Dynamic Status / Feedback Banner */}
        {syncStatusBanner && (
          <div className="px-5 py-2 bg-emerald-950/80 border-b border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2 animate-fade-in">
            <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{syncStatusBanner}</span>
          </div>
        )}

        {deviceGpsError && targetSource === 'DEVICE_REAL_LOCATION' && (
          <div className="px-5 py-2 bg-amber-950/80 border-b border-amber-500/40 text-amber-300 text-xs font-mono flex items-center gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>AVISO GNSS: {deviceGpsError}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* Top Info Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#0b1320] border border-cyan-900/40 rounded-xl p-3">
              <span className="text-[10px] font-mono text-zinc-400 uppercase block">
                {targetSource === 'DEVICE_REAL_LOCATION' ? 'GPS Real del Dispositivo (DMS)' : 'Coordenadas DMS (Patrulla)'}
              </span>
              <span className="text-xs sm:text-sm font-mono font-bold text-white block mt-0.5 truncate">
                {effectiveDms}
              </span>
              <span className="text-[10px] font-mono text-cyan-400">
                {targetSource === 'DEVICE_REAL_LOCATION' ? 'Sensor Físico GNSS' : 'Militar Cuadriculado'}
              </span>
            </div>

            <div className="bg-[#0b1320] border border-cyan-900/40 rounded-xl p-3">
              <span className="text-[10px] font-mono text-zinc-400 uppercase block">Decimal (Google Earth)</span>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-xs sm:text-sm font-mono font-bold text-emerald-400 truncate">
                  {effectiveCoords.lat.toFixed(6)}, {effectiveCoords.lon.toFixed(6)}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCoords}
                  className="text-zinc-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
                  title="Copiar Coordenadas Decimales WGS84"
                >
                  {copiedCoords ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <span className="text-[10px] font-mono text-zinc-400">WGS84 Datum</span>
            </div>

            <div className="bg-[#0b1320] border border-cyan-900/40 rounded-xl p-3">
              <span className="text-[10px] font-mono text-zinc-400 uppercase block">
                {targetSource === 'DEVICE_REAL_LOCATION' ? 'Precisión Satelital' : 'Altitud & Terreno'}
              </span>
              <span className="text-xs sm:text-sm font-mono font-bold text-white block mt-0.5">
                {targetSource === 'DEVICE_REAL_LOCATION' 
                  ? (deviceLocation?.accuracy ? `±${deviceLocation.accuracy} metros` : 'Buscando satélites...')
                  : '~3.850 m s.n.m.'
                }
              </span>
              <span className="text-[10px] font-mono text-amber-400">
                {targetSource === 'DEVICE_REAL_LOCATION' 
                  ? (deviceLocation?.altitude ? `${deviceLocation.altitude}m s.n.m.` : 'Geodésico WGS84')
                  : 'Altiplano Andino'
                }
              </span>
            </div>

            <div className="bg-[#0b1320] border border-cyan-900/40 rounded-xl p-3">
              <span className="text-[10px] font-mono text-zinc-400 uppercase block">
                {targetSource === 'DEVICE_REAL_LOCATION' ? 'Terminal Instalada' : 'Comandante & Enlace'}
              </span>
              <span className="text-xs sm:text-sm font-mono font-bold text-white block mt-0.5 truncate">
                {targetSource === 'DEVICE_REAL_LOCATION' 
                  ? devicePlatform 
                  : (activeUnit?.commander || 'Oficial al Mando')
                }
              </span>
              <span className="text-[10px] font-mono text-emerald-400">
                {targetSource === 'DEVICE_REAL_LOCATION' 
                  ? `Operador: ${user?.name || 'Comandante LCC'}` 
                  : (activeUnit?.frequency || '142.850 MHz')
                }
              </span>
            </div>
          </div>

          {/* Interactive 3D Terrain Simulation Viewport */}
          <div className="bg-[#050912] border border-cyan-950 rounded-xl overflow-hidden shadow-inner relative">
            <div className="px-4 py-2 bg-[#091120] border-b border-white/5 flex flex-wrap items-center justify-between text-xs font-mono gap-2">
              <div className="flex items-center gap-2">
                <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-white font-bold">
                  {targetSource === 'DEVICE_REAL_LOCATION' 
                    ? 'Rastreo GNSS en Tiempo Real de la Estación / Dispositivo Físico' 
                    : 'Simulación 3D de Terreno Satelital Fronterizo'
                  }
                </span>
                <span className="text-zinc-500">|</span>
                <span className="text-zinc-400">
                  {targetSource === 'DEVICE_REAL_LOCATION' ? 'Hardware Local Activo' : `Sector: ${activeUnit?.sector || 'Salar de Coipasa'}`}
                </span>
              </div>

              {/* Action buttons inside canvas header */}
              <div className="flex items-center gap-2">
                {targetSource === 'DEVICE_REAL_LOCATION' && activeUnit && onUpdatePatrolCoordinates && (
                  <button
                    type="button"
                    onClick={handleSyncRealGpsToPatrol}
                    className="px-2.5 py-1 rounded text-[11px] font-mono bg-emerald-900/60 hover:bg-emerald-800 text-emerald-300 border border-emerald-500/50 flex items-center gap-1.5 transition-colors cursor-pointer"
                    title={`Transmite la ubicación física real de este dispositivo a la patrulla ${activeUnit.name}`}
                  >
                    <Share2 className="w-3 h-3 text-emerald-400" />
                    <span>Sincronizar mi GPS con {activeUnit.name}</span>
                  </button>
                )}

                {targetSource === 'PATROL_UNIT' && (
                  <button
                    type="button"
                    onClick={() => setIsSimulatingLiveGps(prev => !prev)}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono flex items-center gap-1.5 transition-colors cursor-pointer ${
                      isSimulatingLiveGps 
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50' 
                        : 'bg-[#0f1b2d] hover:bg-[#182b47] text-zinc-300 border border-white/10'
                    }`}
                  >
                    {isSimulatingLiveGps ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    <span>{isSimulatingLiveGps ? 'Pausar Simulación GPS' : 'Simular Movimiento'}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="relative">
              <canvas
                ref={canvasRef}
                width={860}
                height={320}
                className="w-full h-64 sm:h-72 object-cover block"
              />

              {/* Camera Presets floating on canvas */}
              <div className="absolute top-3 right-3 bg-black/80 backdrop-blur border border-white/10 rounded-lg p-2 flex flex-col gap-1 text-[10px] font-mono">
                <span className="text-zinc-400 font-bold px-1">ALTITUD CÁMARA 3D:</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => { setCameraAltitude(800); setCameraTilt(60); }}
                    className={`px-2 py-0.5 rounded cursor-pointer ${cameraAltitude === 800 ? 'bg-cyan-600 text-white font-bold' : 'bg-zinc-800 text-zinc-300'}`}
                  >
                    800m (Táctica)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCameraAltitude(1800); setCameraTilt(55); }}
                    className={`px-2 py-0.5 rounded cursor-pointer ${cameraAltitude === 1800 ? 'bg-cyan-600 text-white font-bold' : 'bg-zinc-800 text-zinc-300'}`}
                  >
                    1.800m (Terreno)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCameraAltitude(6000); setCameraTilt(35); }}
                    className={`px-2 py-0.5 rounded cursor-pointer ${cameraAltitude === 6000 ? 'bg-cyan-600 text-white font-bold' : 'bg-zinc-800 text-zinc-300'}`}
                  >
                    6.000m (Regional)
                  </button>
                </div>
              </div>

              {/* Heading adjuster */}
              <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur border border-white/10 rounded-lg p-2 flex items-center gap-2 text-[10px] font-mono">
                <Compass className="w-4 h-4 text-cyan-400" />
                <span className="text-zinc-400">Rumbo de la Cámara:</span>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={cameraHeading}
                  onChange={(e) => setCameraHeading(Number(e.target.value))}
                  className="w-24 accent-cyan-500 cursor-pointer"
                />
                <span className="text-white font-bold">{cameraHeading}°</span>
              </div>
            </div>
          </div>

          {/* Landmarks Correlation Row */}
          <div className="bg-[#0b1320] border border-white/5 rounded-xl p-3.5">
            <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold block mb-2">
              Distancia a Puntos Críticos y Pasos Fronterizos desde la Ubicación Actual:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono">
              {landmarkDistances.map(lm => (
                <div key={lm.name} className="bg-[#060a12] p-2 rounded-lg border border-white/5">
                  <span className="text-[10px] text-zinc-400 block truncate">{lm.name}</span>
                  <span className="text-sm font-bold text-amber-400 block mt-0.5">
                    {lm.distanceKm !== null ? `${lm.distanceKm} km` : 'N/A'}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Primary Action Buttons Footer */}
        <div className="px-5 py-4 bg-[#060c17] border-t border-cyan-500/30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <Globe className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <span className="truncate">
              {targetSource === 'DEVICE_REAL_LOCATION'
                ? `KML con radio satelital ±${deviceLocation?.accuracy || '?'}m donde la app está operando.`
                : 'Enlace dinámico generado con proyección 3D y coordenadas geodésicas de patrulla.'
              }
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Copy Link */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="bg-[#0e1726] hover:bg-[#16253c] text-zinc-300 hover:text-white font-mono text-xs py-2.5 px-3.5 rounded-xl border border-white/10 flex items-center justify-center gap-2 transition-colors cursor-pointer"
              title="Copiar URL directa de visualización 3D en Google Earth Web"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? 'Enlace Copiado' : 'Copiar URL Earth'}</span>
            </button>

            {/* Download KML: Device Real Location */}
            <button
              type="button"
              onClick={handleDownloadRealDeviceKml}
              className="bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 hover:text-emerald-100 font-mono text-xs py-2.5 px-3.5 rounded-xl border border-emerald-500/50 flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.2)]"
              title="Genera y descarga archivo KML con la ubicación física REAL y satelital del dispositivo donde está instalada la app"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Generar KML Real del Dispositivo</span>
            </button>

            {/* If a patrol is selected, allow downloading that patrol's KML too */}
            {targetSource === 'PATROL_UNIT' && activeUnit && (
              <button
                type="button"
                onClick={handleDownloadPatrolKml}
                className="bg-[#0e1726] hover:bg-[#16253c] text-cyan-300 hover:text-cyan-100 font-mono text-xs py-2.5 px-3.5 rounded-xl border border-cyan-500/30 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                title="Descargar archivo KML de la patrulla seleccionada para Google Earth Pro"
              >
                <Download className="w-4 h-4 text-cyan-400" />
                <span>KML de Patrulla</span>
              </button>
            )}

            {/* Open Google Earth 3D Web */}
            <button
              type="button"
              onClick={handleOpenGoogleEarth}
              className="flex-1 sm:flex-initial bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono font-bold text-xs py-2.5 px-5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] cursor-pointer uppercase"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Abrir en Google Earth 3D (Web)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
