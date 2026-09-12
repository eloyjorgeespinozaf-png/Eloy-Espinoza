import React, { useState, useEffect } from 'react';
import { Copy, Check, FileCode2, Terminal, AlertTriangle, Code, ChevronRight, Loader2 } from 'lucide-react';

interface CodeViewerProps {}

export default function CodeViewer({}: CodeViewerProps) {
  const files = [
    { name: "server.ts", label: "Servidor Principal (Express & WS)", path: "server.ts" },
    { name: "src/App.tsx", label: "Punto de Entrada Cliente (React)", path: "src/App.tsx" },
    { name: "src/types.ts", label: "Definición de Tipos Globales", path: "src/types.ts" },
    { name: "src/components/StrategicView.tsx", label: "Vista Estratégica (Mando)", path: "src/components/StrategicView.tsx" },
    { name: "src/components/OperationalView.tsx", label: "Vista Operativa (Fusión)", path: "src/components/OperationalView.tsx" },
    { name: "src/components/TacticalView.tsx", label: "Vista Táctica (Patrullas)", path: "src/components/TacticalView.tsx" },
    { name: "src/components/TacticalP2PMesh.tsx", label: "Malla Descentrada P2P S-6", path: "src/components/TacticalP2PMesh.tsx" },
    { name: "src/components/OfficialCrest.tsx", label: "Escudo Oficial Nacional", path: "src/components/OfficialCrest.tsx" },
    { name: "src/components/SystemArchitectureDiagram.tsx", label: "Diagrama de Arquitectura", path: "src/components/SystemArchitectureDiagram.tsx" },
    { name: "src/components/InterdictionAlertTracker.tsx", label: "Alerta y Seguimiento de Interdicción", path: "src/components/InterdictionAlertTracker.tsx" },
    { name: "src/services/DeviceAuthService.ts", label: "Servicio de Autenticación de Dispositivo", path: "src/services/DeviceAuthService.ts" },
    { name: "src/components/SecureElement.tsx", label: "Componente de Blindaje de Elemento Seguro", path: "src/components/SecureElement.tsx" }
  ];

  const [selectedFile, setSelectedFile] = useState(files[0]);
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    const fetchCode = async () => {
      setLoading(true);
      setError(null);
      setCopied(false);
      try {
        const res = await fetch(`/api/code?file=${encodeURIComponent(selectedFile.path)}`);
        if (!res.ok) {
          throw new Error(`Error ${res.status}: No se pudo cargar el código`);
        }
        const data = await res.json();
        if (active) {
          setContent(data.content);
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || 'Error desconocido');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchCode();
    return () => {
      active = false;
    };
  }, [selectedFile]);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(content);
      } else {
        throw new Error('Clipboard API not available');
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = content;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackErr) {
        console.error('Error copying text: ', fallbackErr);
      }
    }
  };

  return (
    <div id="code-viewer-container" className="bg-[#0c0c0e] border border-[#1d1d23] rounded-2xl overflow-hidden shadow-2xl flex flex-col lg:flex-row min-h-[650px] text-zinc-300">
      {/* File Sidebar */}
      <div id="code-viewer-sidebar" className="w-full lg:w-80 border-r border-[#1d1d23] bg-[#08080a] p-5 flex flex-col gap-4">
        <div className="flex items-center gap-3 border-b border-[#1d1d23] pb-4">
          <div className="p-2 bg-[#f97316]/10 rounded-lg text-[#f97316]">
            <Code className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-sans font-bold text-white tracking-wide">Código de Sistema</h3>
            <p className="text-[10px] text-zinc-500 font-mono">PII-LCC v2.4 Authoritative Src</p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[300px] lg:max-h-[500px]">
          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-600 px-2.5 mb-1 block">Componentes y Servidor</span>
          {files.map((file) => {
            const isSelected = file.path === selectedFile.path;
            return (
              <button
                id={`btn-code-file-${file.path.replace(/\//g, '-')}`}
                key={file.path}
                onClick={() => setSelectedFile(file)}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all font-sans text-left border cursor-pointer ${
                  isSelected
                    ? 'bg-[#f97316]/10 border-[#f97316]/40 text-white shadow-[0_0_12px_rgba(249,115,22,0.15)]'
                    : 'bg-transparent border-transparent hover:bg-zinc-900/50 hover:text-zinc-200 text-zinc-500'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileCode2 className={`w-4.5 h-4.5 shrink-0 ${isSelected ? 'text-[#f97316]' : 'text-zinc-600'}`} />
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold truncate ${isSelected ? 'text-white' : 'text-zinc-300'}`}>{file.name}</p>
                    <p className="text-[10px] text-zinc-500 truncate mt-0.5">{file.label}</p>
                  </div>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${isSelected ? 'text-[#f97316] translate-x-0.5' : 'text-zinc-700'}`} />
              </button>
            );
          })}
        </div>

        <div className="mt-auto pt-4 border-t border-[#1d1d23] text-[10px] text-zinc-600 font-mono flex flex-col gap-1">
          <p>● CONEXIÓN: CIFRADA AES-256</p>
          <p>● ORIGEN: AUTORITATIVO LCC</p>
        </div>
      </div>

      {/* Code Content View */}
      <div id="code-viewer-content-pane" className="flex-1 flex flex-col bg-[#050507]">
        {/* Header Bar */}
        <div className="h-14 border-b border-[#1d1d23] px-6 flex items-center justify-between bg-[#08080a]">
          <div className="flex items-center gap-3">
            <Terminal className="w-4 h-4 text-zinc-500 font-mono" />
            <span className="text-xs font-mono font-bold text-zinc-400">{selectedFile.path}</span>
          </div>

          {!loading && !error && (
            <button
              id="btn-copy-code-contents"
              onClick={handleCopy}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium tracking-wide transition-all duration-150 border cursor-pointer ${
                copied
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
                  : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-300 active:scale-95'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Código</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Code Block Container */}
        <div id="code-viewer-pre-container" className="flex-1 p-6 relative overflow-auto font-mono text-xs leading-relaxed max-h-[550px] lg:max-h-[650px] select-text">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#050507]/90">
              <Loader2 className="w-8 h-8 text-[#f97316] animate-spin" />
              <span className="text-xs text-zinc-500 font-mono">Obteniendo fuente segura de {selectedFile.name}...</span>
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <div className="p-3 bg-rose-950/20 rounded-full border border-rose-500/20 text-rose-500 mb-2">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-zinc-200">No se pudo cargar el archivo</p>
              <p className="text-xs text-zinc-500 font-mono max-w-md">{error}</p>
            </div>
          ) : (
            <pre className="text-zinc-300 overflow-x-auto whitespace-pre selection:bg-[#f97316]/30 selection:text-white">
              <code>{content}</code>
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
