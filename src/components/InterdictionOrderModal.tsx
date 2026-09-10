/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AutomatedOrder, RawAlert, TacticalUnit } from '../types';
import { 
  Shield, 
  Radio, 
  CheckCircle2, 
  AlertTriangle, 
  Navigation, 
  Clock, 
  MapPin, 
  Send, 
  X, 
  Camera, 
  Activity, 
  Maximize2, 
  Crosshair, 
  Volume2, 
  Layers, 
  Check, 
  Compass,
  ArrowRight,
  TrendingUp,
  FileText
} from 'lucide-react';
import { playChime, playSyntheticBeep } from '../utils/audio';

interface InterdictionOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: AutomatedOrder;
  allOrders?: AutomatedOrder[];
  onSelectOrder?: (order: AutomatedOrder) => void;
  tacticalUnits?: TacticalUnit[];
  rawAlerts?: RawAlert[];
  onConfirmOrder: (id: string, newStatus: 'RECEIVED' | 'IN_PROGRESS' | 'COMPLETED') => void;
  onAddOrderUpdate?: (orderId: string, updateMsg: string) => void;
}

export default function InterdictionOrderModal({
  isOpen,
  onClose,
  order,
  allOrders = [],
  onSelectOrder,
  tacticalUnits = [],
  rawAlerts = [],
  onConfirmOrder,
  onAddOrderUpdate
}: InterdictionOrderModalProps) {
  const [newUpdateText, setNewUpdateText] = useState('');
  const [showFullPhoto, setShowFullPhoto] = useState(false);
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'TRACKING' | 'EVIDENCE'>('DETAILS');
  const [ackConfirmedNotice, setAckConfirmedNotice] = useState<string | null>(null);

  // Auto-clear notice
  useEffect(() => {
    if (ackConfirmedNotice) {
      const t = setTimeout(() => setAckConfirmedNotice(null), 5000);
      return () => clearTimeout(t);
    }
  }, [ackConfirmedNotice]);

  if (!isOpen || !order) return null;

  // Find assigned unit
  const assignedUnitObj = tacticalUnits.find(u => u.name === order.assignedUnit);

  // Find linked alert/evidence
  const linkedAlert = rawAlerts.find(a => a.id === order.rawAlertId) ||
    rawAlerts.find(a => a.mediaUrl === order.mediaUrl) ||
    rawAlerts[0];

  const mediaSource = order.mediaUrl || linkedAlert?.mediaUrl || 'multimedia-thermal';

  // Coordinate parser
  const parseCoords = (coordStr?: string) => {
    if (!coordStr) return null;
    const dmsRegex = /(\d+)\s*°\s*(\d+)\s*'\s*(\d+(?:\.\d+)?)\s*"?\s*([NSns])[,;\s]+(\d+)\s*°\s*(\d+)\s*'\s*(\d+(?:\.\d+)?)\s*"?\s*([WEweOo])/;
    const matches = coordStr.match(dmsRegex);
    if (matches) {
      let lat = parseFloat(matches[1]) + parseFloat(matches[2]) / 60 + parseFloat(matches[3]) / 3600;
      if (matches[4].toUpperCase() === 'S') lat = -lat;
      let lon = parseFloat(matches[5]) + parseFloat(matches[6]) / 60 + parseFloat(matches[7]) / 3600;
      if (matches[8].toUpperCase() === 'W' || matches[8].toUpperCase() === 'O') lon = -lon;
      return { lat, lon };
    }
    const parts = coordStr.replace(/[,;]/g, ' ').trim().split(/\s+/);
    if (parts.length >= 2) {
      const lat = parseFloat(parts[0]);
      const lon = parseFloat(parts[1]);
      if (!isNaN(lat) && !isNaN(lon)) return { lat, lon };
    }
    return null;
  };

  const orderPos = parseCoords(order.coordinates);
  const unitPos = assignedUnitObj ? parseCoords(assignedUnitObj.coordinates) : null;

  // Calculate approximate distance in km
  let distanceKm: number | null = null;
  if (orderPos && unitPos) {
    const R = 6371; // km
    const dLat = ((orderPos.lat - unitPos.lat) * Math.PI) / 180;
    const dLon = ((orderPos.lon - unitPos.lon) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((unitPos.lat * Math.PI) / 180) *
        Math.cos((orderPos.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    distanceKm = Math.round(R * c * 10) / 10;
  }

  // Handle Confirm Reception
  const handleConfirmReception = () => {
    playChime(620, 840, 0.25);
    const ackCode = `ACK-C2-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const timestampStr = new Date().toLocaleTimeString();
    const ackMessage = `[${timestampStr}] RECEPCIÓN CONFIRMADA AL MANDO LCC: ${order.assignedUnit} acusa recibo formal de la Orden ${order.codeName}. Canal VHF 142.850 MHz. Cripto-Hash: ${ackCode}.`;

    onConfirmOrder(order.id, 'RECEIVED');
    if (onAddOrderUpdate) {
      onAddOrderUpdate(order.id, ackMessage);
    }
    setAckConfirmedNotice(`RECEPCIÓN CONFIRMADA AL MANDO LCC: Acuse de recibo formal transmitido con éxito (${ackCode}).`);
  };

  // Handle Start Interdiction
  const handleStartInterdiction = () => {
    playSyntheticBeep(920, 0.2);
    const timestampStr = new Date().toLocaleTimeString();
    const deployMessage = `[${timestampStr}] DESPLIEGUE INICIADO: ${order.assignedUnit} inicia desplazamiento táctico hacia las coordenadas de interdicción ${order.coordinates}.`;
    onConfirmOrder(order.id, 'IN_PROGRESS');
    if (onAddOrderUpdate) {
      onAddOrderUpdate(order.id, deployMessage);
    }
    setAckConfirmedNotice(`DESPLIEGUE TÁCTICO INICIADO: Mando LCC notificado del avance de interdicción.`);
  };

  // Handle Complete Interdiction
  const handleCompleteInterdiction = () => {
    playChime(750, 990, 0.3);
    const timestampStr = new Date().toLocaleTimeString();
    const completeMessage = `[${timestampStr}] INTERDICCIÓN COMPLETADA CON ÉXITO: Objetivo neutralizado en ${order.coordinates}. Mercadería de contrabando asegurada y bajo custodia del CEO-LCC.`;
    onConfirmOrder(order.id, 'COMPLETED');
    if (onAddOrderUpdate) {
      onAddOrderUpdate(order.id, completeMessage);
    }
    setAckConfirmedNotice(`MISIÓN CUMPLIDA: Interdicción reportada como exitosa al Mando LCC.`);
  };

  // Handle Send Custom Progress Log to Mando LCC
  const handleSendProgressUpdate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newUpdateText.trim()) return;

    playSyntheticBeep(850, 0.1);
    const timestampStr = new Date().toLocaleTimeString();
    const formattedMsg = `[${timestampStr}] [NOVEDAD TERRENO -> MANDO LCC] ${newUpdateText.trim()}`;

    if (onAddOrderUpdate) {
      onAddOrderUpdate(order.id, formattedMsg);
    }
    setNewUpdateText('');
    setAckConfirmedNotice(`Novedad transmitida inmediatamente al canal C2 del Mando LCC.`);
  };

  const quickPresets = [
    "Contacto visual confirmado con caravana de camiones a 1.2 km.",
    "Dispositivo de corte de ruta instalado en paso no habilitado.",
    "Vehículos interceptados sin incidentes. Verificando carga.",
    "Solicitud de refuerzo vehicular para escolta hacia recinto aduanero."
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 md:p-6 animate-fade-in overflow-y-auto">
      <div 
        className="bg-[#080d16] border-2 border-[#1e293b] rounded-2xl w-full max-w-5xl shadow-[0_0_50px_rgba(30,58,138,0.35)] flex flex-col max-h-[92vh] overflow-hidden text-left relative"
      >
        {/* Top Tactical Status Banner */}
        <div className="bg-[#030712] border-b border-[#1e293b] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span className="text-blue-400 font-bold uppercase tracking-wider">
              RED C4ISR // COMANDO ESTRATÉGICO OPERACIONAL LCC
            </span>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-400">ENLACE TÁCTICO SATELITAL CEO-LCC // CANAL CAD-C2 142.850 MHz</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded bg-rose-950/60 border border-rose-800/60 text-rose-300 font-bold">
              CLASIFICACIÓN: SECRETO
            </span>
            <button 
              type="button"
              onClick={onClose}
              className="text-zinc-400 hover:text-white p-1 hover:bg-zinc-800/60 rounded transition-colors"
              title="Cerrar Ventana"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#0d1627] via-[#09101d] to-[#0d1627] border-b border-[#1e293b] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-3 rounded-xl border flex items-center justify-center ${
              order.status === 'ISSUED' 
                ? 'bg-rose-500/15 border-rose-500/50 text-rose-400 animate-pulse' 
                : order.status === 'RECEIVED'
                ? 'bg-blue-500/15 border-blue-500/50 text-blue-400'
                : order.status === 'IN_PROGRESS'
                ? 'bg-amber-500/15 border-amber-500/50 text-amber-400 animate-pulse'
                : 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400'
            }`}>
              <Radio className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-blue-900/50 border border-blue-600/40 text-blue-300 font-bold">
                  VENTANA DE INTERDICCIÓN
                </span>
                <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border font-bold ${
                  order.status === 'ISSUED' 
                    ? 'bg-rose-950/80 border-rose-600 text-rose-300 animate-pulse' 
                    : order.status === 'RECEIVED'
                    ? 'bg-blue-950/80 border-blue-600 text-blue-300'
                    : order.status === 'IN_PROGRESS'
                    ? 'bg-amber-950/80 border-amber-600 text-amber-300'
                    : 'bg-emerald-950/80 border-emerald-600 text-emerald-300'
                }`}>
                  {order.status === 'ISSUED' && '1. ORDEN EMITIDA // PENDIENTE DE RECEPCIÓN'}
                  {order.status === 'RECEIVED' && '2. RECEPCIÓN CONFIRMADA // LISTO PARA DESPLIEGUE'}
                  {order.status === 'IN_PROGRESS' && '3. INTERDICCIÓN EN CURSO // SEGUIMIENTO EN VIVO'}
                  {order.status === 'COMPLETED' && '4. INTERDICCIÓN CUMPLIDA // ÉXITO'}
                  {order.status === 'CANCELLED' && 'CANCELADA POR MANDO'}
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-heading font-black text-white tracking-wide mt-1 flex items-center gap-2">
                ORDEN DE OPERACIÓN: <span className="text-cyan-400">{order.codeName}</span>
              </h2>

              <p className="text-xs font-mono text-zinc-400 mt-0.5">
                Emisor: <strong className="text-zinc-200">{order.issuer}</strong> | Asignada a: <strong className="text-emerald-400">{order.assignedUnit}</strong>
              </p>
            </div>
          </div>

          {/* Quick Order Switcher if multiple orders exist */}
          {allOrders.length > 1 && onSelectOrder && (
            <div className="flex items-center gap-2 bg-[#040811] p-1.5 rounded-lg border border-[#1e293b]">
              <span className="text-[10px] font-mono text-zinc-400 uppercase">Órdenes LCC:</span>
              <select
                value={order.id}
                onChange={(e) => {
                  const target = allOrders.find(o => o.id === e.target.value);
                  if (target) onSelectOrder(target);
                }}
                className="bg-[#0b1322] text-xs font-mono text-cyan-300 border border-[#24344d] rounded px-2 py-1 focus:outline-none"
              >
                {allOrders.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.codeName} ({o.status})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Transient Ack Banner */}
        {ackConfirmedNotice && (
          <div className="bg-emerald-950/70 border-b border-emerald-500/50 text-emerald-300 px-4 py-2.5 text-xs font-mono flex items-center justify-between animate-fade-in">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {ackConfirmedNotice}
            </span>
            <button 
              onClick={() => setAckConfirmedNotice(null)} 
              className="text-emerald-500 hover:text-white text-xs font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Tactical Navigation Tabs */}
        <div className="flex border-b border-[#1e293b] bg-[#050913] px-4 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('DETAILS')}
            className={`px-3 py-2.5 text-xs font-mono font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'DETAILS'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Misión & Confirmación de Recepción</span>
            {order.status === 'ISSUED' && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping ml-1" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('TRACKING')}
            className={`px-3 py-2.5 text-xs font-mono font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'TRACKING'
                ? 'border-blue-500 text-blue-400 bg-blue-900/20'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Seguimiento Mando LCC & Telemetría</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300">
              {order.updates.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('EVIDENCE')}
            className={`px-3 py-2.5 text-xs font-mono font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'EVIDENCE'
                ? 'border-amber-500 text-amber-400 bg-amber-950/20'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Fotografía Analizada en Fusión</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-6 flex-1 bg-[#070c17]">
          {activeTab === 'DETAILS' && (
            <div className="space-y-6">
              {/* PRIMARY ACTION BLOCK: CONFIRM RECEPTION OF THE ORDER */}
              <div className={`p-4 rounded-xl border-2 transition-all ${
                order.status === 'ISSUED'
                  ? 'bg-rose-950/30 border-rose-600/80 shadow-[0_0_25px_rgba(225,29,72,0.2)]'
                  : order.status === 'RECEIVED'
                  ? 'bg-blue-950/30 border-blue-500/70'
                  : order.status === 'IN_PROGRESS'
                  ? 'bg-amber-950/30 border-amber-500/70'
                  : 'bg-emerald-950/30 border-emerald-500/70'
              }`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {order.status === 'ISSUED' && (
                        <AlertTriangle className="w-5 h-5 text-rose-400 animate-bounce" />
                      )}
                      {order.status === 'RECEIVED' && (
                        <CheckCircle2 className="w-5 h-5 text-blue-400" />
                      )}
                      {order.status === 'IN_PROGRESS' && (
                        <Navigation className="w-5 h-5 text-amber-400 animate-pulse" />
                      )}
                      {order.status === 'COMPLETED' && (
                        <Check className="w-5 h-5 text-emerald-400" />
                      )}
                      <h3 className="text-sm sm:text-base font-mono font-black text-white uppercase tracking-wider">
                        {order.status === 'ISSUED' && 'ACUSE DE RECIBO PENDIENTE AL MANDO LCC'}
                        {order.status === 'RECEIVED' && 'RECEPCIÓN DE ORDEN CONFIRMADA // LISTA PARA INTERDICTAR'}
                        {order.status === 'IN_PROGRESS' && 'INTERDICCIÓN EN DESARROLLO EN TERRENO'}
                        {order.status === 'COMPLETED' && 'MISIÓN DE INTERDICCIÓN CUMPLIDA'}
                      </h3>
                    </div>

                    <p className="text-xs font-sans text-zinc-300 max-w-2xl leading-relaxed">
                      {order.status === 'ISSUED' && (
                        <span>
                          La orden fue emitida directamente por el <strong>{order.issuer}</strong>. La doctrina militar C4ISR exige que la <strong>{order.assignedUnit}</strong> confirme la recepción formal antes de movilizar los vehículos de combate.
                        </span>
                      )}
                      {order.status === 'RECEIVED' && (
                        <span>
                          Recepción confirmada con el Mando Estratégico. La unidad táctica tiene autorización de desplazamiento e intercepción hacia el punto de corte fronterizo.
                        </span>
                      )}
                      {order.status === 'IN_PROGRESS' && (
                        <span>
                          La patrulla se encuentra en movimiento táctico hacia las coordenadas de interdicción. El Mando LCC está recibiendo telemetría en tiempo real.
                        </span>
                      )}
                      {order.status === 'COMPLETED' && (
                        <span>
                          La operación fue culminada con éxito. Todos los vehículos y carga de contrabando fueron interceptados y puestos bajo control militar.
                        </span>
                      )}
                    </p>
                  </div>

                  {/* ACTION BUTTONS (MANDATORY REQUIREMENT) */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    {order.status === 'ISSUED' && (
                      <button
                        type="button"
                        onClick={handleConfirmReception}
                        className="bg-rose-600 hover:bg-rose-500 text-white font-mono font-black text-xs py-3 px-5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(225,29,72,0.4)] active:scale-[0.98] cursor-pointer uppercase"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirmar Recepción de la Orden</span>
                      </button>
                    )}

                    {order.status === 'RECEIVED' && (
                      <button
                        type="button"
                        onClick={handleStartInterdiction}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-mono font-black text-xs py-3 px-5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] active:scale-[0.98] cursor-pointer uppercase"
                      >
                        <Navigation className="w-4 h-4" />
                        <span>Iniciar Despliegue de Interdicción</span>
                      </button>
                    )}

                    {order.status === 'IN_PROGRESS' && (
                      <button
                        type="button"
                        onClick={handleCompleteInterdiction}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-black text-xs py-3 px-5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] active:scale-[0.98] cursor-pointer uppercase"
                      >
                        <Check className="w-4 h-4" />
                        <span>Confirmar Interdicción Exitosa</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Crypto verification stamp */}
                <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-zinc-400">
                  <span>CANAL: VHF-TÁCTICO 142.850 MHz // CAD-C2</span>
                  <span>CRIPTOGRAFÍA: AES-256-MIL // PROTOCOLO S-2</span>
                  <span>HORA EMISIÓN: {new Date(order.timestamp).toLocaleString()}</span>
                </div>
              </div>

              {/* TWO COLUMN SUMMARY: OBJECTIVES & LOCATION */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Card: Tactical Objective & Target */}
                <div className="bg-[#0a1120] border border-[#1e293b] rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-cyan-400 border-b border-[#1e293b] pb-2">
                    <Crosshair className="w-4 h-4" />
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider">
                      Objetivo Doctrinal de Interdicción
                    </h4>
                  </div>

                  <div className="bg-[#050912] p-3 rounded-lg border border-[#142034] text-xs font-sans text-zinc-200 leading-relaxed">
                    {order.objective}
                  </div>

                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between py-1 border-b border-[#142034]">
                      <span className="text-zinc-500">Unidad Ejecutora:</span>
                      <span className="text-emerald-400 font-bold">{order.assignedUnit}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#142034]">
                      <span className="text-zinc-500">Comandante Emisor:</span>
                      <span className="text-white font-bold">{order.issuer}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#142034]">
                      <span className="text-zinc-500">Personal Desplegado:</span>
                      <span className="text-cyan-300 font-bold">
                        {assignedUnitObj ? `${assignedUnitObj.personnel} Efectivos Militares` : '8 Efectivos'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-zinc-500">Estado de Unidad:</span>
                      <span className="text-amber-400 font-bold">
                        {assignedUnitObj ? assignedUnitObj.status : 'PATROLLING'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Card: Location & Distance Vector */}
                <div className="bg-[#0a1120] border border-[#1e293b] rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-blue-400 border-b border-[#1e293b] pb-2">
                    <MapPin className="w-4 h-4" />
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider">
                      Zona de Bloqueo y Vector de Interdicción
                    </h4>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="bg-[#050912] p-2.5 rounded-lg border border-[#142034]">
                      <span className="text-[10px] text-zinc-500 block uppercase">Coordenadas Objetivo</span>
                      <span className="text-white font-bold text-xs mt-1 block">
                        {order.coordinates}
                      </span>
                    </div>

                    <div className="bg-[#050912] p-2.5 rounded-lg border border-[#142034]">
                      <span className="text-[10px] text-zinc-500 block uppercase">Posición de Patrulla</span>
                      <span className="text-emerald-400 font-bold text-xs mt-1 block">
                        {assignedUnitObj?.coordinates || '19°13\'10"S 68°35\'50"W'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-blue-950/30 border border-blue-800/40 p-3 rounded-lg flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <Compass className="w-4 h-4 text-blue-400" />
                      <div>
                        <span className="text-zinc-400 block text-[10px]">VECTOR DE APROXIMACIÓN:</span>
                        <span className="text-white font-bold">
                          {distanceKm !== null ? `${distanceKm} km hacia el punto de corte` : 'Sector Fronterizo'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-zinc-400 block text-[10px]">ETA ESTIMADO:</span>
                      <span className="text-cyan-400 font-bold">
                        {distanceKm !== null ? `${Math.round(distanceKm * 2.5)} min` : '15 min'}
                      </span>
                    </div>
                  </div>

                  {/* Photo Evidence Quick Teaser */}
                  <div className="pt-2 flex items-center justify-between border-t border-[#142034]">
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4 text-amber-400" />
                      <span className="text-[11px] font-mono text-zinc-300">
                        Evidencia Fotográfica de Fusión Disponible
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('EVIDENCE')}
                      className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 font-bold underline cursor-pointer"
                    >
                      Ver Fotografía →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SEGUIMIENTO MANDO LCC */}
          {activeTab === 'TRACKING' && (
            <div className="space-y-5">
              {/* Telemetry Panel */}
              <div className="bg-[#0a1120] border border-[#1e293b] rounded-xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#142034] pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
                    <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                      CANAL DE SEGUIMIENTO EN VIVO // MANDO ESTRATÉGICO CEO-LCC
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono">
                    <span className="px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-700 text-emerald-300 font-bold">
                      ENLACE ACTIVO (SATELITAL)
                    </span>
                    <span className="text-zinc-400">LATENCIA: 24ms</span>
                  </div>
                </div>

                {/* Updates Log stream */}
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {order.updates.map((update, idx) => (
                    <div 
                      key={idx} 
                      className={`p-2.5 rounded-lg border text-xs font-mono ${
                        update.includes('RECEPCIÓN CONFIRMADA') 
                          ? 'bg-blue-950/40 border-blue-600/50 text-blue-200'
                          : update.includes('DESPLIEGUE')
                          ? 'bg-amber-950/40 border-amber-600/50 text-amber-200'
                          : update.includes('COMPLETADA')
                          ? 'bg-emerald-950/40 border-emerald-600/50 text-emerald-200'
                          : update.includes('NOVEDAD')
                          ? 'bg-cyan-950/40 border-cyan-600/50 text-cyan-200'
                          : 'bg-[#050912] border-[#142034] text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1 text-[10px] opacity-75">
                        <span className="font-bold">
                          {update.includes('MANDO LCC') ? 'MANDO LCC (CEO)' : update.includes('RECEPCIÓN') ? 'PATRULLA TERRENO' : 'SISTEMA C2'}
                        </span>
                        <span>REGISTRO #{idx + 1}</span>
                      </div>
                      <p className="leading-relaxed">{update}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Transmit Update directly to Mando LCC */}
              <div className="bg-[#0a1120] border border-[#1e293b] rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-white uppercase">
                  <Send className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Transmitir Novedad de Seguimiento al Mando LCC</span>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1.5">
                  {quickPresets.map((preset, pIdx) => (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => setNewUpdateText(preset)}
                      className="text-[10px] font-mono bg-[#050912] hover:bg-zinc-800 text-zinc-300 border border-[#1e293b] px-2.5 py-1 rounded transition-colors cursor-pointer"
                    >
                      + {preset.substring(0, 38)}...
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSendProgressUpdate} className="flex gap-2">
                  <input
                    type="text"
                    value={newUpdateText}
                    onChange={(e) => setNewUpdateText(e.target.value)}
                    placeholder="Escriba reporte de avance para transmitir al Mando LCC..."
                    className="flex-1 bg-[#050912] text-xs font-mono text-white border border-[#1e293b] rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="submit"
                    disabled={!newUpdateText.trim()}
                    className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-mono font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Transmitir</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 3: FOTOGRAFÍA ANALIZADA EN FUSIÓN */}
          {activeTab === 'EVIDENCE' && (
            <div className="space-y-4">
              <div className="bg-[#0a1120] border border-[#1e293b] rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#142034] pb-3">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                      EVIDENCIA FOTOGRÁFICA ORIGINAL ANALIZADA EN EL TALLER DE FUSIÓN
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400">
                    SENSOR ID: {linkedAlert?.sourceName || 'VANT-01 / Sensor Térmico'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                  {/* Image Canvas / Viewport */}
                  <div className="md:col-span-8 bg-black rounded-xl border border-zinc-800 overflow-hidden relative group aspect-[16/10] flex items-center justify-center">
                    {mediaSource.startsWith('data:image') || mediaSource.startsWith('http') ? (
                      <img 
                        src={mediaSource} 
                        alt="Evidencia fotográfica analizada en taller de fusión" 
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      /* High quality SVG military tactical thermal graphic */
                      <svg className="w-full h-full" viewBox="0 0 600 380">
                        <defs>
                          <radialGradient id="heatSource" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#ff0044" stopOpacity="0.9" />
                            <stop offset="35%" stopColor="#ffaa00" stopOpacity="0.7" />
                            <stop offset="70%" stopColor="#0055ff" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#050a15" stopOpacity="0.1" />
                          </radialGradient>
                          <linearGradient id="scanlineGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="transparent" />
                            <stop offset="50%" stopColor="rgba(56, 189, 248, 0.15)" />
                            <stop offset="100%" stopColor="transparent" />
                          </linearGradient>
                        </defs>

                        {/* Night / Thermal terrain gradient */}
                        <rect width="600" height="380" fill="#040810" />
                        
                        {/* Terrain elevation lines */}
                        <path d="M 0,260 Q 150,220 300,250 T 600,230 L 600,380 L 0,380 Z" fill="#061226" />
                        <path d="M 0,300 Q 200,270 400,290 T 600,280 L 600,380 L 0,380 Z" fill="#081933" />

                        {/* Clandestine Route Track */}
                        <path d="M 40,360 Q 220,290 320,210 T 560,140" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="6,4" fill="none" />

                        {/* Thermal Convoys Detected */}
                        <circle cx="320" cy="210" r="38" fill="url(#heatSource)" />
                        <rect x="305" y="195" width="30" height="28" fill="#ffffff" rx="4" />
                        <rect x="260" y="225" width="26" height="22" fill="#ffdd44" rx="3" />
                        <rect x="355" y="180" width="24" height="20" fill="#ff5533" rx="3" />

                        {/* Tactical HUD Reticle */}
                        <circle cx="320" cy="210" r="65" stroke="#38bdf8" strokeWidth="1" strokeDasharray="4,4" fill="none" opacity="0.6" />
                        <line x1="320" y1="130" x2="320" y2="290" stroke="#38bdf8" strokeWidth="0.7" opacity="0.5" />
                        <line x1="240" y1="210" x2="400" y2="210" stroke="#38bdf8" strokeWidth="0.7" opacity="0.5" />

                        {/* Target Box */}
                        <rect x="290" y="175" width="60" height="65" stroke="#ef4444" strokeWidth="1.5" fill="none" />
                        <text x="290" y="168" fill="#ef4444" fontSize="10" fontFamily="monospace" fontWeight="bold">OBJETIVO INTERDICCIÓN</text>

                        {/* Tactical Telemetry Text in SVG */}
                        <text x="20" y="30" fill="#38bdf8" fontSize="11" fontFamily="monospace">CANAL: FLIR-OPTIC S-2 // VANT-01</text>
                        <text x="20" y="46" fill="#94a3b8" fontSize="9" fontFamily="monospace">GPS: {order.coordinates}</text>
                        <text x="440" y="30" fill="#10b981" fontSize="11" fontFamily="monospace">TRAZABILIDAD: OK</text>
                        <text x="440" y="46" fill="#94a3b8" fontSize="9" fontFamily="monospace">CALIFICACIÓN: A-1</text>
                      </svg>
                    )}

                    {/* Corner Tech Badges */}
                    <div className="absolute top-2 left-2 bg-black/70 border border-zinc-700 px-2 py-0.5 rounded text-[9px] font-mono text-cyan-300">
                      MODO: IMINT / RECONOCIMIENTO
                    </div>

                    <div className="absolute bottom-2 right-2 bg-black/70 border border-zinc-700 px-2 py-0.5 rounded text-[9px] font-mono text-emerald-300">
                      GEOREFERENCIADO: {order.coordinates}
                    </div>
                  </div>

                  {/* Metadata Column */}
                  <div className="md:col-span-4 space-y-3 text-xs font-mono">
                    <div className="bg-[#050912] p-3 rounded-lg border border-[#142034] space-y-2">
                      <span className="text-zinc-500 block text-[10px] uppercase font-bold">
                        Dictamen del Taller de Fusión:
                      </span>
                      <p className="text-zinc-200 font-sans text-xs leading-relaxed">
                        Evidencia visual clasificada como prioritaria. Corresponde a convoy vehicular ingresando por paso no habilitado fronterizo hacia rutas secundarias.
                      </p>
                    </div>

                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between py-1 border-b border-[#142034]">
                        <span className="text-zinc-500">Sensor de Captura:</span>
                        <span className="text-white">{linkedAlert?.sourceName || 'VANT-01 Cóndor'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#142034]">
                        <span className="text-zinc-500">Calificación S-2:</span>
                        <span className="text-emerald-400 font-bold">
                          {linkedAlert ? `${linkedAlert.reliability}-${linkedAlert.certainty}` : 'A-1 (Confirmado)'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#142034]">
                        <span className="text-zinc-500">Sector de Procedencia:</span>
                        <span className="text-cyan-300">{linkedAlert?.originSector || 'Salar de Coipasa'}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-zinc-500">Cadena de Custodia:</span>
                        <span className="text-emerald-400 font-bold">SHA256 VERIFICADO</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-[#030712] border-t border-[#1e293b] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <Radio className="w-4 h-4 text-cyan-400" />
            <span>ENLACE C2 CON MANDO LCC ACTIVO</span>
          </div>

          <div className="flex items-center gap-2">
            {order.status === 'ISSUED' && (
              <button
                type="button"
                onClick={handleConfirmReception}
                className="bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 shadow-[0_0_15px_rgba(225,29,72,0.3)] transition-all cursor-pointer uppercase"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirmar Recepción</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="bg-[#0d1627] hover:bg-[#142034] text-zinc-300 hover:text-white font-mono text-xs py-2 px-4 rounded-lg border border-[#24344d] transition-colors cursor-pointer"
            >
              Cerrar Ventana
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
