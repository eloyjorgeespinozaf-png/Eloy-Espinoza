/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RawAlert, ActionableIntel, AutomatedOrder, TacticalUnit, MilitaryRole } from '../types';
import { Radio, Shield, Zap, Navigation, ArrowRight, Info, CheckCircle2, Crown, Eye, Layers } from 'lucide-react';

interface HorizontalFlowSimulatorProps {
  rawAlerts: RawAlert[];
  actionableIntel: ActionableIntel[];
  activeOrders: AutomatedOrder[];
  tacticalUnits: TacticalUnit[];
  currentRole: MilitaryRole;
  onSetRole?: (role: MilitaryRole) => void;
  adminInspectedRole?: MilitaryRole | null;
  onAdminInspectOrgan?: (role: MilitaryRole) => void;
}

export default function HorizontalFlowSimulator({
  rawAlerts = [],
  actionableIntel = [],
  activeOrders = [],
  tacticalUnits = [],
  currentRole,
  onSetRole,
  adminInspectedRole,
  onAdminInspectOrgan
}: HorizontalFlowSimulatorProps) {
  // Compute metrics for each node
  const pendingAlertsCount = rawAlerts.filter(a => a.status === 'PENDING').length;
  const validatedIntelCount = actionableIntel.filter(i => i.status === 'APPROVED').length;
  const activeOrdersCount = activeOrders.filter(o => o.status === 'ISSUED' || o.status === 'RECEIVED' || o.status === 'IN_PROGRESS').length;
  const completedMissionsCount = activeOrders.filter(o => o.status === 'COMPLETED').length;

  const isAdmin = currentRole === 'ROL_CEO';

  const flowNodes = [
    {
      id: 'STRATEGIC_DECISION',
      title: 'CEO-LCC Mando',
      roleTitle: 'ADMINISTRADOR GENERAL',
      subtitle: 'Comando Estratégico, Administración & Emisión OOA',
      role: 'ROL_CEO' as const,
      icon: <Crown className="w-5 h-5 text-blue-400" />,
      metric: `${activeOrdersCount} OOA Activas`,
      description: 'Administrador General del Sistema C4ISR. Control supremo, emisión de OOA y supervisión integral de todos los Órganos de Búsqueda.',
      badgeColor: 'bg-[#3b82f6]/20 text-[#3b82f6] border-[#3b82f6]/30',
      activeBorder: 'border-[#3b82f6]/50 bg-[#3b82f6]/5 shadow-[#3b82f6]/5 ring-[#3b82f6]/20',
      badge: 'ADMINISTRADOR GENERAL',
      isSearchOrgan: false
    },
    {
      id: 'TACTICAL_INPUT',
      title: 'Órgano de Búsqueda S-2',
      roleTitle: 'ÓRGANO DE BÚSQUEDA #1',
      subtitle: 'Captación IMINT/HUMINT/SIGINT & Sensores S-2',
      role: 'ROL_BUSQUEDA' as const,
      icon: <Radio className="w-5 h-5 text-yellow-400" />,
      metric: `${pendingAlertsCount} Alertas en Proceso`,
      description: 'Drones VANTs, sensores térmicos/FLIR, barreras infrarrojas y exploradores HUMINT captan y transmiten datos crudos.',
      badgeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      activeBorder: 'border-yellow-500/50 bg-yellow-500/5 shadow-yellow-500/5 ring-yellow-500/20',
      badge: 'ÓRGANO DE BÚSQUEDA S-2',
      isSearchOrgan: true
    },
    {
      id: 'OPERATIONAL_FUSION',
      title: 'Órgano de Fusión (CFI)',
      roleTitle: 'ÓRGANO DE BÚSQUEDA #2',
      subtitle: 'Centro de Fusión & Análisis de Búsqueda',
      role: 'ROL_FUSION' as const,
      icon: <Shield className="w-5 h-5 text-orange-400" />,
      metric: `${validatedIntelCount} Inteligencias Validadas`,
      description: 'Central de Fusión de Inteligencia: analiza fiabilidad de fuentes, contrasta clanes y valida rutas clandestinas.',
      badgeColor: 'bg-[#f97316]/20 text-[#f97316] border-[#f97316]/30',
      activeBorder: 'border-[#f97316]/50 bg-[#f97316]/5 shadow-[#f97316]/5 ring-[#f97316]/20',
      badge: 'ÓRGANO DE FUSIÓN CFI',
      isSearchOrgan: true
    },
    {
      id: 'TACTICAL_EXECUTION',
      title: 'Órgano de Terreno',
      roleTitle: 'ÓRGANO DE BÚSQUEDA #3',
      subtitle: 'Patrullas de Reconocimiento y Terreno',
      role: 'ROL_TERRENO' as const,
      icon: <Navigation className="w-5 h-5 text-emerald-400" />,
      metric: `${completedMissionsCount} Misiones Cumplidas`,
      description: 'Patrullas tácticas de exploración, reconocimiento ofensivo de rutas clandestinas y ejecución de interdicción.',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      activeBorder: 'border-emerald-500/50 bg-emerald-500/5 shadow-emerald-500/5 ring-emerald-500/20',
      badge: 'ÓRGANO DE BÚSQUEDA TERRENO',
      isSearchOrgan: true
    }
  ];

  // Strictly filter to the active assigned role's module for non-admin search organs
  const activeNode = flowNodes.find(node => 
    node.role === currentRole ||
    (node.role === 'ROL_TERRENO' && (currentRole === 'ROL_PATRULLA' || currentRole === 'ROL_TERRENO'))
  ) || flowNodes[0];

  // If operator is the CEO-LCC Administrator, show administrative oversight board
  if (isAdmin) {
    return (
      <div className="bg-[#0a0a0a] border border-blue-900/40 rounded-xl p-4 md:p-5 relative overflow-hidden text-left shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#3b82f6]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#1a1a1a] pb-3 mb-4 gap-2">
          <div>
            <h3 className="text-sm font-mono font-bold text-white uppercase flex items-center gap-2">
              <Crown className="w-4 h-4 text-blue-400" />
              <span>CONSOLA DEL ADMINISTRADOR GENERAL // CEO-LCC MANDO</span>
            </h3>
            <p className="text-[#888] text-xs mt-0.5 font-sans">
              El CEO-LCC Mando opera como Administrador Supremo con control y supervisión directa sobre los 3 Órganos de Búsqueda subordinados.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-blue-400 font-mono bg-blue-950/60 px-2.5 py-1 rounded border border-blue-600/40 flex items-center gap-1.5 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              ROL: ADMINISTRADOR TOTAL
            </span>
            <span className="text-[10px] text-zinc-400 font-mono bg-black/60 px-2 py-1 rounded border border-zinc-800">
              3 ÓRGANOS SUBORDINADOS
            </span>
          </div>
        </div>

        {/* Admin 4-Node Flow Chain */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {flowNodes.map((node) => {
            const isCurrentlyInspected = adminInspectedRole 
              ? (adminInspectedRole === node.role || (adminInspectedRole === 'ROL_TERRENO' && node.role === 'ROL_TERRENO'))
              : node.role === 'ROL_CEO';

            return (
              <div
                key={node.id}
                onClick={() => {
                  if (onAdminInspectOrgan) {
                    onAdminInspectOrgan(node.role);
                  }
                }}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none text-left flex flex-col justify-between ${
                  isCurrentlyInspected
                    ? `bg-[#0f172a] ${node.activeBorder} ring-1 ring-blue-400/30`
                    : 'bg-[#080d12]/80 border-zinc-800/80 hover:border-zinc-700 hover:bg-[#0c131a]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${node.badgeColor}`}>
                      {node.roleTitle}
                    </span>
                    {isCurrentlyInspected ? (
                      <span className="flex items-center gap-1 text-[9px] font-mono text-emerald-400 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        EN PANTALLA
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono text-zinc-500 flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        SUPERVISAR
                      </span>
                    )}
                  </div>

                  <h4 className="text-white font-mono text-xs font-bold flex items-center gap-1.5 mb-0.5">
                    {node.icon}
                    <span>{node.title}</span>
                  </h4>
                  <p className="text-[10px] text-zinc-400 font-sans line-clamp-2 leading-relaxed">
                    {node.description}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between font-mono text-[10px]">
                  <span className="text-zinc-500">Métrica:</span>
                  <span className="text-zinc-200 font-bold">{node.metric}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Regular Non-Admin Search Organ View (Subordinated to CEO-LCC)
  return (
    <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-5 md:p-6 relative overflow-hidden text-left shadow-lg">
      <div className="absolute top-0 right-0 w-48 h-48 bg-[#3b82f6]/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#1a1a1a] pb-3 mb-5">
        <div>
          <h3 className="text-sm font-mono font-bold text-white uppercase flex items-center gap-2">
            <CheckCircle2 className="w-4.5 h-4.5 text-[#10b981]" />
            Órgano de Búsqueda Activo // Doctrina C4ISR
          </h3>
          <p className="text-[#888] text-xs mt-0.5 font-sans">
            Terminal operando como Órgano de Búsqueda subordinado al <strong className="text-blue-400">CEO-LCC Mando (Administrador)</strong>.
          </p>
        </div>
        
        <div className="flex items-center gap-2 mt-2 md:mt-0">
          <span className="text-[10px] text-[#10b981] font-mono bg-[#10b981]/10 px-2.5 py-1 rounded border border-[#10b981]/30 flex items-center gap-1.5 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
            ENLACE CON ADMINISTRADOR ACTIVO
          </span>
          <span className="text-[10px] text-[#888] font-mono bg-[#050505] px-2 py-1 rounded border border-[#1a1a1a]">
            CAD-C2
          </span>
        </div>
      </div>

      {/* Single Exclusive Search Organ Card */}
      <div className={`p-4 rounded-xl border ring-1 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${activeNode.activeBorder}`}>
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${activeNode.badgeColor}`}>
              {activeNode.badge}
            </span>
            <h4 className="text-white font-mono text-sm font-bold flex items-center gap-2">
              {activeNode.icon}
              {activeNode.title}
            </h4>
            <span className="text-xs text-[#888] font-mono">({activeNode.subtitle})</span>
          </div>
          <p className="text-xs text-[#bbb] font-sans leading-relaxed">
            {activeNode.description}
          </p>
          <div className="flex items-center gap-2 text-[11px] font-mono text-blue-400/90 pt-1">
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            <span>Canal de reporte directo hacia CEO-LCC Mando (Administrador General)</span>
          </div>
        </div>

        <div className="flex flex-col items-start md:items-end gap-1 shrink-0 bg-black/60 p-3 rounded-lg border border-[#222]">
          <span className="text-[10px] font-mono text-[#888] uppercase font-bold">Métrica en Tiempo Real:</span>
          <span className="text-base font-mono font-bold text-white">
            {activeNode.metric}
          </span>
          <span className="text-[9px] font-mono text-[#10b981] flex items-center gap-1 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-ping" />
            ESTACIÓN OPERACIONAL AUTORIZADA
          </span>
        </div>
      </div>
    </div>
  );
}
