import { appendFileSync, mkdirSync, renameSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';

const MAX_BYTES = 1_000_000;

/**
 * Registro de errores en %APPDATA%/Express Your Idea/logs/main.log.
 * La persona usuaria nunca ve detalles técnicos; si necesita ayuda,
 * puede enviar este archivo.
 */
export function logFilePath(): string {
  return join(app.getPath('userData'), 'logs', 'main.log');
}

export function logError(context: string, err: unknown): void {
  const detail = err instanceof Error ? `${err.message}\n${err.stack ?? ''}` : String(err);
  const line = `[${new Date().toISOString()}] ${context}: ${detail}\n`;
  console.error(line);
  try {
    const file = logFilePath();
    mkdirSync(join(file, '..'), { recursive: true });
    try {
      if (statSync(file).size > MAX_BYTES) renameSync(file, `${file}.old`);
    } catch {
      /* el archivo todavía no existe */
    }
    appendFileSync(file, line, 'utf8');
  } catch {
    /* si no se puede escribir el registro, no hacemos nada más */
  }
}
