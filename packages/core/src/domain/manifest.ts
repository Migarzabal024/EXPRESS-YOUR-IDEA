import { z } from 'zod';

/** Formato de carpeta de proyecto. Se incrementa si cambia la estructura física. */
export const PROJECT_FORMAT_VERSION = 1;
export const PROJECT_FORMAT_ID = 'express-your-idea/project';
export const MANIFEST_FILE = 'manifest.json';

/** Estructura física de cada proyecto (sección 8 del MVP). Rutas relativas. */
export const PROJECT_LAYOUT = {
  manifest: MANIFEST_FILE,
  database: 'database/project.db',
  images: 'assets/images',
  audio: 'assets/audio',
  documents: 'assets/documents',
  backups: 'backups',
  exports: 'exports',
} as const;

export const ProjectManifestSchema = z.object({
  format: z.literal(PROJECT_FORMAT_ID),
  formatVersion: z.number().int().positive(),
  /** Versión del esquema SQLite (cantidad de migraciones aplicadas). */
  schemaVersion: z.number().int().min(0),
  projectId: z.uuid(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  appVersion: z.string(),
});
export type ProjectManifest = z.infer<typeof ProjectManifestSchema>;
