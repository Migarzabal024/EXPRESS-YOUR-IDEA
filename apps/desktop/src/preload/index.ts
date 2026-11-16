import { contextBridge, ipcRenderer } from 'electron';
import { isAllowedChannel, type EyiBridge } from '@eyi/core/contract';

/**
 * Puente seguro entre la interfaz y el proceso principal.
 * La interfaz no tiene acceso a Node ni al sistema de archivos: solo puede
 * invocar los canales de la lista blanca definida en @eyi/core/contract.
 */
const bridge: EyiBridge = {
  appVersion:
    process.argv.find((a) => a.startsWith('--eyi-version='))?.split('=')[1] ?? '0.0.0',
  invoke: (channel, ...args) => {
    if (!isAllowedChannel(channel)) {
      return Promise.resolve({
        ok: false,
        error: { code: 'UNKNOWN', message: `Canal no permitido: ${String(channel)}` },
      });
    }
    return ipcRenderer.invoke(channel, ...args);
  },
};

contextBridge.exposeInMainWorld('eyiBridge', bridge);
