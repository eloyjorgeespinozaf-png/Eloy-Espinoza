/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Monitor Táctico y Radar de Movimiento de Patrullas en Tiempo Real (PII-LCC)
 * Permite a la Central de Fusión (CFI) y al Mando Estratégico (CEO-LCC)
 * visualizar, seguir y correlacionar la telemetría en vivo de las patrullas.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { TacticalUnit, RawAlert, ActionableIntel } from '../types';
import { parseCoordinates, calculateDistanceKm } from '../utils/geo';
import {
  Navigation,
  Radio,
  MapPin,
  Shield,
  Activity,
  Maximize2,
  Minimize2,
  Compass,
  Crosshair,
  Wifi,
  BatteryCharging,
  Users,
  Clock,
  Eye,
  Layers,
  AlertTriangle,
  RefreshCw,
  Globe
} from 'lucide-react';

interface PatrolTrackingRadarProps {
  tacticalUnits: TacticalUnit[];
  rawAlerts?: RawAlert[];
  actionableIntel?: ActionableIntel[];
  selectedUnitName?: string | null;
  onSelectUnit?: (unitName: string) => void;
  onOpenGoogleEarth?: (unit: TacticalUnit) => void;
  height?: number | string;
  isCompact?: boolean;
  title?: string;
}

// Key frontier reference points
const FRONTIER_HOTSPOTS = [
  { id: 'h-14', name: 'Hito 14', coords: '19°14\'20"S 68°34\'10"W', threat: 'CRITICAL' },
  { id: 'coipasa', name: 'Salar de Coipasa', coords: '19°22\'00"S 68°16\'00"W', threat: 'HIGH' },
  { id: 'tambo', name: 'Tambo Quemado', coords: '18°17\'00"S 69°02\'00"W', threat: 'MEDIUM' },
  { id: 'pisiga', name: 'Paso Pisiga', coords: '19°35\'00"S 68°38\'00"W', threat: 'HIGH' },
  { id: 'h-18', name: 'Hito 18', coords: '19°28\'10"S 68°36\'40"W', threat: 'CRITICAL' },
  { id: 'charaña', name: 'Sector Charaña', coords: '17°35\'00"S 69°26\'00"W', threat: 'LOW' }
];

export const PatrolTrackingRadar: React.FC<PatrolTrackingRadarProps> = ({
  tacticalUnits = [],
  rawAlerts = [],
  actionableIntel = [],
  selectedUnitName = null,
  onSelectUnit,
  onOpenGoogleEarth,
  height = 420,
  isCompact = false,
  title = 'CENTRO DE TELEMETRÍA // SEGUIMIENTO DE PATRULLAS EN TIEMPO REAL'
}) => {
  const [internalSelectedUnit, setInternalSelectedUnit] = useState<string | null>(selectedUnitName);
  const [activeLayer, setActiveLayer] = useState<'ALL' | 'UNITS_ONLY' | 'ALERTS_ONLY'>('ALL');
  const [radarZoom, setRadarZoom] = useState<number>(1);
  const [sweepAngle, setSweepAngle] = useState<number>(0);
  const [breadcrumbHistory, setBreadcrumbHistory] = useState<Record<string, Array<{ x: number; y: number; time: string }>>>({});

  // Synchronize internal selection with prop
  useEffect(() => {
    if (selectedUnitName !== undefined) {
      setInternalSelectedUnit(selectedUnitName);
    }
  }, [selectedUnitName]);

  // Radar sweep animation
  useEffect(() => {
    let animId: number;
    const animate = () => {
      setSweepAngle(prev => (prev + 1.2) % 360);
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Geographical mapping to SVG 500x400 space
  const projectToMap = (coordStr: string, fallbackIdx = 0): { x: number; y: number } => {
    const parsed = parseCoordinates(coordStr);
    if (!parsed) {
      return {
        x: 120 + ((fallbackIdx * 85) % 300),
        y: 110 + ((fallbackIdx * 70) % 200)
      };
    }

    // Border corridor window
    const latMin = -21.0;
    const latMax = -17.8;
    const lonMin = -69.6;
    const lonMax = -67.8;

    let x = 60 + ((parsed.lon - lonMin) / (lonMax - lonMin)) * 380;
    let y = 340 - ((parsed.lat - latMin) / (latMax - latMin)) * 280;

    // Boundaries
    x = Math.max(30, Math.min(470, x));
    y = Math.max(30, Math.min(370, y));

    return { x, y };
  };

  // Track unit coordinate changes to build real-time breadcrumbs trail
  useEffect(() => {
    tacticalUnits.forEach((unit, idx) => {
      const pos = projectToMap(unit.coordinates, idx);
      setBreadcrumbHistory(prev => {
        const history = prev[unit.id] || [];
        const last = history[history.length - 1];
        // If moved more than 2px, register breadcrumb
        if (!last || Math.hypot(last.x - pos.x, last.y - pos.y) > 2) {
          const updated = [...history.slice(-8), { ...pos, time: new Date().toLocaleTimeString() }];
          return { ...prev, [unit.id]: updated };
        }
        return prev;
      });
    });
  }, [tacticalUnits]);

  const activeUnit = useMemo(() => {
    return tacticalUnits.find(u => u.name === internalSelectedUnit) || null;
  }, [tacticalUnits, internalSelectedUnit]);

  // Nearest hotspot calculation for the selected unit
  const nearestHotspot = useMemo(() => {
    if (!activeUnit) return null;
    let minDistance: number | null = null;
    let nearest: typeof FRONTIER_HOTSPOTS[0] | null = null;

    FRONTIER_HOTSPOTS.forEach(spot => {
      const dist = calculateDistanceKm(activeUnit.coordinates, spot.coords);
      if (dist !== null && (minDistance === null || dist < minDistance)) {
        minDistance = dist;
        nearest = spot;
      }
    });

    return nearest && minDistance !== null ? { spot: nearest, distanceKm: minDistance } : null;
  }, [activeUnit]);

  const handleSelect = (unitName: string) => {
    setInternalSelectedUnit(prev => (prev === unitName ? null : unitName));
    if (onSelectUnit) {
      onSelectUnit(unitName);
    }
  };

  return (
    <div className="bg-[#070b12] border border-[#1a2333] rounded-xl overflow-hidden shadow-2xl flex flex-col text-left">
      {/* Top Header */}
      <div className="bg-[#0b101c] border-b border-[#1a2333] p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Compass className="w-4 h-4 animate-spin" style={{ animationDuration: '15s' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                {title}
              </h3>
              <span className="flex items-center gap-1 text-[9px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-bold uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                ENLACE SATELITAL ACTIVO
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              {tacticalUnits.length} Unidades en red // Posicionamiento GNSS continuo
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Layer toggles */}
          <div className="flex bg-[#121826] border border-[#1e2738] rounded-lg p-0.5 text-[9px] font-mono">
            <button
              type="button"
              onClick={() => setActiveLayer('ALL')}
              className={`px-2 py-1 rounded transition-colors ${
                activeLayer === 'ALL' ? 'bg-emerald-500 text-black font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              TODOS
            </button>
            <button
              type="button"
              onClick={() => setActiveLayer('UNITS_ONLY')}
              className={`px-2 py-1 rounded transition-colors ${
                activeLayer === 'UNITS_ONLY' ? 'bg-emerald-500 text-black font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              PATRULLAS
            </button>
            <button
              type="button"
              onClick={() => setActiveLayer('ALERTS_ONLY')}
              className={`px-2 py-1 rounded transition-colors ${
                activeLayer === 'ALERTS_ONLY' ? 'bg-orange-500 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              ALERTAS S-2
            </button>
          </div>

          <div className="flex items-center gap-1 text-[10px] font-mono bg-[#121826] border border-[#1e2738] px-2 py-1 rounded text-slate-300">
            <span>ZOOM:</span>
            <button
              type="button"
              onClick={() => setRadarZoom(z => Math.max(0.8, z - 0.2))}
              className="px-1.5 hover:text-white cursor-pointer font-bold"
            >
              -
            </button>
            <span className="text-emerald-400 font-bold">{Math.round(radarZoom * 100)}%</span>
            <button
              type="button"
              onClick={() => setRadarZoom(z => Math.min(1.6, z + 0.2))}
              className="px-1.5 hover:text-white cursor-pointer font-bold"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Main Container: Split into Radar View and Telemetry Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 relative">
        {/* Left / Center: Interactive SVG Tactical Radar */}
        <div className="lg:col-span-8 bg-[#050810] relative flex items-center justify-center overflow-hidden border-b lg:border-b-0 lg:border-r border-[#1a2333]">
          {/* Radial radar grid background */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.03)_0%,transparent_75%)] pointer-events-none" />

          {/* Sweep visual overlay */}
          <div
            className="absolute inset-0 pointer-events-none transition-transform"
            style={{
              background: `conic-gradient(from ${sweepAngle}deg at 50% 50%, rgba(16, 185, 129, 0.12) 0deg, transparent 45deg, transparent 360deg)`
            }}
          />

          <svg
            className="w-full h-full select-none"
            style={{ height, transform: `scale(${radarZoom})`, transformOrigin: 'center' }}
            viewBox="0 0 500 400"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Concentric distance rings */}
            <circle cx="250" cy="200" r="60" stroke="rgba(16, 185, 129, 0.1)" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx="250" cy="200" r="120" stroke="rgba(16, 185, 129, 0.08)" strokeWidth="1" strokeDasharray="4 4" />
            <circle cx="250" cy="200" r="180" stroke="rgba(16, 185, 129, 0.05)" strokeWidth="1" />

            {/* Crosshairs */}
            <line x1="250" y1="10" x2="250" y2="390" stroke="rgba(16, 185, 129, 0.1)" strokeWidth="1" />
            <line x1="10" y1="200" x2="490" y2="200" stroke="rgba(16, 185, 129, 0.1)" strokeWidth="1" />

            {/* Tactical grid */}
            <path
              d="M 50 0 V 400 M 100 0 V 400 M 150 0 V 400 M 200 0 V 400 M 300 0 V 400 M 350 0 V 400 M 400 0 V 400 M 450 0 V 400"
              stroke="rgba(255, 255, 255, 0.02)"
              strokeWidth="1"
            />
            <path
              d="M 0 50 H 500 M 0 100 H 500 M 0 150 H 500 M 0 250 H 500 M 0 300 H 500 M 0 350 H 500"
              stroke="rgba(255, 255, 255, 0.02)"
              strokeWidth="1"
            />

            {/* Simulated International Border Line */}
            <path
              d="M 90 40 Q 150 140 180 200 T 320 280 T 440 370"
              stroke="rgba(244, 63, 94, 0.45)"
              strokeWidth="2.5"
              strokeDasharray="6 4"
            />
            <text x="35" y="60" fill="rgba(244, 63, 94, 0.4)" fontSize="8" fontFamily="monospace" fontWeight="bold">
              LIM. FRONTERIZO INTERNACIONAL
            </text>

            {/* Frontier Critical Hotspots */}
            {FRONTIER_HOTSPOTS.map(spot => {
              const pos = projectToMap(spot.coords);
              return (
                <g key={spot.id} className="cursor-pointer group">
                  <circle cx={pos.x} cy={pos.y} r="3" fill="#f43f5e" opacity="0.8" />
                  <circle cx={pos.x} cy={pos.y} r="7" stroke="#f43f5e" strokeWidth="0.8" opacity="0.3" />
                  <text
                    x={pos.x + 6}
                    y={pos.y + 3}
                    fill="#94a3b8"
                    fontSize="7"
                    fontFamily="monospace"
                    className="group-hover:fill-white"
                  >
                    {spot.name}
                  </text>
                </g>
              );
            })}

            {/* Active Raw Detection Alerts from Órganos de Búsqueda S-2 */}
            {(activeLayer === 'ALL' || activeLayer === 'ALERTS_ONLY') &&
              rawAlerts.map(alert => {
                const pos = projectToMap(alert.coordinates);
                const isPending = alert.status === 'PENDING';
                return (
                  <g key={alert.id} className="cursor-pointer">
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={isPending ? '9' : '5'}
                      fill="none"
                      stroke="#f97316"
                      strokeWidth="1"
                      className={isPending ? 'animate-ping' : ''}
                      style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}
                    />
                    <polygon
                      points={`${pos.x},${pos.y - 5} ${pos.x + 5},${pos.y + 4} ${pos.x - 5},${pos.y + 4}`}
                      fill="#f97316"
                    />
                    <text
                      x={pos.x + 8}
                      y={pos.y + 3}
                      fill="#f97316"
                      fontSize="7.5"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {alert.sourceType} ({alert.sourceName.slice(0, 10)})
                    </text>
                  </g>
                );
              })}

            {/* Patrol Units & Breadcrumbs Trail */}
            {(activeLayer === 'ALL' || activeLayer === 'UNITS_ONLY') &&
              tacticalUnits.map((unit, idx) => {
                const pos = projectToMap(unit.coordinates, idx);
                const isSelected = internalSelectedUnit === unit.name;
                const isIntercepting = unit.status === 'INTERCEPTING';
                const isPatrolling = unit.status === 'PATROLLING';
                const isStationary = unit.status === 'STATIONARY';

                const unitColor = isIntercepting ? '#3b82f6' : isPatrolling ? '#10b981' : isStationary ? '#eab308' : '#64748b';

                // Breadcrumb history trail for this unit
                const history = breadcrumbHistory[unit.id] || [];

                return (
                  <g key={unit.id} onClick={() => handleSelect(unit.name)} className="cursor-pointer group">
                    {/* Render trajectory trail */}
                    {history.length > 1 && (
                      <polyline
                        points={history.map(h => `${h.x},${h.y}`).join(' ')}
                        fill="none"
                        stroke={unitColor}
                        strokeWidth="1.2"
                        strokeDasharray="2 2"
                        opacity="0.4"
                      />
                    )}

                    {/* Outer pulsing ring for moving units */}
                    {(isPatrolling || isIntercepting) && (
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r="14"
                        fill="none"
                        stroke={unitColor}
                        strokeWidth="1"
                        strokeDasharray="2 2"
                        className="animate-spin"
                        style={{ transformOrigin: `${pos.x}px ${pos.y}px`, animationDuration: '6s' }}
                      />
                    )}

                    {/* Selection highlight box */}
                    {isSelected && (
                      <>
                        <circle cx={pos.x} cy={pos.y} r="18" fill="none" stroke="#38bdf8" strokeWidth="1.5" className="animate-pulse" />
                        <rect
                          x={pos.x - 12}
                          y={pos.y - 12}
                          width="24"
                          height="24"
                          fill="rgba(56, 189, 248, 0.08)"
                          stroke="#38bdf8"
                          strokeWidth="1"
                        />
                      </>
                    )}

                    {/* Unit Directional Marker */}
                    <circle cx={pos.x} cy={pos.y} r="5" fill={unitColor} />
                    <polygon
                      points={`${pos.x},${pos.y - 8} ${pos.x + 5},${pos.y + 4} ${pos.x},${pos.y + 1} ${pos.x - 5},${pos.y + 4}`}
                      fill={unitColor}
                    />

                    {/* Unit Label & Live Coordinates */}
                    <text
                      x={pos.x + 10}
                      y={pos.y - 2}
                      fill={isSelected ? '#ffffff' : unitColor}
                      fontSize="8.5"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {unit.name}
                    </text>
                    <text
                      x={pos.x + 10}
                      y={pos.y + 8}
                      fill="#94a3b8"
                      fontSize="6.5"
                      fontFamily="monospace"
                    >
                      {unit.coordinates.slice(0, 16)}...
                    </text>
                  </g>
                );
              })}
          </svg>

          {/* Live HUD overlay on bottom left */}
          <div className="absolute bottom-3 left-3 bg-[#080d1a]/90 backdrop-blur-md border border-[#1e2738] p-2.5 rounded-lg text-[9px] font-mono space-y-1 shadow-lg text-left">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-[#10b981] rounded-full inline-block animate-pulse" />
              <span className="text-white font-bold">Patrullas Activas ({tacticalUnits.filter(u => u.status !== 'OFFLINE').length})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-[#3b82f6] rounded-full inline-block" />
              <span className="text-slate-300">En Interdicción Directa</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-[#f97316] rounded-full inline-block" />
              <span className="text-slate-300">Detección Órgano S-2</span>
            </div>
          </div>

          {/* Selected unit focus pill on top right */}
          {activeUnit && (
            <div className="absolute top-3 right-3 bg-[#0c1322]/95 backdrop-blur-md border border-cyan-500/40 p-3 rounded-lg text-xs font-mono shadow-2xl animate-fade-in text-left max-w-xs">
              <div className="flex items-center justify-between border-b border-[#1e2738] pb-1.5 mb-2">
                <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
                  <Crosshair className="w-3.5 h-3.5 animate-pulse" />
                  <span>{activeUnit.name}</span>
                </div>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold">
                  {activeUnit.status}
                </span>
              </div>
              <div className="space-y-1 text-[10px] text-slate-300">
                <p>
                  <span className="text-slate-500">COORD:</span>{' '}
                  <b className="text-white font-mono">{activeUnit.coordinates}</b>
                </p>
                <p>
                  <span className="text-slate-500">COMANDANTE:</span> {activeUnit.commander || 'Cmdte. Terreno'}
                </p>
                <p>
                  <span className="text-slate-500">EFECTIVOS:</span> {activeUnit.personnel} Operadores S-2
                </p>
                {nearestHotspot && (
                  <p className="text-cyan-300 font-bold">
                    <span>HITO MÁS CERCANO:</span> {nearestHotspot.spot.name} a {nearestHotspot.distanceKm} km
                  </p>
                )}
                <p className="text-slate-400 text-[9px] pt-1">
                  Último reporte GNSS: <span className="text-emerald-400">{activeUnit.lastReportTime}</span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Tactical Units Real-Time Telemetry List */}
        <div className="lg:col-span-4 bg-[#0a0f1d] p-4 flex flex-col justify-between space-y-3">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#1a2333] pb-2">
              <div className="flex items-center gap-2 text-white text-xs font-mono font-bold">
                <Navigation className="w-4 h-4 text-emerald-400" />
                <span>ESTADO DE PATRULLAS (TELEMETRÍA)</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 font-bold">
                TIEMPO REAL
              </span>
            </div>

            {/* Scrollable list of units */}
            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {tacticalUnits.length === 0 ? (
                <div className="text-center py-8 text-xs font-mono text-slate-500">
                  No hay patrullas registradas en la red táctica.
                </div>
              ) : (
                tacticalUnits.map(unit => {
                  const isSelected = internalSelectedUnit === unit.name;
                  const isMoving = unit.status === 'PATROLLING' || unit.status === 'INTERCEPTING';

                  return (
                    <div
                      key={unit.id}
                      onClick={() => handleSelect(unit.name)}
                      className={`p-3 rounded-lg border transition-all cursor-pointer text-left space-y-2 ${
                        isSelected
                          ? 'bg-cyan-950/40 border-cyan-500 shadow-md ring-1 ring-cyan-500/30'
                          : 'bg-[#0f1526] border-[#1e2738] hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isMoving ? 'bg-emerald-400 animate-ping' : 'bg-yellow-400'
                            }`}
                          />
                          <span className="text-xs font-mono font-bold text-white uppercase">
                            {unit.name}
                          </span>
                        </div>
                        <span
                          className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
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

                      {/* Coordinates pill */}
                      <div className="bg-[#080c16] px-2.5 py-1.5 rounded border border-[#182236] flex items-center justify-between text-[10px] font-mono">
                        <span className="text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-emerald-400" />
                          <span>GPS:</span>
                        </span>
                        <span className="text-white font-bold">{unit.coordinates}</span>
                      </div>

                      {/* Telemetry stats */}
                      <div className="grid grid-cols-3 gap-1 text-[9px] font-mono text-slate-400 pt-1">
                        <div>
                          <span>Batería:</span> <b className="text-emerald-400">{unit.battery || 92}%</b>
                        </div>
                        <div>
                          <span>Combust:</span> <b className="text-cyan-400">{unit.fuel || 85}%</b>
                        </div>
                        <div>
                          <span>Efectivos:</span> <b className="text-white">{unit.personnel || 4}</b>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[8px] font-mono text-slate-500 pt-1 border-t border-[#1a2333]">
                        <span>Comando: {unit.commander || 'S-2 Terreno'}</span>
                        <span className="text-emerald-400">{unit.lastReportTime}</span>
                      </div>

                      {/* Google Earth 3D Quick Action */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenGoogleEarth) {
                            onOpenGoogleEarth(unit);
                          }
                        }}
                        className="w-full bg-[#0a1628] hover:bg-[#112440] border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 hover:text-white text-[9px] font-mono py-1 px-2 rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        title={`Visualizar ${unit.name} en Google Earth 3D en tiempo real`}
                      >
                        <Globe className="w-3 h-3 text-cyan-400" />
                        <span>Google Earth 3D ({unit.coordinates.split(' ')[0]})</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
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
