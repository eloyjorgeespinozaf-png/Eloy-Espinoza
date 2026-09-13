/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Gestor y Hook de Telemetría GNSS / GPS en Vivo del Dispositivo Físico (PII-LCC)
 * Provee geolocalización real de alta precisión para teléfonos, tablets y laptops
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { convertToDMS, formatToMilitaryDMS } from './geo';
import { safeStorage } from './storage';

export interface DeviceLocationState {
  lat: number;
  lon: number;
  dms: string;
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
      if (parsed && typeof parsed.lat === 'number' && typeof parsed.lon === 'number') {
        return {
          ...parsed,
          isLive: false // Se marca como cached hasta la siguiente fijación por satélite
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

/**
 * Solicita una lectura física única de alta precisión vía Geolocation API
 */
export function requestDeviceLocation(): Promise<DeviceLocationState> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      const errState: DeviceLocationState = {
        lat: 0,
        lon: 0,
        dms: 'NO DISPONIBLE',
        accuracy: null,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
        timestamp: Date.now(),
        isoTime: new Date().toISOString(),
        isLive: false,
        deviceType: detectDevicePlatform(),
        error: 'El dispositivo o navegador no soporta geolocalización satelital (GPS).'
      };
      reject(errState);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy, altitude, altitudeAccuracy, heading, speed } = pos.coords;
        const dmsStr = formatToMilitaryDMS(latitude, longitude);
        const state: DeviceLocationState = {
          lat: latitude,
          lon: longitude,
          dms: dmsStr,
          accuracy: accuracy !== undefined ? Math.round(accuracy) : null,
          altitude: altitude !== null && altitude !== undefined ? Math.round(altitude) : null,
          altitudeAccuracy: altitudeAccuracy ? Math.round(altitudeAccuracy) : null,
          heading: heading !== null && heading !== undefined ? Math.round(heading) : null,
          speed: speed !== null && speed !== undefined ? Math.round(speed * 3.6) : null, // km/h
          timestamp: pos.timestamp || Date.now(),
          isoTime: new Date(pos.timestamp || Date.now()).toISOString(),
          isLive: true,
          deviceType: detectDevicePlatform(),
          error: null
        };
        saveCachedDeviceLocation(state);
        resolve(state);
      },
      (err) => {
        let msg = 'Error en el sensor GPS.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Permiso de ubicación denegado en este dispositivo. Habilite el acceso en configuración.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'Señal satelital GPS no disponible en este momento.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'Tiempo límite de espera satelital agotado.';
        }
        const cached = getCachedDeviceLocation();
        const state: DeviceLocationState = {
          lat: cached?.lat || 0,
          lon: cached?.lon || 0,
          dms: cached?.dms || 'NO DISPONIBLE',
          accuracy: cached?.accuracy || null,
          altitude: cached?.altitude || null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
          timestamp: Date.now(),
          isoTime: new Date().toISOString(),
          isLive: false,
          deviceType: detectDevicePlatform(),
          error: msg
        };
        reject(state);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0
      }
    );
  });
}

/**
 * Inicia monitoreo continuo (watchPosition) de la posición real del dispositivo
 */
export function watchDevicePosition(
  onUpdate: (data: DeviceLocationState) => void,
  onError?: (errorMsg: string) => void
): () => void {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    if (onError) onError('Geolocalización no soportada en el navegador.');
    return () => {};
  }

  const watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const { latitude, longitude, accuracy, altitude, altitudeAccuracy, heading, speed } = pos.coords;
      const dmsStr = formatToMilitaryDMS(latitude, longitude);
      const state: DeviceLocationState = {
        lat: latitude,
        lon: longitude,
        dms: dmsStr,
        accuracy: accuracy !== undefined ? Math.round(accuracy) : null,
        altitude: altitude !== null && altitude !== undefined ? Math.round(altitude) : null,
        altitudeAccuracy: altitudeAccuracy ? Math.round(altitudeAccuracy) : null,
        heading: heading !== null && heading !== undefined ? Math.round(heading) : null,
        speed: speed !== null && speed !== undefined ? Math.round(speed * 3.6) : null,
        timestamp: pos.timestamp || Date.now(),
        isoTime: new Date(pos.timestamp || Date.now()).toISOString(),
        isLive: true,
        deviceType: detectDevicePlatform(),
        error: null
      };
      saveCachedDeviceLocation(state);
      onUpdate(state);
    },
    (err) => {
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
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 15000
    }
  );

  return () => {
    try {
      navigator.geolocation.clearWatch(watchId);
    } catch (e) {
      console.warn('[PII-LCC GPS] clearWatch error:', e);
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
