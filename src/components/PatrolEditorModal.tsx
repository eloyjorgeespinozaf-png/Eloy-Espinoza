/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { TacticalUnit } from '../types';
import { Shield, User, MapPin, Radio, Key, Battery, Fuel, Crosshair, Plus, Trash2, Check, X, Sliders, Eye, EyeOff } from 'lucide-react';
import { playSyntheticBeep, playChime } from '../utils/audio';

interface PatrolEditorModalProps {
  isOpen: boolean;
  mode: 'CREATE' | 'EDIT';
  patrol?: TacticalUnit | null;
  onClose: () => void;
  onSave: (unit: TacticalUnit) => void;
  onDelete?: (unitId: string) => void;
}

const SECTOR_PRESETS = [
  { name: 'Salar de Coipasa - Hito XIX', coords: '19°13\'10"S 68°35\'50"W', freq: '142.850 MHz' },
  { name: 'Paso Colchane / Pisiga - Hito XXIII', coords: '20°06\'15"S 68°30\'05"W', freq: '143.100 MHz' },
  { name: 'Quebrada de Tarapacá - Hito 14', coords: '19°12\'05"S 68°36\'40"W', freq: '141.950 MHz' },
  { name: 'Ollagüe / Frontera Sur', coords: '21°13\'30"S 68°15\'00"W', freq: '140.400 MHz' },
  { name: 'Tambo Quemado / Hito IV', coords: '18°17\'20"S 69°02\'30"W', freq: '142.150 MHz' },
  { name: 'Abra de Chorrillos / Pito', coords: '19°45\'22"S 68°42\'10"W', freq: '143.700 MHz' }
];

const AVAILABLE_EQUIPMENT = [
  'Camioneta 4x4 Táctica',
  'Vehículo Blindado Ligero',
  'Dron VANT-01 Cóndor',
  'Dron VANT-02 Térmico',
  'Visor Térmico FLIR',
  'Visor Nocturno Infrarrojo',
  'Radio VHF Harris Falcon',
  'Sensor Radar Terrestre',
  'Rifle de Precisión 7.62mm',
  'Kit Brechero e Interdicción',
  'Lanzador de Fumígenos',
  'Terminal Satelital Ruggedized'
];

export const PatrolEditorModal: React.FC<PatrolEditorModalProps> = ({
  isOpen,
  mode,
  patrol,
  onClose,
  onSave,
  onDelete
}) => {
  const [name, setName] = useState('');
  const [commander, setCommander] = useState('');
  const [status, setStatus] = useState<'PATROLLING' | 'INTERCEPTING' | 'STATIONARY' | 'OFFLINE'>('PATROLLING');
  const [coordinates, setCoordinates] = useState('');
  const [sector, setSector] = useState('');
  const [personnel, setPersonnel] = useState(8);
  const [pin, setPin] = useState('1234');
  const [showPin, setShowPin] = useState(false);
  const [frequency, setFrequency] = useState('142.850 MHz');
  const [equipment, setEquipment] = useState<string[]>([]);
  const [battery, setBattery] = useState(95);
  const [fuel, setFuel] = useState(85);
  const [ammo, setAmmo] = useState(100);
  const [notes, setNotes] = useState('');
  const [customEquipInput, setCustomEquipInput] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setConfirmDelete(false);
      if (mode === 'EDIT' && patrol) {
        setName(patrol.name || '');
        setCommander(patrol.commander || 'Oficial S-2');
        setStatus(patrol.status || 'PATROLLING');
        setCoordinates(patrol.coordinates || '19°13\'10"S 68°35\'50"W');
        setSector(patrol.sector || 'Salar de Coipasa - Hito XIX');
        setPersonnel(patrol.personnel || 8);
        setPin(patrol.pin || '1234');
        setFrequency(patrol.frequency || '142.850 MHz');
        setEquipment(patrol.equipment || ['Camioneta 4x4 Táctica', 'Radio VHF Harris']);
        setBattery(patrol.battery ?? 95);
        setFuel(patrol.fuel ?? 85);
        setAmmo(patrol.ammo ?? 100);
        setNotes(patrol.notes || '');
      } else {
        // Default new patrol setup
        const nextNumber = Math.floor(4 + Math.random() * 6);
        setName(`Patrulla Cóndor-${nextNumber}`);
        setCommander('SGTO2. C. Morales');
        setStatus('PATROLLING');
        setCoordinates(SECTOR_PRESETS[0].coords);
        setSector(SECTOR_PRESETS[0].name);
        setPersonnel(8);
        setPin('1234');
        setFrequency(SECTOR_PRESETS[0].freq);
        setEquipment(['Camioneta 4x4 Táctica', 'VANT-01 Cóndor', 'Radio VHF Harris Falcon']);
        setBattery(100);
        setFuel(95);
        setAmmo(100);
        setNotes('Patrulla asignada al control fronterizo y detección de caravanas clandestinas.');
      }
    }
  }, [isOpen, mode, patrol]);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: typeof SECTOR_PRESETS[0]) => {
    setSector(preset.name);
    setCoordinates(preset.coords);
    setFrequency(preset.freq);
    playSyntheticBeep(750, 0.05, 'sine');
  };

  const handleToggleEquipment = (item: string) => {
    if (equipment.includes(item)) {
      setEquipment(equipment.filter(e => e !== item));
    } else {
      setEquipment([...equipment, item]);
    }
  };

  const handleAddCustomEquipment = () => {
    if (customEquipInput.trim() && !equipment.includes(customEquipInput.trim())) {
      setEquipment([...equipment, customEquipInput.trim()]);
      setCustomEquipInput('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const unitData: TacticalUnit = {
      id: mode === 'EDIT' && patrol ? patrol.id : `unit-${Date.now()}`,
      name: name.trim(),
      commander: commander.trim() || 'Comandante de Patrulla',
      status: status,
      coordinates: coordinates.trim() || '19°13\'10"S 68°35\'50"W',
      sector: sector.trim() || 'Sector Fronterizo',
      personnel: Number(personnel) || 6,
      pin: pin.trim() || '1234',
      frequency: frequency.trim() || '142.850 MHz',
      equipment: equipment.length > 0 ? equipment : ['Camioneta Táctica', 'Radio VHF'],
      battery: Number(battery),
      fuel: Number(fuel),
      ammo: Number(ammo),
      notes: notes.trim(),
      lastReportTime: 'Hace un momento',
      createdAt: mode === 'EDIT' && patrol?.createdAt ? patrol.createdAt : new Date().toISOString()
    };

    playChime();
    onSave(unitData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-[#0b0c10] border-2 border-yellow-500/70 rounded-2xl max-w-2xl w-full p-6 shadow-[0_0_50px_rgba(234,179,8,0.25)] text-left relative my-8 font-mono">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-yellow-500/30 pb-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-yellow-500/20 border border-yellow-500/40">
              {mode === 'CREATE' ? (
                <Plus className="w-5 h-5 text-yellow-400" />
              ) : (
                <Sliders className="w-5 h-5 text-yellow-400" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-white uppercase tracking-wider">
                {mode === 'CREATE' ? 'DESPLEGAR NUEVA PATRULLA TÁCTICA' : 'EDITAR DATOS DE PATRULLA ASIGNADA'}
              </h2>
              <p className="text-[11px] text-yellow-400/80">
                {mode === 'CREATE'
                  ? 'Configuración del nuevo módulo activo asignado con clave y telemetría de campo'
                  : `Ajuste de parámetros operacionales para ${name || 'la patrulla'}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* Main info row: Name, Commander, Personnel */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-neutral-300 uppercase mb-1">
                Indicativo / Nombre Patrulla *
              </label>
              <div className="relative">
                <Shield className="w-3.5 h-3.5 text-yellow-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Patrulla Cóndor-4"
                  className="w-full bg-[#141620] border border-neutral-700 rounded-lg pl-8 pr-2.5 py-1.5 text-white focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-neutral-300 uppercase mb-1">
                Comandante / Jefe de Patrulla *
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  required
                  value={commander}
                  onChange={(e) => setCommander(e.target.value)}
                  placeholder="e.g. CB1. F. Valenzuela"
                  className="w-full bg-[#141620] border border-neutral-700 rounded-lg pl-8 pr-2.5 py-1.5 text-white focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-neutral-300 uppercase mb-1">
                Efectivos (Soldados/Agentes)
              </label>
              <input
                type="number"
                min={1}
                max={50}
                required
                value={personnel}
                onChange={(e) => setPersonnel(parseInt(e.target.value) || 1)}
                className="w-full bg-[#141620] border border-neutral-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-yellow-400"
              />
            </div>
          </div>

          {/* Security & Comms Row: PIN, Frequency, Operational Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-xl bg-[#10121a] border border-yellow-500/20">
            <div>
              <label className="block text-[10px] font-bold text-yellow-400 uppercase mb-1 flex items-center justify-between">
                <span>CONTRASEÑA / PIN DE ACCESO *</span>
                <span className="text-[9px] text-neutral-400">Para entrar a su módulo</span>
              </label>
              <div className="relative flex items-center">
                <Key className="w-3.5 h-3.5 text-yellow-500 absolute left-2.5" />
                <input
                  type={showPin ? 'text' : 'password'}
                  required
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="e.g. 1234"
                  className="w-full bg-[#181a26] border border-yellow-500/40 rounded-lg pl-8 pr-8 py-1.5 text-yellow-300 font-bold focus:outline-none focus:border-yellow-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-2 text-neutral-400 hover:text-white"
                >
                  {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-neutral-300 uppercase mb-1">
                Canal / Frecuencia VHF
              </label>
              <div className="relative">
                <Radio className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  required
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  placeholder="e.g. 142.850 MHz"
                  className="w-full bg-[#181a26] border border-neutral-700 rounded-lg pl-8 pr-2.5 py-1.5 text-white focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-neutral-300 uppercase mb-1">
                Estado Operacional
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-[#181a26] border border-neutral-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-yellow-400 font-bold"
              >
                <option value="PATROLLING">🟢 PATRULLAJE ACTIVO (PATROLLING)</option>
                <option value="INTERCEPTING">🟠 INTERDICCIÓN EN CURSO (INTERCEPTING)</option>
                <option value="STATIONARY">🔵 PUESTO DE CONTROL ESTACIONARIO</option>
                <option value="OFFLINE">🔴 EN BASE / FUERA DE LÍNEA (OFFLINE)</option>
              </select>
            </div>
          </div>

          {/* Coordinates and Geographical Presets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-neutral-300 uppercase">
                Sector y Coordenadas Geográficas (DMS)
              </label>
              <span className="text-[9px] text-neutral-500">
                Seleccione un hito preestablecido o ingrese manualmente
              </span>
            </div>

            {/* Quick Sector Presets Buttons */}
            <div className="flex flex-wrap gap-1.5">
              {SECTOR_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className={`px-2 py-1 rounded text-[10px] border transition-all cursor-pointer ${
                    sector === p.name 
                      ? 'bg-yellow-500/20 border-yellow-500/60 text-yellow-300 font-bold' 
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                  }`}
                >
                  {p.name.split('-')[0].trim()}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] text-neutral-400 uppercase mb-0.5">Nombre de Sector / Hito</label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    required
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    placeholder="e.g. Salar de Coipasa - Hito XIX"
                    className="w-full bg-[#141620] border border-neutral-700 rounded-lg pl-8 pr-2.5 py-1.5 text-white focus:outline-none focus:border-yellow-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] text-neutral-400 uppercase mb-0.5">Coordenadas Lat / Lon</label>
                <input
                  type="text"
                  required
                  value={coordinates}
                  onChange={(e) => setCoordinates(e.target.value)}
                  placeholder={'e.g. 19°13\'10"S 68°35\'50"W'}
                  className="w-full bg-[#141620] border border-neutral-700 rounded-lg px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>
          </div>

          {/* Supplies Gauges */}
          <div className="grid grid-cols-3 gap-3 p-2.5 rounded-xl bg-[#0f1118] border border-neutral-800">
            <div>
              <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-1">
                <span className="flex items-center gap-1"><Battery className="w-3 h-3 text-emerald-400" /> Batería Terminal</span>
                <span className="font-bold text-white">{battery}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                value={battery}
                onChange={(e) => setBattery(parseInt(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-1">
                <span className="flex items-center gap-1"><Fuel className="w-3 h-3 text-amber-400" /> Combustible Vehicular</span>
                <span className="font-bold text-white">{fuel}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={fuel}
                onChange={(e) => setFuel(parseInt(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-1">
                <span className="flex items-center gap-1"><Crosshair className="w-3 h-3 text-blue-400" /> Munición / Dotación</span>
                <span className="font-bold text-white">{ammo}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={ammo}
                onChange={(e) => setAmmo(parseInt(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>
          </div>

          {/* Equipment Selector */}
          <div>
            <label className="block text-[10px] font-bold text-neutral-300 uppercase mb-1.5">
              Equipamiento Asignado a la Unidad
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-[#12141c] border border-neutral-800 rounded-lg">
              {AVAILABLE_EQUIPMENT.map(item => {
                const isSelected = equipment.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleToggleEquipment(item)}
                    className={`px-2 py-0.5 rounded text-[10px] transition-all cursor-pointer flex items-center gap-1 border ${
                      isSelected
                        ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300'
                        : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-yellow-400" />}
                    {item}
                  </button>
                );
              })}
            </div>

            {/* Custom Equipment Input */}
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={customEquipInput}
                onChange={(e) => setCustomEquipInput(e.target.value)}
                placeholder="Añadir otro equipo táctico..."
                className="flex-1 bg-[#141620] border border-neutral-700 rounded-lg px-2.5 py-1 text-white text-[11px] focus:outline-none focus:border-yellow-400"
              />
              <button
                type="button"
                onClick={handleAddCustomEquipment}
                className="px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-[11px] font-bold cursor-pointer"
              >
                + Añadir
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
            {mode === 'EDIT' && onDelete && patrol ? (
              <div>
                {!confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="px-3 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-900/50 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Replegar / Eliminar
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-red-400 font-bold">¿Confirmar?</span>
                    <button
                      type="button"
                      onClick={() => {
                        onDelete(patrol.id);
                        onClose();
                      }}
                      className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold cursor-pointer"
                    >
                      Sí, Replegar
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="px-2 py-1 rounded-lg bg-neutral-800 text-neutral-300 text-[11px] cursor-pointer"
                    >
                      No
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 text-xs font-bold transition-all cursor-pointer"
              >
                CANCELAR
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-black font-extrabold text-xs flex items-center gap-1.5 shadow-[0_0_20px_rgba(234,179,8,0.3)] transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                {mode === 'CREATE' ? 'DESPLEGAR PATRULLA' : 'GUARDAR CAMBIOS'}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
