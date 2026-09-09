/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Gamepad2, Type, Check, Sparkles, ChevronDown } from 'lucide-react';
import { useGamingFont, GAMING_FONT_OPTIONS, GamingFontPreset } from '../utils/fontTheme';
import { playSyntheticBeep } from '../utils/audio';

interface GamerFontSelectorProps {
  compact?: boolean;
}

export const GamerFontSelector: React.FC<GamerFontSelectorProps> = ({ compact = false }) => {
  const { fontPreset, selectFont, currentOption } = useGamingFont();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (fontId: GamingFontPreset) => {
    selectFont(fontId);
    playSyntheticBeep(620, 0.12, 'sine', 0.1);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          playSyntheticBeep(480, 0.08, 'sine', 0.08);
        }}
        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer select-none ${
          isOpen
            ? 'bg-cyan-950/40 border-cyan-500/60 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
            : 'bg-zinc-950/70 border-zinc-800 text-zinc-300 hover:text-cyan-300 hover:border-cyan-800/60 hover:bg-cyan-950/20'
        }`}
        title="Cambiar Estilo de Letra Gamer / HUD de Videojuego"
      >
        <Gamepad2 className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
        
        {!compact && (
          <div className="flex flex-col text-left leading-none">
            <span className="text-[10px] font-bold text-cyan-300 tracking-wider">
              FUENTE GAMER
            </span>
            <span className="text-[8px] text-zinc-400 uppercase tracking-widest mt-0.5">
              {currentOption.name}
            </span>
          </div>
        )}

        <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform duration-200 ${isOpen ? 'rotate-180 text-cyan-400' : ''}`} />
      </button>

      {/* Futuristic Videogame Font Selector Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-11 mt-1 w-80 sm:w-96 bg-black/95 backdrop-blur-md border border-cyan-900/60 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(6,182,212,0.15)] p-3 z-50 text-left space-y-2.5 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
            <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="uppercase tracking-wider text-[10px]">Tipografía Estilo Videojuego</span>
            </div>
            <span className="text-[9px] bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 px-2 py-0.5 rounded font-mono font-bold">
              HUD ENGINE
            </span>
          </div>

          <p className="text-[10px] text-zinc-400 leading-relaxed">
            Personalice la estética tipográfica de toda la aplicación militar con fuentes icónicas de videojuegos y visores HUD de alta tecnología.
          </p>

          {/* List of Videogame Font Options */}
          <div className="space-y-1.5 pt-1">
            {GAMING_FONT_OPTIONS.map((opt) => {
              const isSelected = fontPreset === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelect(opt.id)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer flex flex-col gap-1 ${
                    isSelected
                      ? 'bg-cyan-950/30 border-cyan-500/80 text-white shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                      : 'bg-zinc-950/80 border-zinc-900 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 hover:border-zinc-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-bold ${isSelected ? 'text-cyan-300' : 'text-zinc-200'}`}>
                        {opt.name}
                      </span>
                      <span className="text-[8px] bg-zinc-900 text-zinc-500 px-1.5 py-0.5 rounded border border-zinc-800">
                        {opt.badge}
                      </span>
                    </div>
                    {isSelected && (
                      <div className="flex items-center gap-1 text-[10px] text-cyan-400 font-bold">
                        <Check className="w-3.5 h-3.5" />
                        <span>ACTIVO</span>
                      </div>
                    )}
                  </div>

                  {/* Sample rendered in this exact font */}
                  <div 
                    className={`text-[11px] tracking-wide rounded px-2 py-1 my-0.5 border ${
                      isSelected 
                        ? 'bg-cyan-950/50 border-cyan-800/50 text-cyan-200' 
                        : 'bg-black/60 border-zinc-900 text-zinc-300'
                    }`}
                    style={{ fontFamily: opt.fontFamily }}
                  >
                    {opt.sample}
                  </div>

                  <p className="text-[9px] text-zinc-500 line-clamp-1">
                    {opt.description}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-zinc-900 flex items-center justify-between text-[9px] text-zinc-500 font-mono">
            <span>PERSISTENCIA: GUARDADO LOCAL</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-cyan-400 hover:text-cyan-300 font-bold uppercase transition-colors cursor-pointer"
            >
              Aceptar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
