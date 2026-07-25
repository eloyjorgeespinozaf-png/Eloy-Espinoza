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
  onSetRole: (role: MilitaryRole) => void;
}

export default function HorizontalFlowSimulator({
  rawAlerts = [],
  actionableIntel = [],
  activeOrders = [],
  tacticalUnits = [],
  currentRole,
  onSetRole
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
      subtitle: 'Captación de Datos Crudos',
      role: 'ROL_PATRULLA' as const,
      icon: <Radio className="w-4 h-4" />,
      metric: `${pendingAlertsCount} Alertas`,
      description: 'Drones, informantes y patrullas envían reportes IMINT/HUMINT/SIGINT no validados desde la frontera.',
      color: 'border-orange-500 text-orange-400 bg-orange-500/5',
      badge: 'PROCESAMIENTO'
    },
    {
      id: 'OPERATIONAL_FUSION',
      title: '2. CFI de Brigada',
      subtitle: 'Fusión e Intel Accionable',
      role: 'ROL_FUSION' as const,
      icon: <Shield className="w-4 h-4" />,
      metric: `${validatedIntelCount} Inteligencias`,
      description: 'La Central de Fusión analiza fiabilidad de la fuente, contrasta base de datos de clanes y valida reportes.',
      color: 'border-orange-400 text-orange-400 bg-orange-400/5',
      badge: 'ANÁLISIS'
    },
    {
      id: 'STRATEGIC_DECISION',
      title: '3. CEO-LCC Mando',
      subtitle: 'Emisión de OOA Militar',
      role: 'ROL_CEO' as const,
      icon: <Zap className="w-4 h-4" />,
      metric: `${activeOrdersCount} OOA Activas`,
      description: 'El comandante revisa reportes validados y emite Órdenes de Operación Automatizadas (OOA) a patrullas.',
      color: 'border-blue-500 text-blue-400 bg-blue-500/5',
      badge: 'COMANDO'
    },
    {
      id: 'TACTICAL_EXECUTION',
      title: '4. Unidades de Terreno',
      subtitle: 'Ejecución e Intercepción',
      role: 'ROL_PATRULLA' as const,
      icon: <Navigation className="w-4 h-4" />,
      metric: `${completedMissionsCount} Cumplidas`,
      description: 'Patrullas reciben la OOA directo en terminales satelitales, interceptan contrabandistas y confirman el cierre.',
      color: 'border-emerald-500 text-emerald-400 bg-emerald-500/5',
      badge: 'OPERACIÓN'
    }
  ];

  return (
    <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-5 md:p-6 relative overflow-hidden text-left shadow-lg">
      <div className="absolute top-0 right-0 w-48 h-48 bg-[#3b82f6]/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#1a1a1a] pb-3 mb-5">
        <div>
          <h3 className="text-sm font-mono font-bold text-white uppercase flex items-center gap-2">
            <CheckCircle2 className="w-4.5 h-4.5 text-[#10b981]" />
            Flujo Horizontal-Integrado en Tiempo Real
          </h3>
          <p className="text-[#888] text-xs mt-0.5 font-sans">
            Presione un nodo para alternar instantáneamente al rol responsable de esa etapa.
          </p>
        </div>
        
        <span className="text-[10px] text-[#888] font-mono mt-2 md:mt-0 bg-[#050505] px-2 py-1 rounded border border-[#1a1a1a]">
          PROTOCOLO OPERATIVO INTEGRADO (POI)
        </span>
      </div>

      {/* Pipeline Diagram Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
        {flowNodes.map((node, idx) => {
          const isRoleActive = 
            (node.role === 'ROL_PATRULLA' && currentRole === 'ROL_PATRULLA' && idx === 0) ||
            (node.role === 'ROL_PATRULLA' && currentRole === 'ROL_PATRULLA' && idx === 3) ||
            (node.role === 'ROL_FUSION' && currentRole === 'ROL_FUSION') ||
            (node.role === 'ROL_CEO' && currentRole === 'ROL_CEO');
            
          return (
            <div key={node.id} className="relative flex flex-col">
              {/* Card wrapper */}
              <div 
                onClick={() => onSetRole(node.role)}
                className={`p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] flex-1 flex flex-col justify-between ${
                  isRoleActive 
                    ? 'border-[#10b981] bg-[#10b981]/5 shadow-lg shadow-[#10b981]/5 ring-1 ring-[#10b981]/20' 
                    : 'border-[#1a1a1a] bg-[#111] hover:bg-[#151515] hover:border-[#333]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      idx === 0 ? 'bg-[#f97316]/10 text-[#f97316]' :
                      idx === 1 ? 'bg-[#f97316]/10 text-[#f97316]' :
                      idx === 2 ? 'bg-[#3b82f6]/10 text-[#3b82f6]' :
                      'bg-[#10b981]/10 text-[#10b981]'
                    }`}>
                      {node.badge}
                    </span>
                    <span className="text-[#888] font-mono text-xs font-bold">
                      {node.metric}
                    </span>
                  </div>

                  <h4 className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                    <span className={isRoleActive ? 'text-[#10b981]' : 'text-[#666]'}>
                      {node.icon}
                    </span>
                    {node.title}
                  </h4>
                  
                  <p className="text-[10px] font-mono text-[#666] mt-0.5">
                    {node.subtitle}
                  </p>

                  <p className="text-[11px] text-[#aaa] font-sans mt-2.5 leading-relaxed">
                    {node.description}
                  </p>
                </div>

                {isRoleActive && (
                  <div className="mt-3 pt-2 border-t border-[#1a1a1a] flex items-center justify-between text-[9px] font-mono text-[#10b981] font-bold">
                    <span>VISTA EN PANTALLA</span>
                    <span>● ACTIVO</span>
                  </div>
                )}
                {!isRoleActive && (
                  <div className="mt-3 pt-2 border-t border-[#1a1a1a] flex items-center justify-between text-[9px] font-mono text-[#666]">
                    <span>IR AL DEPARTAMENTO</span>
                    <span>→</span>
                  </div>
                )}
              </div>

              {/* Connecting arrows between items (only on md sizes and up) */}
              {idx < 3 && (
                <div className="hidden md:flex absolute top-1/2 -right-3.5 -translate-y-1/2 z-10 bg-[#0a0a0a] border border-[#1a1a1a] p-1 rounded-full text-[#666]">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
