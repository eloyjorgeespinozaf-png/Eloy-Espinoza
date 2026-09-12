/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Modal Táctico de Visualización 3D en Google Earth en Tiempo Real (PII-LCC)
 * Accesible desde el Mando Estratégico (CEO-LCC), Fusión (CFI) y Órganos de Búsqueda (Terreno)
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TacticalUnit } from '../types';
import {
  parseCoordinates,
  formatToMilitaryDMS,
  getGoogleEarthWebUrl,
  generatePatrolKml,
  downloadKmlFile,
  calculateDistanceKm
} from '../utils/geo';
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
  Eye
} from 'lucide-react';
import { playSyntheticBeep, playChime } from '../utils/audio';

interface GoogleEarthPatrolModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPatrol?: TacticalUnit | null;
  allPatrols?: TacticalUnit[];
  onSelectPatrol?: (patrol: TacticalUnit) => void;
  onUpdatePatrolCoordinates?: (patrolId: string, newCoords: string) => void;
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
  onUpdatePatrolCoordinates
}: GoogleEarthPatrolModalProps) {
  const [activeUnit, setActiveUnit] = useState<TacticalUnit | null>(null);
  const [cameraAltitude, setCameraAltitude] = useState<number>(1800); // 800, 1800, 6000
  const [cameraTilt, setCameraTilt] = useState<number>(55);
  const [cameraHeading, setCameraHeading] = useState<number>(15);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedCoords, setCopiedCoords] = useState<boolean>(false);
  const [isSimulatingLiveGps, setIsSimulatingLiveGps] = useState<boolean>(false);
  const [radarAngle, setRadarAngle] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sync active unit when selectedPatrol or allPatrols change
  useEffect(() => {
    if (selectedPatrol) {
      setActiveUnit(selectedPatrol);
    } else if (allPatrols.length > 0 && !activeUnit) {
      setActiveUnit(allPatrols[0]);
    }
  }, [selectedPatrol, allPatrols]);

  // Keep activeUnit up-to-date with latest allPatrols data
  useEffect(() => {
    if (activeUnit && allPatrols.length > 0) {
      const refreshed = allPatrols.find(p => p.id === activeUnit.id || p.name === activeUnit.name);
      if (refreshed) setActiveUnit(refreshed);
    }
  }, [allPatrols]);

  // Parse active unit coordinates
  const parsedCoords = useMemo(() => {
    if (!activeUnit?.coordinates) return { lat: -19.219444, lon: -68.597222 };
    const p = parseCoordinates(activeUnit.coordinates);
    return p || { lat: -19.219444, lon: -68.597222 };
  }, [activeUnit]);

  // Real-time animated radar sweep on the canvas
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setRadarAngle(prev => (prev + 3) % 360);
    }, 40);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Optional live simulated patrol GPS movement
  useEffect(() => {
    if (!isSimulatingLiveGps || !activeUnit) return;

    const interval = setInterval(() => {
      const latDelta = (Math.random() - 0.48) * 0.0003;
      const lonDelta = (Math.random() - 0.48) * 0.0003;
      const newLat = parsedCoords.lat + latDelta;
      const newLon = parsedCoords.lon + lonDelta;
      const newDms = formatToMilitaryDMS(newLat, newLon);

      if (onUpdatePatrolCoordinates) {
        onUpdatePatrolCoordinates(activeUnit.id, newDms);
      } else {
        setActiveUnit(prev => prev ? { ...prev, coordinates: newDms } : null);
      }
    }, 2800);

    return () => clearInterval(interval);
  }, [isSimulatingLiveGps, activeUnit, parsedCoords, onUpdatePatrolCoordinates]);

  // Distances to frontier landmarks
  const landmarkDistances = useMemo(() => {
    if (!parsedCoords) return [];
    return FRONTIER_WAYPOINTS.map(wp => {
      const dist = calculateDistanceKm(parsedCoords, wp.coords);
      return { ...wp, distanceKm: dist };
    });
  }, [parsedCoords]);

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

    // Border line representation (Chile-Bolivia Frontier)
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(w * 0.2, 0);
    ctx.bezierCurveTo(w * 0.28, h * 0.4, w * 0.35, h * 0.7, w * 0.45, h);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.font = '10px monospace';
    ctx.fillStyle = 'rgba(239, 68, 68, 0.7)';
    ctx.fillText('LÍNEA DE FRONTERA INTERNACIONAL (BOLIVIA - CHILE)', w * 0.15, 25);

    // Radar scan beam
    const cx = w / 2;
    const cy = h / 2;
    const rad = (radarAngle * Math.PI) / 180;
    const scanLen = Math.min(w, h) * 0.46;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, scanLen, rad, rad + 0.35);
    ctx.closePath();
    const scanGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, scanLen);
    scanGrad.addColorStop(0, 'rgba(16, 185, 129, 0.4)');
    scanGrad.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
    ctx.fillStyle = scanGrad;
    ctx.fill();
    ctx.restore();

    // Draw Frontier Waypoints
    landmarkDistances.forEach((lm, i) => {
      const offsetX = [90, 160, -110, 50, -160][i % 5];
      const offsetY = [-70, 80, 110, 140, -120][i % 5];
      const wx = cx + offsetX;
      const wy = cy + offsetY;

      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(wx, wy, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(245, 158, 11, 0.85)';
      ctx.font = '9px monospace';
      ctx.fillText(lm.name, wx + 6, wy - 2);
      if (lm.distanceKm !== null) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillText(`${lm.distanceKm} km`, wx + 6, wy + 8);
      }
    });

    // Draw Active Patrol Location in Center
    // GPS pulse circles
    ctx.beginPath();
    ctx.arc(cx, cy, 28, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Directional heading triangle
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((cameraHeading * Math.PI) / 180);
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(8, 8);
    ctx.lineTo(0, 4);
    ctx.lineTo(-8, 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Central beacon point
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();

    // Label on canvas
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`${activeUnit?.name || 'PATRULLA'} [EN VIVO]`, cx + 18, cy - 8);

    ctx.fillStyle = '#38bdf8';
    ctx.font = '10px monospace';
    ctx.fillText(`${parsedCoords.lat.toFixed(6)}, ${parsedCoords.lon.toFixed(6)}`, cx + 18, cy + 6);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText(`Altitud: ~3.850m • Sensor GNSS RTK`, cx + 18, cy + 18);

    ctx.restore();
  }, [isOpen, radarAngle, parsedCoords, activeUnit, landmarkDistances, cameraHeading]);

  if (!isOpen) return null;

  const currentEarthUrl = getGoogleEarthWebUrl(
    parsedCoords.lat,
    parsedCoords.lon,
    cameraAltitude,
    cameraAltitude * 0.9,
    cameraHeading,
    cameraTilt
  );

  const handleOpenGoogleEarth = () => {
    playChime(650, 920, 0.2);
    window.open(currentEarthUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadKml = () => {
    if (!activeUnit) return;
    playSyntheticBeep(880, 0.15);
    const kml = generatePatrolKml(activeUnit.name, parsedCoords.lat, parsedCoords.lon, {
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

  const handleCopyLink = () => {
    playSyntheticBeep(750, 0.1);
    navigator.clipboard.writeText(currentEarthUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyCoords = () => {
    playSyntheticBeep(750, 0.1);
    const text = `${parsedCoords.lat.toFixed(6)}, ${parsedCoords.lon.toFixed(6)} (${activeUnit?.coordinates || ''})`;
    navigator.clipboard.writeText(text);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in font-sans">
      <div className="bg-[#080d17] border-2 border-cyan-500/40 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-[0_0_50px_rgba(6,182,212,0.2)] overflow-hidden text-zinc-100">
        
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-[#0a1628] via-[#0d1f38] to-[#0a1628] border-b border-cyan-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-500/50 text-cyan-400">
              <Globe className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span>Visualización 3D Google Earth // Monitoreo en Tiempo Real</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full animate-pulse font-bold">
                    GPS GNSS EN VIVO
                  </span>
                </h3>
              </div>
              <p className="text-xs text-zinc-400 font-mono">
                Transmisión geoespacial satelital para el Mando CEO-LCC, Fusión CFI y Unidades de Terreno
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

        {/* Patrol Quick Selector Bar */}
        {allPatrols.length > 0 && (
          <div className="px-5 py-2.5 bg-[#050a12] border-b border-white/5 flex items-center gap-2 overflow-x-auto">
            <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold whitespace-nowrap flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              Seleccionar Patrulla:
            </span>
            <div className="flex items-center gap-1.5">
              {allPatrols.map(patrol => {
                const isSelected = activeUnit?.id === patrol.id || activeUnit?.name === patrol.name;
                return (
                  <button
                    key={patrol.id}
                    type="button"
                    onClick={() => {
                      setActiveUnit(patrol);
                      if (onSelectPatrol) onSelectPatrol(patrol);
                      playSyntheticBeep(680, 0.08);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
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
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* Top Info Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#0b1320] border border-cyan-900/40 rounded-xl p-3">
              <span className="text-[10px] font-mono text-zinc-400 uppercase block">Coordenadas DMS</span>
              <span className="text-xs sm:text-sm font-mono font-bold text-white block mt-0.5 truncate">
                {activeUnit?.coordinates || '19°13\'10"S 68°35\'50"W'}
              </span>
              <span className="text-[10px] font-mono text-cyan-400">Militar Cuadriculado</span>
            </div>

            <div className="bg-[#0b1320] border border-cyan-900/40 rounded-xl p-3">
              <span className="text-[10px] font-mono text-zinc-400 uppercase block">Decimal (Google Earth)</span>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-xs sm:text-sm font-mono font-bold text-emerald-400 truncate">
                  {parsedCoords.lat.toFixed(5)}, {parsedCoords.lon.toFixed(5)}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCoords}
                  className="text-zinc-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
                  title="Copiar Coordenadas"
                >
                  {copiedCoords ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <span className="text-[10px] font-mono text-zinc-400">WGS84 Datum</span>
            </div>

            <div className="bg-[#0b1320] border border-cyan-900/40 rounded-xl p-3">
              <span className="text-[10px] font-mono text-zinc-400 uppercase block">Altitud & Terreno</span>
              <span className="text-xs sm:text-sm font-mono font-bold text-white block mt-0.5">
                ~3.850 m s.n.m.
              </span>
              <span className="text-[10px] font-mono text-amber-400">Altiplano Andino</span>
            </div>

            <div className="bg-[#0b1320] border border-cyan-900/40 rounded-xl p-3">
              <span className="text-[10px] font-mono text-zinc-400 uppercase block">Comandante & Enlace</span>
              <span className="text-xs sm:text-sm font-mono font-bold text-white block mt-0.5 truncate">
                {activeUnit?.commander || 'CB1. F. Valenzuela'}
              </span>
              <span className="text-[10px] font-mono text-emerald-400">{activeUnit?.frequency || '142.850 MHz'}</span>
            </div>
          </div>

          {/* Interactive 3D Terrain Simulation Viewport */}
          <div className="bg-[#050912] border border-cyan-950 rounded-xl overflow-hidden shadow-inner relative">
            <div className="px-4 py-2 bg-[#091120] border-b border-white/5 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-white font-bold">Simulación 3D de Terreno Satelital Fronterizo</span>
                <span className="text-zinc-500">|</span>
                <span className="text-zinc-400">Sector: {activeUnit?.sector || 'Salar de Coipasa'}</span>
              </div>

              {/* Simulation button */}
              <div className="flex items-center gap-2">
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
                  <span>{isSimulatingLiveGps ? 'Pausar Simulación GPS' : 'Simular Telemetría en Vivo'}</span>
                </button>
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
              Distancia a Puntos Críticos y Pasos de Frontera:
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
            <Globe className="w-4 h-4 text-cyan-400" />
            <span>Enlace dinámico generado con proyección 3D y coordenadas geodésicas en tiempo real.</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Copy Link */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="bg-[#0e1726] hover:bg-[#16253c] text-zinc-300 hover:text-white font-mono text-xs py-2.5 px-3.5 rounded-xl border border-white/10 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? 'Enlace Copiado' : 'Copiar URL Earth'}</span>
            </button>

            {/* Download KML */}
            <button
              type="button"
              onClick={handleDownloadKml}
              className="bg-[#0e1726] hover:bg-[#16253c] text-cyan-300 hover:text-cyan-100 font-mono text-xs py-2.5 px-3.5 rounded-xl border border-cyan-500/30 flex items-center justify-center gap-2 transition-colors cursor-pointer"
              title="Descargar archivo KML estándar para Google Earth Pro de escritorio"
            >
              <Download className="w-4 h-4 text-cyan-400" />
              <span>Descargar KML (Google Earth Pro)</span>
            </button>

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
