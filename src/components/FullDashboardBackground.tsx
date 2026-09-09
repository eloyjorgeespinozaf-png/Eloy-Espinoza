/**
 * Full Dashboard Background Component
 * Implements the uploaded CEO-LCC C4ISR "INTERFAZ"
 * across the entire background of the dashboard, with subtle 80% contrast style,
 * incorporating the image without any modifications.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Monitor, Upload, RefreshCw, Sliders, Check, Eye, EyeOff } from 'lucide-react';
import { safeStorage } from '../utils/storage';
import { playSyntheticBeep } from '../utils/audio';

export interface FullBackgroundSettings {
  enabled: boolean;
  opacity: number;        // Default 0.80 (80% as requested by user)
  blur: number;           // 0 - 2px subtle depth
  contrastOverlay: boolean;
  customDataUrl?: string;
}

const DEFAULT_FULL_BG_SETTINGS: FullBackgroundSettings = {
  enabled: true,
  opacity: 0.80,          // EXACT 80% requested by user
  blur: 0,
  contrastOverlay: true,
};

const STORAGE_KEY = 'ceo_lcc_dashboard_full_bg_config_v4';

export function useFullDashboardBackground() {
  const [settings, setSettings] = useState<FullBackgroundSettings>(() => {
    try {
      const saved = safeStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_FULL_BG_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      // fallback
    }
    return DEFAULT_FULL_BG_SETTINGS;
  });

  const [activeImageSrc, setActiveImageSrc] = useState<string>('/INTERFAZ.jpg');
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Check if INTERFAZ.jpg exists on server or if customDataUrl is saved
  useEffect(() => {
    if (settings.customDataUrl) {
      setActiveImageSrc(settings.customDataUrl);
      setIsLoaded(true);
      return;
    }

    fetch('/api/dashboard-bg-status')
      .then(res => res.json())
      .then(data => {
        if (data.exists && data.url) {
          setActiveImageSrc(data.url);
        } else {
          setActiveImageSrc('/INTERFAZ.jpg');
        }
        setIsLoaded(true);
      })
      .catch(() => {
        setActiveImageSrc('/INTERFAZ.jpg');
        setIsLoaded(true);
      });
  }, [settings.customDataUrl]);

  // Global Drag and Drop listener for INTERFAZ.jpg
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
            await uploadDashboardImage(file);
            playSyntheticBeep(1046, 0.12, 'sine', 0.15);
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

  const updateSettings = (newSettings: Partial<FullBackgroundSettings>) => {
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

  const uploadDashboardImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        if (!base64) {
          return reject(new Error('Failed to read image'));
        }

        // 1. Save directly into React state & storage with ZERO modifications
        updateSettings({ customDataUrl: base64, opacity: 0.80, enabled: true });
        setActiveImageSrc(base64);

        // 2. Persist to server backend as INTERFAZ.jpg
        try {
          await fetch('/api/upload-dashboard-bg', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: base64 })
          });
        } catch (e) {
          console.warn('Server upload non-blocking warning:', e);
        }

        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const resetToDefault = () => {
    safeStorage.removeItem(STORAGE_KEY);
    setSettings(DEFAULT_FULL_BG_SETTINGS);
    setActiveImageSrc('/INTERFAZ.jpg');
  };

  return {
    settings,
    updateSettings,
    activeImageSrc,
    uploadDashboardImage,
    resetToDefault,
    isLoaded
  };
}

interface FullDashboardBackgroundProps {
  settings: FullBackgroundSettings;
  imageSrc: string;
}

export const FullDashboardBackground: React.FC<FullDashboardBackgroundProps> = ({
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
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* 1. Full-screen unmodified image with subtle 80% contrast */}
      <img
        src={currentSrc}
        alt="CEO-LCC Arquitectura e Interfaz Táctica C4ISR"
        referrerPolicy="no-referrer"
        onError={() => {
          if (currentSrc !== '/interfaz-room.svg') {
            setCurrentSrc('/interfaz-room.svg');
          }
        }}
        className="w-full h-full object-cover object-center transition-opacity duration-500 ease-out"
        style={{
          opacity: settings.opacity, // Strictly 0.80 by default as requested
          filter: settings.blur > 0 ? `blur(${settings.blur}px)` : 'none'
        }}
      />

      {/* 2. Subtle Tactical Contrast Layer to harmonize with the dark app UI */}
      {settings.contrastOverlay && (
        <div 
          className="absolute inset-0 pointer-events-none transition-opacity duration-300"
          style={{
            background: 'linear-gradient(to bottom, rgba(5, 10, 15, 0.35) 0%, rgba(2, 5, 8, 0.25) 50%, rgba(3, 6, 9, 0.65) 100%)'
          }}
        />
      )}

      {/* 3. Subtle edge vignette to frame the operational cards */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          boxShadow: 'inset 0 0 100px rgba(0, 0, 0, 0.75)'
        }}
      />
    </div>
  );
};

interface FullDashboardBackgroundControlProps {
  settings: FullBackgroundSettings;
  updateSettings: (newSettings: Partial<FullBackgroundSettings>) => void;
  uploadDashboardImage: (file: File) => Promise<string>;
  resetToDefault: () => void;
}

export const FullDashboardBackgroundControl: React.FC<FullDashboardBackgroundControlProps> = ({
  settings,
  updateSettings,
  uploadDashboardImage,
  resetToDefault
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
      await uploadDashboardImage(file);
      setUploadSuccess(true);
      playSyntheticBeep(1046, 0.1, 'sine', 0.15);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to upload INTERFAZ.jpg image', err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <button
        type="button"
        id="btn-full-dashboard-bg"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border font-mono text-xs transition-all cursor-pointer ${
          settings.enabled
            ? 'bg-cyan-950/40 border-cyan-500/60 text-cyan-300 shadow-[0_0_14px_rgba(6,182,212,0.2)] hover:border-cyan-400'
            : 'bg-zinc-950/70 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
        }`}
        title="Fondo Completo: INTERFAZ C4ISR al 80%"
      >
        <Monitor className="w-3.5 h-3.5 text-cyan-400" />
        <span className="hidden xl:inline text-[11px] font-semibold tracking-wider">
          FONDO INTERFAZ
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-bold">
          {Math.round(settings.opacity * 100)}%
        </span>
      </button>

      {/* Popover Settings */}
      {isOpen && (
        <div 
          id="popover-dashboard-bg-settings"
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl border border-cyan-800/60 bg-[#071017]/95 backdrop-blur-md shadow-2xl p-4 z-50 text-zinc-200 text-xs font-mono animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-cyan-900/40">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-cyan-400" />
              <div>
                <div className="font-bold text-cyan-300 text-xs tracking-wider">
                  FONDO TÁCTICO INTERFAZ
                </div>
                <div className="text-[10px] text-zinc-400">
                  ARQUITECTURA C4ISR CEO-LCC
                </div>
              </div>
            </div>

            <button
              onClick={() => updateSettings({ enabled: !settings.enabled })}
              className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
                settings.enabled
                  ? 'bg-cyan-900/40 border-cyan-500/50 text-cyan-300'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-500'
              }`}
            >
              {settings.enabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              {settings.enabled ? 'ACTIVO' : 'OCULTO'}
            </button>
          </div>

          {/* Opacity Slider */}
          <div className="mt-3.5 space-y-1.5">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-zinc-300 flex items-center gap-1.5">
                <Sliders className="w-3 h-3 text-cyan-400" />
                Contraste Sutil de Fondo:
              </span>
              <span className="font-bold text-cyan-400 bg-black/40 px-1.5 py-0.5 rounded border border-cyan-900/40">
                {Math.round(settings.opacity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.20"
              max="1.00"
              step="0.05"
              value={settings.opacity}
              onChange={(e) => updateSettings({ opacity: parseFloat(e.target.value) })}
              className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
            />
            <div className="flex justify-between text-[9px] text-zinc-400 font-sans">
              <span>30% (Tenue)</span>
              <span className="text-cyan-300 font-bold">80% (Solicitado)</span>
              <span>100% (Directo)</span>
            </div>
          </div>

          {/* Contrast Overlay Toggle */}
          <div className="mt-3 pt-2 border-t border-cyan-900/30 flex items-center justify-between">
            <span className="text-[11px] text-zinc-300">Capa de Contraste Sutil:</span>
            <button
              onClick={() => updateSettings({ contrastOverlay: !settings.contrastOverlay })}
              className={`px-2 py-0.5 rounded text-[10px] border cursor-pointer ${
                settings.contrastOverlay
                  ? 'bg-cyan-900/40 border-cyan-500 text-cyan-300 font-bold'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-400'
              }`}
            >
              {settings.contrastOverlay ? 'Activada' : 'Desactivada'}
            </button>
          </div>

          {/* Direct File Picker / Upload section */}
          <div className="mt-3.5 pt-3 border-t border-cyan-900/40">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full py-2 px-3 rounded-lg border border-cyan-600/50 bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 font-semibold text-[11px] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                  <span>Cargando INTERFAZ.jpg sin modificaciones...</span>
                </>
              ) : uploadSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-cyan-300">¡Imagen INTERFAZ.jpg integrada!</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Cargar archivo "INTERFAZ.jpg" original</span>
                </>
              )}
            </button>

            <div className="mt-1.5 text-[9px] text-zinc-400 text-center leading-relaxed">
              💡 También puedes <span className="text-cyan-300">arrastrar y soltar</span> el archivo <strong className="text-white">INTERFAZ.jpg</strong> directamente en cualquier parte de la pantalla.
            </div>
          </div>

          {/* Reset button */}
          <div className="mt-2 flex justify-end">
            <button
              onClick={resetToDefault}
              className="text-[10px] text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
            >
              Restablecer valores originales (80%)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
