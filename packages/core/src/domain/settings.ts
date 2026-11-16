import { z } from 'zod';
import { CanvasModeSchema } from './canvas';

export const ThemeSchema = z.enum(['light', 'dark', 'system']);
export type Theme = z.infer<typeof ThemeSchema>;

/** Preferencias de la aplicación. Son globales: no pertenecen a ningún proyecto. */
export const UserSettingsSchema = z.object({
  theme: ThemeSchema,
  defaultCanvasMode: CanvasModeSchema,
  autosaveEnabled: z.boolean(),
  defaultGridEnabled: z.boolean(),
  /** Carpeta donde se proponen los proyectos nuevos. */
  defaultStoragePath: z.string(),
});
export type UserSettings = z.infer<typeof UserSettingsSchema>;

export const UpdateUserSettingsSchema = UserSettingsSchema.partial();
export type UpdateUserSettings = z.infer<typeof UpdateUserSettingsSchema>;

export const RecentProjectSchema = z.object({
  projectId: z.string(),
  name: z.string(),
  description: z.string(),
  color: z.string(),
  folderPath: z.string(),
  lastOpenedAt: z.string(),
  /** Calculado al listar: la carpeta ya no existe o no es un proyecto válido. */
  missing: z.boolean().default(false),
});
export type RecentProject = z.infer<typeof RecentProjectSchema>;
