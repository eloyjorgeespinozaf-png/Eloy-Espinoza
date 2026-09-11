/**
 * ModuleBackgroundModal.tsx
 * Interactive Military Configuration Dialog for Per-Module Backgrounds.
 * Enables uploading custom images per assigned module, ensuring each module has
 * its own unique background, persistent across downloads, offline PWAs, and other devices.
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
  TacticalModuleMeta,
  exportModuleBackgroundsPackage,
  importModuleBackgroundsPackage
} from '../services/ModuleBackgroundService';
import { 
  X, 
  Upload, 
  Image as ImageIcon, 
  Sliders, 
  RefreshCw, 
  Check, 
  Download, 
  Smartphone, 
  Laptop, 
  ShieldCheck, 
  Layers, 
  Eye, 
  Sparkles,
  FileText
} from 'lucide-react';
import { playSyntheticBeep } from '../utils/audio';

interface ModuleBackgroundModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeModuleId: TacticalModuleId;
  backgrounds: ModuleBackgroundsMap;
  onUpdateBackground: (moduleId: TacticalModuleId, updates: Partial<ModuleBackgroundConfig>, imageBase64?: string) => Promise<void>;
  onResetBackground: (moduleId: TacticalModuleId) => Promise<void>;
  onApplyToAll?: (sourceModuleId: TacticalModuleId) => Promise<void>;
  onBatchImport: (importedMap: ModuleBackgroundsMap) => void;
}

export const ModuleBackgroundModal: React.FC<ModuleBackgroundModalProps> = ({
  isOpen,
  onClose,
  activeModuleId,
  backgrounds,
  onUpdateBackground,
  onResetBackground,
  onApplyToAll,
  onBatchImport
}) => {
  const [selectedModuleId, setSelectedModuleId] = useState<TacticalModuleId>(activeModuleId);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonImportInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const currentModule = TACTICAL_MODULES_LIST.find(m => m.id === selectedModuleId) || TACTICAL_MODULES_LIST[0];
  const currentConfig: ModuleBackgroundConfig = backgrounds[selectedModuleId] || {
    moduleId: currentModule.id,
    moduleName: currentModule.name,
    imageUrl: currentModule.defaultPresetImage,
    opacity: 0.80,
    blur: 0,
    contrastOverlay: true,
    fitMode: 'cover',
    updatedAt: new Date().toISOString()
  };

  const previewSrc = currentConfig.dataUrl || currentConfig.imageUrl || currentModule.defaultPresetImage;

  const showFeedback = (msg: string) => {
    setSuccessMessage(msg);
    playSyntheticBeep(880, 0.1, 'sine', 0.1);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (PNG, JPG, WEBP, SVG)');
      return;
    }

    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        if (base64) {
          await onUpdateBackground(selectedModuleId, {
            dataUrl: base64,
            customFileName: file.name,
            updatedAt: new Date().toISOString()
          }, base64);
          showFeedback(`Fondo cargado para ${currentModule.name}`);
        }
        setIsProcessing(false);
      };
      reader.onerror = () => {
        alert('Error al leer el archivo de imagen.');
        setIsProcessing(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handlePresetSelect = async (presetUrl: string, presetName: string) => {
    setIsProcessing(true);
    await onUpdateBackground(selectedModuleId, {
      imageUrl: presetUrl,
      dataUrl: undefined,
      customFileName: presetName,
      updatedAt: new Date().toISOString()
    });
    setIsProcessing(false);
    showFeedback(`Preset táctico "${presetName}" aplicado`);
  };

  const handleJSONImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const imported = await importModuleBackgroundsPackage(content);
        onBatchImport(imported);
        showFeedback('¡Paquete de fondos importado con éxito!');
      } catch (err) {
        alert('El archivo no tiene el formato de respaldo de fondos válido.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in font-mono text-xs">
      <div className="relative w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-900 bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                Fondos Personalizados por Módulo Táctico
                <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-700/60 px-2 py-0.5 rounded font-mono">
                  MULTIDISPOSITIVO
                </span>
              </h2>
              <p className="text-[10px] text-zinc-400">
                Asigna una imagen exclusiva a cada órgano militar. El fondo se muestra únicamente en ese módulo y se sincroniza en PC y Celular.
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Module Selector Ribbon */}
        <div className="border-b border-zinc-900 bg-black/40 px-4 py-2.5 overflow-x-auto whitespace-nowrap scrollbar-none flex items-center gap-2">
          <span className="text-[9px] text-zinc-500 font-bold uppercase mr-1 flex items-center gap-1">
            <Layers className="w-3 h-3 text-zinc-500" /> MÓDULOS:
          </span>
          {TACTICAL_MODULES_LIST.map(mod => {
            const isSelected = mod.id === selectedModuleId;
            const isCurrentlyActiveInApp = mod.id === activeModuleId;
            const hasCustom = backgrounds[mod.id]?.customFileName || backgrounds[mod.id]?.dataUrl;

            return (
              <button
                key={mod.id}
                onClick={() => {
                  setSelectedModuleId(mod.id);
                  playSyntheticBeep(600, 0.05);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all cursor-pointer text-xs font-mono font-bold shrink-0 ${
                  isSelected
                    ? 'bg-zinc-800 text-white border-zinc-600 shadow-md ring-1 ring-zinc-500'
                    : 'bg-zinc-950/80 text-zinc-400 border-zinc-800 hover:bg-zinc-900 hover:text-zinc-200'
                }`}
              >
                <span 
                  className="w-2 h-2 rounded-full shrink-0" 
                  style={{ backgroundColor: mod.color }}
                />
                <span>{mod.name.split(' ')[1] || mod.badge}</span>
                {isCurrentlyActiveInApp && (
                  <span className="text-[8px] bg-blue-950 text-blue-300 border border-blue-800 px-1 py-0.2 rounded uppercase">
                    ACTUAL
                  </span>
                )}
                {hasCustom && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Fondo personalizado activo" />
                )}
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">

          {/* Module Banner & Privacy Badge */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <div className="flex items-center gap-2.5">
              <div 
                className="w-3 h-10 rounded-full" 
                style={{ backgroundColor: currentModule.color }}
              />
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  {currentModule.name}
                  <span className="text-[9px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded font-mono">
                    {currentModule.code}
                  </span>
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  {currentModule.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/50 text-emerald-400 text-[10px] font-bold self-start sm:self-auto shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>VISUALIZACIÓN AISLADA: SÓLO EN ESTE MÓDULO</span>
            </div>
          </div>

          {/* Main 2-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Left Column: Live Preview & Drag-Drop Uploader (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              
              {/* Live Preview Container */}
              <div className="relative rounded-xl border border-zinc-800 overflow-hidden bg-black aspect-video flex items-center justify-center group shadow-inner">
                {/* Background Image Preview */}
                <img
                  src={previewSrc}
                  alt={`Preview ${currentModule.name}`}
                  className={`w-full h-full transition-all ${
                    currentConfig.fitMode === 'contain' ? 'object-contain' : 'object-cover'
                  }`}
                  style={{
                    opacity: currentConfig.opacity,
                    filter: currentConfig.blur > 0 ? `blur(${currentConfig.blur}px)` : 'none'
                  }}
                />

                {/* Tactical Contrast Simulation */}
                {currentConfig.contrastOverlay && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/45 pointer-events-none" />
                )}

                {/* Simulated UI Overlay to preview readability */}
                <div className="absolute inset-0 p-4 flex flex-col justify-between pointer-events-none">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-1 bg-black/75 border border-zinc-700 text-white rounded text-[10px] font-bold">
                      HUD TÁCTICO: {currentModule.badge}
                    </span>
                    <span className="text-[9px] bg-black/70 text-zinc-400 px-2 py-0.5 rounded font-mono">
                      Opacidad: {Math.round(currentConfig.opacity * 100)}%
                    </span>
                  </div>
                  <div className="bg-black/80 border border-zinc-800 p-2.5 rounded text-[10px] text-zinc-300 max-w-xs backdrop-blur-sm">
                    <p className="font-bold text-white flex items-center gap-1">
                      <Eye className="w-3 h-3 text-emerald-400" /> Vista previa de legibilidad táctica
                    </p>
                    <p className="text-[9px] text-zinc-400 mt-0.5">
                      El texto y gráficos militares se mantienen 100% legibles.
                    </p>
                  </div>
                </div>

                {isProcessing && (
                  <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
                    <span className="text-white text-xs font-bold">Sincronizando imagen en servidor...</span>
                  </div>
                )}
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-blue-500 bg-blue-950/30 text-white scale-[1.01]'
                    : 'border-zinc-800 hover:border-zinc-600 bg-zinc-950 hover:bg-zinc-900/50 text-zinc-400'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                  accept="image/png, image/jpeg, image/webp, image/svg+xml"
                  className="hidden"
                />
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="p-2.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-white text-xs">
                      Arrastra una imagen aquí o haz clic para cargar
                    </p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">
                      Formatos: PNG, JPG, WEBP o SVG de alta resolución (sin límite de tamaño)
                    </p>
                  </div>
                  {currentConfig.customFileName && (
                    <div className="mt-1 px-2.5 py-0.5 rounded bg-zinc-900 text-zinc-300 text-[10px] border border-zinc-800">
                      Archivo cargado: <strong className="text-white">{currentConfig.customFileName}</strong>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Right Column: Tactical Adjustments & Presets Gallery (5 cols) */}
            <div className="lg:col-span-5 space-y-5">
              
              {/* Sliders and Controls */}
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-blue-400" />
                    Ajustes de Renderizado
                  </span>
                  <button
                    onClick={async () => {
                      await onResetBackground(selectedModuleId);
                      showFeedback('Fondo restablecido al predeterminado');
                    }}
                    className="text-[10px] text-zinc-500 hover:text-red-400 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Restablecer
                  </button>
                </div>

                {/* Opacity Slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-400">Opacidad del Fondo:</span>
                    <span className="text-blue-400 font-bold font-mono">
                      {Math.round(currentConfig.opacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.10"
                    max="1.0"
                    step="0.05"
                    value={currentConfig.opacity}
                    onChange={(e) => onUpdateBackground(selectedModuleId, { opacity: parseFloat(e.target.value) })}
                    className="w-full accent-blue-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                  />
                  <div className="flex justify-between text-[8px] text-zinc-600">
                    <span>10% Sutil</span>
                    <span>80% Recomendado</span>
                    <span>100% Intenso</span>
                  </div>
                </div>

                {/* Blur Slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-400">Desenfoque / Profundidad:</span>
                    <span className="text-purple-400 font-bold font-mono">{currentConfig.blur}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="6"
                    step="1"
                    value={currentConfig.blur}
                    onChange={(e) => onUpdateBackground(selectedModuleId, { blur: parseInt(e.target.value, 10) })}
                    className="w-full accent-purple-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                  />
                </div>

                {/* Fit Mode Toggle */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-zinc-400 text-[11px]">Modo de Ajuste:</span>
                  <div className="flex bg-zinc-950 p-0.5 rounded-lg border border-zinc-800">
                    <button
                      onClick={() => onUpdateBackground(selectedModuleId, { fitMode: 'cover' })}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                        currentConfig.fitMode === 'cover'
                          ? 'bg-blue-600 text-white'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Cubrir Todo
                    </button>
                    <button
                      onClick={() => onUpdateBackground(selectedModuleId, { fitMode: 'contain' })}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                        currentConfig.fitMode === 'contain'
                          ? 'bg-blue-600 text-white'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Ajustar Centrado
                    </button>
                  </div>
                </div>

                {/* Contrast Vignette Toggle */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-zinc-400 text-[11px]">Filtro Militar Táctico:</span>
                  <button
                    onClick={() => onUpdateBackground(selectedModuleId, { contrastOverlay: !currentConfig.contrastOverlay })}
                    className={`px-3 py-1 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
                      currentConfig.contrastOverlay
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60'
                        : 'bg-zinc-950 text-zinc-500 border-zinc-800'
                    }`}
                  >
                    {currentConfig.contrastOverlay ? '✓ ACTIVO (Alto Contraste)' : 'INACTIVO'}
                  </button>
                </div>

                {onApplyToAll && (
                  <div className="pt-2 border-t border-zinc-800/80">
                    <button
                      onClick={async () => {
                        if (confirm(`¿Deseas aplicar el fondo de ${currentModule.name} a todos los demás módulos?`)) {
                          await onApplyToAll(selectedModuleId);
                          showFeedback('Fondo propagado a todos los módulos');
                        }
                      }}
                      className="w-full py-1.5 bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 rounded-lg text-[10px] font-bold transition-colors cursor-pointer text-center"
                    >
                      Clonar este fondo a todos los módulos
                    </button>
                  </div>
                )}
              </div>

              {/* Presets Gallery */}
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 space-y-2.5">
                <span className="font-bold text-white text-xs flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Galería de Fondos Doctrinales
                </span>
                <p className="text-[10px] text-zinc-400">
                  Selecciona un fondo militar oficial optimizado para este módulo:
                </p>

                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {PRESET_TACTICAL_WALLPAPERS.map(preset => {
                    const isCurrent = currentConfig.imageUrl === preset.url && !currentConfig.dataUrl;

                    return (
                      <button
                        key={preset.id}
                        onClick={() => handlePresetSelect(preset.url, preset.name)}
                        className={`relative rounded-lg overflow-hidden border p-1.5 text-left transition-all cursor-pointer group flex flex-col justify-between ${
                          isCurrent
                            ? 'border-amber-500 bg-amber-950/30 ring-1 ring-amber-500'
                            : 'border-zinc-800 bg-zinc-950 hover:border-zinc-600 hover:bg-zinc-900'
                        }`}
                      >
                        <div className="h-14 w-full rounded overflow-hidden bg-black mb-1.5">
                          <img
                            src={preset.url}
                            alt={preset.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <p className="font-bold text-[10px] text-zinc-200 truncate leading-tight">
                          {preset.name}
                        </p>
                        {isCurrent && (
                          <span className="absolute top-2 right-2 p-1 bg-amber-500 text-black rounded-full shadow">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

          </div>

          {/* Multi-Device Persistence & Export/Import Section */}
          <div className="bg-gradient-to-r from-zinc-950 via-zinc-900/60 to-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-700/60 text-emerald-400 shrink-0">
                <Laptop className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-white text-xs flex items-center gap-2">
                  Persistencia Multi-Dispositivo (PC y Celular)
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                </p>
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  Los fondos se guardan en la base de datos central y en la memoria local (IndexedDB) de este navegador. Cuando descargues el programa o abras la app en tu teléfono, se mantendrán automáticamente.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => exportModuleBackgroundsPackage(backgrounds)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-zinc-700 transition-all cursor-pointer text-xs font-bold"
                title="Exportar todos los fondos configurados a un archivo JSON transportable"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>Exportar Fondos (.json)</span>
              </button>

              <input
                type="file"
                ref={jsonImportInputRef}
                onChange={handleJSONImport}
                accept=".json"
                className="hidden"
              />
              <button
                onClick={() => jsonImportInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-all cursor-pointer text-xs font-bold"
                title="Cargar un paquete de fondos guardado previamente"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                <span>Importar Fondos</span>
              </button>
            </div>
          </div>

          {successMessage && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 rounded-lg flex items-center justify-between text-xs animate-fade-in">
              <span className="flex items-center gap-2 font-bold">
                <Check className="w-4 h-4 text-emerald-400" />
                {successMessage}
              </span>
              <span className="text-[10px] text-emerald-400/80">SINCRONIZADO</span>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-900 bg-zinc-950">
          <div className="text-[10px] text-zinc-500 font-mono">
            Módulo Seleccionado: <span className="text-zinc-300 font-bold">{currentModule.name}</span>
          </div>
          
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg transition-all cursor-pointer"
          >
            Aceptar y Visualizar
          </button>
        </div>

      </div>
    </div>
  );
};
