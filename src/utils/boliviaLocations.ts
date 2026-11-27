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

export const BOLIVIA_BOUNDS = {
  minLat: -23.05,
  maxLat: -9.55,
  minLon: -69.85,
  maxLon: -57.35,
  centerLat: -16.2902,
  centerLon: -63.5887
} as const;

export function isInsideBolivia(lat: number, lon: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= BOLIVIA_BOUNDS.minLat &&
    lat <= BOLIVIA_BOUNDS.maxLat &&
    lon >= BOLIVIA_BOUNDS.minLon &&
    lon <= BOLIVIA_BOUNDS.maxLon
  );
}

export interface BoliviaDepartmentView {
  id: string;
  label: string;
  lat: number;
  lon: number;
  zoom: number;
  aliases?: string[];
}

export const BOLIVIA_DEPARTMENTS: BoliviaDepartmentView[] = [
  { id: 'ALL', label: 'Todo Bolivia', lat: -16.2902, lon: -63.5887, zoom: 6 },
  { id: 'LP', label: 'La Paz', lat: -16.2000, lon: -68.1500, zoom: 8, aliases: ['la paz', 'lpz'] },
  { id: 'OR', label: 'Oruro', lat: -18.5500, lon: -67.6500, zoom: 8, aliases: ['oruro'] },
  { id: 'PT', label: 'Potosí', lat: -20.5500, lon: -66.6500, zoom: 8, aliases: ['potosi', 'potosí'] },
  { id: 'CB', label: 'Cochabamba', lat: -17.3935, lon: -65.9500, zoom: 8, aliases: ['cochabamba', 'cbba'] },
  { id: 'CH', label: 'Chuquisaca', lat: -19.6500, lon: -64.4500, zoom: 8, aliases: ['chuquisaca', 'sucre'] },
  { id: 'TJ', label: 'Tarija', lat: -21.6500, lon: -64.1500, zoom: 8, aliases: ['tarija'] },
  { id: 'SC', label: 'Santa Cruz', lat: -17.7500, lon: -61.5000, zoom: 7, aliases: ['santa cruz', 'scz'] },
  { id: 'BN', label: 'Beni', lat: -13.7500, lon: -65.3500, zoom: 7, aliases: ['beni'] },
  { id: 'PD', label: 'Pando', lat: -11.1500, lon: -67.5500, zoom: 8, aliases: ['pando'] }
];

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
  { name: 'Macharetí', department: 'Chuquisaca', zone: 'Chaco / Ruta Paraguay', lat: -20.8167, lon: -63.3667, freq: '143.800 MHz', aliases: ['machareti'] },

  // === MUNICIPIOS, LOCALIDADES Y HITOS ADICIONALES (9 DEPARTAMENTOS) ===
  // Santa Cruz adicional
  { name: 'Puerto Busch', department: 'Santa Cruz', zone: 'Triángulo Dionisio Foianini / Frontera Brasil-Paraguay', lat: -20.0686, lon: -57.9917, freq: '144.450 MHz', aliases: ['foianini', 'busch'] },
  { name: 'Carmen Rivero Tórrez', department: 'Santa Cruz', zone: 'Germán Busch / Corredor Este', lat: -18.8167, lon: -58.6167, freq: '144.300 MHz', aliases: ['el carmen', 'carmen rivero torrez'] },
  { name: 'Cotoca', department: 'Santa Cruz', zone: 'Área Metropolitana Santa Cruz', lat: -17.7539, lon: -62.9967, freq: '144.000 MHz' },
  { name: 'La Guardia', department: 'Santa Cruz', zone: 'Andrés Ibáñez', lat: -17.8931, lon: -63.3311, freq: '144.000 MHz' },
  { name: 'El Torno', department: 'Santa Cruz', zone: 'Andrés Ibáñez', lat: -17.9869, lon: -63.3814, freq: '144.000 MHz' },
  { name: 'Samaipata', department: 'Santa Cruz', zone: 'Florida / Valles Cruceños', lat: -18.1803, lon: -63.8756, freq: '144.000 MHz' },
  { name: 'Mairana', department: 'Santa Cruz', zone: 'Florida / Valles', lat: -18.1200, lon: -63.9564, freq: '144.000 MHz' },
  { name: 'Comarapa', department: 'Santa Cruz', zone: 'Caballero / Carretera Antigua', lat: -17.9153, lon: -64.5314, freq: '144.000 MHz' },
  { name: 'Portachuelo', department: 'Santa Cruz', zone: 'Sara / Norte Integrado', lat: -17.3517, lon: -63.3947, freq: '144.000 MHz' },
  { name: 'Mineros', department: 'Santa Cruz', zone: 'Obispo Santistevan', lat: -17.1189, lon: -63.2314, freq: '144.000 MHz' },
  { name: 'Buena Vista', department: 'Santa Cruz', zone: 'Ichilo', lat: -17.4589, lon: -63.6594, freq: '144.000 MHz' },
  { name: 'San Carlos', department: 'Santa Cruz', zone: 'Ichilo', lat: -17.4050, lon: -63.7333, freq: '144.000 MHz' },
  { name: 'Okinawa Uno', department: 'Santa Cruz', zone: 'Warnes', lat: -17.2189, lon: -62.8939, freq: '144.000 MHz', aliases: ['okinawa'] },
  { name: 'Pailón', department: 'Santa Cruz', zone: 'Chiquitos', lat: -17.6589, lon: -62.7192, freq: '144.050 MHz', aliases: ['pailon'] },
  { name: 'Charagua', department: 'Santa Cruz', zone: 'Cordillera / Chaco', lat: -19.7917, lon: -63.1986, freq: '143.900 MHz' },
  { name: 'Cabezas', department: 'Santa Cruz', zone: 'Cordillera / Ruta Chaco', lat: -18.7869, lon: -63.3156, freq: '143.950 MHz' },
  { name: 'San Miguel de Velasco', department: 'Santa Cruz', zone: 'Velasco / Chiquitanía', lat: -16.6981, lon: -60.9675, freq: '144.100 MHz', aliases: ['san miguel'] },
  { name: 'San Rafael de Velasco', department: 'Santa Cruz', zone: 'Velasco / Chiquitanía', lat: -16.7869, lon: -60.6739, freq: '144.100 MHz', aliases: ['san rafael'] },
  { name: 'San Javier', department: 'Santa Cruz', zone: 'Ñuflo de Chávez', lat: -16.2747, lon: -62.5072, freq: '144.100 MHz' },
  { name: 'San Ramón', department: 'Santa Cruz', zone: 'Ñuflo de Chávez', lat: -16.6156, lon: -62.4981, freq: '144.100 MHz', aliases: ['san ramon'] },
  { name: 'Cuatro Cañadas', department: 'Santa Cruz', zone: 'Ñuflo de Chávez', lat: -17.2697, lon: -62.5594, freq: '144.050 MHz', aliases: ['cuatro canadas'] },

  // La Paz adicional
  { name: 'Achacachi', department: 'La Paz', zone: 'Omasuyos / Altiplano Norte', lat: -16.0444, lon: -68.6850, freq: '141.850 MHz' },
  { name: 'Huarina', department: 'La Paz', zone: 'Omasuyos / Lago Titicaca', lat: -16.2000, lon: -68.6000, freq: '141.850 MHz' },
  { name: 'Batallas', department: 'La Paz', zone: 'Los Andes', lat: -16.2981, lon: -68.5322, freq: '141.900 MHz' },
  { name: 'Tiahuanaco', department: 'La Paz', zone: 'Ingavi / Ruta Desaguadero', lat: -16.5556, lon: -68.6731, freq: '141.850 MHz', aliases: ['tiwanaku', 'tiahuanacu'] },
  { name: 'Sica Sica', department: 'La Paz', zone: 'Aroma / Carretera Oruro', lat: -17.3333, lon: -67.7333, freq: '142.200 MHz' },
  { name: 'Lahuachaca', department: 'La Paz', zone: 'Aroma', lat: -17.3750, lon: -67.6750, freq: '142.200 MHz' },
  { name: 'Coroico', department: 'La Paz', zone: 'Nor Yungas', lat: -16.1889, lon: -67.7272, freq: '141.950 MHz' },
  { name: 'Chulumani', department: 'La Paz', zone: 'Sud Yungas', lat: -16.4089, lon: -67.5269, freq: '141.950 MHz' },
  { name: 'Sorata', department: 'La Paz', zone: 'Larecaja', lat: -15.7731, lon: -68.6489, freq: '141.800 MHz' },
  { name: 'Guanay', department: 'La Paz', zone: 'Larecaja / Norte', lat: -15.4981, lon: -67.8797, freq: '141.700 MHz' },
  { name: 'Palos Blancos', department: 'La Paz', zone: 'Sud Yungas / Alto Beni', lat: -15.5833, lon: -67.2500, freq: '141.700 MHz' },
  { name: 'San Buenaventura', department: 'La Paz', zone: 'Iturralde / Río Beni', lat: -14.4369, lon: -67.5369, freq: '145.050 MHz' },
  { name: 'Corocoro', department: 'La Paz', zone: 'Pacajes', lat: -17.1719, lon: -68.4500, freq: '142.100 MHz' },
  { name: 'Calacoto', department: 'La Paz', zone: 'Pacajes / Ruta Charaña', lat: -17.2833, lon: -68.6333, freq: '142.100 MHz' },
  { name: 'Escoma', department: 'La Paz', zone: 'Camacho / Frontera Perú', lat: -15.6667, lon: -69.1333, freq: '141.750 MHz' },
  { name: 'Pelechuco', department: 'La Paz', zone: 'Franz Tamayo / Frontera Perú', lat: -14.8167, lon: -69.0667, freq: '141.650 MHz' },

  // Oruro adicional
  { name: 'Caracollo', department: 'Oruro', zone: 'Cercado / Nudo Carretero', lat: -17.6386, lon: -67.2167, freq: '142.450 MHz' },
  { name: 'Poopó', department: 'Oruro', zone: 'Lago Poopó', lat: -18.3803, lon: -66.9661, freq: '142.550 MHz', aliases: ['poopo'] },
  { name: 'Pazña', department: 'Oruro', zone: 'Poopó', lat: -18.6000, lon: -66.9167, freq: '142.600 MHz', aliases: ['pazna'] },
  { name: 'Salinas de Garci Mendoza', department: 'Oruro', zone: 'Ladislao Cabrera / Inter-Salar', lat: -19.6333, lon: -67.6833, freq: '142.750 MHz', aliases: ['salinas'] },
  { name: 'Corque', department: 'Oruro', zone: 'Carangas', lat: -18.3489, lon: -67.6694, freq: '142.700 MHz' },
  { name: 'Toledo', department: 'Oruro', zone: 'Saucarí / Ruta Pisiga', lat: -18.1806, lon: -67.4069, freq: '142.650 MHz' },
  { name: 'Andamarca', department: 'Oruro', zone: 'Sud Carangas', lat: -18.7833, lon: -67.5167, freq: '142.700 MHz' },
  { name: 'Orinoca', department: 'Oruro', zone: 'Sud Carangas', lat: -18.9722, lon: -67.2417, freq: '142.700 MHz' },
  { name: 'Eucaliptus', department: 'Oruro', zone: 'Tomás Barrón', lat: -17.5978, lon: -67.5117, freq: '142.400 MHz' },
  { name: 'Machacamarca', department: 'Oruro', zone: 'Pantaleón Dalence', lat: -18.1722, lon: -67.0222, freq: '142.500 MHz' },

  // Potosí adicional
  { name: 'Uncía', department: 'Potosí', zone: 'Bustillo / Norte Potosí', lat: -18.4675, lon: -66.5681, freq: '140.550 MHz', aliases: ['uncia'] },
  { name: 'Betanzos', department: 'Potosí', zone: 'Cornelio Saavedra', lat: -19.5531, lon: -65.4539, freq: '140.500 MHz' },
  { name: 'Colquechaca', department: 'Potosí', zone: 'Chayanta', lat: -18.6989, lon: -66.0042, freq: '140.550 MHz' },
  { name: 'Cotagaita', department: 'Potosí', zone: 'Nor Chichas', lat: -20.8167, lon: -65.6667, freq: '140.750 MHz' },
  { name: 'Colcha K', department: 'Potosí', zone: 'Nor Lípez / Suroeste', lat: -20.7417, lon: -67.6583, freq: '140.450 MHz', aliases: ['colcha'] },
  { name: 'San Pablo de Lípez', department: 'Potosí', zone: 'Sud Lípez / Frontera Sur', lat: -21.6833, lon: -66.6167, freq: '140.400 MHz', aliases: ['san pablo de lipez'] },
  { name: 'San Cristóbal', department: 'Potosí', zone: 'Nor Lípez', lat: -21.0950, lon: -67.1636, freq: '140.500 MHz', aliases: ['san cristobal'] },
  { name: 'Porco', department: 'Potosí', zone: 'Quijarro', lat: -19.7747, lon: -65.9869, freq: '140.550 MHz' },
  { name: 'Puna', department: 'Potosí', zone: 'Linares', lat: -19.7967, lon: -65.5033, freq: '140.550 MHz' },

  // Cochabamba adicional
  { name: 'Tiquipaya', department: 'Cochabamba', zone: 'Quillacollo', lat: -17.3381, lon: -66.2189, freq: '141.200 MHz' },
  { name: 'Vinto', department: 'Cochabamba', zone: 'Quillacollo', lat: -17.3967, lon: -66.3133, freq: '141.200 MHz' },
  { name: 'Sipe Sipe', department: 'Cochabamba', zone: 'Quillacollo', lat: -17.4547, lon: -66.3578, freq: '141.200 MHz' },
  { name: 'Punata', department: 'Cochabamba', zone: 'Valle Alto', lat: -17.5422, lon: -65.8350, freq: '141.200 MHz' },
  { name: 'Cliza', department: 'Cochabamba', zone: 'Valle Alto', lat: -17.5892, lon: -65.9328, freq: '141.200 MHz' },
  { name: 'Tarata', department: 'Cochabamba', zone: 'Esteban Arze', lat: -17.6111, lon: -66.0206, freq: '141.200 MHz' },
  { name: 'Capinota', department: 'Cochabamba', zone: 'Capinota', lat: -17.7150, lon: -66.2636, freq: '141.200 MHz' },
  { name: 'Mizque', department: 'Cochabamba', zone: 'Cono Sur', lat: -17.9411, lon: -65.3403, freq: '141.250 MHz' },
  { name: 'Totora', department: 'Cochabamba', zone: 'Carrasco', lat: -17.7267, lon: -65.1931, freq: '141.250 MHz' },
  { name: 'Shinahota', department: 'Cochabamba', zone: 'Trópico de Cochabamba', lat: -16.9950, lon: -65.2450, freq: '141.300 MHz' },
  { name: 'Entre Ríos (Cochabamba)', department: 'Cochabamba', zone: 'Carrasco / Trópico', lat: -17.1967, lon: -64.5361, freq: '141.300 MHz', aliases: ['entre rios cbba'] },
  { name: 'Puerto Villarroel', department: 'Cochabamba', zone: 'Trópico / Río Ichilo', lat: -16.8400, lon: -64.7931, freq: '141.300 MHz', aliases: ['villarroel'] },
  { name: 'Independencia', department: 'Cochabamba', zone: 'Ayopaya', lat: -17.0833, lon: -66.8167, freq: '141.250 MHz' },

  // Chuquisaca adicional
  { name: 'Tarabuco', department: 'Chuquisaca', zone: 'Yamparáez', lat: -19.1817, lon: -64.9150, freq: '141.500 MHz' },
  { name: 'Padilla', department: 'Chuquisaca', zone: 'Tomina', lat: -19.3089, lon: -64.3028, freq: '141.500 MHz' },
  { name: 'Zudáñez', department: 'Chuquisaca', zone: 'Zudáñez', lat: -19.1194, lon: -64.7014, freq: '141.500 MHz', aliases: ['zudanez'] },
  { name: 'Villa Serrano', department: 'Chuquisaca', zone: 'Belisario Boeto', lat: -19.1244, lon: -64.3247, freq: '141.500 MHz', aliases: ['serrano'] },
  { name: 'Muyupampa', department: 'Chuquisaca', zone: 'Luis Calvo / Chaco', lat: -19.8975, lon: -63.7497, freq: '141.550 MHz', aliases: ['villa vaca guzman'] },
  { name: 'San Lucas', department: 'Chuquisaca', zone: 'Nor Cinti', lat: -20.1000, lon: -65.1333, freq: '141.550 MHz' },
  { name: 'Culpina', department: 'Chuquisaca', zone: 'Sud Cinti', lat: -20.8264, lon: -64.9481, freq: '141.550 MHz' },
  { name: 'Villa Abecia', department: 'Chuquisaca', zone: 'Sud Cinti', lat: -20.9767, lon: -65.2300, freq: '141.550 MHz' },

  // Tarija adicional
  { name: 'Entre Ríos (Tarija)', department: 'Tarija', zone: 'O\'Connor', lat: -21.5261, lon: -64.1731, freq: '143.450 MHz', aliases: ['entre rios tarija'] },
  { name: 'San Lorenzo', department: 'Tarija', zone: 'Méndez', lat: -21.4167, lon: -64.7500, freq: '143.400 MHz' },
  { name: 'Uriondo', department: 'Tarija', zone: 'Avilés / Valle de la Concepción', lat: -21.6967, lon: -64.6550, freq: '143.400 MHz', aliases: ['valle de la concepcion'] },
  { name: 'Yunchará', department: 'Tarija', zone: 'Avilés / Zona Alta', lat: -21.8167, lon: -65.2000, freq: '143.400 MHz', aliases: ['yunchara'] },
  { name: 'El Puente', department: 'Tarija', zone: 'Méndez', lat: -21.2333, lon: -65.2167, freq: '143.400 MHz' },

  // Beni & Pando adicional
  { name: 'San Borja', department: 'Beni', zone: 'Ballivián', lat: -14.8583, lon: -66.7475, freq: '145.050 MHz' },
  { name: 'Reyes', department: 'Beni', zone: 'Ballivián', lat: -14.2969, lon: -67.3358, freq: '145.050 MHz' },
  { name: 'San Ignacio de Moxos', department: 'Beni', zone: 'Moxos', lat: -14.9961, lon: -65.6400, freq: '145.000 MHz', aliases: ['moxos'] },
  { name: 'Santa Rosa del Yacuma', department: 'Beni', zone: 'Ballivián', lat: -14.0706, lon: -66.7881, freq: '145.050 MHz', aliases: ['santa rosa'] },
  { name: 'Baures', department: 'Beni', zone: 'Iténez / Frontera Brasil', lat: -13.6556, lon: -63.6956, freq: '145.350 MHz' },
  { name: 'Huacaraje', department: 'Beni', zone: 'Iténez', lat: -13.5922, lon: -63.8806, freq: '145.350 MHz' },
  { name: 'San Ramón (Beni)', department: 'Beni', zone: 'Mamoré', lat: -13.2667, lon: -64.6167, freq: '145.350 MHz' },
  { name: 'Puerto Rico', department: 'Pando', zone: 'Manuripi', lat: -11.1033, lon: -67.5542, freq: '145.150 MHz' },
  { name: 'El Sena', department: 'Pando', zone: 'Madre de Dios', lat: -11.4717, lon: -67.2439, freq: '145.200 MHz', aliases: ['sena'] },
  { name: 'Filadelfia', department: 'Pando', zone: 'Manuripi / Frontera Perú', lat: -11.3333, lon: -68.7667, freq: '145.150 MHz' },
  { name: 'Bella Flor', department: 'Pando', zone: 'Nicolás Suárez / Frontera Brasil', lat: -11.1167, lon: -68.1833, freq: '145.100 MHz' }
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
 * Returns an immediate high-confidence match from the local Bolivian gazetteer
 * when the user types an exact place name, alias, or "Lugar - Departamento".
 * Used for zero-latency auto-coordinate population as the operator types.
 */
export function findBestInstantBoliviaMatch(query: string): ResolvedLocationResult | null {
  const q = normalizeLocationText(query);
  if (q.length < 3) return null;

  for (const entry of BOLIVIA_LOCATIONS) {
    const normName = normalizeLocationText(entry.name);
    const normDept = normalizeLocationText(entry.department);
    const normFull = `${normName} ${normDept}`;
    const normAliases = (entry.aliases || []).map(normalizeLocationText);

    if (
      normName === q ||
      normFull === q ||
      normAliases.includes(q)
    ) {
      return {
        name: entry.name,
        displayName: `${entry.name}, ${entry.department}${entry.zone ? ` (${entry.zone})` : ''}`,
        department: entry.department,
        lat: entry.lat,
        lon: entry.lon,
        dms: formatToMilitaryDMS(entry.lat, entry.lon),
        source: 'LOCAL_GAZETTEER'
      };
    }
  }
  return null;
}

/**
 * If an unknown rural/border place mentions a Bolivian department name,
 * returns that department's map view so the interactive map opens right in the target region.
 */
export function detectDepartmentHintInQuery(query: string): BoliviaDepartmentView | null {
  const q = normalizeLocationText(query);
  if (!q) return null;
  for (const dept of BOLIVIA_DEPARTMENTS) {
    if (dept.id === 'ALL') continue;
    const keys = [normalizeLocationText(dept.label), ...(dept.aliases || []).map(normalizeLocationText)];
    if (keys.some(k => k.length >= 3 && q.includes(k))) {
      return dept;
    }
  }
  return null;
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

  if (!proxyWorked || remoteResults.length === 0) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const nomUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&countrycodes=bo&limit=8&accept-language=es&q=${encodeURIComponent(trimmed)}`;
      const resp = await fetch(nomUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (resp.ok) {
        const items = await resp.json();
        if (Array.isArray(items)) {
          remoteResults = items
            .filter((item: any) => isInsideBolivia(Number(item.lat), Number(item.lon)))
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
                addr.hamlet ||
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
      // Fall through to Photon OSM fallback below
    }
  }

  // Secondary CORS-friendly OpenStreetMap Photon fallback restricted strictly to Bolivia
  if (remoteResults.length === 0) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(`${trimmed}, Bolivia`)}&limit=8&bbox=-69.75,-22.95,-57.40,-9.60`;
      const resp = await fetch(photonUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (resp.ok) {
        const data = await resp.json();
        const features = Array.isArray(data?.features) ? data.features : [];
        remoteResults = features
          .map((f: any) => {
            const coords = f?.geometry?.coordinates;
            const props = f?.properties || {};
            if (!Array.isArray(coords) || coords.length < 2) return null;
            const lon = Number(coords[0]);
            const lat = Number(coords[1]);
            if (!isInsideBolivia(lat, lon)) return null;
            const cc = String(props.countrycode || '').toLowerCase();
            if (cc && cc !== 'bo') return null;
            const name = props.name || props.city || props.town || props.village || trimmed;
            const dept = props.state || props.county || '';
            const display = [name, props.city && props.city !== name ? props.city : '', dept, 'Bolivia']
              .filter(Boolean)
              .join(', ');
            return {
              name: String(name),
              displayName: display,
              department: String(dept),
              lat,
              lon,
              dms: formatToMilitaryDMS(lat, lon),
              source: 'OSM_NOMINATIM' as const
            };
          })
          .filter(Boolean) as ResolvedLocationResult[];
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
