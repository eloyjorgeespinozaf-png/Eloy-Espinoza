/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type MilitaryRole = 'ROL_PATRULLA' | 'ROL_FUSION' | 'ROL_CEO';

export interface User {
  id: string;
  role: 'ROL_PATRULLA' | 'ROL_FUSION' | 'ROL_CEO';
  name: string;
  signature: string;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  role: 'ROL_PATRULLA' | 'ROL_FUSION' | 'ROL_CEO';
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
