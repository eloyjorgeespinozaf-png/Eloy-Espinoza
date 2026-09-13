/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Database, 
  Plus, 
  Trash2, 
  Edit3, 
  Phone, 
  Smartphone, 
  Radio, 
  Truck, 
  Users, 
  MapPin, 
  AlertTriangle, 
  ShieldAlert, 
  Download, 
  Upload, 
  X, 
  CheckCircle2, 
  Search,
  Sparkles,
  FileText
} from 'lucide-react';
import { Clan } from '../types';
import { playCyberClick, playCyberAccessGranted, playCyberDenied } from '../utils/audio';

interface ClanManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  clans: Clan[];
  onSaveClan: (clan: Clan) => void;
  onDeleteClan?: (id: string) => void;
  onBatchImportClans?: (clans: Clan[]) => void;
  initialSelectedClanId?: string;
}

export const ClanManagementModal: React.FC<ClanManagementModalProps> = ({
  isOpen,
  onClose,
  clans,
  onSaveClan,
  onDeleteClan,
  onBatchImportClans,
  initialSelectedClanId
}) => {
  const [activeTab, setActiveTab] = useState<'LIST' | 'FORM'>('LIST');
  const [searchTerm, setSearchTerm] = useState('');
  const [threatFilter, setThreatFilter] = useState<'ALL' | Clan['threatLevel']>('ALL');

  // Form states
  const [editingClanId, setEditingClanId] = useState<string | null>(initialSelectedClanId || null);
  const [name, setName] = useState('');
  const [threatLevel, setThreatLevel] = useState<Clan['threatLevel']>('HIGH');
  const [membersCount, setMembersCount] = useState<number>(25);
  const [tactics, setTactics] = useState('');
  const [status, setStatus] = useState<Clan['status']>('ACTIVO');
  const [notes, setNotes] = useState('');

  // Lists in form
  const [knownRoutes, setKnownRoutes] = useState<string[]>([]);
  const [newRoute, setNewRoute] = useState('');

  const [recentHotspots, setRecentHotspots] = useState<string[]>([]);
  const [newHotspot, setNewHotspot] = useState('');

  const [phoneNumbers, setPhoneNumbers] = useState<string[]>([]);
  const [newPhone, setNewPhone] = useState('');

  const [radioFrequencies, setRadioFrequencies] = useState<string[]>([]);
  const [newFrequency, setNewFrequency] = useState('');

  const [vehicles, setVehicles] = useState<string[]>([]);
  const [newVehicle, setNewVehicle] = useState('');

  const [keyLeaders, setKeyLeaders] = useState<string[]>([]);
  const [newLeader, setNewLeader] = useState('');

  const [seizures, setSeizures] = useState<string[]>([]);
  const [newSeizure, setNewSeizure] = useState('');

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  const filteredClans = clans.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.knownRoutes.some(r => r.toLowerCase().includes(searchTerm.toLowerCase())) ||
      c.recentHotspots.some(h => h.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.phoneNumbers && c.phoneNumbers.some(p => p.includes(searchTerm)));
    const matchesThreat = threatFilter === 'ALL' || c.threatLevel === threatFilter;
    return matchesSearch && matchesThreat;
  });

  const openCreateForm = () => {
    setEditingClanId(null);
    setName('');
    setThreatLevel('HIGH');
    setMembersCount(20);
    setTactics('');
    setStatus('ACTIVO');
    setNotes('');
    setKnownRoutes([]);
    setRecentHotspots([]);
    setPhoneNumbers([]);
    setRadioFrequencies([]);
    setVehicles([]);
    setKeyLeaders([]);
    setSeizures([]);
    setActiveTab('FORM');
    setNotification(null);
    playCyberClick('toggle', 0.08);
  };

  const openEditForm = (clan: Clan) => {
    setEditingClanId(clan.id);
    setName(clan.name);
    setThreatLevel(clan.threatLevel);
    setMembersCount(clan.membersCount || 10);
    setTactics(clan.tactics || '');
    setStatus(clan.status || 'ACTIVO');
    setNotes(clan.notes || '');
    setKnownRoutes(clan.knownRoutes || []);
    setRecentHotspots(clan.recentHotspots || []);
    setPhoneNumbers(clan.phoneNumbers || []);
    setRadioFrequencies(clan.radioFrequencies || []);
    setVehicles(clan.vehicles || []);
    setKeyLeaders(clan.keyLeaders || []);
    setSeizures(clan.seizures || []);
    setActiveTab('FORM');
    setNotification(null);
    playCyberClick('toggle', 0.08);
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setNotification({ type: 'error', message: 'Debe ingresar el nombre del clan u organización delictiva.' });
      playCyberDenied(0.12);
      return;
    }

    const savedClan: Clan = {
      id: editingClanId || `clan-${Date.now().toString(36)}`,
      name: name.trim(),
      threatLevel,
      membersCount: Number(membersCount) || 10,
      tactics: tactics.trim() || 'Modus operandi en levantamiento de inteligencia.',
      knownRoutes: knownRoutes.length > 0 ? knownRoutes : ['Ruta Fronteriza Principal'],
      recentHotspots: recentHotspots.length > 0 ? recentHotspots : ['Hito Fronterizo'],
      lastActive: 'Hace instantes (Actualizado)',
      phoneNumbers,
      radioFrequencies,
      vehicles,
      keyLeaders,
      seizures,
      notes: notes.trim(),
      status,
      updatedAt: new Date().toISOString(),
      createdAt: editingClanId ? undefined : new Date().toISOString()
    };

    onSaveClan(savedClan);
    setNotification({ 
      type: 'success', 
      message: `Clan "${savedClan.name}" ${editingClanId ? 'actualizado e incrementado' : 'registrado exitosamente'} en la base de datos.` 
    });
    playCyberAccessGranted(0.12);

    setTimeout(() => {
      setActiveTab('LIST');
      setNotification(null);
    }, 1200);
  };

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(clans, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `BASE_DATOS_CLANES_PII_LCC_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    playCyberAccessGranted(0.09);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (onBatchImportClans) {
            onBatchImportClans(parsed);
          } else {
            parsed.forEach(c => onSaveClan(c));
          }
          setNotification({ type: 'success', message: `¡Se importaron exitosamente ${parsed.length} clanes a la base de datos!` });
          playCyberAccessGranted(0.12);
        } else {
          setNotification({ type: 'error', message: 'El archivo JSON no contiene un arreglo válido de clanes.' });
        }
      } catch (err) {
        setNotification({ type: 'error', message: 'Error al interpretar el archivo JSON de clanes.' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0b0f19] border-2 border-[#10b981]/70 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-[0_0_50px_rgba(16,185,129,0.25)] overflow-hidden text-left">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#064e3b] via-[#022c22] to-[#020617] p-4 border-b border-[#1e293b] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#10b981]/20 border border-[#10b981]/40 flex items-center justify-center text-[#10b981] shadow-[0_0_15px_rgba(16,185,129,0.4)]">
              <Database className="w-5 h-5 text-[#10b981]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-mono font-bold text-white tracking-wider uppercase">
                  CORRELACIÓN Y BASE DE DATOS DE CLANES DELICTIVOS
                </h2>
                <span className="text-[10px] bg-[#10b981]/20 text-[#10b981] font-mono font-bold px-2 py-0.5 rounded border border-[#10b981]/40">
                  {clans.length} CLANES REGISTRADOS
                </span>
              </div>
              <p className="text-[11px] text-emerald-200/70 font-mono mt-0.5">
                Incremento continuo de inteligencia, rutas clandestinas, celulares interceptados, frecuencias y convoyes (PII-LCC).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-[#94a3b8] hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="bg-[#0f1422] px-4 py-2.5 border-b border-[#1e2738] flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setActiveTab('LIST'); playCyberClick('toggle', 0.08); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'LIST'
                  ? 'bg-emerald-600 text-black shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                  : 'bg-[#151c2c] text-[#94a3b8] hover:text-white hover:bg-[#1e2738]'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              Base de Datos ({clans.length})
            </button>

            <button
              type="button"
              onClick={openCreateForm}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'FORM' && !editingClanId
                  ? 'bg-emerald-600 text-black shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                  : 'bg-[#151c2c] text-emerald-400 hover:text-emerald-300 hover:bg-[#1e2738] border border-emerald-500/30'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              + Incrementar / Registrar Nuevo Clan
            </button>
          </div>

          {/* Export / Import */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-mono px-2.5 py-1 rounded bg-[#1e293b] hover:bg-[#334155] text-[#cbd5e1] flex items-center gap-1.5 cursor-pointer transition-colors">
              <Upload className="w-3 h-3 text-emerald-400" />
              Importar JSON
              <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
            </label>

            <button
              type="button"
              onClick={handleExportJson}
              className="text-[10px] font-mono px-2.5 py-1 rounded bg-[#1e293b] hover:bg-[#334155] text-[#cbd5e1] flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Download className="w-3 h-3 text-emerald-400" />
              Exportar Base (.JSON)
            </button>
          </div>
        </div>

        {/* Notifications */}
        {notification && (
          <div className={`mx-4 mt-3 p-3 rounded-xl flex items-center gap-2 text-xs font-mono ${
            notification.type === 'success'
              ? 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-300'
              : 'bg-red-950/60 border border-red-500/50 text-red-300'
          }`}>
            {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
            <span>{notification.message}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          
          {/* TAB 1: CLANS LIST & SEARCH */}
          {activeTab === 'LIST' && (
            <div className="space-y-4">
              
              {/* Search & Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#1e2738]">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por nombre, ruta, celular o punto caliente..."
                    className="w-full bg-[#151c2c] border border-[#242f46] rounded-xl pl-9 pr-3 py-1.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">Amenaza:</span>
                  {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setThreatFilter(lvl)}
                      className={`text-[10px] font-mono px-2 py-0.5 rounded cursor-pointer ${
                        threatFilter === lvl
                          ? 'bg-emerald-600 text-black font-bold'
                          : 'bg-[#151c2c] text-slate-400 hover:text-white'
                      }`}
                    >
                      {lvl === 'ALL' ? 'TODAS' : lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid of Clans */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredClans.map((clan) => (
                  <div
                    key={clan.id}
                    className="bg-[#0f1422] border border-[#1e2738] hover:border-emerald-500/50 rounded-xl p-4 flex flex-col justify-between transition-all shadow-md group"
                  >
                    <div>
                      {/* Top info */}
                      <div className="flex items-start justify-between gap-2 border-b border-[#1e2738] pb-2.5">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-mono font-bold text-white group-hover:text-emerald-400 transition-colors">
                              {clan.name}
                            </h3>
                            <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded ${
                              clan.threatLevel === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/40' :
                              clan.threatLevel === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40' :
                              clan.threatLevel === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40' :
                              'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                            }`}>
                              {clan.threatLevel}
                            </span>
                          </div>
                          <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                            Estimación: ~{clan.membersCount} miembros // Estado: {clan.status || 'ACTIVO'}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => openEditForm(clan)}
                          className="px-2.5 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Edit3 className="w-3 h-3" />
                          Incrementar Info
                        </button>
                      </div>

                      {/* Details */}
                      <div className="mt-3 space-y-2 text-xs font-mono">
                        {/* Rutas */}
                        <div>
                          <span className="text-[9px] text-slate-500 uppercase font-bold block mb-1">Rutas Clandestinas Conocidas:</span>
                          <div className="flex flex-wrap gap-1">
                            {clan.knownRoutes.map((r, i) => (
                              <span key={i} className="bg-[#151c2c] text-slate-300 text-[9px] px-1.5 py-0.5 rounded border border-[#242f46]">
                                {r}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Puntos Calientes */}
                        <div>
                          <span className="text-[9px] text-slate-500 uppercase font-bold block mb-1">Puntos Calientes / Hotspots:</span>
                          <div className="flex flex-wrap gap-1">
                            {clan.recentHotspots.map((h, i) => (
                              <span key={i} className="text-[#38bdf8] text-[9px] font-bold flex items-center gap-0.5">
                                ● {h}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Celulares & Comunicaciones Interceptadas */}
                        {clan.phoneNumbers && clan.phoneNumbers.length > 0 && (
                          <div className="bg-[#151c2c] border border-[#242f46] rounded-lg p-2">
                            <div className="flex items-center gap-1 text-[9px] text-emerald-400 font-bold uppercase mb-1">
                              <Smartphone className="w-3 h-3" />
                              <span>Celulares Interceptados ({clan.phoneNumbers.length}):</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {clan.phoneNumbers.map((p, i) => (
                                <span key={i} className="bg-black/60 text-emerald-300 text-[9px] px-1.5 py-0.5 rounded border border-emerald-500/30 font-mono">
                                  {p}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Vehículos & Convoyes */}
                        {clan.vehicles && clan.vehicles.length > 0 && (
                          <div className="flex items-start gap-1.5 text-[10px] text-slate-300">
                            <Truck className="w-3 h-3 text-orange-400 mt-0.5 flex-shrink-0" />
                            <span><strong>Vehículos:</strong> {clan.vehicles.join(', ')}</span>
                          </div>
                        )}

                        {/* Tácticas */}
                        <div>
                          <span className="text-[9px] text-slate-500 uppercase font-bold block mb-0.5">Tácticas & Modus Operandi:</span>
                          <p className="text-slate-400 text-[11px] font-sans leading-relaxed line-clamp-2">
                            {clan.tactics}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Footer card */}
                    <div className="mt-3 pt-2 border-t border-[#1e2738] flex items-center justify-between text-[9px] font-mono text-slate-500">
                      <span>Última Actividad: {clan.lastActive}</span>
                      {onDeleteClan && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`¿Eliminar clan "${clan.name}" de la base de datos?`)) {
                              onDeleteClan(clan.id);
                              playCyberClick('laser', 0.1);
                            }
                          }}
                          className="text-red-400 hover:text-red-300 p-1 cursor-pointer"
                          title="Eliminar de la base de datos"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: CREATE / EDIT CLAN FORM */}
          {activeTab === 'FORM' && (
            <form onSubmit={handleSaveSubmit} className="space-y-4 max-w-3xl mx-auto bg-[#0f1422] border border-[#1e2738] rounded-2xl p-5 shadow-xl">
              <div className="border-b border-[#1e2738] pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-mono font-bold text-white uppercase">
                    {editingClanId ? `INCREMENTAR INFORMACIÓN: ${name || 'CLAN'}` : '+ REGISTRAR NUEVO CLAN EN LA BASE DE DATOS'}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Almacenamiento de inteligencia fronteriza, celulares interceptados, rutas clandestinas y convoyes.
                  </p>
                </div>
                <span className="text-[10px] font-mono bg-[#10b981]/20 text-[#10b981] px-2 py-0.5 rounded border border-[#10b981]/40 font-bold">
                  S-2 / CFI
                </span>
              </div>

              {/* Clan Name & Threat Level */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-mono font-bold text-slate-300 uppercase">
                    Nombre del Clan u Organización: *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Clan Los Coyotes de Pisiga"
                    className="w-full bg-[#151c2c] border border-[#242f46] rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono font-bold text-slate-300 uppercase">
                    Nivel de Amenaza:
                  </label>
                  <select
                    value={threatLevel}
                    onChange={(e) => setThreatLevel(e.target.value as any)}
                    className="w-full bg-[#151c2c] border border-[#242f46] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="CRITICAL">CRÍTICO (Armado / Hostil)</option>
                    <option value="HIGH">ALTO (Convoyes rápidos)</option>
                    <option value="MEDIUM">MEDIO (Camiones acoplados)</option>
                    <option value="LOW">BAJO (Contrabando hormiga)</option>
                  </select>
                </div>
              </div>

              {/* Members Count & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-300 uppercase">
                    Integrantes Estimados:
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={membersCount}
                    onChange={(e) => setMembersCount(Number(e.target.value))}
                    className="w-full bg-[#151c2c] border border-[#242f46] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-300 uppercase">
                    Estado Operacional:
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-[#151c2c] border border-[#242f46] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ACTIVO">ACTIVO (En operaciones continuas)</option>
                    <option value="BAJO_VIGILANCIA">BAJO VIGILANCIA (Monitoreo FLIR/S-2)</option>
                    <option value="INTERCEPTADO">INTERCEPTADO (Operación en curso)</option>
                    <option value="DESARTICULADO">DESARTICULADO (Neutralizado)</option>
                  </select>
                </div>
              </div>

              {/* Incremental Section: Celulares Interceptados */}
              <div className="bg-[#151c2c] border border-[#242f46] rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5 uppercase">
                    <Smartphone className="w-4 h-4" />
                    Incrementar Números de Celular Interceptados:
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">({phoneNumbers.length} registrados)</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="Ej: +591 76543210 o 71234567"
                    className="flex-1 bg-black/60 border border-emerald-500/50 rounded-lg px-3 py-1.5 text-xs font-mono text-emerald-300 placeholder-slate-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newPhone.trim() && !phoneNumbers.includes(newPhone.trim())) {
                        setPhoneNumbers([...phoneNumbers, newPhone.trim()]);
                        setNewPhone('');
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-black text-xs font-mono font-bold cursor-pointer"
                  >
                    + Añadir Celular
                  </button>
                </div>
                {phoneNumbers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {phoneNumbers.map((p, idx) => (
                      <span key={idx} className="bg-black/70 border border-emerald-500/40 text-emerald-400 text-xs px-2 py-0.5 rounded-md flex items-center gap-1 font-mono">
                        {p}
                        <button
                          type="button"
                          onClick={() => setPhoneNumbers(phoneNumbers.filter((_, i) => i !== idx))}
                          className="hover:text-red-400 cursor-pointer ml-1"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Incremental Section: Rutas Clandestinas Conocidas */}
              <div className="bg-[#151c2c] border border-[#242f46] rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5 uppercase">
                    <MapPin className="w-4 h-4 text-blue-400" />
                    Rutas Clandestinas Conocidas:
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">({knownRoutes.length} rutas)</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newRoute}
                    onChange={(e) => setNewRoute(e.target.value)}
                    placeholder="Ej: Quebrada Bellavista, Paso Hito 14"
                    className="flex-1 bg-black/60 border border-[#242f46] rounded-lg px-3 py-1.5 text-xs font-mono text-white placeholder-slate-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newRoute.trim() && !knownRoutes.includes(newRoute.trim())) {
                        setKnownRoutes([...knownRoutes, newRoute.trim()]);
                        setNewRoute('');
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold cursor-pointer"
                  >
                    + Añadir Ruta
                  </button>
                </div>
                {knownRoutes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {knownRoutes.map((r, idx) => (
                      <span key={idx} className="bg-black/70 border border-blue-500/40 text-blue-300 text-xs px-2 py-0.5 rounded-md flex items-center gap-1 font-mono">
                        {r}
                        <button
                          type="button"
                          onClick={() => setKnownRoutes(knownRoutes.filter((_, i) => i !== idx))}
                          className="hover:text-red-400 cursor-pointer ml-1"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Incremental Section: Puntos Calientes (Hotspots) */}
              <div className="bg-[#151c2c] border border-[#242f46] rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5 uppercase">
                    <AlertTriangle className="w-4 h-4 text-orange-400" />
                    Puntos Calientes / Sectores de Cruce (Hotspots):
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">({recentHotspots.length} puntos)</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newHotspot}
                    onChange={(e) => setNewHotspot(e.target.value)}
                    placeholder="Ej: Salar de Coipasa Norte, Hito 12"
                    className="flex-1 bg-black/60 border border-[#242f46] rounded-lg px-3 py-1.5 text-xs font-mono text-white placeholder-slate-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newHotspot.trim() && !recentHotspots.includes(newHotspot.trim())) {
                        setRecentHotspots([...recentHotspots, newHotspot.trim()]);
                        setNewHotspot('');
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-mono font-bold cursor-pointer"
                  >
                    + Añadir Punto
                  </button>
                </div>
                {recentHotspots.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {recentHotspots.map((h, idx) => (
                      <span key={idx} className="bg-black/70 border border-orange-500/40 text-orange-300 text-xs px-2 py-0.5 rounded-md flex items-center gap-1 font-mono">
                        {h}
                        <button
                          type="button"
                          onClick={() => setRecentHotspots(recentHotspots.filter((_, i) => i !== idx))}
                          className="hover:text-red-400 cursor-pointer ml-1"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Incremental Section: Vehículos y Frecuencias Radiales */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-300 uppercase flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-yellow-400" />
                    Vehículos / Convoyes (Separados por coma):
                  </label>
                  <input
                    type="text"
                    value={vehicles.join(', ')}
                    onChange={(e) => setVehicles(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    placeholder="Ej: Camionetas Hilux 4x4, Convoy 3 camiones F12"
                    className="w-full bg-[#151c2c] border border-[#242f46] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-300 uppercase flex items-center gap-1">
                    <Radio className="w-3.5 h-3.5 text-cyan-400" />
                    Frecuencias Radiales (Separadas por coma):
                  </label>
                  <input
                    type="text"
                    value={radioFrequencies.join(', ')}
                    onChange={(e) => setRadioFrequencies(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    placeholder="Ej: VHF 143.200 MHz, Canal UHF 450.150"
                    className="w-full bg-[#151c2c] border border-[#242f46] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Tactics & Analyst Notes */}
              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-300 uppercase">
                  Tácticas, Modus Operandi & Conducta de Escape:
                </label>
                <textarea
                  rows={2}
                  value={tactics}
                  onChange={(e) => setTactics(e.target.value)}
                  placeholder="Ej: Marcha nocturna sin luces por caminos de herradura, uso de vigías en cerros fronterizos..."
                  className="w-full bg-[#151c2c] border border-[#242f46] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-300 uppercase">
                  Notas de Inteligencia y Antecedentes G-2:
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Antecedentes doctrinales, expedientes vinculados o decomisos previos..."
                  className="w-full bg-[#151c2c] border border-[#242f46] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('LIST')}
                  className="px-4 py-2 rounded-xl bg-[#151c2c] hover:bg-[#1e2738] text-slate-300 text-xs font-mono cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black text-xs font-mono font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer"
                >
                  <Database className="w-4 h-4" />
                  {editingClanId ? 'Guardar Incremento de Información' : 'Registrar Clan en Base de Datos'}
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Footer */}
        <div className="bg-[#0f1422] p-3 border-t border-[#1e2738] flex items-center justify-between text-[10px] font-mono text-[#64748b] flex-shrink-0">
          <span>* Base de Datos de Inteligencia Táctica C4ISR-LCC // Ley 1053 y Art. 251 CPE.</span>
          <span className="text-emerald-400">CLANES ACTIVOS: {clans.length}</span>
        </div>

      </div>
    </div>
  );
};

export default ClanManagementModal;

