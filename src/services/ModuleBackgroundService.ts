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
    defaultPresetImage: '/backgrounds/default_MOD_CEO.png'
  },
  {
    id: 'MOD_FUSION',
    name: '2. Central de Fusión (CFI de Brigada)',
    code: 'INTEL-FUSION',
    badge: 'FUSIÓN',
    color: '#f97316',
    description: 'Central de Fusión de Inteligencia para triaje de alertas de campo, análisis de clanes y expedientes clasificados.',
    defaultPresetImage: '/backgrounds/default_MOD_FUSION.png'
  },
  {
    id: 'MOD_BUSQUEDA',
    name: '1. Órganos de Búsqueda (S-2)',
    code: 'FIELD-INTEL',
    badge: 'BÚSQUEDA',
    color: '#eab308',
    description: 'Recepción de alertas tempranas, sensores de campo y vigilancia de pasos fronterizos no habilitados.',
    defaultPresetImage: '/backgrounds/default_MOD_BUSQUEDA.png'
  },
  {
    id: 'MOD_PATRULLAS',
    name: '4. Unidades de Terreno (Patrullas)',
    code: 'TACTICAL-PATROL',
    badge: 'TERRENO',
    color: '#10b981',
    description: 'Monitoreo de coordenadas GPS, reportes de combate y ejecución física de interdicciones en territorio nacional.',
    defaultPresetImage: '/backgrounds/default_MOD_PATRULLAS.png'
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
    defaultPresetImage: '/escudo-eceme-negro.svg'
  },
  {
    id: 'MOD_CODE_VIEWER',
    name: '7. Terminal de Código y Auditoría',
    code: 'DEV-AUDIT',
    badge: 'AUDITORÍA',
    color: '#ec4899',
    description: 'Inspección de código fuente y criptografía militar CAD-C2.',
    defaultPresetImage: '/escudo-eceme-negro.svg'
  }
];

export const PRESET_TACTICAL_WALLPAPERS = [
  {
    id: 'preset-global-interface',
    name: 'Interfaz General PII-LCC (Predeterminado)',
    url: '/default-interface-bg.jpg',
    description: 'Emblema oficial metálico PII-LCC Sistema Táctico para la interfaz general y pantalla de acceso.'
  },
  {
    id: 'preset-mod-ceo-oficial',
    name: 'Módulo 3: Mando Estratégico CEO-LCC (Predeterminado)',
    url: '/backgrounds/default_MOD_CEO.png',
    description: 'Sala de mando estratégica CEO-LCC con proyección topográfica 3D y red logística.'
  },
  {
    id: 'preset-mod-fusion-oficial',
    name: 'Módulo 2: Central de Fusión CFI / iCRM (Predeterminado)',
    url: '/backgrounds/default_MOD_FUSION.png',
    description: 'Motor de Inteligencia iCRM con cubo holográfico de fusión y enlace de datos.'
  },
  {
    id: 'preset-mod-busqueda-oficial',
    name: 'Módulo 1: Órganos de Búsqueda S-2 (Predeterminado)',
    url: '/backgrounds/default_MOD_BUSQUEDA.png',
    description: 'Unidad móvil C4I HUB-ALPHA con enlace SATCOM y vigilancia de campo.'
  },
  {
    id: 'preset-mod-patrullas-oficial',
    name: 'Módulo 4: Unidades de Terreno Patrullas (Predeterminado)',
    url: '/backgrounds/default_MOD_PATRULLAS.png',
    description: 'Emblema táctico PII-LCC para operaciones de patrullas desplegadas en terreno.'
  },
  {
    id: 'preset-escudo-eceme',
    name: 'Escudo ECEME Negro (Arquitectura y Auditoría)',
    url: '/escudo-eceme-negro.svg',
    description: 'Emblema institucional ECEME sobre fondo oscuro de alta legibilidad.'
  },
  {
    id: 'preset-telecom-mesh',
    name: 'Red de Telecomunicaciones P2P S-6 (Predeterminado)',
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

const DEFAULT_CUSTOM_FILE_NAMES: Record<TacticalModuleId, string> = {
  MOD_CEO: 'MANDO_ESTRATEGICO_CEO_LCC.png',
  MOD_FUSION: 'CFI.jpg',
  MOD_BUSQUEDA: 'ORGANO DE BUSQUEDA.jpg',
  MOD_PATRULLAS: 'PII-LCC.jpg',
  MOD_P2P_MESH: 'dashboard-room.svg',
  MOD_ARCHITECTURE: 'ESCUDO ECEME NEGRO.svg',
  MOD_CODE_VIEWER: 'ESCUDO ECEME NEGRO.svg'
};

export function createDefaultModuleBackgrounds(): ModuleBackgroundsMap {
  const map: Partial<ModuleBackgroundsMap> = {};
  TACTICAL_MODULES_LIST.forEach(mod => {
    map[mod.id] = {
      moduleId: mod.id,
      moduleName: mod.name,
      imageUrl: mod.defaultPresetImage || '/escudo-eceme-negro.svg',
      opacity: 0.80,
      blur: 0,
      contrastOverlay: true,
      fitMode: 'cover',
      enabled: true,
      customFileName: DEFAULT_CUSTOM_FILE_NAMES[mod.id],
      updatedAt: '2026-11-26T23:05:00.000Z',
      updatedBy: 'PREDETERMINADO_OFICIAL'
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
const DEFAULTS_REVISION_KEY = 'pii_lcc_mod_bg_defaults_rev';
const CURRENT_DEFAULTS_REVISION = '2026-11-26-v1';
const INDEXED_DB_NAME = 'PII_LCC_BACKGROUNDS_DB_v1';
const STORE_NAME = 'module_backgrounds';

const LEGACY_OR_BROKEN_URLS = new Set([
  '/DASHBOARD 2.png',
  '/DASHB 3.jpg',
  '/DASHBOARD.jpg',
  '/interfaz-room.svg',
  '/backgrounds/bg_MOD_ARCHITECTURE.png',
  '/backgrounds/bg_MOD_CODE_VIEWER.png'
]);

function sanitizeLoadedConfig(
  modId: TacticalModuleId,
  config: ModuleBackgroundConfig,
  fallback: ModuleBackgroundConfig
): ModuleBackgroundConfig {
  const cleanUrl = (config.imageUrl || '').split('?')[0];
  if (!config.dataUrl && (!cleanUrl || LEGACY_OR_BROKEN_URLS.has(cleanUrl))) {
    return {
      ...fallback,
      opacity: config.opacity ?? fallback.opacity,
      blur: config.blur ?? fallback.blur,
      contrastOverlay: config.contrastOverlay ?? fallback.contrastOverlay,
      fitMode: config.fitMode || fallback.fitMode,
      enabled: config.enabled !== false
    };
  }
  return config;
}

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

  // One-time migration when official built-in defaults are updated so installed PWAs receive the locked-in defaults
  const savedRevision = safeStorage.getItem(DEFAULTS_REVISION_KEY);
  if (savedRevision !== CURRENT_DEFAULTS_REVISION) {
    TACTICAL_MODULES_LIST.forEach(mod => {
      safeStorage.removeItem(`${STORAGE_PREFIX}${mod.id}`);
    });
    try {
      const db = await openDB();
      if (db) {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).clear();
      }
    } catch {
      // ignore IndexedDB clear errors
    }
    safeStorage.setItem(DEFAULTS_REVISION_KEY, CURRENT_DEFAULTS_REVISION);
    for (const mod of TACTICAL_MODULES_LIST) {
      await saveModuleBackgroundLocal(defaults[mod.id]);
    }
    return defaults;
  }

  // 1. Read from localStorage metadata
  TACTICAL_MODULES_LIST.forEach(mod => {
    try {
      const saved = safeStorage.getItem(`${STORAGE_PREFIX}${mod.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        resultMap[mod.id] = sanitizeLoadedConfig(mod.id, { ...resultMap[mod.id], ...parsed }, defaults[mod.id]);
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
          resultMap[rec.moduleId] = sanitizeLoadedConfig(
            rec.moduleId,
            { ...resultMap[rec.moduleId], ...rec },
            defaults[rec.moduleId]
          );
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
      const backgrounds = data.backgrounds as ModuleBackgroundsMap;
      // Automatically cache all configurations into local IndexedDB and localStorage
      // so installed PWAs and offline devices retain all published modifications!
      Object.keys(backgrounds).forEach(modId => {
        const bg = backgrounds[modId];
        if (bg) {
          saveModuleBackgroundLocal(bg).catch(e => console.warn('Local cache sync non-blocking:', e));
        }
      });
      return backgrounds;
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
