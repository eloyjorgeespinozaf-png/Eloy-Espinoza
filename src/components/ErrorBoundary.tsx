/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error inside PII-LCC Tactical Workspace:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-6 bg-[#0a0a0a] border border-[#f43f5e]/30 rounded-xl max-w-2xl mx-auto my-10 space-y-6 text-center">
          <div className="p-4 bg-[#f43f5e]/10 text-[#f43f5e] rounded-full border border-[#f43f5e]/30 animate-pulse">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
              INTERRUPCIÓN DE ENLACE TÁCTICO PII-LCC
            </h3>
            <p className="text-xs text-zinc-500 font-mono">
              SISTEMA CRÍTICO DE SEGURIDAD OPERACIONAL ACTIVADO
            </p>
          </div>

          <div className="bg-black/85 p-4 rounded border border-zinc-800 text-left font-mono text-[11px] text-[#f43f5e] max-w-full overflow-x-auto space-y-1">
            <p className="font-bold uppercase">[DIAGNÓSTICO ERROR]:</p>
            <p className="text-zinc-300 break-words">{this.state.error?.message || 'Error de procesamiento desconocido'}</p>
            <p className="text-zinc-600 mt-2 text-[9px]">[STATION_ID]: {window.location.host || 'LCC-TERMINAL-UNKNOWN'}</p>
          </div>

          <p className="text-xs text-zinc-400 max-w-md">
            Se ha interrumpido el flujo para evitar corrupción del cifrado doctrinal. Puede intentar forzar la reconexión segura.
          </p>

          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 bg-[#f43f5e] hover:bg-[#f43f5e]/90 text-white font-mono font-bold text-xs py-2 px-4 rounded transition-all active:scale-95 cursor-pointer uppercase"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Restablecer Terminal Táctico</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
