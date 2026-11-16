import { sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Esquema de la base de cada proyecto (sección 7 del MVP).
 * Fechas en ISO 8601 (text). JSON en columnas text.
 */

export const project = sqliteTable('project', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  color: text('color').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const workspace = sqliteTable(
  'workspace',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => project.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    canvasMode: text('canvas_mode', { enum: ['infinite', 'pages'] }).notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [index('workspace_project_idx').on(t.projectId)],
);

export const canvasPage = sqliteTable(
  'canvas_page',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspace.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    backgroundColor: text('background_color').notNull().default('#FFFFFF'),
    orderIndex: integer('order_index').notNull(),
  },
  (t) => [index('canvas_page_workspace_idx').on(t.workspaceId, t.orderIndex)],
);

export const canvasElement = sqliteTable(
  'canvas_element',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspace.id, { onDelete: 'cascade' }),
    pageId: text('page_id').references(() => canvasPage.id, { onDelete: 'cascade' }),
    parentGroupId: text('parent_group_id'),
    type: text('type').notNull(),
    positionX: real('position_x').notNull().default(0),
    positionY: real('position_y').notNull().default(0),
    width: real('width').notNull().default(0),
    height: real('height').notNull().default(0),
    rotation: real('rotation').notNull().default(0),
    zIndex: integer('z_index').notNull().default(0),
    propertiesJson: text('properties_json').notNull().default('{}'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [
    index('canvas_element_workspace_idx').on(t.workspaceId, t.pageId, t.zIndex),
    index('canvas_element_parent_idx').on(t.parentGroupId),
  ],
);

export const connection = sqliteTable(
  'connection',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspace.id, { onDelete: 'cascade' }),
    sourceElementId: text('source_element_id')
      .notNull()
      .references(() => canvasElement.id, { onDelete: 'cascade' }),
    targetElementId: text('target_element_id')
      .notNull()
      .references(() => canvasElement.id, { onDelete: 'cascade' }),
    type: text('type').notNull().default('straight'),
    propertiesJson: text('properties_json').notNull().default('{}'),
  },
  (t) => [index('connection_workspace_idx').on(t.workspaceId)],
);

export const drawingStroke = sqliteTable(
  'drawing_stroke',
  {
    id: text('id').primaryKey(),
    canvasElementId: text('canvas_element_id')
      .notNull()
      .references(() => canvasElement.id, { onDelete: 'cascade' }),
    /** JSON: [x, y, presión, ...] */
    pointsData: text('points_data').notNull(),
    color: text('color').notNull(),
    width: real('width').notNull(),
    opacity: real('opacity').notNull().default(1),
    toolType: text('tool_type').notNull(),
  },
  (t) => [index('drawing_stroke_element_idx').on(t.canvasElementId)],
);

export const asset = sqliteTable('asset', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => project.id, { onDelete: 'cascade' }),
  fileName: text('file_name').notNull(),
  relativePath: text('relative_path').notNull().unique(),
  mimeType: text('mime_type').notNull(),
  fileSize: integer('file_size').notNull(),
  checksum: text('checksum').notNull(),
  createdAt: text('created_at').notNull(),
});

export const workspaceViewport = sqliteTable(
  'workspace_viewport',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspace.id, { onDelete: 'cascade' }),
    pageId: text('page_id').references(() => canvasPage.id, { onDelete: 'cascade' }),
    zoom: real('zoom').notNull().default(1),
    offsetX: real('offset_x').notNull().default(0),
    offsetY: real('offset_y').notNull().default(0),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  },
  (t) => [index('workspace_viewport_idx').on(t.workspaceId, t.pageId)],
);
