import { BrowserWindow, dialog, ipcMain, nativeTheme, shell, type IpcMainInvokeEvent } from 'electron';
import { z } from 'zod';
import {
  AppError,
  IPC,
  serializeError,
  type IpcChannel,
  type IpcResult,
  type ProjectService,
  type UserSettings,
} from '@eyi/core';
import type { PathGuard } from './path-guard';
import { logError } from './logger';

type Handler = (event: IpcMainInvokeEvent, ...args: unknown[]) => Promise<unknown> | unknown;

const OptionalString = z.string().optional();
const IdSchema = z.uuid();

export function applyTheme(theme: UserSettings['theme']): void {
  nativeTheme.themeSource = theme;
}

export function registerIpc(
  service: ProjectService,
  guard: PathGuard,
  isTrustedSender: (event: IpcMainInvokeEvent) => boolean,
): void {
  const handle = (channel: IpcChannel, handler: Handler) => {
    ipcMain.handle(channel, async (event, ...args): Promise<IpcResult<unknown>> => {
      try {
        if (!isTrustedSender(event)) throw new AppError('VALIDATION', 'Origen no autorizado.');
        return { ok: true, data: await handler(event, ...args) };
      } catch (err) {
        if (!(err instanceof AppError)) logError(`ipc:${channel}`, err);
        return { ok: false, error: serializeError(err) };
      }
    });
  };

  const windowOf = (event: IpcMainInvokeEvent) => BrowserWindow.fromWebContents(event.sender);

  // ---------- Proyectos ----------

  handle(IPC.projectsListRecent, async () => {
    const recent = await service.listRecent();
    for (const r of recent) guard.allow(r.folderPath);
    return recent;
  });

  handle(IPC.projectsCreate, async (_e, input) => {
    // La carpeta padre debe haberse elegido con el diálogo nativo (o ser la predeterminada).
    const parsed = z.object({ parentFolder: z.string() }).passthrough().parse(input);
    guard.assert(parsed.parentFolder);
    const snapshot = await service.createProject(parsed as never);
    guard.allow(snapshot.folderPath);
    return snapshot;
  });

  handle(IPC.projectsOpen, (_e, folderPath) => service.openProject(guard.assert(folderPath)));

  handle(IPC.projectsUpdate, (_e, folderPath, patch) =>
    service.updateProject(guard.assert(folderPath), patch as never),
  );

  handle(IPC.projectsRemove, async (_e, folderPath) => {
    const path = guard.assert(folderPath);
    await service.deleteProject(path);
    guard.revoke(path);
  });

  handle(IPC.projectsForgetRecent, async (_e, folderPath) => {
    const path = guard.assert(folderPath);
    await service.forgetRecent(path);
    guard.revoke(path);
  });

  handle(IPC.projectsPickExisting, async (event) => {
    const win = windowOf(event);
    const options: Electron.OpenDialogOptions = {
      title: 'Abrir proyecto de Express Your Idea',
      buttonLabel: 'Abrir proyecto',
      properties: ['openDirectory'],
    };
    const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options);
    const picked = result.canceled ? null : (result.filePaths[0] ?? null);
    if (picked) guard.allow(picked);
    return picked;
  });

  handle(IPC.projectsPickParentFolder, async (event, defaultPath) => {
    const win = windowOf(event);
    const options: Electron.OpenDialogOptions = {
      title: 'Elegir dónde guardar el proyecto',
      buttonLabel: 'Guardar aquí',
      properties: ['openDirectory', 'createDirectory'],
      defaultPath: OptionalString.parse(defaultPath),
    };
    const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options);
    const picked = result.canceled ? null : (result.filePaths[0] ?? null);
    if (picked) guard.allow(picked);
    return picked;
  });

  handle(IPC.projectsReveal, async (_e, folderPath) => {
    const error = await shell.openPath(guard.assert(folderPath));
    if (error) throw new AppError('IO', error);
  });

  handle(IPC.projectsSearch, (_e, folderPath, query, options) =>
    service.searchProject(guard.assert(folderPath), z.string().max(500).parse(query), (options ?? {}) as never),
  );

  // ---------- Espacios de trabajo ----------

  handle(IPC.workspacesCreate, (_e, folderPath, input) =>
    service.createWorkspace(guard.assert(folderPath), input as never),
  );

  handle(IPC.workspacesUpdate, (_e, folderPath, workspaceId, patch) =>
    service.updateWorkspace(guard.assert(folderPath), IdSchema.parse(workspaceId), patch as never),
  );

  handle(IPC.workspacesRemove, (_e, folderPath, workspaceId) =>
    service.deleteWorkspace(guard.assert(folderPath), IdSchema.parse(workspaceId)),
  );

  // ---------- Preferencias ----------

  handle(IPC.settingsGet, () => service.getSettings());

  handle(IPC.settingsUpdate, async (_e, patch) => {
    const settings = await service.updateSettings(patch as never);
    applyTheme(settings.theme);
    guard.allow(settings.defaultStoragePath);
    return settings;
  });
}
