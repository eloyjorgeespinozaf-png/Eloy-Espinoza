// src/services/DeviceAuthService.ts

export const DeviceAuthService = {
  // Verifica si el dispositivo tiene acceso
  isDeviceAuthorized: (): boolean => {
    return localStorage.getItem('pii_lcc_device_token') === 'AUTHORIZED_NODE_PII_LCC';
  },

  // Autoriza el dispositivo
  authorizeDevice: (password: string): boolean => {
    // Nota: En producción, compara el hash de la contraseña, no el texto plano
    if (password === "CLAVE_OPERATIVA_SEGURA_2026") {
      localStorage.setItem('pii_lcc_device_token', 'AUTHORIZED_NODE_PII_LCC');
      return true;
    }
    return false;
  }
};
