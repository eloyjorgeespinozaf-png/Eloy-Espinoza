import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Copy, 
  Check, 
  FileCode2, 
  Terminal, 
  AlertTriangle, 
  Code, 
  ChevronRight, 
  Loader2, 
  Download, 
  Search, 
  Layers, 
  ShieldCheck, 
  FileArchive, 
  Zap, 
  X,
  FileCheck2,
  RefreshCw,
  FolderOpen
} from 'lucide-react';

export interface CodeFileInfo {
  path: string;
  name: string;
  category: string;
  size?: number;
  lines?: number;
  label?: string;
}

interface CodeViewerProps {
  onClose?: () => void;
  isModal?: boolean;
}

const DEFAULT_FILES: CodeFileInfo[] = [
  { name: "server.ts", label: "Servidor Principal (Express & WS Hub)", path: "server.ts", category: "Servidor" },
  { name: "src/App.tsx", label: "Punto de Entrada Cliente React CAD-C2", path: "src/App.tsx", category: "Cliente Núcleo" },
  { name: "src/types.ts", label: "Definición Doctrinal de Tipos Globales", path: "src/types.ts", category: "Cliente Núcleo" },
  { name: "src/services/MultiDeviceSyncService.ts", label: "Sincronización Multi-Terminal y P2P", path: "src/services/MultiDeviceSyncService.ts", category: "Red & Sincronización" },
  { name: "src/components/StrategicView.tsx", label: "Vista Estratégica (Mando CEO-LCC)", path: "src/components/StrategicView.tsx", category: "Vistas Principales" },
  { name: "src/components/OperationalView.tsx", label: "Vista Operativa (Fusión CFI)", path: "src/components/OperationalView.tsx", category: "Vistas Principales" },
  { name: "src/components/TacticalView.tsx", label: "Vista Táctica (Órgano de Búsqueda S-2)", path: "src/components/TacticalView.tsx", category: "Vistas Principales" },
  { name: "src/components/TacticalP2PMesh.tsx", label: "Malla Descentrada P2P S-6 WebRTC", path: "src/components/TacticalP2PMesh.tsx", category: "Red & Sincronización" },
  { name: "src/components/MultiDeviceSyncModal.tsx", label: "Panel de Enlace Multi-Dispositivo", path: "src/components/MultiDeviceSyncModal.tsx", category: "Red & Sincronización" },
  { name: "src/components/InterdictionAlertTracker.tsx", label: "Alerta y Seguimiento de Interdicción", path: "src/components/InterdictionAlertTracker.tsx", category: "Componentes" },
  { name: "src/components/PatrolOperationalDashboard.tsx", label: "Consola Operativa de Patrullas", path: "src/components/PatrolOperationalDashboard.tsx", category: "Componentes" },
  { name: "src/components/ClanManagementModal.tsx", label: "Inteligencia de Clanes y Rutas", path: "src/components/ClanManagementModal.tsx", category: "Componentes" },
  { name: "src/components/fusion/G2DoctrinalViewer.tsx", label: "Visor Doctrinal de Expedientes G-2", path: "src/components/fusion/G2DoctrinalViewer.tsx", category: "Fusión G-2" },
  { name: "src/components/fusion/SearchOrganAlertViewer.tsx", label: "Visor de Alertas de Sensores S-2", path: "src/components/fusion/SearchOrganAlertViewer.tsx", category: "Fusión G-2" },
  { name: "src/components/AppInstallModal.tsx", label: "Instalador Multiplataforma PWA", path: "src/components/AppInstallModal.tsx", category: "Componentes" },
  { name: "src/components/OfficialCrest.tsx", label: "Escudo Oficial Nacional Vectorial", path: "src/components/OfficialCrest.tsx", category: "Componentes" },
  { name: "src/components/SystemArchitectureDiagram.tsx", label: "Diagrama Interactivo de Arquitectura", path: "src/components/SystemArchitectureDiagram.tsx", category: "Componentes" },
  { name: "src/services/DeviceAuthService.ts", label: "Autenticación Criptográfica de Dispositivo", path: "src/services/DeviceAuthService.ts", category: "Red & Sincronización" },
  { name: "src/utils/audio.ts", label: "Sintetizador de Audio Táctico Cyber", path: "src/utils/audio.ts", category: "Utilidades" },
  { name: "package.json", label: "Manifiesto de Dependencias del Proyecto", path: "package.json", category: "Configuración" },
  { name: "vite.config.ts", label: "Configuración de Compilador y Vite PWA", path: "vite.config.ts", category: "Configuración" }
];

export default function CodeViewer({ onClose, isModal = false }: CodeViewerProps) {
  const [fileList, setFileList] = useState<CodeFileInfo[]>(DEFAULT_FILES);
  const [selectedFile, setSelectedFile] = useState<CodeFileInfo>(DEFAULT_FILES[0]);
  const [content, setContent] = useState<string>('');
  const [fileStats, setFileStats] = useState<{ lines: number; size: number }>({ lines: 0, size: 0 });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Copy status
  const [copiedFile, setCopiedFile] = useState<boolean>(false);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [isBundlingAll, setIsBundlingAll] = useState<boolean>(false);

  // Search & category filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');

  // Load dynamic file listing from server
  useEffect(() => {
    let active = true;
    const fetchFileList = async () => {
      try {
        const res = await fetch('/api/code/files');
        if (res.ok) {
          const data = await res.json();
          if (active && Array.isArray(data.files) && data.files.length > 0) {
            // Merge with labels
            const enriched = data.files.map((f: any) => {
              const matched = DEFAULT_FILES.find(df => df.path === f.path);
              return {
                ...f,
                label: matched?.label || f.name
              };
            });
            setFileList(enriched);
          }
        }
      } catch {
        // Fallback to DEFAULT_FILES
      }
    };
    fetchFileList();
    return () => { active = false; };
  }, []);

  // Fetch code for selected file
  useEffect(() => {
    let active = true;
    const fetchCode = async () => {
      setLoading(true);
      setError(null);
      setCopiedFile(false);
      try {
        const res = await fetch(`/api/code?file=${encodeURIComponent(selectedFile.path)}`);
        if (!res.ok) {
          throw new Error(`Error ${res.status}: No se pudo leer el archivo`);
        }
        const data = await res.json();
        if (active) {
          setContent(data.content);
          setFileStats({
            lines: data.lines || data.content.split('\n').length,
            size: data.size || data.content.length
          });
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || 'Error desconocido al cargar archivo');
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

  // Robust Clipboard Copier
  const copyTextToClipboard = useCallback(async (textToCopy: string): Promise<boolean> => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
        return true;
      }
      throw new Error('Clipboard API unavailable');
    } catch {
      // Fallback using textarea element
      try {
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        return successful;
      } catch (fallbackErr) {
        console.error('Error fallback copying text:', fallbackErr);
        return false;
      }
    }
  }, []);

  // Copy current active file
  const handleCopyCurrentFile = async () => {
    if (!content) return;
    const ok = await copyTextToClipboard(content);
    if (ok) {
      setCopiedFile(true);
      setCopyToast(`¡Código de "${selectedFile.name}" copiado al portapapeles! (${fileStats.lines} líneas)`);
      setTimeout(() => setCopiedFile(false), 2500);
      setTimeout(() => setCopyToast(null), 3500);
    }
  };

  // Copy ALL project source code at once
  const handleCopyAllProjectCode = async () => {
    setIsBundlingAll(true);
    try {
      const res = await fetch('/api/code/bundle');
      if (!res.ok) throw new Error('Error al generar paquete consolidado');
      const data = await res.json();
      
      const ok = await copyTextToClipboard(data.bundleContent);
      if (ok) {
        setCopiedAll(true);
        setCopyToast(`¡TODO el código fuente del proyecto copiado! (${data.totalFiles} archivos, ${data.totalLines} líneas)`);
        setTimeout(() => setCopiedAll(false), 3000);
        setTimeout(() => setCopyToast(null), 4500);
      }
    } catch (err: any) {
      // Fallback: copy current file if bundle fails
      await handleCopyCurrentFile();
    } finally {
      setIsBundlingAll(false);
    }
  };

  // Download active file directly
  const handleDownloadFile = () => {
    if (!content) return;
    try {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = selectedFile.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.warn('Download error:', e);
    }
  };

  // Categories extraction
  const categories = useMemo(() => {
    const set = new Set<string>();
    set.add('Todos');
    fileList.forEach(f => {
      if (f.category) set.add(f.category);
    });
    return Array.from(set);
  }, [fileList]);

  // Filtered files
  const filteredFiles = useMemo(() => {
    return fileList.filter(f => {
      const matchesCategory = selectedCategory === 'Todos' || f.category === selectedCategory;
      const matchesSearch = searchQuery.trim() === '' || 
        f.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.label && f.label.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [fileList, selectedCategory, searchQuery]);

  return (
    <div 
      id="code-viewer-container" 
      className={`bg-[#07090e] border border-cyan-500/30 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(6,182,212,0.15)] flex flex-col text-zinc-300 font-sans relative ${
        isModal ? 'max-h-[88vh] min-h-[550px]' : 'min-h-[700px]'
      }`}
    >
      {/* Top Banner Ribbon */}
      <div className="bg-gradient-to-r from-cyan-950/70 via-black to-[#05070c] px-4 py-3 border-b border-cyan-500/25 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/15 border border-cyan-500/40 rounded-xl text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <Code className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider border border-cyan-500/30">
                PII-LCC CAD-C2 AUTORITATIVO
              </span>
              <span className="text-[10px] bg-emerald-950/60 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold border border-emerald-500/30 flex items-center gap-1">
                <Check className="w-3 h-3" />
                COPIA SEGURA
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-wider mt-0.5">
              Visor y Exportador Oficial de Código Fuente
            </h2>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* COPY ENTIRE PROJECT BUTTON */}
          <button
            type="button"
            id="btn-copy-all-project-code"
            onClick={handleCopyAllProjectCode}
            disabled={isBundlingAll}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider transition-all duration-150 border cursor-pointer active:scale-95 shadow-lg ${
              copiedAll
                ? 'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                : 'bg-cyan-950 hover:bg-cyan-900 border-cyan-500/70 text-cyan-200 hover:text-white shadow-[0_0_12px_rgba(6,182,212,0.3)]'
            }`}
            title="Copiar el código de todos los archivos principales del proyecto consolidado en un solo clic"
          >
            {isBundlingAll ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
            ) : copiedAll ? (
              <FileCheck2 className="w-3.5 h-3.5 text-white" />
            ) : (
              <FileArchive className="w-3.5 h-3.5 text-cyan-400" />
            )}
            <span>{copiedAll ? '¡Todo el Proyecto Copiado!' : 'Copiar TODO el Código Fuente'}</span>
          </button>

          {/* Download full project archive */}
          <a
            href="/api/code/download-archive"
            download="PII-LCC_Codigo_Fuente_Completo.tar.gz"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title="Descargar paquete comprimido con todo el código fuente del sistema (.tar.gz)"
          >
            <Download className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">Descargar .tar.gz</span>
          </a>

          {isModal && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer ml-1"
              title="Cerrar ventana"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Toast Notification Bar */}
      {copyToast && (
        <div className="bg-emerald-950/90 border-b border-emerald-500/40 text-emerald-200 px-4 py-2 text-xs font-mono font-bold flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{copyToast}</span>
          </div>
          <button 
            onClick={() => setCopyToast(null)}
            className="text-emerald-400 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Workspace: Left Sidebar + Code Pane */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        
        {/* Left Sidebar: File Navigator */}
        <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-zinc-800/80 bg-[#06080d] p-3.5 flex flex-col gap-3 shrink-0">
          
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar archivo (ej: App.tsx, server)..."
              className="w-full bg-[#0b0e14] border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/60 font-mono"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Category Chips */}
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none text-[10px] font-mono">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2 py-0.5 rounded-full transition-all shrink-0 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                    : 'bg-zinc-900/60 text-zinc-500 hover:text-zinc-300 border border-transparent'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Files List */}
          <div className="flex-1 overflow-y-auto space-y-1 max-h-[220px] lg:max-h-[520px] pr-1 custom-scrollbar">
            <div className="flex items-center justify-between text-[10px] uppercase font-bold text-zinc-500 px-2 py-1">
              <span>Archivos ({filteredFiles.length})</span>
              <span className="font-mono">{fileList.length} total</span>
            </div>

            {filteredFiles.length === 0 ? (
              <div className="text-center py-6 text-zinc-600 text-xs font-mono">
                No se encontraron archivos coincidentes.
              </div>
            ) : (
              filteredFiles.map((file) => {
                const isSelected = file.path === selectedFile.path;
                return (
                  <button
                    key={file.path}
                    onClick={() => setSelectedFile(file)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all font-mono text-left border cursor-pointer group ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-500/50 text-white shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                        : 'bg-transparent border-transparent hover:bg-zinc-900/70 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileCode2 className={`w-4 h-4 shrink-0 transition-colors ${isSelected ? 'text-cyan-400' : 'text-zinc-600 group-hover:text-zinc-400'}`} />
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold truncate ${isSelected ? 'text-cyan-200 font-bold' : 'text-zinc-300'}`}>
                          {file.name}
                        </p>
                        <p className="text-[10px] text-zinc-500 truncate font-sans">
                          {file.label || file.category || file.path}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {file.lines && (
                        <span className="text-[9px] text-zinc-600 font-mono hidden sm:inline">
                          {file.lines}L
                        </span>
                      )}
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? 'text-cyan-400 translate-x-0.5' : 'text-zinc-700'}`} />
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Quick System Badge */}
          <div className="mt-auto pt-2.5 border-t border-zinc-800/80 text-[10px] text-zinc-500 font-mono space-y-0.5">
            <div className="flex items-center justify-between">
              <span>● CIFRADO: AES-256 / SHA-256</span>
              <span className="text-emerald-400">ACTIVO</span>
            </div>
            <div className="flex items-center justify-between">
              <span>● ENTORNO: REACCIÓN TÁCTICA</span>
              <span className="text-cyan-400">C4ISR</span>
            </div>
          </div>
        </div>

        {/* Right Code Display Pane */}
        <div className="flex-1 flex flex-col bg-[#04060a] min-w-0 overflow-hidden">
          
          {/* File Toolbar */}
          <div className="h-12 border-b border-zinc-800/80 px-4 flex items-center justify-between bg-[#080b12] shrink-0 gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Terminal className="w-4 h-4 text-cyan-400 shrink-0 font-mono" />
              <span className="text-xs font-mono font-bold text-white truncate">
                {selectedFile.path}
              </span>
              <span className="text-[10px] bg-zinc-800/90 text-zinc-400 px-2 py-0.5 rounded font-mono shrink-0 hidden sm:inline">
                {fileStats.lines} líneas ({Math.round(fileStats.size / 1024)} KB)
              </span>
            </div>

            {/* Action Buttons for current file */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Copy Current File */}
              <button
                type="button"
                id="btn-copy-code-contents"
                onClick={handleCopyCurrentFile}
                disabled={loading || Boolean(error)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wide transition-all border cursor-pointer active:scale-95 ${
                  copiedFile
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                    : 'bg-cyan-950/60 hover:bg-cyan-900/80 border-cyan-500/50 text-cyan-300 hover:text-white'
                }`}
                title="Copiar todo el código de este archivo específico al portapapeles"
              >
                {copiedFile ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Copiar Archivo</span>
                  </>
                )}
              </button>

              {/* Download Current File */}
              <button
                type="button"
                onClick={handleDownloadFile}
                disabled={loading || Boolean(error)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                title="Descargar este archivo individual en formato local"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Guardar</span>
              </button>
            </div>
          </div>

          {/* Code Viewer Text Area with Line Numbers */}
          <div className="flex-1 p-4 relative overflow-auto font-mono text-xs leading-relaxed select-text bg-[#030407]">
            {loading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#030407]/90 z-10">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                <span className="text-xs text-zinc-400 font-mono">
                  Extrayendo fuente autoritativa de {selectedFile.name}...
                </span>
              </div>
            ) : error ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center z-10">
                <div className="p-3 bg-rose-950/30 rounded-full border border-rose-500/40 text-rose-400 mb-1">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-white font-mono">No se pudo cargar el archivo</p>
                <p className="text-xs text-zinc-400 font-mono max-w-md">{error}</p>
                <button
                  onClick={() => setSelectedFile({ ...selectedFile })}
                  className="mt-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-xs font-mono flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reintentar</span>
                </button>
              </div>
            ) : (
              <div className="min-w-full">
                <pre className="text-zinc-300 font-mono text-xs whitespace-pre select-text selection:bg-cyan-500/30 selection:text-white">
                  <code>{content}</code>
                </pre>
              </div>
            )}
          </div>

          {/* Code Footer Status Bar */}
          <div className="h-8 border-t border-zinc-900 bg-[#06080d] px-4 flex items-center justify-between text-[11px] font-mono text-zinc-500 shrink-0">
            <div className="flex items-center gap-3">
              <span>LENGUAJE: {selectedFile.name.endsWith('.tsx') ? 'TypeScript React (TSX)' : selectedFile.name.endsWith('.ts') ? 'TypeScript (TS)' : 'JSON/Texto'}</span>
              <span>LÍNEAS: {fileStats.lines}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-cyan-400 cursor-pointer hover:underline" onClick={handleCopyCurrentFile}>
                [Click para copiar]
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
