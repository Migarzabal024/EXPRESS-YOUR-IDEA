/**
 * Identificadores UUID v4. `crypto.randomUUID` existe tanto en Node/Electron
 * como en el navegador, así que el dominio no depende de la plataforma.
 */
export function newId(): string {
  return globalThis.crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}
