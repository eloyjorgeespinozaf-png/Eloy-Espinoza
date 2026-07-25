import React, { useState } from 'react';
import { DeviceAuthService } from '../services/DeviceAuthService';
import { ShieldAlert, Key, CheckCircle, AlertTriangle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

export const SecureElement: React.FC<Props> = ({ children }) => {
  const [authorized, setAuthorized] = useState(DeviceAuthService.isDeviceAuthorized());
  const [pass, setPass] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (DeviceAuthService.authorizeDevice(pass)) {
      setAuthorized(true);
    } else {
      setError("Acceso denegado: Credenciales de dispositivo inválidas.");
    }
  };

  if (authorized) {
    return <>{children}</>;
  }

  return (
    <div id="secure-element-card" className="p-6 border-2 border-amber-600/60 bg-[#0d0a05] rounded-xl text-amber-500 shadow-[0_0_20px_rgba(217,119,6,0.15)] max-w-md mx-auto my-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-4 border-b border-amber-600/20 pb-3">
        <ShieldAlert className="w-6 h-6 text-amber-500 animate-pulse" />
        <div>
          <h4 className="font-sans font-bold text-white uppercase tracking-wider text-sm">Elemento Protegido</h4>
          <p className="text-[10px] text-amber-500/70 font-mono">Nodo LCC S-6 Authoritative Shield</p>
        </div>
      </div>
      
      <p className="text-xs font-sans text-zinc-300 mb-4 leading-relaxed">
        El acceso a este módulo requiere validación de hardware y autenticación del terminal operativo. Por favor, introduzca la clave de nodo autorizada.
      </p>

      <form onSubmit={handleAuth} className="space-y-3">
        <div className="relative">
          <Key className="absolute left-3 top-2.5 h-4 w-4 text-amber-500/50" />
          <input 
            id="secure-element-password-input"
            type="password" 
            placeholder="Clave de nodo operativo" 
            value={pass}
            onChange={(e) => setPass(e.target.value)} 
            className="w-full bg-[#18130b] border border-amber-600/30 rounded-lg py-2 pl-9 pr-4 text-xs text-white placeholder-amber-500/30 focus:outline-none focus:border-amber-500/80 font-mono"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 p-2.5 bg-rose-950/40 border border-rose-500/30 rounded-lg text-rose-400 text-[11px] font-mono animate-shake">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button 
          id="btn-authorize-secure-element"
          type="submit"
          className="w-full bg-amber-600 hover:bg-amber-500 text-[#0d0a05] font-bold text-xs py-2 px-4 rounded-lg transition-all duration-150 active:scale-95 cursor-pointer shadow-lg shadow-amber-600/20 flex items-center justify-center gap-1.5"
        >
          <CheckCircle className="w-4 h-4" />
          <span>Habilitar Control</span>
        </button>
      </form>
    </div>
  );
};
