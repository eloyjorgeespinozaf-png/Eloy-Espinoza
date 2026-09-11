/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Dashboard Operacional del Módulo Activo Asignado de Patrulla
 * Implementa paridad funcional completa con la Consola de Operaciones (CFI / PII-LCC)
 * para cada patrulla con acceso individual por contraseña.
 */

import React, { useState, useEffect } from 'react';
import { 
  TacticalUnit, 
  AutomatedOrder, 
  RawAlert, 
  Clan, 
  ActionableIntel, 
  G2RegistryRecord 
} from '../types';
import { initialG2Records } from '../utils/g2Records';
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
  Lock,
  Shield,
  Crosshair,
  Compass,
  Battery,
  Fuel,
  Volume2,
  VolumeX,
  Sliders,
  Check,
  Navigation,
  Key,
  Users
} from 'lucide-react';
import { playSyntheticBeep, playChime } from '../utils/audio';

interface PatrolOperationalDashboardProps {
  patrol: TacticalUnit;
  rawAlerts: RawAlert[];
  clans: Clan[];
  actionableIntel: ActionableIntel[];
  expedientes?: G2RegistryRecord[];
  activeOrders?: AutomatedOrder[];
  onLockPatrol: (patrolId: string) => void;
  onOpenEditPatrol: (patrol: TacticalUnit) => void;
  onTriggerSOS: () => void;
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
}

export function PatrolOperationalDashboard({
  patrol,
  rawAlerts = [],
  clans = [],
  actionableIntel = [],
  expedientes,
  activeOrders = [],
  onLockPatrol,
  onOpenEditPatrol,
  onTriggerSOS,
  onAddExpediente,
  onPromoteToIntel,
  onUpdateAlertStatus,
  onConfirmOrder,
  onSendFieldReport,
  onUpdateUnitCoordinates
}: PatrolOperationalDashboardProps) {
  // Main Module Nav Tabs
  const [activeModuleTab, setActiveModuleTab] = useState<
    'FUSION' | 'INGESTA_S2' | 'ORDERS' | 'EXPEDIENTES' | 'CLANS' | 'TELEMETRY'
  >('FUSION');

  // Expedientes repository state
  const [g2Records, setG2Records] = useState<G2RegistryRecord[]>(() => {
    return expedientes && expedientes.length > 0 ? expedientes : initialG2Records;
  });

  useEffect(() => {
    if (expedientes && expedientes.length > 0) {
      setG2Records(expedientes);
    }
  }, [expedientes]);

  // Operational Console states
  const [activeFeedTab, setActiveFeedTab] = useState<'G2' | 'S2'>('G2');
  const [alertFilterStatus, setAlertFilterStatus] = useState<'PENDING' | 'ALL' | 'PROCESSED'>('PENDING');
  const [selectedRecordId, setSelectedRecordId] = useState<string>(() => g2Records[0]?.id || '');
  const [isNewRecordModalOpen, setIsNewRecordModalOpen] = useState(false);
  const [isCentralPhotoModalOpen, setIsCentralPhotoModalOpen] = useState(false);
  const [justImplementedExpediente, setJustImplementedExpediente] = useState<{ id: string; title: string } | null>(null);

  // Fusion form state for the patrol
  const selectedG2 = g2Records.find(r => r.id === selectedRecordId);
  const selectedAlert = rawAlerts.find(a => a.id === selectedRecordId);
  const isG2Selected = activeFeedTab === 'G2';

  const [intelTitle, setIntelTitle] = useState<string>(
    selectedG2 ? `Apreciación [${patrol.name}]: ${selectedG2.id} - ${selectedG2.componenteRubro}` : ''
  );
  const [expedienteRubro, setExpedienteRubro] = useState<'ECONOMICO' | 'MILITAR' | 'POLITICO' | 'PSICOSOCIAL' | 'OTRO'>('ECONOMICO');
  const [targetClan, setTargetClan] = useState<string>(clans[0]?.name || 'Clan Los Choneros de Frontera');
  const [recommendedAction, setRecommendedAction] = useState<string>(
    `Patrulla ${patrol.name}: Desplegar vigilancia SIGINT y contrainteligencia táctica en vector fronterizo.`
  );
  const [threatScore, setThreatScore] = useState<number>(78);
  const [reliability, setReliability] = useState<'A' | 'B' | 'C' | 'D'>('B');
  const [certainty, setCertainty] = useState<'1' | '2' | '3' | '4'>('2');
  const [routeId, setRouteId] = useState<string>('Ruta Colchane');
  const [selectedIdeas, setSelectedIdeas] = useState<string[]>([]);
  const [filterRubro, setFilterRubro] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // S-2 Field Report Form States
  const [reportType, setReportType] = useState<'IMINT' | 'HUMINT' | 'SIGINT'>('HUMINT');
  const [sensorId, setSensorId] = useState<string>(`Sensor ${patrol.name} (Dotación Terrestre)`);
  const [reportCoordinates, setReportCoordinates] = useState<string>(patrol.coordinates || '19°13\'10"S 68°35\'50"W');
  const [reportDetails, setReportDetails] = useState<string>('');
  const [multimediaPreset, setMultimediaPreset] = useState<string>('multimedia-thermal');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);

  // GPS Telemetry states
  const [telemetryLat, setTelemetryLat] = useState<string>(() => {
    const parts = (patrol.coordinates || '').split(/\s+/);
    return parts[0] || '19°13\'10"S';
  });
  const [telemetryLon, setTelemetryLon] = useState<string>(() => {
    const parts = (patrol.coordinates || '').split(/\s+/);
    return parts[1] || '68°35\'50"W';
  });
  const [isSimulatingGps, setIsSimulatingGps] = useState<boolean>(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Pending alerts count
  const pendingAlerts = rawAlerts.filter(a => a.status === 'PENDING');
  const latestPendingAlert = pendingAlerts[0] || null;

  // Filtered orders for this specific patrol
  const patrolOrders = activeOrders.filter(
    o => o.assignedUnit.toLowerCase() === patrol.name.toLowerCase() || 
         o.assignedUnit.toLowerCase().includes(patrol.name.toLowerCase()) ||
         patrol.name.toLowerCase().includes(o.assignedUnit.toLowerCase())
  );

  const nextExpedienteId = `REG-2026-${String(g2Records.length + 1).padStart(3, '0')}`;

  // Keep coordinates updated if patrol prop updates
  useEffect(() => {
    if (patrol.coordinates) {
      setReportCoordinates(patrol.coordinates);
      const parts = patrol.coordinates.split(/\s+/);
      if (parts[0]) setTelemetryLat(parts[0]);
      if (parts[1]) setTelemetryLon(parts[1]);
    }
  }, [patrol.coordinates]);

  // Extract alert ideas
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

  // Select G2
  const handleSelectG2 = (record: G2RegistryRecord) => {
    setSelectedRecordId(record.id);
    setActiveFeedTab('G2');
    setIntelTitle(`Apreciación [${patrol.name}]: ${record.id} [${record.componenteRubro}] - ${record.tipoRegistro}`);
    
    if (record.evaluacion?.confiabilidad?.escala) {
      setReliability((record.evaluacion.confiabilidad.escala.toUpperCase() as any) || 'A');
    }
    if (record.evaluacion?.exactitud?.escala) {
      setCertainty((record.evaluacion.exactitud.escala as any) || '1');
    }
    
    const ideas = record.evaluacion?.ideasFuerza || [];
    setSelectedIdeas(ideas.slice(0, 3));

    if (record.especificoGrafico?.coordenadasCuadricula?.includes('CQ') || record.id === 'REG-2026-002') {
      setRouteId('Salar de Coipasa');
    } else if (record.id === 'REG-2026-003') {
      setRouteId('Tambo Quemado');
    } else if (record.id === 'REG-2026-004') {
      setRouteId('Paso Pisiga');
    } else {
      setRouteId('Hito 14');
    }

    setRecommendedAction(`Unidad ${patrol.name}: Ejecutar reconocimiento ofensivo y vigilancia en ${routeId} según directiva doctrinal.`);
    setThreatScore(75);
    playSyntheticBeep(520, 0.05);
  };

  // Select Alert
  const handleSelectAlert = (alert: RawAlert) => {
    setSelectedRecordId(alert.id);
    setActiveFeedTab('S2');
    setIntelTitle(`Apreciación [${patrol.name}]: Detección ${alert.sourceName} en ${alert.coordinates}`);
    setReliability(alert.reliability);
    setCertainty(alert.certainty);
    
    if (alert.details.toLowerCase().includes('combustible') || alert.details.toLowerCase().includes('cisterna') || alert.details.toLowerCase().includes('f-12')) {
      setExpedienteRubro('ECONOMICO');
    } else {
      setExpedienteRubro('MILITAR');
    }

    const currentRoute = alert.clandestineRouteId || 'Ruta Colchane';
    setRouteId(currentRoute);
    const matchedClan = clans.find(c => c.knownRoutes.includes(currentRoute));
    setTargetClan(matchedClan ? matchedClan.name : clans[0]?.name || 'Clan Los Choneros de Frontera');

    setRecommendedAction(`Patrulla ${patrol.name}: Interceptar convoy hostil en vector ${currentRoute} reportado por ${alert.sourceName}.`);

    let score = 55;
    if (alert.reliability === 'A') score += 20;
    if (alert.certainty === '1') score += 15;
    if (alert.details.toLowerCase().includes('armad') || alert.details.toLowerCase().includes('miguelines')) score += 10;
    setThreatScore(Math.min(100, score));

    setSelectedIdeas(extractAlertIdeas(alert));
    playSyntheticBeep(640, 0.06);
  };

  // Toggle Idea
  const toggleIdea = (idea: string) => {
    setSelectedIdeas(prev => 
      prev.includes(idea) ? prev.filter(i => i !== idea) : [...prev, idea]
    );
  };

  // Process Alert into Expediente & Actionable Intel
  const handleProcessAlertToExpediente = (sourceAlert?: RawAlert) => {
    const targetAlert = sourceAlert || selectedAlert;
    if (!targetAlert) return;

    const generatedId = nextExpedienteId;
    const ideasToUse = selectedIdeas.length > 0 ? selectedIdeas : extractAlertIdeas(targetAlert);
    const isGraphic = targetAlert.mediaUrl !== undefined || targetAlert.sourceType === 'IMINT';

    const detailedContent = `EXPEDIENTE TÁCTICO // MÓDULO OPERATIVO PATRULLA: ${patrol.name} (LEY 1053 / ART. 251 CPE)

1. ORIGEN DE LA DETECCIÓN:
• Sensor / Unidad Emisora: ${targetAlert.sourceName} (${targetAlert.sourceType})
• Coordenadas Cuadrícula MGRS: ${targetAlert.coordinates}
• Unidad Asignada de Interdicción: ${patrol.name} (Cmdte: ${patrol.commander || 'S-2'})
• Frecuencia VHF Operativa: ${patrol.frequency || '142.850 MHz'}

2. REPORTE PRIMARIO DE CAMPO:
"${targetAlert.details}"

3. APRECIACIÓN ANALÍTICA DE FUSIÓN (CONSOLA DE PATRULLA):
${recommendedAction}

4. PARÁMETROS OPERACIONALES:
• Vector Clandestino Contrastado: ${routeId}
• Organización Hostil Identificada: ${targetClan}
• Nivel de Amenaza Estimado: ${threatScore}%
• Código Doctrinal: ${reliability}-${certainty}
• Base Legal: Ley 1053 de Fortalecimiento de la Lucha Contra el Contrabando.`;

    const newExpediente: G2RegistryRecord = {
      id: generatedId,
      fechaHoraIngreso: new Date().toISOString().slice(0, 16),
      tipoRegistro: isGraphic ? 'GRAFICO' : 'LITERAL',
      componenteRubro: expedienteRubro,
      clasificacionSeguridad: 'CONFIDENCIAL',
      contenidoDetallado: detailedContent,
      referenciasAntecedentes: [
        `REPORTE S-2 ${targetAlert.id}`,
        patrol.name,
        targetAlert.sourceName,
        routeId,
        targetClan
      ],
      unidadReceptora: `Módulo Activo ${patrol.name} / PII-LCC`,
      operadorRegistro: `${patrol.commander || 'Oficial S-2'} (${patrol.name})`,
      observacionesAdicionales: `EXPEDIENTE GENERADO DESDE CONSOLA ACTIVA DE PATRULLA: ${patrol.name}`,
      especificoGrafico: isGraphic ? {
        subtipoElemento: `Detección Sensor ${targetAlert.sourceType} // Telemetría ${patrol.name}`,
        ubicacionReferenciaDigital: `Ingesta S-2 / ${patrol.name} / Sensor ${targetAlert.sourceName}`,
        archivoAdjunto: targetAlert.mediaUrl ? {
          nombre: `captura_${targetAlert.id}.jpg`,
          tipo: 'image/jpeg',
          tamano: 48200,
          base64Data: targetAlert.mediaUrl.startsWith('data:') ? targetAlert.mediaUrl : '',
          fechaCarga: new Date().toISOString()
        } : undefined,
        escalaCoordenadas: `1:50.000 / ${targetAlert.coordinates}`,
        fechaCapturaGrafica: new Date().toISOString().slice(0, 10),
        interpretacionVisualPreliminar: `Captura y telemetría de ${patrol.name} en cuadrícula ${targetAlert.coordinates}. ${targetAlert.details.slice(0, 130)}...`,
        tipoSoporte: 'Sensor Órgano de Búsqueda / FLIR',
        identificadorHojaPliego: `PLIEGO-PATRULLA-${generatedId}`,
        escala: '1:50.000',
        coordenadasCuadricula: targetAlert.coordinates,
        metadatosSensorFecha: new Date().toISOString().slice(0, 10),
        orientacionNorte: 'Norte Cuadrícula (NC)'
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
        analistaEvaluador: `${patrol.commander || 'Oficial S-2'} (${patrol.name})`,
        fechaHoraEvaluacion: new Date().toISOString().slice(0, 16),
        observacionesEvaluacion: `Evaluado en módulo de ${patrol.name} bajo metodología PII-LCC. Código: ${reliability}-${certainty}.`,
        ideasFuerza: ideasToUse
      }
    };

    setG2Records(prev => [newExpediente, ...prev]);
    if (onAddExpediente) onAddExpediente(newExpediente);
    if (onUpdateAlertStatus) onUpdateAlertStatus(targetAlert.id, 'PROCESSED');

    const newIntel: ActionableIntel = {
      id: `intel-PAT-${Math.floor(100 + Math.random() * 900)}`,
      rawAlertId: targetAlert.id,
      title: intelTitle || `Apreciación [${patrol.name}]: ${newExpediente.id} - ${targetAlert.sourceName}`,
      threatScore,
      validatedBy: `Módulo Táctico ${patrol.name} // ${patrol.commander || 'Cap. S-2'}`,
      targetClan,
      coordinates: targetAlert.coordinates || patrol.coordinates,
      timestamp: new Date().toISOString(),
      status: 'APPROVED',
      recommendedAction,
      mediaUrl: targetAlert.mediaUrl
    };

    if (onPromoteToIntel) {
      onPromoteToIntel(newIntel, reliability, certainty, routeId);
    }

    setJustImplementedExpediente({ id: generatedId, title: intelTitle });
    playChime(520, 780, 0.25);
    setTimeout(() => setJustImplementedExpediente(null), 6000);
  };

  // Submit Field Report from Patrol
  const handleSendReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportDetails.trim()) return;

    const newReport: RawAlert = {
      id: `raw-${Date.now().toString().slice(-4)}`,
      sourceType: reportType,
      sourceName: `${patrol.name} (${sensorId})`,
      coordinates: reportCoordinates,
      timestamp: new Date().toISOString(),
      details: reportDetails,
      reliability,
      certainty,
      status: 'PENDING',
      clandestineRouteId: routeId,
      mediaUrl: capturedPhotoUrl || (reportType === 'IMINT' ? multimediaPreset : undefined)
    };

    onSendFieldReport(newReport);
    setReportDetails('');
    setCapturedPhotoUrl(null);
    setSuccessBanner(`REPORTE DE CAMPO TRANSMITIDO AL CFI CON ÉXITO DESDE ${patrol.name.toUpperCase()}`);
    playChime(600, 880, 0.2);
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  // Transmit GPS Coordinates
  const handleApplyGpsTelemetry = () => {
    const newCoords = `${telemetryLat.trim()} ${telemetryLon.trim()}`;
    onUpdateUnitCoordinates(patrol.name, newCoords);
    setReportCoordinates(newCoords);
    setSuccessBanner(`TELEMETRÍA GPS DE ${patrol.name.toUpperCase()} ACTUALIZADA: ${newCoords}`);
    playSyntheticBeep(750, 0.1);
    setTimeout(() => setSuccessBanner(null), 4000);
  };

  // Filter lists
  const filteredG2 = g2Records.filter(r => {
    const matchesRubro = filterRubro === 'ALL' || r.componenteRubro === filterRubro;
    const matchesSearch = !searchTerm || 
      r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.contenidoDetallado.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.componenteRubro.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRubro && matchesSearch;
  });

  const filteredAlerts = rawAlerts.filter(a => {
    const matchesStatus = alertFilterStatus === 'ALL' || a.status === alertFilterStatus;
    const matchesSearch = !searchTerm ||
      a.sourceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.coordinates.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-4 animate-fade-in text-left">
      {/* Top Banner Alert / Success */}
      {successBanner && (
        <div className="bg-[#10b981]/15 border border-[#10b981] p-3 rounded-xl flex items-center justify-between text-xs font-mono text-[#10b981] shadow-lg animate-fade-in">
          <span className="flex items-center gap-2">
            <Check className="w-4 h-4" />
            <b>{successBanner}</b>
          </span>
          <button onClick={() => setSuccessBanner(null)} className="text-[#888] hover:text-white cursor-pointer">✕</button>
        </div>
      )}

      {justImplementedExpediente && (
        <div className="bg-[#f97316]/15 border border-[#f97316] p-3 rounded-xl flex items-center justify-between text-xs font-mono text-orange-300 shadow-lg animate-fade-in">
          <span className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#f97316]" />
            <span>EXPEDIENTE IMPLEMENTADO CON ÉXITO: <b>{justImplementedExpediente.id}</b> — {justImplementedExpediente.title}</span>
          </span>
          <button onClick={() => setJustImplementedExpediente(null)} className="text-[#888] hover:text-white cursor-pointer">✕</button>
        </div>
      )}

      {/* Patrol Command HUD & Sub-Bar */}
      <div className="bg-[#0a0d14] border border-[#1e2738] rounded-xl p-4 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1e2738] pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#10b981]/15 border border-[#10b981]/40 flex items-center justify-center text-[#10b981]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-mono font-black text-white uppercase tracking-wider">
                  MÓDULO ACTIVO ASIGNADO: {patrol.name}
                </h2>
                <span className="px-2 py-0.5 rounded bg-[#10b981]/20 border border-[#10b981]/40 text-[#10b981] text-[10px] font-mono font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-ping" />
                  CONSOLA AUTENTICADA
                </span>
              </div>
              <p className="text-xs font-mono text-[#94a3b8]">
                Cmdte: <b className="text-white">{patrol.commander || 'Cap. S-2'}</b> | Canal: <b className="text-[#3b82f6]">{patrol.frequency || '142.850 MHz'}</b> | Sector: <b className="text-[#e2e8f0]">{patrol.sector || 'Frontera Occidental'}</b>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenEditPatrol(patrol)}
              className="px-2.5 py-1.5 rounded-lg bg-[#121722] hover:bg-[#1a2233] text-white border border-[#22293a] flex items-center gap-1.5 text-xs font-mono transition-colors cursor-pointer"
              title="Configurar credenciales y datos de patrulla"
            >
              <Sliders className="w-3.5 h-3.5 text-[#3b82f6]" />
              <span className="hidden sm:inline">Parámetros</span>
            </button>

            <button
              type="button"
              onClick={() => onLockPatrol(patrol.id)}
              className="px-2.5 py-1.5 rounded-lg bg-amber-950/30 hover:bg-amber-900/40 text-amber-300 border border-amber-600/40 flex items-center gap-1.5 text-xs font-mono transition-colors cursor-pointer"
              title="Bloquear módulo y solicitar contraseña"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Bloquear Módulo</span>
            </button>

            <button
              type="button"
              onClick={onTriggerSOS}
              className="px-3 py-1.5 rounded-lg bg-[#f43f5e] hover:bg-[#e11d48] text-white font-bold text-xs font-mono shadow-md shadow-[#f43f5e]/30 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              title="Baliza de emergencia MAYDAY / SOS inmediata al CFI"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>SOS</span>
            </button>
          </div>
        </div>

        {/* Telemetry and Readiness Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 text-xs font-mono">
          <div className="bg-[#121722] p-2 rounded-lg border border-[#1e2738] flex items-center justify-between">
            <span className="text-[#64748b]">Batería:</span>
            <span className="text-[#10b981] font-bold flex items-center gap-1">
              <Battery className="w-3.5 h-3.5" />
              {patrol.battery ?? 92}%
            </span>
          </div>

          <div className="bg-[#121722] p-2 rounded-lg border border-[#1e2738] flex items-center justify-between">
            <span className="text-[#64748b]">Combustible:</span>
            <span className="text-amber-400 font-bold flex items-center gap-1">
              <Fuel className="w-3.5 h-3.5" />
              {patrol.fuel ?? 85}%
            </span>
          </div>

          <div className="bg-[#121722] p-2 rounded-lg border border-[#1e2738] flex items-center justify-between">
            <span className="text-[#64748b]">Dotación:</span>
            <span className="text-white font-bold flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-[#3b82f6]" />
              {patrol.personnel} pax
            </span>
          </div>

          <div className="bg-[#121722] p-2 rounded-lg border border-[#1e2738] flex items-center justify-between">
            <span className="text-[#64748b]">Órdenes OOA:</span>
            <span className="text-[#f43f5e] font-bold">
              {patrolOrders.length} asignadas
            </span>
          </div>

          <div className="bg-[#121722] p-2 rounded-lg border border-[#1e2738] flex items-center justify-between">
            <span className="text-[#64748b]">Posición:</span>
            <span className="text-[#e2e8f0] font-bold truncate max-w-[100px]" title={patrol.coordinates}>
              {patrol.coordinates || 'En patrullaje'}
            </span>
          </div>

          <div className="bg-[#121722] p-2 rounded-lg border border-[#1e2738] flex items-center justify-between">
            <span className="text-[#64748b]">Enlace C2:</span>
            <span className="text-[#10b981] font-bold">ENLACE ACTIVO</span>
          </div>
        </div>

        {/* Navigation Tabs - Full Operational Parity with Consola de Operaciones */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#1e2738]">
          <button
            type="button"
            onClick={() => {
              setActiveModuleTab('FUSION');
              playSyntheticBeep(580, 0.05);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeModuleTab === 'FUSION'
                ? 'bg-[#f97316] text-white shadow-md'
                : 'bg-[#121722] text-[#94a3b8] hover:text-white border border-[#1e2738]'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>FUSIÓN Y APRECIACIONES (CONSOLA OPERACIONAL)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveModuleTab('INGESTA_S2');
              playSyntheticBeep(580, 0.05);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeModuleTab === 'INGESTA_S2'
                ? 'bg-yellow-500 text-black shadow-md'
                : 'bg-[#121722] text-[#94a3b8] hover:text-white border border-[#1e2738]'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>INGESTA S-2 (IMINT/HUMINT/SIGINT)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveModuleTab('ORDERS');
              playSyntheticBeep(580, 0.05);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer relative ${
              activeModuleTab === 'ORDERS'
                ? 'bg-[#3b82f6] text-white shadow-md'
                : 'bg-[#121722] text-[#94a3b8] hover:text-white border border-[#1e2738]'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>ÓRDENES AUTOMATIZADAS ({patrolOrders.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveModuleTab('EXPEDIENTES');
              playSyntheticBeep(580, 0.05);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeModuleTab === 'EXPEDIENTES'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-[#121722] text-[#94a3b8] hover:text-white border border-[#1e2738]'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>EXPEDIENTES G-2 ({g2Records.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveModuleTab('CLANS');
              playSyntheticBeep(580, 0.05);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeModuleTab === 'CLANS'
                ? 'bg-rose-600 text-white shadow-md'
                : 'bg-[#121722] text-[#94a3b8] hover:text-white border border-[#1e2738]'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>CLANES DEL SECTOR ({clans.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveModuleTab('TELEMETRY');
              playSyntheticBeep(580, 0.05);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeModuleTab === 'TELEMETRY'
                ? 'bg-[#10b981] text-black shadow-md'
                : 'bg-[#121722] text-[#94a3b8] hover:text-white border border-[#1e2738]'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>TELEMETRÍA GPS</span>
          </button>
        </div>
      </div>

      {/* TAB 1: CONSOLA DE OPERACIONES Y FUSIÓN ANALÍTICA (MISMAS FUNCIONES QUE LA CONSOLA DE OPERACIONES) */}
      {activeModuleTab === 'FUSION' && (
        <div className="space-y-4">
          {/* Latest Pending Alert Ticker */}
          {latestPendingAlert && (
            <div className="bg-gradient-to-r from-orange-950/40 via-[#0a0d14] to-black border-l-4 border-l-[#f97316] border border-[#1e2738] p-3 rounded-xl flex items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f97316] animate-ping shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-black text-orange-200 uppercase">
                      ALERTA ENTRADA DESDE SENSOR S-2
                    </span>
                    <span className="text-[9px] font-mono bg-orange-500/20 text-orange-300 px-1.5 py-0.2 rounded border border-orange-500/30">
                      {latestPendingAlert.sourceType} // {latestPendingAlert.sourceName}
                    </span>
                  </div>
                  <p className="text-xs text-[#cbd5e1] font-sans line-clamp-1 mt-0.5">
                    "{latestPendingAlert.details}" — <span className="font-mono text-orange-300 font-bold">{latestPendingAlert.coordinates}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSelectAlert(latestPendingAlert)}
                className="bg-[#f97316] hover:bg-[#ea580c] text-white text-xs font-mono font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Procesar en Fusión</span>
              </button>
            </div>
          )}

          {/* 3-Column Fusion Grid Identical to Consola de Operaciones */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Col: Expedientes & S-2 Ingests List */}
            <div className="lg:col-span-4 bg-[#0a0d14] border border-[#1e2738] rounded-xl p-4 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-[#1e2738] pb-3 mb-3">
                  <div className="flex gap-1.5 w-full">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveFeedTab('G2');
                        if (g2Records.length > 0 && !selectedG2) handleSelectG2(g2Records[0]);
                      }}
                      className={`flex-1 py-1.5 px-2 rounded text-[11px] font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        activeFeedTab === 'G2'
                          ? 'bg-[#f97316] text-white shadow'
                          : 'bg-[#121722] text-[#94a3b8] hover:text-white border border-[#22293a]'
                      }`}
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
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
                      className={`flex-1 py-1.5 px-2 rounded text-[11px] font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        activeFeedTab === 'S2'
                          ? 'bg-cyan-600 text-white shadow'
                          : 'bg-[#121722] text-[#94a3b8] hover:text-white border border-[#22293a]'
                      }`}
                    >
                      <Radio className="w-3.5 h-3.5" />
                      <span>ÓRGANOS S-2</span>
                      {pendingAlerts.length > 0 && (
                        <span className="bg-[#f97316] text-white text-[9px] px-1.5 rounded-full font-bold">
                          {pendingAlerts.length}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Filter and Search */}
                <div className="space-y-2 mb-3">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={isG2Selected ? "Buscar expediente, rubro..." : "Buscar alerta S-2..."}
                    className="w-full bg-[#121722] text-white border border-[#22293a] rounded px-3 py-1.5 text-xs font-mono placeholder:text-[#64748b] focus:outline-none focus:border-[#f97316]"
                  />

                  {isG2Selected ? (
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
                  ) : (
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
                  )}
                </div>

                {/* Items List */}
                <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
                  {isG2Selected ? (
                    filteredG2.map((rec) => {
                      const isSelected = selectedRecordId === rec.id;
                      return (
                        <div
                          key={rec.id}
                          onClick={() => handleSelectG2(rec)}
                          className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#f97316]/10 border-[#f97316] shadow-md'
                              : 'bg-[#121722] border-[#22293a] hover:border-[#334155]'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-xs font-bold text-white">{rec.id}</span>
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-orange-400 border border-orange-500/20">
                              {rec.componenteRubro}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#94a3b8] line-clamp-2 leading-relaxed">
                            {rec.contenidoDetallado}
                          </p>
                          <div className="flex items-center justify-between text-[9px] font-mono text-[#64748b] mt-1.5 pt-1 border-t border-[#1e2738]">
                            <span>{rec.calificacionEvaluacion || 'S/C'}</span>
                            <span>{rec.fechaHoraIngreso?.slice(0, 10)}</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    filteredAlerts.map((alert) => {
                      const isSelected = selectedRecordId === alert.id;
                      return (
                        <div
                          key={alert.id}
                          onClick={() => handleSelectAlert(alert)}
                          className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-cyan-500/15 border-cyan-500 shadow-md'
                              : 'bg-[#121722] border-[#22293a] hover:border-[#334155]'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-xs font-bold text-white">{alert.sourceName}</span>
                            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                              alert.status === 'PENDING'
                                ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                                : 'bg-emerald-500/20 text-emerald-300'
                            }`}>
                              {alert.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#94a3b8] line-clamp-2 leading-relaxed">
                            {alert.details}
                          </p>
                          <div className="flex items-center justify-between text-[9px] font-mono text-[#64748b] mt-1.5 pt-1 border-t border-[#1e2738]">
                            <span className="text-cyan-400">{alert.coordinates}</span>
                            <span>{alert.reliability}-{alert.certainty}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-[#1e2738] flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewRecordModalOpen(true)}
                  className="w-full bg-[#1e2738] hover:bg-[#283548] text-white text-xs font-mono py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nuevo Expediente Doctrinal</span>
                </button>
              </div>
            </div>

            {/* Middle Col: Record Preview & Analysis Panel */}
            <div className="lg:col-span-5 bg-[#0a0d14] border border-[#1e2738] rounded-xl p-4 shadow-xl space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-[#1e2738] pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#f97316]" />
                    <h3 className="text-xs font-mono font-bold text-white uppercase">
                      Taller de Fusión Analítica // {patrol.name}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-[#94a3b8] bg-[#121722] px-2 py-0.5 rounded border border-[#1e2738]">
                    {selectedG2 ? selectedG2.id : selectedAlert ? selectedAlert.id : 'SELECCIÓN'}
                  </span>
                </div>

                {/* Selected Record Information Card */}
                {selectedG2 ? (
                  <div className="bg-[#121722] p-3 rounded-lg border border-[#1e2738] space-y-2 mb-3">
                    <div className="flex justify-between items-start">
                      <h4 className="text-xs font-mono font-bold text-white">{selectedG2.id} // {selectedG2.componenteRubro}</h4>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-orange-300">
                        {selectedG2.clasificacionSeguridad}
                      </span>
                    </div>
                    <p className="text-xs text-[#cbd5e1] font-sans leading-relaxed max-h-24 overflow-y-auto pr-1">
                      {selectedG2.contenidoDetallado}
                    </p>
                    <div className="text-[10px] font-mono text-[#64748b] flex justify-between pt-1 border-t border-[#1e2738]">
                      <span>Registro: {selectedG2.operadorRegistro}</span>
                      <span>Calificación: <b className="text-orange-400">{selectedG2.calificacionEvaluacion || 'A-1'}</b></span>
                    </div>
                  </div>
                ) : selectedAlert ? (
                  <div className="bg-[#121722] p-3 rounded-lg border border-cyan-500/30 space-y-2 mb-3">
                    <div className="flex justify-between items-start">
                      <h4 className="text-xs font-mono font-bold text-cyan-300">{selectedAlert.sourceName} [{selectedAlert.sourceType}]</h4>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                        {selectedAlert.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#cbd5e1] font-sans leading-relaxed">
                      {selectedAlert.details}
                    </p>
                    <div className="text-[10px] font-mono text-[#64748b] flex justify-between pt-1 border-t border-[#1e2738]">
                      <span>Coord: <b className="text-cyan-400">{selectedAlert.coordinates}</b></span>
                      <span>Fiabilidad: <b className="text-orange-400">{selectedAlert.reliability}-{selectedAlert.certainty}</b></span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-[#64748b] text-xs font-mono border border-dashed border-[#1e2738] rounded-lg mb-3">
                    Seleccione un expediente o alerta de la columna izquierda
                  </div>
                )}

                {/* Ideas Fuerza Chips */}
                {selectedIdeas.length > 0 && (
                  <div className="space-y-1.5 mb-3">
                    <label className="text-[10px] font-mono text-[#94a3b8] uppercase block">
                      Ideas Fuerza Extraídas (Haga clic para incluir en la directiva):
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedIdeas.map((idea, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => toggleIdea(idea)}
                          className="text-[10px] font-mono px-2 py-1 rounded bg-[#1e2738] hover:bg-[#283548] text-white border border-[#334155] cursor-pointer transition-colors text-left"
                        >
                          + {idea.slice(0, 50)}...
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fusion Parameters Form */}
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-mono text-[#94a3b8] uppercase block mb-1">
                      Título de Apreciación Táctica:
                    </label>
                    <input
                      type="text"
                      value={intelTitle}
                      onChange={(e) => setIntelTitle(e.target.value)}
                      className="w-full bg-[#121722] text-white border border-[#22293a] rounded px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-[#f97316]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-mono text-[#94a3b8] uppercase block mb-1">
                        Organización / Clan Hostil:
                      </label>
                      <select
                        value={targetClan}
                        onChange={(e) => setTargetClan(e.target.value)}
                        className="w-full bg-[#121722] text-white border border-[#22293a] rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-[#f97316]"
                      >
                        {clans.map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-mono text-[#94a3b8] uppercase block mb-1">
                        Vector / Ruta Clandestina:
                      </label>
                      <select
                        value={routeId}
                        onChange={(e) => setRouteId(e.target.value)}
                        className="w-full bg-[#121722] text-white border border-[#22293a] rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-[#f97316]"
                      >
                        <option value="Ruta Colchane">Ruta Colchane</option>
                        <option value="Salar de Coipasa">Salar de Coipasa</option>
                        <option value="Tambo Quemado">Tambo Quemado</option>
                        <option value="Paso Pisiga">Paso Pisiga</option>
                        <option value="Hito 14">Hito 14</option>
                        <option value="Hito 18">Hito 18</option>
                      </select>
                    </div>
                  </div>

                  {/* Doctrinal Reliability & Certainty Grid */}
                  <div className="grid grid-cols-2 gap-2 bg-[#121722] p-2.5 rounded-lg border border-[#1e2738]">
                    <div>
                      <label className="text-[10px] font-mono text-[#94a3b8] block mb-1">
                        Confiabilidad Fuente (A-D):
                      </label>
                      <div className="flex gap-1">
                        {(['A', 'B', 'C', 'D'] as const).map(scale => (
                          <button
                            key={scale}
                            type="button"
                            onClick={() => setReliability(scale)}
                            className={`flex-1 py-1 rounded text-xs font-mono font-bold cursor-pointer transition-colors ${
                              reliability === scale
                                ? 'bg-[#f97316] text-white'
                                : 'bg-[#1a2233] text-[#64748b] hover:text-white'
                            }`}
                          >
                            {scale}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-mono text-[#94a3b8] block mb-1">
                        Exactitud Info (1-4):
                      </label>
                      <div className="flex gap-1">
                        {(['1', '2', '3', '4'] as const).map(scale => (
                          <button
                            key={scale}
                            type="button"
                            onClick={() => setCertainty(scale)}
                            className={`flex-1 py-1 rounded text-xs font-mono font-bold cursor-pointer transition-colors ${
                              certainty === scale
                                ? 'bg-cyan-600 text-white'
                                : 'bg-[#1a2233] text-[#64748b] hover:text-white'
                            }`}
                          >
                            {scale}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Threat Score Slider */}
                  <div>
                    <div className="flex justify-between text-[10px] font-mono mb-1">
                      <span className="text-[#94a3b8]">Nivel de Amenaza Estimado:</span>
                      <span className="text-[#f97316] font-bold">{threatScore}% ({threatScore > 80 ? 'CRÍTICO' : threatScore > 50 ? 'ALTO' : 'MODERADO'})</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      value={threatScore}
                      onChange={(e) => setThreatScore(Number(e.target.value))}
                      className="w-full accent-[#f97316] cursor-pointer"
                    />
                  </div>

                  {/* Action Directives */}
                  <div>
                    <label className="text-[10px] font-mono text-[#94a3b8] uppercase block mb-1">
                      Directiva de Interdicción / Acción Recomendada:
                    </label>
                    <textarea
                      rows={2}
                      value={recommendedAction}
                      onChange={(e) => setRecommendedAction(e.target.value)}
                      className="w-full bg-[#121722] text-white border border-[#22293a] rounded px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-[#f97316]"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-[#1e2738] flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => handleProcessAlertToExpediente()}
                  className="flex-1 bg-[#f97316] hover:bg-[#ea580c] text-white text-xs font-mono font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow active:scale-95 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Implementar Expediente G-2 y Promover</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playSyntheticBeep(880, 0.1);
                    setSuccessBanner(`APRECIACIÓN DE ${patrol.name} TRANSMITIDA AL CENTRO DE FUSIÓN DE INTELIGENCIA (CFI)`);
                    setTimeout(() => setSuccessBanner(null), 4000);
                  }}
                  className="bg-[#1e2738] hover:bg-[#283548] text-white text-xs font-mono font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Transmitir a CFI</span>
                </button>
              </div>
            </div>

            {/* Right Col: Clans Matrix & Verified Intel Panel */}
            <div className="lg:col-span-3 bg-[#0a0d14] border border-[#1e2738] rounded-xl p-4 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-[#1e2738] pb-2.5">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-500" />
                  <h3 className="text-xs font-mono font-bold text-white uppercase">
                    Clanes del Sector
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-rose-400 bg-rose-950/30 px-2 py-0.5 rounded border border-rose-800/30">
                  {clans.length} identificados
                </span>
              </div>

              <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
                {clans.map((clan) => (
                  <div
                    key={clan.id}
                    onClick={() => {
                      setTargetClan(clan.name);
                      if (clan.knownRoutes[0]) setRouteId(clan.knownRoutes[0]);
                      playSyntheticBeep(520, 0.05);
                    }}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      targetClan === clan.name
                        ? 'bg-rose-950/30 border-rose-500/60 shadow'
                        : 'bg-[#121722] border-[#22293a] hover:border-[#334155]'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-mono text-xs font-bold text-white">{clan.name}</span>
                      <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-rose-500/20 text-rose-300 font-bold">
                        {clan.threatLevel}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#94a3b8] line-clamp-2">
                      {clan.tactics}
                    </p>
                    <div className="text-[9px] font-mono text-[#64748b] mt-1 pt-1 border-t border-[#1e2738]">
                      Rutas: <span className="text-orange-400">{clan.knownRoutes.join(', ')}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-[#1e2738]">
                <button
                  type="button"
                  onClick={() => setIsCentralPhotoModalOpen(true)}
                  className="w-full bg-[#121722] hover:bg-[#1a2233] text-white text-xs font-mono py-2 rounded-lg border border-[#22293a] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5 text-[#3b82f6]" />
                  <span>Visor Evidencia Fotográfica / FLIR</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INGESTA S-2 Y SENSORES DE TERRENO */}
      {activeModuleTab === 'INGESTA_S2' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 bg-[#0a0d14] border border-[#1e2738] rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e2738] pb-3">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-yellow-400" />
                <h3 className="text-xs font-mono font-bold text-white uppercase">
                  Emisión Directa de Reporte S-2 // {patrol.name}
                </h3>
              </div>
              <span className="text-[10px] font-mono text-yellow-300 bg-yellow-950/40 px-2 py-0.5 rounded border border-yellow-700/50">
                CANAL TÁCTICO {patrol.frequency || '142.850 MHz'}
              </span>
            </div>

            <form onSubmit={handleSendReportSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono text-[#94a3b8] uppercase block mb-1">
                    Tipo de Inteligencia:
                  </label>
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value as any)}
                    className="w-full bg-[#121722] text-white border border-[#22293a] rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-yellow-400"
                  >
                    <option value="HUMINT">HUMINT (Patrulla a pie / Informante de frontera)</option>
                    <option value="IMINT">IMINT (Dron VANT / Imagen térmica FLIR / Satelital)</option>
                    <option value="SIGINT">SIGINT (Intercepción VHF / Scanner de frecuencias)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-[#94a3b8] uppercase block mb-1">
                    Sensor / Plataforma Emisora:
                  </label>
                  <input
                    type="text"
                    value={sensorId}
                    onChange={(e) => setSensorId(e.target.value)}
                    className="w-full bg-[#121722] text-white border border-[#22293a] rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-yellow-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono text-[#94a3b8] uppercase block mb-1">
                  Coordenadas Georreferenciadas (MGRS / Geográficas):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={reportCoordinates}
                    onChange={(e) => setReportCoordinates(e.target.value)}
                    className="flex-1 bg-[#121722] text-[#10b981] font-mono font-bold border border-[#22293a] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#10b981]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (patrol.coordinates) setReportCoordinates(patrol.coordinates);
                    }}
                    className="px-3 py-2 bg-[#1e2738] text-white text-xs font-mono rounded-lg hover:bg-[#283548] cursor-pointer"
                  >
                    GPS Patrulla
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono text-[#94a3b8] uppercase block mb-1">
                  Descripción Detallada del Contacto / Novedad:
                </label>
                <textarea
                  rows={4}
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Ej: Avistamiento de convoy de 4 camiones sin luces ingresando por Hito 18 a gran velocidad..."
                  className="w-full bg-[#121722] text-white border border-[#22293a] rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-yellow-400 placeholder:text-[#64748b]"
                  required
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-yellow-500 hover:bg-yellow-400 text-black font-mono font-bold text-xs px-5 py-2.5 rounded-lg flex items-center gap-2 shadow active:scale-95 transition-all cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Transmitir Reporte S-2 a Central de Fusión</span>
                </button>
              </div>
            </form>
          </div>

          <div className="lg:col-span-5 bg-[#0a0d14] border border-[#1e2738] rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e2738] pb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-mono font-bold text-white uppercase">
                  Cámara y Evidencia Fotográfica Táctica
                </h3>
              </div>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/30 px-2 py-0.5 rounded border border-cyan-800/30">
                FLIR TÉRMICO
              </span>
            </div>

            <div className="space-y-3">
              <div className="aspect-video bg-black rounded-lg border border-[#1e2738] relative overflow-hidden flex items-center justify-center">
                {capturedPhotoUrl ? (
                  <img src={capturedPhotoUrl} alt="Captura de patrulla" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-4 space-y-2">
                    <Camera className="w-8 h-8 text-[#64748b] mx-auto animate-pulse" />
                    <p className="text-xs font-mono text-[#64748b]">Sensor óptico listo para captura de evidencia</p>
                  </div>
                )}
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[9px] font-mono text-[#10b981] border border-[#10b981]/30">
                  {patrol.name} // FLIR-CAM-01
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCapturedPhotoUrl('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="400" height="250" fill="%23051014"/><text x="50%25" y="45%25" dominant-baseline="middle" text-anchor="middle" fill="%2310b981" font-family="monospace" font-size="14">FLIR TERMAL RECORD - PATRULLA ' + encodeURIComponent(patrol.name) + '</text><text x="50%25" y="60%25" dominant-baseline="middle" text-anchor="middle" fill="%2394a3b8" font-family="monospace" font-size="11">COORD: ' + encodeURIComponent(reportCoordinates) + '</text></svg>');
                    playSyntheticBeep(780, 0.1);
                  }}
                  className="flex-1 bg-[#1e2738] hover:bg-[#283548] text-white text-xs font-mono py-2 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Capturar Fotograma FLIR</span>
                </button>
                {capturedPhotoUrl && (
                  <button
                    type="button"
                    onClick={() => setCapturedPhotoUrl(null)}
                    className="px-3 py-2 bg-red-950/40 text-red-300 text-xs font-mono rounded-lg border border-red-800/40 cursor-pointer"
                  >
                    Borrar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ÓRDENES AUTOMATIZADAS (OOA) */}
      {activeModuleTab === 'ORDERS' && (
        <div className="bg-[#0a0d14] border border-[#1e2738] rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#1e2738] pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#f43f5e]" />
              <h3 className="text-xs font-mono font-bold text-white uppercase">
                Bandeja de Órdenes Automatizadas Asignadas (OOA) // {patrol.name}
              </h3>
            </div>
            <span className="text-[10px] font-mono text-[#3b82f6] bg-[#3b82f6]/15 px-2 py-0.5 rounded border border-[#3b82f6]/30">
              RECEPTOR C2 OPERATIVO
            </span>
          </div>

          {patrolOrders.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-[#1e2738] rounded-xl space-y-2">
              <CheckCircle className="w-8 h-8 text-[#10b981] mx-auto" />
              <p className="text-xs font-mono text-[#94a3b8]">No hay órdenes pendientes asignadas actualmente a {patrol.name}.</p>
              <p className="text-[11px] font-mono text-[#64748b]">El Puesto de Mando Central CEO-LCC emitirá directivas en caso de interdicción.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {patrolOrders.map(order => (
                <div key={order.id} className="bg-[#121722] border border-[#1e2738] rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-mono text-[#3b82f6] font-bold block">{order.codeName}</span>
                      <h4 className="text-xs font-mono font-bold text-white">{order.objective}</h4>
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                      order.status === 'COMPLETED'
                        ? 'bg-[#10b981]/20 text-[#10b981]'
                        : order.status === 'IN_PROGRESS'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-[#f43f5e]/20 text-[#f43f5e]'
                    }`}>
                      {order.status}
                    </span>
                  </div>

                  <div className="text-[11px] font-mono text-[#94a3b8] space-y-1">
                    <div>Emisor: <b className="text-white">{order.issuer}</b></div>
                    <div>Coordenadas Objetivo: <b className="text-orange-400">{order.coordinates}</b></div>
                    <div>Emitido: <span className="text-[#64748b]">{new Date(order.timestamp).toLocaleString()}</span></div>
                  </div>

                  {order.updates && order.updates.length > 0 && (
                    <div className="bg-black/30 p-2 rounded text-[10px] font-mono text-[#cbd5e1] border border-[#1e2738]">
                      <b>Última Actualización C2:</b> {order.updates[order.updates.length - 1]}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1 border-t border-[#1e2738]">
                    {order.status === 'ISSUED' && (
                      <button
                        type="button"
                        onClick={() => {
                          onConfirmOrder(order.id, 'RECEIVED');
                          playSyntheticBeep(640, 0.08);
                        }}
                        className="flex-1 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-mono font-bold py-1.5 rounded cursor-pointer"
                      >
                        Acuse de Recibo
                      </button>
                    )}

                    {order.status === 'RECEIVED' && (
                      <button
                        type="button"
                        onClick={() => {
                          onConfirmOrder(order.id, 'IN_PROGRESS');
                          playSyntheticBeep(720, 0.08);
                        }}
                        className="flex-1 bg-amber-500 hover:bg-amber-600 text-black text-xs font-mono font-bold py-1.5 rounded cursor-pointer"
                      >
                        Notificar En Progreso
                      </button>
                    )}

                    {order.status === 'IN_PROGRESS' && (
                      <button
                        type="button"
                        onClick={() => {
                          onConfirmOrder(order.id, 'COMPLETED');
                          playChime(640, 880, 0.2);
                        }}
                        className="flex-1 bg-[#10b981] hover:bg-[#059669] text-black text-xs font-mono font-bold py-1.5 rounded cursor-pointer"
                      >
                        Reportar Misión Cumplida
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: BASE DE EXPEDIENTES G-2 */}
      {activeModuleTab === 'EXPEDIENTES' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-[#0a0d14] border border-[#1e2738] p-4 rounded-xl">
            <div>
              <h3 className="text-xs font-mono font-bold text-white uppercase">
                Base Doctrinal de Expedientes G-2 // Ley 1053 / CPE Art. 251
              </h3>
              <p className="text-[11px] font-mono text-[#94a3b8]">
                Registro oficial de expedientes operacionales de la PII-LCC disponibles para la patrulla {patrol.name}.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsNewRecordModalOpen(true)}
              className="bg-[#f97316] hover:bg-[#ea580c] text-white text-xs font-mono font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Registro</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {g2Records.map(rec => (
              <div key={rec.id} className="bg-[#0a0d14] border border-[#1e2738] rounded-xl p-4 space-y-2 text-left">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-mono text-orange-400 font-bold block">{rec.id}</span>
                    <h4 className="text-xs font-mono font-bold text-white">{rec.tipoRegistro} // {rec.componenteRubro}</h4>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 text-[#94a3b8] border border-[#1e2738]">
                    {rec.calificacionEvaluacion || 'A-1'}
                  </span>
                </div>
                <p className="text-xs text-[#cbd5e1] font-sans leading-relaxed line-clamp-3">
                  {rec.contenidoDetallado}
                </p>
                <div className="text-[10px] font-mono text-[#64748b] pt-2 border-t border-[#1e2738] flex justify-between">
                  <span>Operador: {rec.operadorRegistro}</span>
                  <span>{rec.fechaHoraIngreso}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: MATRIZ DE CLANES */}
      {activeModuleTab === 'CLANS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clans.map(clan => (
            <div key={clan.id} className="bg-[#0a0d14] border border-[#1e2738] rounded-xl p-4 space-y-3 text-left">
              <div className="flex justify-between items-start">
                <h4 className="text-xs font-mono font-bold text-white">{clan.name}</h4>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950/40 text-rose-300 font-bold border border-rose-800/40">
                  {clan.threatLevel}
                </span>
              </div>
              <p className="text-xs text-[#cbd5e1] font-sans leading-relaxed">
                {clan.tactics}
              </p>
              <div className="text-[11px] font-mono text-[#94a3b8] space-y-1 pt-2 border-t border-[#1e2738]">
                <div>Rutas de Operación: <b className="text-orange-400">{clan.knownRoutes.join(' | ')}</b></div>
                <div>Fuerza Estimada: <span className="text-white">{clan.membersCount} integrantes activos</span></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 6: TELEMETRÍA GPS */}
      {activeModuleTab === 'TELEMETRY' && (
        <div className="bg-[#0a0d14] border border-[#1e2738] rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#1e2738] pb-3">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#10b981]" />
              <h3 className="text-xs font-mono font-bold text-white uppercase">
                Transmisión y Telemetría GPS en Vivo // {patrol.name}
              </h3>
            </div>
            <span className="text-[10px] font-mono text-[#10b981] bg-[#10b981]/15 px-2 py-0.5 rounded border border-[#10b981]/30">
              GPS MIL-SPEC ACTIVO
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-mono text-[#94a3b8] uppercase block mb-1">Latitud / Cuadrante:</label>
                <input
                  type="text"
                  value={telemetryLat}
                  onChange={(e) => setTelemetryLat(e.target.value)}
                  className="w-full bg-[#121722] text-white font-mono text-xs border border-[#22293a] rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-[#94a3b8] uppercase block mb-1">Longitud / Cuadrante:</label>
                <input
                  type="text"
                  value={telemetryLon}
                  onChange={(e) => setTelemetryLon(e.target.value)}
                  className="w-full bg-[#121722] text-white font-mono text-xs border border-[#22293a] rounded-lg px-3 py-2"
                />
              </div>

              <button
                type="button"
                onClick={handleApplyGpsTelemetry}
                className="w-full bg-[#10b981] hover:bg-[#059669] text-black font-mono font-bold text-xs py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow active:scale-95"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Transmitir Nuevas Coordenadas GPS al CFI</span>
              </button>
            </div>

            <div className="bg-[#121722] p-4 rounded-xl border border-[#1e2738] space-y-2 text-xs font-mono">
              <h4 className="text-white font-bold border-b border-[#1e2738] pb-2">Estado de Dotación de Patrulla</h4>
              <div>Pertrechos: <span className="text-[#cbd5e1]">{Array.isArray(patrol.equipment) ? patrol.equipment.join(', ') : patrol.equipment}</span></div>
              <div>Combustible Remanente: <span className="text-amber-400 font-bold">{patrol.fuel ?? 85}%</span></div>
              <div>Batería de Radiotransmisor: <span className="text-[#10b981] font-bold">{patrol.battery ?? 92}%</span></div>
              <div>Frecuencia Primaria VHF: <span className="text-[#3b82f6] font-bold">{patrol.frequency || '142.850 MHz'}</span></div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <NewG2RecordModal
        isOpen={isNewRecordModalOpen}
        onClose={() => setIsNewRecordModalOpen(false)}
        onAddRecord={(record) => {
          setG2Records(prev => [record, ...prev]);
          if (onAddExpediente) onAddExpediente(record);
          setIsNewRecordModalOpen(false);
          setSuccessBanner(`EXPEDIENTE ${record.id} REGISTRADO CORRECTAMENTE POR ${patrol.name.toUpperCase()}`);
          setTimeout(() => setSuccessBanner(null), 4000);
        }}
      />

      {isCentralPhotoModalOpen && (
        <TacticalPhotoViewerModal
          isOpen={isCentralPhotoModalOpen}
          onClose={() => setIsCentralPhotoModalOpen(false)}
          alert={{
            id: `FLIR-${patrol.id}`,
            sourceName: `${patrol.name} (Sensor Táctico FLIR)`,
            sourceType: 'IMINT',
            reliability: 'A',
            certainty: '1',
            coordinates: patrol.coordinates,
            status: 'PENDING',
            timestamp: new Date().toISOString(),
            details: `Evidencia fotográfica táctica / FLIR capturada por la unidad ${patrol.name}`,
            mediaUrl: capturedPhotoUrl || undefined,
            operatorName: `${patrol.name} // ${patrol.commander || 'S-2'}`,
            originUnit: patrol.name,
            originSector: patrol.sector
          }}
          sourceContext="TACTICAL"
        />
      )}
    </div>
  );
}
