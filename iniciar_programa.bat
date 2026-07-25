@echo off
title PII-LCC // Plataforma Integrada de Inteligencia
echo =======================================================================
echo               PLATA-FORMA INTEGRADA DE INTELIGENCIA MILITAR
echo                        PII-LCC - INICIO SEGURO
echo =======================================================================
echo.
echo [1/3] Verificando entorno de ejecucion local...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado en este sistema.
    echo Por favor, instale Node.js desde https://nodejs.org/ antes de continuar.
    pause
    exit /b 1
)

echo [2/3] Instalando dependencias de red tactica...
call npm install

echo [3/3] Iniciando terminal local PII-LCC en puerto 3000...
echo Abra su navegador en http://localhost:3000
echo.
call npm run dev
pause
