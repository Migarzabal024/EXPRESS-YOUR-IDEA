import { z } from 'zod';

/**
 * Búsqueda compartida por la lista de proyectos (en memoria) y el buscador
 * interno de cada proyecto (SQLite FTS5).
 *
 * Sintaxis para el usuario:
 *   diseño logo        → contiene "diseño" y "logo", en cualquier orden
 *   "paleta cálida"    → la frase exacta, palabras juntas y en ese orden
 * Modo palabra exacta → "dis" ya no encuentra "diseño": solo palabras completas.
 * Siempre ignora tildes y mayúsculas.
 */

export interface ParsedQuery {
  /** Palabras sueltas, normalizadas. */
  terms: string[];
  /** Frases entre comillas, normalizadas (palabras separadas por un espacio). */
  phrases: string[];
}

/** Minúsculas y sin tildes: "Diseño" ↔ "diseno". */
export function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

/** Palabras de un texto normalizado (letras y números). */
function words(normalized: string): string[] {
  return normalized.match(/[\p{L}\p{N}]+/gu) ?? [];
}

export function parseQuery(query: string): ParsedQuery {
  const phrases: string[] = [];
  const rest = query.replace(/"([^"]*)"?/g, (_m, inner: string) => {
    const phrase = words(normalizeText(inner)).join(' ');
    if (phrase) phrases.push(phrase);
    return ' ';
  });
  return { terms: words(normalizeText(rest)), phrases };
}

export function isEmptyQuery(q: ParsedQuery): boolean {
  return q.terms.length === 0 && q.phrases.length === 0;
}

/** Todas las piezas que hay que resaltar (palabras y frases). */
export function highlightTerms(q: ParsedQuery): string[] {
  return [...q.phrases, ...q.terms];
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function containsWord(haystackWords: string, needle: string): boolean {
  // haystackWords: palabras separadas por un espacio, con espacios en los extremos.
  return haystackWords.includes(` ${needle} `);
}

/**
 * ¿El texto cumple la búsqueda? Cada palabra y cada frase deben aparecer.
 * Sin modo exacto, las palabras sueltas pueden ser parte de otra ("dis" → "diseño").
 * Las frases siempre exigen palabras completas y contiguas.
 */
export function matchesText(text: string, q: ParsedQuery, exact: boolean): boolean {
  if (isEmptyQuery(q)) return true;
  const normalized = normalizeText(text);
  const joined = ` ${words(normalized).join(' ')} `;
  const termsOk = q.terms.every((t) =>
    exact ? containsWord(joined, t) : normalized.includes(t),
  );
  return termsOk && q.phrases.every((p) => containsWord(joined, p));
}

/** ¿El texto ES exactamente lo buscado (ignorando tildes, mayúsculas y signos)? */
export function isExactTextMatch(text: string, query: string): boolean {
  const a = words(normalizeText(text)).join(' ');
  const b = words(normalizeText(query.replace(/"/g, ' '))).join(' ');
  return a.length > 0 && a === b;
}

/** Expresión regular para resaltar coincidencias sobre texto ya normalizado. */
export function highlightPattern(q: ParsedQuery, exact: boolean): RegExp | null {
  const parts = [
    ...q.phrases.map((p) => `(?<![\\p{L}\\p{N}])${p.split(' ').map(escapeRegex).join('[^\\p{L}\\p{N}]+')}(?![\\p{L}\\p{N}])`),
    ...q.terms.map((t) => (exact ? `(?<![\\p{L}\\p{N}])${escapeRegex(t)}(?![\\p{L}\\p{N}])` : escapeRegex(t))),
  ];
  return parts.length ? new RegExp(parts.join('|'), 'gu') : null;
}

/**
 * Traduce la búsqueda a la sintaxis de SQLite FTS5.
 * Sin modo exacto, cada palabra busca también por prefijo ("dis" → "diseño").
 * Devuelve null si no hay nada que buscar.
 */
export function buildFtsQuery(q: ParsedQuery, exact: boolean): string | null {
  if (isEmptyQuery(q)) return null;
  const quote = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const parts = [
    ...q.phrases.map(quote),
    ...q.terms.map((t) => (exact ? quote(t) : `${quote(t)}*`)),
  ];
  return parts.join(' AND ');
}

// ---------- Búsqueda interna de un proyecto ----------

export const SearchKindSchema = z.enum(['project', 'workspace', 'page', 'element', 'asset']);
export type SearchKind = z.infer<typeof SearchKindSchema>;

export const ProjectSearchOptionsSchema = z.object({
  exact: z.boolean().default(false),
  /** Vacío = todos los tipos. */
  kinds: z.array(SearchKindSchema).default([]),
  /** Si se indica, solo busca dentro de ese espacio de trabajo. */
  workspaceId: z.uuid().nullable().default(null),
  limit: z.number().int().min(1).max(500).default(200),
});
export type ProjectSearchOptions = z.input<typeof ProjectSearchOptionsSchema>;

/** Marcadores que el índice inserta alrededor de cada coincidencia en los fragmentos. */
export const SNIPPET_OPEN = '\u0001';
export const SNIPPET_CLOSE = '\u0002';

export interface SearchHit {
  kind: SearchKind;
  /** Tipo de elemento (text, note, image…) cuando kind = 'element'. */
  subtype: string;
  refId: string;
  workspaceId: string | null;
  /** Título con las coincidencias marcadas con SNIPPET_OPEN / SNIPPET_CLOSE. */
  title: string;
  /** Fragmento del contenido con las coincidencias marcadas (puede estar vacío). */
  snippet: string;
}

/** Parte un fragmento marcado en tramos { text, match } para pintarlo. */
export function splitSnippet(snippet: string): { text: string; match: boolean }[] {
  const out: { text: string; match: boolean }[] = [];
  const re = new RegExp(`${SNIPPET_OPEN}([^${SNIPPET_CLOSE}]*)${SNIPPET_CLOSE}`, 'g');
  let last = 0;
  for (let m = re.exec(snippet); m; m = re.exec(snippet)) {
    if (m.index > last) out.push({ text: snippet.slice(last, m.index), match: false });
    out.push({ text: m[1] ?? '', match: true });
    last = m.index + m[0].length;
  }
  if (last < snippet.length) out.push({ text: snippet.slice(last), match: false });
  return out;
}
