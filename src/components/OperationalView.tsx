/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Taller de Fusión Analítica PII-LCC (Centro de Fusión de Inteligencia)
 * Integra Alertas de Órganos de Búsqueda (S-2) con Expedientes Doctrinales (Ley 1053 / Art. 251 CPE)
 * Implementa procesamiento e ingesta automática a Expedientes Operativos
 */

import React, { useState, useEffect, useMemo } from 'react';
import { RawAlert, Clan, ActionableIntel, G2RegistryRecord, TacticalUnit } from '../types';
import { initialG2Records } from '../utils/g2Records';
import { calculateDistanceKm } from '../utils/geo';
import { PatrolTrackingRadar } from './PatrolTrackingRadar';
import { G2DoctrinalViewer } from './fusion/G2DoctrinalViewer';
import { SearchOrganAlertViewer } from './fusion/SearchOrganAlertViewer';
import { NewG2RecordModal } from './fusion/NewG2RecordModal';
import { TacticalPhotoViewerModal } from './fusion/TacticalPhotoViewerModal';
import {
  TrendingUp,
  Database,
  Eye,
  Plus,
  Radio,
  FileText,
  Layers,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Zap,
  FolderOpen,
  Send,
  Activity,
  ArrowRight,
  ShieldAlert,
  Clock,
  ExternalLink,
  Camera,
  Navigation,
  Compass,
  Crosshair,
  Globe,
  Edit3,
  Smartphone,
  Truck,
  ShieldCheck,
  PlusCircle
} from 'lucide-react';
import GoogleEarthPatrolModal from './GoogleEarthPatrolModal';
import ClanManagementModal from './ClanManagementModal';

interface OperationalViewProps {
  rawAlerts: RawAlert[];
  clans: Clan[];
  actionableIntel: ActionableIntel[];
  tacticalUnits?: TacticalUnit[];
  onUpdateUnitCoordinates?: (unitName: string, newCoords: string) => void;
  expedientes?: G2RegistryRecord[];
  onAddExpediente?: (record: G2RegistryRecord) => void;
  onPromoteToIntel: (
    intel: ActionableIntel,
    updatedReliability?: 'A' | 'B' | 'C' | 'D',
    updatedCertainty?: '1' | '2' | '3' | '4',
    routeId?: string
  ) => void;
  onUpdateAlertStatus: (id: string, status: 'PROCESSED' | 'DISMISSED') => void;
  onSimulateRawAlert?: (alert: RawAlert) => void;
  onSaveClan?: (clan: Clan) => void;
  onDeleteClan?: (id: string) => void;
  onBatchImportClans?: (clans: Clan[]) => void;
}

export default function OperationalView({
  rawAlerts = [],
  clans = [],
  actionableIntel = [],
  tacticalUnits = [],
  onUpdateUnitCoordinates,
  expedientes,
  onAddExpediente,
  onPromoteToIntel,
  onUpdateAlertStatus,
  onSimulateRawAlert,
  onSaveClan,
  onDeleteClan,
  onBatchImportClans
}: OperationalViewProps) {
  // Mode toggle: Expedientes vs Alertas S-2 vs Patrullas en Terreno
  const [activeFeedTab, setActiveFeedTab] = useState<'G2' | 'S2' | 'PATROLS'>('G2');
  const [alertFilterStatus, setAlertFilterStatus] = useState<'PENDING' | 'ALL' | 'PROCESSED'>('PENDING');
  
  // Clan Intelligence Management State
  const [isClanManagementOpen, setIsClanManagementOpen] = useState<boolean>(false);
  const [clanModalInitialId, setClanModalInitialId] = useState<string | null>(null);

  // Real-time Patrol Tracking Radar Drawer / State
  const [isPatrolRadarOpen, setIsPatrolRadarOpen] = useState<boolean>(false);
  const [selectedPatrolForFocus, setSelectedPatrolForFocus] = useState<string | null>(null);
  const [isGoogleEarthModalOpen, setIsGoogleEarthModalOpen] = useState<boolean>(false);
  const [selectedPatrolForEarth, setSelectedPatrolForEarth] = useState<TacticalUnit | null>(null);
  
  // Expedientes repository state
  const [g2Records, setG2Records] = useState<G2RegistryRecord[]>(() => {
    return expedientes && expedientes.length > 0 ? expedientes : initialG2Records;
  });

  // Keep local records in sync if external prop updates
  useEffect(() => {
    if (expedientes && expedientes.length > 0) {
      setG2Records(expedientes);
    }
  }, [expedientes]);

  const [selectedRecordId, setSelectedRecordId] = useState<string>(() => {
    return g2Records[0]?.id || '';
  });
  const [isNewRecordModalOpen, setIsNewRecordModalOpen] = useState(false);

  // Notice banner for newly implemented Expediente
  const [justImplementedExpediente, setJustImplementedExpediente] = useState<{ id: string; title: string } | null>(null);

  // Selected item type
  const isG2Selected = activeFeedTab === 'G2';
  const selectedG2 = g2Records.find(r => r.id === selectedRecordId);
  const selectedAlert = rawAlerts.find(a => a.id === selectedRecordId);

  // Fusion form state
  const [intelTitle, setIntelTitle] = useState<string>(
    selectedG2 ? `Apreciación: ${selectedG2.id} - ${selectedG2.componenteRubro}` : ''
  );
  const [expedienteRubro, setExpedienteRubro] = useState<'ECONOMICO' | 'MILITAR' | 'POLITICO' | 'PSICOSOCIAL' | 'OTRO'>('ECONOMICO');
  const [targetClan, setTargetClan] = useState<string>(clans[0]?.name || 'Clan Los Choneros de Frontera');
  const [recommendedAction, setRecommendedAction] = useState<string>(
    'Desplegar vigilancia SIGINT y contrainteligencia táctica sobre el vector identificado.'
  );
  const [threatScore, setThreatScore] = useState<number>(78);
  const [reliability, setReliability] = useState<'A' | 'B' | 'C' | 'D'>('B');
  const [certainty, setCertainty] = useState<'1' | '2' | '3' | '4'>('2');
  const [routeId, setRouteId] = useState<string>('Ruta Colchane');
  const [selectedIdeas, setSelectedIdeas] = useState<string[]>([]);
  const [filterRubro, setFilterRubro] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Right column state
  const [selectedClanId, setSelectedClanId] = useState<string | null>(clans[0]?.id || null);
  const [rightTab, setRightTab] = useState<'CLANS' | 'VALIDATED'>('CLANS');
  const [isCentralPhotoModalOpen, setIsCentralPhotoModalOpen] = useState<boolean>(false);

  // Pending alerts from Search Organs
  const pendingAlerts = rawAlerts.filter(a => a.status === 'PENDING');
  const latestPendingAlert = pendingAlerts[0] || null;

  // Next sequential Expediente ID
  const nextExpedienteId = `REG-2026-${String(g2Records.length + 1).padStart(3, '0')}`;

  // Handle selection of an Expediente record
  const handleSelectG2 = (record: G2RegistryRecord) => {
    setSelectedRecordId(record.id);
    setActiveFeedTab('G2');
    setIntelTitle(`Apreciación: ${record.id} [${record.componenteRubro}] - ${record.tipoRegistro}`);
    
    // Set reliability & certainty from record evaluation if available
    if (record.evaluacion?.confiabilidad?.escala) {
      setReliability((record.evaluacion.confiabilidad.escala.toUpperCase() as any) || 'A');
    }
    if (record.evaluacion?.exactitud?.escala) {
      setCertainty((record.evaluacion.exactitud.escala as any) || '1');
    }
    
    // Seed ideas fuerza
    const ideas = record.evaluacion?.ideasFuerza || [];
    setSelectedIdeas(ideas.slice(0, 3));

    // Heuristics for routes and actions
    if (record.especificoGrafico?.coordenadasCuadricula?.includes('CQ') || record.id === 'REG-2026-002') {
      setRouteId('Salar de Coipasa');
    } else if (record.id === 'REG-2026-003') {
      setRouteId('Tambo Quemado');
    } else if (record.id === 'REG-2026-004') {
      setRouteId('Paso Pisiga');
    } else {
      setRouteId('Hito 14');
    }

    if (record.id === 'REG-2026-001') {
      setRecommendedAction('Articular interoperabilidad doctrinal con unidades del CEO-LCC y Policía Boliviana (Ley 1053 / Art. 251 CPE) para cierre perimétrico y control territorial conjunto.');
      setThreatScore(55);
    } else if (record.id === 'REG-2026-002') {
      setRecommendedAction('Desplegar Grupo de Reacción Inmediata para emboscada de interdicción en cuello de botella de Salar de Coipasa e interceptar caravana de camiones F-12.');
      setThreatScore(88);
    } else if (record.id === 'REG-2026-003') {
      setRecommendedAction('Establecer puntos de bloqueo móviles en tramo Tambo Quemado - Charaña para comiso de cisternas y control de desvío de combustible con la ANH.');
      setThreatScore(80);
    } else if (record.id === 'REG-2026-004') {
      setRecommendedAction('Inhabilitar mecánicamente huella clandestina en Hito 18 con zanjas antivehículo y remitir vehículos incautados al recinto de Aduana Pastocalle.');
      setThreatScore(72);
    } else {
      setRecommendedAction(`Integrar reporte ${record.id} en matriz de correlación de operaciones contra el contrabando de la PII-LCC.`);
      setThreatScore(70);
    }
  };

  // Extract key factual clauses from alert details
  const extractAlertIdeas = (alert: RawAlert): string[] => {
    const list: string[] = [];
    list.push(`Sensor ${alert.sourceName} (${alert.sourceType}) en ${alert.coordinates}`);
    if (alert.details) {
      const parts = alert.details.split(/[.;\n]/).map(s => s.trim()).filter(s => s.length > 12);
      if (parts.length > 0) {
        parts.slice(0, 3).forEach(p => list.push(p));
      } else {
        list.push(alert.details);
      }
    }
    return list;
  };

  // Handle selection of a Raw Alert (S2)
  const handleSelectAlert = (alert: RawAlert) => {
    setSelectedRecordId(alert.id);
    setActiveFeedTab('S2');
    setIntelTitle(`Apreciación: Detección ${alert.sourceName} en ${alert.coordinates}`);
    setReliability(alert.reliability);
    setCertainty(alert.certainty);
    
    // Choose appropriate rubro based on details
    if (alert.details.toLowerCase().includes('combustible') || alert.details.toLowerCase().includes('cisterna') || alert.details.toLowerCase().includes('f-12') || alert.details.toLowerCase().includes('mercadería')) {
      setExpedienteRubro('ECONOMICO');
    } else {
      setExpedienteRubro('MILITAR');
    }

    const currentRoute = alert.clandestineRouteId || 'Ruta Colchane';
    setRouteId(currentRoute);
    const matchedClan = clans.find(c => c.knownRoutes.includes(currentRoute));
    setTargetClan(matchedClan ? matchedClan.name : clans[0]?.name || 'Clan Los Choneros de Frontera');

    setRecommendedAction(`Desplegar patrulla de interdicción CEO-LCC sobre el vector ${currentRoute} para interceptar caravana reportada por ${alert.sourceName}.`);

    let score = 55;
    if (alert.reliability === 'A') score += 20;
    if (alert.certainty === '1') score += 15;
    if (alert.details.toLowerCase().includes('armad') || alert.details.toLowerCase().includes('miguelines')) score += 10;
    setThreatScore(Math.min(100, score));

    // Seed alert ideas
    const ideas = extractAlertIdeas(alert);
    setSelectedIdeas(ideas);
  };

  // Toggle selection of an idea fuerza
  const toggleIdea = (idea: string) => {
    setSelectedIdeas(prev => {
      if (prev.includes(idea)) {
        return prev.filter(i => i !== idea);
      } else {
        return [...prev, idea];
      }
    });
  };

  // Append selected ideas into the recommended action
  const handleInjectIdeasIntoAction = () => {
    if (selectedIdeas.length === 0) return;
    const synthesized = `[SÍNTESIS ANALÍTICA]: ${selectedIdeas.join(' | ')}. ${recommendedAction}`;
    setRecommendedAction(synthesized);
  };

  // CORE WORKFLOW: Automatically process and implement search organ alert into an Expediente
  const handleProcessAlertToExpediente = (sourceAlert?: RawAlert) => {
    const targetAlert = sourceAlert || selectedAlert;
    if (!targetAlert) return;

    const generatedId = nextExpedienteId;
    const ideasToUse = selectedIdeas.length > 0 ? selectedIdeas : extractAlertIdeas(targetAlert);

    const isGraphic = targetAlert.mediaUrl !== undefined || targetAlert.sourceType === 'IMINT';

    // Build complete legal & operational content
    const detailedContent = `EXPEDIENTE TÁCTICO // PII-LCC (LEY 1053 / ART. 251 CPE)

1. ORIGEN DE LA DETECCIÓN:
• Órgano de Búsqueda S-2: ${targetAlert.sourceName} (${targetAlert.sourceType})
• Coordenadas Cuadrícula MGRS: ${targetAlert.coordinates}
• Timestamp de Captura: ${new Date(targetAlert.timestamp).toLocaleString()}

2. REPORTE PRIMARIO DE CAMPO:
"${targetAlert.details}"

3. APRECIACIÓN ANALÍTICA DE FUSIÓN (CFI / CEO-LCC):
${recommendedAction}

4. CORRELACIÓN Y PARÁMETROS OPERACIONALES:
• Vector Clandestino Contrastado: ${routeId}
• Organización / Facción Hostil: ${targetClan}
• Nivel de Amenaza Estimado: ${threatScore}% (${threatScore > 80 ? 'CRÍTICO' : threatScore > 50 ? 'ALTO' : 'MODERADO'})
• Código Doctrinal de Evaluación: ${reliability}-${certainty}
• Base Legal: Ley 1053 de Fortalecimiento de la Lucha Contra el Contrabando y Art. 251 CPE.`;

    const newExpediente: G2RegistryRecord = {
      id: generatedId,
      fechaHoraIngreso: new Date().toISOString().slice(0, 16),
      tipoRegistro: isGraphic ? 'GRAFICO' : 'LITERAL',
      componenteRubro: expedienteRubro,
      clasificacionSeguridad: 'CONFIDENCIAL',
      contenidoDetallado: detailedContent,
      referenciasAntecedentes: [
        `REPORTE S-2 ${targetAlert.id}`,
        targetAlert.sourceName,
        routeId,
        targetClan
      ],
      unidadReceptora: 'Puesto de Comando Central CEO-LCC / Taller de Fusión',
      operadorRegistro: 'Cap. Marcelo Benítez Vargas (Analista LCC)',
      observacionesAdicionales: `EXPEDIENTE IMPLEMENTADO AUTOMÁTICAMENTE DESDE ÓRGANO DE BÚSQUEDA S-2 // SENSOR: ${targetAlert.sourceName}`,
      especificoGrafico: isGraphic ? {
        subtipoElemento: `Detección Sensor ${targetAlert.sourceType} // Telemetría de Campo`,
        ubicacionReferenciaDigital: `Ingesta S-2 / PII-LCC / Sensor ${targetAlert.sourceName}`,
        archivoAdjunto: targetAlert.mediaUrl ? {
          nombre: `captura_${targetAlert.id}.jpg`,
          tipo: 'image/jpeg',
          tamano: 48200,
          base64Data: targetAlert.mediaUrl.startsWith('data:') ? targetAlert.mediaUrl : '',
          fechaCarga: new Date().toISOString()
        } : undefined,
        escalaCoordenadas: `1:50.000 / ${targetAlert.coordinates}`,
        fechaCapturaGrafica: new Date().toISOString().slice(0, 10),
        interpretacionVisualPreliminar: `Captura y telemetría de sensor ${targetAlert.sourceName} en cuadrícula ${targetAlert.coordinates}. ${targetAlert.details.slice(0, 130)}...`,
        tipoSoporte: 'Sensor Órgano de Búsqueda / FLIR / Radar',
        identificadorHojaPliego: `PLIEGO-AUTO-${generatedId}`,
        escala: '1:50.000',
        coordenadasCuadricula: targetAlert.coordinates,
        metadatosSensorFecha: new Date().toISOString().slice(0, 10),
        orientacionNorte: 'Norte Cuadrícula (NC)'
      } : undefined,
      especificoLiteral: !isGraphic ? {
        subtipoSoporte: 'Parte Informativo de Órgano de Búsqueda',
        extractoPalabrasClave: `CONTRABANDO / ${targetClan.toUpperCase()} / ${routeId.toUpperCase()}`,
        canalTransmision: 'Canal Táctico S-2 Encriptado',
        documentoOrigenReferencia: `REPORTE PRIMARIO ${targetAlert.id}`
      } : undefined,
      estadoRegistro: 'Evaluado',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      calificacionEvaluacion: `${reliability}-${certainty}`,
      evaluacion: {
        pertinencia: {
          componenteDestino: expedienteRubro,
          nivelUrgencia: threatScore > 75 ? 'Urgente' : 'Prioritaria'
        },
        confiabilidad: {
          escala: reliability,
          evaluarPorSeparado: true,
          evaluacionFuente: reliability,
          evaluacionMedio: reliability
        },
        exactitud: {
          escala: certainty
        },
        codigoAlfanumerico: `${reliability}-${certainty}`,
        analistaEvaluador: 'Cap. M. Vargas (Analista LCC)',
        fechaHoraEvaluacion: new Date().toISOString().slice(0, 16),
        observacionesEvaluacion: `Evaluado bajo metodología PII-LCC desde sensor S-2 (${targetAlert.sourceName}). Código: ${reliability}-${certainty}.`,
        ideasFuerza: ideasToUse
      }
    };

    // 1. Add to expedientes list
    setG2Records(prev => [newExpediente, ...prev]);
    if (onAddExpediente) {
      onAddExpediente(newExpediente);
    }

    // 2. Mark alert as PROCESSED and link to the generated Expediente
    onUpdateAlertStatus(targetAlert.id, 'PROCESSED');

    // 3. Promote to Actionable Intel for CEO-LCC
    const newIntel: ActionableIntel = {
      id: `intel-LCC-${Math.floor(100 + Math.random() * 900)}`,
      rawAlertId: targetAlert.id,
      title: intelTitle || `Apreciación: ${newExpediente.id} - ${targetAlert.sourceName}`,
      threatScore,
      validatedBy: 'División de Inteligencia LCC / Analista Cap. M. Vargas',
      targetClan,
      recommendedAction,
      coordinates: targetAlert.coordinates,
      status: 'APPROVED',
      timestamp: new Date().toISOString()
    };
    onPromoteToIntel(newIntel, reliability, certainty, routeId);

    // 4. Trigger celebration banner
    setJustImplementedExpediente({
      id: newExpediente.id,
      title: `${newExpediente.componenteRubro} // ${targetAlert.sourceName}`
    });

    // 5. Automatically switch feed to EXPEDIENTES and open the new dossier!
    setActiveFeedTab('G2');
    handleSelectG2(newExpediente);
  };

  // Submit handler for fusion form
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecordId) return;

    if (!isG2Selected && selectedAlert) {
      // Process alert and convert to Expediente
      handleProcessAlertToExpediente(selectedAlert);
    } else if (isG2Selected && selectedG2) {
      // Promote existing Expediente to actionable intel
      const newIntel: ActionableIntel = {
        id: `intel-LCC-${Math.floor(100 + Math.random() * 900)}`,
        rawAlertId: selectedG2.id,
        title: intelTitle,
        threatScore,
        validatedBy: 'División de Inteligencia LCC / Analista Cap. M. Vargas',
        targetClan,
        recommendedAction,
        coordinates: selectedG2.especificoGrafico?.coordenadasCuadricula || 'MGRS 19K DQ 4521 8932',
        status: 'APPROVED',
        timestamp: new Date().toISOString()
      };
      onPromoteToIntel(newIntel, reliability, certainty, routeId);

      setG2Records(prev =>
        prev.map(r => r.id === selectedG2.id ? { ...r, estadoRegistro: 'Procesado' } : r)
      );
    }
  };

  // Simulation generator: dispatches realistic search organ field reports into the system
  const handleSimulateFieldReport = () => {
    const simulationPool: Array<{
      sourceType: 'IMINT' | 'SIGINT' | 'HUMINT';
      sourceName: string;
      details: string;
      coordinates: string;
      clandestineRouteId: string;
      reliability: 'A' | 'B' | 'C' | 'D';
      certainty: '1' | '2' | '3' | '4';
      mediaUrl: string;
      operatorName: string;
      originUnit: string;
      originSector: string;
      transmissionChannel: string;
      emitterDeviceId: string;
    }> = [
      {
        sourceType: 'IMINT',
        sourceName: 'VANT-02 Halcón (Térmico Nocturno)',
        details: 'Detección FLIR de columna furtiva: 4 camiones F-12 de alto tonelaje avanzando con luces apagadas sobre huella no balizada en dirección a Hito 14. Se detecta firma térmica de bultos voluminosos y camioneta escolta en vanguardia.',
        coordinates: '19°14\'22"S 68°34\'10"W',
        clandestineRouteId: 'Hito 14',
        reliability: 'A',
        certainty: '1',
        mediaUrl: 'multimedia-thermal',
        operatorName: 'Sgto. 1ro. Juan Pérez Vargas (Operador VANT)',
        originUnit: 'Escuadrilla Aérea CEO-LCC // RI-22 Mejillones',
        originSector: 'Hito 14 - Frontera Chileno-Boliviana',
        transmissionChannel: 'Enlace Encriptado VANT-DL UHF 433 MHz // Red CAD-C2',
        emitterDeviceId: 'Terminal VANT-GCS-02 // Sensor FLIR Tau-2'
      },
      {
        sourceType: 'SIGINT',
        sourceName: 'SENSOR-RADAR-05 (Radar Terrestre)',
        details: 'Detección Doppler de velocidad anómala (58 km/h) en el sector oriental del Salar de Coipasa. Eco característico de 3 camiones cisterna desviados de la carretera autorizada evadiendo punto de control aduanero.',
        coordinates: '19°22\'05"S 68°15\'40"W',
        clandestineRouteId: 'Salar de Coipasa',
        reliability: 'A',
        certainty: '2',
        mediaUrl: 'multimedia-radar',
        operatorName: 'Suboficial Técnico M. Quiroga (Especialista Radar)',
        originUnit: 'Batería de Sensores y Vigilancia Electrónica Pisiga',
        originSector: 'Salar de Coipasa (Sector Challapata)',
        transmissionChannel: 'Canal VHF Táctico Encriptado CAD-C2 // Frecuencia 142.850 MHz',
        emitterDeviceId: 'Estación Fija SIGINT-ESM-Alfa // Antena Radar'
      },
      {
        sourceType: 'HUMINT',
        sourceName: 'HUMINT-P2 (Contacto de Frontera)',
        details: 'Informante en paso fronterizo no habilitado alerta sobre acopio de 12 vehículos indocumentados ("chutos") y combustible subvencionado en galpón clandestino cerca de Tambo Quemado con intención de cruce a las 03:00 hrs.',
        coordinates: '18°17\'40"S 69°02\'15"W',
        clandestineRouteId: 'Tambo Quemado',
        reliability: 'B',
        certainty: '1',
        mediaUrl: 'multimedia-optical',
        operatorName: 'Agente de Campo HUMINT-09 (Inteligencia Territorial)',
        originUnit: 'Destacamento de Control Fronterizo Charaña',
        originSector: 'Paso Tambo Quemado - Charaña (Paso Ilegal)',
        transmissionChannel: 'Mensajería Táctica Cifrada Satelital Iridium // Enlace S-2',
        emitterDeviceId: 'Handheld Táctico Rugged S2-TX-9041'
      }
    ];

    const pick = simulationPool[Math.floor(Math.random() * simulationPool.length)];
    const generatedAlert: RawAlert = {
      id: `alert-auto-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString(),
      sourceType: pick.sourceType,
      sourceName: pick.sourceName,
      reliability: pick.reliability,
      certainty: pick.certainty,
      details: pick.details,
      coordinates: pick.coordinates,
      status: 'PENDING',
      clandestineRouteId: pick.clandestineRouteId,
      mediaUrl: pick.mediaUrl,
      operatorName: pick.operatorName,
      originUnit: pick.originUnit,
      originSector: pick.originSector,
      transmissionChannel: pick.transmissionChannel,
      emitterDeviceId: pick.emitterDeviceId
    };

    if (onSimulateRawAlert) {
      onSimulateRawAlert(generatedAlert);
    }

    // Auto select this newly generated alert in the workshop
    handleSelectAlert(generatedAlert);
  };

  // Filtered lists
  const filteredG2 = g2Records.filter(r => {
    const matchesRubro = filterRubro === 'ALL' || r.componenteRubro === filterRubro;
    const matchesSearch =
      r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.contenidoDetallado.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.evaluacion?.ideasFuerza?.some(i => i.toLowerCase().includes(searchTerm.toLowerCase())));
    return matchesRubro && matchesSearch;
  });

  const filteredAlerts = rawAlerts.filter(a => {
    const matchesFilter =
      alertFilterStatus === 'ALL' ? true :
      alertFilterStatus === 'PENDING' ? a.status === 'PENDING' :
      a.status === 'PROCESSED';
    const matchesSearch =
      a.sourceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.coordinates.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const filteredClans = clans.filter(clan =>
    clan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    clan.knownRoutes.some(r => r.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredPatrols = tacticalUnits.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.commander.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.coordinates && u.coordinates.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Calculate nearest patrol to currently selected alert's detection coordinates
  const nearestPatrolToAlert = useMemo(() => {
    if (!selectedAlert || !tacticalUnits || tacticalUnits.length === 0) return null;
    let minDistance: number | null = null;
    let closestUnit: TacticalUnit | null = null;

    tacticalUnits.forEach(u => {
      const dist = calculateDistanceKm(selectedAlert.coordinates, u.coordinates);
      if (dist !== null && (minDistance === null || dist < minDistance)) {
        minDistance = dist;
        closestUnit = u;
      }
    });

    return closestUnit && minDistance !== null ? { unit: closestUnit, distanceKm: minDistance } : null;
  }, [selectedAlert, tacticalUnits]);

  const activeClanDetails = clans.find(c => c.id === selectedClanId) || clans[0];

  return (
    <div className="space-y-5 animate-fade-in font-sans">
      {/* Top Header & Tactical Controls */}
      <div className="bg-[#0b0f19] border border-[#1e2738] rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#f97316]/10 border border-[#f97316]/30 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-[#f97316]" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-mono font-bold text-white uppercase tracking-wider">
                TALLER DE FUSIÓN ANALÍTICA // PII-LCC
              </h2>
              <span className="text-[10px] font-mono bg-[#f97316]/15 text-[#f97316] border border-[#f97316]/30 px-2 py-0.5 rounded font-bold uppercase">
                EXPEDIENTES & ÓRGANOS DE BÚSQUEDA
              </span>
            </div>
            <p className="text-xs text-[#94a3b8] font-mono mt-0.5">
              Fusión doctrinaria, correlación de sensores tácticos y generación de expedientes operativos.
            </p>
          </div>
        </div>

        {/* Action buttons: Simulation & Manual Record & Patrol Radar */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => {
              setSelectedPatrolForEarth(tacticalUnits[0] || null);
              setIsGoogleEarthModalOpen(true);
            }}
            className="flex-1 sm:flex-initial text-xs font-mono py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer font-bold border bg-[#0a1628] hover:bg-[#112440] text-cyan-300 hover:text-white border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.25)]"
            title="Visualizar ubicación actual de las patrullas en Google Earth 3D en tiempo real"
          >
            <Globe className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>Google Earth 3D ({tacticalUnits.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPatrolRadarOpen(prev => !prev)}
            className={`flex-1 sm:flex-initial text-xs font-mono py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer font-bold border ${
              isPatrolRadarOpen
                ? 'bg-emerald-600 text-black border-emerald-400'
                : 'bg-[#0d1626] hover:bg-[#15233c] text-emerald-300 border-emerald-500/40'
            }`}
            title="Abre el Radar Táctico de telemetría y seguimiento de patrullas en tiempo real"
          >
            <Compass className={`w-4 h-4 ${isPatrolRadarOpen ? 'animate-spin' : ''}`} />
            <span>Radar Patrullas</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
          </button>

          <button
            type="button"
            onClick={handleSimulateFieldReport}
            className="flex-1 sm:flex-initial bg-gradient-to-r from-cyan-950 to-blue-950 hover:from-cyan-900 hover:to-blue-900 text-cyan-200 border border-cyan-500/40 text-xs font-mono py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer font-bold"
            title="Simula la llegada de un reporte táctico desde un sensor o patrulla en frontera"
          >
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>Simular Órgano S-2</span>
          </button>

          <button
            type="button"
            onClick={() => setIsNewRecordModalOpen(true)}
            className="flex-1 sm:flex-initial bg-[#121722] hover:bg-[#1a2233] text-white border border-[#222c40] text-xs font-mono py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#f97316]" />
            <span>+ Nuevo Expediente</span>
          </button>
        </div>
      </div>

      {/* Embedded Real-Time Patrol Tracking Radar */}
      {isPatrolRadarOpen && (
        <div className="animate-fade-in">
          <PatrolTrackingRadar
            tacticalUnits={tacticalUnits}
            rawAlerts={rawAlerts}
            actionableIntel={actionableIntel}
            selectedUnitName={selectedPatrolForFocus}
            onSelectUnit={(name) => setSelectedPatrolForFocus(name)}
            onOpenGoogleEarth={(unit) => {
              setSelectedPatrolForEarth(unit);
              setIsGoogleEarthModalOpen(true);
            }}
            title="CENTRO DE FUSIÓN (CFI) // RADAR DE SEGUIMIENTO DE PATRULLAS EN VIVO"
          />
        </div>
      )}

      {/* SUCCESS BANNER: Newly Implemented Expediente Notice */}
      {justImplementedExpediente && (
        <div className="bg-emerald-950/70 border border-emerald-500/50 rounded-xl p-3 text-left flex items-center justify-between gap-3 shadow-xl animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-mono font-bold text-white uppercase block">
                ¡EXPEDIENTE {justImplementedExpediente.id} IMPLEMENTADO AUTOMÁTICAMENTE CON ÉXITO!
              </span>
              <span className="text-[11px] font-mono text-emerald-300">
                La información del órgano de búsqueda ha sido archivada en la base doctrinal PII-LCC y remitida al Comando Estratégico (CEO-LCC).
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setJustImplementedExpediente(null)}
            className="text-[10px] font-mono bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 px-3 py-1 rounded border border-emerald-600/40 transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>
      )}

      {/* LIVE INCOMING ALERT BANNER: Ingesta desde Órgano de Búsqueda */}
      {latestPendingAlert && activeFeedTab === 'G2' && (
        <div className="bg-gradient-to-r from-orange-950/80 via-[#1e1308] to-orange-950/80 border border-orange-500/50 rounded-xl p-3 text-left flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-orange-500/10 to-transparent pointer-events-none" />
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="w-3 h-3 rounded-full bg-orange-500 animate-ping absolute" />
              <span className="w-2.5 h-2.5 rounded-full bg-orange-400 relative block" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-black text-orange-200 uppercase tracking-wide">
                  ALERTA ENTRADA DESDE ÓRGANO DE BÚSQUEDA S-2
                </span>
                <span className="text-[9px] font-mono bg-orange-500/20 text-orange-300 px-1.5 py-0.2 rounded font-bold border border-orange-500/30">
                  {latestPendingAlert.sourceType} // {latestPendingAlert.sourceName}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-sans line-clamp-1 mt-0.5">
                "{latestPendingAlert.details}" — <span className="font-mono text-orange-300 font-bold">{latestPendingAlert.coordinates}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleSelectAlert(latestPendingAlert)}
            className="bg-[#f97316] hover:bg-[#ea580c] text-white text-xs font-mono font-black px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-lg active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0 uppercase"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>Procesar en Mesa de Fusión</span>
          </button>
        </div>
      )}

      {/* Main 3-Column Fusion Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* LEFT COLUMN: Expedientes Repository & Search Organ Alerts */}
        <div className="lg:col-span-4 bg-[#0a0d14] border border-[#1e2738] rounded-xl p-4 shadow-xl flex flex-col justify-between text-left">
          <div>
            {/* Feed Tabs Switcher: Expedientes vs Alertas S-2 vs Patrullas Activas */}
            <div className="flex items-center justify-between border-b border-[#1e2738] pb-3 mb-3">
              <div className="flex gap-1.5 w-full">
                <button
                  type="button"
                  onClick={() => {
                    setActiveFeedTab('G2');
                    if (g2Records.length > 0 && !selectedG2) {
                      handleSelectG2(g2Records[0]);
                    }
                  }}
                  className={`flex-1 py-1.5 px-2 rounded text-[10px] font-mono font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    activeFeedTab === 'G2'
                      ? 'bg-[#f97316] text-white shadow-md'
                      : 'bg-[#121722] text-[#94a3b8] hover:text-white border border-[#22293a]'
                  }`}
                >
                  <FolderOpen className="w-3 h-3" />
                  <span>EXPEDIENTES ({g2Records.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveFeedTab('S2');
                    if (rawAlerts.length > 0 && !selectedAlert) {
                      const firstPending = rawAlerts.find(a => a.status === 'PENDING') || rawAlerts[0];
                      handleSelectAlert(firstPending);
                    }
                  }}
                  className={`flex-1 py-1.5 px-2 rounded text-[10px] font-mono font-bold flex items-center justify-center gap-1 transition-all cursor-pointer relative ${
                    activeFeedTab === 'S2'
                      ? 'bg-cyan-600 text-white shadow-md'
                      : 'bg-[#121722] text-[#94a3b8] hover:text-white border border-[#22293a]'
                  }`}
                >
                  <Radio className="w-3 h-3" />
                  <span>ÓRGANOS S-2</span>
                  {pendingAlerts.length > 0 && (
                    <span className="bg-[#f97316] text-white text-[8px] px-1 rounded-full font-bold animate-pulse">
                      {pendingAlerts.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveFeedTab('PATROLS');
                  }}
                  className={`flex-1 py-1.5 px-2 rounded text-[10px] font-mono font-bold flex items-center justify-center gap-1 transition-all cursor-pointer relative ${
                    activeFeedTab === 'PATROLS'
                      ? 'bg-emerald-600 text-black shadow-md'
                      : 'bg-[#121722] text-emerald-400 hover:text-white border border-emerald-500/30'
                  }`}
                >
                  <Navigation className="w-3 h-3" />
                  <span>PATRULLAS ({tacticalUnits.length})</span>
                </button>
              </div>
            </div>

            {/* Filter and Search */}
            <div className="space-y-2 mb-3">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={
                  activeFeedTab === 'G2'
                    ? "Buscar expediente, rubro o vector..."
                    : activeFeedTab === 'S2'
                    ? "Buscar alerta S-2, sensor..."
                    : "Buscar patrulla, comandante o coordenadas..."
                }
                className="w-full bg-[#121722] text-white border border-[#22293a] rounded px-3 py-1.5 text-xs font-mono placeholder:text-[#64748b] focus:outline-none focus:border-[#f97316]"
              />

              {activeFeedTab === 'G2' ? (
                /* Rubro Filter Chips for Expedientes */
                <div className="flex flex-wrap gap-1">
                  {(['ALL', 'MILITAR', 'ECONOMICO', 'POLITICO', 'PSICOSOCIAL'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setFilterRubro(r)}
                      className={`text-[9px] font-mono px-2 py-0.5 rounded cursor-pointer transition-colors ${
                        filterRubro === r
                          ? 'bg-[#f97316]/20 text-[#f97316] border border-[#f97316]/40 font-bold'
                          : 'bg-[#121722] text-[#64748b] hover:text-[#94a3b8] border border-[#1e2738]'
                      }`}
                    >
                      {r === 'ALL' ? 'TODOS' : r}
                    </button>
                  ))}
                </div>
              ) : activeFeedTab === 'S2' ? (
                /* Status Filter Chips for S-2 Alerts */
                <div className="flex gap-1">
                  {(['PENDING', 'ALL', 'PROCESSED'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setAlertFilterStatus(st)}
                      className={`flex-1 text-[9px] font-mono py-1 rounded cursor-pointer transition-colors ${
                        alertFilterStatus === st
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                          : 'bg-[#121722] text-[#64748b] hover:text-[#94a3b8] border border-[#1e2738]'
                      }`}
                    >
                      {st === 'PENDING' ? `PENDIENTES (${pendingAlerts.length})` : st === 'ALL' ? 'TODAS' : 'PROCESADAS'}
                    </button>
                  ))}
                </div>
              ) : (
                /* Patrol Status Banner */
                <div className="flex items-center justify-between text-[10px] font-mono bg-emerald-950/40 border border-emerald-500/30 p-1.5 rounded text-emerald-300">
                  <span>TELEMETRÍA EN TIEMPO REAL</span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    GPS / GNSS ACTIVO
                  </span>
                </div>
              )}
            </div>

            {/* List View Container */}
            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {activeFeedTab === 'G2' ? (
                filteredG2.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-[#1e2738] rounded-lg text-[#64748b] text-xs font-mono">
                    No se encontraron expedientes con los filtros actuales.
                  </div>
                ) : (
                  filteredG2.map((rec) => {
                    const isSelected = selectedRecordId === rec.id;
                    const isFromSearch = Boolean(
                      rec.observacionesAdicionales?.includes('ÓRGANO DE BÚSQUEDA') ||
                      rec.referenciasAntecedentes?.some(r => r.includes('ÓRGANO') || r.includes('ALERTA'))
                    );
                    return (
                      <div
                        key={rec.id}
                        onClick={() => handleSelectG2(rec)}
                        className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#f97316]/10 border-[#f97316]'
                            : 'bg-[#0f1420] border-[#1e2738] hover:border-[#334155]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono font-bold text-white">
                              {rec.id}
                            </span>
                            <span className="text-[8px] font-mono bg-[#1e2738] text-[#94a3b8] px-1 rounded">
                              {rec.tipoRegistro}
                            </span>
                            {isFromSearch && (
                              <span className="text-[8px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800/40 px-1 rounded font-bold">
                                ÓRGANO S-2
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] font-mono text-[#f97316] font-bold">
                            {rec.calificacionEvaluacion || 'A-1'}
                          </span>
                        </div>
                        <p className="text-xs text-[#cbd5e1] line-clamp-2 mb-1.5 font-sans">
                          {rec.especificoGrafico?.interpretacionVisualPreliminar || rec.contenidoDetallado}
                        </p>
                        <div className="flex items-center justify-between text-[9px] font-mono text-[#64748b] pt-1 border-t border-[#1e2738]">
                          <span>Rubro: <strong className="text-[#94a3b8]">{rec.componenteRubro}</strong></span>
                          <span className="text-[#10b981] font-bold">● {rec.estadoRegistro}</span>
                        </div>
                      </div>
                    );
                  })
                )
              ) : activeFeedTab === 'S2' ? (
                filteredAlerts.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-[#1e2738] rounded-lg text-[#64748b] text-xs font-mono">
                    No hay alertas de órganos de búsqueda en esta vista.
                  </div>
                ) : (
                  filteredAlerts.map((alert) => {
                    const isSelected = selectedRecordId === alert.id;
                    const isPending = alert.status === 'PENDING';
                    return (
                      <div
                        key={alert.id}
                        onClick={() => handleSelectAlert(alert)}
                        className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-500/10 border-cyan-400'
                            : 'bg-[#0f1420] border-[#1e2738] hover:border-[#334155]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            alert.sourceType === 'IMINT' ? 'bg-cyan-500/20 text-cyan-300' :
                            alert.sourceType === 'SIGINT' ? 'bg-yellow-500/20 text-yellow-300' :
                            'bg-emerald-500/20 text-emerald-300'
                          }`}>
                            {alert.sourceType} // {alert.sourceName}
                          </span>
                          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                            isPending ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            {isPending ? 'PENDIENTE' : 'PROCESADA'}
                          </span>
                        </div>
                        <p className="text-xs text-[#cbd5e1] line-clamp-2 mb-1.5 font-sans">
                          {alert.details}
                        </p>
                        <div className="flex items-center justify-between text-[9px] font-mono text-[#64748b] pt-1 border-t border-[#1e2738]">
                          <span>Coord: {alert.coordinates}</span>
                          <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    );
                  })
                )
              ) : (
                /* PATROLS LIST VIEW WITH REAL-TIME COORDINATES */
                filteredPatrols.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-[#1e2738] rounded-lg text-[#64748b] text-xs font-mono">
                    No se encontraron patrullas desplegadas.
                  </div>
                ) : (
                  filteredPatrols.map((unit) => {
                    const isFocus = selectedPatrolForFocus === unit.name;
                    return (
                      <div
                        key={unit.id}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          isFocus
                            ? 'bg-emerald-950/30 border-emerald-500'
                            : 'bg-[#0f1420] border-[#1e2738] hover:border-emerald-500/40'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                            <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                            {unit.name}
                          </span>
                          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            unit.status === 'INTERCEPTING'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                              : unit.status === 'PATROLLING'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                          }`}>
                            {unit.status}
                          </span>
                        </div>

                        <div className="space-y-1 mb-2">
                          <div className="text-[11px] font-mono text-[#cbd5e1] flex items-center justify-between">
                            <span className="text-[#888]">Cdo:</span>
                            <span className="font-bold text-slate-200">{unit.commander}</span>
                          </div>
                          <div className="bg-[#111827] px-2 py-1 rounded border border-[#1e293b] flex items-center justify-between">
                            <span className="text-[9px] font-mono text-[#64748b] flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-emerald-400" />
                              GPS:
                            </span>
                            <span className="text-[10px] font-mono text-emerald-300 font-bold">
                              {unit.coordinates || 'NO FIJADA'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-[#1e2738] text-[9px] font-mono">
                          <span className="text-[#64748b]">
                            Combustible: <strong className="text-slate-300">{unit.fuel}%</strong> | Bat: <strong className="text-slate-300">{unit.battery}%</strong>
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPatrolForEarth(unit);
                                setIsGoogleEarthModalOpen(true);
                              }}
                              className="text-cyan-300 hover:text-white bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/40 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                              title={`Ver ${unit.name} en Google Earth 3D`}
                            >
                              <Globe className="w-3 h-3 text-cyan-400" />
                              <span>Earth 3D</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPatrolForFocus(unit.name);
                                setIsPatrolRadarOpen(true);
                              }}
                              className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Crosshair className="w-3 h-3" />
                              <span>Ver en Radar</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )
              )}
            </div>
          </div>

          <div className="mt-4 p-2.5 bg-[#121722] border border-[#1e2738] rounded-lg text-[10px] font-mono text-[#64748b] flex justify-between">
            <span>Matriz Doctrinal:</span>
            <span className="text-[#f97316] font-bold">PII-LCC Ley 1053 Compliant</span>
          </div>
        </div>

        {/* CENTER COLUMN: Central Fusion Workshop & S-2 Ingestion Engine */}
        <div className="lg:col-span-5 bg-[#0a0d14] border border-[#1e2738] rounded-xl p-5 shadow-xl relative text-left flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#f97316]/5 rounded-full blur-3xl pointer-events-none" />

          <div>
            {/* Header */}
            <div className="border-b border-[#1e2738] pb-3 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#f97316]" />
                <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                  MÓDULO DE FUSIÓN & VALIDACIÓN
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {!isG2Selected && selectedAlert && (
                  <button
                    type="button"
                    onClick={() => setIsCentralPhotoModalOpen(true)}
                    className="bg-gradient-to-r from-orange-950 to-amber-950 hover:from-orange-900 hover:to-amber-900 text-amber-200 border border-orange-500/50 text-[10px] font-mono font-bold px-2 py-1 rounded flex items-center gap-1.5 shadow active:scale-95 transition-all cursor-pointer animate-pulse"
                    title="Ver fotografía capturada por el sensor"
                  >
                    <Camera className="w-3.5 h-3.5 text-[#f97316]" />
                    <span>FOTO SENSOR [{selectedAlert.id}]</span>
                  </button>
                )}
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                  isG2Selected
                    ? 'text-[#38bdf8] bg-[#38bdf8]/10 border-[#38bdf8]/30'
                    : 'text-orange-400 bg-orange-500/10 border-orange-500/30 font-bold'
                }`}>
                  {isG2Selected ? `EXPEDIENTE: ${selectedRecordId || 'SIN SELECCIÓN'}` : `ÓRGANO S-2: ${selectedAlert?.sourceName || selectedRecordId}`}
                </span>
              </div>
            </div>

            {!selectedRecordId ? (
              <div className="py-24 text-center text-[#64748b] font-mono text-xs">
                <Eye className="w-8 h-8 text-[#334155] mx-auto mb-2 animate-pulse" />
                <p>Seleccione un expediente o alerta en el panel izquierdo para abrir la mesa de fusión analítica.</p>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="space-y-4 text-xs font-mono">
                
                {/* CASE A: Search Organ Alert Selected -> Render Full S-2 Inspector */}
                {!isG2Selected && selectedAlert && (
                  <div className="space-y-3">
                    <SearchOrganAlertViewer
                      alert={selectedAlert}
                      selectedIdeas={selectedIdeas}
                      onToggleIdea={toggleIdea}
                      onInjectIdeas={handleInjectIdeasIntoAction}
                      onQuickProcessToExpediente={() => handleProcessAlertToExpediente(selectedAlert)}
                      nextExpedienteId={nextExpedienteId}
                    />

                    {/* Proximity Card: Real-time nearest patrol to detection coordinates */}
                    {nearestPatrolToAlert && (
                      <div className="bg-[#0b1322] border border-emerald-500/40 rounded-lg p-3 text-left">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-mono font-bold text-emerald-300 uppercase flex items-center gap-1.5">
                            <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                            PATRULLA MÁS CERCANA AL VECTOR DE DETECCIÓN
                          </span>
                          <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30 font-bold">
                            {nearestPatrolToAlert.distanceKm.toFixed(1)} KM DE DISTANCIA
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-mono">
                          <div>
                            <span className="text-white font-bold">{nearestPatrolToAlert.unit.name}</span>
                            <span className="text-[#888] ml-2">Cdo: {nearestPatrolToAlert.unit.commander}</span>
                            <div className="text-[10px] text-emerald-400 mt-0.5">
                              GPS Actual: {nearestPatrolToAlert.unit.coordinates}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPatrolForEarth(nearestPatrolToAlert.unit);
                                setIsGoogleEarthModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 bg-[#0a1628] hover:bg-[#112440] text-cyan-300 hover:text-white border border-cyan-500/50 font-mono font-bold text-[10px] rounded flex items-center gap-1 cursor-pointer transition-all shadow"
                              title="Visualizar patrulla más cercana en Google Earth 3D"
                            >
                              <Globe className="w-3 h-3 text-cyan-400" />
                              <span>Google Earth 3D</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPatrolForFocus(nearestPatrolToAlert.unit.name);
                                setIsPatrolRadarOpen(true);
                              }}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-black font-mono font-bold text-[10px] rounded flex items-center gap-1 cursor-pointer transition-all shadow"
                            >
                              <Crosshair className="w-3 h-3" />
                              <span>Seguir en Radar</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* CASE B: Expediente Selected -> Render Cartographic & Doctrinal Viewer */}
                {isG2Selected && selectedG2 && (
                  <div className="space-y-3">
                    <G2DoctrinalViewer record={selectedG2} />

                    {/* Ideas Fuerza Selector & Injector */}
                    {selectedG2.evaluacion?.ideasFuerza && selectedG2.evaluacion.ideasFuerza.length > 0 && (
                      <div className="bg-[#0f1420] border border-[#222c40] rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between border-b border-[#1e2738] pb-1.5">
                          <span className="text-[10px] font-bold text-[#f97316] uppercase flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5" />
                            IDEAS FUERZA EXTRAÍDAS
                          </span>
                          <button
                            type="button"
                            onClick={handleInjectIdeasIntoAction}
                            className="text-[9px] bg-[#f97316]/20 hover:bg-[#f97316]/30 text-[#f97316] px-2 py-0.5 rounded font-bold transition-colors cursor-pointer"
                          >
                            Incorporar al Análisis
                          </button>
                        </div>
                        <div className="space-y-1 max-h-[100px] overflow-y-auto pr-1">
                          {selectedG2.evaluacion.ideasFuerza.map((idea, idx) => {
                            const isChecked = selectedIdeas.includes(idea);
                            return (
                              <div
                                key={idx}
                                onClick={() => toggleIdea(idea)}
                                className={`p-1.5 rounded text-[10px] flex items-start gap-2 cursor-pointer transition-colors ${
                                  isChecked
                                    ? 'bg-[#f97316]/10 text-[#fdba74] border border-[#f97316]/30'
                                    : 'bg-[#121722] text-[#94a3b8] hover:text-white border border-transparent'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {}}
                                  className="mt-0.5 accent-[#f97316]"
                                />
                                <span className="leading-snug">{idea}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Title & Expediente Rubro Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[#94a3b8] mb-1 font-bold">
                      Título de la Inteligencia / Expediente Generado
                    </label>
                    <input
                      type="text"
                      required
                      value={intelTitle}
                      onChange={(e) => setIntelTitle(e.target.value)}
                      className="w-full bg-[#121722] text-white border border-[#22293a] rounded px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-[#f97316]"
                    />
                  </div>

                  <div>
                    <label className="block text-[#94a3b8] mb-1 font-bold">
                      Rubro Destino PII-LCC
                    </label>
                    <select
                      value={expedienteRubro}
                      onChange={(e) => setExpedienteRubro(e.target.value as any)}
                      className="w-full bg-[#121722] text-white border border-[#22293a] rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-[#f97316]"
                    >
                      <option value="ECONOMICO">ECONÓMICO (Contrabando)</option>
                      <option value="MILITAR">MILITAR (Interdicción/Armas)</option>
                      <option value="POLITICO">POLÍTICO (Ley 1053)</option>
                      <option value="PSICOSOCIAL">PSICOSOCIAL</option>
                      <option value="OTRO">OTRO</option>
                    </select>
                  </div>
                </div>

                {/* Reliability & Certainty Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#94a3b8] mb-1 font-bold">
                      [Confiabilidad de Fuente] *
                    </label>
                    <select
                      value={reliability}
                      onChange={(e) => setReliability(e.target.value as any)}
                      className="w-full bg-[#121722] text-white border border-[#22293a] rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-[#f97316]"
                    >
                      <option value="A">A - Completamente Fiable</option>
                      <option value="B">B - Usualmente Fiable</option>
                      <option value="C">C - Bastante Fiable</option>
                      <option value="D">D - No Fiable</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#94a3b8] mb-1 font-bold">
                      [Certeza Información] *
                    </label>
                    <select
                      value={certainty}
                      onChange={(e) => setCertainty(e.target.value as any)}
                      className="w-full bg-[#121722] text-white border border-[#22293a] rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-[#f97316]"
                    >
                      <option value="1">1 - Confirmada por otras fuentes</option>
                      <option value="2">2 - Probable / Coincidente</option>
                      <option value="3">3 - Posible / No confirmada</option>
                      <option value="4">4 - Dudosa / Improbable</option>
                    </select>
                  </div>
                </div>

                {/* Route & Hostile Clan Target */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#94a3b8] mb-1 font-bold">
                      [Ruta / Vector Contrastado]
                    </label>
                    <select
                      value={routeId}
                      onChange={(e) => setRouteId(e.target.value)}
                      className="w-full bg-[#121722] text-white border border-[#22293a] rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-[#f97316]"
                    >
                      <option value="Ruta Colchane">Ruta Colchane</option>
                      <option value="Paso Pisiga">Paso Pisiga</option>
                      <option value="Salar de Coipasa">Salar de Coipasa</option>
                      <option value="Hito 14">Hito 14</option>
                      <option value="Tambo Quemado">Tambo Quemado</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#94a3b8] mb-1 font-bold">
                      [Facción / Clan Implicado]
                    </label>
                    <select
                      value={targetClan}
                      onChange={(e) => setTargetClan(e.target.value)}
                      className="w-full bg-[#121722] text-white border border-[#22293a] rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-[#f97316]"
                    >
                      {clans.map((clan) => (
                        <option key={clan.id} value={clan.name}>
                          {clan.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Threat Score Slider */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[#94a3b8] font-bold">Nivel de Amenaza Estimado</label>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                      threatScore > 80 ? 'bg-red-500/20 text-red-400' :
                      threatScore > 50 ? 'bg-orange-500/20 text-orange-400' :
                      'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {threatScore}% // {threatScore > 80 ? 'CRÍTICO' : threatScore > 50 ? 'ALTO' : 'MODERADO'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={threatScore}
                    onChange={(e) => setThreatScore(parseInt(e.target.value))}
                    className="w-full accent-[#f97316] h-1.5 bg-[#1e2738] rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Actionable Tactical Recommendation */}
                <div>
                  <label className="block text-[#94a3b8] mb-1 font-bold">
                    Acción Táctica Recomendada (CFI / PII-LCC / OOA)
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={recommendedAction}
                    onChange={(e) => setRecommendedAction(e.target.value)}
                    className="w-full bg-[#121722] text-white border border-[#22293a] rounded p-2 text-xs font-mono focus:outline-none focus:border-[#f97316] resize-none font-sans"
                  />
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 pt-2 border-t border-[#1e2738]">
                  <button
                    type="button"
                    onClick={() => {
                      if (!isG2Selected && selectedAlert) {
                        onUpdateAlertStatus(selectedAlert.id, 'DISMISSED');
                      }
                      setSelectedRecordId('');
                    }}
                    className="flex-1 bg-[#121722] hover:bg-red-950/30 text-[#94a3b8] hover:text-red-400 border border-[#22293a] text-xs font-mono py-2.5 rounded transition-colors cursor-pointer"
                  >
                    Descartar / Cerrar
                  </button>

                  <button
                    type="submit"
                    className="flex-2 bg-[#f97316] hover:bg-[#ea580c] text-white text-xs font-mono py-2.5 rounded font-black flex items-center justify-center gap-2 transition-all shadow-lg active:scale-98 uppercase cursor-pointer"
                  >
                    <Zap className="w-4 h-4 fill-current" />
                    <span>
                      {!isG2Selected 
                        ? `Procesar e Implementar a Expediente (${nextExpedienteId})`
                        : 'Validar y Promover a Inteligencia (CEO-LCC)'
                      }
                    </span>
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-[#1e2738] flex items-center justify-between text-[9px] font-mono text-[#64748b]">
            <span>Operador: Cap. M. Vargas (Analista LCC)</span>
            <span>Clasif: {selectedG2?.clasificacionSeguridad || 'CONFIDENCIAL'}</span>
          </div>
        </div>

        {/* RIGHT COLUMN: Clan Database & Validated Intel Monitor */}
        <div className="lg:col-span-3 bg-[#0a0d14] border border-[#1e2738] rounded-xl p-4 shadow-xl flex flex-col justify-between text-left">
          <div>
            {/* Tab switch */}
            <div className="flex items-center justify-between border-b border-[#1e2738] pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#10b981]" />
                <h3 className="text-xs font-mono font-bold text-white uppercase">
                  CORRELACIÓN Y CLANES
                </h3>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setRightTab('CLANS')}
                  className={`text-[9px] font-mono px-2 py-0.5 rounded cursor-pointer ${
                    rightTab === 'CLANS'
                      ? 'bg-[#10b981]/20 text-[#10b981] font-bold border border-[#10b981]/30'
                      : 'text-[#64748b] hover:text-[#94a3b8]'
                  }`}
                >
                  Clanes ({clans.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRightTab('VALIDATED')}
                  className={`text-[9px] font-mono px-2 py-0.5 rounded cursor-pointer ${
                    rightTab === 'VALIDATED'
                      ? 'bg-[#38bdf8]/20 text-[#38bdf8] font-bold border border-[#38bdf8]/30'
                      : 'text-[#64748b] hover:text-[#94a3b8]'
                  }`}
                >
                  Inteligencia ({actionableIntel.length})
                </button>
              </div>
            </div>

            {/* Tab: Clans */}
            {rightTab === 'CLANS' && (
              <div className="space-y-3">
                {/* Clan Management Header Controls */}
                <div className="flex items-center justify-between pb-1 border-b border-[#1e2738]/60">
                  <span className="text-[10px] font-mono text-[#94a3b8] font-bold uppercase">
                    Base de Datos ({clans.length} Clanes)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setClanModalInitialId(null);
                      setIsClanManagementOpen(true);
                    }}
                    className="flex items-center gap-1 text-[10px] font-mono font-bold bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 hover:text-white px-2 py-0.5 rounded border border-emerald-600/60 transition-all cursor-pointer shadow-sm"
                    title="Dar de alta e incrementar un nuevo clan en la base de datos"
                  >
                    <Plus className="w-3 h-3 text-emerald-400" />
                    <span>+ Incrementar Clan</span>
                  </button>
                </div>

                <div className="space-y-1.5 max-h-[190px] overflow-y-auto pr-1">
                  {filteredClans.map((clan) => (
                    <div
                      key={clan.id}
                      onClick={() => setSelectedClanId(clan.id)}
                      className={`p-2 rounded border cursor-pointer transition-all ${
                        selectedClanId === clan.id
                          ? 'bg-[#10b981]/10 border-[#10b981]'
                          : 'bg-[#0f1420] border-[#1e2738] hover:border-[#334155]'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-mono font-bold text-white truncate">{clan.name}</span>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[8px] font-mono font-bold px-1 rounded ${
                            clan.threatLevel === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                            clan.threatLevel === 'HIGH' ? 'bg-orange-500/20 text-orange-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {clan.threatLevel}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setClanModalInitialId(clan.id);
                              setIsClanManagementOpen(true);
                            }}
                            className="text-[#64748b] hover:text-emerald-400 p-0.5"
                            title="Editar / Incrementar datos de este clan"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div className="text-[9px] font-mono text-[#64748b] mt-0.5 flex items-center justify-between">
                        <span>{clan.membersCount} integrantes // Activo: {clan.lastActive}</span>
                        {clan.interceptedPhones && clan.interceptedPhones.length > 0 && (
                          <span className="text-emerald-400 text-[8px] flex items-center gap-0.5">
                            <Smartphone className="w-2.5 h-2.5" />
                            {clan.interceptedPhones.length} telfs
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Active Clan Details */}
                {activeClanDetails && (
                  <div className="bg-[#121722] border border-[#22293a] rounded-lg p-3 space-y-2 text-xs font-mono">
                    <div className="border-b border-[#1e2738] pb-1 flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white">{activeClanDetails.name}</span>
                        <span className="text-[9px] text-[#10b981]">VECTOR CONTRASTADO</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setClanModalInitialId(activeClanDetails.id);
                          setIsClanManagementOpen(true);
                        }}
                        className="text-[9px] font-mono text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-950/40 border border-emerald-800/50 hover:bg-emerald-900/60 transition-colors cursor-pointer"
                        title="Incrementar información de este clan en la base de datos"
                      >
                        <Edit3 className="w-2.5 h-2.5" />
                        <span>Incrementar Info</span>
                      </button>
                    </div>

                    <div>
                      <span className="text-[9px] text-[#64748b] uppercase font-bold block mb-1">Rutas Conocidas:</span>
                      <div className="flex flex-wrap gap-1">
                        {activeClanDetails.knownRoutes.map((r, i) => (
                          <span key={i} className="bg-[#0b0f19] text-[#cbd5e1] text-[9px] px-1.5 py-0.5 rounded border border-[#1e2738]">
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-[9px] text-[#64748b] uppercase font-bold block mb-0.5">Tácticas:</span>
                      <p className="text-[#94a3b8] font-sans text-[11px] leading-relaxed">
                        {activeClanDetails.tactics}
                      </p>
                    </div>

                    <div>
                      <span className="text-[9px] text-[#64748b] uppercase font-bold block mb-1">Puntos Calientes:</span>
                      <div className="flex flex-wrap gap-1">
                        {activeClanDetails.recentHotspots.map((hs, i) => (
                          <span key={i} className="text-[9px] text-[#38bdf8] flex items-center gap-1 font-bold">
                            ● {hs}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Extended Intelligence Data (Phones, Frequencies, Vehicles) */}
                    {(activeClanDetails.interceptedPhones?.length || activeClanDetails.interceptedFrequencies?.length || activeClanDetails.vehicles?.length) ? (
                      <div className="pt-2 border-t border-[#1e2738] space-y-1.5 text-[10px]">
                        {activeClanDetails.interceptedPhones && activeClanDetails.interceptedPhones.length > 0 && (
                          <div className="flex items-start gap-1">
                            <Smartphone className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                            <span className="text-zinc-400">Celulares: </span>
                            <span className="text-emerald-300 font-bold">{activeClanDetails.interceptedPhones.join(', ')}</span>
                          </div>
                        )}
                        {activeClanDetails.interceptedFrequencies && activeClanDetails.interceptedFrequencies.length > 0 && (
                          <div className="flex items-start gap-1">
                            <Radio className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
                            <span className="text-zinc-400">VHF/UHF: </span>
                            <span className="text-amber-300 font-bold">{activeClanDetails.interceptedFrequencies.join(', ')}</span>
                          </div>
                        )}
                        {activeClanDetails.vehicles && activeClanDetails.vehicles.length > 0 && (
                          <div className="flex items-start gap-1">
                            <Truck className="w-3 h-3 text-cyan-400 mt-0.5 shrink-0" />
                            <span className="text-zinc-400">Vehículos: </span>
                            <span className="text-cyan-300 font-bold">{activeClanDetails.vehicles.join(', ')}</span>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Validated Intelligence */}
            {rightTab === 'VALIDATED' && (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {actionableIntel.length === 0 ? (
                  <div className="text-center py-10 text-xs font-mono text-[#64748b]">
                    No hay reportes validados aún.
                  </div>
                ) : (
                  actionableIntel.map((intel) => (
                    <div key={intel.id} className="p-2.5 rounded bg-[#0f1420] border border-[#1e2738] space-y-1">
                      <div className="flex items-center justify-between text-[9px] font-mono">
                        <span className="font-bold text-[#38bdf8]">{intel.id}</span>
                        <span className="text-[#10b981] font-bold">● {intel.status}</span>
                      </div>
                      <p className="text-xs text-white font-mono font-bold line-clamp-1">{intel.title}</p>
                      <p className="text-[10px] text-[#94a3b8] line-clamp-2">{intel.recommendedAction}</p>
                      <div className="flex justify-between items-center text-[8px] font-mono text-[#64748b] pt-1 border-t border-[#1e2738]">
                        <span>Clan: {intel.targetClan}</span>
                        <span>{new Date(intel.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="mt-4 p-2 bg-[#121722] border border-[#1e2738] rounded text-[9px] font-mono text-[#64748b] leading-tight">
            * Integración directa S-2 con matriz doctrinal PII-LCC (Ley 1053 y Art. 251 CPE).
          </div>
        </div>
      </div>

      {/* New Expediente Manual Modal */}
      <NewG2RecordModal
        isOpen={isNewRecordModalOpen}
        onClose={() => setIsNewRecordModalOpen(false)}
        onAddRecord={(newRec) => {
          setG2Records(prev => [newRec, ...prev]);
          if (onAddExpediente) {
            onAddExpediente(newRec);
          }
          handleSelectG2(newRec);
        }}
      />

      {/* Central Tactical Photo Modal for Selected Alert */}
      {selectedAlert && (
        <TacticalPhotoViewerModal
          isOpen={isCentralPhotoModalOpen}
          onClose={() => setIsCentralPhotoModalOpen(false)}
          alert={selectedAlert}
        />
      )}

      {/* Real-time Patrol Location in Google Earth 3D Modal */}
      <GoogleEarthPatrolModal
        isOpen={isGoogleEarthModalOpen}
        onClose={() => setIsGoogleEarthModalOpen(false)}
        selectedPatrol={selectedPatrolForEarth}
        allPatrols={tacticalUnits}
        onSelectPatrol={(patrol) => setSelectedPatrolForEarth(patrol)}
      />

      {/* Clan Management & Information Increment Modal */}
      <ClanManagementModal
        isOpen={isClanManagementOpen}
        onClose={() => setIsClanManagementOpen(false)}
        clans={clans}
        onSaveClan={(clan) => {
          if (onSaveClan) onSaveClan(clan);
        }}
        onDeleteClan={(id) => {
          if (onDeleteClan) onDeleteClan(id);
        }}
        onBatchImportClans={(imported) => {
          if (onBatchImportClans) onBatchImportClans(imported);
        }}
        initialSelectedClanId={clanModalInitialId || undefined}
      />
    </div>
  );
}
