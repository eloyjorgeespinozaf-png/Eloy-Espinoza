/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Visor e Inspector de Ingesta desde Órganos de Búsqueda S-2 // PII-LCC
 * Muestra telemetría, fotografía capturada del Sensor ID y procedencia (quién y de dónde)
 */

import React, { useState, useMemo } from 'react';
import { RawAlert } from '../../types';
import { TacticalPhotoViewerModal } from './TacticalPhotoViewerModal';
import {
  Radio,
  Eye,
  Crosshair,
  MapPin,
  Clock,
  Shield,
  Layers,
  Sparkles,
  Check,
  AlertTriangle,
  Zap,
  Camera,
  Activity,
  Maximize2,
  User,
  Navigation,
  Lock,
  Cpu,
  FileText
} from 'lucide-react';

interface SearchOrganAlertViewerProps {
  alert: RawAlert;
  selectedIdeas: string[];
  onToggleIdea: (idea: string) => void;
  onInjectIdeas: () => void;
  onQuickProcessToExpediente: () => void;
  nextExpedienteId: string;
}

export const SearchOrganAlertViewer: React.FC<SearchOrganAlertViewerProps> = ({
  alert,
  selectedIdeas,
  onToggleIdea,
  onInjectIdeas,
  onQuickProcessToExpediente,
  nextExpedienteId
}) => {
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState<boolean>(false);

  // Determine sensor type characteristics
  const isCustomImage = Boolean(alert.mediaUrl && (alert.mediaUrl.startsWith('data:') || alert.mediaUrl.startsWith('http')));
  const isThermal = alert.sourceName.includes('Térmico') || alert.sourceName.includes('VANT-02') || alert.mediaUrl === 'multimedia-thermal';
  const isNightVision = alert.sourceName.includes('Óptico') || alert.sourceName.includes('VANT-01') || alert.mediaUrl === 'multimedia-optical';
  const isRadar = alert.sourceName.includes('Radar') || alert.sourceName.includes('RADAR') || alert.sourceType === 'SIGINT';
  const isHumint = alert.sourceType === 'HUMINT' || alert.sourceName.includes('HUMINT');

  // Provenance fallbacks
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

  // Extract key clauses / ideas from alert details
  const autoIdeas: string[] = useMemo(() => {
    const list: string[] = [];
    list.push(`Sensor ${alert.sourceName} (${alert.sourceType}) en cuadrícula ${alert.coordinates}`);
    if (alert.details) {
      const parts = alert.details.split(/[.;\n]/).map(s => s.trim()).filter(s => s.length > 12);
      if (parts.length > 0) {
        parts.slice(0, 3).forEach(p => list.push(p));
      } else {
        list.push(alert.details);
      }
    }
    return list;
  }, [alert]);

  return (
    <div className="border border-[#2a364f] rounded-xl overflow-hidden bg-[#070b13] relative shadow-2xl text-left font-sans">
      
      {/* Header bar with Live Sensor Connection & Photographic Trigger */}
      <div className="bg-[#0e1524] px-3.5 py-2.5 border-b border-[#1e2a42] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping absolute" />
            <span className="w-2 h-2 rounded-full bg-emerald-400 relative" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono font-bold text-white tracking-wide uppercase">
                {alert.sourceName}
              </span>
              <span className={`text-[9px] font-mono font-black px-1.5 py-0.2 rounded uppercase ${
                alert.sourceType === 'IMINT' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' :
                alert.sourceType === 'SIGINT' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40' :
                'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              }`}>
                {alert.sourceType}
              </span>
            </div>
            <span className="text-[9px] font-mono text-[#64748b]">
              ENLACE MIL-SPEC ACTIVO // S-2 BÚSQUEDA
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* SENSOR ID PHOTO TRIGGER BUTTON */}
          <button
            type="button"
            onClick={() => setIsPhotoModalOpen(true)}
            className="bg-gradient-to-r from-orange-950 to-amber-950 hover:from-orange-900 hover:to-amber-900 text-amber-200 border border-orange-500/50 text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow transition-all active:scale-95 cursor-pointer animate-pulse"
            title="Ver fotografía enviada por el sensor"
          >
            <Camera className="w-3.5 h-3.5 text-[#f97316]" />
            <span>FOTOGRAFÍA SENSOR [{alert.id}]</span>
          </button>

          <span className="text-[9px] font-mono bg-[#162136] text-[#38bdf8] px-2 py-1 rounded border border-[#233554] font-bold">
            CALIF: {alert.reliability}-{alert.certainty}
          </span>
        </div>
      </div>

      {/* Main Tactical Visual Display HUD */}
      <div className="p-3.5 space-y-3.5 relative">
        
        {/* Tactical FLIR / Sensor Simulation Screen with Direct Interactive Click */}
        <div 
          onClick={() => setIsPhotoModalOpen(true)}
          className="relative rounded-lg overflow-hidden border border-[#22314d] hover:border-[#f97316] bg-[#02050b] min-h-[175px] flex flex-col justify-between p-3 cursor-pointer group transition-all"
          title="Haga clic para ampliar la fotografía enviada por el sensor en alta resolución"
        >
          {/* Scanlines / Grid overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.4)_51%)] bg-[length:100%_4px] pointer-events-none opacity-40" />
          <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:12px_12px] opacity-25 pointer-events-none" />

          {/* Top telemetry HUD with clickable Sensor ID */}
          <div className="relative z-10 flex items-center justify-between text-[9px] font-mono">
            <div className="flex items-center gap-2">
              <span className="bg-[#f97316]/20 group-hover:bg-[#f97316]/40 text-[#f97316] px-1.5 py-0.5 rounded border border-[#f97316]/40 flex items-center gap-1 font-bold">
                <Camera className="w-3 h-3 text-[#f97316]" />
                SENSOR ID: [{alert.id}]
              </span>
              <span className="text-[#64748b]">|</span>
              <span className="text-emerald-400">ENLACE SHA-512 OK</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#38bdf8] group-hover:text-white font-mono transition-colors">
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="text-[9px] underline">AMPLIAR FOTO</span>
            </div>
          </div>

          {/* Center Graphic Simulator / Photograph Display */}
          <div className="relative z-10 my-2 flex items-center justify-center">
            {isCustomImage && Boolean(alert.mediaUrl && alert.mediaUrl.trim() !== '') ? (
              /* Custom uploaded or camera photo */
              <div className="relative w-full max-h-[140px] rounded overflow-hidden flex items-center justify-center bg-black border border-[#1e2a40]">
                <img
                  src={alert.mediaUrl}
                  alt={`Evidencia S-2 ${alert.id}`}
                  className="max-h-[140px] w-auto object-contain"
                />
                <div className="absolute bottom-1 right-1 bg-black/80 px-2 py-0.5 rounded text-[8px] font-mono text-[#f97316] font-bold">
                  CAPTURA EN VIVO S-2
                </div>
              </div>
            ) : isThermal ? (
              /* Thermal FLIR */
              <div className="w-full bg-gradient-to-r from-[#180a02] via-[#3a1505] to-[#180a02] border border-orange-600/40 rounded p-2.5 text-center relative overflow-hidden">
                <div className="absolute top-1 left-2 text-[8px] font-mono text-orange-400 font-bold uppercase">
                  FLIR THERMAL SCAN // 8-14 µm
                </div>
                <div className="flex items-center justify-center py-2">
                  <div className="relative border-2 border-dashed border-orange-500/80 bg-orange-950/40 px-4 py-2 rounded flex flex-col items-center">
                    <Crosshair className="w-8 h-8 text-[#f97316] animate-spin" style={{ animationDuration: '16s' }} />
                    <span className="text-[9px] font-mono text-orange-300 font-bold tracking-wider mt-1">
                      [BLANCO TÉRMICO DETECTADO: 3 CAMIONES PESADOS F-12]
                    </span>
                    <span className="text-[8px] font-mono text-orange-200/70">
                      ΔT: +14.2°C // RETÍCULA ACTIVA // CLIC PARA ABRIR FOTO
                    </span>
                  </div>
                </div>
                {/* Thermal Color Gradient Scale Bar */}
                <div className="h-1.5 w-full bg-gradient-to-r from-blue-900 via-purple-700 via-orange-500 to-yellow-300 rounded-full mt-1 opacity-80" />
              </div>
            ) : isNightVision ? (
              /* NVG */
              <div className="w-full bg-[#02140a] border border-emerald-600/40 rounded p-2.5 text-center relative overflow-hidden">
                <div className="absolute top-1 left-2 text-[8px] font-mono text-emerald-400 font-bold uppercase">
                  NVG GEN-3 PHOSPHOR // ZOOM 8X
                </div>
                <div className="flex items-center justify-center py-2">
                  <div className="relative border border-emerald-500/80 bg-emerald-950/40 px-4 py-2 rounded flex flex-col items-center">
                    <Eye className="w-7 h-7 text-emerald-400 animate-pulse" />
                    <span className="text-[9px] font-mono text-emerald-300 font-bold tracking-wider mt-1">
                      [SILUETA DETECTADA // TRÁFICO NOCTURNO SIN LUCES]
                    </span>
                    <span className="text-[8px] font-mono text-emerald-200/70">
                      PATRÓN: CARAVANA INDOCUMENTADA // CLIC PARA ABRIR FOTO
                    </span>
                  </div>
                </div>
              </div>
            ) : isRadar ? (
              /* Radar */
              <div className="w-full bg-[#040f1a] border border-cyan-600/40 rounded p-2.5 text-center relative overflow-hidden">
                <div className="absolute top-1 left-2 text-[8px] font-mono text-cyan-400 font-bold uppercase">
                  PULSE DOPPLER RADAR // PLOT S-2
                </div>
                <div className="flex items-center justify-center py-2">
                  <div className="relative border border-cyan-500/80 bg-cyan-950/40 px-4 py-2 rounded flex flex-col items-center">
                    <Radio className="w-7 h-7 text-cyan-400 animate-pulse" />
                    <span className="text-[9px] font-mono text-cyan-300 font-bold tracking-wider mt-1">
                      [ECO RADAR: VELOCIDAD 58 KM/H // RUTA NO HABILITADA]
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* HUMINT */
              <div className="w-full bg-[#110e1a] border border-purple-600/40 rounded p-2.5 text-center relative overflow-hidden">
                <div className="absolute top-1 left-2 text-[8px] font-mono text-purple-400 font-bold uppercase">
                  DESPACHO HUMINT // FUENTE HUMANA DE FRONTERA
                </div>
                <div className="flex items-center justify-center py-2">
                  <div className="relative border border-purple-500/80 bg-purple-950/40 px-4 py-2 rounded flex flex-col items-center">
                    <Shield className="w-7 h-7 text-purple-400" />
                    <span className="text-[9px] font-mono text-purple-300 font-bold tracking-wider mt-1">
                      [EVIDENCIA FOTOGRÁFICA DE HUELLAS Y COMISO]
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Telemetry Data row */}
          <div className="relative z-10 flex items-center justify-between text-[9px] font-mono text-[#94a3b8] pt-1 border-t border-[#1e2a42]">
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-[#f97316]" />
              <span className="text-white font-bold">{alert.coordinates}</span>
            </div>
            <div className="flex items-center gap-1 text-[#38bdf8]">
              <Clock className="w-3 h-3" />
              <span>{new Date(alert.timestamp).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* PROVENANCE MODULE: QUIÉN Y DE DÓNDE PROVINO LA INFORMACIÓN */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          
          {/* Card: ¿QUIÉN ENVIÓ LA INFORMACIÓN? */}
          <div className="bg-[#0b101c] border border-[#1e2a40] rounded-xl p-3 space-y-2 text-left shadow-md">
            <div className="flex items-center justify-between border-b border-[#182338] pb-1.5">
              <span className="text-[10px] font-mono font-black text-[#38bdf8] flex items-center gap-1.5 uppercase">
                <User className="w-3.5 h-3.5 text-[#38bdf8]" />
                ¿QUIÉN ENVIÓ LA INFORMACIÓN?
              </span>
              <span className="text-[8px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800/40 px-1 rounded font-bold">
                OPERADOR S-2
              </span>
            </div>

            <div className="space-y-1.5 text-xs font-mono">
              <div>
                <span className="text-[9px] text-[#64748b] block uppercase font-bold">Operador de Búsqueda:</span>
                <span className="text-white font-bold text-[11px] leading-tight block">{operatorName}</span>
              </div>

              <div>
                <span className="text-[9px] text-[#64748b] block uppercase font-bold">Unidad Orgánica:</span>
                <span className="text-[#cbd5e1] text-[10px] block">{originUnit}</span>
              </div>

              <div className="flex justify-between items-center pt-1 border-t border-[#182338] text-[9px]">
                <span className="text-[#64748b]">Órgano: <strong className="text-yellow-400">{alert.sourceType}</strong></span>
                <span className="text-[#f97316] font-bold">Calificación: {alert.reliability}-{alert.certainty}</span>
              </div>
            </div>
          </div>

          {/* Card: ¿DE DÓNDE PROVINO LA INFORMACIÓN? */}
          <div className="bg-[#0b101c] border border-[#1e2a40] rounded-xl p-3 space-y-2 text-left shadow-md">
            <div className="flex items-center justify-between border-b border-[#182338] pb-1.5">
              <span className="text-[10px] font-mono font-black text-[#f97316] flex items-center gap-1.5 uppercase">
                <MapPin className="w-3.5 h-3.5 text-[#f97316]" />
                ¿DE DÓNDE PROVINO LA INFORMACIÓN?
              </span>
              <span className="text-[8px] font-mono bg-orange-950 text-orange-300 border border-orange-800/40 px-1 rounded font-bold">
                GEORREFERENCIA
              </span>
            </div>

            <div className="space-y-1.5 text-xs font-mono">
              <div>
                <span className="text-[9px] text-[#64748b] block uppercase font-bold">Sector / Hito Fronterizo:</span>
                <span className="text-white font-bold text-[11px] leading-tight block">{originSector}</span>
              </div>

              <div>
                <span className="text-[9px] text-[#64748b] block uppercase font-bold">Canal de Enlace:</span>
                <span className="text-[#cbd5e1] text-[10px] truncate block" title={transmissionChannel}>
                  {transmissionChannel}
                </span>
              </div>

              <div className="flex justify-between items-center pt-1 border-t border-[#182338] text-[9px]">
                <span className="text-emerald-400 font-bold">{alert.coordinates}</span>
                <span className="text-purple-300 font-bold">{emitterDeviceId}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Observation Details Raw Box */}
        <div className="bg-[#0c121e] border border-[#1e2a40] rounded-lg p-3 text-left">
          <div className="flex items-center justify-between mb-1 text-[10px] font-mono font-bold text-[#f97316] uppercase">
            <span>REPORTE PRIMARIO DE CAMPO (ÓRGANO DE BÚSQUEDA):</span>
            <span className="text-[#64748b] text-[9px]">DOC-REF: S2-{alert.id}</span>
          </div>
          <p className="text-xs text-[#e2e8f0] font-sans leading-relaxed">
            "{alert.details}"
          </p>
        </div>

        {/* Ideas Fuerza Extraídas de la Búsqueda */}
        <div className="bg-[#0b101b] border border-[#1d273a] rounded-lg p-3 space-y-2 text-left">
          <div className="flex items-center justify-between border-b border-[#1b2538] pb-1.5">
            <span className="text-[10px] font-mono font-bold text-[#38bdf8] uppercase flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#38bdf8]" />
              IDEAS FUERZA EXTRAÍDAS DE LA DETECCIÓN
            </span>
            <button
              type="button"
              onClick={onInjectIdeas}
              className="text-[9px] font-mono bg-[#38bdf8]/15 hover:bg-[#38bdf8]/30 text-[#38bdf8] px-2 py-0.5 rounded font-bold transition-colors cursor-pointer flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              <span>Inyectar al Análisis</span>
            </button>
          </div>

          <div className="space-y-1.5">
            {autoIdeas.map((idea, idx) => {
              const isChecked = selectedIdeas.includes(idea);
              return (
                <div
                  key={idx}
                  onClick={() => onToggleIdea(idea)}
                  className={`p-1.5 rounded text-[10px] font-mono flex items-start gap-2 cursor-pointer transition-all ${
                    isChecked
                      ? 'bg-[#38bdf8]/15 text-[#bae6fd] border border-[#38bdf8]/40'
                      : 'bg-[#101726] text-[#94a3b8] hover:text-white border border-[#1d273a]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                    className="mt-0.5 accent-[#38bdf8]"
                  />
                  <span className="leading-snug">{idea}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Direct Automatic Expediente Implementation Banner */}
        <div className="p-3 bg-gradient-to-r from-[#171207] via-[#241705] to-[#171207] border border-[#f97316]/40 rounded-lg flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#f97316]/20 rounded-lg text-[#f97316]">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-mono font-bold text-[#fed7aa] uppercase">
                INTEGRACIÓN AUTOMÁTICA A EXPEDIENTES
              </div>
              <div className="text-[9px] font-mono text-[#fb923c]">
                Se generará y registrará como <strong className="text-white underline">{nextExpedienteId}</strong> en la base doctrinal PII-LCC
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onQuickProcessToExpediente}
            className="bg-[#f97316] hover:bg-[#ea580c] text-white text-[11px] font-mono font-bold px-3 py-1.5 rounded shadow-lg flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0 uppercase"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Implementar a Expedientes</span>
          </button>
        </div>
      </div>

      {/* Full Photographic Inspection Modal */}
      <TacticalPhotoViewerModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        alert={alert}
      />

    </div>
  );
};
