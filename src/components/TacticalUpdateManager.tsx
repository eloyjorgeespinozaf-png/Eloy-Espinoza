import React, { useState, useEffect, useCallback } from 'react';
import { 
  RefreshCw, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Zap, 
  X, 
  Wifi, 
  WifiOff, 
  HardDrive, 
  Layers, 
  Sparkles,
  ArrowDownCircle,
  Clock
} from 'lucide-react';
import { playSyntheticBeep, playChime } from '../utils/audio';
import { safeStorage } from '../utils/storage';

interface TacticalUpdateManagerProps {
  currentVersion?: string;
  onOpenInstallModal?: () => void;
}

export const TacticalUpdateManager: React.FC<TacticalUpdateManagerProps> = ({
  currentVersion = 'v2.5.0-DOCTRINAL',
  onOpenInstallModal
}) => {
  const [hasUpdate, setHasUpdate] = useState<boolean>(false);
  const [serverVersion, setServerVersion] = useState<string>(currentVersion);
  const [changelog, setChangelog] = useState<string>('Nuevas mejoras de persistencia y sincronización multiplataforma.');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [showSyncCenterModal, setShowSyncCenterModal] = useState<boolean>(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [lastCheckedTime, setLastCheckedTime] = useState<string>('Recién comprobado');
  const [updateFunction, setUpdateFunction] = useState<(() => Promise<void>) | null>(null);

  // 1. Service Worker registration hook
  useEffect(() => {
    let updateSWFn: ((reloadPage?: boolean) => Promise<void>) | null = null;
    let swInterval: any = null;

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      import('virtual:pwa-register')
        .then(({ registerSW }) => {
          updateSWFn = registerSW({
            immediate: true,
            onNeedRefresh() {
              console.log('[PWA Updater] New version detected by Service Worker.');
              setHasUpdate(true);
            },
            onOfflineReady() {
              console.log('[PWA Updater] App is cached and ready for offline operation.');
            },
            onRegistered(r) {
              if (r) {
                // Check periodically for SW updates
                swInterval = setInterval(() => {
                  r.update().catch(err => console.warn('[PWA] SW update check error:', err));
                }, 60 * 1000);
              }
            }
          });

          if (updateSWFn) {
            setUpdateFunction(() => async () => {
              if (updateSWFn) {
                await updateSWFn(true);
              }
            });
          }
        })
        .catch(err => {
          console.warn('[PWA Updater] virtual:pwa-register not available in current environment:', err);
        });
    }

    // Monitor online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for WebSocket system upgrade broadcasts
    const handleSystemUpgradeAlert = (e: any) => {
      const detail = e.detail;
      if (detail) {
        setHasUpdate(true);
        if (detail.version) setServerVersion(detail.version);
        if (detail.changelog) setChangelog(detail.changelog);
        playSyntheticBeep(987, 0.25, 'sine', 0.2);
      }
    };
    window.addEventListener('system-upgrade-alert', handleSystemUpgradeAlert);

    return () => {
      if (swInterval) clearInterval(swInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('system-upgrade-alert', handleSystemUpgradeAlert);
    };
  }, []);

  // 2. Periodic version polling to ensure devices detect deployments
  const checkForUpdates = useCallback(async (manual: boolean = false) => {
    if (manual) {
      setIsChecking(true);
      playSyntheticBeep(700, 0.08);
    }
    try {
      const res = await fetch(`/api/app-version?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (res.ok) {
        const data = await res.json();
        setLastCheckedTime(new Date().toLocaleTimeString('es-CL'));
        if (data && data.version) {
          setServerVersion(data.version);
          const initialTimestamp = safeStorage.getItem('PII_LCC_INITIAL_BUILD_TS');
          if (!initialTimestamp) {
            safeStorage.setItem('PII_LCC_INITIAL_BUILD_TS', String(data.buildTimestamp || Date.now()));
          } else if (data.buildTimestamp && Number(data.buildTimestamp) > Number(initialTimestamp)) {
            setHasUpdate(true);
          } else if (data.version !== currentVersion) {
            setHasUpdate(true);
          }
        }
      }
    } catch (err) {
      console.warn('[Updater] Could not check app version:', err);
    } finally {
      if (manual) {
        setTimeout(() => setIsChecking(false), 500);
      }
    }
  }, [currentVersion]);

  useEffect(() => {
    // Initial check
    checkForUpdates(false);

    // Poll every 45 seconds
    const interval = setInterval(() => {
      checkForUpdates(false);
    }, 45 * 1000);

    // Check when user returns to tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkForUpdates]);

  // Execute update: guarantees preserving IndexedDB and localStorage
  const handleApplyUpdate = async () => {
    setIsUpdating(true);
    playChime(600, 900, 0.3);

    try {
      // 1. Store toast flag
      safeStorage.setItem('PII_LCC_JUST_UPDATED', 'true');
      safeStorage.setItem('PII_LCC_INITIAL_BUILD_TS', String(Date.now()));

      // 2. Clear workbox cache storage so new JS/CSS bundles are fetched fresh
      if (typeof window !== 'undefined' && 'caches' in window) {
        try {
          const cacheKeys = await caches.keys();
          await Promise.all(cacheKeys.map(key => caches.delete(key)));
        } catch (e) {
          console.warn('Cache clearing error:', e);
        }
      }

      // 3. Trigger Service Worker reload if available
      if (updateFunction) {
        await updateFunction();
      }

      // 4. Force browser hard reload
      setTimeout(() => {
        window.location.reload();
      }, 350);
    } catch (err) {
      console.error('Update execution error:', err);
      window.location.reload();
    }
  };

  // Export full backup
  const handleExportBackup = async () => {
    try {
      playSyntheticBeep(880, 0.1);
      const res = await fetch('/api/backup/export');
      if (!res.ok) throw new Error('Error al exportar desde servidor');
      const backupData = await res.json();
      
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PII-LCC-RESPALDO-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSyncStatusMsg('Respaldo exportado exitosamente.');
      setTimeout(() => setSyncStatusMsg(null), 4000);
    } catch (e: any) {
      setSyncStatusMsg(`Fallo exportación: ${e.message}`);
      setTimeout(() => setSyncStatusMsg(null), 4000);
    }
  };

  // Import full backup
  const handleImportBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const text = ev.target?.result as string;
        const parsed = JSON.parse(text);
        const res = await fetch('/api/backup/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsed)
        });
        if (res.ok) {
          playChime(600, 1000, 0.3);
          setSyncStatusMsg('¡Copia de seguridad restaurada y sincronizada en red!');
          setTimeout(() => {
            window.location.reload();
          }, 1200);
        } else {
          throw new Error('Servidor rechazó el archivo de respaldo');
        }
      } catch (err: any) {
        setSyncStatusMsg(`Error al importar: ${err.message}`);
        setTimeout(() => setSyncStatusMsg(null), 5000);
      }
    };
    reader.readAsText(file);
  };

  return (
    <>
      {/* 1. Floating Tactical Update Alert Banner */}
      {hasUpdate && (
        <div 
          id="tactical-update-banner"
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999] max-w-lg w-[calc(100vw-2rem)] bg-zinc-950/95 border-2 border-emerald-500/80 shadow-[0_0_35px_rgba(16,185,129,0.3)] rounded-xl p-4 backdrop-blur-md animate-in fade-in slide-in-from-bottom-5 duration-300 font-sans"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-950/80 border border-emerald-500/60 flex items-center justify-center shrink-0 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase tracking-wider">
                    ACTUALIZACIÓN PUBLICADA
                  </span>
                  <span className="text-[11px] font-mono text-zinc-400">
                    {serverVersion}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setHasUpdate(false)}
                  className="text-zinc-500 hover:text-zinc-300 p-1 rounded hover:bg-zinc-800 transition-colors"
                  title="Cerrar notificación"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <h4 className="text-sm font-bold text-white mt-1.5 leading-snug">
                Nuevas modificaciones doctrinales listas para aplicar
              </h4>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Se han publicado cambios en la plataforma PII-LCC. Al actualizar, <strong className="text-emerald-300">todos sus fondos personalizados, configuraciones y datos tácticos se mantendrán intactos</strong>.
              </p>

              <div className="flex items-center gap-2 mt-3 pt-2 border-t border-zinc-800/80">
                <button
                  type="button"
                  id="btn-apply-tactical-update"
                  onClick={handleApplyUpdate}
                  disabled={isUpdating}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-mono font-bold text-xs rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
                  <span>{isUpdating ? 'APLICANDO Y REINICIANDO...' : 'ACTUALIZAR Y APLICAR CAMBIOS'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSyncCenterModal(true)}
                  className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono text-xs rounded-lg transition-colors cursor-pointer"
                  title="Ver detalles de sincronización"
                >
                  Detalles
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Top Header HUD Badge Trigger for Sync & Updates */}
      <div className="inline-flex items-center">
        <button
          type="button"
          id="btn-open-sync-center"
          onClick={() => {
            setShowSyncCenterModal(true);
            playSyntheticBeep(750, 0.08);
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-mono text-xs transition-all cursor-pointer ${
            hasUpdate
              ? 'bg-amber-950/40 border-amber-500 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)] animate-pulse'
              : 'bg-zinc-950/70 border-zinc-800 hover:border-emerald-500/50 text-zinc-400 hover:text-emerald-300'
          }`}
          title="Centro de Sincronización, Actualizaciones y Respaldo Multiplataforma"
        >
          {isOnline ? (
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shadow-[0_0_8px_#10b981]" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
          )}
          <span className="font-bold text-[10px] tracking-wider">
            {currentVersion.split('-')[0]}
          </span>
          {hasUpdate && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
          )}
        </button>
      </div>

      {/* 3. Comprehensive Sync & Update Modal */}
      {showSyncCenterModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-zinc-950 border-2 border-emerald-500/70 rounded-2xl max-w-2xl w-full p-6 text-zinc-200 shadow-[0_0_50px_rgba(16,185,129,0.2)] font-sans relative max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white tracking-wide">
                      CENTRO DE SINCRONIZACIÓN Y ACTUALIZACIONES PII-LCC
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                      MIL-STD C4ISR
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Garantía de persistencia multiplataforma, respaldo de fondos y actualizaciones automáticas.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSyncCenterModal(false)}
                className="p-1.5 text-zinc-500 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notification message if present */}
            {syncStatusMsg && (
              <div className="my-4 p-3 bg-emerald-950/60 border border-emerald-500/60 text-emerald-300 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{syncStatusMsg}</span>
              </div>
            )}

            {/* System Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-5">
              <div className="p-3.5 bg-zinc-900/80 border border-zinc-800 rounded-xl">
                <span className="text-[10px] font-mono text-zinc-500 uppercase block">Versión Instalada</span>
                <span className="text-sm font-mono font-bold text-white mt-1 block">
                  {currentVersion}
                </span>
                <span className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1 font-mono">
                  <CheckCircle2 className="w-3 h-3" /> Memoria local segura
                </span>
              </div>

              <div className="p-3.5 bg-zinc-900/80 border border-zinc-800 rounded-xl">
                <span className="text-[10px] font-mono text-zinc-500 uppercase block">Servidor Central</span>
                <span className="text-sm font-mono font-bold text-white mt-1 block">
                  {serverVersion}
                </span>
                <span className="text-[10px] text-zinc-400 mt-1 flex items-center gap-1 font-mono">
                  <Clock className="w-3 h-3 text-zinc-500" /> {lastCheckedTime}
                </span>
              </div>

              <div className="p-3.5 bg-zinc-900/80 border border-zinc-800 rounded-xl">
                <span className="text-[10px] font-mono text-zinc-500 uppercase block">Estado del Enlace</span>
                <div className="flex items-center gap-2 mt-1">
                  {isOnline ? (
                    <>
                      <Wifi className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm font-mono font-bold text-emerald-400">EN LÍNEA</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-4 h-4 text-amber-400" />
                      <span className="text-sm font-mono font-bold text-amber-400">MODO OFFLINE PWA</span>
                    </>
                  )}
                </div>
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  {isOnline ? 'Sincronización en tiempo real' : 'Operando con caché local'}
                </span>
              </div>
            </div>

            {/* Main Action Sections */}
            <div className="space-y-4">
              {/* Section 1: Update Terminal */}
              <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-emerald-400" />
                      <span>Actualización de la Plataforma</span>
                    </h4>
                    <p className="text-xs text-zinc-400 mt-1">
                      Comprueba si el mando central ha publicado nuevas modificaciones del código o recursos visuales. Al actualizar, <strong className="text-zinc-200">ningún fondo personalizado o dato de misión se borra</strong>.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => checkForUpdates(true)}
                      disabled={isChecking}
                      className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-mono text-xs rounded-lg border border-zinc-700 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-emerald-400' : ''}`} />
                      <span>{isChecking ? 'Verificando...' : 'Comprobar Ahora'}</span>
                    </button>

                    {hasUpdate && (
                      <button
                        type="button"
                        onClick={handleApplyUpdate}
                        disabled={isUpdating}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Aplicar Versión</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 2: Backup & Multi-device Migration */}
              <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-emerald-400" />
                  <span>Respaldo y Clonación Multi-Dispositivo</span>
                </h4>
                <p className="text-xs text-zinc-400 mt-1">
                  Permite exportar todos los fondos configurados, opacidades, filtros ópticos y registros tácticos en un archivo cifrado para importarlo en cualquier celular, tablet o PC.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    className="flex items-center justify-center gap-2 p-3 bg-zinc-950 border border-zinc-700 hover:border-emerald-500/60 rounded-xl font-mono text-xs text-zinc-200 hover:text-emerald-300 transition-all cursor-pointer shadow-sm"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                    <div className="text-left leading-tight">
                      <span className="font-bold block">EXPORTAR COPIA COMPLETA</span>
                      <span className="text-[10px] text-zinc-500">Descarga archivo .json con todo</span>
                    </div>
                  </button>

                  <label className="flex items-center justify-center gap-2 p-3 bg-zinc-950 border border-zinc-700 hover:border-emerald-500/60 rounded-xl font-mono text-xs text-zinc-200 hover:text-emerald-300 transition-all cursor-pointer shadow-sm">
                    <Upload className="w-4 h-4 text-emerald-400" />
                    <div className="text-left leading-tight">
                      <span className="font-bold block">RESTAURAR COPIA .JSON</span>
                      <span className="text-[10px] text-zinc-500">Cargar en este o cualquier equipo</span>
                    </div>
                    <input 
                      type="file" 
                      accept=".json" 
                      onChange={handleImportBackupFile}
                      className="hidden" 
                    />
                  </label>
                </div>
              </div>

              {/* Section 3: PWA Installation Guidance */}
              <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    <span>Instalación Nativa en Dispositivos</span>
                  </h4>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Instale la PII-LCC como aplicación de escritorio o móvil independiente para operar a pantalla completa.
                  </p>
                </div>

                {onOpenInstallModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowSyncCenterModal(false);
                      onOpenInstallModal();
                    }}
                    className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-white font-mono text-xs rounded-lg transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <ArrowDownCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Instalar App</span>
                  </button>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
              <span>SISTEMA DE PERSISTENCIA DOCTRINAL PII-LCC</span>
              <button
                type="button"
                onClick={() => setShowSyncCenterModal(false)}
                className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg transition-colors border border-zinc-700 cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
