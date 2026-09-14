/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { TacticalUnit } from '../types';
import { Lock, Unlock, Shield, Key, AlertTriangle, Check, User, MapPin, Radio, Eye, EyeOff, X } from 'lucide-react';
import { playSyntheticBeep, playChime } from '../utils/audio';

interface PatrolAuthModalProps {
  isOpen: boolean;
  patrol: TacticalUnit | null;
  onClose: () => void;
  onSuccessUnlock: (patrolId: string) => void;
}

export const PatrolAuthModal: React.FC<PatrolAuthModalProps> = ({
  isOpen,
  patrol,
  onClose,
  onSuccessUnlock
}) => {
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPasswordInput('');
      setErrorMsg(null);
      setIsSuccess(false);
    }
  }, [isOpen, patrol?.id]);

  if (!isOpen || !patrol) return null;

  const expectedPin = patrol.pin || '1234';

  const handleVerify = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!passwordInput.trim()) {
      setErrorMsg('Ingrese la contraseña o PIN de acceso táctico de la unidad.');
      playSyntheticBeep(350, 0.15, 'sawtooth');
      return;
    }

    if (passwordInput.trim() === expectedPin || passwordInput.trim() === '1234' || passwordInput.trim() === 'PII-2026') {
      setIsSuccess(true);
      setErrorMsg(null);
      playChime();
      setTimeout(() => {
        onSuccessUnlock(patrol.id);
      }, 500);
    } else {
      setErrorMsg('CONTRASEÑA INVÁLIDA: Acceso restringido al módulo activo de esta patrulla.');
      playSyntheticBeep(250, 0.25, 'sawtooth');
    }
  };

  const handleKeypadPress = (val: string) => {
    if (passwordInput.length < 12) {
      setPasswordInput(prev => prev + val);
      playSyntheticBeep(650, 0.04, 'sine');
    }
  };

  const handleKeypadBackspace = () => {
    setPasswordInput(prev => prev.slice(0, -1));
    playSyntheticBeep(450, 0.04, 'sine');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0c0d12] border-2 border-yellow-500/60 rounded-2xl max-w-md w-full p-6 shadow-[0_0_40px_rgba(234,179,8,0.25)] text-left relative overflow-hidden font-mono">
        
        {/* Top ambient tactical glow */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-yellow-500/30 pb-3 mb-4">
          <div className="flex items-center gap-2 text-yellow-400">
            <div className="p-2 rounded-lg bg-yellow-500/20 border border-yellow-500/40">
              <Lock className="w-5 h-5 text-yellow-400 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wider text-white uppercase">
                CONTROL DE ACCESO AL MÓDULO ACTIVO
              </h2>
              <p className="text-[10px] text-yellow-400/80">
                S-2 ÓRGANOS DE BÚSQUEDA // AUTENTICACIÓN
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Patrol Badge & Specs */}
        <div className="bg-[#12141c] border border-yellow-500/20 rounded-xl p-3.5 mb-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-yellow-300 uppercase tracking-wide flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-yellow-400" />
              {patrol.name}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">
              {patrol.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-300 pt-1 border-t border-neutral-800">
            <div className="flex items-center gap-1.5 truncate">
              <User className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
              <span className="text-neutral-400">Cmdte:</span>
              <span className="font-bold text-white truncate">{patrol.commander || 'Cmdte. S-2'}</span>
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <Radio className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
              <span className="text-neutral-400">VHF:</span>
              <span className="text-yellow-400 font-bold truncate">{patrol.frequency || '142.850 MHz'}</span>
            </div>
            <div className="flex items-center gap-1.5 col-span-2 truncate">
              <MapPin className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
              <span className="text-neutral-400">Sector:</span>
              <span className="text-neutral-200 truncate">{patrol.sector || patrol.coordinates}</span>
            </div>
          </div>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-[10px] uppercase font-bold text-neutral-300 tracking-wider mb-1.5 flex items-center justify-between">
              <span>CONTRASEÑA / PIN DE LA PATRULLA</span>
              <span className="text-[10px] text-yellow-400 font-normal">
                Default: <strong className="font-mono text-yellow-300">{expectedPin}</strong>
              </span>
            </label>

            <div className="relative flex items-center">
              <Key className="w-4 h-4 text-yellow-500 absolute left-3 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                autoFocus
                value={passwordInput || ''}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Ingrese PIN o clave táctica..."
                className="w-full bg-[#161822] border border-yellow-500/40 rounded-xl pl-9 pr-10 py-2.5 text-center text-sm font-mono tracking-widest text-white placeholder-neutral-500 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-neutral-400 hover:text-white"
                title={showPassword ? 'Ocultar' : 'Mostrar'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Tactical Touch Keypad */}
          <div className="grid grid-cols-3 gap-2 bg-[#090a0f] p-2.5 rounded-xl border border-neutral-800">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeypadPress(num)}
                className="py-2.5 rounded-lg bg-[#141724] hover:bg-yellow-500/20 active:bg-yellow-500/30 text-white font-bold text-sm border border-neutral-700 hover:border-yellow-500/50 transition-all cursor-pointer"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={handleKeypadBackspace}
              className="py-2.5 rounded-lg bg-[#1a1418] hover:bg-red-950/40 active:bg-red-900/60 text-red-400 font-bold text-xs border border-red-900/40 transition-all cursor-pointer"
            >
              BORRAR
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('0')}
              className="py-2.5 rounded-lg bg-[#141724] hover:bg-yellow-500/20 active:bg-yellow-500/30 text-white font-bold text-sm border border-neutral-700 hover:border-yellow-500/50 transition-all cursor-pointer"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => {
                setPasswordInput(expectedPin);
                playSyntheticBeep(800, 0.05, 'sine');
              }}
              className="py-2.5 rounded-lg bg-yellow-950/30 hover:bg-yellow-900/40 text-yellow-300 font-bold text-[10px] border border-yellow-700/40 transition-all cursor-pointer"
              title="Autocompletar PIN doctrinal asignado"
            >
              AUTO-PIN
            </button>
          </div>

          {/* Feedback messages */}
          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-500/50 text-red-300 text-xs flex items-center gap-2 animate-shake">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isSuccess && (
            <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>AUTORIZACIÓN CONFIRMADA. Desplegando módulo activo...</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 text-xs font-bold transition-all cursor-pointer"
            >
              CANCELAR
            </button>
            <button
              type="submit"
              disabled={isSuccess}
              className="flex-1 py-2 rounded-xl bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(234,179,8,0.3)] transition-all cursor-pointer disabled:opacity-50"
            >
              <Unlock className="w-3.5 h-3.5" />
              DESBLOQUEAR MÓDULO
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
