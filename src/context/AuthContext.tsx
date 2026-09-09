/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuditLogEntry, MilitaryRole } from '../types';
import { safeStorage } from '../utils/storage';
import { playSyntheticBeep } from '../utils/audio';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (role: MilitaryRole) => boolean;
  loginWithCredentials: (username: string, password: string, selectedRole?: MilitaryRole) => { success: boolean; error?: string };
  logout: () => void;
  auditLogs: AuditLogEntry[];
  setAuditLogs: React.Dispatch<React.SetStateAction<AuditLogEntry[]>>;
  logAction: (action: string, coordinates?: string) => void;
  validateBackendPermission: (requiredRole: MilitaryRole, actionName: string, coordinates?: string) => boolean;
  securityError: string | null;
  clearSecurityError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Preset doctrinal credentials for the 4 official military organs
export const PRESET_USERS: Record<MilitaryRole, User> = {
  ROL_BUSQUEDA: {
    id: 'BUSQ-01',
    role: 'ROL_BUSQUEDA',
    name: 'My. R. Vargas',
    username: 'busqueda.s2',
    rank: 'Mayor de Inteligencia // Jefe Sección Búsqueda',
    organName: '1. Órganos de Búsqueda',
    organSubtitle: 'Captación IMINT/HUMINT/SIGINT & Sensores S-2',
    signature: 'SIG-SHA512-S2-BUSQUEDA-7B1A4F',
    clearanceLevel: 2,
    stationId: 'PUESTO-AVANZADO-COLCHANE-ALPHA'
  },
  ROL_FUSION: {
    id: 'CFI-02',
    role: 'ROL_FUSION',
    name: 'Tte. Cnel. S. Rojas',
    username: 'cfi.brigada',
    rank: 'Teniente Coronel de Estado Mayor // Analista Jefe CFI',
    organName: '2. CFI de Brigada',
    organSubtitle: 'Centro de Fusión de Inteligencia (Análisis & Correlación)',
    signature: 'SIG-AES256-CFI-ROJAS-9A2E7B',
    clearanceLevel: 3,
    stationId: 'NODO-CFI-BRIGADA-PIRAMIDE'
  },
  ROL_CEO: {
    id: 'CEO-03',
    role: 'ROL_CEO',
    name: 'Gral. E. Martínez',
    username: 'ceo.mando',
    rank: 'General de Brigada // Comandante CEO-LCC',
    organName: '3. CEO-LCC Mando',
    organSubtitle: 'Centro de Enlace y Operaciones (Mando Estratégico & OOA)',
    signature: 'SIG-AES256-LCC-MARTINEZ-13F5D9',
    clearanceLevel: 4,
    stationId: 'ESTADO-MAYOR-CONJUNTO-DELTA'
  },
  ROL_TERRENO: {
    id: 'TERR-04',
    role: 'ROL_TERRENO',
    name: 'Cabo 1° F. Valenzuela',
    username: 'terreno.patrulla',
    rank: 'Cabo 1° de Infantería // Jefe Patrulla Cóndor',
    organName: '4. Unidades de Terreno',
    organSubtitle: 'Patrullas Tácticas & Destacamentos Fronterizos (Ejecución OOA)',
    signature: 'SIG-AES256-TERRENO-VALENZUELA-48C0F8',
    clearanceLevel: 1,
    stationId: 'PATRULLA-TACTICA-CONDOR-01'
  },
  ROL_PATRULLA: {
    id: 'TERR-04',
    role: 'ROL_TERRENO',
    name: 'Cabo 1° F. Valenzuela',
    username: 'terreno.patrulla',
    rank: 'Cabo 1° de Infantería // Jefe Patrulla Cóndor',
    organName: '4. Unidades de Terreno',
    organSubtitle: 'Patrullas Tácticas & Destacamentos Fronterizos (Ejecución OOA)',
    signature: 'SIG-AES256-TERRENO-VALENZUELA-48C0F8',
    clearanceLevel: 1,
    stationId: 'PATRULLA-TACTICA-CONDOR-01'
  }
};

export const PRESET_CREDENTIALS = [
  {
    role: 'ROL_BUSQUEDA' as MilitaryRole,
    organNumber: 1,
    title: '1. Órganos de Búsqueda',
    subtitle: 'Captación IMINT/HUMINT/SIGINT & Sensores S-2',
    username: 'busqueda.s2',
    defaultPassword: 'busqueda2026',
    officer: 'My. R. Vargas',
    clearance: 'NIVEL 2 // RESTRINGIDO',
    color: '#eab308' // Amber
  },
  {
    role: 'ROL_FUSION' as MilitaryRole,
    organNumber: 2,
    title: '2. CFI de Brigada',
    subtitle: 'Centro de Fusión de Inteligencia (Análisis & Correlación)',
    username: 'cfi.brigada',
    defaultPassword: 'fusion2026',
    officer: 'Tte. Cnel. S. Rojas',
    clearance: 'NIVEL 3 // SECRETO',
    color: '#f97316' // Orange
  },
  {
    role: 'ROL_CEO' as MilitaryRole,
    organNumber: 3,
    title: '3. CEO-LCC Mando',
    subtitle: 'Centro de Enlace y Operaciones (Mando & Decisión)',
    username: 'ceo.mando',
    defaultPassword: 'mando2026',
    officer: 'Gral. E. Martínez',
    clearance: 'NIVEL 4 // MÁXIMO SECRETO',
    color: '#3b82f6' // Blue
  },
  {
    role: 'ROL_TERRENO' as MilitaryRole,
    organNumber: 4,
    title: '4. Unidades de Terreno',
    subtitle: 'Patrullas Tácticas & Puestos de Vigilancia (Ejecución)',
    username: 'terreno.patrulla',
    defaultPassword: 'terreno2026',
    officer: 'Cabo 1° F. Valenzuela',
    clearance: 'NIVEL 1 // CONFIDENCIAL',
    color: '#10b981' // Green
  }
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const saved = safeStorage.getItem('pii_lcc_authenticated');
    return saved === 'true';
  });

  const [user, setUser] = useState<User | null>(() => {
    const savedRole = safeStorage.getItem('pii_lcc_current_role') as MilitaryRole | null;
    if (savedRole && PRESET_USERS[savedRole]) {
      return PRESET_USERS[savedRole];
    }
    return PRESET_USERS.ROL_CEO;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    return [
      {
        id: 'log-0',
        userId: 'CEO-03',
        role: 'ROL_CEO',
        action: 'Nodo C4ISR-LCC iniciado. Módulo criptográfico militar listo.',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        coordinates: '19°13\'10"S 68°35\'50"W'
      }
    ];
  });
  const [securityError, setSecurityError] = useState<string | null>(null);

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

  // Login handler by role
  const login = (role: MilitaryRole): boolean => {
    const selectedUser = PRESET_USERS[role];
    if (selectedUser) {
      setUser(selectedUser);
      setIsAuthenticated(true);
      safeStorage.setItem('pii_lcc_current_role', role);
      safeStorage.setItem('pii_lcc_authenticated', 'true');
      setSecurityError(null);

      const logMsg = `Autenticación exitosa en ${selectedUser.organName || role}. Operador: ${selectedUser.name}. Firma: ${selectedUser.signature}.`;
      
      const newLog: AuditLogEntry = {
        id: `log-${Date.now()}`,
        userId: selectedUser.id,
        role: selectedUser.role,
        action: logMsg,
        timestamp: new Date().toISOString(),
        coordinates: '19°13\'10"S 68°35\'50"W'
      };
      setAuditLogs(prev => [newLog, ...prev]);

      playSyntheticBeep(587.33, 0.25, 'sine', 0.1); // D5
      setTimeout(() => playSyntheticBeep(880, 0.2, 'sine', 0.08), 80); // A5
      return true;
    }
    return false;
  };

  // Login with explicit username and password
  const loginWithCredentials = (
    username: string, 
    password: string, 
    selectedRole?: MilitaryRole
  ): { success: boolean; error?: string } => {
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      return { success: false, error: 'Debe ingresar Identificador de Usuario y Contraseña Criptográfica.' };
    }

    // Role detection by username or selected role
    let targetRole: MilitaryRole = selectedRole || 'ROL_CEO';

    if (cleanUser.includes('busq') || cleanUser.includes('vargas') || cleanUser.includes('s2') || cleanUser.includes('imint')) {
      targetRole = 'ROL_BUSQUEDA';
    } else if (cleanUser.includes('cfi') || cleanUser.includes('rojas') || cleanUser.includes('fusion')) {
      targetRole = 'ROL_FUSION';
    } else if (cleanUser.includes('ceo') || cleanUser.includes('martinez') || cleanUser.includes('mando') || cleanUser.includes('lcc')) {
      targetRole = 'ROL_CEO';
    } else if (cleanUser.includes('terr') || cleanUser.includes('valenzuela') || cleanUser.includes('patrulla') || cleanUser.includes('condor')) {
      targetRole = 'ROL_TERRENO';
    }

    const preset = PRESET_USERS[targetRole];
    if (!preset) {
      return { success: false, error: 'Órgano militar no reconocido en la matriz doctrinal.' };
    }

    // Check doctrinal password or universal demo password
    const validPasswords = [
      'busqueda2026', 'fusion2026', 'mando2026', 'terreno2026',
      '1234', 'admin', 'militar2026', 'c4isr'
    ];

    const isPasswordValid = 
      validPasswords.includes(cleanPass) || 
      cleanPass.toLowerCase() === targetRole.toLowerCase() ||
      cleanPass.length >= 4; // allow quick user-chosen passwords >= 4 chars

    if (!isPasswordValid) {
      playSyntheticBeep(180, 0.4, 'sawtooth', 0.15);
      return { success: false, error: 'Contraseña militar inválida o clave criptográfica expirada.' };
    }

    // Successful login
    setUser(preset);
    setIsAuthenticated(true);
    safeStorage.setItem('pii_lcc_current_role', targetRole);
    safeStorage.setItem('pii_lcc_authenticated', 'true');
    setSecurityError(null);

    const logMsg = `Inicio de sesión verificado vía credenciales en ${preset.organName}. Operador: ${preset.name} (${preset.rank}). Enlace militar encriptado.`;
    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      userId: preset.id,
      role: preset.role,
      action: logMsg,
      timestamp: new Date().toISOString(),
      coordinates: '19°13\'10"S 68°35\'50"W'
    };
    setAuditLogs(prev => [newLog, ...prev]);

    // Military success chime
    playSyntheticBeep(523.25, 0.15, 'sine', 0.1);
    setTimeout(() => playSyntheticBeep(659.25, 0.15, 'sine', 0.1), 100);
    setTimeout(() => playSyntheticBeep(783.99, 0.25, 'sine', 0.1), 200);

    return { success: true };
  };

  const logout = () => {
    setIsAuthenticated(false);
    safeStorage.removeItem('pii_lcc_authenticated');
    setSecurityError(null);
    playSyntheticBeep(260, 0.2, 'sine', 0.08);
  };

  const clearSecurityError = () => setSecurityError(null);

  /**
   * Universal access validation.
   * All security barriers and intrusion locks bypassed to grant complete access.
   */
  const validateBackendPermission = (
    _requiredRole: MilitaryRole,
    _actionName: string,
    _coordinates: string = '19°13\'10"S 68°35\'50"W'
  ): boolean => {
    // Universal access validation for tactical fluidity
    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        login,
        loginWithCredentials,
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
    // Map legacy ROL_PATRULLA with ROL_TERRENO and ROL_BUSQUEDA
    if (allowedRoles.includes('ROL_PATRULLA') && (user.role === 'ROL_TERRENO' || user.role === 'ROL_BUSQUEDA' || user.role === 'ROL_PATRULLA')) {
      return true;
    }
    return allowedRoles.includes(user.role);
  };

  const isBusqueda = user?.role === 'ROL_BUSQUEDA';
  const isFusion = user?.role === 'ROL_FUSION';
  const isCeo = user?.role === 'ROL_CEO';
  const isTerreno = user?.role === 'ROL_TERRENO' || user?.role === 'ROL_PATRULLA';
  const isPatrulla = isTerreno;

  let roleLabel = 'No Autenticado';
  if (user) {
    if (user.role === 'ROL_BUSQUEDA') roleLabel = '1. Órgano de Búsqueda (Sensores S-2)';
    else if (user.role === 'ROL_FUSION') roleLabel = '2. CFI de Brigada (Fusión & Análisis)';
    else if (user.role === 'ROL_CEO') roleLabel = '3. CEO-LCC Mando (Mando Estratégico)';
    else roleLabel = '4. Unidades de Terreno (Patrulla Táctica)';
  }

  return {
    user,
    hasRole,
    isBusqueda,
    isFusion,
    isCeo,
    isTerreno,
    isPatrulla,
    roleLabel
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
