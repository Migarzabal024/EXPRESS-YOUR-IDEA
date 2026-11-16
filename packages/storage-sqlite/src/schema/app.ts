import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/** Preferencias globales: una única fila con id = 'default'. */
export const userSettings = sqliteTable('user_settings', {
  id: text('id').primaryKey(),
  theme: text('theme', { enum: ['light', 'dark', 'system'] }).notNull().default('system'),
  defaultCanvasMode: text('default_canvas_mode', { enum: ['infinite', 'pages'] })
    .notNull()
    .default('infinite'),
  autosaveEnabled: integer('autosave_enabled', { mode: 'boolean' }).notNull().default(true),
  defaultGridEnabled: integer('default_grid_enabled', { mode: 'boolean' }).notNull().default(true),
  defaultStoragePath: text('default_storage_path').notNull(),
});

export const recentProject = sqliteTable('recent_project', {
  folderPath: text('folder_path').primaryKey(),
  projectId: text('project_id').notNull(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  color: text('color').notNull(),
  lastOpenedAt: text('last_opened_at').notNull(),
});
