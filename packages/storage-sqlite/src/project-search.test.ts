import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ProjectService, newId, nowIso, type ProjectSnapshot } from '@eyi/core';
import { SqliteAppRegistry } from './app-registry';
import { NodeFileSystem } from './node-fs';
import { SqliteProjectRepository } from './project-repository';
import { openSqlite } from './sqlite';

let root: string;
let registry: SqliteAppRegistry;
let service: ProjectService;
let snap: ProjectSnapshot;

function insertElement(
  workspaceId: string,
  type: string,
  properties: Record<string, unknown> | string,
): string {
  const id = newId();
  const sqlite = openSqlite(join(snap.folderPath, 'database/project.db'));
  const now = nowIso();
  sqlite
    .prepare(
      `INSERT INTO canvas_element (id, workspace_id, type, properties_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(id, workspaceId, type, typeof properties === 'string' ? properties : JSON.stringify(properties), now, now);
  sqlite.close();
  return id;
}

function exec(sql: string, ...args: unknown[]): void {
  const sqlite = openSqlite(join(snap.folderPath, 'database/project.db'));
  sqlite.prepare(sql).run(...args);
  sqlite.close();
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'eyi-search-'));
  registry = new SqliteAppRegistry(join(root, 'app.db'), { defaultStoragePath: root });
  service = new ProjectService(
    new SqliteProjectRepository({ appVersion: 'test' }),
    registry,
    new NodeFileSystem(),
  );
  snap = await service.createProject({
    name: 'Rediseño de la tienda',
    description: 'Moodboard y recorrido de compra',
    color: '#F97316',
    parentFolder: root,
  });
});

afterEach(async () => {
  registry.close();
  await rm(root, { recursive: true, force: true });
});

const ws = () => snap.workspaces[0]!.id;

describe('búsqueda interna del proyecto', () => {
  it('encuentra el nombre y la descripción del proyecto', async () => {
    const hits = await service.searchProject(snap.folderPath, 'moodboard');
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ kind: 'project', refId: snap.project.id });
    expect(hits[0]!.snippet).toContain('\u0001Moodboard\u0002');
  });

  it('indexa textos, notas, títulos y palabras clave de los elementos', async () => {
    const note = insertElement(ws(), 'note', {
      plainText: 'Probar una paleta cálida con terracota y arena',
      keywords: ['colores', 'marca'],
    });
    const text = insertElement(ws(), 'text', { title: 'Checkout', text: 'Reducir pasos del pago' });

    expect((await service.searchProject(snap.folderPath, 'paleta'))[0]?.refId).toBe(note);
    expect((await service.searchProject(snap.folderPath, 'marca'))[0]?.refId).toBe(note);
    const checkout = await service.searchProject(snap.folderPath, 'checkout');
    expect(checkout[0]).toMatchObject({ refId: text, kind: 'element', subtype: 'text' });
    expect(checkout[0]!.title).toBe('\u0001Checkout\u0002');
  });

  it('ignora tildes y busca por prefijo salvo en modo exacto', async () => {
    insertElement(ws(), 'note', { plainText: 'Ideas de diseño para el logo' });
    // El índice busca palabras que EMPIEZAN con lo escrito: "diseno" encuentra "diseño", no "Rediseño".
    expect(await service.searchProject(snap.folderPath, 'diseno')).toHaveLength(1);
    expect(await service.searchProject(snap.folderPath, 'dise')).toHaveLength(1);
    expect(await service.searchProject(snap.folderPath, 'redise')).toHaveLength(1);
    expect(await service.searchProject(snap.folderPath, 'dise', { exact: true })).toHaveLength(0);
    expect(await service.searchProject(snap.folderPath, 'diseño', { exact: true })).toHaveLength(1);
  });

  it('busca frases exactas entre comillas', async () => {
    insertElement(ws(), 'note', { plainText: 'la paleta cálida va primero' });
    insertElement(ws(), 'note', { plainText: 'cálida pero no paleta' });
    expect(await service.searchProject(snap.folderPath, '"paleta calida"')).toHaveLength(1);
    expect(await service.searchProject(snap.folderPath, 'paleta calida')).toHaveLength(2);
  });

  it('filtra por tipo y por espacio de trabajo', async () => {
    const other = await service.createWorkspace(snap.folderPath, { name: 'Bocetos de compra' });
    insertElement(ws(), 'note', { plainText: 'compra rápida' });
    insertElement(other.id, 'note', { plainText: 'compra en un paso' });

    const all = await service.searchProject(snap.folderPath, 'compra');
    expect(all.map((h) => h.kind).sort()).toEqual(['element', 'element', 'project', 'workspace']);

    const onlyElements = await service.searchProject(snap.folderPath, 'compra', { kinds: ['element'] });
    expect(onlyElements).toHaveLength(2);

    const scoped = await service.searchProject(snap.folderPath, 'compra', { workspaceId: other.id });
    expect(scoped.map((h) => h.kind).sort()).toEqual(['element', 'workspace']);
  });

  it('se mantiene al día al editar y eliminar', async () => {
    const id = insertElement(ws(), 'note', { plainText: 'borrador inicial' });
    exec(`UPDATE canvas_element SET properties_json = ? WHERE id = ?`, JSON.stringify({ plainText: 'versión final' }), id);
    expect(await service.searchProject(snap.folderPath, 'borrador')).toHaveLength(0);
    expect(await service.searchProject(snap.folderPath, 'final')).toHaveLength(1);

    await service.updateProject(snap.folderPath, { name: 'Tienda nueva' });
    expect(await service.searchProject(snap.folderPath, 'rediseño')).toHaveLength(0);
    expect(await service.searchProject(snap.folderPath, 'nueva')).toHaveLength(1);

    exec(`DELETE FROM canvas_element WHERE id = ?`, id);
    expect(await service.searchProject(snap.folderPath, 'final')).toHaveLength(0);
  });

  it('al eliminar un espacio desaparece también su contenido del índice', async () => {
    const other = await service.createWorkspace(snap.folderPath, { name: 'Temporal' });
    insertElement(other.id, 'note', { plainText: 'contenido efímero' });
    expect(await service.searchProject(snap.folderPath, 'efimero')).toHaveLength(1);
    await service.deleteWorkspace(snap.folderPath, other.id);
    expect(await service.searchProject(snap.folderPath, 'efimero')).toHaveLength(0);
  });

  it('indexa nombres de recursos y tolera propiedades inválidas', async () => {
    exec(
      `INSERT INTO asset (id, project_id, file_name, relative_path, mime_type, file_size, checksum, created_at)
       VALUES (?, ?, 'entrevista-vecinos.mp3', 'assets/audio/a.mp3', 'audio/mpeg', 10, 'x', ?)`,
      newId(),
      snap.project.id,
      nowIso(),
    );
    insertElement(ws(), 'note', 'esto no es json');
    const hits = await service.searchProject(snap.folderPath, 'vecinos');
    expect(hits[0]).toMatchObject({ kind: 'asset', subtype: 'audio/mpeg' });
  });

  it('una búsqueda vacía o solo con signos no devuelve nada ni falla', async () => {
    expect(await service.searchProject(snap.folderPath, '   ')).toEqual([]);
    expect(await service.searchProject(snap.folderPath, '"*" OR NEAR(')).toHaveLength(0);
  });
});
