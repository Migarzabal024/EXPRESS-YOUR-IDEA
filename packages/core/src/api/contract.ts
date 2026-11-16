import type { SerializedError } from '../domain/errors';
import type { CreateProjectInput, Project, UpdateProjectInput } from '../domain/project';
import type { CreateWorkspaceInput, UpdateWorkspaceInput, Workspace } from '../domain/canvas';
import type { RecentProject, UpdateUserSettings, UserSettings } from '../domain/settings';
import type { ProjectSnapshot } from '../application/ports';
import type { ProjectSearchOptions, SearchHit } from '../domain/search';

/**
 * Contrato entre la interfaz (paquete editor) y la plataforma.
 * Escritorio: lo implementa el preload de Electron sobre IPC.
 * Web (futuro): lo implementará un adaptador sobre almacenamiento del navegador.
 * La interfaz SOLO habla con esta API; nunca con el sistema de archivos.
 */
export interface EyiApi {
  platform: 'desktop' | 'web';
  appVersion: string;

  projects: {
    listRecent(): Promise<RecentProject[]>;
    create(input: CreateProjectInput): Promise<ProjectSnapshot>;
    open(folderPath: string): Promise<ProjectSnapshot>;
    update(folderPath: string, patch: UpdateProjectInput): Promise<Project>;
    remove(folderPath: string): Promise<void>;
    forgetRecent(folderPath: string): Promise<void>;
    /** Muestra el diálogo nativo para elegir un proyecto existente. null si se canceló. */
    pickExisting(): Promise<string | null>;
    /** Muestra el diálogo nativo para elegir dónde guardar. null si se canceló. */
    pickParentFolder(defaultPath?: string): Promise<string | null>;
    /** Abre la carpeta del proyecto en el explorador del sistema. */
    revealInFolder(folderPath: string): Promise<void>;
    /** Buscador interno: palabras clave dentro de un proyecto. */
    search(folderPath: string, query: string, options?: ProjectSearchOptions): Promise<SearchHit[]>;
  };

  workspaces: {
    create(folderPath: string, input: CreateWorkspaceInput): Promise<Workspace>;
    update(folderPath: string, workspaceId: string, patch: UpdateWorkspaceInput): Promise<Workspace>;
    remove(folderPath: string, workspaceId: string): Promise<void>;
  };

  settings: {
    get(): Promise<UserSettings>;
    update(patch: UpdateUserSettings): Promise<UserSettings>;
  };
}

/** Nombres de canales IPC. Una sola fuente de verdad para main y preload. */
export const IPC = {
  projectsListRecent: 'projects:listRecent',
  projectsCreate: 'projects:create',
  projectsOpen: 'projects:open',
  projectsUpdate: 'projects:update',
  projectsRemove: 'projects:remove',
  projectsForgetRecent: 'projects:forgetRecent',
  projectsPickExisting: 'projects:pickExisting',
  projectsPickParentFolder: 'projects:pickParentFolder',
  projectsReveal: 'projects:reveal',
  projectsSearch: 'projects:search',
  workspacesCreate: 'workspaces:create',
  workspacesUpdate: 'workspaces:update',
  workspacesRemove: 'workspaces:remove',
  settingsGet: 'settings:get',
  settingsUpdate: 'settings:update',
} as const;
export type IpcChannel = (typeof IPC)[keyof typeof IPC];

/** Respuesta envuelta para que los códigos de error sobrevivan a IPC. */
export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: SerializedError };

/** Error que recibe la interfaz; conserva el código estable del error original. */
export class EyiError extends Error {
  readonly code: SerializedError['code'];

  constructor(error: SerializedError) {
    super(error.message);
    this.name = 'EyiError';
    this.code = error.code;
  }
}

/** Lo único que el preload expone a la interfaz: invocar canales permitidos. */
export interface EyiBridge {
  appVersion: string;
  invoke(channel: IpcChannel, ...args: unknown[]): Promise<IpcResult<unknown>>;
}

const ALLOWED = new Set<string>(Object.values(IPC));

export function isAllowedChannel(channel: unknown): channel is IpcChannel {
  return typeof channel === 'string' && ALLOWED.has(channel);
}

/** Construye la EyiApi tipada sobre el puente IPC. */
export function createIpcApi(bridge: EyiBridge): EyiApi {
  const call = async <T>(channel: IpcChannel, ...args: unknown[]): Promise<T> => {
    const result = (await bridge.invoke(channel, ...args)) as IpcResult<T>;
    if (result.ok) return result.data;
    throw new EyiError(result.error);
  };

  return {
    platform: 'desktop',
    appVersion: bridge.appVersion,
    projects: {
      listRecent: () => call(IPC.projectsListRecent),
      create: (input) => call(IPC.projectsCreate, input),
      open: (folderPath) => call(IPC.projectsOpen, folderPath),
      update: (folderPath, patch) => call(IPC.projectsUpdate, folderPath, patch),
      remove: (folderPath) => call(IPC.projectsRemove, folderPath),
      forgetRecent: (folderPath) => call(IPC.projectsForgetRecent, folderPath),
      pickExisting: () => call(IPC.projectsPickExisting),
      pickParentFolder: (defaultPath) => call(IPC.projectsPickParentFolder, defaultPath),
      revealInFolder: (folderPath) => call(IPC.projectsReveal, folderPath),
      search: (folderPath, query, options) => call(IPC.projectsSearch, folderPath, query, options),
    },
    workspaces: {
      create: (folderPath, input) => call(IPC.workspacesCreate, folderPath, input),
      update: (folderPath, workspaceId, patch) =>
        call(IPC.workspacesUpdate, folderPath, workspaceId, patch),
      remove: (folderPath, workspaceId) => call(IPC.workspacesRemove, folderPath, workspaceId),
    },
    settings: {
      get: () => call(IPC.settingsGet),
      update: (patch) => call(IPC.settingsUpdate, patch),
    },
  };
}
