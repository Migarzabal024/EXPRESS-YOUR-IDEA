import { createContext, useContext, type ReactNode } from 'react';
import type { EyiApi } from '@eyi/core/contract';

const ApiContext = createContext<EyiApi | null>(null);

export function ApiProvider({ api, children }: { api: EyiApi; children: ReactNode }) {
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}

/** Acceso a la plataforma (escritorio hoy, web mañana). La interfaz no usa nada más. */
export function useApi(): EyiApi {
  const api = useContext(ApiContext);
  if (!api) throw new Error('useApi debe usarse dentro de <ApiProvider>');
  return api;
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Ocurrió un error inesperado.';
}
