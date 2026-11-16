import { useEffect, useRef } from 'react';
import { Check, Search, WholeWord, X } from 'lucide-react';
import type { RecentProject } from '@eyi/core';
import {
  colorCounts,
  colorName,
  hasActiveFilters,
  type SortMode,
} from '../state/project-filters';
import { useAppStore } from '../state/app-store';

const SORTS: { id: SortMode; label: string }[] = [
  { id: 'recent', label: 'Recientes' },
  { id: 'name', label: 'Nombre' },
  { id: 'color', label: 'Color' },
];

interface ProjectFilterBarProps {
  all: RecentProject[];
  visibleCount: number;
}

export function ProjectFilterBar({ all, visibleCount }: ProjectFilterBarProps) {
  const filters = useAppStore((s) => s.projectFilters);
  const setFilters = useAppStore((s) => s.setProjectFilters);
  const inputRef = useRef<HTMLInputElement>(null);
  const counts = colorCounts(all);
  const active = hasActiveFilters(filters);

  // Ctrl+F (o Cmd+F) enfoca la búsqueda.
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

  const toggleColor = (color: string) => {
    const selected = filters.colors.includes(color);
    setFilters({
      colors: selected ? filters.colors.filter((c) => c !== color) : [...filters.colors, color],
    });
  };

  return (
    <div className="filters" role="search">
      <div className="filters__row">
        <label className="search">
          <Search size={16} className="search__icon" aria-hidden />
          <input
            ref={inputRef}
            className="search__input"
            type="search"
            value={filters.query}
            onChange={(e) => setFilters({ query: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && filters.query) {
                e.preventDefault();
                setFilters({ query: '' });
              }
            }}
            placeholder='Buscar proyecto (usa "comillas" para una frase)'
            aria-label="Buscar proyectos"
          />
          {filters.query ? (
            <button
              type="button"
              className="icon-btn icon-btn--sm search__clear"
              onClick={() => {
                setFilters({ query: '' });
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

        <button
          type="button"
          className="toggle"
          aria-pressed={filters.exact}
          onClick={() => setFilters({ exact: !filters.exact })}
          title="Buscar solo palabras completas: «dis» ya no encuentra «diseño»"
        >
          <WholeWord size={16} aria-hidden />
          Palabra exacta
        </button>

        <div className="sort" role="group" aria-label="Ordenar por">
          <span className="sort__label">Ordenar por</span>
          <div className="segmented">
            {SORTS.map((s) => (
              <button
                key={s.id}
                type="button"
                className="segmented__option"
                aria-pressed={filters.sort === s.id}
                onClick={() => setFilters({ sort: s.id })}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {counts.length > 1 && (
        <div className="filters__row filters__row--colors">
          <div className="chips" role="group" aria-label="Filtrar por color">
            {counts.map(({ color, count }) => {
              const pressed = filters.colors.includes(color);
              return (
                <button
                  key={color}
                  type="button"
                  className="chip"
                  aria-pressed={pressed}
                  onClick={() => toggleColor(color)}
                  title={`${colorName(color)}: ${count} ${count === 1 ? 'proyecto' : 'proyectos'}`}
                >
                  <span className="chip__dot" style={{ background: color }} aria-hidden>
                    {pressed && <Check size={10} strokeWidth={3.5} />}
                  </span>
                  {colorName(color)}
                  <span className="chip__count">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {active && (
        <p className="filters__summary" aria-live="polite">
          {visibleCount === 1
            ? '1 proyecto'
            : `${visibleCount} proyectos`}{' '}
          de {all.length}
          <button
            type="button"
            className="link filters__reset"
            onClick={() => setFilters({ query: '', colors: [] })}
          >
            Quitar filtros
          </button>
        </p>
      )}
    </div>
  );
}
