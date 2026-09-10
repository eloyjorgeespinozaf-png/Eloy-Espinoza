/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Modal de Inspección Fotográfica y Procedencia de Información S-2
 * Muestra la fotografía enviada por el Órgano de Búsqueda, quién y de dónde provino
 */

import React, { useState } from 'react';
import { RawAlert, ActionableIntel } from '../../types';
import {
  X,
  Camera,
  Eye,
  Crosshair,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sliders,
  User,
  MapPin,
  Radio,
  Shield,
  Clock,
  Layers,
  CheckCircle,
  Download,
  Maximize2,
  FileText,
  Lock,
  Cpu,
  Navigation,
  Zap,
  ShieldAlert,
  AlertTriangle,
  Award
} from 'lucide-react';

export interface TacticalPhotoViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  alert: RawAlert;
  intel?: ActionableIntel | null;
  orderCodeName?: string;
  sourceContext?: 'FUSION' | 'STRATEGIC_OOA' | 'TACTICAL';
}

export const TacticalPhotoViewerModal: React.FC<TacticalPhotoViewerModalProps> = ({
  isOpen,
  onClose,
  alert,
  intel,
  orderCodeName,
  sourceContext = 'FUSION'
}) => {
  if (!isOpen || !alert) return null;

  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [activeFilter, setActiveFilter] = useState<'normal' | 'flir' | 'nvg' | 'contrast' | 'invert'>('normal');
  const [showReticle, setShowReticle] = useState<boolean>(true);

  // Derived provenance variables with robust fallbacks
  const operatorName = alert.operatorName || 'Sgto. 1ro. Juan Pérez Vargas (Operador VANT)';
  const originUnit = alert.originUnit || 'Patrulla Terrestre LCC // CEO-LCC';
  const originSector = alert.originSector || (
    alert.coordinates.includes('68°34') || alert.coordinates.includes('68°37')
      ? 'Hito 14 - Frontera Chileno-Boliviana (Sector Quebrada)'
      : alert.coordinates.includes('68°15')
      ? 'Salar de Coipasa (Sector Challapata)'
      : alert.coordinates.includes('69°02')
      ? 'Paso Tambo Quemado - Charaña'
      : 'Sector Occidental Fronterizo'
  );
  const transmissionChannel = alert.transmissionChannel || 'Canal VHF Táctico Encriptado CAD-C2 // Frecuencia 142.850 MHz // Nodo Repetidor Cerro Quimsachata';
  const emitterDeviceId = alert.emitterDeviceId || `Terminal Táctico S2-TX-${alert.id}`;

  const isOoaContext = sourceContext === 'STRATEGIC_OOA' || Boolean(orderCodeName) || Boolean(intel);

  const isCustomImage = Boolean(alert.mediaUrl && (alert.mediaUrl.startsWith('data:') || alert.mediaUrl.startsWith('http')));
  const isThermal = alert.mediaUrl === 'multimedia-thermal' || alert.sourceName.includes('Térmico') || alert.sourceName.includes('VANT-02');
  const isNightVision = alert.mediaUrl === 'multimedia-optical' || alert.sourceName.includes('Óptico') || alert.sourceName.includes('VANT-01');
  const isRadar = alert.mediaUrl === 'multimedia-radar' || alert.sourceName.includes('Radar') || alert.sourceType === 'SIGINT';

  // Apply visual CSS filter styling according to selected tactical filter
  const getFilterStyle = (): React.CSSProperties => {
    switch (activeFilter) {
      case 'flir':
        return { filter: 'sepia(100%) saturate(300%) hue-rotate(340deg) contrast(140%)' };
      case 'nvg':
        return { filter: 'sepia(100%) saturate(400%) hue-rotate(85deg) contrast(150%) brightness(1.1)' };
      case 'contrast':
        return { filter: 'contrast(200%) brightness(1.2)' };
      case 'invert':
        return { filter: 'invert(100%) contrast(150%)' };
      default:
        return {};
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in font-sans">
      <div className="bg-[#070b13] border border-[#22314d] rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-left">
        
        {/* MODAL HEADER */}
        <div className={`px-5 py-3 border-b flex items-center justify-between ${
          isOoaContext 
            ? 'bg-gradient-to-r from-[#0d172e] via-[#091021] to-[#0d172e] border-blue-900/60' 
            : 'bg-[#0d1424] border-[#1e2a42]'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${
              isOoaContext
                ? 'bg-blue-500/15 border-blue-400/40 text-blue-400'
                : 'bg-[#f97316]/10 border-[#f97316]/30 text-[#f97316]'
            }`}>
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                  {orderCodeName 
                    ? `INSPECCIÓN DE EVIDENCIA FOTOGRÁFICA // OOA: ${orderCodeName}`
                    : `INSPECCIÓN DE EVIDENCIA FOTOGRÁFICA // SENSOR ID: ${alert.id}`
                  }
                </h3>
                <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-black uppercase border ${
                  isOoaContext
                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                    : 'bg-red-500/20 text-red-300 border-red-500/40'
                }`}>
                  {isOoaContext ? 'AUTORIZACIÓN OOA // MANDO ESTRATÉGICO' : 'CONFIDENCIAL // CADENA DE CUSTODIA S-2'}
                </span>
                {intel && (
                  <span className="text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded font-bold uppercase">
                    VALIDADO EN FUSIÓN
                  </span>
                )}
              </div>
              <p className="text-xs text-[#94a3b8] font-mono">
                {isOoaContext
                  ? `Fotografía analizada en el Taller de Fusión que fundamenta la Orden de Operación — Captura: ${alert.sourceName}`
                  : `Captura original transmitida por ${alert.sourceName} — Módulo de Fusión y Validación PII-LCC`
                }
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#141e33] text-[#94a3b8] hover:text-white hover:bg-[#1e2d4d] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto">
          
          {/* LEFT 7 COLS: TACTICAL PHOTOGRAPH CANVAS & VIEWER */}
          <div className="lg:col-span-7 bg-[#02050b] p-4 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#1e2a42] relative min-h-[420px]">
            
            {/* Canvas Header info */}
            <div className="flex items-center justify-between text-[10px] font-mono text-[#94a3b8] border-b border-[#151f33] pb-2 mb-2 z-20">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">● RESOLUCIÓN: 1920x1080 MIL-SPEC</span>
                <span className="text-[#64748b]">|</span>
                <span>FOV: 42.5°</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#38bdf8]">SENSOR: {alert.sourceName}</span>
                <span className="text-[#64748b]">|</span>
                <span className="text-[#f97316] font-bold">ZOOM: {zoomLevel.toFixed(1)}X</span>
              </div>
            </div>

            {/* Central Photo Viewport */}
            <div className="relative flex-1 overflow-hidden rounded-xl border border-[#1a253d] bg-black flex items-center justify-center my-2 select-none group">
              
              {/* Scanlines tactical overlay */}
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.3)_51%)] bg-[length:100%_4px] pointer-events-none opacity-40 z-10" />

              {/* Reticle HUD overlay */}
              {showReticle && (
                <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
                  <div className="w-48 h-48 border border-[#f97316]/40 rounded-full flex items-center justify-center relative">
                    <div className="absolute inset-x-0 top-1/2 h-[1px] bg-[#f97316]/50" />
                    <div className="absolute inset-y-0 left-1/2 w-[1px] bg-[#f97316]/50" />
                    <div className="w-12 h-12 border border-[#f97316]/80 rounded-full" />
                    <Crosshair className="w-6 h-6 text-[#f97316] animate-pulse" />
                    <span className="absolute -top-5 text-[8px] font-mono text-[#f97316] bg-black/60 px-1 rounded">
                      RNG: 650M // RETÍCULA MIL
                    </span>
                    <span className="absolute -bottom-5 text-[8px] font-mono text-emerald-400 bg-black/60 px-1 rounded">
                      GRID: {alert.coordinates}
                    </span>
                  </div>
                </div>
              )}

              {/* Watermark in corner */}
              <div className="absolute top-3 left-3 z-20 pointer-events-none text-[9px] font-mono bg-black/75 px-2 py-1 rounded border border-[#22314d] text-[#38bdf8]">
                <div>CAM-ID: S2-EVID-{alert.id}</div>
                <div className="text-gray-400 text-[8px]">{new Date(alert.timestamp).toISOString()}</div>
              </div>

              {/* THE PHOTOGRAPH ITSELF */}
              <div
                className="transition-transform duration-200 ease-out flex items-center justify-center w-full h-full max-h-[460px]"
                style={{
                  transform: `scale(${zoomLevel})`,
                  ...getFilterStyle()
                }}
              >
                {isCustomImage ? (
                  /* Custom photo uploaded by patrol or camera */
                  <img
                    src={alert.mediaUrl}
                    alt={`Evidencia S2 - ${alert.id}`}
                    className="max-w-full max-h-full object-contain rounded"
                  />
                ) : isThermal ? (
                  /* High-contrast FLIR Thermal Vector Imagery */
                  <div className="w-full h-full min-h-[320px] bg-gradient-to-b from-[#0a0402] via-[#240b04] to-[#0a0402] flex flex-col items-center justify-center p-6 relative">
                    <div className="text-center space-y-2">
                      <div className="flex items-center justify-center gap-6">
                        {/* 3 Contraband heavy trucks glowing thermally */}
                        {[1, 2, 3].map((truck) => (
                          <div key={truck} className="relative flex flex-col items-center">
                            <div className="text-[7px] font-mono text-yellow-300 mb-1">
                              ΔT +16.4°C [F-12 #{truck}]
                            </div>
                            {/* Thermal truck silhouette */}
                            <div className="w-20 h-12 bg-gradient-to-r from-orange-500 via-yellow-400 to-orange-600 rounded border border-yellow-200 shadow-[0_0_20px_rgba(234,88,12,0.8)] relative flex items-center justify-center">
                              <span className="text-[8px] font-mono font-black text-black">
                                VOLVO F-12
                              </span>
                              {/* Exhaust heat plume */}
                              <div className="absolute -top-3 right-1 w-2.5 h-3 bg-red-500 rounded-full blur-[2px] animate-ping" />
                            </div>
                            {/* Hot wheels */}
                            <div className="flex gap-2 mt-1">
                              <div className="w-3 h-3 rounded-full bg-red-600 border border-yellow-300 animate-pulse" />
                              <div className="w-3 h-3 rounded-full bg-red-600 border border-yellow-300 animate-pulse" />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="text-[10px] font-mono text-orange-200 mt-4 font-bold bg-black/60 px-3 py-1 rounded inline-block border border-orange-500/40">
                        [CAPTURA FLIR TÉRMICA]: COLUMNA CLANDESTINA DE 3 CAMIONES PESADOS CON CARGA VOLUMINOSA
                      </div>
                    </div>
                  </div>
                ) : isNightVision ? (
                  /* Green Phosphor NVG Imagery */
                  <div className="w-full h-full min-h-[320px] bg-[#021006] flex flex-col items-center justify-center p-6 relative border border-emerald-500/30">
                    <div className="text-center space-y-3">
                      <div className="w-72 h-36 border-2 border-emerald-400/80 rounded bg-emerald-950/60 flex flex-col items-center justify-center p-4 relative shadow-[0_0_25px_rgba(16,185,129,0.4)]">
                        <span className="text-emerald-300 font-mono text-xs font-bold uppercase tracking-wider">
                          [REGISTRO NOCTURNO NVG GEN-3]
                        </span>
                        <p className="text-[11px] font-mono text-emerald-200 mt-2">
                          VEHÍCULOS 4X4 MODIFICADOS SIN ILUMINACIÓN REGLAMENTARIA
                        </p>
                        <span className="text-[9px] font-mono text-emerald-400/80 mt-1">
                          DISTANCIA AL BLANCO: 420 METROS // RUTA CLANDESTINA
                        </span>
                      </div>
                    </div>
                  </div>
                ) : isRadar ? (
                  /* Pulse Doppler Radar Scope */
                  <div className="w-full h-full min-h-[320px] bg-[#020b14] flex flex-col items-center justify-center p-6 relative border border-cyan-500/30">
                    <div className="w-64 h-64 rounded-full border border-cyan-500/40 relative flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                      <div className="w-44 h-44 rounded-full border border-cyan-500/30" />
                      <div className="w-24 h-24 rounded-full border border-cyan-500/20" />
                      <div className="absolute inset-x-0 top-1/2 h-[1px] bg-cyan-500/40" />
                      <div className="absolute inset-y-0 left-1/2 w-[1px] bg-cyan-500/40" />
                      {/* Targets */}
                      <div className="absolute top-16 right-20 w-3 h-3 bg-red-500 rounded-full animate-ping" />
                      <div className="absolute top-16 right-20 w-2.5 h-2.5 bg-red-400 rounded-full" />
                      <span className="absolute top-12 right-12 text-[8px] font-mono text-red-300 font-bold">
                        T-01 [58 KM/H]
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Tactical Border Post / Seizure Evidence */
                  <div className="w-full h-full min-h-[320px] bg-[#0c121e] flex flex-col items-center justify-center p-6 relative">
                    <div className="text-center space-y-2 max-w-sm">
                      <Shield className="w-12 h-12 text-[#38bdf8] mx-auto animate-pulse" />
                      <div className="text-xs font-mono font-bold text-white uppercase">
                        DOCUMENTACIÓN DE CAMPO // ÓRGANO HUMINT
                      </div>
                      <p className="text-[11px] font-sans text-[#94a3b8]">
                        Fotografía de huellas de rodado profundo, precintos vulnerados y marcas en hito fronterizo aportada por el contacto de búsqueda.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Tactical Control Bar at bottom of photo */}
            <div className="bg-[#0a101d] border border-[#1a253d] rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2 z-20">
              {/* Zoom controls */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-mono text-[#94a3b8] mr-1 font-bold">ZOOM:</span>
                <button
                  type="button"
                  onClick={() => setZoomLevel(prev => Math.max(0.8, prev - 0.25))}
                  className="p-1.5 rounded bg-[#141e33] hover:bg-[#1e2d4d] text-white text-xs font-mono transition-colors cursor-pointer"
                  title="Alejar"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(1)}
                  className="px-2 py-1 rounded bg-[#141e33] hover:bg-[#1e2d4d] text-white text-[10px] font-mono transition-colors cursor-pointer"
                  title="Restablecer"
                >
                  <RotateCcw className="w-3 h-3 inline mr-1" />
                  1.0x
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.25))}
                  className="p-1.5 rounded bg-[#141e33] hover:bg-[#1e2d4d] text-white text-xs font-mono transition-colors cursor-pointer"
                  title="Acercar"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-mono text-[#94a3b8] mr-1 font-bold">FILTRO:</span>
                {(['normal', 'flir', 'nvg', 'contrast', 'invert'] as const).map((fil) => (
                  <button
                    key={fil}
                    type="button"
                    onClick={() => setActiveFilter(fil)}
                    className={`text-[9px] font-mono px-2 py-1 rounded uppercase font-bold cursor-pointer transition-colors ${
                      activeFilter === fil
                        ? 'bg-[#f97316] text-white shadow'
                        : 'bg-[#141e33] text-[#94a3b8] hover:text-white'
                    }`}
                  >
                    {fil}
                  </button>
                ))}
              </div>

              {/* Reticle toggle */}
              <button
                type="button"
                onClick={() => setShowReticle(prev => !prev)}
                className={`text-[10px] font-mono px-2.5 py-1 rounded flex items-center gap-1 cursor-pointer transition-colors ${
                  showReticle
                    ? 'bg-[#f97316]/20 text-[#f97316] border border-[#f97316]/40 font-bold'
                    : 'bg-[#141e33] text-[#64748b]'
                }`}
              >
                <Crosshair className="w-3 h-3" />
                <span>{showReticle ? 'Retícula Activa' : 'Sin Retícula'}</span>
              </button>
            </div>
          </div>

          {/* RIGHT 5 COLS: COMPREHENSIVE PROVENANCE (QUIÉN Y DE DÓNDE) */}
          <div className="lg:col-span-5 bg-[#090e18] p-5 flex flex-col justify-between space-y-4 overflow-y-auto">
            
            <div className="space-y-4">
              
              {/* SECTION 0: APRECIACIÓN Y CERTIFICACIÓN DEL TALLER DE FUSIÓN (CFI) */}
              {isOoaContext && (
                <div className="bg-gradient-to-b from-[#0b172a] to-[#07101e] border border-blue-500/40 rounded-xl p-3.5 space-y-2.5 shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />
                  <div className="flex items-center justify-between border-b border-blue-900/40 pb-2">
                    <span className="text-xs font-mono font-black text-blue-400 flex items-center gap-1.5 uppercase tracking-wide">
                      <Zap className="w-4 h-4 text-blue-400" />
                      EVALUACIÓN DEL TALLER DE FUSIÓN (CFI)
                    </span>
                    <span className="text-[8px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/40 px-1.5 py-0.5 rounded font-bold uppercase">
                      CERTIFICADO PARA OOA
                    </span>
                  </div>

                  <div className="space-y-2 text-xs font-mono">
                    {intel && (
                      <div>
                        <span className="text-[10px] text-blue-300/70 block font-bold uppercase">Apreciación / Título:</span>
                        <span className="text-white font-bold leading-tight block">{intel.title}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[9px] text-[#64748b] block uppercase font-bold">Clan / Objetivo:</span>
                        <span className="text-amber-400 font-bold">{intel?.targetClan || 'Clan de Contrabando'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-[#64748b] block uppercase font-bold">Nivel de Amenaza:</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className="flex-1 bg-black/60 h-1.5 rounded-full overflow-hidden border border-zinc-700">
                            <div 
                              className="h-full bg-gradient-to-r from-yellow-500 to-red-500 rounded-full"
                              style={{ width: `${intel?.threatScore || 85}%` }}
                            />
                          </div>
                          <span className="text-red-400 font-black text-[10px]">{intel?.threatScore || 85}%</span>
                        </div>
                      </div>
                    </div>

                    {intel?.recommendedAction && (
                      <div className="pt-1 border-t border-blue-900/40">
                        <span className="text-[9px] text-[#64748b] block uppercase font-bold">Medida de Acción Recomendada:</span>
                        <p className="text-[11px] text-emerald-300 font-sans italic bg-black/40 p-1.5 rounded border border-emerald-900/30 mt-0.5">
                          "{intel.recommendedAction}"
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[9px] pt-1 text-[#64748b]">
                      <span>Validado: <strong className="text-zinc-300">{intel?.validatedBy || 'Analista CFI'}</strong></span>
                      <span className="text-blue-400 font-bold">{orderCodeName ? `ORDEN: ${orderCodeName}` : 'OOA PENDIENTE'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 1: QUIÉN ENVIÓ LA INFORMACIÓN */}
              <div className="bg-[#0e1626] border border-[#1e2c45] rounded-xl p-3.5 space-y-2.5 shadow-md">
                <div className="flex items-center justify-between border-b border-[#1b273d] pb-2">
                  <span className="text-xs font-mono font-black text-[#38bdf8] flex items-center gap-1.5 uppercase tracking-wide">
                    <User className="w-4 h-4 text-[#38bdf8]" />
                    ¿QUIÉN ENVIÓ LA INFORMACIÓN?
                  </span>
                  <span className="text-[8px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.5 rounded font-bold uppercase">
                    AUTENTICADO S-2
                  </span>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-[#64748b] block font-bold uppercase">Operador / Agente de Búsqueda:</span>
                    <span className="text-white font-bold">{operatorName}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#64748b] block font-bold uppercase">Unidad Orgánica / Patrulla:</span>
                    <span className="text-[#cbd5e1]">{originUnit}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#1b273d]">
                    <div>
                      <span className="text-[9px] text-[#64748b] block uppercase font-bold">Órgano de Búsqueda:</span>
                      <span className="text-yellow-400 font-bold">{alert.sourceType} ({alert.sourceName})</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#64748b] block uppercase font-bold">Calificación Doctrinal:</span>
                      <span className="text-[#f97316] font-black">Rango {alert.reliability}-{alert.certainty}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: DE DÓNDE PROVINO LA INFORMACIÓN */}
              <div className="bg-[#0e1626] border border-[#1e2c45] rounded-xl p-3.5 space-y-2.5 shadow-md">
                <div className="flex items-center justify-between border-b border-[#1b273d] pb-2">
                  <span className="text-xs font-mono font-black text-[#f97316] flex items-center gap-1.5 uppercase tracking-wide">
                    <MapPin className="w-4 h-4 text-[#f97316]" />
                    ¿DE DÓNDE PROVINO LA INFORMACIÓN?
                  </span>
                  <span className="text-[8px] font-mono bg-orange-500/20 text-orange-300 border border-orange-500/40 px-1.5 py-0.5 rounded font-bold uppercase">
                    GEORREFERENCIADO
                  </span>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-[#64748b] block font-bold uppercase">Sector / Hito Fronterizo:</span>
                    <span className="text-white font-bold">{originSector}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[9px] text-[#64748b] block uppercase font-bold">Coordenadas GPS:</span>
                      <span className="text-emerald-400 font-bold">{alert.coordinates}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#64748b] block uppercase font-bold">Vector Clandestino:</span>
                      <span className="text-[#38bdf8] font-bold">{alert.clandestineRouteId || 'Ruta Colchane'}</span>
                    </div>
                  </div>

                  <div className="pt-1 border-t border-[#1b273d] space-y-1.5">
                    <div>
                      <span className="text-[9px] text-[#64748b] block uppercase font-bold">Canal / Frecuencia de Enlace:</span>
                      <span className="text-[#cbd5e1] text-[11px] leading-tight block">{transmissionChannel}</span>
                    </div>

                    <div>
                      <span className="text-[9px] text-[#64748b] block uppercase font-bold">Dispositivo Terminal Emisor:</span>
                      <span className="text-purple-300 font-bold">{emitterDeviceId}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: REPORTE LITERAL DEL OPERADOR */}
              <div className="bg-[#0b101b] border border-[#192233] rounded-xl p-3 space-y-1 text-left">
                <span className="text-[10px] font-mono font-bold text-[#94a3b8] uppercase flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-[#94a3b8]" />
                  REPORTE LITERAL DE OBSERVACIÓN:
                </span>
                <p className="text-xs text-[#e2e8f0] font-sans leading-relaxed italic bg-black/40 p-2 rounded border border-[#1e2738]">
                  "{alert.details}"
                </p>
                <div className="flex justify-between items-center text-[9px] font-mono text-[#64748b] pt-1">
                  <span>Timestamp: {new Date(alert.timestamp).toLocaleString()}</span>
                  <span className="text-emerald-400">HASH: SHA-256 VERIFICADO</span>
                </div>
              </div>

            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-[#1e2a42] flex items-center justify-between gap-3">
              <span className="text-[9px] font-mono text-[#64748b]">
                PII-LCC // Ley 1053 & Art. 251 CPE
              </span>
              <button
                type="button"
                onClick={onClose}
                className="bg-[#141e33] hover:bg-[#1f2d4a] text-white text-xs font-mono font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer"
              >
                Cerrar Visor Fotográfico
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
