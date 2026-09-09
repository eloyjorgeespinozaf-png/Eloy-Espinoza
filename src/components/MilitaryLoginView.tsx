/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Radio, 
  Zap, 
  Navigation, 
  Lock, 
  Unlock, 
  Key, 
  User as UserIcon, 
  Terminal, 
  CheckCircle2, 
  AlertTriangle, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Volume2, 
  VolumeX, 
  Cpu, 
  Fingerprint, 
  Crosshair, 
  ArrowRight,
  ShieldCheck,
  Radar
} from 'lucide-react';
import { MilitaryRole } from '../types';
import { useAuth, PRESET_CREDENTIALS, PRESET_USERS } from '../context/AuthContext';
import { playSyntheticBeep } from '../utils/audio';
import { GamerFontSelector } from './GamerFontSelector';
import { 
  FullDashboardBackground, 
  FullDashboardBackgroundControl, 
  useFullDashboardBackground 
} from './FullDashboardBackground';

interface MilitaryLoginViewProps {
  onLoginSuccess?: (role: MilitaryRole) => void;
}

export const MilitaryLoginView: React.FC<MilitaryLoginViewProps> = ({ onLoginSuccess }) => {
  const { loginWithCredentials, login } = useAuth();
  const fullBgState = useFullDashboardBackground();

  const [selectedRole, setSelectedRole] = useState<MilitaryRole>('ROL_CEO');
  const [username, setUsername] = useState<string>('ceo.mando');
  const [password, setPassword] = useState<string>('mando2026');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [authStep, setAuthStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [cryptoHash, setCryptoHash] = useState<string>('AES256-SHA512-SEC-INIT');

  // Rotate simulated crypto hash every few seconds for high-tech military immersion
  useEffect(() => {
    const interval = setInterval(() => {
      const hex = Math.random().toString(16).substring(2, 10).toUpperCase();
      setCryptoHash(`SEC-${selectedRole.replace('ROL_', '')}-${hex}`);
    }, 4000);
    return () => clearInterval(interval);
  }, [selectedRole]);

  // When selectedRole changes, prefill appropriate credentials for instant convenience
  const handleSelectRole = (role: MilitaryRole) => {
    setSelectedRole(role);
    setErrorMessage(null);

    const cred = PRESET_CREDENTIALS.find(c => c.role === role);
    if (cred) {
      setUsername(cred.username);
      setPassword(cred.defaultPassword);
    }

    if (soundEnabled) {
      playSyntheticBeep(440, 0.1, 'sine', 0.06);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!username.trim()) {
      setErrorMessage('INGRESE IDENTIFICADOR DE OPERADOR MILITAR.');
      if (soundEnabled) playSyntheticBeep(200, 0.25, 'sawtooth', 0.1);
      return;
    }

    if (!password) {
      setErrorMessage('INGRESE CONTRASEÑA CRIPTOGRÁFICA DE LA ESTACIÓN.');
      if (soundEnabled) playSyntheticBeep(200, 0.25, 'sawtooth', 0.1);
      return;
    }

    setIsAuthenticating(true);
    setAuthStep('VERIFICANDO FIRMA CRIPTOGRÁFICA...');

    if (soundEnabled) {
      playSyntheticBeep(520, 0.1, 'sine', 0.08);
    }

    setTimeout(() => {
      setAuthStep('VALIDANDO PROTOCOLO C4ISR // NIVEL DOCTRINAL...');
      if (soundEnabled) playSyntheticBeep(660, 0.1, 'sine', 0.08);

      setTimeout(() => {
        const res = loginWithCredentials(username, password, selectedRole);
        if (res.success) {
          setAuthStep('AUTORIZACIÓN CONFIRMADA. DESPLEGANDO TERMINAL...');
          if (soundEnabled) {
            playSyntheticBeep(880, 0.2, 'sine', 0.1);
          }
          setTimeout(() => {
            setIsAuthenticating(false);
            if (onLoginSuccess) onLoginSuccess(selectedRole);
          }, 450);
        } else {
          setIsAuthenticating(false);
          setErrorMessage(res.error || 'ERROR DE AUTENTICACIÓN. ACCESO DENEGADO.');
          if (soundEnabled) playSyntheticBeep(160, 0.35, 'sawtooth', 0.15);
        }
      }, 400);
    }, 350);
  };

  const handleDirectPresetLogin = (role: MilitaryRole) => {
    setSelectedRole(role);
    setErrorMessage(null);
    setIsAuthenticating(true);
    setAuthStep(`ENLACE DIRECTO: AUTENTICANDO ${role}...`);

    if (soundEnabled) {
      playSyntheticBeep(493.88, 0.12, 'sine', 0.08); // B4
    }

    setTimeout(() => {
      login(role);
      setIsAuthenticating(false);
      if (onLoginSuccess) onLoginSuccess(role);
    }, 350);
  };

  const currentCredential = PRESET_CREDENTIALS.find(c => c.role === selectedRole) || PRESET_CREDENTIALS[2];
  const activeUser = PRESET_USERS[selectedRole];

  // Tactical accent styling based on selected role
  const getRoleAccentClasses = (role: MilitaryRole) => {
    switch (role) {
      case 'ROL_BUSQUEDA':
        return {
          glow: 'shadow-[0_0_25px_rgba(234,179,8,0.15)]',
          border: 'border-yellow-600/60',
          text: 'text-yellow-400',
          bgLight: 'bg-yellow-500/10',
          badgeBg: 'bg-yellow-950/60 border-yellow-700/50 text-yellow-300',
          btnBg: 'bg-yellow-600 hover:bg-yellow-500 text-black',
          activeTab: 'bg-yellow-950/30 border-yellow-500/70 text-yellow-400 shadow-[0_0_12px_rgba(234,179,8,0.2)]'
        };
      case 'ROL_FUSION':
        return {
          glow: 'shadow-[0_0_25px_rgba(249,115,22,0.15)]',
          border: 'border-orange-600/60',
          text: 'text-orange-400',
          bgLight: 'bg-orange-500/10',
          badgeBg: 'bg-orange-950/60 border-orange-700/50 text-orange-300',
          btnBg: 'bg-orange-600 hover:bg-orange-500 text-black',
          activeTab: 'bg-orange-950/30 border-orange-500/70 text-orange-400 shadow-[0_0_12px_rgba(249,115,22,0.2)]'
        };
      case 'ROL_CEO':
        return {
          glow: 'shadow-[0_0_25px_rgba(59,130,246,0.15)]',
          border: 'border-blue-600/60',
          text: 'text-blue-400',
          bgLight: 'bg-blue-500/10',
          badgeBg: 'bg-blue-950/60 border-blue-700/50 text-blue-300',
          btnBg: 'bg-blue-600 hover:bg-blue-500 text-white',
          activeTab: 'bg-blue-950/30 border-blue-500/70 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.2)]'
        };
      case 'ROL_TERRENO':
      default:
        return {
          glow: 'shadow-[0_0_25px_rgba(16,185,129,0.15)]',
          border: 'border-emerald-600/60',
          text: 'text-emerald-400',
          bgLight: 'bg-emerald-500/10',
          badgeBg: 'bg-emerald-950/60 border-emerald-700/50 text-emerald-300',
          btnBg: 'bg-emerald-600 hover:bg-emerald-500 text-black',
          activeTab: 'bg-emerald-950/30 border-emerald-500/70 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
        };
    }
  };

  const currentAccent = getRoleAccentClasses(selectedRole);

  return (
    <div className="min-h-screen bg-[#070b0e] text-[#d1d5db] font-sans relative overflow-hidden flex flex-col justify-between selection:bg-[#2d3a29] selection:text-[#a7f3d0]">
      {/* Full Background: INTERFAZ C4ISR at 80% subtle contrast */}
      <FullDashboardBackground 
        settings={fullBgState.settings} 
        imageSrc={fullBgState.activeImageSrc} 
      />

      {/* Background Military Grid Pattern & Vignette */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(46, 75, 46, 0.15) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(46, 75, 46, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px'
        }}
      />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_40%,rgba(16,36,25,0.25)_0%,rgba(5,9,12,0.95)_75%)]" />

      {/* Top Security & Classification Banner */}
      <header className="relative z-10 w-full border-b border-[#1e2a22] bg-[#0a1014]/90 backdrop-blur-md px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping opacity-75" />
          <span className="text-emerald-400 font-bold tracking-widest uppercase text-[11px]">
            C4ISR-LCC // SEGURIDAD OPERACIONAL
          </span>
          <span className="hidden sm:inline-block text-[#3f5244]">|</span>
          <span className="hidden sm:inline-block text-[#708275] text-[10px]">
            DIRECTIVA DOCTRINAL MIL-STD-188-220
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden md:flex items-center gap-2 bg-[#0e161c] px-2.5 py-1 rounded border border-[#1e2c26] text-[10px] text-[#869b8b]">
            <Radar className="w-3 h-3 text-emerald-400 animate-spin" />
            <span>HASH: {cryptoHash}</span>
          </div>

          {/* Full Background Control Button */}
          <FullDashboardBackgroundControl 
            settings={fullBgState.settings}
            updateSettings={fullBgState.updateSettings}
            uploadDashboardImage={fullBgState.uploadDashboardImage}
            resetToDefault={fullBgState.resetToDefault}
          />

          {/* Videogame Font Selector in Login Screen */}
          <GamerFontSelector compact />

          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 rounded bg-[#131d18] border border-[#233529] text-[#869b8b] hover:text-emerald-400 transition-colors cursor-pointer"
            title={soundEnabled ? "Audio Táctico Activado" : "Audio Táctico Desactivado"}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* Main Authentication Terminal Hub */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 py-6 md:py-10 flex flex-col justify-center">
        {/* Header Title Section */}
        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#18261e] border border-[#2d4735] text-[#9bb8a3] text-[10px] font-mono tracking-widest uppercase">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>PLATAFORMA INTEGRADA DE INTELIGENCIA MILITAR // PII-LCC</span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-wider text-white uppercase font-heading gaming-title">
            TERMINAL DE ACCESO Y AUTENTICACIÓN
          </h1>
          <p className="text-xs sm:text-sm text-[#8c9f91] max-w-2xl mx-auto font-sans">
            Seleccione el órgano operativo de la cadena C4ISR para autenticar la terminal e iniciar la sesión con credenciales tácticas encriptadas.
          </p>
        </div>

        {/* 4 Official Military Organs Selector Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
          {PRESET_CREDENTIALS.map((cred) => {
            const isSelected = selectedRole === cred.role;
            const accent = getRoleAccentClasses(cred.role);

            return (
              <div
                key={cred.role}
                onClick={() => handleSelectRole(cred.role)}
                className={`relative rounded-xl border p-4 transition-all cursor-pointer select-none text-left flex flex-col justify-between ${
                  isSelected 
                    ? `bg-[#0f181c] ${accent.border} ${accent.glow} ring-1 ring-white/10` 
                    : 'bg-[#0a0f12]/80 border-[#1a2522] hover:border-[#2f4236] hover:bg-[#0c1417]'
                }`}
              >
                {/* Organ Classification Badge */}
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-lg ${isSelected ? accent.bgLight : 'bg-[#141e1a] text-[#718476]'}`}>
                    {cred.organNumber === 1 && <Radio className="w-4 h-4 text-yellow-400" />}
                    {cred.organNumber === 2 && <Shield className="w-4 h-4 text-orange-400" />}
                    {cred.organNumber === 3 && <Zap className="w-4 h-4 text-blue-400" />}
                    {cred.organNumber === 4 && <Navigation className="w-4 h-4 text-emerald-400" />}
                  </div>

                  <span className="text-[10px] font-mono font-bold tracking-widest px-2 py-0.5 rounded border border-[#2a3a30] text-[#869b8b] bg-[#0d1413]">
                    ORDEN #{cred.organNumber}
                  </span>
                </div>

                {/* Organ Content */}
                <div className="space-y-1 mb-3">
                  <h3 className={`text-sm font-bold font-mono tracking-tight ${isSelected ? 'text-white' : 'text-[#c0ccc4]'}`}>
                    {cred.title}
                  </h3>
                  <p className="text-[11px] text-[#788e80] line-clamp-2 leading-relaxed">
                    {cred.subtitle}
                  </p>
                </div>

                {/* Footer specs */}
                <div className="pt-3 border-t border-[#182620] space-y-1.5 text-[10px] font-mono">
                  <div className="flex items-center justify-between text-[#8ca393]">
                    <span>OFICIAL:</span>
                    <span className="text-white font-semibold">{cred.officer}</span>
                  </div>
                  <div className="flex items-center justify-between text-[#687e71]">
                    <span>AUTORIZACIÓN:</span>
                    <span className={isSelected ? accent.text : 'text-[#7d9385]'}>{cred.clearance}</span>
                  </div>
                </div>

                {/* Selection indicator reticle */}
                {isSelected && (
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase">ACTIVO</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Central Terminal Form Panel */}
        <div className={`w-full max-w-3xl mx-auto rounded-2xl border ${currentAccent.border} bg-[#0c1317]/95 backdrop-blur-xl p-5 sm:p-8 shadow-2xl relative transition-all`}>
          {/* Futuristic Corner Brackets */}
          <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-[#3c5443] pointer-events-none" />
          <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-[#3c5443] pointer-events-none" />
          <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-[#3c5443] pointer-events-none" />
          <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-[#3c5443] pointer-events-none" />

          {/* Organ Header Status */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-[#1b2823] mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#141f1a] border border-[#27382d] flex items-center justify-center text-emerald-400">
                <Terminal className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    {currentCredential.title}
                  </span>
                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded ${currentAccent.badgeBg} font-bold`}>
                    NIVEL 0{activeUser.clearanceLevel || 1}
                  </span>
                </div>
                <p className="text-[11px] text-[#73887a] font-mono">
                  ESTACIÓN: {activeUser.stationId || 'PUESTO-TÁCTICO'} // FIRMA: {activeUser.signature.substring(0, 18)}...
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 font-mono text-[10px] text-[#7f9486] bg-[#080d10] px-3 py-1.5 rounded-lg border border-[#1b2923]">
              <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
              <span>19°13'10"S 68°35'50"W</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleManualSubmit} className="space-y-5">
            {errorMessage && (
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/50 text-red-300 text-xs font-mono flex items-center gap-2.5 animate-shake">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Username Input */}
              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-mono font-bold text-[#b4c4ba] uppercase tracking-wider">
                  Identificador / Usuario Militar
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#526a5c]">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ej: ceo.mando, busqueda.s2"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#080d10] border border-[#213129] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-white font-mono text-xs placeholder:text-[#42554a] outline-none transition-all"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-mono font-bold text-[#b4c4ba] uppercase tracking-wider">
                  Clave Criptográfica / Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#526a5c]">
                    <Key className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-[#080d10] border border-[#213129] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-white font-mono text-xs placeholder:text-[#42554a] outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#526a5c] hover:text-[#8ba294] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Doctrinal Credentials helper banner */}
            <div className="p-3 rounded-lg bg-[#090e11] border border-[#1b2b23] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-2 text-[#7f9687]">
                <Fingerprint className="w-4 h-4 text-emerald-400" />
                <span>Credenciales Doctrinales:</span>
                <span className="text-white font-bold">{currentCredential.username}</span>
                <span className="text-[#455c4e]">/</span>
                <span className="text-emerald-400 font-bold">{currentCredential.defaultPassword}</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setUsername(currentCredential.username);
                  setPassword(currentCredential.defaultPassword);
                  if (soundEnabled) playSyntheticBeep(600, 0.1, 'sine', 0.06);
                }}
                className="text-[11px] text-[#93ab9c] hover:text-white font-bold underline decoration-emerald-600 underline-offset-4 cursor-pointer"
              >
                Auto-completar Credenciales
              </button>
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="submit"
                disabled={isAuthenticating}
                className={`w-full sm:flex-1 py-3 px-6 rounded-lg font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
                  isAuthenticating 
                    ? 'bg-[#18261e] text-[#6f8576] border border-[#2c4033] cursor-wait' 
                    : `${currentAccent.btnBg} active:scale-[0.99]`
                }`}
              >
                {isAuthenticating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{authStep || 'VERIFICANDO CREDENCIALES...'}</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>AUTENTICAR TERMINAL // ENLACE SEGURO</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>

              {/* Direct Quick 1-Click login button */}
              <button
                type="button"
                onClick={() => handleDirectPresetLogin(selectedRole)}
                className="w-full sm:w-auto py-3 px-4 rounded-lg bg-[#111a15] hover:bg-[#18241e] border border-[#233328] text-[#869b8b] hover:text-white font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2"
                title="Acceso directo validado doctrinalmente sin verificación manual"
              >
                <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Acceso Rápido</span>
              </button>
            </div>
          </form>
        </div>

        {/* Quick Organ Switcher Footer Strip */}
        <div className="mt-8 text-center">
          <div className="inline-flex flex-wrap items-center justify-center gap-2 p-1.5 rounded-xl bg-[#090d10] border border-[#19241e] font-mono text-[11px]">
            <span className="px-2 text-[#566e60] uppercase text-[10px]">Acceso Inmediato:</span>
            {PRESET_CREDENTIALS.map((c) => (
              <button
                key={c.role}
                type="button"
                onClick={() => handleDirectPresetLogin(c.role)}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedRole === c.role 
                    ? 'bg-[#1c2921] text-emerald-300 font-bold border border-[#2f4738]' 
                    : 'text-[#7e9486] hover:text-white hover:bg-[#131d17]'
                }`}
              >
                <span>{c.organNumber}. {c.role.replace('ROL_', '')}</span>
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Bottom Classification Bar */}
      <footer className="relative z-10 w-full border-t border-[#1a251f] bg-[#070b0e] px-4 py-3 text-center text-[10px] font-mono text-[#586e60] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>SISTEMA DE MANDO Y CONTROL C4ISR-LCC // DIRECTIVA DE SEGURIDAD OPERACIONAL</span>
        </div>
        <div className="flex items-center gap-4">
          <span>LATENCIA: 14ms</span>
          <span>ESTACIÓN ACTIVA: SUBSECTOR COLCHANE</span>
          <span>DISTRIBUCIÓN RESTRINGIDA</span>
        </div>
      </footer>
    </div>
  );
};
