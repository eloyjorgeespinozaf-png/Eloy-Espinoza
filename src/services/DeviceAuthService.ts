// src/services/DeviceAuthService.ts
import { safeStorage } from '../utils/storage';

export const DeviceAuthService = {
  // Dispositivo autorizado por defecto en la plataforma
  isDeviceAuthorized: (): boolean => {
    return true;
  },

  // Autoriza el dispositivo
  authorizeDevice: (_password: string): boolean => {
    safeStorage.setItem('pii_lcc_device_token', 'AUTHORIZED_NODE_PII_LCC');
    return true;
  }
};
