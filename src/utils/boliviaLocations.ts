/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Directorio geográfico nacional de Bolivia y geocodificador territorial (PII-LCC)
 */

import { formatToMilitaryDMS, calculateDistanceKm } from './geo';

export interface BoliviaLocationEntry {
  name: string;
  department: string;
  zone?: string;
  lat: number;
  lon: number;
  freq?: string;
  aliases?: string[];
}

export interface ResolvedLocationResult {
  name: string;
  displayName: string;
  department?: string;
  lat: number;
  lon: number;
  dms: string;
  source: 'LOCAL_GAZETTEER' | 'OSM_NOMINATIM';
}

export const BOLIVIA_LOCATIONS: BoliviaLocationEntry[] = [
  // === SANTA CRUZ & FRONTERA ESTE (BRASIL / PARAGUAY) ===
  { name: 'San Matías', department: 'Santa Cruz', zone: 'Frontera Brasil (Este)', lat: -16.3600, lon: -58.4044, freq: '144.250 MHz', aliases: ['san matias', 'frontera mato grosso', 'caceres'] },
  { name: 'Puerto Quijarro', department: 'Santa Cruz', zone: 'Frontera Brasil (Arroyo Concepción)', lat: -19.0036, lon: -57.7178, freq: '144.400 MHz', aliases: ['quijarro', 'arroyo concepcion', 'corumba'] },
  { name: 'Puerto Suárez', department: 'Santa Cruz', zone: 'Frontera Brasil (Pantanal)', lat: -18.9667, lon: -57.7981, freq: '144.350 MHz', aliases: ['puerto suarez', 'suarez'] },
  { name: 'San Ignacio de Velasco', department: 'Santa Cruz', zone: 'Chiquitanía / Frontera Este', lat: -16.3736, lon: -60.9600, freq: '144.100 MHz', aliases: ['san ignacio', 'velasco'] },
  { name: 'San Vicente de la Frontera', department: 'Santa Cruz', zone: 'Frontera Brasil (Velasco)', lat: -15.6333, lon: -60.3500, freq: '144.150 MHz', aliases: ['san vicente'] },
  { name: 'San José de Chiquitos', department: 'Santa Cruz', zone: 'Corredor Bioceánico Este', lat: -17.8453, lon: -60.7414, freq: '144.050 MHz', aliases: ['san jose', 'chiquitos'] },
  { name: 'Roboré', department: 'Santa Cruz', zone: 'Corredor Este / Pantanal', lat: -18.3347, lon: -59.7614, freq: '144.200 MHz', aliases: ['robore'] },
  { name: 'Santa Cruz de la Sierra', department: 'Santa Cruz', zone: 'Capital Departamental', lat: -17.7833, lon: -63.1821, freq: '144.000 MHz', aliases: ['santa cruz', 'scz'] },
  { name: 'Montero', department: 'Santa Cruz', zone: 'Norte Integrado', lat: -17.3422, lon: -63.2558, freq: '144.000 MHz' },
  { name: 'Warnes', department: 'Santa Cruz', zone: 'Norte Integrado', lat: -17.5167, lon: -63.1667, freq: '144.000 MHz' },
  { name: 'Camiri', department: 'Santa Cruz', zone: 'Chaco Boliviano', lat: -20.0385, lon: -63.5183, freq: '143.850 MHz' },
  { name: 'Boyuibe', department: 'Santa Cruz', zone: 'Frontera Paraguay / Chaco', lat: -20.4322, lon: -63.2814, freq: '143.900 MHz' },
  { name: 'Hito Villazón / Infante Rivarola', department: 'Santa Cruz / Tarija', zone: 'Frontera Paraguay', lat: -20.5333, lon: -62.2500, freq: '143.950 MHz', aliases: ['hito villazon', 'infante rivarola', 'frontera paraguay'] },
  { name: 'Concepción', department: 'Santa Cruz', zone: 'Chiquitanía', lat: -16.1333, lon: -62.0333, freq: '144.100 MHz', aliases: ['concepcion'] },
  { name: 'Ascensión de Guarayos', department: 'Santa Cruz', zone: 'Guarayos', lat: -15.8906, lon: -63.1883, freq: '144.100 MHz', aliases: ['guarayos', 'ascension'] },
  { name: 'Vallegrande', department: 'Santa Cruz', zone: 'Valles Cruceños', lat: -18.4897, lon: -64.1069, freq: '144.000 MHz' },
  { name: 'Yapacaní', department: 'Santa Cruz', zone: 'Carretera Nueva Cochabamba-SCZ', lat: -17.4036, lon: -63.8850, freq: '144.000 MHz', aliases: ['yapacani'] },
  { name: 'San Julián', department: 'Santa Cruz', zone: 'Tierras Bajas', lat: -16.9061, lon: -62.6169, freq: '144.050 MHz', aliases: ['san julian'] },

  // === ORURO & FRONTERA OCCIDENTAL (CHILE) ===
  { name: 'Salar de Coipasa - Hito XIX', department: 'Oruro', zone: 'Frontera Chile (Oeste)', lat: -19.2194, lon: -68.5972, freq: '142.850 MHz', aliases: ['coipasa', 'salar de coipasa', 'hito xix', 'hito 19'] },
  { name: 'Paso Colchane / Pisiga - Hito XXIII', department: 'Oruro', zone: 'Frontera Chile (Pisiga)', lat: -19.2778, lon: -68.6289, freq: '143.100 MHz', aliases: ['pisiga', 'colchane', 'paso colchane', 'hito xxiii', 'hito 23'] },
  { name: 'Tambo Quemado / Hito IV', department: 'Oruro', zone: 'Frontera Chile (Chungará)', lat: -18.2889, lon: -69.0417, freq: '142.150 MHz', aliases: ['tambo quemado', 'chungara', 'hito iv', 'hito 4'] },
  { name: 'Quebrada de Tarapacá - Hito 14', department: 'Oruro', zone: 'Frontera Chile', lat: -19.2014, lon: -68.6111, freq: '141.950 MHz', aliases: ['hito 14', 'tarapaca', 'quebrada'] },
  { name: 'Abra de Chorrillos / Pito', department: 'Oruro', zone: 'Frontera Occidental', lat: -19.7561, lon: -68.7028, freq: '143.700 MHz', aliases: ['chorrillos', 'abra de chorrillos'] },
  { name: 'Sabaya', department: 'Oruro', zone: 'Atahuallpa / Frontera Oeste', lat: -19.0136, lon: -68.3742, freq: '142.900 MHz' },
  { name: 'Oruro', department: 'Oruro', zone: 'Capital Departamental', lat: -17.9647, lon: -67.1064, freq: '142.500 MHz' },
  { name: 'Challapata', department: 'Oruro', zone: 'Abaroa / Nudo Carretero', lat: -18.9022, lon: -66.7706, freq: '142.650 MHz' },
  { name: 'Curahuara de Carangas', department: 'Oruro', zone: 'Sajama / Ruta Tambo Quemado', lat: -17.8717, lon: -68.4264, freq: '142.300 MHz', aliases: ['curahuara', 'sajama'] },
  { name: 'Huachacalla', department: 'Oruro', zone: 'Litoral / Ruta Pisiga', lat: -18.7850, lon: -68.2583, freq: '142.800 MHz' },
  { name: 'Todos Santos', department: 'Oruro', zone: 'Frontera Chile (Mejillones)', lat: -18.9936, lon: -68.7167, freq: '142.850 MHz' },
  { name: 'Turco', department: 'Oruro', zone: 'Sajama', lat: -18.1833, lon: -68.1833, freq: '142.400 MHz' },
  { name: 'Huanuni', department: 'Oruro', zone: 'Distrito Minero', lat: -18.2892, lon: -66.8358, freq: '142.550 MHz' },

  // === LA PAZ & FRONTERA PERÚ / CHILE ===
  { name: 'La Paz', department: 'La Paz', zone: 'Sede de Gobierno / Estado Mayor', lat: -16.4897, lon: -68.1193, freq: '142.000 MHz', aliases: ['ciudad de la paz', 'lpz'] },
  { name: 'El Alto', department: 'La Paz', zone: 'Nudo Altiplánico', lat: -16.5047, lon: -68.1633, freq: '142.050 MHz' },
  { name: 'Desaguadero', department: 'La Paz', zone: 'Frontera Perú (Lago Titicaca)', lat: -16.5667, lon: -69.0333, freq: '141.800 MHz', aliases: ['frontera peru', 'puente desaguadero'] },
  { name: 'Copacabana / Kasani', department: 'La Paz', zone: 'Frontera Perú (Titicaca)', lat: -16.1667, lon: -69.0833, freq: '141.850 MHz', aliases: ['copacabana', 'kasani'] },
  { name: 'Puerto Acosta', department: 'La Paz', zone: 'Frontera Perú (Norte Titicaca)', lat: -15.5333, lon: -69.2500, freq: '141.750 MHz', aliases: ['acosta', 'escoma'] },
  { name: 'Charaña', department: 'La Paz', zone: 'Frontera Tripartita (Chile/Perú)', lat: -17.5931, lon: -69.4422, freq: '142.100 MHz', aliases: ['charana', 'hito tripartito', 'visviri'] },
  { name: 'Patacamaya', department: 'La Paz', zone: 'Nudo Carretero La Paz - Oruro - Tambo', lat: -17.2358, lon: -67.9217, freq: '142.200 MHz' },
  { name: 'Guaqui', department: 'La Paz', zone: 'Puerto Lacustre Titicaca', lat: -16.5833, lon: -68.8500, freq: '141.900 MHz' },
  { name: 'Viacha', department: 'La Paz', zone: 'Ingavi', lat: -16.6533, lon: -68.3017, freq: '142.050 MHz' },
  { name: 'Apolo', department: 'La Paz', zone: 'Norte de La Paz', lat: -14.7167, lon: -68.4167, freq: '141.600 MHz' },
  { name: 'Ixiamas', department: 'La Paz', zone: 'Amazonía Norte La Paz', lat: -13.7667, lon: -68.1333, freq: '141.550 MHz' },
  { name: 'Caranavi', department: 'La Paz', zone: 'Yungas', lat: -15.8333, lon: -67.5667, freq: '141.900 MHz' },

  // === POTOSÍ & FRONTERA SUROESTE / SUR (CHILE / ARGENTINA) ===
  { name: 'Villazón', department: 'Potosí', zone: 'Frontera Argentina (La Quiaca)', lat: -22.0867, lon: -65.5942, freq: '140.900 MHz', aliases: ['villazon', 'la quiaca', 'frontera argentina'] },
  { name: 'Ollagüe / Frontera Sur', department: 'Potosí', zone: 'Frontera Chile (Avaroa)', lat: -21.2250, lon: -68.2500, freq: '140.400 MHz', aliases: ['ollague', 'avaroa', 'estacion avaroa'] },
  { name: 'Uyuni', department: 'Potosí', zone: 'Salar de Uyuni / Suroeste', lat: -20.4603, lon: -66.8261, freq: '140.600 MHz', aliases: ['salar de uyuni'] },
  { name: 'Potosí', department: 'Potosí', zone: 'Capital Departamental', lat: -19.5836, lon: -65.7531, freq: '140.500 MHz', aliases: ['potosi'] },
  { name: 'Tupiza', department: 'Potosí', zone: 'Sud Chichas', lat: -21.4436, lon: -65.7186, freq: '140.800 MHz' },
  { name: 'Llica', department: 'Potosí', zone: 'Frontera Chile (Daniel Campos)', lat: -19.8500, lon: -68.2500, freq: '140.450 MHz' },
  { name: 'San Pedro de Quemes', department: 'Potosí', zone: 'Nor Lípez / Frontera Chile', lat: -20.7500, lon: -67.8833, freq: '140.450 MHz', aliases: ['quemes'] },
  { name: 'Hito Cajones', department: 'Potosí', zone: 'Frontera Chile (Sud Lípez)', lat: -22.8833, lon: -67.8000, freq: '140.350 MHz', aliases: ['cajones', 'san pedro de atacama'] },
  { name: 'Atocha', department: 'Potosí', zone: 'Sud Chichas', lat: -20.9333, lon: -66.2167, freq: '140.700 MHz' },
  { name: 'Llallagua', department: 'Potosí', zone: 'Norte Potosí', lat: -18.4242, lon: -66.5839, freq: '140.550 MHz' },

  // === TARIJA & FRONTERA SUR (ARGENTINA / PARAGUAY) ===
  { name: 'Yacuiba', department: 'Tarija', zone: 'Frontera Argentina (San José de Pocitos)', lat: -22.0164, lon: -63.6775, freq: '143.500 MHz', aliases: ['pocitos', 'san jose de pocitos', 'salvador mazza'] },
  { name: 'Bermejo', department: 'Tarija', zone: 'Frontera Argentina (Aguas Blancas)', lat: -22.7322, lon: -64.3372, freq: '143.600 MHz', aliases: ['aguas blancas'] },
  { name: 'Villamontes', department: 'Tarija', zone: 'Gran Chaco / Frontera Paraguay', lat: -21.2625, lon: -63.4694, freq: '143.550 MHz', aliases: ['villa montes'] },
  { name: 'Tarija', department: 'Tarija', zone: 'Capital Departamental', lat: -21.5355, lon: -64.7296, freq: '143.400 MHz' },
  { name: 'Padcaya', department: 'Tarija', zone: 'Arce / Ruta Bermejo', lat: -21.8833, lon: -64.7167, freq: '143.450 MHz' },
  { name: 'Caraparí', department: 'Tarija', zone: 'Gran Chaco', lat: -21.8256, lon: -63.7433, freq: '143.500 MHz', aliases: ['carapari'] },

  // === PANDO & BENI (FRONTERA NORTE / AMAZONÍA - BRASIL / PERÚ) ===
  { name: 'Cobija', department: 'Pando', zone: 'Frontera Brasil (Acre / Brasileia)', lat: -11.0267, lon: -68.7692, freq: '145.100 MHz', aliases: ['brasileia', 'acre'] },
  { name: 'Bolpebra', department: 'Pando', zone: 'Frontera Tripartita (Bolivia-Perú-Brasil)', lat: -10.9467, lon: -69.5728, freq: '145.150 MHz', aliases: ['tripartito norte'] },
  { name: 'Porvenir', department: 'Pando', zone: 'Nicolás Suárez', lat: -11.2333, lon: -68.6833, freq: '145.100 MHz' },
  { name: 'Extrema', department: 'Pando', zone: 'Frontera Perú (Río Tahuamanu)', lat: -11.4500, lon: -69.2500, freq: '145.200 MHz' },
  { name: 'Guayaramerín', department: 'Beni', zone: 'Frontera Brasil (Guajará-Mirim)', lat: -10.8258, lon: -65.3567, freq: '145.300 MHz', aliases: ['guayaramerin', 'guajara mirim'] },
  { name: 'Riberalta', department: 'Beni', zone: 'Vaca Díez / Amazonía Norte', lat: -11.0065, lon: -66.0631, freq: '145.250 MHz' },
  { name: 'Trinidad', department: 'Beni', zone: 'Capital Departamental', lat: -14.8333, lon: -64.9000, freq: '145.000 MHz' },
  { name: 'San Joaquín', department: 'Beni', zone: 'Mamoré / Frontera Brasil', lat: -13.0414, lon: -64.6681, freq: '145.350 MHz', aliases: ['san joaquin', 'puerto siles'] },
  { name: 'Magdalena', department: 'Beni', zone: 'Iténez / Frontera Brasil', lat: -13.2667, lon: -64.0500, freq: '145.350 MHz', aliases: ['itenez'] },
  { name: 'Rurrenabaque', department: 'Beni', zone: 'Ballivián', lat: -14.4414, lon: -67.5278, freq: '145.050 MHz' },
  { name: 'Santa Ana del Yacuma', department: 'Beni', zone: 'Yacuma', lat: -13.7444, lon: -65.4269, freq: '145.050 MHz', aliases: ['santa ana', 'yacuma'] },

  // === COCHABAMBA & CHUQUISACA (CENTRO NACIONAL) ===
  { name: 'Cochabamba', department: 'Cochabamba', zone: 'Capital Departamental', lat: -17.3935, lon: -66.1570, freq: '141.200 MHz', aliases: ['cbba'] },
  { name: 'Quillacollo', department: 'Cochabamba', zone: 'Valle Bajo', lat: -17.3923, lon: -66.2784, freq: '141.200 MHz' },
  { name: 'Sacaba', department: 'Cochabamba', zone: 'Chapare', lat: -17.4042, lon: -66.0408, freq: '141.200 MHz' },
  { name: 'Colomi', department: 'Cochabamba', zone: 'Puesto Control Chapare', lat: -17.3458, lon: -65.8700, freq: '141.250 MHz' },
  { name: 'Villa Tunari', department: 'Cochabamba', zone: 'Trópico de Cochabamba', lat: -16.9747, lon: -65.4200, freq: '141.300 MHz' },
  { name: 'Chimoré', department: 'Cochabamba', zone: 'Trópico de Cochabamba', lat: -16.9942, lon: -65.1517, freq: '141.300 MHz', aliases: ['chimore'] },
  { name: 'Ivirgarzama', department: 'Cochabamba', zone: 'Trópico de Cochabamba', lat: -17.0322, lon: -64.8569, freq: '141.300 MHz' },
  { name: 'Aiquile', department: 'Cochabamba', zone: 'Campero', lat: -18.2044, lon: -65.1806, freq: '141.250 MHz' },
  { name: 'Sucre', department: 'Chuquisaca', zone: 'Capital Constitucional', lat: -19.0196, lon: -65.2619, freq: '141.500 MHz' },
  { name: 'Monteagudo', department: 'Chuquisaca', zone: 'Chaco Chuquisaqueño', lat: -19.8050, lon: -63.9547, freq: '141.550 MHz' },
  { name: 'Camargo', department: 'Chuquisaca', zone: 'Nor Cinti', lat: -20.6408, lon: -65.2094, freq: '141.550 MHz' },
  { name: 'Macharetí', department: 'Chuquisaca', zone: 'Chaco / Ruta Paraguay', lat: -20.8167, lon: -63.3667, freq: '143.800 MHz', aliases: ['machareti'] }
];

/**
 * Normalizes Spanish/Portuguese place text (removes diacritics, lowercases, compacts spaces)
 */
export function normalizeLocationText(text: string): string {
  return (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Instant offline search over the Bolivian territorial gazetteer
 */
export function searchLocalBoliviaLocations(query: string, limit: number = 8): ResolvedLocationResult[] {
  const q = normalizeLocationText(query);
  if (!q) return [];

  const scored: { score: number; entry: BoliviaLocationEntry }[] = [];

  for (const entry of BOLIVIA_LOCATIONS) {
    const normName = normalizeLocationText(entry.name);
    const normDept = normalizeLocationText(entry.department);
    const normZone = normalizeLocationText(entry.zone || '');
    const normAliases = (entry.aliases || []).map(normalizeLocationText);

    let score = 0;
    if (normName === q || normAliases.includes(q)) {
      score = 100;
    } else if (normName.startsWith(q) || normAliases.some(a => a.startsWith(q))) {
      score = 80;
    } else if (normName.includes(q) || normAliases.some(a => a.includes(q))) {
      score = 60;
    } else if (q.length >= 4 && (q.includes(normName) || normAliases.some(a => a.length >= 4 && q.includes(a)))) {
      score = 55;
    } else if (normDept.includes(q) || normZone.includes(q)) {
      score = 35;
    }

    if (score > 0) {
      scored.push({ score, entry });
    }
  }

  scored.sort((a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name));

  return scored.slice(0, limit).map(({ entry }) => ({
    name: entry.name,
    displayName: `${entry.name}, ${entry.department}${entry.zone ? ` (${entry.zone})` : ''}`,
    department: entry.department,
    lat: entry.lat,
    lon: entry.lon,
    dms: formatToMilitaryDMS(entry.lat, entry.lon),
    source: 'LOCAL_GAZETTEER' as const
  }));
}

/**
 * Resolves ANY place name in Bolivia (or neighboring borders):
 * 1. Exact/strong match in built-in Bolivian gazetteer (instant & offline-ready)
 * 2. Live geocoding via backend proxy `/api/geo/search` (OpenStreetMap Nominatim)
 * 3. Fallback to partial local match if network is unavailable
 */
export async function resolveBoliviaLocation(query: string): Promise<ResolvedLocationResult[]> {
  const trimmed = (query || '').trim();
  if (!trimmed) return [];

  const qNorm = normalizeLocationText(trimmed);
  const localMatches = searchLocalBoliviaLocations(trimmed, 6);

  // If we have an exact match in our local gazetteer, put it first immediately
  const exactLocal = localMatches.find(m => normalizeLocationText(m.name) === qNorm);

  // Query backend Nominatim proxy first; if deployed on static hosting (e.g. Vercel), fall back directly to Nominatim CORS API
  let remoteResults: ResolvedLocationResult[] = [];
  let proxyWorked = false;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(`/api/geo/search?q=${encodeURIComponent(trimmed)}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const ct = resp.headers.get('content-type') || '';
    if (resp.ok && ct.includes('application/json')) {
      const data = await resp.json();
      if (Array.isArray(data.results)) {
        proxyWorked = true;
        remoteResults = data.results
          .filter((r: any) => Number.isFinite(Number(r.lat)) && Number.isFinite(Number(r.lon)))
          .map((r: any) => {
            const lat = Number(r.lat);
            const lon = Number(r.lon);
            return {
              name: r.name || trimmed,
              displayName: r.displayName || r.name || trimmed,
              department: r.department,
              lat,
              lon,
              dms: formatToMilitaryDMS(lat, lon),
              source: 'OSM_NOMINATIM' as const
            };
          });
      }
    }
  } catch {
    // Fall through to direct Nominatim CORS lookup
  }

  if (!proxyWorked) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5500);
      const nomUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&countrycodes=bo&limit=8&accept-language=es&q=${encodeURIComponent(trimmed)}`;
      const resp = await fetch(nomUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (resp.ok) {
        const items = await resp.json();
        if (Array.isArray(items)) {
          remoteResults = items
            .filter((item: any) => Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lon)))
            .map((item: any) => {
              const lat = Number(item.lat);
              const lon = Number(item.lon);
              const addr = item.address || {};
              const dept = addr.state || addr.region || addr.county || '';
              const shortName =
                item.name ||
                addr.city ||
                addr.town ||
                addr.village ||
                addr.municipality ||
                String(item.display_name || trimmed).split(',')[0].trim();
              return {
                name: shortName,
                displayName: item.display_name || shortName,
                department: dept,
                lat,
                lon,
                dms: formatToMilitaryDMS(lat, lon),
                source: 'OSM_NOMINATIM' as const
              };
            });
        }
      }
    } catch {
      // Offline or timeout — localMatches still works seamlessly
    }
  }

  // Combine: exact local match first, then local matches + unique remote results
  const combined: ResolvedLocationResult[] = [];
  const pushUnique = (item: ResolvedLocationResult) => {
    const dup = combined.some(
      existing =>
        Math.abs(existing.lat - item.lat) < 0.015 &&
        Math.abs(existing.lon - item.lon) < 0.015
    );
    if (!dup) combined.push(item);
  };

  if (exactLocal) pushUnique(exactLocal);
  localMatches.forEach(pushUnique);
  remoteResults.forEach(pushUnique);

  return combined.slice(0, 8);
}

/**
 * Reverse geocodes coordinates to a Bolivian place name (online via Nominatim, offline via nearest gazetteer point)
 */
export async function reverseGeocodeBolivia(lat: number, lon: number): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);
    const resp = await fetch(`/api/geo/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const ct = resp.headers.get('content-type') || '';
    if (resp.ok && ct.includes('application/json')) {
      const data = await resp.json();
      if (data?.name) return String(data.name);
    }
  } catch {
    // fall through to direct Nominatim CORS reverse lookup
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const revUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&zoom=14&addressdetails=1&accept-language=es`;
    const resp = await fetch(revUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (resp.ok) {
      const item = await resp.json();
      const addr = item?.address || {};
      const place =
        item?.name ||
        addr.village ||
        addr.town ||
        addr.city ||
        addr.municipality ||
        addr.county ||
        addr.state;
      const dept = addr.state || addr.region || '';
      if (place) {
        return dept && place !== dept ? `${place}, ${dept}` : String(place);
      }
    }
  } catch {
    // fallback below
  }

  // Offline nearest-place fallback from Bolivian gazetteer
  let nearest: BoliviaLocationEntry | null = null;
  let minKm = Infinity;
  for (const entry of BOLIVIA_LOCATIONS) {
    const km = calculateDistanceKm({ lat, lon }, { lat: entry.lat, lon: entry.lon });
    if (km !== null && km < minKm) {
      minKm = km;
      nearest = entry;
    }
  }
  if (nearest) {
    return minKm <= 15
      ? `${nearest.name}, ${nearest.department}`
      : `Sector ${nearest.name} (${minKm.toFixed(0)} km) - ${nearest.department}`;
  }
  return null;
}
