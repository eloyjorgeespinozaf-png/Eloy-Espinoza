/**
 * TacticalRouteManagerModal.tsx
 * Gestor y Editor de Rutas y Vectores Tácticos del Módulo de Fusión (CFI).
 * Permite editar rutas existentes, crear nuevos corredores y capturar/colocar
 * en tiempo real las rutas y coordenadas reportadas por las patrullas en terreno.
 */

import React, { useState, useMemo } from 'react';
import { 
  Navigation, 
  MapPin, 
  Shield, 
  Zap, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  Radio, 
  Compass, 
  AlertTriangle, 
  Copy, 
  CornerDownRight, 
  Layers 
} from 'lucide-react';
import { TacticalRoute, TacticalUnit } from '../../types';
import { playSyntheticBeep, playCyberClick } from '../../utils/audio';

export const DEFAULT_TACTICAL_ROUTES: TacticalRoute[] = [
  {
    id: 'route-colchane',
    name: 'Ruta Colchane',
    sector: 'Hito 19 - Quebrada Norte',
    coordinates: "19°14'32\"S 68°37'15\"W",
    threatLevel: 'HIGH',
    description: 'Corredor de internación vehicular no habilitado con pasos ciegos en quebradas secas.',
    checkpoints: ['Punto Bravo 1', 'Quebrada de los Zorros', 'Hito 19'],
    lastUpdated: '2026-10-24T10:00:00.000Z'
  },
  {
    id: 'route-pisiga',
    name: 'Paso Pisiga',
    sector: 'Paso Fronterizo Hito XXIII - Sabaya',
    coordinates: "19°35'20\"S 68°42'10\"W",
    threatLevel: 'MEDIUM',
    description: 'Sector de desvío de camiones de carga pesada hacia caminos secundarios de ripio.',
    checkpoints: ['Retén Militar Pisiga', 'Desvío Sabaya', 'Pampa Salada'],
    lastUpdated: '2026-10-24T10:30:00.000Z'
  },
  {
    id: 'route-coipasa',
    name: 'Salar de Coipasa',
    sector: 'Corredor Salino Challapata',
    coordinates: "19°12'05\"S 68°36'40\"W",
    threatLevel: 'CRITICAL',
    description: 'Ruta de alta velocidad en superficie salina dura utilizada para caravanas nocturnas.',
    checkpoints: ['Borde Salar Norte', 'Cuello de Botella Coipasa', 'Hito 21'],
    lastUpdated: '2026-10-24T11:15:00.000Z'
  },
  {
    id: 'route-hito14',
    name: 'Hito 14',
    sector: 'Charaña - Tripartito',
    coordinates: "20°05'44\"S 68°29'10\"W",
    threatLevel: 'CRITICAL',
    description: 'Huella clandestina transfronteriza con apoyo de vigías y migrantes forzados.',
    checkpoints: ['Mojón Tripartito', 'Quebrada Honda', 'Hito 14'],
    lastUpdated: '2026-10-24T12:00:00.000Z'
  },
  {
    id: 'route-tambo-quemado',
    name: 'Tambo Quemado',
    sector: 'Ruta Internacional CH-11 / Charaña',
    coordinates: "18°28'33\"S 69°05'00\"W",
    threatLevel: 'HIGH',
    description: 'Eje pavimentado con ramales de evasión para cisternas de combustible y mercancías.',
    checkpoints: ['Control Fronterizo', 'Desvío Curahuara', 'Laguna Blanca'],
    lastUpdated: '2026-10-24T09:45:00.000Z'
  },
  {
    id: 'route-ollague',
    name: 'Paso Ollagüe',
    sector: 'Sector Frontera Sur - Lípez',
    coordinates: "21°10'12\"S 68°15'22\"W",
    threatLevel: 'MEDIUM',
    description: 'Travesía desértica de altura con tránsito de vehículos todoterreno de gran autonomía.',
    checkpoints: ['Estación Abaroa', 'Hito Sur 12', 'Salar de Chiguana'],
    lastUpdated: '2026-10-24T08:20:00.000Z'
  }
];

interface TacticalRouteManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  routes: TacticalRoute[];
  onSaveRoute: (route: TacticalRoute) => void;
  onDeleteRoute?: (routeId: string) => void;
  onSelectRouteForFusion: (routeName: string, routeObj?: TacticalRoute) => void;
  tacticalUnits: TacticalUnit[];
  activeRouteName: string;
}

export const TacticalRouteManagerModal: React.FC<TacticalRouteManagerModalProps> = ({
  isOpen,
  onClose,
  routes,
  onSaveRoute,
  onDeleteRoute,
  onSelectRouteForFusion,
  tacticalUnits,
  activeRouteName
}) => {
  const [editingRoute, setEditingRoute] = useState<TacticalRoute | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [selectedPatrolToAdopt, setSelectedPatrolToAdopt] = useState<string>(tacticalUnits[0]?.name || '');

  // Form State
  const [formName, setFormName] = useState('');
  const [formSector, setFormSector] = useState('');
  const [formCoords, setFormCoords] = useState('');
  const [formThreat, setFormThreat] = useState<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');
  const [formDescription, setFormDescription] = useState('');
  const [formCheckpoints, setFormCheckpoints] = useState('');

  if (!isOpen) return null;

  const startCreateNew = () => {
    setIsCreatingNew(true);
    setEditingRoute(null);
    setFormName('');
    setFormSector('Sector Fronterizo Occidental');
    setFormCoords("19°13'10\"S 68°35'50\"W");
    setFormThreat('HIGH');
    setFormDescription('Corredor de desplazamiento y vector de interdicción táctica.');
    setFormCheckpoints('Punto Alfa, Punto Bravo, Hito de Control');
    playCyberClick('laser', 0.08);
  };

  const startEdit = (route: TacticalRoute) => {
    setEditingRoute(route);
    setIsCreatingNew(false);
    setFormName(route.name);
    setFormSector(route.sector || '');
    setFormCoords(route.coordinates || "19°13'10\"S 68°35'50\"W");
    setFormThreat(route.threatLevel || 'HIGH');
    setFormDescription(route.description || '');
    setFormCheckpoints((route.checkpoints || []).join(', '));
    playCyberClick('laser', 0.08);
  };

  const cancelEdit = () => {
    setEditingRoute(null);
    setIsCreatingNew(false);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const routeToSave: TacticalRoute = {
      id: editingRoute?.id || `route-custom-${Date.now()}`,
      name: formName.trim(),
      sector: formSector.trim() || 'Sector Fronterizo',
      coordinates: formCoords.trim() || "19°13'10\"S 68°35'50\"W",
      threatLevel: formThreat,
      description: formDescription.trim(),
      checkpoints: formCheckpoints.split(',').map(s => s.trim()).filter(Boolean),
      lastUpdated: new Date().toISOString(),
      isPatrolGenerated: editingRoute?.isPatrolGenerated || false
    };

    onSaveRoute(routeToSave);
    playSyntheticBeep(980, 0.12);
    setEditingRoute(null);
    setIsCreatingNew(false);
  };

  // Adopt live route from an active Patrol
  const handleAdoptPatrolRoute = (patrolName: string) => {
    const patrol = tacticalUnits.find(u => u.name === patrolName);
    if (!patrol) return;

    const newRouteName = `Vector ${patrol.name} (${patrol.sector || patrol.coordinates.slice(0, 15)})`;
    const patrolRoute: TacticalRoute = {
      id: `route-patrol-${patrol.id}-${Date.now()}`,
      name: newRouteName,
      sector: patrol.sector || `Sector Operativo ${patrol.name}`,
      coordinates: patrol.coordinates,
      threatLevel: patrol.status === 'INTERCEPTING' ? 'CRITICAL' : 'HIGH',
      patrolId: patrol.id,
      patrolName: patrol.name,
      description: `Ruta táctica activa reportada en tiempo real por ${patrol.name} (Cmdte: ${patrol.commander || 'S-2'}). Estado: ${patrol.status}.`,
      checkpoints: ['Puesto Base', `Posición Actual GNSS: ${patrol.coordinates}`, 'Línea de Contención'],
      lastUpdated: new Date().toISOString(),
      isPatrolGenerated: true
    };

    onSaveRoute(patrolRoute);
    onSelectRouteForFusion(newRouteName, patrolRoute);
    playSyntheticBeep(1100, 0.15);
  };

  const getThreatBadge = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40 text-[10px] font-bold">CRÍTICA</span>;
      case 'HIGH':
        return <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/40 text-[10px] font-bold">ALTA</span>;
      case 'MEDIUM':
        return <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">MEDIA</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">BAJA</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5 overflow-y-auto animate-fade-in font-mono text-xs text-zinc-200">
      <div className="bg-[#0b1019] border border-cyan-500/40 rounded-2xl w-full max-w-4xl shadow-[0_0_50px_rgba(6,182,212,0.25)] relative overflow-hidden flex flex-col my-auto max-h-[92vh]">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-cyan-900/40 bg-[#0d1422]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/70 border border-cyan-500/40 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <Navigation className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-wider uppercase flex items-center gap-2">
                <span>Gestor de Rutas y Vectores Tácticos (CFI Fusión)</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  PII-LCC CAD-C2
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Edite rutas doctrinales o capture en tiempo real las rutas y coordenadas reportadas por las patrullas en terreno.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isCreatingNew && !editingRoute && (
              <button
                type="button"
                onClick={startCreateNew}
                className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.3)]"
              >
                <Plus className="w-4 h-4" />
                <span>Nueva Ruta</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-red-950/40 text-zinc-400 hover:text-red-400 border border-zinc-700 hover:border-red-500/40 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Patrol Vector Ingestion Bar (En Tiempo Real) */}
        <div className="p-4 bg-[#080d16] border-b border-cyan-950/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0d1624] border border-cyan-500/30 rounded-xl p-3.5 shadow-lg">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <Radio className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-xs uppercase tracking-wider">
                    Colocar Ruta Enviada por Patrulla en Tiempo Real
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                </div>
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  Seleccione una patrulla activa para capturar sus coordenadas GPS y asignarla directamente al formulario de apreciación.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <select
                value={selectedPatrolToAdopt}
                onChange={(e) => setSelectedPatrolToAdopt(e.target.value)}
                className="bg-black/80 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
              >
                {tacticalUnits.map((u) => (
                  <option key={u.id} value={u.name}>
                    {u.name} [{u.status}] ({u.coordinates.slice(0, 16)})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => handleAdoptPatrolRoute(selectedPatrolToAdopt)}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.3)] whitespace-nowrap"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Colocar en Fusión</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          
          {/* Create or Edit Form */}
          {(isCreatingNew || editingRoute) && (
            <form onSubmit={handleSaveForm} className="bg-[#0f172a]/90 border border-cyan-500/40 rounded-xl p-4 space-y-3.5 shadow-xl animate-fade-in">
              <div className="flex items-center justify-between border-b border-cyan-900/50 pb-2">
                <span className="font-bold text-cyan-300 text-xs uppercase flex items-center gap-2">
                  <Edit2 className="w-3.5 h-3.5 text-cyan-400" />
                  {isCreatingNew ? 'Registrar Nueva Ruta o Vector Táctico' : `Editar Ruta: ${editingRoute?.name}`}
                </span>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="text-zinc-400 hover:text-white text-[11px] cursor-pointer"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-zinc-400 font-bold uppercase mb-1">
                    Nombre del Vector / Ruta *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ej: Ruta Clandestina Quebrada Seca"
                    className="w-full bg-black/60 border border-zinc-700 focus:border-cyan-400 rounded px-2.5 py-1.5 text-white text-xs font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-zinc-400 font-bold uppercase mb-1">
                    Sector / Paraje Fronterizo *
                  </label>
                  <input
                    type="text"
                    value={formSector}
                    onChange={(e) => setFormSector(e.target.value)}
                    placeholder="Ej: Hito 18 - Pisiga Norte"
                    className="w-full bg-black/60 border border-zinc-700 focus:border-cyan-400 rounded px-2.5 py-1.5 text-white text-xs font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-zinc-400 font-bold uppercase mb-1">
                    Coordenadas GPS (DMS o Decimales) *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={formCoords}
                      onChange={(e) => setFormCoords(e.target.value)}
                      placeholder="19°13'10&quot;S 68°35'50&quot;W"
                      className="flex-1 bg-black/60 border border-zinc-700 focus:border-cyan-400 rounded px-2.5 py-1.5 text-white text-xs font-mono focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const firstUnit = tacticalUnits[0];
                        if (firstUnit) setFormCoords(firstUnit.coordinates);
                      }}
                      className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-cyan-300 rounded text-[10px] whitespace-nowrap cursor-pointer"
                      title="Copiar coordenadas de patrulla activa"
                    >
                      Copiar de Patrulla
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-zinc-400 font-bold uppercase mb-1">
                    Nivel de Amenaza Estimado
                  </label>
                  <select
                    value={formThreat}
                    onChange={(e) => setFormThreat(e.target.value as any)}
                    className="w-full bg-black/60 border border-zinc-700 focus:border-cyan-400 rounded px-2.5 py-1.5 text-white text-xs font-mono focus:outline-none"
                  >
                    <option value="CRITICAL">CRÍTICA (Tráfico de armamento / caravana blindada)</option>
                    <option value="HIGH">ALTA (Caravana de camiones / combustible)</option>
                    <option value="MEDIUM">MEDIA (Tránsito regular no habilitado)</option>
                    <option value="LOW">BAJA (Huella bajo vigilancia pasiva)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-zinc-400 font-bold uppercase mb-1">
                  Descripción Doctrinal del Corredor
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Detalles geográficos, transitabilidad para camiones F-12, zanjas antivehículo, etc."
                  className="w-full bg-black/60 border border-zinc-700 focus:border-cyan-400 rounded px-2.5 py-1.5 text-white text-xs font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-zinc-400 font-bold uppercase mb-1">
                  Puntos de Control / Checkpoints (Separados por coma)
                </label>
                <input
                  type="text"
                  value={formCheckpoints}
                  onChange={(e) => setFormCheckpoints(e.target.value)}
                  placeholder="Punto Alfa, Quebrada Negra, Retén Móvil"
                  className="w-full bg-black/60 border border-zinc-700 focus:border-cyan-400 rounded px-2.5 py-1.5 text-white text-xs font-mono focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-3 py-1.5 rounded bg-zinc-800 text-zinc-300 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                >
                  Guardar Vector Táctico
                </button>
              </div>
            </form>
          )}

          {/* List of Available Tactical Routes */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-zinc-400 text-[11px] font-bold uppercase tracking-wider px-1">
              <span>Rutas Registradas en el Sistema de Fusión ({routes.length})</span>
              <span>Vector Activo Seleccionado: <strong className="text-cyan-400">{activeRouteName}</strong></span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {routes.map((route) => {
                const isSelected = activeRouteName.toLowerCase() === route.name.toLowerCase();

                return (
                  <div
                    key={route.id}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-2.5 ${
                      isSelected
                        ? 'bg-[#0f1d30] border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)] ring-1 ring-cyan-500'
                        : 'bg-[#0a0f18]/80 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs leading-tight">
                            {route.name}
                          </span>
                          {route.isPatrolGenerated && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold flex items-center gap-1">
                              <Radio className="w-2.5 h-2.5 animate-pulse" />
                              PATRULLA EN VIVO
                            </span>
                          )}
                        </div>
                        {getThreatBadge(route.threatLevel)}
                      </div>

                      <div className="text-[11px] text-zinc-400 flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                        <span className="truncate">{route.sector || 'Frontera Occidental'}</span>
                      </div>

                      <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                        COORD: <span className="text-zinc-300">{route.coordinates}</span>
                      </div>

                      {route.description && (
                        <p className="text-[11px] text-zinc-300 mt-1.5 line-clamp-2 bg-black/40 p-1.5 rounded border border-zinc-800/80">
                          {route.description}
                        </p>
                      )}

                      {route.checkpoints && route.checkpoints.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {route.checkpoints.map((cp, idx) => (
                            <span key={idx} className="px-1.5 py-0.2 rounded bg-zinc-900 text-zinc-400 text-[9px] border border-zinc-800 font-mono">
                              • {cp}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-800/60 mt-1">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => startEdit(route)}
                          className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition cursor-pointer"
                          title="Editar esta ruta"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {onDeleteRoute && !DEFAULT_TACTICAL_ROUTES.some(d => d.id === route.id) && (
                          <button
                            type="button"
                            onClick={() => onDeleteRoute(route.id)}
                            className="p-1 rounded bg-zinc-800 hover:bg-red-950 text-zinc-400 hover:text-red-400 transition cursor-pointer"
                            title="Eliminar ruta personalizada"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onSelectRouteForFusion(route.name, route);
                          playCyberClick('laser', 0.1);
                          onClose();
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                            : 'bg-zinc-800 hover:bg-cyan-950 hover:text-cyan-300 text-zinc-300 border border-zinc-700'
                        }`}
                      >
                        {isSelected ? <Check className="w-3.5 h-3.5" /> : <CornerDownRight className="w-3.5 h-3.5" />}
                        <span>{isSelected ? 'Ruta Activa' : 'Colocar en Fusión'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-800 bg-[#090d15] flex items-center justify-between text-[11px] text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>Las rutas seleccionadas actualizan automáticamente los vectores de interdicción OOA en el Mando CEO.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition cursor-pointer"
          >
            Cerrar Gestor
          </button>
        </div>

      </div>
    </div>
  );
};
export default TacticalRouteManagerModal;
