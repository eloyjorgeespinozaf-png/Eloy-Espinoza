/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  Clan, 
  RawAlert, 
  ActionableIntel, 
  AutomatedOrder, 
  TacticalUnit, 
  G2RegistryRecord, 
  User, 
  AuditLogEntry 
} from '../types';

// Safe Environment Variable Access (works in Vite client and Node server/scripts)
const getEnv = (key: string, fallback: string): string => {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) {
      return (import.meta as any).env[key];
    }
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key]!;
    }
  } catch {
    // fallback
  }
  return fallback;
};

// Safe Supabase Base URL normalizer
const rawSupabaseUrl = getEnv('VITE_SUPABASE_URL', 'https://uapjebdcioptahguruyq.supabase.co');
const baseSupabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

// Supabase Configuration from Environment or Explicit User Credentials
export const SUPABASE_CONFIG = {
  projectId: getEnv('VITE_SUPABASE_PROJECT_ID', 'uapjebdcioptahguruyq'),
  url: baseSupabaseUrl,
  restApiUrl: `${baseSupabaseUrl}/rest/v1/`,
  publishableKey: getEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_VSRNCnfJrVYWYNg2Gh_RbQ_Hynp-wlw'),
  anonKey: getEnv('VITE_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhcGplYmRjaW9wdGFoZ3VydXlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyMjQ3OTgsImV4cCI6MjEwNDgwMDc5OH0.aTFlRmrGecFTlkEDIZywl5IaHltEz-6-t57872bF6iQ')
};

// Initialize Supabase Client
export const supabase: SupabaseClient = createClient(
  SUPABASE_CONFIG.url,
  SUPABASE_CONFIG.anonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false
    }
  }
);

export interface SupabaseHealthStatus {
  ok: boolean;
  status: 'CONNECTED' | 'PARTIAL' | 'ERROR' | 'TABLES_PENDING';
  latencyMs: number;
  projectId: string;
  authApiOk: boolean;
  message: string;
  tablesStatus: Record<string, boolean>;
  timestamp: string;
}

/**
 * Pings Supabase to verify active connectivity and measure round-trip latency
 */
export async function testSupabaseConnection(): Promise<SupabaseHealthStatus> {
  const startTime = performance.now();
  const timestamp = new Date().toISOString();

  try {
    // 1. Test Auth Gateway Health (GoTrue settings endpoint)
    let authApiOk = false;
    try {
      const healthResp = await fetch(`${SUPABASE_CONFIG.url}/auth/v1/settings`, {
        headers: {
          'apikey': SUPABASE_CONFIG.anonKey,
          'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`
        }
      });
      authApiOk = healthResp.ok;
    } catch {
      authApiOk = false;
    }
    
    const latencyMs = Math.round(performance.now() - startTime);

    // 2. Test Tables Availability
    const tables = ['clans', 'raw_alerts', 'expedientes', 'actionable_intel', 'automated_orders', 'tactical_units', 'system_users', 'system_backups'];
    const tablesStatus: Record<string, boolean> = {};
    let anyTableFound = false;

    for (const tbl of tables) {
      try {
        const { error } = await supabase.from(tbl).select('*', { count: 'exact', head: true });
        if (!error) {
          tablesStatus[tbl] = true;
          anyTableFound = true;
        } else if (error.code === 'PGRST205' || error.message.includes('Could not find')) {
          tablesStatus[tbl] = false; // Schema table not yet created
        } else {
          tablesStatus[tbl] = true; // Table exists
          anyTableFound = true;
        }
      } catch {
        tablesStatus[tbl] = false;
      }
    }

    const isConnected = authApiOk || anyTableFound;

    if (isConnected) {
      return {
        ok: true,
        status: anyTableFound ? 'CONNECTED' : 'TABLES_PENDING',
        latencyMs,
        projectId: SUPABASE_CONFIG.projectId,
        authApiOk: true,
        message: anyTableFound 
          ? `Enlace activo con Supabase Cloud (${SUPABASE_CONFIG.projectId}). Tablas operativas.`
          : `Conectado con éxito a Supabase Cloud (${SUPABASE_CONFIG.projectId}). Tablas pendientes en el esquema.`,
        tablesStatus,
        timestamp
      };
    } else {
      return {
        ok: false,
        status: 'ERROR',
        latencyMs,
        projectId: SUPABASE_CONFIG.projectId,
        authApiOk: false,
        message: `Fallo al verificar el estado de Supabase Cloud.`,
        tablesStatus,
        timestamp
      };
    }
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - startTime);
    return {
      ok: false,
      status: 'ERROR',
      latencyMs,
      projectId: SUPABASE_CONFIG.projectId,
      authApiOk: false,
      message: `Error de red al conectar con Supabase: ${err.message || 'Sin respuesta'}`,
      tablesStatus: {},
      timestamp
    };
  }
}

export interface UnifiedPiiDataPayload {
  clans: Clan[];
  rawAlerts: RawAlert[];
  actionableIntel: ActionableIntel[];
  activeOrders: AutomatedOrder[];
  tacticalUnits: TacticalUnit[];
  expedientes: G2RegistryRecord[];
  users?: User[];
  auditLogs?: AuditLogEntry[];
}

export interface SupabaseSyncResult {
  success: boolean;
  tablesSynced: string[];
  tablesFailed: { table: string; reason: string }[];
  backupId?: string;
  timestamp: string;
  totalEntities: number;
}

/**
 * Synchronizes full operational state into Supabase:
 * 1. Inserts a consolidated snapshot into `system_backups`
 * 2. Tries upserting individual records into specific relational tables
 */
export async function syncAllDataToSupabase(
  payload: UnifiedPiiDataPayload,
  operatorName: string = 'CEO-LCC MANDO'
): Promise<SupabaseSyncResult> {
  const timestamp = new Date().toISOString();
  const tablesSynced: string[] = [];
  const tablesFailed: { table: string; reason: string }[] = [];
  
  const totalEntities = 
    payload.clans.length +
    payload.rawAlerts.length +
    payload.actionableIntel.length +
    payload.activeOrders.length +
    payload.tacticalUnits.length +
    payload.expedientes.length +
    (payload.users?.length || 0);

  // A. Try saving snapshot into `system_backups`
  const backupRecord = {
    id: `BACKUP-SUPABASE-${Date.now()}`,
    backup_name: `Respaldo Doctrinal PII-LCC - ${new Date().toLocaleString()}`,
    created_at: timestamp,
    created_by: operatorName,
    total_records: totalEntities,
    payload: payload
  };

  try {
    const { error } = await supabase.from('system_backups').insert([backupRecord]);
    if (!error) {
      tablesSynced.push('system_backups (Snapshot Completo)');
    } else {
      tablesFailed.push({ table: 'system_backups', reason: error.message });
    }
  } catch (err: any) {
    tablesFailed.push({ table: 'system_backups', reason: err.message });
  }

  // B. Try syncing individual Clans
  if (payload.clans.length > 0) {
    try {
      const clanRows = payload.clans.map(c => ({
        id: c.id,
        name: c.name,
        threat_level: c.threatLevel,
        members_count: c.membersCount,
        routes: c.knownRoutes || [],
        hotspots: c.recentHotspots || [],
        tactics: c.tactics || '',
        last_active: c.lastActive,
        phone_numbers: c.phoneNumbers || c.interceptedPhones || [],
        radio_frequencies: c.radioFrequencies || c.interceptedFrequencies || [],
        vehicles: c.vehicles || [],
        key_leaders: c.keyLeaders || [],
        seizures: c.seizures || [],
        notes: c.notes || '',
        metadata: { ...c },
        updated_at: timestamp
      }));
      const { error } = await supabase.from('clans').upsert(clanRows, { onConflict: 'id' });
      if (!error) {
        tablesSynced.push(`clans (${clanRows.length} registros)`);
      } else {
        tablesFailed.push({ table: 'clans', reason: error.message });
      }
    } catch (err: any) {
      tablesFailed.push({ table: 'clans', reason: err.message });
    }
  }

  // C. Try syncing Raw Alerts
  if (payload.rawAlerts.length > 0) {
    try {
      const alertRows = payload.rawAlerts.map(a => ({
        id: a.id,
        type: a.sourceType,
        title: a.sourceName,
        description: a.details || '',
        coordinates: a.coordinates,
        timestamp: a.timestamp,
        status: a.status,
        priority: `${a.reliability}${a.certainty}`,
        source_sensor: a.operatorName || a.originUnit || a.originSector || '',
        media_url: a.mediaUrl || null,
        audio_url: null,
        metadata: { ...a }
      }));
      const { error } = await supabase.from('raw_alerts').upsert(alertRows, { onConflict: 'id' });
      if (!error) {
        tablesSynced.push(`raw_alerts (${alertRows.length} alertas)`);
      } else {
        tablesFailed.push({ table: 'raw_alerts', reason: error.message });
      }
    } catch (err: any) {
      tablesFailed.push({ table: 'raw_alerts', reason: err.message });
    }
  }

  // D. Try syncing Expedientes G-2
  if (payload.expedientes.length > 0) {
    try {
      const expRows = payload.expedientes.map(e => ({
        id: e.id,
        code: e.id,
        title: e.contenidoDetallado ? e.contenidoDetallado.slice(0, 60) : e.id,
        clan_id: null,
        classification: e.clasificacionSeguridad || 'SECRETO',
        status: e.estadoRegistro || 'Pendiente',
        created_at: new Date(e.createdAt || Date.now()).toISOString(),
        updated_at: new Date(e.updatedAt || Date.now()).toISOString(),
        analyst_id: e.operadorRegistro || 'G-2',
        content: e
      }));
      const { error } = await supabase.from('expedientes').upsert(expRows, { onConflict: 'id' });
      if (!error) {
        tablesSynced.push(`expedientes (${expRows.length} expedientes)`);
      } else {
        tablesFailed.push({ table: 'expedientes', reason: error.message });
      }
    } catch (err: any) {
      tablesFailed.push({ table: 'expedientes', reason: err.message });
    }
  }

  // E. Try syncing Actionable Intel
  if (payload.actionableIntel.length > 0) {
    try {
      const intelRows = payload.actionableIntel.map(i => ({
        id: i.id,
        title: i.title,
        description: i.recommendedAction || '',
        clan_name: i.targetClan,
        threat_level: String(i.threatScore),
        coordinates: i.coordinates,
        confidence_score: i.threatScore,
        validated_by: i.validatedBy,
        timestamp: i.timestamp,
        action_recommended: i.recommendedAction || '',
        source: i.rawAlertId,
        metadata: { ...i }
      }));
      const { error } = await supabase.from('actionable_intel').upsert(intelRows, { onConflict: 'id' });
      if (!error) {
        tablesSynced.push(`actionable_intel (${intelRows.length} registros)`);
      } else {
        tablesFailed.push({ table: 'actionable_intel', reason: error.message });
      }
    } catch (err: any) {
      tablesFailed.push({ table: 'actionable_intel', reason: err.message });
    }
  }

  // F. Try syncing Tactical Units
  if (payload.tacticalUnits.length > 0) {
    try {
      const unitRows = payload.tacticalUnits.map(u => ({
        id: u.id,
        name: u.name,
        status: u.status,
        coordinates: u.coordinates,
        battery: u.battery || 100,
        comm_status: u.frequency || 'OPTIMO',
        assigned_mission: u.sector || '',
        last_report_at: u.lastReportTime,
        metadata: { ...u }
      }));
      const { error } = await supabase.from('tactical_units').upsert(unitRows, { onConflict: 'id' });
      if (!error) {
        tablesSynced.push(`tactical_units (${unitRows.length} unidades)`);
      } else {
        tablesFailed.push({ table: 'tactical_units', reason: error.message });
      }
    } catch (err: any) {
      tablesFailed.push({ table: 'tactical_units', reason: err.message });
    }
  }

  // G. Try syncing Automated Orders (OOA)
  if (payload.activeOrders && payload.activeOrders.length > 0) {
    try {
      const orderRows = payload.activeOrders.map(o => ({
        id: o.id,
        intel_id: o.intelId || null,
        patrol_target: o.assignedUnit || 'Patrulla',
        objective: o.objective,
        mission_type: o.codeName || 'TACTICA',
        urgency: 'ALTA',
        status: o.status,
        issued_at: o.timestamp,
        signature: o.issuer || 'CEO-LCC',
        coordinates: o.coordinates,
        metadata: { ...o }
      }));
      const { error } = await supabase.from('automated_orders').upsert(orderRows, { onConflict: 'id' });
      if (!error) {
        tablesSynced.push(`automated_orders (${orderRows.length} órdenes)`);
      } else {
        tablesFailed.push({ table: 'automated_orders', reason: error.message });
      }
    } catch (err: any) {
      tablesFailed.push({ table: 'automated_orders', reason: err.message });
    }
  }

  // H. Try syncing System Users
  if (payload.users && payload.users.length > 0) {
    try {
      const userRows = payload.users.map(u => ({
        id: u.id,
        username: u.username,
        name: u.name,
        role: u.role,
        phone_number: u.phoneNumber || null,
        rank: u.rank || null,
        organ_name: u.organName || null,
        station_id: u.stationId || null,
        is_admin: Boolean(u.isAdmin),
        status: u.status || 'ACTIVO',
        created_at: u.createdAt || timestamp
      }));
      const { error } = await supabase.from('system_users').upsert(userRows, { onConflict: 'id' });
      if (!error) {
        tablesSynced.push(`system_users (${userRows.length} operadores)`);
      } else {
        tablesFailed.push({ table: 'system_users', reason: error.message });
      }
    } catch (err: any) {
      tablesFailed.push({ table: 'system_users', reason: err.message });
    }
  }

  return {
    success: tablesSynced.length > 0,
    tablesSynced,
    tablesFailed,
    backupId: backupRecord.id,
    timestamp,
    totalEntities
  };
}

/**
 * Downloads latest available backup or entity records from Supabase
 */
export async function fetchLatestSupabaseData(): Promise<{
  data: Partial<UnifiedPiiDataPayload> | null;
  source: 'BACKUP_RECORD' | 'RELATIONAL_TABLES' | null;
  error?: string;
}> {
  try {
    // 1. Try fetching latest backup snapshot
    const { data: backups, error: backupError } = await supabase
      .from('system_backups')
      .select('payload, created_at')
      .order('created_at', { ascending: false })
      .limit(1);

    if (!backupError && backups && backups.length > 0 && backups[0].payload) {
      return {
        data: backups[0].payload as UnifiedPiiDataPayload,
        source: 'BACKUP_RECORD'
      };
    }

    // 2. Otherwise try reading from relational tables directly
    const { data: clans } = await supabase.from('clans').select('*');
    const { data: rawAlerts } = await supabase.from('raw_alerts').select('*');
    const { data: expedientes } = await supabase.from('expedientes').select('*');
    const { data: actionableIntel } = await supabase.from('actionable_intel').select('*');
    const { data: tacticalUnits } = await supabase.from('tactical_units').select('*');
    const { data: automatedOrders } = await supabase.from('automated_orders').select('*');

    if (clans || rawAlerts || expedientes || actionableIntel || tacticalUnits || automatedOrders) {
      const restoredClans: Clan[] = (clans || []).map(c => {
        if (c.metadata && typeof c.metadata === 'object') {
          return c.metadata as Clan;
        }
        return {
          id: c.id,
          name: c.name,
          threatLevel: c.threat_level || 'MEDIUM',
          membersCount: Number(c.members_count) || 0,
          knownRoutes: c.routes || [],
          recentHotspots: c.hotspots || [],
          tactics: typeof c.tactics === 'string' ? c.tactics : (Array.isArray(c.tactics) ? c.tactics.join(', ') : ''),
          lastActive: c.last_active || 'Hoy',
          phoneNumbers: c.phone_numbers || [],
          interceptedPhones: c.phone_numbers || [],
          radioFrequencies: c.radio_frequencies || [],
          interceptedFrequencies: c.radio_frequencies || [],
          vehicles: c.vehicles || [],
          keyLeaders: c.key_leaders || [],
          seizures: c.seizures || [],
          notes: c.notes || ''
        };
      });

      const restoredAlerts: RawAlert[] = (rawAlerts || []).map(a => {
        if (a.metadata && typeof a.metadata === 'object') {
          return a.metadata as RawAlert;
        }
        return {
          id: a.id,
          timestamp: a.timestamp || new Date().toISOString(),
          sourceType: (a.type as any) || 'HUMINT',
          sourceName: a.title || 'Alerta S-2',
          reliability: 'B',
          certainty: '2',
          details: a.description || '',
          coordinates: a.coordinates || '-18.4783, -70.3126',
          status: a.status || 'PENDING',
          mediaUrl: a.media_url
        };
      });

      const restoredExpedientes: G2RegistryRecord[] = (expedientes || []).map(e => e.content || {
        id: e.id,
        fechaHoraIngreso: e.created_at || new Date().toISOString(),
        tipoRegistro: 'LITERAL',
        componenteRubro: 'MILITAR',
        clasificacionSeguridad: e.classification || 'SECRETO',
        contenidoDetallado: e.title || '',
        unidadReceptora: 'CFI-LCC',
        operadorRegistro: e.analyst_id || 'G-2',
        estadoRegistro: e.status || 'Pendiente',
        createdAt: new Date(e.created_at || Date.now()).getTime(),
        updatedAt: new Date(e.updated_at || Date.now()).getTime(),
        calificacionEvaluacion: 'B-2'
      });

      const restoredIntel: ActionableIntel[] = (actionableIntel || []).map(i => {
        if (i.metadata && typeof i.metadata === 'object') {
          return i.metadata as ActionableIntel;
        }
        return {
          id: i.id,
          rawAlertId: i.source || '',
          title: i.title,
          threatScore: Number(i.confidence_score) || 85,
          validatedBy: i.validated_by || 'CFI',
          targetClan: i.clan_name || 'Desconocido',
          recommendedAction: i.action_recommended || i.description || '',
          coordinates: i.coordinates || '-18.4783, -70.3126',
          status: 'APPROVED',
          timestamp: i.timestamp || new Date().toISOString()
        };
      });

      const restoredUnits: TacticalUnit[] = (tacticalUnits || []).map(u => {
        if (u.metadata && typeof u.metadata === 'object') {
          return u.metadata as TacticalUnit;
        }
        return {
          id: u.id,
          name: u.name,
          status: u.status || 'PATROLLING',
          coordinates: u.coordinates || '-18.4783, -70.3126',
          personnel: 4,
          lastReportTime: u.last_report_at || new Date().toISOString(),
          battery: u.battery || 100
        };
      });

      const restoredOrders: AutomatedOrder[] = (automatedOrders || []).map(o => {
        if (o.metadata && typeof o.metadata === 'object') {
          return o.metadata as AutomatedOrder;
        }
        return {
          id: o.id,
          intelId: o.intel_id || '',
          codeName: o.mission_type || 'Operación Táctica',
          issuer: o.signature || 'CEO-LCC',
          assignedUnit: o.patrol_target || 'Patrulla Alpha',
          objective: o.objective || 'Misión táctica',
          coordinates: o.coordinates || '-18.4783, -70.3126',
          status: (o.status as any) || 'ISSUED',
          timestamp: o.issued_at || new Date().toISOString(),
          updates: []
        };
      });

      return {
        data: {
          clans: restoredClans,
          rawAlerts: restoredAlerts,
          expedientes: restoredExpedientes,
          actionableIntel: restoredIntel,
          tacticalUnits: restoredUnits,
          activeOrders: restoredOrders
        },
        source: 'RELATIONAL_TABLES'
      };
    }

    return {
      data: null,
      source: null,
      error: 'No se encontraron registros almacenados en Supabase.'
    };
  } catch (err: any) {
    return {
      data: null,
      source: null,
      error: err.message
    };
  }
}

/**
 * SQL Schema Script ready to execute in the Supabase SQL Editor
 */
export const SUPABASE_SQL_SCHEMA = `-- =========================================================================
-- ESQUEMA DE BASE DE DATOS SUPABASE PARA PLATAFORMA INTEGRAL DE INTELIGENCIA
-- PROYECTO SUPABASE ID: ${SUPABASE_CONFIG.projectId}
-- =========================================================================

-- 1. TABLA: CLANES DELICTIVOS Y VECTORES DE INTELIGENCIA
CREATE TABLE IF NOT EXISTS public.clans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  threat_level TEXT NOT NULL,
  members_count INT DEFAULT 0,
  routes TEXT[] DEFAULT '{}',
  hotspots TEXT[] DEFAULT '{}',
  tactics TEXT DEFAULT '',
  last_active TEXT,
  phone_numbers TEXT[] DEFAULT '{}',
  radio_frequencies TEXT[] DEFAULT '{}',
  vehicles TEXT[] DEFAULT '{}',
  key_leaders TEXT[] DEFAULT '{}',
  seizures TEXT[] DEFAULT '{}',
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA: ALERTAS CRUDAS DE SENSORES (S-2)
CREATE TABLE IF NOT EXISTS public.raw_alerts (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  coordinates TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'PENDING',
  priority TEXT DEFAULT 'HIGH',
  source_sensor TEXT,
  media_url TEXT,
  audio_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 3. TABLA: EXPEDIENTES G-2
CREATE TABLE IF NOT EXISTS public.expedientes (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  clan_id TEXT,
  classification TEXT DEFAULT 'SECRETO',
  status TEXT DEFAULT 'ABIERTO',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  analyst_id TEXT,
  content JSONB DEFAULT '{}'::jsonb
);

-- 4. TABLA: INTELIGENCIA ACCIONABLE VALIDADA (CFI)
CREATE TABLE IF NOT EXISTS public.actionable_intel (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  clan_name TEXT,
  threat_level TEXT,
  coordinates TEXT,
  confidence_score NUMERIC,
  validated_by TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  action_recommended TEXT,
  source TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 5. TABLA: ÓRDENES TÁCTICAS OPERATIVAS (OOA)
CREATE TABLE IF NOT EXISTS public.automated_orders (
  id TEXT PRIMARY KEY,
  intel_id TEXT,
  patrol_target TEXT,
  objective TEXT NOT NULL,
  mission_type TEXT NOT NULL,
  urgency TEXT DEFAULT 'ALTA',
  status TEXT DEFAULT 'EN_CURSO',
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  signature TEXT,
  coordinates TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 6. TABLA: UNIDADES TÁCTICAS EN TERRENO (PATRULLAS)
CREATE TABLE IF NOT EXISTS public.tactical_units (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'EN_PATRULLAJE',
  coordinates TEXT,
  battery INT DEFAULT 100,
  comm_status TEXT DEFAULT 'OPTIMO',
  assigned_mission TEXT,
  last_report_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 7. TABLA: OPERADORES Y CLAVES MILITARES
CREATE TABLE IF NOT EXISTS public.system_users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  phone_number TEXT,
  rank TEXT,
  organ_name TEXT,
  station_id TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'ACTIVO',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABLA: RESPALDOS DOCTRINALES COMPLETOS (SNAPSHOTS)
CREATE TABLE IF NOT EXISTS public.system_backups (
  id TEXT PRIMARY KEY,
  backup_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  total_records INT DEFAULT 0,
  payload JSONB NOT NULL
);

-- HABILITACIÓN DE SEGURIDAD POR FILAS (RLS)
ALTER TABLE public.clans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expedientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actionable_intel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automated_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tactical_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_backups ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS PERMISIVAS PARA ACCESO ANÓNIMO / OPERACIONAL PII-LCC
DO $$
BEGIN
  DROP POLICY IF EXISTS "Anon policy clans" ON public.clans;
  CREATE POLICY "Anon policy clans" ON public.clans FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Anon policy raw_alerts" ON public.raw_alerts;
  CREATE POLICY "Anon policy raw_alerts" ON public.raw_alerts FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Anon policy expedientes" ON public.expedientes;
  CREATE POLICY "Anon policy expedientes" ON public.expedientes FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Anon policy actionable_intel" ON public.actionable_intel;
  CREATE POLICY "Anon policy actionable_intel" ON public.actionable_intel FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Anon policy automated_orders" ON public.automated_orders;
  CREATE POLICY "Anon policy automated_orders" ON public.automated_orders FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Anon policy tactical_units" ON public.tactical_units;
  CREATE POLICY "Anon policy tactical_units" ON public.tactical_units FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Anon policy system_users" ON public.system_users;
  CREATE POLICY "Anon policy system_users" ON public.system_users FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Anon policy system_backups" ON public.system_backups;
  CREATE POLICY "Anon policy system_backups" ON public.system_backups FOR ALL USING (true) WITH CHECK (true);
END $$;
`;
