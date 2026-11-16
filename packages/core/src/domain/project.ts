import { z } from 'zod';

/** Colores identificadores sugeridos para proyectos. Se acepta cualquier hex. */
export const PROJECT_COLORS = [
  '#6366F1', // índigo
  '#0EA5E9', // celeste
  '#14B8A6', // turquesa
  '#22C55E', // verde
  '#EAB308', // amarillo
  '#F97316', // naranja
  '#EF4444', // rojo
  '#EC4899', // rosa
  '#A855F7', // violeta
  '#64748B', // pizarra
] as const;

export const HexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Color inválido; se espera formato #RRGGBB');

export const ProjectSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(80),
  description: z.string().max(500),
  color: HexColorSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Project = z.infer<typeof ProjectSchema>;

export const CreateProjectInputSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(80),
  description: z.string().trim().max(500).default(''),
  color: HexColorSchema.default(PROJECT_COLORS[0]),
  /** Carpeta padre elegida por el usuario. El proyecto se crea dentro, en su propia carpeta. */
  parentFolder: z.string().min(1),
  defaultCanvasMode: z.enum(['infinite', 'pages']).default('infinite'),
});
export type CreateProjectInput = z.input<typeof CreateProjectInputSchema>;

export const UpdateProjectInputSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    description: z.string().trim().max(500),
    color: HexColorSchema,
  })
  .partial();
export type UpdateProjectInput = z.infer<typeof UpdateProjectInputSchema>;

/** Convierte un nombre en un nombre de carpeta seguro para Windows, macOS y Linux. */
export function toFolderName(name: string): string {
  const cleaned = name
    .normalize('NFC')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '');
  const reserved = /^(con|prn|aux|nul|com\d|lpt\d)$/i;
  const base = cleaned.length === 0 || reserved.test(cleaned) ? 'Proyecto' : cleaned;
  return base.slice(0, 60);
}
