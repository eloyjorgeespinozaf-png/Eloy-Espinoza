/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MilitaryRole, RawAlert, Clan, ActionableIntel, AutomatedOrder, TacticalUnit, User, AuditLogEntry, G2RegistryRecord } from './types';
import { 
  initialRawAlerts, 
  initialClans, 
  initialActionableIntel, 
  initialOrders, 
  initialTacticalUnits, 
  initialChartData 
} from './utils/mockData';
import { initialG2Records } from './utils/g2Records';

import HorizontalFlowSimulator from './components/HorizontalFlowSimulator';
import StrategicView from './components/StrategicView';
import OperationalView from './components/OperationalView';
import TacticalView from './components/TacticalView';
import InteractiveChartCreator from './components/InteractiveChartCreator';
import SystemArchitectureDiagram from './components/SystemArchitectureDiagram';
import TacticalP2PMesh from './components/TacticalP2PMesh';
import OfficialCrest from './components/OfficialCrest';
import PIILCCLogo from './components/PIILCCLogo';
import HeaderTopRightLogo from './components/HeaderTopRightLogo';
import ErrorBoundary from './components/ErrorBoundary';
import CodeViewer from './components/CodeViewer';
import { MilitaryLoginView } from './components/MilitaryLoginView';
import { GamerFontSelector } from './components/GamerFontSelector';
import { useGamingFont } from './utils/fontTheme';
import { FullDashboardBackground, FullDashboardBackgroundControl, useFullDashboardBackground } from './components/FullDashboardBackground';

import { Shield, Radio, Zap, Navigation, Clock, User as UserIcon, AlertCircle, Eye, Settings, HelpCircle, FileText, Lock, Unlock, LogOut, Key, AlertTriangle, Terminal, Layers, RefreshCw, Bell, Volume2, VolumeX, Code, Download, Moon, Sun, Sliders, Check, EyeOff, Gamepad2 } from 'lucide-react';
import { useAuth, PRESET_USERS } from './context/AuthContext';
import { safeStorage } from './utils/storage';
import { playSyntheticBeep, playChime } from './utils/audio';

export default function App() {
  const { fontPreset } = useGamingFont();
  const fullBgState = useFullDashboardBackground();
  const {
    user,
    isAuthenticated,
    login,
    logout,
    validateBackendPermission,
    securityError,
    clearSecurityError,
    auditLogs,
    setAuditLogs
  } = useAuth();

  const [selectedLoginRole, setSelectedLoginRole] = useState<MilitaryRole>('ROL_PATRULLA');
  const [rawAlerts, setRawAlerts] = useState<RawAlert[]>(initialRawAlerts);
  const [expedientes, setExpedientes] = useState<G2RegistryRecord[]>(() => {
    try {
      const saved = safeStorage.getItem('pii_lcc_expedientes');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load saved expedientes:', e);
    }
    return initialG2Records;
  });
  const [clans, setClans] = useState<Clan[]>(initialClans);
  const [actionableIntel, setActionableIntel] = useState<ActionableIntel[]>(initialActionableIntel);
  const [activeOrders, setActiveOrders] = useState<AutomatedOrder[]>(initialOrders);
  const [tacticalUnits, setTacticalUnits] = useState<TacticalUnit[]>(initialTacticalUnits);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'OPERATIONS' | 'ARCHITECTURE' | 'P2P_MESH' | 'CODE_VIEWER'>('OPERATIONS');
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  const [isInstalledDevice, setIsInstalledDevice] = useState<boolean>(() => {
    const isStandalone = typeof window !== 'undefined' && Boolean(
      (window.matchMedia && window.matchMedia('(display-mode: standalone)')?.matches) || (window.navigator as any)?.standalone
    );
    const isMobileDevice = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const saved = safeStorage.getItem('pii_lcc_installed_mode');
    if (saved !== null) return saved === 'true';
    return isStandalone || isMobileDevice;
  });

  const toggleInstalledDevice = (val: boolean) => {
    setIsInstalledDevice(val);
    safeStorage.setItem('pii_lcc_installed_mode', val ? 'true' : 'false');
  };

  const [validatedReportAlert, setValidatedReportAlert] = useState<ActionableIntel | null>(null);

  // Real-time Tactical Notifications state & sound
  interface TacticalNotification {
    id: string;
    alert: RawAlert;
  }
  const [notifications, setNotifications] = useState<TacticalNotification[]>([]);
  const [notificationsSoundEnabled, setNotificationsSoundEnabled] = useState<boolean>(true);
  const prevAlertIdsRef = useRef<Set<string>>(new Set());

  // Function to play crisp military confirmation sound upon report validation
  const playValidationSound = () => {
    try {
      playSyntheticBeep(523.25, 0.12, 'sine', 0.05);
      setTimeout(() => playSyntheticBeep(659.25, 0.12, 'sine', 0.05), 80);
      setTimeout(() => playSyntheticBeep(783.99, 0.15, 'sine', 0.05), 160);
      setTimeout(() => playSyntheticBeep(1046.50, 0.25, 'triangle', 0.06), 240);
    } catch (e) {
      console.warn('[PII-LCC Audio] Validation sound blocked or failed:', e);
    }
  };

  // Function to play warning chime on new alert
  const playNotificationChime = () => {
    try {
      playChime(800, 1100, 0.2);
    } catch (e) {
      console.warn('[PII-LCC Audio] Tone restricted or failed:', e);
    }
  };

  // Effect to automatically monitor incoming rawAlerts list for NEW field reports in real-time
  useEffect(() => {
    if (rawAlerts.length > 0) {
      if (prevAlertIdsRef.current.size > 0) {
        // Find any alert whose ID is not in our known list
        const newAlerts = rawAlerts.filter(a => !prevAlertIdsRef.current.has(a.id));
        if (newAlerts.length > 0) {
          // Play the chime (if sound is active)
          if (notificationsSoundEnabled) {
            playNotificationChime();
          }
          // Push notifications to list
          newAlerts.forEach(alert => {
            const notifId = `notif-${alert.id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            setNotifications(prev => [
              { id: notifId, alert },
              ...prev
            ]);
            // Auto dismiss after 10 seconds
            setTimeout(() => {
              setNotifications(prev => prev.filter(n => n.id !== notifId));
            }, 10000);
          });
        }
      }
      // Populate our set with all currently active/historic IDs
      rawAlerts.forEach(a => prevAlertIdsRef.current.add(a.id));
    }
  }, [rawAlerts, notificationsSoundEnabled]);

  // Safe localStorage helper to prevent DOMException/SecurityError in private browsing or iframe environments
  const safeLocalStorage = safeStorage;

  // Automatic OTA update tracking
  const APP_VERSION = 'v2.4.0-CAD';
  const [appVersion, setAppVersion] = useState<string>(() => {
    return safeLocalStorage.getItem('PII_LCC_UPDATED_VERSION') || 'v2.4.0-CAD';
  });
  const [updateInProgress, setUpdateInProgress] = useState<boolean>(false);
  const [updateProgress, setUpdateProgress] = useState<number>(0);
  const [updatePhase, setUpdatePhase] = useState<string>('');
  const [updateChangelog, setUpdateChangelog] = useState<string>('');
  const [newVersionToInstall, setNewVersionToInstall] = useState<string>('');
  const [justUpdatedToast, setJustUpdatedToast] = useState<boolean>(false);

  // Trigger automated update HUD overlay
  const triggerAutoUpdate = (nextVersion: string, changelog: string) => {
    setNewVersionToInstall(nextVersion);
    setUpdateChangelog(changelog);
    setUpdateInProgress(true);
    setUpdateProgress(0);
    setUpdatePhase('Inicializando gestor de descarga multipunto encriptada (OTA)...');

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 8) + 4;
      if (progress >= 100) {
        progress = 100;
        setUpdateProgress(100);
        setUpdatePhase('Verificación de hash criptográfico exitosa. Instalando parche de mejora...');
        clearInterval(interval);
        
        setTimeout(() => {
          safeLocalStorage.setItem('PII_LCC_JUST_UPDATED', 'true');
          safeLocalStorage.setItem('PII_LCC_UPDATED_VERSION', nextVersion);
          setAppVersion(nextVersion);
          setUpdateInProgress(false);
          setJustUpdatedToast(true);
        }, 1200);
      } else {
        setUpdateProgress(progress);
        if (progress < 20) {
          setUpdatePhase('Descargando módulos doctrinales modificados (hot-swap)...');
        } else if (progress < 40) {
          setUpdatePhase('Analizando redundancias de red multipunto y buffers de memoria...');
        } else if (progress < 60) {
          setUpdatePhase('Recompilando flujos de inteligencia y matrices de interdicción...');
        } else if (progress < 80) {
          setUpdatePhase('Escribiendo firmas criptográficas CAD-C2 en memoria del terminal...');
        } else {
          setUpdatePhase('Realizando verificación checksum final de redundancias...');
        }
      }
    }, 120);
  };

  useEffect(() => {
    if (safeLocalStorage.getItem('PII_LCC_JUST_UPDATED') === 'true') {
      setJustUpdatedToast(true);
      safeLocalStorage.removeItem('PII_LCC_JUST_UPDATED');
      const timer = setTimeout(() => {
        setJustUpdatedToast(false);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, []);

  // WebSocket references
  const socketRef = useRef<WebSocket | null>(null);
  const sentLogsRef = useRef<Set<string>>(new Set());

  // Shared helper to synchronize central state with React states
  const handleStateSync = useCallback((state: any) => {
    if (!state) return;
    const { version: serverVersion, rawAlerts: incomingAlerts, clans: incomingClans, actionableIntel: incomingIntel, activeOrders: incomingOrders, tacticalUnits: incomingUnits, auditLogs: incomingLogs, changelog } = state;
    
    if (incomingAlerts) setRawAlerts(incomingAlerts);
    if (incomingClans) setClans(incomingClans);
    if (incomingIntel) setActionableIntel(incomingIntel);
    if (incomingOrders) setActiveOrders(incomingOrders);
    if (incomingUnits) setTacticalUnits(incomingUnits);

    if (incomingLogs && incomingLogs.length > 0) {
      setAuditLogs(prev => {
        const merged = [...prev];
        incomingLogs.forEach((log: AuditLogEntry) => {
          if (!merged.some(m => m.id === log.id)) {
            merged.push(log);
            sentLogsRef.current.add(log.id);
          }
        });
        return merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      });
    }

    if (serverVersion && serverVersion !== appVersion) {
      setAppVersion(serverVersion);
      safeLocalStorage.setItem('PII_LCC_UPDATED_VERSION', serverVersion);
    }
  }, []);

  const handleStateSyncRef = useRef(handleStateSync);
  useEffect(() => {
    handleStateSyncRef.current = handleStateSync;
  }, [handleStateSync]);

  // Safe helper to send messages via WebSocket or fallback HTTP POST
  const sendWsMessage = useCallback(async (type: string, payload: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type, payload }));
    } else {
      console.warn(`[PII-LCC Network] WebSocket offline. Routing action '${type}' via secure HTTP Sync Fallback.`);
      try {
        const response = await fetch('/api/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: { type, payload }
          })
        });
        if (response.ok) {
          const state = await response.json();
          handleStateSyncRef.current(state);
        } else {
          console.error('[PII-LCC Network] HTTP Sync Fallback failed:', response.statusText);
        }
      } catch (err) {
        console.error('[PII-LCC Network] Error during HTTP Sync Fallback:', err);
      }
    }
  }, []);

  // Real-time synchronization connection hook
  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimeout: any = null;
    let isCleanedUp = false;

    const connect = () => {
      if (isCleanedUp) return;
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws-sync`;
        
        console.log(`[PII-LCC Network] Connecting to sync node: ${wsUrl}`);
        socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        socket.onopen = () => {
          console.log('[PII-LCC Network] Link established with central node.');
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            const { type, payload } = data;

            if (type && type.startsWith('P2P_')) {
              window.dispatchEvent(new CustomEvent('p2p-message', { detail: { type, payload } }));
              return;
            }

            if (type === 'INIT' || type === 'STATE_UPDATE' || type === 'SYSTEM_UPGRADE_ALERT') {
              handleStateSyncRef.current(payload);
            }
          } catch (err) {
            console.error('[PII-LCC Network] Error parsing incoming sync package:', err);
          }
        };

        socket.onclose = () => {
          if (isCleanedUp) return;
          if (reconnectTimeout) clearTimeout(reconnectTimeout);
          console.warn('[PII-LCC Network] Connection interrupted. Re-establishing secure link in 3s...');
          reconnectTimeout = setTimeout(connect, 3000);
        };

        socket.onerror = (err) => {
          console.warn('[PII-LCC Network] WebSocket link unreachable. Operating in secure HTTP Sync Fallback mode.', err);
        };
      } catch (wsErr) {
        console.error('[PII-LCC Network] Could not initialize WebSocket constructor on this device:', wsErr);
        if (!isCleanedUp) {
          if (reconnectTimeout) clearTimeout(reconnectTimeout);
          reconnectTimeout = setTimeout(connect, 5000);
        }
      }
    };

    connect();

    return () => {
      isCleanedUp = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (socket) {
        socket.onclose = null;
        socket.onerror = null;
        socket.close();
      }
    };
  }, []);

  // HTTP fallback polling loop
  useEffect(() => {
    let pollInterval: any;

    const performPoll = async () => {
      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
        try {
          const response = await fetch('/api/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({}) // Empty body fetches current state
          });
          if (response.ok) {
            const state = await response.json();
            handleStateSyncRef.current(state);
          }
        } catch (err) {
          console.warn('[PII-LCC Network] Error polling central state:', err);
        }
      }
    };

    performPoll();
    pollInterval = setInterval(performPoll, 3000);

    return () => {
      clearInterval(pollInterval);
    };
  }, []);

  // Synchronize locally generated audit logs with other network nodes
  useEffect(() => {
    if (auditLogs.length > 0) {
      const latestLog = auditLogs[0];
      if (latestLog && latestLog.id && latestLog.id !== 'log-0' && latestLog.id !== 'log-seed') {
        if (!sentLogsRef.current.has(latestLog.id)) {
          sentLogsRef.current.add(latestLog.id);
          sendWsMessage('LOG_AUDIT_ACTION', { logEntry: latestLog });
        }
      }
    }
  }, [auditLogs]);
  
  // Current active role equals user's role if logged in, or selectedLoginRole otherwise
  const currentRole = isAuthenticated && user ? user.role : selectedLoginRole;

  // Real-time UTC system clock & Local Time Detection
  const [systemTime, setSystemTime] = useState<string>('');
  const [localTime, setLocalTime] = useState<string>('');
  const [localDateStr, setLocalDateStr] = useState<string>('');
  const [localTimezone, setLocalTimezone] = useState<string>('');
  const [isLocalNight, setIsLocalNight] = useState<boolean>(false);
  const [localHourNumber, setLocalHourNumber] = useState<number>(new Date().getHours());
  const [timeOffset, setTimeOffset] = useState<number>(0);
  const [isUpdatingTime, setIsUpdatingTime] = useState<boolean>(false);

  // Night Mode Settings: 'AUTO' (detected from local time 19:00 - 06:00), 'NIGHT' (forced high-contrast field mode), 'STANDARD' (dark mode)
  const [nightModeSetting, setNightModeSetting] = useState<'AUTO' | 'NIGHT' | 'STANDARD'>(() => {
    const saved = safeLocalStorage.getItem('PII_LCC_NIGHT_MODE');
    if (saved === 'AUTO' || saved === 'NIGHT' || saved === 'STANDARD') return saved;
    return 'AUTO';
  });

  const [nightVisionFilter, setNightVisionFilter] = useState<'STEALTH_CONTRAST' | 'NVG_PHOSPHOR' | 'RED_COMBAT'>(() => {
    const saved = safeLocalStorage.getItem('PII_LCC_NVG_FILTER');
    if (saved === 'STEALTH_CONTRAST' || saved === 'NVG_PHOSPHOR' || saved === 'RED_COMBAT') return saved;
    return 'STEALTH_CONTRAST';
  });

  const [showNightSettings, setShowNightSettings] = useState<boolean>(false);

  const setAndSaveNightMode = (mode: 'AUTO' | 'NIGHT' | 'STANDARD') => {
    setNightModeSetting(mode);
    safeLocalStorage.setItem('PII_LCC_NIGHT_MODE', mode);
  };

  const setAndSaveNvgFilter = (filter: 'STEALTH_CONTRAST' | 'NVG_PHOSPHOR' | 'RED_COMBAT') => {
    setNightVisionFilter(filter);
    safeLocalStorage.setItem('PII_LCC_NVG_FILTER', filter);
  };

  const isNightModeActive = nightModeSetting === 'NIGHT' || (nightModeSetting === 'AUTO' && isLocalNight);

  const fetchActualTime = async () => {
    setIsUpdatingTime(true);
    const t0 = Date.now();
    try {
      const response = await fetch('/api/health');
      if (response.ok) {
        const data = await response.json();
        const t3 = Date.now();
        const serverTime = data.serverTime;
        if (serverTime) {
          const rtt = t3 - t0;
          const offset = Math.round(serverTime - (t0 + rtt / 2));
          setTimeOffset(offset);
        }
      }
    } catch (err) {
      console.error('[Clock Sync] Failed to fetch actual time from server:', err);
    } finally {
      setTimeout(() => setIsUpdatingTime(false), 600);
    }
  };

  useEffect(() => {
    fetchActualTime();
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date(Date.now() + timeOffset);
      
      // UTC Military ISO Time
      setSystemTime(now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC');
      
      // Local Time 24h format
      const hrs = now.getHours();
      const mins = String(now.getMinutes()).padStart(2, '0');
      const secs = String(now.getSeconds()).padStart(2, '0');
      setLocalTime(`${String(hrs).padStart(2, '0')}:${mins}:${secs}`);
      setLocalHourNumber(hrs);
      
      // Local Date
      const day = String(now.getDate()).padStart(2, '0');
      const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
      const month = months[now.getMonth()];
      const year = now.getFullYear();
      setLocalDateStr(`${day} ${month} ${year}`);

      // Detect local night: active from 19:00 (7 PM) to 06:00 (6 AM)
      const isNight = hrs >= 19 || hrs < 6;
      setIsLocalNight(isNight);

      // Detect Timezone
      try {
        const offsetMin = -now.getTimezoneOffset();
        const offsetHrs = Math.floor(Math.abs(offsetMin) / 60);
        const offsetM = Math.abs(offsetMin) % 60;
        const sign = offsetMin >= 0 ? '+' : '-';
        const tzName = Intl.DateTimeFormat().resolvedOptions().timeZone || 'LOCAL';
        setLocalTimezone(`UTC${sign}${String(offsetHrs).padStart(2, '0')}:${String(offsetM).padStart(2, '0')} (${tzName})`);
      } catch (e) {
        setLocalTimezone('HORA LOCAL');
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [timeOffset]);

  // Simulated cryptographic hash generator effect for 'Firma Criptográfica'
  const [displayedSignature, setDisplayedSignature] = useState('');

  useEffect(() => {
    const target = 
      selectedLoginRole === 'ROL_PATRULLA' ? 'SIG-AES256-S2-VALENZUELA-48C0F8' :
      selectedLoginRole === 'ROL_FUSION' ? 'SIG-AES256-CFI-ROJAS-9A2E7B' :
      'SIG-AES256-LCC-MARTINEZ-13F5D9';
    
    let currentIteration = 0;
    const maxIterations = target.length;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-';
    
    // Start with a fully randomized string of target's length
    let initialScrambled = '';
    for (let i = 0; i < target.length; i++) {
      initialScrambled += chars[Math.floor(Math.random() * chars.length)];
    }
    setDisplayedSignature(initialScrambled);

    const interval = setInterval(() => {
      setDisplayedSignature((prev) => {
        let nextStr = '';
        for (let i = 0; i < target.length; i++) {
          if (i < currentIteration) {
            nextStr += target[i];
          } else {
            nextStr += chars[Math.floor(Math.random() * chars.length)];
          }
        }
        return nextStr;
      });
      
      currentIteration++;
      if (currentIteration > maxIterations) {
        clearInterval(interval);
        setDisplayedSignature(target);
      }
    }, 25); // Faster, highly responsive dynamic scrambling effect (~800ms)

    return () => clearInterval(interval);
  }, [selectedLoginRole]);

  // Global State modification handlers to preserve horizontal loop integrity with RBAC backend validation
  const handleCreateOrder = (order: AutomatedOrder) => {
    if (!validateBackendPermission('ROL_CEO', 'Crear Orden de Interdicción (OOA)', order.coordinates)) return;
    setActiveOrders(prev => [order, ...prev]);
    // Mark the source actionable intelligence as "order issued"
    if (order.intelId !== 'manual') {
      setActionableIntel(prev => 
        prev.map(intel => intel.id === order.intelId ? { ...intel, status: 'ORDER_ISSUED' } : intel)
      );
    }
    sendWsMessage('CREATE_ORDER', { order });
  };

  const handleCancelOrder = (id: string) => {
    const orderObj = activeOrders.find(o => o.id === id);
    const coords = orderObj ? orderObj.coordinates : '19°13\'10"S 68°35\'50"W';
    if (!validateBackendPermission('ROL_CEO', 'Abortar / Cancelar Operación Militar', coords)) return;
    const updateMsg = 'Operación abortada por orden superior de Mando Estratégico.';
    setActiveOrders(prev => 
      prev.map(order => order.id === id ? { ...order, status: 'CANCELLED', updates: [...order.updates, updateMsg] } : order)
    );
    sendWsMessage('CANCEL_ORDER', { id, updateMsg });
  };

  const handleArchiveIntel = (id: string) => {
    const intelObj = actionableIntel.find(i => i.id === id);
    const coords = intelObj ? intelObj.coordinates : '19°13\'10"S 68°35\'50"W';
    if (!validateBackendPermission('ROL_CEO', 'Archivar Reporte de Inteligencia', coords)) return;
    setActionableIntel(prev =>
      prev.map(intel => intel.id === id ? { ...intel, status: 'ARCHIVED' as any } : intel)
    );
    sendWsMessage('ARCHIVE_INTEL', { id });
  };

  const handlePromoteToIntel = (
    intel: ActionableIntel,
    updatedReliability?: 'A' | 'B' | 'C' | 'D',
    updatedCertainty?: '1' | '2' | '3' | '4',
    routeId?: string
  ) => {
    if (!validateBackendPermission('ROL_FUSION', 'Validar e Integrar Reporte (Promoción a Inteligencia)', intel.coordinates)) return;
    setActionableIntel(prev => [intel, ...prev]);
    // Set corresponding raw alert status to PROCESSED and apply assigned analytical attributes
    setRawAlerts(prev =>
      prev.map(alert =>
        alert.id === intel.rawAlertId
          ? {
              ...alert,
              status: 'PROCESSED',
              reliability: updatedReliability || alert.reliability,
              certainty: updatedCertainty || alert.certainty,
              clandestineRouteId: routeId || alert.clandestineRouteId
            }
          : alert
      )
    );
    
    // Set state to trigger the tactical validation pop-up alert window
    setValidatedReportAlert({
      ...intel,
      // Carry reliability & certainty details for complete metadata rendering in pop-up
      reliability: updatedReliability,
      certainty: updatedCertainty
    } as any);

    // Play crisp military confirmation sound
    playValidationSound();

    sendWsMessage('PROMOTE_TO_INTEL', { intel, updatedReliability, updatedCertainty, routeId });
  };

  const handleUpdateAlertStatus = (id: string, status: 'PROCESSED' | 'DISMISSED') => {
    const alertObj = rawAlerts.find(a => a.id === id);
    const coords = alertObj ? alertObj.coordinates : '19°13\'10"S 68°35\'50"W';
    if (!validateBackendPermission('ROL_FUSION', `Modificar Estado de Alerta a: ${status}`, coords)) return;
    setRawAlerts(prev =>
      prev.map(alert => alert.id === id ? { ...alert, status } : alert)
    );
    sendWsMessage('UPDATE_ALERT_STATUS', { id, status });
  };

  const handleConfirmOrder = (id: string, newStatus: 'RECEIVED' | 'IN_PROGRESS' | 'COMPLETED') => {
    const orderObj = activeOrders.find(o => o.id === id);
    const coords = orderObj ? orderObj.coordinates : '19°13\'10"S 68°35\'50"W';
    
    // In ground operations, the patrol on terrain modifies the operational state
    if (!validateBackendPermission('ROL_PATRULLA', `Confirmar Estado de Operación: ${newStatus}`, coords)) return;

    let statusText = '';
    if (newStatus === 'RECEIVED') statusText = 'Confirmada recepción de la OOA en terminal de terreno.';
    if (newStatus === 'IN_PROGRESS') statusText = 'Despliegue operativo iniciado en el sector designado.';
    if (newStatus === 'COMPLETED') statusText = 'Misión completada. Contrabando interceptado con éxito.';

    setActiveOrders(prev =>
      prev.map(order => {
        if (order.id === id) {
          return {
            ...order,
            status: newStatus,
            updates: [...order.updates, statusText]
          };
        }
        return order;
      })
    );

    let unitName = '';
    let unitStatus: any = null;

    // If the order was completed, transition the assigned unit to stationary
    if (newStatus === 'COMPLETED') {
      const orderObj = activeOrders.find(o => o.id === id);
      if (orderObj) {
        unitName = orderObj.assignedUnit;
        unitStatus = 'STATIONARY';
        setTacticalUnits(prev =>
          prev.map(unit => unit.name === orderObj.assignedUnit ? { ...unit, status: 'STATIONARY', lastReportTime: 'Hace un momento' } : unit)
        );
      }
    } else if (newStatus === 'IN_PROGRESS') {
      const orderObj = activeOrders.find(o => o.id === id);
      if (orderObj) {
        unitName = orderObj.assignedUnit;
        unitStatus = 'INTERCEPTING';
        setTacticalUnits(prev =>
          prev.map(unit => unit.name === orderObj.assignedUnit ? { ...unit, status: 'INTERCEPTING', lastReportTime: 'Hace un momento' } : unit)
        );
      }
    }

    sendWsMessage('CONFIRM_ORDER', { id, newStatus, statusText, unitName, unitStatus });
  };

  const handleAppendOrderUpdate = (orderId: string, updateMsg: string) => {
    setActiveOrders(prev =>
      prev.map(order => order.id === orderId ? { ...order, updates: [...order.updates, updateMsg] } : order)
    );
    sendWsMessage('ORDER_UPDATE', { orderId, updateMsg });
  };

  const handleAddExpediente = (newExp: G2RegistryRecord) => {
    setExpedientes(prev => {
      const updated = [newExp, ...prev.filter(e => e.id !== newExp.id)];
      try {
        safeStorage.setItem('pii_lcc_expedientes', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to persist expedientes:', e);
      }
      return updated;
    });

    // Record audit log
    const logEntry: AuditLogEntry = {
      id: `log-exp-${Date.now()}`,
      userId: user ? user.name : 'ANALISTA LCC',
      role: currentRole,
      action: `Implementación de Expediente ${newExp.id} (${newExp.componenteRubro}) desde Órgano de Búsqueda S-2`,
      timestamp: new Date().toISOString(),
      coordinates: newExp.especificoGrafico?.coordenadasCuadricula || '19°13\'10"S 68°35\'50"W'
    };
    setAuditLogs(prev => [logEntry, ...prev]);
  };

  const handleSendFieldReport = (report: RawAlert) => {
    if (!validateBackendPermission('ROL_PATRULLA', 'Enviar Registro de Búsqueda de Campo (S-2)', report.coordinates)) return;
    setRawAlerts(prev => [report, ...prev]);
    sendWsMessage('SEND_FIELD_REPORT', { report });
  };

  const handleUpdateUnitCoordinates = (unitName: string, newCoords: string) => {
    if (!validateBackendPermission('ROL_PATRULLA', `Actualizar Posición GPS de la Unidad: ${unitName}`, newCoords)) return;
    setTacticalUnits(prev =>
      prev.map(unit => unit.name === unitName ? { ...unit, coordinates: newCoords, lastReportTime: 'Hace un momento' } : unit)
    );
    sendWsMessage('UPDATE_UNIT_COORDINATES', { unitName, newCoords });
  };

  const handleSetRoleAttempt = (role: MilitaryRole) => {
    login(role);
  };

  const downloadJSONDatabase = () => {
    const dateStr = new Date().toISOString();
    const exportPackage = {
      metadata: {
        platform: "PII-LCC",
        exportTimestamp: dateStr,
        version: appVersion,
        commander: currentRole === 'ROL_CEO' ? 'GRAL. E. MARTÍNEZ' :
                   currentRole === 'ROL_FUSION' ? 'TTE. CNEL. S. ROJAS' :
                   'EQUIPOS DE BÚSQUEDA S-2',
        role: currentRole
      },
      expedientes,
      rawAlerts,
      clans,
      actionableIntel,
      activeOrders,
      tacticalUnits,
      auditLogs
    };

    const blob = new Blob([JSON.stringify(exportPackage, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `PII-LCC_Database_Backup_${dateStr.substring(0, 10)}_${Date.now()}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    // Log to audit log
    const latestLog: AuditLogEntry = {
      id: `log-export-json-${Date.now()}`,
      userId: user ? user.name : 'SISTEMA',
      role: currentRole,
      action: `Exportación de paquete de base de datos militar PII-LCC (.json) realizada con éxito.`,
      timestamp: new Date().toISOString(),
      coordinates: '19°13\'10"S 68°35\'50"W'
    };
    setAuditLogs(prev => [latestLog, ...prev]);
    sendWsMessage('LOG_AUDIT_ACTION', { logEntry: latestLog });
  };

  const downloadMarkdownReport = () => {
    const dateStr = new Date().toISOString();
    const operatorName =
      currentRole === 'ROL_CEO' ? 'GRAL. E. MARTÍNEZ' :
      currentRole === 'ROL_FUSION' ? 'TTE. CNEL. S. ROJAS' :
      'EQUIPOS DE BÚSQUEDA S-2';
    const roleName =
      currentRole === 'ROL_CEO' ? 'COMANDO ESTRATÉGICO (ROL_CEO)' :
      currentRole === 'ROL_FUSION' ? 'ANALISTA DE FUSIÓN (ROL_FUSION)' :
      'ÓRGANO DE BÚSQUEDA (ROL_PATRULLA)';

    let report = `================================================================================
PII-LCC // SISTEMA DE SEGURIDAD CAD-C2 // CLASIFICACIÓN: RESERVADO - SECRETO
================================================================================
INFORME DE SITUACIÓN OPERATIVA Y DE INTELIGENCIA TÁCTICA DE FRONTERA

[INFORMACIÓN EXPORTADA DIRECTAMENTE DESDE EL TERMINAL DE CONTROL CENTRAL]

Sello Temporal UTC: ${dateStr}
Operador Responsable: ${operatorName}
Rango Operativo: ${roleName}
Versión de Doctrina: ${appVersion}
Estado del Enlace Central: NOMINAL (SINC_ACTIVE)

--------------------------------------------------------------------------------
1. RESUMEN EJECUTIVO DE SITUACIÓN
--------------------------------------------------------------------------------
* Expedientes Doctrinales PII-LCC Registrados: ${expedientes.length}
* Registros de Búsqueda de Campo (S-2) Totales: ${rawAlerts.length}
* Inteligencias de Fusión CFI Activas: ${actionableIntel.length}
* Órdenes de Operaciones Automatizadas (OOA): ${activeOrders.length}
* Unidades Tácticas Desplegadas en Terreno: ${tacticalUnits.length}

--------------------------------------------------------------------------------
2. EXPEDIENTES OPERATIVOS Y DOCTRINALES PII-LCC (${expedientes.length})
--------------------------------------------------------------------------------
`;

    expedientes.forEach((exp, idx) => {
      report += `\n[EXPEDIENTE #${idx + 1}] ID: ${exp.id} (${exp.componenteRubro} // ${exp.tipoRegistro})
 - Clasificación: ${exp.clasificacionSeguridad} // Calificación: ${exp.calificacionEvaluacion || 'A-1'}
 - Estado: ${exp.estadoRegistro}
 - Síntesis: ${exp.contenidoDetallado.slice(0, 180)}...
 - Ideas Fuerza: ${exp.evaluacion?.ideasFuerza ? exp.evaluacion.ideasFuerza.join(' | ') : 'N/A'}\n`;
    });

    report += `\n--------------------------------------------------------------------------------
3. DETALLE DE REGISTROS DE BÚSQUEDA DE CAMPO (S-2 RAW ALERTS)
--------------------------------------------------------------------------------
`;

    rawAlerts.forEach((alert, idx) => {
      report += `\n[ALERTA #${idx + 1}] ID: ${alert.id}
 - Fecha/Hora: ${alert.timestamp}
 - Origen: [${alert.sourceType}] ${alert.sourceName}
 - Fiabilidad Doctrinal: Rango ${alert.reliability} // Certeza: ${alert.certainty}
 - Ubicación (Coordenadas): ${alert.coordinates}
 - Estado de Análisis: ${alert.status}
 - Ruta Sospechosa: ${alert.clandestineRouteId || 'No asignada'}
 - Detalles de la Amenaza: ${alert.details}\n`;
    });

    report += `\n--------------------------------------------------------------------------------
3. ANÁLISIS DE CLANES DELICTIVOS FRONTERIZOS
--------------------------------------------------------------------------------
`;

    clans.forEach((clan) => {
      report += `\n* CLAN: ${clan.name} (Nivel de Amenaza: ${clan.threatLevel})
 - Rutas Conocidas: ${clan.knownRoutes.join(', ')}
 - Miembros Estimados: ~${clan.membersCount}
 - Tácticas Identificadas: ${clan.tactics}
 - Última Actividad Registrada: ${clan.lastActive}\n`;
    });

    report += `\n--------------------------------------------------------------------------------
4. INFORMES DE INTELIGENCIA DE ACCIÓN INMEDIATA (ACTIONABLE INTEL)
--------------------------------------------------------------------------------
`;

    actionableIntel.forEach((intel) => {
      report += `\n* INTEL: "${intel.title}" (Puntaje de Amenaza: ${intel.threatScore}/100)
 - ID: ${intel.id} // Alerta Origen: ${intel.rawAlertId}
 - Validado por: ${intel.validatedBy}
 - Clan Asociado: ${intel.targetClan}
 - Ubicación Crítica: ${intel.coordinates}
 - Estado: ${intel.status}
 - Acción Recomendada: ${intel.recommendedAction}\n`;
    });

    report += `\n--------------------------------------------------------------------------------
5. ÓRDENES DE OPERACIONES ACTIVAS EN TERRENO (ACTIVE OPERATIONAL ORDERS)
--------------------------------------------------------------------------------
`;

    activeOrders.forEach((order) => {
      report += `\n* ORDEN DE OPERACIÓN: ${order.codeName} (ID: ${order.id})
 - Objetivo: ${order.objective}
 - Unidad Asignada: ${order.assignedUnit}
 - Área de Despliegue: ${order.coordinates}
 - Estado Actual: ${order.status}
 - Autorizador Militar: ${order.issuer}
 - Historial de Actualizaciones de Operación:
${order.updates.map((update, i) => `   [${i + 1}] ${update}`).join('\n')}\n`;
    });

    report += `\n--------------------------------------------------------------------------------
6. SITUACIÓN Y ESTADO DE LAS UNIDADES EN TERRENO (TACTICAL UNITS)
--------------------------------------------------------------------------------
`;

    tacticalUnits.forEach((unit) => {
      report += `\n* UNIDAD: ${unit.name} (ID: ${unit.id})
 - Estado Operacional: ${unit.status}
 - Coordenadas de Patrullaje: ${unit.coordinates}
 - Efectivos Activos: ${unit.personnel} hombres
 - Último Reporte Vital: ${unit.lastReportTime}\n`;
    });

    report += `\n--------------------------------------------------------------------------------
7. BITÁCORA DE AUDITORÍA Y SEGURIDAD CRIPTOGRÁFICA (CAD-C2 AUDIT LOGS)
--------------------------------------------------------------------------------
`;

    auditLogs.forEach((log) => {
      report += `[${log.timestamp}] [${log.role}] OPERADOR: ${log.userId} // UBICACIÓN: ${log.coordinates}
 ACCION: ${log.action}\n\n`;
    });

    report += `================================================================================
FIN DEL INFORME OFICIAL // ENLACE SEGURO DESLOGUEADO
SISTEMA DE SEGURIDAD CAD-C2 DE LÍNEA DE CONTROL CLANDESTINA
================================================================================`;

    const blob = new Blob([report], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `PII-LCC_Reporte_Tactico_${dateStr.substring(0, 10)}_${Date.now()}.md`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    // Log to audit log
    const latestLog: AuditLogEntry = {
      id: `log-export-md-${Date.now()}`,
      userId: user ? user.name : 'SISTEMA',
      role: currentRole,
      action: `Exportación de informe táctico oficial PII-LCC (.md) realizada con éxito.`,
      timestamp: new Date().toISOString(),
      coordinates: '19°13\'10"S 68°35\'50"W'
    };
    setAuditLogs(prev => [latestLog, ...prev]);
    sendWsMessage('LOG_AUDIT_ACTION', { logEntry: latestLog });
  };

  const downloadDesktopApp = () => {
    const link = document.createElement('a');
    link.setAttribute('href', '/api/download-app');
    link.setAttribute('download', 'PII-LCC_Programa_Escritorio.tar.gz');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Log to audit log
    const latestLog: AuditLogEntry = {
      id: `log-export-app-${Date.now()}`,
      userId: user ? user.name : 'SISTEMA',
      role: currentRole,
      action: `Descarga de paquete de instalación independiente de programa táctico PII-LCC (.tar.gz) iniciada con éxito.`,
      timestamp: new Date().toISOString(),
      coordinates: '19°13\'10"S 68°35\'50"W'
    };
    setAuditLogs(prev => [latestLog, ...prev]);
    sendWsMessage('LOG_AUDIT_ACTION', { logEntry: latestLog });
  };

  const downloadMobileApp = () => {
    const link = document.createElement('a');
    link.setAttribute('href', '/api/download-mobile');
    link.setAttribute('download', 'PII-LCC_Paquete_Movil_Tablet.tar.gz');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Log to audit log
    const latestLog: AuditLogEntry = {
      id: `log-export-mobile-${Date.now()}`,
      userId: user ? user.name : 'SISTEMA',
      role: currentRole,
      action: `Descarga de paquete de instalación autónoma móvil/tablets PII-LCC (.tar.gz) iniciada con éxito.`,
      timestamp: new Date().toISOString(),
      coordinates: '19°13\'10"S 68°35\'50"W'
    };
    setAuditLogs(prev => [latestLog, ...prev]);
    sendWsMessage('LOG_AUDIT_ACTION', { logEntry: latestLog });
  };

  // If operator has not authenticated into an organ terminal, display military login interface
  if (!isAuthenticated) {
    return (
      <MilitaryLoginView 
        onLoginSuccess={(role) => {
          handleSetRoleAttempt(role);
        }} 
      />
    );
  }

  return (
    <div className={`min-h-screen font-sans selection:bg-[#3b82f6]/30 selection:text-white relative overflow-x-hidden transition-colors duration-300 ${
      isNightModeActive 
        ? 'bg-[#000000] text-[#f4f4f5] tactical-night-mode tactical-high-contrast' 
        : 'bg-[#050505] text-[#e0e0e0]'
    } ${
      isNightModeActive && nightVisionFilter === 'NVG_PHOSPHOR' ? 'nvg-phosphor-mode' : ''
    } ${
      isNightModeActive && nightVisionFilter === 'RED_COMBAT' ? 'red-combat-mode' : ''
    }`}>

      {/* Full Dashboard Background: CEO-LCC MÓDULO 3: INTERFAZ DE MANDO (DASHBOARD 2) at 80% contrast */}
      <FullDashboardBackground 
        settings={fullBgState.settings} 
        imageSrc={fullBgState.activeImageSrc} 
      />

      {/* Tactical Grid Overlay Background */}
      <div className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${
        isNightModeActive 
          ? 'bg-[linear-gradient(rgba(255,255,255,0.003)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.003)_1px,transparent_1px)] bg-[size:32px_32px] opacity-40' 
          : 'bg-[linear-gradient(rgba(255,255,255,0.006)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.006)_1px,transparent_1px)] bg-[size:32px_32px]'
      }`} />

      {/* Top Banner HUD Header */}
      <header className={`h-16 border-b flex items-center sticky top-0 z-50 shrink-0 transition-colors duration-300 ${
        isNightModeActive ? 'border-zinc-900 bg-[#000000]' : 'border-[#1a1a1a] bg-[#0a0a0a]'
      }`}>
        <div className="w-full max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between">
          
          {/* Logo & Title */}
          <PIILCCLogo variant="header" size={48} />

          {/* Time, Night Mode & Status HUD Controls */}
          <div className="flex items-center gap-3 md:gap-5">
            
            {/* Operation Status */}
            <div className="hidden lg:flex flex-col items-end">
              <span className="text-[9px] text-[#666] uppercase leading-none">Estado de Operación</span>
              <span className={`text-[11px] font-mono mt-1 flex items-center gap-1.5 ${
                isNightModeActive ? 'text-emerald-400 font-bold' : 'text-[#10b981]'
              }`}>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                <span>SISTEMAS NOMINALES</span>
              </span>
            </div>
            
            <div className="hidden lg:block h-8 w-px bg-zinc-800/80"></div>

            {/* Tactical Local Clock & UTC Detection Widget */}
            <div className="flex items-center gap-2 bg-black/60 border border-zinc-800/90 hover:border-zinc-700 px-3 py-1.5 rounded-lg transition-all">
              <div className="flex flex-col text-left font-mono">
                <div className="flex items-center gap-1.5 text-[10px] leading-none">
                  {isLocalNight ? (
                    <span className="flex items-center gap-1 text-amber-400 font-bold" title="Hora nocturna detectada localmente (19:00 - 06:00)">
                      <Moon className="w-3 h-3 text-amber-400 fill-amber-400/20" />
                      <span>NOCHE LOCAL</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-amber-300 font-bold" title="Hora diurna detectada localmente">
                      <Sun className="w-3 h-3 text-amber-400" />
                      <span>DÍA LOCAL</span>
                    </span>
                  )}
                  <span className="text-zinc-600">|</span>
                  <span className="text-emerald-400 font-bold text-xs tracking-wider">
                    {localTime || '--:--:--'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] text-zinc-500 mt-1 leading-none">
                  <span className="text-zinc-400">{systemTime.split(' ')[1] || '--:--:--'} UTC</span>
                  <span className="text-zinc-600 font-sans hidden sm:inline">• {localDateStr}</span>
                </div>
              </div>

              <button
                onClick={fetchActualTime}
                disabled={isUpdatingTime}
                className="ml-1 p-1 text-zinc-500 hover:text-emerald-400 transition-colors rounded hover:bg-zinc-800/60 cursor-pointer"
                title="Sincronizar balizas de tiempo con el servidor"
              >
                <RefreshCw className={`w-3 h-3 ${isUpdatingTime ? 'animate-spin text-emerald-400' : ''}`} />
              </button>
            </div>

            {/* Full Dashboard Background (War Room 80%) Control */}
            <FullDashboardBackgroundControl 
              settings={fullBgState.settings}
              updateSettings={fullBgState.updateSettings}
              uploadDashboardImage={fullBgState.uploadDashboardImage}
              resetToDefault={fullBgState.resetToDefault}
            />

            {/* Videogame HUD Font Style Switcher */}
            <GamerFontSelector />

            {/* Tactical Night Mode (Alto Contraste) Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowNightSettings(!showNightSettings)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border font-mono text-xs transition-all cursor-pointer ${
                  isNightModeActive
                    ? 'bg-amber-950/25 border-amber-600/50 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                    : 'bg-zinc-950/70 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                }`}
                title="Ajustar Modo Nocturno de Alto Contraste y Reducción de Brillo"
              >
                {isNightModeActive ? (
                  <>
                    <Moon className="w-3.5 h-3.5 text-amber-400 fill-amber-400/30 animate-pulse" />
                    <div className="flex flex-col text-left leading-none">
                      <span className="text-[10px] font-bold text-amber-300">MODO NOCTURNO</span>
                      <span className="text-[8px] text-amber-400/80 uppercase">
                        {nightModeSetting === 'AUTO' ? 'AUTO (HORA LOCAL)' : 'FORZADO CAMPO'}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <Sun className="w-3.5 h-3.5 text-zinc-400" />
                    <div className="flex flex-col text-left leading-none">
                      <span className="text-[10px] font-bold text-zinc-300">MODO ESTÁNDAR</span>
                      <span className="text-[8px] text-zinc-500 uppercase">
                        {nightModeSetting === 'AUTO' ? 'AUTO (DÍA)' : 'ESTÁNDAR'}
                      </span>
                    </div>
                  </>
                )}
                <Sliders className="w-3 h-3 text-zinc-500 ml-0.5" />
              </button>

              {/* Night Mode Dropdown / Settings Panel */}
              {showNightSettings && (
                <div className="absolute right-0 top-11 mt-1 w-72 bg-black border border-zinc-800 rounded-xl shadow-2xl p-3.5 z-50 font-mono text-left space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                    <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                      <Moon className="w-3.5 h-3.5" />
                      <span className="uppercase tracking-wider text-[10px]">Modo Nocturno de Campo</span>
                    </div>
                    <span className="text-[9px] bg-zinc-900 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-800">
                      CAD-C2
                    </span>
                  </div>

                  <p className="text-[10px] text-zinc-400 font-sans leading-relaxed">
                    Reduce el brillo y destello en la pantalla, maximizando el contraste para preservar la visión nocturna en operaciones de campo.
                  </p>

                  <div className="space-y-1">
                    <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider block mb-1">
                      Comportamiento de Activación:
                    </span>
                    
                    {/* AUTO option */}
                    <button
                      onClick={() => setAndSaveNightMode('AUTO')}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-all cursor-pointer ${
                        nightModeSetting === 'AUTO'
                          ? 'bg-amber-950/30 text-amber-300 border border-amber-700/50'
                          : 'bg-zinc-950 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 border border-zinc-900'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <div className="text-left">
                          <span className="font-bold block text-[11px]">Automático por Hora Local</span>
                          <span className="text-[9px] text-zinc-500 font-sans block">
                            Activo 19:00 a 06:00 (Hora local: {localTime})
                          </span>
                        </div>
                      </div>
                      {nightModeSetting === 'AUTO' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                    </button>

                    {/* NIGHT forced option */}
                    <button
                      onClick={() => setAndSaveNightMode('NIGHT')}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-all cursor-pointer ${
                        nightModeSetting === 'NIGHT'
                          ? 'bg-amber-950/30 text-amber-300 border border-amber-700/50'
                          : 'bg-zinc-950 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 border border-zinc-900'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Moon className="w-3.5 h-3.5 text-amber-400" />
                        <div className="text-left">
                          <span className="font-bold block text-[11px]">Modo Nocturno Forzado</span>
                          <span className="text-[9px] text-zinc-500 font-sans block">
                            Siempre activo (Anti-destello total)
                          </span>
                        </div>
                      </div>
                      {nightModeSetting === 'NIGHT' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                    </button>

                    {/* STANDARD option */}
                    <button
                      onClick={() => setAndSaveNightMode('STANDARD')}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-all cursor-pointer ${
                        nightModeSetting === 'STANDARD'
                          ? 'bg-zinc-900 text-zinc-200 border border-zinc-700'
                          : 'bg-zinc-950 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 border border-zinc-900'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Sun className="w-3.5 h-3.5 text-zinc-400" />
                        <div className="text-left">
                          <span className="font-bold block text-[11px]">Modo Estándar</span>
                          <span className="text-[9px] text-zinc-500 font-sans block">
                            Tema oscuro táctico convencional
                          </span>
                        </div>
                      </div>
                      {nightModeSetting === 'STANDARD' && <Check className="w-3.5 h-3.5 text-zinc-300" />}
                    </button>
                  </div>

                  {/* Night Vision Spectrum Filter Options (when night mode is active) */}
                  {isNightModeActive && (
                    <div className="pt-2 border-t border-zinc-900 space-y-1.5">
                      <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider block">
                        Filtro Óptico de Espectro Táctico:
                      </span>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          onClick={() => setAndSaveNvgFilter('STEALTH_CONTRAST')}
                          className={`p-1.5 rounded text-[9px] text-center border font-bold transition-all cursor-pointer ${
                            nightVisionFilter === 'STEALTH_CONTRAST'
                              ? 'bg-zinc-800 text-white border-zinc-600 shadow-sm'
                              : 'bg-zinc-950 text-zinc-500 hover:text-zinc-300 border-zinc-900'
                          }`}
                        >
                          🌑 Sigilo
                        </button>
                        <button
                          onClick={() => setAndSaveNvgFilter('NVG_PHOSPHOR')}
                          className={`p-1.5 rounded text-[9px] text-center border font-bold transition-all cursor-pointer ${
                            nightVisionFilter === 'NVG_PHOSPHOR'
                              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-600 shadow-sm'
                              : 'bg-zinc-950 text-zinc-500 hover:text-zinc-300 border-zinc-900'
                          }`}
                        >
                          🟢 NVG Verde
                        </button>
                        <button
                          onClick={() => setAndSaveNvgFilter('RED_COMBAT')}
                          className={`p-1.5 rounded text-[9px] text-center border font-bold transition-all cursor-pointer ${
                            nightVisionFilter === 'RED_COMBAT'
                              ? 'bg-red-950/60 text-red-300 border-red-600 shadow-sm'
                              : 'bg-zinc-950 text-zinc-500 hover:text-zinc-300 border-zinc-900'
                          }`}
                        >
                          🔴 Luz Roja
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => setShowNightSettings(false)}
                    className="w-full py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded text-[10px] font-bold uppercase transition-all cursor-pointer text-center"
                  >
                    Cerrar Ajustes
                  </button>
                </div>
              )}
            </div>

            <div className="h-8 w-px bg-zinc-800/80"></div>

            {/* Top Right Transparent Image */}
            <HeaderTopRightLogo size={56} />
          </div>

        </div>
      </header>

      {/* Tactical Night Field Mode HUD Indicator Ribbon */}
      {isNightModeActive && (
        <div className="bg-black border-b border-amber-900/40 px-4 py-1.5 font-mono text-[10px] flex items-center justify-between text-amber-300 shadow-[inset_0_1px_0_rgba(245,158,11,0.1)] animate-fade-in">
          <div className="w-full max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
              <span className="font-bold tracking-wider text-amber-200">
                [MODO NOCTURNO TÁCTICO DE ALTO CONTRASTE ACTIVO]
              </span>
              <span className="text-zinc-600 hidden md:inline">|</span>
              <span className="text-zinc-400 hidden md:inline">
                Hora local: <strong className="text-white font-mono">{localTime}</strong> ({localTimezone})
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-[9px]">
              <span className="bg-amber-950/40 text-amber-400 border border-amber-800/40 px-2 py-0.5 rounded font-bold">
                LUMINISCENCIA: -85% ANTI-DESTELLO
              </span>
              <span className="bg-zinc-900 text-zinc-300 border border-zinc-800 px-2 py-0.5 rounded font-bold">
                ESPECTRO: {nightVisionFilter === 'STEALTH_CONTRAST' ? 'SIGILO NEGRO PURO' : nightVisionFilter === 'NVG_PHOSPHOR' ? 'NVG FÓSFORO VERDE' : 'LUZ ROJA DE COMBATE'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* System Workspace Header Bar (Role Selector & Profile Details) */}
      <div className="bg-[#080808] border-b border-[#1a1a1a]">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Identity HUD Card */}
          <div className="flex items-center gap-3 bg-[#0a0a0a] border border-[#1a1a1a] p-3 rounded-lg max-w-sm w-full md:w-80">
            <div className={`p-2.5 rounded ${
              currentRole === 'ROL_CEO' ? 'bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20' :
              currentRole === 'ROL_FUSION' ? 'bg-[#f97316]/10 text-[#f97316] border border-[#f97316]/20' :
              currentRole === 'ROL_BUSQUEDA' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
              'bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20'
            }`}>
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="text-left font-mono flex-1">
              <span className="text-[9px] text-[#666] uppercase block leading-none">Operador Militar Activo:</span>
              <span className="text-xs font-bold text-white block mt-0.5">
                {currentRole === 'ROL_CEO' && 'GRAL. E. MARTÍNEZ (CEO)'}
                {currentRole === 'ROL_FUSION' && 'TTE. CNEL. S. ROJAS (CFI)'}
                {currentRole === 'ROL_BUSQUEDA' && 'MY. R. VARGAS (S-2)'}
                {(currentRole === 'ROL_TERRENO' || currentRole === 'ROL_PATRULLA') && 'CB1. F. VALENZUELA (PATRULLA)'}
              </span>
              <span className="text-[9px] text-slate-500 flex items-center gap-1 mt-0.5">
                {currentRole === 'ROL_CEO' && '3. CEO-LCC MANDO'}
                {currentRole === 'ROL_FUSION' && '2. CFI DE BRIGADA'}
                {currentRole === 'ROL_BUSQUEDA' && '1. ÓRGANOS DE BÚSQUEDA'}
                {(currentRole === 'ROL_TERRENO' || currentRole === 'ROL_PATRULLA') && '4. UNIDADES DE TERRENO'}
              </span>
            </div>
            {isAuthenticated && (
              <div className="flex items-center gap-1.5 relative">
                <button
                  onClick={() => toggleInstalledDevice(!isInstalledDevice)}
                  className={`flex items-center justify-center p-2 rounded border transition-all cursor-pointer ${
                    isInstalledDevice 
                      ? 'bg-emerald-950/20 text-emerald-400 border-emerald-800/60 shadow-[0_0_10px_rgba(16,185,129,0.15)]' 
                      : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300 border-zinc-800'
                  }`}
                  title={isInstalledDevice ? "Terminal Móvil/Instalado: Enlace de Acceso Total Activado" : "Habilitar Acceso Completo Móvil/Instalado"}
                >
                  <Shield className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                  className={`flex items-center justify-center p-2 rounded border transition-colors cursor-pointer ${
                    showDownloadMenu 
                      ? 'bg-zinc-800 text-white border-zinc-700' 
                      : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white border-zinc-800'
                  }`}
                  title="Descargar Datos y Reportes PII-LCC"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                {showDownloadMenu && (
                  <div className="absolute right-0 top-10 mt-1 w-64 bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl p-2 z-50 font-mono text-left">
                    <div className="px-2 py-1.5 border-b border-zinc-900 text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
                      Descargas Disponibles (PII-LCC)
                    </div>
                    <button
                      onClick={() => {
                        downloadJSONDatabase();
                        setShowDownloadMenu(false);
                      }}
                      className="w-full text-left px-2 py-2 text-[11px] text-zinc-300 hover:bg-zinc-900 hover:text-white rounded flex items-center gap-2 transition-all cursor-pointer mt-1"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-500" />
                      <div>
                        <p className="font-bold leading-tight">Base de Datos (.json)</p>
                        <p className="text-[9px] text-zinc-500 font-normal">Paquete completo de telemetría</p>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        downloadMarkdownReport();
                        setShowDownloadMenu(false);
                      }}
                      className="w-full text-left px-2 py-2 text-[11px] text-zinc-300 hover:bg-zinc-900 hover:text-white rounded flex items-center gap-2 transition-all cursor-pointer mt-1"
                    >
                      <Download className="w-3.5 h-3.5 text-orange-500" />
                      <div>
                        <p className="font-bold leading-tight">Informe Táctico (.md)</p>
                        <p className="text-[9px] text-zinc-500 font-normal">Resumen doctrinal en Markdown</p>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        downloadDesktopApp();
                        setShowDownloadMenu(false);
                      }}
                      className="w-full text-left px-2 py-2 text-[11px] text-zinc-300 hover:bg-zinc-900 hover:text-white rounded flex items-center gap-2 transition-all cursor-pointer mt-1 border-t border-zinc-900 pt-2"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-500" />
                      <div>
                        <p className="font-bold leading-tight">Programa PC (.tar.gz)</p>
                        <p className="text-[9px] text-zinc-500 font-normal">Instalador local con lanzadores .bat/.sh</p>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        downloadMobileApp();
                        setShowDownloadMenu(false);
                      }}
                      className="w-full text-left px-2 py-2 text-[11px] text-zinc-300 hover:bg-zinc-900 hover:text-white rounded flex items-center gap-2 transition-all cursor-pointer mt-1 border-t border-zinc-900 pt-2"
                    >
                      <Download className="w-3.5 h-3.5 text-cyan-500" />
                      <div>
                        <p className="font-bold leading-tight">Programa Móvil/Tablet (.tar.gz)</p>
                        <p className="text-[9px] text-zinc-500 font-normal">PWA autónomo con sincronización táctica</p>
                      </div>
                    </button>
                  </div>
                )}
                
                <button
                  onClick={() => {
                    logout();
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded bg-red-950/20 text-red-400 hover:bg-red-900/30 hover:text-red-300 border border-red-900/30 transition-colors cursor-pointer text-xs font-mono font-bold"
                  title="Cerrar Sesión Segura y Salir al Terminal de Acceso (CAD-C2)"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Cerrar Sesión</span>
                </button>
              </div>
            )}
          </div>

          {/* Core Module Indicator (Exclusivo por Órgano Doctrinal Autenticado) */}
          <div className="flex bg-[#0a0a0a] border border-[#1a1a1a] p-1.5 rounded-lg self-start md:self-auto w-full md:w-auto items-center">
            {currentRole === 'ROL_BUSQUEDA' && (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded bg-yellow-500/10 border border-yellow-500/30 text-xs font-mono font-bold text-yellow-400">
                <Radio className="w-4 h-4 animate-pulse text-yellow-400" />
                <span className="text-[#888] font-normal uppercase text-[10px]">MÓDULO EXCLUSIVO:</span>
                <span className="text-white">1. ÓRGANOS DE BÚSQUEDA (S-2)</span>
                <span className="text-[9px] bg-yellow-950/70 text-yellow-300 px-2 py-0.5 rounded border border-yellow-800/40">ACTIVO</span>
              </div>
            )}

            {currentRole === 'ROL_FUSION' && (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded bg-[#f97316]/10 border border-[#f97316]/30 text-xs font-mono font-bold text-[#f97316]">
                <Shield className="w-4 h-4 text-[#f97316]" />
                <span className="text-[#888] font-normal uppercase text-[10px]">MÓDULO EXCLUSIVO:</span>
                <span className="text-white">2. CENTRAL DE FUSIÓN (CFI)</span>
                <span className="text-[9px] bg-orange-950/70 text-orange-300 px-2 py-0.5 rounded border border-orange-800/40">ACTIVO</span>
              </div>
            )}

            {currentRole === 'ROL_CEO' && (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded bg-[#3b82f6]/10 border border-[#3b82f6]/30 text-xs font-mono font-bold text-[#3b82f6]">
                <Zap className="w-4 h-4 text-[#3b82f6]" />
                <span className="text-[#888] font-normal uppercase text-[10px]">MÓDULO EXCLUSIVO:</span>
                <span className="text-white">3. MANDO ESTRATÉGICO (CEO-LCC)</span>
                <span className="text-[9px] bg-blue-950/70 text-blue-300 px-2 py-0.5 rounded border border-blue-800/40">ACTIVO</span>
              </div>
            )}

            {(currentRole === 'ROL_TERRENO' || currentRole === 'ROL_PATRULLA') && (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono font-bold text-emerald-400">
                <Navigation className="w-4 h-4 text-emerald-400" />
                <span className="text-[#888] font-normal uppercase text-[10px]">MÓDULO EXCLUSIVO:</span>
                <span className="text-white">4. UNIDADES DE TERRENO (PATRULLAS)</span>
                <span className="text-[9px] bg-emerald-950/70 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800/40">ACTIVO</span>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Main Container Workspace */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-8 relative">

        {securityError && (
          <div className="bg-red-950/40 border border-red-500/30 text-red-400 p-4 rounded-lg flex items-center gap-3 font-mono text-xs animate-pulse">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <div className="text-left">
              <span className="font-bold text-red-200">ALERTA DE SEGURIDAD CAD-C2:</span> {securityError}
            </div>
          </div>
        )}


          <ErrorBoundary>
            {/* Horizontal flow simulation HUD always visible at the top */}
            <HorizontalFlowSimulator 
              rawAlerts={rawAlerts}
              actionableIntel={actionableIntel}
              activeOrders={activeOrders}
              tacticalUnits={tacticalUnits}
              currentRole={currentRole}
              onSetRole={handleSetRoleAttempt}
            />

            {/* Workspace Interactive Navigation Tabs */}
            <div className="flex border-b border-zinc-900 mb-6 mt-4 gap-6 font-mono text-xs overflow-x-auto whitespace-nowrap scrollbar-none">
              <button
                onClick={() => setActiveWorkspaceTab('OPERATIONS')}
                className={`pb-3 relative font-bold uppercase transition-all tracking-wider flex items-center gap-2 cursor-pointer ${
                  activeWorkspaceTab === 'OPERATIONS'
                    ? 'text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Terminal className="w-4 h-4" />
                <span>Consola de Operaciones</span>
                {activeWorkspaceTab === 'OPERATIONS' && (
                  <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#f97316]" />
                )}
              </button>
              <button
                onClick={() => setActiveWorkspaceTab('ARCHITECTURE')}
                className={`pb-3 relative font-bold uppercase transition-all tracking-wider flex items-center gap-2 cursor-pointer ${
                  activeWorkspaceTab === 'ARCHITECTURE'
                    ? 'text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Layers className="w-4 h-4 text-[#f97316]" />
                <span>Arquitectura de Sistemas (PII-LCC)</span>
                {activeWorkspaceTab === 'ARCHITECTURE' && (
                  <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#f97316]" />
                )}
              </button>
              <button
                onClick={() => setActiveWorkspaceTab('P2P_MESH')}
                className={`pb-3 relative font-bold uppercase transition-all tracking-wider flex items-center gap-2 cursor-pointer ${
                  activeWorkspaceTab === 'P2P_MESH'
                    ? 'text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Radio className="w-4 h-4 text-[#10b981] animate-pulse" />
                <span>Malla Descentrada P2P (S-6)</span>
                {activeWorkspaceTab === 'P2P_MESH' && (
                  <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#10b981]" />
                )}
              </button>
              <button
                onClick={() => setActiveWorkspaceTab('CODE_VIEWER')}
                className={`pb-3 relative font-bold uppercase transition-all tracking-wider flex items-center gap-2 cursor-pointer ${
                  activeWorkspaceTab === 'CODE_VIEWER'
                    ? 'text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Code className="w-4 h-4 text-[#3b82f6]" />
                <span>Código Fuente (LCC)</span>
                {activeWorkspaceTab === 'CODE_VIEWER' && (
                  <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#3b82f6]" />
                )}
              </button>
            </div>

            {activeWorkspaceTab === 'OPERATIONS' && (
              <ErrorBoundary>
                {/* Active Role Dashboard View */}
                <div className="animate-fade-in">
                  {currentRole === 'ROL_CEO' && (
                    <StrategicView 
                      activeOrders={activeOrders}
                      clans={clans}
                      actionableIntel={actionableIntel}
                      tacticalUnits={tacticalUnits}
                      onCreateOrder={handleCreateOrder}
                      onCancelOrder={handleCancelOrder}
                      onArchiveIntel={handleArchiveIntel}
                      rawAlerts={rawAlerts}
                      expedientes={expedientes}
                    />
                  )}

                  {currentRole === 'ROL_FUSION' && (
                    <OperationalView 
                      rawAlerts={rawAlerts}
                      clans={clans}
                      actionableIntel={actionableIntel}
                      expedientes={expedientes}
                      onAddExpediente={handleAddExpediente}
                      onPromoteToIntel={handlePromoteToIntel}
                      onUpdateAlertStatus={handleUpdateAlertStatus}
                      onSimulateRawAlert={(alert) => {
                        setRawAlerts(prev => [alert, ...prev]);
                        sendWsMessage('SEND_FIELD_REPORT', { report: alert });
                      }}
                    />
                  )}

                  {(currentRole === 'ROL_BUSQUEDA' || currentRole === 'ROL_TERRENO' || currentRole === 'ROL_PATRULLA') && (
                    <TacticalView 
                      activeOrders={activeOrders}
                      tacticalUnits={tacticalUnits}
                      currentRole={currentRole}
                      onConfirmOrder={handleConfirmOrder}
                      onSendFieldReport={handleSendFieldReport}
                      onUpdateUnitCoordinates={handleUpdateUnitCoordinates}
                    />
                  )}
                </div>

                {/* Dynamic Joint Route Analysis Custom Chart Maker (Required) */}
                <InteractiveChartCreator 
                  initialData={initialChartData} 
                  tacticalUnits={tacticalUnits}
                  activeOrders={activeOrders}
                  rawAlerts={rawAlerts}
                  onConfirmOrder={handleConfirmOrder}
                  onAddOrderUpdate={handleAppendOrderUpdate}
                  onCreateOrder={handleCreateOrder}
                />
              </ErrorBoundary>
            )}

            {activeWorkspaceTab === 'ARCHITECTURE' && (
              <ErrorBoundary>
                <div className="animate-fade-in mb-8">
                  <SystemArchitectureDiagram 
                    appVersion={appVersion}
                    sendWsMessage={sendWsMessage}
                  />
                </div>
              </ErrorBoundary>
            )}

            {activeWorkspaceTab === 'P2P_MESH' && (
              <ErrorBoundary>
                <div className="animate-fade-in mb-8">
                  <TacticalP2PMesh 
                    user={user}
                    sendWsMessage={sendWsMessage}
                    rawAlerts={rawAlerts}
                    onAddP2PAlert={(newAlert) => {
                      setRawAlerts(prev => {
                        if (prev.some(a => a.id === newAlert.id)) return prev;
                        return [newAlert, ...prev];
                      });
                    }}
                  />
                </div>
              </ErrorBoundary>
            )}

            {activeWorkspaceTab === 'CODE_VIEWER' && (
              <ErrorBoundary>
                <div className="animate-fade-in mb-8">
                  <CodeViewer />
                </div>
              </ErrorBoundary>
            )}

            {/* Real-time Audit Trail Terminal */}
            <div className="bg-[#0b0c10] border border-[#1a1c23] rounded-xl p-5 font-mono shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-[#3b82f6]/40" />
              <div className="flex items-center justify-between border-b border-[#1a1c23] pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[#3b82f6] animate-pulse" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    REGISTRO DE AUDITORÍA DE INTRUSIONES Y ACCIONES INMUTABLES (CAD-C2)
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] bg-red-950/40 text-red-400 border border-red-900/30 px-2 py-0.5 rounded font-bold uppercase animate-pulse">
                    SEGURIDAD DE LA RED: ACTIVA
                  </span>
                </div>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-2 custom-scrollbar text-left text-[11px] leading-relaxed">
                {auditLogs.length === 0 ? (
                  <div className="text-zinc-600 italic py-2">
                    [SISTEMA] Ninguna acción registrada en esta sesión táctica. Todos los perímetros estables.
                  </div>
                ) : (
                  auditLogs.slice().reverse().map((log) => (
                    <div 
                      key={log.id} 
                      className={`py-1 border-b border-zinc-900/40 flex flex-col md:flex-row md:items-center justify-between gap-2 ${
                        log.action.includes('RECHAZADO') || log.action.includes('INTRUSIÓN') || log.action.includes('DENEGADO')
                          ? 'text-red-400 bg-red-950/10 px-2 rounded border-l-2 border-red-500'
                          : 'text-zinc-400'
                      }`}
                    >
                      <div className="flex items-start md:items-center gap-2 flex-wrap">
                        <span className="text-[#3b82f6] shrink-0 font-bold">[{log.timestamp}]</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          log.role === 'ROL_CEO' ? 'bg-[#3b82f6]/10 text-[#3b82f6]' :
                          log.role === 'ROL_FUSION' ? 'bg-[#f97316]/10 text-[#f97316]' :
                          'bg-[#10b981]/10 text-[#10b981]'
                        }`}>
                          {log.role}
                        </span>
                        <span className="text-white font-semibold">[{log.userId}]</span>
                        <span className="font-sans">{log.action}</span>
                      </div>
                      <div className="text-[9px] text-zinc-500 font-mono shrink-0">
                        GPS: {log.coordinates}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </ErrorBoundary>

      </main>

      {/* Footer Bar */}
      <footer className="h-12 border-t border-[#1a1a1a] bg-[#0a0a0a] px-6 flex items-center justify-between shrink-0 text-xs font-mono">
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex gap-4">
            <span className="text-[9px] text-[#444] font-mono uppercase">Coord: 14.234 - 98.441</span>
            <span className="text-[9px] text-[#444] font-mono uppercase">Enc: AES-256V2</span>
          </div>
          <div className="flex gap-4">
            <span className="text-[9px] text-[#3b82f6] font-mono uppercase">LCC-INTERNAL-NET</span>
            <span className="text-[9px] text-[#666] font-mono uppercase">2026.07.17 T 18:55:47 Z</span>
          </div>
        </div>
      </footer>

      {/* FULL-SCREEN SECURE AUTOMATED OTA ACTUALIZATION OVERLAY */}
      {updateInProgress && (
        <div className="fixed inset-0 bg-[#030303]/95 backdrop-blur-md z-[9999] flex flex-col items-center justify-center p-6 select-none font-mono">
          <div className="absolute inset-0 bg-[radial-gradient(rgba(59,130,246,0.035)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
          
          <div className="max-w-xl w-full bg-[#0a0b10] border border-[#3b82f6]/30 rounded-xl p-8 shadow-2xl relative overflow-hidden text-left space-y-6">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#3b82f6] via-[#10b981] to-[#f97316]" />
            
            {/* Header */}
            <div className="flex items-center gap-4 border-b border-[#1a1d29] pb-4">
              <div className="p-3 bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20 rounded-lg animate-pulse">
                <RefreshCw className="w-6 h-6 animate-spin" style={{ animationDuration: '4s' }} />
              </div>
              <div>
                <span className="text-[9px] bg-red-950/50 text-red-400 border border-red-900/30 px-2 py-0.5 rounded font-bold uppercase animate-pulse">
                  ALERTA DE PARCHE DOCTRINAL (OTA)
                </span>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider mt-1.5">
                  Actualización Automática de Doctrina y Sistemas
                </h2>
                <p className="text-[10px] text-[#3b82f6] uppercase tracking-widest mt-0.5">
                  ACTUALIZANDO TERMINAL ACTIVO: {appVersion} → {newVersionToInstall}
                </p>
              </div>
            </div>

            {/* Changelog details */}
            <div className="bg-black/60 border border-zinc-900 rounded p-4 space-y-2">
              <span className="text-[9px] text-[#666] uppercase block">MEJORAS DETECTADAS EN EL REPOSITORIO CENTRAL:</span>
              <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                {updateChangelog}
              </p>
            </div>

            {/* Progress segment */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#3b82f6] font-bold uppercase animate-pulse">
                  {updatePhase}
                </span>
                <span className="text-white font-bold">{updateProgress}%</span>
              </div>
              
              <div className="h-2 bg-zinc-950 rounded overflow-hidden border border-zinc-900">
                <div 
                  className="h-full bg-gradient-to-r from-[#3b82f6] to-[#10b981] transition-all duration-150"
                  style={{ width: `${updateProgress}%` }}
                />
              </div>
            </div>

            {/* Safety instructions */}
            <div className="flex items-start gap-3 text-[10px] text-zinc-500 bg-zinc-950/40 p-3 rounded border border-zinc-900/50 leading-relaxed">
              <AlertTriangle className="w-4 h-4 text-[#f97316] shrink-0" />
              <div>
                <span className="text-zinc-400 font-bold block mb-0.5 uppercase">ADVERTENCIA DE SEGURIDAD CAD-C2:</span>
                No apague el dispositivo ni interrumpa el enlace satelital. El terminal se reiniciará automáticamente una vez aplicadas las optimizaciones doctrinales.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RE-ESTABLISHMENT AND PATCH APPLIED BANNER */}
      {justUpdatedToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[1000] max-w-xl w-full px-4 animate-bounce">
          <div className="bg-[#0b1311] border border-[#10b981]/40 text-[#10b981] p-4 rounded-xl shadow-2xl relative overflow-hidden flex items-center gap-3 font-mono text-xs">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-[#10b981]" />
            <div className="p-2 bg-[#10b981]/10 rounded border border-[#10b981]/20 shrink-0 text-[#10b981]">
              <Shield className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                SISTEMA ACTUALIZADO CON ÉXITO <span className="text-[9px] bg-[#10b981]/10 px-1.5 py-0.5 rounded border border-[#10b981]/20 font-bold">{appVersion}</span>
              </div>
              <p className="text-[11px] text-zinc-400 font-sans mt-1">
                Se han aplicado e instalado de forma automática todas las mejoras de doctrina, seguridad y rendimiento en este dispositivo. Enlace multipunto nominal.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Floating Tactical Notifications System (EN TODOS LOS NIVELES) */}
      <div className="fixed bottom-6 right-6 z-[1001] max-w-sm w-full space-y-3 pointer-events-none">
        {notifications.map(notif => {
          const { id, alert } = notif;
          return (
            <div
              key={id}
              className="bg-[#0b0c10]/95 backdrop-blur-md border border-red-500/40 text-white rounded-lg shadow-2xl p-4 pointer-events-auto relative overflow-hidden flex flex-col gap-2 font-mono text-xs animate-fade-in border-l-4 border-l-red-500"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <div className="flex items-center gap-1.5 text-red-400 font-bold">
                  <Bell className="w-3.5 h-3.5 animate-pulse" />
                  <span className="uppercase tracking-wider text-[10px]">¡NUEVO REGISTRO TÁCTICO!</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-zinc-500 bg-zinc-900 px-1 py-0.5 rounded">
                    {alert.sourceType}
                  </span>
                  <button
                    onClick={() => setNotifications(prev => prev.filter(n => n.id !== id))}
                    className="text-zinc-500 hover:text-white transition-colors text-[10px] ml-1 p-0.5"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="text-left space-y-1">
                <div className="text-zinc-300 font-sans text-xs line-clamp-3">
                  {alert.details}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] text-zinc-500 pt-1">
                  <span>📍 {alert.coordinates}</span>
                  <span>📡 {alert.sourceName}</span>
                </div>
              </div>

              {alert.mediaUrl && (
                <div className="rounded overflow-hidden border border-zinc-800 bg-black/50 aspect-video relative flex items-center justify-center max-h-[110px] mt-1">
                  {alert.mediaUrl.startsWith('data:') ? (
                    <img
                      src={alert.mediaUrl}
                      alt="Archivo adjunto"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="text-[9px] text-[#f97316] font-bold uppercase animate-pulse">
                      📸 FOTOGRAFÍA ({alert.mediaUrl.replace('multimedia-', '')})
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-900">
                <span className="text-[8px] text-zinc-600">
                  {new Date(alert.timestamp).toLocaleTimeString()} UTC
                </span>
                <button
                  onClick={() => {
                    // Force navigation to Operations tab so they can see it instantly
                    setActiveWorkspaceTab('OPERATIONS');
                    // Dismiss the toast
                    setNotifications(prev => prev.filter(n => n.id !== id));
                  }}
                  className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 font-bold text-[9px] px-2 py-1 rounded transition-all active:scale-95 cursor-pointer uppercase"
                >
                  Ver Detalles
                </button>
              </div>
            </div>
          );
        })}

        {/* Global Notifications sound controls if there are active notifications */}
        {notifications.length > 0 && (
          <div className="flex justify-end pointer-events-auto">
            <button
              onClick={() => setNotificationsSoundEnabled(!notificationsSoundEnabled)}
              className="bg-black/80 border border-zinc-800 text-zinc-400 hover:text-white flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-mono transition-all pointer-events-auto cursor-pointer"
            >
              {notificationsSoundEnabled ? (
                <>
                  <Volume2 className="w-3 h-3 text-[#10b981]" />
                  <span>Sonido Activado</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3 h-3 text-[#f43f5e]" />
                  <span>Sonido Silenciado</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* VENTANA DE ALERTA DE VALIDACIÓN - CÉLULA DE FUSIÓN (CFI) */}
      {validatedReportAlert && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in font-mono text-xs">
          <div className="bg-[#070708] border-2 border-[#10b981]/50 rounded-2xl w-full max-w-xl shadow-[0_0_50px_rgba(16,185,129,0.25)] relative overflow-hidden flex flex-col">
            
            {/* Animated neon scan-line */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#10b981] to-transparent animate-pulse" />
            <div className="absolute top-0 bottom-0 left-0 right-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.03),transparent)] pointer-events-none" />

            {/* Modal Header */}
            <div className="bg-gradient-to-b from-[#10b981]/15 to-transparent p-5 border-b border-zinc-900/80 flex items-start gap-4">
              <div className="p-2.5 bg-[#10b981]/15 rounded-xl border border-[#10b981]/30 shrink-0 text-[#10b981] animate-bounce">
                <Shield className="w-5 h-5" />
              </div>
              <div className="text-left space-y-1">
                <div className="text-[10px] bg-[#10b981]/15 text-[#10b981] px-2 py-0.5 rounded-full font-black uppercase tracking-widest inline-block border border-[#10b981]/20 animate-pulse">
                  REPORTE VALIDADO - CFI
                </div>
                <h2 className="text-sm font-black text-white uppercase tracking-wider">
                  Integración Exitosa de Inteligencia Accionable
                </h2>
                <p className="text-[11px] text-zinc-400 font-sans">
                  El analista ha verificado los datos y promovido el reporte al sistema táctico CAD-C2.
                </p>
              </div>
            </div>

            {/* Modal Body / Information Grid */}
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="bg-zinc-950/80 border border-zinc-900 rounded-xl p-4 space-y-3.5 relative overflow-hidden">
                <div className="absolute top-0 right-0 text-[32px] font-black text-zinc-900/30 select-none pr-3 pt-1">
                  CFI-2
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] text-zinc-500 uppercase block tracking-wider">ID de Inteligencia</span>
                    <span className="text-zinc-200 font-bold block mt-0.5">{validatedReportAlert.id}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-500 uppercase block tracking-wider">Referencia Alerta Base</span>
                    <span className="text-zinc-300 font-bold block mt-0.5">{validatedReportAlert.rawAlertId}</span>
                  </div>
                </div>

                <div className="border-t border-zinc-900/60 pt-3">
                  <span className="text-[9px] text-zinc-500 uppercase block tracking-wider">Título del Reporte Validado</span>
                  <p className="text-white font-bold text-xs mt-0.5 leading-snug">{validatedReportAlert.title}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-zinc-900/60 pt-3">
                  <div>
                    <span className="text-[9px] text-zinc-500 uppercase block tracking-wider">Fiabilidad de Fuente (CFI)</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/25 font-black text-[10px] px-1.5 py-0.5 rounded">
                        {(validatedReportAlert as any).reliability || 'A'}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-sans">Confirmada</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-500 uppercase block tracking-wider">Nivel de Certeza Analítica</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/25 font-black text-[10px] px-1.5 py-0.5 rounded">
                        {(validatedReportAlert as any).certainty || '1'}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-sans">Óptima (100%)</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-zinc-900/60 pt-3">
                  <div>
                    <span className="text-[9px] text-zinc-500 uppercase block tracking-wider">Puntuación de Amenaza</span>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-16 h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                        <div 
                          className="h-full bg-gradient-to-r from-[#f97316] to-red-500"
                          style={{ width: `${validatedReportAlert.threatScore}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-[#f97316]">{validatedReportAlert.threatScore}%</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-500 uppercase block tracking-wider">Coordenadas de Operación</span>
                    <span className="text-[#3b82f6] font-bold block mt-0.5">📍 {validatedReportAlert.coordinates}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-zinc-900/60 pt-3">
                  <div>
                    <span className="text-[9px] text-zinc-500 uppercase block tracking-wider">Analista de Validación</span>
                    <span className="text-zinc-300 font-sans text-[11px] block mt-0.5">Tte. Coronel S. Rojas</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-500 uppercase block tracking-wider">Cripto-Firma Registrada</span>
                    <span className="text-emerald-500 font-mono text-[9px] block mt-0.5">SHA256_CFI_APPROVED_VAL</span>
                  </div>
                </div>
              </div>

              {/* Cryptographic Transmission Notice */}
              <div className="flex items-start gap-3 text-[10px] text-zinc-500 bg-[#10b981]/5 border border-[#10b981]/15 p-3 rounded-lg leading-relaxed">
                <Terminal className="w-4 h-4 text-[#10b981] shrink-0 animate-pulse mt-0.5" />
                <div>
                  <span className="text-[#10b981] font-bold uppercase block mb-0.5 text-[9px] tracking-wider">NOTIFICACIÓN OPERATIVA EN TIEMPO REAL:</span>
                  El reporte ha sido cifrado con éxito mediante llave multipunto y enviado inmediatamente al panel de operaciones del <strong className="text-white">Mando Estratégico (Nivel 3 - CEO-LCC)</strong> para autorizar la Orden de Operación Automatizada (OOA).
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-5 border-t border-zinc-900 bg-zinc-950/40 flex flex-col sm:flex-row gap-2.5">
              <button
                onClick={() => setValidatedReportAlert(null)}
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-black text-[10px] uppercase tracking-wider px-5 py-2.5 rounded-lg transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <Check className="w-3.5 h-3.5" />
                Confirmar Notificación // Transmitido a Mando Estratégico (CEO-LCC)
              </button>
            </div>

          </div>
        </div>
      )}



    </div>
  );
}
