/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { safeStorage } from './storage';

export type GamingFontPreset = 'CYBER' | 'ORBITRON' | 'CHAKRA' | 'TERMINAL';

export interface GamingFontOption {
  id: GamingFontPreset;
  name: string;
  gameStyle: string;
  badge: string;
  fontFamily: string;
  className: string;
  sample: string;
  description: string;
}

export const GAMING_FONT_OPTIONS: GamingFontOption[] = [
  {
    id: 'CYBER',
    name: 'Cyberpunk HUD',
    gameStyle: 'Oxanium (Videojuego Sci-Fi / RPG)',
    badge: 'PREDETERMINADO GAMER',
    fontFamily: '"Oxanium", "Orbitron", sans-serif',
    className: 'font-preset-cyber',
    sample: 'MISIÓN ALPHA-7 // C4ISR TÁCTICO // 99.4% NOMINAL',
    description: 'Diseñada específicamente para interfaces HUD de videojuegos y pantallas de puntuación, con cortes angulares limpios y máxima legibilidad.'
  },
  {
    id: 'ORBITRON',
    name: 'Sci-Fi Mecha Warfare',
    gameStyle: 'Orbitron Heavy (Estrategia / Mecha)',
    badge: 'MECHA WARFARE',
    fontFamily: '"Orbitron", "Oxanium", sans-serif',
    className: 'font-preset-orbitron',
    sample: 'TACTICAL RADAR ONLINE // COMANDO ESTRATÉGICO',
    description: 'Tipografía geométrica de alto impacto visual, inspirada en simuladores espaciales, naves de combate y juegos de estrategia militar.'
  },
  {
    id: 'CHAKRA',
    name: 'Spec-Ops Shooter',
    gameStyle: 'Chakra Petch (FPS / Simulación)',
    badge: 'COMBATE TÁCTICO',
    fontFamily: '"Chakra Petch", "Oxanium", sans-serif',
    className: 'font-preset-chakra',
    sample: 'S-2 BÚSQUEDA Y VIGILANCIA FRONTERIZA // ESTADO VIVO',
    description: 'Estilo shooter militar táctico con esquinas facetadas y aspecto agresivo de mira holográfica y visor balístico.'
  },
  {
    id: 'TERMINAL',
    name: 'Cyber-Warfare Terminal',
    gameStyle: 'Share Tech Mono (Hacker / Telemetría)',
    badge: 'TERMINAL OPS',
    fontFamily: '"Share Tech Mono", monospace',
    className: 'font-preset-terminal',
    sample: 'SIGINT DECRYPT: [0x7FF8A] TELEMETRY PACKET OK',
    description: 'Monospace de telemetría de satélite y consola militar de mando para lectura de alta densidad de datos tácticos.'
  }
];

export function useGamingFont() {
  const [fontPreset, setFontPreset] = useState<GamingFontPreset>(() => {
    const saved = safeStorage.getItem('PII_LCC_GAME_FONT');
    if (saved === 'CYBER' || saved === 'ORBITRON' || saved === 'CHAKRA' || saved === 'TERMINAL') {
      return saved as GamingFontPreset;
    }
    return 'CYBER';
  });

  const selectFont = (font: GamingFontPreset) => {
    setFontPreset(font);
    safeStorage.setItem('PII_LCC_GAME_FONT', font);
    applyFontClassToDocument(font);
  };

  useEffect(() => {
    applyFontClassToDocument(fontPreset);
  }, [fontPreset]);

  return { 
    fontPreset, 
    selectFont, 
    currentOption: GAMING_FONT_OPTIONS.find(o => o.id === fontPreset) || GAMING_FONT_OPTIONS[0] 
  };
}

function applyFontClassToDocument(font: GamingFontPreset) {
  if (typeof document === 'undefined') return;
  const classesToRemove = ['font-preset-cyber', 'font-preset-orbitron', 'font-preset-chakra', 'font-preset-terminal'];
  classesToRemove.forEach(cls => {
    document.documentElement.classList.remove(cls);
    document.body.classList.remove(cls);
  });
  
  const opt = GAMING_FONT_OPTIONS.find(o => o.id === font);
  if (opt) {
    document.documentElement.classList.add(opt.className);
    document.body.classList.add(opt.className);
  }
}
