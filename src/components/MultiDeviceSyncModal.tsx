/**
 * MultiDeviceSyncModal.tsx
 * Comprehensive Cross-Device and Cross-Version Synchronization Control Center.
 * Enables live monitoring, forced fleet-wide synchronization, OTA version alignment,
 * and remote sync hub configuration for PII-LCC CAD-C2 terminals.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Radio, 
  Smartphone, 
  Monitor, 
  RefreshCw, 
  Wifi, 
  ShieldCheck, 
  Globe, 
  CheckCircle2, 
  AlertTriangle, 
  Cpu, 
  Clock, 
  Layers, 
  Share2, 
  Settings2, 
  X,
  Edit2,
  Check,
  Zap,
  Server
} from 'lucide-react';
import { 
  SyncedDeviceRecord, 
  fetchConnectedDevicesList, 
  triggerForceBroadcastAcrossAllDevices, 
  triggerOtaUpgradeBroadcast,
  getOrCreateDeviceId,
  getDeviceName,
  setDeviceName,
  detectDevicePlatform,
  getActiveSyncHubUrl,
  setCustomSyncHubUrl
} from '../services/MultiDeviceSyncService';
import { playSyntheticBeep, playCyberClick } from '../utils/audio';

interface MultiDeviceSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  appVersion: string;
  isOnline: boolean;
  onTriggerSyncNow: () => Promise<void>;
  clansCount?: number;
  alertsCount?: number;
  ordersCount?: number;
  unitsCount?: number;
  expedientesCount?: number;
}

export const MultiDeviceSyncModal: React.FC<MultiDeviceSyncModalProps> = ({
  isOpen,
  onClose,
  appVersion,
  isOnline,
  onTriggerSyncNow,
  clansCount = 0,
  alertsCount = 0,
  ordersCount = 0,
  unitsCount = 0,
  expedientesCount = 0
}) => {
  const [devices, setDevices] = useState<SyncedDeviceRecord[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isBroadcastingOta, setIsBroadcastingOta] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  
  // Device identity state
  const [myDeviceId] = useState(() => getOrCreateDeviceId());
  const [myDeviceName, setMyDeviceNameState] = useState(() => getDeviceName());
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');

  // Hub settings state
  const [hubUrl, setHubUrlState] = useState(() => getActiveSyncHubUrl());
  const [showHubSettings, setShowHubSettings] = useState(false);
  const [hubInput, setHubInput] = useState('');

  const myPlatform = detectDevicePlatform();

  // Load connected devices from server
  const loadDevices = useCallback(async () => {
    setIsLoadingDevices(true);
    const start = Date.now();
    try {
      const list = await fetchConnectedDevicesList();
      setDevices(list);
      setLatencyMs(Date.now() - start);
    } catch (err) {
      console.warn('Error loading devices list:', err);
    } finally {
      setIsLoadingDevices(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadDevices();
      const interval = setInterval(loadDevices, 8000);
      return () => clearInterval(interval);
    }
  }, [isOpen, loadDevices]);

  // Listen for real-time SYNCED_DEVICES_UPDATE events from websocket
  useEffect(() => {
    const handleDevicesUpdate = (e: CustomEvent) => {
      if (e.detail?.devices) {
        setDevices(e.detail.devices);
      }
    };
    window.addEventListener('synced-devices-update' as any, handleDevicesUpdate as any);
    return () => {
      window.removeEventListener('synced-devices-update' as any, handleDevicesUpdate as any);
    };
  }, []);

  if (!isOpen) return null;

  const handleSaveDeviceName = () => {
    if (tempName.trim()) {
      setDeviceName(tempName.trim());
      setMyDeviceNameState(tempName.trim());
      setIsEditingName(false);
      playCyberClick('laser', 0.1);
      loadDevices();
    }
  };

  const handleForceSyncAll = async () => {
    setIsSyncing(true);
    setSyncStatusMsg('Sincronizando estado táctico con todos los terminales...');
    playSyntheticBeep(880, 0.15);
    try {
      await onTriggerSyncNow();
      await triggerForceBroadcastAcrossAllDevices();
      await loadDevices();
      setSyncStatusMsg('¡Sincronización completada con éxito en todos los terminales!');
      setTimeout(() => setSyncStatusMsg(null), 4000);
    } catch (err) {
      setSyncStatusMsg('Aviso: Falló la difusión completa, reconectando enlace...');
      setTimeout(() => setSyncStatusMsg(null), 4000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleBroadcastOta = async () => {
    setIsBroadcastingOta(true);
    setSyncStatusMsg('Difundiendo alerta de alineación doctrinal a todas las versiones...');
    playSyntheticBeep(1200, 0.2);
    try {
      await triggerOtaUpgradeBroadcast(appVersion);
      setSyncStatusMsg('¡Alerta de sincronización enviada a todos los dispositivos instalados!');
      setTimeout(() => setSyncStatusMsg(null), 4500);
    } catch (err) {
      setSyncStatusMsg('Error al difundir actualización a la red.');
      setTimeout(() => setSyncStatusMsg(null), 4000);
    } finally {
      setIsBroadcastingOta(false);
    }
  };

  const handleSaveHubUrl = () => {
    if (!hubInput.trim()) {
      setCustomSyncHubUrl(null);
      setHubUrlState(window.location.origin);
    } else {
      setCustomSyncHubUrl(hubInput.trim());
      setHubUrlState(hubInput.trim());
    }
    setShowHubSettings(false);
    playCyberClick('laser', 0.1);
    loadDevices();
  };

  const getPlatformIcon = (platformStr: string) => {
    if (platformStr.includes('Android') || platformStr.includes('iOS') || platformStr.includes('Móvil')) {
      return <Smartphone className="w-4 h-4 text-emerald-400" />;
    }
    if (platformStr.includes('Desktop') || platformStr.includes('Escritorio')) {
      return <Monitor className="w-4 h-4 text-cyan-400" />;
    }
    return <Globe className="w-4 h-4 text-blue-400" />;
  };

  const onlineDevicesCount = devices.filter(d => d.isOnline).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-fade-in font-mono text-xs">
      <div className="bg-[#0b0f17] border border-cyan-500/40 rounded-2xl w-full max-w-3xl shadow-[0_0_50px_rgba(6,182,212,0.25)] relative overflow-hidden flex flex-col my-auto max-h-[92vh]">
        
        {/* Top scanline neon effect */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />

        {/* Modal Header */}
        <div className="bg-gradient-to-r from-cyan-950/60 via-zinc-900 to-black p-4 sm:p-5 border-b border-cyan-500/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-cyan-500/30">
                  RED TÁCTICA CAD-C2
                </span>
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  {onlineDevicesCount > 0 ? `${onlineDevicesCount} CONECTADOS` : 'STANDALONE LOCAL'}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-wider mt-0.5">
                Sincronización Multi-Dispositivo y Multi-Versión
              </h2>
            </div>
          </div>
          <button
            onClick={() => {
              playCyberClick('laser', 0.08);
              onClose();
            }}
            className="w-8 h-8 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          
          {/* Status feedback message */}
          {syncStatusMsg && (
            <div className="p-3 bg-cyan-950/80 border border-cyan-500/40 rounded-xl text-cyan-200 flex items-center gap-2.5 animate-fade-in shadow-[0_0_20px_rgba(6,182,212,0.25)]">
              <Zap className="w-4 h-4 text-cyan-400 animate-bounce shrink-0" />
              <span className="font-semibold text-xs">{syncStatusMsg}</span>
            </div>
          )}

          {/* Device Profile & Current Terminal Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* Terminal Identity */}
            <div className="p-3.5 bg-zinc-900/80 border border-zinc-800 rounded-xl flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  {getPlatformIcon(myPlatform)}
                  <span>Este Dispositivo</span>
                </span>
                <span className="text-[9px] bg-zinc-800 text-cyan-300 px-1.5 py-0.5 rounded font-mono border border-cyan-500/20">
                  ID: {myDeviceId}
                </span>
              </div>

              {isEditingName ? (
                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    type="text"
                    value={tempName || ''}
                    onChange={(e) => setTempName(e.target.value)}
                    placeholder="Nombre del terminal"
                    className="flex-1 bg-black border border-cyan-500/60 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-400"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveDeviceName}
                    className="p-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded cursor-pointer"
                    title="Guardar nombre"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setIsEditingName(false)}
                    className="p-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-white font-bold text-sm truncate">{myDeviceName}</span>
                  <button
                    onClick={() => {
                      setTempName(myDeviceName);
                      setIsEditingName(true);
                    }}
                    className="text-zinc-400 hover:text-cyan-300 p-1 transition-colors cursor-pointer"
                    title="Renombrar este dispositivo"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-zinc-800/80">
                <span>Plataforma: <strong className="text-zinc-200">{myPlatform}</strong></span>
                <span>Versión: <strong className="text-cyan-300">{appVersion}</strong></span>
              </div>
            </div>

            {/* Network Health & Latency */}
            <div className="p-3.5 bg-zinc-900/80 border border-zinc-800 rounded-xl flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Enlace de Red Central</span>
                </span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                  isOnline ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' : 'bg-red-950 text-red-300 border border-red-500/30'
                }`}>
                  {isOnline ? 'CONECTADO' : 'OFFLINE'}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <div className="text-white font-bold text-sm">
                    {latencyMs !== null ? `${latencyMs} ms de latencia` : 'Enlace Sincronizado'}
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    WebSocket + Fallback HTTP Activos
                  </div>
                </div>
                <button
                  onClick={loadDevices}
                  disabled={isLoadingDevices}
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 text-cyan-300 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  title="Verificar estado de red"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingDevices ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-zinc-800/80">
                <span className="truncate max-w-[170px]" title={hubUrl}>Hub: {hubUrl.replace(/https?:\/\//, '')}</span>
                <button
                  onClick={() => {
                    setHubInput(hubUrl === window.location.origin ? '' : hubUrl);
                    setShowHubSettings(!showHubSettings);
                  }}
                  className="text-cyan-400 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Settings2 className="w-3 h-3" />
                  <span>Configurar</span>
                </button>
              </div>
            </div>
          </div>

          {/* Hub URL Configuration Accordion */}
          {showHubSettings && (
            <div className="p-3 bg-black/80 border border-cyan-500/30 rounded-xl space-y-2.5 animate-fade-in">
              <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold">
                <Server className="w-4 h-4" />
                <span>Configurar Servidor Central / Nodo Hub de Sincronización</span>
              </div>
              <p className="text-[10px] text-zinc-400">
                Permite sincronizar múltiples celulares, tablets y computadoras conectadas a la misma red local Wi-Fi o internet.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={hubInput || ''}
                  onChange={(e) => setHubInput(e.target.value)}
                  placeholder={`Por defecto: ${window.location.origin}`}
                  className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveHubUrl}
                    className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-colors cursor-pointer text-xs"
                  >
                    Aplicar Hub
                  </button>
                  <button
                    onClick={() => {
                      setCustomSyncHubUrl(null);
                      setHubUrlState(window.location.origin);
                      setShowHubSettings(false);
                      loadDevices();
                    }}
                    className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors cursor-pointer text-xs"
                  >
                    Restablecer
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Synchronized Tactical Data Summary Bar */}
          <div className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl flex items-center justify-between flex-wrap gap-2 text-[10px]">
            <div className="flex items-center gap-1.5 text-zinc-400">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-bold text-zinc-200">Datos Sincronizados en Memoria:</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap text-zinc-300 font-mono">
              <span>Clanes: <strong className="text-cyan-400">{clansCount}</strong></span>
              <span>•</span>
              <span>Expedientes G-2: <strong className="text-cyan-400">{expedientesCount}</strong></span>
              <span>•</span>
              <span>Alertas: <strong className="text-cyan-400">{alertsCount}</strong></span>
              <span>•</span>
              <span>Órdenes: <strong className="text-cyan-400">{ordersCount}</strong></span>
              <span>•</span>
              <span>Patrullas: <strong className="text-cyan-400">{unitsCount}</strong></span>
            </div>
          </div>

          {/* Connected Terminals Fleet Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Flota de Dispositivos Conectados en Todas las Versiones</span>
              </span>
              <span className="text-[10px] text-zinc-500">
                {devices.length} dispositivo{devices.length === 1 ? '' : 's'} registrado{devices.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="border border-zinc-800 rounded-xl overflow-hidden bg-black/60">
              {devices.length === 0 ? (
                <div className="p-6 text-center text-zinc-500 space-y-2">
                  <Cpu className="w-8 h-8 mx-auto text-zinc-600 animate-pulse" />
                  <div>No hay otros dispositivos registrados aún en este nodo.</div>
                  <div className="text-[10px] text-zinc-600">
                    Abre la aplicación en tu celular u otra ventana para sincronizar en tiempo real.
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-zinc-800/80 max-h-[220px] overflow-y-auto">
                  {devices.map((device) => {
                    const isMe = device.deviceId === myDeviceId;
                    return (
                      <div 
                        key={device.deviceId}
                        className={`p-2.5 sm:p-3 flex items-center justify-between gap-3 transition-colors ${
                          isMe ? 'bg-cyan-950/20 border-l-2 border-cyan-400' : 'hover:bg-zinc-900/50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 shrink-0">
                            {getPlatformIcon(device.platform)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-xs truncate">
                                {device.deviceName}
                              </span>
                              {isMe && (
                                <span className="bg-cyan-500/20 text-cyan-300 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">
                                  Tú
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-zinc-400 flex items-center gap-2 flex-wrap mt-0.5">
                              <span>{device.platform}</span>
                              <span>•</span>
                              <span className="text-zinc-500 font-mono">v{device.installedVersion}</span>
                              <span>•</span>
                              <span className="text-cyan-400 font-bold">{device.role}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0 flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${
                              device.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'
                            }`} />
                            <span className={`text-[10px] font-bold ${
                              device.isOnline ? 'text-emerald-400' : 'text-zinc-500'
                            }`}>
                              {device.isOnline ? 'EN LÍNEA' : 'DESCONECTADO'}
                            </span>
                          </div>
                          <span className="text-[9px] text-zinc-500 font-mono">
                            {device.transport === 'WEBSOCKET' ? 'WS (0ms)' : 'HTTP Poll'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Doctrinal Compatibility Guarantee Box */}
          <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl flex items-start gap-2.5 text-emerald-300 text-[10px]">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-emerald-200 uppercase font-bold">Interoperabilidad Doctrinal Total Garantizada:</strong>
              <div className="text-zinc-400 mt-0.5 leading-relaxed">
                Los datos tácticos (clanes, alertas, inteligencia, expedientes G-2 y órdenes de mando) se sincronizan bidireccionalmente entre todas las versiones anteriores y actuales mediante normalización automática de esquemas y canales redundantes.
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer / Primary Action Controls */}
        <div className="bg-zinc-950 p-4 sm:p-5 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-zinc-400 text-[10px] w-full sm:w-auto justify-between sm:justify-start">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Sincronización activa en segundo plano</span>
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Action 1: Broadcast OTA to all installed versions */}
            <button
              type="button"
              onClick={handleBroadcastOta}
              disabled={isBroadcastingOta}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold transition-all active:scale-95 cursor-pointer disabled:opacity-50 text-xs"
              title="Difundir señal de actualización a todos los celulares y navegadores instalados"
            >
              <Radio className={`w-3.5 h-3.5 text-cyan-400 ${isBroadcastingOta ? 'animate-ping' : ''}`} />
              <span>Alinear Versiones</span>
            </button>

            {/* Action 2: Force Immediate Full Fleet Sync */}
            <button
              type="button"
              onClick={handleForceSyncAll}
              disabled={isSyncing}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-bold transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] active:scale-95 cursor-pointer disabled:opacity-50 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Ahora'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
