/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AutomatedOrder, MilitaryRole, RawAlert, TacticalUnit, Clan, ActionableIntel, G2RegistryRecord } from '../types';
import { 
  AlertCircle, Shield, Navigation, Send, Radio, Check, Volume2, VolumeX, 
  Eye, Info, Camera, Upload, RefreshCw, Trash2, Video, VideoOff, Crosshair,
  Lock, Unlock, Key, Plus, Sliders, Battery, Fuel, AlertTriangle, X,
  MapPin, Clock, CheckCircle2, ChevronRight, FileText, Layers, Activity,
  Globe, Download
} from 'lucide-react';
import { playSyntheticBeep } from '../utils/audio';
import { safeStorage } from '../utils/storage';
import { convertToDMS, generateDeviceRealLocationKml, downloadKmlFile, parseCoordinates } from '../utils/geo';
import { detectDevicePlatform, saveCachedDeviceLocation } from '../utils/deviceLocation';
import { PatrolAuthModal } from './PatrolAuthModal';
import { PatrolEditorModal } from './PatrolEditorModal';
import { PatrolOperationalDashboard } from './PatrolOperationalDashboard';
import GoogleEarthPatrolModal from './GoogleEarthPatrolModal';

interface TacticalViewProps {
  activeOrders?: AutomatedOrder[];
  tacticalUnits?: TacticalUnit[];
  currentRole?: MilitaryRole;
  rawAlerts?: RawAlert[];
  clans?: Clan[];
  actionableIntel?: ActionableIntel[];
  expedientes?: G2RegistryRecord[];
  onAddExpediente?: (record: G2RegistryRecord) => void;
  onPromoteToIntel?: (
    intel: ActionableIntel,
    updatedReliability?: 'A' | 'B' | 'C' | 'D',
    updatedCertainty?: '1' | '2' | '3' | '4',
    routeId?: string
  ) => void;
  onUpdateAlertStatus?: (id: string, status: 'PROCESSED' | 'DISMISSED') => void;
  onConfirmOrder: (id: string, newStatus: 'RECEIVED' | 'IN_PROGRESS' | 'COMPLETED') => void;
  onSendFieldReport: (report: RawAlert) => void;
  onUpdateUnitCoordinates: (unitName: string, newCoords: string) => void;
  onAddTacticalUnit?: (unit: TacticalUnit) => void;
  onUpdateTacticalUnit?: (unit: TacticalUnit) => void;
  onDeleteTacticalUnit?: (unitId: string) => void;
}

export default function TacticalView({
  activeOrders = [],
  tacticalUnits = [],
  currentRole,
  rawAlerts = [],
  clans = [],
  actionableIntel = [],
  expedientes,
  onAddExpediente,
  onPromoteToIntel,
  onUpdateAlertStatus,
  onConfirmOrder,
  onSendFieldReport,
  onUpdateUnitCoordinates,
  onAddTacticalUnit,
  onUpdateTacticalUnit,
  onDeleteTacticalUnit
}: TacticalViewProps) {
  const [selectedPatrol, setSelectedPatrol] = useState<string>('Patrulla Delta-3');
  const [exclusivePatrolMode, setExclusivePatrolMode] = useState<boolean>(true);
  const [reportType, setReportType] = useState<'IMINT' | 'HUMINT' | 'SIGINT'>('HUMINT');
  const [sensorId, setSensorId] = useState<string>('VANT-01 (Cóndor - Dron Óptico)');
  const [coordinates, setCoordinates] = useState<string>('19°13\'10"S 68°35\'50"W');
  const [timestamp, setTimestamp] = useState<string>(new Date().toISOString().substring(0, 19).replace('T', ' ') + ' UTC');
  const [reportDetails, setReportDetails] = useState<string>(''); // Objeto/Evento Observado
  const [multimediaPreset, setMultimediaPreset] = useState<string>('multimedia-thermal');
  
  const [customLat, setCustomLat] = useState<string>('19°13\'10"S');
  const [customLon, setCustomLon] = useState<string>('68°35\'50"W');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Patrol Authentication, Management & Modals State
  const [unlockedPatrolIds, setUnlockedPatrolIds] = useState<Record<string, boolean>>(() => {
    try {
      const saved = safeStorage.getItem('PII_LCC_UNLOCKED_PATROLS');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return { 'unit-delta-3': true };
  });

  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authTargetPatrol, setAuthTargetPatrol] = useState<TacticalUnit | null>(null);

  const [editorModalOpen, setEditorModalOpen] = useState<boolean>(false);
  const [editorMode, setEditorMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [editorTargetPatrol, setEditorTargetPatrol] = useState<TacticalUnit | null>(null);

  const [sosConfirmModal, setSosConfirmModal] = useState<boolean>(false);
  const [activePatrolTab, setActivePatrolTab] = useState<'REPORT' | 'ORDERS' | 'GPS' | 'DASHBOARD'>('REPORT');
  const [isGoogleEarthModalOpen, setIsGoogleEarthModalOpen] = useState<boolean>(false);
  const [selectedPatrolForEarth, setSelectedPatrolForEarth] = useState<TacticalUnit | null>(null);

  const [inlinePin, setInlinePin] = useState<string>('');
  const [inlinePinError, setInlinePinError] = useState<string | null>(null);

  // Camera & Custom Upload States
  const [customPhoto, setCustomPhoto] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [isSimulatingCamera, setIsSimulatingCamera] = useState<boolean>(false);

  const simCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const simAnimIdRef = React.useRef<number | null>(null);

  // Real-time GPS Tracking States
  const [isTrackingGPS, setIsTrackingGPS] = useState<boolean>(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [isSimulatingMovement, setIsSimulatingMovement] = useState<boolean>(false);
  const [trackingLog, setTrackingLog] = useState<string[]>([]);
  const [isLocatingDevice, setIsLocatingDevice] = useState<boolean>(false);
  const [liveLocationAcquired, setLiveLocationAcquired] = useState<boolean>(false);
  const [isRealtimeAutoSync, setIsRealtimeAutoSync] = useState<boolean>(true);
  
  const watchIdRef = React.useRef<number | null>(null);
  const simulationIntervalRef = React.useRef<any>(null);

  // Helper to convert decimal degrees to Degrees-Minutes-Seconds (DMS)
  const convertToDMS = (decimal: number, isLatitude: boolean): string => {
    const absValue = Math.abs(decimal);
    const degrees = Math.floor(absValue);
    const minutesDouble = (absValue - degrees) * 60;
    const minutes = Math.floor(minutesDouble);
    const seconds = Math.floor((minutesDouble - minutes) * 60);

    let hemisphere = '';
    if (isLatitude) {
      hemisphere = decimal >= 0 ? 'N' : 'S';
    } else {
      hemisphere = decimal >= 0 ? 'E' : 'W';
    }

    return `${degrees}°${minutes}'${seconds}"${hemisphere}`;
  };

  // Coordinates string parser helper
  const parseCoordinates = (coordStr: string): { lat: number; lon: number } | null => {
    if (!coordStr) return null;
    const dmsRegex = /(\d+)\s*°\s*(\d+)\s*'\s*(\d+(?:\.\d+)?)\s*"?\s*([NSns])[,;\s]+(\d+)\s*°\s*(\d+)\s*'\s*(\d+(?:\.\d+)?)\s*"?\s*([WEweOo])/;
    const matches = coordStr.match(dmsRegex);
    if (matches) {
      const latDeg = parseFloat(matches[1]);
      const latMin = parseFloat(matches[2]);
      const latSec = parseFloat(matches[3]);
      const latHem = matches[4].toUpperCase();

      const lonDeg = parseFloat(matches[5]);
      const lonMin = parseFloat(matches[6]);
      const lonSec = parseFloat(matches[7]);
      const lonHem = matches[8].toUpperCase();

      let lat = latDeg + latMin / 60 + latSec / 3600;
      if (latHem === 'S') lat = -lat;

      let lon = lonDeg + lonMin / 60 + lonSec / 3600;
      if (lonHem === 'W' || lonHem === 'O') lon = -lon;

      if (!isNaN(lat) && !isNaN(lon)) {
        return { lat, lon };
      }
    }

    const cleanStr = coordStr.replace(/[,;]/g, ' ').trim();
    const parts = cleanStr.split(/\s+/);
    if (parts.length >= 2) {
      const lat = parseFloat(parts[0]);
      const lon = parseFloat(parts[1]);
      if (!isNaN(lat) && !isNaN(lon)) return { lat, lon };
    }
    return null;
  };

  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  // Reliably assign camera stream to video element whenever it changes
  React.useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream, cameraActive]);

  // Clean up watchers and camera stream on unmount
  React.useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
      }
    };
  }, [cameraStream]);

  // Effect to animate simulated tactical camera canvas
  React.useEffect(() => {
    let animId: number | null = null;
    if (isSimulatingCamera && simCanvasRef.current) {
      const canvas = simCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        let frame = 0;
        let angle = 0;

        const draw = () => {
          if (!ctx || !canvas) return;
          frame++;
          
          // Clear background with deep dark green military night-vision tint
          ctx.fillStyle = '#010f03';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Draw radar scanning sweep
          angle = (angle + 0.02) % (Math.PI * 2);
          const cx = canvas.width / 2;
          const cy = canvas.height / 2;
          const radius = Math.min(cx, cy) - 25;

          // Radial military coordinate ring lines
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.15)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(cx, cy, radius / 1.5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(cx, cy, radius / 3, 0, Math.PI * 2);
          ctx.stroke();

          // Reticle Crosshairs
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.25)';
          ctx.beginPath();
          ctx.moveTo(cx - radius - 10, cy);
          ctx.lineTo(cx + radius + 10, cy);
          ctx.moveTo(cx, cy - radius - 10);
          ctx.lineTo(cx, cy + radius + 10);
          ctx.stroke();

          // Sweep gradient line
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.7)';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
          ctx.stroke();

          // Blinking target box 1
          const targetX1 = cx - 40 + Math.sin(frame * 0.04) * 8;
          const targetY1 = cy - 35;
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(targetX1 - 6, targetY1 - 6, 12, 12);
          ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
          ctx.fillRect(targetX1 - 3, targetY1 - 3, 6, 6);
          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 8px monospace';
          ctx.fillText('TARGET CLAN_V1', targetX1 + 10, targetY1 + 3);

          // Blinking target box 2
          const targetX2 = cx + 50;
          const targetY2 = cy + 25 + Math.cos(frame * 0.03) * 6;
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(targetX2 - 5, targetY2 - 5, 10, 10);
          ctx.fillStyle = '#3b82f6';
          ctx.font = 'bold 8px monospace';
          ctx.fillText('PATRULLA ENLACE', targetX2 + 8, targetY2 + 3);

          // Tactical HUD labels
          ctx.fillStyle = '#10b981';
          ctx.font = 'bold 9px monospace';
          ctx.fillText('PII-LCC S-2 CAMERA SIM', 10, 18);
          ctx.fillText('TERM_SCAN_ACTIVE', 10, 30);
          ctx.fillText(`AZIMUTH: ${(192.15 + Math.sin(frame * 0.01) * 2.5).toFixed(2)}°`, canvas.width - 100, 18);
          ctx.fillText('ZOOM: FLIR 4.0X', canvas.width - 100, 30);

          ctx.font = '8px monospace';
          ctx.fillText(`GPS: ${customLat} ${customLon}`, 10, canvas.height - 10);
          ctx.fillText('GRID_LCC_OK', canvas.width - 70, canvas.height - 10);

          // Blinking recording point
          if (Math.floor(frame / 20) % 2 === 0) {
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(canvas.width - 15, 15, 3.5, 0, Math.PI * 2);
            ctx.fill();
          }

          animId = requestAnimationFrame(draw);
        };

        draw();
      }
    }

    return () => {
      if (animId) {
        cancelAnimationFrame(animId);
      }
    };
  }, [isSimulatingCamera, customLat, customLon]);

  // Captura inmediata de la ubicación física del dispositivo mediante Geolocation API
  const acquireCurrentLocationOnce = () => {
    if (!navigator.geolocation) {
      setSuccessBanner("SISTEMA GNSS: Su terminal o navegador no soporta geolocalización física.");
      return;
    }
    setIsLocatingDevice(true);
    playTacticalBeep(850, 0.08);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const dmsLat = convertToDMS(latitude, true);
        const dmsLon = convertToDMS(longitude, false);
        const formatted = `${dmsLat} ${dmsLon}`;

        setCustomLat(dmsLat);
        setCustomLon(dmsLon);
        setCoordinates(formatted);
        setGpsAccuracy(accuracy);
        setIsLocatingDevice(false);
        setLiveLocationAcquired(true);

        saveCachedDeviceLocation({
          lat: latitude,
          lon: longitude,
          dms: formatted,
          accuracy: accuracy ? Math.round(accuracy) : null,
          altitude: pos.coords.altitude ? Math.round(pos.coords.altitude) : null,
          altitudeAccuracy: null,
          heading: pos.coords.heading ? Math.round(pos.coords.heading) : null,
          speed: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : null,
          timestamp: pos.timestamp || Date.now(),
          isoTime: new Date(pos.timestamp || Date.now()).toISOString(),
          isLive: true,
          deviceType: detectDevicePlatform(),
          error: null
        });

        // Transmisión inmediata de coordenadas en vivo a Central de Fusión (CFI) y Mando LCC
        onUpdateUnitCoordinates(selectedPatrol, formatted);

        playTacticalBeep(1200, 0.2);
        setTrackingLog(prev => [
          `[${new Date().toLocaleTimeString()}] GPS EN VIVO CAPTURADO: ${formatted} (±${Math.round(accuracy)}m). Sincronizado con CFI y Mando.`,
          ...prev
        ].slice(0, 15));

        setSuccessBanner(`UBICACIÓN REAL TRANSMITIDA A CFI Y MANDO: ${selectedPatrol} fijada en ${formatted} (Precisión: ±${Math.round(accuracy)}m).`);
        setTimeout(() => setSuccessBanner(null), 5000);
      },
      (err) => {
        setIsLocatingDevice(false);
        let errorMsg = "Señal satelital no disponible.";
        if (err.code === err.PERMISSION_DENIED) {
          errorMsg = "Permiso de geolocalización denegado en el navegador.";
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          errorMsg = "Posición física no disponible.";
        } else if (err.code === err.TIMEOUT) {
          errorMsg = "Tiempo de respuesta GPS agotado.";
        }
        setSuccessBanner(`ERROR DE GEOLOCALIZACIÓN: ${errorMsg}`);
        setTimeout(() => setSuccessBanner(null), 5000);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const startRealTimeGPSTracking = () => {
    if (isSimulatingMovement) {
      stopSimulatedMovement();
    }

    if (!navigator.geolocation) {
      setSuccessBanner("SISTEMA GPS: Su terminal no soporta la API de Georreferenciación.");
      return;
    }

    setTrackingLog(prev => [`[${new Date().toLocaleTimeString()}] Inicializando receptor de satélites GPS...`, ...prev]);
    setIsTrackingGPS(true);
    playTacticalBeep(850, 0.1);

    const successCallback = (position: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = position.coords;
      const dmsLat = convertToDMS(latitude, true);
      const dmsLon = convertToDMS(longitude, false);

      setCustomLat(dmsLat);
      setCustomLon(dmsLon);
      setGpsAccuracy(accuracy);

      const formatted = `${dmsLat} ${dmsLon}`;
      setCoordinates(formatted);
      
      onUpdateUnitCoordinates(selectedPatrol, formatted);

      setTrackingLog(prev => [
        `[${new Date().toLocaleTimeString()}] ADQUISICIÓN OK (±${Math.round(accuracy)}m) -> ${dmsLat} ${dmsLon}`,
        ...prev
      ].slice(0, 15));
    };

    const errorCallback = (error: GeolocationPositionError) => {
      let errorMsg = "Señal satelital inestable.";
      if (error.code === error.PERMISSION_DENIED) {
        errorMsg = "Acceso de ubicación denegado en este dispositivo.";
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        errorMsg = "Posición física no disponible.";
      } else if (error.code === error.TIMEOUT) {
        errorMsg = "Exceso de tiempo en respuesta GPS.";
      }
      setTrackingLog(prev => [`[${new Date().toLocaleTimeString()}] ERROR GPS: ${errorMsg}`, ...prev]);
      setSuccessBanner(`RECEPTOR GPS APAGADO: ${errorMsg}`);
      stopRealTimeGPSTracking();
    };

    try {
      watchIdRef.current = navigator.geolocation.watchPosition(successCallback, errorCallback, {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000
      });
    } catch (err) {
      console.error(err);
      stopRealTimeGPSTracking();
    }
  };

  const stopRealTimeGPSTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTrackingGPS(false);
    setGpsAccuracy(null);
    setTrackingLog(prev => [`[${new Date().toLocaleTimeString()}] Telemetría de receptor detenida.`, ...prev]);
    playTacticalBeep(400, 0.15);
  };

  const handleDownloadRealDeviceKml = () => {
    playSyntheticBeep(920, 0.12);
    let lat = -19.219444;
    let lon = -68.597222;
    const parsed = parseCoordinates(coordinates);
    if (parsed) {
      lat = parsed.lat;
      lon = parsed.lon;
    }
    const kml = generateDeviceRealLocationKml({
      lat,
      lon,
      accuracy: gpsAccuracy,
      operatorName: selectedPatrol,
      role: currentRole || 'Órgano de Búsqueda y Operaciones',
      devicePlatform: detectDevicePlatform(),
      timestamp: new Date().toISOString()
    });
    downloadKmlFile(`PII-LCC_Ubicacion_Real_Dispositivo_${new Date().toISOString().substring(0, 10)}`, kml);
    setSuccessBanner(`KML GENERADO: Archivo de ubicación física real descargado para Google Earth.`);
    setTimeout(() => setSuccessBanner(null), 4000);
  };

  const startSimulatedMovement = () => {
    if (isTrackingGPS) {
      stopRealTimeGPSTracking();
    }

    setTrackingLog(prev => [`[${new Date().toLocaleTimeString()}] Simulador de Movimiento Táctico Activado.`, ...prev]);
    setIsSimulatingMovement(true);
    playTacticalBeep(950, 0.1);

    let currentCoords = parseCoordinates(`${customLat} ${customLon}`);
    if (!currentCoords) {
      currentCoords = { lat: -19.22, lon: -68.60 };
    }

    simulationIntervalRef.current = setInterval(() => {
      if (!currentCoords) return;
      
      // Slightly walk coordinates towards map boundary center and randomize slightly
      const latStep = (Math.random() - 0.5) * 0.0035;
      const lonStep = (Math.random() - 0.5) * 0.0035;
      
      currentCoords.lat += latStep;
      currentCoords.lon += lonStep;

      const dmsLat = convertToDMS(currentCoords.lat, true);
      const dmsLon = convertToDMS(currentCoords.lon, false);

      setCustomLat(dmsLat);
      setCustomLon(dmsLon);
      
      const formatted = `${dmsLat} ${dmsLon}`;
      setCoordinates(formatted);

      onUpdateUnitCoordinates(selectedPatrol, formatted);

      setTrackingLog(prev => [
        `[${new Date().toLocaleTimeString()}] Sim: ${selectedPatrol} se desplaza -> ${dmsLat} ${dmsLon}`,
        ...prev
      ].slice(0, 15));

      playTacticalBeep(1100, 0.05);
    }, 4000);
  };

  const stopSimulatedMovement = () => {
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }
    setIsSimulatingMovement(false);
    setTrackingLog(prev => [`[${new Date().toLocaleTimeString()}] Simulador de Movimiento Táctico Detenido.`, ...prev]);
    playTacticalBeep(400, 0.15);
  };

  const startCamera = async () => {
    setCameraError(null);
    setIsSimulatingCamera(false);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('La API navigator.mediaDevices no está disponible en este contexto.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      setCameraStream(stream);
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 150);
    } catch (err: any) {
      console.warn('Fallo al inicializar cámara física. Activando Emulador Táctico S-2:', err);
      setCameraError('Cámara física no disponible/bloqueada. Activando Emulador Táctico S-2 de terreno.');
      setIsSimulatingCamera(true);
      setCameraActive(true);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsSimulatingCamera(false);
    setCameraActive(false);
  };

  const capturePhoto = () => {
    try {
      if (isSimulatingCamera && simCanvasRef.current) {
        playTacticalBeep(1200, 0.05);
        const dataUrl = simCanvasRef.current.toDataURL('image/jpeg', 0.85);
        setCustomPhoto(dataUrl);
        stopCamera();
      } else if (videoRef.current) {
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        
        // Ensure w and h are strictly positive integers greater than 0
        let w = video.videoWidth || video.clientWidth || 640;
        let h = video.videoHeight || video.clientHeight || 480;
        
        if (w <= 0) w = 640;
        if (h <= 0) h = 480;

        // Downscale camera stream to a lightweight standard tactical size (max 640px)
        const maxDim = 640;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          playTacticalBeep(1200, 0.05);
          // Draw the video frame to canvas with light resolution
          ctx.drawImage(video, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          setCustomPhoto(dataUrl);
          stopCamera();
        } else {
          throw new Error('No se pudo obtener el contexto 2D del lienzo para la captura.');
        }
      }
    } catch (error: any) {
      console.error('Error during photo capture, activating safe simulation fallback:', error);
      setCameraError(`Adquisición de hardware interrumpida: ${error?.message || 'Error de lienzo'}. Se activa simulación S-2.`);
      
      // Safe fallback to simulated canvas snapshot
      try {
        if (simCanvasRef.current) {
          const dataUrl = simCanvasRef.current.toDataURL('image/jpeg', 0.85);
          setCustomPhoto(dataUrl);
          stopCamera();
        } else {
          // Generate an inline canvas dataURL
          const fallbackCanvas = document.createElement('canvas');
          fallbackCanvas.width = 480;
          fallbackCanvas.height = 320;
          const fctx = fallbackCanvas.getContext('2d');
          if (fctx) {
            fctx.fillStyle = '#0a100d';
            fctx.fillRect(0, 0, 480, 320);
            fctx.fillStyle = '#10b981';
            fctx.font = 'bold 16px monospace';
            fctx.fillText('[SENSOR S-2 CAPTURA TÁCTICA]', 40, 160);
          }
          setCustomPhoto(fallbackCanvas.toDataURL('image/jpeg', 0.8));
          stopCamera();
        }
      } catch (innerError) {
        console.error('Snapshot simulation fallback also failed:', innerError);
        const fallbackCanvas = document.createElement('canvas');
        fallbackCanvas.width = 480;
        fallbackCanvas.height = 320;
        const fctx = fallbackCanvas.getContext('2d');
        if (fctx) {
          fctx.fillStyle = '#0a100d';
          fctx.fillRect(0, 0, 480, 320);
          fctx.fillStyle = '#10b981';
          fctx.font = 'bold 16px monospace';
          fctx.fillText('[SENSOR S-2 SIMULACIÓN]', 40, 160);
        }
        setCustomPhoto(fallbackCanvas.toDataURL('image/jpeg', 0.8));
        stopCamera();
      }
    }
  };

  const resizeImageBase64 = (base64Str: string, callback: (resized: string) => void) => {
    // Left as a robust safety fallback wrapper
    const img = new Image();
    img.onload = () => {
      const maxDim = 480;
      let w = img.width;
      let h = img.height;
      
      if (w <= 0) w = 480;
      if (h <= 0) h = 360;
      
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL('image/jpeg', 0.6);
        callback(compressed);
      } else {
        callback(base64Str.length > 150000 ? "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='red'/></svg>" : base64Str);
      }
    };
    img.onerror = () => {
      callback(base64Str.length > 150000 ? "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='red'/></svg>" : base64Str);
    };
    img.src = base64Str;
  };

  const processAndResizeFile = (file: File) => {
    if (file.size > 15 * 1024 * 1024) { // 15MB limit
      setSuccessBanner("El archivo es demasiado grande. El límite de transmisión doctrinal es de 15MB.");
      return;
    }

    const blobUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const maxDim = 480; // Standardize to 480px max dimension
      let w = img.width;
      let h = img.height;
      
      if (w <= 0) w = 480;
      if (h <= 0) h = 360;
      
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, w, h);
        // Compress as JPEG to keep size under 20-30KB even for large high-res camera uploads
        const compressed = canvas.toDataURL('image/jpeg', 0.6);
        setCustomPhoto(compressed);
        playTacticalBeep(900, 0.1);
      } else {
        // Fallback placeholder
        setCustomPhoto("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='teal'/></svg>");
      }
      URL.revokeObjectURL(blobUrl);
    };
    img.onerror = () => {
      console.error("Error decoding image from blob URL");
      setCustomPhoto("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='teal'/></svg>");
      URL.revokeObjectURL(blobUrl);
    };
    img.src = blobUrl;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processAndResizeFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processAndResizeFile(file);
    }
  };

  // Play a tactical high-frequency synthetic tone
  const playTacticalBeep = (freq = 880, duration = 0.15) => {
    if (!soundEnabled) return;
    playSyntheticBeep(freq, duration, 'sine', 0.1);
  };

  // Filter orders assigned specifically to the selected patrol
  const patrolOrders = activeOrders.filter(
    order => order.assignedUnit === selectedPatrol && order.status !== 'COMPLETED' && order.status !== 'CANCELLED'
  );

  const selectedUnitDetails = tacticalUnits.find(u => u.name === selectedPatrol);

  // Handle Ground operator sending a raw field report back to CFI
  const handleSendReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportDetails || !sensorId || !coordinates) return;

    let finalMediaUrl: string | undefined = undefined;
    if (multimediaPreset === 'custom-upload' || multimediaPreset === 'custom-camera') {
      finalMediaUrl = customPhoto || undefined;
    } else if (multimediaPreset !== 'none') {
      finalMediaUrl = multimediaPreset;
    }

    // Derive realistic origin sector from coordinates
    let detectedSector = 'Sector Occidental Fronterizo';
    if (coordinates.includes('68°34') || coordinates.includes('68°37')) {
      detectedSector = 'Hito 14 - Frontera Chileno-Boliviana';
    } else if (coordinates.includes('68°15') || coordinates.includes('Coipasa')) {
      detectedSector = 'Salar de Coipasa (Sector Challapata)';
    } else if (coordinates.includes('69°02') || coordinates.includes('Tambo')) {
      detectedSector = 'Paso Tambo Quemado - Charaña';
    } else if (coordinates.includes('Pisiga')) {
      detectedSector = 'Paso No Habilitado Pisiga';
    }

    const newReport: RawAlert = {
      id: `alert-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString(),
      sourceType: reportType,
      sourceName: sensorId,
      reliability: 'C',
      certainty: '3',
      details: reportDetails,
      coordinates: coordinates,
      status: 'PENDING',
      clandestineRouteId: undefined, // Strict DOCTRINE constraint: search team cannot analyze routes
      mediaUrl: finalMediaUrl,
      operatorName: selectedPatrol ? `${selectedPatrol} (Operador de Búsqueda S-2)` : 'Operador Táctico S-2',
      originUnit: selectedUnitDetails ? selectedUnitDetails.name : 'Patrulla de Terreno LCC // CEO-LCC',
      originSector: detectedSector,
      transmissionChannel: 'Canal VHF Táctico Encriptado CAD-C2 // Frecuencia 142.850 MHz',
      emitterDeviceId: `Terminal Ruggedized S2-TX-${Math.floor(1000 + Math.random() * 9000)}`
    };

    onSendFieldReport(newReport);
    // Sincronización en tiempo real: actualiza la posición de la patrulla con las coordenadas de la detección
    onUpdateUnitCoordinates(selectedPatrol, coordinates);
    playTacticalBeep(980, 0.25);
    setReportDetails('');
    setCustomPhoto(null);
    stopCamera();
    
    // Quick transient screen alert
    setSuccessBanner("REGISTRO REPORTADO CON ÉXITO: Inyectado de inmediato en la Central de Fusión (CFI).");
    setTimeout(() => {
      setSuccessBanner(null);
    }, 4000);
  };

  const handleUpdateGPS = () => {
    const formattedCoords = `${customLat} ${customLon}`;
    onUpdateUnitCoordinates(selectedPatrol, formattedCoords);
    setCoordinates(formattedCoords); // Sincroniza automáticamente con el formulario de captura
    playTacticalBeep(650, 0.1);
    setSuccessBanner(`COORDENADAS GPS ACTUALIZADAS: ${selectedPatrol} ahora en ${formattedCoords} y sincronizadas con el Capturador.`);
    setTimeout(() => {
      setSuccessBanner(null);
    }, 4000);
  };

  // Unlock persistence helper
  const setPatrolUnlockedState = (unitId: string, unlocked: boolean) => {
    setUnlockedPatrolIds(prev => {
      const next = { ...prev, [unitId]: unlocked };
      try {
        safeStorage.setItem('PII_LCC_UNLOCKED_PATROLS', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleSelectPatrolTab = (unit: TacticalUnit) => {
    setSelectedPatrol(unit.name);
    if (unit.coordinates) {
      const parts = unit.coordinates.trim().split(/\s+/);
      if (parts.length >= 2) {
        setCustomLat(parts[0]);
        setCustomLon(parts[1]);
      } else if (parts.length === 1) {
        setCustomLat(parts[0]);
        setCustomLon('');
      }
    }
    playTacticalBeep(700, 0.08);

    // If unit is locked, prompt auth
    if (!unlockedPatrolIds[unit.id]) {
      setAuthTargetPatrol(unit);
      setAuthModalOpen(true);
      setInlinePin('');
      setInlinePinError(null);
    }
  };

  const handleUnlockSuccess = (unitId: string) => {
    setPatrolUnlockedState(unitId, true);
    setAuthModalOpen(false);
    playTacticalBeep(980, 0.2);
    setSuccessBanner(`MÓDULO ACTIVO ASIGNADO AUTORIZADO: Consola táctica desbloqueada para ${selectedPatrol}.`);
    setTimeout(() => setSuccessBanner(null), 3500);
  };

  const handleLockPatrol = (unitId: string) => {
    setPatrolUnlockedState(unitId, false);
    playTacticalBeep(350, 0.15);
    setSuccessBanner(`CONSOLA BLOQUEADA: La patrulla ${selectedPatrol} ha sido cerrada y requiere contraseña.`);
    setTimeout(() => setSuccessBanner(null), 3500);
  };

  const handleInlineUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnitDetails) return;
    const expectedPin = selectedUnitDetails.pin || '1234';
    if (inlinePin.trim() === expectedPin.trim()) {
      setPatrolUnlockedState(selectedUnitDetails.id, true);
      setInlinePinError(null);
      setInlinePin('');
      playTacticalBeep(980, 0.2);
      setSuccessBanner(`MÓDULO ACTIVO DESBLOQUEADO: Acceso verificado para ${selectedUnitDetails.name}.`);
      setTimeout(() => setSuccessBanner(null), 3500);
    } else {
      setInlinePinError('PIN O CONTRASEÑA INCORRECTA. ACCESO DENEGADO.');
      playTacticalBeep(240, 0.3);
    }
  };

  const handleOpenCreatePatrol = () => {
    setEditorMode('CREATE');
    setEditorTargetPatrol(null);
    setEditorModalOpen(true);
  };

  const handleOpenEditPatrol = (unit?: TacticalUnit) => {
    setEditorMode('EDIT');
    setEditorTargetPatrol(unit || selectedUnitDetails || null);
    setEditorModalOpen(true);
  };

  const handleSavePatrol = (unitData: Partial<TacticalUnit>) => {
    if (editorMode === 'CREATE') {
      const newUnit: TacticalUnit = {
        id: `unit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: unitData.name || `Patrulla Sierra-${tacticalUnits.length + 1}`,
        status: unitData.status || 'PATROLLING',
        coordinates: unitData.coordinates || coordinates || '19°13\'10"S 68°35\'50"W',
        personnel: unitData.personnel || 8,
        equipment: Array.isArray(unitData.equipment)
          ? unitData.equipment
          : typeof unitData.equipment === 'string'
            ? (unitData.equipment as string).split(',').map((s: string) => s.trim()).filter(Boolean)
            : ['Fusil Galil SAR', 'Radio VHF Harris', 'Visores Nocturnos'],
        commander: unitData.commander || 'Cap. S-2',
        sector: unitData.sector || 'Sector Fronterizo Occidental',
        frequency: unitData.frequency || '142.850 MHz',
        pin: unitData.pin || '1234',
        battery: unitData.battery ?? 100,
        fuel: unitData.fuel ?? 100,
        ammo: unitData.ammo ?? 100,
        lastReportTime: new Date().toISOString()
      };

      if (onAddTacticalUnit) {
        onAddTacticalUnit(newUnit);
      }
      setPatrolUnlockedState(newUnit.id, true);
      setSelectedPatrol(newUnit.name);
      setActivePatrolTab('DASHBOARD');
      setExclusivePatrolMode(true);
      setSuccessBanner(`NUEVA PATRULLA INCREMENTADA: ${newUnit.name} desplegada con su propio Dashboard Operacional exclusivo.`);
    } else if (editorTargetPatrol && onUpdateTacticalUnit) {
      const updatedUnit: TacticalUnit = {
        ...editorTargetPatrol,
        ...unitData,
        name: unitData.name || editorTargetPatrol.name
      };
      onUpdateTacticalUnit(updatedUnit);
      if (editorTargetPatrol.name === selectedPatrol && unitData.name) {
        setSelectedPatrol(unitData.name);
      }
      setSuccessBanner(`DATOS ACTUALIZADOS: La información de ${updatedUnit.name} ha sido sincronizada.`);
    }

    setEditorModalOpen(false);
    setTimeout(() => setSuccessBanner(null), 4000);
  };

  const handleDeletePatrol = (unitId: string) => {
    if (onDeleteTacticalUnit) {
      onDeleteTacticalUnit(unitId);
      setEditorModalOpen(false);
      const remaining = tacticalUnits.filter(u => u.id !== unitId);
      if (remaining.length > 0) {
        setSelectedPatrol(remaining[0].name);
      }
      setSuccessBanner(`PATRULLA DESMOVILIZADA: Registro retirado del teatro operacional.`);
      setTimeout(() => setSuccessBanner(null), 3500);
    }
  };

  const handleSendSOSAlert = () => {
    if (!selectedUnitDetails) return;
    const sosAlert: RawAlert = {
      id: `alert-sos-${Date.now()}`,
      timestamp: new Date().toISOString(),
      sourceType: 'SIGINT',
      sourceName: `BALIZA SOS DE EMERGENCIA (${selectedUnitDetails.name})`,
      reliability: 'A',
      certainty: '1',
      details: `🚨 ALERTA ROJA SOS: La unidad ${selectedUnitDetails.name} (Cmdte: ${selectedUnitDetails.commander || 'S-2'}) ha emitido una señal de auxilio urgente en el sector ${selectedUnitDetails.sector || coordinates}. Posible emboscada o enfrentamiento armado contra contrabandistas. Se requiere apoyo inmediato de QRF y enlace con CEO.`,
      coordinates: coordinates,
      status: 'PENDING',
      operatorName: `${selectedUnitDetails.name} (AUXILIO SOS)`,
      originUnit: selectedUnitDetails.name,
      originSector: selectedUnitDetails.sector || 'Frontera Occidental',
      transmissionChannel: `Canal de Emergencia ${selectedUnitDetails.frequency || '142.850 MHz'} // SOS MAYDAY`,
      emitterDeviceId: `TRANSMISOR TÁCTICO SOS-${selectedUnitDetails.id}`
    };

    onSendFieldReport(sosAlert);
    setSosConfirmModal(false);
    playTacticalBeep(1200, 0.6);
    setSuccessBanner(`🚨 ALERTA SOS EMITIDA: Transmitida con máxima prioridad a la Central de Fusión (CFI).`);
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  const isCurrentPatrolUnlocked = selectedUnitDetails ? Boolean(unlockedPatrolIds[selectedUnitDetails.id]) : false;

  return (
    <div className="space-y-6">
      {/* Doctrinal Organ Banner */}
      {currentRole === 'ROL_BUSQUEDA' && (
        <div className="p-3.5 rounded-xl bg-yellow-950/30 border border-yellow-500/50 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2.5 text-yellow-300">
            <Radio className="w-4 h-4 text-yellow-400 animate-pulse" />
            <span className="font-bold uppercase tracking-wider">
              1. ÓRGANOS DE BÚSQUEDA // SECCIÓN S-2
            </span>
            <span className="text-[#65552a]">|</span>
            <span className="text-yellow-400/80 text-[11px]">
              Captación de Sensores Ópticos/Térmicos, VANTs y Reportes IMINT/HUMINT/SIGINT hacia la Central de Fusión (CFI).
            </span>
          </div>
          <span className="text-[10px] bg-yellow-900/40 text-yellow-300 px-2 py-0.5 rounded border border-yellow-700/50">
            ORDEN #1 // INGRESO DE DATOS CRUDOS
          </span>
        </div>
      )}

      {(currentRole === 'ROL_TERRENO' || currentRole === 'ROL_PATRULLA') && (
        <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/50 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2.5 text-emerald-300">
            <Navigation className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="font-bold uppercase tracking-wider">
              4. UNIDADES DE TERRENO // PATRULLAS TÁCTICAS
            </span>
            <span className="text-[#204a32]">|</span>
            <span className="text-emerald-400/80 text-[11px]">
              Recepción Satelital de OOA, Intercepción de Contrabandistas y Confirmación de Misiones Cumplidas.
            </span>
          </div>
          <span className="text-[10px] bg-emerald-900/40 text-emerald-300 px-2 py-0.5 rounded border border-emerald-700/50">
            ORDEN #4 // EJECUCIÓN TÁCTICA
          </span>
        </div>
      )}

      {/* Alert Banner instead of window.alert */}
      {successBanner && (
        <div className="bg-[#10b981]/10 border border-[#10b981]/40 text-[#10b981] p-3 rounded-lg text-xs font-mono text-left animate-fade-in flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Check className="w-4 h-4 text-[#10b981]" />
            {successBanner}
          </span>
          <button onClick={() => setSuccessBanner(null)} className="text-[#666] hover:text-white">✕</button>
        </div>
      )}

      {/* Sound selector, Patrol Selector and CRUD Management Bar */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-4 rounded-xl shadow-md space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1a1a1a] pb-3">
          <div className="flex items-center gap-2.5">
            <Radio className="w-4 h-4 text-[#10b981] animate-pulse" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Módulos Activos Asignados // Control de Patrullas
                </h3>
                {exclusivePatrolMode ? (
                  <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                    <Shield className="w-2.5 h-2.5" />
                    VER SOLAMENTE: {selectedPatrol}
                  </span>
                ) : (
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
                    <Globe className="w-2.5 h-2.5" />
                    CUADRANTE GENERAL
                  </span>
                )}
              </div>
              <p className="text-[10px] font-mono text-[#777]">
                Cada patrulla cuenta con su propio módulo operacional y dashboard aislado e independiente.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle Compartmented View */}
            <button
              type="button"
              onClick={() => {
                const nextMode = !exclusivePatrolMode;
                setExclusivePatrolMode(nextMode);
                playTacticalBeep(nextMode ? 900 : 600, 0.1);
              }}
              className={`text-xs font-mono font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all border cursor-pointer ${
                exclusivePatrolMode
                  ? 'bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border-emerald-500/50 shadow-inner'
                  : 'bg-[#111] hover:bg-[#1a1a1a] text-slate-300 border-[#333]'
              }`}
              title={exclusivePatrolMode ? "Haga clic para ver cuadrante global" : "Haga clic para ver solamente la patrulla seleccionada"}
            >
              {exclusivePatrolMode ? <Lock className="w-3.5 h-3.5 text-emerald-400" /> : <Eye className="w-3.5 h-3.5 text-cyan-400" />}
              <span>{exclusivePatrolMode ? 'Ver Solamente Mi Patrulla' : 'Ver Todas las Patrullas'}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreatePatrol}
              className="bg-[#10b981] hover:bg-[#10b981]/90 text-black text-xs font-mono font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Incrementar Patrulla</span>
            </button>

            {/* Tactical Sound Beeper toggle */}
            <button
              type="button"
              onClick={() => {
                const nextState = !soundEnabled;
                setSoundEnabled(nextState);
                if (nextState) setTimeout(() => playTacticalBeep(880, 0.1), 100);
              }}
              className={`p-2 rounded-lg border transition-all flex items-center gap-2 text-xs font-mono cursor-pointer ${
                soundEnabled 
                  ? 'bg-[#10b981]/10 border-[#10b981]/30 text-[#10b981]' 
                  : 'bg-[#111] border-[#222] text-[#666]'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-[#10b981]" /> : <VolumeX className="w-4 h-4 text-[#666]" />}
              <span className="hidden sm:inline">{soundEnabled ? 'Beeper' : 'Silencio'}</span>
            </button>
          </div>
        </div>

        {/* Patrol Quick Switch if in Exclusive Mode */}
        {exclusivePatrolMode && (
          <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-emerald-300 font-bold">Consola Exclusiva de:</span>
              <span className="text-white font-bold bg-black/50 px-2 py-0.5 rounded border border-emerald-500/40">
                {selectedPatrol}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Seleccionar Patrulla Operativa:</span>
              <select
                value={selectedPatrol || ''}
                onChange={(e) => {
                  const target = tacticalUnits.find(u => u.name === e.target.value);
                  if (target) handleSelectPatrolTab(target);
                }}
                className="bg-black/70 border border-emerald-500/40 rounded px-2.5 py-1 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-400 cursor-pointer"
              >
                {tacticalUnits.map(unit => (
                  <option key={unit.id} value={unit.name}>
                    {unit.name} ({unit.commander || 'S-2'})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Patrol Module Tabs Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {(exclusivePatrolMode 
            ? tacticalUnits.filter(u => u.name === selectedPatrol) 
            : tacticalUnits
          ).map(unit => {
            const isSelected = unit.name === selectedPatrol;
            const isUnlocked = Boolean(unlockedPatrolIds[unit.id]);
            const unitOrdersCount = activeOrders.filter(
              o => o.assignedUnit === unit.name && o.status !== 'COMPLETED' && o.status !== 'CANCELLED'
            ).length;

            return (
              <div
                key={unit.id}
                onClick={() => handleSelectPatrolTab(unit)}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all relative overflow-hidden group ${
                  isSelected
                    ? isUnlocked 
                      ? 'bg-[#10b981]/10 border-[#10b981] shadow-lg shadow-[#10b981]/10' 
                      : 'bg-amber-950/20 border-amber-500/80 shadow-lg shadow-amber-500/10'
                    : 'bg-[#111] border-[#222] hover:border-[#333] hover:bg-[#151515]'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="font-mono text-xs font-bold text-white truncate group-hover:text-[#10b981] transition-colors">
                    {unit.name}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isUnlocked ? (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40 flex items-center gap-1">
                        <Unlock className="w-2.5 h-2.5" />
                        ACTIVO
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" />
                        BLOQUEADO
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-[10px] font-mono text-[#888] space-y-0.5">
                  <div className="flex justify-between items-center">
                    <span>Cmdte: {unit.commander || 'S-2'}</span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-black/40 text-[#aaa]">{unit.frequency || '142.850 MHz'}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 text-[9px] text-[#666]">
                    <span className="truncate max-w-[130px]">{unit.sector || 'Sector Fronterizo'}</span>
                    {unitOrdersCount > 0 && (
                      <span className="text-[#f43f5e] font-bold bg-[#f43f5e]/10 px-1 rounded">
                        {unitOrdersCount} OOA
                      </span>
                    )}
                  </div>
                </div>

                {/* Direct button to this patrol's own isolated dashboard */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectPatrolTab(unit);
                    setActivePatrolTab('DASHBOARD');
                    playTacticalBeep(980, 0.1);
                  }}
                  className="mt-2.5 w-full py-1 px-2 rounded bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/40 text-purple-300 hover:text-white text-[10px] font-mono flex items-center justify-center gap-1.5 transition-all cursor-pointer font-bold shadow-sm"
                  title={`Abrir Dashboard Operacional exclusivo de ${unit.name}`}
                >
                  <Layers className="w-3 h-3 text-purple-400" />
                  <span>Dashboard Propio</span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Selected Patrol Command Sub-Bar */}
        {selectedUnitDetails && (
          <div className="p-3 rounded-lg bg-[#050505] border border-[#1f1f1f] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isCurrentPatrolUnlocked ? 'bg-[#10b981] animate-ping' : 'bg-amber-500'}`} />
                <span className="text-white font-bold">{selectedUnitDetails.name}</span>
                <span className="text-[#666]">|</span>
                <span className="text-[#888]">{selectedUnitDetails.status}</span>
              </div>

              <div className="flex items-center gap-3 text-[11px] text-[#aaa]">
                <span className="flex items-center gap-1">
                  <Fuel className="w-3.5 h-3.5 text-amber-400" />
                  Combustible: <b className="text-white">{selectedUnitDetails.fuel ?? 85}%</b>
                </span>
                <span className="flex items-center gap-1">
                  <Battery className="w-3.5 h-3.5 text-[#10b981]" />
                  Batería: <b className="text-white">{selectedUnitDetails.battery ?? 92}%</b>
                </span>
                <span>Efectivos: <b className="text-white">{selectedUnitDetails.personnel} pax</b></span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedPatrolForEarth(selectedUnitDetails);
                  setIsGoogleEarthModalOpen(true);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-[#0a1628] hover:bg-[#112440] text-cyan-300 hover:text-white border border-cyan-500/50 flex items-center gap-1.5 text-xs transition-colors cursor-pointer font-bold shadow-[0_0_10px_rgba(6,182,212,0.25)]"
                title="Visualizar ubicación actual de esta patrulla en Google Earth 3D en tiempo real"
              >
                <Globe className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>Google Earth 3D</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenEditPatrol(selectedUnitDetails)}
                className="px-2.5 py-1.5 rounded-lg bg-[#1a1a1a] hover:bg-[#252525] text-white border border-[#333] flex items-center gap-1.5 text-xs transition-colors cursor-pointer"
                title="Editar datos de la patrulla"
              >
                <Sliders className="w-3.5 h-3.5 text-[#3b82f6]" />
                <span>Editar Datos</span>
              </button>

              {isCurrentPatrolUnlocked ? (
                <button
                  type="button"
                  onClick={() => handleLockPatrol(selectedUnitDetails.id)}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-950/30 hover:bg-amber-900/40 text-amber-300 border border-amber-600/40 flex items-center gap-1.5 text-xs transition-colors cursor-pointer"
                  title="Bloquear consola de patrulla"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Bloquear Módulo</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setAuthTargetPatrol(selectedUnitDetails);
                    setAuthModalOpen(true);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-[#10b981]/20 hover:bg-[#10b981]/30 text-[#10b981] border border-[#10b981]/40 flex items-center gap-1.5 text-xs transition-colors cursor-pointer font-bold"
                  title="Ingresar contraseña de la patrulla"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Desbloquear</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setSosConfirmModal(true)}
                className="px-2.5 py-1.5 rounded-lg bg-[#f43f5e]/20 hover:bg-[#f43f5e]/30 text-[#f43f5e] border border-[#f43f5e]/40 flex items-center gap-1.5 text-xs transition-colors cursor-pointer font-bold"
                title="Emitir baliza de emergencia SOS a CFI"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>SOS</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SELECTED PATROL OPERATIONAL WORKSPACE */}
      {selectedUnitDetails && (
        <div className="space-y-4">
          {/* Patrol View Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-[#1f1f1f] pb-2">
            <button
              type="button"
              onClick={() => {
                setActivePatrolTab('REPORT');
                playTacticalBeep(880, 0.08);
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activePatrolTab === 'REPORT'
                  ? 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/50 shadow-md shadow-[#10b981]/10'
                  : 'bg-[#111] text-[#888] hover:text-white border border-[#222]'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-[#10b981]" />
              <span>1. Ingesta de Sensores S-2</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActivePatrolTab('ORDERS');
                playTacticalBeep(880, 0.08);
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer relative ${
                activePatrolTab === 'ORDERS'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-md shadow-emerald-500/10'
                  : 'bg-[#111] text-[#888] hover:text-white border border-[#222]'
              }`}
            >
              <Navigation className="w-3.5 h-3.5 text-emerald-400" />
              <span>2. Órdenes Asignadas (OOA)</span>
              {patrolOrders.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#f43f5e] text-white font-bold ml-1">
                  {patrolOrders.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setActivePatrolTab('GPS');
                playTacticalBeep(880, 0.08);
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activePatrolTab === 'GPS'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50 shadow-md shadow-blue-500/10'
                  : 'bg-[#111] text-[#888] hover:text-white border border-[#222]'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              <span>3. Telemetría GPS Satelital</span>
              {(isTrackingGPS || isSimulatingMovement) && (
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping ml-1" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setActivePatrolTab('DASHBOARD');
                playTacticalBeep(880, 0.08);
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activePatrolTab === 'DASHBOARD'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50 shadow-md shadow-purple-500/10'
                  : 'bg-[#111] text-[#888] hover:text-white border border-[#222]'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span>4. Dashboard Operacional ({selectedPatrol})</span>
            </button>
          </div>

          {/* TAB 1: S-2 SENSOR CAPTURE AND FIELD DISPATCH */}
          {activePatrolTab === 'REPORT' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-fade-in">
              {/* Left Column: Field Sensor Report Form */}
              <div className="lg:col-span-7 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-3">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-[#10b981]" />
                    <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                      Captación de Sensores S-2 // Despacho a CFI
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono text-[#777] bg-[#111] px-2 py-0.5 rounded border border-[#222]">
                    Operador: {selectedPatrol}
                  </span>
                </div>

                <form onSubmit={handleSendReport} className="space-y-4 text-xs font-mono">
                  {/* Intelligence Source Type (IMINT / HUMINT / SIGINT) */}
                  <div>
                    <label className="text-[10px] text-[#888] uppercase block mb-1.5 font-bold">
                      Tipo de Fuente de Inteligencia:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['IMINT', 'HUMINT', 'SIGINT'] as const).map(type => {
                        const isSelected = reportType === type;
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => {
                              setReportType(type);
                              playTacticalBeep(700, 0.05);
                            }}
                            className={`py-2 px-2.5 rounded-lg border font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                              isSelected
                                ? type === 'IMINT'
                                  ? 'bg-blue-500/20 border-blue-500 text-blue-400 shadow-sm'
                                  : type === 'HUMINT'
                                  ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-sm'
                                  : 'bg-purple-500/20 border-purple-500 text-purple-400 shadow-sm'
                                : 'bg-[#111] border-[#222] text-[#777] hover:border-[#333]'
                            }`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{type}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Acquisition Sensor Dropdown */}
                  <div>
                    <label className="text-[10px] text-[#888] uppercase block mb-1.5 font-bold">
                      Sensor / Unidad de Captación:
                    </label>
                    <select
                      value={sensorId || 'VANT-01 (Cóndor - Dron Óptico)'}
                      onChange={(e) => setSensorId(e.target.value)}
                      className="w-full bg-[#111] border border-[#222] focus:border-[#10b981] rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none"
                    >
                      <option value="VANT-01 (Cóndor - Dron Óptico)">VANT-01 (Cóndor - Dron Óptico)</option>
                      <option value="VANT-02 (Halcón - Reconocimiento Térmico)">VANT-02 (Halcón - Reconocimiento Térmico)</option>
                      <option value="Sensor Terrestre Acústico S-03">Sensor Terrestre Acústico S-03</option>
                      <option value="Visor Nocturno AN/PVS-14 (Patrulla)">Visor Nocturno AN/PVS-14 (Patrulla)</option>
                      <option value="Cámara Térmica FLIR Recon V">Cámara Térmica FLIR Recon V</option>
                      <option value="Binoculares Telémetro Vector 21">Binoculares Telémetro Vector 21</option>
                      <option value="Receptor SIGINT Portátil Harris">Receptor SIGINT Portátil Harris</option>
                    </select>
                  </div>

                  {/* Coordinates Field with Direct Sync & Real-Time GNSS */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                      <label className="text-[10px] text-[#888] uppercase font-bold flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#10b981]" />
                        <span>Coordenadas Tácticas de Detección (DMS):</span>
                      </label>
                      <div className="flex items-center gap-2">
                        {gpsAccuracy && (
                          <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30 font-bold">
                            ±{Math.round(gpsAccuracy)}m GNSS
                          </span>
                        )}
                        <span className="text-[9px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/30">
                          ENLACE CFI ACTIVO
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={coordinates || ''}
                        onChange={(e) => setCoordinates(e.target.value)}
                        placeholder='19°13&apos;10"S 68°35&apos;50"W'
                        className="flex-1 bg-[#111] border border-[#222] focus:border-[#10b981] rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none"
                        required
                      />
                      <button
                        type="button"
                        onClick={acquireCurrentLocationOnce}
                        disabled={isLocatingDevice}
                        className={`px-3 py-2 rounded-lg font-mono text-xs flex items-center gap-1.5 font-bold transition-all shadow-md active:scale-95 cursor-pointer whitespace-nowrap ${
                          isLocatingDevice
                            ? 'bg-emerald-800 text-emerald-200 animate-pulse'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-black'
                        }`}
                        title="Obtiene la posición geográfica real del dispositivo y la sincroniza con el CFI y Mando"
                      >
                        <Navigation className={`w-3.5 h-3.5 ${isLocatingDevice ? 'animate-spin' : ''}`} />
                        <span>{isLocatingDevice ? 'Fijando GPS...' : 'GPS en Vivo'}</span>
                      </button>
                    </div>

                    {/* Quick tactical telemetry actions */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#1a2333]/60 text-[10px] font-mono">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const liveCoords = `${customLat} ${customLon}`;
                            setCoordinates(liveCoords);
                            playTacticalBeep(900, 0.05);
                          }}
                          className="text-[#10b981] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className="w-2.5 h-2.5" />
                          <span>Copiar GPS Terminal</span>
                        </button>
                        <span className="text-[#334155]">|</span>
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateUnitCoordinates(selectedPatrol, coordinates);
                            playTacticalBeep(1100, 0.15);
                            setSuccessBanner(`POSICIÓN TRANSMITIDA: ${selectedPatrol} reportada en ${coordinates} a la CFI y Mando LCC.`);
                            setTimeout(() => setSuccessBanner(null), 4000);
                          }}
                          className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer font-bold"
                          title="Envía de inmediato estas coordenadas a la Central de Fusión (CFI) y al Mando LCC"
                        >
                          <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
                          <span>Transmitir Posición Inmediata</span>
                        </button>
                      </div>

                      <label className="flex items-center gap-1.5 cursor-pointer text-slate-400 hover:text-slate-200">
                        <input
                          type="checkbox"
                          checked={isRealtimeAutoSync}
                          onChange={(e) => setIsRealtimeAutoSync(e.target.checked)}
                          className="w-3 h-3 rounded bg-[#111] border-[#333] text-emerald-500 focus:ring-0 cursor-pointer"
                        />
                        <span>Auto-Actualizar con Movimiento</span>
                      </label>
                    </div>
                  </div>

                  {/* Observed Object / Event Details */}
                  <div>
                    <label className="text-[10px] text-[#888] uppercase block mb-1.5 font-bold">
                      Objeto o Evento Observado (Detalle Doctrinal):
                    </label>
                    <textarea
                      value={reportDetails || ''}
                      onChange={(e) => setReportDetails(e.target.value)}
                      placeholder="Describa actividad sospechosa, vehículos no autorizados, cantidad de personas, dirección de desplazamiento, armamento o bultos observados..."
                      rows={4}
                      className="w-full bg-[#111] border border-[#222] focus:border-[#10b981] rounded-lg p-3 text-white text-xs font-mono focus:outline-none leading-relaxed resize-none"
                      required
                    />
                  </div>

                  {/* Submit Button to Central de Fusión */}
                  <button
                    type="submit"
                    className="w-full bg-[#10b981] hover:bg-[#10b981]/90 text-black font-mono font-bold text-xs py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 cursor-pointer uppercase tracking-wider"
                  >
                    <Send className="w-4 h-4" />
                    <span>Transmitir Reporte Crudo a Central de Fusión (CFI)</span>
                  </button>
                </form>
              </div>

              {/* Right Column: Tactical Multimedia, FLIR & Camera Acquisition */}
              <div className="lg:col-span-5 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-5 shadow-lg space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-3">
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4 text-[#10b981]" />
                      <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                        Adquisición Óptica / Térmica FLIR
                      </h4>
                    </div>
                    {customPhoto && (
                      <span className="text-[10px] font-mono text-[#10b981] bg-[#10b981]/10 px-2 py-0.5 rounded border border-[#10b981]/30">
                        EVIDENCIA LISTA
                      </span>
                    )}
                  </div>

                  {/* Media Mode Selector */}
                  <div className="space-y-1.5 text-xs font-mono">
                    <label className="text-[10px] text-[#888] uppercase block font-bold">
                      Modo de Entrada Multimedia:
                    </label>
                    <select
                      value={multimediaPreset || 'multimedia-thermal'}
                      onChange={(e) => {
                        const val = e.target.value;
                        setMultimediaPreset(val);
                        if (val === 'custom-camera') {
                          startCamera();
                        } else {
                          stopCamera();
                        }
                      }}
                      className="w-full bg-[#111] border border-[#222] focus:border-[#10b981] rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none"
                    >
                      <option value="multimedia-thermal">Preset Térmico FLIR (Frontera Noche)</option>
                      <option value="multimedia-drone">Preset Óptico VANT (Caravana 4x4)</option>
                      <option value="multimedia-night">Preset Visor Nocturno (Cruce No Habilitado)</option>
                      <option value="custom-camera">Cámara Táctica / Sensor FLIR en Vivo</option>
                      <option value="custom-upload">Subir Archivo / Evidencia de Terreno</option>
                      <option value="none">Sin Adjunto Multimedia</option>
                    </select>
                  </div>

                  {/* Camera / FLIR Live View Display */}
                  {multimediaPreset === 'custom-camera' && (
                    <div className="space-y-2">
                      <div className="relative bg-black rounded-lg overflow-hidden border border-[#222] aspect-video flex items-center justify-center">
                        {cameraActive ? (
                          isSimulatingCamera ? (
                            <canvas
                              ref={simCanvasRef}
                              width={380}
                              height={240}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <video
                              ref={videoRef}
                              autoPlay
                              playsInline
                              muted
                              className="w-full h-full object-cover"
                            />
                          )
                        ) : (
                          <div className="text-center p-4 space-y-2">
                            <VideoOff className="w-8 h-8 text-[#555] mx-auto" />
                            <p className="text-[11px] font-mono text-[#777]">Cámara táctica en espera</p>
                          </div>
                        )}

                        {cameraActive && (
                          <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/70 border border-red-500/40 text-[9px] font-mono text-red-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            REC // HUD ACTIVO
                          </div>
                        )}
                      </div>

                      {cameraError && (
                        <p className="text-[10px] font-mono text-amber-400 bg-amber-500/10 p-2 rounded border border-amber-500/20">
                          {cameraError}
                        </p>
                      )}

                      <div className="flex gap-2">
                        {cameraActive ? (
                          <>
                            <button
                              type="button"
                              onClick={capturePhoto}
                              className="flex-1 bg-[#10b981] hover:bg-[#10b981]/90 text-black font-mono font-bold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                            >
                              <Crosshair className="w-3.5 h-3.5" />
                              <span>Capturar Fotograma</span>
                            </button>
                            <button
                              type="button"
                              onClick={stopCamera}
                              className="px-3 bg-[#222] hover:bg-[#333] text-[#aaa] font-mono text-xs py-2 rounded-lg transition-colors cursor-pointer"
                            >
                              Detener
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={startCamera}
                            className="w-full bg-[#10b981]/20 hover:bg-[#10b981]/30 text-[#10b981] border border-[#10b981]/40 font-mono font-bold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Video className="w-3.5 h-3.5" />
                            <span>Activar Sensor / Cámara</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* File Upload Dropzone */}
                  {multimediaPreset === 'custom-upload' && (
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer ${
                        dragOver 
                          ? 'border-[#10b981] bg-[#10b981]/10' 
                          : 'border-[#222] hover:border-[#333] bg-[#0d0d0d]'
                      }`}
                      onClick={() => document.getElementById('tactical-file-input')?.click()}
                    >
                      <input
                        id="tactical-file-input"
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <Upload className="w-6 h-6 text-[#777] mx-auto mb-2" />
                      <p className="text-xs font-mono text-white font-bold mb-1">
                        Arrastre o seleccione evidencia fotográfica
                      </p>
                      <p className="text-[10px] font-mono text-[#666]">
                        Formatos JPG, PNG, WEBP // Máx 15MB con compresión automática
                      </p>
                    </div>
                  )}

                  {/* Captured / Uploaded Image Preview */}
                  {Boolean(customPhoto && customPhoto.trim() !== '') && (
                    <div className="relative rounded-lg overflow-hidden border border-[#10b981]/40 bg-black">
                      <img
                        src={customPhoto}
                        alt="Evidencia táctica capturada"
                        className="w-full h-32 object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-between p-2">
                        <span className="text-[10px] font-mono text-[#10b981] font-bold">
                          FOTOGRAMA REGISTRADO
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomPhoto(null);
                            playTacticalBeep(300, 0.1);
                          }}
                          className="bg-red-500/80 hover:bg-red-600 text-white p-1 rounded transition-colors cursor-pointer"
                          title="Eliminar fotograma"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tactical Telemetry Quick-Bar */}
                <div className="pt-3 border-t border-[#1a1a1a] flex items-center justify-between text-[10px] font-mono text-[#666]">
                  <span>Sincronización: Canales VHF CAD-C2</span>
                  <span className="text-[#10b981]">ENLACE ACTIVO</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ASSIGNED ORDERS (OOA) */}
          {activePatrolTab === 'ORDERS' && (
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-5 shadow-lg space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-3">
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-[#10b981]" />
                  <div>
                    <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                      Órdenes de Operaciones Asignadas (OOA) // {selectedPatrol}
                    </h4>
                    <p className="text-[10px] font-mono text-[#777]">
                      Misiones directas emitidas por el Comando Conjunto para esta unidad.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono px-2.5 py-1 rounded bg-[#111] border border-[#222] text-[#aaa]">
                  {patrolOrders.length} orden(es) asignada(s)
                </span>
              </div>

              {patrolOrders.length === 0 ? (
                <div className="text-center py-10 space-y-3 bg-[#0d0d0d] rounded-lg border border-[#1a1a1a]">
                  <CheckCircle2 className="w-10 h-10 text-[#10b981] mx-auto" />
                  <h5 className="text-sm font-mono font-bold text-white">SIN ÓRDENES PENDIENTES</h5>
                  <p className="text-xs font-mono text-[#777] max-w-sm mx-auto">
                    La patrulla {selectedPatrol} mantiene su patrón de patrullaje habitual en su sector asignado.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {patrolOrders.map(order => (
                    <div
                      key={order.id}
                      className="bg-[#111] border border-[#222] hover:border-[#333] rounded-lg p-4 space-y-3 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-mono text-[#666] block">ID: {order.id}</span>
                          <h5 className="text-xs font-mono font-bold text-white uppercase">
                            {order.codeName || 'Misión Táctica'}
                          </h5>
                        </div>
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                          order.status === 'IN_PROGRESS'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                            : order.status === 'RECEIVED'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                            : order.status === 'COMPLETED'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-[#222] text-[#888]'
                        }`}>
                          {order.status}
                        </span>
                      </div>

                      <p className="text-xs font-mono text-[#aaa] leading-relaxed bg-[#0a0a0a] p-2.5 rounded border border-[#1a1a1a]">
                        {order.objective || 'Interdicción y control de paso clandestino.'}
                      </p>

                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-[#777]">
                        <div>
                          <span>Emisor:</span> <b className="text-amber-400">{order.issuer || 'CEO-LCC'}</b>
                        </div>
                        <div>
                          <span>Coordenadas:</span> <b className="text-white">{order.coordinates || 'Sector Asignado'}</b>
                        </div>
                      </div>

                      {/* Action buttons based on status */}
                      <div className="flex gap-2 pt-1 border-t border-[#1f1f1f]">
                        {order.status === 'ISSUED' && (
                          <button
                            type="button"
                            onClick={() => {
                              onConfirmOrder(order.id, 'RECEIVED');
                              playTacticalBeep(900, 0.1);
                              setSuccessBanner(`ORDEN RECIBIDA: ${selectedPatrol} confirmó acuse de recibo de ${order.id}.`);
                              setTimeout(() => setSuccessBanner(null), 3000);
                            }}
                            className="flex-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-mono font-bold py-1.5 rounded transition-all cursor-pointer"
                          >
                            Confirmar Recepción
                          </button>
                        )}

                        {order.status === 'RECEIVED' && (
                          <button
                            type="button"
                            onClick={() => {
                              onConfirmOrder(order.id, 'IN_PROGRESS');
                              playTacticalBeep(1100, 0.1);
                              setSuccessBanner(`DESPLIEGUE INICIADO: ${selectedPatrol} comenzó interdicción en sector.`);
                              setTimeout(() => setSuccessBanner(null), 3000);
                            }}
                            className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 text-[11px] font-mono font-bold py-1.5 rounded transition-all cursor-pointer"
                          >
                            Iniciar Interdicción
                          </button>
                        )}

                        {order.status === 'IN_PROGRESS' && (
                          <button
                            type="button"
                            onClick={() => {
                              onConfirmOrder(order.id, 'COMPLETED');
                              playTacticalBeep(1200, 0.15);
                              setSuccessBanner(`MISIÓN CUMPLIDA: Orden ${order.id} ejecutada por ${selectedPatrol}.`);
                              setTimeout(() => setSuccessBanner(null), 3000);
                            }}
                            className="flex-1 bg-[#10b981]/20 hover:bg-[#10b981]/30 text-[#10b981] border border-[#10b981]/40 text-[11px] font-mono font-bold py-1.5 rounded transition-all cursor-pointer"
                          >
                            Confirmar Misión Cumplida
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: GPS SATELITAL & MOVIMIENTO TÁCTICO */}
          {activePatrolTab === 'GPS' && (
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-5 shadow-lg space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-400" />
                  <div>
                    <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                      Telemetría y Posicionamiento Satelital GPS // {selectedPatrol}
                    </h4>
                    <p className="text-[10px] font-mono text-[#777]">
                      Receptor GNSS de precisión militar y simulador de patrullaje en el teatro de operaciones.
                    </p>
                  </div>
                </div>
                {gpsAccuracy && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">
                    Precisión Satelital: ±{Math.round(gpsAccuracy)}m
                  </span>
                )}
              </div>

              {/* Coordinates Edit & Sync Form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono text-[#888] uppercase block mb-1">
                    Latitud Geodésica (DMS):
                  </label>
                  <input
                    type="text"
                    value={customLat || ''}
                    onChange={(e) => setCustomLat(e.target.value)}
                    placeholder='19°13&apos;10"S'
                    className="w-full bg-[#111] border border-[#222] focus:border-blue-500 rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-[#888] uppercase block mb-1">
                    Longitud Geodésica (DMS):
                  </label>
                  <input
                    type="text"
                    value={customLon || ''}
                    onChange={(e) => setCustomLon(e.target.value)}
                    placeholder='68°35&apos;50"W'
                    className="w-full bg-[#111] border border-[#222] focus:border-blue-500 rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none"
                  />
                </div>
              </div>

              {/* GPS Action Controls */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPatrolForEarth(selectedUnitDetails);
                    setIsGoogleEarthModalOpen(true);
                  }}
                  className="bg-[#0a1628] hover:bg-[#112440] text-cyan-300 hover:text-white border border-cyan-500/50 font-mono font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.25)]"
                  title="Visualizar la patrulla en Google Earth 3D en tiempo real con modelado orográfico y satelital"
                >
                  <Globe className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                  <span>Visualizar en Google Earth 3D</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadRealDeviceKml}
                  className="bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 hover:text-emerald-100 border border-emerald-500/50 font-mono font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                  title="Genera y descarga el archivo KML de la ubicación actual del dispositivo para Google Earth"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Generar KML de Mi Ubicación Real</span>
                </button>

                <button
                  type="button"
                  onClick={handleUpdateGPS}
                  className="bg-[#10b981] hover:bg-[#10b981]/90 text-black font-mono font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sincronizar Coordenadas</span>
                </button>

                <button
                  type="button"
                  onClick={isTrackingGPS ? stopRealTimeGPSTracking : startRealTimeGPSTracking}
                  className={`font-mono text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer border ${
                    isTrackingGPS
                      ? 'bg-blue-500 text-white border-blue-400 shadow-md shadow-blue-500/20'
                      : 'bg-[#111] hover:bg-[#1a1a1a] text-blue-400 border-blue-500/40'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{isTrackingGPS ? 'Detener GPS en Vivo' : 'Activar GPS Satelital Real'}</span>
                </button>

                <button
                  type="button"
                  onClick={isSimulatingMovement ? stopSimulatedMovement : startSimulatedMovement}
                  className={`font-mono text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer border ${
                    isSimulatingMovement
                      ? 'bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/20'
                      : 'bg-[#111] hover:bg-[#1a1a1a] text-amber-400 border-amber-500/40'
                  }`}
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>{isSimulatingMovement ? 'Detener Patrullaje Simulado' : 'Simular Movimiento de Patrulla'}</span>
                </button>
              </div>

              {/* Terminal Telemetry Log */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-[#888] uppercase block">
                  Consola de Telemetría Táctica en Vivo:
                </label>
                <div className="bg-black rounded-lg border border-[#1a1a1a] p-3 font-mono text-[11px] text-[#10b981] h-36 overflow-y-auto space-y-1 select-all">
                  {trackingLog.length === 0 ? (
                    <span className="text-[#555]">Receptor GNSS en reposo. Presione &apos;Activar GPS&apos; o &apos;Simular Movimiento&apos; para registrar telemetría.</span>
                  ) : (
                    trackingLog.map((entry, idx) => (
                      <div key={idx} className="leading-tight">
                        {entry}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: COMPREHENSIVE FUSION DASHBOARD (OPTIONAL EXTENSION) */}
          {activePatrolTab === 'DASHBOARD' && (
            <div className="animate-fade-in">
              <PatrolOperationalDashboard
                key={selectedUnitDetails.id}
                patrol={selectedUnitDetails}
                rawAlerts={rawAlerts}
                clans={clans}
                actionableIntel={actionableIntel}
                expedientes={expedientes}
                activeOrders={activeOrders}
                onLockPatrol={handleLockPatrol}
                onOpenEditPatrol={handleOpenEditPatrol}
                onTriggerSOS={() => setSosConfirmModal(true)}
                onAddExpediente={onAddExpediente}
                onPromoteToIntel={onPromoteToIntel}
                onUpdateAlertStatus={onUpdateAlertStatus}
                onConfirmOrder={onConfirmOrder}
                onSendFieldReport={onSendFieldReport}
                onUpdateUnitCoordinates={onUpdateUnitCoordinates}
              />
            </div>
          )}
        </div>
      )}

      {/* Modals & Dialogs */}
      <PatrolAuthModal
        isOpen={authModalOpen}
        patrol={authTargetPatrol || selectedUnitDetails || null}
        onClose={() => setAuthModalOpen(false)}
        onSuccessUnlock={handleUnlockSuccess}
      />

      <PatrolEditorModal
        isOpen={editorModalOpen}
        mode={editorMode}
        patrol={editorTargetPatrol}
        onClose={() => setEditorModalOpen(false)}
        onSave={handleSavePatrol}
        onDelete={handleDeletePatrol}
      />

      {/* SOS Confirm Dialog */}
      {sosConfirmModal && selectedUnitDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-[#0f0f0f] border-2 border-[#f43f5e] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl relative text-left">
            <div className="flex items-center justify-between pb-3 border-b border-[#222]">
              <div className="flex items-center gap-2 text-[#f43f5e]">
                <AlertTriangle className="w-5 h-5 animate-bounce" />
                <h3 className="font-mono font-bold text-sm tracking-wider uppercase">
                  CONFIRMACIÓN DE AUXILIO SOS
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSosConfirmModal(false)}
                className="text-[#666] hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="bg-red-950/20 border border-red-500/30 p-3 rounded-lg text-xs font-mono text-red-300 leading-relaxed">
              ¿Está seguro de emitir una señal de auxilio <b>MAYDAY / SOS</b> para la unidad <b>{selectedUnitDetails.name}</b>?
              Se disparará una alerta táctica de máxima prioridad a la Central de Fusión (CFI) y al mando militar.
            </div>

            <div className="text-xs font-mono text-[#888] space-y-1">
              <div>Ubicación reportada: <span className="text-white font-bold">{coordinates}</span></div>
              <div>Canal de transmisión: <span className="text-[#3b82f6] font-bold">{selectedUnitDetails.frequency || '142.850 MHz'}</span></div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSosConfirmModal(false)}
                className="flex-1 py-2 rounded-lg bg-[#1a1a1a] hover:bg-[#252525] text-[#888] hover:text-white text-xs font-mono border border-[#333] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSendSOSAlert}
                className="flex-1 py-2 rounded-lg bg-[#f43f5e] hover:bg-[#f43f5e]/90 text-white font-bold text-xs font-mono shadow-lg shadow-[#f43f5e]/20 flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>CONFIRMAR SOS</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Patrol Location in Google Earth 3D Modal */}
      <GoogleEarthPatrolModal
        isOpen={isGoogleEarthModalOpen}
        onClose={() => setIsGoogleEarthModalOpen(false)}
        selectedPatrol={selectedPatrolForEarth || selectedUnitDetails || null}
        allPatrols={tacticalUnits}
        onSelectPatrol={(patrol) => setSelectedPatrolForEarth(patrol)}
      />
    </div>
  );
}
