import { describe, expect, it } from 'vitest';
import { AppError, serializeError } from './errors';

const sysErr = (code: string) => Object.assign(new Error(`raw ${code} /some/path`), { code });

describe('serializeError', () => {
  it('conserva los errores de la aplicación tal cual', () => {
    expect(serializeError(new AppError('NOT_A_PROJECT', 'No es un proyecto'))).toEqual({
      code: 'NOT_A_PROJECT',
      message: 'No es un proyecto',
    });
  });

  it('traduce errores del sistema y de SQLite sin mostrar jerga', () => {
    for (const code of ['EACCES', 'EPERM', 'ENOSPC', 'EBUSY', 'SQLITE_BUSY', 'SQLITE_CORRUPT', 'SQLITE_READONLY', 'ENOENT']) {
      const { message } = serializeError(sysErr(code));
      expect(message).not.toMatch(/raw|SQLITE|E[A-Z]{3,}|\/some\/path/);
      expect(message.length).toBeGreaterThan(20);
    }
  });

  it('un error desconocido da un mensaje genérico y no el texto técnico', () => {
    const out = serializeError(new TypeError("Cannot read properties of undefined (reading 'x')"));
    expect(out.code).toBe('UNKNOWN');
    expect(out.message).not.toContain('Cannot read');
  });
});
