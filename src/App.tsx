/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MilitaryRole, RawAlert, Clan, ActionableIntel, AutomatedOrder, TacticalUnit, User, AuditLogEntry, G2RegistryRecord, TacticalModuleId, ModuleBackgroundConfig, ModuleBackgroundsMap } from './types';
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
import InterdictionAlertTracker from './components/InterdictionAlertTracker';
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
import { ModuleBackgroundLayer } from './components/ModuleBackgroundLayer';
import { ModuleBackgroundModal } from './components/ModuleBackgroundModal';
import { TacticalBackgroundEditorModal } from './components/TacticalBackgroundEditorModal';
import { 
  loadModuleBackgroundsLocal, 
  saveModuleBackgroundLocal, 
  fetchServerModuleBackgrounds, 
  uploadModuleBackgroundToServer, 
  resetModuleBackground, 
  resolveActiveModuleId, 
  createDefaultModuleBackgrounds,
  TACTICAL_MODULES_LIST 
} from './services/ModuleBackgroundService';
import { AppInstallModal } from './components/AppInstallModal';
import { TacticalUpdateManager } from './components/TacticalUpdateManager';
import { AI_STUDIO_BUILD } from './buildVersion';
import GoogleEarthPatrolModal from './components/GoogleEarthPatrolModal';
import UserManagementModal from './components/UserManagementModal';
import ClanManagementModal from './components/ClanManagementModal';
import DataStorageManagerModal from './components/DataStorageManagerModal';
import SupabaseSyncModal from './components/SupabaseSyncModal';
import { MultiDeviceSyncModal } from './components/MultiDeviceSyncModal';
import { NetworkPresenceMonitor } from './components/NetworkPresenceMonitor';
import { requestDeviceLocation, getCachedDeviceLocation, detectDevicePlatform } from './utils/deviceLocation';
import { generateDeviceRealLocationKml, downloadKmlFile } from './utils/geo';
import { 
  getOrCreateDeviceId, 
  getDeviceName, 
  detectDevicePlatform as detectSyncPlatform, 
  getActiveSyncHubUrl, 
  getSyncWebSocketUrl, 
  broadcastLocalTabSync, 
  subscribeToLocalTabSync, 
  normalizeCrossVersionState 
} from './services/MultiDeviceSyncService';
import { cloudRealtimeMesh, CloudMeshActionPacket } from './services/CloudRealtimeMesh';

import { Shield, Radio, Zap, Navigation, Clock, User as UserIcon, AlertCircle, Eye, Settings, HelpCircle, FileText, Lock, Unlock, LogOut, Key, AlertTriangle, Terminal, Layers, RefreshCw, Bell, Volume2, VolumeX, Code, Download, Moon, Sun, Sliders, Check, EyeOff, Gamepad2, Smartphone, Laptop, Image as ImageIcon, Palette, Globe, Crown, Database, HardDrive, Users, Save, Cloud, X } from 'lucide-react';
import { useAuth, PRESET_USERS } from './context/AuthContext';
import { safeStorage } from './utils/storage';
import {
  fetchTacticalUnitsFromSupabase,
  upsertTacticalUnitInSupabase,
  upsertAllTacticalUnitsInSupabase,
  deleteTacticalUnitFromSupabase,
  upsertRawAlertInSupabase
} from './lib/supabase';
import { 
  playSyntheticBeep, 
  playChime, 
  playCyberClick, 
  playCyberModuleTransition, 
  playCyberAccessGranted, 
  playCyberDenied, 
  playCyberAlert 
} from './utils/audio';

// Safe localStorage helper to prevent DOMException/SecurityError in private browsing or iframe environments
const safeLocalStorage = safeStorage;

export default function App() {
  const { fontPreset } = useGamingFont();
  const fullBgState = useFullDashboardBackground();
  const {
    user,
    isAuthenticated,
    login,
    logout,
    replaceUsers,
    validateBackendPermission,
    securityError,
    clearSecurityError,
    auditLogs,
    setAuditLogs
  } = useAuth();

  const [selectedLoginRole, setSelectedLoginRole] = useState<MilitaryRole>('ROL_PATRULLA');
  const [rawAlerts, setRawAlerts] = useState<RawAlert[]>(() => {
    try {
      const saved = safeLocalStorage.getItem('PII_LCC_RAW_ALERTS');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse cached raw alerts:', e);
    }
    return initialRawAlerts;
  });
  const [expedientes, setExpedientes] = useState<G2RegistryRecord[]>(() => {
    try {
      const saved = safeStorage.getItem('pii_lcc_expedientes');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load saved expedientes:', e);
    }
    return initialG2Records;
  });
  const [clans, setClans] = useState<Clan[]>(() => {
    try {
      const saved = safeLocalStorage.getItem('PII_LCC_CLANS');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse cached clans:', e);
    }
    return initialClans;
  });
  const [actionableIntel, setActionableIntel] = useState<ActionableIntel[]>(() => {
    try {
      const saved = safeLocalStorage.getItem('PII_LCC_ACTIONABLE_INTEL');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse cached actionable intel:', e);
    }
    return initialActionableIntel;
  });
  const [activeOrders, setActiveOrders] = useState<AutomatedOrder[]>(() => {
    try {
      const saved = safeLocalStorage.getItem('PII_LCC_ACTIVE_ORDERS');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse cached active orders:', e);
    }
    return initialOrders;
  });
  const [tacticalUnits, setTacticalUnits] = useState<TacticalUnit[]>(() => {
    try {
      const saved = safeLocalStorage.getItem('PII_LCC_TACTICAL_UNITS');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse cached tactical units:', e);
    }
    return initialTacticalUnits;
  });
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'OPERATIONS' | 'ARCHITECTURE' | 'P2P_MESH' | 'CODE_VIEWER'>('OPERATIONS');
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showLogoutConfirmModal, setShowLogoutConfirmModal] = useState(false);
  
  // Per-Module Backgrounds State (IndexedDB + Server Synced)
  const [moduleBackgrounds, setModuleBackgrounds] = useState<ModuleBackgroundsMap>(createDefaultModuleBackgrounds);
  const [showModuleBgModal, setShowModuleBgModal] = useState<boolean>(false);
  const [showTacticalBgModal, setShowTacticalBgModal] = useState<boolean>(false);
  const [showGlobalGoogleEarthModal, setShowGlobalGoogleEarthModal] = useState<boolean>(false);

  // Administrative User Management, Clan Intelligence, Data Storage and Supabase Modals
  const [showUserManagementModal, setShowUserManagementModal] = useState<boolean>(false);
  const [showClanManagementModal, setShowClanManagementModal] = useState<boolean>(false);
  const [showDataStorageModal, setShowDataStorageModal] = useState<boolean>(false);
  const [showSupabaseModal, setShowSupabaseModal] = useState<boolean>(false);
  const [showMultiDeviceSyncModal, setShowMultiDeviceSyncModal] = useState<boolean>(false);
  const [showNetworkPresenceMonitor, setShowNetworkPresenceMonitor] = useState<boolean>(false);
  const [showCodeViewerModal, setShowCodeViewerModal] = useState<boolean>(false);
  const [syncedDevicesCount, setSyncedDevicesCount] = useState<number>(1);
  const [networkLatencyMs, setNetworkLatencyMs] = useState<number | null>(null);

  // Clan persistence and modification handlers
  const handleSaveClan = useCallback((clanToSave: Clan) => {
    setClans(prev => {
      const idx = prev.findIndex(c => c.id === clanToSave.id);
      let updated: Clan[];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = clanToSave;
      } else {
        updated = [clanToSave, ...prev];
      }
      safeLocalStorage.setItem('PII_LCC_CLANS', JSON.stringify(updated));
      return updated;
    });
    sendWsMessageRef.current?.('SAVE_CLAN', { clan: clanToSave });
  }, []);

  const handleDeleteClan = useCallback((clanId: string) => {
    setClans(prev => {
      const updated = prev.filter(c => c.id !== clanId);
      safeLocalStorage.setItem('PII_LCC_CLANS', JSON.stringify(updated));
      return updated;
    });
    sendWsMessageRef.current?.('DELETE_CLAN', { clanId });
  }, []);

  const handleBatchImportClans = useCallback((importedClans: Clan[]) => {
    setClans(importedClans);
    safeLocalStorage.setItem('PII_LCC_CLANS', JSON.stringify(importedClans));
    sendWsMessageRef.current?.('BATCH_IMPORT_CLANS', { clans: importedClans });
  }, []);

  const handleRestoreAllData = useCallback((data: {
    clans?: Clan[];
    rawAlerts?: RawAlert[];
    expedientes?: G2RegistryRecord[];
    actionableIntel?: ActionableIntel[];
    activeOrders?: AutomatedOrder[];
    tacticalUnits?: TacticalUnit[];
    users?: User[];
  }) => {
    if (data.clans && Array.isArray(data.clans)) {
      setClans(data.clans);
      safeLocalStorage.setItem('PII_LCC_CLANS', JSON.stringify(data.clans));
    }
    if (data.rawAlerts && Array.isArray(data.rawAlerts)) {
      setRawAlerts(data.rawAlerts);
      safeLocalStorage.setItem('PII_LCC_RAW_ALERTS', JSON.stringify(data.rawAlerts));
    }
    if (data.expedientes && Array.isArray(data.expedientes)) {
      setExpedientes(data.expedientes);
      safeStorage.setItem('pii_lcc_expedientes', JSON.stringify(data.expedientes));
    }
    if (data.actionableIntel && Array.isArray(data.actionableIntel)) {
      setActionableIntel(data.actionableIntel);
      safeLocalStorage.setItem('PII_LCC_ACTIONABLE_INTEL', JSON.stringify(data.actionableIntel));
    }
    if (data.activeOrders && Array.isArray(data.activeOrders)) {
      setActiveOrders(data.activeOrders);
      safeLocalStorage.setItem('PII_LCC_ACTIVE_ORDERS', JSON.stringify(data.activeOrders));
    }
    if (data.tacticalUnits && Array.isArray(data.tacticalUnits)) {
      setTacticalUnits(data.tacticalUnits);
      safeLocalStorage.setItem('PII_LCC_TACTICAL_UNITS', JSON.stringify(data.tacticalUnits));
    }
    if (data.users && Array.isArray(data.users) && data.users.length > 0) {
      replaceUsers(data.users);
    }

    // Sync restored state with server and all connected terminals
    try {
      const hubUrl = getActiveSyncHubUrl();
      fetch(`${hubUrl}/api/backup/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tacticalState: {
            rawAlerts: data.rawAlerts,
            clans: data.clans,
            actionableIntel: data.actionableIntel,
            activeOrders: data.activeOrders,
            tacticalUnits: data.tacticalUnits,
            expedientes: data.expedientes
          }
        })
      }).catch(() => {});
    } catch {
      // ignore
    }
    if (data.tacticalUnits && data.tacticalUnits.length > 0) {
      sendWsMessageRef.current?.('SYNC_TACTICAL_UNITS', { units: data.tacticalUnits });
    }
    if (data.expedientes) {
      sendWsMessageRef.current?.('RESTORE_EXPEDIENTES', { expedientes: data.expedientes });
    }
  }, [replaceUsers]);

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

  // Function to play futuristic cybernetic confirmation sound upon report validation
  const playValidationSound = () => {
    try {
      playCyberAccessGranted(0.09);
    } catch (e) {
      console.warn('[PII-LCC Audio] Validation sound blocked or failed:', e);
    }
  };

  // Function to play futuristic cybernetic warning chime on new alert
  const playNotificationChime = () => {
    try {
      playCyberAlert(960, 0.1);
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

  // Automatic OTA update tracking
  const APP_VERSION = AI_STUDIO_BUILD.version;
  const [appVersion, setAppVersion] = useState<string>(AI_STUDIO_BUILD.version);
  const [updateInProgress, setUpdateInProgress] = useState<boolean>(false);
  const [updateProgress, setUpdateProgress] = useState<number>(0);
  const [updatePhase, setUpdatePhase] = useState<string>('');
  const [updateChangelog, setUpdateChangelog] = useState<string>('');
  const [newVersionToInstall, setNewVersionToInstall] = useState<string>('');
  const [justUpdatedToast, setJustUpdatedToast] = useState<boolean>(false);
  const [realtimeSyncToast, setRealtimeSyncToast] = useState<{ message: string; timestamp: number } | null>(null);

  // Auto-dismiss realtime sync toast after 4s
  useEffect(() => {
    if (realtimeSyncToast) {
      const timer = setTimeout(() => {
        setRealtimeSyncToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [realtimeSyncToast]);


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
    // Purge legacy global background storage so old global overlay never reappears
    safeLocalStorage.removeItem('ceo_lcc_dashboard_full_bg_config_v5');
    safeLocalStorage.removeItem('ceo_lcc_dashboard_full_bg_config_v6');

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

  // Shared helper to synchronize central state with React states across all versions
  const handleStateSync = useCallback((state: any, isInit: boolean = false) => {
    if (!state) return;
    const normalized = normalizeCrossVersionState(state);
    const { 
      version: serverVersion, 
      rawAlerts: incomingAlerts, 
      clans: incomingClans, 
      actionableIntel: incomingIntel, 
      activeOrders: incomingOrders, 
      tacticalUnits: incomingUnits, 
      auditLogs: incomingLogs,
      expedientes: incomingExpedientes
    } = normalized;
    
    if (Array.isArray(incomingAlerts)) {
      setRawAlerts(incomingAlerts);
      safeLocalStorage.setItem('PII_LCC_RAW_ALERTS', JSON.stringify(incomingAlerts));
    }
    if (Array.isArray(incomingClans)) {
      setClans(incomingClans);
      safeLocalStorage.setItem('PII_LCC_CLANS', JSON.stringify(incomingClans));
    }
    if (Array.isArray(incomingIntel)) {
      setActionableIntel(incomingIntel);
      safeLocalStorage.setItem('PII_LCC_ACTIONABLE_INTEL', JSON.stringify(incomingIntel));
    }
    if (Array.isArray(incomingOrders)) {
      setActiveOrders(incomingOrders);
      safeLocalStorage.setItem('PII_LCC_ACTIVE_ORDERS', JSON.stringify(incomingOrders));
    }
    if (Array.isArray(incomingUnits)) {
      if (isInit) {
        setTacticalUnits(prev => {
          const mergedMap = new Map<string, TacticalUnit>();
          incomingUnits.forEach((u: TacticalUnit) => {
            if (u && u.id) mergedMap.set(u.id, u);
          });
          let hasExtraLocalUnits = false;
          prev.forEach(lu => {
            if (!lu || !lu.id) return;
            const existsById = mergedMap.has(lu.id);
            const existsByName = Array.from(mergedMap.values()).some(
              u => u.name.trim().toLowerCase() === lu.name.trim().toLowerCase()
            );
            if (!existsById && !existsByName) {
              mergedMap.set(lu.id, lu);
              hasExtraLocalUnits = true;
            }
          });
          const mergedList = Array.from(mergedMap.values());
          safeLocalStorage.setItem('PII_LCC_TACTICAL_UNITS', JSON.stringify(mergedList));
          if (hasExtraLocalUnits) {
            sendWsMessageRef.current?.('SYNC_TACTICAL_UNITS', { units: mergedList });
          }
          return mergedList;
        });
      } else {
        setTacticalUnits(incomingUnits);
        safeLocalStorage.setItem('PII_LCC_TACTICAL_UNITS', JSON.stringify(incomingUnits));
      }
    }
    if (Array.isArray(incomingExpedientes)) {
      setExpedientes(incomingExpedientes);
      safeStorage.setItem('pii_lcc_expedientes', JSON.stringify(incomingExpedientes));
    }

    if (state.moduleBackgrounds) {
      setModuleBackgrounds(prev => ({
        ...prev,
        ...state.moduleBackgrounds
      }));
    }

    if (state.fullDashboardBackground) {
      window.dispatchEvent(new CustomEvent('full-dashboard-bg-update', { detail: { settings: state.fullDashboardBackground } }));
    }

    if (state.syncedDevices && Array.isArray(state.syncedDevices)) {
      const mergedDevices = cloudRealtimeMesh.mergeExpressDevices(state.syncedDevices);
      window.dispatchEvent(new CustomEvent('synced-devices-update', { detail: { devices: mergedDevices } }));
      setSyncedDevicesCount(mergedDevices.filter((d: any) => d.isOnline).length);
    }

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

    // Broadcast update to other local tabs/installed PWA windows on this device
    broadcastLocalTabSync('LOCAL_TAB_SYNC', normalized);
  }, [appVersion]);

  const handleStateSyncRef = useRef(handleStateSync);
  useEffect(() => {
    handleStateSyncRef.current = handleStateSync;
  }, [handleStateSync]);

  // Subscribe to local tab / cross-window broadcast sync
  useEffect(() => {
    const unsubscribe = subscribeToLocalTabSync((type, payload) => {
      if (type === 'LOCAL_TAB_SYNC' && payload) {
        handleStateSyncRef.current(payload);
      }
    });
    return unsubscribe;
  }, []);

  // Queue to buffer actions when offline or during transient link disruptions
  const offlineActionQueueRef = useRef<{ type: string; payload: any }[]>([]);
  const sendWsMessageRef = useRef<((type: string, payload: any) => Promise<void>) | null>(null);

  const drainActionQueue = useCallback(() => {
    if (offlineActionQueueRef.current.length === 0) return;
    const queuedItems = [...offlineActionQueueRef.current];
    offlineActionQueueRef.current = [];
    console.log(`[PII-LCC Network] Link active. Transmitting ${queuedItems.length} deferred tactical actions.`);
    queuedItems.forEach(({ type, payload }) => {
      sendWsMessageRef.current?.(type, payload);
    });
  }, []);

  // Keep latest state snapshot ref for peer FULL_STATE_SNAPSHOT responses across Vercel/cloud terminals
  const latestTacticalSnapshotRef = useRef({
    rawAlerts,
    clans,
    actionableIntel,
    activeOrders,
    tacticalUnits,
    expedientes,
    auditLogs
  });
  useEffect(() => {
    latestTacticalSnapshotRef.current = {
      rawAlerts,
      clans,
      actionableIntel,
      activeOrders,
      tacticalUnits,
      expedientes,
      auditLogs
    };
  }, [rawAlerts, clans, actionableIntel, activeOrders, tacticalUnits, expedientes, auditLogs]);

  // Flag whether Express /api/sync exists on this host (false on static Vercel deploys after first 404)
  const expressSyncAvailableRef = useRef<boolean>(true);

  // Resilient helper to dispatch tactical messages via Supabase Cloud Realtime Mesh + WebSocket + HTTP fallback
  const sendWsMessage = useCallback(async (type: string, payload: any) => {
    const devId = getOrCreateDeviceId();
    const devName = getDeviceName();
    const devPlatform = detectSyncPlatform();

    // 0. Always broadcast via global Supabase Realtime Cloud Mesh (works natively on Vercel, PWAs, & cross-network!)
    const sentViaCloud = await cloudRealtimeMesh.broadcastAction(type, payload);

    // 1. Direct WebSocket transmission when Express /ws-sync is connected
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      try {
        socketRef.current.send(JSON.stringify({ 
          type, 
          payload,
          deviceInfo: {
            deviceId: devId,
            deviceName: devName,
            platform: devPlatform,
            installedVersion: appVersion
          }
        }));
        return;
      } catch (err) {
        console.warn(`[PII-LCC Network] WebSocket send failed, falling back to HTTP Sync:`, err);
      }
    }

    // 2. If WebSocket is currently negotiating (CONNECTING), wait briefly before falling back
    const activeSocket = socketRef.current;
    if (activeSocket && activeSocket.readyState === WebSocket.CONNECTING) {
      try {
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(resolve, 600);
          const interval = setInterval(() => {
            const currentStatus = (socketRef.current as any)?.readyState;
            if (currentStatus === WebSocket.OPEN || currentStatus === WebSocket.CLOSED) {
              clearInterval(interval);
              clearTimeout(timeout);
              resolve();
            }
          }, 50);
        });
        if ((socketRef.current as any)?.readyState === WebSocket.OPEN) {
          socketRef.current?.send(JSON.stringify({ 
            type, 
            payload,
            deviceInfo: {
              deviceId: devId,
              deviceName: devName,
              platform: devPlatform,
              installedVersion: appVersion
            }
          }));
          return;
        }
      } catch {
        // Continue to fallback
      }
    }

    // 3. If terminal is operating offline, queue action locally without throwing
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      console.warn(`[PII-LCC Network] Terminal in tactical offline mode. Action '${type}' buffered.`);
      offlineActionQueueRef.current.push({ type, payload });
      return;
    }

    // If Express /api/sync is known unavailable (static Vercel deploy) and Cloud Mesh already delivered it, done!
    if (!expressSyncAvailableRef.current) {
      if (!sentViaCloud) {
        offlineActionQueueRef.current.push({ type, payload });
      }
      return;
    }

    // 4. Secure HTTP Sync Fallback with timeout & automatic queueing on transient failures
    try {
      const hubUrl = getActiveSyncHubUrl();
      const syncEndpoint = `${hubUrl}/api/sync`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const response = await fetch(syncEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Id': devId,
          'X-Device-Name': encodeURIComponent(devName),
          'X-App-Version': appVersion,
          'X-Platform': devPlatform
        },
        body: JSON.stringify({
          action: { type, payload },
          deviceInfo: {
            deviceId: devId,
            deviceName: devName,
            platform: devPlatform,
            installedVersion: appVersion
          }
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const ct = response.headers.get('content-type') || '';
      if (response.ok && ct.includes('application/json')) {
        const state = await response.json();
        handleStateSyncRef.current(state);
      } else if (response.status === 404 || response.status === 405) {
        expressSyncAvailableRef.current = false;
      } else if (!sentViaCloud) {
        offlineActionQueueRef.current.push({ type, payload });
      }
    } catch {
      if (!sentViaCloud) {
        offlineActionQueueRef.current.push({ type, payload });
      }
    }
  }, [appVersion]);

  useEffect(() => {
    sendWsMessageRef.current = sendWsMessage;
  }, [sendWsMessage]);

  // Real-time synchronization connection hook
  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
    let isCleanedUp = false;

    const connect = () => {
      if (isCleanedUp) return;
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
      try {
        const wsUrl = getSyncWebSocketUrl();
        console.log(`[PII-LCC Network] Connecting to sync node: ${wsUrl}`);
        socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        socket.onopen = () => {
          console.log('[PII-LCC Network] Link established with central node.');
          // Register this device with the server hub
          try {
            socket?.send(JSON.stringify({
              type: 'REGISTER_DEVICE',
              payload: {
                deviceId: getOrCreateDeviceId(),
                deviceName: getDeviceName(),
                installedVersion: appVersion,
                platform: detectSyncPlatform(),
                role: user ? user.role : 'ROL_CEO',
                userName: user?.name
              }
            }));
          } catch (e) {
            console.warn('[PII-LCC Network] Error sending REGISTER_DEVICE:', e);
          }
          drainActionQueue();
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            const { type, payload } = data;

            if (type && type.startsWith('P2P_')) {
              window.dispatchEvent(new CustomEvent('p2p-message', { detail: { type, payload } }));
              return;
            }

            if (type === 'SYNCED_DEVICES_UPDATE' && payload?.devices) {
              const mergedDevices = cloudRealtimeMesh.mergeExpressDevices(payload.devices);
              window.dispatchEvent(new CustomEvent('synced-devices-update', { detail: { devices: mergedDevices } }));
              setSyncedDevicesCount(mergedDevices.filter((d: any) => d.isOnline).length);
              return;
            }

            if (type === 'MODULE_BG_UPDATE' && payload) {
              if (payload.allConfigs) {
                setModuleBackgrounds(prev => ({ ...prev, ...payload.allConfigs }));
              } else if (payload.moduleId && payload.config) {
                setModuleBackgrounds(prev => ({
                  ...prev,
                  [payload.moduleId]: payload.config
                }));
              }
              return;
            }

            if (type === 'FULL_DASHBOARD_BG_UPDATE' && payload?.settings) {
              window.dispatchEvent(new CustomEvent('full-dashboard-bg-update', { detail: { settings: payload.settings } }));
              return;
            }

            if (type === 'SYSTEM_UPGRADE_ALERT' && payload) {
              window.dispatchEvent(new CustomEvent('system-upgrade-alert', { detail: payload }));
            }

            if (type === 'TACTICAL_COMMS_BROADCAST' && payload?.commsMessage) {
              window.dispatchEvent(new CustomEvent('tactical-comms-message', { detail: payload.commsMessage }));
              playSyntheticBeep(880, 0.08);
              setRealtimeSyncToast({
                message: `Transmisión táctica recibida: ${payload.commsMessage.senderName || 'Terminal'} - "${payload.commsMessage.text?.slice(0, 30) || 'Mensaje'}"`,
                timestamp: Date.now()
              });
              return;
            }

            if (type === 'TACTICAL_ALARM_ALERT' && payload?.emergency) {
              playCyberAlert();
              setRealtimeSyncToast({
                message: `¡ALERTA DE EMERGENCIA EMITIDA POR TERMINAL!: ${payload.emergency.title || 'Prioridad 1'}`,
                timestamp: Date.now()
              });
              return;
            }

            if (type === 'STATE_UPDATE') {
              playSyntheticBeep(1200, 0.04);
              setRealtimeSyncToast({
                message: 'Información táctica recibida y sincronizada en tiempo real desde terminal remota.',
                timestamp: Date.now()
              });
            }

            if (type === 'HEARTBEAT_PONG' && payload?.clientSentAt) {
              const rtt = Math.max(1, Math.round(Date.now() - payload.clientSentAt));
              setNetworkLatencyMs(rtt);
              window.dispatchEvent(new CustomEvent('network-latency-update', { detail: { latencyMs: rtt } }));
              return;
            }

            if (type === 'INIT' || type === 'STATE_UPDATE' || type === 'SYSTEM_UPGRADE_ALERT') {
              handleStateSyncRef.current(payload, type === 'INIT');
            }
          } catch (err) {
            console.warn('[PII-LCC Network] Warning parsing incoming sync package:', err);
          }
        };

        // Periodic heartbeat & RTT latency ping
        heartbeatInterval = setInterval(() => {
          if (socket && socket.readyState === WebSocket.OPEN) {
            try {
              socket.send(JSON.stringify({
                type: 'DEVICE_HEARTBEAT',
                payload: {
                  deviceId: getOrCreateDeviceId(),
                  deviceName: getDeviceName(),
                  installedVersion: appVersion,
                  platform: detectSyncPlatform(),
                  role: user ? user.role : 'ROL_CEO',
                  userName: user?.name,
                  latencyMs: networkLatencyMs ?? 18
                }
              }));
              socket.send(JSON.stringify({
                type: 'HEARTBEAT_PING',
                payload: {
                  clientSentAt: Date.now(),
                  deviceId: getOrCreateDeviceId(),
                  latencyMs: networkLatencyMs ?? 18
                }
              }));
            } catch {}
          }
        }, 8000);

        socket.onclose = () => {
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
          }
          if (isCleanedUp) return;
          if (reconnectTimeout) clearTimeout(reconnectTimeout);
          console.warn('[PII-LCC Network] Connection interrupted. Re-establishing secure link in 3s...');
          reconnectTimeout = setTimeout(connect, 3000);
        };

        socket.onerror = (err) => {
          console.warn('[PII-LCC Network] WebSocket link unreachable. Operating in secure HTTP Sync Fallback mode.', err);
        };
      } catch (wsErr) {
        console.warn('[PII-LCC Network] Could not initialize WebSocket constructor on this device:', wsErr);
        if (!isCleanedUp) {
          if (reconnectTimeout) clearTimeout(reconnectTimeout);
          reconnectTimeout = setTimeout(connect, 5000);
        }
      }
    };

    connect();

    const handleOnline = () => {
      console.log('[PII-LCC Network] Device online event detected. Restoring links and flushing queue.');
      if (!socket || socket.readyState === WebSocket.CLOSED) {
        connect();
      } else {
        drainActionQueue();
      }
    };
    window.addEventListener('online', handleOnline);

    return () => {
      isCleanedUp = true;
      window.removeEventListener('online', handleOnline);
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (socket) {
        socket.onclose = null;
        socket.onerror = null;
        socket.close();
      }
    };
  }, [drainActionQueue, appVersion, user]);

  // Global Supabase Realtime Cloud Mesh (Presence + Live Bidirectional Interaction across Vercel, PWAs & AI Studio)
  useEffect(() => {
    cloudRealtimeMesh.connect({
      deviceId: getOrCreateDeviceId(),
      deviceName: getDeviceName(),
      installedVersion: appVersion,
      platform: detectSyncPlatform(),
      role: user ? user.role : selectedLoginRole || 'ROL_CEO',
      userName: user?.name
    });

    const handleSyncedDevicesEvent = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (Array.isArray(detail?.devices)) {
        const online = detail.devices.filter((d: any) => d.isOnline).length;
        setSyncedDevicesCount(Math.max(1, online));
      }
    };

    const handleTerminalJoined = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail?.deviceName) {
        playSyntheticBeep(980, 0.08);
        setRealtimeSyncToast({
          message: `Terminal conectada: ${detail.deviceName}${detail.userName ? ` (${detail.userName})` : ''} [${detail.role || 'OPERADOR'}]`,
          timestamp: Date.now()
        });
      }
    };

    const unsubscribeAction = cloudRealtimeMesh.onAction((packet: CloudMeshActionPacket) => {
      const { type, payload, senderDeviceName } = packet;
      if (!type) return;

      switch (type) {
        case 'SEND_FIELD_REPORT': {
          const report = payload?.report;
          if (report?.id) {
            setRawAlerts(prev => {
              if (prev.some(a => a.id === report.id)) return prev;
              const next = [report, ...prev];
              safeLocalStorage.setItem('PII_LCC_RAW_ALERTS', JSON.stringify(next));
              return next;
            });
            playSyntheticBeep(1100, 0.06);
            setRealtimeSyncToast({
              message: `Reporte crudo S-2 recibido de ${senderDeviceName}: ${report.sourceName || 'Reporte táctico'}`,
              timestamp: Date.now()
            });
          }
          break;
        }
        case 'UPDATE_ALERT_STATUS': {
          if (payload?.id && payload?.status) {
            setRawAlerts(prev => prev.map(a => (a.id === payload.id ? { ...a, status: payload.status } : a)));
          }
          break;
        }
        case 'PROMOTE_TO_INTEL': {
          const intel = payload?.intel;
          if (intel?.id) {
            setActionableIntel(prev => (prev.some(i => i.id === intel.id) ? prev : [intel, ...prev]));
            if (intel.rawAlertId) {
              setRawAlerts(prev =>
                prev.map(a =>
                  a.id === intel.rawAlertId
                    ? {
                        ...a,
                        status: 'PROCESSED',
                        reliability: payload?.updatedReliability || a.reliability,
                        certainty: payload?.updatedCertainty || a.certainty,
                        clandestineRouteId: payload?.routeId || a.clandestineRouteId
                      }
                    : a
                )
              );
            }
            playSyntheticBeep(1050, 0.06);
            setRealtimeSyncToast({
              message: `Inteligencia CFI validada desde ${senderDeviceName}: ${intel.title}`,
              timestamp: Date.now()
            });
          }
          break;
        }
        case 'ARCHIVE_INTEL': {
          if (payload?.id) {
            setActionableIntel(prev =>
              prev.map(i => (i.id === payload.id ? { ...i, status: 'ARCHIVED' as any } : i))
            );
          }
          break;
        }
        case 'CREATE_ORDER': {
          const order = payload?.order;
          if (order?.id) {
            setActiveOrders(prev => (prev.some(o => o.id === order.id) ? prev : [order, ...prev]));
            playSyntheticBeep(1200, 0.08);
            setRealtimeSyncToast({
              message: `Nueva Orden OOA emitida desde ${senderDeviceName}: ${order.codeName}`,
              timestamp: Date.now()
            });
          }
          break;
        }
        case 'CANCEL_ORDER': {
          if (payload?.id) {
            setActiveOrders(prev =>
              prev.map(o =>
                o.id === payload.id
                  ? {
                      ...o,
                      status: 'CANCELLED',
                      updates: payload.updateMsg ? [...(o.updates || []), payload.updateMsg] : o.updates
                    }
                  : o
              )
            );
          }
          break;
        }
        case 'CONFIRM_ORDER': {
          if (payload?.id && payload?.newStatus) {
            setActiveOrders(prev =>
              prev.map(o =>
                o.id === payload.id
                  ? {
                      ...o,
                      status: payload.newStatus,
                      updates: payload.statusText
                        ? [...(o.updates || []), `${new Date().toLocaleTimeString('es-BO')}: ${payload.statusText}`]
                        : o.updates
                    }
                  : o
              )
            );
            if (payload.unitName && payload.unitStatus) {
              setTacticalUnits(prev =>
                prev.map(u => (u.name === payload.unitName ? { ...u, status: payload.unitStatus } : u))
              );
            }
          }
          break;
        }
        case 'ORDER_UPDATE': {
          if (payload?.orderId && payload?.updateMsg) {
            setActiveOrders(prev =>
              prev.map(o =>
                o.id === payload.orderId
                  ? { ...o, updates: [...(o.updates || []), payload.updateMsg] }
                  : o
              )
            );
          }
          break;
        }
        case 'SAVE_EXPEDIENTE': {
          const exp = payload?.expediente;
          if (exp?.id) {
            setExpedientes(prev => {
              const exists = prev.some(e => e.id === exp.id);
              const next = exists ? prev.map(e => (e.id === exp.id ? exp : e)) : [exp, ...prev];
              safeStorage.setItem('pii_lcc_expedientes', JSON.stringify(next));
              return next;
            });
          }
          break;
        }
        case 'DELETE_EXPEDIENTE': {
          if (payload?.expedienteId) {
            setExpedientes(prev => {
              const next = prev.filter(e => e.id !== payload.expedienteId);
              safeStorage.setItem('pii_lcc_expedientes', JSON.stringify(next));
              return next;
            });
          }
          break;
        }
        case 'ADD_TACTICAL_UNIT': {
          const unit = payload?.unit;
          if (unit?.id) {
            setTacticalUnits(prev => {
              if (prev.some(u => u.id === unit.id)) return prev;
              const next = [...prev, unit];
              safeLocalStorage.setItem('PII_LCC_TACTICAL_UNITS', JSON.stringify(next));
              return next;
            });
            playSyntheticBeep(920, 0.06);
            setRealtimeSyncToast({
              message: `Patrulla registrada desde ${senderDeviceName}: ${unit.name}`,
              timestamp: Date.now()
            });
          }
          break;
        }
        case 'UPDATE_TACTICAL_UNIT': {
          if (payload?.unitId && payload?.updates) {
            setTacticalUnits(prev => {
              const next = prev.map(u => (u.id === payload.unitId ? { ...u, ...payload.updates } : u));
              safeLocalStorage.setItem('PII_LCC_TACTICAL_UNITS', JSON.stringify(next));
              return next;
            });
          }
          break;
        }
        case 'DELETE_TACTICAL_UNIT': {
          if (payload?.unitId) {
            setTacticalUnits(prev => {
              const next = prev.filter(u => u.id !== payload.unitId);
              safeLocalStorage.setItem('PII_LCC_TACTICAL_UNITS', JSON.stringify(next));
              return next;
            });
          }
          break;
        }
        case 'UPDATE_UNIT_COORDINATES': {
          if (payload?.newCoords && (payload?.unitId || payload?.unitName)) {
            setTacticalUnits(prev => {
              const next = prev.map(u =>
                (payload.unitId && u.id === payload.unitId) || (payload.unitName && u.name === payload.unitName)
                  ? { ...u, coordinates: payload.newCoords, lastReportTime: new Date().toISOString() }
                  : u
              );
              safeLocalStorage.setItem('PII_LCC_TACTICAL_UNITS', JSON.stringify(next));
              return next;
            });
            playSyntheticBeep(1150, 0.05);
            setRealtimeSyncToast({
              message: `GPS actualizado por ${senderDeviceName}: ${payload.unitName || 'Patrulla'} → ${payload.newCoords}`,
              timestamp: Date.now()
            });
          }
          break;
        }
        case 'SYNC_TACTICAL_UNITS': {
          if (Array.isArray(payload?.units) && payload.units.length > 0) {
            setTacticalUnits(payload.units);
            safeLocalStorage.setItem('PII_LCC_TACTICAL_UNITS', JSON.stringify(payload.units));
          }
          break;
        }
        case 'TACTICAL_RADIO_MESSAGE': {
          if (payload?.commsMessage) {
            window.dispatchEvent(new CustomEvent('tactical-comms-message', { detail: payload.commsMessage }));
            playSyntheticBeep(880, 0.08);
            setRealtimeSyncToast({
              message: `Radio (${payload.commsMessage.senderName || senderDeviceName}): "${String(payload.commsMessage.text || '').slice(0, 48)}"`,
              timestamp: Date.now()
            });
          }
          break;
        }
        case 'LOG_AUDIT_ACTION': {
          const entry = payload?.logEntry;
          if (entry?.id && !sentLogsRef.current.has(entry.id)) {
            sentLogsRef.current.add(entry.id);
            setAuditLogs(prev => (prev.some(l => l.id === entry.id) ? prev : [entry, ...prev].slice(0, 200)));
          }
          break;
        }
        case 'TRIGGER_FORCE_BROADCAST': {
          // Respond with our current tactical snapshot so requesting terminal receives live peer state on Vercel too
          cloudRealtimeMesh.broadcastAction('FULL_STATE_SNAPSHOT', latestTacticalSnapshotRef.current);
          break;
        }
        case 'FULL_STATE_SNAPSHOT': {
          if (payload && typeof payload === 'object') {
            handleStateSyncRef.current(payload, false);
          }
          break;
        }
      }
    });

    window.addEventListener('synced-devices-update', handleSyncedDevicesEvent);
    window.addEventListener('cloud-mesh-terminal-joined', handleTerminalJoined);

    return () => {
      unsubscribeAction();
      window.removeEventListener('synced-devices-update', handleSyncedDevicesEvent);
      window.removeEventListener('cloud-mesh-terminal-joined', handleTerminalJoined);
    };
  }, [appVersion, user, selectedLoginRole]);

  // Keep Cloud Realtime Mesh identity synchronized when operator logs in/changes role
  useEffect(() => {
    cloudRealtimeMesh.updateIdentity({
      deviceName: getDeviceName(),
      installedVersion: appVersion,
      role: user ? user.role : selectedLoginRole || 'ROL_CEO',
      userName: user?.name
    });
  }, [user, selectedLoginRole, appVersion]);

  // HTTP fallback polling loop with backoff (automatically skipped on static Vercel hosts where Cloud Realtime Mesh is active)
  useEffect(() => {
    let pollInterval: any;

    const performPoll = async () => {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
      if (!expressSyncAvailableRef.current) return;
      if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
        return;
      }

      try {
        const hubUrl = getActiveSyncHubUrl();
        const syncEndpoint = `${hubUrl}/api/sync`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        const response = await fetch(syncEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Device-Id': getOrCreateDeviceId(),
            'X-Device-Name': encodeURIComponent(getDeviceName()),
            'X-App-Version': appVersion,
            'X-Platform': detectSyncPlatform()
          },
          body: JSON.stringify({}),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        const ct = response.headers.get('content-type') || '';
        if (response.ok && ct.includes('application/json')) {
          const state = await response.json();
          handleStateSyncRef.current(state);
        } else if (response.status === 404 || response.status === 405) {
          expressSyncAvailableRef.current = false;
        }
      } catch {
        // Non-blocking — CloudRealtimeMesh handles cross-device sync
      }
    };

    const initialTimer = setTimeout(performPoll, 3500);
    pollInterval = setInterval(performPoll, 8000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(pollInterval);
    };
  }, [appVersion]);

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

  // Keep latest tacticalUnits ref for async Supabase reconciliation
  const tacticalUnitsRef = useRef<TacticalUnit[]>(tacticalUnits);
  useEffect(() => {
    tacticalUnitsRef.current = tacticalUnits;
  }, [tacticalUnits]);

  // Hydrate and reconcile Tactical Units (patrols + GPS positions) with Supabase Cloud on startup
  useEffect(() => {
    let cancelled = false;
    const hydrateUnitsFromSupabase = async () => {
      const remoteUnits = await fetchTacticalUnitsFromSupabase();
      if (cancelled || !remoteUnits) return;

      const currentLocal = tacticalUnitsRef.current;

      if (remoteUnits.length === 0) {
        // Seed Supabase `tactical_units` immediately if empty
        if (currentLocal.length > 0) {
          upsertAllTacticalUnitsInSupabase(currentLocal).catch(() => {});
        }
        return;
      }

      // Merge remote Supabase units with any local-only units not yet uploaded
      const mergedMap = new Map<string, TacticalUnit>();
      const missingInCloud: TacticalUnit[] = [];

      remoteUnits.forEach(ru => {
        if (ru && ru.id) mergedMap.set(ru.id, ru);
      });

      currentLocal.forEach(lu => {
        if (!lu || !lu.id) return;
        const alreadyById = mergedMap.has(lu.id);
        const alreadyByName = Array.from(mergedMap.values()).some(
          r => r.name.trim().toLowerCase() === lu.name.trim().toLowerCase()
        );
        if (!alreadyById && !alreadyByName) {
          mergedMap.set(lu.id, lu);
          missingInCloud.push(lu);
        }
      });

      const mergedList = Array.from(mergedMap.values());
      setTacticalUnits(mergedList);
      safeLocalStorage.setItem('PII_LCC_TACTICAL_UNITS', JSON.stringify(mergedList));

      if (missingInCloud.length > 0) {
        upsertAllTacticalUnitsInSupabase(missingInCloud).catch(() => {});
      }

      // Ensure local server & connected devices also receive cloud-persisted patrols
      sendWsMessageRef.current?.('SYNC_TACTICAL_UNITS', { units: mergedList });
    };

    hydrateUnitsFromSupabase();
    return () => {
      cancelled = true;
    };
  }, []);

  // Hydrate per-module backgrounds from IndexedDB/localStorage, then reconcile with server
  useEffect(() => {
    loadModuleBackgroundsLocal().then(localMap => {
      if (localMap && Object.keys(localMap).length > 0) {
        setModuleBackgrounds(localMap);
      }
      fetchServerModuleBackgrounds().then(serverMap => {
        if (serverMap && Object.keys(serverMap).length > 0) {
          setModuleBackgrounds(prev => ({ ...prev, ...serverMap }));
        }
      });
    });
  }, []);
  
  // Administrator oversight state: CEO-LCC Mando can inspect any Search Organ
  const [adminSupervisedOrgan, setAdminSupervisedOrgan] = useState<MilitaryRole | null>(null);

  // Current active role equals user's role if logged in, or selectedLoginRole otherwise
  const currentRole = isAuthenticated && user ? user.role : selectedLoginRole;

  // Resolve current active tactical module based on active tab and operator role
  const effectiveModuleRole = currentRole === 'ROL_CEO' && adminSupervisedOrgan ? adminSupervisedOrgan : currentRole;
  const activeModuleId: TacticalModuleId = resolveActiveModuleId(activeWorkspaceTab, effectiveModuleRole);
  const activeModuleMeta = TACTICAL_MODULES_LIST.find(m => m.id === activeModuleId);

  // Handlers for Module Backgrounds management with cross-device sync
  const handleUpdateModuleBackground = async (
    moduleId: TacticalModuleId,
    updates: Partial<ModuleBackgroundConfig>,
    imageBase64?: string
  ) => {
    const current = moduleBackgrounds[moduleId] || createDefaultModuleBackgrounds()[moduleId];
    const updated: ModuleBackgroundConfig = {
      ...current,
      ...updates,
      moduleId,
      updatedAt: new Date().toISOString()
    };

    if (imageBase64) {
      updated.dataUrl = imageBase64;
    } else if (updates.imageUrl && !updates.dataUrl && !imageBase64) {
      delete updated.dataUrl;
    }

    setModuleBackgrounds(prev => ({
      ...prev,
      [moduleId]: updated
    }));
    await saveModuleBackgroundLocal(updated);

    try {
      const serverConfig = await uploadModuleBackgroundToServer(updated, imageBase64);
      if (serverConfig) {
        setModuleBackgrounds(prev => ({
          ...prev,
          [moduleId]: serverConfig
        }));
      }
    } catch (err) {
      console.warn('Server background sync warning (offline mode):', err);
    }
  };

  const handleResetModuleBackground = async (moduleId: TacticalModuleId) => {
    const resetConfig = await resetModuleBackground(moduleId);
    setModuleBackgrounds(prev => ({
      ...prev,
      [moduleId]: resetConfig
    }));
  };

  const handleApplyToAllModules = async (sourceModuleId: TacticalModuleId) => {
    const source = moduleBackgrounds[sourceModuleId];
    if (!source) return;

    const newMap: Partial<ModuleBackgroundsMap> = {};
    for (const mod of TACTICAL_MODULES_LIST) {
      const copyConfig: ModuleBackgroundConfig = {
        ...source,
        moduleId: mod.id,
        moduleName: mod.name,
        updatedAt: new Date().toISOString()
      };
      newMap[mod.id] = copyConfig;
      await saveModuleBackgroundLocal(copyConfig);
    }

    setModuleBackgrounds(newMap as ModuleBackgroundsMap);

    try {
      await fetch('/api/module-backgrounds/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backgrounds: newMap })
      });
    } catch (e) {
      console.warn('Server batch save warning:', e);
    }
  };

  const handleBatchImportBackgrounds = (importedMap: ModuleBackgroundsMap) => {
    setModuleBackgrounds(prev => ({
      ...prev,
      ...importedMap
    }));
  };

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
      console.warn('[Clock Sync] Server clock unavailable (using local device clock):', err);
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
        const nowIso = new Date().toISOString();
        setTacticalUnits(prev => {
          const next = prev.map(unit =>
            unit.name === orderObj.assignedUnit ? { ...unit, status: 'STATIONARY' as const, lastReportTime: nowIso } : unit
          );
          safeLocalStorage.setItem('PII_LCC_TACTICAL_UNITS', JSON.stringify(next));
          const updatedTarget = next.find(u => u.name === orderObj.assignedUnit);
          if (updatedTarget) upsertTacticalUnitInSupabase(updatedTarget).catch(() => {});
          return next;
        });
      }
    } else if (newStatus === 'IN_PROGRESS') {
      const orderObj = activeOrders.find(o => o.id === id);
      if (orderObj) {
        unitName = orderObj.assignedUnit;
        unitStatus = 'INTERCEPTING';
        const nowIso = new Date().toISOString();
        setTacticalUnits(prev => {
          const next = prev.map(unit =>
            unit.name === orderObj.assignedUnit ? { ...unit, status: 'INTERCEPTING' as const, lastReportTime: nowIso } : unit
          );
          safeLocalStorage.setItem('PII_LCC_TACTICAL_UNITS', JSON.stringify(next));
          const updatedTarget = next.find(u => u.name === orderObj.assignedUnit);
          if (updatedTarget) upsertTacticalUnitInSupabase(updatedTarget).catch(() => {});
          return next;
        });
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
    sendWsMessage('SAVE_EXPEDIENTE', { expediente: newExp });
    sendWsMessage('LOG_AUDIT_ACTION', { logEntry });
  };

  const handleDeleteExpediente = (expedienteId: string) => {
    setExpedientes(prev => {
      const updated = prev.filter(e => e.id !== expedienteId);
      try {
        safeStorage.setItem('pii_lcc_expedientes', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to persist expedientes:', e);
      }
      return updated;
    });

    const logEntry: AuditLogEntry = {
      id: `log-exp-del-${Date.now()}`,
      userId: user ? user.name : 'ANALISTA LCC',
      role: currentRole,
      action: `Expediente ${expedienteId} archivado/retirado del registro activo`,
      timestamp: new Date().toISOString(),
      coordinates: '19°13\'10"S 68°35\'50"W'
    };
    setAuditLogs(prev => [logEntry, ...prev]);
    sendWsMessage('DELETE_EXPEDIENTE', { expedienteId });
    sendWsMessage('LOG_AUDIT_ACTION', { logEntry });
  };

  const handleSendFieldReport = (report: RawAlert) => {
    if (!validateBackendPermission('ROL_PATRULLA', 'Enviar Registro de Búsqueda de Campo (S-2)', report.coordinates)) return;
    setRawAlerts(prev => {
      const next = prev.some(a => a.id === report.id) ? prev : [report, ...prev];
      safeLocalStorage.setItem('PII_LCC_RAW_ALERTS', JSON.stringify(next));
      return next;
    });
    sendWsMessage('SEND_FIELD_REPORT', { report });
    void upsertRawAlertInSupabase(report);
  };

  const handleUpdateUnitCoordinates = (unitNameOrId: string, newCoords: string) => {
    if (!validateBackendPermission('ROL_PATRULLA', `Actualizar Posición GPS de la Unidad: ${unitNameOrId}`, newCoords)) return;
    const targetNorm = unitNameOrId.trim().toLowerCase();
    const nowIso = new Date().toISOString();
    let matchedUnit: TacticalUnit | null = null;

    setTacticalUnits(prev => {
      const next = prev.map(unit => {
        const isMatch = unit.id === unitNameOrId || unit.name.trim().toLowerCase() === targetNorm;
        if (isMatch) {
          const updated: TacticalUnit = { ...unit, coordinates: newCoords, lastReportTime: nowIso };
          matchedUnit = updated;
          return updated;
        }
        return unit;
      });
      safeLocalStorage.setItem('PII_LCC_TACTICAL_UNITS', JSON.stringify(next));
      return next;
    });

    const fallbackUnit = matchedUnit || tacticalUnitsRef.current.find(
      u => u.id === unitNameOrId || u.name.trim().toLowerCase() === targetNorm
    );
    const unitToSave = matchedUnit || (fallbackUnit ? { ...fallbackUnit, coordinates: newCoords, lastReportTime: nowIso } : null);

    sendWsMessage('UPDATE_UNIT_COORDINATES', {
      unitName: unitToSave?.name || unitNameOrId,
      unitId: unitToSave?.id,
      newCoords
    });

    if (unitToSave) {
      upsertTacticalUnitInSupabase(unitToSave).catch(err => {
        console.warn('[App] Error guardando coordenadas de patrulla en Supabase:', err);
      });
    }
  };

  const handleAddTacticalUnit = (unit: TacticalUnit) => {
    if (!validateBackendPermission('ROL_BUSQUEDA', `Desplegar Nueva Patrulla Táctica: ${unit.name}`, unit.coordinates)) return;
    const nowIso = new Date().toISOString();
    const normalizedUnit: TacticalUnit = {
      ...unit,
      id: unit.id || `unit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: unit.name.trim(),
      lastReportTime: nowIso,
      createdAt: unit.createdAt || nowIso
    };

    setTacticalUnits(prev => {
      const existsIdx = prev.findIndex(
        u => u.id === normalizedUnit.id || u.name.trim().toLowerCase() === normalizedUnit.name.toLowerCase()
      );
      let next: TacticalUnit[];
      if (existsIdx >= 0) {
        next = prev.map((u, idx) => (idx === existsIdx ? { ...u, ...normalizedUnit, id: u.id } : u));
      } else {
        next = [...prev, normalizedUnit];
      }
      safeLocalStorage.setItem('PII_LCC_TACTICAL_UNITS', JSON.stringify(next));
      return next;
    });

    sendWsMessage('ADD_TACTICAL_UNIT', { unit: normalizedUnit, userId: currentRole, role: currentRole });

    upsertTacticalUnitInSupabase(normalizedUnit).then(res => {
      if (res.ok) {
        setRealtimeSyncToast({
          message: `Patrulla "${normalizedUnit.name}" guardada y sincronizada con Supabase Cloud.`,
          timestamp: Date.now()
        });
      }
    });
  };

  const handleUpdateTacticalUnit = (unit: TacticalUnit) => {
    if (!validateBackendPermission('ROL_BUSQUEDA', `Actualizar Datos de Patrulla: ${unit.name}`, unit.coordinates)) return;
    const normalizedUnit: TacticalUnit = {
      ...unit,
      name: unit.name.trim(),
      lastReportTime: new Date().toISOString()
    };

    setTacticalUnits(prev => {
      const exists = prev.some(u => u.id === normalizedUnit.id);
      const next = exists
        ? prev.map(u => (u.id === normalizedUnit.id ? normalizedUnit : u))
        : [...prev, normalizedUnit];
      safeLocalStorage.setItem('PII_LCC_TACTICAL_UNITS', JSON.stringify(next));
      return next;
    });

    sendWsMessage('UPDATE_TACTICAL_UNIT', { unitId: normalizedUnit.id, updates: normalizedUnit, userId: currentRole, role: currentRole });

    upsertTacticalUnitInSupabase(normalizedUnit).then(res => {
      if (res.ok) {
        setRealtimeSyncToast({
          message: `Cambios de "${normalizedUnit.name}" guardados en Supabase Cloud.`,
          timestamp: Date.now()
        });
      }
    });
  };

  const handleDeleteTacticalUnit = (unitId: string) => {
    if (!validateBackendPermission('ROL_BUSQUEDA', `Replegar Patrulla Táctica ID: ${unitId}`, '19°13\'10"S 68°35\'50"W')) return;
    setTacticalUnits(prev => {
      const next = prev.filter(u => u.id !== unitId);
      safeLocalStorage.setItem('PII_LCC_TACTICAL_UNITS', JSON.stringify(next));
      return next;
    });
    sendWsMessage('DELETE_TACTICAL_UNIT', { unitId, userId: currentRole, role: currentRole });
    deleteTacticalUnitFromSupabase(unitId).catch(err => {
      console.warn('[App] Error eliminando patrulla en Supabase:', err);
    });
  };

  const handleLoginSuccess = (role: MilitaryRole) => {
    setSelectedLoginRole(role);
    setAdminSupervisedOrgan(null);
    setActiveWorkspaceTab('OPERATIONS');
    setShowMultiDeviceSyncModal(false);
    playCyberModuleTransition(role);
  };

  const handleSetRoleAttempt = (role: MilitaryRole) => {
    if (currentRole === 'ROL_CEO') {
      setAdminSupervisedOrgan(role === 'ROL_CEO' ? null : role);
      playCyberModuleTransition(role);
      return;
    }
    playCyberModuleTransition(role);
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
      auditLogs,
      moduleBackgrounds
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

  const downloadRealDeviceKmlFromApp = async () => {
    setShowDownloadMenu(false);
    playSyntheticBeep(950, 0.12);
    try {
      const loc = await requestDeviceLocation();
      const kml = generateDeviceRealLocationKml({
        lat: loc.lat,
        lon: loc.lon,
        accuracy: loc.accuracy,
        altitude: loc.altitude,
        speed: loc.speed,
        heading: loc.heading,
        operatorName: user ? user.name : 'Operador Táctico PII-LCC',
        role: currentRole,
        devicePlatform: detectDevicePlatform(),
        timestamp: loc.isoTime
      });
      downloadKmlFile(`PII-LCC_Ubicacion_Real_Dispositivo_${loc.isoTime.substring(0, 10)}`, kml);
      playCyberAccessGranted();
    } catch (err) {
      console.warn('GPS location request error, falling back to cached:', err);
      const cached = getCachedDeviceLocation();
      const lat = cached?.lat || -19.219444;
      const lon = cached?.lon || -68.597222;
      const kml = generateDeviceRealLocationKml({
        lat,
        lon,
        accuracy: cached?.accuracy || null,
        altitude: cached?.altitude || null,
        operatorName: user ? user.name : 'Operador Táctico PII-LCC',
        role: currentRole,
        devicePlatform: detectDevicePlatform(),
        timestamp: new Date().toISOString()
      });
      downloadKmlFile(`PII-LCC_Ubicacion_Real_Dispositivo_${new Date().toISOString().substring(0, 10)}`, kml);
      playCyberAccessGranted();
    }
  };

  // Always display TERMINAL DE ACCESO Y AUTENTICACIÓN until operator authenticates
  if (!isAuthenticated) {
    return (
      <>
        <MilitaryLoginView 
          onLoginSuccess={handleLoginSuccess}
          moduleBackgrounds={moduleBackgrounds}
          onUpdateModuleBackground={handleUpdateModuleBackground}
          onResetModuleBackground={handleResetModuleBackground}
          onApplyToAllModules={handleApplyToAllModules}
          onBatchImportModules={handleBatchImportBackgrounds}
          syncedDevicesCount={syncedDevicesCount}
          onOpenSyncModal={() => setShowMultiDeviceSyncModal(true)}
        />
        <MultiDeviceSyncModal
          isOpen={showMultiDeviceSyncModal}
          onClose={() => setShowMultiDeviceSyncModal(false)}
          appVersion={appVersion}
          isOnline={typeof navigator !== 'undefined' ? navigator.onLine : true}
          onTriggerSyncNow={async () => {
            await sendWsMessage('TRIGGER_FORCE_BROADCAST', {});
          }}
          clansCount={clans.length}
          alertsCount={rawAlerts.length}
          ordersCount={activeOrders.length}
          unitsCount={tacticalUnits.length}
          expedientesCount={expedientes.length}
        />
      </>
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

      {/* Per-Module Background: Strictly bound to current active tactical module with cross-device synchronization */}
      <ModuleBackgroundLayer 
        activeModuleId={activeModuleId} 
        config={moduleBackgrounds[activeModuleId]} 
        onOpenManager={() => setShowTacticalBgModal(true)} 
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

            {/* Unified Tactical Background Customizer Trigger */}
            <button
              type="button"
              id="btn-tactical-bg-manager"
              onClick={() => {
                setShowTacticalBgModal(true);
                playSyntheticBeep(880, 0.08);
              }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border font-mono text-xs transition-all cursor-pointer bg-emerald-950/60 hover:bg-emerald-900/80 border-emerald-500/60 hover:border-emerald-400 text-emerald-300 shadow-[0_0_14px_rgba(16,185,129,0.2)] active:scale-95"
              title="Personalizar y Editar Fondo Táctico (Fondo de Interfaz y Fondos de Módulos)"
            >
              <Palette className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <div className="flex flex-col text-left leading-none">
                <span className="text-[10px] font-bold text-white tracking-wider">FONDO TÁCTICO</span>
                <span className="text-[9px] text-emerald-400/90 font-mono truncate max-w-[120px]">
                  {Math.round(fullBgState.settings.opacity * 100)}% • {activeModuleMeta?.badge || 'MODULAR'}
                </span>
              </div>
            </button>

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

            {/* Tactical Version, Update Monitor & Cloud Sync */}
            <TacticalUpdateManager 
              currentVersion={appVersion}
              onOpenInstallModal={() => setShowInstallModal(true)}
            />

            <div className="h-8 w-px bg-zinc-800/80"></div>

            {/* Top-Right Intact ECEME Graphic ("SER ANTES QUE PARECER") */}
            <HeaderTopRightLogo size={46} />
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
              currentRole === 'ROL_CEO' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]' :
              currentRole === 'ROL_FUSION' ? 'bg-[#f97316]/10 text-[#f97316] border border-[#f97316]/20' :
              currentRole === 'ROL_BUSQUEDA' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
              'bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20'
            }`}>
              {currentRole === 'ROL_CEO' ? <Crown className="w-4 h-4 text-blue-400" /> : <UserIcon className="w-4 h-4" />}
            </div>
            <div className="text-left font-mono flex-1">
              <span className="text-[9px] text-[#666] uppercase block leading-none">Operador Militar Activo:</span>
              <span className="text-xs font-bold text-white block mt-0.5">
                {currentRole === 'ROL_CEO' && 'GRAL. E. MARTÍNEZ (ADMIN)'}
                {currentRole === 'ROL_FUSION' && 'TTE. CNEL. S. ROJAS (CFI)'}
                {currentRole === 'ROL_BUSQUEDA' && 'MY. R. VARGAS (S-2)'}
                {(currentRole === 'ROL_TERRENO' || currentRole === 'ROL_PATRULLA') && 'CB1. F. VALENZUELA (PATRULLA)'}
              </span>
              <span className="text-[9px] text-slate-500 flex items-center gap-1 mt-0.5">
                {currentRole === 'ROL_CEO' && (
                  <span className="text-blue-400 font-bold flex items-center gap-1">
                    👑 CEO-LCC MANDO (ADMIN)
                  </span>
                )}
                {currentRole === 'ROL_FUSION' && 'ÓRGANO DE FUSIÓN (CFI)'}
                {currentRole === 'ROL_BUSQUEDA' && 'ÓRGANO DE BÚSQUEDA S-2'}
                {(currentRole === 'ROL_TERRENO' || currentRole === 'ROL_PATRULLA') && 'ÓRGANO DE BÚSQUEDA EN TERRENO'}
              </span>
            </div>
          </div>

          {/* System Tactical Actions Toolbar (Fully Accessible on Mobile & Desktop) */}
          {isAuthenticated && (
            <div className="flex items-center flex-wrap gap-2 relative">
              {/* Admin-Only User Management Button (CEO-LCC Mando) */}
              {(currentRole === 'ROL_CEO' || user?.isAdmin) && (
                <button
                  onClick={() => {
                    setShowUserManagementModal(true);
                    playCyberClick('laser', 0.08);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-950/70 hover:bg-blue-900 text-blue-300 hover:text-white border border-blue-500/70 shadow-[0_0_12px_rgba(59,130,246,0.3)] transition-all cursor-pointer text-xs font-mono font-bold whitespace-nowrap active:scale-95"
                  title="Módulo de Administración de Usuarios, Órganos de Búsqueda y Claves Criptográficas (CEO-LCC Mando)"
                >
                  <Crown className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden sm:inline">Gestión Usuarios</span>
                  <span className="sm:hidden">Usuarios</span>
                  <span className="text-[9px] bg-blue-600 text-white px-1 py-0.2 rounded font-black">ADMIN</span>
                </button>
              )}

              {/* Clan Intelligence Database & Expansion Button (Accessible to all modules) */}
              <button
                onClick={() => {
                  setShowClanManagementModal(true);
                  playCyberClick('laser', 0.08);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 hover:border-emerald-500/60 transition-all cursor-pointer text-xs font-mono font-bold whitespace-nowrap active:scale-95"
                title="Base de Datos e Incremento de Clanes y Rutas Ilícitas"
              >
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden lg:inline">Clanes ({clans.length})</span>
                <span className="lg:hidden">Clanes</span>
              </button>

              {/* Centralized Data Storage & Backup Persistence Button */}
              <button
                onClick={() => {
                  setShowDataStorageModal(true);
                  playCyberClick('laser', 0.08);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 hover:text-white border border-emerald-600/70 shadow-[0_0_10px_rgba(16,185,129,0.2)] transition-all cursor-pointer text-xs font-mono font-bold whitespace-nowrap active:scale-95"
                title="Almacenamiento, Respaldo y Persistencia Integral de Datos Generados en PII-LCC"
              >
                <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden md:inline">Almacenamiento</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping hidden sm:inline-block" />
              </button>

              {/* Supabase Cloud Integration Button */}
              <button
                onClick={() => {
                  setShowSupabaseModal(true);
                  playCyberClick('laser', 0.08);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 hover:text-white border border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all cursor-pointer text-xs font-mono font-bold whitespace-nowrap active:scale-95"
                title="Integración y Sincronización con Base de Datos Supabase (PostgreSQL Cloud)"
              >
                <Cloud className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span className="hidden xl:inline">Supabase BD</span>
                <span className="xl:hidden">Supabase</span>
                <span className="text-[9px] bg-emerald-500/30 text-emerald-300 px-1 py-0.2 rounded border border-emerald-500/40 font-mono">
                  CLOUD
                </span>
              </button>

              {/* Real-Time Hybrid P2P / Relay Fleet Monitor & Sync Button */}
              <button
                type="button"
                id="btn-header-sync-fleet"
                onClick={() => {
                  setShowNetworkPresenceMonitor(true);
                  playCyberClick('laser', 0.08);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-950/70 hover:bg-cyan-900 text-cyan-300 hover:text-white border border-cyan-500/70 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all cursor-pointer text-xs font-mono font-bold whitespace-nowrap active:scale-95"
                title="Monitor de Red P2P / Relevo: Ver y Transmitir Información en Tiempo Real (Alertas, Órdenes, GPS y Chat)"
              >
                <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span className="hidden lg:inline">Monitor Red en Vivo</span>
                <span className="lg:hidden">En Red</span>
                <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.2 rounded font-bold border border-cyan-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  {syncedDevicesCount}
                </span>
                <span className="hidden sm:inline text-[9px] text-emerald-400 font-mono font-bold bg-emerald-950/50 px-1.5 py-0.2 rounded border border-emerald-500/30">
                  {networkLatencyMs ? `${networkLatencyMs}ms` : '18ms'}
                </span>
              </button>

              {/* Copy Source Code Global Button */}
              <button
                type="button"
                id="btn-header-copy-code"
                onClick={() => {
                  setShowCodeViewerModal(true);
                  playCyberClick('laser', 0.08);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-950/70 hover:bg-blue-900 text-blue-300 hover:text-white border border-blue-500/70 shadow-[0_0_12px_rgba(59,130,246,0.3)] transition-all cursor-pointer text-xs font-mono font-bold whitespace-nowrap active:scale-95"
                title="Ver y Copiar el Código Fuente Completo del Sistema"
              >
                <Code className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden lg:inline">Copiar Código Fuente</span>
                <span className="lg:hidden">Código</span>
              </button>

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

              {/* Primary Install App Button (PC & Mobile PWA) - Fully visible on cellphones and desktops */}
              <button
                type="button"
                id="btn-header-install-app"
                onClick={() => {
                  setShowInstallModal(true);
                  playSyntheticBeep(700, 0.1);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 hover:text-white border border-emerald-500/80 shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all cursor-pointer text-xs font-mono font-bold whitespace-nowrap active:scale-95"
                title="Descargar e Instalar la Aplicación en PC y Celular (PWA Nativa)"
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-400 sm:hidden animate-pulse" />
                <Download className="w-3.5 h-3.5 animate-bounce text-emerald-400 hidden sm:inline" />
                <span className="sm:hidden">Instalar App</span>
                <span className="hidden sm:inline">Instalar App (PC / Celular)</span>
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
                      setShowInstallModal(true);
                      setShowDownloadMenu(false);
                    }}
                    className="w-full text-left px-2 py-2 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 rounded flex items-center gap-2 transition-all cursor-pointer border border-emerald-700/60 mb-1 mt-1"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                    <div>
                      <p className="font-bold leading-tight flex items-center gap-1">
                        Instalar en PC / Celular
                        <span className="text-[8px] bg-emerald-700 text-white px-1 rounded uppercase">PWA</span>
                      </p>
                      <p className="text-[9px] text-zinc-400 font-normal">Acceso directo y código QR</p>
                    </div>
                  </button>

                  {/* Generación de KML con Ubicación Real para Google Earth */}
                  <button
                    onClick={downloadRealDeviceKmlFromApp}
                    className="w-full text-left px-2 py-2 bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 rounded flex items-center gap-2 transition-all cursor-pointer border border-cyan-700/60 mt-1 mb-1"
                    title="Genera y descarga el archivo KML con la posición real capturada por el GPS del dispositivo"
                  >
                    <Globe className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                    <div>
                      <p className="font-bold leading-tight flex items-center gap-1">
                        GPS Real // KML Google Earth
                        <span className="text-[8px] bg-cyan-700 text-white px-1 rounded uppercase">KML</span>
                      </p>
                      <p className="text-[9px] text-zinc-400 font-normal">Ubicación actual y real del dispositivo</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setShowGlobalGoogleEarthModal(true);
                      setShowDownloadMenu(false);
                    }}
                    className="w-full text-left px-2 py-2 text-[11px] text-zinc-300 hover:bg-zinc-900 hover:text-white rounded flex items-center gap-2 transition-all cursor-pointer mt-1"
                    title="Abre el visor 3D interactivo de Google Earth con la ubicación real del dispositivo"
                  >
                    <Globe className="w-3.5 h-3.5 text-cyan-500" />
                    <div>
                      <p className="font-bold leading-tight">Visor Google Earth 3D</p>
                      <p className="text-[9px] text-zinc-500 font-normal">Telemetría satelital 3D en vivo</p>
                    </div>
                  </button>
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
              
              {/* Primary Logout Button - Fully visible with label on cellphones and desktops */}
              <button
                type="button"
                id="btn-header-logout"
                onClick={() => {
                  playCyberClick('laser', 0.08);
                  setShowLogoutConfirmModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/40 text-red-300 hover:bg-red-900/60 hover:text-white border border-red-700/60 shadow-[0_0_10px_rgba(239,68,68,0.2)] transition-all cursor-pointer text-xs font-mono font-bold whitespace-nowrap active:scale-95"
                title="Cerrar Sesión Segura y Salir al Terminal de Acceso (CAD-C2)"
              >
                <LogOut className="w-3.5 h-3.5 text-red-400" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          )}

          {/* Core Module Indicator (Exclusivo por Órgano Doctrinal Autenticado) */}
          <div className="flex bg-[#0a0a0a] border border-[#1a1a1a] p-1.5 rounded-lg self-start md:self-auto w-full md:w-auto items-center flex-wrap gap-2">
            {currentRole === 'ROL_BUSQUEDA' && (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded bg-yellow-500/10 border border-yellow-500/30 text-xs font-mono font-bold text-yellow-400">
                <Radio className="w-4 h-4 animate-pulse text-yellow-400" />
                <span className="text-[#888] font-normal uppercase text-[10px]">ÓRGANO DE BÚSQUEDA:</span>
                <span className="text-white">1. BÚSQUEDA S-2 (SENSORES)</span>
                <span className="text-[9px] bg-yellow-950/70 text-yellow-300 px-2 py-0.5 rounded border border-yellow-800/40">SUBORDINADO</span>
                <button
                  type="button"
                  onClick={() => setShowModuleBgModal(true)}
                  className="ml-2 flex items-center gap-1 text-[10px] bg-yellow-950/60 hover:bg-yellow-900/90 text-yellow-300 hover:text-white px-2 py-0.5 rounded border border-yellow-700/50 transition-all cursor-pointer"
                  title="Cambiar fondo exclusivo para Órganos de Búsqueda"
                >
                  <ImageIcon className="w-3 h-3 text-yellow-400" />
                  <span>Fondo Módulo</span>
                </button>
              </div>
            )}

            {currentRole === 'ROL_FUSION' && (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded bg-[#f97316]/10 border border-[#f97316]/30 text-xs font-mono font-bold text-[#f97316]">
                <Shield className="w-4 h-4 text-[#f97316]" />
                <span className="text-[#888] font-normal uppercase text-[10px]">ÓRGANO:</span>
                <span className="text-white">2. ÓRGANO DE FUSIÓN (CFI)</span>
                <span className="text-[9px] bg-orange-950/70 text-orange-300 px-2 py-0.5 rounded border border-orange-800/40">SUBORDINADO</span>
                <button
                  type="button"
                  onClick={() => setShowModuleBgModal(true)}
                  className="ml-2 flex items-center gap-1 text-[10px] bg-orange-950/60 hover:bg-orange-900/90 text-orange-300 hover:text-white px-2 py-0.5 rounded border border-orange-700/50 transition-all cursor-pointer"
                  title="Cambiar fondo exclusivo para Central de Fusión"
                >
                  <ImageIcon className="w-3 h-3 text-orange-400" />
                  <span>Fondo Módulo</span>
                </button>
              </div>
            )}

            {currentRole === 'ROL_CEO' && (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded bg-blue-500/10 border border-blue-500/40 text-xs font-mono font-bold text-blue-400">
                <Crown className="w-4 h-4 text-blue-400" />
                <span className="text-[#888] font-normal uppercase text-[10px]">ROL:</span>
                <span className="text-white">CEO-LCC MANDO (ADMINISTRADOR)</span>
                {adminSupervisedOrgan && adminSupervisedOrgan !== 'ROL_CEO' ? (
                  <span className="text-[9px] bg-amber-950/70 text-amber-300 px-2 py-0.5 rounded border border-amber-800/40 animate-pulse">
                    SUPERVISANDO: {adminSupervisedOrgan === 'ROL_BUSQUEDA' ? 'BÚSQUEDA S-2' : adminSupervisedOrgan === 'ROL_FUSION' ? 'FUSIÓN CFI' : 'TERRENO'}
                  </span>
                ) : (
                  <span className="text-[9px] bg-blue-950/70 text-blue-300 px-2 py-0.5 rounded border border-blue-800/40 font-bold">
                    CONTROL TOTAL
                  </span>
                )}
                {adminSupervisedOrgan && adminSupervisedOrgan !== 'ROL_CEO' && (
                  <button
                    type="button"
                    onClick={() => {
                      setAdminSupervisedOrgan(null);
                      playCyberClick('laser', 0.08);
                    }}
                    className="ml-1 text-[9px] bg-blue-900/70 hover:bg-blue-800 text-white px-2 py-0.5 rounded border border-blue-600 transition-all cursor-pointer font-bold"
                  >
                    Volver al Mando
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowModuleBgModal(true)}
                  className="ml-2 flex items-center gap-1 text-[10px] bg-blue-950/60 hover:bg-blue-900/90 text-blue-300 hover:text-white px-2 py-0.5 rounded border border-blue-700/50 transition-all cursor-pointer"
                  title="Cambiar fondo exclusivo para Mando Estratégico CEO-LCC"
                >
                  <ImageIcon className="w-3 h-3 text-blue-400" />
                  <span>Fondo Módulo</span>
                </button>
              </div>
            )}

            {(currentRole === 'ROL_TERRENO' || currentRole === 'ROL_PATRULLA') && (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono font-bold text-emerald-400">
                <Navigation className="w-4 h-4 text-emerald-400" />
                <span className="text-[#888] font-normal uppercase text-[10px]">ÓRGANO DE BÚSQUEDA:</span>
                <span className="text-white">3. BÚSQUEDA EN TERRENO</span>
                <span className="text-[9px] bg-emerald-950/70 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800/40">SUBORDINADO</span>
                <button
                  type="button"
                  onClick={() => setShowModuleBgModal(true)}
                  className="ml-2 flex items-center gap-1 text-[10px] bg-emerald-950/60 hover:bg-emerald-900/90 text-emerald-300 hover:text-white px-2 py-0.5 rounded border border-emerald-700/50 transition-all cursor-pointer"
                  title="Cambiar fondo exclusivo para Unidades de Terreno"
                >
                  <ImageIcon className="w-3 h-3 text-emerald-400" />
                  <span>Fondo Módulo</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Main Container Workspace */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 pb-28 md:pb-8 space-y-8 relative">

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
              adminInspectedRole={adminSupervisedOrgan}
              onAdminInspectOrgan={(role) => {
                if (currentRole === 'ROL_CEO') {
                  setAdminSupervisedOrgan(role === 'ROL_CEO' ? null : role);
                  playCyberClick('laser', 0.08);
                }
              }}
            />

            {/* Workspace Interactive Navigation Tabs */}
            <div className="flex border-b border-zinc-900 mb-6 mt-4 gap-6 font-mono text-xs overflow-x-auto whitespace-nowrap scrollbar-none">
              <button
                onClick={() => {
                  playCyberModuleTransition('OPERATIONS');
                  setActiveWorkspaceTab('OPERATIONS');
                }}
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
                onClick={() => {
                  playCyberModuleTransition('ARCHITECTURE');
                  setActiveWorkspaceTab('ARCHITECTURE');
                }}
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
                onClick={() => {
                  playCyberModuleTransition('P2P_MESH');
                  setActiveWorkspaceTab('P2P_MESH');
                }}
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
                onClick={() => {
                  playCyberModuleTransition('CODE_VIEWER');
                  setActiveWorkspaceTab('CODE_VIEWER');
                }}
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
                <div className="animate-fade-in space-y-4">
                  {/* Administrator Control Ribbon for CEO-LCC */}
                  {currentRole === 'ROL_CEO' && (
                    <div className="bg-[#0b1320] border border-blue-900/60 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
                          <Crown className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                              CONSOLA DE ADMINISTRADOR GENERAL // CEO-LCC MANDO
                            </span>
                            <span className="text-[10px] font-mono bg-blue-950 text-blue-300 border border-blue-600/40 px-2 py-0.5 rounded font-bold">
                              CONTROL SUPREMO
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 font-mono">
                            {adminSupervisedOrgan && adminSupervisedOrgan !== 'ROL_CEO'
                              ? `Supervisando en vivo el ${adminSupervisedOrgan === 'ROL_BUSQUEDA' ? 'Órgano de Búsqueda S-2' : adminSupervisedOrgan === 'ROL_FUSION' ? 'Órgano de Fusión CFI' : 'Órgano de Terreno'}. Tiene facultades completas de administración.`
                              : 'Supervisión centralizada del sistema. Puede inspeccionar y operar directamente en cualquiera de los órganos de búsqueda subordinados.'}
                          </p>
                        </div>
                      </div>

                      {/* Quick Organ Navigation Buttons */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            setAdminSupervisedOrgan(null);
                            playCyberClick('laser', 0.08);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            !adminSupervisedOrgan || adminSupervisedOrgan === 'ROL_CEO'
                              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 border border-blue-400/60'
                              : 'bg-black/60 text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700'
                          }`}
                        >
                          <Crown className="w-3.5 h-3.5" />
                          <span>Mando Central (Admin)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setAdminSupervisedOrgan('ROL_BUSQUEDA');
                            playCyberClick('laser', 0.08);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            adminSupervisedOrgan === 'ROL_BUSQUEDA'
                              ? 'bg-yellow-500 text-black shadow-md shadow-yellow-500/25 border border-yellow-300 font-extrabold'
                              : 'bg-black/60 text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700'
                          }`}
                        >
                          <Radio className="w-3.5 h-3.5" />
                          <span>1. Búsqueda S-2</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setAdminSupervisedOrgan('ROL_FUSION');
                            playCyberClick('laser', 0.08);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            adminSupervisedOrgan === 'ROL_FUSION'
                              ? 'bg-[#f97316] text-white shadow-md shadow-orange-500/25 border border-orange-300'
                              : 'bg-black/60 text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700'
                          }`}
                        >
                          <Shield className="w-3.5 h-3.5" />
                          <span>2. Fusión CFI</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setAdminSupervisedOrgan('ROL_TERRENO');
                            playCyberClick('laser', 0.08);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            adminSupervisedOrgan === 'ROL_TERRENO' || adminSupervisedOrgan === 'ROL_PATRULLA'
                              ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/25 border border-emerald-300 font-extrabold'
                              : 'bg-black/60 text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700'
                          }`}
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>3. Terreno (GPS)</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Subordinated Search Organ Badge when NOT in CEO Role */}
                  {currentRole !== 'ROL_CEO' && (
                    <div className="bg-[#0b1016] border border-zinc-800/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                      <div className="flex items-center gap-2 text-zinc-300">
                        <Shield className="w-4 h-4 text-blue-400" />
                        <span className="font-bold text-white">ÓRGANO DE BÚSQUEDA SUBORDINADO:</span>
                        <span className="text-zinc-400">Canal directo al Administrador General (CEO-LCC Mando)</span>
                      </div>
                      <span className="text-[10px] bg-blue-950/60 text-blue-300 px-2 py-0.5 rounded border border-blue-800/40">
                        REPORTE Y TRANSMISIÓN AUTOMÁTICA ACTIVA
                      </span>
                    </div>
                  )}

                  {/* CEO in Central Command View */}
                  {currentRole === 'ROL_CEO' && (!adminSupervisedOrgan || adminSupervisedOrgan === 'ROL_CEO') && (
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

                  {/* Operational View: when CEO is supervising ROL_FUSION OR when currentRole is ROL_FUSION */}
                  {(currentRole === 'ROL_FUSION' || (currentRole === 'ROL_CEO' && adminSupervisedOrgan === 'ROL_FUSION')) && (
                    <OperationalView 
                      rawAlerts={rawAlerts}
                      clans={clans}
                      actionableIntel={actionableIntel}
                      tacticalUnits={tacticalUnits}
                      onUpdateUnitCoordinates={handleUpdateUnitCoordinates}
                      expedientes={expedientes}
                      onAddExpediente={handleAddExpediente}
                      onPromoteToIntel={handlePromoteToIntel}
                      onUpdateAlertStatus={handleUpdateAlertStatus}
                      onSimulateRawAlert={(alert) => {
                        setRawAlerts(prev => [alert, ...prev]);
                        sendWsMessage('SEND_FIELD_REPORT', { report: alert });
                      }}
                      onSaveClan={handleSaveClan}
                      onDeleteClan={handleDeleteClan}
                      onBatchImportClans={handleBatchImportClans}
                    />
                  )}

                  {/* Search Organ S-2: when CEO is supervising ROL_BUSQUEDA OR when currentRole is ROL_BUSQUEDA */}
                  {(currentRole === 'ROL_BUSQUEDA' || (currentRole === 'ROL_CEO' && adminSupervisedOrgan === 'ROL_BUSQUEDA')) && (
                    <>
                      <TacticalView 
                        activeOrders={activeOrders}
                        tacticalUnits={tacticalUnits}
                        currentRole="ROL_BUSQUEDA"
                        rawAlerts={rawAlerts}
                        clans={clans}
                        actionableIntel={actionableIntel}
                        expedientes={expedientes}
                        onAddExpediente={handleAddExpediente}
                        onPromoteToIntel={handlePromoteToIntel}
                        onUpdateAlertStatus={handleUpdateAlertStatus}
                        onConfirmOrder={handleConfirmOrder}
                        onSendFieldReport={handleSendFieldReport}
                        onUpdateUnitCoordinates={handleUpdateUnitCoordinates}
                        onAddTacticalUnit={handleAddTacticalUnit}
                        onUpdateTacticalUnit={handleUpdateTacticalUnit}
                        onDeleteTacticalUnit={handleDeleteTacticalUnit}
                      />

                      <InterdictionAlertTracker 
                        tacticalUnits={tacticalUnits}
                        activeOrders={activeOrders}
                        rawAlerts={rawAlerts}
                        onConfirmOrder={handleConfirmOrder}
                        onAddOrderUpdate={handleAppendOrderUpdate}
                        onCreateOrder={handleCreateOrder}
                      />
                    </>
                  )}

                  {/* Tactical Terrain Patrols: when CEO is supervising ROL_TERRENO OR when currentRole is ROL_TERRENO/ROL_PATRULLA */}
                  {((currentRole === 'ROL_TERRENO' || currentRole === 'ROL_PATRULLA') || (currentRole === 'ROL_CEO' && (adminSupervisedOrgan === 'ROL_TERRENO' || adminSupervisedOrgan === 'ROL_PATRULLA'))) && (
                    <>
                      <TacticalView 
                        activeOrders={activeOrders}
                        tacticalUnits={tacticalUnits}
                        currentRole="ROL_TERRENO"
                        rawAlerts={rawAlerts}
                        clans={clans}
                        actionableIntel={actionableIntel}
                        expedientes={expedientes}
                        onAddExpediente={handleAddExpediente}
                        onPromoteToIntel={handlePromoteToIntel}
                        onUpdateAlertStatus={handleUpdateAlertStatus}
                        onConfirmOrder={handleConfirmOrder}
                        onSendFieldReport={handleSendFieldReport}
                        onUpdateUnitCoordinates={handleUpdateUnitCoordinates}
                        onAddTacticalUnit={handleAddTacticalUnit}
                        onUpdateTacticalUnit={handleUpdateTacticalUnit}
                        onDeleteTacticalUnit={handleDeleteTacticalUnit}
                      />

                      <InterdictionAlertTracker 
                        tacticalUnits={tacticalUnits}
                        activeOrders={activeOrders}
                        rawAlerts={rawAlerts}
                        onConfirmOrder={handleConfirmOrder}
                        onAddOrderUpdate={handleAppendOrderUpdate}
                        onCreateOrder={handleCreateOrder}
                      />
                    </>
                  )}
                </div>
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
                      sendWsMessage('SEND_FIELD_REPORT', { report: newAlert });
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

      {/* REAL-TIME MULTI-TERMINAL SYNC HUD TOAST */}
      {realtimeSyncToast && (
        <div className="fixed top-16 right-4 md:right-6 z-[1050] max-w-md w-full px-2 pointer-events-auto animate-fade-in">
          <div className="bg-[#06140e]/95 border border-emerald-500/60 text-emerald-300 p-3 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] backdrop-blur-md flex items-center justify-between gap-3 font-mono text-xs">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <Radio className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="text-left">
                <span className="font-bold text-white block text-[11px] tracking-wider uppercase flex items-center gap-1.5">
                  SINCRONIZACIÓN EN TIEMPO REAL
                  <span className="text-[9px] px-1.5 py-0.2 bg-emerald-950 border border-emerald-500/40 text-emerald-300 rounded font-normal">CAD-C2</span>
                </span>
                <span className="text-[10px] text-emerald-300/90 font-sans block leading-tight mt-0.5">
                  {realtimeSyncToast.message}
                </span>
              </div>
            </div>
            <button
              onClick={() => setRealtimeSyncToast(null)}
              className="p-1 hover:bg-emerald-900/40 rounded text-emerald-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
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
      <div className="fixed bottom-16 md:bottom-6 right-4 md:right-6 z-[1001] max-w-sm w-full space-y-3 pointer-events-none">
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

              {Boolean(alert.mediaUrl && alert.mediaUrl.trim() !== '') && (
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

      {/* Cross-Platform PWA & App Download Modal (PC & Mobile) */}
      {showInstallModal && (
        <AppInstallModal
          isOpen={showInstallModal}
          onClose={() => setShowInstallModal(false)}
          onDownloadDesktopPackage={downloadDesktopApp}
          onDownloadMobilePackage={downloadMobileApp}
        />
      )}

      {/* Interactive Per-Module Background Manager Modal (Legacy) */}
      <ModuleBackgroundModal
        isOpen={showModuleBgModal}
        onClose={() => setShowModuleBgModal(false)}
        activeModuleId={activeModuleId}
        backgrounds={moduleBackgrounds}
        onUpdateBackground={handleUpdateModuleBackground}
        onResetBackground={handleResetModuleBackground}
        onApplyToAll={handleApplyToAllModules}
        onBatchImport={handleBatchImportBackgrounds}
      />

      {/* Comprehensive Unified Tactical Background Editor Modal (Interface & Modules) */}
      <TacticalBackgroundEditorModal
        isOpen={showTacticalBgModal}
        onClose={() => setShowTacticalBgModal(false)}
        globalSettings={fullBgState.settings}
        activeGlobalImageSrc={fullBgState.activeImageSrc}
        onUpdateGlobalSettings={fullBgState.updateSettings}
        onUploadGlobalImage={fullBgState.uploadDashboardImage}
        onResetGlobal={fullBgState.resetToDefault}
        activeModuleId={activeModuleId}
        moduleBackgrounds={moduleBackgrounds}
        onUpdateModuleBackground={handleUpdateModuleBackground}
        onResetModuleBackground={handleResetModuleBackground}
        onApplyToAllModules={handleApplyToAllModules}
        onBatchImportModules={handleBatchImportBackgrounds}
      />

      {/* Global Google Earth 3D & Real Device KML Modal */}
      <GoogleEarthPatrolModal
        isOpen={showGlobalGoogleEarthModal}
        onClose={() => setShowGlobalGoogleEarthModal(false)}
        allPatrols={tacticalUnits}
        onUpdatePatrolCoordinates={handleUpdateUnitCoordinates}
        initialMode="DEVICE_REAL_LOCATION"
      />

      {/* User Management & Cryptographic Key Management Modal (Admin CEO-LCC) */}
      {(currentRole === 'ROL_CEO' || user?.isAdmin) && (
        <UserManagementModal
          isOpen={showUserManagementModal}
          onClose={() => setShowUserManagementModal(false)}
        />
      )}

      {/* Clan Intelligence & Network Expansion Modal */}
      <ClanManagementModal
        isOpen={showClanManagementModal}
        onClose={() => setShowClanManagementModal(false)}
        clans={clans}
        onSaveClan={handleSaveClan}
        onDeleteClan={handleDeleteClan}
        onBatchImportClans={handleBatchImportClans}
      />

      {/* Centralized Data Storage, Backup, and Persistence Modal */}
      <DataStorageManagerModal
        isOpen={showDataStorageModal}
        onClose={() => setShowDataStorageModal(false)}
        clans={clans}
        rawAlerts={rawAlerts}
        expedientes={expedientes}
        actionableIntel={actionableIntel}
        activeOrders={activeOrders}
        tacticalUnits={tacticalUnits}
        onOpenSupabaseModal={() => setShowSupabaseModal(true)}
        onRestoreAllData={handleRestoreAllData}
      />

      {/* Supabase Cloud Database Integration & Sync Modal */}
      <SupabaseSyncModal
        isOpen={showSupabaseModal}
        onClose={() => setShowSupabaseModal(false)}
        clans={clans}
        rawAlerts={rawAlerts}
        expedientes={expedientes}
        actionableIntel={actionableIntel}
        activeOrders={activeOrders}
        tacticalUnits={tacticalUnits}
        onRestoreAllData={handleRestoreAllData}
      />

      {/* Fleet-Wide Multi-Device & Cross-Version Synchronization Control Modal */}
      <MultiDeviceSyncModal
        isOpen={showMultiDeviceSyncModal}
        onClose={() => setShowMultiDeviceSyncModal(false)}
        appVersion={appVersion}
        isOnline={typeof navigator !== 'undefined' ? navigator.onLine : true}
        onTriggerSyncNow={async () => {
          await sendWsMessage('TRIGGER_FORCE_BROADCAST', {});
        }}
        clansCount={clans.length}
        alertsCount={rawAlerts.length}
        ordersCount={activeOrders.length}
        unitsCount={tacticalUnits.length}
        expedientesCount={expedientes.length}
      />

      {/* Real-Time Network Presence & Interactive Fleet Monitor Modal (Hybrid P2P + Relay) */}
      <NetworkPresenceMonitor
        isOpen={showNetworkPresenceMonitor}
        onClose={() => setShowNetworkPresenceMonitor(false)}
        currentUser={user}
        appVersion={appVersion}
        isOnline={typeof navigator !== 'undefined' ? navigator.onLine : true}
        currentLatencyMs={networkLatencyMs}
        tacticalUnits={tacticalUnits}
        onTriggerSyncAll={async () => {
          await sendWsMessage('TRIGGER_FORCE_BROADCAST', {});
        }}
        onBroadcastCustomMessage={(msg) => {
          sendWsMessage('TACTICAL_RADIO_MESSAGE', {
            commsMessage: {
              senderName: user?.name || 'Comandante',
              role: user?.role || 'ROL_CEO',
              text: msg,
              timestamp: new Date().toISOString()
            }
          });
        }}
        onUpdateUnitCoords={handleUpdateUnitCoordinates}
      />

      {/* Comprehensive Source Code Viewer & Copier Modal */}
      {showCodeViewerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-6xl max-h-[92vh] flex flex-col">
            <CodeViewer 
              isModal={true} 
              onClose={() => setShowCodeViewerModal(false)} 
            />
          </div>
        </div>
      )}

      {/* Persistent Mobile Tactical Command Dock (Permanently visible on screen in ALL modules for mobile phones) */}
      <div 
        id="mobile-tactical-dock" 
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#080a0f]/95 backdrop-blur-lg border-t border-zinc-800/90 shadow-[0_-5px_25px_rgba(0,0,0,0.9)] px-2.5 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] flex items-center justify-between gap-1.5 safe-area-inset-bottom"
      >
        {/* Active Module / Role Badge */}
        <div 
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-zinc-900/90 border border-zinc-800 text-[10px] font-mono text-zinc-300 shrink-0 max-w-[85px] truncate"
          title={`Módulo activo: ${activeModuleMeta?.name || currentRole}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="truncate font-bold text-white uppercase tracking-tighter text-[9px]">
            {currentRole === 'ROL_CEO' ? 'CEO' : 
             currentRole === 'ROL_FUSION' ? 'FUSIÓN' : 
             currentRole === 'ROL_BUSQUEDA' ? 'S-2' : 'PATRULLA'}
          </span>
        </div>

        {/* Mobile Action 1: Monitor de Red y Sincronización en Tiempo Real */}
        <button
          type="button"
          id="btn-mobile-dock-sync"
          onClick={() => {
            setShowNetworkPresenceMonitor(true);
            playCyberClick('laser', 0.08);
          }}
          className="flex-1 min-w-0 flex items-center justify-center gap-1 py-2 px-1.5 rounded-lg bg-cyan-950/90 hover:bg-cyan-900 active:bg-cyan-800 text-cyan-200 active:text-white border border-cyan-500/80 shadow-[0_0_12px_rgba(6,182,212,0.3)] transition-all cursor-pointer text-[11px] font-mono font-bold active:scale-95"
          title="Monitor de Red P2P / Relevo: Ver y Transmitir Información en Tiempo Real"
        >
          <Radio className="w-3.5 h-3.5 text-cyan-400 shrink-0 animate-pulse" />
          <span className="truncate">Red ({syncedDevicesCount})</span>
        </button>

        {/* Mobile Action 2: Copiar Código Fuente */}
        <button
          type="button"
          id="btn-mobile-dock-code"
          onClick={() => {
            setShowCodeViewerModal(true);
            playCyberClick('laser', 0.08);
          }}
          className="flex-1 min-w-0 flex items-center justify-center gap-1 py-2 px-1.5 rounded-lg bg-blue-950/90 hover:bg-blue-900 active:bg-blue-800 text-blue-200 active:text-white border border-blue-500/80 shadow-[0_0_12px_rgba(59,130,246,0.3)] transition-all cursor-pointer text-[11px] font-mono font-bold active:scale-95"
          title="Ver y Copiar el Código Fuente del Sistema"
        >
          <Code className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="truncate">Código</span>
        </button>

        {/* Mobile Action 3: Instalar App */}
        <button
          type="button"
          id="btn-mobile-dock-install"
          onClick={() => {
            setShowInstallModal(true);
            playSyntheticBeep(700, 0.1);
          }}
          className="flex-1 min-w-0 flex items-center justify-center gap-1 py-2 px-1.5 rounded-lg bg-emerald-950/90 hover:bg-emerald-900 active:bg-emerald-800 text-emerald-300 active:text-white border border-emerald-500/80 shadow-[0_0_15px_rgba(16,185,129,0.35)] transition-all cursor-pointer text-[11px] font-mono font-bold active:scale-95"
          title="Instalar la App en el Celular (PWA Nativa / APK / Acceso Directo)"
        >
          <Smartphone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="truncate">Instalar</span>
        </button>

        {/* Mobile Action 3: Cerrar Sesión */}
        <button
          type="button"
          id="btn-mobile-dock-logout"
          onClick={() => {
            playCyberClick('laser', 0.08);
            setShowLogoutConfirmModal(true);
          }}
          className="flex-1 min-w-0 flex items-center justify-center gap-1 py-2 px-1.5 rounded-lg bg-red-950/80 hover:bg-red-900 active:bg-red-800 text-red-200 active:text-white border border-red-600/80 shadow-[0_0_12px_rgba(239,68,68,0.3)] transition-all cursor-pointer text-[11px] font-mono font-bold active:scale-95"
          title="Cerrar Sesión Táctica y Salir al Terminal Militar CAD-C2"
        >
          <LogOut className="w-3.5 h-3.5 text-red-400 shrink-0" />
          <span className="truncate">Cerrar</span>
        </button>
      </div>

      {/* Tactical Logout Confirmation Modal (CAD-C2) */}
      {showLogoutConfirmModal && (
        <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in font-mono">
          <div className="bg-[#0b0c10] border-2 border-red-600/80 rounded-2xl max-w-md w-full p-5 shadow-[0_0_45px_rgba(239,68,68,0.4)] text-left space-y-4">
            <div className="flex items-center justify-between border-b border-red-900/40 pb-3">
              <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                <div className="p-2 rounded-lg bg-red-950/80 border border-red-600/60">
                  <LogOut className="w-4 h-4 text-red-400" />
                </div>
                <div>
                  <span className="block leading-none uppercase text-xs text-red-300">TERMINAL MILITAR CAD-C2</span>
                  <span className="block text-white font-bold text-sm mt-0.5">Confirmar Cierre de Sesión</span>
                </div>
              </div>
              <button
                onClick={() => setShowLogoutConfirmModal(false)}
                className="text-zinc-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-3.5 space-y-2">
              <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                ¿Está seguro de que desea cerrar la sesión táctica del operador activo?
              </p>
              <div className="bg-black/60 rounded-lg p-2.5 border border-zinc-800 text-[11px] space-y-1">
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Operador:</span>
                  <strong className="text-white">
                    {user?.name || (
                      currentRole === 'ROL_CEO' ? 'GRAL. E. MARTÍNEZ' : 
                      currentRole === 'ROL_FUSION' ? 'TTE. CNEL. S. ROJAS' : 
                      currentRole === 'ROL_BUSQUEDA' ? 'MY. R. VARGAS' : 'CB1. F. VALENZUELA'
                    )}
                  </strong>
                </div>
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Órgano Militar:</span>
                  <span className="text-emerald-400 font-bold">
                    {user?.organName || (
                      currentRole === 'ROL_CEO' ? 'CEO-LCC MANDO' : 
                      currentRole === 'ROL_FUSION' ? 'CFI CENTRAL FUSIÓN' : 
                      currentRole === 'ROL_BUSQUEDA' ? 'S-2 BÚSQUEDA' : 'BÚSQUEDA EN TERRENO'
                    )}
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-zinc-500 font-mono">
                Se revocarán los permisos temporales en este dispositivo móvil/PC y volverá a la pantalla de autenticación CAD-C2.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowLogoutConfirmModal(false)}
                className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 text-xs font-bold transition-all cursor-pointer active:scale-95 text-center"
              >
                Cancelar y Continuar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirmModal(false);
                  setAdminSupervisedOrgan(null);
                  setActiveWorkspaceTab('OPERATIONS');
                  logout();
                }}
                className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 text-center"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Confirmar y Salir</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
