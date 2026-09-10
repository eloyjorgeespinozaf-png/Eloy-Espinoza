/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type MilitaryRole = 'ROL_BUSQUEDA' | 'ROL_FUSION' | 'ROL_CEO' | 'ROL_TERRENO' | 'ROL_PATRULLA';

export interface User {
  id: string;
  role: MilitaryRole;
  name: string;
  signature: string;
  username?: string;
  rank?: string;
  organName?: string;
  organSubtitle?: string;
  clearanceLevel?: number;
  stationId?: string;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  role: MilitaryRole;
  action: string;
  timestamp: string;
  coordinates: string;
}

export interface RawAlert {
  id: string;
  timestamp: string;
  sourceType: 'IMINT' | 'HUMINT' | 'SIGINT';
  sourceName: string;
  reliability: 'A' | 'B' | 'C' | 'D'; // Source reliability
  certainty: '1' | '2' | '3' | '4';    // Information certainty
  details: string;
  coordinates: string;
  status: 'PENDING' | 'PROCESSED' | 'DISMISSED';
  clandestineRouteId?: string;
  mediaUrl?: string;
  expedienteId?: string;
  // Campos Doctrinales de Procedencia (Quién y De Dónde provino la información)
  operatorName?: string;         // QUIÉN: Nombre, grado y función del operador de búsqueda
  originUnit?: string;           // QUIÉN: Unidad militar u orgánica emisora
  originSector?: string;         // DE DÓNDE: Sector, hito o paraje fronterizo de origen
  transmissionChannel?: string;  // DE DÓNDE: Canal, frecuencia y red de transmisión táctica
  emitterDeviceId?: string;      // DE DÓNDE: ID del sensor o dispositivo terminal emisor
}

export interface G2RegistryRecord {
  id: string;
  fechaHoraIngreso: string;
  tipoRegistro: 'GRAFICO' | 'LITERAL' | 'NUMERICO' | 'AUDIO';
  componenteRubro: 'OTRO' | 'POLITICO' | 'ECONOMICO' | 'MILITAR' | 'PSICOSOCIAL';
  clasificacionSeguridad: 'CONFIDENCIAL' | 'SECRETO' | 'RESERVADO';
  contenidoDetallado: string;
  referenciasAntecedentes?: string[];
  unidadReceptora: string;
  operadorRegistro: string;
  observacionesAdicionales?: string;
  archivoAdjunto?: {
    nombre: string;
    tipo: string;
    tamano: number;
    base64Data: string;
    fechaCarga: string;
  };
  especificoGrafico?: {
    subtipoElemento: string;
    ubicacionReferenciaDigital: string;
    archivoAdjunto?: {
      nombre: string;
      tipo: string;
      tamano: number;
      base64Data: string;
      fechaCarga: string;
    };
    escalaCoordenadas: string;
    fechaCapturaGrafica: string;
    interpretacionVisualPreliminar: string;
    tipoSoporte: string;
    identificadorHojaPliego: string;
    escala: string;
    coordenadasCuadricula: string;
    metadatosSensorFecha: string;
    orientacionNorte: string;
  };
  especificoLiteral?: {
    subtipoSoporte: string;
    extractoPalabrasClave: string;
    canalTransmision: string;
    documentoOrigenReferencia: string;
  };
  estadoRegistro: 'Evaluado' | 'Pendiente' | 'Procesado';
  createdAt: number;
  updatedAt: number;
  calificacionEvaluacion: string;
  evaluacion?: {
    pertinencia: {
      componenteDestino: string;
      nivelUrgencia: string;
    };
    confiabilidad: {
      escala: string;
      evaluarPorSeparado?: boolean;
      evaluacionFuente?: string;
      evaluacionMedio?: string;
    };
    exactitud: {
      escala: string;
    };
    codigoAlfanumerico: string;
    analistaEvaluador: string;
    fechaHoraEvaluacion: string;
    observacionesEvaluacion?: string;
    ideasFuerza: string[];
  };
}

export interface Clan {
  id: string;
  name: string;
  knownRoutes: string[];
  membersCount: number;
  threatLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  tactics: string;
  recentHotspots: string[];
  lastActive: string;
}

export interface ActionableIntel {
  id: string;
  rawAlertId: string;
  title: string;
  threatScore: number; // 0 to 100
  validatedBy: string; // CFI Analyst
  targetClan: string;
  recommendedAction: string;
  coordinates: string;
  status: 'DRAFT' | 'APPROVED' | 'ORDER_ISSUED';
  timestamp: string;
  mediaUrl?: string;
}

export interface AutomatedOrder {
  id: string;
  intelId: string;
  codeName: string; // e.g., "Operación Cóndor"
  issuer: string; // CEO-LCC
  assignedUnit: string;
  objective: string;
  coordinates: string;
  status: 'ISSUED' | 'RECEIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  timestamp: string;
  updates: string[];
  rawAlertId?: string;
  mediaUrl?: string;
}

export interface TacticalUnit {
  id: string;
  name: string;
  status: 'PATROLLING' | 'INTERCEPTING' | 'STATIONARY' | 'OFFLINE';
  coordinates: string;
  personnel: number;
  lastReportTime: string;
}

export interface ChartDataPoint {
  id: string;
  label: string;
  value: number;
  color: string;
}

export type ChartType = 'BAR' | 'LINE' | 'AREA' | 'SCATTER' | 'MAP';
