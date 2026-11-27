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
import { requestDeviceLocation } from '../utils/deviceLocation';
import {
  resolveBoliviaLocation,
  searchLocalBoliviaLocations,
  findBestInstantBoliviaMatch,
  detectDepartmentHintInQuery,
  reverseGeocodeBolivia,
  BOLIVIA_DEPARTMENTS,
  BOLIVIA_BOUNDS,
  isInsideBolivia,
  ResolvedLocationResult,
  BoliviaDepartmentView
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
  STREETS: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap'
  },
  SATELLITE: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri'
  },
  TOPO: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap &copy; OpenTopoMap'
  },
  DARK: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO'
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
  const [geoFeedback, setGeoFeedback] = useState<{ type: 'ok' | 'info' | 'warn' | 'error'; text: string } | null>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapLayer, setMapLayer] = useState<MapLayerKey>('STREETS');
  const [followMapCenter, setFollowMapCenter] = useState(true);
  const [isUnknownPlaceMode, setIsUnknownPlaceMode] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const suggestionsContainerRef = useRef<HTMLDivElement | null>(null);
  const followMapCenterRef = useRef<boolean>(true);
  const isProgrammaticMapMoveRef = useRef<boolean>(false);
  const pendingMapViewRef = useRef<{ lat: number; lon: number; zoom: number } | null>(null);
  const autoGeocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoGeocodeReqIdRef = useRef<number>(0);

  useEffect(() => {
    followMapCenterRef.current = followMapCenter;
  }, [followMapCenter]);

  const moveMapProgrammatically = (lat: number, lon: number, zoom?: number) => {
    const map = mapInstanceRef.current;
    const marker = markerRef.current;
    if (!map || !marker) {
      pendingMapViewRef.current = { lat, lon, zoom: zoom ?? 11 };
      return;
    }
    isProgrammaticMapMoveRef.current = true;
    marker.setLatLng([lat, lon]);
    const targetZoom = zoom ?? Math.max(map.getZoom(), 10);
    map.setView([lat, lon], targetZoom, { animate: true });
    window.setTimeout(() => {
      isProgrammaticMapMoveRef.current = false;
    }, 350);
  };

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
    setIsUnknownPlaceMode(false);

    moveMapProgrammatically(clampedLat, clampedLon, panZoom);

    if (feedbackText) {
      setGeoFeedback({ type: 'ok', text: feedbackText });
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (autoGeocodeTimerRef.current) {
        clearTimeout(autoGeocodeTimerRef.current);
        autoGeocodeTimerRef.current = null;
      }
      autoGeocodeReqIdRef.current += 1;
      pendingMapViewRef.current = null;
      setConfirmDelete(false);
      setGeoFeedback(null);
      setPlaceSuggestions([]);
      setShowSuggestions(false);
      setShowMapPicker(false);
      setIsUnknownPlaceMode(false);
      setFollowMapCenter(true);

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

  // Cleanup pending auto-geocode timer on unmount
  useEffect(() => {
    return () => {
      if (autoGeocodeTimerRef.current) {
        clearTimeout(autoGeocodeTimerRef.current);
      }
    };
  }, []);

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

    const pendingView = pendingMapViewRef.current;
    pendingMapViewRef.current = null;
    const parsed = parseCoordinates(coordinates);
    const initialLat = pendingView ? pendingView.lat : parsed ? parsed.lat : BOLIVIA_BOUNDS.centerLat;
    const initialLon = pendingView ? pendingView.lon : parsed ? parsed.lon : BOLIVIA_BOUNDS.centerLon;
    const initialZoom = pendingView ? pendingView.zoom : parsed ? 10 : 6;

    const boliviaMaxBounds = L.latLngBounds(
      L.latLng(-25.5, -73.0),
      L.latLng(-7.5, -54.5)
    );

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLon],
      zoom: initialZoom,
      minZoom: 5,
      maxZoom: 18,
      maxBounds: boliviaMaxBounds,
      maxBoundsViscosity: 0.7,
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
      html: `<div style="width:24px;height:24px;border-radius:9999px;background:#eab308;border:3px solid #0b0c10;box-shadow:0 0 16px rgba(234,179,8,0.95);display:flex;align-items:center;justify-content:center;"><div style="width:6px;height:6px;border-radius:9999px;background:#0b0c10;"></div></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    const marker = L.marker([initialLat, initialLon], {
      draggable: true,
      icon: tacticalPinIcon
    }).addTo(map);

    const updateFromLatLng = (lat: number, lng: number, feedback?: string, beepFreq?: number) => {
      const dms = formatToMilitaryDMS(lat, lng);
      setCoordinates(dms);
      setDecimalLat(lat.toFixed(5));
      setDecimalLon(lng.toFixed(5));
      if (feedback) {
        setGeoFeedback({
          type: isInsideBolivia(lat, lng) ? 'ok' : 'warn',
          text: feedback
        });
      }
      if (beepFreq) {
        playSyntheticBeep(beepFreq, 0.04, 'sine');
      }
    };

    // Live updates while moving/panning the map (Mira Central mode)
    map.on('move', () => {
      if (isProgrammaticMapMoveRef.current || !followMapCenterRef.current) return;
      const center = map.getCenter();
      marker.setLatLng([center.lat, center.lng]);
      const dms = formatToMilitaryDMS(center.lat, center.lng);
      setCoordinates(dms);
      setDecimalLat(center.lat.toFixed(5));
      setDecimalLon(center.lng.toFixed(5));
    });

    map.on('moveend', () => {
      if (isProgrammaticMapMoveRef.current || !followMapCenterRef.current) return;
      const center = map.getCenter();
      marker.setLatLng([center.lat, center.lng]);
      const dms = formatToMilitaryDMS(center.lat, center.lng);
      const inside = isInsideBolivia(center.lat, center.lng);
      updateFromLatLng(
        center.lat,
        center.lng,
        inside
          ? `Coordenadas obtenidas al mover el mapa: ${dms} (${center.lat.toFixed(5)}, ${center.lng.toFixed(5)})`
          : `Atención: punto fuera de límites de Bolivia (${dms}). Desplaza el mapa hacia territorio nacional.`
      );
    });

    // Live updates while dragging the yellow tactical pin
    marker.on('drag', () => {
      const pos = marker.getLatLng();
      const dms = formatToMilitaryDMS(pos.lat, pos.lng);
      setCoordinates(dms);
      setDecimalLat(pos.lat.toFixed(5));
      setDecimalLon(pos.lng.toFixed(5));
    });

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      const dms = formatToMilitaryDMS(pos.lat, pos.lng);
      const inside = isInsideBolivia(pos.lat, pos.lng);
      updateFromLatLng(
        pos.lat,
        pos.lng,
        inside
          ? `Pin ajustado manualmente: ${dms} (${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)})`
          : `Atención: pin fuera de territorio de Bolivia (${dms}).`,
        820
      );
    });

    // Click anywhere on Bolivia map to jump pin & extract coordinates immediately
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      if (followMapCenterRef.current) {
        isProgrammaticMapMoveRef.current = true;
        map.panTo([lat, lng], { animate: true });
        window.setTimeout(() => {
          isProgrammaticMapMoveRef.current = false;
        }, 300);
      }
      const dms = formatToMilitaryDMS(lat, lng);
      const inside = isInsideBolivia(lat, lng);
      updateFromLatLng(
        lat,
        lng,
        inside
          ? `Ubicación fijada en mapa de Bolivia: ${dms} (${lat.toFixed(5)}, ${lng.toFixed(5)})`
          : `Punto marcado (${dms}). Verifica que se encuentre dentro de Bolivia.`,
        880
      );
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
    if (autoGeocodeTimerRef.current) {
      clearTimeout(autoGeocodeTimerRef.current);
      autoGeocodeTimerRef.current = null;
    }
    autoGeocodeReqIdRef.current += 1;
    setSector(preset.name);
    setCoordinates(preset.coords);
    syncDecimalsFromCoordString(preset.coords);
    setFrequency(preset.freq);
    setShowSuggestions(false);
    setIsUnknownPlaceMode(false);
    const parsed = parseCoordinates(preset.coords);
    if (parsed) {
      moveMapProgrammatically(parsed.lat, parsed.lon, 10);
    }
    setGeoFeedback({
      type: 'ok',
      text: `Hito cargado: ${preset.name}. Puedes modificar las coordenadas o mover el mapa libremente.`
    });
    playSyntheticBeep(750, 0.05, 'sine');
  };

  const openMapForUnknownPlace = (query: string) => {
    const deptHint = detectDepartmentHintInQuery(query);
    const targetLat = deptHint ? deptHint.lat : BOLIVIA_BOUNDS.centerLat;
    const targetLon = deptHint ? deptHint.lon : BOLIVIA_BOUNDS.centerLon;
    const targetZoom = deptHint ? deptHint.zoom : 6;

    setIsUnknownPlaceMode(true);
    setFollowMapCenter(true);
    setShowSuggestions(false);

    if (showMapPicker && mapInstanceRef.current && markerRef.current) {
      moveMapProgrammatically(targetLat, targetLon, targetZoom);
    } else {
      pendingMapViewRef.current = { lat: targetLat, lon: targetLon, zoom: targetZoom };
      setShowMapPicker(true);
    }

    setGeoFeedback({
      type: 'warn',
      text: deptHint
        ? `Lugar "${query}" no encontrado en el registro. Se abrió el mapa en ${deptHint.label}: desplaza el mapa o haz clic para obtener sus coordenadas.`
        : `Lugar "${query}" no conocido en el registro de Bolivia. Muévete por el mapa (arrastra, haz zoom o haz clic) para obtener las coordenadas exactas.`
    });
  };

  const executeBoliviaGeocode = async (queryRaw: string, isAuto: boolean) => {
    const query = queryRaw.trim();
    if (!query) {
      if (!isAuto) {
        setGeoFeedback({ type: 'error', text: 'Escriba un lugar, ciudad, comunidad o hito de Bolivia para ubicarlo.' });
      }
      return;
    }

    const reqId = ++autoGeocodeReqIdRef.current;
    setIsGeocoding(true);
    if (!isAuto) {
      setGeoFeedback({ type: 'info', text: `Buscando "${query}" en todo el territorio de Bolivia...` });
    }

    try {
      const results = await resolveBoliviaLocation(query);
      // Ignore stale responses if the operator kept typing
      if (reqId !== autoGeocodeReqIdRef.current) return;

      if (results.length > 0) {
        const best = results[0];
        setPlaceSuggestions(results);
        setShowSuggestions(!isAuto && results.length > 1);
        applyLatLonPosition(
          best.lat,
          best.lon,
          `✓ Coordenadas de ${best.displayName}: ${best.dms}. Puedes ajustarlas manualmente o en el mapa.`,
          11
        );
        if (!isAuto) {
          playSyntheticBeep(900, 0.08, 'sine');
        }
      } else {
        setPlaceSuggestions([]);
        openMapForUnknownPlace(query);
      }
    } finally {
      if (reqId === autoGeocodeReqIdRef.current) {
        setIsGeocoding(false);
      }
    }
  };

  const handleSectorChange = (val: string) => {
    setSector(val);
    if (autoGeocodeTimerRef.current) {
      clearTimeout(autoGeocodeTimerRef.current);
      autoGeocodeTimerRef.current = null;
    }

    const trimmed = val.trim();
    const matches = searchLocalBoliviaLocations(trimmed, 6);
    setPlaceSuggestions(matches);
    setShowSuggestions(matches.length > 0 && trimmed.length >= 2);

    if (trimmed.length < 3) {
      autoGeocodeReqIdRef.current += 1;
      setIsGeocoding(false);
      return;
    }

    // 1. Zero-latency auto-coordinates when matching a known Bolivian city/town/border immediately
    const instantMatch = findBestInstantBoliviaMatch(trimmed);
    if (instantMatch) {
      autoGeocodeReqIdRef.current += 1;
      setIsGeocoding(false);
      applyLatLonPosition(
        instantMatch.lat,
        instantMatch.lon,
        `✓ Ubicación automática en Bolivia: ${instantMatch.displayName} (${instantMatch.dms})`,
        11
      );
      return;
    }

    // 2. Automatic debounced search across ALL of Bolivia (Nominatim + Photon) as user finishes typing
    autoGeocodeTimerRef.current = setTimeout(() => {
      void executeBoliviaGeocode(trimmed, true);
    }, 600);
  };

  const handlePickSuggestion = (loc: ResolvedLocationResult) => {
    if (autoGeocodeTimerRef.current) {
      clearTimeout(autoGeocodeTimerRef.current);
      autoGeocodeTimerRef.current = null;
    }
    autoGeocodeReqIdRef.current += 1;
    setIsGeocoding(false);
    const label = loc.department && !loc.name.toLowerCase().includes(loc.department.toLowerCase())
      ? `${loc.name} - ${loc.department}`
      : loc.name;
    setSector(label);
    setShowSuggestions(false);
    applyLatLonPosition(
      loc.lat,
      loc.lon,
      `✓ Ubicado en ${loc.displayName} (${loc.dms}). Puedes mover el mapa o editar las coordenadas.`,
      11
    );
    playSyntheticBeep(840, 0.06, 'sine');
  };

  const handleGeocodeSector = async () => {
    if (autoGeocodeTimerRef.current) {
      clearTimeout(autoGeocodeTimerRef.current);
      autoGeocodeTimerRef.current = null;
    }
    await executeBoliviaGeocode(sector, false);
  };

  const handleJumpDepartment = (dept: BoliviaDepartmentView) => {
    const dms = formatToMilitaryDMS(dept.lat, dept.lon);
    setCoordinates(dms);
    setDecimalLat(dept.lat.toFixed(5));
    setDecimalLon(dept.lon.toFixed(5));
    moveMapProgrammatically(dept.lat, dept.lon, dept.zoom);
    setGeoFeedback({
      type: 'info',
      text:
        dept.id === 'ALL'
          ? 'Vista completa de Bolivia. Haz zoom y desplaza el mapa hasta el lugar exacto.'
          : `Mapa centrado en ${dept.label} (${dms}). Desplaza el mapa o haz clic para afinar las coordenadas.`
    });
    playSyntheticBeep(760, 0.04, 'sine');
  };

  const handleCoordinatesInputChange = (val: string) => {
    setCoordinates(val);
    const parsed = parseCoordinates(val);
    if (parsed) {
      setDecimalLat(parsed.lat.toFixed(5));
      setDecimalLon(parsed.lon.toFixed(5));
      moveMapProgrammatically(parsed.lat, parsed.lon);
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
      moveMapProgrammatically(latNum, lonNum);
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

  const handleUseDeviceGPS = async () => {
    setIsLocatingGps(true);
    setGeoFeedback({ type: 'info', text: 'Obteniendo ubicación real de esta terminal (GNSS / Wi-Fi / Red)...' });
    try {
      const loc = await requestDeviceLocation({ allowIpFallback: true });
      setIsLocatingGps(false);
      const accuracyTxt = loc.accuracy ? `±${Math.round(loc.accuracy)}m` : 'Aprox.';
      const placeTxt = loc.locationName ? ` (${loc.locationName})` : '';
      applyLatLonPosition(
        loc.lat,
        loc.lon,
        `Ubicación de terminal fijada vía ${loc.sourceLabel || 'GPS'} (${accuracyTxt})${placeTxt}. Puedes ajustar las coordenadas si lo requieres.`,
        loc.source === 'IP_FALLBACK' ? 11 : 13
      );
      if (loc.locationName && !sector.trim()) {
        setSector(loc.locationName);
      }
      playSyntheticBeep(950, 0.08, 'sine');
    } catch (err: any) {
      setIsLocatingGps(false);
      setGeoFeedback({
        type: 'error',
        text: err?.error || 'No se pudo obtener la ubicación de esta terminal. Verifique permisos o ingrese las coordenadas manualmente.'
      });
    }
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
                Sector y Coordenadas Geográficas (Todo el Territorio de Bolivia)
              </label>
              <span className="text-[9px] text-neutral-400">
                Al escribir el lugar aparecen sus coordenadas; si no es conocido, muévete en el mapa
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

            {/* Sector / Place Name with Auto-Geocoder + Editable Coordinates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div ref={suggestionsContainerRef} className="relative">
                <label className="block text-[9px] text-neutral-400 uppercase mb-0.5">
                  Lugar / Municipio / Comunidad / Hito en Bolivia (Auto-Ubica al Escribir)
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
                      placeholder="Ej: San Matías, Mizque, Samaipata, Cobija, Yacuiba..."
                      className="w-full bg-[#141620] border border-neutral-700 rounded-lg pl-8 pr-2.5 py-1.5 text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleGeocodeSector}
                    disabled={isGeocoding}
                    title="Buscar coordenadas automáticas de este lugar en Bolivia (o abrir mapa si no es conocido)"
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
                    Coordenadas Lat / Lon (Automáticas y Editables)
                  </label>
                  {isGeocoding ? (
                    <span className="text-[9px] font-bold text-cyan-300 flex items-center gap-1">
                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      Buscando en Bolivia...
                    </span>
                  ) : coordinates.trim() ? (
                    <span
                      className={`text-[9px] font-bold ${
                        parsedCurrentCoords
                          ? isInsideBolivia(parsedCurrentCoords.lat, parsedCurrentCoords.lon)
                            ? 'text-emerald-400'
                            : 'text-amber-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {parsedCurrentCoords
                        ? isInsideBolivia(parsedCurrentCoords.lat, parsedCurrentCoords.lon)
                          ? '✓ Coordenadas en Bolivia'
                          : '⚠ Fuera de límite nacional'
                        : '⚠ Revisar formato'}
                    </span>
                  ) : null}
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
                  {showMapPicker ? 'Ocultar Mapa' : 'Mover en Mapa de Bolivia'}
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
                    : geoFeedback.type === 'warn'
                    ? 'bg-amber-950/50 border-amber-500/50 text-amber-200'
                    : geoFeedback.type === 'error'
                    ? 'bg-red-950/40 border-red-500/40 text-red-300'
                    : 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300'
                }`}
              >
                <span>{geoFeedback.text}</span>
                <button
                  type="button"
                  onClick={() => setGeoFeedback(null)}
                  className="text-neutral-400 hover:text-white cursor-pointer shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Embedded Interactive Map of Bolivia (Pan/Move Live Crosshair, Click Anywhere, or Drag Tactical Pin) */}
            {showMapPicker && (
              <div className="space-y-2 pt-1.5 border-t border-cyan-500/20">
                {/* 9-Department Quick Jump Bar */}
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[9px] text-neutral-400 uppercase mr-1">Ir a Depto:</span>
                  {BOLIVIA_DEPARTMENTS.map((dept) => (
                    <button
                      key={dept.id}
                      type="button"
                      onClick={() => handleJumpDepartment(dept)}
                      className={`px-2 py-0.5 rounded text-[9px] font-bold border transition-all cursor-pointer ${
                        dept.id === 'ALL'
                          ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-200 hover:bg-cyan-900/60'
                          : 'bg-neutral-900/90 border-neutral-700/80 text-neutral-300 hover:text-yellow-200 hover:border-yellow-500/50'
                      }`}
                    >
                      {dept.label}
                    </button>
                  ))}
                </div>

                {/* Map Instructions, Center-Crosshair Mode Toggle & 4 Map Layers */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-yellow-300/95 flex items-center gap-1">
                      <Navigation className="w-3 h-3 shrink-0" />
                      {followMapCenter
                        ? isUnknownPlaceMode
                          ? 'Mueve el mapa sobre el lugar desconocido: las coordenadas salen en vivo'
                          : 'Arrastra el mapa, haz zoom o haz clic para obtener coordenadas en vivo'
                        : 'Haz clic en cualquier punto de Bolivia o arrastra el marcador amarillo'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setFollowMapCenter((prev) => !prev)}
                      title="Activa la mira central para obtener coordenadas automáticamente al mover el mapa"
                      className={`px-2 py-0.5 rounded text-[9px] font-bold border transition-all cursor-pointer ${
                        followMapCenter
                          ? 'bg-yellow-500/25 border-yellow-400/70 text-yellow-200'
                          : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {followMapCenter ? '⊕ Mira Central: ACTIVA' : '⊕ Activar Mira Central'}
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    {(['STREETS', 'SATELLITE', 'TOPO', 'DARK'] as MapLayerKey[]).map((layerKey) => (
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
                        {layerKey === 'STREETS'
                          ? 'Calles'
                          : layerKey === 'SATELLITE'
                          ? 'Satélite'
                          : layerKey === 'TOPO'
                          ? 'Relieve'
                          : 'Táctico'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Interactive Map Canvas + Center Crosshair + Floating Live Coordinates Readout */}
                <div className="relative rounded-xl overflow-hidden border border-yellow-500/50 bg-[#090b10]">
                  <div
                    ref={mapContainerRef}
                    className="w-full h-72 sm:h-80"
                  />

                  {/* Central Aiming Crosshair Overlay when Mira Central is active */}
                  {followMapCenter && (
                    <div className="pointer-events-none absolute inset-0 z-[400] flex items-center justify-center">
                      <div className="relative w-12 h-12 flex items-center justify-center">
                        <div className="absolute inset-x-0 top-1/2 h-[1.5px] bg-yellow-400/80 shadow-[0_0_6px_rgba(250,204,21,0.9)]" />
                        <div className="absolute inset-y-0 left-1/2 w-[1.5px] bg-yellow-400/80 shadow-[0_0_6px_rgba(250,204,21,0.9)]" />
                        <div className="w-7 h-7 rounded-full border-2 border-yellow-400/90 shadow-[0_0_12px_rgba(250,204,21,0.65)]" />
                      </div>
                    </div>
                  )}

                  {/* Floating Live Coordinate HUD Overlay */}
                  <div className="pointer-events-none absolute bottom-2 left-2 z-[400] bg-black/85 backdrop-blur-md border border-yellow-500/50 rounded-lg px-2.5 py-1.5 shadow-xl">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-yellow-300 font-mono">
                        {coordinates || 'Mueva el mapa...'}
                      </span>
                      {parsedCurrentCoords && (
                        <span
                          className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${
                            isInsideBolivia(parsedCurrentCoords.lat, parsedCurrentCoords.lon)
                              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                              : 'bg-amber-950/80 border-amber-500/50 text-amber-300'
                          }`}
                        >
                          {isInsideBolivia(parsedCurrentCoords.lat, parsedCurrentCoords.lon)
                            ? 'BOLIVIA ✓'
                            : 'FUERA DE LÍMITE'}
                        </span>
                      )}
                    </div>
                    {decimalLat && decimalLon && (
                      <div className="text-[9px] text-cyan-300/90 font-mono mt-0.5">
                        Lat: {decimalLat} &nbsp;|&nbsp; Lon: {decimalLon}
                      </div>
                    )}
                  </div>
                </div>
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
