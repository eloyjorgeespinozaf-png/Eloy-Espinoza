/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Cloud, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Download, 
  Upload, 
  Copy, 
  Check, 
  ShieldCheck, 
  Activity, 
  ExternalLink,
  Table,
  Layers,
  HardDrive
} from 'lucide-react';
import { 
  SUPABASE_CONFIG, 
  testSupabaseConnection, 
  syncAllDataToSupabase, 
  fetchLatestSupabaseData, 
  SUPABASE_SQL_SCHEMA, 
  SupabaseHealthStatus,
  UnifiedPiiDataPayload
} from '../lib/supabase';
import { 
  Clan, 
  RawAlert, 
  ActionableIntel, 
  AutomatedOrder, 
  TacticalUnit, 
  G2RegistryRecord 
} from '../types';
import { useAuth } from '../context/AuthContext';
import { playCyberAccessGranted, playCyberClick, playCyberDenied } from '../utils/audio';

interface SupabaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  clans: Clan[];
  rawAlerts: RawAlert[];
  actionableIntel: ActionableIntel[];
  activeOrders: AutomatedOrder[];
  tacticalUnits: TacticalUnit[];
  expedientes: G2RegistryRecord[];
  onRestoreAllData?: (data: {
    clans?: Clan[];
    rawAlerts?: RawAlert[];
    actionableIntel?: ActionableIntel[];
    activeOrders?: AutomatedOrder[];
    tacticalUnits?: TacticalUnit[];
    expedientes?: G2RegistryRecord[];
  }) => void;
}

export const SupabaseSyncModal: React.FC<SupabaseSyncModalProps> = ({
  isOpen,
  onClose,
  clans,
  rawAlerts,
  actionableIntel,
  activeOrders,
  tacticalUnits,
  expedientes,
  onRestoreAllData
}) => {
  const { user, users } = useAuth();
  const [activeTab, setActiveTab] = useState<'STATUS' | 'SQL' | 'DETAILS'>('STATUS');
  const [isPinging, setIsPinging] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [health, setHealth] = useState<SupabaseHealthStatus | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  // Ping Supabase on modal open
  useEffect(() => {
    if (isOpen) {
      handlePing();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePing = async () => {
    setIsPinging(true);
    setSyncFeedback(null);
    try {
      const res = await testSupabaseConnection();
      setHealth(res);
      if (res.ok) {
        playCyberAccessGranted(0.08);
      }
    } catch (e: any) {
      setHealth({
        ok: false,
        status: 'ERROR',
        latencyMs: 0,
        projectId: SUPABASE_CONFIG.projectId,
        authApiOk: false,
        message: e.message,
        tablesStatus: {},
        timestamp: new Date().toISOString()
      });
      playCyberDenied(0.08);
    } finally {
      setIsPinging(false);
    }
  };

  const handleSyncToSupabase = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    playCyberClick('laser', 0.1);

    const payload: UnifiedPiiDataPayload = {
      clans,
      rawAlerts,
      actionableIntel,
      activeOrders,
      tacticalUnits,
      expedientes,
      users
    };

    try {
      const result = await syncAllDataToSupabase(payload, user?.name || 'CEO-LCC MANDO');
      if (result.success) {
        setSyncFeedback(`¡Sincronización exitosa! Se respaldaron ${result.tablesSynced.length} módulos y ${result.totalEntities} entidades en Supabase.`);
        playCyberAccessGranted(0.12);
        // Refresh ping to detect newly inserted data
        handlePing();
      } else {
        const reasons = result.tablesFailed.map(f => `${f.table}: ${f.reason}`).join(' | ');
        setSyncFeedback(`Sincronización parcial/pendiente: ${reasons}`);
        playCyberDenied(0.12);
      }
    } catch (err: any) {
      setSyncFeedback(`Error al sincronizar con Supabase: ${err.message}`);
      playCyberDenied(0.12);
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullFromSupabase = async () => {
    setIsRestoring(true);
    setSyncFeedback(null);
    playCyberClick('laser', 0.1);

    try {
      const result = await fetchLatestSupabaseData();
      if (result.data && onRestoreAllData) {
        onRestoreAllData({
          clans: result.data.clans as Clan[] | undefined,
          rawAlerts: result.data.rawAlerts as RawAlert[] | undefined,
          expedientes: result.data.expedientes as G2RegistryRecord[] | undefined,
          actionableIntel: result.data.actionableIntel as ActionableIntel[] | undefined,
          activeOrders: result.data.activeOrders as AutomatedOrder[] | undefined,
          tacticalUnits: result.data.tacticalUnits as TacticalUnit[] | undefined
        });
        setSyncFeedback(`¡Datos restaurados con éxito desde Supabase (${result.source})!`);
        playCyberAccessGranted(0.12);
      } else {
        setSyncFeedback(result.error || 'No se encontraron datos previos en Supabase.');
        playCyberDenied(0.12);
      }
    } catch (err: any) {
      setSyncFeedback(`Error al consultar Supabase: ${err.message}`);
      playCyberDenied(0.12);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    playCyberClick('laser', 0.08);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0b0f17] border border-emerald-500/40 rounded-xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-[0_0_40px_rgba(16,185,129,0.18)] overflow-hidden text-zinc-200 font-sans">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#0e1420]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-mono font-bold text-white tracking-wide">
                  INTEGRACIÓN DE BASE DE DATOS SUPABASE
                </h2>
                <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">
                  ID: {SUPABASE_CONFIG.projectId}
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                Persistencia en la Nube // Respaldo Criptográfico // Sincronización PII-LCC
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-zinc-800/80 bg-[#0d121c]">
          <button
            onClick={() => setActiveTab('STATUS')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-mono font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'STATUS'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>ESTADO Y SINCRONIZACIÓN</span>
          </button>
          <button
            onClick={() => setActiveTab('SQL')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-mono font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'SQL'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>ESQUEMA SQL SUPABASE</span>
          </button>
          <button
            onClick={() => setActiveTab('DETAILS')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-mono font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'DETAILS'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>CREDENCIALES Y PARÁMETROS</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          
          {/* Status Feedback Banner */}
          {syncFeedback && (
            <div className={`p-3 rounded-lg border flex items-start gap-2.5 font-mono text-xs ${
              syncFeedback.includes('Error') 
                ? 'bg-red-950/40 border-red-500/40 text-red-300' 
                : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
            }`}>
              {syncFeedback.includes('Error') ? (
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{syncFeedback}</span>
            </div>
          )}

          {activeTab === 'STATUS' && (
            <div className="space-y-6">
              
              {/* Connection Status Card */}
              <div className="bg-[#121824] border border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-zinc-400 uppercase text-[10px]">Conectividad:</span>
                    {health?.ok ? (
                      <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                        ACTIVO // CONECTADO A SUPABASE CLOUD
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        {isPinging ? 'VERIFICANDO ENLACE...' : 'PENDIENTE / DESCONECTADO'}
                      </span>
                    )}
                  </div>
                  <p className="text-zinc-300 text-xs font-mono">
                    {health?.message || 'Verificando estado de la base de datos Supabase...'}
                  </p>
                  {health && (
                    <div className="flex items-center gap-4 text-[10px] font-mono text-zinc-400 pt-1">
                      <span>Latencia de red: <strong className="text-emerald-400">{health.latencyMs} ms</strong></span>
                      <span>Gateway Auth: <strong className="text-sky-400">{health.authApiOk ? 'OK (GoTrue v2)' : 'FALLIDO'}</strong></span>
                      <span>Último ping: {new Date(health.timestamp).toLocaleTimeString()}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  <button
                    onClick={handlePing}
                    disabled={isPinging}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors font-mono font-bold cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin text-emerald-400' : ''}`} />
                    <span>{isPinging ? 'Comprobando...' : 'Probar Conexión'}</span>
                  </button>
                </div>
              </div>

              {/* Data Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 font-mono">
                <div className="bg-[#121824] border border-zinc-800/80 rounded-lg p-3 text-center">
                  <span className="text-[10px] text-zinc-400 block uppercase">Clanes</span>
                  <span className="text-lg font-bold text-emerald-400">{clans.length}</span>
                </div>
                <div className="bg-[#121824] border border-zinc-800/80 rounded-lg p-3 text-center">
                  <span className="text-[10px] text-zinc-400 block uppercase">Alertas S-2</span>
                  <span className="text-lg font-bold text-amber-400">{rawAlerts.length}</span>
                </div>
                <div className="bg-[#121824] border border-zinc-800/80 rounded-lg p-3 text-center">
                  <span className="text-[10px] text-zinc-400 block uppercase">Expedientes</span>
                  <span className="text-lg font-bold text-sky-400">{expedientes.length}</span>
                </div>
                <div className="bg-[#121824] border border-zinc-800/80 rounded-lg p-3 text-center">
                  <span className="text-[10px] text-zinc-400 block uppercase">Intel CFI</span>
                  <span className="text-lg font-bold text-orange-400">{actionableIntel.length}</span>
                </div>
                <div className="bg-[#121824] border border-zinc-800/80 rounded-lg p-3 text-center">
                  <span className="text-[10px] text-zinc-400 block uppercase">Órdenes OOA</span>
                  <span className="text-lg font-bold text-purple-400">{activeOrders.length}</span>
                </div>
                <div className="bg-[#121824] border border-zinc-800/80 rounded-lg p-3 text-center">
                  <span className="text-[10px] text-zinc-400 block uppercase">Patrullas</span>
                  <span className="text-lg font-bold text-cyan-400">{tacticalUnits.length}</span>
                </div>
              </div>

              {/* Action Buttons: Push to Supabase vs Pull from Supabase */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Push Card */}
                <div className="bg-gradient-to-br from-[#121a28] to-[#0d1420] border border-emerald-600/40 rounded-xl p-5 space-y-3 shadow-sm">
                  <div className="flex items-center gap-2 text-emerald-400 font-mono font-bold text-sm">
                    <Upload className="w-4 h-4" />
                    <span>SINCRONIZAR A SUPABASE (PUSH)</span>
                  </div>
                  <p className="text-zinc-300 text-xs leading-relaxed">
                    Transfiere y almacena de forma duradera todos los expedientes, alertas crudas, clanes, inteligencia validada y unidades tácticas en la base de datos PostgreSQL de Supabase.
                  </p>
                  <button
                    onClick={handleSyncToSupabase}
                    disabled={isSyncing}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-black font-mono font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer disabled:opacity-50"
                  >
                    {isSyncing ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-black" />
                    ) : (
                      <Database className="w-4 h-4" />
                    )}
                    <span>{isSyncing ? 'Sincronizando con Supabase...' : 'Sincronizar Todo a Supabase Ahora'}</span>
                  </button>
                </div>

                {/* Pull Card */}
                <div className="bg-gradient-to-br from-[#131722] to-[#0e111a] border border-sky-600/40 rounded-xl p-5 space-y-3 shadow-sm">
                  <div className="flex items-center gap-2 text-sky-400 font-mono font-bold text-sm">
                    <Download className="w-4 h-4" />
                    <span>RESTAURAR DESDE SUPABASE (PULL)</span>
                  </div>
                  <p className="text-zinc-300 text-xs leading-relaxed">
                    Recupera el último snapshot o registros relacionales guardados en Supabase Cloud para restaurar el estado completo de la plataforma en este dispositivo.
                  </p>
                  <button
                    onClick={handlePullFromSupabase}
                    disabled={isRestoring}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-black font-mono font-bold transition-all shadow-[0_0_15px_rgba(14,165,233,0.3)] cursor-pointer disabled:opacity-50"
                  >
                    {isRestoring ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-black" />
                    ) : (
                      <Cloud className="w-4 h-4" />
                    )}
                    <span>{isRestoring ? 'Descargando datos...' : 'Restaurar Datos desde Supabase'}</span>
                  </button>
                </div>

              </div>

              {/* Table Schema Status Checklist */}
              {health?.tablesStatus && Object.keys(health.tablesStatus).length > 0 && (
                <div className="bg-[#101622] border border-zinc-800 rounded-xl p-4 space-y-3 font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
                      <Table className="w-3.5 h-3.5 text-emerald-400" />
                      Estado de Tablas en Supabase Schema
                    </span>
                    <button
                      onClick={() => setActiveTab('SQL')}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
                    >
                      Ver script SQL para crear tablas
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                    {Object.entries(health.tablesStatus).map(([tbl, isReady]) => (
                      <div key={tbl} className="flex items-center justify-between p-2 rounded bg-zinc-900/60 border border-zinc-800">
                        <span className="text-zinc-300">{tbl}</span>
                        {isReady ? (
                          <span className="text-emerald-400 flex items-center gap-1 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Lista
                          </span>
                        ) : (
                          <span className="text-amber-400 flex items-center gap-1 font-bold">
                            <AlertTriangle className="w-3.5 h-3.5" /> Pendiente SQL
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {activeTab === 'SQL' && (
            <div className="space-y-4 font-mono">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#121824] border border-zinc-800 p-4 rounded-xl">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase">
                    Script de Inicialización de Tablas en Supabase
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Copie este script y péguelo en el <strong>SQL Editor</strong> de su panel de Supabase para crear las tablas relacionales y políticas de seguridad (RLS).
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopySql}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-black font-bold transition-colors cursor-pointer text-xs"
                  >
                    {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSql ? '¡Copiado!' : 'Copiar Script SQL'}</span>
                  </button>
                  <a
                    href={`https://supabase.com/dashboard/project/${SUPABASE_CONFIG.projectId}/sql/new`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors cursor-pointer text-xs"
                  >
                    <span>Abrir SQL Editor</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="relative">
                <pre className="p-4 rounded-xl bg-black/90 border border-zinc-800 text-emerald-300 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-[350px]">
                  {SUPABASE_SQL_SCHEMA}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'DETAILS' && (
            <div className="space-y-4 font-mono">
              <div className="bg-[#121824] border border-zinc-800 rounded-xl p-5 space-y-4">
                <h3 className="text-xs font-bold text-white uppercase flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Credenciales y Endpoints Vinculados
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-zinc-400 text-[10px] uppercase block">Project ID:</label>
                    <div className="p-2 rounded bg-black/60 border border-zinc-800 text-emerald-400 font-bold select-all">
                      {SUPABASE_CONFIG.projectId}
                    </div>
                  </div>

                  <div>
                    <label className="text-zinc-400 text-[10px] uppercase block">Base URL / Endpoint:</label>
                    <div className="p-2 rounded bg-black/60 border border-zinc-800 text-zinc-200 select-all">
                      {SUPABASE_CONFIG.url}
                    </div>
                  </div>

                  <div>
                    <label className="text-zinc-400 text-[10px] uppercase block">REST API URL:</label>
                    <div className="p-2 rounded bg-black/60 border border-zinc-800 text-zinc-200 select-all">
                      {SUPABASE_CONFIG.restApiUrl}
                    </div>
                  </div>

                  <div>
                    <label className="text-zinc-400 text-[10px] uppercase block">API Key (Publishable):</label>
                    <div className="p-2 rounded bg-black/60 border border-zinc-800 text-zinc-300 select-all truncate">
                      {SUPABASE_CONFIG.publishableKey}
                    </div>
                  </div>

                  <div>
                    <label className="text-zinc-400 text-[10px] uppercase block">Anon Public Key (JWT):</label>
                    <div className="p-2 rounded bg-black/60 border border-zinc-800 text-zinc-400 select-all text-[10px] break-all">
                      {SUPABASE_CONFIG.anonKey}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-zinc-800 bg-[#0e1420] text-xs font-mono">
          <div className="flex items-center gap-2 text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Supabase Cloud // PostgreSQL Ready</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors font-bold cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};

export default SupabaseSyncModal;
