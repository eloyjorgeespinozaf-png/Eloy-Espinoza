/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { ChartDataPoint, ChartType, TacticalUnit } from '../types';
import { BarChart, LineChart, Activity, Download, Palette, RefreshCw, Layers } from 'lucide-react';

interface InteractiveChartCreatorProps {
  initialData?: ChartDataPoint[];
  tacticalUnits?: TacticalUnit[];
}

export default function InteractiveChartCreator({ 
  initialData = [],
  tacticalUnits = []
}: InteractiveChartCreatorProps) {
  const [chartType, setChartType] = useState<ChartType>('BAR');
  const [dataPoints, setDataPoints] = useState<ChartDataPoint[]>(initialData);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [mapTick, setMapTick] = useState<number>(0);
  const [mapTheme, setMapTheme] = useState<'CLASSIC' | 'TACTICAL'>('CLASSIC');

  // Coordinates string parser helper
  const parseCoordinates = (coordStr: string): { lat: number; lon: number } | null => {
    if (!coordStr) return null;
    const dmsRegex = /(\d+)°(\d+)'(\d+)"?([NSns])\s+(\d+)°(\d+)'(\d+)"?([WEweOo])/;
    const matches = coordStr.match(dmsRegex);
    if (matches) {
      const latDeg = parseFloat(matches[1]);
      const latMin = parseFloat(matches[2]);
      const latSec = parseFloat(matches[3]);
      const latHem = matches[4].toUpperCase();

      const lonDeg = parseFloat(matches[5]);
      const lonMin = parseFloat(matches[6]);
      const lonSec = parseFloat(matches[7]);
      const lonHem = matches[8].toUpperCase();

      let lat = latDeg + latMin / 60 + latSec / 3600;
      if (latHem === 'S') lat = -lat;

      let lon = lonDeg + lonMin / 60 + lonSec / 3600;
      if (lonHem === 'W' || lonHem === 'O') lon = -lon;

      return { lat, lon };
    }

    const cleanStr = coordStr.replace(/,/g, ' ').trim();
    const parts = cleanStr.split(/\s+/);
    if (parts.length >= 2) {
      const lat = parseFloat(parts[0]);
      const lon = parseFloat(parts[1]);
      if (!isNaN(lat) && !isNaN(lon)) return { lat, lon };
    }
    return null;
  };

  // Default color presets (military/tactical aesthetic)
  const colorPresets = [
    { name: 'Sistemas (Verde)', hex: '#10b981' },
    { name: 'Procesamiento (Naranja)', hex: '#f97316' },
    { name: 'Comando (Azul)', hex: '#3b82f6' },
    { name: 'Alerta Crítica (Rojo)', hex: '#ef4444' },
    { name: 'Táctico Dorado (Amarillo)', hex: '#f59e0b' },
    { name: 'Cibernético (Cyan)', hex: '#06b6d4' },
    { name: 'Sigiloso (Plata)', hex: '#94a3b8' }
  ];

  useEffect(() => {
    if (chartType !== 'MAP') return;
    const interval = setInterval(() => {
      setMapTick(prev => prev + 1);
    }, 150);
    return () => clearInterval(interval);
  }, [chartType]);

  // Draw chart onto canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI screens
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    // Prevent rendering crashes on devices with narrow viewports or hidden containers
    if (rect.width < 120 || rect.height < 120) {
      return;
    }

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Draw background
    const isClassicMap = chartType === 'MAP' && mapTheme === 'CLASSIC';
    ctx.fillStyle = isClassicMap ? '#cad5e2' : '#050505'; // Classic Map Blue-Gray or Elegant Dark
    ctx.fillRect(0, 0, width, height);

    // Draw tactical grid lines and borders
    if (!isClassicMap) {
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.04)'; // Very subtle emerald grid
      ctx.lineWidth = 1;
      
      // Vertical grid
      for (let x = 40; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      // Horizontal grid
      for (let y = 40; y < height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Outer cybernetic border
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.15)';
      ctx.lineWidth = 2;
      ctx.strokeRect(10, 10, width - 20, height - 20);

      // Tech corners
      const cornerSize = 15;
      ctx.strokeStyle = '#10b981'; // Solid bright green
      ctx.lineWidth = 3;
      
      // Top-left
      ctx.beginPath(); ctx.moveTo(8, 8 + cornerSize); ctx.lineTo(8, 8); ctx.lineTo(8 + cornerSize, 8); ctx.stroke();
      // Top-right
      ctx.beginPath(); ctx.moveTo(width - 8 - cornerSize, 8); ctx.lineTo(width - 8, 8); ctx.lineTo(width - 8, 8 + cornerSize); ctx.stroke();
      // Bottom-left
      ctx.beginPath(); ctx.moveTo(8, height - 8 - cornerSize); ctx.lineTo(8, height - 8); ctx.lineTo(8 + cornerSize, height - 8); ctx.stroke();
      // Bottom-right
      ctx.beginPath(); ctx.moveTo(width - 8 - cornerSize, height - 8); ctx.lineTo(width - 8, height - 8); ctx.lineTo(width - 8, height - 8 - cornerSize); ctx.stroke();
    } else {
      // Draw double border for classic cartographic look
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.strokeRect(10, 10, width - 20, height - 20);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.strokeRect(14, 14, width - 28, height - 28);
    }

    // Chart Area dimensions
    const paddingLeft = 70;
    const paddingRight = 40;
    const paddingTop = 60;
    const paddingBottom = 60;
    const chartW = width - paddingLeft - paddingRight;
    const chartH = height - paddingTop - paddingBottom;

    if (chartType === 'MAP') {
      // Bolivia Bounds with some safety margins
      const minLon = -70.5;
      const maxLon = -57.0;
      const minLat = -9.0; // Northernmost
      const maxLat = -23.5; // Southernmost

      const mapLonToX = (lon: number) => {
        const pct = (lon - minLon) / (maxLon - minLon);
        return paddingLeft + pct * chartW;
      };

      const mapLatToY = (lat: number) => {
        const pct = (lat - minLat) / (maxLat - minLat);
        return paddingTop + pct * chartH;
      };

      // Set theme palette colors
      const isClassic = mapTheme === 'CLASSIC';
      const colors = isClassic ? {
        surroundingLand: '#ded6bc',
        boliviaLand: '#fbf3d3',
        outerBorder: '#af1e2d',
        deptBorder: 'rgba(71, 85, 105, 0.45)',
        textMain: '#1e293b',
        textSub: '#475569',
        waterFill: '#3b82f6',
        waterBorder: '#1d4ed8',
        uyuniFill: '#ffffff',
        uyuniBorder: '#cbd5e1',
        gridLine: 'rgba(70, 130, 180, 0.18)',
        gridText: '#475569',
        titleText: '#1e293b',
        subTitleText: '#0f766e',
        legendBg: 'rgba(255, 255, 255, 0.9)',
        legendBorder: '#cbd5e1',
        legendText: '#1e293b'
      } : {
        surroundingLand: '#080808',
        boliviaLand: '#0d1210',
        outerBorder: '#10b981',
        deptBorder: 'rgba(16, 185, 129, 0.2)',
        textMain: '#ffffff',
        textSub: '#94a3b8',
        waterFill: '#111827',
        waterBorder: '#1e3a8a',
        uyuniFill: '#1f2937',
        uyuniBorder: '#4b5563',
        gridLine: 'rgba(16, 185, 129, 0.05)',
        gridText: 'rgba(16, 185, 129, 0.4)',
        titleText: '#ffffff',
        subTitleText: '#10b981',
        legendBg: 'rgba(10, 10, 10, 0.95)',
        legendBorder: '#1f2937',
        legendText: '#ffffff'
      };

      // Draw Title HUD text
      ctx.fillStyle = colors.titleText;
      ctx.font = 'bold 13px "JetBrains Mono", monospace';
      ctx.fillText(isClassic ? 'S-6 CARTOGRAFÍA NACIONAL // REPÚBLICA DE BOLIVIA' : 'LCC INTEL // GEORREFERENCIACIÓN Y MAPA TÁCTICO', paddingLeft, 35);
      
      ctx.fillStyle = colors.subTitleText;
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.fillText(isClassic ? 'GEOPOSICIONAMIENTO EN VIVO DE DISPOSITIVOS Y COORDENADAS' : 'MONITOR TÁCTICO DE SEÑALES GPS EN TIEMPO REAL', paddingLeft, 48);

      // 1. Draw surrounding landmass background
      ctx.fillStyle = colors.surroundingLand;
      ctx.fillRect(paddingLeft, paddingTop, chartW, chartH);

      // 2. Draw Bolivia outer landmass polygon
      const boliviaBorder = [
        { lat: -9.67, lon: -65.34 },
        { lat: -9.80, lon: -65.00 },
        { lat: -10.30, lon: -62.50 },
        { lat: -10.80, lon: -62.00 },
        { lat: -12.50, lon: -60.20 },
        { lat: -13.50, lon: -61.50 },
        { lat: -15.00, lon: -60.00 },
        { lat: -16.50, lon: -57.50 },
        { lat: -18.00, lon: -57.40 },
        { lat: -19.00, lon: -57.70 },
        { lat: -19.60, lon: -58.00 },
        { lat: -20.15, lon: -58.16 },
        { lat: -21.00, lon: -62.30 },
        { lat: -22.00, lon: -62.60 },
        { lat: -22.50, lon: -62.30 },
        { lat: -22.90, lon: -62.80 },
        { lat: -22.90, lon: -64.30 },
        { lat: -22.00, lon: -64.70 },
        { lat: -22.20, lon: -65.20 },
        { lat: -22.88, lon: -65.60 },
        { lat: -22.85, lon: -67.15 },
        { lat: -22.00, lon: -68.00 },
        { lat: -21.00, lon: -68.30 },
        { lat: -20.00, lon: -68.60 },
        { lat: -19.00, lon: -68.40 },
        { lat: -17.20, lon: -69.60 },
        { lat: -16.50, lon: -69.05 },
        { lat: -16.20, lon: -69.04 },
        { lat: -15.50, lon: -69.40 },
        { lat: -14.50, lon: -69.20 },
        { lat: -12.50, lon: -68.80 },
        { lat: -11.50, lon: -69.50 },
        { lat: -11.00, lon: -69.00 }
      ];

      ctx.beginPath();
      boliviaBorder.forEach((pt, idx) => {
        const x = mapLonToX(pt.lon);
        const y = mapLatToY(pt.lat);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fillStyle = colors.boliviaLand;
      ctx.fill();

      // Save clip context to draw inside Bolivia only if needed, but simple lines are fine.

      // 3. Draw internal department boundary lines
      const deptBorders = [
        // Pando-Beni
        [{ lat: -11.5, lon: -66.5 }, { lat: -12.3, lon: -65.8 }],
        // La Paz-Beni
        [{ lat: -12.5, lon: -68.0 }, { lat: -14.0, lon: -67.5 }, { lat: -15.0, lon: -67.0 }],
        // Beni-Cochabamba
        [{ lat: -15.0, lon: -67.0 }, { lat: -15.5, lon: -65.5 }, { lat: -16.0, lon: -64.5 }],
        // Beni-Santa Cruz
        [{ lat: -16.0, lon: -64.5 }, { lat: -14.0, lon: -62.5 }, { lat: -15.5, lon: -61.0 }],
        // Cochabamba-Santa Cruz
        [{ lat: -16.0, lon: -64.5 }, { lat: -17.5, lon: -64.5 }, { lat: -18.2, lon: -64.2 }],
        // La Paz-Oruro
        [{ lat: -17.1, lon: -69.5 }, { lat: -17.5, lon: -68.0 }, { lat: -17.4, lon: -67.3 }],
        // Oruro-Cochabamba
        [{ lat: -17.4, lon: -67.3 }, { lat: -17.2, lon: -66.8 }],
        // Oruro-Potosí
        [{ lat: -17.2, lon: -66.8 }, { lat: -18.5, lon: -66.5 }, { lat: -19.0, lon: -67.2 }, { lat: -19.7, lon: -68.3 }],
        // Cochabamba-Potosí
        [{ lat: -17.2, lon: -66.8 }, { lat: -18.2, lon: -66.2 }, { lat: -18.5, lon: -65.5 }],
        // Potosí-Chuquisaca
        [{ lat: -18.5, lon: -65.5 }, { lat: -19.5, lon: -65.8 }, { lat: -20.5, lon: -65.2 }],
        // Chuquisaca-Santa Cruz
        [{ lat: -18.5, lon: -65.5 }, { lat: -18.5, lon: -64.0 }, { lat: -20.2, lon: -62.8 }],
        // Potosí-Tarija
        [{ lat: -21.0, lon: -65.5 }, { lat: -21.5, lon: -65.2 }, { lat: -22.0, lon: -65.2 }],
        // Chuquisaca-Tarija
        [{ lat: -21.0, lon: -64.0 }, { lat: -21.0, lon: -62.5 }]
      ];

      ctx.strokeStyle = colors.deptBorder;
      ctx.lineWidth = isClassic ? 1.2 : 1;
      ctx.setLineDash([4, 4]);
      deptBorders.forEach(line => {
        ctx.beginPath();
        line.forEach((pt, i) => {
          const x = mapLonToX(pt.lon);
          const y = mapLatToY(pt.lat);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // 4. Draw Bolivia outer border line
      ctx.strokeStyle = colors.outerBorder;
      ctx.lineWidth = isClassic ? 3 : 2;
      ctx.beginPath();
      boliviaBorder.forEach((pt, idx) => {
        const x = mapLonToX(pt.lon);
        const y = mapLatToY(pt.lat);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.stroke();

      // 5. Draw Water Bodies (Lakes)
      const titicaca = [
        { lat: -15.5, lon: -69.4 },
        { lat: -15.7, lon: -69.1 },
        { lat: -16.2, lon: -68.8 },
        { lat: -16.4, lon: -68.9 },
        { lat: -16.3, lon: -69.3 },
        { lat: -15.8, lon: -69.6 }
      ];
      ctx.fillStyle = colors.waterFill;
      ctx.strokeStyle = colors.waterBorder;
      ctx.lineWidth = 1;
      ctx.beginPath();
      titicaca.forEach((pt, i) => {
        const x = mapLonToX(pt.lon);
        const y = mapLatToY(pt.lat);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      const poopoo = [
        { lat: -18.6, lon: -67.3 },
        { lat: -18.7, lon: -67.0 },
        { lat: -19.1, lon: -67.0 },
        { lat: -19.3, lon: -67.2 },
        { lat: -19.1, lon: -67.4 },
        { lat: -18.8, lon: -67.4 }
      ];
      ctx.beginPath();
      poopoo.forEach((pt, i) => {
        const x = mapLonToX(pt.lon);
        const y = mapLatToY(pt.lat);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Salar de Uyuni (Salt flat)
      const uyuni = [
        { lat: -19.8, lon: -67.8 },
        { lat: -20.1, lon: -67.1 },
        { lat: -20.6, lon: -67.0 },
        { lat: -20.7, lon: -67.6 },
        { lat: -20.4, lon: -68.2 },
        { lat: -20.0, lon: -68.1 }
      ];
      ctx.fillStyle = colors.uyuniFill;
      ctx.strokeStyle = colors.uyuniBorder;
      ctx.beginPath();
      uyuni.forEach((pt, i) => {
        const x = mapLonToX(pt.lon);
        const y = mapLatToY(pt.lat);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 6. Draw Rivers
      const rivers = [
        {
          name: 'r. Mamoré',
          points: [{ lat: -16.2, lon: -64.8 }, { lat: -15.0, lon: -64.9 }, { lat: -14.0, lon: -65.1 }, { lat: -12.5, lon: -65.1 }, { lat: -10.4, lon: -65.4 }]
        },
        {
          name: 'r. Beni',
          points: [{ lat: -16.0, lon: -68.0 }, { lat: -14.5, lon: -67.6 }, { lat: -13.2, lon: -67.2 }, { lat: -10.4, lon: -65.4 }]
        },
        {
          name: 'r. Madre de Dios',
          points: [{ lat: -12.5, lon: -68.8 }, { lat: -11.8, lon: -67.5 }, { lat: -11.0, lon: -66.1 }]
        },
        {
          name: 'r. Guaporé',
          points: [{ lat: -14.5, lon: -61.0 }, { lat: -13.5, lon: -61.5 }, { lat: -12.5, lon: -60.2 }, { lat: -12.0, lon: -64.5 }]
        }
      ];

      ctx.strokeStyle = colors.waterBorder;
      ctx.lineWidth = isClassic ? 1.5 : 1;
      rivers.forEach(river => {
        ctx.beginPath();
        river.points.forEach((pt, i) => {
          const x = mapLonToX(pt.lon);
          const y = mapLatToY(pt.lat);
          if (i === 0) ctx.moveTo(x, y);
          else {
            // Curvy path
            const prevX = mapLonToX(river.points[i-1].lon);
            const prevY = mapLatToY(river.points[i-1].lat);
            ctx.quadraticCurveTo(prevX, prevY, x, y);
          }
        });
        ctx.stroke();

        // River name label
        if (isClassic) {
          ctx.fillStyle = '#1d4ed8';
          ctx.font = 'italic 7px serif';
          const midPt = river.points[Math.floor(river.points.length / 2)];
          ctx.fillText(river.name, mapLonToX(midPt.lon) + 4, mapLatToY(midPt.lat));
        }
      });

      // 7. Draw Latitude/Longitude Grid lines (Matches 13°, 16°, 19° grid lines)
      ctx.strokeStyle = colors.gridLine;
      ctx.lineWidth = 1;
      ctx.font = '8px "JetBrains Mono", monospace';
      ctx.fillStyle = colors.gridText;
      
      // Longitudes
      ctx.textAlign = 'center';
      const longitudes = [-69, -67, -65, -63, -61, -59];
      longitudes.forEach(lon => {
        const x = mapLonToX(lon);
        ctx.beginPath();
        ctx.moveTo(x, paddingTop);
        ctx.lineTo(x, height - paddingBottom);
        ctx.stroke();
        ctx.fillText(`${Math.abs(lon)}°W`, x, height - paddingBottom + 12);
      });

      // Latitudes (especially highlighting 13°, 16°, 19° like in the image!)
      ctx.textAlign = 'right';
      const latitudes = [-10, -13, -16, -19, -22];
      latitudes.forEach(lat => {
        const y = mapLatToY(lat);
        ctx.beginPath();
        ctx.moveTo(paddingLeft, y);
        ctx.lineTo(width - paddingRight, y);
        ctx.stroke();
        ctx.fillText(`${Math.abs(lat)}°S`, paddingLeft - 8, y + 3);
      });

      // 8. Draw Large Translucent Department Names
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.fillStyle = isClassic ? 'rgba(71, 85, 105, 0.45)' : 'rgba(16, 185, 129, 0.15)';
      ctx.textAlign = 'center';

      const departments = [
        { name: 'PANDO', lat: -11.4, lon: -67.2 },
        { name: 'LA PAZ', lat: -15.0, lon: -68.2 },
        { name: 'BENI', lat: -14.0, lon: -65.2 },
        { name: 'SANTA CRUZ', lat: -17.5, lon: -61.0 },
        { name: 'COCHABAMBA', lat: -17.2, lon: -65.5 },
        { name: 'ORURO', lat: -18.6, lon: -67.8 },
        { name: 'POTOSÍ', lat: -20.4, lon: -66.3 },
        { name: 'CHUQUISACA', lat: -19.8, lon: -64.2 },
        { name: 'TARIJA', lat: -21.6, lon: -64.0 }
      ];

      departments.forEach(dept => {
        ctx.fillText(dept.name, mapLonToX(dept.lon), mapLatToY(dept.lat));
      });

      // Draw Neighboring Countries labels
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.fillStyle = isClassic ? '#94a3b8' : 'rgba(255, 255, 255, 0.12)';
      ctx.textAlign = 'center';
      
      const neighbors = [
        { name: 'PERÚ', lat: -14.0, lon: -70.2 },
        { name: 'CHILE', lat: -21.0, lon: -69.2 },
        { name: 'ARGENTINA', lat: -23.2, lon: -65.5 },
        { name: 'PARAGUAY', lat: -22.0, lon: -60.5 },
        { name: 'BRASIL', lat: -11.5, lon: -62.0 },
        { name: 'BRASIL', lat: -16.0, lon: -56.2 }
      ];
      neighbors.forEach(n => {
        ctx.fillText(n.name, mapLonToX(n.lon), mapLatToY(n.lat));
      });

      // 9. Draw Key Cities with precise historical representation
      const boliviaCities = [
        { name: 'La Paz', lat: -16.50, lon: -68.15, isCapital: true },
        { name: 'Sucre', lat: -19.03, lon: -65.26, isCapital: true },
        { name: 'Santa Cruz', lat: -17.78, lon: -63.18 },
        { name: 'Cochabamba', lat: -17.38, lon: -66.16 },
        { name: 'Oruro', lat: -17.98, lon: -67.11 },
        { name: 'Potosí', lat: -19.57, lon: -65.75 },
        { name: 'Tarija', lat: -21.53, lon: -64.73 },
        { name: 'Trinidad', lat: -14.83, lon: -64.90 },
        { name: 'Cobija', lat: -11.02, lon: -68.77 },
        { name: 'Montero', lat: -17.34, lon: -63.25 },
        { name: 'Warnes', lat: -17.52, lon: -63.17 },
        { name: 'Villazón', lat: -22.09, lon: -65.59 },
        { name: 'Puerto Suárez', lat: -18.96, lon: -57.80 },
        { name: 'San Ignacio', lat: -16.37, lon: -60.96 },
        { name: 'San Joaquín', lat: -13.04, lon: -64.81 },
        { name: 'Magdalena', lat: -13.26, lon: -64.07 },
        { name: 'Loreto', lat: -15.19, lon: -64.68 },
        { name: 'San Borja', lat: -14.86, lon: -66.75 },
        { name: 'Apolo', lat: -14.72, lon: -68.42 },
        { name: 'Sorata', lat: -15.77, lon: -68.65 },
        { name: 'Copacabana', lat: -16.17, lon: -69.08 },
        { name: 'Samaipata', lat: -18.18, lon: -63.87 },
        { name: 'Vallegrande', lat: -18.49, lon: -64.11 },
        { name: 'Roboré', lat: -18.33, lon: -59.75 }
      ];

      boliviaCities.forEach(city => {
        const cx = mapLonToX(city.lon);
        const cy = mapLatToY(city.lat);
        
        if (city.isCapital) {
          // Red/yellow star for capital city
          ctx.fillStyle = isClassic ? '#af1e2d' : '#ef4444';
          ctx.beginPath();
          // Simple star drawing
          ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = colors.textMain;
          ctx.font = 'bold 8px "JetBrains Mono", monospace';
        } else {
          // Standard city circle
          ctx.fillStyle = isClassic ? '#1e293b' : '#ffffff';
          ctx.beginPath();
          ctx.arc(cx, cy, 2, 0, Math.PI * 2);
          ctx.fill();
          if (isClassic) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }

          ctx.fillStyle = colors.textSub;
          ctx.font = '7px "JetBrains Mono", monospace';
        }

        ctx.textAlign = 'left';
        ctx.fillText(city.name, cx + 5, cy + 2.5);
      });

      // 10. Plot real-time georeferenced tactical units
      tacticalUnits.forEach((unit, uIdx) => {
        const coords = parseCoordinates(unit.coordinates);
        if (!coords) return;

        // Check if coords are in bounds, or clamp them to Oruro / Bolivia center to avoid disappearing
        const isOutOfBounds = (coords.lat > minLat || coords.lat < maxLat || coords.lon < minLon || coords.lon > maxLon);
        const drawLat = isOutOfBounds ? -16.50 - (uIdx * 0.4) : coords.lat; 
        const drawLon = isOutOfBounds ? -68.15 + (uIdx * 0.3) : coords.lon;

        const ux = mapLonToX(drawLon);
        const uy = mapLatToY(drawLat);

        // Signal Radar Pulse Ring
        const t = Date.now();
        const ringSize = 8 + (t % 1500) / 1500 * 20;
        const ringOpacity = 1 - (t % 1500) / 1500;
        
        ctx.strokeStyle = isClassic ? `rgba(16, 185, 129, ${ringOpacity * 0.8})` : `rgba(16, 185, 129, ${ringOpacity * 0.6})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(ux, uy, ringSize, 0, Math.PI * 2);
        ctx.stroke();

        // Main Signal Indicator Dot
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(ux, uy, 5.5, 0, Math.PI * 2);
        ctx.fill();

        // Glowing core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ux, uy, 2, 0, Math.PI * 2);
        ctx.fill();

        // Crosshair reticle
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(ux - 12, uy); ctx.lineTo(ux + 12, uy);
        ctx.moveTo(ux, uy - 12); ctx.lineTo(ux, uy + 12);
        ctx.stroke();

        // Floating HUD label box for coordinates and geopositional details
        const isSelected = unit.name.includes('NIVEL 1');
        ctx.fillStyle = isClassic ? 'rgba(30, 41, 59, 0.92)' : 'rgba(5, 5, 5, 0.95)';
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 1;

        const labelW = 110;
        const labelH = 26;
        const lx = ux + 12;
        const ly = uy - 13;

        ctx.beginPath();
        ctx.roundRect(lx, ly, labelW, labelH, 3);
        ctx.fill();
        ctx.stroke();

        // Unit Name
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(unit.name, lx + 6, ly + 9);

        // Coordinates & signal details
        ctx.fillStyle = '#10b981';
        ctx.font = '7px "JetBrains Mono", monospace';
        const displayCoords = isOutOfBounds ? `${unit.coordinates} (SAT)` : unit.coordinates;
        ctx.fillText(displayCoords, lx + 6, ly + 18);
      });

      // HUD overlay legend for active signals in the corner
      ctx.fillStyle = colors.legendBg;
      ctx.strokeStyle = colors.legendBorder;
      ctx.lineWidth = 1;
      
      const legX = width - paddingRight - 150;
      const legY = 22;
      const legW = 145;
      const legH = 22 + (tacticalUnits.length * 15);

      ctx.beginPath();
      ctx.roundRect(legX, legY, legW, legH, 4);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.font = 'bold 8px "JetBrains Mono", monospace';
      ctx.fillStyle = colors.legendText;
      ctx.fillText('DISPOSITIVOS EN VIVO GPS:', legX + 8, legY + 12);
      
      tacticalUnits.forEach((unit, i) => {
        const rx = legX + 8;
        const ry = legY + 23 + (i * 15);
        
        // Signal pulse icon
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(rx + 3, ry + 3, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = colors.legendText;
        ctx.font = 'bold 8px "JetBrains Mono", monospace';
        ctx.fillText(unit.name, rx + 12, ry + 6);
      });
    } else {
      // Draw Title HUD text for standard charts
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px "JetBrains Mono", monospace';
      ctx.fillText('LCC INTEL // ANÁLISIS DE RUTAS CLANDESTINAS', paddingLeft, 35);
      
      ctx.fillStyle = '#10b981';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillText(`MÉTRICA: TRÁNSITO ESTIMADO % // TIPO: ${chartType}`, paddingLeft, 48);

      // Draw grid axes
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, paddingTop);
      ctx.lineTo(paddingLeft, height - paddingBottom);
      ctx.lineTo(width - paddingRight, height - paddingBottom);
      ctx.stroke();

      // Draw Y-Axis Ticks & grid lines (0 to 100)
      const yTicks = [0, 25, 50, 75, 100];
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'right';
      
      yTicks.forEach(tick => {
        const y = height - paddingBottom - (tick / 100) * chartH;
        ctx.fillText(tick.toString(), paddingLeft - 10, y + 3);
        
        // Horizontal dashed line
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
        ctx.beginPath();
        ctx.moveTo(paddingLeft, y);
        ctx.lineTo(width - paddingRight, y);
        ctx.stroke();
      });

      const maxValue = 100;

      if (chartType === 'BAR') {
        const barSpacing = chartW / dataPoints.length;
        const barWidth = barSpacing * 0.55;

        dataPoints.forEach((dp, i) => {
          const barHeight = (dp.value / maxValue) * chartH;
          const x = paddingLeft + i * barSpacing + (barSpacing - barWidth) / 2;
          const y = height - paddingBottom - barHeight;

          // Draw bar shadow/glow
          ctx.fillStyle = dp.color;
          ctx.shadowColor = dp.color;
          ctx.shadowBlur = 10;
          ctx.fillRect(x, y, barWidth, barHeight);
          ctx.shadowBlur = 0; // reset shadow

          // Glass overlay
          const gradient = ctx.createLinearGradient(x, y, x + barWidth, y);
          gradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
          gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.05)');
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
          ctx.fillStyle = gradient;
          ctx.fillRect(x, y, barWidth, barHeight);

          // Highlight top border of the bar
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + barWidth, y);
          ctx.stroke();

          // Value text
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.font = 'bold 9px "JetBrains Mono", monospace';
          ctx.fillText(`${dp.value}%`, x + barWidth / 2, y - 8);

          // Label text below
          ctx.fillStyle = '#94a3b8';
          ctx.textAlign = 'center';
          ctx.font = '10px "JetBrains Mono", monospace';
          wrapText(ctx, dp.label, x + barWidth / 2, height - paddingBottom + 18, barSpacing - 5, 12);
        });

      } else if (chartType === 'LINE') {
        const step = chartW / (dataPoints.length - 1 || 1);
        
        // Draw Area under line (optional translucent glow)
        ctx.beginPath();
        dataPoints.forEach((dp, i) => {
          const x = paddingLeft + i * step;
          const y = height - paddingBottom - (dp.value / maxValue) * chartH;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.lineTo(paddingLeft + (dataPoints.length - 1) * step, height - paddingBottom);
        ctx.lineTo(paddingLeft, height - paddingBottom);
        ctx.closePath();
        const areaGrad = ctx.createLinearGradient(0, paddingTop, 0, height - paddingBottom);
        areaGrad.addColorStop(0, 'rgba(16, 185, 129, 0.15)');
        areaGrad.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
        ctx.fillStyle = areaGrad;
        ctx.fill();

        // Draw lines connecting points
        ctx.lineWidth = 2.5;
        dataPoints.forEach((dp, i) => {
          if (i < dataPoints.length - 1) {
            const nextDp = dataPoints[i + 1];
            const x1 = paddingLeft + i * step;
            const y1 = height - paddingBottom - (dp.value / maxValue) * chartH;
            const x2 = paddingLeft + (i + 1) * step;
            const y2 = height - paddingBottom - (nextDp.value / maxValue) * chartH;

            // Create localized gradient for the path transition
            const pathGrad = ctx.createLinearGradient(x1, y1, x2, y2);
            pathGrad.addColorStop(0, dp.color);
            pathGrad.addColorStop(1, nextDp.color);

            ctx.strokeStyle = pathGrad;
            ctx.shadowColor = dp.color;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            ctx.shadowBlur = 0;
          }
        });

        // Draw nodes
        dataPoints.forEach((dp, i) => {
          const x = paddingLeft + i * step;
          const y = height - paddingBottom - (dp.value / maxValue) * chartH;

          ctx.shadowColor = dp.color;
          ctx.shadowBlur = 12;
          ctx.fillStyle = dp.color;
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          // White inner core
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(x, y, 2.5, 0, Math.PI * 2);
          ctx.fill();

          // Label value
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.font = 'bold 9px "JetBrains Mono", monospace';
          ctx.fillText(`${dp.value}%`, x, y - 10);

          // Label name
          ctx.fillStyle = '#94a3b8';
          ctx.font = '10px "JetBrains Mono", monospace';
          wrapText(ctx, dp.label, x, height - paddingBottom + 18, step - 5, 12);
        });

      } else if (chartType === 'AREA') {
        const step = chartW / (dataPoints.length - 1 || 1);
        
        // Render full solid transparent gradient
        ctx.beginPath();
        dataPoints.forEach((dp, i) => {
          const x = paddingLeft + i * step;
          const y = height - paddingBottom - (dp.value / maxValue) * chartH;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.lineTo(paddingLeft + (dataPoints.length - 1) * step, height - paddingBottom);
        ctx.lineTo(paddingLeft, height - paddingBottom);
        ctx.closePath();
        
        const mainGrad = ctx.createLinearGradient(0, paddingTop, 0, height - paddingBottom);
        mainGrad.addColorStop(0, 'rgba(59, 130, 246, 0.4)'); // Default to Comando Strategy Blue
        mainGrad.addColorStop(1, 'rgba(59, 130, 246, 0.0)');
        ctx.fillStyle = mainGrad;
        ctx.fill();

        // Top boundary line
        ctx.lineWidth = 3;
        ctx.beginPath();
        dataPoints.forEach((dp, i) => {
          const x = paddingLeft + i * step;
          const y = height - paddingBottom - (dp.value / maxValue) * chartH;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = '#3b82f6';
        ctx.stroke();

        // Points
        dataPoints.forEach((dp, i) => {
          const x = paddingLeft + i * step;
          const y = height - paddingBottom - (dp.value / maxValue) * chartH;

          ctx.fillStyle = dp.color;
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, Math.PI * 2);
          ctx.fill();

          // Text values
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.font = 'bold 9px "JetBrains Mono", monospace';
          ctx.fillText(`${dp.value}%`, x, y - 10);

          ctx.fillStyle = '#94a3b8';
          ctx.font = '10px "JetBrains Mono", monospace';
          wrapText(ctx, dp.label, x, height - paddingBottom + 18, step - 5, 12);
        });

      } else if (chartType === 'SCATTER') {
        // Tactical Target Radar Scatter chart
        const centerX = paddingLeft + chartW / 2;
        const centerY = paddingTop + chartH / 2;
        const maxRadius = Math.min(chartW, chartH) / 2 * 0.95;

        // Draw concentric radar lines
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.15)';
        ctx.lineWidth = 1;
        [0.25, 0.5, 0.75, 1.0].forEach(percent => {
          ctx.beginPath();
          ctx.arc(centerX, centerY, maxRadius * percent, 0, Math.PI * 2);
          ctx.stroke();

          // Radar tick text
          ctx.fillStyle = 'rgba(16, 185, 129, 0.5)';
          ctx.font = '7px "JetBrains Mono", monospace';
          ctx.fillText(`${Math.round(percent * 100)}%`, centerX + maxRadius * percent - 10, centerY - 4);
        });

        // Crosshairs
        ctx.beginPath();
        ctx.moveTo(centerX - maxRadius, centerY);
        ctx.lineTo(centerX + maxRadius, centerY);
        ctx.moveTo(centerX, centerY - maxRadius);
        ctx.lineTo(centerX, centerY + maxRadius);
        ctx.stroke();

        // Plots
        dataPoints.forEach((dp, i) => {
          // Distribute angles evenly
          const angle = (i * (2 * Math.PI) / dataPoints.length) - Math.PI / 2;
          const radius = (dp.value / 100) * maxRadius;

          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);

          // Blinking radar blip effect
          ctx.fillStyle = dp.color;
          ctx.shadowColor = dp.color;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(x, y, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          // Inner marker reticle
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(x, y, 11, 0, Math.PI * 2);
          ctx.stroke();

          // Target label
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'left';
          ctx.font = 'bold 9px "JetBrains Mono", monospace';
          ctx.fillText(`TR_${i+1} [${dp.value}%]`, x + 14, y - 3);
          ctx.fillStyle = '#94a3b8';
          ctx.font = '8px "JetBrains Mono", monospace';
          ctx.fillText(dp.label, x + 14, y + 7);
        });
      }

      // Legend panel on top right
      ctx.textAlign = 'left';
      ctx.font = '8px "JetBrains Mono", monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('DISPOSITIVOS ACTIVOS:', width - paddingRight - 110, 30);
      
      dataPoints.forEach((dp, i) => {
        const rx = width - paddingRight - 110;
        const ry = 42 + i * 11;
        ctx.fillStyle = dp.color;
        ctx.fillRect(rx, ry, 6, 6);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`${dp.label}: ${dp.value}%`, rx + 12, ry + 6);
      });
    }

  }, [chartType, dataPoints, tacticalUnits, mapTick]);

  // Helper to wrap text inside canvas
  const wrapText = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
  };

  // Download functionality as image
  const handleDownload = (format: 'png' | 'jpg') => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // To ensure perfect color and no transparency if saving as jpg, 
    // the original draws a solid black background anyway.
    const url = canvas.toDataURL(format === 'png' ? 'image/png' : 'image/jpeg', 1.0);
    const link = document.createElement('a');
    link.download = `pii_lcc_analisis_rutas_${chartType.toLowerCase()}_${Date.now()}.${format}`;
    link.href = url;
    link.click();
  };

  const updateLabel = (id: string, newLabel: string) => {
    setDataPoints(dataPoints.map(dp => dp.id === id ? { ...dp, label: newLabel } : dp));
  };

  const updateValue = (id: string, newValue: number) => {
    const clamped = Math.max(0, Math.min(100, newValue));
    setDataPoints(dataPoints.map(dp => dp.id === id ? { ...dp, value: clamped } : dp));
  };

  const updateColor = (id: string, newColor: string) => {
    setDataPoints(dataPoints.map(dp => dp.id === id ? { ...dp, color: newColor } : dp));
  };

  return (
    <div id="chart-creator-section" className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-5 md:p-6 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1a1a1a] pb-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 bg-emerald-500/10 text-emerald-400 rounded">
              <BarChart className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-white tracking-wide font-sans">
              Creador de Gráficos de Inteligencia Táctica
            </h2>
          </div>
          <p className="text-[#888] text-xs mt-1 font-mono">
            RUTAS CLANDESTINAS Y MÁXIMOS DE CONTRABANDO REGISTRADO
          </p>
        </div>
        
        {/* Chart Selector HUD */}
        <div className="flex bg-[#050505] p-1 border border-[#1a1a1a] rounded-lg mt-3 sm:mt-0 gap-1">
          {(['BAR', 'LINE', 'AREA', 'SCATTER', 'MAP'] as ChartType[]).map((type) => (
            <button
              key={type}
              onClick={() => setChartType(type)}
              className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all cursor-pointer ${
                chartType === type
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-[#666] hover:text-white hover:bg-[#111]'
              }`}
            >
              {type === 'BAR' && 'Barras'}
              {type === 'LINE' && 'Línea'}
              {type === 'AREA' && 'Área'}
              {type === 'SCATTER' && 'Táctico Radar'}
              {type === 'MAP' && 'Mapa Bolivia (GPS)'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left column: Chart Canvas */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="relative bg-[#050505] border border-[#1a1a1a] rounded-xl overflow-hidden aspect-[4/3] flex items-center justify-center">
            {/* Real responsive canvas */}
            <canvas
              ref={canvasRef}
              style={{ width: '100%', height: '100%' }}
              className="block"
            />

            {/* Map Theme Selector overlay */}
            {chartType === 'MAP' && (
              <div className="absolute bottom-4 left-4 flex bg-[#050505]/90 backdrop-blur-md border border-[#1a1a1a] p-1 rounded-md shadow-lg gap-1 z-10 font-mono text-[10px]">
                <button
                  onClick={() => setMapTheme('CLASSIC')}
                  className={`px-2 py-1 rounded transition-all cursor-pointer ${
                    mapTheme === 'CLASSIC'
                      ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  S-6 CLÁSICO (FÍSICO)
                </button>
                <button
                  onClick={() => setMapTheme('TACTICAL')}
                  className={`px-2 py-1 rounded transition-all cursor-pointer ${
                    mapTheme === 'TACTICAL'
                      ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  TACTICAL CYBER
                </button>
              </div>
            )}
          </div>
          
          {/* Download and quick tools HUD */}
          <div className="flex flex-wrap gap-2 items-center justify-between bg-[#111] p-3 rounded-lg border border-[#222]">
            <div className="flex items-center gap-2 text-[#888] text-xs font-mono">
              <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
              <span>EXPORTACIÓN DIGITAL EN FORMATO MILITAR</span>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => handleDownload('png')}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs px-3 py-1.5 rounded transition-all active:scale-95 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>PNG</span>
              </button>
              <button
                onClick={() => handleDownload('jpg')}
                className="flex items-center gap-2 bg-[#222] hover:bg-[#333] text-slate-300 font-mono text-xs px-3 py-1.5 rounded transition-all active:scale-95 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>JPG</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Chart Editor & Inputs */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#111] p-4 border border-[#222] rounded-xl space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 border-b border-[#222] pb-2">
              <Palette className="w-4 h-4" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider">
                Configuración de 5 Puntos de Datos
              </span>
            </div>
            
            <p className="text-[#888] text-[11px] leading-relaxed">
              Asigne etiquetas de ruta o puntos calientes, configure su nivel porcentual estimado de contrabando y asigne un indicador visual táctico.
            </p>

            <div className="space-y-3 pt-2 max-h-[350px] overflow-y-auto pr-1">
              {dataPoints.map((dp, idx) => (
                <div key={dp.id} className="bg-[#0a0a0a] border border-[#1a1a1a] p-3 rounded-lg space-y-2 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-emerald-500 font-bold">
                      PUNTO_0{idx + 1}
                    </span>
                    
                    {/* Presets dropdown for color */}
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full border border-white/20" 
                        style={{ backgroundColor: dp.color }}
                      />
                      <select
                        value={dp.color}
                        onChange={(e) => updateColor(dp.id, e.target.value)}
                        className="bg-[#050505] text-slate-300 border border-[#1a1a1a] text-[10px] font-mono px-1 py-0.5 rounded cursor-pointer focus:outline-none focus:border-emerald-500"
                      >
                        {colorPresets.map(preset => (
                          <option key={preset.hex} value={preset.hex}>
                            {preset.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-2">
                    {/* Label Input */}
                    <input
                      type="text"
                      value={dp.label}
                      onChange={(e) => updateLabel(dp.id, e.target.value)}
                      placeholder={`Ruta ${idx + 1}`}
                      className="col-span-7 bg-[#050505] text-white border border-[#1a1a1a] rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-emerald-500"
                    />

                    {/* Numeric Input */}
                    <div className="col-span-5 flex items-center bg-[#050505] border border-[#1a1a1a] rounded px-2 py-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={dp.value}
                        onChange={(e) => updateValue(dp.id, parseInt(e.target.value) || 0)}
                        className="w-full bg-transparent text-white text-xs font-mono focus:outline-none text-right pr-1"
                      />
                      <span className="text-[10px] font-mono text-[#555] font-bold">%</span>
                    </div>
                  </div>

                  {/* Range Slider for quicker adjustment */}
                  <div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={dp.value}
                      onChange={(e) => updateValue(dp.id, parseInt(e.target.value))}
                      className="w-full accent-emerald-500 h-1 bg-[#050505] roundedappearance-none cursor-pointer"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setDataPoints(initialData)}
                className="flex items-center gap-1.5 text-xs font-mono text-[#666] hover:text-white transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Restablecer Valores</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
