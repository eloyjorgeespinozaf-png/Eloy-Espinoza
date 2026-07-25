# PII-LCC // Plataforma Integrada de Inteligencia Militar

Este paquete contiene la versión autónoma e independiente de la **Plataforma Integrada de Inteligencia de la Línea de Control Clandestino (PII-LCC)**, lista para ser ejecutada de manera local en cualquier terminal u ordenador táctico de enlace de operaciones.

## Requisitos del Sistema
- **Node.js** (Versión 18 o superior). Descárguelo desde [https://nodejs.org/](https://nodejs.org/).

## Instrucciones de Inicio

### En sistemas Windows:
1. Haga doble clic sobre el archivo `iniciar_programa.bat`.
2. El script verificará su entorno, instalará automáticamente las dependencias del sistema táctico y arrancará el servidor.
3. Abra su navegador web e ingrese a: `http://localhost:3000`

### En sistemas macOS / Linux:
1. Abra su consola de comandos en este directorio.
2. Dé permisos de ejecución al script si es necesario:
   ```bash
   chmod +x iniciar_programa.sh
   ```
3. Ejecute el script de inicio:
   ```bash
   ./iniciar_programa.sh
   ```
4. Abra su navegador web e ingrese a: `http://localhost:3000`

## Características de la Versión de Programa
- **Ejecución Local Segura**: Funciona de forma aislada y sin necesidad de conexión externa al servidor central si es requerido.
- **Sincronización Multipunto**: Si hay otros terminales activos en la misma red local, el sistema continuará intentando establecer los enlaces tácticos de sincronización CAD-C2.
