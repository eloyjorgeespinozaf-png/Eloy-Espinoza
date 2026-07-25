/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { RawAlert, Clan, ActionableIntel } from '../types';
import { Database, Eye, Check, AlertTriangle, Plus, Shield, Search, TrendingUp, Users, Radio, Map } from 'lucide-react';

interface OperationalViewProps {
  rawAlerts: RawAlert[];
  clans: Clan[];
  actionableIntel: ActionableIntel[];
  onPromoteToIntel: (intel: ActionableIntel, updatedReliability?: 'A' | 'B' | 'C' | 'D', updatedCertainty?: '1' | '2' | '3' | '4', routeId?: string) => void;
  onUpdateAlertStatus: (id: string, status: 'PROCESSED' | 'DISMISSED') => void;
}

export default function OperationalView({
  rawAlerts = [],
  clans = [],
  actionableIntel = [],
  onPromoteToIntel,
  onUpdateAlertStatus
}: OperationalViewProps) {
  const [selectedAlertId, setSelectedAlertId] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [targetClan, setTargetClan] = useState<string>('');
  const [recommendedAction, setRecommendedAction] = useState<string>('');
  const [threatScore, setThreatScore] = useState<number>(75);
  const [reliability, setReliability] = useState<'A' | 'B' | 'C' | 'D'>('B');
  const [certainty, setCertainty] = useState<'1' | '2' | '3' | '4'>('2');
  const [routeId, setRouteId] = useState<string>('Ruta Colchane');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedClanId, setSelectedClanId] = useState<string | null>(clans[0]?.id || null);

  // When a raw alert is selected, auto-seed the intelligence generation workspace
  const handleAlertSelect = (id: string) => {
    setSelectedAlertId(id);
    const alert = rawAlerts.find(a => a.id === id);
    if (alert) {
      setTitle(`Análisis CFI: Fusión ${alert.sourceType} en ${alert.coordinates}`);
      setReliability(alert.reliability);
      setCertainty(alert.certainty);
      setRouteId(alert.clandestineRouteId || 'Ruta Colchane');
      
      // Try to find matching clan by route
      const currentRoute = alert.clandestineRouteId || 'Ruta Colchane';
      const matchedClan = clans.find(c => c.knownRoutes.includes(currentRoute));
      setTargetClan(matchedClan ? matchedClan.name : clans[0]?.name || '');
      
      setRecommendedAction(`Desplegar fuerza operativa rápida sobre ${currentRoute} para neutralizar transporte furtivo.`);
      
      // Base score depending on reliability of source
      let score = 50;
      if (alert.reliability === 'A') score += 20;
      if (alert.certainty === '1') score += 15;
      setThreatScore(Math.min(100, score));
    }
  };

  const handleCreateIntel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlertId || !title) return;

    const alertObj = rawAlerts.find(a => a.id === selectedAlertId);
    if (!alertObj) return;

    const newIntel: ActionableIntel = {
      id: `intel-${Math.floor(100 + Math.random() * 900)}`,
      rawAlertId: selectedAlertId,
      title,
      threatScore,
      validatedBy: 'CFI Analista Tte. Coronel S. Rojas',
      targetClan,
      recommendedAction,
      coordinates: alertObj.coordinates,
      status: 'APPROVED', // Ready for CEO-LCC
      timestamp: new Date().toISOString()
    };

    onPromoteToIntel(newIntel, reliability, certainty, routeId);

    // Reset workspace
    setSelectedAlertId('');
    setTitle('');
    setTargetClan('');
    setRecommendedAction('');
    setThreatScore(75);
  };

  const filteredClans = clans.filter(clan => 
    clan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    clan.knownRoutes.some(r => r.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const activeClanDetails = clans.find(c => c.id === selectedClanId) || clans[0];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Feed of raw alerts from Search Organs (Órganos de Búsqueda) */}
        <div className="lg:col-span-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#f97316] animate-pulse" />
                <h3 className="text-sm font-mono font-bold text-white uppercase">
                  Alertas No Procesadas
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[#f97316] bg-[#f97316]/10 px-2 py-0.5 rounded">
                Órganos de Búsqueda
              </span>
            </div>

            <p className="text-[#888] text-xs mb-4 font-sans">
              Afluencia de logs crudos listos para verificación analítica (IMINT/HUMINT/SIGINT):
            </p>

            <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
              {rawAlerts.filter(a => a.status === 'PENDING').length === 0 ? (
                <div className="text-center py-10 border border-dashed border-[#1a1a1a] rounded-lg text-[#666] text-xs font-mono">
                  No hay alertas de búsqueda pendientes. Introduzca datos en el nivel táctico.
                </div>
              ) : (
                rawAlerts.filter(a => a.status === 'PENDING').map(alert => (
                  <div 
                    key={alert.id}
                    onClick={() => handleAlertSelect(alert.id)}
                    className={`p-3 rounded-lg border transition-all cursor-pointer text-left ${
                      selectedAlertId === alert.id 
                        ? 'bg-[#f97316]/5 border-[#f97316]' 
                        : 'bg-[#111] border-[#222] hover:border-[#444]'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1.5">
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        alert.sourceType === 'IMINT' ? 'bg-purple-500/10 text-purple-400' :
                        alert.sourceType === 'HUMINT' ? 'bg-[#3b82f6]/10 text-[#3b82f6]' :
                        'bg-teal-500/10 text-teal-400'
                      }`}>
                        {alert.sourceType} // {alert.sourceName}
                      </span>
                      <span className="text-[9px] font-mono text-[#666]">
                        Fiab: {alert.reliability}-{alert.certainty}
                      </span>
                    </div>

                    <p className="text-xs text-[#ccc] font-sans leading-relaxed line-clamp-2">
                      {alert.details}
                    </p>

                    {alert.mediaUrl && (
                      <div className="mt-1.5 flex items-center gap-1 text-[9px] font-mono text-[#10b981]">
                        <span>📷 Evidencia Adjunta</span>
                        {!['multimedia-thermal', 'multimedia-optical', 'multimedia-radar', 'multimedia-satellite'].includes(alert.mediaUrl) && (
                          <span className="text-[8px] bg-[#10b981]/15 text-[#10b981] px-1 rounded font-bold uppercase tracking-wider">Foto de Terreno</span>
                        )}
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2 mt-2 border-t border-[#1a1a1a] text-[9px] font-mono text-[#666]">
                      <span>Ruta: <b className="text-[#888]">{alert.clandestineRouteId || 'No asignada'}</b></span>
                      <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 bg-[#111] p-3 rounded-lg border border-[#1a1a1a] flex justify-between text-[10px] font-mono">
            <span className="text-[#666]">Clasificación de Fiabilidad:</span>
            <span className="text-[#f97316]">Escala de Cooperación A-1</span>
          </div>
        </div>

        {/* Center column: Intelligence Fusion Workshop (Fusión de Datos) */}
        <div className="lg:col-span-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-5 shadow-lg relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#f97316]/5 rounded-full blur-2xl pointer-events-none" />
          
          <h3 className="text-sm font-mono font-bold text-white border-b border-[#1a1a1a] pb-3 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#f97316]" />
            TALLER DE FUSIÓN ANALÍTICA
          </h3>

          {!selectedAlertId ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-20 text-[#888] font-mono text-xs">
              <Eye className="w-8 h-8 text-[#444] mb-2 animate-pulse" />
              <span>Seleccione un registro del panel izquierdo para analizar la fuente y fusionarla con la base de datos táctica.</span>
            </div>
          ) : (
            <form onSubmit={handleCreateIntel} className="space-y-4 text-left">
              <div>
                <label className="block text-[10px] font-mono text-[#666] uppercase mb-1 font-bold">
                  Título de Inteligencia Generada
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#111] text-white border border-[#222] rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-[#f97316]"
                />
              </div>

              {/* Reliability & Certainty Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-[#666] uppercase mb-1 font-bold">
                    [Fiabilidad de la Fuente] *
                  </label>
                  <select
                    value={reliability}
                    onChange={(e) => setReliability(e.target.value as any)}
                    className="w-full bg-[#111] text-white border border-[#222] rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-[#f97316]"
                  >
                    <option value="A">A - Completamente Fiable</option>
                    <option value="B">B - Usualmente Fiable</option>
                    <option value="C">C - Bastante Fiable</option>
                    <option value="D">D - No Fiable</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-[#666] uppercase mb-1 font-bold">
                    [Certeza Información] *
                  </label>
                  <select
                    value={certainty}
                    onChange={(e) => setCertainty(e.target.value as any)}
                    className="w-full bg-[#111] text-white border border-[#222] rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-[#f97316]"
                  >
                    <option value="1">1 - Confirmada por otras fuentes</option>
                    <option value="2">2 - Probable / Coincidente</option>
                    <option value="3">3 - Posible / No confirmada</option>
                    <option value="4">4 - Dudosa / Improbable</option>
                  </select>
                </div>
              </div>

              {/* Route Assignment & Clan Cross Reference */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-[#666] uppercase mb-1 font-bold">
                    [Ruta Clandestina Contrastada] *
                  </label>
                  <select
                    value={routeId}
                    onChange={(e) => {
                      setRouteId(e.target.value);
                      // Update recommended action description when route changes
                      setRecommendedAction(`Desplegar fuerza operativa rápida sobre la zona crítica ${e.target.value} para neutralizar transporte de contrabando.`);
                      // Auto cross-reference clan
                      const matchedClan = clans.find(c => c.knownRoutes.includes(e.target.value));
                      if (matchedClan) setTargetClan(matchedClan.name);
                    }}
                    className="w-full bg-[#111] text-white border border-[#222] rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-[#f97316]"
                  >
                    <option value="Ruta Colchane">Ruta Colchane</option>
                    <option value="Paso Pisiga">Paso Pisiga</option>
                    <option value="Hito 14">Hito 14</option>
                    <option value="Salar de Coipasa">Salar de Coipasa</option>
                    <option value="Ruta Ollagüe">Ruta Ollagüe</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-[#666] uppercase mb-1 font-bold">
                    [Clan Implicado Contraste] *
                  </label>
                  <select
                    value={targetClan}
                    onChange={(e) => setTargetClan(e.target.value)}
                    required
                    className="w-full bg-[#111] text-white border border-[#222] rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-[#f97316]"
                  >
                    {clans.map(clan => (
                      <option key={clan.id} value={clan.name}>
                        {clan.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Threat score & info */}
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-[#666] uppercase mb-1 font-bold">
                    Nivel de Amenaza Estimado (%)
                  </label>
                  <div className="flex items-center bg-[#111] border border-[#222] rounded px-2.5 py-1">
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={threatScore}
                      onChange={(e) => setThreatScore(parseInt(e.target.value))}
                      className="w-full accent-[#f97316] h-1.5 bg-[#222] rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-xs font-mono text-[#f97316] font-bold ml-3 w-10 text-right">{threatScore}%</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-[#666] uppercase mb-1 font-bold">
                  Acción Táctica Recomendada (CFI)
                </label>
                <textarea
                  rows={3}
                  required
                  value={recommendedAction}
                  onChange={(e) => setRecommendedAction(e.target.value)}
                  className="w-full bg-[#111] text-white border border-[#222] rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-[#f97316] resize-none"
                />
              </div>

              {/* Live Media Thumbnail Preview inside Fusion Workspace */}
              {rawAlerts.find(a => a.id === selectedAlertId)?.mediaUrl && (
                <div className="border border-[#222] rounded bg-black p-2 space-y-1.5 text-[9px] font-mono text-[#f97316]">
                  <div className="text-[10px] uppercase font-bold text-gray-400 flex items-center justify-between border-b border-[#222] pb-1">
                    <span>MULTIMEDIA ASOCIADO S-2</span>
                    <span className="text-[#10b981] animate-pulse">● FEED DISPONIBLE</span>
                  </div>
                  <div className="aspect-video relative overflow-hidden bg-zinc-950 rounded flex flex-col justify-between p-2 text-[8px]">
                    <div className="absolute inset-0 bg-radial-gradient from-transparent to-black pointer-events-none" />
                    
                    {rawAlerts.find(a => a.id === selectedAlertId)?.mediaUrl && 
                     !['multimedia-thermal', 'multimedia-optical', 'multimedia-radar', 'multimedia-satellite'].includes(rawAlerts.find(a => a.id === selectedAlertId)?.mediaUrl || '') ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-[#050505]">
                        <img 
                          src={rawAlerts.find(a => a.id === selectedAlertId)?.mediaUrl} 
                          alt="Evidencia de Terreno" 
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : (
                      <>
                        {rawAlerts.find(a => a.id === selectedAlertId)?.mediaUrl === 'multimedia-thermal' && (
                          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-950/60 via-purple-950/60 to-orange-950/50 animate-pulse">
                            <span className="text-[9px] text-orange-400 font-bold uppercase">CAPTURA TÉRMICA ANALIZADA</span>
                          </div>
                        )}
                        {rawAlerts.find(a => a.id === selectedAlertId)?.mediaUrl === 'multimedia-optical' && (
                          <div className="absolute inset-0 flex items-center justify-center bg-emerald-950/60">
                            <span className="text-[9px] text-emerald-400 font-bold uppercase">RESOLUCIÓN DE INFRAESTRUCTURA IR</span>
                          </div>
                        )}
                        {rawAlerts.find(a => a.id === selectedAlertId)?.mediaUrl === 'multimedia-radar' && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.25)_0%,transparent_80%)]">
                            <span className="text-[9px] text-blue-400 font-bold uppercase">PLOTEADO DE RADIOFRECUENCIA</span>
                          </div>
                        )}
                        {rawAlerts.find(a => a.id === selectedAlertId)?.mediaUrl === 'multimedia-satellite' && (
                          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60">
                            <span className="text-[9px] text-purple-400 font-bold uppercase">VÍNCULO SATELITAL ACTIVO</span>
                          </div>
                        )}
                      </>
                    )}
                    
                    <div className="flex justify-between z-10 text-white bg-black/40 px-1 rounded">
                      <span>CFI EXP_INTEL</span>
                      <span>SRC: {rawAlerts.find(a => a.id === selectedAlertId)?.sourceName}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-3 bg-[#111] border border-[#222] rounded text-[11px] font-mono text-[#888] space-y-1">
                <p className="text-[#f97316] font-bold">Resumen de Alerta Cruda:</p>
                <p className="line-clamp-2 text-[10px]">
                  {rawAlerts.find(a => a.id === selectedAlertId)?.details}
                </p>
                <p className="text-[9px] text-[#555]">COORDENADAS: {rawAlerts.find(a => a.id === selectedAlertId)?.coordinates}</p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onUpdateAlertStatus(selectedAlertId, 'DISMISSED');
                    setSelectedAlertId('');
                  }}
                  className="flex-1 bg-[#111] hover:bg-red-950/20 text-[#888] hover:text-red-400 border border-[#222] hover:border-red-900/50 text-xs font-mono py-2 rounded transition-colors cursor-pointer"
                >
                  Descartar Reporte S-2
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#f97316] hover:bg-[#f97316]/90 text-white text-xs font-mono py-2 rounded font-black flex items-center justify-center gap-1.5 transition-all active:scale-[0.99] uppercase cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Validar Reporte S-2</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Right column: Clanes Clandestinos Database (Contraste de Base de Datos de Clanes) */}
        <div className="lg:col-span-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#10b981]" />
                <h3 className="text-sm font-mono font-bold text-white uppercase">
                  Base de Datos de Clanes
                </h3>
              </div>
              <span className="text-[10px] text-[#666] font-mono">REGISTROS S-2</span>
            </div>

            {/* Search Input */}
            <div className="relative mb-4">
              <Search className="w-3.5 h-3.5 text-[#555] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar clan, ruta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#111] border border-[#222] rounded-lg pl-9 pr-4 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#10b981]"
              />
            </div>

            {/* Clan List Grid */}
            <div className="grid grid-cols-2 gap-2 mb-4 max-h-[160px] overflow-y-auto pr-1">
              {filteredClans.map(clan => (
                <div
                  key={clan.id}
                  onClick={() => setSelectedClanId(clan.id)}
                  className={`p-2 rounded border cursor-pointer text-left transition-all ${
                    selectedClanId === clan.id 
                      ? 'bg-[#10b981]/5 border-[#10b981]' 
                      : 'bg-[#111] border-[#222] hover:border-[#444]'
                  }`}
                >
                  <p className="text-xs font-bold text-white truncate font-mono">{clan.name}</p>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[8px] font-mono text-[#666]">{clan.membersCount} integrantes</span>
                    <span className={`text-[8px] font-mono font-bold px-1 rounded ${
                      clan.threatLevel === 'CRITICAL' ? 'bg-[#f43f5e]/10 text-[#f43f5e]' :
                      clan.threatLevel === 'HIGH' ? 'bg-[#f97316]/10 text-[#f97316]' :
                      'bg-yellow-500/10 text-yellow-500'
                    }`}>
                      {clan.threatLevel}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Selected Clan Details panel */}
            {activeClanDetails && (
              <div className="bg-[#111] border border-[#222] rounded-lg p-3 text-left space-y-2 animate-fade-in text-xs font-mono">
                <div className="flex justify-between items-center border-b border-[#222] pb-1.5">
                  <span className="font-bold text-white text-sm">{activeClanDetails.name}</span>
                  <span className="text-[10px] text-[#666]">Última Actividad: {activeClanDetails.lastActive}</span>
                </div>

                <div className="space-y-1">
                  <p className="text-[9px] text-[#666] uppercase font-bold">Rutas Clandestinas Conocidas:</p>
                  <div className="flex flex-wrap gap-1">
                    {activeClanDetails.knownRoutes.map((route, i) => (
                      <span key={i} className="bg-[#050505] text-[#ccc] text-[9px] px-1.5 py-0.5 rounded border border-[#1a1a1a]">
                        {route}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-0.5">
                  <p className="text-[9px] text-[#666] uppercase font-bold">Tácticas Operativas:</p>
                  <p className="text-[#aaa] font-sans text-[11px] leading-relaxed">
                    {activeClanDetails.tactics}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-[9px] text-[#666] uppercase font-bold">Puntos Calientes de Actividad:</p>
                  <div className="flex flex-wrap gap-1">
                    {activeClanDetails.recentHotspots.map((hs, i) => (
                      <span key={i} className="text-[9px] text-[#10b981] flex items-center gap-1 font-bold">
                        ● {hs}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 bg-[#111] p-2 border border-[#1a1a1a] rounded text-[10px] text-[#666] text-left font-sans leading-relaxed">
            * Al cruzar registros con el clan asignado, el algoritmo calcula correlaciones automáticas en base a la ventana temporal histórica de cruces.
          </div>
        </div>
      </div>
    </div>
  );
}
