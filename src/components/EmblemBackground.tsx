/**
 * Official Emblem Background Component
 * Displays the "SER ANTES QUE PARECER" Military Crest in the dashboard background
 * with 100% transparent background (no checkerboard, no background vignette, no surrounding overlay).
 */

import React, { useState, useEffect, useRef } from 'react';
import { Shield, Upload, RefreshCw, Sliders, Check, Eye, EyeOff, Sparkles } from 'lucide-react';
import { safeStorage } from '../utils/storage';
import { playSyntheticBeep } from '../utils/audio';
import { removeCheckerboardBackground } from '../utils/removeBackground';

export interface EmblemSettings {
  enabled: boolean;
  opacity: number;          // 0.08 - 0.45 (subtle contrast)
  scale: number;            // 0.8 - 1.2
  transparentBg: boolean;   // Automatically strips fake checkerboard background
  customDataUrl?: string;
}

const DEFAULT_EMBLEM_SETTINGS: EmblemSettings = {
  enabled: true,
  opacity: 0.22,
  scale: 1.0,
  transparentBg: true,
};

const STORAGE_KEY = 'ceo_lcc_emblem_bg_config';

export function useEmblemBackground() {
  const [settings, setSettings] = useState<EmblemSettings>(() => {
    try {
      const saved = safeStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_EMBLEM_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      // fallback
    }
    return DEFAULT_EMBLEM_SETTINGS;
  });

  const [activeImageSrc, setActiveImageSrc] = useState<string>('/emblem-default.svg');
  const [hasCustomImage, setHasCustomImage] = useState<boolean>(false);

  // Check if server or localStorage has an uploaded original image
  useEffect(() => {
    if (settings.customDataUrl) {
      setActiveImageSrc(settings.customDataUrl);
      setHasCustomImage(true);
      return;
    }

    fetch('/api/emblem-status')
      .then(res => res.json())
      .then(async (data) => {
        if (data.exists) {
          if (settings.transparentBg) {
            const cleaned = await removeCheckerboardBackground('/emblem-bg.png');
            setActiveImageSrc(cleaned);
          } else {
            setActiveImageSrc('/emblem-bg.png');
          }
          setHasCustomImage(true);
        } else {
          setActiveImageSrc('/emblem-default.svg');
          setHasCustomImage(false);
        }
      })
      .catch(() => {
        setActiveImageSrc('/emblem-default.svg');
      });
  }, [settings.customDataUrl, settings.transparentBg]);

  // Global Drag and Drop listener for Gemini_Generated_Image...
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) {
        e.preventDefault();
      }
    };

    const handleDrop = async (e: DragEvent) => {
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.type.startsWith('image/')) {
          e.preventDefault();
          try {
            await uploadCustomEmblem(file);
            playSyntheticBeep(880, 0.15, 'sine', 0.12);
          } catch (err) {
            console.error('Error handling dropped image:', err);
          }
        }
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);
    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  const updateSettings = (newSettings: Partial<EmblemSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      try {
        safeStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const uploadCustomEmblem = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const rawBase64 = event.target?.result as string;
        if (!rawBase64) {
          return reject(new Error('Failed to read image'));
        }

        // Strip checkerboard/fake background automatically
        let finalImage = rawBase64;
        try {
          finalImage = await removeCheckerboardBackground(rawBase64);
        } catch (err) {
          console.warn('Background removal error:', err);
        }

        // 1. Save in local React state & storage for instant feedback
        updateSettings({ customDataUrl: finalImage });
        setActiveImageSrc(finalImage);
        setHasCustomImage(true);

        // 2. Persist to server backend
        try {
          await fetch('/api/upload-emblem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: finalImage })
          });
        } catch (e) {
          console.warn('Server upload non-blocking warning:', e);
        }

        resolve(finalImage);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const resetToDefault = () => {
    safeStorage.removeItem(STORAGE_KEY);
    setSettings(DEFAULT_EMBLEM_SETTINGS);
    setActiveImageSrc('/emblem-default.svg');
    setHasCustomImage(false);
  };

  return {
    settings,
    updateSettings,
    activeImageSrc,
    hasCustomImage,
    uploadCustomEmblem,
    resetToDefault
  };
}

interface EmblemBackgroundProps {
  settings: EmblemSettings;
  imageSrc: string;
}

export const EmblemBackground: React.FC<EmblemBackgroundProps> = ({
  settings,
  imageSrc
}) => {
  const [currentSrc, setCurrentSrc] = useState<string>(imageSrc);

  useEffect(() => {
    setCurrentSrc(imageSrc);
  }, [imageSrc]);

  if (!settings.enabled) return null;

  return (
    <div 
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden flex items-center justify-center select-none"
      aria-hidden="true"
    >
      {/* Center Tactical Emblem Container - NO background overlays, NO vignettes, NO borders */}
      <div 
        className="relative flex items-center justify-center transition-all duration-700 ease-out"
        style={{
          opacity: settings.opacity,
          transform: `scale(${settings.scale})`,
          width: 'min(92vw, 1080px)',
          maxHeight: '78vh'
        }}
      >
        {/* The Exact Emblem Image with 100% Transparent Background */}
        {Boolean(currentSrc && currentSrc.trim() !== '') && (
          <img
            src={currentSrc}
            alt="Emblema Institucional Militar - Ser Antes Que Parecer"
            referrerPolicy="no-referrer"
            onError={() => {
              if (currentSrc !== '/emblem-default.svg') {
                setCurrentSrc('/emblem-default.svg');
              }
            }}
            className="w-full h-auto max-h-[76vh] object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.85)]"
          />
        )}
      </div>
    </div>
  );
};

interface EmblemControlProps {
  settings: EmblemSettings;
  updateSettings: (newSettings: Partial<EmblemSettings>) => void;
  uploadCustomEmblem: (file: File) => Promise<string>;
  resetToDefault: () => void;
  hasCustomImage: boolean;
}

export const EmblemBackgroundControl: React.FC<EmblemControlProps> = ({
  settings,
  updateSettings,
  uploadCustomEmblem,
  resetToDefault,
  hasCustomImage
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await uploadCustomEmblem(file);
      setUploadSuccess(true);
      playSyntheticBeep(1046, 0.1, 'sine', 0.15);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to upload emblem image', err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <button
        type="button"
        id="btn-emblem-bg-control"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border font-mono text-xs transition-all cursor-pointer ${
          settings.enabled
            ? 'bg-emerald-950/30 border-emerald-600/50 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)] hover:border-emerald-500'
            : 'bg-zinc-950/70 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
        }`}
        title="Emblema Institucional: 'Ser Antes Que Parecer' (Fondo transparente)"
      >
        <Shield className="w-3.5 h-3.5 text-emerald-400" />
        <span className="hidden xl:inline text-[11px] font-semibold tracking-wider">
          EMBLEMA "SER ANTES QUE PARECER"
        </span>
        <span className="xl:hidden text-[11px] font-semibold">EMBLEMA</span>
        <span className="text-[10px] px-1 py-0.5 rounded bg-black/50 border border-emerald-500/30 text-emerald-400">
          {Math.round(settings.opacity * 100)}%
        </span>
      </button>

      {/* Popover Settings Menu */}
      {isOpen && (
        <div 
          id="popover-emblem-settings"
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl border border-emerald-900/60 bg-[#090f0c]/95 backdrop-blur-md shadow-2xl p-4 z-50 text-zinc-200 text-xs font-mono animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-emerald-900/40">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="font-bold text-emerald-300 text-xs tracking-wider">
                  FONDO INSTITUCIONAL
                </div>
                <div className="text-[10px] text-zinc-400">
                  "SER ANTES QUE PARECER"
                </div>
              </div>
            </div>

            <button
              onClick={() => updateSettings({ enabled: !settings.enabled })}
              className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
                settings.enabled
                  ? 'bg-emerald-900/40 border-emerald-500/50 text-emerald-300'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-500'
              }`}
            >
              {settings.enabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              {settings.enabled ? 'ACTIVO' : 'OCULTO'}
            </button>
          </div>

          {/* Status of Transparency */}
          <div className="mt-3 p-2 rounded bg-emerald-950/40 border border-emerald-800/40 flex items-center justify-between">
            <span className="text-[11px] text-emerald-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Fondo de Imagen: <strong>100% Transparente</strong>
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-900/60 text-emerald-200 font-bold">
              SIN CUADRÍCULA
            </span>
          </div>

          {/* Opacity Slider for Subtle Contrast */}
          <div className="mt-3.5 space-y-1.5">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-zinc-300 flex items-center gap-1.5">
                <Sliders className="w-3 h-3 text-emerald-400" />
                Contraste y Opacidad Sutil:
              </span>
              <span className="font-bold text-emerald-400 bg-black/40 px-1.5 py-0.5 rounded border border-emerald-900/40">
                {Math.round(settings.opacity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.08"
              max="0.45"
              step="0.02"
              value={settings.opacity}
              onChange={(e) => updateSettings({ opacity: parseFloat(e.target.value) })}
              className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
            />
            <div className="flex justify-between text-[9px] text-zinc-500">
              <span>8% (Ultra tenue)</span>
              <span>22% (Recomendado)</span>
              <span>45% (Marcado)</span>
            </div>
          </div>

          {/* Scale Control */}
          <div className="mt-3 space-y-1.5">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-zinc-300">Tamaño del Emblema:</span>
              <span className="text-emerald-400 font-bold">{Math.round(settings.scale * 100)}%</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[0.85, 1.0, 1.15].map((scaleVal) => (
                <button
                  key={scaleVal}
                  onClick={() => updateSettings({ scale: scaleVal })}
                  className={`py-1 text-[10px] rounded border transition-colors cursor-pointer ${
                    Math.abs(settings.scale - scaleVal) < 0.05
                      ? 'bg-emerald-900/40 border-emerald-500 text-emerald-300 font-bold'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  {scaleVal === 0.85 ? 'Compacto' : scaleVal === 1.0 ? 'Normal' : 'Grande'}
                </button>
              ))}
            </div>
          </div>

          {/* Direct File Picker / Upload section */}
          <div className="mt-4 pt-3 border-t border-emerald-900/40">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full py-2 px-3 rounded-lg border border-emerald-600/50 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 font-semibold text-[11px] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  <span>Eliminando fondo y procesando...</span>
                </>
              ) : uploadSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">¡Fondo removido e integrado!</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Cargar imagen (quita fondo automáticamente)</span>
                </>
              )}
            </button>

            <div className="mt-1.5 text-[9px] text-zinc-400 text-center leading-relaxed">
              💡 Puedes <span className="text-emerald-300">arrastrar y soltar</span> la imagen directamente aquí.
            </div>
          </div>

          {/* Reset button if custom image is loaded */}
          {hasCustomImage && (
            <div className="mt-2.5 flex justify-end">
              <button
                onClick={resetToDefault}
                className="text-[10px] text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
              >
                Restablecer a vector predeterminado
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
