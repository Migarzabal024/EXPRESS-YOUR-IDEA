import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { app, BrowserWindow, dialog, nativeTheme, shell, type IpcMainInvokeEvent } from 'electron';
import { ProjectService } from '@eyi/core';
import { NodeFileSystem, SqliteAppRegistry, SqliteProjectRepository } from '@eyi/storage-sqlite';
import { applyTheme, registerIpc } from './ipc';
import { PathGuard } from './path-guard';
import { logError, logFilePath } from './logger';
import { friendlyMessage } from '@eyi/core';

const isDev = !app.isPackaged && Boolean(process.env['ELECTRON_RENDERER_URL']);
let registry: SqliteAppRegistry | null = null;

function isTrustedUrl(url: string): boolean {
  const devUrl = process.env['ELECTRON_RENDERER_URL'];
  if (isDev && devUrl && url.startsWith(devUrl)) return true;
  return url.startsWith('file://');
}

function isTrustedSender(event: IpcMainInvokeEvent): boolean {
  return isTrustedUrl(event.senderFrame?.url ?? '');
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 960,
    minHeight: 600,
    show: false,
    title: 'Express Your Idea',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#14161C' : '#F7F7F9',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: true,
      additionalArguments: [`--eyi-version=${app.getVersion()}`],
    },
  });

  win.once('ready-to-show', () => win.show());
  win.webContents.on('render-process-gone', (_e, details) => {
    logError('render-process-gone', details.reason);
    if (details.reason !== 'clean-exit') win.reload();
  });

  // Nada de navegar fuera de la app ni abrir ventanas nuevas: los enlaces externos van al navegador.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (!isTrustedUrl(url)) event.preventDefault();
  });

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    void win.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'));
  }
  return win;
}

async function bootstrap(): Promise<void> {
  // Agrupa la app correctamente en la barra de tareas de Windows.
  if (process.platform === 'win32') app.setAppUserModelId('com.expressyouridea.app');

  const defaultStoragePath = join(app.getPath('documents'), 'Express Your Idea');
  await mkdir(defaultStoragePath, { recursive: true });

  registry = new SqliteAppRegistry(join(app.getPath('userData'), 'app.db'), { defaultStoragePath });
  const repository = new SqliteProjectRepository({
    appVersion: app.getVersion(),
    // Eliminar un proyecto lo envía a la papelera de Windows: siempre se puede recuperar.
    trash: (folderPath) => shell.trashItem(folderPath),
  });
  const service = new ProjectService(repository, registry, new NodeFileSystem());

  const settings = await service.getSettings();
  applyTheme(settings.theme);

  const guard = new PathGuard();
  guard.allow(settings.defaultStoragePath);
  guard.allow(defaultStoragePath);

  registerIpc(service, guard, isTrustedSender);
  createWindow();
}

// Una sola instancia: si se abre otra vez, enfocamos la ventana existente.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  process.on('uncaughtException', (err) => logError('uncaughtException', err));
  process.on('unhandledRejection', (err) => logError('unhandledRejection', err));

  app.whenReady().then(bootstrap).catch((err) => {
    // Nunca cerrar en silencio: explicamos qué pasó y dónde está el registro.
    logError('inicio', err);
    const friendly = friendlyMessage(err);
    dialog.showErrorBox(
      'Express Your Idea no pudo iniciar',
      `${friendly?.message ?? 'Ocurrió un problema al preparar la aplicación.'}\n\n` +
        'Tus proyectos no se modificaron. Prueba reiniciar la computadora y abrir la aplicación de nuevo.\n\n' +
        `Si el problema continúa, envía este archivo a soporte:\n${logFilePath()}`,
    );
    app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('will-quit', () => {
    registry?.close();
  });
}
