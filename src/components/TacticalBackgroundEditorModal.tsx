/**
 * TacticalBackgroundEditorModal.tsx
 * Comprehensive Tactical Background Editor for PII-LCC C4ISR.
 * Allows importing and customizing a DIFFERENT image for:
 * 1. The Global Interface Background (Login Screen & Shell)
 * 2. Each of the 7 Tactical Modules (S-2 Búsqueda, CFI Fusión, CEO Mando, Patrullas Terreno, etc.)
 */

import React, { useState, useRef } from 'react';
import { 
  TacticalModuleId, 
  ModuleBackgroundConfig, 
  ModuleBackgroundsMap 
} from '../types';
import { 
  TACTICAL_MODULES_LIST, 
  PRESET_TACTICAL_WALLPAPERS,
  TacticalModuleMeta
} from '../services/ModuleBackgroundService';
import { FullBackgroundSettings } from './FullDashboardBackground';
import { 
  X, 
  Upload, 
  Sliders, 
  RefreshCw, 
  Check, 
  Download, 
  Laptop, 
  Layers, 
  Sparkles,
  Palette,
  Monitor,
  Grid,
  Shield,
  Radio,
  Copy,
  Link as LinkIcon,
  FolderOpen,
  ArrowRight
} from 'lucide-react';
import { playSyntheticBeep } from '../utils/audio';

export interface TacticalBackgroundEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Global Interface background state
  globalSettings: FullBackgroundSettings;
  activeGlobalImageSrc: string;
  onUpdateGlobalSettings: (newSettings: Partial<FullBackgroundSettings>) => void;
  onUploadGlobalImage: (file: File) => Promise<string>;
  onResetGlobal: () => void;
  // Optional Per-Module background state (available inside dashboard)
  activeModuleId?: TacticalModuleId;
  moduleBackgrounds?: ModuleBackgroundsMap;
  onUpdateModuleBackground?: (moduleId: TacticalModuleId, updates: Partial<ModuleBackgroundConfig>, imageBase64?: string) => Promise<void>;
  onResetModuleBackground?: (moduleId: TacticalModuleId) => Promise<void>;
  onApplyToAllModules?: (sourceModuleId: TacticalModuleId) => Promise<void>;
  onBatchImportModules?: (importedMap: ModuleBackgroundsMap) => void;
}

interface TargetItemMeta {
  id: 'GLOBAL' | TacticalModuleId;
  name: string;
  badge: string;
  code: string;
  color: string;
  desc: string;
  fallbackImg: string;
}

const ALL_SYSTEM_TARGETS: TargetItemMeta[] = [
  {
    id: 'GLOBAL',
    name: 'Interfaz General (Acceso & Terminal)',
    badge: 'INTERFAZ',
    code: 'C4ISR-GLOBAL',
    color: '#10b981',
    desc: 'Fondo de la terminal de acceso militar, pantalla de login y contenedor base.',
    fallbackImg: '/PII-LCC-NEGRO.jpg'
  },
  {
    id: 'MOD_BUSQUEDA',
    name: '1. Órganos de Búsqueda (S-2)',
    badge: 'BÚSQUEDA',
    code: 'FIELD-INTEL',
    color: '#eab308',
    desc: 'Recepción de alertas tempranas, sensores de campo y vigilancia de pasos fronterizos.',
    fallbackImg: '/DASHB 3.jpg'
  },
  {
    id: 'MOD_FUSION',
    name: '2. Central de Fusión (CFI de Brigada)',
    badge: 'FUSIÓN',
    code: 'INTEL-FUSION',
    color: '#f97316',
    desc: 'Triaje de alertas, análisis de clanes y expedientes clasificados de inteligencia.',
    fallbackImg: '/DASHBOARD 2.png'
  },
  {
    id: 'MOD_CEO',
    name: '3. Mando Estratégico (CEO-LCC)',
    badge: 'MANDO',
    code: 'C4ISR-STRAT',
    color: '#3b82f6',
    desc: 'Sala de Mando y Control Estratégico para emisión de Órdenes de Operaciones.',
    fallbackImg: '/INTERFAZ.jpg'
  },
  {
    id: 'MOD_PATRULLAS',
    name: '4. Unidades de Terreno (Patrullas)',
    badge: 'TERRENO',
    code: 'TACTICAL-PATROL',
    color: '#10b981',
    desc: 'Monitoreo de coordenadas GPS, reportes de combate e interdicciones en Hito 27.',
    fallbackImg: '/DASHBOARD.jpg'
  },
  {
    id: 'MOD_P2P_MESH',
    name: '5. Malla Descentrada P2P (S-6)',
    badge: 'COMUNICACIONES',
    code: 'MESH-COMMS',
    color: '#06b6d4',
    desc: 'Red mallada descentralizada de alta resiliencia para zonas sin cobertura.',
    fallbackImg: '/dashboard-room.svg'
  },
  {
    id: 'MOD_ARCHITECTURE',
    name: '6. Arquitectura de Sistemas (PII-LCC)',
    badge: 'ARQUITECTURA',
    code: 'SYS-ARCH',
    color: '#8b5cf6',
    desc: 'Diagrama doctrinal y flujo de información integral entre los cuatro órganos.',
    fallbackImg: '/interfaz-room.svg'
  },
  {
    id: 'MOD_CODE_VIEWER',
    name: '7. Terminal de Código y Auditoría',
    badge: 'AUDITORÍA',
    code: 'DEV-AUDIT',
    color: '#ec4899',
    desc: 'Inspección de código fuente y criptografía militar CAD-C2.',
    fallbackImg: '/INTERFAZ.jpg'
  }
];

export const TacticalBackgroundEditorModal: React.FC<TacticalBackgroundEditorModalProps> = ({
  isOpen,
  onClose,
  globalSettings,
  activeGlobalImageSrc,
  onUpdateGlobalSettings,
  onUploadGlobalImage,
  onResetGlobal,
  activeModuleId = 'MOD_CEO',
  moduleBackgrounds,
  onUpdateModuleBackground,
  onResetModuleBackground,
  onApplyToAllModules,
  onBatchImportModules
}) => {
  // Navigation mode: 'MATRIX' (all 8 targets with individual import buttons) or 'STUDIO' (detailed tuning)
  const [viewMode, setViewMode] = useState<'MATRIX' | 'STUDIO'>('MATRIX');
  // Current active target in detailed studio: 'GLOBAL' or TacticalModuleId
  const [activeScope, setActiveScope] = useState<'GLOBAL' | TacticalModuleId>('GLOBAL');
  
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [draggingTarget, setDraggingTarget] = useState<string | null>(null);
  
  // Quick URL dialog state
  const [urlModalTarget, setUrlModalTarget] = useState<'GLOBAL' | TacticalModuleId | null>(null);
  const [urlInputValue, setUrlInputValue] = useState<string>('');

  // Quick Preset dialog state
  const [presetModalTarget, setPresetModalTarget] = useState<'GLOBAL' | TacticalModuleId | null>(null);

  const jsonImportRef = useRef<HTMLInputElement>(null);
  const studioFileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const isGlobalScope = activeScope === 'GLOBAL';
  const currentModuleMeta = !isGlobalScope && moduleBackgrounds
    ? TACTICAL_MODULES_LIST.find(m => m.id === activeScope) || TACTICAL_MODULES_LIST[0]
    : null;

  const showFeedback = (msg: string) => {
    setSuccessMessage(msg);
    playSyntheticBeep(920, 0.1, 'sine', 0.12);
    setTimeout(() => setSuccessMessage(null), 3200);
  };

  // Helper to extract background data for any target
  const getTargetBackground = (targetId: 'GLOBAL' | TacticalModuleId) => {
    const meta = ALL_SYSTEM_TARGETS.find(t => t.id === targetId)!;
    if (targetId === 'GLOBAL') {
      const img = globalSettings.customDataUrl || globalSettings.imageUrl || activeGlobalImageSrc || meta.fallbackImg;
      const opacity = globalSettings.opacity !== undefined ? globalSettings.opacity : 0.80;
      const blur = globalSettings.blur || 0;
      const brightness = globalSettings.brightness ?? 1;
      const contrast = globalSettings.contrast ?? 1;
      const opticalFilter = globalSettings.opticalFilter || 'none';
      const isCustom = Boolean(globalSettings.customDataUrl || (globalSettings.imageUrl && globalSettings.imageUrl !== meta.fallbackImg));
      const fileName = globalSettings.customFileName || (globalSettings.customDataUrl ? 'Imagen Importada' : undefined);

      return {
        img,
        opacity,
        blur,
        brightness,
        contrast,
        opticalFilter,
        isCustom,
        fileName,
        fitMode: globalSettings.fitMode || 'cover',
        contrastOverlay: globalSettings.contrastOverlay !== false,
        gridOverlay: globalSettings.gridOverlay ?? true
      };
    } else {
      const cfg = moduleBackgrounds?.[targetId];
      const img = cfg?.dataUrl || cfg?.imageUrl || meta.fallbackImg;
      const opacity = cfg?.opacity !== undefined ? cfg.opacity : 0.80;
      const blur = cfg?.blur || 0;
      const brightness = cfg?.brightness ?? 1;
      const contrast = cfg?.contrast ?? 1;
      const opticalFilter = cfg?.opticalFilter || 'none';
      const isCustom = Boolean(cfg?.dataUrl || (cfg?.imageUrl && cfg.imageUrl !== meta.fallbackImg));
      const fileName = cfg?.customFileName || (cfg?.dataUrl ? 'Imagen Importada' : undefined);

      return {
        img,
        opacity,
        blur,
        brightness,
        contrast,
        opticalFilter,
        isCustom,
        fileName,
        fitMode: cfg?.fitMode || 'cover',
        contrastOverlay: cfg?.contrastOverlay !== false,
        gridOverlay: cfg?.gridOverlay ?? true
      };
    }
  };

  // Import local file specifically for any target
  const handleImportFileForTarget = async (targetId: 'GLOBAL' | TacticalModuleId, file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (PNG, JPG, WEBP, SVG)');
      return;
    }

    const targetMeta = ALL_SYSTEM_TARGETS.find(t => t.id === targetId);
    setIsProcessing(true);

    try {
      if (targetId === 'GLOBAL') {
        await onUploadGlobalImage(file);
        showFeedback(`Fondo "${file.name}" importado exclusivamente para la Interfaz General.`);
      } else if (onUpdateModuleBackground) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const base64 = event.target?.result as string;
          if (base64) {
            await onUpdateModuleBackground(targetId, {
              dataUrl: base64,
              customFileName: file.name,
              updatedAt: new Date().toISOString()
            }, base64);
            showFeedback(`Fondo "${file.name}" importado exclusivamente para ${targetMeta?.name || targetId}.`);
          }
          setIsProcessing(false);
        };
        reader.readAsDataURL(file);
        return;
      }
    } catch (err) {
      console.error(err);
      alert('Error al procesar la imagen.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Set URL directly for target
  const handleApplyUrlForTarget = async (targetId: 'GLOBAL' | TacticalModuleId, url: string) => {
    if (!url.trim()) return;
    setIsProcessing(true);
    const targetMeta = ALL_SYSTEM_TARGETS.find(t => t.id === targetId);

    try {
      if (targetId === 'GLOBAL') {
        onUpdateGlobalSettings({
          imageUrl: url.trim(),
          customDataUrl: undefined,
          customFileName: 'URL Externa'
        });
        showFeedback(`Fondo desde URL asignado a la Interfaz General.`);
      } else if (onUpdateModuleBackground) {
        await onUpdateModuleBackground(targetId, {
          imageUrl: url.trim(),
          dataUrl: undefined,
          customFileName: 'URL Externa',
          updatedAt: new Date().toISOString()
        });
        showFeedback(`Fondo desde URL asignado a ${targetMeta?.name || targetId}.`);
      }
    } finally {
      setIsProcessing(false);
      setUrlModalTarget(null);
      setUrlInputValue('');
    }
  };

  // Set preset for target
  const handleApplyPresetForTarget = async (targetId: 'GLOBAL' | TacticalModuleId, presetUrl: string, presetName: string) => {
    setIsProcessing(true);
    const targetMeta = ALL_SYSTEM_TARGETS.find(t => t.id === targetId);

    try {
      if (targetId === 'GLOBAL') {
        onUpdateGlobalSettings({
          imageUrl: presetUrl,
          customDataUrl: undefined,
          customFileName: presetName
        });
        showFeedback(`Preset "${presetName}" asignado a la Interfaz General.`);
      } else if (onUpdateModuleBackground) {
        await onUpdateModuleBackground(targetId, {
          imageUrl: presetUrl,
          dataUrl: undefined,
          customFileName: presetName,
          updatedAt: new Date().toISOString()
        });
        showFeedback(`Preset "${presetName}" asignado a ${targetMeta?.name || targetId}.`);
      }
    } finally {
      setIsProcessing(false);
      setPresetModalTarget(null);
    }
  };

  // Update opacity for target
  const handleUpdateOpacityForTarget = async (targetId: 'GLOBAL' | TacticalModuleId, opacity: number) => {
    if (targetId === 'GLOBAL') {
      onUpdateGlobalSettings({ opacity });
    } else if (onUpdateModuleBackground) {
      await onUpdateModuleBackground(targetId, { opacity });
    }
  };

  // Reset target to default
  const handleResetTarget = async (targetId: 'GLOBAL' | TacticalModuleId) => {
    const targetMeta = ALL_SYSTEM_TARGETS.find(t => t.id === targetId);
    if (targetId === 'GLOBAL') {
      onResetGlobal();
      showFeedback(`Fondo de la Interfaz General restablecido a doctrinal.`);
    } else if (onResetModuleBackground) {
      await onResetModuleBackground(targetId);
      showFeedback(`Fondo de ${targetMeta?.name || targetId} restablecido a doctrinal.`);
    }
  };

  // Clone active background to entire platform
  const handleApplyToEntirePlatform = async (sourceTargetId: 'GLOBAL' | TacticalModuleId) => {
    const sourceData = getTargetBackground(sourceTargetId);
    const sourceMeta = ALL_SYSTEM_TARGETS.find(t => t.id === sourceTargetId);
    
    if (!confirm(`¿Deseas aplicar la imagen y ajustes de "${sourceMeta?.name}" a TODA la interfaz y a TODOS los módulos?`)) {
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Apply to global
      onUpdateGlobalSettings({
        imageUrl: sourceData.img.startsWith('data:') ? undefined : sourceData.img,
        customDataUrl: sourceData.img.startsWith('data:') ? sourceData.img : undefined,
        opacity: sourceData.opacity,
        blur: sourceData.blur,
        brightness: sourceData.brightness,
        contrast: sourceData.contrast,
        fitMode: sourceData.fitMode as any,
        opticalFilter: sourceData.opticalFilter as any,
        contrastOverlay: sourceData.contrastOverlay,
        gridOverlay: sourceData.gridOverlay,
        enabled: true
      });

      // 2. Apply to all modules
      if (onUpdateModuleBackground) {
        for (const mod of TACTICAL_MODULES_LIST) {
          await onUpdateModuleBackground(mod.id, {
            imageUrl: sourceData.img.startsWith('data:') ? undefined : sourceData.img,
            dataUrl: sourceData.img.startsWith('data:') ? sourceData.img : undefined,
            opacity: sourceData.opacity,
            blur: sourceData.blur,
            brightness: sourceData.brightness,
            contrast: sourceData.contrast,
            fitMode: (sourceData.fitMode === 'center' ? 'cover' : sourceData.fitMode) as any,
            opticalFilter: sourceData.opticalFilter as any,
            contrastOverlay: sourceData.contrastOverlay,
            gridOverlay: sourceData.gridOverlay,
            updatedAt: new Date().toISOString()
          });
        }
      }
      showFeedback('¡Fondo táctico unificado en toda la plataforma C4ISR!');
    } finally {
      setIsProcessing(false);
    }
  };

  // Export full bundle as JSON
  const handleExportAllJSON = () => {
    try {
      const payload = {
        version: 'PII_LCC_BACKGROUNDS_BUNDLE_V1',
        exportedAt: new Date().toISOString(),
        global: globalSettings,
        modules: moduleBackgrounds || {}
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pii-lcc-fondos-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showFeedback('Paquete de fondos exportado correctamente en archivo JSON');
    } catch (e) {
      console.error(e);
      alert('Error al exportar paquete.');
    }
  };

  // Import bundle JSON
  const handleImportJSONFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed && (parsed.global || parsed.modules)) {
          if (parsed.global) {
            onUpdateGlobalSettings(parsed.global);
          }
          if (parsed.modules && onBatchImportModules) {
            onBatchImportModules(parsed.modules);
          }
          showFeedback('¡Paquete de fondos importado con éxito!');
        } else {
          alert('El archivo no contiene una estructura válida de fondos PII-LCC.');
        }
      } catch {
        alert('Error al leer el archivo JSON.');
      }
    };
    reader.readAsText(file);
  };

  // Filter CSS generator
  const getFilterCSS = (filter: string, blur: number, brightness: number, contrast: number) => {
    const base = `blur(${blur}px) brightness(${brightness}) contrast(${contrast})`;
    switch (filter) {
      case 'nvg': return `${base} hue-rotate(85deg) saturate(220%)`;
      case 'amber': return `${base} sepia(100%) saturate(300%) hue-rotate(5deg)`;
      case 'red': return `${base} sepia(100%) saturate(450%) hue-rotate(325deg)`;
      case 'stealth': return `${base} grayscale(100%)`;
      case 'cyan': return `${base} hue-rotate(160deg) saturate(180%)`;
      default: return base;
    }
  };

  // Active target in studio view
  const currentStudioTarget = ALL_SYSTEM_TARGETS.find(t => t.id === activeScope)!;
  const currentStudioBg = getTargetBackground(activeScope);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in font-mono text-xs"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-6xl bg-[#090d10] border border-emerald-800/60 rounded-2xl shadow-[0_0_60px_rgba(16,185,129,0.18)] flex flex-col max-h-[95vh] overflow-hidden text-zinc-200">
        
        {/* TOP HEADER */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-emerald-950 bg-[#0c1419]/95 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-400">
              <Palette className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-wider flex items-center gap-2">
                  FONDOS TÁCTICOS POR MÓDULO E INTERFAZ
                </h2>
                <span className="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-700/60 px-2 py-0.5 rounded font-mono font-bold">
                  8 FONDOS INDEPENDIENTES
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 mt-0.5">
                Permite importar y configurar una imagen diferente para cada módulo y para la pantalla general de la interfaz.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Cerrar Editor"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* FEEDBACK TOAST */}
        {successMessage && (
          <div className="bg-emerald-950/95 border-b border-emerald-500/60 px-4 py-2 flex items-center justify-between text-emerald-300 text-xs animate-in slide-in-from-top duration-200">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="font-bold">{successMessage}</span>
            </div>
            <span className="text-[10px] text-emerald-500 font-mono">GUARDADO Y SINCRONIZADO</span>
          </div>
        )}

        {/* VIEW MODE TABS + EXPORT/IMPORT ACTIONS */}
        <div className="border-b border-zinc-900 bg-[#070b0e] px-4 py-2 flex flex-wrap items-center justify-between gap-3 shrink-0">
          
          {/* Main View Switcher */}
          <div className="flex items-center gap-1.5 bg-black/60 p-1 rounded-xl border border-zinc-800">
            <button
              type="button"
              onClick={() => {
                setViewMode('MATRIX');
                playSyntheticBeep(700, 0.04);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                viewMode === 'MATRIX'
                  ? 'bg-emerald-600 text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>MATRIZ DE MÓDULOS (8 Fondos Diferentes)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setViewMode('STUDIO');
                playSyntheticBeep(750, 0.04);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                viewMode === 'STUDIO'
                  ? 'bg-emerald-600 text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>ESTUDIO Y CALIBRACIÓN DETALLADA</span>
            </button>
          </div>

          {/* Backup / Export / Import Bundle Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportAllJSON}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white transition-all cursor-pointer text-[11px]"
              title="Descargar copia de seguridad con todos los fondos personalizados"
            >
              <Download className="w-3 h-3 text-emerald-400" />
              <span className="hidden sm:inline">Exportar Copia (JSON)</span>
            </button>

            <input 
              type="file" 
              ref={jsonImportRef} 
              accept=".json,application/json" 
              className="hidden" 
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleImportJSONFile(e.target.files[0]);
                }
              }}
            />
            <button
              type="button"
              onClick={() => jsonImportRef.current?.click()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white transition-all cursor-pointer text-[11px]"
              title="Restaurar fondos desde un archivo JSON"
            >
              <Upload className="w-3 h-3 text-blue-400" />
              <span className="hidden sm:inline">Restaurar Copia</span>
            </button>
          </div>

        </div>

        {/* MODAL MAIN CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">

          {/* ========================================================================= */}
          {/* TAB 1: MATRIZ DE MÓDULOS E INTERFAZ (ALL 8 TARGETS WITH INDIVIDUAL UPLOAD) */}
          {/* ========================================================================= */}
          {viewMode === 'MATRIX' && (
            <div className="space-y-4">
              
              {/* Informational Guidance Banner */}
              <div className="p-3.5 rounded-xl bg-[#0b1419] border border-emerald-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-xs sm:text-sm">
                      Cada Módulo y la Interfaz poseen su propio fondo independiente
                    </h3>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      Haz clic en <strong className="text-emerald-300">"IMPORTAR IMAGEN"</strong> en cualquiera de las tarjetas para cargar una imagen exclusiva desde tu PC o celular.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono shrink-0">
                  <span className="px-2 py-0.5 rounded bg-black/60 border border-zinc-800">
                    Estándar: 80% Opacidad
                  </span>
                  <span className="px-2 py-0.5 rounded bg-black/60 border border-zinc-800">
                    Sincronización Multi-dispositivo
                  </span>
                </div>
              </div>

              {/* 8-Card Responsive Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {ALL_SYSTEM_TARGETS.map(target => {
                  const bgData = getTargetBackground(target.id);
                  const isCurrentActiveInApp = target.id !== 'GLOBAL' && activeModuleId === target.id;
                  const isTargetDragging = draggingTarget === target.id;

                  return (
                    <div
                      key={target.id}
                      onDragOver={(e) => { e.preventDefault(); setDraggingTarget(target.id); }}
                      onDragLeave={() => setDraggingTarget(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDraggingTarget(null);
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          handleImportFileForTarget(target.id, e.dataTransfer.files[0]);
                        }
                      }}
                      className={`relative rounded-xl border flex flex-col justify-between overflow-hidden transition-all bg-[#090e12] ${
                        isTargetDragging
                          ? 'border-emerald-400 bg-emerald-950/40 ring-2 ring-emerald-500 scale-[1.02]'
                          : isCurrentActiveInApp
                          ? 'border-blue-500/80 shadow-[0_0_20px_rgba(59,130,246,0.15)] ring-1 ring-blue-500'
                          : 'border-zinc-800/80 hover:border-zinc-700'
                      }`}
                    >
                      {/* Hidden individual file input for this target */}
                      <input
                        type="file"
                        id={`file-input-${target.id}`}
                        className="hidden"
                        accept="image/png, image/jpeg, image/webp, image/svg+xml"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleImportFileForTarget(target.id, e.target.files[0]);
                          }
                        }}
                      />

                      {/* Card Header */}
                      <div className="p-3 border-b border-zinc-900 bg-[#0c1318]/90 flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span 
                            className="w-2.5 h-2.5 rounded-full shrink-0" 
                            style={{ backgroundColor: target.color }} 
                          />
                          <div className="truncate">
                            <h4 className="font-bold text-white text-xs truncate leading-tight">
                              {target.name}
                            </h4>
                            <span className="text-[9px] text-zinc-500 font-mono">
                              {target.code}
                            </span>
                          </div>
                        </div>

                        {/* Status Tag */}
                        {isCurrentActiveInApp && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 text-[8px] font-bold font-mono shrink-0 uppercase">
                            ACTIVO AHORA
                          </span>
                        )}
                      </div>

                      {/* Image Thumbnail Preview & Dropzone */}
                      <div 
                        className="relative h-28 bg-black overflow-hidden group cursor-pointer"
                        onClick={() => {
                          const input = document.getElementById(`file-input-${target.id}`) as HTMLInputElement;
                          input?.click();
                        }}
                        title="Haz clic para cambiar la imagen de este módulo"
                      >
                        <img
                          src={bgData.img}
                          alt={target.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          style={{
                            opacity: bgData.opacity,
                            filter: getFilterCSS(bgData.opticalFilter, bgData.blur, bgData.brightness, bgData.contrast)
                          }}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = target.fallbackImg;
                          }}
                        />

                        {/* Vignette overlay */}
                        {bgData.contrastOverlay && (
                          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/80 via-transparent to-black/30" />
                        )}

                        {/* Drag and drop hover prompt */}
                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white p-2 text-center pointer-events-none">
                          <Upload className="w-5 h-5 text-emerald-400 animate-bounce" />
                          <span className="text-[10px] font-bold">Cambiar Imagen de Fondo</span>
                          <span className="text-[8px] text-zinc-400">Clic o arrastrar archivo aquí</span>
                        </div>

                        {/* Indicator badge on image */}
                        <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between text-[9px] pointer-events-none">
                          <span className={`px-1.5 py-0.5 rounded font-bold backdrop-blur-md ${
                            bgData.isCustom
                              ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-600/60'
                              : 'bg-black/80 text-zinc-300 border border-zinc-800'
                          }`}>
                            {bgData.isCustom ? '✓ Personalizada' : 'Doctrinal'}
                          </span>

                          <span className="px-1.5 py-0.5 rounded bg-black/80 text-emerald-400 font-mono border border-zinc-800">
                            {Math.round(bgData.opacity * 100)}%
                          </span>
                        </div>
                      </div>

                      {/* Card Content Controls */}
                      <div className="p-3 space-y-2.5 bg-[#090e12]">
                        
                        {/* Source File Name or status */}
                        <div className="text-[10px] text-zinc-400 truncate flex items-center gap-1 font-mono">
                          <FolderOpen className="w-3 h-3 text-zinc-500 shrink-0" />
                          <span className="truncate" title={bgData.fileName || bgData.img}>
                            {bgData.fileName || bgData.img.split('/').pop() || 'Preset Doctrinal'}
                          </span>
                        </div>

                        {/* PRIMARY ACTION: IMPORT IMAGE SPECIFICALLY FOR THIS MODULE */}
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.getElementById(`file-input-${target.id}`) as HTMLInputElement;
                            input?.click();
                          }}
                          className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>IMPORTAR IMAGEN</span>
                        </button>

                        {/* Quick Opacity Slider */}
                        <div className="space-y-1 pt-1 border-t border-zinc-900">
                          <div className="flex items-center justify-between text-[9px]">
                            <span className="text-zinc-400">Opacidad:</span>
                            <span className="text-emerald-400 font-bold font-mono">
                              {Math.round(bgData.opacity * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0.10"
                            max="1.00"
                            step="0.05"
                            value={bgData.opacity}
                            onChange={(e) => handleUpdateOpacityForTarget(target.id, parseFloat(e.target.value))}
                            className="w-full accent-emerald-500 cursor-pointer h-1 bg-zinc-800 rounded"
                          />
                        </div>

                        {/* Secondary Actions Bar */}
                        <div className="grid grid-cols-4 gap-1 pt-1 border-t border-zinc-900 text-[10px]">
                          
                          {/* URL Input Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setUrlModalTarget(target.id);
                              setUrlInputValue('');
                            }}
                            className="p-1.5 rounded bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                            title="Ingresar URL externa para este fondo"
                          >
                            <LinkIcon className="w-3 h-3" />
                          </button>

                          {/* Presets Button */}
                          <button
                            type="button"
                            onClick={() => setPresetModalTarget(target.id)}
                            className="p-1.5 rounded bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                            title="Elegir entre presets tácticos"
                          >
                            <Sparkles className="w-3 h-3 text-amber-400" />
                          </button>

                          {/* Detailed Studio Tuning Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setActiveScope(target.id);
                              setViewMode('STUDIO');
                            }}
                            className="p-1.5 rounded bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                            title="Calibración óptica detallada (Filtros NVG, Desenfoque, Contraste)"
                          >
                            <Sliders className="w-3 h-3 text-purple-400" />
                          </button>

                          {/* Reset to Doctrinal Default Button */}
                          <button
                            type="button"
                            onClick={() => handleResetTarget(target.id)}
                            className="p-1.5 rounded bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer"
                            title="Restablecer este módulo a su imagen doctrinal original"
                          >
                            <RefreshCw className="w-3 h-3" />
                          </button>

                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: ESTUDIO Y CALIBRACIÓN DETALLADA (FINE TUNING WITH LIVE PREVIEW)    */}
          {/* ========================================================================= */}
          {viewMode === 'STUDIO' && (
            <div className="space-y-4">

              {/* Target Ribbon */}
              <div className="p-2 rounded-xl bg-[#0a1014] border border-zinc-800 flex items-center gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none">
                <span className="text-[9px] text-zinc-500 font-bold uppercase mr-1 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" /> EDITANDO:
                </span>

                {ALL_SYSTEM_TARGETS.map(t => {
                  const isSelected = activeScope === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setActiveScope(t.id);
                        playSyntheticBeep(650, 0.04);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all cursor-pointer text-xs font-mono font-bold shrink-0 ${
                        isSelected
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-500 ring-1 ring-emerald-500 shadow-md'
                          : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:bg-zinc-900 hover:text-white'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                      <span>{t.badge}</span>
                    </button>
                  );
                })}
              </div>

              {/* Studio Header Bar for Current Target */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[#0e161b] border border-[#1b2a33]">
                <div className="flex items-center gap-2.5">
                  <div 
                    className="w-2.5 h-10 rounded-full" 
                    style={{ backgroundColor: currentStudioTarget.color }}
                  />
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                      {currentStudioTarget.name}
                      <span className="text-[9px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded font-mono">
                        {currentStudioTarget.code}
                      </span>
                    </h3>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      {currentStudioTarget.desc}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleApplyToEntirePlatform(activeScope)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-600/60 text-emerald-300 hover:text-white transition-all cursor-pointer text-[11px] font-bold shrink-0"
                    title="Clonar esta imagen y ajustes a todos los módulos y a la interfaz"
                  >
                    <Copy className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copiar a Toda la Plataforma</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode('MATRIX')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-[11px] cursor-pointer"
                  >
                    <Grid className="w-3.5 h-3.5" />
                    <span>Ver Todos los Módulos</span>
                  </button>
                </div>
              </div>

              {/* Two Column Studio Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                
                {/* LEFT: Live Preview & File Dropzone (7 cols) */}
                <div className="lg:col-span-7 space-y-4">
                  
                  {/* Preview Window */}
                  <div className="relative rounded-xl border border-zinc-800 bg-black overflow-hidden shadow-xl aspect-video flex flex-col justify-between p-3 select-none">
                    <div className="absolute inset-0 z-0 overflow-hidden">
                      <img
                        src={currentStudioBg.img}
                        alt={currentStudioTarget.name}
                        className={`w-full h-full transition-all duration-300 ${
                          currentStudioBg.fitMode === 'contain' 
                            ? 'object-contain object-center' 
                            : 'object-cover object-center'
                        }`}
                        style={{
                          opacity: currentStudioBg.opacity,
                          filter: getFilterCSS(currentStudioBg.opticalFilter, currentStudioBg.blur, currentStudioBg.brightness, currentStudioBg.contrast)
                        }}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = currentStudioTarget.fallbackImg;
                        }}
                      />

                      {currentStudioBg.contrastOverlay && (
                        <div 
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            background: 'linear-gradient(to bottom, rgba(5, 10, 15, 0.45) 0%, rgba(2, 5, 8, 0.25) 50%, rgba(3, 6, 9, 0.75) 100%)',
                            boxShadow: 'inset 0 0 70px rgba(0,0,0,0.85)'
                          }}
                        />
                      )}

                      {currentStudioBg.gridOverlay && (
                        <div 
                          className="absolute inset-0 pointer-events-none opacity-20"
                          style={{
                            backgroundImage: `
                              linear-gradient(to right, rgba(16, 185, 129, 0.2) 1px, transparent 1px),
                              linear-gradient(to bottom, rgba(16, 185, 129, 0.2) 1px, transparent 1px)
                            `,
                            backgroundSize: '24px 24px'
                          }}
                        />
                      )}
                    </div>

                    {/* HUD Header */}
                    <div className="relative z-10 flex items-center justify-between pointer-events-none">
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/80 border border-emerald-500/40 text-[9px] text-emerald-400 font-mono">
                        <Radio className="w-2.5 h-2.5 animate-pulse" />
                        <span>VISTA PREVIA EN VIVO ({currentStudioTarget.badge})</span>
                      </div>
                      <div className="px-2 py-0.5 rounded bg-black/80 border border-zinc-800 text-[9px] text-zinc-300 font-mono">
                        OPACIDAD: {Math.round(currentStudioBg.opacity * 100)}%
                      </div>
                    </div>

                    {/* HUD Simulated Card */}
                    <div className="relative z-10 max-w-xs mx-auto p-3 rounded-lg bg-[#0a1014]/90 border border-[#21352a] text-center shadow-lg backdrop-blur-sm pointer-events-none">
                      <Shield className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                      <p className="text-[11px] font-bold text-white tracking-wider">
                        LEGIBILIDAD TÁCTICA ÓPTIMA
                      </p>
                      <p className="text-[9px] text-[#93a89a] mt-0.5">
                        PII-LCC CAD-C2 // {currentStudioTarget.code}
                      </p>
                    </div>

                    {/* HUD Footer */}
                    <div className="relative z-10 flex items-center justify-between text-[8px] text-zinc-400 font-mono pointer-events-none">
                      <span>ESPECTRO: {currentStudioBg.opticalFilter.toUpperCase()}</span>
                      <span>AJUSTE: {currentStudioBg.fitMode.toUpperCase()}</span>
                    </div>

                    {isProcessing && (
                      <div className="absolute inset-0 z-30 bg-black/80 flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                        <span className="text-white text-xs font-bold">Procesando y guardando fondo...</span>
                      </div>
                    )}
                  </div>

                  {/* Dropzone for Active Studio Target */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDraggingTarget(activeScope); }}
                    onDragLeave={() => setDraggingTarget(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDraggingTarget(null);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleImportFileForTarget(activeScope, e.dataTransfer.files[0]);
                      }
                    }}
                    onClick={() => studioFileInputRef.current?.click()}
                    className="border-2 border-dashed border-[#1e2f25] hover:border-emerald-500/80 rounded-xl p-4 text-center cursor-pointer transition-all bg-[#0a120f] hover:bg-[#0d1814]"
                  >
                    <input
                      type="file"
                      ref={studioFileInputRef}
                      className="hidden"
                      accept="image/png, image/jpeg, image/webp, image/svg+xml"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleImportFileForTarget(activeScope, e.target.files[0]);
                        }
                      }}
                    />
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <div className="p-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                        <Upload className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-white text-xs">
                          Importar nueva imagen para {currentStudioTarget.name}
                        </p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">
                          Arrastra cualquier archivo o haz clic para abrir el explorador (JPG, PNG, WEBP, SVG)
                        </p>
                      </div>
                    </div>
                  </div>

                </div>

                {/* RIGHT: Sliders & Optical Filters (5 cols) */}
                <div className="lg:col-span-5 space-y-4">
                  
                  {/* Render Adjustments Card */}
                  <div className="bg-[#0b1216] border border-[#1d2c34] rounded-xl p-4 space-y-3.5">
                    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                      <span className="font-bold text-white text-xs flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                        Ajustes Ópticos ({currentStudioTarget.badge})
                      </span>
                      <button
                        type="button"
                        onClick={() => handleResetTarget(activeScope)}
                        className="text-[10px] text-zinc-500 hover:text-red-400 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" /> Restablecer
                      </button>
                    </div>

                    {/* Opacity */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-zinc-300">Opacidad del Fondo:</span>
                        <span className="text-emerald-400 font-bold font-mono bg-black/40 px-1.5 py-0.5 rounded border border-emerald-900/40">
                          {Math.round(currentStudioBg.opacity * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.10"
                        max="1.00"
                        step="0.05"
                        value={currentStudioBg.opacity}
                        onChange={(e) => handleUpdateOpacityForTarget(activeScope, parseFloat(e.target.value))}
                        className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                      />
                      <div className="flex justify-between gap-1 pt-1">
                        {[
                          { label: '30%', val: 0.30 },
                          { label: '50%', val: 0.50 },
                          { label: '80% (Doctrinal)', val: 0.80 },
                          { label: '100%', val: 1.00 }
                        ].map(btn => (
                          <button
                            key={btn.val}
                            type="button"
                            onClick={() => handleUpdateOpacityForTarget(activeScope, btn.val)}
                            className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                              Math.abs(currentStudioBg.opacity - btn.val) < 0.03
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-600 font-bold'
                                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                            }`}
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Optical Spectrum Filters */}
                    <div className="space-y-1.5 pt-1 border-t border-zinc-800/60">
                      <span className="text-zinc-300 text-[11px] block">
                        Filtro de Espectro Óptico Táctico:
                      </span>
                      <div className="grid grid-cols-3 gap-1">
                        {[
                          { id: 'none', label: 'Estándar', color: '#d1d5db' },
                          { id: 'nvg', label: 'NVG Verde', color: '#10b981' },
                          { id: 'amber', label: 'Ámbar Alerta', color: '#f59e0b' },
                          { id: 'red', label: 'Rojo Combate', color: '#ef4444' },
                          { id: 'stealth', label: 'Monocromo', color: '#9ca3af' },
                          { id: 'cyan', label: 'Cian HUD', color: '#06b6d4' }
                        ].map(opt => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              if (isGlobalScope) {
                                onUpdateGlobalSettings({ opticalFilter: opt.id as any });
                              } else if (onUpdateModuleBackground) {
                                onUpdateModuleBackground(activeScope, { opticalFilter: opt.id as any });
                              }
                            }}
                            className={`px-1.5 py-1 rounded text-[9px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                              currentStudioBg.opticalFilter === opt.id
                                ? 'bg-zinc-800 text-white border-white/60 shadow-sm'
                                : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: opt.color }} />
                            <span>{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Blur Slider */}
                    <div className="space-y-1 pt-1 border-t border-zinc-800/60">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-zinc-300">Desenfoque:</span>
                        <span className="text-purple-400 font-bold font-mono">{currentStudioBg.blur}px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        step="1"
                        value={currentStudioBg.blur}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (isGlobalScope) onUpdateGlobalSettings({ blur: val });
                          else if (onUpdateModuleBackground) onUpdateModuleBackground(activeScope, { blur: val });
                        }}
                        className="w-full accent-purple-500 cursor-pointer h-1 bg-zinc-800 rounded"
                      />
                    </div>

                    {/* Brightness & Contrast */}
                    <div className="grid grid-cols-2 gap-3 pt-1 border-t border-zinc-800/60">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-zinc-400">Brillo:</span>
                          <span className="text-amber-400 font-bold font-mono">{Math.round(currentStudioBg.brightness * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.4"
                          max="1.5"
                          step="0.05"
                          value={currentStudioBg.brightness}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (isGlobalScope) onUpdateGlobalSettings({ brightness: val });
                            else if (onUpdateModuleBackground) onUpdateModuleBackground(activeScope, { brightness: val });
                          }}
                          className="w-full accent-amber-500 cursor-pointer h-1 bg-zinc-800 rounded"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-zinc-400">Contraste:</span>
                          <span className="text-cyan-400 font-bold font-mono">{Math.round(currentStudioBg.contrast * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="1.6"
                          step="0.05"
                          value={currentStudioBg.contrast}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (isGlobalScope) onUpdateGlobalSettings({ contrast: val });
                            else if (onUpdateModuleBackground) onUpdateModuleBackground(activeScope, { contrast: val });
                          }}
                          className="w-full accent-cyan-500 cursor-pointer h-1 bg-zinc-800 rounded"
                        />
                      </div>
                    </div>

                    {/* Tactical Overlays */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-800/60">
                      <button
                        type="button"
                        onClick={() => {
                          const next = !currentStudioBg.contrastOverlay;
                          if (isGlobalScope) onUpdateGlobalSettings({ contrastOverlay: next });
                          else if (onUpdateModuleBackground) onUpdateModuleBackground(activeScope, { contrastOverlay: next });
                        }}
                        className={`px-2 py-1 rounded text-[9px] font-bold border transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                          currentStudioBg.contrastOverlay
                            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60'
                            : 'bg-zinc-950 text-zinc-500 border-zinc-800'
                        }`}
                      >
                        <span>Viñeta: {currentStudioBg.contrastOverlay ? 'SÍ' : 'NO'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const next = !currentStudioBg.gridOverlay;
                          if (isGlobalScope) onUpdateGlobalSettings({ gridOverlay: next });
                          else if (onUpdateModuleBackground) onUpdateModuleBackground(activeScope, { gridOverlay: next });
                        }}
                        className={`px-2 py-1 rounded text-[9px] font-bold border transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                          currentStudioBg.gridOverlay
                            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60'
                            : 'bg-zinc-950 text-zinc-500 border-zinc-800'
                        }`}
                      >
                        <Grid className="w-3 h-3" />
                        <span>Cuadrícula: {currentStudioBg.gridOverlay ? 'SÍ' : 'NO'}</span>
                      </button>
                    </div>

                  </div>

                  {/* Quick Presets for Active Studio Target */}
                  <div className="bg-[#0b1216] border border-[#1d2c34] rounded-xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        Galería de Presets para {currentStudioTarget.badge}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                      {PRESET_TACTICAL_WALLPAPERS.map(preset => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleApplyPresetForTarget(activeScope, preset.url, preset.name)}
                          className="relative rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950 hover:border-zinc-600 p-1 text-left transition-all cursor-pointer group flex flex-col justify-between"
                        >
                          <div className="h-10 w-full rounded overflow-hidden bg-black mb-1">
                            <img
                              src={preset.url}
                              alt={preset.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          </div>
                          <p className="font-bold text-[9px] text-zinc-200 truncate leading-tight">
                            {preset.name}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="bg-[#070b0e] border-t border-zinc-900 p-3 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] shrink-0">
          <div className="flex items-center gap-2 text-zinc-400">
            <Laptop className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong className="text-white">Persistencia Total:</strong> Cada imagen importada queda almacenada en tu navegador (IndexedDB) y se aplica dinámicamente al entrar a su módulo.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs transition-colors cursor-pointer shadow-md"
            >
              Listo / Cerrar
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SUB-MODAL: QUICK URL INPUT                                                */}
        {/* ========================================================================= */}
        {urlModalTarget && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md bg-[#0c1318] border border-emerald-500/60 rounded-xl p-4 shadow-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="font-bold text-white text-xs flex items-center gap-2">
                  <LinkIcon className="w-3.5 h-3.5 text-emerald-400" />
                  URL para {ALL_SYSTEM_TARGETS.find(t => t.id === urlModalTarget)?.name}
                </span>
                <button
                  onClick={() => setUrlModalTarget(null)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <input
                type="url"
                value={urlInputValue}
                onChange={(e) => setUrlInputValue(e.target.value)}
                placeholder="https://ejemplo.com/fondo-militar.jpg"
                className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setUrlModalTarget(null)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!urlInputValue.trim()}
                  onClick={() => handleApplyUrlForTarget(urlModalTarget, urlInputValue)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs cursor-pointer disabled:opacity-50"
                >
                  Asignar URL
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SUB-MODAL: QUICK PRESET PICKER                                            */}
        {/* ========================================================================= */}
        {presetModalTarget && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-lg bg-[#0c1318] border border-emerald-500/60 rounded-xl p-4 shadow-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="font-bold text-white text-xs flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Elegir Preset para {ALL_SYSTEM_TARGETS.find(t => t.id === presetModalTarget)?.name}
                </span>
                <button
                  onClick={() => setPresetModalTarget(null)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
                {PRESET_TACTICAL_WALLPAPERS.map(preset => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPresetForTarget(presetModalTarget, preset.url, preset.name)}
                    className="rounded-lg overflow-hidden border border-zinc-800 bg-black hover:border-emerald-500 p-1.5 text-left transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div className="h-14 w-full rounded overflow-hidden mb-1">
                      <img
                        src={preset.url}
                        alt={preset.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <span className="font-bold text-[10px] text-zinc-200 truncate">
                      {preset.name}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setPresetModalTarget(null)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white text-xs cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
