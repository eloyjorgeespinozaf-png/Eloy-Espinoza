/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { TacticalUnit, AutomatedOrder, RawAlert } from '../types';
import { 
  Radio, 
  CheckCircle2, 
  AlertTriangle, 
  Send, 
  Shield, 
  Check, 
  ExternalLink, 
  PlusCircle, 
  Navigation
} from 'lucide-react';
import { playChime, playSyntheticBeep } from '../utils/audio';
import InterdictionOrderModal from './InterdictionOrderModal';

interface InterdictionAlertTrackerProps {
  tacticalUnits?: TacticalUnit[];
  activeOrders?: AutomatedOrder[];
  rawAlerts?: RawAlert[];
  onConfirmOrder?: (id: string, newStatus: 'RECEIVED' | 'IN_PROGRESS' | 'COMPLETED') => void;
  onAddOrderUpdate?: (orderId: string, updateMsg: string) => void;
  onCreateOrder?: (order: AutomatedOrder) => void;
}

export default function InterdictionAlertTracker({
  tacticalUnits = [],
  activeOrders = [],
  rawAlerts = [],
  onConfirmOrder,
  onAddOrderUpdate,
  onCreateOrder
}: InterdictionAlertTrackerProps) {
  // Modal & Order Tracking state
  const [selectedOrderForModal, setSelectedOrderForModal] = useState<AutomatedOrder | null>(null);
  const [isInterdictionModalOpen, setIsInterdictionModalOpen] = useState<boolean>(false);
  const [ackNotice, setAckNotice] = useState<string | null>(null);
  const [customUpdateInput, setCustomUpdateInput] = useState<{ [orderId: string]: string }>({});

  // Auto-sync selected order with latest from activeOrders
  useEffect(() => {
    if (activeOrders.length > 0) {
      if (!selectedOrderForModal) {
        setSelectedOrderForModal(activeOrders[0]);
      } else {
        const found = activeOrders.find(o => o.id === selectedOrderForModal.id);
        if (found) setSelectedOrderForModal(found);
      }
    }
  }, [activeOrders]);

  // Handle direct confirmation of order reception
  const handleConfirmDirect = (order: AutomatedOrder) => {
    playChime(620, 840, 0.25);
    if (onConfirmOrder) {
      onConfirmOrder(order.id, 'RECEIVED');
    }
    const ackMsg = `[${new Date().toLocaleTimeString()}] RECEPCIÓN CONFIRMADA AL MANDO LCC: ${order.assignedUnit} confirma recepción de la OOA ${order.codeName} al CEO-LCC. Enlace C2 OK.`;
    if (onAddOrderUpdate) {
      onAddOrderUpdate(order.id, ackMsg);
    }
    setAckNotice(`RECEPCIÓN CONFIRMADA: Orden ${order.codeName} confirmada con éxito al Mando LCC.`);
    setTimeout(() => setAckNotice(null), 4500);
  };

  // Helper to simulate a new interdiction order for testing
  const handleSimulateNewOrder = () => {
    playSyntheticBeep(780, 0.15);
    const newSimOrder: AutomatedOrder = {
      id: `ooa-${Math.floor(100 + Math.random() * 900)}`,
      intelId: `intel-${Date.now()}`,
      codeName: `OP_CERCO_ANDINO_${Math.floor(10 + Math.random() * 90)}`,
      issuer: 'CEO-LCC Gral. J. Mendoza',
      assignedUnit: tacticalUnits[0]?.name || 'Patrulla Delta-3',
      objective: 'Interdicción e incautación inmediata de convoy de camiones sin matrícula transitando por ruta clandestina.',
      coordinates: '19°13\'10"S 68°35\'50"W (Hito 27)',
      status: 'ISSUED',
      timestamp: new Date().toISOString(),
      updates: [
        `[${new Date().toLocaleTimeString()}] ORDEN EMITIDA: Mando LCC instruye bloqueo y neutralización táctica en Hito 27.`
      ]
    };

    if (onCreateOrder) {
      onCreateOrder(newSimOrder);
    }
    setSelectedOrderForModal(newSimOrder);
    setAckNotice(`NUEVA DIRECTIVA: Orden ${newSimOrder.codeName} recibida desde el Puesto de Mando CEO-LCC.`);
    setTimeout(() => setAckNotice(null), 5000);
  };

  const issuedOrder = activeOrders.find(o => o.status === 'ISSUED');
  const activeOrder = activeOrders.find(o => o.status === 'RECEIVED' || o.status === 'IN_PROGRESS') || activeOrders[0];

  return (
    <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-4 sm:p-5 shadow-xl space-y-4 text-left font-sans mt-6">
      {/* Ack Notice Banner */}
      {ackNotice && (
        <div className="bg-emerald-950/80 border border-emerald-500/60 rounded-lg p-3 text-xs font-mono text-emerald-300 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{ackNotice}</span>
          </div>
          <button onClick={() => setAckNotice(null)} className="text-emerald-500 hover:text-white font-bold cursor-pointer">✕</button>
        </div>
      )}

      {/* Top Tactical Alert Ribbon: Interdiction Order from Mando LCC */}
      {issuedOrder ? (
        <div className="bg-gradient-to-r from-rose-950/70 via-[#0a101f] to-rose-950/70 border-2 border-rose-500/80 rounded-xl p-4 shadow-[0_0_30px_rgba(225,29,72,0.25)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-rose-500/20 border border-rose-500/50 text-rose-400 animate-bounce">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono font-bold bg-rose-900/80 border border-rose-600 text-rose-300 px-2 py-0.5 rounded uppercase animate-pulse">
                  MANDO LCC // ORDEN DE INTERDICCIÓN RECIBIDA
                </span>
                <span className="text-xs font-mono font-bold text-white">
                  CÓDIGO: <span className="text-cyan-400">{issuedOrder.codeName}</span>
                </span>
              </div>
              <p className="text-xs text-zinc-300 font-sans mt-1">
                Emisor: <strong className="text-zinc-200">{issuedOrder.issuer}</strong> | Asignada a: <strong className="text-emerald-400">{issuedOrder.assignedUnit}</strong> | Coordenadas: <strong className="text-white font-mono">{issuedOrder.coordinates}</strong>
              </p>
              <p className="text-[11px] text-zinc-400 font-sans line-clamp-1 mt-0.5">
                {issuedOrder.objective}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              type="button"
              onClick={() => handleConfirmDirect(issuedOrder)}
              className="flex-1 md:flex-initial bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-xs py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(225,29,72,0.4)] active:scale-[0.98] uppercase cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirmar Recepción</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedOrderForModal(issuedOrder);
                setIsInterdictionModalOpen(true);
              }}
              className="flex-1 md:flex-initial bg-blue-600/25 hover:bg-blue-600/40 text-blue-300 border border-blue-500/50 font-mono font-bold text-xs py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer uppercase"
            >
              <Radio className="w-4 h-4 text-blue-400" />
              <span>Ventana de Interdicción & Seguimiento</span>
            </button>
          </div>
        </div>
      ) : activeOrder ? (
        <div className="bg-[#070e1b] border border-blue-600/40 rounded-xl p-3.5 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-950 border border-blue-700/50 text-blue-400">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-blue-900/40 border border-blue-700/50 text-blue-300 px-2 py-0.5 rounded font-bold">
                  MANDO LCC // ENLACE C2 ACTIVO
                </span>
                <span className="text-white font-bold">{activeOrder.codeName}</span>
                <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                  activeOrder.status === 'IN_PROGRESS' 
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-600/40' 
                    : activeOrder.status === 'COMPLETED'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-600/40'
                    : 'bg-blue-500/20 text-blue-300 border border-blue-600/40'
                }`}>
                  {activeOrder.status === 'IN_PROGRESS' && 'Interdicción en curso'}
                  {activeOrder.status === 'RECEIVED' && 'Recepción Confirmada'}
                  {activeOrder.status === 'COMPLETED' && 'Interdicción Cumplida'}
                </span>
              </div>
              <span className="text-[11px] text-zinc-400 block mt-0.5">
                Unidad: <strong className="text-emerald-400">{activeOrder.assignedUnit}</strong> • Punto de Bloqueo: <strong className="text-zinc-300">{activeOrder.coordinates}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              type="button"
              onClick={() => {
                setSelectedOrderForModal(activeOrder);
                setIsInterdictionModalOpen(true);
              }}
              className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-xs py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_15px_rgba(37,99,235,0.3)]"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Abrir Ventana de Interdicción & Seguimiento Mando LCC</span>
            </button>
          </div>
        </div>
      ) : null}

      {/* SECCIÓN PRINCIPAL: CONTROL DE INTERDICCIONES & SEGUIMIENTO */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1a1a1a] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-mono font-bold text-white uppercase tracking-wider">
                  Control de Interdicciones & Seguimiento del Mando LCC
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-bold">
                  {activeOrders.length} ÓRDENES REGISTRADAS
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono">
                Recepción formal de órdenes C2, vectorización táctica y enlace de seguimiento con el CEO-LCC
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSimulateNewOrder}
              className="bg-[#0e1726] hover:bg-[#15233a] text-cyan-300 hover:text-cyan-200 border border-cyan-700/60 font-mono text-xs py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5 text-cyan-400" />
              <span>+ Simular Orden Mando LCC</span>
            </button>
          </div>
        </div>

        {/* List of Interdiction Orders */}
        {activeOrders.length === 0 ? (
          <div className="p-8 border border-dashed border-[#222] rounded-xl text-center text-zinc-500 font-mono text-xs">
            No hay órdenes de interdicción activas en este momento. Puede simular una directiva del Mando LCC con el botón superior.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeOrders.map((order) => {
              const isIssued = order.status === 'ISSUED';
              const isReceived = order.status === 'RECEIVED';
              const isInProgress = order.status === 'IN_PROGRESS';
              const isCompleted = order.status === 'COMPLETED';

              return (
                <div 
                  key={order.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isIssued 
                      ? 'bg-rose-950/20 border-rose-600/70 shadow-[0_0_20px_rgba(225,29,72,0.15)]'
                      : isReceived
                      ? 'bg-blue-950/20 border-blue-600/60'
                      : isInProgress
                      ? 'bg-amber-950/20 border-amber-600/60'
                      : 'bg-emerald-950/20 border-emerald-600/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-2.5 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                          isIssued 
                            ? 'bg-rose-950 border-rose-600 text-rose-300 animate-pulse'
                            : isReceived
                            ? 'bg-blue-950 border-blue-600 text-blue-300'
                            : isInProgress
                            ? 'bg-amber-950 border-amber-600 text-amber-300'
                            : 'bg-emerald-950 border-emerald-600 text-emerald-300'
                        }`}>
                          {isIssued && '1. PENDIENTE CONFIRMAR RECEPCIÓN'}
                          {isReceived && '2. RECEPCIÓN CONFIRMADA'}
                          {isInProgress && '3. INTERDICCIÓN EN CURSO'}
                          {isCompleted && '4. INTERDICCIÓN COMPLETADA'}
                        </span>
                      </div>

                      <h4 className="text-sm font-mono font-bold text-white mt-1">
                        {order.codeName}
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOrderForModal(order);
                        setIsInterdictionModalOpen(true);
                      }}
                      className="p-1.5 rounded bg-blue-600/20 hover:bg-blue-600/40 text-cyan-300 border border-blue-500/40 transition-colors cursor-pointer"
                      title="Abrir Ventana de Interdicción"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2 text-xs font-mono mb-4">
                    <p className="text-zinc-300 font-sans text-xs line-clamp-2">
                      {order.objective}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                      <div className="bg-[#050912] p-2 rounded border border-white/5">
                        <span className="text-zinc-500 block text-[9px]">UNIDAD ASIGNADA</span>
                        <span className="text-emerald-400 font-bold">{order.assignedUnit}</span>
                      </div>

                      <div className="bg-[#050912] p-2 rounded border border-white/5">
                        <span className="text-zinc-500 block text-[9px]">COORDENADAS CORTE</span>
                        <span className="text-white font-bold">{order.coordinates}</span>
                      </div>
                    </div>
                  </div>

                  {/* Primary Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
                    {isIssued && (
                      <button
                        type="button"
                        onClick={() => handleConfirmDirect(order)}
                        className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(225,29,72,0.3)] transition-all cursor-pointer uppercase"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirmar Recepción</span>
                      </button>
                    )}

                    {isReceived && (
                      <button
                        type="button"
                        onClick={() => {
                          if (onConfirmOrder) onConfirmOrder(order.id, 'IN_PROGRESS');
                          if (onAddOrderUpdate) onAddOrderUpdate(order.id, `[${new Date().toLocaleTimeString()}] INICIO DE INTERDICCIÓN: Despliegue de vehículos hacia ${order.coordinates}.`);
                          playSyntheticBeep(920, 0.2);
                        }}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer uppercase"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Iniciar Despliegue</span>
                      </button>
                    )}

                    {isInProgress && (
                      <button
                        type="button"
                        onClick={() => {
                          if (onConfirmOrder) onConfirmOrder(order.id, 'COMPLETED');
                          if (onAddOrderUpdate) onAddOrderUpdate(order.id, `[${new Date().toLocaleTimeString()}] INTERDICCIÓN COMPLETADA: Contrabando decomisado.`);
                          playChime(750, 990, 0.3);
                        }}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer uppercase"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Completar Interdicción</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOrderForModal(order);
                        setIsInterdictionModalOpen(true);
                      }}
                      className="bg-[#0b1320] hover:bg-[#121f35] text-cyan-300 font-mono text-xs py-2 px-3 rounded-lg border border-[#20324f] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Radio className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Ventana de Interdicción</span>
                    </button>
                  </div>

                  {/* Inline Quick update transmission to Mando LCC */}
                  <div className="mt-3 pt-2.5 border-t border-white/5 flex gap-1.5">
                    <input
                      type="text"
                      value={customUpdateInput[order.id] || ''}
                      onChange={(e) => setCustomUpdateInput({ ...customUpdateInput, [order.id]: e.target.value })}
                      placeholder="Novedad para Mando LCC..."
                      className="flex-1 bg-[#050912] text-xs font-mono text-white border border-[#1e293b] rounded px-2.5 py-1 focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const msg = customUpdateInput[order.id];
                        if (!msg?.trim()) return;
                        const formatted = `[${new Date().toLocaleTimeString()}] [NOVEDAD TERRENO -> MANDO LCC] ${msg.trim()}`;
                        if (onAddOrderUpdate) onAddOrderUpdate(order.id, formatted);
                        setCustomUpdateInput({ ...customUpdateInput, [order.id]: '' });
                        playSyntheticBeep(850, 0.1);
                      }}
                      className="bg-cyan-600/30 hover:bg-cyan-600 text-cyan-300 hover:text-white text-xs font-mono px-2.5 py-1 rounded border border-cyan-600/50 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" />
                      <span>Enviar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* RENDER INTERDICTION ORDER MODAL WINDOW */}
      {selectedOrderForModal && (
        <InterdictionOrderModal
          isOpen={isInterdictionModalOpen}
          onClose={() => setIsInterdictionModalOpen(false)}
          order={selectedOrderForModal}
          allOrders={activeOrders}
          onSelectOrder={(ord) => setSelectedOrderForModal(ord)}
          tacticalUnits={tacticalUnits}
          rawAlerts={rawAlerts}
          onConfirmOrder={(id, newStatus) => {
            if (onConfirmOrder) onConfirmOrder(id, newStatus);
            setSelectedOrderForModal(prev => prev && prev.id === id ? { ...prev, status: newStatus } : prev);
          }}
          onAddOrderUpdate={(id, updateMsg) => {
            if (onAddOrderUpdate) onAddOrderUpdate(id, updateMsg);
            setSelectedOrderForModal(prev => prev && prev.id === id ? { ...prev, updates: [...prev.updates, updateMsg] } : prev);
          }}
        />
      )}
    </div>
  );
}
