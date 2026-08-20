/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';

interface OfficialCrestProps {
  className?: string;
  size?: number;
}

export default function OfficialCrest({ className = '', size = 180 }: OfficialCrestProps) {
  const [srcIndex, setSrcIndex] = useState(0);
  const [hasError, setHasError] = useState(false);

  const sources = [
    'https://lh3.googleusercontent.com/d/1YsoUOljlTIBhNg3KVTgIYUX4Fp3a6yur',
    'https://drive.google.com/thumbnail?id=1YsoUOljlTIBhNg3KVTgIYUX4Fp3a6yur&sz=w1000',
    'https://drive.google.com/uc?export=view&id=1YsoUOljlTIBhNg3KVTgIYUX4Fp3a6yur'
  ];

  const handleImgError = () => {
    if (srcIndex < sources.length - 1) {
      setSrcIndex(prev => prev + 1);
    } else {
      setHasError(true);
    }
  };

  if (!hasError) {
    return (
      <div 
        className={`relative select-none flex items-center justify-center shrink-0 ${className}`} 
        style={{ width: size, height: size }}
        id="official-crest-container"
      >
        <img
          src={sources[srcIndex]}
          onError={handleImgError}
          alt="Escudo Oficial PII-LCC"
          style={{ width: size, height: size }}
          className="object-contain filter drop-shadow-[0_10px_25px_rgba(0,0,0,0.85)] hover:scale-105 transition-transform duration-200"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  return (
    <div 
      className={`relative select-none flex items-center justify-center ${className}`} 
      style={{ width: size, height: size }}
      id="official-crest-container"
    >
      <svg
        viewBox="0 0 300 300"
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-[0_10px_25px_rgba(0,0,0,0.85)]"
      >
        <defs>
          {/* Multi-stop High-Lustre Metallic Gold Gradient (gives realistic 3D chrome/gold reflections) */}
          <linearGradient id="gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fff9db" />
            <stop offset="15%" stopColor="#e5a93b" />
            <stop offset="30%" stopColor="#8a5e12" />
            <stop offset="45%" stopColor="#f9d976" />
            <stop offset="55%" stopColor="#fff6c5" />
            <stop offset="70%" stopColor="#b38220" />
            <stop offset="85%" stopColor="#5c3f05" />
            <stop offset="100%" stopColor="#f3c65f" />
          </linearGradient>

          {/* Dark Gold Gradient for deep bevels and shadows */}
          <linearGradient id="dark-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8a5e12" />
            <stop offset="50%" stopColor="#5c3f05" />
            <stop offset="100%" stopColor="#301f01" />
          </linearGradient>

          {/* High-Contrast Silver/Steel Gradient for the saber blade */}
          <linearGradient id="silver-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="35%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#94a3b8" />
            <stop offset="75%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>

          {/* Spherically Domed Navy Blue Inner Shield Gradient */}
          <radialGradient id="shield-grad" cx="50%" cy="40%" r="60%" fx="50%" fy="30%">
            <stop offset="0%" stopColor="#1d4ed8" />
            <stop offset="40%" stopColor="#1e3a8a" />
            <stop offset="75%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#020617" />
          </radialGradient>

          {/* Hyper-Realistic Fire/Flame Gradients */}
          <linearGradient id="flame-outer-grad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#dc2626" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#ea580c" />
            <stop offset="80%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#fef08a" stopOpacity="0.4" />
          </linearGradient>

          <linearGradient id="flame-mid-grad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#ea580c" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#fef08a" />
          </linearGradient>

          <linearGradient id="flame-inner-grad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="70%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>

          {/* Deep Navy/Black Horizontal Ribbon Gradient with Silk Sheen */}
          <linearGradient id="ribbon-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#030712" />
            <stop offset="15%" stopColor="#172554" />
            <stop offset="50%" stopColor="#1e3a8a" />
            <stop offset="85%" stopColor="#172554" />
            <stop offset="100%" stopColor="#030712" />
          </linearGradient>

          {/* Cinematic SVG Filters for 3D Relief and Physical Separation */}
          <filter id="drop-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#000000" floodOpacity="0.85" />
          </filter>

          <filter id="element-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3.5" stdDeviation="3" floodColor="#000000" floodOpacity="0.7" />
          </filter>

          <filter id="text-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1" floodColor="#000000" floodOpacity="0.95" />
          </filter>

          <filter id="flame-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ========================================== */}
        {/* 1. OUTER LAUREL WREATH (High-Fidelity 3D Gold Leaf) */}
        {/* ========================================== */}
        <g id="laurel-wreath" filter="url(#drop-shadow)">
          {/* Behind 3D shadow offset paths for deep relief */}
          <g fill="url(#dark-gold)" opacity="0.6" transform="translate(0, 2.5)">
            {/* Left Laurel Branch Shadow */}
            <path d="M 125 228 C 105 226, 85 215, 76 195 C 78 193, 88 198, 102 206 C 114 212, 122 220, 125 228 Z" />
            <path d="M 108 208 C 88 202, 72 188, 66 168 C 69 166, 78 172, 90 182 C 100 190, 106 200, 108 208 Z" />
            <path d="M 95 185 C 76 177, 62 161, 58 140 C 61 138, 70 145, 80 156 C 89 165, 93 176, 95 185 Z" />
            <path d="M 88 158 C 70 148, 58 131, 56 110 C 59 108, 67 116, 75 128 C 82 138, 86 149, 88 158 Z" />
            <path d="M 86 130 C 70 118, 60 101, 62 80 C 65 79, 72 87, 77 100 C 81 110, 84 121, 86 130 Z" />
            <path d="M 90 104 C 76 91, 70 73, 76 54 C 79 54, 84 63, 87 76 C 89 86, 90 96, 90 104 Z" />
            <path d="M 102 81 C 91 67, 88 49, 98 32 C 100 33, 104 43, 104 56 C 104 66, 103 74, 102 81 Z" />
            <path d="M 118 62 C 110 47, 112 29, 125 15 C 126 17, 127 28, 124 41 C 122 50, 120 57, 118 62 Z" />
            {/* Right Laurel Branch Shadow */}
            <path d="M 175 228 C 195 226, 215 215, 224 195 C 222 193, 212 198, 198 206 C 186 212, 178 220, 175 228 Z" />
            <path d="M 192 208 C 212 202, 228 188, 234 168 C 231 166, 222 172, 210 182 C 200 190, 194 200, 192 208 Z" />
            <path d="M 205 185 C 224 177, 238 161, 242 140 C 239 138, 230 145, 220 156 C 211 165, 207 176, 205 185 Z" />
            <path d="M 212 158 C 230 148, 242 131, 244 110 C 241 108, 233 116, 225 128 C 218 138, 214 149, 212 158 Z" />
            <path d="M 214 130 C 230 118, 240 101, 238 80 C 235 79, 228 87, 223 100 C 219 110, 216 121, 214 130 Z" />
            <path d="M 210 104 C 224 91, 230 73, 224 54 C 221 54, 216 63, 213 76 C 211 86, 210 96, 210 104 Z" />
            <path d="M 198 81 C 209 67, 212 49, 202 32 C 200 33, 196 43, 196 56 C 196 66, 197 74, 198 81 Z" />
            <path d="M 182 62 C 190 47, 188 29, 175 15 C 174 17, 173 28, 176 41 C 178 50, 180 57, 182 62 Z" />
          </g>

          {/* Front Gilded Laurel Branches */}
          <g fill="url(#gold-grad)" stroke="#5c3f05" strokeWidth="0.4" strokeLinejoin="round">
            {/* Left Laurel Branch */}
            <path d="M 125 228 C 105 226, 85 215, 76 195 C 78 193, 88 198, 102 206 C 114 212, 122 220, 125 228 Z" />
            <path d="M 108 208 C 88 202, 72 188, 66 168 C 69 166, 78 172, 90 182 C 100 190, 106 200, 108 208 Z" />
            <path d="M 95 185 C 76 177, 62 161, 58 140 C 61 138, 70 145, 80 156 C 89 165, 93 176, 95 185 Z" />
            <path d="M 88 158 C 70 148, 58 131, 56 110 C 59 108, 67 116, 75 128 C 82 138, 86 149, 88 158 Z" />
            <path d="M 86 130 C 70 118, 60 101, 62 80 C 65 79, 72 87, 77 100 C 81 110, 84 121, 86 130 Z" />
            <path d="M 90 104 C 76 91, 70 73, 76 54 C 79 54, 84 63, 87 76 C 89 86, 90 96, 90 104 Z" />
            <path d="M 102 81 C 91 67, 88 49, 98 32 C 100 33, 104 43, 104 56 C 104 66, 103 74, 102 81 Z" />
            <path d="M 118 62 C 110 47, 112 29, 125 15 C 126 17, 127 28, 124 41 C 122 50, 120 57, 118 62 Z" />

            {/* Right Laurel Branch */}
            <path d="M 175 228 C 195 226, 215 215, 224 195 C 222 193, 212 198, 198 206 C 186 212, 178 220, 175 228 Z" />
            <path d="M 192 208 C 212 202, 228 188, 234 168 C 231 166, 222 172, 210 182 C 200 190, 194 200, 192 208 Z" />
            <path d="M 205 185 C 224 177, 238 161, 242 140 C 239 138, 230 145, 220 156 C 211 165, 207 176, 205 185 Z" />
            <path d="M 212 158 C 230 148, 242 131, 244 110 C 241 108, 233 116, 225 128 C 218 138, 214 149, 212 158 Z" />
            <path d="M 214 130 C 230 118, 240 101, 238 80 C 235 79, 228 87, 223 100 C 219 110, 216 121, 214 130 Z" />
            <path d="M 210 104 C 224 91, 230 73, 224 54 C 221 54, 216 63, 213 76 C 211 86, 210 96, 210 104 Z" />
            <path d="M 198 81 C 209 67, 212 49, 202 32 C 200 33, 196 43, 196 56 C 196 66, 197 74, 198 81 Z" />
            <path d="M 182 62 C 190 47, 188 29, 175 15 C 174 17, 173 28, 176 41 C 178 50, 180 57, 182 62 Z" />
          </g>

          {/* Leaf vein details for 3D realism */}
          <g stroke="url(#dark-gold)" strokeWidth="0.8" fill="none" opacity="0.85">
            {/* Left branch veins */}
            <path d="M 125 228 C 115 218, 105 210, 89 203" />
            <path d="M 108 208 C 98 198, 88 188, 78 178" />
            <path d="M 95 185 C 85 174, 76 163, 69 151" />
            <path d="M 88 158 C 78 147, 71 135, 66 121" />
            <path d="M 86 130 C 77 118, 71 106, 69 92" />
            <path d="M 90 104 C 82 91, 78 78, 80 64" />
            <path d="M 102 81 C 96 67, 94 53, 100 41" />
            <path d="M 118 62 C 114 47, 116 34, 122 23" />
            {/* Right branch veins */}
            <path d="M 175 228 C 185 218, 195 210, 211 203" />
            <path d="M 192 208 C 202 198, 212 188, 222 178" />
            <path d="M 205 185 C 215 174, 224 163, 231 151" />
            <path d="M 212 158 C 222 147, 229 135, 234 121" />
            <path d="M 214 130 C 223 118, 229 106, 231 92" />
            <path d="M 210 104 C 218 91, 222 78, 220 64" />
            <path d="M 198 81 C 204 67, 206 53, 200 41" />
            <path d="M 182 62 C 186 47, 184 34, 178 23" />
          </g>

          {/* Central Connecting Bow/Stem Base */}
          <path d="M 136 230 C 136 244, 164 244, 164 230 C 164 220, 136 220, 136 230 Z" fill="url(#dark-gold)" stroke="#301f01" strokeWidth="0.5" />
          <path d="M 138 230 C 138 242, 162 242, 162 230 C 162 222, 138 222, 138 230 Z" fill="url(#gold-grad)" stroke="#5c3f05" strokeWidth="0.4" />
        </g>

        {/* ========================================== */}
        {/* 2. MAIN SHIELD BODY (Cinematic Beveled Relief) */}
        {/* ========================================== */}
        <g id="main-shield" filter="url(#drop-shadow)">
          {/* Layer A: Cast shadow/relief outline (thick, dark gold bottom bevel) */}
          <path 
            d="M 150 72 
               C 168 68, 192 56, 214 62 
               C 224 65, 226 78, 221 98 
               C 216 118, 211 138, 220 158 
               C 225 170, 215 188, 195 204 
               C 175 216, 160 222, 150 230 
               C 140 222, 125 216, 105 204 
               C 85 188, 75 170, 80 158 
               C 89 138, 84 118, 79 98 
               C 74 78, 76 65, 86 62 
               C 108 56, 132 68, 150 72 Z" 
            fill="url(#dark-gold)"
            transform="translate(0, 3)"
          />

          {/* Layer B: Main Gold Outer Rim */}
          <path 
            d="M 150 72 
               C 168 68, 192 56, 214 62 
               C 224 65, 226 78, 221 98 
               C 216 118, 211 138, 220 158 
               C 225 170, 215 188, 195 204 
               C 175 216, 160 222, 150 230 
               C 140 222, 125 216, 105 204 
               C 85 188, 75 170, 80 158 
               C 89 138, 84 118, 79 98 
               C 74 78, 76 65, 86 62 
               C 108 56, 132 68, 150 72 Z" 
            fill="url(#gold-grad)" 
            stroke="#5c3f05" 
            strokeWidth="0.8"
          />

          {/* Layer C: Edge Highlight Path (catches high light on the 3D rim) */}
          <path 
            d="M 150 73.5 
               C 167 69.5, 190 57.5, 212 63.5 
               C 221.5 66.5, 223.5 78.5, 219 97.5" 
            fill="none" 
            stroke="#ffffff" 
            strokeWidth="0.75" 
            opacity="0.9"
          />
          <path 
            d="M 88 63.5 
               C 109 57.5, 133 69.5, 150 73.5" 
            fill="none" 
            stroke="#ffffff" 
            strokeWidth="0.75" 
            opacity="0.9"
          />

          {/* Layer D: Dark Interstitial Infill */}
          <path 
            d="M 150 79 
               C 166 75, 187 64, 207 70 
               C 215 72, 217 83, 213 100 
               C 208 118, 203 138, 211 156 
               C 215 166, 207 182, 189 196 
               C 171 207, 158 212, 150 220 
               C 142 212, 129 207, 111 196 
               C 93 182, 85 166, 89 156 
               C 97 138, 92 118, 87 100 
               C 83 83, 85 72, 93 70 
               C 113 64, 134 75, 150 79 Z" 
            fill="#05070a" 
            stroke="#301f01"
            strokeWidth="0.5"
          />

          {/* Layer E: Inner Shield Rim (Second gold outline) */}
          <path 
            d="M 150 81 
               C 165 77, 185 66, 204 72 
               C 211 74, 213 84, 209 100 
               C 205 118, 200 137, 207 154 
               C 211 163, 204 178, 187 191 
               C 170 201, 158 206, 150 214 
               C 142 206, 130 201, 113 191 
               C 96 178, 89 163, 93 154 
               C 100 137, 95 118, 91 100 
               C 87 84, 89 74, 96 72 
               C 115 66, 135 77, 150 81 Z" 
            fill="url(#gold-grad)" 
          />

          {/* Layer F: Deep Navy Radiant Inner Shield Field (Simulates rich royal dome) */}
          <path 
            d="M 150 83 
               C 164 80, 184 70, 202 75 
               C 208 77, 210 86, 207 101 
               C 203 118, 198 137, 205 153 
               C 209 162, 202 176, 185 189 
               C 168 199, 157 204, 150 211 
               C 143 204, 132 199, 115 189 
               C 98 176, 91 162, 95 153 
               C 102 137, 97 118, 93 101 
               C 90 86, 92 77, 98 75 
               C 116 70, 136 80, 150 83 Z" 
            fill="url(#shield-grad)" 
          />
        </g>

        {/* ========================================== */}
        {/* 3. GOLDEN EAGLE IN THE CENTER (Symmetric & Richly Detailed) */}
        {/* ========================================== */}
        <g id="golden-eagle" fill="url(#gold-grad)" stroke="#5c3f05" strokeWidth="0.45" filter="url(#element-shadow)">
          {/* Symmetrical Tail Feathers Base */}
          <path d="M 145 132 L 137 157 L 150 165 L 163 157 L 155 132 Z" />
          {/* Inner Tail Feathers Detail */}
          <path d="M 147 132 L 142 155 L 150 161 L 158 155 L 153 132 Z" fill="url(#dark-gold)" stroke="#301f01" strokeWidth="0.4" />
          <path d="M 149 132 L 146 152 L 150 156 L 154 152 L 151 132 Z" fill="url(#gold-grad)" stroke="none" />

          {/* Symmetrical Left Wing (pointing majestically upwards and outwards) */}
          <g id="eagle-left-wing">
            {/* Wing Base Plume */}
            <path d="M 142 108 C 134 102, 120 96, 108 102 C 106 110, 112 120, 122 128 C 127 132, 134 135, 142 133 Z" />
            {/* Layered Primary Wing Feathers */}
            <path d="M 108 102 C 100 92, 98 76, 102 62 C 105 62, 108 72, 112 82 C 116 92, 120 100, 122 106 Z" />
            <path d="M 112 104 C 106 94, 104 80, 108 68 C 111 68, 114 76, 118 86 C 122 96, 124 102, 126 108 Z" />
            <path d="M 117 108 C 112 98, 110 86, 114 74 C 117 74, 120 82, 123 92 C 126 102, 128 106, 129 112 Z" />
            <path d="M 122 112 C 117 102, 115 92, 120 82 C 122 82, 125 88, 128 98 C 131 106, 132 110, 133 116 Z" />
            <path d="M 127 116 C 122 108, 120 98, 125 90 C 127 90, 129 96, 132 104 C 134 112, 135 116, 136 122 Z" />
            <path d="M 132 120 C 128 114, 127 104, 131 96 C 133 96, 134 100, 136 108 C 138 114, 139 120, 140 126 Z" />
            
            {/* Inner secondary feather veins */}
            <path d="M 110 80 L 120 102" stroke="url(#dark-gold)" strokeWidth="0.55" />
            <path d="M 115 84 L 123 104" stroke="url(#dark-gold)" strokeWidth="0.55" />
            <path d="M 120 90 L 127 110" stroke="url(#dark-gold)" strokeWidth="0.55" />
            <path d="M 125 94 L 131 114" stroke="url(#dark-gold)" strokeWidth="0.55" />
          </g>

          {/* Symmetrical Right Wing (pointing majestically upwards and outwards) */}
          <g id="eagle-right-wing">
            {/* Wing Base Plume */}
            <path d="M 158 108 C 166 102, 180 96, 192 102 C 194 110, 188 120, 178 128 C 173 132, 166 135, 158 133 Z" />
            {/* Layered Primary Wing Feathers */}
            <path d="M 192 102 C 200 92, 202 76, 198 62 C 195 62, 192 72, 188 82 C 184 92, 180 100, 178 106 Z" />
            <path d="M 188 104 C 194 94, 196 80, 192 68 C 189 68, 186 76, 182 86 C 178 96, 176 102, 174 108 Z" />
            <path d="M 183 108 C 188 98, 190 86, 186 74 C 183 74, 180 82, 177 92 C 174 102, 172 106, 171 112 Z" />
            <path d="M 178 112 C 183 102, 185 92, 180 82 C 178 82, 175 88, 172 98 C 169 106, 168 110, 167 116 Z" />
            <path d="M 173 116 C 178 108, 180 98, 175 90 C 173 90, 171 96, 168 104 C 166 112, 165 116, 164 122 Z" />
            <path d="M 168 120 C 172 114, 173 104, 169 96 C 167 96, 166 100, 164 108 C 162 114, 161 120, 160 126 Z" />

            {/* Inner secondary feather veins */}
            <path d="M 190 80 L 180 102" stroke="url(#dark-gold)" strokeWidth="0.55" />
            <path d="M 185 84 L 177 104" stroke="url(#dark-gold)" strokeWidth="0.55" />
            <path d="M 180 90 L 173 110" stroke="url(#dark-gold)" strokeWidth="0.55" />
            <path d="M 175 94 L 169 114" stroke="url(#dark-gold)" strokeWidth="0.55" />
          </g>

          {/* Eagle Neck, Chest, and Body */}
          <path d="M 142 106 C 138 112, 140 120, 142 126 C 145 131, 151 131, 154 126 C 156 120, 158 112, 154 106 Z" />
          {/* Feather overlapping texture lines */}
          <path d="M 143 109 Q 148 112 153 109" stroke="#5c3f05" strokeWidth="0.5" fill="none" />
          <path d="M 142 113 Q 148 117 154 113" stroke="#5c3f05" strokeWidth="0.5" fill="none" />
          <path d="M 141 117 Q 148 122 155 117" stroke="#5c3f05" strokeWidth="0.5" fill="none" />
          <path d="M 143 121 Q 148 126 153 121" stroke="#5c3f05" strokeWidth="0.5" fill="none" />

          {/* Majestic Profile Eagle Head (Facing Left as in official seal) */}
          <path d="M 153 104 
                   C 152 98, 148 94, 142 96 
                   C 138 97, 134 100, 133 103 
                   C 130 104, 129 106, 127 105
                   C 126 106, 128 110, 132 111 
                   C 137 112, 142 111, 146 108 
                   C 149 109, 151 108, 153 104 Z" />
          {/* Head Crest / Feathers */}
          <path d="M 143 96 Q 145 90 148 92 Q 145 94 144 96" />
          <path d="M 146 95 Q 149 89 151 92 Q 148 94 147 95" />
          <path d="M 149 97 Q 153 92 155 95 Q 151 97 150 97" />

          {/* Eye with shiny white highlight */}
          <circle cx="138" cy="101" r="1.1" fill="#ffffff" stroke="none" />
          <circle cx="137.8" cy="101" r="0.6" fill="#020617" stroke="none" />

          {/* Beak highlight line */}
          <path d="M 127 105 C 128 106, 131 106, 132 105" stroke="#ffffff" strokeWidth="0.4" fill="none" opacity="0.9" />

          {/* Symmetrical Sharp Eagle Talons */}
          <g stroke="#301f01" strokeWidth="0.75" strokeLinecap="round" fill="none">
            {/* Left claws grasping sword */}
            <path d="M 141 133 C 140 135, 138 136, 139 138" />
            <path d="M 143 133 C 142 135, 140 136, 141 138" />
            {/* Right claws grasping rifle */}
            <path d="M 155 133 C 156 135, 158 136, 157 138" />
            <path d="M 153 133 C 154 135, 156 136, 155 138" />
          </g>
        </g>

        {/* ========================================== */}
        {/* 4. CROSSED WEAPONS (High-Fidelity Saber & Tactical Rifle pointing UP) */}
        {/* ========================================== */}
        <g id="crossed-weapons" filter="url(#element-shadow)">
          
          {/* TACTICAL ASSAULT RIFLE (Pointing Up-Right: Buttstock down-left, Barrel up-right) */}
          <g transform="translate(150, 136) rotate(-34)">
            {/* Flash hider / Muzzle */}
            <rect x="58" y="-1.5" width="4.5" height="3" fill="#1e293b" stroke="#0f172a" strokeWidth="0.4" />
            <line x1="62.5" y1="-1.5" x2="62.5" y2="1.5" stroke="#94a3b8" strokeWidth="0.5" />
            {/* Long Steel Barrel */}
            <rect x="35" y="-1" width="23" height="2" fill="#475569" stroke="#1e293b" strokeWidth="0.3" />
            {/* Gas Block & Triangular Front Sight Post */}
            <path d="M 50 -1 L 53 -7 L 48 -7 Z" fill="#0f172a" />
            <circle cx="50.5" cy="-5" r="0.5" fill="#e2e8f0" />
            {/* Bayonet Lug or underbarrel ring */}
            <rect x="42" y="1" width="2" height="1.5" fill="#334155" />
            
            {/* Handguard (embossed with premium golden ribbed slots) */}
            <rect x="10" y="-3.5" width="25" height="7" rx="1.5" fill="url(#gold-grad)" stroke="#5c3f05" strokeWidth="0.5" />
            <line x1="14" y1="-3.5" x2="14" y2="3.5" stroke="#5c3f05" strokeWidth="0.5" />
            <line x1="18" y1="-3.5" x2="18" y2="3.5" stroke="#5c3f05" strokeWidth="0.5" />
            <line x1="22" y1="-3.5" x2="22" y2="3.5" stroke="#5c3f05" strokeWidth="0.5" />
            <line x1="26" y1="-3.5" x2="26" y2="3.5" stroke="#5c3f05" strokeWidth="0.5" />
            <line x1="30" y1="-3.5" x2="30" y2="3.5" stroke="#5c3f05" strokeWidth="0.5" />
            {/* Handguard Heat Shield Top vent */}
            <rect x="12" y="-5" width="21" height="1.5" fill="#334155" stroke="#0f172a" strokeWidth="0.4" />

            {/* Receiver & Ejection Port (metallic gold) */}
            <rect x="-14" y="-4.5" width="24" height="9" fill="url(#gold-grad)" stroke="#5c3f05" strokeWidth="0.5" />
            <rect x="-6" y="-2" width="6" height="2.5" fill="#301f01" /> {/* Bolt / Ejection port */}
            <line x1="-14" y1="1" x2="10" y2="1" stroke="#5c3f05" strokeWidth="0.5" />

            {/* Detailed Curved Magazine (FAL / Galil heavy magazine style) */}
            <path d="M -2 0 L 3 16 L 11 16 L 5 0 Z" fill="url(#gold-grad)" stroke="#5c3f05" strokeWidth="0.5" />
            <line x1="1" y1="4" x2="6" y2="4" stroke="#5c3f05" strokeWidth="0.5" />
            <line x1="3" y1="9" x2="8" y2="9" stroke="#5c3f05" strokeWidth="0.5" />
            <line x1="5" y1="13" x2="10" y2="13" stroke="#5c3f05" strokeWidth="0.5" />

            {/* Tactical Pistol Grip */}
            <path d="M -12 2.5 L -8 12.5 L -3 12.5 L -8 2.5 Z" fill="url(#gold-grad)" stroke="#5c3f05" strokeWidth="0.5" />
            <rect x="-7.5" y="11" width="4" height="1.5" fill="#334155" />

            {/* Carry Handle & Integrated Tactical Scope */}
            <path d="M -8 -4.5 L -8 -8 L 4 -8 L 4 -4.5 Z" fill="#334155" stroke="#0f172a" strokeWidth="0.4" />
            <rect x="-10" y="-10" width="16" height="3" rx="0.8" fill="#1e293b" stroke="#0f172a" strokeWidth="0.4" />
            <circle cx="-8" cy="-8.5" r="0.8" fill="#38bdf8" /> {/* Optical lens glass shine */}
            <circle cx="4" cy="-8.5" r="0.8" fill="#f87171" />

            {/* Buttstock assembly (wood grain texture or gold-burnished military stock) */}
            <path d="M -14 -4 L -38 -8 L -38 8 L -20 4 Z" fill="url(#gold-grad)" stroke="#5c3f05" strokeWidth="0.5" />
            {/* Recoil Buttpad */}
            <rect x="-40.5" y="-8" width="2.5" height="16" rx="0.5" fill="#0f172a" />
            {/* Sling swivel loop */}
            <path d="M -30 6 L -32 10 L -28 10 Z" fill="none" stroke="#5c3f05" strokeWidth="0.5" />
          </g>


          {/* MILITARY SABER / SWORD (Pointing Up-Left: Hilt/guard down-right, Blade up-left) */}
          <g transform="translate(150, 136) rotate(-146)">
            {/* Saber Blade (Silver high-grade steel with central ridge line) */}
            <path d="M -58 -1.8 L 48 -1.8 L 54 0 L 48 1.8 L -58 1.8 Z" fill="url(#silver-grad)" stroke="#475569" strokeWidth="0.45" />
            {/* Central blood groove / fuller */}
            <line x1="-54" y1="0" x2="44" y2="0" stroke="#94a3b8" strokeWidth="0.5" opacity="0.9" />
            <line x1="-54" y1="0.5" x2="44" y2="0.5" stroke="#ffffff" strokeWidth="0.3" opacity="0.8" />

            {/* Blade Tip specular shine */}
            <polygon points="46,-1.2 52,0 46,1.2" fill="#ffffff" opacity="0.8" />

            {/* Elegant Golden Basket/Knuckle Guard (D-guard looping around hilt) */}
            {/* Back guard block */}
            <path d="M -58 -7 C -54 -7, -50 -5, -50 0 C -50 5, -54 7, -58 7 Z" fill="url(#gold-grad)" stroke="#5c3f05" strokeWidth="0.55" />
            {/* Graceful looping outer handguard */}
            <path d="M -58 -6.5 C -63 -11, -70 -7, -70 0 C -70 7, -63 11, -58 6.5" fill="none" stroke="url(#gold-grad)" strokeWidth="1.4" />
            <path d="M -58 -6.5 C -63 -11, -70 -7, -70 0 C -70 7, -63 11, -58 6.5" fill="none" stroke="#ffffff" strokeWidth="0.4" opacity="0.75" />

            {/* Ribbed Hilt Handle Grip (black wire-wrapped over gold) */}
            <rect x="-66" y="-3" width="8" height="6" rx="1.2" fill="#1e293b" stroke="#5c3f05" strokeWidth="0.5" />
            <line x1="-64" y1="-3" x2="-64" y2="3" stroke="url(#gold-grad)" strokeWidth="0.6" />
            <line x1="-62" y1="-3" x2="-62" y2="3" stroke="url(#gold-grad)" strokeWidth="0.6" />
            <line x1="-60" y1="-3" x2="-60" y2="3" stroke="url(#gold-grad)" strokeWidth="0.6" />

            {/* Round Golden Pommel Cap */}
            <circle cx="-68.5" cy="0" r="2.8" fill="url(#gold-grad)" stroke="#5c3f05" strokeWidth="0.5" />
            <circle cx="-68" cy="-0.8" r="0.8" fill="#ffffff" opacity="0.8" /> {/* 3D light reflection point */}
          </g>
        </g>

        {/* ========================================== */}
        {/* 5. GOLDEN TORCH (Vertical Central Axis & Flames) */}
        {/* ========================================== */}
        <g id="golden-torch" transform="translate(150, 48)" filter="url(#element-shadow)">
          {/* Vertical Torch Handle Pole going straight down the shield center */}
          {/* Layer A: Dark handle backing shadow */}
          <rect x="-3" y="18" width="6.5" height="152" fill="url(#dark-gold)" opacity="0.5" transform="translate(0, 1)" />
          {/* Layer B: Main handle rod */}
          <rect x="-3.2" y="18" width="6.4" height="152" fill="url(#gold-grad)" stroke="#5c3f05" strokeWidth="0.45" />
          {/* Handle decorative metallic collar rings */}
          <rect x="-5.2" y="18" width="10.4" height="4.5" fill="url(#gold-grad)" stroke="#301f01" strokeWidth="0.5" />
          <rect x="-4.2" y="60" width="8.4" height="3" fill="url(#gold-grad)" stroke="#301f01" strokeWidth="0.4" />
          <rect x="-4.2" y="110" width="8.4" height="3" fill="url(#gold-grad)" stroke="#301f01" strokeWidth="0.4" />
          <rect x="-4.2" y="150" width="8.4" height="3" fill="url(#gold-grad)" stroke="#301f01" strokeWidth="0.4" />
          <circle cx="0" cy="170" r="3.5" fill="url(#gold-grad)" stroke="#5c3f05" strokeWidth="0.5" />

          {/* Torch Cup/Chalice Base */}
          <path d="M -12.5 18 L 12.5 18 L 15.5 6 L -15.5 6 Z" fill="url(#gold-grad)" stroke="#5c3f05" strokeWidth="0.5" />
          {/* Horizontal embossed lines on the cup */}
          <line x1="-14" y1="11" x2="14" y2="11" stroke="#301f01" strokeWidth="0.65" />
          <line x1="-13" y1="14" x2="13" y2="14" stroke="#301f01" strokeWidth="0.65" />
          
          {/* Torch Cup Rim (raised 3D ring) */}
          <rect x="-17.5" y="1.5" width="35" height="4.5" rx="1.8" fill="url(#gold-grad)" stroke="#301f01" strokeWidth="0.5" />
          <rect x="-16.5" y="2" width="33" height="1.5" fill="#ffffff" opacity="0.6" stroke="none" /> {/* highlight */}

          {/* Symmetrical Ornamental Wings/Scroll banner under the cup */}
          <path d="M -23 10 Q 0 14.5 23 10 L 21 6 Q 0 10.5 -21 6 Z" fill="url(#gold-grad)" stroke="#5c3f05" strokeWidth="0.55" />
          {/* Inner scrolls */}
          <circle cx="-21.5" cy="8" r="1.5" fill="none" stroke="#5c3f05" strokeWidth="0.5" />
          <circle cx="21.5" cy="8" r="1.5" fill="none" stroke="#5c3f05" strokeWidth="0.5" />

          {/* ========================================== */}
          {/* DYNAMIC TORCH FIRE FLAME (Layered and Glowing) */}
          {/* ========================================== */}
          <g filter="url(#flame-glow)">
            {/* Layer 1: Huge Outer Red-Orange Flame Wrap */}
            <path 
              d="M -15 2 C -27 -13, -15 -36, 0 -44 C 15 -36, 27 -13, 15 2 C 9 8, -9 8, -15 2 Z" 
              fill="url(#flame-outer-grad)" 
              opacity="0.85"
            />
            
            {/* Layer 2: Medium Inner Orange Flame */}
            <path 
              d="M -10 1 C -19 -10, -11 -28, 0 -36 C 11 -28, 19 -10, 10 1 C 6 5, -6 5, -10 1 Z" 
              fill="url(#flame-mid-grad)" 
              opacity="0.95"
            />

            {/* Layer 3: Vibrant Flame Side-lick left */}
            <path 
              d="M -12 -5 C -18 -15, -6 -23, -2 -14 C 1 -7, -6 -2, -12 -5 Z" 
              fill="url(#flame-mid-grad)" 
              opacity="0.9"
            />

            {/* Layer 4: Vibrant Flame Side-lick right */}
            <path 
              d="M 12 -5 C 18 -15, 6 -23, 2 -14 C -1 -7, 6 -2, 12 -5 Z" 
              fill="url(#flame-mid-grad)" 
              opacity="0.9"
            />

            {/* Layer 5: Bright Core Yellow-White Center Flame */}
            <path 
              d="M -5 -1 C -10 -7, -6 -20, 0 -26 C 6 -20, 10 -7, 5 -1 C 3 2, -3 2, -5 -1 Z" 
              fill="url(#flame-inner-grad)" 
              opacity="0.95"
            />

            {/* Layer 6: Dynamic White Core Spark */}
            <path 
              d="M -2.5 -2 C -5 -6, -2.5 -14, 0 -18 C 2.5 -14, 5 -6, 2.5 -2 C 1.5 0, -1.5 0, -2.5 -2 Z" 
              fill="#ffffff" 
              opacity="0.95"
            />
          </g>
        </g>

        {/* ========================================== */}
        {/* 6. CURVED RIBBON / BANNER WITH GOLD EMBOSSED LETTERS */}
        {/* ========================================== */}
        <g id="ribbon-banner" filter="url(#drop-shadow)">
          {/* Back fold under-shadows for 3D elevation */}
          <path d="M 45 220 L 60 200 L 60 225 Z" fill="#020617" stroke="#301f01" strokeWidth="0.5" />
          <path d="M 255 220 L 240 200 L 240 225 Z" fill="#020617" stroke="#301f01" strokeWidth="0.5" />

          {/* Back Ribbon Folds (Navy blue connecting pieces) */}
          <path d="M 45 220 L 60 198 L 60 226 Z" fill="url(#ribbon-grad)" stroke="#5c3f05" strokeWidth="0.5" />
          <path d="M 255 220 L 240 198 L 240 226 Z" fill="url(#ribbon-grad)" stroke="#5c3f05" strokeWidth="0.5" />

          {/* Swallowtail Ribbon Ends */}
          <path d="M 32 236 L 60 220 L 60 241 Z" fill="url(#ribbon-grad)" stroke="#5c3f05" strokeWidth="0.5" />
          <path d="M 268 236 L 240 220 L 240 241 Z" fill="url(#ribbon-grad)" stroke="#5c3f05" strokeWidth="0.5" />

          {/* Swallowtail gold trims */}
          <path d="M 32 236 L 60 220" fill="none" stroke="url(#gold-grad)" strokeWidth="1" />
          <path d="M 32 236 L 60 241" fill="none" stroke="url(#gold-grad)" strokeWidth="1" />
          <path d="M 268 236 L 240 220" fill="none" stroke="url(#gold-grad)" strokeWidth="1" />
          <path d="M 268 236 L 240 241" fill="none" stroke="url(#gold-grad)" strokeWidth="1" />

          {/* Main 3D Curved Scroll/Banner (Double outline gold rims) */}
          {/* Gold Under-relief shadow */}
          <path 
            d="M 50 216 C 100 246, 200 246, 250 216 L 245 238 C 195 268, 105 268, 55 238 Z" 
            fill="url(#dark-gold)" 
            transform="translate(0, 1.8)"
          />
          {/* Main banner block */}
          <path 
            d="M 50 216 C 100 246, 200 246, 250 216 L 245 238 C 195 268, 105 268, 55 238 Z" 
            fill="url(#ribbon-grad)" 
            stroke="url(#gold-grad)" 
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {/* Inner fine gold rim for luxury 3D effect */}
          <path 
            d="M 53 219 C 101 243, 199 243, 247 219 L 243 235 C 196 259, 104 259, 57 235 Z" 
            fill="none" 
            stroke="url(#gold-grad)" 
            strokeWidth="0.6"
            opacity="0.8"
          />

          {/* Invisible curved paths for text-on-path aligning */}
          <path 
            id="textPath-upper" 
            d="M 57 225 C 103 252, 197 252, 243 225" 
            fill="none" 
          />
          <path 
            id="textPath-lower" 
            d="M 64 237.5 C 109 263.5, 191 263.5, 236 237.5" 
            fill="none" 
          />

          {/* Embossed Gold Typography along curves */}
          {/* Upper text with realistic black drop-shadow underneath */}
          <text fontWeight="900" fontFamily="sans-serif" fontSize="7.8" letterSpacing="0.45" filter="url(#text-shadow)" opacity="0.3" fill="#000000">
            <textPath href="#textPath-upper" startOffset="50%" textAnchor="middle">
              ESCUELA DE COMANDO Y ESTADO MAYOR
            </textPath>
          </text>
          <text fill="url(#gold-grad)" fontWeight="900" fontFamily="sans-serif" fontSize="7.8" letterSpacing="0.45" filter="url(#text-shadow)">
            <textPath href="#textPath-upper" startOffset="50%" textAnchor="middle">
              ESCUELA DE COMANDO Y ESTADO MAYOR
            </textPath>
          </text>

          {/* Lower text with realistic black drop-shadow underneath */}
          <text fontWeight="900" fontFamily="sans-serif" fontSize="8.2" letterSpacing="0.5" filter="url(#text-shadow)" opacity="0.3" fill="#000000">
            <textPath href="#textPath-lower" startOffset="50%" textAnchor="middle">
              DEL EJÉRCITO - PII-LCC
            </textPath>
          </text>
          <text fill="url(#gold-grad)" fontWeight="900" fontFamily="sans-serif" fontSize="8.2" letterSpacing="0.5" filter="url(#text-shadow)">
            <textPath href="#textPath-lower" startOffset="50%" textAnchor="middle">
              DEL EJÉRCITO - PII-LCC
            </textPath>
          </text>
        </g>

        {/* ========================================== */}
        {/* 7. RADAR / TACTICAL HEAD-UP DISPLAY OVERLAY (Intel Theme) */}
        {/* ========================================== */}
        <g stroke="rgba(59, 130, 246, 0.16)" strokeWidth="0.5" fill="none">
          {/* Compass layout ticks */}
          <circle cx="150" cy="140" r="136" strokeDasharray="3 9" />
          <circle cx="150" cy="140" r="142" strokeDasharray="1 15" strokeWidth="0.8" />
          <line x1="6" y1="140" x2="22" y2="140" />
          <line x1="278" y1="140" x2="294" y2="140" />
          <line x1="150" y1="5" x2="150" y2="18" />
          <line x1="150" y1="262" x2="150" y2="278" />
          
          {/* Fine target reticle ticks at four corners */}
          <path d="M 25 115 L 25 140 L 50 140" opacity="0.5" />
          <path d="M 275 115 L 275 140 L 250 140" opacity="0.5" />
        </g>
      </svg>
    </div>
  );
}
