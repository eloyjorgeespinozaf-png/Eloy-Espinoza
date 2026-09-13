/**
 * ModuleBackgroundLayer.tsx
 * Renders the background strictly bound to the active tactical module.
 * Guarantees that each assigned module has its own independent background,
 * isolated from other modules, with 80% tactical contrast and full cross-device fidelity.
 */

import React, { useState, useEffect } from 'react';
import { TacticalModuleId, ModuleBackgroundConfig } from '../types';
import { TACTICAL_MODULES_LIST } from '../services/ModuleBackgroundService';
import { Sliders, Image as ImageIcon } from 'lucide-react';

interface ModuleBackgroundLayerProps {
  activeModuleId: TacticalModuleId;
  config?: ModuleBackgroundConfig;
  onOpenManager: () => void;
}

export const ModuleBackgroundLayer: React.FC<ModuleBackgroundLayerProps> = ({
  activeModuleId,
  config,
  onOpenManager
}) => {
  const moduleMeta = TACTICAL_MODULES_LIST.find(m => m.id === activeModuleId);
  const fallbackUrl = moduleMeta?.defaultPresetImage || (activeModuleId === 'MOD_CEO' ? '/INTERFAZ.jpg' : '/dashboard-room.svg');

  const [activeSrc, setActiveSrc] = useState<string>(() => {
    return config?.dataUrl || config?.imageUrl || fallbackUrl;
  });

  // Smoothly switch background when active module or config changes
  useEffect(() => {
    const nextSrc = config?.dataUrl || config?.imageUrl || fallbackUrl;
    setActiveSrc(nextSrc);
  }, [config?.dataUrl, config?.imageUrl, fallbackUrl, activeModuleId]);

  // If background is explicitly disabled, or no image is set, do not render
  if (config?.enabled === false) return null;
  if (!activeSrc || !activeSrc.trim()) return null;

  const opacity = config?.opacity !== undefined ? config.opacity : 0.80;
  const blur = config?.blur || 0;
  const brightness = config?.brightness ?? 1;
  const contrast = config?.contrast ?? 1;
  const fitMode = config?.fitMode || 'cover';
  const contrastOverlay = config?.contrastOverlay !== false;
  const opticalFilter = config?.opticalFilter || 'none';
  const gridOverlay = config?.gridOverlay ?? true;

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
      id={`module-bg-layer-${activeModuleId}`}
    >
      {/* 1. Dynamic Per-Module Background Image with Smooth Fade */}
      {Boolean(activeSrc && activeSrc.trim() !== '') && (
        <img
          key={`${activeModuleId}-${activeSrc}`}
          src={activeSrc}
          alt={`Fondo Táctico Asignado - ${moduleMeta?.name || activeModuleId}`}
          referrerPolicy="no-referrer"
          onError={() => {
            if (fallbackUrl && activeSrc !== fallbackUrl) {
              setActiveSrc(fallbackUrl);
            }
          }}
          className={`w-full h-full transition-all duration-700 ease-out ${
            fitMode === 'contain' ? 'object-contain object-center' : 'object-cover object-center'
          }`}
          style={{
            opacity,
            filter: finalFilter
          }}
        />
      )}

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

      {/* 3. Tactical Contrast Layer - Harmonizes with Dark Military UI */}
      {contrastOverlay && (
        <>
          {/* Radial Vignette */}
          <div 
            className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/35"
            style={{ mixBlendMode: 'multiply' }}
          />
          {/* Subtle Grid / Scanline overlay for tactical military realism */}
          <div 
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-black/25 to-black/75"
          />
          {/* Ultra-subtle top & bottom border vignette */}
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/85 via-black/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/95 via-black/60 to-transparent" />
        </>
      )}

      {/* 4. Tactical Radar Grid Overlay */}
      {gridOverlay && (
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

      {/* 3. Subtle Module Watermark Indicator Badge (Bottom Left) */}
      <div className="absolute bottom-3 left-4 pointer-events-auto z-10 hidden sm:flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenManager}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/70 hover:bg-black/90 border border-zinc-800/80 hover:border-zinc-700 text-[10px] font-mono text-zinc-400 hover:text-zinc-200 backdrop-blur-md transition-all shadow-lg cursor-pointer group"
          title={`Fondo asignado exclusivamente a ${moduleMeta?.name}. Clic para cambiar.`}
        >
          <span 
            className="w-2 h-2 rounded-full animate-pulse" 
            style={{ backgroundColor: moduleMeta?.color || '#3b82f6' }}
          />
          <span className="font-bold text-zinc-300 group-hover:text-white">
            FONDO ACTIVO:
          </span>
          <span className="text-zinc-400 max-w-[170px] truncate">
            {moduleMeta?.badge || moduleMeta?.name}
          </span>
          <span className="text-zinc-600">|</span>
          <span className="text-[9px] text-zinc-500 font-normal">
            {Math.round(opacity * 100)}% opac.
          </span>
          <Sliders className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300 ml-0.5" />
        </button>
      </div>
    </div>
  );
};
