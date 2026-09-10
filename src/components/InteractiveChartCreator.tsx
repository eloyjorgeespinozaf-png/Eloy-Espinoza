/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { ChartDataPoint, ChartType, TacticalUnit, AutomatedOrder, RawAlert } from '../types';
import { 
  BarChart, 
  LineChart, 
  Activity, 
  Download, 
  Palette, 
  RefreshCw, 
  Layers,
  Radio,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Send,
  Crosshair,
  Shield,
  Check,
  Compass,
  ExternalLink,
  PlusCircle,
  Camera,
  Navigation
} from 'lucide-react';
import { playChime, playSyntheticBeep } from '../utils/audio';
import InterdictionOrderModal from './InterdictionOrderModal';

interface InteractiveChartCreatorProps {
  initialData?: ChartDataPoint[];
  tacticalUnits?: TacticalUnit[];
  activeOrders?: AutomatedOrder[];
  rawAlerts?: RawAlert[];
  onConfirmOrder?: (id: string, newStatus: 'RECEIVED' | 'IN_PROGRESS' | 'COMPLETED') => void;
  onAddOrderUpdate?: (orderId: string, updateMsg: string) => void;
  onCreateOrder?: (order: AutomatedOrder) => void;
}

export default function InteractiveChartCreator({ 
  initialData = [],
  tacticalUnits = [],
  activeOrders = [],
  rawAlerts = [],
  onConfirmOrder,
  onAddOrderUpdate,
  onCreateOrder
}: InteractiveChartCreatorProps) {
  const [chartType, setChartType] = useState<ChartType>('BAR');
  const [dataPoints, setDataPoints] = useState<ChartDataPoint[]>(initialData);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [mapTick, setMapTick] = useState<number>(0);
  const [mapTheme, setMapTheme] = useState<'CLASSIC' | 'TACTICAL'>('CLASSIC');

  // Interdiction Modal & Order Tracking state
  const [selectedOrderForModal, setSelectedOrderForModal] = useState<AutomatedOrder | null>(null);
  const [isInterdictionModalOpen, setIsInterdictionModalOpen] = useState<boolean>(false);
  const [ackNotice, setAckNotice] = useState<string | null>(null);
  const [customUpdateInput, setCustomUpdateInput] = useState<{ [orderId: string]: string }>({});

  // Auto-sync selected order with latest from activeOrders
  useEffect(() => {
    if (activeOrders.length > 0) {
      if (!selectedOrderForModal) {
        setSelectedOrderForModal(activeOrders[0]);
      } else {
        const found = activeOrders.find(o => o.id === selectedOrderForModal.id);
        if (found) setSelectedOrderForModal(found);
      }
    }
  }, [activeOrders]);

  // Handle direct confirmation of order reception from Creador de Gráficos
  const handleConfirmDirect = (order: AutomatedOrder) => {
    playChime(620, 840, 0.25);
    if (onConfirmOrder) {
      onConfirmOrder(order.id, 'RECEIVED');
    }
    const ackMsg = `[${new Date().toLocaleTimeString()}] RECEPCIÓN CONFIRMADA AL MANDO LCC: ${order.assignedUnit} confirma recepción de la OOA ${order.codeName} al CEO-LCC. Enlace C2 OK.`;
    if (onAddOrderUpdate) {
      onAddOrderUpdate(order.id, ackMsg);
    }
    setAckNotice(`RECEPCIÓN CONFIRMADA: Orden ${order.codeName} confirmada con éxito al Mando LCC.`);
    setTimeout(() => setAckNotice(null), 4500);
  };

  // Helper to simulate a new interdiction order for testing
  const handleSimulateNewOrder = () => {
    playSyntheticBeep(780, 0.15);
    const newSimOrder: AutomatedOrder = {
      id: `ooa-${Math.floor(100 + Math.random() * 900)}`,
      intelId: `intel-${Date.now()}`,
      codeName: `OP_CERCO_ANDINO_${Math.floor(10 + Math.random() * 90)}`,
      issuer: 'CEO-LCC Gral. J. Mendoza',
      assignedUnit: tacticalUnits[0]?.name || 'Patrulla Delta-3',
      objective: 'Interdicción e incautación inmediata de convoy de camiones sin matrícula transitando por ruta clandestina.',
      coordinates: '19°14\'32"S 68°37\'15"W',
      status: 'ISSUED',
      timestamp: new Date().toISOString(),
      updates: ['Orden emitida e inyectada al sistema central de telecomunicaciones de terreno desde CEO-LCC.'],
      mediaUrl: 'multimedia-thermal',
      rawAlertId: rawAlerts[0]?.id || 'alert-1'
    };

    if (onCreateOrder) {
      onCreateOrder(newSimOrder);
    }
    setSelectedOrderForModal(newSimOrder);
    setIsInterdictionModalOpen(true);
  };

  // Safe cross-browser roundRect renderer for Canvas
  const drawRoundRectSafe = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) => {
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(x, y, w, h, r);
    } else {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }
  };

  // Coordinates string parser helper
  const parseCoordinates = (coordStr: string): { lat: number; lon: number } | null => {
    if (!coordStr) return null;
    const dmsRegex = /(\d+)\s*°\s*(\d+)\s*'\s*(\d+(?:\.\d+)?)\s*"?\s*([NSns])[,;\s]+(\d+)\s*°\s*(\d+)\s*'\s*(\d+(?:\.\d+)?)\s*"?\s*([WEweOo])/;
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

      if (!isNaN(lat) && !isNaN(lon)) {
        return { lat, lon };
      }
    }

    const cleanStr = coordStr.replace(/[,;]/g, ' ').trim();
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
        drawRoundRectSafe(ctx, lx, ly, labelW, labelH, 3);
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
      const legY = 88;
      const legW = 145;
      const legH = 22 + (tacticalUnits.length * 15);

      ctx.beginPath();
      drawRoundRectSafe(ctx, legX, legY, legW, legH, 4);
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

      // 11. Plot Active Interdiction Orders and Tactical Vectors from MANDO LCC
      if (activeOrders && activeOrders.length > 0) {
        activeOrders.forEach((order, oIdx) => {
          const ordCoords = parseCoordinates(order.coordinates);
          if (!ordCoords) return;

          const isOrdOOB = (ordCoords.lat > minLat || ordCoords.lat < maxLat || ordCoords.lon < minLon || ordCoords.lon > maxLon);
          const oLat = isOrdOOB ? -19.20 - (oIdx * 0.3) : ordCoords.lat;
          const oLon = isOrdOOB ? -68.60 + (oIdx * 0.2) : ordCoords.lon;

          const ox = mapLonToX(oLon);
          const oy = mapLatToY(oLat);

          // Find assigned unit and draw animated intercept vector
          const assignedUnit = tacticalUnits.find(u => u.name === order.assignedUnit);
          if (assignedUnit) {
            const uCoords = parseCoordinates(assignedUnit.coordinates);
            if (uCoords) {
              const uOOB = (uCoords.lat > minLat || uCoords.lat < maxLat || uCoords.lon < minLon || uCoords.lon > maxLon);
              const uLat = uOOB ? -16.50 : uCoords.lat;
              const uLon = uOOB ? -68.15 : uCoords.lon;
              const ux = mapLonToX(uLon);
              const uy = mapLatToY(uLat);

              // Vector dashed stroke
              ctx.strokeStyle = order.status === 'ISSUED' ? '#ef4444' : order.status === 'RECEIVED' ? '#3b82f6' : '#f59e0b';
              ctx.lineWidth = 2;
              ctx.setLineDash([5, 4]);
              ctx.beginPath();
              ctx.moveTo(ux, uy);
              ctx.lineTo(ox, oy);
              ctx.stroke();
              ctx.setLineDash([]);
            }
          }

          // Pulsing target reticle
          const pR = 10 + ((mapTick * 2) % 12);
          ctx.strokeStyle = order.status === 'ISSUED' ? 'rgba(239, 68, 68, 0.8)' : order.status === 'RECEIVED' ? 'rgba(59, 130, 246, 0.8)' : 'rgba(245, 158, 11, 0.8)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(ox, oy, pR, 0, Math.PI * 2);
          ctx.stroke();

          // Center target point
          ctx.fillStyle = order.status === 'ISSUED' ? '#ef4444' : order.status === 'RECEIVED' ? '#3b82f6' : '#f59e0b';
          ctx.beginPath();
          ctx.arc(ox, oy, 4, 0, Math.PI * 2);
          ctx.fill();

          // HUD Floating Label for Interdiction Target
          const badgeW = 125;
          const badgeH = 26;
          const bx = ox - badgeW / 2;
          const by = oy - 34;

          ctx.fillStyle = isClassic ? 'rgba(30, 41, 59, 0.95)' : 'rgba(5, 5, 5, 0.95)';
          ctx.strokeStyle = order.status === 'ISSUED' ? '#ef4444' : order.status === 'RECEIVED' ? '#3b82f6' : '#f59e0b';
          ctx.lineWidth = 1;
          ctx.beginPath();
          drawRoundRectSafe(ctx, bx, by, badgeW, badgeH, 3);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 8px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`INTERDICCIÓN: ${order.codeName}`, ox, by + 10);

          ctx.fillStyle = order.status === 'ISSUED' ? '#f87171' : order.status === 'RECEIVED' ? '#93c5fd' : '#fde68a';
          ctx.font = '7px "JetBrains Mono", monospace';
          ctx.fillText(`MANDO LCC: ${order.status}`, ox, by + 20);
        });
      }
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

  }, [chartType, dataPoints, tacticalUnits, mapTick, activeOrders, mapTheme]);

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

      {/* Ack Notice Banner */}
      {ackNotice && (
        <div className="mb-4 bg-emerald-950/80 border border-emerald-500/60 rounded-lg p-3 text-xs font-mono text-emerald-300 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{ackNotice}</span>
          </div>
          <button onClick={() => setAckNotice(null)} className="text-emerald-500 hover:text-white font-bold">✕</button>
        </div>
      )}

      {/* Top Tactical Alert Ribbon: Interdiction Order from Mando LCC */}
      {(() => {
        const issuedOrder = activeOrders.find(o => o.status === 'ISSUED');
        const activeOrder = activeOrders.find(o => o.status === 'RECEIVED' || o.status === 'IN_PROGRESS') || activeOrders[0];

        if (issuedOrder) {
          return (
            <div className="mb-6 bg-gradient-to-r from-rose-950/70 via-[#0a101f] to-rose-950/70 border-2 border-rose-500/80 rounded-xl p-4 shadow-[0_0_30px_rgba(225,29,72,0.25)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-rose-500/20 border border-rose-500/50 text-rose-400 animate-bounce">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono font-bold bg-rose-900/80 border border-rose-600 text-rose-300 px-2 py-0.5 rounded uppercase animate-pulse">
                      MANDO LCC // ORDEN DE INTERDICCIÓN RECIBIDA
                    </span>
                    <span className="text-xs font-mono font-bold text-white">
                      CÓDIGO: <span className="text-cyan-400">{issuedOrder.codeName}</span>
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 font-sans mt-1">
                    Emisor: <strong className="text-zinc-200">{issuedOrder.issuer}</strong> | Asignada a: <strong className="text-emerald-400">{issuedOrder.assignedUnit}</strong> | Coordenadas: <strong className="text-white font-mono">{issuedOrder.coordinates}</strong>
                  </p>
                  <p className="text-[11px] text-zinc-400 font-sans line-clamp-1 mt-0.5">
                    {issuedOrder.objective}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => handleConfirmDirect(issuedOrder)}
                  className="flex-1 md:flex-initial bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-xs py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(225,29,72,0.4)] active:scale-[0.98] uppercase cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar Recepción</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedOrderForModal(issuedOrder);
                    setIsInterdictionModalOpen(true);
                  }}
                  className="flex-1 md:flex-initial bg-blue-600/25 hover:bg-blue-600/40 text-blue-300 border border-blue-500/50 font-mono font-bold text-xs py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer uppercase"
                >
                  <Radio className="w-4 h-4 text-blue-400" />
                  <span>Ventana de Interdicción & Seguimiento</span>
                </button>
              </div>
            </div>
          );
        } else if (activeOrder) {
          return (
            <div className="mb-6 bg-[#070e1b] border border-blue-600/40 rounded-xl p-3.5 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-950 border border-blue-700/50 text-blue-400">
                  <Radio className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-blue-900/40 border border-blue-700/50 text-blue-300 px-2 py-0.5 rounded font-bold">
                      MANDO LCC // ENLACE C2 ACTIVO
                    </span>
                    <span className="text-white font-bold">{activeOrder.codeName}</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                      activeOrder.status === 'IN_PROGRESS' 
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-600/40' 
                        : activeOrder.status === 'COMPLETED'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-600/40'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-600/40'
                    }`}>
                      {activeOrder.status === 'IN_PROGRESS' && 'Interdicción en curso'}
                      {activeOrder.status === 'RECEIVED' && 'Recepción Confirmada'}
                      {activeOrder.status === 'COMPLETED' && 'Interdicción Cumplida'}
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-400 block mt-0.5">
                    Unidad: <strong className="text-emerald-400">{activeOrder.assignedUnit}</strong> • Punto de Bloqueo: <strong className="text-zinc-300">{activeOrder.coordinates}</strong>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOrderForModal(activeOrder);
                    setIsInterdictionModalOpen(true);
                  }}
                  className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-xs py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_15px_rgba(37,99,235,0.3)]"
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>Abrir Ventana de Interdicción & Seguimiento Mando LCC</span>
                </button>
              </div>
            </div>
          );
        }
        return null;
      })()}

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
                      className="w-full accent-emerald-500 h-1 bg-[#050505] rounded appearance-none cursor-pointer"
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

      {/* SECCIÓN DEDICADA: ÓRDENES DE INTERDICCIÓN & SEGUIMIENTO DEL MANDO LCC */}
      <div className="mt-8 pt-6 border-t border-[#1a1a1a] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-mono font-bold text-white uppercase tracking-wider">
                  Control de Interdicciones & Seguimiento del Mando LCC
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-bold">
                  {activeOrders.length} ÓRDENES REGISTRADAS
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono">
                Recepción formal de órdenes C2, vectorización táctica y enlace de seguimiento con el CEO-LCC
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSimulateNewOrder}
              className="bg-[#0e1726] hover:bg-[#15233a] text-cyan-300 hover:text-cyan-200 border border-cyan-700/60 font-mono text-xs py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5 text-cyan-400" />
              <span>+ Simular Orden Mando LCC</span>
            </button>
          </div>
        </div>

        {/* List of Interdiction Orders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeOrders.map((order) => {
            const isIssued = order.status === 'ISSUED';
            const isReceived = order.status === 'RECEIVED';
            const isInProgress = order.status === 'IN_PROGRESS';
            const isCompleted = order.status === 'COMPLETED';

            return (
              <div 
                key={order.id}
                className={`p-4 rounded-xl border transition-all ${
                  isIssued 
                    ? 'bg-rose-950/20 border-rose-600/70 shadow-[0_0_20px_rgba(225,29,72,0.15)]'
                    : isReceived
                    ? 'bg-blue-950/20 border-blue-600/60'
                    : isInProgress
                    ? 'bg-amber-950/20 border-amber-600/60'
                    : 'bg-emerald-950/20 border-emerald-600/60'
                }`}
              >
                <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-2.5 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                        isIssued 
                          ? 'bg-rose-950 border-rose-600 text-rose-300 animate-pulse'
                          : isReceived
                          ? 'bg-blue-950 border-blue-600 text-blue-300'
                          : isInProgress
                          ? 'bg-amber-950 border-amber-600 text-amber-300'
                          : 'bg-emerald-950 border-emerald-600 text-emerald-300'
                      }`}>
                        {isIssued && '1. PENDIENTE CONFIRMAR RECEPCIÓN'}
                        {isReceived && '2. RECEPCIÓN CONFIRMADA'}
                        {isInProgress && '3. INTERDICCIÓN EN CURSO'}
                        {isCompleted && '4. INTERDICCIÓN COMPLETADA'}
                      </span>
                    </div>

                    <h4 className="text-sm font-mono font-bold text-white mt-1">
                      {order.codeName}
                    </h4>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOrderForModal(order);
                      setIsInterdictionModalOpen(true);
                    }}
                    className="p-1.5 rounded bg-blue-600/20 hover:bg-blue-600/40 text-cyan-300 border border-blue-500/40 transition-colors cursor-pointer"
                    title="Abrir Ventana de Interdicción"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2 text-xs font-mono mb-4">
                  <p className="text-zinc-300 font-sans text-xs line-clamp-2">
                    {order.objective}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div className="bg-[#050912] p-2 rounded border border-white/5">
                      <span className="text-zinc-500 block text-[9px]">UNIDAD ASIGNADA</span>
                      <span className="text-emerald-400 font-bold">{order.assignedUnit}</span>
                    </div>

                    <div className="bg-[#050912] p-2 rounded border border-white/5">
                      <span className="text-zinc-500 block text-[9px]">COORDENADAS CORTE</span>
                      <span className="text-white font-bold">{order.coordinates}</span>
                    </div>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
                  {isIssued && (
                    <button
                      type="button"
                      onClick={() => handleConfirmDirect(order)}
                      className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(225,29,72,0.3)] transition-all cursor-pointer uppercase"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirmar Recepción</span>
                    </button>
                  )}

                  {isReceived && (
                    <button
                      type="button"
                      onClick={() => {
                        if (onConfirmOrder) onConfirmOrder(order.id, 'IN_PROGRESS');
                        if (onAddOrderUpdate) onAddOrderUpdate(order.id, `[${new Date().toLocaleTimeString()}] INICIO DE INTERDICCIÓN: Despliegue de vehículos hacia ${order.coordinates}.`);
                        playSyntheticBeep(920, 0.2);
                      }}
                      className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer uppercase"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Iniciar Despliegue</span>
                    </button>
                  )}

                  {isInProgress && (
                    <button
                      type="button"
                      onClick={() => {
                        if (onConfirmOrder) onConfirmOrder(order.id, 'COMPLETED');
                        if (onAddOrderUpdate) onAddOrderUpdate(order.id, `[${new Date().toLocaleTimeString()}] INTERDICCIÓN COMPLETADA: Contrabando decomisado.`);
                        playChime(750, 990, 0.3);
                      }}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer uppercase"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Completar Interdicción</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOrderForModal(order);
                      setIsInterdictionModalOpen(true);
                    }}
                    className="bg-[#0b1320] hover:bg-[#121f35] text-cyan-300 font-mono text-xs py-2 px-3 rounded-lg border border-[#20324f] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Radio className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Ventana de Interdicción</span>
                  </button>
                </div>

                {/* Inline Quick update transmission to Mando LCC */}
                <div className="mt-3 pt-2.5 border-t border-white/5 flex gap-1.5">
                  <input
                    type="text"
                    value={customUpdateInput[order.id] || ''}
                    onChange={(e) => setCustomUpdateInput({ ...customUpdateInput, [order.id]: e.target.value })}
                    placeholder="Novedad para Mando LCC..."
                    className="flex-1 bg-[#050912] text-xs font-mono text-white border border-[#1e293b] rounded px-2.5 py-1 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const msg = customUpdateInput[order.id];
                      if (!msg?.trim()) return;
                      const formatted = `[${new Date().toLocaleTimeString()}] [NOVEDAD TERRENO -> MANDO LCC] ${msg.trim()}`;
                      if (onAddOrderUpdate) onAddOrderUpdate(order.id, formatted);
                      setCustomUpdateInput({ ...customUpdateInput, [order.id]: '' });
                      playSyntheticBeep(850, 0.1);
                    }}
                    className="bg-cyan-600/30 hover:bg-cyan-600 text-cyan-300 hover:text-white text-xs font-mono px-2.5 py-1 rounded border border-cyan-600/50 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Send className="w-3 h-3" />
                    <span>Enviar</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RENDER INTERDICTION ORDER MODAL WINDOW */}
      {selectedOrderForModal && (
        <InterdictionOrderModal
          isOpen={isInterdictionModalOpen}
          onClose={() => setIsInterdictionModalOpen(false)}
          order={selectedOrderForModal}
          allOrders={activeOrders}
          onSelectOrder={(ord) => setSelectedOrderForModal(ord)}
          tacticalUnits={tacticalUnits}
          rawAlerts={rawAlerts}
          onConfirmOrder={(id, newStatus) => {
            if (onConfirmOrder) onConfirmOrder(id, newStatus);
            setSelectedOrderForModal(prev => prev && prev.id === id ? { ...prev, status: newStatus } : prev);
          }}
          onAddOrderUpdate={(id, updateMsg) => {
            if (onAddOrderUpdate) onAddOrderUpdate(id, updateMsg);
            setSelectedOrderForModal(prev => prev && prev.id === id ? { ...prev, updates: [...prev.updates, updateMsg] } : prev);
          }}
        />
      )}
    </div>
  );
}
