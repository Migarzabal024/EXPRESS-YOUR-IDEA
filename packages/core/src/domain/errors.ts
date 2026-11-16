export type AppErrorCode =
  | 'VALIDATION'
  | 'NOT_FOUND'
  | 'ALREADY_EXISTS'
  | 'NOT_A_PROJECT'
  | 'INCOMPATIBLE_VERSION'
  | 'IO'
  | 'CANCELLED'
  | 'UNKNOWN';

/** Error de aplicación con un código estable que puede cruzar IPC. */
export class AppError extends Error {
  readonly code: AppErrorCode;

  constructor(code: AppErrorCode, message: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
  }
}

export interface SerializedError {
  code: AppErrorCode;
  message: string;
}

/**
 * Traduce errores técnicos (sistema de archivos, SQLite) a mensajes que entiende
 * cualquier persona, con una indicación de qué hacer. Nunca muestra jerga.
 */
export function friendlyMessage(err: unknown): { code: AppErrorCode; message: string } | null {
  const code = err && typeof err === 'object' && 'code' in err ? String((err as { code: unknown }).code) : '';
  switch (true) {
    case code === 'ENOSPC' || code === 'SQLITE_FULL':
      return { code: 'IO', message: 'No queda espacio en el disco. Libera espacio y vuelve a intentarlo.' };
    case code === 'EACCES' || code === 'EPERM' || code === 'SQLITE_READONLY' || code === 'SQLITE_CANTOPEN':
      return {
        code: 'IO',
        message:
          'No hay permiso para guardar en esa carpeta. Elige otra (por ejemplo, Documentos) o revisa que no sea de solo lectura.',
      };
    case code === 'EBUSY' || code.startsWith('SQLITE_BUSY') || code.startsWith('SQLITE_LOCKED'):
      return {
        code: 'IO',
        message:
          'El proyecto está siendo usado por otro programa (por ejemplo, OneDrive sincronizando). Espera unos segundos y vuelve a intentarlo.',
      };
    case code.startsWith('SQLITE_CORRUPT') || code === 'SQLITE_NOTADB':
      return {
        code: 'IO',
        message:
          'El archivo del proyecto está dañado y no se puede abrir. Si tienes una copia de la carpeta del proyecto, ábrela desde «Abrir proyecto».',
      };
    case code === 'ENOENT':
      return { code: 'NOT_FOUND', message: 'No se encontró el archivo o la carpeta. Puede que se haya movido o eliminado.' };
    default:
      return null;
  }
}

export function serializeError(err: unknown): SerializedError {
  if (err instanceof AppError) return { code: err.code, message: err.message };
  if (err && typeof err === 'object' && 'issues' in err) {
    // ZodError
    return { code: 'VALIDATION', message: 'Revisa los datos ingresados: alguno no es válido.' };
  }
  const friendly = friendlyMessage(err);
  if (friendly) return friendly;
  return {
    code: 'UNKNOWN',
    message: 'Ocurrió un problema inesperado. Vuelve a intentarlo; si se repite, reinicia la aplicación.',
  };
}
