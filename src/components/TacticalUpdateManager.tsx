import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  RefreshCw,
  Download,
  Upload,
  CheckCircle2,
  ShieldCheck,
  Zap,
  X,
  Wifi,
  WifiOff,
  HardDrive,
  Layers,
  ArrowDownCircle,
  Clock,
  Smartphone,
  Radio
} from 'lucide-react';
import { playSyntheticBeep, playChime } from '../utils/audio';
import { safeStorage } from '../utils/storage';
import { AI_STUDIO_BUILD } from '../buildVersion';

interface TacticalUpdateManagerProps {
  currentVersion?: string;
  onOpenInstallModal?: () => void;
}

const AUTO_UPDATE_STORAGE_KEY = 'PII_LCC_AUTO_OTA_ENABLED';
const SESSION_RELOAD_GUARD_KEY = 'PII_LCC_SESSION_RELOADED_BUILD_ID';

function detectStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)')?.matches === true ||
    window.matchMedia?.('(display-mode: window-controls-overlay)')?.matches === true ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export const TacticalUpdateManager: React.FC<TacticalUpdateManagerProps> = ({
  currentVersion = AI_STUDIO_BUILD.version,
  onOpenInstallModal
}) => {
  const [hasUpdate, setHasUpdate] = useState<boolean>(false);
  const [serverVersion, setServerVersion] = useState<string>(currentVersion || AI_STUDIO_BUILD.version);
  const [serverBuildId, setServerBuildId] = useState<string>(AI_STUDIO_BUILD.buildId);
  const [changelog, setChangelog] = useState<string>(AI_STUDIO_BUILD.changelog);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isBroadcastingPush, setIsBroadcastingPush] = useState<boolean>(false);
  const [autoUpdateCountdown, setAutoUpdateCountdown] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isStandaloneApp, setIsStandaloneApp] = useState<boolean>(() => detectStandalonePWA());
  const [autoOtaEnabled, setAutoOtaEnabled] = useState<boolean>(() => {
    const saved = safeStorage.getItem(AUTO_UPDATE_STORAGE_KEY);
    return saved !== 'false'; // Enabled by default so all installed devices stay updated automatically
  });
  const [showSyncCenterModal, setShowSyncCenterModal] = useState<boolean>(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [lastCheckedTime, setLastCheckedTime] = useState<string>('Recién comprobado');
  const [updateFunction, setUpdateFunction] = useState<(() => Promise<void>) | null>(null);

  const serverBuildIdRef = useRef<string>(AI_STUDIO_BUILD.buildId);
  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const isApplyingUpdateRef = useRef<boolean>(false);
  const autoOtaEnabledRef = useRef<boolean>(autoOtaEnabled);

  useEffect(() => {
    autoOtaEnabledRef.current = autoOtaEnabled;
    safeStorage.setItem(AUTO_UPDATE_STORAGE_KEY, autoOtaEnabled ? 'true' : 'false');
  }, [autoOtaEnabled]);

  useEffect(() => {
    setIsStandaloneApp(detectStandalonePWA());
  }, []);

  // Execute clean update: preserves localStorage, IndexedDB, Supabase sync & custom backgrounds,
  // clears stale CacheStorage bundles, activates new Service Worker, and reloads fresh.
  const handleApplyUpdate = useCallback(
    async (explicitBuildId?: string) => {
      if (isApplyingUpdateRef.current) return;
      isApplyingUpdateRef.current = true;
      setIsUpdating(true);
      setAutoUpdateCountdown(null);
      playChime(600, 900, 0.25);

      const targetBuildId = explicitBuildId || serverBuildIdRef.current || serverBuildId;

      try {
        // Guard against infinite reload loops in this session
        try {
          window.sessionStorage?.setItem(SESSION_RELOAD_GUARD_KEY, targetBuildId);
        } catch {}

        safeStorage.setItem('PII_LCC_APPLIED_BUILD_ID', targetBuildId);
        safeStorage.setItem('PII_LCC_JUST_UPDATED', 'true');
        setHasUpdate(false);

        // 1. Purge stale CacheStorage entries (never touches localStorage or IndexedDB)
        if (typeof window !== 'undefined' && 'caches' in window) {
          try {
            const cacheKeys = await caches.keys();
            await Promise.all(cacheKeys.map((key) => caches.delete(key)));
          } catch (e) {
            console.warn('[OTA] Cache clearing warning:', e);
          }
        }

        // 2. Ask waiting Service Worker to activate immediately
        if (swRegistrationRef.current) {
          try {
            await swRegistrationRef.current.update();
            if (swRegistrationRef.current.waiting) {
              swRegistrationRef.current.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
          } catch (e) {
            console.warn('[OTA] SW update warning:', e);
          }
        }

        if (updateFunction) {
          try {
            await updateFunction();
          } catch {}
        }

        // 3. Reload the installed app / browser cleanly
        setTimeout(() => {
          window.location.reload();
        }, 280);
      } catch (err) {
        console.error('[OTA] Update execution error:', err);
        window.location.reload();
      }
    },
    [serverBuildId, updateFunction]
  );

  const scheduleAutoUpdateIfAllowed = useCallback(
    (remoteBuildId: string, forceImmediate: boolean = false) => {
      // Never auto-reload twice for the same buildId in the same browser session
      let alreadyReloadedThisSession = false;
      try {
        alreadyReloadedThisSession =
          window.sessionStorage?.getItem(SESSION_RELOAD_GUARD_KEY) === remoteBuildId;
      } catch {}

      if (alreadyReloadedThisSession) {
        setHasUpdate(true);
        return;
      }

      if (autoOtaEnabledRef.current || forceImmediate) {
        setHasUpdate(true);
        setAutoUpdateCountdown(forceImmediate ? 2 : 3);
      } else {
        setHasUpdate(true);
      }
    },
    []
  );

  // Countdown effect for automatic zero-friction update on installed devices
  useEffect(() => {
    if (autoUpdateCountdown === null) return;
    if (autoUpdateCountdown <= 0) {
      handleApplyUpdate(serverBuildIdRef.current);
      return;
    }
    const timer = setTimeout(() => {
      setAutoUpdateCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [autoUpdateCountdown, handleApplyUpdate]);

  // 2. Periodic & event-driven version check against server (/api/app-version)
  const checkForUpdates = useCallback(
    async (manual: boolean = false) => {
      if (manual) {
        setIsChecking(true);
        playSyntheticBeep(700, 0.08);
      }

      // Also ask the Service Worker to check for a new sw.js on every check
      if (swRegistrationRef.current) {
        swRegistrationRef.current.update().catch(() => {});
      }

      try {
        const res = await fetch(`/api/app-version?t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });
        if (res.ok) {
          const data = await res.json();
          setLastCheckedTime(new Date().toLocaleTimeString('es-BO', { hour12: false }));

          if (data && data.buildId) {
            const remoteBuildId = String(data.buildId);
            serverBuildIdRef.current = remoteBuildId;
            setServerBuildId(remoteBuildId);
            setServerVersion(data.version || AI_STUDIO_BUILD.version);
            if (data.changelog) setChangelog(data.changelog);

            // Already running the latest compiled build
            if (remoteBuildId === AI_STUDIO_BUILD.buildId) {
              setHasUpdate(false);
              setAutoUpdateCountdown(null);
              if (manual) {
                setSyncStatusMsg(`Dispositivo al día: versión actual (${AI_STUDIO_BUILD.version}).`);
                setTimeout(() => setSyncStatusMsg(null), 4000);
              }
              return;
            }

            // Respect explicit manual dismissal only for non-manual checks when auto-OTA is disabled
            const dismissedBuildId = safeStorage.getItem('PII_LCC_DISMISSED_BUILD_ID');
            if (!manual && !autoOtaEnabledRef.current && dismissedBuildId === remoteBuildId) {
              setHasUpdate(false);
              return;
            }

            // A newer build is published on the server!
            if (manual) {
              setHasUpdate(true);
              setSyncStatusMsg(`Nueva versión ${data.version} disponible. Lista para aplicar.`);
              setTimeout(() => setSyncStatusMsg(null), 5000);
            } else {
              scheduleAutoUpdateIfAllowed(remoteBuildId, false);
            }
          } else {
            setHasUpdate(false);
          }
        }
      } catch (err) {
        console.warn('[OTA Updater] Could not check app version:', err);
      } finally {
        if (manual) {
          setTimeout(() => setIsChecking(false), 450);
        }
      }
    },
    [scheduleAutoUpdateIfAllowed]
  );

  // 1. Service Worker registration + controllerchange auto-reload + WebSocket push listener
  useEffect(() => {
    let updateSWFn: ((reloadPage?: boolean) => Promise<void>) | null = null;
    let swInterval: ReturnType<typeof setInterval> | null = null;
    let hadExistingController =
      typeof navigator !== 'undefined' && 'serviceWorker' in navigator && !!navigator.serviceWorker.controller;

    const handleControllerChange = () => {
      // Only reload when an existing installed SW was replaced by a newer SW
      if (!hadExistingController || isApplyingUpdateRef.current) return;
      const guardKey = `sw-ctrl-${serverBuildIdRef.current}`;
      try {
        if (window.sessionStorage?.getItem(SESSION_RELOAD_GUARD_KEY) === guardKey) return;
        window.sessionStorage?.setItem(SESSION_RELOAD_GUARD_KEY, guardKey);
      } catch {}
      isApplyingUpdateRef.current = true;
      window.location.reload();
    };

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && !import.meta.env.DEV) {
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

      import('virtual:pwa-register')
        .then(({ registerSW }) => {
          updateSWFn = registerSW({
            immediate: true,
            onNeedRefresh() {
              // New Service Worker detected on installed device!
              if (autoOtaEnabledRef.current) {
                scheduleAutoUpdateIfAllowed(`sw-update-${Date.now()}`, false);
              } else {
                setHasUpdate(true);
              }
            },
            onOfflineReady() {
              console.log('[PWA OTA] Aplicación almacenada y lista para operar sin conexión.');
            },
            onRegistered(r) {
              if (r) {
                swRegistrationRef.current = r;
                hadExistingController = !!navigator.serviceWorker.controller;
                // Check for Service Worker updates every 60s
                r.update().catch(() => {});
                swInterval = setInterval(() => {
                  r.update().catch(() => {});
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
        .catch((err) => {
          console.warn('[PWA OTA] virtual:pwa-register not available:', err);
        });
    }

    const handleOnline = () => {
      setIsOnline(true);
      // Immediately check for missed updates as soon as device regains signal
      checkForUpdates(false);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Real-time WebSocket upgrade push from server to all installed devices
    const handleSystemUpgradeAlert = (e: any) => {
      const detail = e?.detail;
      if (!detail) return;
      const incomingBuildId = String(detail.buildId || `ws-push-${detail.timestamp || Date.now()}`);
      if (incomingBuildId === AI_STUDIO_BUILD.buildId) {
        setHasUpdate(false);
        return;
      }

      serverBuildIdRef.current = incomingBuildId;
      setServerBuildId(incomingBuildId);
      if (detail.version) setServerVersion(detail.version);
      if (detail.changelog) setChangelog(detail.changelog);
      playSyntheticBeep(987, 0.2, 'sine', 0.2);
      scheduleAutoUpdateIfAllowed(incomingBuildId, Boolean(detail.forceImmediate));
    };

    window.addEventListener('system-upgrade-alert', handleSystemUpgradeAlert);

    return () => {
      if (swInterval) clearInterval(swInterval);
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      }
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('system-upgrade-alert', handleSystemUpgradeAlert);
    };
  }, [checkForUpdates, scheduleAutoUpdateIfAllowed]);

  // 3. Foreground, focus, and periodic polling (every 45s) so installed apps update rapidly
  useEffect(() => {
    checkForUpdates(false);

    const interval = setInterval(() => {
      checkForUpdates(false);
    }, 45 * 1000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates(false);
      }
    };

    const handleWindowFocus = () => {
      checkForUpdates(false);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [checkForUpdates]);

  // Broadcast an immediate OTA refresh push to ALL installed devices connected to the network
  const handlePushUpdateToAllDevices = async () => {
    setIsBroadcastingPush(true);
    playSyntheticBeep(880, 0.12);
    try {
      const resp = await fetch('/api/app-version/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: AI_STUDIO_BUILD.version,
          changelog: 'Sincronización y actualización inmediata propagada a todos los dispositivos instalados.'
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        playChime(650, 1050, 0.25);
        setSyncStatusMsg(
          `Señal OTA enviada a ${data.notifiedDevices ?? 1} dispositivo(s) conectado(s). Todos los equipos instalados se actualizarán automáticamente.`
        );
        setTimeout(() => setSyncStatusMsg(null), 6000);
      } else {
        setSyncStatusMsg('No se pudo propagar la señal OTA al servidor central.');
        setTimeout(() => setSyncStatusMsg(null), 4000);
      }
    } catch {
      setSyncStatusMsg('Error de red al propagar la actualización.');
      setTimeout(() => setSyncStatusMsg(null), 4000);
    } finally {
      setIsBroadcastingPush(false);
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
      {/* 1. Floating Tactical Update Alert Banner (supports automatic countdown on installed devices) */}
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
                    {autoUpdateCountdown !== null
                      ? `ACTUALIZANDO EN ${autoUpdateCountdown}s`
                      : 'ACTUALIZACIÓN PUBLICADA'}
                  </span>
                  <span className="text-[11px] font-mono text-zinc-400">{serverVersion}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const targetBuildId = serverBuildIdRef.current || serverBuildId;
                    setAutoUpdateCountdown(null);
                    if (targetBuildId) {
                      safeStorage.setItem('PII_LCC_DISMISSED_BUILD_ID', targetBuildId);
                    }
                    setHasUpdate(false);
                  }}
                  className="text-zinc-500 hover:text-zinc-300 p-1 rounded hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Posponer actualización"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <h4 className="text-sm font-bold text-white mt-1.5 leading-snug">
                Nueva actualización lista para este dispositivo
              </h4>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                {changelog || 'Nuevas mejoras publicadas.'}{' '}
                <strong className="text-emerald-300">
                  Sus datos, patrullas y configuraciones se mantienen intactos.
                </strong>
              </p>

              <div className="flex items-center gap-2 mt-3 pt-2 border-t border-zinc-800/80">
                <button
                  type="button"
                  id="btn-apply-tactical-update"
                  onClick={() => handleApplyUpdate()}
                  disabled={isUpdating}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-mono font-bold text-xs rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
                  <span>{isUpdating ? 'APLICANDO Y REINICIANDO...' : 'ACTUALIZAR AHORA'}</span>
                </button>

                {autoUpdateCountdown !== null && (
                  <button
                    type="button"
                    onClick={() => setAutoUpdateCountdown(null)}
                    className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Esperar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Top Header HUD Badge Trigger for Sync & OTA Updates */}
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
          title="Centro de Sincronización, Actualizaciones OTA Multi-Dispositivo y Respaldo"
        >
          {isOnline ? (
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shadow-[0_0_8px_#10b981]" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
          )}
          <span className="font-bold text-[10px] tracking-wider">
            {currentVersion.split('-')[0]}
          </span>
          {hasUpdate && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />}
        </button>
      </div>

      {/* 3. Comprehensive Sync & OTA Update Modal */}
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
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-white tracking-wide">
                      CENTRO DE ACTUALIZACIONES OTA Y SINCRONIZACIÓN
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                      {isStandaloneApp ? 'APP INSTALADA (PWA)' : 'NAVEGADOR WEB'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Propagación automática de mejoras a todos los teléfonos, tablets y PCs con la app instalada.
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

            {syncStatusMsg && (
              <div className="my-4 p-3 bg-emerald-950/60 border border-emerald-500/60 text-emerald-300 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{syncStatusMsg}</span>
              </div>
            )}

            {/* System Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-5">
              <div className="p-3.5 bg-zinc-900/80 border border-zinc-800 rounded-xl">
                <span className="text-[10px] font-mono text-zinc-500 uppercase block">Versión en Este Equipo</span>
                <span className="text-sm font-mono font-bold text-white mt-1 block">{currentVersion}</span>
                <span className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1 font-mono">
                  <Smartphone className="w-3 h-3" /> {isStandaloneApp ? 'Modo App Instalada' : 'Modo Web'}
                </span>
              </div>

              <div className="p-3.5 bg-zinc-900/80 border border-zinc-800 rounded-xl">
                <span className="text-[10px] font-mono text-zinc-500 uppercase block">Servidor Central</span>
                <span className="text-sm font-mono font-bold text-white mt-1 block">{serverVersion}</span>
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
                      <span className="text-sm font-mono font-bold text-amber-400">MODO OFFLINE</span>
                    </>
                  )}
                </div>
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  {isOnline ? 'OTA + WebSocket activos' : 'Operando con caché local'}
                </span>
              </div>
            </div>

            {/* Main Action Sections */}
            <div className="space-y-4">
              {/* Section 1: Automatic OTA Updates across all installed devices */}
              <div className="p-4 bg-zinc-900/60 border border-emerald-500/30 rounded-xl space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 min-w-[220px]">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-emerald-400" />
                      <span>Actualización Automática en Dispositivos Instalados (OTA)</span>
                    </h4>
                    <p className="text-xs text-zinc-400 mt-1">
                      Cada vez que se publique una mejora, todas las apps ya instaladas en celulares, tablets o PCs la detectan al abrirse o en segundo plano, limpian la caché antigua y aplican los cambios sin borrar datos ni reinstalar.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setAutoOtaEnabled((prev) => !prev)}
                    className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold border transition-colors cursor-pointer shrink-0 ${
                      autoOtaEnabled
                        ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300'
                        : 'bg-zinc-900 border-zinc-700 text-zinc-400'
                    }`}
                  >
                    AUTO-ACTUALIZAR: {autoOtaEnabled ? 'ACTIVO' : 'MANUAL'}
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-800/80">
                  <button
                    type="button"
                    onClick={() => checkForUpdates(true)}
                    disabled={isChecking}
                    className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-mono text-xs rounded-lg border border-zinc-700 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-emerald-400' : ''}`} />
                    <span>{isChecking ? 'Verificando...' : 'Comprobar Ahora'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePushUpdateToAllDevices}
                    disabled={isBroadcastingPush || !isOnline}
                    className="px-3 py-2 bg-cyan-950/70 hover:bg-cyan-900/70 text-cyan-200 font-mono font-bold text-xs rounded-lg border border-cyan-500/50 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    title="Envía una señal inmediata por WebSocket para que todos los equipos instalados descarguen y apliquen los últimos cambios"
                  >
                    <Radio className={`w-3.5 h-3.5 text-cyan-400 ${isBroadcastingPush ? 'animate-ping' : ''}`} />
                    <span>
                      {isBroadcastingPush
                        ? 'Propagando señal OTA...'
                        : 'Propagar a Todos los Dispositivos'}
                    </span>
                  </button>

                  {hasUpdate && (
                    <button
                      type="button"
                      onClick={() => handleApplyUpdate()}
                      disabled={isUpdating}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Aplicar Versión Ahora</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Section 2: Backup & Multi-device Migration */}
              <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-emerald-400" />
                  <span>Respaldo y Clonación Multi-Dispositivo</span>
                </h4>
                <p className="text-xs text-zinc-400 mt-1">
                  Exporte todos los fondos configurados, opacidades y registros tácticos en un archivo para importarlo en cualquier celular, tablet o PC.
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
                    {isStandaloneApp
                      ? 'Esta terminal ya se ejecuta como aplicación instalada con actualizaciones OTA automáticas activas.'
                      : 'Instale la PII-LCC como aplicación independiente en Android, iOS o PC para recibir todas las mejoras automáticamente.'}
                  </p>
                </div>

                {onOpenInstallModal && !isStandaloneApp && (
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
              <span>SISTEMA DE ACTUALIZACIÓN OTA MULTI-DISPOSITIVO PII-LCC</span>
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
