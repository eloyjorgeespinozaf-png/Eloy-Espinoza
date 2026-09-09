/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// In-memory fallback dictionary if localStorage is unavailable or blocked in iframe
const memoryFallback: Record<string, string> = {};

export const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      // Fallback to memory
    }
    return memoryFallback[key] !== undefined ? memoryFallback[key] : null;
  },

  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch (e) {
      // Fallback to memory
    }
    memoryFallback[key] = value;
  },

  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
    } catch (e) {
      // Fallback to memory
    }
    delete memoryFallback[key];
  }
};
