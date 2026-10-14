/**
 * Deterministic build version generated during AI Studio iterations.
 * The client compares its own compiled buildId with the server's buildId.
 * An update prompt ONLY appears when a new modification has actually been made in AI Studio.
 */
export interface AppBuildInfo {
  version: string;
  buildId: string;
  builtAt: string;
  changelog: string;
}

export const AI_STUDIO_BUILD: AppBuildInfo = {
  version: "v2.5.2-AISTUDIO",
  buildId: "ais-build-2026-09-16-0815",
  builtAt: "2026-09-16T08:15:00.000Z",
  changelog: "Modificaciones de persistencia y sincronización multi-dispositivo aplicadas en AI Studio"
};
