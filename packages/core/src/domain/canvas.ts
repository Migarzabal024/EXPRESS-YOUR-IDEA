import { z } from 'zod';
import { HexColorSchema } from './project';

export const CanvasModeSchema = z.enum(['infinite', 'pages']);
export type CanvasMode = z.infer<typeof CanvasModeSchema>;

export const WorkspaceSchema = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  name: z.string().trim().min(1).max(80),
  canvasMode: CanvasModeSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Workspace = z.infer<typeof WorkspaceSchema>;

export const CreateWorkspaceInputSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(80),
  canvasMode: CanvasModeSchema.default('infinite'),
});
export type CreateWorkspaceInput = z.input<typeof CreateWorkspaceInputSchema>;

export const UpdateWorkspaceInputSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    canvasMode: CanvasModeSchema,
  })
  .partial();
export type UpdateWorkspaceInput = z.infer<typeof UpdateWorkspaceInputSchema>;

export const CanvasPageSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  name: z.string().trim().min(1).max(80),
  width: z.number().int().min(50).max(20000),
  height: z.number().int().min(50).max(20000),
  backgroundColor: HexColorSchema,
  orderIndex: z.number().int().min(0),
});
export type CanvasPage = z.infer<typeof CanvasPageSchema>;

/**
 * Todos los tipos de elemento del MVP. `group` y `container` son elementos
 * más: los hijos los referencian con `parentGroupId`.
 */
export const ElementTypeSchema = z.enum([
  'text',
  'note',
  'image',
  'shape',
  'drawing',
  'highlighter',
  'audio',
  'group',
  'container',
]);
export type ElementType = z.infer<typeof ElementTypeSchema>;

export const CanvasElementSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  /** null = elemento del lienzo infinito. */
  pageId: z.uuid().nullable(),
  parentGroupId: z.uuid().nullable(),
  type: ElementTypeSchema,
  positionX: z.number(),
  positionY: z.number(),
  width: z.number().min(0),
  height: z.number().min(0),
  rotation: z.number(),
  zIndex: z.number().int(),
  /** Propiedades específicas del tipo; cada tipo tendrá su esquema Zod en la Etapa 2. */
  properties: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CanvasElement = z.infer<typeof CanvasElementSchema>;

export const ConnectionSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  sourceElementId: z.uuid(),
  targetElementId: z.uuid(),
  type: z.enum(['straight', 'elbow', 'curved']),
  properties: z.record(z.string(), z.unknown()),
});
export type Connection = z.infer<typeof ConnectionSchema>;

export const DrawingStrokeSchema = z.object({
  id: z.uuid(),
  canvasElementId: z.uuid(),
  /** Lista plana [x0, y0, presión0, x1, y1, presión1, ...]. */
  points: z.array(z.number()),
  color: HexColorSchema,
  width: z.number().positive(),
  opacity: z.number().min(0).max(1),
  toolType: z.enum(['pen', 'highlighter', 'eraser']),
});
export type DrawingStroke = z.infer<typeof DrawingStrokeSchema>;

export const AssetSchema = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  fileName: z.string(),
  /** Ruta relativa a la carpeta del proyecto, siempre con "/" (p. ej. assets/images/abc.png). */
  relativePath: z.string(),
  mimeType: z.string(),
  fileSize: z.number().int().min(0),
  checksum: z.string(),
  createdAt: z.string(),
});
export type Asset = z.infer<typeof AssetSchema>;

export const WorkspaceViewportSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  pageId: z.uuid().nullable(),
  zoom: z.number().positive(),
  offsetX: z.number(),
  offsetY: z.number(),
  updatedAt: z.string(),
});
export type WorkspaceViewport = z.infer<typeof WorkspaceViewportSchema>;
