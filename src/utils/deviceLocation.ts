/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Gestor y Hook de Telemetría GNSS / GPS en Vivo del Dispositivo Físico (PII-LCC)
 * Provee geolocalización real multi-nivel (GNSS Alta Precisión -> Red OS/Wi-Fi -> Geolocalización IP Terminal)
 * para teléfonos, tablets y laptops/PCs en cualquier navegador o entorno instalado.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { convertToDMS, formatToMilitaryDMS } from './geo';
import { safeStorage } from './storage';

export type LocationFixSource = 'GNSS_HIGH' | 'NETWORK_BROWSER' | 'IP_FALLBACK' | 'CACHED';

export interface DeviceLocationState {
  lat: number;
  lon: number;
  dms: string;
  dmsLat?: string;
  dmsLon?: string;
  accuracy: number | null; // en metros
  altitude: number | null; // en metros s.n.m.
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
  isoTime: string;
  isLive: boolean;
  deviceType: string;
  error: string | null;
  source?: LocationFixSource;
  sourceLabel?: string;
  locationName?: string | null;
  browserPermissionDenied?: boolean;
}

const STORAGE_KEY = 'PII_LCC_DEVICE_REAL_GPS';

/**
 * Detecta el tipo y plataforma del dispositivo físico que ejecuta la aplicación
 */
export function detectDevicePlatform(): string {
  if (typeof navigator === 'undefined') return 'Terminal Desconocida';
  const ua = navigator.userAgent || '';
  const isPwa = typeof window !== 'undefined' && Boolean(
    (window.matchMedia && window.matchMedia('(display-mode: standalone)')?.matches) || (window.navigator as any)?.standalone
  );

  let type = 'Terminal Táctica PC/Escritorio';
  if (/Android/i.test(ua)) {
    type = 'Dispositivo Android Táctico';
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    type = 'Terminal Móvil iOS / iPad';
  } else if (/Macintosh|Mac OS/i.test(ua)) {
    type = 'Estación de Mando macOS';
  } else if (/Windows/i.test(ua)) {
    type = 'Estación Táctica Windows';
  } else if (/Linux/i.test(ua)) {
    type = 'Estación de Campo Linux GNSS';
  }

  return isPwa ? `${type} [PWA Instalada]` : `${type} [Navegador Web]`;
}

/**
 * Recupera la última posición real guardada del dispositivo en almacenamiento local
 */
export function getCachedDeviceLocation(): DeviceLocationState | null {
  try {
    const raw = safeStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.lat === 'number' && typeof parsed.lon === 'number' && (parsed.lat !== 0 || parsed.lon !== 0)) {
        return {
          ...parsed,
          dmsLat: parsed.dmsLat || convertToDMS(parsed.lat, true),
          dmsLon: parsed.dmsLon || convertToDMS(parsed.lon, false),
          isLive: false, // Se marca como cached hasta la siguiente fijación
          source: parsed.source || 'CACHED'
        };
      }
    }
  } catch (e) {
    console.warn('[PII-LCC GPS] Error reading cached location:', e);
  }
  return null;
}

/**
 * Guarda la última ubicación fijada en almacenamiento local seguro
 */
export function saveCachedDeviceLocation(loc: DeviceLocationState): void {
  try {
    safeStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
  } catch (e) {
    console.warn('[PII-LCC GPS] Error caching location:', e);
  }
}

function buildStateFromGeoPosition(
  pos: GeolocationPosition,
  source: 'GNSS_HIGH' | 'NETWORK_BROWSER'
): DeviceLocationState {
  const { latitude, longitude, accuracy, altitude, altitudeAccuracy, heading, speed } = pos.coords;
  const dmsLat = convertToDMS(latitude, true);
  const dmsLon = convertToDMS(longitude, false);
  const dmsStr = `${dmsLat} ${dmsLon}`;
  const roundedAcc = accuracy !== undefined && Number.isFinite(accuracy) ? Math.round(accuracy) : null;

  return {
    lat: latitude,
    lon: longitude,
    dms: dmsStr,
    dmsLat,
    dmsLon,
    accuracy: roundedAcc,
    altitude: altitude !== null && altitude !== undefined ? Math.round(altitude) : null,
    altitudeAccuracy: altitudeAccuracy ? Math.round(altitudeAccuracy) : null,
    heading: heading !== null && heading !== undefined ? Math.round(heading) : null,
    speed: speed !== null && speed !== undefined ? Math.round(speed * 3.6) : null,
    timestamp: pos.timestamp || Date.now(),
    isoTime: new Date(pos.timestamp || Date.now()).toISOString(),
    isLive: true,
    deviceType: detectDevicePlatform(),
    error: null,
    source,
    sourceLabel: source === 'GNSS_HIGH' ? 'GPS Satelital (Alta Precisión)' : 'Posicionamiento OS / Wi-Fi',
    locationName: null,
    browserPermissionDenied: false
  };
}

function getBrowserPositionOnce(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject({ code: 0, message: 'Geolocalización no soportada' });
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

async function fetchWithTimeout(url: string, timeoutMs = 4000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal, cache: 'no-store' });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fallback real de geolocalización por IP pública directa desde el navegador de la terminal.
 * Resuelve la ubicación física aproximada de la terminal cuando el sensor GNSS/Windows Location
 * no está disponible o está bloqueado por políticas del navegador/iframe.
 */
async function resolveClientIpLocation(browserPermissionDenied: boolean): Promise<DeviceLocationState | null> {
  const providers: Array<{
    url: string;
    parse: (data: any) => { lat: number; lon: number; label: string | null } | null;
  }> = [
    {
      url: 'https://ipwho.is/',
      parse: (d) => {
        if (!d || d.success === false) return null;
        const lat = Number(d.latitude);
        const lon = Number(d.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
        const parts = [d.city, d.region, d.country].filter(Boolean);
        return { lat, lon, label: parts.length ? parts.join(', ') : null };
      }
    },
    {
      url: 'https://get.geojs.io/v1/ip/geo.json',
      parse: (d) => {
        if (!d) return null;
        const lat = Number(d.latitude);
        const lon = Number(d.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
        const parts = [d.city, d.region, d.country].filter(Boolean);
        return { lat, lon, label: parts.length ? parts.join(', ') : null };
      }
    },
    {
      url: 'https://ipapi.co/json/',
      parse: (d) => {
        if (!d || d.error) return null;
        const lat = Number(d.latitude);
        const lon = Number(d.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
        const parts = [d.city, d.region, d.country_name].filter(Boolean);
        return { lat, lon, label: parts.length ? parts.join(', ') : null };
      }
    }
  ];

  for (const provider of providers) {
    try {
      const resp = await fetchWithTimeout(provider.url, 4000);
      if (!resp.ok) continue;
      const data = await resp.json();
      const parsed = provider.parse(data);
      if (parsed && (parsed.lat !== 0 || parsed.lon !== 0)) {
        const dmsLat = convertToDMS(parsed.lat, true);
        const dmsLon = convertToDMS(parsed.lon, false);
        const state: DeviceLocationState = {
          lat: parsed.lat,
          lon: parsed.lon,
          dms: `${dmsLat} ${dmsLon}`,
          dmsLat,
          dmsLon,
          accuracy: 2500,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
          timestamp: Date.now(),
          isoTime: new Date().toISOString(),
          isLive: true,
          deviceType: detectDevicePlatform(),
          error: null,
          source: 'IP_FALLBACK',
          sourceLabel: 'Red IP de la Terminal',
          locationName: parsed.label,
          browserPermissionDenied
        };
        saveCachedDeviceLocation(state);
        return state;
      }
    } catch {
      // Try next provider
    }
  }
  return null;
}

/**
 * Solicita una lectura física real y fresca de la ubicación de la terminal con cascada automática:
 * 1) GNSS de alta precisión (enableHighAccuracy: true, maximumAge: 0)
 * 2) Posicionamiento OS / Wi-Fi del navegador (enableHighAccuracy: false, maximumAge: 0)
 * 3) Geolocalización por Red IP directa de la terminal (si el GPS del navegador falla o está bloqueado)
 */
export async function requestDeviceLocation(options?: {
  allowIpFallback?: boolean;
}): Promise<DeviceLocationState> {
  const allowIpFallback = options?.allowIpFallback !== false;
  let lastErrorMsg = 'Señal satelital GPS no disponible en este momento.';
  let permissionDenied = false;

  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    // Nivel 1: GPS/GNSS de alta precisión (sin caché)
    try {
      const highPos = await getBrowserPositionOnce({
        enableHighAccuracy: true,
        timeout: 6000,
        maximumAge: 0
      });
      const state = buildStateFromGeoPosition(highPos, 'GNSS_HIGH');
      saveCachedDeviceLocation(state);
      return state;
    } catch (err1: any) {
      if (err1?.code === 1) {
        permissionDenied = true;
        lastErrorMsg = 'Permiso de ubicación denegado en el navegador.';
      } else if (err1?.code === 2) {
        lastErrorMsg = 'Sensor GNSS físico no disponible; intentando posicionamiento por red Wi-Fi/OS.';
      } else if (err1?.code === 3) {
        lastErrorMsg = 'Tiempo de espera satelital agotado; intentando posicionamiento por red Wi-Fi/OS.';
      }

      // Nivel 2: Posicionamiento OS / Wi-Fi del navegador (clave para PCs Windows, laptops e interiores)
      if (!permissionDenied) {
        try {
          const netPos = await getBrowserPositionOnce({
            enableHighAccuracy: false,
            timeout: 6500,
            maximumAge: 0
          });
          const state = buildStateFromGeoPosition(netPos, 'NETWORK_BROWSER');
          saveCachedDeviceLocation(state);
          return state;
        } catch (err2: any) {
          if (err2?.code === 1) {
            permissionDenied = true;
            lastErrorMsg = 'Permiso de ubicación denegado en el navegador.';
          } else if (err2?.code === 2) {
            lastErrorMsg = 'Ubicación del sistema operativo temporalmente no disponible.';
          } else if (err2?.code === 3) {
            lastErrorMsg = 'Tiempo límite de espera GPS agotado.';
          }
        }
      }
    }
  } else {
    lastErrorMsg = 'El navegador no expone la API de geolocalización satelital.';
  }

  // Nivel 3: Geolocalización real por Red IP directa de la terminal (garantiza actualizar el punto donde está la terminal)
  if (allowIpFallback) {
    const ipState = await resolveClientIpLocation(permissionDenied);
    if (ipState) {
      return ipState;
    }
  }

  const cached = getCachedDeviceLocation();
  const errState: DeviceLocationState = {
    lat: cached?.lat || 0,
    lon: cached?.lon || 0,
    dms: cached?.dms || 'NO DISPONIBLE',
    dmsLat: cached?.dmsLat,
    dmsLon: cached?.dmsLon,
    accuracy: cached?.accuracy || null,
    altitude: cached?.altitude || null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
    timestamp: Date.now(),
    isoTime: new Date().toISOString(),
    isLive: false,
    deviceType: detectDevicePlatform(),
    error: lastErrorMsg,
    source: 'CACHED',
    browserPermissionDenied: permissionDenied
  };
  throw errState;
}

/**
 * Inicia monitoreo continuo (watchPosition) de la posición real del dispositivo
 * con degradación automática de alta precisión a red OS/Wi-Fi si el hardware GNSS no responde.
 */
export function watchDevicePosition(
  onUpdate: (data: DeviceLocationState) => void,
  onError?: (errorMsg: string) => void
): () => void {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    if (onError) onError('Geolocalización no soportada en el navegador.');
    return () => {};
  }

  let activeWatchId: number | null = null;
  let stopped = false;
  let usingFallbackMode = false;

  const startWatch = (highAccuracy: boolean) => {
    if (stopped) return;
    if (activeWatchId !== null) {
      try {
        navigator.geolocation.clearWatch(activeWatchId);
      } catch {
        // ignore
      }
    }

    activeWatchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (stopped) return;
        const state = buildStateFromGeoPosition(pos, highAccuracy ? 'GNSS_HIGH' : 'NETWORK_BROWSER');
        saveCachedDeviceLocation(state);
        onUpdate(state);
      },
      (err) => {
        if (stopped) return;
        // Si alta precisión falla por timeout o sensor no disponible, cambiar automáticamente a Wi-Fi/OS
        if (highAccuracy && !usingFallbackMode && err.code !== err.PERMISSION_DENIED) {
          usingFallbackMode = true;
          startWatch(false);
          return;
        }
        let msg = 'Error en seguimiento GPS.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Permiso GPS denegado por el usuario.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'Ubicación física temporalmente no disponible.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'Demora en recepción satelital GPS.';
        }
        if (onError) onError(msg);
      },
      {
        enableHighAccuracy: highAccuracy,
        maximumAge: highAccuracy ? 1000 : 5000,
        timeout: highAccuracy ? 8000 : 12000
      }
    );
  };

  startWatch(true);

  return () => {
    stopped = true;
    if (activeWatchId !== null) {
      try {
        navigator.geolocation.clearWatch(activeWatchId);
      } catch (e) {
        console.warn('[PII-LCC GPS] clearWatch error:', e);
      }
      activeWatchId = null;
    }
  };
}

/**
 * Hook de React para acceder a la ubicación real y continua del dispositivo
 */
export function useDeviceLocation(autoStart = false) {
  const [location, setLocation] = useState<DeviceLocationState | null>(() => getCachedDeviceLocation());
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const refreshLocation = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fresh = await requestDeviceLocation();
      setLocation(fresh);
      setIsLoading(false);
      return fresh;
    } catch (err: any) {
      setError(err?.error || 'No se pudo adquirir señal GPS.');
      setIsLoading(false);
      return null;
    }
  }, []);

  const startTracking = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    setIsTracking(true);
    setError(null);

    const cleanup = watchDevicePosition(
      (fresh) => {
        setLocation(fresh);
        setError(null);
      },
      (err) => {
        setError(err);
      }
    );

    cleanupRef.current = cleanup;
  }, []);

  const stopTracking = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    setIsTracking(false);
  }, []);

  useEffect(() => {
    if (autoStart) {
      startTracking();
    }
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [autoStart, startTracking]);

  return {
    location,
    isTracking,
    isLoading,
    error,
    refreshLocation,
    startTracking,
    stopTracking
  };
}
