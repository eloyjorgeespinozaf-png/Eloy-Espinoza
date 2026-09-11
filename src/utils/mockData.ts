/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RawAlert, Clan, ActionableIntel, AutomatedOrder, TacticalUnit, ChartDataPoint } from '../types';

export const initialClans: Clan[] = [
  {
    id: 'clan-1',
    name: 'Clan del Altiplano',
    knownRoutes: ['Ruta Colchane', 'Salar de Coipasa'],
    membersCount: 45,
    threatLevel: 'HIGH',
    tactics: 'Tránsito nocturno con convoyes de vehículos sin luces (chuteros) y uso de teléfonos satelitales.',
    recentHotspots: ['Coipasa Norte', 'Hito 12'],
    lastActive: 'Hace 2 horas'
  },
  {
    id: 'clan-2',
    name: 'Cártel de la Frontera Sur',
    knownRoutes: ['Hito 14', 'Ruta Ollagüe'],
    membersCount: 70,
    threatLevel: 'CRITICAL',
    tactics: 'Coerción a poblaciones fronterizas, uso de drones de reconocimiento y rutas alternativas de desvío.',
    recentHotspots: ['Paso Ollagüe', 'Hito 14'],
    lastActive: 'Hace 15 minutos'
  },
  {
    id: 'clan-3',
    name: 'Sindicato de Pisiga',
    knownRoutes: ['Paso Pisiga'],
    membersCount: 30,
    threatLevel: 'MEDIUM',
    tactics: 'Ocultamiento en camiones de carga comercial autorizados mediante doble fondo.',
    recentHotspots: ['Aduana Pisiga', 'Paso Clandestino 3B'],
    lastActive: 'Hace 1 día'
  },
  {
    id: 'clan-4',
    name: 'Los Chuteros del Desierto',
    knownRoutes: ['Ruta Ollagüe', 'Hito 14'],
    membersCount: 25,
    threatLevel: 'HIGH',
    tactics: 'Cruces a alta velocidad en camionetas 4x4 modificadas durante tormentas de polvo.',
    recentHotspots: ['Salar de Ollagüe'],
    lastActive: 'Hace 4 horas'
  },
  {
    id: 'clan-5',
    name: 'Frente de Tarapacá',
    knownRoutes: ['Salar de Coipasa', 'Ruta Colchane'],
    membersCount: 15,
    threatLevel: 'LOW',
    tactics: 'Contrabando hormiga mediante mochileros coordinados por frecuencias de radio UHF.',
    recentHotspots: ['Sectores de Pisiga Carpa'],
    lastActive: 'Hace 12 horas'
  }
];

export const initialRawAlerts: RawAlert[] = [
  {
    id: 'alert-1',
    timestamp: '2026-07-17T18:10:00Z',
    sourceType: 'IMINT',
    sourceName: 'VANT-02 Cóndor (Térmico Nocturno)',
    reliability: 'A',
    certainty: '1',
    details: 'Avistamiento térmico de 3 camiones pesados F-12 sin patentes circulando con luces apagadas fuera de ruta autorizada cerca del Hito 14.',
    coordinates: '19°14\'32"S 68°37\'15"W',
    status: 'PENDING',
    clandestineRouteId: 'Ruta Colchane',
    mediaUrl: 'multimedia-thermal',
    operatorName: 'Sgto. 1ro. Juan Pérez Vargas (Operador VANT)',
    originUnit: 'Escuadrilla de Reconocimiento Aéreo CEO-LCC // RI-22 Mejillones',
    originSector: 'Hito 14 - Frontera Chileno-Boliviana (Sector Quebrada)',
    transmissionChannel: 'Enlace Encriptado VANT-DL UHF 433 MHz // Red CAD-C2',
    emitterDeviceId: 'Terminal VANT-GCS-02 // Sensor FLIR Tau-2'
  },
  {
    id: 'alert-2',
    timestamp: '2026-07-17T17:45:00Z',
    sourceType: 'HUMINT',
    sourceName: 'Informante Código Águila',
    reliability: 'B',
    certainty: '2',
    details: 'Aviso de cargamento masivo de mercancías y electrónicos clandestinos saliendo desde almacén temporal del clan del Altiplano.',
    coordinates: '19°12\'05"S 68°36\'40"W',
    status: 'PROCESSED',
    clandestineRouteId: 'Salar de Coipasa',
    mediaUrl: 'multimedia-optical',
    operatorName: 'Agente de Campo HUMINT-09 (Agente de Inteligencia)',
    originUnit: 'Destacamento de Inteligencia Fronteriza Coipasa',
    originSector: 'Salar de Coipasa (Sector Challapata - Acceso Clandestino)',
    transmissionChannel: 'Mensajería Táctica Cifrada Satelital Iridium // Enlace S-2',
    emitterDeviceId: 'Handheld Táctico Rugged S2-TX-8821'
  },
  {
    id: 'alert-3',
    timestamp: '2026-07-17T16:30:00Z',
    sourceType: 'SIGINT',
    sourceName: 'Estación de Escucha Alfa (Radar Doppler)',
    reliability: 'A',
    certainty: '2',
    details: 'Interceptación de comunicaciones de radio UHF. Se coordinan coordenadas para el "cruce nocturno" en el Hito 14.',
    coordinates: '20°05\'44"S 68°29\'10"W',
    status: 'PENDING',
    clandestineRouteId: 'Hito 14',
    mediaUrl: 'multimedia-radar',
    operatorName: 'Suboficial Técnico M. Quiroga (Especialista Guerra Electrónica)',
    originUnit: 'Compañía de Comunicaciones y SIGINT Regimiento Pisiga',
    originSector: 'Puesto Avanzado Cerro Quimsachata (Elevación 4.120 msnm)',
    transmissionChannel: 'Canal VHF Táctico Encriptado CAD-C2 // Frecuencia 142.850 MHz',
    emitterDeviceId: 'Estación Fija SIGINT-ESM-Alfa // Antena Goniométrica'
  },
  {
    id: 'alert-4',
    timestamp: '2026-07-17T15:00:00Z',
    sourceType: 'HUMINT',
    sourceName: 'Patrullaje Local Terrestre',
    reliability: 'C',
    certainty: '3',
    details: 'Rastros frescos de neumáticos de gran calado en un paso no habilitado.',
    coordinates: '21°10\'12"S 68°15\'22"W',
    status: 'DISMISSED',
    clandestineRouteId: 'Ruta Ollagüe',
    mediaUrl: 'multimedia-satellite',
    operatorName: 'Tte. Carlos Montaño (Comandante Patrulla Delta-4)',
    originUnit: 'Patrulla de Reacción Inmediata CEO-LCC',
    originSector: 'Paso No Habilitado Ollagüe Sur',
    transmissionChannel: 'Radio VHF Motorola APX-8000 P25 Cifrado',
    emitterDeviceId: 'Terminal Móvil Vehicular CEO-M-04'
  }
];

export const initialActionableIntel: ActionableIntel[] = [
  {
    id: 'intel-1',
    rawAlertId: 'alert-2',
    title: 'Fusión Inteligencia: Convoy Clan del Altiplano en Salar de Coipasa',
    threatScore: 85,
    validatedBy: 'Tte. Coronel S. Rojas (CFI de Brigada)',
    targetClan: 'Clan del Altiplano',
    recommendedAction: 'Desplegar patrulla de intercepción táctica rápida para bloquear el cuello de botella en Paso Coipasa.',
    coordinates: '19°12\'05"S 68°36\'40"W',
    status: 'APPROVED',
    timestamp: '2026-07-17T18:15:00Z'
  }
];

export const initialOrders: AutomatedOrder[] = [
  {
    id: 'ooa-101',
    intelId: 'intel-1',
    codeName: 'OP_ESCUDO_NORTE',
    issuer: 'CEO-LCC Gral. J. Mendoza',
    assignedUnit: 'Patrulla Delta-3',
    objective: 'Establecer cerco táctico de intercepción e incautación de vehículos sospechosos en el Salar de Coipasa.',
    coordinates: '19°12\'05"S 68°36\'40"W',
    status: 'ISSUED',
    timestamp: '2026-07-17T18:20:00Z',
    updates: ['Orden emitida e inyectada al sistema central de telecomunicaciones de terreno desde CEO-LCC.'],
    mediaUrl: 'multimedia-thermal',
    rawAlertId: 'alert-1'
  }
];

export const initialTacticalUnits: TacticalUnit[] = [
  {
    id: 'unit-1',
    name: 'Patrulla Delta-3',
    status: 'PATROLLING',
    coordinates: '19°13\'10"S 68°35\'50"W',
    personnel: 8,
    lastReportTime: 'Hace 5 minutos',
    commander: 'CB1. F. Valenzuela',
    pin: '1234',
    frequency: '142.850 MHz (VHF-01 Encriptado)',
    sector: 'Salar de Coipasa - Hito XIX',
    equipment: ['Camioneta 4x4 Táctica', 'VANT-01 Cóndor', 'Visor Térmico FLIR', 'Radio VHF Harris'],
    battery: 94,
    fuel: 82,
    ammo: 100
  },
  {
    id: 'unit-2',
    name: 'Fuerza Especial Halcón',
    status: 'STATIONARY',
    coordinates: '20°06\'15"S 68°30\'05"W',
    personnel: 12,
    lastReportTime: 'Hace 12 minutos',
    commander: 'SGTO1. M. Quispe',
    pin: '2244',
    frequency: '143.100 MHz (VHF-02 Encriptado)',
    sector: 'Paso Pisiga - Hito XXIII',
    equipment: ['Camioneta Táctica Interceptora', 'Visor Nocturno Infrarrojo', 'Rifle de Precisión', 'Kit Brechero'],
    battery: 88,
    fuel: 75,
    ammo: 95
  },
  {
    id: 'unit-3',
    name: 'Patrulla Blindada Jaguar',
    status: 'INTERCEPTING',
    coordinates: '20°05\'44"S 68°29\'10"W',
    personnel: 10,
    lastReportTime: 'Hace 1 minuto',
    commander: 'SOF. R. Mamani',
    pin: '3310',
    frequency: '141.950 MHz (VHF-03 Encriptado)',
    sector: 'Ruta Colchane - Quebrada Norte',
    equipment: ['Vehículo Blindado Ligero', 'Sensor Radar Terrestre', 'Dron VANT-02', 'Lanzador Fumígenos'],
    battery: 98,
    fuel: 90,
    ammo: 100
  }
];

export const initialChartData: ChartDataPoint[] = [
  { id: '1', label: 'Ruta Colchane', value: 85, color: '#10b981' }, // Emerald / Green (Sistemas)
  { id: '2', label: 'Paso Pisiga', value: 45, color: '#f97316' },  // Orange (Procesamiento)
  { id: '3', label: 'Hito 14', value: 95, color: '#3b82f6' },      // Blue (Comando Estratégico)
  { id: '4', label: 'Salar de Coipasa', value: 65, color: '#e11d48' }, // Crimson Alert
  { id: '5', label: 'Ruta Ollagüe', value: 30, color: '#eab308' }  // Tactical Yellow
];
