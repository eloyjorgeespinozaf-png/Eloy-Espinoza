/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RawAlert, ActionableIntel, AutomatedOrder, TacticalUnit, MilitaryRole } from '../types';
import { Radio, Shield, Zap, Navigation, ArrowRight, Info, CheckCircle2 } from 'lucide-react';

interface HorizontalFlowSimulatorProps {
  rawAlerts: RawAlert[];
  actionableIntel: ActionableIntel[];
  activeOrders: AutomatedOrder[];
  tacticalUnits: TacticalUnit[];
  currentRole: MilitaryRole;
  onSetRole?: (role: MilitaryRole) => void;
}

export default function HorizontalFlowSimulator({
  rawAlerts = [],
  actionableIntel = [],
  activeOrders = [],
  tacticalUnits = [],
  currentRole
}: HorizontalFlowSimulatorProps) {
  // Compute metrics for each node
  const pendingAlertsCount = rawAlerts.filter(a => a.status === 'PENDING').length;
  const validatedIntelCount = actionableIntel.filter(i => i.status === 'APPROVED').length;
  const activeOrdersCount = activeOrders.filter(o => o.status === 'ISSUED' || o.status === 'RECEIVED' || o.status === 'IN_PROGRESS').length;
  const completedMissionsCount = activeOrders.filter(o => o.status === 'COMPLETED').length;

  const flowNodes = [
    {
      id: 'TACTICAL_INPUT',
      title: '1. Órganos de Búsqueda',
      subtitle: 'Captación de Datos Crudos // Sección S-2',
      role: 'ROL_BUSQUEDA' as const,
      icon: <Radio className="w-5 h-5 text-yellow-400" />,
      metric: `${pendingAlertsCount} Alertas en Proceso`,
      description: 'Drones VANTs, sensores térmicos/FLIR, barreras infrarrojas y exploradores HUMINT captan y transmiten datos crudos.',
      badgeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      activeBorder: 'border-yellow-500/50 bg-yellow-500/5 shadow-yellow-500/5 ring-yellow-500/20',
      badge: 'PROCESAMIENTO S-2'
    },
    {
      id: 'OPERATIONAL_FUSION',
      title: '2. CFI de Brigada',
      subtitle: 'Fusión e Inteligencia Accionable',
      role: 'ROL_FUSION' as const,
      icon: <Shield className="w-5 h-5 text-orange-400" />,
      metric: `${validatedIntelCount} Inteligencias Validadas`,
      description: 'Central de Fusión de Inteligencia: analiza fiabilidad de fuentes, contrasta clanes y valida rutas clandestinas.',
      badgeColor: 'bg-[#f97316]/20 text-[#f97316] border-[#f97316]/30',
      activeBorder: 'border-[#f97316]/50 bg-[#f97316]/5 shadow-[#f97316]/5 ring-[#f97316]/20',
      badge: 'ANÁLISIS CFI'
    },
    {
      id: 'STRATEGIC_DECISION',
      title: '3. CEO-LCC Mando',
      subtitle: 'Comando Estratégico y Emisión de OOA',
      role: 'ROL_CEO' as const,
      icon: <Zap className="w-5 h-5 text-blue-400" />,
      metric: `${activeOrdersCount} OOA Activas`,
      description: 'El Comandante Estratégico supervisa el teatro operacional, autoriza despliegues y emite Órdenes de Operación Automatizadas.',
      badgeColor: 'bg-[#3b82f6]/20 text-[#3b82f6] border-[#3b82f6]/30',
      activeBorder: 'border-[#3b82f6]/50 bg-[#3b82f6]/5 shadow-[#3b82f6]/5 ring-[#3b82f6]/20',
      badge: 'MANDO CEO'
    },
    {
      id: 'TACTICAL_EXECUTION',
      title: '4. Unidades de Terreno',
      subtitle: 'Patrullas de Ejecución e Intercepción',
      role: 'ROL_TERRENO' as const,
      icon: <Navigation className="w-5 h-5 text-emerald-400" />,
      metric: `${completedMissionsCount} Misiones Cumplidas`,
      description: 'Patrullas tácticas reciben la OOA satelital, sincronizan GPS en vivo, interceptan objetivos y confirman el éxito en terreno.',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      activeBorder: 'border-emerald-500/50 bg-emerald-500/5 shadow-emerald-500/5 ring-emerald-500/20',
      badge: 'OPERACIÓN TERRENO'
    }
  ];

  // Strictly filter to the active assigned role's module (hiding all other modules)
  const activeNode = flowNodes.find(node => 
    node.role === currentRole ||
    (node.role === 'ROL_TERRENO' && (currentRole === 'ROL_PATRULLA' || currentRole === 'ROL_TERRENO'))
  ) || flowNodes[0];

  return (
    <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-5 md:p-6 relative overflow-hidden text-left shadow-lg">
      <div className="absolute top-0 right-0 w-48 h-48 bg-[#3b82f6]/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#1a1a1a] pb-3 mb-5">
        <div>
          <h3 className="text-sm font-mono font-bold text-white uppercase flex items-center gap-2">
            <CheckCircle2 className="w-4.5 h-4.5 text-[#10b981]" />
            Módulo Activo Asignado // Doctrina C4ISR
          </h3>
          <p className="text-[#888] text-xs mt-0.5 font-sans">
            Acceso asignado exclusivamente a este módulo. Los demás módulos están restringidos para su rol.
          </p>
        </div>
        
        <div className="flex items-center gap-2 mt-2 md:mt-0">
          <span className="text-[10px] text-[#10b981] font-mono bg-[#10b981]/10 px-2.5 py-1 rounded border border-[#10b981]/30 flex items-center gap-1.5 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
            ACCESO EXCLUSIVO ACTIVO
          </span>
          <span className="text-[10px] text-[#888] font-mono bg-[#050505] px-2 py-1 rounded border border-[#1a1a1a]">
            ESTACIÓN AISLADA CAD-C2
          </span>
        </div>
      </div>

      {/* Single Exclusive Active Module Card */}
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
