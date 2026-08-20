/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';

interface HeaderTopRightLogoProps {
  className?: string;
  size?: number;
}

export default function HeaderTopRightLogo({ className = '', size = 56 }: HeaderTopRightLogoProps) {
  const [srcIndex, setSrcIndex] = useState(0);

  const sources = [
    'https://lh3.googleusercontent.com/d/1vNYo6ebvAmrGwG9JJUrPQK7y4N8OYD9p',
    'https://drive.google.com/thumbnail?id=1vNYo6ebvAmrGwG9JJUrPQK7y4N8OYD9p&sz=w1000',
    'https://drive.google.com/uc?export=view&id=1vNYo6ebvAmrGwG9JJUrPQK7y4N8OYD9p'
  ];

  const handleImgError = () => {
    if (srcIndex < sources.length - 1) {
      setSrcIndex(prev => prev + 1);
    }
  };

  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      <img
        src={sources[srcIndex]}
        onError={handleImgError}
        alt="Escudo / Insignia Militar"
        style={{ width: size, height: size }}
        className="object-contain filter drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)] hover:scale-105 transition-transform duration-200"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
