import { describe, expect, it } from 'vitest';
import type { RecentProject } from '@eyi/core';
import {
  EMPTY_FILTERS,
  colorCounts,
  filterProjects,
  hasActiveFilters,
  highlightSegments,
} from './project-filters';
import { parseQuery } from '@eyi/core';

const p = (name: string, color: string, lastOpenedAt: string, description = ''): RecentProject => ({
  projectId: name,
  name,
  description,
  color,
  folderPath: `/p/${name}`,
  lastOpenedAt,
  missing: false,
});

const list = [
  p('Rediseño de la tienda', '#F97316', '2026-11-10', 'Moodboard y colores'),
  p('Tesis ciudades', '#14B8A6', '2026-11-15', 'Mapas y entrevistas'),
  p('Podcast', '#A855F7', '2026-11-12'),
  p('Árbol genealógico', '#f97316', '2026-11-01', 'Fotos de la familia'),
];

const names = (r: RecentProject[]) => r.map((x) => x.name);

describe('filterProjects', () => {
  it('sin filtros devuelve todo, del más reciente al más viejo', () => {
    expect(names(filterProjects(list, EMPTY_FILTERS))).toEqual([
      'Tesis ciudades',
      'Podcast',
      'Rediseño de la tienda',
      'Árbol genealógico',
    ]);
  });

  it('busca sin importar tildes ni mayúsculas, en nombre y descripción', () => {
    expect(names(filterProjects(list, { ...EMPTY_FILTERS, query: 'REDISENO' }))).toEqual([
      'Rediseño de la tienda',
    ]);
    expect(names(filterProjects(list, { ...EMPTY_FILTERS, query: 'arbol' }))).toEqual([
      'Árbol genealógico',
    ]);
    expect(names(filterProjects(list, { ...EMPTY_FILTERS, query: 'entrevistas' }))).toEqual([
      'Tesis ciudades',
    ]);
  });

  it('exige que aparezcan todas las palabras, en cualquier orden', () => {
    expect(names(filterProjects(list, { ...EMPTY_FILTERS, query: 'tienda moodboard' }))).toEqual([
      'Rediseño de la tienda',
    ]);
    expect(filterProjects(list, { ...EMPTY_FILTERS, query: 'tienda mapas' })).toEqual([]);
  });

  it('filtra por uno o varios colores, ignorando mayúsculas del hex', () => {
    expect(names(filterProjects(list, { ...EMPTY_FILTERS, colors: ['#F97316'] }))).toEqual([
      'Rediseño de la tienda',
      'Árbol genealógico',
    ]);
    expect(
      names(filterProjects(list, { ...EMPTY_FILTERS, colors: ['#F97316', '#A855F7'] })),
    ).toHaveLength(3);
  });

  it('combina color y búsqueda', () => {
    expect(
      names(filterProjects(list, { ...EMPTY_FILTERS, colors: ['#F97316'], query: 'familia' })),
    ).toEqual(['Árbol genealógico']);
  });

  it('ordena por nombre (alfabético español) y por color', () => {
    expect(names(filterProjects(list, { ...EMPTY_FILTERS, sort: 'name' }))).toEqual([
      'Árbol genealógico',
      'Podcast',
      'Rediseño de la tienda',
      'Tesis ciudades',
    ]);
    expect(names(filterProjects(list, { ...EMPTY_FILTERS, sort: 'color' }))).toEqual([
      'Tesis ciudades', // turquesa
      'Árbol genealógico', // naranja
      'Rediseño de la tienda', // naranja
      'Podcast', // violeta
    ]);
  });

  it('no modifica la lista original', () => {
    const copy = [...list];
    filterProjects(list, { ...EMPTY_FILTERS, sort: 'name' });
    expect(list).toEqual(copy);
  });
});

describe('búsqueda exacta', () => {
  const extra = [
    ...list,
    p('Podcast extra', '#64748B', '2026-11-16'),
    p('Diseño', '#0EA5E9', '2026-11-02'),
  ];

  it('el modo palabra exacta ignora coincidencias parciales', () => {
    expect(names(filterProjects(extra, { ...EMPTY_FILTERS, query: 'diseno' }))).toEqual([
      'Diseño',
      'Rediseño de la tienda',
    ]);
    expect(names(filterProjects(extra, { ...EMPTY_FILTERS, query: 'diseno', exact: true }))).toEqual([
      'Diseño',
    ]);
  });

  it('el proyecto con el nombre exacto queda primero aunque sea más viejo', () => {
    expect(names(filterProjects(extra, { ...EMPTY_FILTERS, query: 'podcast' }))).toEqual([
      'Podcast',
      'Podcast extra',
    ]);
  });

  it('las comillas buscan la frase exacta', () => {
    expect(names(filterProjects(extra, { ...EMPTY_FILTERS, query: '"de la tienda"' }))).toEqual([
      'Rediseño de la tienda',
    ]);
    expect(filterProjects(extra, { ...EMPTY_FILTERS, query: '"tienda de la"' })).toEqual([]);
  });

  it('en modo exacto solo resalta palabras completas', () => {
    expect(highlightSegments('Rediseño de diseño', parseQuery('diseno'), true)).toEqual([
      { text: 'Rediseño de ', match: false },
      { text: 'diseño', match: true },
    ]);
  });
});

describe('colorCounts', () => {
  it('cuenta proyectos por color en el orden de la paleta', () => {
    expect(colorCounts(list)).toEqual([
      { color: '#14B8A6', count: 1 },
      { color: '#F97316', count: 2 },
      { color: '#A855F7', count: 1 },
    ]);
  });
});

describe('highlightSegments', () => {
  it('marca las coincidencias conservando tildes del original', () => {
    expect(highlightSegments('Rediseño de la tienda', parseQuery('diseno'))).toEqual([
      { text: 'Re', match: false },
      { text: 'diseño', match: true },
      { text: ' de la tienda', match: false },
    ]);
  });

  it('sin búsqueda devuelve el texto entero', () => {
    expect(highlightSegments('Podcast', parseQuery(''))).toEqual([{ text: 'Podcast', match: false }]);
  });
});

describe('hasActiveFilters', () => {
  it('detecta búsqueda o colores, pero no el orden', () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, sort: 'name' })).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, query: ' x ' })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, colors: ['#F97316'] })).toBe(true);
  });
});
