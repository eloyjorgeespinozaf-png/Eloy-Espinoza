/**
 * Full Dashboard Background Component
 * Implements the uploaded CEO-LCC C4ISR "INTERFAZ"
 * across the entire background of the dashboard, with subtle 80% contrast style,
 * incorporating the image without any modifications.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Monitor, Upload, RefreshCw, Sliders, Check, Eye, EyeOff, Palette, Sparkles, Grid } from 'lucide-react';
import { safeStorage } from '../utils/storage';
import { playSyntheticBeep } from '../utils/audio';
import { TacticalBackgroundEditorModal } from './TacticalBackgroundEditorModal';
import { PRESET_TACTICAL_WALLPAPERS } from '../services/ModuleBackgroundService';

export interface FullBackgroundSettings {
  enabled: boolean;
  opacity: number;        // Default 0.80 (80% as requested by user)
  blur: number;           // 0 - 15px
  brightness?: number;    // 0.4 to 1.5 (default 1)
  contrast?: number;      // 0.5 to 1.5 (default 1)
  fitMode?: 'cover' | 'contain' | 'center';
  opticalFilter?: 'none' | 'nvg' | 'amber' | 'red' | 'stealth' | 'cyan';
  gridOverlay?: boolean;
  contrastOverlay: boolean;
  imageUrl?: string;
  customDataUrl?: string;
  customFileName?: string;
}

export const DEFAULT_FULL_BG_SETTINGS: FullBackgroundSettings = {
  enabled: true,
  opacity: 0.80,          // EXACT 80% requested by user
  blur: 0,
  brightness: 1,
  contrast: 1,
  fitMode: 'cover',
  opticalFilter: 'none',
  gridOverlay: true,
  contrastOverlay: true,
  imageUrl: '/PII-LCC-NEGRO.jpg'
};

const STORAGE_KEY = 'ceo_lcc_dashboard_full_bg_config_v5';

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

  const [activeImageSrc, setActiveImageSrc] = useState<string>(() => {
    return settings.customDataUrl || settings.imageUrl || '/PII-LCC-NEGRO.jpg';
  });
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Sync activeImageSrc when settings change
  useEffect(() => {
    if (settings.customDataUrl) {
      setActiveImageSrc(settings.customDataUrl);
      setIsLoaded(true);
      return;
    }

    if (settings.imageUrl) {
      setActiveImageSrc(settings.imageUrl);
      setIsLoaded(true);
      return;
    }

    fetch('/api/dashboard-bg-status')
      .then(res => res.json())
      .then(data => {
        if (data.exists && data.url) {
          setActiveImageSrc(data.url);
        } else {
          setActiveImageSrc('/PII-LCC-NEGRO.jpg');
        }
        setIsLoaded(true);
      })
      .catch(() => {
        setActiveImageSrc('/PII-LCC-NEGRO.jpg');
        setIsLoaded(true);
      });
  }, [settings.customDataUrl, settings.imageUrl]);

  // Global Drag and Drop listener for tactical background
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

        // 1. Save directly into React state & storage
        updateSettings({ 
          customDataUrl: base64, 
          customFileName: file.name,
          opacity: 0.80, 
          enabled: true 
        });
        setActiveImageSrc(base64);

        // 2. Persist to server backend
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
    setActiveImageSrc('/PII-LCC-NEGRO.jpg');
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

  const blur = settings.blur || 0;
  const brightness = settings.brightness ?? 1;
  const contrast = settings.contrast ?? 1;
  const opticalFilter = settings.opticalFilter || 'none';
  const fitMode = settings.fitMode || 'cover';

  // Construct tactical CSS filter
  const baseFilter = `blur(${blur}px) brightness(${brightness}) contrast(${contrast})`;
  let finalFilter = baseFilter;
  if (opticalFilter === 'stealth') {
    finalFilter = `${baseFilter} grayscale(100%)`;
  } else if (opticalFilter === 'nvg') {
    finalFilter = `${baseFilter} hue-rotate(85deg) saturate(220%)`;
  } else if (opticalFilter === 'amber') {
    finalFilter = `${baseFilter} sepia(100%) saturate(300%) hue-rotate(5deg)`;
  } else if (opticalFilter === 'red') {
    finalFilter = `${baseFilter} sepia(100%) saturate(450%) hue-rotate(325deg)`;
  } else if (opticalFilter === 'cyan') {
    finalFilter = `${baseFilter} hue-rotate(160deg) saturate(180%)`;
  }

  return (
    <div 
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* 1. Full-screen tactical image */}
      <img
        src={currentSrc}
        alt="Fondo Táctico de la Interfaz PII-LCC C4ISR"
        referrerPolicy="no-referrer"
        onError={() => {
          if (currentSrc !== '/PII-LCC-NEGRO.jpg' && currentSrc !== '/interfaz-room.svg') {
            setCurrentSrc('/PII-LCC-NEGRO.jpg');
          }
        }}
        className={`w-full h-full transition-opacity duration-500 ease-out ${
          fitMode === 'contain' 
            ? 'object-contain object-center' 
            : fitMode === 'center'
            ? 'object-none object-center'
            : 'object-cover object-center'
        }`}
        style={{
          opacity: settings.opacity,
          filter: finalFilter
        }}
      />

      {/* 2. Optical Tint Layer if filter is active */}
      {opticalFilter !== 'none' && (
        <div 
          className="absolute inset-0 pointer-events-none transition-colors duration-300"
          style={{
            backgroundColor: 
              opticalFilter === 'nvg' ? 'rgba(16, 185, 129, 0.12)' :
              opticalFilter === 'amber' ? 'rgba(245, 158, 11, 0.12)' :
              opticalFilter === 'red' ? 'rgba(239, 68, 68, 0.16)' :
              opticalFilter === 'cyan' ? 'rgba(6, 182, 212, 0.12)' : 'transparent',
            mixBlendMode: 'color-dodge'
          }}
        />
      )}

      {/* 3. Subtle Tactical Contrast Vignette */}
      {settings.contrastOverlay && (
        <div 
          className="absolute inset-0 pointer-events-none transition-opacity duration-300"
          style={{
            background: 'linear-gradient(to bottom, rgba(5, 10, 15, 0.40) 0%, rgba(2, 5, 8, 0.25) 50%, rgba(3, 6, 9, 0.70) 100%)',
            boxShadow: 'inset 0 0 100px rgba(0, 0, 0, 0.80)'
          }}
        />
      )}

      {/* 4. Tactical Radar Grid Overlay */}
      {settings.gridOverlay && (
        <div 
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(16, 185, 129, 0.15) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(16, 185, 129, 0.15) 1px, transparent 1px)
            `,
            backgroundSize: '24px 24px'
          }}
        />
      )}
    </div>
  );
};

interface FullDashboardBackgroundControlProps {
  settings: FullBackgroundSettings;
  updateSettings: (newSettings: Partial<FullBackgroundSettings>) => void;
  uploadDashboardImage: (file: File) => Promise<string>;
  resetToDefault: () => void;
  onOpenFullModal?: () => void;
}

export const FullDashboardBackgroundControl: React.FC<FullDashboardBackgroundControlProps> = ({
  settings,
  updateSettings,
  uploadDashboardImage,
  resetToDefault,
  onOpenFullModal
}) => {
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenEditor = () => {
    if (onOpenFullModal) {
      onOpenFullModal();
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      {/* High-Visibility Header Trigger Button */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          id="btn-edit-tactical-bg"
          onClick={handleOpenEditor}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-xs transition-all cursor-pointer shadow-sm active:scale-95 ${
            settings.enabled
              ? 'bg-emerald-950/70 hover:bg-emerald-900/90 border-emerald-500/70 text-emerald-300 hover:text-white shadow-[0_0_14px_rgba(16,185,129,0.25)]'
              : 'bg-zinc-950/80 border-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
          title="Personalizar y Editar Fondo Táctico de la Interfaz"
        >
          <Palette className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span className="font-bold tracking-wider text-[11px]">
            EDITAR FONDO TÁCTICO
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/60 border border-emerald-500/40 text-emerald-400 font-bold">
            {Math.round(settings.opacity * 100)}%
          </span>
        </button>
      </div>

      {/* Internal Modal fallback if not managed externally */}
      {showModal && (
        <TacticalBackgroundEditorModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          globalSettings={settings}
          activeGlobalImageSrc={settings.customDataUrl || settings.imageUrl || '/PII-LCC-NEGRO.jpg'}
          onUpdateGlobalSettings={updateSettings}
          onUploadGlobalImage={uploadDashboardImage}
          onResetGlobal={resetToDefault}
        />
      )}
    </>
  );
};
