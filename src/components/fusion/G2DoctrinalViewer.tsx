/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Visor Gráfico Doctrinal y Cartográfico para Expedientes // PII-LCC
 */

import React from 'react';
import { G2RegistryRecord } from '../../types';
import { Shield, Crosshair, MapPin, FileText, Truck, AlertTriangle } from 'lucide-react';

interface G2DoctrinalViewerProps {
  record: G2RegistryRecord;
}

export const G2DoctrinalViewer: React.FC<G2DoctrinalViewerProps> = ({ record }) => {
  const isDoctrineLCC = record.id === 'REG-2026-001' || record.contenidoDetallado.includes('LEY 1053') || record.contenidoDetallado.includes('DOCTRINA');
  const isConvoyFLIR = record.id === 'REG-2026-002' || record.contenidoDetallado.includes('CARAVANA') || record.contenidoDetallado.includes('FLIR');
  const isFromSearchOrgan = Boolean(
    record.observacionesAdicionales?.includes('ÓRGANO DE BÚSQUEDA') ||
    record.referenciasAntecedentes?.some(r => r.includes('ÓRGANO') || r.includes('ALERTA'))
  );

  return (
    <div className="border border-[#2a324b] rounded-lg overflow-hidden bg-[#0a0d14] relative shadow-inner">
      {/* Header bar */}
      <div className="bg-[#121722] px-3 py-2 border-b border-[#22293a] flex items-center justify-between text-[10px] font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#f97316] animate-ping" />
          <span className="text-[#f97316] font-bold">VISOR CARTOGRÁFICO & EVIDENCIA // PII-LCC</span>
          <span className="text-[#64748b]">|</span>
          <span className="text-[#94a3b8]">{record.especificoGrafico?.subtipoElemento || 'Soporte Documental'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] bg-[#1e293b] text-[#38bdf8] px-1.5 py-0.5 rounded border border-[#334155]">
            {record.especificoGrafico?.escala || '1:50.000'}
          </span>
          <span className="text-[9px] bg-[#f97316]/10 text-[#f97316] px-1.5 py-0.5 rounded border border-[#f97316]/30 font-bold">
            {record.especificoGrafico?.orientacionNorte || 'NC'}
          </span>
        </div>
      </div>

      {/* Main Tactical Visual Body */}
      <div className="p-3 min-h-[260px] flex flex-col justify-between relative bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
        {/* Tactical Crosshair watermark */}
        <div className="absolute top-2 right-2 opacity-20 pointer-events-none">
          <Crosshair className="w-20 h-20 text-[#f97316]" />
        </div>

        {/* Case 1: LCC Legal & Doctrinal Schematic (REG-2026-001) */}
        {isDoctrineLCC && (
          <div className="space-y-3 z-10">
            <div className="border border-[#22293a] bg-[#0d121d]/90 backdrop-blur rounded p-3 text-center relative overflow-hidden">
              <div className="text-[10px] font-mono text-[#38bdf8] uppercase tracking-wider font-bold mb-2 flex items-center justify-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#38bdf8]" />
                DOCTRINA Y MARCO LEGAL: LEY 1053 // OPERACIONES DE INTERDICCIÓN LCC
              </div>

              {/* 4 Pillars Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-left mb-3">
                <div className="bg-[#121927] border border-[#2a364f] p-2 rounded hover:border-[#f97316] transition-colors">
                  <span className="text-[9px] font-mono text-[#f97316] font-bold block mb-0.5">01. ZONA FRONTERA</span>
                  <p className="text-[10px] text-[#cbd5e1] leading-tight">
                    Radio legal de 50 km para patrullaje activo e interdicción.
                  </p>
                </div>
                <div className="bg-[#121927] border border-[#2a364f] p-2 rounded hover:border-[#f97316] transition-colors">
                  <span className="text-[9px] font-mono text-[#38bdf8] font-bold block mb-0.5">02. COMISO INMEDIATO</span>
                  <p className="text-[10px] text-[#cbd5e1] leading-tight">
                    Incautación de camiones, chutos y mercaderías ilícitas.
                  </p>
                </div>
                <div className="bg-[#121927] border border-[#2a364f] p-2 rounded hover:border-[#f97316] transition-colors">
                  <span className="text-[9px] font-mono text-[#10b981] font-bold block mb-0.5">03. FUERZA PROPORCIONAL</span>
                  <p className="text-[10px] text-[#cbd5e1] leading-tight">
                    Defensa legítima frente a emboscadas armadas de clanes.
                  </p>
                </div>
                <div className="bg-[#121927] border border-[#2a364f] p-2 rounded hover:border-[#f97316] transition-colors">
                  <span className="text-[9px] font-mono text-[#fbbf24] font-bold block mb-0.5">04. CUSTODIA ADUANERA</span>
                  <p className="text-[10px] text-[#cbd5e1] leading-tight">
                    Traslado seguro a recintos de Aduana Nacional de Bolivia.
                  </p>
                </div>
              </div>

              {/* Interagencial Mission Block */}
              <div className="bg-[#161f30] border border-[#2e3e5c] p-2 rounded text-left">
                <div className="text-[9px] font-mono text-[#f97316] font-bold uppercase mb-1">
                  Coordinación Interagencial de Frontera (Art. 251 CPE / Ley 1053):
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[10px] font-mono text-[#94a3b8]">
                  <div className="flex items-center gap-1.5 bg-[#0f1522] px-2 py-1 rounded">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                    <span>CEO-LCC (Patrullas Militares)</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-[#0f1522] px-2 py-1 rounded">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]" />
                    <span>Policía Boliviana (Bloqueos)</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-[#0f1522] px-2 py-1 rounded">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#f97316]" />
                    <span>Aduana Nacional (Comisos)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Case 2: Contraband Convoy Detection / FLIR Telemetry HUD (REG-2026-002) */}
        {isConvoyFLIR && (
          <div className="space-y-3 z-10">
            <div className="border border-[#ea580c]/60 bg-[#160c07]/90 backdrop-blur rounded p-3 text-left relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#3d190d] pb-2 mb-2">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#f97316] animate-pulse" />
                  <span className="text-[11px] font-mono font-bold text-[#fed7aa] uppercase">
                    DETECCIÓN FLIR // CONVOY CLANDESTINO EN SALAR DE COIPASA
                  </span>
                </div>
                <span className="text-[9px] font-mono bg-orange-950/80 text-orange-300 px-2 py-0.5 rounded border border-orange-800/40">
                  BLANCO: 6 CAMIONES F-12 + 3 'LOROS'
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] font-mono mb-2">
                <div className="bg-[#26130a] border border-[#452011] p-2 rounded">
                  <span className="text-[#fb923c] block font-bold">ZONA DE INTERDICCIÓN:</span>
                  <span className="text-[#e2e8f0]">Huella Salar de Coipasa hacia Challapata</span>
                </div>
                <div className="bg-[#26130a] border border-[#452011] p-2 rounded">
                  <span className="text-[#fb923c] block font-bold">MODALIDAD DE CARAVANA:</span>
                  <span className="text-[#e2e8f0]">Marcha nocturna sin luces con lonas térmicas</span>
                </div>
                <div className="bg-[#26130a] border border-[#452011] p-2 rounded">
                  <span className="text-[#fb923c] block font-bold">ELEMENTOS HOSTILES:</span>
                  <span className="text-[#e2e8f0]">3 camionetas escolta armadas con miguelines</span>
                </div>
              </div>

              <div className="p-2 bg-[#140803] border border-[#2d1108] rounded text-[9px] font-mono text-[#cbd5e1] flex items-center justify-between">
                <span>COORDENADAS CUADRÍCULA: <strong className="text-[#fed7aa]">{record.especificoGrafico?.coordenadasCuadricula || 'MGRS 19K CQ 7812 3491'}</strong></span>
                <span className="text-[#38bdf8] flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-[#f97316]" />
                  VALOR ESTIMADO: &gt; 2.400.000 USD
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Case 3: Record generated from Search Organ (Órgano de Búsqueda S-2) */}
        {!isDoctrineLCC && !isConvoyFLIR && isFromSearchOrgan && (
          <div className="space-y-3 z-10 text-left">
            <div className="border border-cyan-500/40 bg-[#061320]/90 backdrop-blur rounded p-3 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-cyan-900/40 pb-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span className="text-[11px] font-mono font-bold text-cyan-200 uppercase">
                    EXPEDIENTE IMPLEMENTADO DESDE ÓRGANO DE BÚSQUEDA S-2
                  </span>
                </div>
                <span className="text-[9px] font-mono bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800/40 font-bold">
                  {record.calificacionEvaluacion || 'A-1'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] font-mono mb-2">
                <div className="bg-[#091a2e] border border-[#163359] p-2 rounded">
                  <span className="text-cyan-400 block font-bold">SENSOR FUENTE:</span>
                  <span className="text-slate-200 truncate block">
                    {record.referenciasAntecedentes?.[1] || record.especificoGrafico?.tipoSoporte || 'Sensor S-2'}
                  </span>
                </div>
                <div className="bg-[#091a2e] border border-[#163359] p-2 rounded">
                  <span className="text-cyan-400 block font-bold">VECTOR OPERACIONAL:</span>
                  <span className="text-slate-200 truncate block">
                    {record.referenciasAntecedentes?.[2] || 'Ruta Clandestina'}
                  </span>
                </div>
                <div className="bg-[#091a2e] border border-[#163359] p-2 rounded">
                  <span className="text-cyan-400 block font-bold">ESTADO PROCESAL:</span>
                  <span className="text-emerald-400 font-bold block">
                    EVALUADO // PII-LCC
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-300 font-sans leading-relaxed bg-[#040c14] p-2.5 rounded border border-[#12243d] mb-2 line-clamp-3">
                {record.contenidoDetallado}
              </p>

              {record.evaluacion?.ideasFuerza && record.evaluacion.ideasFuerza.length > 0 && (
                <div className="flex flex-wrap gap-1 text-[9px] font-mono">
                  {record.evaluacion.ideasFuerza.slice(0, 3).map((idea, i) => (
                    <span key={i} className="bg-cyan-950/60 text-cyan-300 border border-cyan-800/30 px-2 py-0.5 rounded">
                      • {idea.slice(0, 50)}...
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Case 4: Other Graphic or Literal records */}
        {!isDoctrineLCC && !isConvoyFLIR && !isFromSearchOrgan && (
          <div className="bg-[#0f1420] border border-[#222c40] rounded p-4 text-left space-y-2 z-10">
            <div className="flex items-center gap-2 text-[#38bdf8] text-xs font-mono font-bold">
              <FileText className="w-4 h-4" />
              <span>SOPORTE OPERATIVO // LUCHA CONTRA EL CONTRABANDO</span>
            </div>
            <p className="text-xs text-[#94a3b8] font-sans leading-relaxed">
              {record.especificoGrafico?.interpretacionVisualPreliminar || record.contenidoDetallado.slice(0, 240) + '...'}
            </p>
          </div>
        )}

        {/* Bottom Cartographic Footer with MGRS & Scale */}
        <div className="mt-3 pt-2 border-t border-[#1e2738] flex flex-wrap items-center justify-between gap-2 text-[9px] font-mono text-[#64748b] z-10">
          <div className="flex items-center gap-2">
            <MapPin className="w-3 h-3 text-[#f97316]" />
            <span>CUADRÍCULA: <strong className="text-[#cbd5e1]">{record.especificoGrafico?.coordenadasCuadricula || 'MGRS 19K DQ 4521 8932'}</strong></span>
          </div>
          <div className="flex items-center gap-3">
            <span>PLIEGO: <span className="text-[#94a3b8]">{record.especificoGrafico?.identificadorHojaPliego || record.id}</span></span>
            <span>SENSOR: <span className="text-[#94a3b8]">{record.especificoGrafico?.metadatosSensorFecha || '2026-08-20'}</span></span>
          </div>
        </div>
      </div>
    </div>
  );
};
