/**
 * HeaderTopRightLogo.tsx
 * Top-Right Official Graphic: "ESCUDO ECEME NEGRO"
 * Motto: "SER ANTES QUE PARECER"
 * 
 * Displays the complete, unmodified heraldic graphic of the Escuela de Comando y Estado Mayor (ECEME)
 * on deep black velvet with full heraldic components intact.
 */

import React, { useState } from 'react';
import { Maximize2, X, Download } from 'lucide-react';

interface HeaderTopRightLogoProps {
  className?: string;
  size?: number;
}

export default function HeaderTopRightLogo({ className = '', size = 52 }: HeaderTopRightLogoProps) {
  const [srcIndex, setSrcIndex] = useState(0);
  const [showModal, setShowModal] = useState(false);

  // Local vector and image assets representing the intact graphic
  const sources = [
    '/escudo-eceme-negro.svg',
    '/ESCUDO ECEME NEGRO.svg',
    '/emblem-default.svg'
  ];

  const handleImgError = () => {
    if (srcIndex < sources.length - 1) {
      setSrcIndex(prev => prev + 1);
    }
  };

  // Compute proportional dimensions keeping the 16:9 intact aspect ratio
  const height = size;
  const width = Math.round(size * (16 / 9));

  return (
    <>
      <div 
        className={`relative flex items-center justify-center shrink-0 group ${className}`}
        id="top-right-eceme-graphic"
      >
        <div 
          onClick={() => setShowModal(true)}
          className="relative flex items-center justify-center rounded-lg overflow-hidden border border-[#d4af37]/40 hover:border-[#d4af37] bg-black shadow-[0_4px_12px_rgba(0,0,0,0.9)] transition-all duration-200 cursor-pointer transform hover:scale-[1.03]"
          style={{ width: `${width}px`, height: `${height}px` }}
          title="Escudo Oficial ECEME - 'SER ANTES QUE PARECER' (Click para ampliar)"
        >
          {/* Unmodified Graphic */}
          <img
            src={sources[srcIndex]}
            onError={handleImgError}
            alt="Escudo ECEME Negro - 'SER ANTES QUE PARECER'"
            className="w-full h-full object-cover select-none pointer-events-none"
            loading="eager"
          />

          {/* Subtle tactical corner accents */}
          <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 border-t border-l border-[#d4af37]/60 pointer-events-none" />
          <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 border-t border-r border-[#d4af37]/60 pointer-events-none" />
          <div className="absolute bottom-0.5 left-0.5 w-1.5 h-1.5 border-b border-l border-[#d4af37]/60 pointer-events-none" />
          <div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 border-b border-r border-[#d4af37]/60 pointer-events-none" />

          {/* Hover overlay hint */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
            <Maximize2 className="w-3.5 h-3.5 text-[#d4af37] drop-shadow" />
          </div>
        </div>
      </div>

      {/* Expanded Modal to Inspect Graphic 100% Intact */}
      {showModal && (
        <div 
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fade-in"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="relative max-w-4xl w-full bg-[#080305] border border-[#d4af37]/50 rounded-2xl p-4 sm:p-6 shadow-[0_0_50px_rgba(0,0,0,0.95)] flex flex-col items-center gap-4"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="w-full flex items-center justify-between border-b border-[#2d1b22] pb-3 text-xs font-mono">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <span className="text-[#f5d77f] font-bold tracking-widest uppercase">
                  ESCUDO OFICIAL ECEME // GRÁFICO ORIGINAL INTACTO
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

            {/* High-Resolution Graphic Viewer */}
            <div className="w-full relative aspect-[16/9] rounded-xl overflow-hidden border border-[#4a2e1d] bg-black shadow-2xl flex items-center justify-center">
              <img
                src={sources[srcIndex]}
                onError={handleImgError}
                alt="Escudo ECEME Negro - 'SER ANTES QUE PARECER'"
                className="w-full h-full object-contain select-none"
              />
            </div>

            {/* Footer Details */}
            <div className="w-full flex flex-wrap items-center justify-between gap-3 text-xs font-mono pt-2 border-t border-[#2d1b22]">
              <div className="flex flex-col text-left">
                <span className="text-white font-bold tracking-wider">
                  Escuela de Comando y Estado Mayor "Mcal. Andrés de Santa Cruz"
                </span>
                <span className="text-[#d4af37] italic font-serif text-sm">
                  "SER ANTES QUE PARECER"
                </span>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={sources[srcIndex]}
                  download="ESCUDO ECEME NEGRO.svg"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900 border border-amber-600/60 text-amber-300 font-bold transition-all text-[11px]"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar Gráfico</span>
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
