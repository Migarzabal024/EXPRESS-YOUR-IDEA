import type { Project, UpdateProjectInput } from '../domain/project';
import type { Workspace, UpdateWorkspaceInput } from '../domain/canvas';
import type { RecentProject, UserSettings, UpdateUserSettings } from '../domain/settings';
import type { SearchHit, SearchKind } from '../domain/search';

/**
 * Puertos (interfaces) que la capa de infraestructura implementa.
 * Escritorio: SQLite + sistema de archivos. Web (futuro): SQLite WASM + OPFS.
 * Todo es asíncrono para que ambas implementaciones encajen.
 */

export interface ProjectSnapshot {
  project: Project;
  workspaces: Workspace[];
  folderPath: string;
}

export interface ProjectRepository {
  /** Crea la carpeta del proyecto con su estructura, manifest y base de datos. */
  create(folderPath: string, project: Project, firstWorkspace: Workspace): Promise<void>;
  /** Lee el proyecto. Lanza NOT_A_PROJECT si la carpeta no es un proyecto válido. */
  read(folderPath: string): Promise<ProjectSnapshot>;
  isProject(folderPath: string): Promise<boolean>;
  update(folderPath: string, patch: UpdateProjectInput, updatedAt: string): Promise<Project>;
  /** Elimina el proyecto (en escritorio: lo envía a la papelera). */
  remove(folderPath: string): Promise<void>;

  createWorkspace(folderPath: string, workspace: Workspace): Promise<void>;
  updateWorkspace(
    folderPath: string,
    workspaceId: string,
    patch: UpdateWorkspaceInput,
    updatedAt: string,
  ): Promise<Workspace>;
  deleteWorkspace(folderPath: string, workspaceId: string): Promise<void>;

  /** Búsqueda en el índice interno del proyecto. `ftsQuery` ya viene en sintaxis FTS5. */
  search(
    folderPath: string,
    ftsQuery: string,
    filters: { kinds: SearchKind[]; workspaceId: string | null; limit: number },
  ): Promise<SearchHit[]>;
}

export interface FileSystemPort {
  exists(path: string): Promise<boolean>;
  join(...parts: string[]): string;
}

export interface AppRegistry {
  listRecent(): Promise<Omit<RecentProject, 'missing'>[]>;
  upsertRecent(entry: Omit<RecentProject, 'missing'>): Promise<void>;
  removeRecent(folderPath: string): Promise<void>;
  getSettings(): Promise<UserSettings>;
  updateSettings(patch: UpdateUserSettings): Promise<UserSettings>;
}
