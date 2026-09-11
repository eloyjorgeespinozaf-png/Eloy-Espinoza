import React, { useState } from 'react';
import { 
  Download, 
  Monitor, 
  Smartphone, 
  Check, 
  Copy, 
  ExternalLink, 
  Shield, 
  Terminal, 
  Cpu, 
  Zap, 
  QrCode, 
  FileText, 
  HardDrive,
  Info,
  Laptop,
  CheckCircle2,
  X
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { playSyntheticBeep, playChime } from '../utils/audio';

interface AppInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownloadDesktopPackage?: () => void;
  onDownloadMobilePackage?: () => void;
}

export const AppInstallModal: React.FC<AppInstallModalProps> = ({
  isOpen,
  onClose,
  onDownloadDesktopPackage,
  onDownloadMobilePackage
}) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, isMobile, triggerInstall } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'PC' | 'MOBILE' | 'PACKAGES'>('PC');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [installSuccessNotice, setInstallSuccessNotice] = useState(false);

  if (!isOpen) return null;

  const currentAppUrl = typeof window !== 'undefined' ? window.location.href : 'https://ais-pre-w5xoplsdxtpt7onky6idvp-174948198274.us-west2.run.app';

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(currentAppUrl);
      setCopiedUrl(true);
      playSyntheticBeep(880, 0.1);
      setTimeout(() => setCopiedUrl(false), 3000);
    } catch (e) {
      console.warn('Copy clipboard failed:', e);
    }
  };

  const handleNativeInstall = async () => {
    playSyntheticBeep(650, 0.15);
    const installed = await triggerInstall();
    if (installed) {
      setInstallSuccessNotice(true);
      playChime(600, 900, 0.25);
    }
  };

  // Helper to generate and download a Windows .bat launcher
  const downloadWindowsBatLauncher = () => {
    const batContent = `@echo off
:: ========================================================
:: PLATAFORMA INTEGRADA DE INTELIGENCIA PARA LA LCC (PII-LCC)
:: LANZADOR AUTÓNOMO MODO APLICACIÓN NATIVA (WINDOWS)
:: ========================================================
title PII-LCC - Terminal Táctico de Inteligencia Militar
color 0A
echo.
echo ========================================================
echo   INICIANDO PII-LCC EN MODO APLICACIÓN DE ESCRITORIO
echo ========================================================
echo.

set APP_URL="${currentAppUrl}"

:: Try launching in Microsoft Edge App Mode
start msedge --app=%APP_URL% --start-maximized 2>nul
if %ERRORLEVEL% EQU 0 goto :done

:: Fallback to Google Chrome App Mode
start chrome --app=%APP_URL% --start-maximized 2>nul
if %ERRORLEVEL% EQU 0 goto :done

:: Fallback to default browser
start %APP_URL%

:done
echo Terminal táctico inicializado con éxito.
exit
`;
    const blob = new Blob([batContent], { type: 'application/bat' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Iniciar_PII_LCC_Escritorio.bat';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    playSyntheticBeep(920, 0.12);
  };

  // Helper to generate a Windows Desktop Shortcut (.url file)
  const downloadWindowsShortcut = () => {
    const urlFileContent = `[InternetShortcut]
URL=${currentAppUrl}
IconIndex=0
IconFile=https://ais-pre-w5xoplsdxtpt7onky6idvp-174948198274.us-west2.run.app/pwa-192x192.png
HotKey=0
IDList=
[{000214A0-0000-0000-C000-000000000046}]
Prop3=19,0
[InternetShortcut.A]
IconFile=https://ais-pre-w5xoplsdxtpt7onky6idvp-174948198274.us-west2.run.app/pwa-192x192.png
`;
    const blob = new Blob([urlFileContent], { type: 'application/internet-shortcut' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'PII-LCC_Acceso_Directo.url';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    playSyntheticBeep(920, 0.12);
  };

  // Helper to generate Linux .desktop launcher
  const downloadLinuxDesktopLauncher = () => {
    const desktopContent = `[Desktop Entry]
Version=1.0
Type=Application
Name=PII-LCC Inteligencia Militar
Comment=Terminal Autónomo de Inteligencia Táctica para la Línea de Control Clandestino
Exec=xdg-open "${currentAppUrl}"
Icon=utilities-terminal
Terminal=false
Categories=Office;Security;System;
`;
    const blob = new Blob([desktopContent], { type: 'application/x-desktop' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'PII-LCC.desktop';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    playSyntheticBeep(920, 0.12);
  };

  // Direct QR Code API image URL for smartphone scanning
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(currentAppUrl)}&bgcolor=05-05-05&color=10-b9-81&margin=10`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto font-mono text-zinc-200 animate-fade-in">
      <div className="relative w-full max-w-4xl bg-[#070b12] border-2 border-emerald-500/70 rounded-2xl shadow-[0_0_50px_rgba(16,185,129,0.25)] overflow-hidden my-6">
        
        {/* Top Military Header Bar */}
        <div className="bg-gradient-to-r from-emerald-950/80 via-[#0a1424] to-emerald-950/80 border-b border-emerald-500/40 p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-950 border border-emerald-500/60 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <Download className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-600 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                  C2 // INSTALACIÓN MULTIPLATAFORMA
                </span>
                <span className="text-xs text-zinc-400">
                  VERSIÓN PWA AUTÓNOMA
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide mt-1">
                Centro de Descarga e Instalación (PC y Celular)
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-700 transition-colors cursor-pointer"
            title="Cerrar ventana de descarga"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status notice banner */}
        <div className="bg-[#0c1626] border-b border-blue-900/40 px-5 py-2.5 flex items-center justify-between text-xs flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            <span className="text-zinc-300">
              Dispositivo actual detectado: <strong className="text-emerald-400">{isMobile ? 'Dispositivo Móvil (Smartphone / Tablet)' : 'Computadora / PC (Escritorio / Laptop)'}</strong>
            </span>
          </div>

          {isInstalled ? (
            <span className="bg-emerald-950 text-emerald-300 border border-emerald-600 px-2.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              APP YA INSTALADA COMO NATIVA
            </span>
          ) : isInstallable ? (
            <span className="bg-blue-950 text-blue-300 border border-blue-600 px-2.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 animate-pulse">
              <Zap className="w-3.5 h-3.5 text-blue-400" />
              COMPATIBILIDAD NATIVA DETECTADA (LISTO PARA INSTALAR)
            </span>
          ) : (
            <span className="bg-zinc-900 text-zinc-400 border border-zinc-700 px-2.5 py-0.5 rounded text-[10px]">
              MODO COMPATIBLE PWA / DESCARGA DISPONIBLE
            </span>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 border-b border-zinc-800 bg-[#05080e] p-2 gap-2 text-xs">
          <button
            onClick={() => setActiveTab('PC')}
            className={`py-2.5 px-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'PC'
                ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] border border-emerald-400'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
            }`}
          >
            <Laptop className="w-4 h-4" />
            <span>1. Instalar en PC / Laptop</span>
          </button>

          <button
            onClick={() => setActiveTab('MOBILE')}
            className={`py-2.5 px-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'MOBILE'
                ? 'bg-cyan-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)] border border-cyan-400'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>2. Instalar en Celular / Móvil</span>
          </button>

          <button
            onClick={() => setActiveTab('PACKAGES')}
            className={`py-2.5 px-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'PACKAGES'
                ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)] border border-blue-400'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>3. Paquetes y Accesos (.bat, .url)</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-5 sm:p-6 max-h-[65vh] overflow-y-auto space-y-6">

          {/* TAB 1: PC / COMPUTADORA */}
          {activeTab === 'PC' && (
            <div className="space-y-6">
              {/* Native 1-Click Install Button if supported */}
              {isInstallable && (
                <div className="bg-emerald-950/40 border-2 border-emerald-500 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                  <div className="flex items-center gap-3 text-left">
                    <div className="p-3 bg-emerald-600/30 border border-emerald-400 text-emerald-300 rounded-lg">
                      <Laptop className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Instalación Automática Detectada</h4>
                      <p className="text-xs text-zinc-300 font-sans">
                        Tu navegador soporta la instalación directa como aplicación de escritorio nativa en Windows / macOS / Linux.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleNativeInstall}
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(16,185,129,0.4)] cursor-pointer whitespace-nowrap"
                  >
                    <Download className="w-4 h-4" />
                    <span>INSTALAR APP EN ESTA PC</span>
                  </button>
                </div>
              )}

              {/* Step by Step Manual Guide for Chrome, Edge, Brave */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#090e17] border border-zinc-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs border-b border-zinc-800 pb-2">
                    <Monitor className="w-4 h-4" />
                    <span>MÉTODO A: BARRA DE DIRECCIONES (CHROME / EDGE)</span>
                  </div>
                  <ol className="text-xs text-zinc-300 space-y-2.5 list-decimal list-inside font-sans">
                    <li>
                      En la barra de direcciones superior de tu navegador, ubica el ícono de <strong>Instalación de App</strong> (ícono de monitor con flecha hacia abajo <span className="text-emerald-400 font-mono font-bold">🖥️↓</span> o símbolo <span className="text-emerald-400 font-mono font-bold">⊕</span>).
                    </li>
                    <li>
                      Haz clic sobre el ícono de instalación.
                    </li>
                    <li>
                      Aparecerá el cuadro de confirmación: <strong>"¿Instalar Plataforma Integrada de Inteligencia para la LCC?"</strong>
                    </li>
                    <li>
                      Haz clic en <strong>Instalar</strong>. La aplicación se abrirá como una ventana de software independiente con su ícono en la barra de tareas y en el Menú Inicio.
                    </li>
                  </ol>
                </div>

                <div className="bg-[#090e17] border border-zinc-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs border-b border-zinc-800 pb-2">
                    <Terminal className="w-4 h-4" />
                    <span>MÉTODO B: MENÚ PRINCIPAL DEL NAVEGADOR</span>
                  </div>
                  <ol className="text-xs text-zinc-300 space-y-2.5 list-decimal list-inside font-sans">
                    <li>
                      Presiona los <strong>tres puntos verticales (⋮)</strong> en la esquina superior derecha del navegador.
                    </li>
                    <li>
                      Busca la opción <strong>"Instalar Plataforma Integrada de Inteligencia..."</strong> o <strong>"Guardar y compartir" → "Instalar página como aplicación"</strong>.
                    </li>
                    <li>
                      Confirma la instalación.
                    </li>
                    <li>
                      ¡Listo! Ahora tienes un programa ejecutable independiente en tu PC sin bordes de navegador.
                    </li>
                  </ol>
                </div>
              </div>

              {/* Instant Desktop Launchers */}
              <div className="bg-[#0a1220] border border-blue-900/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-blue-400" />
                    <h4 className="text-xs font-bold text-white uppercase">
                      Lanzadores Portables Inmediatos para PC
                    </h4>
                  </div>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    NO REQUIERE INSTALACIÓN PREVIA
                  </span>
                </div>

                <p className="text-xs text-zinc-300 font-sans">
                  Si prefieres un acceso directo o un script ejecutable que abra la plataforma automáticamente en modo de aplicación táctica completa en Windows o Linux:
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    onClick={downloadWindowsBatLauncher}
                    className="flex-1 min-w-[200px] bg-[#0f1d33] hover:bg-[#152949] text-blue-300 hover:text-white border border-blue-700/60 py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-400" />
                    <span>Descargar Lanzador Windows (.bat)</span>
                  </button>

                  <button
                    onClick={downloadWindowsShortcut}
                    className="flex-1 min-w-[200px] bg-[#0f1d33] hover:bg-[#152949] text-emerald-300 hover:text-white border border-emerald-700/60 py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Descargar Acceso Directo (.url)</span>
                  </button>

                  <button
                    onClick={downloadLinuxDesktopLauncher}
                    className="flex-1 min-w-[200px] bg-[#0f1d33] hover:bg-[#152949] text-purple-300 hover:text-white border border-purple-700/60 py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5 text-purple-400" />
                    <span>Descargar Lanzador Linux (.desktop)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CELULAR / SMARTPHONE / TABLET */}
          {activeTab === 'MOBILE' && (
            <div className="space-y-6">
              {/* Native 1-Click Install Button for Android if available */}
              {isInstallable && (
                <div className="bg-cyan-950/40 border-2 border-cyan-500 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                  <div className="flex items-center gap-3 text-left">
                    <div className="p-3 bg-cyan-600/30 border border-cyan-400 text-cyan-300 rounded-lg">
                      <Smartphone className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Instalación Móvil Directa</h4>
                      <p className="text-xs text-zinc-300 font-sans">
                        Presiona el botón para instalar el PII-LCC directamente en tu teléfono móvil con ícono táctico.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleNativeInstall}
                    className="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] cursor-pointer whitespace-nowrap"
                  >
                    <Download className="w-4 h-4" />
                    <span>INSTALAR APP EN ESTE CELULAR</span>
                  </button>
                </div>
              )}

              {/* QR Code + Direct Link Row for quick transfer from PC to Phone */}
              <div className="bg-[#090e17] border border-cyan-900/50 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row items-center gap-6">
                {/* QR Code Container */}
                <div className="shrink-0 flex flex-col items-center bg-[#050505] p-3 rounded-xl border border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                  <img
                    src={qrCodeImageUrl}
                    alt="Código QR para abrir en Celular"
                    className="w-44 h-44 rounded-lg bg-black object-contain"
                    loading="lazy"
                  />
                  <span className="text-[10px] text-emerald-400 font-bold mt-2 tracking-wider flex items-center gap-1">
                    <QrCode className="w-3.5 h-3.5" />
                    ESCANEAR CON LA CÁMARA
                  </span>
                </div>

                {/* Instructions to open on mobile */}
                <div className="flex-1 space-y-3 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wide">
                      Abre e Instala en tu Teléfono al Instante:
                    </span>
                  </div>

                  <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                    Apunta la cámara de tu smartphone (Android o iPhone) hacia el código QR para abrir de inmediato la aplicación. No necesitas cables ni descargar archivos externos.
                  </p>

                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] text-zinc-400 block font-mono">
                      ENLACE DIRECTO DEL SERVIDOR:
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={currentAppUrl}
                        className="flex-1 bg-[#050912] border border-zinc-700 rounded-lg px-3 py-2 text-xs text-emerald-400 font-mono select-all focus:outline-none"
                      />
                      <button
                        onClick={handleCopyLink}
                        className="bg-zinc-800 hover:bg-zinc-700 text-white px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        {copiedUrl ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">¡Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Guides for Android vs iOS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Android Guide */}
                <div className="bg-[#090e17] border border-zinc-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs border-b border-zinc-800 pb-2">
                    <Smartphone className="w-4 h-4" />
                    <span>ANDROID (CHROME / SAMSUNG BROWSER)</span>
                  </div>
                  <ol className="text-xs text-zinc-300 space-y-2.5 list-decimal list-inside font-sans">
                    <li>
                      Abre el enlace en <strong>Google Chrome</strong> en tu celular.
                    </li>
                    <li>
                      Toca los <strong>tres puntos (⋮)</strong> en la esquina superior derecha.
                    </li>
                    <li>
                      Selecciona <strong>"Instalar aplicación"</strong> o <strong>"Agregar a la pantalla principal"</strong>.
                    </li>
                    <li>
                      Presiona <strong>"Instalar"</strong>. El icono táctico de PII-LCC aparecerá en tus aplicaciones y funcionará a pantalla completa sin barra del navegador.
                    </li>
                  </ol>
                </div>

                {/* iPhone / iOS Guide */}
                <div className="bg-[#090e17] border border-zinc-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs border-b border-zinc-800 pb-2">
                    <Smartphone className="w-4 h-4" />
                    <span>IPHONE / IPAD (SAFARI)</span>
                  </div>
                  <ol className="text-xs text-zinc-300 space-y-2.5 list-decimal list-inside font-sans">
                    <li>
                      Abre el enlace en <strong>Safari</strong>.
                    </li>
                    <li>
                      Toca el botón <strong>Compartir</strong> (ícono de un cuadrado con una flecha hacia arriba <span className="text-cyan-400 font-mono font-bold">⎋</span> en la barra inferior).
                    </li>
                    <li>
                      Desliza hacia abajo en el menú y toca <strong>"Agregar a pantalla de inicio" (➕)</strong>.
                    </li>
                    <li>
                      Toca <strong>"Agregar"</strong> en la esquina superior derecha. La aplicación se ejecutará como app nativa independiente.
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PAQUETES Y ARCHIVOS DE INSTALACIÓN (.TAR.GZ / CODIGO) */}
          {activeTab === 'PACKAGES' && (
            <div className="space-y-4">
              <p className="text-xs text-zinc-300 font-sans">
                Descarga paquetes completos con instaladores y archivos de ejecución para desplegar la plataforma de forma local o transferirla vía memorias USB cifradas en ambientes tácticos aislados:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Desktop package (.tar.gz) */}
                <div className="bg-[#090e17] border border-zinc-800 hover:border-emerald-500/50 rounded-xl p-4 space-y-3 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700 px-2 py-0.5 rounded font-bold uppercase">
                        PC / SERVIDOR LOCAL
                      </span>
                      <h4 className="text-sm font-bold text-white mt-1">Paquete Completo PC (.tar.gz)</h4>
                    </div>
                    <Laptop className="w-5 h-5 text-emerald-400" />
                  </div>
                  <p className="text-xs text-zinc-400 font-sans">
                    Incluye código fuente, configuración Vite PWA, scripts de servidor Express y lanzadores automáticos para Windows, Linux y macOS.
                  </p>
                  <button
                    onClick={() => {
                      if (onDownloadDesktopPackage) onDownloadDesktopPackage();
                      playSyntheticBeep(750, 0.15);
                    }}
                    className="w-full bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar Paquete PC (.tar.gz)</span>
                  </button>
                </div>

                {/* Mobile package (.tar.gz) */}
                <div className="bg-[#090e17] border border-zinc-800 hover:border-cyan-500/50 rounded-xl p-4 space-y-3 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-700 px-2 py-0.5 rounded font-bold uppercase">
                        MÓVIL & TABLET TÁCTICA
                      </span>
                      <h4 className="text-sm font-bold text-white mt-1">Paquete Móvil Autónomo (.tar.gz)</h4>
                    </div>
                    <Smartphone className="w-5 h-5 text-cyan-400" />
                  </div>
                  <p className="text-xs text-zinc-400 font-sans">
                    Contiene el bundle PWA optimizado, Web App Manifest con íconos vectoriales y guía HTML de instalación en dispositivos celulares.
                  </p>
                  <button
                    onClick={() => {
                      if (onDownloadMobilePackage) onDownloadMobilePackage();
                      playSyntheticBeep(750, 0.15);
                    }}
                    className="w-full bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/40 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar Paquete Móvil (.tar.gz)</span>
                  </button>
                </div>
              </div>

              {/* Direct Individual Shortcut downloads */}
              <div className="bg-[#0a1220] border border-zinc-800 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Descargas Rápidas de Lanzadores
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    onClick={downloadWindowsBatLauncher}
                    className="bg-black/60 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 py-2 px-3 rounded text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <FileText className="w-3 h-3 text-blue-400" />
                    <span>Lanzador Windows (.bat)</span>
                  </button>

                  <button
                    onClick={downloadWindowsShortcut}
                    className="bg-black/60 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 py-2 px-3 rounded text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <FileText className="w-3 h-3 text-emerald-400" />
                    <span>Acceso Directo (.url)</span>
                  </button>

                  <button
                    onClick={downloadLinuxDesktopLauncher}
                    className="bg-black/60 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 py-2 px-3 rounded text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <FileText className="w-3 h-3 text-purple-400" />
                    <span>Lanzador Linux (.desktop)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Off-Grid capability alert */}
          <div className="bg-emerald-950/20 border border-emerald-500/40 rounded-xl p-3.5 flex items-start gap-3 text-xs">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="font-sans text-zinc-300 space-y-1">
              <strong className="text-emerald-300 font-mono block">CAPACIDAD DE OPERACIÓN AUTÓNOMA OFF-GRID:</strong>
              <p>
                Al instalar la aplicación en tu PC o teléfono celular mediante la tecnología PWA, los módulos de inteligencia, formularios de reportes de campo y cartografía se almacenan en la memoria local del dispositivo. Esto permite operar sin señal en pasos clandestinos fronterizos, sincronizándose automáticamente con la red C2 al recuperar cobertura.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-[#05080e] border-t border-zinc-800 px-5 py-3.5 flex items-center justify-between">
          <span className="text-[10px] text-zinc-500 font-mono">
            SISTEMA PII-LCC // SEGURIDAD DOCTRINAL S-2
          </span>
          <button
            onClick={onClose}
            className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold py-1.5 px-4 rounded-lg transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
