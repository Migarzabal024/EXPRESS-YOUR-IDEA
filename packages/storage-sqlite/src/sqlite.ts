import Database from 'better-sqlite3';
import { AppError } from '@eyi/core';

export type SqliteDb = Database.Database;

/** Migraciones generadas por drizzle-kit, embebidas en el bundle (no dependen de rutas en disco). */
const projectMigrationFiles = import.meta.glob('../drizzle/project/*.sql', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const appMigrationFiles = import.meta.glob('../drizzle/app/*.sql', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function ordered(files: Record<string, string>): string[] {
  return Object.entries(files)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, content]) => content);
}

export const PROJECT_MIGRATIONS = ordered(projectMigrationFiles);
export const APP_MIGRATIONS = ordered(appMigrationFiles);

export function openSqlite(path: string): SqliteDb {
  const sqlite = new Database(path);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('busy_timeout = 5000');
  return sqlite;
}

/**
 * Aplica las migraciones pendientes. La versión de esquema se guarda en
 * `PRAGMA user_version` (= cantidad de migraciones aplicadas).
 * Cada migración corre en su propia transacción.
 * Devuelve la versión final.
 */
export function runMigrations(sqlite: SqliteDb, migrations: string[]): number {
  const current = sqlite.pragma('user_version', { simple: true }) as number;
  if (current > migrations.length) {
    throw new AppError(
      'INCOMPATIBLE_VERSION',
      'Este proyecto fue creado con una versión más nueva de Express Your Idea. Actualiza la aplicación para abrirlo.',
    );
  }
  for (let i = current; i < migrations.length; i++) {
    const statements = migrations[i]!
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter(Boolean);
    sqlite.transaction(() => {
      for (const statement of statements) sqlite.exec(statement);
      sqlite.pragma(`user_version = ${i + 1}`);
    })();
  }
  return migrations.length;
}
