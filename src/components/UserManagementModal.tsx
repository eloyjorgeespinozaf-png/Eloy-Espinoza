/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Shield, 
  Users, 
  UserPlus, 
  Trash2, 
  Edit3, 
  Key, 
  Phone, 
  Smartphone, 
  Radio, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Download, 
  RotateCcw, 
  Lock, 
  Unlock, 
  Eye, 
  EyeOff, 
  Crown, 
  Crosshair,
  BadgeAlert,
  Server,
  Sparkles
} from 'lucide-react';
import { MilitaryRole, User } from '../types';
import { useAuth } from '../context/AuthContext';
import { playCyberClick, playCyberAccessGranted, playCyberDenied } from '../utils/audio';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MILITARY_RANKS = [
  'General de Brigada',
  'Coronel',
  'Teniente Coronel',
  'Mayor',
  'Capitán',
  'Teniente',
  'Subteniente',
  'Suboficial Mayor',
  'Suboficial Primero',
  'Suboficial Segundo',
  'Sargento Primero',
  'Sargento Segundo',
  'Sargento Inicial',
  'Cabo 1°',
  'Cabo',
  'Soldado / Agente Especialista'
];

export const UserManagementModal: React.FC<UserManagementModalProps> = ({ isOpen, onClose }) => {
  const { users, addUser, updateUser, deleteUser, resetUsersToDefault, user: currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'LIST' | 'CREATE'>('LIST');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'ALL' | MilitaryRole>('ALL');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  // Form states for creating new user
  const [name, setName] = useState('');
  const [rank, setRank] = useState('Teniente');
  const [customRank, setCustomRank] = useState('');
  const [role, setRole] = useState<MilitaryRole>('ROL_BUSQUEDA');
  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [stationId, setStationId] = useState('');
  const [organName, setOrganName] = useState('');
  const [organSubtitle, setOrganSubtitle] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Edit user state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editPhone, setEditPhone] = useState('');
  const [editRank, setEditRank] = useState('');
  const [editStation, setEditStation] = useState('');

  if (!isOpen) return null;

  const filteredUsers = users.filter(u => {
    if (selectedRoleFilter === 'ALL') return true;
    if (selectedRoleFilter === 'ROL_TERRENO') {
      return u.role === 'ROL_TERRENO' || u.role === 'ROL_PATRULLA';
    }
    return u.role === selectedRoleFilter;
  });

  const toggleShowPassword = (id: string) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
    playCyberClick('toggle', 0.08);
  };

  const handleRoleChange = (newRole: MilitaryRole) => {
    setRole(newRole);
    if (newRole === 'ROL_BUSQUEDA') {
      setOrganName('Órgano de Búsqueda S-2');
      setOrganSubtitle('Captación IMINT/HUMINT/SIGINT & Sensores S-2 (Subordinado al CEO-LCC)');
      if (!stationId) setStationId('PUESTO-AVANZADO-S2');
    } else if (newRole === 'ROL_FUSION') {
      setOrganName('Órgano de Fusión (CFI)');
      setOrganSubtitle('Centro de Fusión de Inteligencia — Análisis de Búsqueda (Subordinado al CEO-LCC)');
      if (!stationId) setStationId('NODO-CFI-BRIGADA');
    } else if (newRole === 'ROL_TERRENO') {
      setOrganName('Órgano de Búsqueda en Terreno');
      setOrganSubtitle('Patrullas Tácticas de Búsqueda & Destacamentos (Subordinado al CEO-LCC)');
      if (!stationId) setStationId('PATRULLA-TACTICA-TERRENO');
    } else {
      setOrganName('CEO-LCC Mando (Administrador)');
      setOrganSubtitle('Mando Estratégico & Estado Mayor C4ISR');
      if (!stationId) setStationId('ESTADO-MAYOR-ADMIN');
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!name.trim()) {
      setFormError('Ingrese el nombre y apellidos completos del operador.');
      playCyberDenied(0.12);
      return;
    }

    if (!phoneNumber.trim()) {
      setFormError('Ingrese el número de celular del operador. Este número actuará como su clave criptográfica de acceso.');
      playCyberDenied(0.12);
      return;
    }

    const finalRank = rank === 'OTRO' ? customRank.trim() : rank;

    const res = addUser({
      name: name.trim(),
      rank: finalRank || 'Oficial Operador',
      role,
      username: username.trim() || undefined,
      phoneNumber: phoneNumber.trim(),
      stationId: stationId.trim() || undefined,
      organName: organName.trim() || undefined,
      organSubtitle: organSubtitle.trim() || undefined
    });

    if (res.success && res.user) {
      setFormSuccess(`¡Operador ${res.user.name} registrado con éxito! Clave criptográfica asignada al celular: ${res.user.phoneNumber}`);
      playCyberAccessGranted(0.12);
      
      // Reset form
      setName('');
      setUsername('');
      setPhoneNumber('');
      setStationId('');
      setCustomRank('');
      
      // Return to list after short delay
      setTimeout(() => {
        setActiveTab('LIST');
        setFormSuccess(null);
      }, 1500);
    } else {
      setFormError(res.error || 'Error al registrar nuevo operador militar.');
      playCyberDenied(0.14);
    }
  };

  const startEditUser = (u: User) => {
    setEditingUserId(u.id);
    setEditPhone(u.phoneNumber || '');
    setEditRank(u.rank || '');
    setEditStation(u.stationId || '');
  };

  const saveEditUser = (id: string) => {
    if (!editPhone.trim()) {
      alert('El número de celular no puede quedar vacío (es la clave criptográfica).');
      return;
    }
    updateUser(id, {
      phoneNumber: editPhone.trim(),
      password: editPhone.trim(),
      rank: editRank.trim(),
      stationId: editStation.trim()
    });
    setEditingUserId(null);
    playCyberAccessGranted(0.1);
  };

  const handleDelete = (id: string, userName: string) => {
    if (confirm(`¿Confirma revocar y eliminar permanentemente las credenciales del operador militar: "${userName}"?`)) {
      const ok = deleteUser(id);
      if (ok) {
        playCyberClick('laser', 0.1);
      } else {
        alert('No se puede eliminar la cuenta del Administrador General Principal.');
      }
    }
  };

  const handleExportUsersJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(users, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `DIRECTORIO_USUARIOS_CEO_LCC_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    playCyberAccessGranted(0.09);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0b0f19] border-2 border-[#3b82f6]/70 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-[0_0_50px_rgba(59,130,246,0.25)] overflow-hidden text-left">
        
        {/* Top Header */}
        <div className="bg-gradient-to-r from-[#172554] via-[#0f172a] to-[#020617] p-4 border-b border-[#1e293b] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.4)]">
              <Crown className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-mono font-bold text-white tracking-wider uppercase">
                  ADMINISTRACIÓN DE USUARIOS // CEO-LCC MANDO
                </h2>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 font-mono font-bold px-2 py-0.5 rounded border border-blue-500/40">
                  ADMINISTRADOR GENERAL
                </span>
              </div>
              <p className="text-[11px] text-blue-200/70 font-mono mt-0.5">
                Alta, baja y gestión de claves criptográficas (números de celular) en los Órganos de Búsqueda S-2, CFI de Brigada y Terreno.
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

        {/* Navigation Tabs and Quick Actions */}
        <div className="bg-[#0f1422] px-4 py-2.5 border-b border-[#1e2738] flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setActiveTab('LIST'); playCyberClick('toggle', 0.08); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'LIST'
                  ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(59,130,246,0.4)]'
                  : 'bg-[#151c2c] text-[#94a3b8] hover:text-white hover:bg-[#1e2738]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Directorio de Usuarios ({users.length})
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('CREATE'); playCyberClick('toggle', 0.08); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'CREATE'
                  ? 'bg-emerald-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                  : 'bg-[#151c2c] text-emerald-400 hover:text-emerald-300 hover:bg-[#1e2738] border border-emerald-500/30'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              + Ingresar Nuevo Usuario Militar
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportUsersJson}
              className="text-[10px] font-mono px-2.5 py-1 rounded bg-[#1e293b] hover:bg-[#334155] text-[#cbd5e1] flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Descargar listado de usuarios y credenciales en JSON"
            >
              <Download className="w-3 h-3 text-blue-400" />
              Exportar Directorio
            </button>

            <button
              type="button"
              onClick={() => {
                if (confirm('¿Restaurar usuarios predeterminados de fábrica?')) {
                  resetUsersToDefault();
                  playCyberAccessGranted(0.1);
                }
              }}
              className="text-[10px] font-mono px-2 py-1 rounded bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-800/40 flex items-center gap-1 cursor-pointer transition-colors"
              title="Restaurar plantilla inicial de usuarios"
            >
              <RotateCcw className="w-3 h-3" />
              Resetear
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          
          {/* TAB 1: USER LIST */}
          {activeTab === 'LIST' && (
            <div className="space-y-4">
              
              {/* Filter by Military Organ */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#1e2738]">
                <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                  <span className="text-[10px] font-mono uppercase text-[#64748b] font-bold mr-1">Filtrar por Órgano:</span>
                  {[
                    { id: 'ALL', label: 'Todos' },
                    { id: 'ROL_CEO', label: 'CEO-LCC Mando' },
                    { id: 'ROL_BUSQUEDA', label: 'Búsqueda S-2' },
                    { id: 'ROL_FUSION', label: 'Fusión CFI Brigada' },
                    { id: 'ROL_TERRENO', label: 'Unidades Terreno' }
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setSelectedRoleFilter(f.id as any)}
                      className={`text-[10px] font-mono px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                        selectedRoleFilter === f.id
                          ? 'bg-blue-600 text-white font-bold'
                          : 'bg-[#151c2c] text-[#94a3b8] hover:text-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="text-[10px] font-mono text-[#64748b]">
                  Mostrando <strong className="text-white">{filteredUsers.length}</strong> de {users.length} operadores
                </div>
              </div>

              {/* Informative Banner */}
              <div className="bg-gradient-to-r from-blue-950/40 to-slate-900 border border-blue-800/40 rounded-xl p-3 flex items-start gap-3">
                <Smartphone className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs font-mono">
                  <span className="font-bold text-blue-300">PROTOCOLO CRIPTOGRÁFICO MÓVIL PII-LCC:</span>
                  <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
                    Cada operador militar de los Órganos de Búsqueda S-2, CFI de Brigada y Terreno ingresa al sistema utilizando su 
                    <strong> Número de Celular</strong> como contraseña criptográfica. El Administrador General CEO-LCC es la única autoridad con facultad para dar de alta nuevos operadores o actualizar sus llaves móviles.
                  </p>
                </div>
              </div>

              {/* Users Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredUsers.map((u) => {
                  const isEditing = editingUserId === u.id;
                  const isPassVisible = Boolean(showPasswords[u.id]);

                  // Determine color styling based on role
                  let roleBadgeColor = 'bg-blue-500/20 text-blue-400 border-blue-500/40';
                  let cardBorder = 'border-[#1e2738] hover:border-blue-500/40';
                  if (u.role === 'ROL_BUSQUEDA') {
                    roleBadgeColor = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40';
                    cardBorder = 'border-[#1e2738] hover:border-yellow-500/40';
                  } else if (u.role === 'ROL_FUSION') {
                    roleBadgeColor = 'bg-orange-500/20 text-orange-400 border-orange-500/40';
                    cardBorder = 'border-[#1e2738] hover:border-orange-500/40';
                  } else if (u.role === 'ROL_TERRENO' || u.role === 'ROL_PATRULLA') {
                    roleBadgeColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
                    cardBorder = 'border-[#1e2738] hover:border-emerald-500/40';
                  }

                  return (
                    <div 
                      key={u.id}
                      className={`bg-[#0f1422] border rounded-xl p-3.5 flex flex-col justify-between transition-all ${cardBorder} shadow-md`}
                    >
                      <div>
                        {/* Header card */}
                        <div className="flex items-start justify-between gap-2 border-b border-[#1e2738] pb-2">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-mono font-bold text-white">{u.name}</span>
                              {u.isAdmin && (
                                <span className="bg-blue-500/30 text-blue-300 text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border border-blue-400/40 flex items-center gap-0.5">
                                  <Crown className="w-2.5 h-2.5 text-blue-300" /> ADMIN
                                </span>
                              )}
                              <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded border uppercase ${roleBadgeColor}`}>
                                {u.role === 'ROL_CEO' ? 'CEO MANDO' : 
                                 u.role === 'ROL_BUSQUEDA' ? 'BÚSQUEDA S-2' : 
                                 u.role === 'ROL_FUSION' ? 'CFI BRIGADA' : 'TERRENO'}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {u.rank || 'Oficial Operador'}
                            </p>
                          </div>

                          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            u.status === 'SUSPENDIDO' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            ● {u.status || 'ACTIVO'}
                          </span>
                        </div>

                        {/* Details */}
                        <div className="mt-2.5 space-y-1.5 text-xs font-mono">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500">ID / Usuario:</span>
                            <span className="text-slate-200 font-bold">{u.username || u.id}</span>
                          </div>

                          {/* Cell phone cryptographic key */}
                          <div className="bg-[#151c2c] border border-[#242f46] rounded-lg p-2 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-[10px] text-slate-400 uppercase font-bold">Clave Criptográfica (Celular):</span>
                            </div>

                            {isEditing ? (
                              <input
                                type="text"
                                value={editPhone || ''}
                                onChange={(e) => setEditPhone(e.target.value)}
                                className="bg-black/60 border border-emerald-500 rounded px-2 py-0.5 text-xs font-mono text-emerald-300 w-32 text-right focus:outline-none"
                                placeholder="Ej: 71200001"
                              />
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-mono font-bold text-emerald-400 tracking-wider">
                                  {isPassVisible ? (u.phoneNumber || 'Sin clave') : '••••••••'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => toggleShowPassword(u.id)}
                                  className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
                                  title={isPassVisible ? "Ocultar" : "Mostrar"}
                                >
                                  {isPassVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span>Estación / Puesto:</span>
                            <span className="text-slate-300 truncate max-w-[180px]">{u.stationId || 'Despliegue General'}</span>
                          </div>

                          <div className="flex items-center justify-between text-[9px] text-slate-500">
                            <span>Acreditación C4ISR:</span>
                            <span className="text-blue-400">Nivel {u.clearanceLevel || 1} // Firma: {u.signature.slice(0, 16)}...</span>
                          </div>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="mt-3 pt-2 border-t border-[#1e2738] flex items-center justify-between">
                        <span className="text-[9px] text-slate-500 font-mono">
                          {u.assignedBy ? `Por: ${u.assignedBy.slice(0, 22)}` : 'Matriz Doctrinal'}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => saveEditUser(u.id)}
                                className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-black text-[10px] font-mono font-bold cursor-pointer"
                              >
                                Guardar
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingUserId(null)}
                                className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white text-[10px] font-mono cursor-pointer"
                              >
                                Cancelar
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => startEditUser(u)}
                                className="px-2 py-1 rounded bg-[#1e293b] hover:bg-[#334155] text-slate-300 hover:text-white text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-colors"
                                title="Editar número de celular / estación"
                              >
                                <Edit3 className="w-2.5 h-2.5" />
                                Modificar
                              </button>

                              {!u.isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => handleDelete(u.id, u.name)}
                                  className="p-1 rounded bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/40 cursor-pointer transition-colors"
                                  title="Revocar acceso militar"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: CREATE NEW USER */}
          {activeTab === 'CREATE' && (
            <form onSubmit={handleCreateSubmit} className="space-y-4 max-w-2xl mx-auto bg-[#0f1422] border border-[#1e2738] rounded-2xl p-5 shadow-xl">
              <div className="border-b border-[#1e2738] pb-3">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-mono font-bold text-white uppercase">
                    ALTA DE NUEVO OPERADOR // ADMINISTRACIÓN CEO-LCC
                  </h3>
                </div>
                <p className="text-[11px] text-[#94a3b8] font-mono mt-0.5">
                  Complete los datos doctrinales del operador y asigne su número de celular como llave criptográfica personal.
                </p>
              </div>

              {formError && (
                <div className="p-3 bg-red-950/40 border border-red-500/50 rounded-xl flex items-center gap-2 text-xs font-mono text-red-300">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/50 rounded-xl flex items-center gap-2 text-xs font-mono text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {/* Module / Organ Destination */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-slate-300 uppercase block">
                  1. Módulo / Órgano Militar de Destino: *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleRoleChange('ROL_BUSQUEDA')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      role === 'ROL_BUSQUEDA'
                        ? 'bg-yellow-500/20 border-yellow-500 text-yellow-300 shadow-[0_0_15px_rgba(234,179,8,0.2)]'
                        : 'bg-[#151c2c] border-[#1e2738] text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-mono font-bold">Órgano de Búsqueda S-2</div>
                    <div className="text-[9px] text-slate-400 mt-0.5">Sensores FLIR, IMINT/SIGINT</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleChange('ROL_FUSION')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      role === 'ROL_FUSION'
                        ? 'bg-orange-500/20 border-orange-500 text-orange-300 shadow-[0_0_15px_rgba(249,115,22,0.2)]'
                        : 'bg-[#151c2c] border-[#1e2738] text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-mono font-bold">CFI de Brigada (Fusión)</div>
                    <div className="text-[9px] text-slate-400 mt-0.5">Análisis G-2 & Expedientes</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleChange('ROL_TERRENO')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      role === 'ROL_TERRENO'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                        : 'bg-[#151c2c] border-[#1e2738] text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-mono font-bold">Unidades de Terreno</div>
                    <div className="text-[9px] text-slate-400 mt-0.5">Patrullas & Exploración</div>
                  </button>
                </div>
              </div>

              {/* Personal Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-mono font-bold text-slate-300 uppercase">
                    Nombre y Apellidos del Operador: *
                  </label>
                  <input
                    type="text"
                    required
                    value={name || ''}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Marcelo Quispe Huanca"
                    className="w-full bg-[#151c2c] border border-[#242f46] rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono font-bold text-slate-300 uppercase">
                    Grado Militar: *
                  </label>
                  <select
                    value={rank || 'SGTO1.'}
                    onChange={(e) => setRank(e.target.value)}
                    className="w-full bg-[#151c2c] border border-[#242f46] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                  >
                    {MILITARY_RANKS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                    <option value="OTRO">Otro / Especializado...</option>
                  </select>
                  {rank === 'OTRO' && (
                    <input
                      type="text"
                      value={customRank || ''}
                      onChange={(e) => setCustomRank(e.target.value)}
                      placeholder="Especifique grado o título militar"
                      className="mt-1 w-full bg-[#151c2c] border border-[#242f46] rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none"
                    />
                  )}
                </div>
              </div>

              {/* Cryptographic Key / Cell Phone */}
              <div className="bg-gradient-to-r from-emerald-950/30 via-slate-900 to-[#151c2c] border-2 border-emerald-500/50 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <label className="text-xs font-mono font-bold text-emerald-300 uppercase">
                    CLAVE CRIPTOGRÁFICA (NÚMERO DE CELULAR): *
                  </label>
                </div>
                <input
                  type="text"
                  required
                  value={phoneNumber || ''}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Ej: 71234567 o +591 71234567"
                  className="w-full bg-black/60 border border-emerald-500/60 rounded-xl px-3 py-2.5 text-sm font-mono font-bold text-emerald-400 placeholder-emerald-800/60 focus:outline-none focus:border-emerald-400 shadow-inner"
                />
                <p className="text-[10px] text-emerald-200/70 font-mono">
                  * Este número de celular será la contraseña obligatoria con la que este operador accederá al módulo desde la pantalla de inicio de sesión militar.
                </p>
              </div>

              {/* Username & Station */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-300 uppercase">
                    Identificador / Usuario (Opcional):
                  </label>
                  <input
                    type="text"
                    value={username || ''}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ej: s2.quispe (Autogenerado si está vacío)"
                    className="w-full bg-[#151c2c] border border-[#242f46] rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-300 uppercase">
                    Estación / Puesto Táctico:
                  </label>
                  <input
                    type="text"
                    value={stationId || ''}
                    onChange={(e) => setStationId(e.target.value)}
                    placeholder="Ej: Puesto Fronterizo Pisiga-01"
                    className="w-full bg-[#151c2c] border border-[#242f46] rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('LIST')}
                  className="px-4 py-2 rounded-xl bg-[#151c2c] hover:bg-[#1e2738] text-slate-300 text-xs font-mono cursor-pointer transition-colors"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black text-xs font-mono font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  Registrar Operador con Clave Celular
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-[#0f1422] p-3 border-t border-[#1e2738] flex items-center justify-between text-[10px] font-mono text-[#64748b] flex-shrink-0">
          <span>* Sistema C4ISR-PII-LCC // Art. 251 CPE y Ley 1053 de Lucha Contra el Contrabando.</span>
          <span className="text-blue-400">ADMINISTRADOR: {currentUser?.name || 'Gral. E. Martínez'}</span>
        </div>

      </div>
    </div>
  );
};

export default UserManagementModal;

