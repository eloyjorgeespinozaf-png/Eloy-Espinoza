/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AutomatedOrder, MilitaryRole, RawAlert, TacticalUnit } from '../types';
import { AlertCircle, Shield, Navigation, Send, Radio, Check, Volume2, VolumeX, Eye, Info, Camera, Upload, RefreshCw, Trash2, Video, VideoOff, Crosshair } from 'lucide-react';
import { playSyntheticBeep } from '../utils/audio';

interface TacticalViewProps {
  activeOrders?: AutomatedOrder[];
  tacticalUnits?: TacticalUnit[];
  currentRole?: MilitaryRole;
  onConfirmOrder: (id: string, newStatus: 'RECEIVED' | 'IN_PROGRESS' | 'COMPLETED') => void;
  onSendFieldReport: (report: RawAlert) => void;
  onUpdateUnitCoordinates: (unitName: string, newCoords: string) => void;
}

export default function TacticalView({
  activeOrders = [],
  tacticalUnits = [],
  currentRole,
  onConfirmOrder,
  onSendFieldReport,
  onUpdateUnitCoordinates
}: TacticalViewProps) {
  const [selectedPatrol, setSelectedPatrol] = useState<string>('Patrulla Delta-3');
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
          // Absolute last-resort dummy placeholder image
          setCustomPhoto('multimedia-thermal');
          stopCamera();
        }
      } catch (innerError) {
        console.error('Snapshot simulation fallback also failed:', innerError);
        setCustomPhoto('multimedia-thermal');
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
      mediaUrl: finalMediaUrl
    };

    onSendFieldReport(newReport);
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

      {/* Sound selector and Unit focus bar */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-4 rounded-xl flex flex-wrap gap-4 items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <label className="text-xs font-mono text-[#888] uppercase">Unidad Operador Activo:</label>
          <select
            value={selectedPatrol}
            onChange={(e) => {
              setSelectedPatrol(e.target.value);
              const unit = tacticalUnits.find(u => u.name === e.target.value);
              if (unit && unit.coordinates) {
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
            }}
            className="bg-[#111] text-[#10b981] border border-[#222] text-xs font-mono px-3 py-1.5 rounded-lg focus:outline-none focus:border-[#10b981]"
          >
            {tacticalUnits.map(unit => (
              <option key={unit.id} value={unit.name}>
                {unit.name} ({unit.status})
              </option>
            ))}
          </select>
        </div>

        {/* Tactical Sound Beeper toggle */}
        <div className="flex items-center gap-2">
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
            <span>{soundEnabled ? 'Beeper Activo' : 'Beeper Silenciado'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Immediate Alarms & OOA Reception HUD */}
        <div className="lg:col-span-6 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#f43f5e] animate-bounce" />
                <h3 className="text-sm font-mono font-bold text-white uppercase">
                  Recepción de Órdenes Automatizadas (OOA)
                </h3>
              </div>
              <span className="text-[10px] text-[#f43f5e] bg-[#f43f5e]/10 px-2 py-0.5 rounded font-mono animate-pulse">
                CANAL CRÍTICO DE ENLACE
              </span>
            </div>

            {patrolOrders.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-[#1a1a1a] rounded-lg text-[#666] text-xs font-mono space-y-2">
                <Shield className="w-8 h-8 mx-auto text-[#444]" />
                <p>No hay órdenes directas emitidas para la {selectedPatrol}.</p>
                <p className="text-[10px] text-[#555] uppercase">Mando Estratégico CEO en Espera</p>
              </div>
            ) : (
              <div className="space-y-4">
                {patrolOrders.map(order => (
                  <div key={order.id} className="bg-[#111] border-2 border-red-500/20 p-4 rounded-xl space-y-3 relative overflow-hidden text-left">
                    {/* Corner hazard lines styling */}
                    <div className="absolute top-0 right-0 bg-[#f43f5e] text-[#050505] text-[9px] font-mono font-bold px-3 py-0.5 uppercase tracking-wider">
                      MISIÓN ASIGNADA
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#666] font-mono font-bold">CÓDIGO:</span>
                      <span className="text-sm font-mono font-bold text-[#f43f5e]">{order.codeName}</span>
                    </div>

                    <div className="space-y-1 bg-[#050505]/85 p-3 rounded border border-[#1a1a1a] text-xs">
                      <p className="text-[10px] text-[#666] uppercase font-mono font-bold">Objetivo Principal:</p>
                      <p className="text-[#ccc] font-sans leading-relaxed">{order.objective}</p>
                    </div>

                    <div className="grid grid-cols-2 text-xs font-mono text-[#888]">
                      <div>COORDENADA: <span className="text-white">{order.coordinates}</span></div>
                      <div>EMISOR: <span className="text-white">{order.issuer}</span></div>
                    </div>

                    {/* Operational update states block */}
                    {order.updates.length > 0 && (
                      <div className="bg-[#050505] p-2 rounded text-[10px] font-mono text-[#666] border border-[#1a1a1a]">
                        <span className="text-[#3b82f6] font-bold">LOG:</span> {order.updates[order.updates.length - 1]}
                      </div>
                    )}

                    {/* Interactive workflow loop buttons */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-[#1a1a1a]">
                      {order.status === 'ISSUED' && (
                        <button
                          type="button"
                          onClick={() => {
                            onConfirmOrder(order.id, 'RECEIVED');
                            playTacticalBeep(750, 0.15);
                          }}
                          className="flex-1 bg-[#3b82f6] hover:bg-[#3b82f6]/90 text-white font-mono text-xs py-2 rounded flex items-center justify-center gap-1.5 font-bold transition-all uppercase cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Confirmar Recepción</span>
                        </button>
                      )}

                      {order.status === 'RECEIVED' && (
                        <button
                          type="button"
                          onClick={() => {
                            onConfirmOrder(order.id, 'IN_PROGRESS');
                            playTacticalBeep(800, 0.2);
                          }}
                          className="flex-1 bg-[#f97316] hover:bg-[#f97316]/90 text-white font-mono text-xs py-2 rounded flex items-center justify-center gap-1.5 font-bold transition-all uppercase cursor-pointer"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>Iniciar Despliegue</span>
                        </button>
                      )}

                      {order.status === 'IN_PROGRESS' && (
                        <button
                          type="button"
                          onClick={() => {
                            onConfirmOrder(order.id, 'COMPLETED');
                            playTacticalBeep(1000, 0.4);
                          }}
                          className="flex-1 bg-[#10b981] hover:bg-[#10b981]/90 text-white font-mono text-xs py-2 rounded flex items-center justify-center gap-1.5 font-bold transition-all uppercase cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Misión Cumplida (Éxito)</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 bg-[#111] p-3 rounded-lg border border-[#1a1a1a] flex items-center gap-2 text-xs font-sans text-[#666]">
            <Info className="w-4 h-4 text-[#10b981] shrink-0" />
            <span>Al confirmar el cierre de la misión, el sistema notificará inmediatamente al CEO de la desarticulación del contrabandista.</span>
          </div>
        </div>

        {/* Center column: Ground GPS Coordinates Georeferencing Simulator */}
        <div className="lg:col-span-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-5 shadow-lg text-left flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-[#10b981] animate-pulse" />
                <h3 className="text-sm font-mono font-bold text-white uppercase">
                  Georreferenciación GPS
                </h3>
              </div>
              <span className="text-[10px] text-[#10b981] bg-[#10b981]/10 px-2 py-0.5 rounded font-mono">
                GPS MIL-SPEC
              </span>
            </div>

            <div className="space-y-4">
              <p className="text-[#888] text-xs font-sans leading-relaxed">
                Establezca la ubicación física actual de su dispositivo en tiempo real para sincronizar su movimiento táctico en la red.
              </p>

              {/* Mode Selectors */}
              <div className="grid grid-cols-2 gap-2">
                {/* Live Real GPS */}
                <button
                  type="button"
                  onClick={isTrackingGPS ? stopRealTimeGPSTracking : startRealTimeGPSTracking}
                  className={`py-1.5 px-2 rounded font-mono text-[9px] font-bold border transition-all uppercase flex flex-col items-center justify-center gap-1 cursor-pointer ${
                    isTrackingGPS
                      ? "bg-[#10b981]/15 text-[#10b981] border-[#10b981] animate-pulse"
                      : "bg-[#111] text-[#888] border-[#222] hover:border-[#444]"
                  }`}
                >
                  <Radio className={`w-3.5 h-3.5 ${isTrackingGPS ? "animate-ping" : ""}`} />
                  <span>GPS EN VIVO</span>
                </button>

                {/* Simulated continuous walk */}
                <button
                  type="button"
                  onClick={isSimulatingMovement ? stopSimulatedMovement : startSimulatedMovement}
                  className={`py-1.5 px-2 rounded font-mono text-[9px] font-bold border transition-all uppercase flex flex-col items-center justify-center gap-1 cursor-pointer ${
                    isSimulatingMovement
                      ? "bg-purple-950/30 text-purple-400 border-purple-500 animate-pulse"
                      : "bg-[#111] text-[#888] border-[#222] hover:border-[#444]"
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSimulatingMovement ? "animate-spin" : ""}`} />
                  <span>SIM PATRULLA</span>
                </button>
              </div>

              {/* GPS status and accuracy indicators */}
              {(isTrackingGPS || isSimulatingMovement) && (
                <div className="bg-black border border-[#1a1a1a] rounded p-2 text-[9px] font-mono space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[#666]">ESTADO RECEPTOR:</span>
                    <span className="text-[#10b981] font-bold animate-pulse">
                      {isTrackingGPS ? "SATELLITE_FIX_OK" : "AUTO_PATROL_ACTIVE"}
                    </span>
                  </div>
                  {gpsAccuracy !== null && (
                    <div className="flex justify-between">
                      <span className="text-[#666]">PRECISIÓN ESTIMADA:</span>
                      <span className="text-white font-bold">±{Math.round(gpsAccuracy)}m</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[#666]">MANDO ASOCIADO:</span>
                    <span className="text-white font-bold">{selectedPatrol}</span>
                  </div>
                </div>
              )}

              {/* Manual inputs (disabled/read-only during tracking/simulation to protect signal integrity) */}
              <div className="space-y-3 pt-1 border-t border-[#1a1a1a]">
                <div>
                  <label className="block text-[10px] font-mono text-[#666] uppercase mb-1 font-bold flex justify-between">
                    <span>Latitud Física</span>
                    {(isTrackingGPS || isSimulatingMovement) && <span className="text-[#10b981] text-[8px] animate-pulse">● SAT-LINK</span>}
                  </label>
                  <input
                    type="text"
                    disabled={isTrackingGPS || isSimulatingMovement}
                    value={customLat}
                    onChange={(e) => setCustomLat(e.target.value)}
                    placeholder={"e.g. 19°13'10\"S"}
                    className="w-full bg-[#111] text-white border border-[#222] rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-[#10b981] disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-[#666] uppercase mb-1 font-bold flex justify-between">
                    <span>Longitud Física</span>
                    {(isTrackingGPS || isSimulatingMovement) && <span className="text-[#10b981] text-[8px] animate-pulse">● SAT-LINK</span>}
                  </label>
                  <input
                    type="text"
                    disabled={isTrackingGPS || isSimulatingMovement}
                    value={customLon}
                    onChange={(e) => setCustomLon(e.target.value)}
                    placeholder={"e.g. 68°35'50\"W"}
                    className="w-full bg-[#111] text-white border border-[#222] rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-[#10b981] disabled:opacity-50"
                  />
                </div>
              </div>

              {!isTrackingGPS && !isSimulatingMovement && (
                <button
                  type="button"
                  onClick={handleUpdateGPS}
                  className="w-full bg-[#10b981] hover:bg-[#10b981]/90 text-white font-mono text-xs py-2 px-3 rounded flex items-center justify-center gap-1.5 font-bold transition-all uppercase cursor-pointer"
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>TRANSMITIR POSICIÓN MANUAL</span>
                </button>
              )}

              {/* Real-time Tracking terminal console output */}
              {trackingLog.length > 0 && (
                <div className="mt-3">
                  <span className="block text-[9px] font-mono text-[#666] uppercase mb-1 font-bold">TERMINAL DE REGISTRO SATELITAL</span>
                  <div className="bg-[#050505] border border-[#222] rounded p-2 text-[8px] font-mono text-[#10b981] h-20 overflow-y-auto space-y-1 scrollbar-thin">
                    {trackingLog.map((log, i) => (
                      <p key={i} className="leading-tight select-all truncate">{log}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4">
            {/* Coordinate readout */}
            {selectedUnitDetails && (
              <div className="bg-[#111] border border-[#222] p-3 rounded-lg text-xs font-mono text-[#666] space-y-1.5">
                <p className="font-bold text-white border-b border-[#222] pb-1 flex items-center gap-1">
                  📡 Telemetría Enviada
                </p>
                <p className="text-[10px]">Unidad: <span className="text-white font-bold">{selectedUnitDetails.name}</span></p>
                <p className="text-[10px]">Ubicación: <span className="text-white font-bold">{selectedUnitDetails.coordinates}</span></p>
                <p className="text-[10px]">Efectivos: <span className="text-white font-bold">{selectedUnitDetails.personnel} soldados</span></p>
                <p className="text-[10px]">Última Transmisión: <span className="text-[#10b981] font-bold">Activo</span></p>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Raw Field Report Sender (Órganos de Búsqueda inputs) */}
        <div className="lg:col-span-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-5 shadow-lg text-left flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-[#f97316]" />
                <h3 className="text-sm font-mono font-bold text-white uppercase">
                  Órgano de Búsqueda (Captura)
                </h3>
              </div>
              <span className="text-[10px] text-[#f97316] bg-[#f97316]/10 px-2 py-0.5 rounded font-mono font-semibold">BÚSQUEDA S-2</span>
            </div>

            <form onSubmit={handleSendReport} className="space-y-4">
              <p className="text-[#888] text-xs font-sans leading-relaxed">
                Formulario de registro primario doctrinal. No se permite análisis ni asignación de rutas (reservado para CFI de Brigada).
              </p>

              {/* ID Sensor/Fuente */}
              <div>
                <label className="block text-[10px] font-mono text-[#666] uppercase mb-1 font-bold">
                  [ID Sensor / Fuente] *
                </label>
                <select
                  value={sensorId}
                  onChange={(e) => {
                    setSensorId(e.target.value);
                    // Match sensor to reportType automatically
                    if (e.target.value.includes('VANT') || e.target.value.includes('IR')) {
                      setReportType('IMINT');
                    } else if (e.target.value.includes('RF') || e.target.value.includes('RADAR')) {
                      setReportType('SIGINT');
                    } else {
                      setReportType('HUMINT');
                    }
                  }}
                  className="w-full bg-[#111] text-white border border-[#222] rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-[#f97316]"
                >
                  <option value="VANT-01 (Cóndor - Dron Óptico)">VANT-01 (Cóndor - Dron Óptico)</option>
                  <option value="VANT-02 (Halcón - Térmico Nocturno)">VANT-02 (Halcón - Térmico Nocturno)</option>
                  <option value="SENSOR-IR-03 (Barrera Infrarroja)">SENSOR-IR-03 (Barrera Infrarroja)</option>
                  <option value="SENSOR-RF-08 (Escáner Frecuencias)">SENSOR-RF-08 (Escáner Frecuencias)</option>
                  <option value="HUMINT-P2 (Contacto de Frontera)">HUMINT-P2 (Contacto de Frontera)</option>
                  <option value="SENSOR-RADAR-05 (Radar Terrestre)">SENSOR-RADAR-05 (Radar Terrestre)</option>
                </select>
              </div>

              {/* Coordenadas Geográficas */}
              <div>
                <label className="block text-[10px] font-mono text-[#666] uppercase mb-1 font-bold">
                  [Coordenadas Geográficas] *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={coordinates}
                    onChange={(e) => setCoordinates(e.target.value)}
                    placeholder={'e.g. 19°13\'10"S 68°35\'50"W'}
                    className="flex-1 bg-[#111] text-white border border-[#222] rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-[#f97316]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const gpsCoords = `${customLat} ${customLon}`;
                      setCoordinates(gpsCoords);
                      playTacticalBeep(600, 0.05);
                    }}
                    title="Copiar del GPS de Terreno"
                    className="bg-[#111] border border-[#222] hover:border-[#444] text-[#10b981] px-2 rounded text-[10px] font-mono transition-all cursor-pointer"
                  >
                    SYNC
                  </button>
                </div>
              </div>

              {/* Timestamp */}
              <div>
                <label className="block text-[10px] font-mono text-[#666] uppercase mb-1 font-bold">
                  [Timestamp de Adquisición] *
                </label>
                <input
                  type="text"
                  required
                  value={timestamp}
                  onChange={(e) => setTimestamp(e.target.value)}
                  className="w-full bg-[#111] text-gray-400 border border-[#222] rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none"
                />
              </div>

              {/* Objeto/Evento Observado */}
              <div>
                <label className="block text-[10px] font-mono text-[#666] uppercase mb-1 font-bold">
                  [Objeto / Evento Observado] *
                </label>
                <textarea
                  rows={3}
                  required
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Descripción literal del avistamiento (e.g. Columna de 4 vehículos pesados cruzando límite sin luces)..."
                  className="w-full bg-[#111] text-white border border-[#222] rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-[#f97316] resize-none"
                />
              </div>

              {/* Imagen/Multimedia adjunto */}
              <div>
                <label className="block text-[10px] font-mono text-[#666] uppercase mb-1 font-bold">
                  [Imagen / Multimedia Adjunto] *
                </label>
                <select
                  value={multimediaPreset}
                  onChange={(e) => {
                    const val = e.target.value;
                    setMultimediaPreset(val);
                    setCustomPhoto(null);
                    stopCamera();
                    // Auto set source/type for manual photos
                    if (val === 'custom-upload' || val === 'custom-camera') {
                      setReportType('HUMINT');
                      setSensorId('HUMINT-P2 (Contacto de Frontera)');
                    }
                  }}
                  className="w-full bg-[#111] text-white border border-[#222] rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-[#f97316] mb-2"
                >
                  <option value="multimedia-thermal">SCAN_TERMIC_VANT01.JPG (Firma Térmica)</option>
                  <option value="multimedia-optical">SILUETA_CAMION_NIGHTVISION.JPG (Visión Nocturna)</option>
                  <option value="multimedia-radar">RADAR_INTERCEPT_PLOT_09.JPG (Frecuencia UHF)</option>
                  <option value="multimedia-satellite">SATELITE_OPTICO_ZOOM.JPG (Estela Satelital)</option>
                  <option value="custom-upload">📁 Subir Fotografía (JPG/PNG)</option>
                  <option value="custom-camera">📷 Tomar Fotografía (Cámara en Vivo)</option>
                  <option value="none">Sin Archivo Adjunto</option>
                </select>

                {multimediaPreset === 'custom-upload' && (
                  <div className="space-y-2 mb-2">
                    {!customPhoto ? (
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`border border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${
                          dragOver
                            ? 'border-[#10b981] bg-[#10b981]/10 text-white'
                            : 'border-[#222] hover:border-[#444] text-[#888] bg-[#0c0c0c]'
                        }`}
                        onClick={() => document.getElementById('file-upload-input')?.click()}
                      >
                        <Upload className="w-5 h-5 mx-auto mb-1 text-[#666]" />
                        <p className="text-[10px] font-mono">Arrastre una foto aquí o haga clic para buscar</p>
                        <p className="text-[8px] text-[#555] font-mono mt-0.5">Soporta JPG, PNG (Max 5MB)</p>
                        <input
                          id="file-upload-input"
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </div>
                    ) : (
                      <div className="relative border border-[#222] rounded overflow-hidden aspect-video bg-black flex flex-col justify-between p-2 font-mono text-[8px] text-[#10b981]">
                        <img
                          src={customPhoto}
                          alt="Previsualización"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60 pointer-events-none" />
                        <div className="flex justify-between items-start z-10">
                          <span className="bg-black/60 px-1 rounded">EVIDENCIA_FOTOGRAFICA.JPG</span>
                          <button
                            type="button"
                            onClick={() => {
                              setCustomPhoto(null);
                              playTacticalBeep(500, 0.1);
                            }}
                            className="bg-red-900/85 hover:bg-red-800 text-white px-1 py-0.5 rounded text-[8px] uppercase font-bold"
                          >
                            Eliminar
                          </button>
                        </div>
                        <div className="flex justify-between items-end z-10 bg-black/60 px-1 rounded">
                          <span>S-2 ARCHIVO SUBIDO</span>
                          <span>{coordinates}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {multimediaPreset === 'custom-camera' && (
                  <div className="space-y-2 mb-2">
                    {!customPhoto ? (
                      <div className="border border-[#222] rounded-lg overflow-hidden bg-black aspect-video flex flex-col justify-between p-2 font-mono relative">
                        {cameraActive ? (
                          isSimulatingCamera ? (
                            <canvas
                              ref={simCanvasRef}
                              width={320}
                              height={240}
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                          ) : (
                            <video
                              ref={videoRef}
                              autoPlay
                              playsInline
                              className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                            />
                          )
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-[#666] p-4 text-center">
                            <Camera className="w-6 h-6 mb-1 text-[#444]" />
                            <p className="text-[10px]">Cámara en espera para adquisición visual</p>
                            {cameraError && (
                              <p className="text-[9px] text-red-500 mt-1 bg-red-950/20 p-1 border border-red-900/30 rounded">{cameraError}</p>
                            )}
                          </div>
                        )}

                        <div className="flex justify-between items-start z-10 w-full">
                          <span className="bg-black/60 px-1 rounded text-[8px] text-[#10b981] flex items-center gap-1">
                            {cameraActive ? (
                              <>
                                <span className="w-1 h-1 rounded-full bg-red-600 animate-pulse" />
                                CAM_FEED_LIVE
                              </>
                            ) : (
                              <>CAM_FEED_CLOSED</>
                            )}
                          </span>
                          {cameraActive && (
                            <button
                              type="button"
                              onClick={stopCamera}
                              className="bg-black/60 hover:bg-black text-red-400 px-1 py-0.5 rounded text-[8px] uppercase font-bold"
                            >
                              Apagar
                            </button>
                          )}
                        </div>

                        <div className="z-10 w-full flex justify-center pb-1">
                          {cameraActive ? (
                            <button
                              type="button"
                              onClick={capturePhoto}
                              className="bg-red-600 hover:bg-red-500 text-white font-bold px-2.5 py-0.5 rounded text-[8px] tracking-wider uppercase shadow-lg flex items-center gap-1"
                            >
                              <Camera className="w-2.5 h-2.5" />
                              CAPTURAR SNAPSHOT
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={startCamera}
                              className="bg-[#10b981] hover:bg-[#10b981]/90 text-white font-bold px-2.5 py-0.5 rounded text-[8px] tracking-wider uppercase shadow-lg flex items-center gap-1"
                            >
                              <Video className="w-3 h-3" />
                              ENCENDER CÁMARA
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="relative border border-[#222] rounded overflow-hidden aspect-video bg-black flex flex-col justify-between p-2 font-mono text-[8px] text-[#10b981]">
                        <img
                          src={customPhoto}
                          alt="Snapshot capturado"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60 pointer-events-none" />
                        <div className="flex justify-between items-start z-10">
                          <span className="bg-black/60 px-1 rounded">DISPOSITIVO_SNAP_CAM.JPG</span>
                          <button
                            type="button"
                            onClick={() => {
                              setCustomPhoto(null);
                              playTacticalBeep(500, 0.1);
                              startCamera();
                            }}
                            className="bg-yellow-600/80 hover:bg-yellow-600 text-white px-1 py-0.5 rounded text-[8px] uppercase tracking-wider flex items-center gap-0.5 font-bold"
                          >
                            <RefreshCw className="w-2.5 h-2.5" /> Repetir
                          </button>
                        </div>
                        <div className="flex justify-between items-end z-10 bg-black/60 px-1 rounded">
                          <span>CAMARA DE TERRENO S-2</span>
                          <span>{coordinates}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {multimediaPreset !== 'none' && multimediaPreset !== 'custom-upload' && multimediaPreset !== 'custom-camera' && (
                  <div className="mt-2 border border-[#222] rounded bg-black relative overflow-hidden aspect-video flex flex-col justify-between p-2 font-mono text-[8px] text-[#10b981]">
                    <div className="flex justify-between items-start z-10 bg-black/40 px-1 rounded">
                      <span>SYS_BALIZA_ACTIVE</span>
                      <span>FPS: 30.00</span>
                    </div>
                    
                    {multimediaPreset === 'multimedia-thermal' && (
                      <div className="absolute inset-0 flex items-center justify-center flex-col bg-gradient-to-br from-indigo-950/40 via-purple-950/50 to-orange-900/40 animate-pulse">
                        <span className="text-[9px] text-orange-400 font-bold uppercase tracking-wider">▲ FIRMA TÉRMICA ACTIVA [68°C]</span>
                        <span className="text-[#bbb] text-[8px] mt-0.5">[Múltiples focos calientes móviles]</span>
                      </div>
                    )}

                    {multimediaPreset === 'multimedia-optical' && (
                      <div className="absolute inset-0 flex items-center justify-center flex-col bg-emerald-950/40 border border-emerald-500/10">
                        <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">● VISIÓN NOCTURNA IR ADQUISICIÓN</span>
                        <span className="text-[#aaa] text-[8px] mt-0.5">[Silueta en paralelo con desvío]</span>
                      </div>
                    )}

                    {multimediaPreset === 'multimedia-radar' && (
                      <div className="absolute inset-0 flex items-center justify-center flex-col bg-black bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.15)_0%,transparent_80%)]">
                        <span className="text-[9px] text-[#3b82f6] font-bold uppercase tracking-wider animate-ping">⚡ RECONOCIMIENTO ELECTRÓNICO</span>
                        <span className="text-[#888] text-[8px] mt-0.5">[Interceptación UHF portadora]</span>
                      </div>
                    )}

                    {multimediaPreset === 'multimedia-satellite' && (
                      <div className="absolute inset-0 flex items-center justify-center flex-col bg-slate-900/50">
                        <span className="text-[9px] text-purple-400 font-bold uppercase tracking-wider">🛰️ PROYECCIÓN ÓPTICA SATÉLITE</span>
                        <span className="text-[#888] text-[8px] mt-0.5">[Resolución sub-métrica polvo]</span>
                      </div>
                    )}

                    <div className="flex justify-between items-end z-10 bg-black/40 px-1 rounded">
                      <span className="truncate max-w-[120px]">{coordinates || '19°13\'10"S'}</span>
                      <span>S-2 BÚSQUEDA</span>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={!reportDetails}
                className="w-full bg-[#f97316] hover:bg-[#f97316]/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-mono text-xs py-2 px-3 rounded flex items-center justify-center gap-1.5 font-bold transition-all active:scale-[0.99] uppercase cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Reportar Registro</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
