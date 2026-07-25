import React from 'react';
import OfficialCrest from './OfficialCrest';

interface PIILCCLogoProps {
  variant?: 'header' | 'centerpiece';
  className?: string;
  size?: number;
}

export default function PIILCCLogo({ variant = 'header', className = '', size }: PIILCCLogoProps) {
  if (variant === 'header') {
    const finalSize = size || 44;
    return (
      <div className={`flex items-center gap-3.5 select-none ${className}`}>
        {/* Glowing Crest Container */}
        <div className="relative flex items-center justify-center shrink-0">
          <div className="absolute inset-0 bg-[#3b82f6]/10 blur-[10px] rounded-full animate-pulse" />
          <OfficialCrest size={finalSize} className="relative z-10 -my-2 transform hover:scale-105 transition-transform" />
          <div className="absolute -inset-1 border border-[#3b82f6]/20 rounded-full scale-90 pointer-events-none" />
        </div>

        {/* Vertical divider */}
        <div className="h-9 w-px bg-gradient-to-b from-[#1a1a1a] via-[#333] to-[#1a1a1a]" />

        {/* Brand Text */}
        <div className="flex flex-col justify-center text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-sm md:text-base font-extrabold tracking-wider font-sans bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
              PII-LCC
            </span>
            <span className="text-[7.5px] font-mono font-bold tracking-widest text-[#d4af37] border border-[#d4af37]/35 bg-[#d4af37]/5 px-1 py-0.5 rounded leading-none uppercase">
              SISTEMA TÁCTICO
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[8.5px] text-[#3b82f6] font-mono uppercase tracking-widest leading-none font-bold">
              Plataforma Integrada de Inteligencia
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-ping" />
          </div>
        </div>
      </div>
    );
  }

  // centerpiece logo for landing / login screens
  const finalSize = size || 160;
  return (
    <div className={`flex flex-col items-center select-none text-center ${className}`}>
      {/* Sci-Fi HUD Bracket Overlay around Crest */}
      <div className="relative p-6 bg-black/40 border border-[#1a1a1a] rounded-2xl mb-4 max-w-sm w-full flex flex-col items-center shadow-[inset_0_0_20px_rgba(59,130,246,0.05)]">
        {/* HUD Brackets */}
        <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#d4af37]/40" />
        <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#d4af37]/40" />
        <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#d4af37]/40" />
        <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#d4af37]/40" />

        {/* Outer rotating/pulsating tech circle */}
        <div className="absolute w-[180px] h-[180px] border border-[#3b82f6]/10 border-dashed rounded-full animate-[spin_40s_linear_infinite]" />
        <div className="absolute w-[190px] h-[190px] border border-[#d4af37]/15 rounded-full animate-pulse" />

        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-tr from-[#3b82f6]/15 via-transparent to-[#d4af37]/10 blur-[15px] rounded-full" />
          <OfficialCrest size={finalSize} className="relative z-10" />
        </div>

        {/* Scan line effect */}
        <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#d4af37]/40 to-transparent top-0 animate-[bounce_6s_infinite] pointer-events-none" />
      </div>

      {/* Main Title typography */}
      <div className="space-y-1 md:space-y-1.5">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-normal text-white uppercase font-sans">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400 font-black">PII-LCC</span>
        </h1>
        <p className="text-xs md:text-sm text-[#d4af37] font-mono tracking-[0.25em] uppercase font-bold">
          Plataforma Integrada de Inteligencia militar
        </p>
        <p className="text-[9px] text-zinc-500 font-mono tracking-widest uppercase">
          LÍNEA DE CONTROL CLANDESTINO (LCC) // SEC-DEF NACIONAL
        </p>
      </div>

      {/* Terminal style connection sub-bar */}
      <div className="mt-4 flex items-center gap-4 bg-[#0a0a0a] border border-[#1a1a1a] px-3.5 py-1 rounded-md font-mono text-[9px] text-zinc-400">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
          <span className="text-[#10b981]">ENLACE CENTRAL ONLINE</span>
        </div>
        <div className="w-px h-3 bg-[#1a1a1a]" />
        <span>NODE_ID: PII-LCC-C2-CFM</span>
      </div>
    </div>
  );
}
