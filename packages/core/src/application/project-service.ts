import { AppError } from '../domain/errors';
import { newId, nowIso } from '../domain/ids';
import {
  CreateProjectInputSchema,
  UpdateProjectInputSchema,
  toFolderName,
  type CreateProjectInput,
  type Project,
  type UpdateProjectInput,
} from '../domain/project';
import {
  CreateWorkspaceInputSchema,
  UpdateWorkspaceInputSchema,
  type CreateWorkspaceInput,
  type UpdateWorkspaceInput,
  type Workspace,
} from '../domain/canvas';
import {
  UpdateUserSettingsSchema,
  type RecentProject,
  type UpdateUserSettings,
  type UserSettings,
} from '../domain/settings';
import {
  ProjectSearchOptionsSchema,
  buildFtsQuery,
  parseQuery,
  type ProjectSearchOptions,
  type SearchHit,
} from '../domain/search';
import type { AppRegistry, FileSystemPort, ProjectRepository, ProjectSnapshot } from './ports';

/**
 * Casos de uso de gestión de proyectos y espacios de trabajo.
 * No conoce Electron, React ni SQLite: solo los puertos.
 */
export class ProjectService {
  constructor(
    private readonly repo: ProjectRepository,
    private readonly registry: AppRegistry,
    private readonly fs: FileSystemPort,
  ) {}

  // ---------- Proyectos ----------

  async createProject(rawInput: CreateProjectInput): Promise<ProjectSnapshot> {
    const input = CreateProjectInputSchema.parse(rawInput);
    const folderPath = await this.findFreeFolder(input.parentFolder, toFolderName(input.name));

    const now = nowIso();
    const project: Project = {
      id: newId(),
      name: input.name,
      description: input.description,
      color: input.color,
      createdAt: now,
      updatedAt: now,
    };
    const workspace: Workspace = {
      id: newId(),
      projectId: project.id,
      name: 'Espacio principal',
      canvasMode: input.defaultCanvasMode,
      createdAt: now,
      updatedAt: now,
    };

    await this.repo.create(folderPath, project, workspace);
    await this.touchRecent(project, folderPath);
    return { project, workspaces: [workspace], folderPath };
  }

  async openProject(folderPath: string): Promise<ProjectSnapshot> {
    if (!(await this.repo.isProject(folderPath))) {
      throw new AppError(
        'NOT_A_PROJECT',
        'La carpeta seleccionada no contiene un proyecto de Express Your Idea.',
      );
    }
    const snapshot = await this.repo.read(folderPath);
    await this.touchRecent(snapshot.project, folderPath);
    return snapshot;
  }

  async updateProject(folderPath: string, rawPatch: UpdateProjectInput): Promise<Project> {
    const patch = UpdateProjectInputSchema.parse(rawPatch);
    const project = await this.repo.update(folderPath, patch, nowIso());
    await this.touchRecent(project, folderPath);
    return project;
  }

  async deleteProject(folderPath: string): Promise<void> {
    if (await this.repo.isProject(folderPath)) {
      await this.repo.remove(folderPath);
    } else if (await this.fs.exists(folderPath)) {
      // Nunca borramos una carpeta que no sea un proyecto nuestro.
      throw new AppError(
        'NOT_A_PROJECT',
        'La carpeta no es un proyecto de Express Your Idea; no se eliminó.',
      );
    }
    await this.registry.removeRecent(folderPath);
  }

  async listRecent(): Promise<RecentProject[]> {
    const entries = await this.registry.listRecent();
    const checked = await Promise.all(
      entries.map(async (e) => ({ ...e, missing: !(await this.repo.isProject(e.folderPath)) })),
    );
    return checked.sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt));
  }

  async forgetRecent(folderPath: string): Promise<void> {
    await this.registry.removeRecent(folderPath);
  }

  // ---------- Espacios de trabajo ----------

  async createWorkspace(folderPath: string, rawInput: CreateWorkspaceInput): Promise<Workspace> {
    const input = CreateWorkspaceInputSchema.parse(rawInput);
    const { project } = await this.repo.read(folderPath);
    const now = nowIso();
    const workspace: Workspace = {
      id: newId(),
      projectId: project.id,
      name: input.name,
      canvasMode: input.canvasMode,
      createdAt: now,
      updatedAt: now,
    };
    await this.repo.createWorkspace(folderPath, workspace);
    return workspace;
  }

  async updateWorkspace(
    folderPath: string,
    workspaceId: string,
    rawPatch: UpdateWorkspaceInput,
  ): Promise<Workspace> {
    const patch = UpdateWorkspaceInputSchema.parse(rawPatch);
    return this.repo.updateWorkspace(folderPath, workspaceId, patch, nowIso());
  }

  async deleteWorkspace(folderPath: string, workspaceId: string): Promise<void> {
    const { workspaces } = await this.repo.read(folderPath);
    if (workspaces.length <= 1) {
      throw new AppError('VALIDATION', 'Un proyecto debe tener al menos un espacio de trabajo.');
    }
    await this.repo.deleteWorkspace(folderPath, workspaceId);
  }

  // ---------- Búsqueda interna ----------

  /**
   * Busca palabras clave dentro de un proyecto: nombre y descripción, espacios,
   * páginas, textos, notas, títulos, palabras clave de elementos y nombres de recursos.
   */
  async searchProject(
    folderPath: string,
    query: string,
    rawOptions: ProjectSearchOptions = {},
  ): Promise<SearchHit[]> {
    const options = ProjectSearchOptionsSchema.parse(rawOptions);
    if (typeof query !== 'string' || query.length > 500) {
      throw new AppError('VALIDATION', 'La búsqueda no es válida.');
    }
    const fts = buildFtsQuery(parseQuery(query), options.exact);
    if (!fts) return [];
    return this.repo.search(folderPath, fts, {
      kinds: options.kinds,
      workspaceId: options.workspaceId,
      limit: options.limit,
    });
  }

  // ---------- Preferencias ----------

  getSettings(): Promise<UserSettings> {
    return this.registry.getSettings();
  }

  async updateSettings(rawPatch: UpdateUserSettings): Promise<UserSettings> {
    return this.registry.updateSettings(UpdateUserSettingsSchema.parse(rawPatch));
  }

  // ---------- Internos ----------

  private async touchRecent(project: Project, folderPath: string): Promise<void> {
    await this.registry.upsertRecent({
      projectId: project.id,
      name: project.name,
      description: project.description,
      color: project.color,
      folderPath,
      lastOpenedAt: nowIso(),
    });
  }

  private async findFreeFolder(parent: string, baseName: string): Promise<string> {
    let candidate = this.fs.join(parent, baseName);
    for (let i = 2; await this.fs.exists(candidate); i++) {
      if (i > 999) throw new AppError('ALREADY_EXISTS', 'No se encontró un nombre de carpeta libre.');
      candidate = this.fs.join(parent, `${baseName} (${i})`);
    }
    return candidate;
  }
}
