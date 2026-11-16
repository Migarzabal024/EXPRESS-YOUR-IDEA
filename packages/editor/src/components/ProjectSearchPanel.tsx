import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Circle,
  FileAudio,
  FileImage,
  FolderKanban,
  Frame,
  Group,
  Highlighter,
  Image,
  Layers,
  Music,
  Pencil,
  Search,
  StickyNote,
  Type,
  WholeWord,
  X,
  File,
  type LucideIcon,
} from 'lucide-react';
import { splitSnippet, type SearchHit, type SearchKind, type Workspace } from '@eyi/core';
import { errorMessage, useApi } from '../api-context';
import { useAppStore } from '../state/app-store';

type KindFilter = 'all' | 'element' | 'structure' | 'asset';

const KIND_FILTERS: { id: KindFilter; label: string; kinds: SearchKind[] }[] = [
  { id: 'all', label: 'Todo', kinds: [] },
  { id: 'element', label: 'Contenido', kinds: ['element'] },
  { id: 'structure', label: 'Espacios y páginas', kinds: ['workspace', 'page', 'project'] },
  { id: 'asset', label: 'Recursos', kinds: ['asset'] },
];

const GROUPS: { kind: SearchKind; label: string }[] = [
  { kind: 'element', label: 'Contenido del lienzo' },
  { kind: 'page', label: 'Páginas' },
  { kind: 'workspace', label: 'Espacios de trabajo' },
  { kind: 'asset', label: 'Recursos' },
  { kind: 'project', label: 'Proyecto' },
];

const ELEMENT_LABELS: Record<string, { label: string; icon: LucideIcon }> = {
  text: { label: 'Texto', icon: Type },
  note: { label: 'Nota', icon: StickyNote },
  image: { label: 'Imagen', icon: Image },
  shape: { label: 'Forma', icon: Circle },
  drawing: { label: 'Dibujo', icon: Pencil },
  highlighter: { label: 'Resaltado', icon: Highlighter },
  audio: { label: 'Audio', icon: Music },
  group: { label: 'Grupo', icon: Group },
  container: { label: 'Contenedor', icon: Frame },
};

function describeHit(hit: SearchHit): { label: string; icon: LucideIcon } {
  switch (hit.kind) {
    case 'element':
      return ELEMENT_LABELS[hit.subtype] ?? { label: 'Elemento', icon: File };
    case 'page':
      return { label: 'Página', icon: File };
    case 'workspace':
      return { label: 'Espacio de trabajo', icon: Layers };
    case 'project':
      return { label: 'Proyecto', icon: FolderKanban };
    case 'asset':
      if (hit.subtype.startsWith('image/')) return { label: 'Imagen', icon: FileImage };
      if (hit.subtype.startsWith('audio/')) return { label: 'Audio', icon: FileAudio };
      return { label: 'Documento', icon: File };
  }
}

function Marked({ text }: { text: string }): ReactNode {
  return splitSnippet(text).map((seg, i) =>
    seg.match ? (
      <mark key={i} className="hl hl--match">
        {seg.text}
      </mark>
    ) : (
      <span key={i}>{seg.text}</span>
    ),
  );
}

interface ProjectSearchPanelProps {
  folderPath: string;
  workspaces: Workspace[];
  activeWorkspaceId: string;
  /** Se muestra en lugar de los resultados cuando no hay búsqueda. */
  children: ReactNode;
}

/**
 * Buscador interno del proyecto. Busca palabras clave en todo lo que contiene:
 * textos, notas, títulos y palabras clave de elementos, páginas, espacios y recursos.
 */
export function ProjectSearchPanel({
  folderPath,
  workspaces,
  activeWorkspaceId,
  children,
}: ProjectSearchPanelProps) {
  const api = useApi();
  const selectWorkspace = useAppStore((s) => s.selectWorkspace);
  const notify = useAppStore((s) => s.notify);

  const [query, setQuery] = useState('');
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [onlyThisWorkspace, setOnlyThisWorkspace] = useState(false);
  const [exact, setExact] = useState(false);
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);

  // Ctrl+F dentro de un proyecto abre el buscador interno.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Búsqueda con una pequeña espera mientras se escribe; descarta respuestas viejas.
  useEffect(() => {
    if (!query.trim()) {
      setHits(null);
      return;
    }
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      try {
        const result = await api.projects.search(folderPath, query, {
          exact,
          kinds: KIND_FILTERS.find((k) => k.id === kindFilter)!.kinds,
          workspaceId: onlyThisWorkspace ? activeWorkspaceId : null,
        });
        if (id === requestId.current) setHits(result);
      } catch (err) {
        if (id === requestId.current) notify(errorMessage(err), 'error');
      }
    }, 140);
    return () => clearTimeout(timer);
  }, [api, folderPath, query, exact, kindFilter, onlyThisWorkspace, activeWorkspaceId, notify]);

  const workspaceName = useMemo(
    () => new Map(workspaces.map((w) => [w.id, w.name])),
    [workspaces],
  );

  const grouped = useMemo(
    () =>
      GROUPS.map((g) => ({ ...g, items: (hits ?? []).filter((h) => h.kind === g.kind) })).filter(
        (g) => g.items.length > 0,
      ),
    [hits],
  );

  const choose = (hit: SearchHit) => {
    setSelected(hit.refId);
    if (hit.workspaceId && workspaceName.has(hit.workspaceId)) selectWorkspace(hit.workspaceId);
  };

  const searching = query.trim().length > 0;

  return (
    <div className="psearch">
      <div className="psearch__box">
        <label className="search search--compact">
          <Search size={15} className="search__icon" aria-hidden />
          <input
            ref={inputRef}
            className="search__input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && query) {
                e.preventDefault();
                setQuery('');
              }
              if (e.key === 'Enter' && hits?.[0]) choose(hits[0]);
            }}
            placeholder="Buscar en este proyecto"
            aria-label="Buscar palabras clave en este proyecto"
          />
          {query ? (
            <button
              type="button"
              className="icon-btn icon-btn--sm search__clear"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              aria-label="Borrar búsqueda"
            >
              <X size={14} />
            </button>
          ) : (
            <kbd className="search__kbd" aria-hidden>
              Ctrl F
            </kbd>
          )}
        </label>

        {searching && (
          <div className="psearch__filters">
            <div className="chips chips--tight" role="group" aria-label="Qué buscar">
              {KIND_FILTERS.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  className="chip chip--sm"
                  aria-pressed={kindFilter === k.id}
                  onClick={() => setKindFilter(k.id)}
                >
                  {k.label}
                </button>
              ))}
            </div>
            <div className="psearch__toggles">
              <button
                type="button"
                className="toggle toggle--sm"
                aria-pressed={onlyThisWorkspace}
                onClick={() => setOnlyThisWorkspace(!onlyThisWorkspace)}
                title="Buscar solo en el espacio de trabajo abierto"
              >
                <Layers size={13} aria-hidden />
                Solo este espacio
              </button>
              <button
                type="button"
                className="toggle toggle--sm"
                aria-pressed={exact}
                onClick={() => setExact(!exact)}
                title="Solo palabras completas: «dise» ya no encuentra «diseño»"
              >
                <WholeWord size={13} aria-hidden />
                Palabra exacta
              </button>
            </div>
          </div>
        )}
      </div>

      {!searching ? (
        children
      ) : hits === null ? (
        <p className="panel__hint psearch__status">Buscando…</p>
      ) : hits.length === 0 ? (
        <div className="psearch__empty">
          <p className="psearch__empty-title">Sin resultados para «{query.trim()}»</p>
          <p className="panel__hint">
            {exact
              ? 'Prueba sin «Palabra exacta» para incluir palabras que empiezan así.'
              : 'Prueba con otra palabra, o escribe "entre comillas" una frase exacta.'}
          </p>
        </div>
      ) : (
        <div className="psearch__results" aria-live="polite">
          <p className="panel__hint psearch__status">
            {hits.length === 1 ? '1 resultado' : `${hits.length} resultados`}
          </p>
          {grouped.map((group) => (
            <section key={group.kind} className="psearch__group">
              <h3 className="psearch__group-title">
                {group.label} <span className="chip__count">{group.items.length}</span>
              </h3>
              <ul className="psearch__list">
                {group.items.map((hit) => {
                  const { label, icon: Icon } = describeHit(hit);
                  const where =
                    hit.kind !== 'workspace' && hit.workspaceId
                      ? workspaceName.get(hit.workspaceId)
                      : undefined;
                  return (
                    <li key={hit.refId}>
                      <button
                        type="button"
                        className="result"
                        aria-current={selected === hit.refId ? 'true' : undefined}
                        onClick={() => choose(hit)}
                      >
                        <Icon size={15} className="result__icon" aria-hidden />
                        <span className="result__body">
                          <span className="result__title">
                            {hit.title ? <Marked text={hit.title} /> : label}
                          </span>
                          {hit.snippet && (
                            <span className="result__snippet">
                              <Marked text={hit.snippet} />
                            </span>
                          )}
                          <span className="result__meta">
                            {label}
                            {where && ` en ${where}`}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
