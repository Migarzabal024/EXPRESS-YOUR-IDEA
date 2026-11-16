import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { asc, eq } from 'drizzle-orm';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import {
  AppError,
  friendlyMessage,
  MANIFEST_FILE,
  PROJECT_FORMAT_ID,
  PROJECT_FORMAT_VERSION,
  PROJECT_LAYOUT,
  ProjectManifestSchema,
  type Project,
  type ProjectManifest,
  type ProjectRepository,
  type ProjectSnapshot,
  type SearchHit,
  type SearchKind,
  type UpdateProjectInput,
  type UpdateWorkspaceInput,
  type Workspace,
} from '@eyi/core';
import * as schema from './schema/project';
import { NodeFileSystem, readJson, writeFileAtomic } from './node-fs';
import { PROJECT_MIGRATIONS, openSqlite, runMigrations, type SqliteDb } from './sqlite';

type ProjectDb = BetterSQLite3Database<typeof schema>;

export interface SqliteProjectRepositoryOptions {
  appVersion: string;
  /** Cómo eliminar la carpeta. En escritorio: enviar a la papelera. Por defecto: borrado definitivo. */
  trash?: (folderPath: string) => Promise<void>;
}

/**
 * Cada proyecto es una carpeta autocontenida:
 *   manifest.json · database/project.db · assets/{images,audio,documents} · backups · exports
 * La base se abre por operación: así el archivo queda consolidado en disco
 * (sin WAL pendiente) y la carpeta puede copiarse o empaquetarse en cualquier momento.
 */
export class SqliteProjectRepository implements ProjectRepository {
  private readonly fs = new NodeFileSystem();

  constructor(private readonly options: SqliteProjectRepositoryOptions) {}

  async create(folderPath: string, project: Project, firstWorkspace: Workspace): Promise<void> {
    if (await this.fs.exists(folderPath)) {
      throw new AppError('ALREADY_EXISTS', 'Ya existe una carpeta con ese nombre.');
    }
    try {
      await mkdir(folderPath, { recursive: true });
      for (const dir of [
        'database',
        PROJECT_LAYOUT.images,
        PROJECT_LAYOUT.audio,
        PROJECT_LAYOUT.documents,
        PROJECT_LAYOUT.backups,
        PROJECT_LAYOUT.exports,
      ]) {
        await mkdir(join(folderPath, dir), { recursive: true });
      }

      const schemaVersion = this.withDbSync(folderPath, (db, sqlite) => {
        const version = runMigrations(sqlite, PROJECT_MIGRATIONS);
        db.transaction((tx) => {
          tx.insert(schema.project).values(project).run();
          tx.insert(schema.workspace).values(firstWorkspace).run();
        });
        return version;
      });

      await this.writeManifest(folderPath, {
        format: PROJECT_FORMAT_ID,
        formatVersion: PROJECT_FORMAT_VERSION,
        schemaVersion,
        projectId: project.id,
        name: project.name,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        appVersion: this.options.appVersion,
      });
    } catch (err) {
      // Si falla a mitad de camino, no dejamos una carpeta corrupta.
      await rm(folderPath, { recursive: true, force: true }).catch(() => undefined);
      if (err instanceof AppError) throw err;
      const friendly = friendlyMessage(err);
      throw new AppError(friendly?.code ?? 'IO', friendly?.message ?? 'No se pudo crear el proyecto en esa carpeta. Prueba con otra ubicación.');
    }
  }

  async isProject(folderPath: string): Promise<boolean> {
    try {
      await this.readManifest(folderPath);
      return await this.fs.exists(join(folderPath, PROJECT_LAYOUT.database));
    } catch {
      return false;
    }
  }

  async read(folderPath: string): Promise<ProjectSnapshot> {
    const manifest = await this.readManifest(folderPath);
    if (manifest.formatVersion > PROJECT_FORMAT_VERSION) {
      throw new AppError(
        'INCOMPATIBLE_VERSION',
        'Este proyecto usa un formato más nuevo. Actualiza Express Your Idea para abrirlo.',
      );
    }
    const { project, workspaces, schemaVersion } = this.withDbSync(folderPath, (db, sqlite) => {
      const version = runMigrations(sqlite, PROJECT_MIGRATIONS);
      const row = db.select().from(schema.project).get();
      if (!row) throw new AppError('NOT_A_PROJECT', 'La base de datos del proyecto está vacía.');
      const ws = db
        .select()
        .from(schema.workspace)
        .where(eq(schema.workspace.projectId, row.id))
        .orderBy(asc(schema.workspace.createdAt))
        .all();
      return { project: row, workspaces: ws, schemaVersion: version };
    });
    if (manifest.schemaVersion !== schemaVersion) {
      await this.writeManifest(folderPath, { ...manifest, schemaVersion });
    }
    return { project, workspaces, folderPath };
  }

  async update(folderPath: string, patch: UpdateProjectInput, updatedAt: string): Promise<Project> {
    const project = this.withDbSync(folderPath, (db) => {
      const row = db.select().from(schema.project).get();
      if (!row) throw new AppError('NOT_FOUND', 'Proyecto no encontrado.');
      return db
        .update(schema.project)
        .set({ ...patch, updatedAt })
        .where(eq(schema.project.id, row.id))
        .returning()
        .get();
    });
    const manifest = await this.readManifest(folderPath);
    await this.writeManifest(folderPath, { ...manifest, name: project.name, updatedAt });
    return project;
  }

  async remove(folderPath: string): Promise<void> {
    if (this.options.trash) {
      await this.options.trash(folderPath);
    } else {
      await rm(folderPath, { recursive: true, force: true });
    }
  }

  async createWorkspace(folderPath: string, workspace: Workspace): Promise<void> {
    this.withDbSync(folderPath, (db) => {
      db.insert(schema.workspace).values(workspace).run();
    });
    await this.touchManifest(folderPath, workspace.updatedAt);
  }

  async updateWorkspace(
    folderPath: string,
    workspaceId: string,
    patch: UpdateWorkspaceInput,
    updatedAt: string,
  ): Promise<Workspace> {
    const ws = this.withDbSync(folderPath, (db) =>
      db
        .update(schema.workspace)
        .set({ ...patch, updatedAt })
        .where(eq(schema.workspace.id, workspaceId))
        .returning()
        .get(),
    );
    if (!ws) throw new AppError('NOT_FOUND', 'Espacio de trabajo no encontrado.');
    await this.touchManifest(folderPath, updatedAt);
    return ws;
  }

  async deleteWorkspace(folderPath: string, workspaceId: string): Promise<void> {
    this.withDbSync(folderPath, (db) => {
      db.delete(schema.workspace).where(eq(schema.workspace.id, workspaceId)).run();
    });
  }

  async search(
    folderPath: string,
    ftsQuery: string,
    filters: { kinds: SearchKind[]; workspaceId: string | null; limit: number },
  ): Promise<SearchHit[]> {
    const where = ['search_index MATCH @q'];
    const params: Record<string, unknown> = { q: ftsQuery, limit: filters.limit };
    if (filters.kinds.length > 0) {
      where.push(`kind IN (${filters.kinds.map((_, i) => `@k${i}`).join(', ')})`);
      filters.kinds.forEach((k, i) => (params[`k${i}`] = k));
    }
    if (filters.workspaceId) {
      where.push('workspace_id = @ws');
      params['ws'] = filters.workspaceId;
    }
    const sql = `
      SELECT kind, subtype, ref_id AS refId, workspace_id AS workspaceId,
             highlight(search_index, 4, char(1), char(2)) AS title,
             snippet(search_index, 5, char(1), char(2), '…', 16) AS snippet
      FROM search_index
      WHERE ${where.join(' AND ')}
      ORDER BY bm25(search_index, 0, 0, 0, 0, 8.0, 1.0)
      LIMIT @limit`;
    try {
      return this.withDbSync(folderPath, (_db, sqlite) => {
        runMigrations(sqlite, PROJECT_MIGRATIONS);
        return sqlite.prepare(sql).all(params) as SearchHit[];
      });
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError('VALIDATION', 'No se pudo interpretar la búsqueda.');
    }
  }

  // ---------- internos ----------

  private withDbSync<T>(folderPath: string, fn: (db: ProjectDb, sqlite: SqliteDb) => T): T {
    const sqlite = openSqlite(join(folderPath, PROJECT_LAYOUT.database));
    try {
      return fn(drizzle({ client: sqlite, schema }), sqlite);
    } finally {
      sqlite.close();
    }
  }

  private async readManifest(folderPath: string): Promise<ProjectManifest> {
    let raw: unknown;
    try {
      raw = await readJson(join(folderPath, MANIFEST_FILE));
    } catch {
      throw new AppError('NOT_A_PROJECT', 'No se encontró manifest.json en la carpeta.');
    }
    const parsed = ProjectManifestSchema.safeParse(raw);
    if (!parsed.success) throw new AppError('NOT_A_PROJECT', 'manifest.json no es válido.');
    return parsed.data;
  }

  private async writeManifest(folderPath: string, manifest: ProjectManifest): Promise<void> {
    await writeFileAtomic(join(folderPath, MANIFEST_FILE), `${JSON.stringify(manifest, null, 2)}\n`);
  }

  private async touchManifest(folderPath: string, updatedAt: string): Promise<void> {
    const manifest = await this.readManifest(folderPath);
    await this.writeManifest(folderPath, { ...manifest, updatedAt });
  }
}
