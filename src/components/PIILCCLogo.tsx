/**
 * PIILCCLogo.tsx
 * Top-Left Official Graphic: "PII-LCC NEGRO"
 * 
 * Displays the complete, unmodified tactical graphic of the Plataforma Integrada de Inteligencia
 * (PII-LCC) Sistema Táctico with original colors, shape, and composition intact.
 */

import React, { useState } from 'react';
import { Maximize2, X, Download, Shield } from 'lucide-react';

interface PIILCCLogoProps {
  variant?: 'header' | 'centerpiece';
  className?: string;
  size?: number;
}

export default function PIILCCLogo({ variant = 'header', className = '', size }: PIILCCLogoProps) {
  const [srcIndex, setSrcIndex] = useState(0);
  const [showModal, setShowModal] = useState(false);

  const sources = [
    '/PII-LCC-NEGRO.jpg',
    '/PII-LCC%20NEGRO.jpg',
    '/PII-LCC-NEGRO.png'
  ];

  const handleImgError = () => {
    if (srcIndex < sources.length - 1) {
      setSrcIndex(prev => prev + 1);
    }
  };

  // Header Variant (Top-Left of App and Navigation Banners)
  if (variant === 'header') {
    const height = size || 46;
    // Proportional width for the 1600:873 aspect ratio (~1.83)
    const width = Math.round(height * (1600 / 873));

    return (
      <>
        <div 
          className={`flex items-center gap-3 select-none ${className}`}
          id="top-left-pii-lcc-graphic"
        >
          {/* Intact Graphic Container */}
          <div 
            onClick={() => setShowModal(true)}
            className="relative flex items-center justify-center rounded-lg overflow-hidden border border-[#524436]/60 hover:border-[#d4af37] bg-black shadow-[0_4px_14px_rgba(0,0,0,0.9)] transition-all duration-200 cursor-pointer group shrink-0 transform hover:scale-[1.02]"
            style={{ height: `${height}px`, width: `${width}px` }}
            title="PII-LCC Sistema Táctico (Click para ampliar gráfico intacto)"
          >
            {/* 100% UNMODIFIED GRAPHIC: Preserves original shape, aspect ratio, and colors */}
            <img
              src={sources[srcIndex]}
              onError={handleImgError}
              alt="PII-LCC Sistema Táctico - Plataforma Integrada de Inteligencia"
              className="w-full h-full object-contain select-none pointer-events-none"
              loading="eager"
            />

            {/* Tactical Corner Accents */}
            <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 border-t border-l border-[#d4af37]/60 pointer-events-none" />
            <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 border-t border-r border-[#d4af37]/60 pointer-events-none" />
            <div className="absolute bottom-0.5 left-0.5 w-1.5 h-1.5 border-b border-l border-[#d4af37]/60 pointer-events-none" />
            <div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 border-b border-r border-[#d4af37]/60 pointer-events-none" />

            {/* Hover overlay hint */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
              <Maximize2 className="w-3.5 h-3.5 text-[#d4af37] drop-shadow" />
            </div>
          </div>

          {/* Vertical divider */}
          <div className="hidden sm:block h-8 w-px bg-gradient-to-b from-[#1a1a1a] via-[#3a352a] to-[#1a1a1a]" />

          {/* Sub-system operational status badge */}
          <div className="hidden sm:flex flex-col justify-center text-left leading-none font-mono">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-zinc-300 font-bold tracking-wider uppercase">
                SISTEMA C4ISR // LCC
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            </div>
            <span className="text-[8.5px] text-[#d4af37] tracking-widest mt-1 uppercase font-semibold">
              ENLACE TÁCTICO NOMINAL
            </span>
          </div>
        </div>

        {/* High-Resolution Modal Preview */}
        {showModal && (
          <div 
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fade-in"
            onClick={() => setShowModal(false)}
          >
            <div 
              className="relative max-w-4xl w-full bg-[#07090b] border border-[#d4af37]/50 rounded-2xl p-4 sm:p-6 shadow-[0_0_50px_rgba(0,0,0,0.95)] flex flex-col items-center gap-4"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="w-full flex items-center justify-between border-b border-[#232a22] pb-3 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#d4af37]" />
                  <span className="text-[#f5d77f] font-bold tracking-widest uppercase">
                    PII-LCC // SISTEMA TÁCTICO // GRÁFICO OFICIAL INTACTO
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="p-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Cerrar vista"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Full Original Graphic Intact Display */}
              <div className="w-full relative aspect-[1600/873] rounded-xl overflow-hidden border border-[#3b3223] bg-black shadow-2xl flex items-center justify-center">
                <img
                  src={sources[srcIndex]}
                  onError={handleImgError}
                  alt="PII-LCC Sistema Táctico - Gráfico Original Completo"
                  className="w-full h-full object-contain select-none"
                />
              </div>

              {/* Modal Footer */}
              <div className="w-full flex flex-wrap items-center justify-between gap-3 text-xs font-mono pt-2 border-t border-[#232a22]">
                <div className="flex flex-col text-left">
                  <span className="text-white font-bold tracking-wider">
                    Plataforma Integrada de Inteligencia para la Línea de Control Clandestino
                  </span>
                  <span className="text-[#d4af37] font-mono text-[11px]">
                    SISTEMA TÁCTICO • RESOLUCIÓN ORIGINAL 1600x873
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={sources[srcIndex]}
                    download="PII-LCC NEGRO.jpg"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900 border border-amber-600/60 text-amber-300 font-bold transition-all text-[11px]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar Imagen</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition-colors text-[11px]"
                  >
                    Cerrar
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}
      </>
    );
  }

  // Centerpiece Variant (Used in Login / Splash / Authentication terminal)
  return (
    <>
      <div 
        className={`flex flex-col items-center select-none text-center ${className}`}
        id="centerpiece-pii-lcc-graphic"
      >
        <div 
          onClick={() => setShowModal(true)}
          className="relative max-w-md w-full aspect-[1600/873] rounded-xl overflow-hidden border border-[#524436]/80 hover:border-[#d4af37] bg-black/80 shadow-[0_10px_30px_rgba(0,0,0,0.9)] p-1.5 transition-all duration-300 cursor-pointer group transform hover:scale-[1.02]"
          title="PII-LCC Sistema Táctico (Click para ampliar)"
        >
          {/* Unmodified Graphic */}
          <img
            src={sources[srcIndex]}
            onError={handleImgError}
            alt="PII-LCC Sistema Táctico"
            className="w-full h-full object-contain"
          />

          {/* Subtle corner brackets */}
          <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-[#d4af37]/60 pointer-events-none" />
          <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-[#d4af37]/60 pointer-events-none" />
          <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-[#d4af37]/60 pointer-events-none" />
          <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-[#d4af37]/60 pointer-events-none" />

          {/* Hover hint */}
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
            <Maximize2 className="w-5 h-5 text-[#d4af37] drop-shadow" />
          </div>
        </div>

        {/* Terminal style connection bar */}
        <div className="mt-3 flex items-center gap-4 bg-[#0a0a0a] border border-[#1a1a1a] px-3.5 py-1 rounded-md font-mono text-[9px] text-zinc-400">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
            <span className="text-[#10b981]">ENLACE CENTRAL ONLINE</span>
          </div>
          <div className="w-px h-3 bg-[#1a1a1a]" />
          <span>NODE_ID: PII-LCC-C2-CFM</span>
        </div>
      </div>

      {/* High-Resolution Modal Preview */}
      {showModal && (
        <div 
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fade-in"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="relative max-w-4xl w-full bg-[#07090b] border border-[#d4af37]/50 rounded-2xl p-4 sm:p-6 shadow-[0_0_50px_rgba(0,0,0,0.95)] flex flex-col items-center gap-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between border-b border-[#232a22] pb-3 text-xs font-mono">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#d4af37]" />
                <span className="text-[#f5d77f] font-bold tracking-widest uppercase">
                  PII-LCC // SISTEMA TÁCTICO // GRÁFICO OFICIAL INTACTO
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="w-full relative aspect-[1600/873] rounded-xl overflow-hidden border border-[#3b3223] bg-black shadow-2xl flex items-center justify-center">
              <img
                src={sources[srcIndex]}
                onError={handleImgError}
                alt="PII-LCC Sistema Táctico - Gráfico Original Completo"
                className="w-full h-full object-contain select-none"
              />
            </div>

            <div className="w-full flex flex-wrap items-center justify-between gap-3 text-xs font-mono pt-2 border-t border-[#232a22]">
              <div className="flex flex-col text-left">
                <span className="text-white font-bold tracking-wider">
                  Plataforma Integrada de Inteligencia para la Línea de Control Clandestino
                </span>
                <span className="text-[#d4af37] font-mono text-[11px]">
                  SISTEMA TÁCTICO • RESOLUCIÓN ORIGINAL 1600x873
                </span>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={sources[srcIndex]}
                  download="PII-LCC NEGRO.jpg"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900 border border-amber-600/60 text-amber-300 font-bold transition-all text-[11px]"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar Imagen</span>
                </a>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition-colors text-[11px]"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
