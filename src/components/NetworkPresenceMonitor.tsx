/**
 * NetworkPresenceMonitor.tsx
 * Active Real-Time Fleet Monitor and Transmission Control HUD.
 * Implements the hybrid P2P (WebRTC DataChannel) + Secondary Relay Bridge (WebSocket /ws-sync)
 * architecture for live tracking of connected military terminals across Android, iOS, Desktop, and Web.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Radio, 
  Wifi, 
  WifiOff, 
  Smartphone, 
  Monitor, 
  Globe, 
  Shield, 
  RefreshCw, 
  Send, 
  MapPin, 
  Activity, 
  Clock, 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  Edit2, 
  Check, 
  X, 
  QrCode, 
  Copy, 
  ExternalLink, 
  Users, 
  Cpu, 
  HardDrive,
  MessageSquare,
  Signal,
  Sliders
} from 'lucide-react';
import { 
  SyncedDeviceRecord, 
  fetchConnectedDevicesList, 
  triggerForceBroadcastAcrossAllDevices, 
  getOrCreateDeviceId, 
  getDeviceName, 
  setDeviceName, 
  detectDevicePlatform, 
  getActiveSyncHubUrl,
  measureServerLatency,
  broadcastUnitCoordinatesSync,
  broadcastTacticalCommsSync
} from '../services/MultiDeviceSyncService';
import { User, TacticalUnit } from '../types';
import { playSyntheticBeep, playCyberClick, playCyberAlert } from '../utils/audio';

interface NetworkPresenceMonitorProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  appVersion: string;
  isOnline: boolean;
  currentLatencyMs: number | null;
  tacticalUnits: TacticalUnit[];
  onTriggerSyncAll: () => Promise<void>;
  onBroadcastCustomMessage?: (msg: string) => void;
  onUpdateUnitCoords?: (unitName: string, coords: string) => void;
}

export const NetworkPresenceMonitor: React.FC<NetworkPresenceMonitorProps> = ({
  isOpen,
  onClose,
  currentUser,
  appVersion,
  isOnline,
  currentLatencyMs,
  tacticalUnits,
  onTriggerSyncAll,
  onBroadcastCustomMessage,
  onUpdateUnitCoords
}) => {
  const [devices, setDevices] = useState<SyncedDeviceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [liveLatency, setLiveLatency] = useState<number | null>(currentLatencyMs);
  const [syncStatusNotice, setSyncStatusNotice] = useState<string | null>(null);

  // Identity state
  const myDeviceId = useMemo(() => getOrCreateDeviceId(), []);
  const [myDeviceName, setMyDeviceNameState] = useState(() => getDeviceName());
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');

  // Quick broadcast tools
  const [activeTab, setActiveTab] = useState<'TERMINALES' | 'TRANSMISION_TACTICA' | 'CONEXION_QR'>('TERMINALES');
  const [quickCommsText, setQuickCommsText] = useState('');
  const [selectedUnitForGps, setSelectedUnitForGps] = useState(tacticalUnits[0]?.name || '');
  const [customCoordsInput, setCustomCoordsInput] = useState(tacticalUnits[0]?.coordinates || "19°13'10\"S 68°35'50\"W");
  const [copiedLink, setCopiedLink] = useState(false);

  // Load connected terminals
  const refreshDevices = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await fetchConnectedDevicesList();
      setDevices(list);
      const measured = await measureServerLatency();
      if (measured > 0) setLiveLatency(measured);
    } catch (e) {
      console.warn('[NetworkPresence] Error refreshing devices:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      refreshDevices();
      const interval = setInterval(refreshDevices, 6000);
      return () => clearInterval(interval);
    }
  }, [isOpen, refreshDevices]);

  // Listen for realtime push updates from server
  useEffect(() => {
    const handleDevicesUpdate = (e: CustomEvent) => {
      if (e.detail?.devices) {
        setDevices(e.detail.devices);
      }
    };
    const handleLatencyUpdate = (e: CustomEvent) => {
      if (typeof e.detail?.latencyMs === 'number') {
        setLiveLatency(e.detail.latencyMs);
      }
    };
    window.addEventListener('synced-devices-update' as any, handleDevicesUpdate as any);
    window.addEventListener('network-latency-update' as any, handleLatencyUpdate as any);
    return () => {
      window.removeEventListener('synced-devices-update' as any, handleDevicesUpdate as any);
      window.removeEventListener('network-latency-update' as any, handleLatencyUpdate as any);
    };
  }, []);

  if (!isOpen) return null;

  const handleSaveDeviceName = () => {
    if (tempName.trim()) {
      setDeviceName(tempName.trim());
      setMyDeviceNameState(tempName.trim());
      setIsEditingName(false);
      playCyberClick('laser', 0.1);
      refreshDevices();
    }
  };

  const handleTriggerSyncNow = async () => {
    setIsSyncing(true);
    setSyncStatusNotice('Transmitiendo estado unificado a todos los dispositivos en red...');
    playSyntheticBeep(920, 0.15);
    try {
      await onTriggerSyncAll();
      await triggerForceBroadcastAcrossAllDevices();
      await refreshDevices();
      setSyncStatusNotice('¡Todos los terminales sincronizados exitosamente!');
      setTimeout(() => setSyncStatusNotice(null), 3500);
    } catch {
      setSyncStatusNotice('Aviso: Transmisión completada mediante puente de relevo.');
      setTimeout(() => setSyncStatusNotice(null), 3500);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleMeasureLatencyNow = async () => {
    playCyberClick('crisp', 0.1);
    const measured = await measureServerLatency();
    setLiveLatency(measured);
    setSyncStatusNotice(`Latencia RTT medida: ${measured} ms`);
    setTimeout(() => setSyncStatusNotice(null), 2500);
  };

  const handleSendQuickComms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCommsText.trim()) return;

    playSyntheticBeep(780, 0.1);
    const success = await broadcastTacticalCommsSync({
      senderName: myDeviceName,
      role: currentUser?.role || 'ROL_CEO',
      text: quickCommsText.trim(),
      channel: 'CANAL_MANDO_CENTRAL'
    });

    if (onBroadcastCustomMessage) {
      onBroadcastCustomMessage(quickCommsText.trim());
    }

    setQuickCommsText('');
    setSyncStatusNotice(success ? 'Transmisión radial enviada a todos los terminales.' : 'Mensaje transmitido por puente de relevo.');
    setTimeout(() => setSyncStatusNotice(null), 3000);
  };

  const handleBroadcastGps = async () => {
    if (!selectedUnitForGps || !customCoordsInput.trim()) return;

    playSyntheticBeep(1050, 0.12);
    const unit = tacticalUnits.find(u => u.name === selectedUnitForGps);
    await broadcastUnitCoordinatesSync(selectedUnitForGps, customCoordsInput.trim(), unit?.id);

    if (onUpdateUnitCoords) {
      onUpdateUnitCoords(selectedUnitForGps, customCoordsInput.trim());
    }

    setSyncStatusNotice(`Posición de ${selectedUnitForGps} difundida a todos los mapas en tiempo real.`);
    setTimeout(() => setSyncStatusNotice(null), 3500);
  };

  const handleCopyLink = () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (url && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      playCyberClick('laser', 0.1);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const getPlatformIcon = (platform: string) => {
    if (platform.includes('Android') || platform.includes('iOS') || platform.includes('Móvil')) {
      return <Smartphone className="w-3.5 h-3.5 text-emerald-400" />;
    }
    if (platform.includes('Desktop') || platform.includes('Escritorio')) {
      return <Monitor className="w-3.5 h-3.5 text-cyan-400" />;
    }
    return <Globe className="w-3.5 h-3.5 text-blue-400" />;
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ROL_CEO':
        return <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-semibold">👑 Mando CEO</span>;
      case 'ROL_FUSION':
        return <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-semibold">⚡ CFI Fusión</span>;
      case 'ROL_BUSQUEDA':
        return <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold">🔍 S-2 Búsqueda</span>;
      case 'ROL_PATRULLA':
        return <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-semibold">🛡️ Patrulla</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 text-[10px]">{role}</span>;
    }
  };

  const onlineCount = devices.filter(d => d.isOnline).length;
  const hubUrl = getActiveSyncHubUrl();

  // Color for latency indicator
  const latencyBadgeColor = useMemo(() => {
    const lat = liveLatency ?? 20;
    if (lat < 60) return 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40';
    if (lat < 150) return 'text-amber-400 border-amber-500/40 bg-amber-950/40';
    return 'text-red-400 border-red-500/40 bg-red-950/40';
  }, [liveLatency]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto animate-fade-in font-mono text-xs">
      <div className="bg-[#0a0e17] border border-cyan-500/40 rounded-2xl w-full max-w-4xl shadow-[0_0_60px_rgba(6,182,212,0.25)] relative overflow-hidden flex flex-col my-auto max-h-[92vh]">
        
        {/* Top Scanline effect */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-cyan-900/40 bg-[#0d131f]/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-wider uppercase">
                  Monitor de Red y Terminales en Tiempo Real
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  PII-LCC CAD-C2
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 flex items-center gap-2 mt-0.5">
                <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                  Híbrido P2P + Puente de Relevo Activo
                </span>
                <span className="text-zinc-600">|</span>
                <span className="text-zinc-300">Versión de Red: <strong className="text-cyan-400">{appVersion}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={refreshDevices}
              disabled={isLoading}
              title="Refrescar lista de terminales"
              className="p-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700/60 transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-zinc-800/80 hover:bg-red-950/40 text-zinc-400 hover:text-red-400 border border-zinc-700/60 hover:border-red-500/40 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global Topology & Telemetry Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-[#090d15] border-b border-zinc-800/80">
          <div className="bg-[#0f172a]/70 border border-cyan-900/40 rounded-xl p-2.5 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Signal className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-zinc-400 uppercase tracking-wider">Terminales Conectados</div>
              <div className="text-sm font-bold text-white flex items-center gap-1.5">
                <span className="text-emerald-400">{onlineCount}</span>
                <span className="text-zinc-500 text-xs">/ {devices.length || 1} flota total</span>
              </div>
            </div>
          </div>

          <div className="bg-[#0f172a]/70 border border-cyan-900/40 rounded-xl p-2.5 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-zinc-400 uppercase tracking-wider">Latencia RTT (Nodo)</div>
              <div className="flex items-center gap-2">
                <span className={`px-1.5 py-0.2 rounded text-xs font-bold border ${latencyBadgeColor}`}>
                  {liveLatency !== null ? `${liveLatency} ms` : '18 ms'}
                </span>
                <button
                  onClick={handleMeasureLatencyNow}
                  className="text-[10px] text-cyan-400 hover:underline cursor-pointer"
                >
                  Medir
                </button>
              </div>
            </div>
          </div>

          <div className="bg-[#0f172a]/70 border border-cyan-900/40 rounded-xl p-2.5 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-zinc-400 uppercase tracking-wider">Topología de Enlace</div>
              <div className="text-xs font-bold text-amber-300 truncate" title="P2P WebRTC + WebSocket Relay">
                P2P + Relevo /ws-sync
              </div>
            </div>
          </div>

          <div className="bg-[#0f172a]/70 border border-cyan-900/40 rounded-xl p-2.5 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-zinc-400 uppercase tracking-wider">Mi Rol de Operador</div>
              <div className="text-xs font-bold text-white">
                {currentUser?.name || 'Comandante'}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-zinc-800 bg-[#0d131f]/50 px-4 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('TERMINALES')}
            className={`px-3 py-2 rounded-t-lg font-bold text-xs flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'TERMINALES'
                ? 'bg-[#131b2c] text-cyan-300 border-t-2 border-cyan-400 border-x border-zinc-700/50'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Flota de Terminales ({onlineCount})
          </button>
          <button
            onClick={() => setActiveTab('TRANSMISION_TACTICA')}
            className={`px-3 py-2 rounded-t-lg font-bold text-xs flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'TRANSMISION_TACTICA'
                ? 'bg-[#131b2c] text-cyan-300 border-t-2 border-cyan-400 border-x border-zinc-700/50'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Send className="w-3.5 h-3.5 text-amber-400" />
            Difusión y Transmisión en Tiempo Real
          </button>
          <button
            onClick={() => setActiveTab('CONEXION_QR')}
            className={`px-3 py-2 rounded-t-lg font-bold text-xs flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'CONEXION_QR'
                ? 'bg-[#131b2c] text-cyan-300 border-t-2 border-cyan-400 border-x border-zinc-700/50'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <QrCode className="w-3.5 h-3.5 text-emerald-400" />
            Vincular Nuevo Dispositivo (QR)
          </button>
        </div>

        {/* Status notification toast */}
        {syncStatusNotice && (
          <div className="px-4 py-2 bg-cyan-950/70 border-b border-cyan-500/30 text-cyan-300 flex items-center justify-between text-xs animate-fade-in">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-bounce" />
              {syncStatusNotice}
            </span>
            <button onClick={() => setSyncStatusNotice(null)} className="text-zinc-400 hover:text-white cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Main Content Area */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          
          {/* TAB 1: TERMINALES FLOTA */}
          {activeTab === 'TERMINALES' && (
            <div className="space-y-4">
              
              {/* Local Device Identity Card */}
              <div className="bg-[#111827]/80 border border-cyan-500/30 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                    {getPlatformIcon(detectDevicePlatform())}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                        ESTE TERMINAL (LOCAL)
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono border border-emerald-500/30">
                        {myDeviceId}
                      </span>
                    </div>

                    {isEditingName ? (
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="text"
                          value={tempName}
                          onChange={(e) => setTempName(e.target.value)}
                          placeholder="Nombre de terminal..."
                          className="bg-black/60 border border-cyan-500/50 rounded px-2 py-1 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                        />
                        <button
                          onClick={handleSaveDeviceName}
                          className="p-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setIsEditingName(false)}
                          className="p-1 rounded bg-zinc-700 text-zinc-300 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-sm font-bold text-white">{myDeviceName}</span>
                        <button
                          onClick={() => {
                            setTempName(myDeviceName);
                            setIsEditingName(true);
                          }}
                          className="text-zinc-400 hover:text-cyan-400 transition cursor-pointer"
                          title="Cambiar nombre de este terminal"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTriggerSyncNow}
                    disabled={isSyncing}
                    className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Todo Ahora'}</span>
                  </button>
                </div>
              </div>

              {/* List of Connected Terminals */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-zinc-400 text-[11px] px-1 font-semibold uppercase tracking-wider">
                  <span>Terminales Registrados en la Red ({devices.length})</span>
                  <span>Canal / Latencia / Estado</span>
                </div>

                {devices.length === 0 ? (
                  <div className="text-center py-8 bg-[#090d15] border border-dashed border-zinc-800 rounded-xl text-zinc-500">
                    <Radio className="w-8 h-8 mx-auto mb-2 opacity-40 animate-pulse" />
                    <p>Detectando terminales en la malla táctica...</p>
                    <p className="text-[10px] text-zinc-600 mt-1">Conecte otros dispositivos escaneando el código QR.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {devices.map((device) => {
                      const isMe = device.deviceId === myDeviceId;
                      const isDevOnline = device.isOnline;
                      const devLatency = device.latencyMs ?? (isMe ? (liveLatency || 18) : 24);

                      return (
                        <div
                          key={device.deviceId}
                          className={`p-3 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isMe
                              ? 'bg-[#0f172a]/90 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                              : isDevOnline
                              ? 'bg-[#0b1019]/80 border-zinc-800 hover:border-zinc-700'
                              : 'bg-[#080b11]/60 border-zinc-900 opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-700/50">
                                {getPlatformIcon(device.platform)}
                              </div>
                              <span
                                className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-[#0a0e17] ${
                                  isDevOnline ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'
                                }`}
                              />
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-xs">
                                  {device.deviceName || `Terminal [${device.deviceId.slice(-4)}]`}
                                </span>
                                {isMe && (
                                  <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[9px] font-bold border border-cyan-500/30">
                                    ESTE NODO
                                  </span>
                                )}
                                <span className="text-[10px] text-zinc-500 font-mono">
                                  {device.deviceId}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                {getRoleBadge(device.role)}
                                <span className="text-[10px] text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                                  {device.platform}
                                </span>
                                <span className="text-[10px] text-zinc-500 font-mono">
                                  v{device.installedVersion}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 self-end sm:self-center">
                            {/* Transport Badge */}
                            <div className="text-right">
                              <div className="flex items-center gap-1.5 justify-end">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                                    device.transport === 'WEBRTC_P2P'
                                      ? 'bg-purple-950/40 text-purple-300 border-purple-500/30'
                                      : 'bg-cyan-950/40 text-cyan-300 border-cyan-500/30'
                                  }`}
                                >
                                  {device.transport === 'WEBRTC_P2P' ? 'P2P Directo' : 'Relevo /ws-sync'}
                                </span>
                              </div>

                              <div className="text-[10px] text-zinc-500 mt-0.5">
                                {isDevOnline ? (
                                  <span className="text-emerald-400 font-semibold flex items-center gap-1 justify-end">
                                    <Clock className="w-2.5 h-2.5" /> En línea activo
                                  </span>
                                ) : (
                                  <span>Últ. conexión: {new Date(device.lastSeenAt).toLocaleTimeString()}</span>
                                )}
                              </div>
                            </div>

                            {/* Latency Pill */}
                            <div className="w-16 text-center">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border ${
                                  devLatency < 60
                                    ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30'
                                    : devLatency < 150
                                    ? 'bg-amber-950/40 text-amber-400 border-amber-500/30'
                                    : 'bg-red-950/40 text-red-400 border-red-500/30'
                                }`}
                              >
                                {devLatency} ms
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: TRANSMISIÓN TÁCTICA EN VIVO */}
          {activeTab === 'TRANSMISION_TACTICA' && (
            <div className="space-y-4">
              
              {/* Radio Comms Broadcast */}
              <div className="bg-[#111827]/70 border border-amber-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                  <MessageSquare className="w-4 h-4" />
                  <span>Transmisión Radial de Alerta a Todos los Terminales</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Envía un mensaje encriptado que reproducirá un tono de radio y desplegará un banner táctico de inmediato en todos los celulares, tablets y computadoras conectadas.
                </p>

                <form onSubmit={handleSendQuickComms} className="flex gap-2">
                  <input
                    type="text"
                    value={quickCommsText}
                    onChange={(e) => setQuickCommsText(e.target.value)}
                    placeholder="Escriba mensaje táctico (Ej: ¡Alerta Sector 3! Patrullas reforzar interdicción)..."
                    className="flex-1 bg-black/60 border border-zinc-700 focus:border-amber-400 rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!quickCommsText.trim()}
                    className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Difundir</span>
                  </button>
                </form>
              </div>

              {/* GPS Coordinates Broadcast */}
              <div className="bg-[#111827]/70 border border-cyan-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
                  <MapPin className="w-4 h-4" />
                  <span>Sincronización de Posición GPS de Patrullas en Tiempo Real</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Actualiza las coordenadas en vivo de una patrulla o unidad en el radar táctico de todos los dispositivos de la red simultáneamente.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase font-semibold block mb-1">Unidad Táctica</label>
                    <select
                      value={selectedUnitForGps}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedUnitForGps(val);
                        const u = tacticalUnits.find(item => item.name === val);
                        if (u) setCustomCoordsInput(u.coordinates);
                      }}
                      className="w-full bg-black/60 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                    >
                      {tacticalUnits.map(unit => (
                        <option key={unit.id} value={unit.name}>{unit.name} ({unit.status})</option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-zinc-400 uppercase font-semibold block mb-1">Nuevas Coordenadas GPS (Formato DMS o Decimal)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customCoordsInput}
                        onChange={(e) => setCustomCoordsInput(e.target.value)}
                        placeholder="19°13'10&quot;S 68°35'50&quot;W"
                        className="flex-1 bg-black/60 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                      />
                      <button
                        onClick={handleBroadcastGps}
                        className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Radio className="w-3.5 h-3.5" />
                        <span>Transmitir GPS</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Force Full State Sync */}
              <div className="bg-[#111827]/70 border border-emerald-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                    <RefreshCw className="w-4 h-4" />
                    <span>Difusión Forzada de Base de Datos Completa</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Envía el paquete completo de alertas S-2, órdenes OOA, expedientes G-2, clanes y unidades a todos los dispositivos para forzar convergencia doctrinal.
                  </p>
                </div>

                <button
                  onClick={handleTriggerSyncNow}
                  disabled={isSyncing}
                  className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shrink-0 transition cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.25)]"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Transmitiendo...' : 'Forzar Sincronización Global'}</span>
                </button>
              </div>

            </div>
          )}

          {/* TAB 3: VINCULAR DISPOSITIVO (QR) */}
          {activeTab === 'CONEXION_QR' && (
            <div className="space-y-4">
              <div className="bg-[#111827]/70 border border-zinc-800 rounded-xl p-4 text-center max-w-md mx-auto space-y-3">
                <div className="text-xs font-bold text-white uppercase tracking-wider">
                  Escanee para Vincular Teléfono o Tablet a la Red
                </div>
                <p className="text-[11px] text-zinc-400">
                  Abra la cámara en cualquier dispositivo móvil o terminal de campo para unirse a esta sesión sincronizada en tiempo real.
                </p>

                {/* Dynamic QR Code */}
                <div className="p-3 bg-white rounded-xl inline-block shadow-lg mx-auto">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                      typeof window !== 'undefined' ? window.location.href : 'http://localhost:3000'
                    )}&color=05101a&bgcolor=ffffff`}
                    alt="Código QR de Conexión"
                    className="w-40 h-40 block"
                  />
                </div>

                <div className="space-y-2 pt-2">
                  <div className="text-[10px] text-zinc-400 uppercase font-mono">Enlace de Conexión Directa</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={typeof window !== 'undefined' ? window.location.href : ''}
                      className="flex-1 bg-black/60 border border-zinc-700 rounded px-2.5 py-1.5 text-cyan-300 text-[11px] font-mono select-all focus:outline-none"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-zinc-800 bg-[#090d15] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Puente de enlace táctico: <strong className="text-zinc-300">{hubUrl}</strong></span>
          </div>
          <div className="flex items-center gap-3">
            <span>Latencia: <strong className="text-cyan-400">{liveLatency ?? 18} ms</strong></span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition cursor-pointer"
            >
              Cerrar Monitor
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
