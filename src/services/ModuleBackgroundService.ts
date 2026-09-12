/**
 * ModuleBackgroundService.ts
 * Manages per-module background images and configurations for PII-LCC.
 * Guarantees persistence across downloads, offline PWA usage, and multi-device deployments (PC, Mobile, Tablets).
 */

import { TacticalModuleId, ModuleBackgroundConfig, ModuleBackgroundsMap, MilitaryRole } from '../types';
import { safeStorage } from '../utils/storage';

export interface TacticalModuleMeta {
  id: TacticalModuleId;
  name: string;
  code: string;
  badge: string;
  color: string;
  description: string;
  defaultPresetImage: string;
}

export const TACTICAL_MODULES_LIST: TacticalModuleMeta[] = [
  {
    id: 'MOD_CEO',
    name: '3. Mando Estratégico (CEO-LCC)',
    code: 'C4ISR-STRAT',
    badge: 'MANDO',
    color: '#3b82f6',
    description: 'Sala de Mando y Control Estratégico C4ISR para emisión de Órdenes de Operaciones y despliegue conjunto.',
    defaultPresetImage: '/INTERFAZ.jpg'
  },
  {
    id: 'MOD_FUSION',
    name: '2. Central de Fusión (CFI de Brigada)',
    code: 'INTEL-FUSION',
    badge: 'FUSIÓN',
    color: '#f97316',
    description: 'Central de Fusión de Inteligencia para triaje de alertas de campo, análisis de clanes y expedientes clasificados.',
    defaultPresetImage: '/DASHBOARD 2.png'
  },
  {
    id: 'MOD_BUSQUEDA',
    name: '1. Órganos de Búsqueda (S-2)',
    code: 'FIELD-INTEL',
    badge: 'BÚSQUEDA',
    color: '#eab308',
    description: 'Recepción de alertas tempranas, sensores de campo y vigilancia de pasos fronterizos no habilitados.',
    defaultPresetImage: '/DASHB 3.jpg'
  },
  {
    id: 'MOD_PATRULLAS',
    name: '4. Unidades de Terreno (Patrullas)',
    code: 'TACTICAL-PATROL',
    badge: 'TERRENO',
    color: '#10b981',
    description: 'Monitoreo de coordenadas GPS, reportes de combate y ejecución física de interdicciones en el Hito 27.',
    defaultPresetImage: '/DASHBOARD.jpg'
  },
  {
    id: 'MOD_P2P_MESH',
    name: '5. Malla Descentrada P2P (S-6)',
    code: 'MESH-COMMS',
    badge: 'COMUNICACIONES',
    color: '#06b6d4',
    description: 'Red mallada descentralizada de alta resiliencia táctica para transmisión en zonas sin cobertura.',
    defaultPresetImage: '/dashboard-room.svg'
  },
  {
    id: 'MOD_ARCHITECTURE',
    name: '6. Arquitectura de Sistemas (PII-LCC)',
    code: 'SYS-ARCH',
    badge: 'ARQUITECTURA',
    color: '#8b5cf6',
    description: 'Diagrama doctrinal y flujo de información integral entre los cuatro órganos de combate.',
    defaultPresetImage: '/interfaz-room.svg'
  },
  {
    id: 'MOD_CODE_VIEWER',
    name: '7. Terminal de Código y Auditoría',
    code: 'DEV-AUDIT',
    badge: 'AUDITORÍA',
    color: '#ec4899',
    description: 'Inspección de código fuente y criptografía militar CAD-C2.',
    defaultPresetImage: '/INTERFAZ.jpg'
  }
];

export const PRESET_TACTICAL_WALLPAPERS = [
  {
    id: 'preset-pii-lcc-oficial',
    name: 'PII-LCC Sistema Táctico (Oficial 3D)',
    url: '/PII-LCC-NEGRO.jpg',
    description: 'Emblema oficial PII-LCC con arquitectura táctica en fondo oscuro de alta resolución.'
  },
  {
    id: 'preset-c4isr-warroom',
    name: 'Sala de Guerra C4ISR (INTERFAZ)',
    url: '/INTERFAZ.jpg',
    description: 'Puesto de comando con monitores tácticos integrados y mapas de calor.'
  },
  {
    id: 'preset-multimonitor-c2',
    name: 'Consola Multimonitor C2 (DASHBOARD 2)',
    url: '/DASHBOARD 2.png',
    description: 'Disposición multipantalla para análisis de inteligencia y vectores de ruta.'
  },
  {
    id: 'preset-radar-cfi',
    name: 'Radar Táctico y Fusión (DASHB 3)',
    url: '/DASHB 3.jpg',
    description: 'Monitoreo de sensores de frontera y detección temprana de incursiones.'
  },
  {
    id: 'preset-ops-command',
    name: 'Comando de Operaciones (DASHBOARD)',
    url: '/DASHBOARD.jpg',
    description: 'Terminal avanzado con telemetría de unidades y enlaces satelitales.'
  },
  {
    id: 'preset-telecom-mesh',
    name: 'Red de Telecomunicaciones (dashboard-room)',
    url: '/dashboard-room.svg',
    description: 'Esquema de enlace mallado de radiofrecuencia militar S-6.'
  },
  {
    id: 'preset-system-blueprint',
    name: 'Plano Vectorial Doctrinal (interfaz-room)',
    url: '/interfaz-room.svg',
    description: 'Matriz arquitectónica de flujo CAD-C2.'
  }
];

export function createDefaultModuleBackgrounds(): ModuleBackgroundsMap {
  const map: Partial<ModuleBackgroundsMap> = {};
  TACTICAL_MODULES_LIST.forEach(mod => {
    map[mod.id] = {
      moduleId: mod.id,
      moduleName: mod.name,
      imageUrl: mod.defaultPresetImage,
      opacity: 0.80,
      blur: 0,
      contrastOverlay: true,
      fitMode: 'cover',
      updatedAt: new Date().toISOString(),
      updatedBy: 'SISTEMA_DOCTRINAL'
    };
  });
  return map as ModuleBackgroundsMap;
}

export function resolveActiveModuleId(
  activeWorkspaceTab: 'OPERATIONS' | 'ARCHITECTURE' | 'P2P_MESH' | 'CODE_VIEWER',
  currentRole: MilitaryRole
): TacticalModuleId {
  if (activeWorkspaceTab === 'ARCHITECTURE') return 'MOD_ARCHITECTURE';
  if (activeWorkspaceTab === 'P2P_MESH') return 'MOD_P2P_MESH';
  if (activeWorkspaceTab === 'CODE_VIEWER') return 'MOD_CODE_VIEWER';

  switch (currentRole) {
    case 'ROL_CEO':
      return 'MOD_CEO';
    case 'ROL_FUSION':
      return 'MOD_FUSION';
    case 'ROL_BUSQUEDA':
      return 'MOD_BUSQUEDA';
    case 'ROL_TERRENO':
    case 'ROL_PATRULLA':
      return 'MOD_PATRULLAS';
    default:
      return 'MOD_CEO';
  }
}

const STORAGE_PREFIX = 'pii_lcc_mod_bg_';
const INDEXED_DB_NAME = 'PII_LCC_BACKGROUNDS_DB_v1';
const STORE_NAME = 'module_backgrounds';

/**
 * Open IndexedDB database with fallback handling
 */
function openDB(): Promise<IDBDatabase | null> {
  return new Promise(resolve => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return resolve(null);
    }
    try {
      const request = window.indexedDB.open(INDEXED_DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'moduleId' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Save background config into IndexedDB and localStorage
 */
export async function saveModuleBackgroundLocal(config: ModuleBackgroundConfig): Promise<void> {
  // 1. Save metadata into localStorage
  try {
    const metaOnly = { ...config };
    // If dataUrl is small (< 500KB), save to safeStorage, otherwise save in IndexedDB
    if (metaOnly.dataUrl && metaOnly.dataUrl.length > 500000) {
      delete metaOnly.dataUrl;
    }
    safeStorage.setItem(`${STORAGE_PREFIX}${config.moduleId}`, JSON.stringify(metaOnly));
  } catch (err) {
    console.warn('localStorage save warning for module background:', err);
  }

  // 2. Save full payload including image base64 into IndexedDB
  try {
    const db = await openDB();
    if (db) {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(config);
    }
  } catch (err) {
    console.warn('IndexedDB save warning:', err);
  }
}

/**
 * Load all backgrounds from local storage (IndexedDB + localStorage)
 */
export async function loadModuleBackgroundsLocal(): Promise<ModuleBackgroundsMap> {
  const defaults = createDefaultModuleBackgrounds();
  const resultMap: ModuleBackgroundsMap = { ...defaults };

  // 1. Read from localStorage metadata
  TACTICAL_MODULES_LIST.forEach(mod => {
    try {
      const saved = safeStorage.getItem(`${STORAGE_PREFIX}${mod.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        resultMap[mod.id] = { ...resultMap[mod.id], ...parsed };
      }
    } catch {
      // fallback to default
    }
  });

  // 2. Hydrate high-res images from IndexedDB
  try {
    const db = await openDB();
    if (db) {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const allRecords = await new Promise<ModuleBackgroundConfig[]>(resolve => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });

      allRecords.forEach(rec => {
        if (rec && rec.moduleId && resultMap[rec.moduleId]) {
          resultMap[rec.moduleId] = { ...resultMap[rec.moduleId], ...rec };
        }
      });
    }
  } catch (err) {
    console.warn('IndexedDB read warning:', err);
  }

  return resultMap;
}

/**
 * Fetch backgrounds from central sync server
 */
export async function fetchServerModuleBackgrounds(): Promise<ModuleBackgroundsMap | null> {
  try {
    const res = await fetch('/api/module-backgrounds');
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.backgrounds) {
      return data.backgrounds as ModuleBackgroundsMap;
    }
  } catch (err) {
    console.warn('Server fetch module-backgrounds non-blocking:', err);
  }
  return null;
}

/**
 * Push an updated module background to the server for multi-device sync
 */
export async function uploadModuleBackgroundToServer(
  config: ModuleBackgroundConfig,
  imageBase64?: string
): Promise<ModuleBackgroundConfig> {
  const payload = {
    moduleId: config.moduleId,
    moduleName: config.moduleName,
    imageBase64: imageBase64 || config.dataUrl,
    imageUrl: config.imageUrl,
    opacity: config.opacity,
    blur: config.blur,
    contrastOverlay: config.contrastOverlay,
    fitMode: config.fitMode,
    customFileName: config.customFileName,
    updatedBy: config.updatedBy || 'OPERADOR_LCC'
  };

  try {
    const res = await fetch('/api/module-backgrounds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.config) {
        return data.config;
      }
    }
  } catch (err) {
    console.warn('Server upload module background warning (operating offline):', err);
  }

  return config;
}

/**
 * Reset module background to doctrinal default
 */
export async function resetModuleBackground(moduleId: TacticalModuleId): Promise<ModuleBackgroundConfig> {
  const defaults = createDefaultModuleBackgrounds();
  const defaultConfig = defaults[moduleId];

  // Remove from localStorage
  safeStorage.removeItem(`${STORAGE_PREFIX}${moduleId}`);

  // Remove from IndexedDB
  try {
    const db = await openDB();
    if (db) {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(moduleId);
    }
  } catch {
    // ignore
  }

  // Notify server
  try {
    await fetch(`/api/module-backgrounds/${moduleId}`, { method: 'DELETE' });
  } catch {
    // non-blocking
  }

  return defaultConfig;
}

/**
 * Export all module backgrounds to a downloadable .json package
 */
export function exportModuleBackgroundsPackage(backgrounds: ModuleBackgroundsMap): void {
  const exportData = {
    format: 'PII-LCC-MODULE-BACKGROUNDS-PACKAGE',
    version: '2.4.0',
    exportedAt: new Date().toISOString(),
    backgrounds
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `PII-LCC_Fondos_Modulos_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Import a backgrounds package from a JSON file
 */
export async function importModuleBackgroundsPackage(
  jsonString: string
): Promise<ModuleBackgroundsMap> {
  const parsed = JSON.parse(jsonString);
  const importedBgs: ModuleBackgroundsMap = parsed.backgrounds || parsed;

  const validMap: Partial<ModuleBackgroundsMap> = {};
  for (const mod of TACTICAL_MODULES_LIST) {
    if (importedBgs[mod.id]) {
      validMap[mod.id] = {
        ...importedBgs[mod.id],
        moduleId: mod.id,
        moduleName: mod.name
      };
      await saveModuleBackgroundLocal(validMap[mod.id]!);
    }
  }

  // Push batch to server
  try {
    await fetch('/api/module-backgrounds/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ backgrounds: validMap })
    });
  } catch (err) {
    console.warn('Server batch import error (offline):', err);
  }

  return validMap as ModuleBackgroundsMap;
}
