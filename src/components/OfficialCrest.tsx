/**
 * OfficialCrest.tsx
 * Official Military Crest of the Escuela de Comando y Estado Mayor (ECEME)
 * Motto: "SER ANTES QUE PARECER"
 * Features:
 * - Sculpted green laurel wreath
 * - Open leather-bound book with parchment pages
 * - Diagonal steel sword with ornate hilt and ruby pommel
 * - Bolivian national tricolor ribbon (Red, Yellow, Green)
 * - Crimson plaque with embossed golden lettering: "SER ANTES QUE PARECER"
 */

import React from 'react';

interface OfficialCrestProps {
  className?: string;
  size?: number;
  showMotto?: boolean;
}

export default function OfficialCrest({ 
  className = '', 
  size = 180, 
  showMotto = true 
}: OfficialCrestProps) {
  return (
    <div 
      className={`relative select-none flex items-center justify-center shrink-0 ${className}`} 
      style={{ width: size, height: size }}
      id="official-eceme-crest-container"
      title="Escuela de Comando y Estado Mayor - 'SER ANTES QUE PARECER'"
    >
      <svg
        viewBox="200 20 800 730"
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        className="filter drop-shadow-[0_8px_20px_rgba(0,0,0,0.9)] hover:scale-105 transition-transform duration-200"
      >
        <defs>
          {/* Depth & Relief Filters */}
          <filter id="eceme-emblem-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#000000" floodOpacity="0.85" />
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000000" floodOpacity="0.6" />
          </filter>

          <filter id="eceme-gold-bevel" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" result="blur" />
            <feSpecularLighting in="blur" surfaceScale="2" specularConstant="1.2" specularExponent="15" lightingColor="#fff5cc" result="spec">
              <fePointLight x="600" y="200" z="250" />
            </feSpecularLighting>
            <feComposite in="spec" in2="SourceAlpha" operator="in" result="specOut" />
            <feComposite in="SourceGraphic" in2="specOut" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
          </filter>

          {/* Gold / Bronze Gradients */}
          <linearGradient id="eceme-gold-metal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fdf1c8" />
            <stop offset="25%" stopColor="#d4af37" />
            <stop offset="50%" stopColor="#997a15" />
            <stop offset="75%" stopColor="#e8c868" />
            <stop offset="100%" stopColor="#80620f" />
          </linearGradient>

          <linearGradient id="eceme-gold-frame" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f5d77f" />
            <stop offset="30%" stopColor="#c69b2d" />
            <stop offset="70%" stopColor="#7a5a12" />
            <stop offset="100%" stopColor="#dfb957" />
          </linearGradient>

          {/* Crimson Plaque Gradient */}
          <linearGradient id="eceme-crimson-plaque" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#80141a" />
            <stop offset="40%" stopColor="#550b10" />
            <stop offset="80%" stopColor="#3b060a" />
            <stop offset="100%" stopColor="#4d090d" />
          </linearGradient>

          {/* Steel Sword Gradients */}
          <linearGradient id="eceme-sword-blade" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="35%" stopColor="#d6dadf" />
            <stop offset="50%" stopColor="#9aa2ab" />
            <stop offset="70%" stopColor="#dbe0e6" />
            <stop offset="100%" stopColor="#67717d" />
          </linearGradient>

          <linearGradient id="eceme-sword-edge" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#c0c7cf" />
            <stop offset="100%" stopColor="#5a636e" />
          </linearGradient>

          {/* Book Leather Gradients */}
          <linearGradient id="eceme-leather-cover" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#5c341e" />
            <stop offset="50%" stopColor="#3a1e0f" />
            <stop offset="100%" stopColor="#241107" />
          </linearGradient>

          {/* Parchment Gradients */}
          <linearGradient id="eceme-parchment-left" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d4bf94" />
            <stop offset="30%" stopColor="#f5e8cc" />
            <stop offset="85%" stopColor="#edd9b4" />
            <stop offset="100%" stopColor="#a48c60" />
          </linearGradient>

          <linearGradient id="eceme-parchment-right" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#9a8155" />
            <stop offset="20%" stopColor="#edd9b4" />
            <stop offset="70%" stopColor="#f5e8cc" />
            <stop offset="100%" stopColor="#cfba8f" />
          </linearGradient>

          {/* Laurel Leaves Gradients */}
          <linearGradient id="eceme-leaf-1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4d7c50" />
            <stop offset="45%" stopColor="#2d5530" />
            <stop offset="100%" stopColor="#18331b" />
          </linearGradient>
          
          <linearGradient id="eceme-leaf-2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#629966" />
            <stop offset="50%" stopColor="#37633b" />
            <stop offset="100%" stopColor="#1f3f23" />
          </linearGradient>

          {/* Bolivian Tricolor Ribbon Gradients */}
          <linearGradient id="eceme-ribbon-red" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f03a35" />
            <stop offset="50%" stopColor="#be1e1a" />
            <stop offset="100%" stopColor="#7e100d" />
          </linearGradient>

          <linearGradient id="eceme-ribbon-yellow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fff159" />
            <stop offset="50%" stopColor="#e5b80b" />
            <stop offset="100%" stopColor="#9c7800" />
          </linearGradient>

          <linearGradient id="eceme-ribbon-green" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2ecc71" />
            <stop offset="50%" stopColor="#1b8a47" />
            <stop offset="100%" stopColor="#0e5329" />
          </linearGradient>
        </defs>

        <g id="eceme-crest-body" filter="url(#eceme-emblem-shadow)">

          {/* 1. LAUREL WREATH */}
          <g id="eceme-laurel-wreath">
            {/* Left Branch */}
            <g id="eceme-left-wreath">
              <path d="M580 570 C 450 560, 320 480, 290 320 C 275 220, 310 120, 350 50" 
                    fill="none" stroke="#1d3820" strokeWidth="14" strokeLinecap="round" />

              <path d="M350 50 C 310 80, 315 135, 365 145 C 375 110, 370 75, 350 50 Z" fill="url(#eceme-leaf-2)" />
              <path d="M350 50 C 335 90, 350 125, 365 145" stroke="#7ac47f" strokeWidth="1.5" fill="none" opacity="0.7" />

              <path d="M305 115 C 265 145, 275 200, 325 210 C 340 175, 335 135, 305 115 Z" fill="url(#eceme-leaf-1)" />
              <path d="M305 115 C 290 155, 310 190, 325 210" stroke="#7ac47f" strokeWidth="1.5" fill="none" opacity="0.7" />

              <path d="M280 185 C 235 220, 250 280, 305 285 C 320 250, 310 205, 280 185 Z" fill="url(#eceme-leaf-2)" />
              <path d="M280 185 C 265 230, 285 265, 305 285" stroke="#7ac47f" strokeWidth="1.8" fill="none" opacity="0.7" />

              <path d="M270 265 C 220 305, 235 365, 295 370 C 310 330, 300 285, 270 265 Z" fill="url(#eceme-leaf-1)" />
              <path d="M270 265 C 255 310, 275 348, 295 370" stroke="#7ac47f" strokeWidth="2" fill="none" opacity="0.6" />

              <path d="M275 345 C 230 390, 250 450, 310 450 C 325 410, 310 365, 275 345 Z" fill="url(#eceme-leaf-2)" />
              <path d="M295 425 C 255 470, 280 525, 340 520 C 350 480, 330 440, 295 425 Z" fill="url(#eceme-leaf-1)" />
              <path d="M335 490 C 300 540, 340 580, 400 565 C 405 525, 375 495, 335 490 Z" fill="url(#eceme-leaf-2)" />
              <path d="M390 535 C 370 585, 430 610, 480 585 C 475 545, 435 525, 390 535 Z" fill="url(#eceme-leaf-1)" />

              {/* Inner Left Leaves */}
              <path d="M340 100 C 370 130, 380 175, 350 205 C 320 185, 320 140, 340 100 Z" fill="url(#eceme-leaf-1)" />
              <path d="M315 170 C 350 200, 360 250, 330 280 C 300 260, 295 210, 315 170 Z" fill="url(#eceme-leaf-2)" />
              <path d="M305 245 C 345 280, 355 330, 320 360 C 290 340, 285 290, 305 245 Z" fill="url(#eceme-leaf-1)" />
              <path d="M310 325 C 355 360, 360 410, 330 440 C 295 420, 290 370, 310 325 Z" fill="url(#eceme-leaf-2)" />
              <path d="M330 400 C 375 435, 380 485, 350 515 C 315 495, 310 445, 330 400 Z" fill="url(#eceme-leaf-1)" />
              <path d="M370 465 C 415 500, 420 545, 390 570 C 355 550, 350 505, 370 465 Z" fill="url(#eceme-leaf-2)" />
              <path d="M430 515 C 475 545, 480 585, 450 605 C 415 585, 410 545, 430 515 Z" fill="url(#eceme-leaf-1)" />
            </g>

            {/* Right Branch */}
            <g id="eceme-right-wreath">
              <path d="M620 570 C 750 560, 880 480, 910 320 C 925 220, 890 120, 850 50" 
                    fill="none" stroke="#1d3820" strokeWidth="14" strokeLinecap="round" />

              <path d="M850 50 C 890 80, 885 135, 835 145 C 825 110, 830 75, 850 50 Z" fill="url(#eceme-leaf-2)" />
              <path d="M850 50 C 865 90, 850 125, 835 145" stroke="#7ac47f" strokeWidth="1.5" fill="none" opacity="0.7" />

              <path d="M895 115 C 935 145, 925 200, 875 210 C 860 175, 865 135, 895 115 Z" fill="url(#eceme-leaf-1)" />
              <path d="M895 115 C 910 155, 890 190, 875 210" stroke="#7ac47f" strokeWidth="1.5" fill="none" opacity="0.7" />

              <path d="M920 185 C 965 220, 950 280, 895 285 C 880 250, 890 205, 920 185 Z" fill="url(#eceme-leaf-2)" />
              <path d="M920 185 C 935 230, 915 265, 895 285" stroke="#7ac47f" strokeWidth="1.8" fill="none" opacity="0.7" />

              <path d="M930 265 C 980 305, 965 365, 905 370 C 890 330, 900 285, 930 265 Z" fill="url(#eceme-leaf-1)" />
              <path d="M930 265 C 945 310, 925 348, 905 370" stroke="#7ac47f" strokeWidth="2" fill="none" opacity="0.6" />

              <path d="M925 345 C 970 390, 950 450, 890 450 C 875 410, 890 365, 925 345 Z" fill="url(#eceme-leaf-2)" />
              <path d="M905 425 C 945 470, 920 525, 860 520 C 850 480, 870 440, 905 425 Z" fill="url(#eceme-leaf-1)" />
              <path d="M865 490 C 900 540, 860 580, 800 565 C 795 525, 825 495, 865 490 Z" fill="url(#eceme-leaf-2)" />
              <path d="M810 535 C 830 585, 770 610, 720 585 C 725 545, 765 525, 810 535 Z" fill="url(#eceme-leaf-1)" />

              {/* Inner Right Leaves */}
              <path d="M860 100 C 830 130, 820 175, 850 205 C 880 185, 880 140, 860 100 Z" fill="url(#eceme-leaf-1)" />
              <path d="M885 170 C 850 200, 840 250, 870 280 C 900 260, 905 210, 885 170 Z" fill="url(#eceme-leaf-2)" />
              <path d="M895 245 C 855 280, 845 330, 880 360 C 910 340, 915 290, 895 245 Z" fill="url(#eceme-leaf-1)" />
              <path d="M890 325 C 845 360, 840 410, 870 440 C 905 420, 910 370, 890 325 Z" fill="url(#eceme-leaf-2)" />
              <path d="M870 400 C 825 435, 820 485, 850 515 C 885 495, 890 445, 870 400 Z" fill="url(#eceme-leaf-1)" />
              <path d="M830 465 C 785 500, 780 545, 810 570 C 845 550, 850 505, 830 465 Z" fill="url(#eceme-leaf-2)" />
              <path d="M770 515 C 725 545, 720 585, 750 605 C 785 585, 790 545, 770 515 Z" fill="url(#eceme-leaf-1)" />
            </g>
          </g>

          {/* 2. OPEN LEATHER BOOK */}
          <g id="eceme-open-book">
            <path d="M410 220 L 590 225 L 590 480 L 415 470 Z" fill="url(#eceme-leather-cover)" />
            <path d="M790 220 L 610 225 L 610 480 L 785 470 Z" fill="url(#eceme-leather-cover)" />
            
            {/* Gold Corner Mounts */}
            <path d="M410 220 L 445 221 L 411 255 Z" fill="url(#eceme-gold-metal)" />
            <path d="M415 470 L 450 469 L 416 435 Z" fill="url(#eceme-gold-metal)" />

            {/* Left Pages */}
            <path d="M420 225 C 470 230, 550 235, 595 240 L 595 465 C 550 460, 470 455, 425 460 Z" 
                  fill="url(#eceme-parchment-left)" />
            <path d="M580 238 C 590 239, 595 240, 595 240 L 595 465 C 595 465, 590 464, 580 463 Z" 
                  fill="#7a633a" opacity="0.6" />

            {/* Right Pages */}
            <path d="M605 240 C 650 235, 730 230, 780 225 L 775 460 C 730 455, 650 460, 605 465 Z" 
                  fill="url(#eceme-parchment-right)" />
            <path d="M605 240 C 610 240, 620 239, 620 239 L 620 463 C 620 463, 610 464, 605 465 Z" 
                  fill="#7a633a" opacity="0.6" />

            {/* Spine Crease */}
            <path d="M595 240 L 605 240 L 605 465 L 595 465 Z" fill="#4d3b1e" />

            {/* Simulated Calligraphy / Text Lines */}
            <g stroke="#614b30" strokeWidth="2.2" strokeLinecap="round" opacity="0.75">
              <line x1="445" y1="260" x2="570" y2="262" />
              <line x1="445" y1="280" x2="570" y2="282" />
              <line x1="445" y1="300" x2="550" y2="302" />
              <line x1="445" y1="320" x2="570" y2="322" />
              <line x1="445" y1="340" x2="560" y2="342" />
              <line x1="445" y1="360" x2="570" y2="362" />
              <line x1="445" y1="380" x2="555" y2="382" />
              <line x1="445" y1="400" x2="570" y2="402" />
              <line x1="445" y1="420" x2="540" y2="422" />
              <line x1="445" y1="440" x2="565" y2="442" />

              <line x1="630" y1="262" x2="755" y2="260" />
              <line x1="630" y1="282" x2="745" y2="280" />
              <line x1="630" y1="302" x2="755" y2="300" />
              <line x1="630" y1="322" x2="740" y2="320" />
              <line x1="630" y1="342" x2="755" y2="340" />
              <line x1="630" y1="362" x2="750" y2="360" />
              <line x1="630" y1="382" x2="755" y2="380" />
              <line x1="630" y1="402" x2="735" y2="400" />
              <line x1="630" y1="422" x2="755" y2="420" />
              <line x1="630" y1="442" x2="745" y2="440" />
            </g>
          </g>

          {/* 3. DIAGONAL STEEL SWORD */}
          <g id="eceme-tactical-sword">
            {/* Blade Shadow */}
            <path d="M830 145 L 395 545 L 385 540 L 820 135 Z" fill="#150d08" opacity="0.45" />

            {/* Sword Blade */}
            <path d="M800 170 L 400 535 L 388 543 L 415 515 L 780 155 Z" fill="url(#eceme-sword-blade)" />
            <line x1="790" y1="162" x2="395" y2="538" stroke="#ffffff" strokeWidth="2.5" opacity="0.95" />
            <path d="M780 155 L 790 162 L 395 538 L 388 543 Z" fill="url(#eceme-sword-edge)" />
            <path d="M790 162 L 800 170 L 415 515 L 395 538 Z" fill="#6f7985" />

            {/* Blade Runes / Inscriptions */}
            <g stroke="#9fa7b0" strokeWidth="1.2" fill="none" opacity="0.85">
              <path d="M740 205 Q 735 215 725 220 Q 715 225 710 235" />
              <path d="M710 235 Q 700 245 690 250 Q 680 255 675 265" />
              <path d="M675 265 Q 665 275 655 280 Q 645 285 640 295" />
            </g>

            {/* Crossguard (Gavilanes) */}
            <path d="M825 125 C 835 150, 815 175, 755 200 L 765 215 C 830 190, 855 160, 840 120 Z" 
                  fill="url(#eceme-gold-metal)" filter="url(#eceme-gold-bevel)" />
            <path d="M790 110 C 765 120, 740 100, 715 40 L 730 35 C 750 90, 775 105, 805 95 Z" 
                  fill="url(#eceme-gold-metal)" filter="url(#eceme-gold-bevel)" />
            <polygon points="795,145 815,135 805,160 785,170" fill="url(#eceme-gold-frame)" />

            {/* Hilt / Wire-wrapped Grip */}
            <path d="M805 145 L 850 100 L 865 115 L 820 160 Z" fill="url(#eceme-gold-frame)" />
            <line x1="812" y1="138" x2="827" y2="153" stroke="#2b200b" strokeWidth="3" />
            <line x1="822" y1="128" x2="837" y2="143" stroke="#2b200b" strokeWidth="3" />
            <line x1="832" y1="118" x2="847" y2="133" stroke="#2b200b" strokeWidth="3" />
            <line x1="842" y1="108" x2="857" y2="123" stroke="#2b200b" strokeWidth="3" />

            {/* Pommel with Ruby Gem */}
            <circle cx="865" cy="100" r="18" fill="url(#eceme-gold-metal)" filter="url(#eceme-gold-bevel)" />
            <circle cx="865" cy="100" r="10" fill="#a81c22" stroke="#5a0b0f" strokeWidth="1.5" />
            <circle cx="863" cy="98" r="3" fill="#ffffff" opacity="0.8" />
          </g>

          {/* 4. BOLIVIAN TRICOLOR RIBBON */}
          <g id="eceme-bolivian-ribbon">
            <path d="M535 565 C 575 560, 625 560, 665 565 L 665 580 C 625 575, 575 575, 535 580 Z" fill="url(#eceme-ribbon-red)" />
            <path d="M535 580 C 575 575, 625 575, 665 580 L 665 595 C 625 590, 575 590, 535 595 Z" fill="url(#eceme-ribbon-yellow)" />
            <path d="M535 595 C 575 590, 625 590, 665 595 L 665 612 C 625 607, 575 607, 535 612 Z" fill="url(#eceme-ribbon-green)" />

            <path d="M585 560 L 615 560 L 618 615 L 582 615 Z" fill="#caa035" stroke="#7a5a12" strokeWidth="1.5" />
            <path d="M588 565 L 612 565 L 610 610 L 590 610 Z" fill="url(#eceme-gold-metal)" />

            {/* Crossed Ribbon Tails */}
            <g id="eceme-ribbon-tails">
              <path d="M555 610 L 470 650 L 490 660 L 570 618 Z" fill="url(#eceme-ribbon-red)" />
              <path d="M560 615 L 485 655 L 505 665 L 575 623 Z" fill="url(#eceme-ribbon-yellow)" />
              <path d="M565 620 L 500 660 L 520 670 L 580 628 Z" fill="url(#eceme-ribbon-green)" />

              <path d="M645 610 L 730 650 L 710 660 L 630 618 Z" fill="url(#eceme-ribbon-red)" />
              <path d="M640 615 L 715 655 L 695 665 L 625 623 Z" fill="url(#eceme-ribbon-yellow)" />
              <path d="M635 620 L 700 660 L 680 670 L 620 628 Z" fill="url(#eceme-ribbon-green)" />
            </g>
          </g>

          {/* 5. CRIMSON EMBOSSED PLAQUE & MOTTO: "SER ANTES QUE PARECER" */}
          {showMotto && (
            <g id="eceme-motto-banner" transform="translate(0, 40)">
              {/* Plaque Drop Shadow */}
              <rect x="238" y="598" width="724" height="84" rx="8" fill="#000000" opacity="0.6" />

              {/* Gold Outer Beveled Frame */}
              <rect x="240" y="600" width="720" height="80" rx="6" 
                    fill="url(#eceme-gold-frame)" stroke="#6a4c0c" strokeWidth="2" filter="url(#eceme-gold-bevel)" />

              {/* Inner Crimson Plate */}
              <rect x="248" y="608" width="704" height="64" rx="4" 
                    fill="url(#eceme-crimson-plaque)" stroke="#3a060a" strokeWidth="2" />
              
              <rect x="250" y="610" width="700" height="60" rx="3" 
                    fill="none" stroke="#ba2b33" strokeWidth="1.2" opacity="0.4" />

              {/* Deep 3D Shadow for Letters */}
              <text x="600" y="654" 
                    fontFamily="'Cinzel', 'Times New Roman', 'Georgia', serif" 
                    fontSize="44" 
                    fontWeight="900" 
                    letterSpacing="5" 
                    textAnchor="middle" 
                    fill="#1a0406" 
                    opacity="0.95" 
                    dy="2">
                "SER ANTES QUE PARECER"
              </text>

              {/* 3D Embossed Golden Letters */}
              <text x="600" y="652" 
                    fontFamily="'Cinzel', 'Times New Roman', 'Georgia', serif" 
                    fontSize="44" 
                    fontWeight="900" 
                    letterSpacing="5" 
                    textAnchor="middle" 
                    fill="url(#eceme-gold-metal)" 
                    filter="url(#eceme-gold-bevel)">
                "SER ANTES QUE PARECER"
              </text>
            </g>
          )}

        </g>
      </svg>
    </div>
  );
}
