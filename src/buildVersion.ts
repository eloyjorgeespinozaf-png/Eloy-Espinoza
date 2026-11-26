/**
 * Deterministic build version generated automatically on every build.
 * The client compares its compiled buildId with /api/app-version so that
 * installed PWA devices on Android, iOS, and Desktop automatically receive
 * every new deployment without manual reinstallation.
 */
export interface AppBuildInfo {
  version: string;
  buildId: string;
  builtAt: string;
  changelog: string;
}

export const AI_STUDIO_BUILD: AppBuildInfo = {
  version: typeof __PII_LCC_APP_VERSION__ !== 'undefined' ? __PII_LCC_APP_VERSION__ : 'v2.6.0-OTA',
  buildId: typeof __PII_LCC_BUILD_ID__ !== 'undefined' ? __PII_LCC_BUILD_ID__ : 'ais-build-2026-11-26-ota',
  builtAt: typeof __PII_LCC_BUILT_AT__ !== 'undefined' ? __PII_LCC_BUILT_AT__ : '2026-11-26T22:50:00.000Z',
  changelog:
    typeof __PII_LCC_CHANGELOG__ !== 'undefined'
      ? __PII_LCC_CHANGELOG__
      : 'Actualización automática OTA para dispositivos instalados (PWA), mapa en vivo de patrullas y geocodificación nacional.'
};
