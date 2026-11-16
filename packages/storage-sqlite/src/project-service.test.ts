import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ProjectService, type ProjectSnapshot } from '@eyi/core';
import { SqliteAppRegistry } from './app-registry';
import { NodeFileSystem } from './node-fs';
import { SqliteProjectRepository } from './project-repository';
import { PROJECT_MIGRATIONS, openSqlite } from './sqlite';

let root: string;
let registry: SqliteAppRegistry;
let service: ProjectService;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'eyi-test-'));
  registry = new SqliteAppRegistry(join(root, 'userData', 'app.db'), {
    defaultStoragePath: join(root, 'Proyectos'),
  });
  service = new ProjectService(
    new SqliteProjectRepository({ appVersion: '0.1.0-test' }),
    registry,
    new NodeFileSystem(),
  );
});

afterEach(async () => {
  registry.close();
  await rm(root, { recursive: true, force: true });
});

async function create(name = 'Mi idea'): Promise<ProjectSnapshot> {
  return service.createProject({ name, description: 'desc', color: '#22C55E', parentFolder: root });
}

describe('migraciones', () => {
  it('existen migraciones del proyecto generadas por drizzle-kit', () => {
    expect(PROJECT_MIGRATIONS.length).toBeGreaterThan(0);
  });
});

describe('crear proyecto', () => {
  it('crea la estructura de carpetas, el manifest y la base de datos', async () => {
    const snap = await create();
    expect(snap.folderPath).toBe(join(root, 'Mi idea'));
    expect(snap.workspaces).toHaveLength(1);

    const entries = await readdir(snap.folderPath);
    expect(entries.sort()).toEqual(['assets', 'backups', 'database', 'exports', 'manifest.json']);
    expect((await readdir(join(snap.folderPath, 'assets'))).sort()).toEqual([
      'audio',
      'documents',
      'images',
    ]);

    const manifest = JSON.parse(await readFile(join(snap.folderPath, 'manifest.json'), 'utf8'));
    expect(manifest).toMatchObject({
      format: 'express-your-idea/project',
      formatVersion: 1,
      projectId: snap.project.id,
      schemaVersion: PROJECT_MIGRATIONS.length,
    });

    // Todas las tablas del modelo de datos existen.
    const sqlite = openSqlite(join(snap.folderPath, 'database/project.db'));
    const tables = (
      sqlite.prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`).all() as {
        name: string;
      }[]
    ).map((t) => t.name);
    sqlite.close();
    expect(tables).toEqual(
      expect.arrayContaining([
        'project',
        'workspace',
        'canvas_page',
        'canvas_element',
        'connection',
        'drawing_stroke',
        'asset',
        'workspace_viewport',
      ]),
    );
  });

  it('no pisa una carpeta existente: agrega un sufijo', async () => {
    const a = await create('Repetido');
    const b = await create('Repetido');
    expect(a.folderPath).not.toBe(b.folderPath);
    expect(b.folderPath).toBe(join(root, 'Repetido (2)'));
  });

  it('limpia caracteres inválidos del nombre de carpeta', async () => {
    const snap = await create('Idea: ¿qué? <v1>');
    expect(snap.folderPath).toBe(join(root, 'Idea ¿qué v1'));
    expect(snap.project.name).toBe('Idea: ¿qué? <v1>');
  });

  it('rechaza nombres vacíos', async () => {
    await expect(create('   ')).rejects.toThrow();
  });
});

describe('abrir, editar y recientes', () => {
  it('reabre el proyecto con todos sus datos', async () => {
    const created = await create();
    const opened = await service.openProject(created.folderPath);
    expect(opened.project).toEqual(created.project);
    expect(opened.workspaces).toEqual(created.workspaces);
  });

  it('edita nombre, descripción y color', async () => {
    const { folderPath } = await create();
    const updated = await service.updateProject(folderPath, {
      name: 'Renombrado',
      description: 'nueva',
      color: '#EF4444',
    });
    expect(updated).toMatchObject({ name: 'Renombrado', description: 'nueva', color: '#EF4444' });
    const reopened = await service.openProject(folderPath);
    expect(reopened.project.name).toBe('Renombrado');
    const recent = await service.listRecent();
    expect(recent[0]?.name).toBe('Renombrado');
  });

  it('lista recientes y marca los que ya no existen', async () => {
    const a = await create('A');
    await create('B');
    await rm(a.folderPath, { recursive: true, force: true });
    const recent = await service.listRecent();
    expect(recent).toHaveLength(2);
    expect(recent.find((r) => r.name === 'A')?.missing).toBe(true);
    expect(recent.find((r) => r.name === 'B')?.missing).toBe(false);
  });

  it('se niega a abrir una carpeta que no es un proyecto', async () => {
    await expect(service.openProject(root)).rejects.toMatchObject({ code: 'NOT_A_PROJECT' });
  });
});

describe('eliminar', () => {
  it('elimina el proyecto y lo quita de recientes', async () => {
    const { folderPath } = await create();
    await service.deleteProject(folderPath);
    expect(await new NodeFileSystem().exists(folderPath)).toBe(false);
    expect(await service.listRecent()).toHaveLength(0);
  });

  it('nunca borra una carpeta que no es un proyecto', async () => {
    const other = join(root, 'documentos-personales');
    await (await import('node:fs/promises')).mkdir(other);
    await writeFile(join(other, 'importante.txt'), 'no borrar');
    await expect(service.deleteProject(other)).rejects.toMatchObject({ code: 'NOT_A_PROJECT' });
    expect(await new NodeFileSystem().exists(join(other, 'importante.txt'))).toBe(true);
  });
});

describe('espacios de trabajo', () => {
  it('crea, renombra y elimina espacios; nunca deja el proyecto sin ninguno', async () => {
    const { folderPath, workspaces } = await create();
    const ws = await service.createWorkspace(folderPath, { name: 'Bocetos', canvasMode: 'pages' });
    expect(ws.canvasMode).toBe('pages');

    const renamed = await service.updateWorkspace(folderPath, ws.id, { name: 'Bocetos v2' });
    expect(renamed.name).toBe('Bocetos v2');

    let snap = await service.openProject(folderPath);
    expect(snap.workspaces.map((w) => w.name)).toEqual(['Espacio principal', 'Bocetos v2']);

    await service.deleteWorkspace(folderPath, ws.id);
    snap = await service.openProject(folderPath);
    expect(snap.workspaces).toHaveLength(1);

    await expect(service.deleteWorkspace(folderPath, workspaces[0]!.id)).rejects.toMatchObject({
      code: 'VALIDATION',
    });
  });
});

describe('preferencias', () => {
  it('tiene valores por defecto y persiste los cambios', async () => {
    const defaults = await service.getSettings();
    expect(defaults).toMatchObject({ theme: 'system', autosaveEnabled: true });
    await service.updateSettings({ theme: 'dark' });
    expect((await service.getSettings()).theme).toBe('dark');
  });

  it('rechaza valores inválidos', async () => {
    await expect(service.updateSettings({ theme: 'neon' as never })).rejects.toThrow();
  });
});
