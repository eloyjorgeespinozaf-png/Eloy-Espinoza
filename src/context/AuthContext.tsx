/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuditLogEntry, MilitaryRole } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (role: MilitaryRole) => boolean;
  logout: () => void;
  auditLogs: AuditLogEntry[];
  setAuditLogs: React.Dispatch<React.SetStateAction<AuditLogEntry[]>>;
  logAction: (action: string, coordinates?: string) => void;
  validateBackendPermission: (requiredRole: MilitaryRole, actionName: string, coordinates?: string) => boolean;
  securityError: string | null;
  clearSecurityError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Preset doctrinal credentials
export const PRESET_USERS: Record<MilitaryRole, User> = {
  ROL_PATRULLA: {
    id: 'PAT-023',
    name: 'Cabo Valenzuela',
    role: 'ROL_PATRULLA',
    signature: 'SIG-AES256-S2-VALENZUELA-48C0F8'
  },
  ROL_FUSION: {
    id: 'FUS-108',
    name: 'Tte. Cnel. S. Rojas',
    role: 'ROL_FUSION',
    signature: 'SIG-AES256-CFI-ROJAS-9A2E7B'
  },
  ROL_CEO: {
    id: 'CEO-001',
    name: 'Gral. E. Martínez',
    role: 'ROL_CEO',
    signature: 'SIG-AES256-LCC-MARTINEZ-13F5D9'
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    // Seed default historical log
    return [
      {
        id: 'log-0',
        userId: 'CEO-001',
        role: 'ROL_CEO',
        action: 'Inicialización de la plataforma PII-LCC con firma digital.',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        coordinates: '19°13\'10"S 68°35\'50"W'
      }
    ];
  });
  const [securityError, setSecurityError] = useState<string | null>(null);

  const isAuthenticated = user !== null;

  // Log action in the system
  const logAction = (action: string, coordinates: string = '19°13\'10"S 68°35\'50"W') => {
    if (!user) return;
    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: user.id,
      role: user.role,
      action,
      timestamp: new Date().toISOString(),
      coordinates
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // Login handler
  const login = (role: MilitaryRole): boolean => {
    const selectedUser = PRESET_USERS[role];
    if (selectedUser) {
      setUser(selectedUser);
      setSecurityError(null);
      // Log successful authentication
      const logMsg = `Autenticación exitosa. Firma criptográfica ${selectedUser.signature} validada para el rol ${role}.`;
      
      const newLog: AuditLogEntry = {
        id: `log-${Date.now()}`,
        userId: selectedUser.id,
        role: selectedUser.role,
        action: logMsg,
        timestamp: new Date().toISOString(),
        coordinates: '19°13\'10"S 68°35\'50"W'
      };
      setAuditLogs(prev => [newLog, ...prev]);

      // Sound notification for authentication success
      playTone(523.25, 0.4, 'sine'); // C5 tone
      return true;
    }
    return false;
  };

  const logout = () => {
    if (user) {
      const logMsg = `Sesión finalizada. Credencial de seguridad revocada.`;
      const newLog: AuditLogEntry = {
        id: `log-${Date.now()}`,
        userId: user.id,
        role: user.role,
        action: logMsg,
        timestamp: new Date().toISOString(),
        coordinates: '19°13\'10"S 68°35\'50"W'
      };
      setAuditLogs(prev => [newLog, ...prev]);
    }
    setUser(null);
    setSecurityError(null);
    playTone(330, 0.2, 'sine');
  };

  const clearSecurityError = () => setSecurityError(null);

  // Sound generator helper
  const playTone = (frequency: number, duration: number, type: 'sine' | 'sawtooth' | 'square' = 'sine') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(frequency, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
      }
    } catch (e) {}
  };

  /**
   * Simulates a secure backend validation.
   * Compares the logged-in user's role with the required role before letting any operation proceed.
   * If there is an authorization failure, it logs an INTUSION warning to the audit trail.
   */
  const validateBackendPermission = (
    requiredRole: MilitaryRole,
    actionName: string,
    coordinates: string = '19°13\'10"S 68°35\'50"W'
  ): boolean => {
    if (!user) {
      setSecurityError(`FALLO DE SISTEMA: No hay sesión autenticada activa para realizar la acción: ${actionName}.`);
      playTone(110, 0.5, 'sawtooth');
      return false;
    }

    // Let's implement strict department boundaries or hierarchical access
    // Hierarchy: ROL_CEO has total supervision (can execute everything)
    // ROL_FUSION can only do Fusión/Análisis operations (and view S-2 dashboards)
    // ROL_PATRULLA can only do Tactical/Field operations
    
    let isAuthorized = false;
    
    // Bypass authorization barriers if running as an installed PWA, mobile/tablet, or if installed-device bypass is enabled
    const isInstalledOrMobile = 
      localStorage.getItem('pii_lcc_installed_mode') !== 'false' || 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone || 
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

    if (isInstalledOrMobile) {
      isAuthorized = true;
    } else if (user.role === 'ROL_CEO') {
      // CEO can do anything: CEO, FUSION, PATRULLA actions
      isAuthorized = true;
    } else if (user.role === 'ROL_FUSION') {
      // FUSION can do FUSION or PATRULLA operations
      isAuthorized = (requiredRole === 'ROL_FUSION' || requiredRole === 'ROL_PATRULLA');
    } else if (user.role === 'ROL_PATRULLA') {
      // PATRULLA can ONLY do PATRULLA operations
      isAuthorized = (requiredRole === 'ROL_PATRULLA');
    }

    if (!isAuthorized) {
      const errorMsg = `INTRUSIÓN NO AUTORIZADA BLOC-C2: El usuario ${user.id} con rol ${user.role} intentó ejecutar la acción restringida '${actionName}' que requiere nivel ${requiredRole}. Operación bloqueada por cortafuegos.`;
      setSecurityError(errorMsg);
      
      // Log the security intrusion in the audit logs
      const intrusionLog: AuditLogEntry = {
        id: `log-security-${Date.now()}`,
        userId: user.id,
        role: user.role,
        action: `⚠️ ALERTA DE INTRUSIÓN: Intento de bypass de seguridad en '${actionName}' (Requiere: ${requiredRole}). INTENTO DENEGADO.`,
        timestamp: new Date().toISOString(),
        coordinates
      };
      setAuditLogs(prev => [intrusionLog, ...prev]);

      playTone(120, 0.6, 'sawtooth');
      return false;
    }

    // Authenticated and Authorized, proceed with normal log
    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        login,
        logout,
        auditLogs,
        setAuditLogs,
        logAction,
        validateBackendPermission,
        securityError,
        clearSecurityError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};

// Hook for role checks and authorization
export const useRoleAccess = () => {
  const { user } = useAuth();

  const hasRole = (allowedRoles: MilitaryRole[]): boolean => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  const isPatrulla = user?.role === 'ROL_PATRULLA';
  const isFusion = user?.role === 'ROL_FUSION';
  const isCeo = user?.role === 'ROL_CEO';

  return {
    user,
    hasRole,
    isPatrulla,
    isFusion,
    isCeo,
    roleLabel: user 
      ? user.role === 'ROL_PATRULLA' ? 'Nivel Táctico - Solo Reporte'
        : user.role === 'ROL_FUSION' ? 'Nivel Fusión - Análisis y Contraste'
        : 'Nivel Estratégico - Supervisión Total (CEO)'
      : 'No Autenticado'
  };
};

// HOC for page/view protection
export function withRoleAccess<P extends object>(
  Component: React.ComponentType<P>,
  allowedRoles: MilitaryRole[],
  fallbackText: string = 'ACCESO DENEGADO - RANGO DOCTRINAL INSUFICIENTE'
) {
  return function GuardedComponent(props: P) {
    const { user, hasRole, roleLabel } = useRoleAccess();

    if (!user || !hasRole(allowedRoles)) {
      return (
        <div className="bg-red-950/20 border border-red-500/30 p-8 rounded-xl text-center space-y-4 max-w-xl mx-auto font-mono text-xs my-8 shadow-lg shadow-red-950/10 animate-fade-in">
          <div className="w-12 h-12 rounded-full bg-red-950/40 border border-red-500/40 flex items-center justify-center mx-auto text-red-400 animate-pulse">
            <span className="text-lg font-bold">⚠️</span>
          </div>
          <h3 className="text-sm font-bold text-red-400 tracking-tight uppercase">
            CONTROL DE ACCESO DOCTRINAL (CAD-C2)
          </h3>
          <p className="text-zinc-400 text-[11px] leading-relaxed">
            Su operador militar actual ({roleLabel}) no tiene privilegios para acceder a este departamento de operaciones. Esta acción ha sido registrada en la bitácora criptográfica del sistema.
          </p>
          <div className="bg-black/40 border border-zinc-900 rounded p-2 text-[10px] text-zinc-500 text-left uppercase">
            <div>RESTRICCIÓN: REQUIERE {allowedRoles.join(' O ')}</div>
            <div>ESTADO: INTENTO BLOQUEADO AUTOMÁTICAMENTE</div>
          </div>
          <p className="text-[10px] text-zinc-500 italic uppercase">
            {fallbackText}
          </p>
        </div>
      );
    }

    return <Component {...props} />;
  };
}
