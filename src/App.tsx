/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MilitaryRole, RawAlert, Clan, ActionableIntel, AutomatedOrder, TacticalUnit, User, AuditLogEntry } from './types';
import { 
  initialRawAlerts, 
  initialClans, 
  initialActionableIntel, 
  initialOrders, 
  initialTacticalUnits, 
  initialChartData 
} from './utils/mockData';

import HorizontalFlowSimulator from './components/HorizontalFlowSimulator';
import StrategicView from './components/StrategicView';
import OperationalView from './components/OperationalView';
import TacticalView from './components/TacticalView';
import InteractiveChartCreator from './components/InteractiveChartCreator';
import SystemArchitectureDiagram from './components/SystemArchitectureDiagram';
import TacticalP2PMesh from './components/TacticalP2PMesh';
import OfficialCrest from './components/OfficialCrest';
import PIILCCLogo from './components/PIILCCLogo';
import ErrorBoundary from './components/ErrorBoundary';
import CodeViewer from './components/CodeViewer';

import { Shield, Radio, Zap, Clock, User as UserIcon, AlertCircle, Eye, Settings, HelpCircle, FileText, Lock, Unlock, LogOut, Key, AlertTriangle, Terminal, Layers, RefreshCw, Bell, Volume2, VolumeX, Code, Download } from 'lucide-react';
import { useAuth, PRESET_USERS } from './context/AuthContext';

export default function App() {
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
  const [clans, setClans] = useState<Clan[]>(initialClans);
  const [actionableIntel, setActionableIntel] = useState<ActionableIntel[]>(initialActionableIntel);
  const [activeOrders, setActiveOrders] = useState<AutomatedOrder[]>(initialOrders);
  const [tacticalUnits, setTacticalUnits] = useState<TacticalUnit[]>(initialTacticalUnits);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'OPERATIONS' | 'ARCHITECTURE' | 'P2P_MESH' | 'CODE_VIEWER'>('OPERATIONS');
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  const [isInstalledDevice, setIsInstalledDevice] = useState<boolean>(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const hasTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    const saved = localStorage.getItem('pii_lcc_installed_mode');
    if (saved !== null) return saved === 'true';
    return isStandalone || isMobileDevice || hasTouch || true;
  });

  const toggleInstalledDevice = (val: boolean) => {
    setIsInstalledDevice(val);
    localStorage.setItem('pii_lcc_installed_mode', val ? 'true' : 'false');
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
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const playBeep = (freq: number, startTime: number, duration: number, type: 'sine' | 'triangle' = 'sine') => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.06, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      
      // Beautiful crisp 4-tone ascending military arpeggio
      playBeep(523.25, ctx.currentTime, 0.15); // C5
      playBeep(659.25, ctx.currentTime + 0.10, 0.15); // E5
      playBeep(783.99, ctx.currentTime + 0.20, 0.20); // G5
      playBeep(1046.50, ctx.currentTime + 0.30, 0.35, 'triangle'); // C6 (crisp peak)
    } catch (e) {
      console.warn('[PII-LCC Audio] Validation sound blocked or failed:', e);
    }
  };

  // Function to play warning chime on new alert
  const playNotificationChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      // Cyber-tactical dual frequency rise pulse
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(800, ctx.currentTime);
      gain1.gain.setValueAtTime(0.08, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.18);

      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1100, ctx.currentTime);
        gain2.gain.setValueAtTime(0.08, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.25);
      }, 100);
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
  const safeLocalStorage = {
    getItem: (key: string): string | null => {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        console.warn('localStorage.getItem is restricted or unavailable:', e);
        return null;
      }
    },
    setItem: (key: string, value: string) => {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        console.warn('localStorage.setItem is restricted or unavailable:', e);
      }
    },
    removeItem: (key: string) => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn('localStorage.removeItem is restricted or unavailable:', e);
      }
    }
  };

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
          window.location.reload();
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
      triggerAutoUpdate(serverVersion, changelog || 'Ajuste doctrinal automático detectado al sincronizar terminal militar.');
    }
  }, [appVersion]);

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
          handleStateSync(state);
        } else {
          console.error('[PII-LCC Network] HTTP Sync Fallback failed:', response.statusText);
        }
      } catch (err) {
        console.error('[PII-LCC Network] Error during HTTP Sync Fallback:', err);
      }
    }
  }, [handleStateSync]);

  // Real-time synchronization connection hook
  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimeout: any;

    const connect = () => {
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
              handleStateSync(payload);
            }


          } catch (err) {
            console.error('[PII-LCC Network] Error parsing incoming sync package:', err);
          }
        };

        socket.onclose = () => {
          console.warn('[PII-LCC Network] Connection interrupted. Re-establishing secure link in 3s...');
          reconnectTimeout = setTimeout(connect, 3000);
        };

        socket.onerror = (err) => {
          console.warn('[PII-LCC Network] WebSocket link unreachable. Operating in secure HTTP Sync Fallback mode.', err);
          if (socket) socket.close();
        };
      } catch (wsErr) {
        console.error('[PII-LCC Network] Could not initialize WebSocket constructor on this device:', wsErr);
        reconnectTimeout = setTimeout(connect, 5000);
      }
    };

    connect();

    return () => {
      if (socket) socket.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [handleStateSync]);

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
            handleStateSync(state);
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
  }, [handleStateSync]);

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

  // Real-time UTC system clock simulation
  const [systemTime, setSystemTime] = useState<string>('');
  const [timeOffset, setTimeOffset] = useState<number>(0);
  const [isUpdatingTime, setIsUpdatingTime] = useState<boolean>(false);

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
      setSystemTime(now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC');
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
    if (isAuthenticated && user) {
      if (role !== user.role) {
        if (isInstalledDevice) {
          // Auto-authenticate into the new role on installed or mobile devices
          login(role);
        } else {
          // Triggers the security warning, logged intrusion, and alert tone
          validateBackendPermission(role, 'Visualizar Departamento Restringido', '19°13\'10"S 68°35\'50"W');
        }
      }
    } else {
      setSelectedLoginRole(role);
    }
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
* Registros de Búsqueda de Campo (S-2) Totales: ${rawAlerts.length}
* Inteligencias de Fusión CFI Activas: ${actionableIntel.length}
* Órdenes de Operaciones Automatizadas (OOA): ${activeOrders.length}
* Unidades Tácticas Desplegadas en Terreno: ${tacticalUnits.length}

--------------------------------------------------------------------------------
2. DETALLE DE REGISTROS DE BÚSQUEDA DE CAMPO (S-2 RAW ALERTS)
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

  return (
    <div className="min-h-screen bg-[#050505] text-[#e0e0e0] font-sans selection:bg-[#3b82f6]/30 selection:text-white relative overflow-x-hidden">
      
      {/* Tactical Grid Overlay Background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.006)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.006)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Top Banner HUD Header */}
      <header className="h-16 border-b border-[#1a1a1a] bg-[#0a0a0a] flex items-center sticky top-0 z-50 shrink-0">
        <div className="w-full max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between">
          
          {/* Logo & Title */}
          <PIILCCLogo variant="header" size={48} />

          {/* System UTC Time Clock & Operation Status */}
          <div className="flex items-center gap-6">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-[10px] text-[#666] uppercase leading-none">Estado de Operación</span>
              <span className="text-[11px] text-[#10b981] font-mono mt-1">● SISTEMAS NOMINALES</span>
            </div>
            
            <div className="hidden md:block h-8 w-px bg-[#1a1a1a]"></div>

            <button
              onClick={fetchActualTime}
              disabled={isUpdatingTime}
              className="flex items-center gap-2 text-slate-400 font-mono text-xs bg-black/45 hover:bg-zinc-900 border border-[#1a1a1a] hover:border-zinc-700 px-3 py-1.5 rounded transition-all active:scale-95 cursor-pointer select-none group outline-none"
              title="Actualizar con la hora real de red"
            >
              <Clock className={`w-3.5 h-3.5 text-[#3b82f6] ${isUpdatingTime ? 'animate-spin text-emerald-400' : 'group-hover:text-emerald-400'}`} />
              <span>{systemTime || 'CONECTANDO BALIZAS...'}</span>
              <RefreshCw className={`w-3 h-3 text-zinc-600 group-hover:text-zinc-400 transition-all ${isUpdatingTime ? 'animate-spin' : ''}`} />
            </button>
          </div>

        </div>
      </header>

      {/* System Workspace Header Bar (Role Selector & Profile Details) */}
      <div className="bg-[#080808] border-b border-[#1a1a1a]">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Identity HUD Card */}
          <div className="flex items-center gap-3 bg-[#0a0a0a] border border-[#1a1a1a] p-3 rounded-lg max-w-sm w-full md:w-80">
            <div className={`p-2.5 rounded ${
              currentRole === 'ROL_CEO' ? 'bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20' :
              currentRole === 'ROL_FUSION' ? 'bg-[#f97316]/10 text-[#f97316] border border-[#f97316]/20' :
              'bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20'
            }`}>
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="text-left font-mono flex-1">
              <span className="text-[9px] text-[#666] uppercase block leading-none">Operador Militar Activo:</span>
              <span className="text-xs font-bold text-white block mt-0.5">
                {currentRole === 'ROL_CEO' && 'GRAL. E. MARTÍNEZ'}
                {currentRole === 'ROL_FUSION' && 'TTE. CNEL. S. ROJAS'}
                {currentRole === 'ROL_PATRULLA' && 'EQUIPOS DE BÚSQUEDA S-2'}
              </span>
              <span className="text-[9px] text-slate-500 flex items-center gap-1 mt-0.5">
                ROL: {currentRole === 'ROL_CEO' && 'COMANDO ESTRATÉGICO (ROL_CEO)'}
                {currentRole === 'ROL_FUSION' && 'ANALISTA DE FUSIÓN (ROL_FUSION)'}
                {currentRole === 'ROL_PATRULLA' && 'ÓRGANO DE BÚSQUEDA (ROL_PATRULLA)'}
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
                  className="flex items-center justify-center p-2 rounded bg-red-950/20 text-red-400 hover:bg-red-900/30 hover:text-red-300 border border-red-900/30 transition-colors cursor-pointer"
                  title="Cerrar Sesión Segura (CAD-C2)"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Core Navigation Tabs (Side-bar style converted into elegant, tactile buttons with strict role division) */}
          <div className="flex bg-[#0a0a0a] border border-[#1a1a1a] p-1 rounded-lg self-start md:self-auto w-full md:w-auto overflow-x-auto gap-1">
            <button
              onClick={() => handleSetRoleAttempt('ROL_CEO')}
              className={`flex-1 md:flex-none px-4 py-2.5 rounded text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-2 ${
                currentRole === 'ROL_CEO'
                  ? 'bg-[#3b82f6]/10 border-l-2 border-[#3b82f6] text-[#3b82f6]'
                  : 'text-[#444] hover:text-[#666] bg-[#0c0c0c]/50'
              }`}
            >
              {currentRole === 'ROL_CEO' ? (
                <Zap className="w-3.5 h-3.5" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-zinc-700" />
              )}
              <span className={currentRole === 'ROL_CEO' ? 'text-white' : 'text-zinc-600'}>3. Mando (CEO-LCC)</span>
            </button>

            <button
              onClick={() => handleSetRoleAttempt('ROL_FUSION')}
              className={`flex-1 md:flex-none px-4 py-2.5 rounded text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-2 ${
                currentRole === 'ROL_FUSION'
                  ? 'bg-[#f97316]/10 border-l-2 border-[#f97316] text-[#f97316]'
                  : 'text-[#444] hover:text-[#666] bg-[#0c0c0c]/50'
              }`}
            >
              {currentRole === 'ROL_FUSION' ? (
                <Shield className="w-3.5 h-3.5" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-zinc-700" />
              )}
              <span className={currentRole === 'ROL_FUSION' ? 'text-white' : 'text-zinc-600'}>2. Fusión (CFI)</span>
            </button>

            <button
              onClick={() => handleSetRoleAttempt('ROL_PATRULLA')}
              className={`flex-1 md:flex-none px-4 py-2.5 rounded text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-2 ${
                currentRole === 'ROL_PATRULLA'
                  ? 'bg-[#10b981]/10 border-l-2 border-[#10b981] text-[#10b981]'
                  : 'text-[#444] hover:text-[#666] bg-[#0c0c0c]/50'
              }`}
            >
              {currentRole === 'ROL_PATRULLA' ? (
                <Radio className="w-3.5 h-3.5 animate-pulse" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-zinc-700" />
              )}
              <span className={currentRole === 'ROL_PATRULLA' ? 'text-white' : 'text-zinc-600'}>1. Búsqueda (S-2)</span>
            </button>
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

        {!isAuthenticated ? (
          <div className="max-w-3xl mx-auto bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-6 md:p-8 shadow-2xl relative overflow-hidden animate-fade-in">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#10b981] via-[#f97316] to-[#3b82f6]" />
            
            <div className="text-center space-y-4 mb-8 flex flex-col items-center">
              <div className="space-y-1">
                <h2 className="text-md md:text-lg font-bold font-mono text-zinc-400 tracking-tight uppercase">
                  SISTEMA DE CONTROL DE ACCESO DOCTRINAL (CAD-C2)
                </h2>
                <p className="text-[9px] text-zinc-500 font-mono tracking-widest uppercase">
                  CLASIFICACIÓN: DEFENSA NACIONAL // RESERVADO COMPARTIMENTADO
                </p>
              </div>

              {/* PIILCC Centerpiece Logo */}
              <PIILCCLogo variant="centerpiece" size={170} />

              <div className="max-w-md mx-auto pt-2 border-t border-[#1a1a1a]">
                <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                  Para cumplir con la jerarquía militar y evitar el flujo libre de información, debe firmar digitalmente y autenticarse en uno de los tres departamentos definidos en la doctrina de la plataforma.
                </p>
              </div>
            </div>

            {/* PII-LCC Installed Device Status Indicator */}
            <div className="max-w-xl mx-auto mb-8 p-3.5 rounded-lg border border-[#10b981]/20 bg-[#10b981]/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-left font-mono">
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <Shield className="w-5 h-5 text-[#10b981]" />
                  <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#10b981] rounded-full animate-ping" />
                  <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#10b981] rounded-full" />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase text-[#10b981] flex items-center gap-1.5 flex-wrap">
                    <span>📱 Terminal de Operaciones PII-LCC Instalado</span>
                    <span className="text-[8px] bg-[#10b981]/20 text-[#10b981] px-1 py-0.2 rounded font-mono">ENLACE AUTORIZADO</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-0.5 leading-snug">
                    Este dispositivo cuenta con el paquete táctico de la PII-LCC instalado. Se autoriza el acceso y la conmutación instantánea a los niveles 2 (Fusión) y 3 (Mando).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleInstalledDevice(!isInstalledDevice)}
                className={`px-3 py-1.5 rounded text-[10px] uppercase font-bold tracking-wider transition-all shrink-0 cursor-pointer border ${
                  isInstalledDevice 
                    ? 'bg-[#10b981]/15 text-[#10b981] border-[#10b981]/30 hover:bg-[#10b981]/20' 
                    : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-zinc-300'
                }`}
              >
                {isInstalledDevice ? 'Desactivar Filtro' : 'Forzar Enlace'}
              </button>
            </div>

             {/* Role Selection Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {/* Role 1: ROL_PATRULLA */}
              <div 
                onClick={() => {
                  setSelectedLoginRole('ROL_PATRULLA');
                }}
                className={`p-4 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                  selectedLoginRole === 'ROL_PATRULLA'
                    ? 'bg-[#10b981]/5 border-[#10b981] shadow-lg shadow-[#10b981]/5 ring-1 ring-[#10b981]/20'
                    : 'bg-zinc-950/60 border-zinc-900 hover:border-zinc-800 hover:bg-zinc-900/20'
                }`}
              >
                <div>
                  <span className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded ${
                    selectedLoginRole === 'ROL_PATRULLA' ? 'bg-[#10b981]/20 text-[#10b981]' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    NIVEL 1 - S-2
                  </span>
                  <h4 className="text-sm font-bold text-white font-mono mt-4 flex items-center gap-1.5">
                    <Radio className="w-4 h-4 text-[#10b981]" />
                    BÚSQUEDA S-2 (ROL_PATRULLA)
                  </h4>
                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Órgano de Captura</p>
                  <p className="text-[11px] text-zinc-400 font-sans mt-3 leading-relaxed">
                    Captura telemetría bruta y registros primarios. No se permite análisis táctico ni valoración.
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-zinc-900/40 text-[9px] font-mono text-[#10b981]">
                  OPERADOR: CABO VALENZUELA
                </div>
              </div>

              {/* Role 2: ROL_FUSION */}
              <div 
                onClick={() => {
                  setSelectedLoginRole('ROL_FUSION');
                }}
                className={`p-4 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                  selectedLoginRole === 'ROL_FUSION'
                    ? 'bg-[#f97316]/5 border-[#f97316] shadow-lg shadow-[#f97316]/5 ring-1 ring-[#f97316]/20'
                    : 'bg-zinc-950/60 border-zinc-900 hover:border-zinc-800 hover:bg-zinc-900/20'
                }`}
              >
                <div>
                  <span className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded ${
                    selectedLoginRole === 'ROL_FUSION' ? 'bg-[#f97316]/20 text-[#f97316]' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    NIVEL 2 - CFI
                  </span>
                  <h4 className="text-sm font-bold text-white font-mono mt-4 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-[#f97316]" />
                    FUSIÓN CFI (ROL_FUSION)
                  </h4>
                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Sala de Situación</p>
                  <p className="text-[11px] text-zinc-400 font-sans mt-3 leading-relaxed">
                    Valora e integra datos. Contrasta rutas históricas y promueve reportes a inteligencia.
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-zinc-900/40 text-[9px] font-mono text-[#f97316]">
                  OPERADOR: TTE. CNEL. ROJAS
                </div>
              </div>

              {/* Role 3: ROL_CEO */}
              <div 
                onClick={() => {
                  setSelectedLoginRole('ROL_CEO');
                }}
                className={`p-4 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                  selectedLoginRole === 'ROL_CEO'
                    ? 'bg-[#3b82f6]/5 border-[#3b82f6] shadow-lg shadow-[#3b82f6]/5 ring-1 ring-[#3b82f6]/20'
                    : 'bg-zinc-950/60 border-zinc-900 hover:border-zinc-800 hover:bg-zinc-900/20'
                }`}
              >
                <div>
                  <span className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded ${
                    selectedLoginRole === 'ROL_CEO' ? 'bg-[#3b82f6]/20 text-[#3b82f6]' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    NIVEL 3 - LCC
                  </span>
                  <h4 className="text-sm font-bold text-white font-mono mt-4 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-[#3b82f6]" />
                    MANDO CEO-LCC (ROL_CEO)
                  </h4>
                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Comando y Control</p>
                  <p className="text-[11px] text-zinc-400 font-sans mt-3 leading-relaxed">
                    Visualiza inteligencia aprobada. Emite órdenes de operaciones automatizadas (OOA).
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-zinc-900/40 text-[9px] font-mono text-[#3b82f6]">
                  OPERADOR: GRAL. MARTÍNEZ
                </div>
              </div>
            </div>

            {/* Cryptographic Key Signature Form */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                login(selectedLoginRole);
              }} 
              className="bg-zinc-950 p-4 rounded-xl border border-zinc-900 space-y-4 max-w-xl mx-auto"
            >
              <div className="text-left">
                <label className="block text-[10px] font-mono text-[#666] uppercase mb-1 font-bold">
                  Firma Criptográfica Digital de Seguridad (Auto-Asignada)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={displayedSignature}
                    className={`w-full bg-zinc-900 border rounded px-3 py-2 text-xs font-mono focus:outline-none transition-all duration-300 ${
                      selectedLoginRole === 'ROL_PATRULLA' ? 'text-[#10b981] border-[#10b981]/20 shadow-[0_0_10px_rgba(16,185,129,0.03)]' :
                      selectedLoginRole === 'ROL_FUSION' ? 'text-[#f97316] border-[#f97316]/20 shadow-[0_0_10px_rgba(249,115,22,0.03)]' :
                      'text-[#3b82f6] border-[#3b82f6]/20 shadow-[0_0_10px_rgba(59,130,246,0.03)]'
                    }`}
                  />
                  <Key className={`w-3.5 h-3.5 absolute right-3 top-2.5 transition-colors duration-300 ${
                    selectedLoginRole === 'ROL_PATRULLA' ? 'text-[#10b981]/60' :
                    selectedLoginRole === 'ROL_FUSION' ? 'text-[#f97316]/60' :
                    'text-[#3b82f6]/60'
                  }`} />
                </div>
              </div>

              <div className="text-left">
                <label className="block text-[10px] font-mono text-[#666] uppercase mb-1 font-bold">
                  PIN de Autorización Táctica
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  defaultValue="123456"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-zinc-700"
                />
              </div>

              <button
                type="submit"
                className={`w-full py-2.5 px-4 rounded font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer text-white shadow-md ${
                  selectedLoginRole === 'ROL_PATRULLA' ? 'bg-[#10b981] hover:bg-[#10b981]/90 shadow-[#10b981]/15' :
                  selectedLoginRole === 'ROL_FUSION' ? 'bg-[#f97316] hover:bg-[#f97316]/90 shadow-[#f97316]/15' :
                  'bg-[#3b82f6] hover:bg-[#3b82f6]/90 shadow-[#3b82f6]/15'
                }`}
              >
                <Unlock className="w-4 h-4" />
                <span>Autenticar Firma Digital y Validar Rango</span>
              </button>
            </form>
          </div>
        ) : (
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
                    />
                  )}

                  {currentRole === 'ROL_FUSION' && (
                    <OperationalView 
                      rawAlerts={rawAlerts}
                      clans={clans}
                      actionableIntel={actionableIntel}
                      onPromoteToIntel={handlePromoteToIntel}
                      onUpdateAlertStatus={handleUpdateAlertStatus}
                    />
                  )}

                  {currentRole === 'ROL_PATRULLA' && (
                    <TacticalView 
                      activeOrders={activeOrders}
                      tacticalUnits={tacticalUnits}
                      onConfirmOrder={handleConfirmOrder}
                      onSendFieldReport={handleSendFieldReport}
                      onUpdateUnitCoordinates={handleUpdateUnitCoordinates}
                    />
                  )}
                </div>

                {/* Dynamic Joint Route Analysis Custom Chart Maker (Required) */}
                <InteractiveChartCreator initialData={initialChartData} tacticalUnits={tacticalUnits} />
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
        )}

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
                className="w-full sm:w-auto bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white font-bold text-[10px] uppercase tracking-wider px-4 py-2.5 rounded-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                Cerrar Ventana
              </button>
              
              <button
                onClick={() => {
                  // Switch role directly to CEO to allow operations on the validated report
                  handleSetRoleAttempt('ROL_CEO');
                  // Clear the modal alert state
                  setValidatedReportAlert(null);
                }}
                className="w-full sm:flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-black text-[10px] uppercase tracking-wider px-5 py-2.5 rounded-lg transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <Zap className="w-3.5 h-3.5 fill-black" />
                Proceder a Mando Estratégico (Nivel 3)
              </button>
            </div>

          </div>
        </div>
      )}



    </div>
  );
}
