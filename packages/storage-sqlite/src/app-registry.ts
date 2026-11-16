import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { eq } from 'drizzle-orm';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { AppRegistry, RecentProject, UpdateUserSettings, UserSettings } from '@eyi/core';
import * as schema from './schema/app';
import { APP_MIGRATIONS, openSqlite, runMigrations, type SqliteDb } from './sqlite';

const SETTINGS_ID = 'default';
const MAX_RECENT = 30;

/**
 * Base global de la aplicación (app.db en la carpeta de datos del usuario).
 * Guarda preferencias y la lista de proyectos recientes. Se mantiene abierta
 * mientras la aplicación está en ejecución.
 */
export class SqliteAppRegistry implements AppRegistry {
  private readonly sqlite: SqliteDb;
  private readonly db: BetterSQLite3Database<typeof schema>;

  constructor(dbPath: string, defaults: { defaultStoragePath: string }) {
    mkdirSync(dirname(dbPath), { recursive: true });
    this.sqlite = openSqlite(dbPath);
    runMigrations(this.sqlite, APP_MIGRATIONS);
    this.db = drizzle({ client: this.sqlite, schema });
    this.db
      .insert(schema.userSettings)
      .values({ id: SETTINGS_ID, defaultStoragePath: defaults.defaultStoragePath })
      .onConflictDoNothing()
      .run();
  }

  async listRecent(): Promise<Omit<RecentProject, 'missing'>[]> {
    return this.db.select().from(schema.recentProject).all();
  }

  async upsertRecent(entry: Omit<RecentProject, 'missing'>): Promise<void> {
    this.db
      .insert(schema.recentProject)
      .values(entry)
      .onConflictDoUpdate({ target: schema.recentProject.folderPath, set: entry })
      .run();
    // Recortamos la lista a los más recientes.
    this.sqlite
      .prepare(
        `DELETE FROM recent_project WHERE folder_path NOT IN (
           SELECT folder_path FROM recent_project ORDER BY last_opened_at DESC LIMIT ?
         )`,
      )
      .run(MAX_RECENT);
  }

  async removeRecent(folderPath: string): Promise<void> {
    this.db.delete(schema.recentProject).where(eq(schema.recentProject.folderPath, folderPath)).run();
  }

  async getSettings(): Promise<UserSettings> {
    const row = this.db
      .select()
      .from(schema.userSettings)
      .where(eq(schema.userSettings.id, SETTINGS_ID))
      .get();
    if (!row) throw new Error('Preferencias no inicializadas');
    const { id: _id, ...settings } = row;
    return settings;
  }

  async updateSettings(patch: UpdateUserSettings): Promise<UserSettings> {
    if (Object.keys(patch).length > 0) {
      this.db
        .update(schema.userSettings)
        .set(patch)
        .where(eq(schema.userSettings.id, SETTINGS_ID))
        .run();
    }
    return this.getSettings();
  }

  close(): void {
    this.sqlite.close();
  }
}
