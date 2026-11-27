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

/**
 * Safely normalizes any timestamp value (ISO string, epoch ms, Date, or localized text like "Hace un momento")
 * into a valid PostgreSQL TIMESTAMPTZ ISO-8601 string.
 */
export function toSafeIsoTimestamp(value?: string | number | Date | null): string {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? new Date().toISOString() : value.toISOString();
  }
  if (typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
  const str = String(value).trim();
  if (!str) return new Date().toISOString();
  // Reject localized relative strings ("Hace un momento", "Hace 5 minutos", "Hoy", etc.)
  if (/^(hace|hoy|ayer|ahora|reciente|sin)/i.test(str)) {
    return new Date().toISOString();
  }
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 2000 && parsed.getFullYear() <= 2100) {
    return parsed.toISOString();
  }
  return new Date().toISOString();
}

/**
 * Normalizes a TacticalUnit into a Supabase `tactical_units` row with valid TIMESTAMPTZ
 */
export function mapTacticalUnitToSupabaseRow(u: TacticalUnit) {
  const safeIso = toSafeIsoTimestamp(u.lastReportTime);
  const safeCreatedAt = toSafeIsoTimestamp(u.createdAt);
  const normalizedUnit: TacticalUnit = {
    ...u,
    id: u.id || `unit-${Date.now()}`,
    name: (u.name || 'Patrulla Táctica').trim(),
    status: u.status || 'PATROLLING',
    coordinates: (u.coordinates || '19°13\'10"S 68°35\'50"W').trim(),
    personnel: Number(u.personnel) || 6,
    battery: Number.isFinite(Number(u.battery)) ? Number(u.battery) : 100,
    fuel: Number.isFinite(Number(u.fuel)) ? Number(u.fuel) : 90,
    ammo: Number.isFinite(Number(u.ammo)) ? Number(u.ammo) : 100,
    lastReportTime: safeIso,
    createdAt: safeCreatedAt
  };
  return {
    id: normalizedUnit.id,
    name: normalizedUnit.name,
    status: normalizedUnit.status,
    coordinates: normalizedUnit.coordinates,
    battery: normalizedUnit.battery ?? 100,
    comm_status: normalizedUnit.frequency || '142.850 MHz',
    assigned_mission: normalizedUnit.sector || '',
    last_report_at: safeIso,
    metadata: normalizedUnit
  };
}

/**
 * Reconstructs a TacticalUnit from a Supabase `tactical_units` row
 */
export function mapSupabaseRowToTacticalUnit(row: any): TacticalUnit {
  const meta = row?.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  return {
    ...meta,
    id: row.id || meta.id,
    name: row.name || meta.name || 'Patrulla Táctica',
    status: (row.status || meta.status || 'PATROLLING') as TacticalUnit['status'],
    coordinates: row.coordinates || meta.coordinates || '19°13\'10"S 68°35\'50"W',
    personnel: Number(meta.personnel) || 6,
    commander: meta.commander || 'Comandante S-2',
    sector: row.assigned_mission || meta.sector || 'Sector Fronterizo',
    frequency: row.comm_status || meta.frequency || '142.850 MHz',
    pin: meta.pin || '1234',
    equipment: Array.isArray(meta.equipment) ? meta.equipment : ['Camioneta 4x4 Táctica', 'Radio VHF Harris'],
    battery: Number.isFinite(Number(row.battery)) ? Number(row.battery) : (meta.battery ?? 100),
    fuel: Number.isFinite(Number(meta.fuel)) ? Number(meta.fuel) : 90,
    ammo: Number.isFinite(Number(meta.ammo)) ? Number(meta.ammo) : 100,
    notes: meta.notes || '',
    lastReportTime: row.last_report_at || meta.lastReportTime || new Date().toISOString(),
    createdAt: meta.createdAt || row.last_report_at || new Date().toISOString()
  };
}

/**
 * Normalizes a User into a Supabase `system_users` row
 */
export function mapUserToSupabaseRow(u: User) {
  const cleanUsername = (u.username || u.name || u.id || `op.${Date.now()}`)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '.');
  return {
    id: u.id,
    username: cleanUsername,
    name: (u.name || cleanUsername).trim(),
    role: u.role || 'ROL_BUSQUEDA',
    phone_number: (u.phoneNumber || u.cellphone || '').trim() || null,
    rank: u.rank || null,
    organ_name: u.organName || null,
    station_id: u.stationId || null,
    is_admin: Boolean(u.isAdmin || u.role === 'ROL_CEO'),
    status: u.status || 'ACTIVO',
    created_at: toSafeIsoTimestamp(u.createdAt)
  };
}

/**
 * Reconstructs a full User object from a Supabase `system_users` row
 */
export function mapSupabaseRowToUser(row: any): User {
  const role = (row.role || 'ROL_BUSQUEDA') as User['role'];
  const clearanceByRole: Record<string, number> = {
    ROL_CEO: 4,
    ROL_FUSION: 3,
    ROL_BUSQUEDA: 2,
    ROL_TERRENO: 1,
    ROL_PATRULLA: 1
  };
  const subtitleByRole: Record<string, string> = {
    ROL_CEO: 'Centro de Enlace y Operaciones — Administrador Supremo del Sistema C4ISR',
    ROL_FUSION: 'Centro de Fusión de Inteligencia — Análisis de Búsqueda (Subordinado al CEO-LCC)',
    ROL_BUSQUEDA: 'Captación IMINT/HUMINT/SIGINT & Sensores S-2 (Subordinado al CEO-LCC)',
    ROL_TERRENO: 'Patrullas Tácticas de Búsqueda & Destacamentos (Subordinado al CEO-LCC)',
    ROL_PATRULLA: 'Patrullas Tácticas de Búsqueda & Destacamentos (Subordinado al CEO-LCC)'
  };
  const organNameByRole: Record<string, string> = {
    ROL_CEO: 'CEO-LCC Mando (Administrador)',
    ROL_FUSION: 'Órgano de Fusión (CFI)',
    ROL_BUSQUEDA: 'Órgano de Búsqueda S-2',
    ROL_TERRENO: 'Órgano de Búsqueda en Terreno',
    ROL_PATRULLA: 'Órgano de Búsqueda en Terreno'
  };
  const phone = row.phone_number ? String(row.phone_number).trim() : '';
  return {
    id: row.id,
    role,
    name: row.name || row.username || 'Operador Militar',
    username: row.username || row.id.toLowerCase(),
    phoneNumber: phone || undefined,
    cellphone: phone || undefined,
    password: phone || undefined,
    rank: row.rank || 'Oficial Operador',
    organName: row.organ_name || organNameByRole[role] || 'Órgano Operativo',
    organSubtitle: subtitleByRole[role] || 'Unidad Operativa C4ISR',
    signature: `SIG-AES256-${String(row.id || 'OP').replace(/[^A-Z0-9]/gi, '').slice(0, 12).toUpperCase()}`,
    clearanceLevel: clearanceByRole[role] ?? 1,
    stationId: row.station_id || `ESTACION-${role.replace('ROL_', '')}-01`,
    isAdmin: Boolean(row.is_admin || role === 'ROL_CEO'),
    status: (row.status === 'SUSPENDIDO' ? 'SUSPENDIDO' : 'ACTIVO') as 'ACTIVO' | 'SUSPENDIDO',
    createdAt: row.created_at || new Date().toISOString(),
    assignedBy: 'CEO-LCC MANDO (SUPABASE CLOUD)'
  };
}

/**
 * Direct granular persistence for Tactical Units (patrols & live GPS coordinates)
 */
export async function upsertTacticalUnitInSupabase(unit: TacticalUnit): Promise<{ ok: boolean; error?: string }> {
  try {
    const row = mapTacticalUnitToSupabaseRow(unit);
    const { error } = await supabase.from('tactical_units').upsert([row], { onConflict: 'id' });
    if (error) {
      console.warn('[Supabase] Error guardando patrulla:', error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err: any) {
    console.warn('[Supabase] Excepción guardando patrulla:', err?.message || err);
    return { ok: false, error: err?.message || 'Error de red' };
  }
}

export async function upsertAllTacticalUnitsInSupabase(units: TacticalUnit[]): Promise<{ ok: boolean; count: number; error?: string }> {
  if (!units || units.length === 0) return { ok: true, count: 0 };
  try {
    const dedupMap = new Map<string, TacticalUnit>();
    units.forEach(u => {
      if (u && u.id) dedupMap.set(u.id, u);
    });
    const rows = Array.from(dedupMap.values()).map(mapTacticalUnitToSupabaseRow);
    const { error } = await supabase.from('tactical_units').upsert(rows, { onConflict: 'id' });
    if (error) {
      console.warn('[Supabase] Error guardando lote de patrullas:', error.message);
      return { ok: false, count: 0, error: error.message };
    }
    return { ok: true, count: rows.length };
  } catch (err: any) {
    console.warn('[Supabase] Excepción guardando lote de patrullas:', err?.message || err);
    return { ok: false, count: 0, error: err?.message || 'Error de red' };
  }
}

export async function deleteTacticalUnitFromSupabase(unitId: string): Promise<{ ok: boolean; error?: string }> {
  if (!unitId) return { ok: false, error: 'ID inválido' };
  try {
    const { error } = await supabase.from('tactical_units').delete().eq('id', unitId);
    if (error) {
      console.warn('[Supabase] Error eliminando patrulla:', error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err: any) {
    console.warn('[Supabase] Excepción eliminando patrulla:', err?.message || err);
    return { ok: false, error: err?.message || 'Error de red' };
  }
}

export async function fetchTacticalUnitsFromSupabase(): Promise<TacticalUnit[] | null> {
  try {
    const { data, error } = await supabase
      .from('tactical_units')
      .select('*')
      .order('last_report_at', { ascending: false });
    if (error || !Array.isArray(data)) {
      if (error) console.warn('[Supabase] Error consultando tactical_units:', error.message);
      return null;
    }
    return data.map(mapSupabaseRowToTacticalUnit);
  } catch (err: any) {
    console.warn('[Supabase] Excepción consultando tactical_units:', err?.message || err);
    return null;
  }
}

/**
 * Direct granular persistence for Raw Alerts (S-2 Field Reports transmitted to CFI)
 */
export async function upsertRawAlertInSupabase(alert: RawAlert): Promise<{ ok: boolean; error?: string }> {
  if (!alert || !alert.id) return { ok: false, error: 'Alerta inválida' };
  try {
    const row = {
      id: alert.id,
      type: alert.sourceType || 'HUMINT',
      title: alert.sourceName || 'Alerta S-2',
      description: alert.details || '',
      coordinates: alert.coordinates || '19°13\'10"S 68°35\'50"W',
      timestamp: toSafeIsoTimestamp(alert.timestamp),
      status: alert.status || 'PENDING',
      priority: `${alert.reliability || 'B'}${alert.certainty || '2'}`,
      source_sensor: alert.operatorName || alert.originUnit || alert.originSector || '',
      media_url: alert.mediaUrl || null,
      audio_url: null,
      metadata: { ...alert }
    };
    const { error } = await supabase.from('raw_alerts').upsert([row], { onConflict: 'id' });
    if (error) {
      console.warn('[Supabase] Error guardando reporte crudo S-2:', error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err: any) {
    console.warn('[Supabase] Excepción guardando reporte crudo S-2:', err?.message || err);
    return { ok: false, error: err?.message || 'Error de red' };
  }
}

/**
 * Direct granular persistence for Actionable Intelligence (CFI validated reports)
 */
export async function upsertActionableIntelInSupabase(intel: ActionableIntel): Promise<{ ok: boolean; error?: string }> {
  if (!intel || !intel.id) return { ok: false, error: 'Inteligencia inválida' };
  try {
    const row = {
      id: intel.id,
      title: intel.title || 'Inteligencia CFI',
      description: intel.recommendedAction || '',
      clan_name: intel.targetClan || 'Desconocido',
      threat_level: String(intel.threatScore ?? 80),
      coordinates: intel.coordinates || '19°13\'10"S 68°35\'50"W',
      confidence_score: Number(intel.threatScore) || 80,
      validated_by: intel.validatedBy || 'CFI',
      timestamp: toSafeIsoTimestamp(intel.timestamp),
      action_recommended: intel.recommendedAction || '',
      source: intel.rawAlertId || '',
      metadata: { ...intel }
    };
    const { error } = await supabase.from('actionable_intel').upsert([row], { onConflict: 'id' });
    if (error) {
      console.warn('[Supabase] Error guardando inteligencia CFI:', error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err: any) {
    console.warn('[Supabase] Excepción guardando inteligencia CFI:', err?.message || err);
    return { ok: false, error: err?.message || 'Error de red' };
  }
}

/**
 * Direct granular persistence for Automated Orders (OOA issued by CEO-LCC)
 */
export async function upsertAutomatedOrderInSupabase(order: AutomatedOrder): Promise<{ ok: boolean; error?: string }> {
  if (!order || !order.id) return { ok: false, error: 'Orden inválida' };
  try {
    const row = {
      id: order.id,
      intel_id: order.intelId || null,
      patrol_target: order.assignedUnit || 'Patrulla',
      objective: order.objective || 'Misión Táctica',
      mission_type: order.codeName || 'TACTICA',
      urgency: 'ALTA',
      status: order.status || 'ISSUED',
      issued_at: toSafeIsoTimestamp(order.timestamp),
      signature: order.issuer || 'CEO-LCC',
      coordinates: order.coordinates || '19°13\'10"S 68°35\'50"W',
      metadata: { ...order }
    };
    const { error } = await supabase.from('automated_orders').upsert([row], { onConflict: 'id' });
    if (error) {
      console.warn('[Supabase] Error guardando orden OOA:', error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err: any) {
    console.warn('[Supabase] Excepción guardando orden OOA:', err?.message || err);
    return { ok: false, error: err?.message || 'Error de red' };
  }
}

/**
 * Direct granular persistence for G-2 Expedientes
 */
export async function upsertExpedienteInSupabase(exp: G2RegistryRecord): Promise<{ ok: boolean; error?: string }> {
  if (!exp || !exp.id) return { ok: false, error: 'Expediente inválido' };
  try {
    const row = {
      id: exp.id,
      code: exp.id,
      title: exp.contenidoDetallado ? exp.contenidoDetallado.slice(0, 80) : exp.id,
      clan_id: null,
      classification: exp.clasificacionSeguridad || 'SECRETO',
      status: exp.estadoRegistro || 'Pendiente',
      created_at: toSafeIsoTimestamp(exp.createdAt),
      updated_at: toSafeIsoTimestamp(exp.updatedAt),
      analyst_id: exp.operadorRegistro || 'G-2',
      content: exp
    };
    const { error } = await supabase.from('expedientes').upsert([row], { onConflict: 'id' });
    if (error) {
      console.warn('[Supabase] Error guardando expediente G-2:', error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err: any) {
    console.warn('[Supabase] Excepción guardando expediente G-2:', err?.message || err);
    return { ok: false, error: err?.message || 'Error de red' };
  }
}

export async function deleteExpedienteFromSupabase(expedienteId: string): Promise<{ ok: boolean; error?: string }> {
  if (!expedienteId) return { ok: false, error: 'ID inválido' };
  try {
    const { error } = await supabase.from('expedientes').delete().eq('id', expedienteId);
    if (error) {
      console.warn('[Supabase] Error eliminando expediente G-2:', error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err: any) {
    console.warn('[Supabase] Excepción eliminando expediente G-2:', err?.message || err);
    return { ok: false, error: err?.message || 'Error de red' };
  }
}

/**
 * Direct granular persistence for Clans / Criminal Networks
 */
export async function upsertClanInSupabase(clan: Clan): Promise<{ ok: boolean; error?: string }> {
  if (!clan || !clan.id) return { ok: false, error: 'Clan inválido' };
  try {
    const row = {
      id: clan.id,
      name: clan.name,
      threat_level: clan.threatLevel,
      members_count: Number(clan.membersCount) || 0,
      routes: clan.knownRoutes || [],
      hotspots: clan.recentHotspots || [],
      tactics: clan.tactics || '',
      last_active: clan.lastActive || '',
      phone_numbers: clan.phoneNumbers || clan.interceptedPhones || [],
      radio_frequencies: clan.radioFrequencies || clan.interceptedFrequencies || [],
      vehicles: clan.vehicles || [],
      key_leaders: clan.keyLeaders || [],
      seizures: clan.seizures || [],
      notes: clan.notes || '',
      metadata: { ...clan },
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase.from('clans').upsert([row], { onConflict: 'id' });
    if (error) {
      console.warn('[Supabase] Error guardando clan:', error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err: any) {
    console.warn('[Supabase] Excepción guardando clan:', err?.message || err);
    return { ok: false, error: err?.message || 'Error de red' };
  }
}

export async function deleteClanFromSupabase(clanId: string): Promise<{ ok: boolean; error?: string }> {
  if (!clanId) return { ok: false, error: 'ID inválido' };
  try {
    const { error } = await supabase.from('clans').delete().eq('id', clanId);
    if (error) {
      console.warn('[Supabase] Error eliminando clan:', error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err: any) {
    console.warn('[Supabase] Excepción eliminando clan:', err?.message || err);
    return { ok: false, error: err?.message || 'Error de red' };
  }
}

/**
 * Direct granular persistence for System Users (`system_users`)
 */
export async function upsertSystemUserInSupabase(user: User): Promise<{ ok: boolean; error?: string }> {
  try {
    const row = mapUserToSupabaseRow(user);
    const { error } = await supabase.from('system_users').upsert([row], { onConflict: 'id' });
    if (error) {
      // Handle unique username conflict gracefully if user was recreated with a new ID
      if (error.code === '23505' || error.message?.includes('username')) {
        const { error: retryErr } = await supabase.from('system_users').upsert([row], { onConflict: 'username' });
        if (!retryErr) return { ok: true };
        console.warn('[Supabase] Error reintentando usuario por username:', retryErr.message);
        return { ok: false, error: retryErr.message };
      }
      console.warn('[Supabase] Error guardando usuario:', error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err: any) {
    console.warn('[Supabase] Excepción guardando usuario:', err?.message || err);
    return { ok: false, error: err?.message || 'Error de red' };
  }
}

export async function upsertAllSystemUsersInSupabase(users: User[]): Promise<{ ok: boolean; count: number; error?: string }> {
  if (!users || users.length === 0) return { ok: true, count: 0 };
  try {
    // Deduplicate by both id and lowercase username to prevent PostgreSQL unique constraint violations
    const seenIds = new Set<string>();
    const seenUsernames = new Set<string>();
    const rows: ReturnType<typeof mapUserToSupabaseRow>[] = [];
    for (const u of users) {
      if (!u || !u.id) continue;
      const row = mapUserToSupabaseRow(u);
      if (seenIds.has(row.id) || seenUsernames.has(row.username)) continue;
      seenIds.add(row.id);
      seenUsernames.add(row.username);
      rows.push(row);
    }

    const { error } = await supabase.from('system_users').upsert(rows, { onConflict: 'id' });
    if (error) {
      // Fallback: upsert individually so one conflicting username never blocks the rest
      let savedCount = 0;
      let lastErr = error.message;
      for (const u of users) {
        const res = await upsertSystemUserInSupabase(u);
        if (res.ok) savedCount++;
        else if (res.error) lastErr = res.error;
      }
      return { ok: savedCount > 0, count: savedCount, error: savedCount === rows.length ? undefined : lastErr };
    }
    return { ok: true, count: rows.length };
  } catch (err: any) {
    console.warn('[Supabase] Excepción guardando usuarios:', err?.message || err);
    return { ok: false, count: 0, error: err?.message || 'Error de red' };
  }
}

export async function deleteSystemUserFromSupabase(userId: string): Promise<{ ok: boolean; error?: string }> {
  if (!userId) return { ok: false, error: 'ID inválido' };
  try {
    const { error } = await supabase.from('system_users').delete().eq('id', userId);
    if (error) {
      console.warn('[Supabase] Error eliminando usuario:', error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err: any) {
    console.warn('[Supabase] Excepción eliminando usuario:', err?.message || err);
    return { ok: false, error: err?.message || 'Error de red' };
  }
}

export async function fetchSystemUsersFromSupabase(): Promise<User[] | null> {
  try {
    const { data, error } = await supabase
      .from('system_users')
      .select('*')
      .order('created_at', { ascending: false });
    if (error || !Array.isArray(data)) {
      if (error) console.warn('[Supabase] Error consultando system_users:', error.message);
      return null;
    }
    return data.map(mapSupabaseRowToUser);
  } catch (err: any) {
    console.warn('[Supabase] Excepción consultando system_users:', err?.message || err);
    return null;
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
 * 2. Upserts individual records into every relational table with valid ISO TIMESTAMPTZ fields
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

  // A. Save snapshot into `system_backups`
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

  // B. Sync individual Clans
  if (payload.clans.length > 0) {
    try {
      const clanRows = payload.clans.map(c => ({
        id: c.id,
        name: c.name,
        threat_level: c.threatLevel,
        members_count: Number(c.membersCount) || 0,
        routes: c.knownRoutes || [],
        hotspots: c.recentHotspots || [],
        tactics: c.tactics || '',
        last_active: c.lastActive || '',
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

  // C. Sync Raw Alerts
  if (payload.rawAlerts.length > 0) {
    try {
      const alertRows = payload.rawAlerts.map(a => ({
        id: a.id,
        type: a.sourceType || 'HUMINT',
        title: a.sourceName || 'Alerta S-2',
        description: a.details || '',
        coordinates: a.coordinates || '19°13\'10"S 68°35\'50"W',
        timestamp: toSafeIsoTimestamp(a.timestamp),
        status: a.status || 'PENDING',
        priority: `${a.reliability || 'B'}${a.certainty || '2'}`,
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

  // D. Sync Expedientes G-2
  if (payload.expedientes.length > 0) {
    try {
      const expRows = payload.expedientes.map(e => ({
        id: e.id,
        code: e.id,
        title: e.contenidoDetallado ? e.contenidoDetallado.slice(0, 60) : e.id,
        clan_id: null,
        classification: e.clasificacionSeguridad || 'SECRETO',
        status: e.estadoRegistro || 'Pendiente',
        created_at: toSafeIsoTimestamp(e.createdAt),
        updated_at: toSafeIsoTimestamp(e.updatedAt),
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

  // E. Sync Actionable Intel
  if (payload.actionableIntel.length > 0) {
    try {
      const intelRows = payload.actionableIntel.map(i => ({
        id: i.id,
        title: i.title || 'Inteligencia CFI',
        description: i.recommendedAction || '',
        clan_name: i.targetClan || 'Desconocido',
        threat_level: String(i.threatScore ?? 80),
        coordinates: i.coordinates || '19°13\'10"S 68°35\'50"W',
        confidence_score: Number(i.threatScore) || 80,
        validated_by: i.validatedBy || 'CFI',
        timestamp: toSafeIsoTimestamp(i.timestamp),
        action_recommended: i.recommendedAction || '',
        source: i.rawAlertId || '',
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

  // F. Sync Tactical Units (with sanitized TIMESTAMPTZ!)
  if (payload.tacticalUnits.length > 0) {
    const unitRes = await upsertAllTacticalUnitsInSupabase(payload.tacticalUnits);
    if (unitRes.ok) {
      tablesSynced.push(`tactical_units (${unitRes.count} unidades)`);
    } else {
      tablesFailed.push({ table: 'tactical_units', reason: unitRes.error || 'Fallo al guardar unidades tácticas' });
    }
  }

  // G. Sync Automated Orders (OOA)
  if (payload.activeOrders && payload.activeOrders.length > 0) {
    try {
      const orderRows = payload.activeOrders.map(o => ({
        id: o.id,
        intel_id: o.intelId || null,
        patrol_target: o.assignedUnit || 'Patrulla',
        objective: o.objective || 'Misión Táctica',
        mission_type: o.codeName || 'TACTICA',
        urgency: 'ALTA',
        status: o.status || 'ISSUED',
        issued_at: toSafeIsoTimestamp(o.timestamp),
        signature: o.issuer || 'CEO-LCC',
        coordinates: o.coordinates || '19°13\'10"S 68°35\'50"W',
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

  // H. Sync System Users (deduplicated & conflict-resilient)
  if (payload.users && payload.users.length > 0) {
    const usersRes = await upsertAllSystemUsersInSupabase(payload.users);
    if (usersRes.ok) {
      tablesSynced.push(`system_users (${usersRes.count} operadores)`);
    } else {
      tablesFailed.push({ table: 'system_users', reason: usersRes.error || 'Fallo al guardar operadores' });
    }
  }

  return {
    success: tablesSynced.length > 0 && tablesFailed.length === 0,
    tablesSynced,
    tablesFailed,
    backupId: backupRecord.id,
    timestamp,
    totalEntities
  };
}

/**
 * Downloads latest available data from Supabase, preferring live relational tables
 * (so real-time auto-saved patrols, GPS positions, and users are always freshest)
 * and falling back to the latest `system_backups` snapshot for any empty table.
 */
export async function fetchLatestSupabaseData(): Promise<{
  data: Partial<UnifiedPiiDataPayload> | null;
  source: 'BACKUP_RECORD' | 'RELATIONAL_TABLES' | null;
  error?: string;
}> {
  try {
    // 1. Query relational tables and latest backup in parallel
    const [
      clansRes,
      rawAlertsRes,
      expedientesRes,
      actionableIntelRes,
      tacticalUnitsRes,
      automatedOrdersRes,
      systemUsersRes,
      backupRes
    ] = await Promise.all([
      supabase.from('clans').select('*'),
      supabase.from('raw_alerts').select('*'),
      supabase.from('expedientes').select('*'),
      supabase.from('actionable_intel').select('*'),
      supabase.from('tactical_units').select('*'),
      supabase.from('automated_orders').select('*'),
      supabase.from('system_users').select('*'),
      supabase.from('system_backups').select('payload, created_at').order('created_at', { ascending: false }).limit(1)
    ]);

    const backupPayload = (!backupRes.error && backupRes.data && backupRes.data.length > 0 && backupRes.data[0].payload)
      ? (backupRes.data[0].payload as Partial<UnifiedPiiDataPayload>)
      : null;

    const clans = clansRes.data || [];
    const rawAlerts = rawAlertsRes.data || [];
    const expedientes = expedientesRes.data || [];
    const actionableIntel = actionableIntelRes.data || [];
    const tacticalUnits = tacticalUnitsRes.data || [];
    const automatedOrders = automatedOrdersRes.data || [];
    const systemUsers = systemUsersRes.data || [];

    const hasRelationalData =
      clans.length > 0 ||
      rawAlerts.length > 0 ||
      expedientes.length > 0 ||
      actionableIntel.length > 0 ||
      tacticalUnits.length > 0 ||
      automatedOrders.length > 0 ||
      systemUsers.length > 0;

    if (!hasRelationalData && !backupPayload) {
      return {
        data: null,
        source: null,
        error: 'No se encontraron registros almacenados en Supabase.'
      };
    }

    const restoredClans: Clan[] = clans.length > 0
      ? clans.map(c => {
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
        })
      : (backupPayload?.clans || []);

    const restoredAlerts: RawAlert[] = rawAlerts.length > 0
      ? rawAlerts.map(a => {
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
        })
      : (backupPayload?.rawAlerts || []);

    const restoredExpedientes: G2RegistryRecord[] = expedientes.length > 0
      ? expedientes.map(e => e.content || {
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
        })
      : (backupPayload?.expedientes || []);

    const restoredIntel: ActionableIntel[] = actionableIntel.length > 0
      ? actionableIntel.map(i => {
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
        })
      : (backupPayload?.actionableIntel || []);

    const restoredUnits: TacticalUnit[] = tacticalUnits.length > 0
      ? tacticalUnits.map(mapSupabaseRowToTacticalUnit)
      : (backupPayload?.tacticalUnits || []);

    const restoredOrders: AutomatedOrder[] = automatedOrders.length > 0
      ? automatedOrders.map(o => {
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
        })
      : (backupPayload?.activeOrders || []);

    const restoredUsers: User[] = systemUsers.length > 0
      ? systemUsers.map(mapSupabaseRowToUser)
      : (backupPayload?.users || []);

    return {
      data: {
        clans: restoredClans,
        rawAlerts: restoredAlerts,
        expedientes: restoredExpedientes,
        actionableIntel: restoredIntel,
        tacticalUnits: restoredUnits,
        activeOrders: restoredOrders,
        users: restoredUsers
      },
      source: hasRelationalData ? 'RELATIONAL_TABLES' : 'BACKUP_RECORD'
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
