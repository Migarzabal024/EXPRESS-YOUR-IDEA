import {
  PROJECT_COLORS,
  highlightPattern,
  isEmptyQuery,
  isExactTextMatch,
  matchesText,
  normalizeText,
  parseQuery,
  type ParsedQuery,
  type RecentProject,
} from '@eyi/core';

export { normalizeText };

export type SortMode = 'recent' | 'name' | 'color';

export interface ProjectFilters {
  query: string;
  /** Solo palabras completas ("dis" ya no encuentra "diseño"). */
  exact: boolean;
  /** Colores seleccionados (#RRGGBB). Vacío = todos. */
  colors: string[];
  sort: SortMode;
}

export const EMPTY_FILTERS: ProjectFilters = { query: '', exact: false, colors: [], sort: 'recent' };

const COLOR_NAMES: Record<string, string> = {
  '#6366F1': 'Índigo',
  '#0EA5E9': 'Celeste',
  '#14B8A6': 'Turquesa',
  '#22C55E': 'Verde',
  '#EAB308': 'Amarillo',
  '#F97316': 'Naranja',
  '#EF4444': 'Rojo',
  '#EC4899': 'Rosa',
  '#A855F7': 'Violeta',
  '#64748B': 'Pizarra',
};

export function colorName(hex: string): string {
  return COLOR_NAMES[hex.toUpperCase()] ?? hex.toUpperCase();
}

export function hasActiveFilters(f: ProjectFilters): boolean {
  return f.query.trim().length > 0 || f.colors.length > 0;
}

const paletteOrder = (hex: string): number => {
  const i = (PROJECT_COLORS as readonly string[]).indexOf(hex.toUpperCase());
  return i === -1 ? PROJECT_COLORS.length : i;
};

/** ¿El nombre del proyecto es exactamente lo buscado? */
export function isExactNameMatch(project: RecentProject, query: string): boolean {
  return isExactTextMatch(project.name, query);
}

/**
 * Filtra y ordena proyectos. Cada palabra y cada frase entre comillas debe
 * aparecer en el nombre o en la descripción. Un proyecto cuyo nombre es
 * exactamente lo buscado siempre queda primero.
 */
export function filterProjects(list: RecentProject[], f: ProjectFilters): RecentProject[] {
  const q = parseQuery(f.query);
  const colors = new Set(f.colors.map((c) => c.toUpperCase()));

  const result = list.filter((p) => {
    if (colors.size > 0 && !colors.has(p.color.toUpperCase())) return false;
    return matchesText(`${p.name}\n${p.description}`, q, f.exact);
  });

  const byName = (a: RecentProject, b: RecentProject) =>
    a.name.localeCompare(b.name, 'es', { sensitivity: 'base', numeric: true });

  switch (f.sort) {
    case 'name':
      result.sort(byName);
      break;
    case 'color':
      result.sort((a, b) => paletteOrder(a.color) - paletteOrder(b.color) || byName(a, b));
      break;
    default:
      result.sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt));
  }

  if (!isEmptyQuery(q)) {
    // Orden estable: los de nombre exacto suben, el resto conserva su orden.
    const exact = result.filter((p) => isExactNameMatch(p, f.query));
    if (exact.length) return [...exact, ...result.filter((p) => !exact.includes(p))];
  }
  return result;
}

/** Colores usados en la lista, con cuántos proyectos tiene cada uno, en el orden de la paleta. */
export function colorCounts(list: RecentProject[]): { color: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const p of list) {
    const c = p.color.toUpperCase();
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([color, count]) => ({ color, count }))
    .sort((a, b) => paletteOrder(a.color) - paletteOrder(b.color) || a.color.localeCompare(b.color));
}

/**
 * Parte un texto en tramos para resaltar las coincidencias de la búsqueda,
 * respetando tildes y mayúsculas del original.
 */
export function highlightSegments(
  text: string,
  q: ParsedQuery,
  exact = false,
): { text: string; match: boolean }[] {
  const pattern = highlightPattern(q, exact);
  if (!pattern || !text) return [{ text, match: false }];

  // Normalizamos carácter a carácter para conservar las posiciones del texto original.
  const chars = [...text];
  const norm = chars.map((ch) => normalizeText(ch));
  const owner: number[] = [];
  norm.forEach((n, i) => {
    for (let k = 0; k < n.length; k++) owner.push(i);
  });
  const flat = norm.join('');

  const marked = new Array<boolean>(chars.length).fill(false);
  for (const m of flat.matchAll(pattern)) {
    const start = m.index ?? 0;
    for (let k = start; k < start + m[0].length; k++) marked[owner[k]!] = true;
  }

  const segments: { text: string; match: boolean }[] = [];
  chars.forEach((ch, i) => {
    const last = segments[segments.length - 1];
    if (last && last.match === marked[i]) last.text += ch;
    else segments.push({ text: ch, match: marked[i]! });
  });
  return segments;
}
