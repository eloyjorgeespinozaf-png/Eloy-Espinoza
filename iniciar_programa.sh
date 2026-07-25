#!/bin/bash
clear
echo "======================================================================="
echo "              PLATA-FORMA INTEGRADA DE INTELIGENCIA MILITAR"
echo "                       PII-LCC - INICIO SEGURO"
echo "======================================================================="
echo ""
echo "[1/3] Verificando entorno de ejecución local..."
if ! command -v node &> /dev/null
then
    echo "[ERROR] Node.js no está instalado en este sistema."
    echo "Por favor, instale Node.js desde https://nodejs.org/ antes de continuar."
    exit 1
fi

echo "[2/3] Instalando dependencias de red táctica..."
npm install

echo "[3/3] Iniciando terminal local PII-LCC en puerto 3000..."
echo "Abra su navegador en http://localhost:3000"
echo ""
npm run dev
