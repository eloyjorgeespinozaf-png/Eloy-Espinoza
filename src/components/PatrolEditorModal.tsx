/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { TacticalUnit } from '../types';
import {
  Shield, User, MapPin, Radio, Key, Battery, Fuel, Crosshair, Plus, Trash2,
  Check, X, Sliders, Eye, EyeOff, Search, Navigation, Map as MapIcon,
  Loader2, Sparkles, LocateFixed
} from 'lucide-react';
import { playSyntheticBeep, playChime } from '../utils/audio';
import { parseCoordinates, formatToMilitaryDMS } from '../utils/geo';
import {
  resolveBoliviaLocation,
  searchLocalBoliviaLocations,
  reverseGeocodeBolivia,
  ResolvedLocationResult
} from '../utils/boliviaLocations';

interface PatrolEditorModalProps {
  isOpen: boolean;
  mode: 'CREATE' | 'EDIT';
  patrol?: TacticalUnit | null;
  onClose: () => void;
  onSave: (unit: TacticalUnit) => void;
  onDelete?: (unitId: string) => void;
}

const SECTOR_PRESETS = [
  { name: 'Salar de Coipasa - Hito XIX', coords: '19°13\'10"S 68°35\'50"W', freq: '142.850 MHz' },
  { name: 'Paso Colchane / Pisiga - Hito XXIII', coords: '19°16\'40"S 68°37\'44"W', freq: '143.100 MHz' },
  { name: 'Tambo Quemado / Hito IV', coords: '18°17\'20"S 69°02\'30"W', freq: '142.150 MHz' },
  { name: 'Ollagüe / Frontera Sur', coords: '21°13\'30"S 68°15\'00"W', freq: '140.400 MHz' },
  { name: 'San Matías - Santa Cruz', coords: '16°21\'36"S 58°24\'16"W', freq: '144.250 MHz' },
  { name: 'Puerto Quijarro - Santa Cruz', coords: '19°00\'13"S 57°43\'04"W', freq: '144.400 MHz' },
  { name: 'Yacuiba - Tarija', coords: '22°00\'59"S 63°40\'39"W', freq: '143.500 MHz' },
  { name: 'Bermejo - Tarija', coords: '22°43\'56"S 64°20\'14"W', freq: '143.600 MHz' },
  { name: 'Villazón - Potosí', coords: '22°05\'12"S 65°35\'39"W', freq: '140.900 MHz' },
  { name: 'Cobija - Pando', coords: '11°01\'36"S 68°46\'09"W', freq: '145.100 MHz' },
  { name: 'Guayaramerín - Beni', coords: '10°49\'33"S 65°21\'24"W', freq: '145.300 MHz' },
  { name: 'Desaguadero - La Paz', coords: '16°34\'00"S 69°02\'00"W', freq: '141.800 MHz' }
];

const AVAILABLE_EQUIPMENT = [
  'Camioneta 4x4 Táctica',
  'Vehículo Blindado Ligero',
  'Dron VANT-01 Cóndor',
  'Dron VANT-02 Térmico',
  'Visor Térmico FLIR',
  'Visor Nocturno Infrarrojo',
  'Radio VHF Harris Falcon',
  'Sensor Radar Terrestre',
  'Rifle de Precisión 7.62mm',
  'Kit Brechero e Interdicción',
  'Lanzador de Fumígenos',
  'Terminal Satelital Ruggedized'
];

const TILE_LAYERS = {
  DARK: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO'
  },
  SATELLITE: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri'
  },
  STREETS: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap'
  }
} as const;

type MapLayerKey = keyof typeof TILE_LAYERS;

export const PatrolEditorModal: React.FC<PatrolEditorModalProps> = ({
  isOpen,
  mode,
  patrol,
  onClose,
  onSave,
  onDelete
}) => {
  const [name, setName] = useState('');
  const [commander, setCommander] = useState('');
  const [status, setStatus] = useState<'PATROLLING' | 'INTERCEPTING' | 'STATIONARY' | 'OFFLINE'>('PATROLLING');
  const [coordinates, setCoordinates] = useState('');
  const [decimalLat, setDecimalLat] = useState('');
  const [decimalLon, setDecimalLon] = useState('');
  const [sector, setSector] = useState('');
  const [personnel, setPersonnel] = useState(8);
  const [pin, setPin] = useState('1234');
  const [showPin, setShowPin] = useState(false);
  const [frequency, setFrequency] = useState('142.850 MHz');
  const [equipment, setEquipment] = useState<string[]>([]);
  const [battery, setBattery] = useState(95);
  const [fuel, setFuel] = useState(85);
  const [ammo, setAmmo] = useState(100);
  const [notes, setNotes] = useState('');
  const [customEquipInput, setCustomEquipInput] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Territorial Geocoding & Interactive Map Picker States
  const [placeSuggestions, setPlaceSuggestions] = useState<ResolvedLocationResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [geoFeedback, setGeoFeedback] = useState<{ type: 'ok' | 'info' | 'error'; text: string } | null>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapLayer, setMapLayer] = useState<MapLayerKey>('DARK');

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const suggestionsContainerRef = useRef<HTMLDivElement | null>(null);

  const syncDecimalsFromCoordString = (coordStr: string) => {
    const parsed = parseCoordinates(coordStr);
    if (parsed) {
      setDecimalLat(parsed.lat.toFixed(5));
      setDecimalLon(parsed.lon.toFixed(5));
    }
  };

  const applyLatLonPosition = (lat: number, lon: number, feedbackText?: string, panZoom?: number) => {
    const clampedLat = Math.max(-90, Math.min(90, lat));
    const clampedLon = Math.max(-180, Math.min(180, lon));
    const dms = formatToMilitaryDMS(clampedLat, clampedLon);
    setCoordinates(dms);
    setDecimalLat(clampedLat.toFixed(5));
    setDecimalLon(clampedLon.toFixed(5));

    if (mapInstanceRef.current && markerRef.current) {
      markerRef.current.setLatLng([clampedLat, clampedLon]);
      const targetZoom = panZoom ?? Math.max(mapInstanceRef.current.getZoom(), 9);
      mapInstanceRef.current.setView([clampedLat, clampedLon], targetZoom, { animate: true });
    }

    if (feedbackText) {
      setGeoFeedback({ type: 'ok', text: feedbackText });
    }
  };

  useEffect(() => {
    if (isOpen) {
      setConfirmDelete(false);
      setGeoFeedback(null);
      setPlaceSuggestions([]);
      setShowSuggestions(false);
      setShowMapPicker(false);

      if (mode === 'EDIT' && patrol) {
        const initCoords = patrol.coordinates || '19°13\'10"S 68°35\'50"W';
        setName(patrol.name || '');
        setCommander(patrol.commander || 'Oficial S-2');
        setStatus(patrol.status || 'PATROLLING');
        setCoordinates(initCoords);
        syncDecimalsFromCoordString(initCoords);
        setSector(patrol.sector || 'Salar de Coipasa - Hito XIX');
        setPersonnel(patrol.personnel || 8);
        setPin(patrol.pin || '1234');
        setFrequency(patrol.frequency || '142.850 MHz');
        setEquipment(patrol.equipment || ['Camioneta 4x4 Táctica', 'Radio VHF Harris']);
        setBattery(patrol.battery ?? 95);
        setFuel(patrol.fuel ?? 85);
        setAmmo(patrol.ammo ?? 100);
        setNotes(patrol.notes || '');
      } else {
        const nextNumber = Math.floor(4 + Math.random() * 6);
        const initCoords = SECTOR_PRESETS[0].coords;
        setName(`Patrulla Cóndor-${nextNumber}`);
        setCommander('SGTO2. C. Morales');
        setStatus('PATROLLING');
        setCoordinates(initCoords);
        syncDecimalsFromCoordString(initCoords);
        setSector(SECTOR_PRESETS[0].name);
        setPersonnel(8);
        setPin('1234');
        setFrequency(SECTOR_PRESETS[0].freq);
        setEquipment(['Camioneta 4x4 Táctica', 'VANT-01 Cóndor', 'Radio VHF Harris Falcon']);
        setBattery(100);
        setFuel(95);
        setAmmo(100);
        setNotes('Patrulla asignada al control fronterizo y detección de caravanas clandestinas.');
      }
    }
  }, [isOpen, mode, patrol]);

  // Close autocomplete dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        suggestionsContainerRef.current &&
        !suggestionsContainerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    if (showSuggestions) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showSuggestions]);

  // Initialize & teardown interactive Leaflet Map Picker of Bolivia
  useEffect(() => {
    if (!isOpen || !showMapPicker || !mapContainerRef.current) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
        tileLayerRef.current = null;
      }
      return;
    }

    const parsed = parseCoordinates(coordinates);
    const initialLat = parsed ? parsed.lat : -16.2902;
    const initialLon = parsed ? parsed.lon : -63.5887;
    const initialZoom = parsed ? 10 : 5;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLon],
      zoom: initialZoom,
      zoomControl: true
    });

    const layerConf = TILE_LAYERS[mapLayer];
    const tile = L.tileLayer(layerConf.url, {
      attribution: layerConf.attribution,
      maxZoom: 18
    }).addTo(map);
    tileLayerRef.current = tile;

    const tacticalPinIcon = L.divIcon({
      className: 'patrol-picker-pin',
      html: `<div style="width:22px;height:22px;border-radius:9999px;background:#eab308;border:3px solid #0b0c10;box-shadow:0 0 14px rgba(234,179,8,0.9);display:flex;align-items:center;justify-content:center;"><div style="width:6px;height:6px;border-radius:9999px;background:#0b0c10;"></div></div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });

    const marker = L.marker([initialLat, initialLon], {
      draggable: true,
      icon: tacticalPinIcon
    }).addTo(map);

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      const dms = formatToMilitaryDMS(pos.lat, pos.lng);
      setCoordinates(dms);
      setDecimalLat(pos.lat.toFixed(5));
      setDecimalLon(pos.lng.toFixed(5));
      setGeoFeedback({
        type: 'ok',
        text: `Pin ajustado manualmente: ${dms} (${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)})`
      });
      playSyntheticBeep(820, 0.04, 'sine');
    });

    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      const dms = formatToMilitaryDMS(lat, lng);
      setCoordinates(dms);
      setDecimalLat(lat.toFixed(5));
      setDecimalLon(lng.toFixed(5));
      setGeoFeedback({
        type: 'ok',
        text: `Ubicación fijada en mapa: ${dms} (${lat.toFixed(5)}, ${lng.toFixed(5)}) — Puedes seguir ajustando.`
      });
      playSyntheticBeep(880, 0.05, 'sine');
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;

    // Ensure Leaflet recalculates size inside animated modal
    const resizeTimer = setTimeout(() => {
      map.invalidateSize();
    }, 120);

    return () => {
      clearTimeout(resizeTimer);
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
      tileLayerRef.current = null;
    };
  }, [isOpen, showMapPicker]);

  // Switch tile layer cleanly without recreating map
  useEffect(() => {
    if (!mapInstanceRef.current || !showMapPicker) return;
    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }
    const layerConf = TILE_LAYERS[mapLayer];
    tileLayerRef.current = L.tileLayer(layerConf.url, {
      attribution: layerConf.attribution,
      maxZoom: 18
    }).addTo(mapInstanceRef.current);
  }, [mapLayer, showMapPicker]);

  if (!isOpen) return null;

  const parsedCurrentCoords = parseCoordinates(coordinates);

  const handleSelectPreset = (preset: typeof SECTOR_PRESETS[0]) => {
    setSector(preset.name);
    setCoordinates(preset.coords);
    syncDecimalsFromCoordString(preset.coords);
    setFrequency(preset.freq);
    setShowSuggestions(false);
    const parsed = parseCoordinates(preset.coords);
    if (parsed && mapInstanceRef.current && markerRef.current) {
      markerRef.current.setLatLng([parsed.lat, parsed.lon]);
      mapInstanceRef.current.setView([parsed.lat, parsed.lon], 10, { animate: true });
    }
    setGeoFeedback({
      type: 'ok',
      text: `Hito cargado: ${preset.name}. Puedes modificar las coordenadas libremente.`
    });
    playSyntheticBeep(750, 0.05, 'sine');
  };

  const handleSectorChange = (val: string) => {
    setSector(val);
    const matches = searchLocalBoliviaLocations(val, 6);
    setPlaceSuggestions(matches);
    setShowSuggestions(matches.length > 0 && val.trim().length >= 2);
  };

  const handlePickSuggestion = (loc: ResolvedLocationResult) => {
    const label = loc.department && !loc.name.toLowerCase().includes(loc.department.toLowerCase())
      ? `${loc.name} - ${loc.department}`
      : loc.name;
    setSector(label);
    setShowSuggestions(false);
    applyLatLonPosition(
      loc.lat,
      loc.lon,
      `Ubicado en ${loc.displayName}. Ahora puedes modificar las coordenadas manualmente o en el mapa.`,
      11
    );
    playSyntheticBeep(840, 0.06, 'sine');
  };

  const handleGeocodeSector = async () => {
    const query = sector.trim();
    if (!query) {
      setGeoFeedback({ type: 'error', text: 'Escriba un lugar, ciudad o hito de Bolivia para ubicarlo.' });
      return;
    }

    setIsGeocoding(true);
    setGeoFeedback({ type: 'info', text: `Buscando "${query}" en el territorio nacional...` });
    try {
      const results = await resolveBoliviaLocation(query);
      if (results.length > 0) {
        const best = results[0];
        setPlaceSuggestions(results);
        setShowSuggestions(results.length > 1);
        applyLatLonPosition(
          best.lat,
          best.lon,
          `Ubicado en ${best.displayName} (${best.dms}). Puedes editar las coordenadas libremente.`,
          11
        );
        playSyntheticBeep(900, 0.08, 'sine');
      } else {
        setGeoFeedback({
          type: 'error',
          text: `No se encontró "${query}" automáticamente. Ingresa las coordenadas manualmente o marca el punto en el Mapa de Bolivia.`
        });
      }
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleCoordinatesInputChange = (val: string) => {
    setCoordinates(val);
    const parsed = parseCoordinates(val);
    if (parsed) {
      setDecimalLat(parsed.lat.toFixed(5));
      setDecimalLon(parsed.lon.toFixed(5));
      if (mapInstanceRef.current && markerRef.current) {
        markerRef.current.setLatLng([parsed.lat, parsed.lon]);
        mapInstanceRef.current.panTo([parsed.lat, parsed.lon], { animate: true });
      }
    }
  };

  const handleDecimalChange = (newLatStr: string, newLonStr: string) => {
    setDecimalLat(newLatStr);
    setDecimalLon(newLonStr);
    const latNum = parseFloat(newLatStr);
    const lonNum = parseFloat(newLonStr);
    if (
      Number.isFinite(latNum) &&
      Number.isFinite(lonNum) &&
      latNum >= -90 &&
      latNum <= 90 &&
      lonNum >= -180 &&
      lonNum <= 180
    ) {
      const dms = formatToMilitaryDMS(latNum, lonNum);
      setCoordinates(dms);
      if (mapInstanceRef.current && markerRef.current) {
        markerRef.current.setLatLng([latNum, lonNum]);
        mapInstanceRef.current.panTo([latNum, lonNum], { animate: true });
      }
    }
  };

  const handleFormatToDMS = () => {
    const parsed = parseCoordinates(coordinates);
    if (parsed) {
      const dms = formatToMilitaryDMS(parsed.lat, parsed.lon);
      setCoordinates(dms);
      setDecimalLat(parsed.lat.toFixed(5));
      setDecimalLon(parsed.lon.toFixed(5));
      setGeoFeedback({ type: 'ok', text: `Coordenadas estandarizadas a formato militar DMS: ${dms}` });
      playSyntheticBeep(780, 0.05, 'sine');
    } else {
      setGeoFeedback({
        type: 'error',
        text: 'Formato no reconocido. Use DMS (ej: 16°21\'36"S 58°24\'16"W) o Decimal (ej: -16.3600, -58.4044).'
      });
    }
  };

  const handleUseDeviceGPS = () => {
    if (!navigator.geolocation) {
      setGeoFeedback({ type: 'error', text: 'Geolocalización GPS no disponible en este navegador.' });
      return;
    }
    setIsLocatingGps(true);
    setGeoFeedback({ type: 'info', text: 'Obteniendo señal GPS del dispositivo...' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocatingGps(false);
        const { latitude, longitude, accuracy } = pos.coords;
        applyLatLonPosition(
          latitude,
          longitude,
          `GPS real capturado (±${Math.round(accuracy)}m). Puedes ajustar las coordenadas si lo requieres.`,
          13
        );
        playSyntheticBeep(950, 0.08, 'sine');
      },
      () => {
        setIsLocatingGps(false);
        setGeoFeedback({
          type: 'error',
          text: 'No se pudo obtener el GPS del dispositivo. Verifique permisos o ingrese las coordenadas manualmente.'
        });
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleDetectSectorFromPin = async () => {
    const parsed = parseCoordinates(coordinates);
    if (!parsed) {
      setGeoFeedback({ type: 'error', text: 'Primero ingrese o seleccione coordenadas válidas.' });
      return;
    }
    setIsReverseGeocoding(true);
    try {
      const detected = await reverseGeocodeBolivia(parsed.lat, parsed.lon);
      if (detected) {
        setSector(detected);
        setGeoFeedback({
          type: 'ok',
          text: `Sector detectado: ${detected}. Las coordenadas siguen siendo editables.`
        });
        playSyntheticBeep(820, 0.05, 'sine');
      } else {
        setGeoFeedback({ type: 'info', text: 'No se pudo identificar nombre de sector exacto para este punto.' });
      }
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  const handleToggleEquipment = (item: string) => {
    if (equipment.includes(item)) {
      setEquipment(equipment.filter(e => e !== item));
    } else {
      setEquipment([...equipment, item]);
    }
  };

  const handleAddCustomEquipment = () => {
    if (customEquipInput.trim() && !equipment.includes(customEquipInput.trim())) {
      setEquipment([...equipment, customEquipInput.trim()]);
      setCustomEquipInput('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Normalize decimal or DMS input cleanly into standardized Military DMS for map/3D compatibility
    let finalCoordinates = coordinates.trim();
    const parsed = parseCoordinates(finalCoordinates);
    if (parsed) {
      finalCoordinates = formatToMilitaryDMS(parsed.lat, parsed.lon);
    } else if (!finalCoordinates) {
      finalCoordinates = '19°13\'10"S 68°35\'50"W';
    }

    const unitData: TacticalUnit = {
      id: mode === 'EDIT' && patrol ? patrol.id : `unit-${Date.now()}`,
      name: name.trim(),
      commander: commander.trim() || 'Comandante de Patrulla',
      status: status,
      coordinates: finalCoordinates,
      sector: sector.trim() || 'Sector Nacional Bolivia',
      personnel: Number(personnel) || 6,
      pin: pin.trim() || '1234',
      frequency: frequency.trim() || '142.850 MHz',
      equipment: equipment.length > 0 ? equipment : ['Camioneta Táctica', 'Radio VHF'],
      battery: Number(battery),
      fuel: Number(fuel),
      ammo: Number(ammo),
      notes: notes.trim(),
      lastReportTime: new Date().toISOString(),
      createdAt: mode === 'EDIT' && patrol?.createdAt ? patrol.createdAt : new Date().toISOString()
    };

    playChime();
    onSave(unitData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-[#0b0c10] border-2 border-yellow-500/70 rounded-2xl max-w-3xl w-full p-6 shadow-[0_0_50px_rgba(234,179,8,0.25)] text-left relative my-8 font-mono max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-yellow-500/30 pb-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-yellow-500/20 border border-yellow-500/40">
              {mode === 'CREATE' ? (
                <Plus className="w-5 h-5 text-yellow-400" />
              ) : (
                <Sliders className="w-5 h-5 text-yellow-400" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-white uppercase tracking-wider">
                {mode === 'CREATE' ? 'DESPLEGAR NUEVA PATRULLA TÁCTICA' : 'EDITAR DATOS DE PATRULLA ASIGNADA'}
              </h2>
              <p className="text-[11px] text-yellow-400/80">
                {mode === 'CREATE'
                  ? 'Despliegue geográfico en cualquier punto del territorio nacional con coordenadas editables'
                  : `Ajuste de parámetros operacionales y posicionamiento territorial para ${name || 'la patrulla'}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* Main info row: Name, Commander, Personnel */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-neutral-300 uppercase mb-1">
                Indicativo / Nombre Patrulla *
              </label>
              <div className="relative">
                <Shield className="w-3.5 h-3.5 text-yellow-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  required
                  value={name || ''}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Patrulla Cóndor-4"
                  className="w-full bg-[#141620] border border-neutral-700 rounded-lg pl-8 pr-2.5 py-1.5 text-white focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-neutral-300 uppercase mb-1">
                Comandante / Jefe de Patrulla *
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  required
                  value={commander || ''}
                  onChange={(e) => setCommander(e.target.value)}
                  placeholder="e.g. CB1. F. Valenzuela"
                  className="w-full bg-[#141620] border border-neutral-700 rounded-lg pl-8 pr-2.5 py-1.5 text-white focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-neutral-300 uppercase mb-1">
                Efectivos (Soldados/Agentes)
              </label>
              <input
                type="number"
                min={1}
                max={50}
                required
                value={personnel ?? 8}
                onChange={(e) => setPersonnel(parseInt(e.target.value) || 1)}
                className="w-full bg-[#141620] border border-neutral-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-yellow-400"
              />
            </div>
          </div>

          {/* Security & Comms Row: PIN, Frequency, Operational Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-xl bg-[#10121a] border border-yellow-500/20">
            <div>
              <label className="block text-[10px] font-bold text-yellow-400 uppercase mb-1 flex items-center justify-between">
                <span>CONTRASEÑA / PIN DE ACCESO *</span>
                <span className="text-[9px] text-neutral-400">Para entrar a su módulo</span>
              </label>
              <div className="relative flex items-center">
                <Key className="w-3.5 h-3.5 text-yellow-500 absolute left-2.5" />
                <input
                  type={showPin ? 'text' : 'password'}
                  required
                  value={pin || ''}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="e.g. 1234"
                  className="w-full bg-[#181a26] border border-yellow-500/40 rounded-lg pl-8 pr-8 py-1.5 text-yellow-300 font-bold focus:outline-none focus:border-yellow-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-2 text-neutral-400 hover:text-white cursor-pointer"
                >
                  {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-neutral-300 uppercase mb-1">
                Canal / Frecuencia VHF
              </label>
              <div className="relative">
                <Radio className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  required
                  value={frequency || ''}
                  onChange={(e) => setFrequency(e.target.value)}
                  placeholder="e.g. 142.850 MHz"
                  className="w-full bg-[#181a26] border border-neutral-700 rounded-lg pl-8 pr-2.5 py-1.5 text-white focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-neutral-300 uppercase mb-1">
                Estado Operacional
              </label>
              <select
                value={status || 'PATROLLING'}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-[#181a26] border border-neutral-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-yellow-400 font-bold"
              >
                <option value="PATROLLING">🟢 PATRULLAJE ACTIVO (PATROLLING)</option>
                <option value="INTERCEPTING">🟠 INTERDICCIÓN EN CURSO (INTERCEPTING)</option>
                <option value="STATIONARY">🔵 PUESTO DE CONTROL ESTACIONARIO</option>
                <option value="OFFLINE">🔴 EN BASE / FUERA DE LÍNEA (OFFLINE)</option>
              </select>
            </div>
          </div>

          {/* Coordinates, National Place Geocoder & Interactive Bolivia Map Picker */}
          <div className="space-y-2.5 p-3 rounded-xl bg-[#0e1018] border border-cyan-500/25">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-[10px] font-bold text-cyan-300 uppercase flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                Sector y Coordenadas Geográficas (Todo el Territorio Nacional)
              </label>
              <span className="text-[9px] text-neutral-400">
                Ubica cualquier lugar de Bolivia y modifica las coordenadas libremente
              </span>
            </div>

            {/* Quick National Border & Strategic Presets */}
            <div className="flex flex-wrap gap-1.5">
              {SECTOR_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className={`px-2 py-1 rounded text-[10px] border transition-all cursor-pointer ${
                    sector === p.name
                      ? 'bg-yellow-500/20 border-yellow-500/60 text-yellow-300 font-bold'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                  }`}
                >
                  {p.name.split('-')[0].trim()}
                </button>
              ))}
            </div>

            {/* Sector / Place Name with Autocomplete & Geocoder + Editable Coordinates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div ref={suggestionsContainerRef} className="relative">
                <label className="block text-[9px] text-neutral-400 uppercase mb-0.5">
                  Nombre de Sector / Lugar / Hito (Ej. San Matías, Cobija, Yacuiba...)
                </label>
                <div className="flex gap-1.5">
                  <div className="relative flex-1">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      required
                      value={sector || ''}
                      onChange={(e) => handleSectorChange(e.target.value)}
                      onFocus={() => {
                        const matches = searchLocalBoliviaLocations(sector, 6);
                        if (matches.length > 0 && sector.trim().length >= 2) {
                          setPlaceSuggestions(matches);
                          setShowSuggestions(true);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleGeocodeSector();
                        }
                      }}
                      placeholder="Ej: San Matías, Puerto Quijarro, Desaguadero..."
                      className="w-full bg-[#141620] border border-neutral-700 rounded-lg pl-8 pr-2.5 py-1.5 text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleGeocodeSector}
                    disabled={isGeocoding}
                    title="Buscar coordenadas automáticas de este lugar en Bolivia (luego podrás modificarlas)"
                    className="px-2.5 py-1.5 rounded-lg bg-cyan-600/25 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/50 text-[10px] font-bold flex items-center gap-1 whitespace-nowrap transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isGeocoding ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Search className="w-3.5 h-3.5" />
                    )}
                    Ubicar
                  </button>
                </div>

                {/* Autocomplete Suggestions Dropdown */}
                {showSuggestions && placeSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-[#0d1018] border border-cyan-500/50 rounded-lg shadow-2xl max-h-48 overflow-y-auto divide-y divide-neutral-800/80">
                    {placeSuggestions.map((loc, idx) => (
                      <button
                        key={`${loc.name}-${loc.lat}-${idx}`}
                        type="button"
                        onClick={() => handlePickSuggestion(loc)}
                        className="w-full text-left px-2.5 py-1.5 hover:bg-cyan-500/15 transition-colors cursor-pointer flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="text-[11px] font-bold text-white truncate">{loc.name}</div>
                          <div className="text-[9px] text-neutral-400 truncate">{loc.displayName}</div>
                        </div>
                        <span className="text-[9px] text-cyan-300 font-mono shrink-0">{loc.dms}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <label className="block text-[9px] text-neutral-400 uppercase">
                    Coordenadas Lat / Lon (DMS o Decimal — Editables)
                  </label>
                  {coordinates.trim() && (
                    <span
                      className={`text-[9px] font-bold ${
                        parsedCurrentCoords ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {parsedCurrentCoords ? '✓ Coordenadas válidas' : '⚠ Revisar formato'}
                    </span>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    required
                    value={coordinates || ''}
                    onChange={(e) => handleCoordinatesInputChange(e.target.value)}
                    placeholder={'Ej: 16°21\'36"S 58°24\'16"W o -16.3600, -58.4044'}
                    className="flex-1 bg-[#141620] border border-neutral-700 rounded-lg px-2.5 py-1.5 text-yellow-200 font-mono focus:outline-none focus:border-yellow-400"
                  />
                  <button
                    type="button"
                    onClick={handleFormatToDMS}
                    title="Convertir a formato militar DMS estándar"
                    className="px-2 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-[10px] font-bold whitespace-nowrap cursor-pointer"
                  >
                    DMS
                  </button>
                </div>
              </div>
            </div>

            {/* Fine-Tuning Editable Decimal Lat / Lon Row + Tactical Tools */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end pt-1">
              <div className="sm:col-span-3">
                <label className="block text-[9px] text-neutral-400 uppercase mb-0.5">
                  Latitud Decimal (Ajuste Fino)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min={-90}
                  max={90}
                  value={decimalLat}
                  onChange={(e) => handleDecimalChange(e.target.value, decimalLon)}
                  placeholder="-16.36000"
                  className="w-full bg-[#141620] border border-neutral-700/90 rounded-lg px-2 py-1 text-[11px] text-cyan-200 font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[9px] text-neutral-400 uppercase mb-0.5">
                  Longitud Decimal (Ajuste Fino)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min={-180}
                  max={180}
                  value={decimalLon}
                  onChange={(e) => handleDecimalChange(decimalLat, e.target.value)}
                  placeholder="-58.40440"
                  className="w-full bg-[#141620] border border-neutral-700/90 rounded-lg px-2 py-1 text-[11px] text-cyan-200 font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="sm:col-span-6 flex flex-wrap gap-1.5 justify-start sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowMapPicker(prev => !prev)}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border flex items-center gap-1 transition-all cursor-pointer ${
                    showMapPicker
                      ? 'bg-yellow-500/25 border-yellow-400 text-yellow-200'
                      : 'bg-[#151824] border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/15'
                  }`}
                >
                  <MapIcon className="w-3.5 h-3.5" />
                  {showMapPicker ? 'Ocultar Mapa' : 'Ubicar en Mapa de Bolivia'}
                </button>

                <button
                  type="button"
                  onClick={handleUseDeviceGPS}
                  disabled={isLocatingGps}
                  title="Usar la ubicación GPS actual del dispositivo"
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isLocatingGps ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <LocateFixed className="w-3.5 h-3.5" />
                  )}
                  Mi GPS
                </button>

                <button
                  type="button"
                  onClick={handleDetectSectorFromPin}
                  disabled={isReverseGeocoding || !parsedCurrentCoords}
                  title="Detectar automáticamente el nombre del lugar según las coordenadas actuales"
                  className="px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40"
                >
                  {isReverseGeocoding ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                  )}
                  Detectar Lugar
                </button>
              </div>
            </div>

            {/* Geocoder / Coordinate Feedback Banner */}
            {geoFeedback && (
              <div
                className={`px-2.5 py-1.5 rounded-lg text-[10px] border flex items-center justify-between gap-2 ${
                  geoFeedback.type === 'ok'
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : geoFeedback.type === 'error'
                    ? 'bg-red-950/40 border-red-500/40 text-red-300'
                    : 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300'
                }`}
              >
                <span>{geoFeedback.text}</span>
                <button
                  type="button"
                  onClick={() => setGeoFeedback(null)}
                  className="text-neutral-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Embedded Interactive Map of Bolivia (Click Anywhere or Drag Tactical Pin) */}
            {showMapPicker && (
              <div className="space-y-1.5 pt-1">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
                  <span className="text-yellow-300/90 flex items-center gap-1">
                    <Navigation className="w-3 h-3" />
                    Haz clic en cualquier punto del territorio nacional o arrastra el marcador amarillo
                  </span>
                  <div className="flex items-center gap-1">
                    {(['DARK', 'SATELLITE', 'STREETS'] as MapLayerKey[]).map((layerKey) => (
                      <button
                        key={layerKey}
                        type="button"
                        onClick={() => setMapLayer(layerKey)}
                        className={`px-2 py-0.5 rounded text-[9px] font-bold border cursor-pointer ${
                          mapLayer === layerKey
                            ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200'
                            : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:text-white'
                        }`}
                      >
                        {layerKey === 'DARK' ? 'Táctico' : layerKey === 'SATELLITE' ? 'Satélite' : 'Calles'}
                      </button>
                    ))}
                  </div>
                </div>
                <div
                  ref={mapContainerRef}
                  className="w-full h-56 rounded-xl border border-yellow-500/40 overflow-hidden bg-[#090b10]"
                />
              </div>
            )}
          </div>

          {/* Supplies Gauges */}
          <div className="grid grid-cols-3 gap-3 p-2.5 rounded-xl bg-[#0f1118] border border-neutral-800">
            <div>
              <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-1">
                <span className="flex items-center gap-1"><Battery className="w-3 h-3 text-emerald-400" /> Batería Terminal</span>
                <span className="font-bold text-white">{battery}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                value={battery ?? 100}
                onChange={(e) => setBattery(parseInt(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-1">
                <span className="flex items-center gap-1"><Fuel className="w-3 h-3 text-amber-400" /> Combustible Vehicular</span>
                <span className="font-bold text-white">{fuel}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={fuel ?? 100}
                onChange={(e) => setFuel(parseInt(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-1">
                <span className="flex items-center gap-1"><Crosshair className="w-3 h-3 text-blue-400" /> Munición / Dotación</span>
                <span className="font-bold text-white">{ammo}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={ammo ?? 100}
                onChange={(e) => setAmmo(parseInt(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>
          </div>

          {/* Equipment Selector */}
          <div>
            <label className="block text-[10px] font-bold text-neutral-300 uppercase mb-1.5">
              Equipamiento Asignado a la Unidad
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-[#12141c] border border-neutral-800 rounded-lg">
              {AVAILABLE_EQUIPMENT.map(item => {
                const isSelected = equipment.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleToggleEquipment(item)}
                    className={`px-2 py-0.5 rounded text-[10px] transition-all cursor-pointer flex items-center gap-1 border ${
                      isSelected
                        ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300'
                        : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-yellow-400" />}
                    {item}
                  </button>
                );
              })}
            </div>

            {/* Custom Equipment Input */}
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={customEquipInput || ''}
                onChange={(e) => setCustomEquipInput(e.target.value)}
                placeholder="Añadir otro equipo táctico..."
                className="flex-1 bg-[#141620] border border-neutral-700 rounded-lg px-2.5 py-1 text-white text-[11px] focus:outline-none focus:border-yellow-400"
              />
              <button
                type="button"
                onClick={handleAddCustomEquipment}
                className="px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-[11px] font-bold cursor-pointer"
              >
                + Añadir
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
            {mode === 'EDIT' && onDelete && patrol ? (
              <div>
                {!confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="px-3 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-900/50 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Replegar / Eliminar
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-red-400 font-bold">¿Confirmar?</span>
                    <button
                      type="button"
                      onClick={() => {
                        onDelete(patrol.id);
                        onClose();
                      }}
                      className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold cursor-pointer"
                    >
                      Sí, Replegar
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="px-2 py-1 rounded-lg bg-neutral-800 text-neutral-300 text-[11px] cursor-pointer"
                    >
                      No
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 text-xs font-bold transition-all cursor-pointer"
              >
                CANCELAR
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-black font-extrabold text-xs flex items-center gap-1.5 shadow-[0_0_20px_rgba(234,179,8,0.3)] transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                {mode === 'CREATE' ? 'DESPLEGAR PATRULLA' : 'GUARDAR CAMBIOS'}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
