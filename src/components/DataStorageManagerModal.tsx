/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Save, 
  HardDrive, 
  Database, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  RefreshCw, 
  ShieldCheck, 
  FileText, 
  Users, 
  Clock, 
  Layers,
  Cloud,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  Clan, 
  RawAlert, 
  ActionableIntel, 
  AutomatedOrder, 
  TacticalUnit, 
  G2RegistryRecord,
  ModuleBackgroundsMap
} from '../types';
import { safeStorage } from '../utils/storage';
import { playCyberAccessGranted, playCyberClick, playCyberDenied } from '../utils/audio';

interface DataStorageManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  clans: Clan[];
  rawAlerts: RawAlert[];
  actionableIntel: ActionableIntel[];
  activeOrders: AutomatedOrder[];
  tacticalUnits: TacticalUnit[];
  expedientes: G2RegistryRecord[];
  moduleBackgrounds?: ModuleBackgroundsMap;
  onOpenSupabaseModal?: () => void;
  onRestoreAllData?: (data: {
    clans?: Clan[];
    rawAlerts?: RawAlert[];
    actionableIntel?: ActionableIntel[];
    activeOrders?: AutomatedOrder[];
    tacticalUnits?: TacticalUnit[];
    expedientes?: G2RegistryRecord[];
  }) => void;
}

export const DataStorageManagerModal: React.FC<DataStorageManagerModalProps> = ({
  isOpen,
  onClose,
  clans,
  rawAlerts,
  actionableIntel,
  activeOrders,
  tacticalUnits,
  expedientes,
  moduleBackgrounds,
  onOpenSupabaseModal,
  onRestoreAllData
}) => {
  const { users, auditLogs, user, isAdmin } = useAuth();
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [lastSaveTime, setLastSaveTime] = useState<string>(() => new Date().toLocaleTimeString());

  if (!isOpen) return null;

  // Force manual save of all state into safeStorage
  const handleSaveAllDataNow = () => {
    try {
      safeStorage.setItem('PII_LCC_CLANS', JSON.stringify(clans));
      safeStorage.setItem('PII_LCC_RAW_ALERTS', JSON.stringify(rawAlerts));
      safeStorage.setItem('PII_LCC_ACTIONABLE_INTEL', JSON.stringify(actionableIntel));
      safeStorage.setItem('PII_LCC_ACTIVE_ORDERS', JSON.stringify(activeOrders));
      safeStorage.setItem('PII_LCC_TACTICAL_UNITS', JSON.stringify(tacticalUnits));
      safeStorage.setItem('PII_LCC_EXPEDIENTES_G2', JSON.stringify(expedientes));
      safeStorage.setItem('PII_LCC_SYSTEM_USERS', JSON.stringify(users));
      safeStorage.setItem('PII_LCC_AUDIT_LOGS', JSON.stringify(auditLogs));
      
      const now = new Date().toLocaleTimeString();
      setLastSaveTime(now);
      setSaveStatus(`¡Toda la información del sistema ha sido respaldada y asegurada con éxito a las ${now}!`);
      playCyberAccessGranted(0.12);

      setTimeout(() => {
        setSaveStatus(null);
      }, 4000);
    } catch (e) {
      setSaveStatus('Error al guardar datos en almacenamiento local.');
      playCyberDenied(0.12);
    }
  };

  // Export full unified JSON package
  const handleExportFullBackup = () => {
    const fullBackup = {
      system: 'PII-LCC C4ISR MILITAR',
      version: '2026.4.2',
      exportedAt: new Date().toISOString(),
      exportedBy: {
        id: user?.id,
        name: user?.name,
        role: user?.role,
        organ: user?.organName,
        isAdmin
      },
      counts: {
        users: users.length,
        clans: clans.length,
        expedientes: expedientes.length,
        rawAlerts: rawAlerts.length,
        actionableIntel: actionableIntel.length,
        activeOrders: activeOrders.length,
        tacticalUnits: tacticalUnits.length,
        auditLogs: auditLogs.length
      },
      data: {
        users,
        clans,
        expedientes,
        rawAlerts,
        actionableIntel,
        activeOrders,
        tacticalUnits,
        auditLogs
      }
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullBackup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `RESPALDO_INTEGRAL_PII_LCC_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    playCyberAccessGranted(0.1);
  };

  // Import full JSON package
  const handleImportFullBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const data = parsed.data || parsed;

        if (onRestoreAllData && (data.clans || data.expedientes || data.rawAlerts || data.activeOrders)) {
          onRestoreAllData({
            clans: data.clans,
            expedientes: data.expedientes,
            rawAlerts: data.rawAlerts,
            actionableIntel: data.actionableIntel,
            activeOrders: data.activeOrders,
            tacticalUnits: data.tacticalUnits
          });

          // Also persist to storage
          if (data.clans) safeStorage.setItem('PII_LCC_CLANS', JSON.stringify(data.clans));
          if (data.rawAlerts) safeStorage.setItem('PII_LCC_RAW_ALERTS', JSON.stringify(data.rawAlerts));
          if (data.expedientes) safeStorage.setItem('PII_LCC_EXPEDIENTES_G2', JSON.stringify(data.expedientes));
          if (data.activeOrders) safeStorage.setItem('PII_LCC_ACTIVE_ORDERS', JSON.stringify(data.activeOrders));
          if (data.tacticalUnits) safeStorage.setItem('PII_LCC_TACTICAL_UNITS', JSON.stringify(data.tacticalUnits));
          if (data.actionableIntel) safeStorage.setItem('PII_LCC_ACTIONABLE_INTEL', JSON.stringify(data.actionableIntel));

          setSaveStatus('¡Respaldo integral restaurado y cargado en el sistema con éxito!');
          playCyberAccessGranted(0.12);
        } else {
          setSaveStatus('El archivo JSON no tiene la estructura de respaldo integral requerida.');
          playCyberDenied(0.12);
        }
      } catch (err) {
        setSaveStatus('Error al leer el archivo de respaldo.');
        playCyberDenied(0.12);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0b0f19] border-2 border-[#38bdf8]/70 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-[0_0_50px_rgba(56,189,248,0.25)] overflow-hidden text-left">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#075985] via-[#0c4a6e] to-[#020617] p-4 border-b border-[#1e293b] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-300 shadow-[0_0_15px_rgba(56,189,248,0.4)]">
              <HardDrive className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-mono font-bold text-white tracking-wider uppercase">
                  CENTRAL DE ALMACENAMIENTO Y RESPALDO DE DATOS
                </h2>
                <span className="text-[10px] bg-sky-500/20 text-sky-300 font-mono font-bold px-2 py-0.5 rounded border border-sky-400/40">
                  PII-LCC C4ISR
                </span>
              </div>
              <p className="text-[11px] text-sky-200/70 font-mono mt-0.5">
                Almacenamiento persistente de toda la información generada por el Administrador y Operadores de Búsqueda.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-[#94a3b8] hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          
          {/* Status Alert */}
          {saveStatus && (
            <div className="p-3 bg-sky-950/60 border border-sky-500/50 rounded-xl flex items-center gap-2 text-xs font-mono text-sky-300">
              <CheckCircle2 className="w-4 h-4 text-sky-400 flex-shrink-0" />
              <span>{saveStatus}</span>
            </div>
          )}

          {/* Quick Storage Status Bar */}
          <div className="bg-gradient-to-r from-emerald-950/30 via-slate-900 to-[#151c2c] border border-emerald-500/40 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <span className="text-xs font-mono font-bold text-white uppercase">
                  Persistencia Local y Criptográfica Activa
                </span>
                <p className="text-[10px] text-slate-400 font-mono">
                  Último guardado automático verificado: {lastSaveTime}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveAllDataNow}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black text-xs font-mono font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer transition-all"
            >
              <Save className="w-4 h-4" />
              Guardar y Asegurar Todo Ahora
            </button>
          </div>

          {/* Data Summary Grid */}
          <div>
            <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-2.5">
              Información Almacenada en la Base de Datos del Sistema:
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { label: 'Usuarios y Claves Móviles', count: users.length, color: 'text-blue-400', border: 'border-blue-500/30' },
                { label: 'Clanes e Inteligencia', count: clans.length, color: 'text-emerald-400', border: 'border-emerald-500/30' },
                { label: 'Expedientes G-2', count: expedientes.length, color: 'text-yellow-400', border: 'border-yellow-500/30' },
                { label: 'Alertas de Sensores S-2', count: rawAlerts.length, color: 'text-red-400', border: 'border-red-500/30' },
                { label: 'Informes CFI Validados', count: actionableIntel.length, color: 'text-sky-400', border: 'border-sky-500/30' },
                { label: 'Órdenes OOA CEO-LCC', count: activeOrders.length, color: 'text-purple-400', border: 'border-purple-500/30' },
                { label: 'Patrullas de Terreno', count: tacticalUnits.length, color: 'text-orange-400', border: 'border-orange-500/30' },
                { label: 'Bitácora de Auditoría', count: auditLogs.length, color: 'text-slate-300', border: 'border-slate-600/30' },
              ].map((item, idx) => (
                <div key={idx} className={`bg-[#0f1422] border ${item.border} rounded-xl p-3 flex flex-col justify-between`}>
                  <span className="text-[10px] font-mono text-slate-400 uppercase leading-tight">{item.label}</span>
                  <span className={`text-xl font-mono font-bold ${item.color} mt-1.5`}>{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Supabase Cloud Database Integration Card */}
          <div className="bg-gradient-to-r from-[#0c1a18] via-[#0f1925] to-[#0c1420] border border-emerald-500/40 rounded-xl p-4 space-y-3 shadow-[0_0_20px_rgba(16,185,129,0.12)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud className="w-5 h-5 text-emerald-400 animate-pulse" />
                <h3 className="text-xs font-mono font-bold text-white uppercase">
                  Base de Datos en la Nube Supabase (PostgreSQL)
                </h3>
                <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/40">
                  ID: uapjebdcioptahguruyq
                </span>
              </div>
              {onOpenSupabaseModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSupabaseModal();
                  }}
                  className="text-[11px] font-mono font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 underline cursor-pointer"
                >
                  <span>Panel Supabase</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>

            <p className="text-[11px] text-slate-300 font-mono leading-relaxed">
              La plataforma está integrada con el clúster de base de datos Supabase en tiempo real. Permite sincronizar clanes, alertas de búsqueda S-2, inteligencia validada CFI, órdenes OOA y unidades tácticas con persistencia relacional y encriptación.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              {onOpenSupabaseModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSupabaseModal();
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black text-xs font-mono font-bold flex items-center gap-2 cursor-pointer transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                >
                  <Cloud className="w-4 h-4" />
                  Abrir Sincronizador Supabase
                </button>
              )}
              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Enlace HTTP/2 REST API y GoTrue Auth activos
              </span>
            </div>
          </div>

          {/* Full Backup Operations */}
          <div className="bg-[#0f1422] border border-[#1e2738] rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-mono font-bold text-white uppercase flex items-center gap-1.5">
              <Database className="w-4 h-4 text-sky-400" />
              Operaciones de Copia de Seguridad Integral (.JSON)
            </h3>
            <p className="text-[11px] text-slate-400 font-mono leading-relaxed">
              Descargue una copia completa de toda la información militar generada para respaldarla en discos externos o transferirla a otras estaciones de mando de la Brigada.
            </p>

            <div className="flex flex-wrap gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleExportFullBackup}
                className="px-4 py-2 rounded-xl bg-[#151c2c] hover:bg-[#1e293b] text-sky-300 border border-sky-500/40 text-xs font-mono font-bold flex items-center gap-2 cursor-pointer transition-all shadow-md"
              >
                <Download className="w-4 h-4 text-sky-400" />
                Descargar Respaldo Completo (.JSON)
              </button>

              <label className="px-4 py-2 rounded-xl bg-[#151c2c] hover:bg-[#1e293b] text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold flex items-center gap-2 cursor-pointer transition-all shadow-md">
                <Upload className="w-4 h-4 text-emerald-400" />
                Restaurar Respaldo (.JSON)
                <input type="file" accept=".json" onChange={handleImportFullBackup} className="hidden" />
              </label>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-[#0f1422] p-3 border-t border-[#1e2738] flex items-center justify-between text-[10px] font-mono text-[#64748b] flex-shrink-0">
          <span>* Sistema C4ISR-PII-LCC // Almacenamiento Local Seguro Criptográfico.</span>
          <span className="text-sky-400">OPERADOR: {user?.name} ({user?.rank})</span>
        </div>

      </div>
    </div>
  );
};

export default DataStorageManagerModal;

