/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AutomatedOrder, Clan, ActionableIntel, TacticalUnit } from '../types';
import { Shield, Zap, TrendingUp, AlertTriangle, Play, MapPin, Send, Eye, RefreshCw, Layers, CheckCircle } from 'lucide-react';

interface StrategicViewProps {
  activeOrders: AutomatedOrder[];
  clans: Clan[];
  actionableIntel: ActionableIntel[];
  tacticalUnits: TacticalUnit[];
  onCreateOrder: (order: AutomatedOrder) => void;
  onCancelOrder: (id: string) => void;
  onArchiveIntel: (id: string) => void;
}

// Helper to parse DMS (Degrees, Minutes, Seconds) or decimal coordinates
function parseCoordinates(coordStr: string): { lat: number; lon: number } | null {
  if (!coordStr) return null;
  
  // Matches e.g. 19°13'10"S 68°35'50"W
  const dmsRegex = /(\d+)°(\d+)'(\d+)"?([NSns])\s+(\d+)°(\d+)'(\d+)"?([WEweOo])/;
  const matches = coordStr.match(dmsRegex);
  if (matches) {
    const latDeg = parseFloat(matches[1]);
    const latMin = parseFloat(matches[2]);
    const latSec = parseFloat(matches[3]);
    const latHem = matches[4].toUpperCase();

    const lonDeg = parseFloat(matches[5]);
    const lonMin = parseFloat(matches[6]);
    const lonSec = parseFloat(matches[7]);
    const lonHem = matches[8].toUpperCase();

    let lat = latDeg + latMin / 60 + latSec / 3600;
    if (latHem === 'S') lat = -lat;

    let lon = lonDeg + lonMin / 60 + lonSec / 3600;
    if (lonHem === 'W' || lonHem === 'O') lon = -lon;

    return { lat, lon };
  }

  // Matches decimal: e.g. "-19.2194 -68.5972" or "-19.2194, -68.5972"
  const cleanStr = coordStr.replace(/,/g, ' ').trim();
  const parts = cleanStr.split(/\s+/);
  if (parts.length >= 2) {
    const lat = parseFloat(parts[0]);
    const lon = parseFloat(parts[1]);
    if (!isNaN(lat) && !isNaN(lon)) {
      return { lat, lon };
    }
  }

  return null;
}

// Maps parsed lat/lon into the 500x400 SVG box
const getUnitMapPosition = (coordStr: string, idx: number) => {
  const parsed = parseCoordinates(coordStr);
  if (!parsed) {
    // Elegant fallback layout
    const x = 160 + idx * 110;
    const y = 130 + idx * 80;
    return { x, y };
  }

  // Define geographical boundaries of interest (northern/southern border sector)
  const latMin = -21.5; // Southernmost
  const latMax = -19.0; // Northernmost
  const lonMin = -68.8; // Westernmost
  const lonMax = -68.0; // Easternmost

  // Convert to percentage and scale inside [80, 420] for X and [80, 320] for Y
  let x = 80 + ((parsed.lon - lonMin) / (lonMax - lonMin)) * 340;
  let y = 320 - ((parsed.lat - latMin) / (latMax - latMin)) * 240;

  // Protect against edge overflow
  x = Math.max(40, Math.min(460, x));
  y = Math.max(40, Math.min(360, y));

  return { x, y };
};

export default function StrategicView({
  activeOrders = [],
  clans = [],
  actionableIntel = [],
  tacticalUnits = [],
  onCreateOrder,
  onCancelOrder,
  onArchiveIntel
}: StrategicViewProps) {
  const [selectedIntelId, setSelectedIntelId] = useState<string>('');
  const [codeName, setCodeName] = useState<string>('');
  const [assignedUnit, setAssignedUnit] = useState<string>('');
  const [customObjective, setCustomObjective] = useState<string>('');
  const [activeHotspot, setActiveHotspot] = useState<string | null>(null);

  // Auto-fill forms when an actionable intelligence is selected
  const handleIntelChange = (id: string) => {
    setSelectedIntelId(id);
    const intel = actionableIntel.find(i => i.id === id);
    if (intel) {
      setCodeName(`OP_${intel.targetClan.toUpperCase().replace(/\s+/g, '_')}_${Math.floor(100 + Math.random() * 900)}`);
      setCustomObjective(`Interceptar operaciones en ${intel.coordinates}. Medida de acción: ${intel.recommendedAction}`);
      
      // Auto assign patrol with nearest status if possible
      setAssignedUnit(tacticalUnits[0]?.name || 'Patrulla Delta-3');
    } else {
      setCodeName('');
      setCustomObjective('');
      setAssignedUnit('');
    }
  };

  const handleEmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeName || !assignedUnit) return;

    const intelObj = actionableIntel.find(i => i.id === selectedIntelId);
    
    const newOrder: AutomatedOrder = {
      id: `ooa-${Math.floor(100 + Math.random() * 900)}`,
      intelId: selectedIntelId || 'manual',
      codeName,
      issuer: 'CEO-LCC Gral. J. Mendoza',
      assignedUnit,
      objective: customObjective || 'Control táctico de la ruta fronteriza.',
      coordinates: intelObj?.coordinates || '19°13\'00"S 68°35\'00"W',
      status: 'ISSUED',
      timestamp: new Date().toISOString(),
      updates: ['Orden inyectada automáticamente desde Mando Estratégico (CEO-LCC).']
    };

    onCreateOrder(newOrder);
    
    // Reset form
    setSelectedIntelId('');
    setCodeName('');
    setAssignedUnit('');
    setCustomObjective('');
  };

  const approvedIntel = actionableIntel.filter(i => i.status === 'APPROVED');

  // Vector Border Map Hotspots representation
  const mapHotspots = [
    { id: '1', name: 'Sector Colchane', x: 220, y: 110, threat: 'HIGH', coordinates: '19°14\'32"S 68°37\'15"W' },
    { id: '2', name: 'Salar de Coipasa', x: 250, y: 190, threat: 'MEDIUM', coordinates: '19°12\'05"S 68°36\'40"W' },
    { id: '3', name: 'Paso Pisiga', x: 300, y: 140, threat: 'MEDIUM', coordinates: '19°35\'20"S 68°42\'10"W' },
    { id: '4', name: 'Hito 14 Border', x: 180, y: 260, threat: 'CRITICAL', coordinates: '20°05\'44"S 68°29\'10"W' },
    { id: '5', name: 'Sector Ollagüe', x: 120, y: 320, threat: 'HIGH', coordinates: '21°10\'12"S 68°15\'22"W' }
  ];

  return (
    <div className="space-y-6">
      {/* KPI Tiles row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-4 flex items-center gap-4 shadow-md">
          <div className="p-3 bg-[#3b82f6]/10 text-[#3b82f6] rounded">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[#888] text-xs font-mono">INTEGRIDAD FRONTERIZA</p>
            <p className="text-2xl font-bold text-white font-sans mt-0.5">94.8%</p>
            <span className="text-[10px] text-[#10b981] font-mono flex items-center gap-1 mt-0.5">
              ▲ +0.5% (Últimas 24h)
            </span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-4 flex items-center gap-4 shadow-md">
          <div className="p-3 bg-[#10b981]/10 text-[#10b981] rounded">
            <Zap className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <p className="text-[#888] text-xs font-mono">ÓRDENES ACTIVAS (OOA)</p>
            <p className="text-2xl font-bold text-white font-sans mt-0.5">
              {activeOrders.filter(o => o.status !== 'COMPLETED' && o.status !== 'CANCELLED').length}
            </p>
            <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
              Enrutadas en tiempo real
            </span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-4 flex items-center gap-4 shadow-md">
          <div className="p-3 bg-[#f97316]/10 text-[#f97316] rounded">
            <AlertTriangle className="w-6 h-6 text-[#f97316]" />
          </div>
          <div>
            <p className="text-[#888] text-xs font-mono">CLANES MONITOREADOS</p>
            <p className="text-2xl font-bold text-white font-sans mt-0.5">{clans.length}</p>
            <span className="text-[10px] text-[#f43f5e] font-mono flex items-center gap-1 mt-0.5">
              ● {clans.filter(c => c.threatLevel === 'CRITICAL').length} Amenazas Críticas
            </span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-4 flex items-center gap-4 shadow-md">
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[#888] text-xs font-mono">ÍNDICE DE FIABILIDAD</p>
            <p className="text-2xl font-bold text-white font-sans mt-0.5">A-1 / B-2</p>
            <span className="text-[10px] text-purple-400 font-mono mt-0.5 block">
              Fusión IMINT/HUMINT activa
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Vector Tactical Map */}
        <div className="lg:col-span-7 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#3b82f6] animate-ping" />
                <h3 className="text-sm font-mono font-bold text-white uppercase">
                  Centro de Situación // Mapa Vectorial de la Frontera
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[#666]">PROYECCIÓN TÁCTICA 2D</span>
            </div>

            {/* Simulated Vector Cyber Map */}
            <div className="relative aspect-[4/3] bg-[#111] border border-[#222] rounded-lg overflow-hidden flex items-center justify-center">
              {/* Radar sweeps animation overlay */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.02)_0%,transparent_70%)] animate-pulse pointer-events-none" />
              
              <svg className="w-full h-full text-[#333]" viewBox="0 0 500 400" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Gridlines */}
                <path d="M0 100 H500 M0 200 H500 M0 300 H500 M100 0 V400 M200 0 V400 M300 0 V400 M400 0 V400" stroke="rgba(255,255,255,0.015)" strokeWidth="1" />
                
                {/* Border line - Simulated borderline */}
                <path d="M80 50 C 180 120, 160 210, 310 260 C 390 280, 420 380, 480 390" stroke="rgba(244, 63, 94, 0.4)" strokeWidth="2.5" strokeDasharray="5 5" />
                
                {/* Country Labels */}
                <text x="50" y="30" fill="rgba(148,163,184,0.15)" fontSize="9" fontFamily="monospace">ESPACIO SOBERANO EXTRANJERO</text>
                <text x="320" y="370" fill="rgba(59,130,246,0.3)" fontSize="9" fontFamily="monospace" fontWeight="bold">SITUACIÓN LCC NACIONAL</text>

                {/* Radar Circle over selected active order or alert */}
                {activeHotspot && (() => {
                  const spot = mapHotspots.find(h => h.id === activeHotspot);
                  if (!spot) return null;
                  return (
                    <circle 
                      cx={spot.x} 
                      cy={spot.y} 
                      r="40" 
                      fill="none" 
                      stroke="rgba(244, 63, 94, 0.2)" 
                      strokeWidth="1" 
                      className="animate-ping"
                      style={{ transformOrigin: 'center' }}
                    />
                  );
                })()}

                {/* Draw active tactical units as moving triangles */}
                {tacticalUnits.map((unit, idx) => {
                  const { x, y } = getUnitMapPosition(unit.coordinates, idx);
                  return (
                    <g key={unit.id} className="cursor-pointer">
                      <polygon points={`${x},${y-7} ${x-6},${y+5} ${x+6},${y+5}`} fill="#10b981" />
                      <circle cx={x} cy={y} r="12" stroke="#10b981" strokeWidth="1" strokeDasharray="2 2" fill="none" className="animate-pulse" />
                      <text x={x + 10} y={y + 3} fill="#10b981" fontSize="8" fontFamily="monospace" fontWeight="bold">{unit.name}</text>
                    </g>
                  );
                })}

                {/* Render interactive Hotspots */}
                {mapHotspots.map(spot => {
                  const isSelected = activeHotspot === spot.id;
                  const color = spot.threat === 'CRITICAL' ? '#f43f5e' : spot.threat === 'HIGH' ? '#f97316' : '#eab308';
                  return (
                    <g 
                      key={spot.id} 
                      onClick={() => setActiveHotspot(isSelected ? null : spot.id)}
                      className="cursor-pointer group"
                    >
                      {/* Outer blink */}
                      <circle cx={spot.x} cy={spot.y} r={isSelected ? '12' : '8'} fill="none" stroke={color} strokeWidth="1.5" className={isSelected ? 'animate-pulse' : 'group-hover:animate-ping'} />
                      {/* Inner point */}
                      <circle cx={spot.x} cy={spot.y} r="4" fill={color} />
                      <text 
                        x={spot.x + 12} 
                        y={spot.y + 4} 
                        fill={isSelected ? '#ffffff' : '#888'} 
                        fontSize="9" 
                        fontFamily="monospace"
                        fontWeight={isSelected ? 'bold' : 'normal'}
                      >
                        {spot.name}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Map HUD Legend */}
              <div className="absolute bottom-3 left-3 bg-[#0a0a0a]/90 border border-[#1a1a1a] p-2 rounded text-[9px] font-mono space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-0.5 bg-[#f43f5e] inline-block" />
                  <span className="text-[#888]">Línea de Límite Fronterizo</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-[#3b82f6] inline-block rotate-45" />
                  <span className="text-[#888]">Patrullas de Terreno Activas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#f43f5e] inline-block" />
                  <span className="text-[#888]">Hitos/Puntos Críticos de Cruce</span>
                </div>
              </div>

              {/* Selected hotspot HUD detail */}
              {activeHotspot && (
                <div className="absolute top-3 right-3 bg-[#0a0a0a]/95 border border-red-500/20 p-3 rounded-lg text-xs font-mono max-w-[200px] shadow-lg animate-fade-in">
                  {(() => {
                    const spot = mapHotspots.find(h => h.id === activeHotspot);
                    return spot ? (
                      <div className="space-y-1.5 text-left">
                        <p className="font-bold text-white border-b border-[#1a1a1a] pb-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#f43f5e]" />
                          {spot.name}
                        </p>
                        <p className="text-[10px] text-[#888]">COORD: {spot.coordinates}</p>
                        <p className="text-[10px] flex items-center gap-1 text-[#888]">
                          AMENAZA: 
                          <span className={spot.threat === 'CRITICAL' ? 'text-[#f43f5e] font-bold' : spot.threat === 'HIGH' ? 'text-[#f97316]' : 'text-yellow-500'}>
                            {spot.threat}
                          </span>
                        </p>
                        <button 
                          onClick={() => {
                            // Find matching actionable intel to seed form
                            const match = actionableIntel.find(i => i.coordinates === spot.coordinates);
                            if (match) {
                              handleIntelChange(match.id);
                            } else {
                              setCodeName(`OP_${spot.name.toUpperCase().replace(/\s+/g, '_')}_AUTO`);
                              setCustomObjective(`Establecer puesto táctico en ${spot.coordinates} para mitigar la ruta clandestina.`);
                              setAssignedUnit('Patrulla Delta-3');
                            }
                          }}
                          className="w-full text-center bg-[#3b82f6]/20 border border-[#3b82f6]/40 text-[9px] hover:bg-[#3b82f6] text-white rounded py-1 mt-1 font-bold transition-colors"
                        >
                          ELEGIR COMO OBJETIVO OOA
                        </button>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 bg-[#111] p-3 border border-[#1a1a1a] rounded-lg flex items-center justify-between text-xs font-mono">
            <span className="text-[#666]">Última Actualización Satelital:</span>
            <span className="text-[#10b981]">Canal Seguro 4-E (Sincronizado)</span>
          </div>
        </div>

        {/* Right Column: Automated Operations Hub (OOA) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Form: Emit Automated Operations Order (OOA) */}
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-5 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-[#3b82f6]" />
            
            <h3 className="text-sm font-mono font-bold text-white border-b border-[#1a1a1a] pb-3 mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#3b82f6]" />
              EMISIÓN DE ORDEN DE OPERACIÓN AUTOMATIZADA
            </h3>

            <form onSubmit={handleEmitOrder} className="space-y-4 text-left">
              {/* Intel Selector */}
              <div>
                <label className="block text-[10px] font-mono text-[#666] uppercase mb-1 font-bold">
                  Seleccionar Inteligencia Validada (CFI)
                </label>
                {approvedIntel.length === 0 ? (
                  <div className="bg-[#111] text-[#666] text-xs font-mono p-3 rounded border border-[#222] text-center">
                    No hay Inteligencia Accionable pendiente de aprobación. Configure una en el Nivel Operativo.
                  </div>
                ) : (
                  <select
                    value={selectedIntelId}
                    onChange={(e) => handleIntelChange(e.target.value)}
                    required
                    className="w-full bg-[#111] text-[#e0e0e0] border border-[#222] rounded px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#3b82f6]"
                  >
                    <option value="">-- Seleccionar Reporte Validado --</option>
                    {approvedIntel.map(intel => (
                      <option key={intel.id} value={intel.id}>
                        {intel.title} ({intel.targetClan})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Target codeName & Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-[#666] uppercase mb-1 font-bold">
                    Nombre en Clave (OOA)
                  </label>
                  <input
                    type="text"
                    required
                    value={codeName}
                    onChange={(e) => setCodeName(e.target.value)}
                    placeholder="e.g. OP_HALCON_ALFA"
                    className="w-full bg-[#111] text-[#e0e0e0] border border-[#222] rounded px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#3b82f6]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-[#666] uppercase mb-1 font-bold">
                    Unidad de Terreno Asignada
                  </label>
                  <select
                    value={assignedUnit}
                    onChange={(e) => setAssignedUnit(e.target.value)}
                    required
                    className="w-full bg-[#111] text-[#e0e0e0] border border-[#222] rounded px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#3b82f6]"
                  >
                    <option value="">-- Unidad --</option>
                    {tacticalUnits.map(unit => (
                      <option key={unit.id} value={unit.name}>
                        {unit.name} ({unit.status})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Objectives */}
              <div>
                <label className="block text-[10px] font-mono text-[#666] uppercase mb-1 font-bold">
                  Instrucciones de Operación y Objetivos
                </label>
                <textarea
                  rows={3}
                  value={customObjective}
                  onChange={(e) => setCustomObjective(e.target.value)}
                  placeholder="Instrucciones tácticas para intercepción rápida, bloqueo o patrullaje nocturno..."
                  className="w-full bg-[#111] text-[#e0e0e0] border border-[#222] rounded px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#3b82f6] resize-none"
                />
              </div>

              {/* Submit */}
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={!selectedIntelId}
                  onClick={() => {
                    if (selectedIntelId) {
                      onArchiveIntel(selectedIntelId);
                      // Reset form workspace
                      setSelectedIntelId('');
                      setCodeName('');
                      setAssignedUnit('');
                      setCustomObjective('');
                    }
                  }}
                  className="flex-1 bg-[#111] hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-[#888] hover:text-white border border-[#222] hover:border-slate-700 text-xs font-mono py-2.5 rounded transition-all cursor-pointer font-bold uppercase"
                >
                  Archivar Inteligencia
                </button>
                <button
                  type="submit"
                  disabled={!codeName || !assignedUnit}
                  className="flex-1 bg-[#3b82f6] hover:bg-[#3b82f6]/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-mono font-black text-xs py-2.5 px-3 rounded flex items-center justify-center gap-1.5 transition-all active:scale-[0.99] shadow-[0_0_15px_rgba(59,130,246,0.25)] uppercase cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Emitir Orden de Operación</span>
                </button>
              </div>
            </form>
          </div>

          {/* List of Active OOAs with Cancel options */}
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-5 shadow-lg flex-1">
            <h3 className="text-sm font-mono font-bold text-white border-b border-[#1a1a1a] pb-3 mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#3b82f6]" />
                ÓRDENES EN EJECUCIÓN (OOA)
              </span>
              <span className="text-[10px] bg-[#3b82f6]/10 text-[#3b82f6] px-2 py-0.5 rounded font-mono">
                {activeOrders.length} EMITIDAS
              </span>
            </h3>

            {activeOrders.length === 0 ? (
              <div className="text-center py-6 text-[#666] text-xs font-mono">
                No hay órdenes de operación activas circulando en la red.
              </div>
            ) : (
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {activeOrders.map(order => (
                  <div key={order.id} className="bg-[#111] border border-[#222] p-3 rounded space-y-2 relative text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-[#3b82f6]">
                        {order.codeName}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                        order.status === 'ISSUED' ? 'bg-[#f97316]/10 text-[#f97316]' :
                        order.status === 'RECEIVED' ? 'bg-[#3b82f6]/10 text-[#3b82f6]' :
                        order.status === 'IN_PROGRESS' ? 'bg-yellow-500/10 text-yellow-500' :
                        'bg-[#10b981]/10 text-[#10b981]'
                      }`}>
                        {order.status}
                      </span>
                    </div>

                    <p className="text-[11px] text-[#aaa] font-sans line-clamp-2 leading-relaxed">
                      {order.objective}
                    </p>

                    <div className="grid grid-cols-2 text-[9px] font-mono text-[#666] pt-1.5 border-t border-[#1a1a1a]">
                      <div>UNIDAD: <span className="text-white">{order.assignedUnit}</span></div>
                      <div>COORD: <span className="text-white">{order.coordinates}</span></div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[9px] font-mono text-[#444]">
                        {new Date(order.timestamp).toLocaleTimeString()}
                      </span>
                      {order.status !== 'COMPLETED' && (
                        <button
                          onClick={() => onCancelOrder(order.id)}
                          className="text-[9px] font-mono text-red-400 hover:text-red-300 underline transition-colors cursor-pointer"
                        >
                          Abortar Operación
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
