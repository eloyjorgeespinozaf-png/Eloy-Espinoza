/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Utilidades geográficas y de coordenadas tácticas militares (PII-LCC)
 */

export interface LatLon {
  lat: number;
  lon: number;
}

/**
 * Convierte grados decimales a formato militar DMS (Grados, Minutos, Segundos)
 */
export function convertToDMS(decimal: number, isLatitude: boolean): string {
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
}

/**
 * Formatea latitud y longitud decimales a par de coordenadas militares DMS
 */
export function formatToMilitaryDMS(latitude: number, longitude: number): string {
  const latDms = convertToDMS(latitude, true);
  const lonDms = convertToDMS(longitude, false);
  return `${latDms} ${lonDms}`;
}

/**
 * Parsea cadenas en formato DMS o decimal a objeto { lat, lon }
 */
export function parseCoordinates(coordStr: string): LatLon | null {
  if (!coordStr) return null;

  // 1. Matches DMS: e.g. 19°13'10"S 68°35'50"W or 19°13'10.5"S, 68°35'50.2"W
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

  // 2. Matches decimal: e.g. "-19.2194 -68.5972" or "-19.2194, -68.5972"
  const cleanStr = coordStr.replace(/[,;]/g, ' ').trim();
  const parts = cleanStr.split(/\s+/);
  if (parts.length >= 2) {
    const lat = parseFloat(parts[0]);
    const lon = parseFloat(parts[1]);
    if (!isNaN(lat) && !isNaN(lon)) {
      return { lat, lon };
    }
  }

  return null;
}

/**
 * Calcula la distancia en kilómetros entre dos coordenadas usando la fórmula Haversine
 */
export function calculateDistanceKm(coord1: string | LatLon, coord2: string | LatLon): number | null {
  const p1 = typeof coord1 === 'string' ? parseCoordinates(coord1) : coord1;
  const p2 = typeof coord2 === 'string' ? parseCoordinates(coord2) : coord2;

  if (!p1 || !p2) return null;

  const R = 6371; // Radio de la Tierra en km
  const dLat = (p2.lat - p1.lat) * (Math.PI / 180);
  const dLon = (p2.lon - p1.lon) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(p1.lat * (Math.PI / 180)) *
      Math.cos(p2.lat * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Genera el enlace directo a Google Earth 3D Web para unas coordenadas dadas
 * @param lat Latitud decimal
 * @param lon Longitud decimal
 * @param altitude Altitud de la cámara en metros (default: 3850m para altiplano)
 * @param distance Distancia de visión en metros
 * @param heading Rumbo de visión (0 a 360 grados)
 * @param tilt Inclinación de la cámara 3D (0 a 90 grados)
 */
export function getGoogleEarthWebUrl(
  lat: number,
  lon: number,
  altitude = 3850,
  distance = 1800,
  heading = 0,
  tilt = 55
): string {
  // Formato oficial Google Earth Web 3D:
  // https://earth.google.com/web/@{lat},{lon},{altitude}a,{distance}d,35y,{heading}h,{tilt}t,0r
  return `https://earth.google.com/web/@${lat.toFixed(6)},${lon.toFixed(6)},${altitude}a,${distance}d,35y,${heading}h,${tilt}t,0r`;
}

/**
 * Genera un archivo KML (Keyhole Markup Language) estándar OGC 2.2 para Google Earth Pro / Desktop
 */
export function generatePatrolKml(
  patrolName: string,
  lat: number,
  lon: number,
  details: {
    status?: string;
    commander?: string;
    frequency?: string;
    sector?: string;
    battery?: number;
    personnel?: number;
    timestamp?: string;
    coordinatesDms?: string;
  }
): string {
  const timeStr = details.timestamp || new Date().toISOString();
  const dmsStr = details.coordinatesDms || formatToMilitaryDMS(lat, lon);
  const statusStr = details.status || 'ACTIVA';
  const commanderStr = details.commander || 'Oficial al Mando';
  const sectorStr = details.sector || 'Zona de Operaciones Frontera Occidental';
  const freqStr = details.frequency || 'VHF Táctico Encriptado';
  const batteryStr = details.battery !== undefined ? `${details.battery}%` : 'N/A';
  const personnelStr = details.personnel !== undefined ? `${details.personnel} Efectivos` : 'N/A';

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2">
  <Document>
    <name>PII-LCC // ${patrolName} - Posición Táctica en Tiempo Real</name>
    <description>Plataforma Integrada de Inteligencia para la LCC - Transmisión GPS Satelital</description>
    <Style id="tacticalPatrolStyle">
      <IconStyle>
        <color>ff00ea10</color>
        <scale>1.3</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/shapes/target.png</href>
        </Icon>
        <hotSpot x="0.5" y="0.5" xunits="fraction" yunits="fraction"/>
      </IconStyle>
      <LabelStyle>
        <color>ffffffff</color>
        <scale>1.0</scale>
      </LabelStyle>
      <BalloonStyle>
        <bgColor>ff151210</bgColor>
        <textColor>ffffffff</textColor>
        <text><![CDATA[
          <div style="font-family: monospace; background: #0f172a; color: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #38bdf8;">
            <h3 style="margin: 0 0 8px 0; color: #38bdf8; border-bottom: 1px solid #1e293b; padding-bottom: 4px;">$[name]</h3>
            <p style="margin: 4px 0;"><strong>ESTADO:</strong> <span style="color: #4ade80;">$[status]</span></p>
            <p style="margin: 4px 0;"><strong>COMANDANTE:</strong> $[commander]</p>
            <p style="margin: 4px 0;"><strong>SECTOR:</strong> $[sector]</p>
            <p style="margin: 4px 0;"><strong>COORDENADAS:</strong> <span style="color: #facc15;">$[coordinates]</span></p>
            <p style="margin: 4px 0;"><strong>FRECUENCIA:</strong> $[frequency]</p>
            <p style="margin: 4px 0;"><strong>BATERÍA / DOTACIÓN:</strong> $[battery] / $[personnel]</p>
            <p style="margin: 8px 0 0 0; font-size: 10px; color: #94a3b8;">Último reporte GNSS: $[timestamp]</p>
          </div>
        ]]></text>
      </BalloonStyle>
    </Style>

    <Placemark>
      <name>${patrolName}</name>
      <description><![CDATA[Unidad de Interdicción y Patrullaje de Frontera PII-LCC]]></description>
      <styleUrl>#tacticalPatrolStyle</styleUrl>
      <ExtendedData>
        <Data name="status"><value>${statusStr}</value></Data>
        <Data name="commander"><value>${commanderStr}</value></Data>
        <Data name="sector"><value>${sectorStr}</value></Data>
        <Data name="coordinates"><value>${dmsStr} (${lat.toFixed(6)}, ${lon.toFixed(6)})</value></Data>
        <Data name="frequency"><value>${freqStr}</value></Data>
        <Data name="battery"><value>${batteryStr}</value></Data>
        <Data name="personnel"><value>${personnelStr}</value></Data>
        <Data name="timestamp"><value>${timeStr}</value></Data>
      </ExtendedData>
      <LookAt>
        <longitude>${lon}</longitude>
        <latitude>${lat}</latitude>
        <altitude>3850</altitude>
        <heading>0</heading>
        <tilt>55</tilt>
        <range>1800</range>
        <altitudeMode>relativeToGround</altitudeMode>
      </LookAt>
      <Point>
        <altitudeMode>clampToGround</altitudeMode>
        <coordinates>${lon},${lat},3850</coordinates>
      </Point>
    </Placemark>
  </Document>
</kml>`;
}

/**
 * Genera coordenadas de un polígono circular alrededor de un punto geodésico
 * Utilizado para graficar el radio de precisión de incertidumbre del GPS en Google Earth
 */
export function generateCircleCoordinates(
  centerLat: number,
  centerLon: number,
  radiusMeters: number,
  points = 36
): string {
  const coords: string[] = [];
  const earthRadius = 6378137; // metros WGS84
  const dLat = (radiusMeters / earthRadius) * (180 / Math.PI);
  const dLon = (radiusMeters / (earthRadius * Math.cos((centerLat * Math.PI) / 180))) * (180 / Math.PI);

  for (let i = 0; i <= points; i++) {
    const angle = (i * 360) / points;
    const rad = (angle * Math.PI) / 180;
    const lat = centerLat + dLat * Math.cos(rad);
    const lon = centerLon + dLon * Math.sin(rad);
    coords.push(`${lon.toFixed(7)},${lat.toFixed(7)},0`);
  }
  return coords.join(' ');
}

/**
 * Genera un archivo KML de alta precisión con la ubicación física REAL y actual
 * del dispositivo donde se encuentra instalada y operando la aplicación PII-LCC
 */
export function generateDeviceRealLocationKml(options: {
  lat: number;
  lon: number;
  accuracy?: number | null;
  altitude?: number | null;
  speed?: number | null;
  heading?: number | null;
  operatorName?: string;
  role?: string;
  devicePlatform?: string;
  timestamp?: string;
}): string {
  const {
    lat,
    lon,
    accuracy,
    altitude,
    speed,
    heading,
    operatorName = 'Operador Táctico PII-LCC',
    role = 'Órgano de Búsqueda y Operaciones',
    devicePlatform = 'Terminal de Terreno / Dispositivo Móvil',
    timestamp = new Date().toISOString()
  } = options;

  const dmsStr = formatToMilitaryDMS(lat, lon);
  const accuracyStr = accuracy ? `±${Math.round(accuracy)} metros` : 'No especificada';
  const altitudeStr = altitude ? `${Math.round(altitude)} m s.n.m.` : 'Nivel de Terreno';
  const speedStr = speed ? `${Math.round(speed)} km/h` : 'Estacionario';
  const headingStr = heading !== null && heading !== undefined ? `${Math.round(heading)}°` : 'N/A';
  const localDateStr = new Date().toLocaleString('es-BO', { timeZoneName: 'short' });

  const accuracyPolygonKml = accuracy && accuracy > 0 ? `
    <Placemark>
      <name>Radio de Precisión GNSS (${accuracyStr})</name>
      <description>Margen de error satelital detectado por el receptor del dispositivo</description>
      <Style>
        <LineStyle>
          <color>ff00ffff</color>
          <width>2</width>
        </LineStyle>
        <PolyStyle>
          <color>4400e5ff</color>
          <fill>1</fill>
          <outline>1</outline>
        </PolyStyle>
      </Style>
      <Polygon>
        <tessellate>1</tessellate>
        <altitudeMode>clampToGround</altitudeMode>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
              ${generateCircleCoordinates(lat, lon, accuracy)}
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>` : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2">
  <Document>
    <name>PII-LCC // UBICACIÓN REAL DEL DISPOSITIVO [EN VIVO]</name>
    <description>Plataforma Integrada de Inteligencia para la LCC - Posicionamiento Satelital en Tiempo Real del Dispositivo</description>
    
    <Style id="deviceRealLocationStyle">
      <IconStyle>
        <color>ff00ff00</color>
        <scale>1.4</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/shapes/placemark_circle.png</href>
        </Icon>
        <hotSpot x="0.5" y="0.5" xunits="fraction" yunits="fraction"/>
      </IconStyle>
      <LabelStyle>
        <color>ffffffff</color>
        <scale>1.1</scale>
      </LabelStyle>
      <BalloonStyle>
        <bgColor>ff100d08</bgColor>
        <textColor>ffffffff</textColor>
        <text><![CDATA[
          <div style="font-family: 'Courier New', monospace; background: #080d17; color: #f1f5f9; padding: 14px; border-radius: 10px; border: 2px solid #06b6d4; max-width: 380px;">
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #1e293b; padding-bottom: 6px; margin-bottom: 10px;">
              <span style="color: #06b6d4; font-weight: bold; font-size: 14px;">📡 DISPOSITIVO PII-LCC EN VIVO</span>
              <span style="background: rgba(16, 185, 129, 0.2); color: #34d399; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold;">GNSS ACTIVO</span>
            </div>
            
            <p style="margin: 4px 0;"><strong>TERMINAL FÍSICA:</strong> <span style="color: #38bdf8;">$[device]</span></p>
            <p style="margin: 4px 0;"><strong>OPERADOR / MANDO:</strong> $[operator]</p>
            <p style="margin: 4px 0;"><strong>ROL DOCTRINAL:</strong> <span style="color: #fbbf24;">$[role]</span></p>
            
            <div style="margin: 10px 0; padding: 8px; background: rgba(15, 23, 42, 0.8); border: 1px solid #334155; border-radius: 6px;">
              <p style="margin: 2px 0;"><strong>COORDENADAS DMS:</strong> <span style="color: #4ade80; font-weight: bold;">$[coordinates_dms]</span></p>
              <p style="margin: 2px 0;"><strong>DECIMAL WGS84:</strong> <span style="color: #38bdf8;">$[lat_decimal], $[lon_decimal]</span></p>
              <p style="margin: 2px 0;"><strong>PRECISIÓN SATELITAL:</strong> <span style="color: #f59e0b;">$[accuracy]</span></p>
              <p style="margin: 2px 0;"><strong>ALTITUD APROX.:</strong> $[altitude]</p>
              <p style="margin: 2px 0;"><strong>VELOCIDAD / RUMBO:</strong> $[speed] | $[heading]</p>
            </div>
            
            <p style="margin: 6px 0 0 0; font-size: 10px; color: #94a3b8;">FIJACIÓN GNSS: $[timestamp] ($[local_time])</p>
            <div style="margin-top: 10px; text-align: center;">
              <a href="https://earth.google.com/web/@$[lat_decimal],$[lon_decimal],1200a,800d,35y,0h,55t,0r" target="_blank" style="display: inline-block; background: #0284c7; color: white; text-decoration: none; padding: 6px 12px; border-radius: 6px; font-weight: bold; font-size: 11px;">
                ABRIR VUELO 3D EN GOOGLE EARTH WEB
              </a>
            </div>
          </div>
        ]]></text>
      </BalloonStyle>
    </Style>

    <Placemark>
      <name>📍 DISPOSITIVO ACTUAL PII-LCC [${operatorName}]</name>
      <description><![CDATA[Estación física o terminal móvil donde está instalada y operando la app PII-LCC]]></description>
      <styleUrl>#deviceRealLocationStyle</styleUrl>
      <ExtendedData>
        <Data name="device"><value>${devicePlatform}</value></Data>
        <Data name="operator"><value>${operatorName}</value></Data>
        <Data name="role"><value>${role}</value></Data>
        <Data name="coordinates_dms"><value>${dmsStr}</value></Data>
        <Data name="lat_decimal"><value>${lat.toFixed(6)}</value></Data>
        <Data name="lon_decimal"><value>${lon.toFixed(6)}</value></Data>
        <Data name="accuracy"><value>${accuracyStr}</value></Data>
        <Data name="altitude"><value>${altitudeStr}</value></Data>
        <Data name="speed"><value>${speedStr}</value></Data>
        <Data name="heading"><value>${headingStr}</value></Data>
        <Data name="timestamp"><value>${timestamp}</value></Data>
        <Data name="local_time"><value>${localDateStr}</value></Data>
      </ExtendedData>
      <LookAt>
        <longitude>${lon}</longitude>
        <latitude>${lat}</latitude>
        <altitude>${altitude || 1200}</altitude>
        <heading>${heading || 0}</heading>
        <tilt>55</tilt>
        <range>900</range>
        <altitudeMode>relativeToGround</altitudeMode>
      </LookAt>
      <Point>
        <extrude>1</extrude>
        <altitudeMode>relativeToGround</altitudeMode>
        <coordinates>${lon},${lat},${altitude || 15}</coordinates>
      </Point>
    </Placemark>
    ${accuracyPolygonKml}
  </Document>
</kml>`;
}

/**
 * Descarga en el navegador un archivo de texto/KML
 */
export function downloadKmlFile(filename: string, kmlContent: string): void {
  const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.kml') ? filename : `${filename}.kml`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
