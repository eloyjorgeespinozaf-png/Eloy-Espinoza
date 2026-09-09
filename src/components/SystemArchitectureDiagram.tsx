/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Radio, 
  Zap, 
  Lock, 
  Eye, 
  User, 
  Cpu, 
  Server, 
  Database, 
  Activity, 
  Play, 
  RefreshCw, 
  Compass, 
  Terminal, 
  ChevronRight, 
  Layers,
  Award
} from 'lucide-react';
import OfficialCrest from './OfficialCrest';

interface DiagramNode {
  id: string;
  title: string;
  subtitle: string;
  level: string;
  color: string;
  icon: React.ReactNode;
  description: string;
  details: string[];
  status: string;
  channels: string[];
}

interface SystemArchitectureDiagramProps {
  appVersion?: string;
  sendWsMessage?: (type: string, payload: any) => void;
}

export default function SystemArchitectureDiagram({ 
  appVersion = 'v2.4.0-CAD', 
  sendWsMessage 
}: SystemArchitectureDiagramProps) {
  const [activeNode, setActiveNode] = useState<string | null>('node-cfi');
  const [simulatingCycle, setSimulatingCycle] = useState(false);
  const [currentCycleStep, setCurrentCycleStep] = useState<number>(-1);
  const [cycleLog, setCycleLog] = useState<string[]>([]);
  const [upgradeNotice, setUpgradeNotice] = useState<string | null>(null);

  // Simulation Steps
  // 0: Fuentes capture data
  // 1: Fusion in CFI
  // 2: Strategic Decision in CEO
  // 3: Automated Orders back to Patrols
  useEffect(() => {
    if (!simulatingCycle) return;

    const steps = [
      {
        log: "Fase 1: Sensores de campo y VANTs capturan tránsito sospechoso en Hito 14. Datos S-2 encriptados.",
        node: "node-fuentes",
      },
      {
        log: "Fase 2: Datos brutos recibidos por Célula de Fusión (CFI). Proceso de correlación y desduplicación activo.",
        node: "node-cfi",
      },
      {
        log: "Fase 3: Alerta promovida a Inteligencia Accionable. Validando fiabilidad 'A' y certeza '1' en base de datos CFI.",
        node: "node-cfi",
      },
      {
        log: "Fase 4: Consola CEO-LCC notificada. Comando Estratégico autoriza OOA (Orden de Operaciones Automatizada).",
        node: "node-ceo",
      },
      {
        log: "Fase 5: Envío cifrado AES-256 de coordenadas y vector de interceptación a patrulla terrestre de terreno.",
        node: "node-patrullas",
      },
      {
        log: "Ciclo Completo: Interceptación táctica en curso. Actualización GPS en tiempo real confirmada.",
        node: null,
      }
    ];

    if (currentCycleStep < steps.length) {
      const timer = setTimeout(() => {
        if (currentCycleStep >= 0) {
          const current = steps[currentCycleStep];
          setCycleLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${current.log}`]);
          if (current.node) {
            setActiveNode(current.node);
          }
        }
        setCurrentCycleStep(prev => prev + 1);
      }, 2200);

      return () => clearTimeout(timer);
    } else {
      setSimulatingCycle(false);
      setCurrentCycleStep(-1);
    }
  }, [simulatingCycle, currentCycleStep]);

  const startIntelligenceCycle = () => {
    setSimulatingCycle(true);
    setCurrentCycleStep(0);
    setCycleLog([`[${new Date().toLocaleTimeString()}] SISTEMA: Iniciando Ciclo Táctico de Inteligencia PII-LCC...`]);
    setActiveNode('node-fuentes');
  };

  const nodes: Record<string, DiagramNode> = {
    'node-ceo': {
      id: 'node-ceo',
      title: 'CEO-DECISIÓN',
      subtitle: 'Nivel 3: Estratégico (Comando y Control)',
      level: 'ESTRATÉGICO',
      color: '#3b82f6', // Blue
      icon: <Zap className="w-6 h-6 text-[#3b82f6]" />,
      description: 'Centro de Operaciones Estratégicas del Mando de ECEME. Encargado de la toma de decisiones finales y la firma digital autorizada de Órdenes de Operación.',
      details: [
        'Aprobación Criptográfica de Órdenes (CAD-C2)',
        'Firma Digital de Interdicción Táctica',
        'Visualización de Rutas Críticas Consolidadas',
        'Acceso de Alto Rango Restringido'
      ],
      status: 'SISTEMAS ALINEADOS',
      channels: ['M-C2 Secure Link', 'Crypto-Satelital HF']
    },
    'node-cfi': {
      id: 'node-cfi',
      title: 'CFI-FUSIÓN',
      subtitle: 'Nivel 2: Operacional (Célula de Fusión)',
      level: 'OPERACIONAL',
      color: '#f97316', // Orange
      icon: <Server className="w-6 h-6 text-[#f97316]" />,
      description: 'El núcleo de procesamiento de la PII-LCC. Recibe datos brutos de múltiples fuentes de terreno, los filtra, analiza con matrices de fiabilidad doctrinales y los promueve.',
      details: [
        'Cifrado Homomórfico Extremo a Extremo',
        'Base de Datos de Perfiles delictivos y Clanes',
        'Servidor de Correlación de Alertas S-2',
        'Validación de Atributos de Certeza (1-4) y Fiabilidad (A-D)'
      ],
      status: 'FUSIÓN ACTIVA [AES-256]',
      channels: ['Database Core Sync', 'CFI Decoupled Broker']
    },
    'node-fuentes': {
      id: 'node-fuentes',
      title: 'SENSORES DE CAMPO',
      subtitle: 'Nivel 1: Fuentes y Adquisición',
      level: 'TÁCTICO-SENSORES',
      color: '#10b981', // Green
      icon: <Radio className="w-6 h-6 text-[#10b981]" />,
      description: 'Dispositivos autónomos y sensores IoT distribuidos a lo largo de las fronteras críticas para capturar tránsitos clandestinos de forma automática.',
      details: [
        'Geófonos y Cámaras Térmicas Activas',
        'Alertas Automatizadas de Tránsito de Vehículos',
        'Sensores de Movimiento Infrarrojos',
        'Bajo Consumo de Batería con Transmisión LoRaWAN'
      ],
      status: 'ENLACE NOMINAL (98%)',
      channels: ['LoRaWAN Gateway Alpha', 'Uplink Terrestre Secure']
    },
    'node-drones': {
      id: 'node-drones',
      title: 'VANTs (DRONES)',
      subtitle: 'Nivel 1: Fuentes y Adquisición',
      level: 'TÁCTICO-AÉREO',
      color: '#10b981', // Green
      icon: <Compass className="w-6 h-6 text-[#10b981]" />,
      description: 'Vehículos Aéreos No Tripulados (VANT) dedicados a patrullaje y vigilancia visual continua de las rutas y pasos fronterizos no habilitados.',
      details: [
        'Transmisión de Video Térmico de Alta Definición',
        'Mapeo de Rutas Clandestinas por Contraste',
        'Detección Automática de Vehículos Cómplices',
        'Coordinación de Coordenadas de Interceptación'
      ],
      status: 'PATRULLAJE ACTIVO',
      channels: ['Satelital C-Band Link', 'Telemetry Port 3000']
    },
    'node-patrullas': {
      id: 'node-patrullas',
      title: 'PATRULLAS (HUMINT)',
      subtitle: 'Nivel 1: Fuentes y Adquisición',
      level: 'TÁCTICO-OPERACIONES',
      color: '#10b981', // Green
      icon: <Shield className="w-6 h-6 text-[#10b981]" />,
      description: 'Órganos de Búsqueda y Patrullas Militares del S-2 en el terreno. Reciben órdenes directas y reportan incidentes críticos a través de terminales de campaña.',
      details: [
        'Ingreso de Reportes Manuales (S-2) de Campo',
        'Recepción de Coordenadas Tácticas de Operación',
        'Firma de Operaciones Militares Activas',
        'Seguimiento GPS Satelital Inmune a Inhibidores'
      ],
      status: 'DESPLIEGUE FRONTERIZO',
      channels: ['Tactical UHF-Crypto', 'GPS Beacon Sync']
    }
  };

  const currentNode = activeNode ? nodes[activeNode] : null;

  return (
    <div className="bg-[#0b0c10] border border-[#1a1c23] rounded-xl p-6 shadow-2xl relative overflow-hidden text-left" id="architecture-diagram-container">
      {/* Visual Header */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#3b82f6] via-[#f97316] to-[#10b981]" />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#1a1c23] pb-4 mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-4 h-4 text-[#f97316]" />
            <span className="text-[10px] text-[#f97316] font-mono tracking-widest uppercase font-bold">
              ESTRUCTURA DE DOCTRINA MILITAR DE ACCESO
            </span>
          </div>
          <h3 className="text-sm md:text-base font-bold text-white font-mono uppercase tracking-tight">
            INFOGRAFÍA DE ARQUITECTURA TÁCTICA PII-LCC
          </h3>
          <p className="text-xs text-zinc-500 font-mono mt-0.5">
            SISTEMA INTEGRADO DE ENLACES, FLUJOS LUMINISCENTES Y CAPAS DE SEGURIDAD
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={startIntelligenceCycle}
            disabled={simulatingCycle}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded font-mono font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
              simulatingCycle 
                ? 'bg-zinc-900 border border-zinc-800 text-zinc-500 cursor-not-allowed'
                : 'bg-[#f97316]/10 hover:bg-[#f97316]/20 border border-[#f97316]/40 text-[#f97316]'
            }`}
          >
            {simulatingCycle ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Simulando...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-[#f97316]" />
                <span>Simular Ciclo de Inteligencia</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* SVG Diagram Canvas (Left 7 Cols) */}
        <div className="lg:col-span-7 bg-[#050505] rounded-xl border border-zinc-900 relative p-4 flex items-center justify-center min-h-[460px]">
          {/* Subtle backdrop scanning grids */}
          <div className="absolute inset-0 bg-[radial-gradient(rgba(249,115,22,0.015)_1.5px,transparent_1.5px)] bg-[size:16px_16px] pointer-events-none" />
          
          <svg
            viewBox="0 0 740 500"
            className="w-full h-full max-w-[680px]"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Flow line gradients */}
              <linearGradient id="flow-up" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#f97316" stopOpacity="0.8" />
              </linearGradient>

              <linearGradient id="flow-top" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#f97316" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.8" />
              </linearGradient>

              <linearGradient id="flow-feedback" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f97316" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
              </linearGradient>

              {/* Glowing effects */}
              <filter id="glow-neon" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* INTER-LEVEL ANIMATED FLOW LINES (DATAFUSION PATHS) */}
            <g id="animated-paths" strokeWidth="1.8" fill="none">
              {/* 1. Drones to CFI Fusión */}
              <path 
                d="M 160 395 C 160 310, 310 280, 310 250" 
                stroke="url(#flow-up)" 
                strokeDasharray="6 6"
                className="animate-flow-line"
                style={{ animation: 'dash-up 1.8s linear infinite' }}
              />

              {/* 2. Field Sensors to CFI Fusión */}
              <path 
                d="M 370 395 L 370 250" 
                stroke="url(#flow-up)" 
                strokeDasharray="6 6"
                className="animate-flow-line"
                style={{ animation: 'dash-up 1.2s linear infinite' }}
              />

              {/* 3. Patrols S-2 to CFI Fusión (Reports) */}
              <path 
                d="M 580 395 C 580 310, 430 280, 430 250" 
                stroke="url(#flow-up)" 
                strokeDasharray="6 6"
                className="animate-flow-line"
                style={{ animation: 'dash-up 2.2s linear infinite' }}
              />

              {/* 4. CFI Fusión to CEO Decision (Strategic Reports) */}
              <path 
                d="M 370 190 L 370 115" 
                stroke="url(#flow-top)" 
                strokeDasharray="8 6"
                className="animate-flow-line"
                style={{ animation: 'dash-up 1.5s linear infinite' }}
              />

              {/* 5. FEEDBACK LOOP: CFI Fusión -> Patrols (Automated Tactical Orders OOA) */}
              {/* Curved red/orange loop symbolizing automated real-time tactical action */}
              <path 
                d="M 430 200 C 510 200, 615 280, 600 395" 
                stroke="url(#flow-feedback)" 
                strokeWidth="2.5"
                strokeDasharray="10 6"
                className="animate-flow-line"
                style={{ animation: 'dash-down 2.5s linear infinite' }}
              />
            </g>

            {/* FLOW DIRECTION ARROWS */}
            <g fill="#444" stroke="none">
              <polygon points="370,110 365,118 375,118" fill="#3b82f6" /> {/* To CEO */}
              <polygon points="310,245 305,255 315,255" fill="#f97316" /> {/* From Drones to CFI */}
              <polygon points="370,245 365,255 375,255" fill="#f97316" /> {/* From Sensors to CFI */}
              <polygon points="430,245 425,255 435,255" fill="#f97316" /> {/* From Patrols to CFI */}
              <polygon points="600,398 593,388 605,388" fill="#10b981" /> {/* From CFI to Patrols */}
            </g>

            {/* STAGE LEVEL GUIDELINES (Faint background hierarchy borders) */}
            <g stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="4 4" fill="none">
              <line x1="20" y1="140" x2="720" y2="140" />
              <line x1="20" y1="330" x2="720" y2="330" />
            </g>

            <g fill="rgba(255,255,255,0.18)" fontStyle="mono" fontSize="8" fontWeight="bold">
              <text x="30" y="130">NIVEL 3 - MANDO ESTRATÉGICO (CEO-LCC)</text>
              <text x="30" y="320">NIVEL 2 - CÉLULA DE FUSIÓN (CFI-FUSIÓN)</text>
              <text x="30" y="485">NIVEL 1 - ADQUISICIÓN Y ADQUISICIÓN DE TERRENO (S-2)</text>
            </g>

            {/* LEVEL 3: CEO-DECISIÓN (TOP NODE) */}
            <g 
              transform="translate(370, 75)" 
              className="cursor-pointer" 
              onClick={() => setActiveNode('node-ceo')}
            >
              <circle 
                cx="0" 
                cy="0" 
                r="36" 
                fill="#050811" 
                stroke={activeNode === 'node-ceo' ? '#3b82f6' : '#1d3b73'} 
                strokeWidth={activeNode === 'node-ceo' ? '3.5' : '2'}
                filter={activeNode === 'node-ceo' ? 'url(#glow-neon)' : ''}
              />
              {/* Strategic Radar Pulse Circles */}
              <circle cx="0" cy="0" r="48" fill="none" stroke="#3b82f6" strokeWidth="0.5" opacity="0.3" strokeDasharray="3 3" />
              
              {/* Tech details in node */}
              <rect x="-24" y="-24" width="48" height="48" rx="4" fill="rgba(10,15,30,0.8)" stroke="rgba(59,130,246,0.3)" strokeWidth="1" />
              {/* Node Icon */}
              <g transform="translate(-11, -12)">
                <Zap className="w-5 h-5 text-[#3b82f6] animate-pulse" />
              </g>
              <text x="0" y="3" fill="#ffffff" fontFamily="monospace" fontSize="6.5" fontWeight="black" textAnchor="middle">C2-HUB</text>
              
              {/* Text Label */}
              <text x="0" y="58" fill="#ffffff" fontFamily="monospace" fontSize="10.5" fontWeight="bold" textAnchor="middle">CEO-DECISIÓN</text>
              <text x="0" y="68" fill="#3b82f6" fontFamily="monospace" fontSize="8" fontWeight="semibold" textAnchor="middle">MANDO CENTRAL</text>
            </g>


            {/* LEVEL 2: CFI-FUSIÓN (CENTRAL CORE) WITH AES-256 SECURITY LOCK */}
            <g 
              transform="translate(370, 220)" 
              className="cursor-pointer" 
              onClick={() => setActiveNode('node-cfi')}
            >
              {/* Dynamic Scanning Circle */}
              <circle cx="0" cy="0" r="56" fill="none" stroke="#f97316" strokeWidth="0.8" opacity="0.25" />
              <circle cx="0" cy="0" r="62" fill="none" stroke="#f97316" strokeWidth="1" opacity="0.15" strokeDasharray="20 40" className="animate-spin" style={{ animationDuration: '15s' }} />

              {/* SECURE PADLOCK BOUNDARY ENVELOPE (AES-256 Cifrado de Extremo a Extremo) */}
              <circle 
                cx="0" 
                cy="0" 
                r="40" 
                fill="#0b0805" 
                stroke={activeNode === 'node-cfi' ? '#f97316' : '#8c430d'} 
                strokeWidth={activeNode === 'node-cfi' ? '3.5' : '2'}
                filter={activeNode === 'node-cfi' ? 'url(#glow-neon)' : ''}
              />
              
              {/* Cyber Shield Grid */}
              <ellipse cx="0" cy="0" rx="38" ry="14" fill="none" stroke="rgba(249,115,22,0.15)" strokeWidth="0.8" />
              <ellipse cx="0" cy="0" rx="14" ry="38" fill="none" stroke="rgba(249,115,22,0.15)" strokeWidth="0.8" />

              {/* Digital Lock Overlay */}
              <g transform="translate(-10, -14)">
                <Lock className="w-5 h-5 text-[#f97316] animate-pulse" />
              </g>

              {/* Server Details */}
              <text x="0" y="16" fill="#f97316" fontFamily="monospace" fontSize="7.5" fontWeight="black" textAnchor="middle">AES-256</text>
              <text x="0" y="24" fill="#666" fontFamily="monospace" fontSize="6" textAnchor="middle">SECURE CORE</text>

              {/* Text Label */}
              <text x="0" y="60" fill="#ffffff" fontFamily="monospace" fontSize="11" fontWeight="bold" textAnchor="middle">CFI-FUSIÓN</text>
              <text x="0" y="70" fill="#f97316" fontFamily="monospace" fontSize="8" fontWeight="semibold" textAnchor="middle">CÉLULA CORE</text>
            </g>


            {/* LEVEL 1: FUENTES DE INFORMACIÓN (BOTTOM NODES) */}

            {/* 1. Drones (VANTs) - Left */}
            <g 
              transform="translate(160, 420)" 
              className="cursor-pointer" 
              onClick={() => setActiveNode('node-drones')}
            >
              <circle 
                cx="0" 
                cy="0" 
                r="30" 
                fill="#040b08" 
                stroke={activeNode === 'node-drones' ? '#10b981' : '#14532d'} 
                strokeWidth={activeNode === 'node-drones' ? '3' : '1.5'}
                filter={activeNode === 'node-drones' ? 'url(#glow-neon)' : ''}
              />
              {/* Drone visual hilt */}
              <path d="M -15 -8 L 15 -8 M -15 8 L 15 8" stroke="rgba(16,185,129,0.3)" strokeWidth="2" />
              <circle cx="-15" cy="-8" r="4.5" fill="none" stroke="#10b981" strokeWidth="1" />
              <circle cx="15" cy="-8" r="4.5" fill="none" stroke="#10b981" strokeWidth="1" />
              <circle cx="-15" cy="8" r="4.5" fill="none" stroke="#10b981" strokeWidth="1" />
              <circle cx="15" cy="8" r="4.5" fill="none" stroke="#10b981" strokeWidth="1" />

              <g transform="translate(-8, -8)">
                <Compass className="w-4 h-4 text-[#10b981]" />
              </g>

              {/* Text Label */}
              <text x="0" y="46" fill="#ffffff" fontFamily="monospace" fontSize="9.5" fontWeight="bold" textAnchor="middle">VANT (AÉREO)</text>
              <text x="0" y="54" fill="#10b981" fontFamily="monospace" fontSize="7.5" textAnchor="middle">FUENTES EN VUELO</text>
            </g>

            {/* 2. Field Sensors - Center */}
            <g 
              transform="translate(370, 420)" 
              className="cursor-pointer" 
              onClick={() => setActiveNode('node-fuentes')}
            >
              <circle 
                cx="0" 
                cy="0" 
                r="30" 
                fill="#040b08" 
                stroke={activeNode === 'node-fuentes' ? '#10b981' : '#14532d'} 
                strokeWidth={activeNode === 'node-fuentes' ? '3' : '1.5'}
                filter={activeNode === 'node-fuentes' ? 'url(#glow-neon)' : ''}
              />
              <g transform="translate(-8, -8)">
                <Radio className="w-4 h-4 text-[#10b981]" />
              </g>
              {/* Sensor waves */}
              <circle cx="0" cy="0" r="16" fill="none" stroke="#10b981" strokeWidth="0.5" opacity="0.4" className="animate-ping" style={{ animationDuration: '3s' }} />

              {/* Text Label */}
              <text x="0" y="46" fill="#ffffff" fontFamily="monospace" fontSize="9.5" fontWeight="bold" textAnchor="middle">SENSORES TIERRA</text>
              <text x="0" y="54" fill="#10b981" fontFamily="monospace" fontSize="7.5" textAnchor="middle">FUENTES IoT</text>
            </g>

            {/* 3. Patrols S-2 - Right */}
            <g 
              transform="translate(580, 420)" 
              className="cursor-pointer" 
              onClick={() => setActiveNode('node-patrullas')}
            >
              <circle 
                cx="0" 
                cy="0" 
                r="30" 
                fill="#040b08" 
                stroke={activeNode === 'node-patrullas' ? '#10b981' : '#14532d'} 
                strokeWidth={activeNode === 'node-patrullas' ? '3' : '1.5'}
                filter={activeNode === 'node-patrullas' ? 'url(#glow-neon)' : ''}
              />
              <g transform="translate(-8, -8)">
                <User className="w-4 h-4 text-[#10b981]" />
              </g>
              <circle cx="0" cy="0" r="14" fill="none" stroke="#10b981" strokeWidth="1" strokeDasharray="3 3" />

              {/* Text Label */}
              <text x="0" y="46" fill="#ffffff" fontFamily="monospace" fontSize="9.5" fontWeight="bold" textAnchor="middle">PATRULLAS S-2</text>
              <text x="0" y="54" fill="#10b981" fontFamily="monospace" fontSize="7.5" textAnchor="middle">HUMINT / TERRENO</text>
            </g>

            {/* ENCRYPTION GATEWAY WRAPPER (Visual padlock loop connecting CFI Fusión) */}
            <g transform="translate(370, 220)" pointerEvents="none">
              <path 
                d="M -50 0 C -50 -55, 50 -55, 50 0" 
                fill="none" 
                stroke="#10b981" 
                strokeWidth="1.5" 
                strokeDasharray="4 4" 
                opacity="0.5" 
              />
              <rect x="-24" y="-55" width="48" height="13" rx="3" fill="#090a0f" stroke="#10b981" strokeWidth="0.8" />
              <text x="0" y="-46" fill="#10b981" fontFamily="monospace" fontSize="6.5" fontWeight="black" textAnchor="middle" letterSpacing="0.5">CIFRADO AES-256</text>
            </g>
          </svg>
        </div>

        {/* Technical Data panel (Right 5 Cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-6">
          
          {/* Active Node Specification Sheet */}
          {currentNode ? (
            <div className="bg-[#0c0d12] border border-zinc-900 rounded-xl p-5 relative overflow-hidden flex-1 flex flex-col justify-between">
              <div>
                {/* Node classification badge */}
                <div className="flex items-center justify-between border-b border-zinc-900 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: currentNode.color }} 
                    />
                    <span className="text-[9px] font-mono font-bold tracking-widest uppercase text-zinc-400">
                      ESPECIFICACIÓN DE COMPONENTE
                    </span>
                  </div>
                  <span 
                    className="text-[9px] font-mono font-black px-2 py-0.5 rounded"
                    style={{ backgroundColor: `${currentNode.color}15`, color: currentNode.color, border: `1px solid ${currentNode.color}30` }}
                  >
                    {currentNode.level}
                  </span>
                </div>

                {/* Node Title & Icon */}
                <div className="flex items-start gap-4 mb-4">
                  <div 
                    className="p-3 rounded-lg border"
                    style={{ backgroundColor: `${currentNode.color}08`, borderColor: `${currentNode.color}25` }}
                  >
                    {currentNode.icon}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold font-mono text-white tracking-wider uppercase">
                      {currentNode.title}
                    </h4>
                    <p className="text-[11px] text-zinc-500 font-mono mt-0.5 leading-tight">
                      {currentNode.subtitle}
                    </p>
                  </div>
                </div>

                {/* Description Text */}
                <p className="text-xs text-zinc-400 leading-relaxed mb-5">
                  {currentNode.description}
                </p>

                {/* Sub-capabilities */}
                <div className="space-y-3">
                  <h5 className="text-[10px] font-mono text-zinc-500 uppercase font-bold tracking-wider">
                    Funciones y Protocolos Activos:
                  </h5>
                  <div className="space-y-2">
                    {currentNode.details.map((detail, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs">
                        <ChevronRight className="w-3.5 h-3.5 text-zinc-600 mt-0.5 shrink-0" />
                        <span className="text-zinc-300 font-sans">{detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Channels & Status Footer */}
              <div className="mt-6 pt-4 border-t border-zinc-900/60 grid grid-cols-2 gap-4 text-left">
                <div>
                  <span className="text-[9px] font-mono text-zinc-600 uppercase block leading-none">Canales de Enlace:</span>
                  <div className="mt-1.5 space-y-1">
                    {currentNode.channels.map((ch, idx) => (
                      <span key={idx} className="inline-block bg-zinc-950 text-zinc-400 font-mono text-[9px] px-1.5 py-0.5 rounded border border-zinc-900 mr-1">
                        {ch}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-[9px] font-mono text-zinc-600 uppercase block leading-none">Canal de Enlace:</span>
                  <span className="inline-flex items-center gap-1.5 font-mono text-[9px] font-bold text-white mt-2">
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: currentNode.color }} />
                    {currentNode.status}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#0c0d12] border border-zinc-900 rounded-xl p-5 text-center text-zinc-500 flex-1 flex items-center justify-center font-mono text-xs">
              Seleccione un nodo del diagrama para ver sus especificaciones tácticas detalladas.
            </div>
          )}

          {/* Simulated Cycle Terminal Log */}
          <div className="bg-[#050505] border border-zinc-900 rounded-xl p-4 h-[160px] flex flex-col justify-between">
            <div className="flex items-center gap-2 border-b border-zinc-900 pb-2 mb-2">
              <Terminal className="w-3.5 h-3.5 text-[#f97316]" />
              <span className="text-[9px] font-mono font-bold text-[#f97316] uppercase tracking-widest">
                MONITOR DE CICLO DE INTELIGENCIA
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto text-left text-[10px] font-mono text-zinc-400 space-y-1.5 pr-1 custom-scrollbar">
              {cycleLog.length === 0 ? (
                <div className="text-zinc-600 italic">
                  [SISTEMA] Listo para iniciar simulación. Presione "Simular Ciclo de Inteligencia" para transmitir flujos.
                </div>
              ) : (
                cycleLog.map((log, idx) => (
                  <div key={idx} className="leading-relaxed border-l border-zinc-800 pl-2">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

      {/* OTA SECURE PATCH CONTROL SYSTEM */}
      <div className="mt-8 pt-6 border-t border-zinc-900 flex flex-col md:flex-row items-stretch gap-6">
        <div className="flex-1 bg-gradient-to-br from-[#0c0d12] to-[#06070a] border border-zinc-900 rounded-xl p-5 text-left relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <Cpu className="w-24 h-24 text-[#3b82f6]" />
          </div>
          
          <div className="flex items-center gap-2 mb-3">
            <RefreshCw className="w-4 h-4 text-[#3b82f6]" />
            <h4 className="text-xs font-bold font-mono text-white tracking-widest uppercase">
              Centro de Control de Autoparche y Actualizaciones OTA (Multipunto)
            </h4>
          </div>
          
          <p className="text-xs text-zinc-400 leading-relaxed mb-4">
            Este módulo representa la capacidad de la PII-LCC para autogestionar mejoras doctrinales de forma descentralizada. Cuando los desarrolladores o ingenieros militares de Mando Central suben mejoras al servidor central de Cloud Run, todos los terminales tácticos distribuidos en el terreno detectan el parche y se actualizan de forma automática en caliente (Hot-Swap) mediante WebSockets sin pérdida de datos locales de operación.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-[11px] mb-4">
            <div className="bg-[#050505] p-3 rounded border border-zinc-900">
              <span className="text-[9px] text-[#666] uppercase block">VERSIÓN INSTALADA:</span>
              <span className="text-white font-bold block mt-1">{appVersion}</span>
            </div>
            <div className="bg-[#050505] p-3 rounded border border-zinc-900">
              <span className="text-[9px] text-[#666] uppercase block">CANALES DE AUTOPARCHE:</span>
              <span className="text-[#10b981] font-bold block mt-1">● CONEXIÓN ACTIVA (WS)</span>
            </div>
            <div className="bg-[#050505] p-3 rounded border border-zinc-900">
              <span className="text-[9px] text-[#666] uppercase block">MODO DE TRANSFERENCIA:</span>
              <span className="text-[#3b82f6] font-bold block mt-1">MUTABLE HOT-SWAP</span>
            </div>
          </div>
        </div>

        <div className="md:w-80 bg-zinc-950/60 border border-zinc-900 rounded-xl p-5 flex flex-col justify-between text-left">
          <div>
            <h5 className="text-xs font-bold font-mono text-white uppercase tracking-wider mb-2">
              Simulador de Despliegue de Mejoras
            </h5>
            <p className="text-[11px] text-zinc-500 leading-normal mb-4">
              Presione el botón para simular que un desarrollador de Mando Central ha realizado mejoras y las ha desplegado en el servidor central. Esto enviará una señal en red multipunto para gatillar la actualización automática e interactiva de todos los terminales clientes.
            </p>
          </div>

          <button
            onClick={() => {
              if (sendWsMessage) {
                const nextVersion = appVersion === 'v2.4.0-CAD' ? 'v2.5.0-CAD' : 'v2.4.0-CAD';
                sendWsMessage('TRIGGER_SYSTEM_UPGRADE', {
                  nextVersion,
                  changelog: `Optimización del núcleo de fusión CFI. Se corrigieron retardos en cálculos geográficos con Hitos Fronterizos y se integró encriptación cuántica de baja firma en los enlaces LoRaWAN de los geófonos en terreno. Operación totalmente automatizada.`
                });
                setUpgradeNotice(`Despliegue de actualización a ${nextVersion} iniciado.`);
                setTimeout(() => setUpgradeNotice(null), 5000);
              } else {
                setUpgradeNotice('El canal de enlace no está inicializado o está en modo local.');
                setTimeout(() => setUpgradeNotice(null), 5000);
              }
            }}
            className="w-full py-3 px-4 rounded bg-[#3b82f6]/10 hover:bg-[#3b82f6]/20 border border-[#3b82f6]/40 text-[#3b82f6] font-mono font-bold text-xs uppercase tracking-wider transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Desplegar Mejoras ({appVersion === 'v2.4.0-CAD' ? 'v2.5.0-CAD' : 'v2.4.0-CAD'})</span>
          </button>

          {upgradeNotice && (
            <div className="mt-3 p-2 rounded bg-blue-950/40 border border-blue-500/30 text-[11px] font-mono text-blue-300 text-center animate-fade-in">
              {upgradeNotice}
            </div>
          )}
        </div>
      </div>

      {/* PUBLICACIÓN OFICIAL DE LA DOCTRINA DE LA PLATAFORMA (PII-LCC) */}
      <div className="mt-8 border-t border-zinc-900 pt-8" id="doctrinal-publication-section">
        <div className="relative bg-gradient-to-b from-[#0a0c10] to-[#040507] border border-zinc-900 rounded-2xl overflow-hidden shadow-2xl p-6 md:p-8">
          {/* Symmetrical grid pattern inside */}
          <div className="absolute inset-0 bg-[radial-gradient(rgba(212,175,55,0.015)_1.5px,transparent_1.5px)] bg-[size:24px_24px] pointer-events-none" />
          
          {/* Subtle gold accent border light */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#d4af37]/60 to-transparent" />
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            {/* Left side: Golden Emblem Medal (4 Columns) */}
            <div className="lg:col-span-4 flex flex-col items-center justify-center">
              <div className="relative p-6 bg-black/45 border border-zinc-900 rounded-2xl w-full max-w-[280px] flex flex-col items-center shadow-[inset_0_0_25px_rgba(212,175,55,0.03)]">
                {/* HUD corner brackets */}
                <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#d4af37]/45" />
                <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#d4af37]/45" />
                <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#d4af37]/45" />
                <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#d4af37]/45" />

                {/* Rotating/pulsating background circle */}
                <div className="absolute w-[190px] h-[190px] border border-[#d4af37]/10 border-dashed rounded-full animate-[spin_60s_linear_infinite]" />
                
                {/* Glowing emblem showcase */}
                <div className="relative flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-tr from-[#3b82f6]/10 via-transparent to-[#d4af37]/10 blur-[15px] rounded-full" />
                  <OfficialCrest size={220} className="relative z-10 animate-fade-in" />
                </div>
              </div>
            </div>

            {/* Right side: Doctrinal publication details (8 Columns) */}
            <div className="lg:col-span-8 text-left space-y-4">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 bg-[#d4af37]/5 border border-[#d4af37]/30 text-[#d4af37] px-2 py-0.5 rounded font-mono text-[9px] font-bold uppercase tracking-widest leading-none">
                  <Award className="w-3.5 h-3.5" />
                  <span>Publicación Doctrinal Oficial</span>
                </div>
                <h3 className="text-lg md:text-xl font-bold font-mono text-white tracking-tight uppercase leading-tight">
                  Escuela de Comando y Estado Mayor del Ejército
                </h3>
                <p className="text-xs text-[#3b82f6] font-mono tracking-widest uppercase font-bold">
                  PLATA-FORMA INTEGRADA DE INTELIGENCIA MILITAR // PII-LCC
                </p>
              </div>

              <div className="h-px bg-gradient-to-r from-zinc-900 via-zinc-800 to-transparent" />

              <p className="text-xs text-zinc-300 leading-relaxed font-sans max-w-2xl">
                La presente publicación formaliza doctrinalmente las especificaciones operativas, enlaces de adquisición e interfaces integradas de seguridad que componen la <strong>Plataforma Integrada de Inteligencia de la Línea de Control Clandestino (PII-LCC)</strong>. Diseñada y avalada por los ingenieros y estrategas de la Escuela de Comando y Estado Mayor, esta plataforma constituye la principal línea de defensa analítica digital frente al contrabando, flujos de infiltración de clanes delictivos y amenazas no convencionales en las zonas críticas de operaciones.
              </p>

              {/* Publication metadata grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 font-mono text-[10px]">
                <div className="bg-[#050505] border border-zinc-900 p-2.5 rounded">
                  <span className="text-[#666] uppercase block">CÓDIGO DE FICHA:</span>
                  <span className="text-white font-bold block mt-0.5">PUB-ECEME-2026-04</span>
                </div>
                <div className="bg-[#050505] border border-zinc-900 p-2.5 rounded">
                  <span className="text-[#666] uppercase block">FECHA DE EMISIÓN:</span>
                  <span className="text-white font-bold block mt-0.5">18 de Julio de 2026</span>
                </div>
                <div className="bg-[#050505] border border-zinc-900 p-2.5 rounded">
                  <span className="text-[#666] uppercase block">AUTORIDAD S-2:</span>
                  <span className="text-[#d4af37] font-bold block mt-0.5">ECEME COMMAND</span>
                </div>
                <div className="bg-[#050505] border border-zinc-900 p-2.5 rounded">
                  <span className="text-[#666] uppercase block">ESTADO DE SELLO:</span>
                  <span className="text-[#10b981] font-bold block mt-0.5 animate-pulse">● PUBLICACIÓN OK</span>
                </div>
              </div>

              {/* Digital stamp signature block */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-3 border-t border-zinc-900/60 font-mono text-[9px] text-zinc-500">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                  <span>Cifrado de Integridad: SHA-256 (ECEME-PIILLCC-PUBLIC-KEY-SIGN)</span>
                </div>
                <span className="text-zinc-600 bg-zinc-950 px-2 py-1 rounded border border-zinc-900 uppercase">
                  RESERVADO COMPARTIMENTADO // DOCTRINA ECEME 2026
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Styled interactive classes injected in stylesheet context */}
      <style>{`
        @keyframes dash-up {
          to {
            stroke-dashoffset: -40;
          }
        }
        @keyframes dash-down {
          to {
            stroke-dashoffset: 40;
          }
        }
        .animate-flow-line {
          filter: drop-shadow(0 0 1.5px rgba(249,115,22,0.6));
        }
      `}</style>
    </div>
  );
}
