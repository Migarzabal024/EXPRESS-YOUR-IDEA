import { resolve } from 'node:path';
import { AppError } from '@eyi/core';

/**
 * Lista de carpetas de proyecto que la interfaz tiene permitido tocar.
 * Una ruta entra solo si vino de un diálogo nativo, de la lista de recientes
 * o de un proyecto recién creado. Así, aunque la interfaz se viera comprometida,
 * no podría pedir que se abra o elimine una carpeta arbitraria del disco.
 */
export class PathGuard {
  private readonly allowed = new Set<string>();

  private normalize(path: string): string {
    const abs = resolve(path);
    return process.platform === 'win32' ? abs.toLowerCase() : abs;
  }

  allow(path: string): void {
    this.allowed.add(this.normalize(path));
  }

  revoke(path: string): void {
    this.allowed.delete(this.normalize(path));
  }

  assert(path: unknown): string {
    if (typeof path !== 'string' || path.length === 0 || !this.allowed.has(this.normalize(path))) {
      throw new AppError('VALIDATION', 'Ruta de proyecto no autorizada.');
    }
    return path;
  }
}
