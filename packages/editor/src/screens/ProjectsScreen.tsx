import { useCallback, useEffect, useMemo, useState } from 'react';
import { FolderOpen, MoreHorizontal, Pencil, Plus, Trash2, FolderSearch, X, CircleHelp } from 'lucide-react';
import type { Project, RecentProject } from '@eyi/core';
import { errorMessage, useApi } from '../api-context';
import { useAppStore } from '../state/app-store';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ProjectDialog } from '../components/ProjectDialog';
import { ThemeToggle } from '../components/ThemeToggle';
import { HelpDialog } from '../components/HelpDialog';
import { ProjectFilterBar } from '../components/ProjectFilterBar';
import { parseQuery, type ParsedQuery } from '@eyi/core';
import { filterProjects, highlightSegments, isExactNameMatch } from '../state/project-filters';

function Highlighted({ text, q, exact }: { text: string; q: ParsedQuery; exact: boolean }) {
  return (
    <>
      {highlightSegments(text, q, exact).map((seg, i) =>
        seg.match ? (
          <mark key={i} className="hl hl--match">
            {seg.text}
          </mark>
        ) : (
          seg.text
        ),
      )}
    </>
  );
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (diffDays < 1) return `Hoy, ${date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}`;
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return date.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function ProjectsScreen() {
  const api = useApi();
  const openWorkspaceScreen = useAppStore((s) => s.openWorkspaceScreen);
  const notify = useAppStore((s) => s.notify);
  const filters = useAppStore((s) => s.projectFilters);
  const setFilters = useAppStore((s) => s.setProjectFilters);

  const [recent, setRecent] = useState<RecentProject[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<{ project: Project; folderPath: string } | null>(null);
  const [deleting, setDeleting] = useState<RecentProject | null>(null);
  const [busy, setBusy] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setRecent(await api.projects.listRecent());
    } catch (err) {
      notify(errorMessage(err), 'error');
      setRecent([]);
    }
  }, [api, notify]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const visible = useMemo(() => (recent ? filterProjects(recent, filters) : []), [recent, filters]);
  const q = useMemo(() => parseQuery(filters.query), [filters.query]);

  // Si un color filtrado ya no existe en la lista (p. ej. se eliminó el proyecto), lo soltamos.
  useEffect(() => {
    if (!recent || filters.colors.length === 0) return;
    const present = new Set(recent.map((r) => r.color.toUpperCase()));
    const kept = filters.colors.filter((c) => present.has(c));
    if (kept.length !== filters.colors.length) setFilters({ colors: kept });
  }, [recent, filters.colors, setFilters]);

  useEffect(() => {
    if (!menuFor) return;
    const close = () => setMenuFor(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [menuFor]);

  const open = async (folderPath: string) => {
    try {
      openWorkspaceScreen(await api.projects.open(folderPath));
    } catch (err) {
      notify(errorMessage(err), 'error');
      void refresh();
    }
  };

  const openExisting = async () => {
    const folder = await api.projects.pickExisting();
    if (folder) await open(folder);
  };

  const startEdit = async (r: RecentProject) => {
    try {
      const snap = await api.projects.open(r.folderPath);
      setEditing({ project: snap.project, folderPath: r.folderPath });
    } catch (err) {
      notify(errorMessage(err), 'error');
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.projects.remove(deleting.folderPath);
      notify(`«${deleting.name}» se envió a la papelera`);
      setDeleting(null);
      await refresh();
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const forget = async (r: RecentProject) => {
    await api.projects.forgetRecent(r.folderPath);
    await refresh();
  };

  return (
    <div className="projects">
      <header className="projects__header">
        <div className="brand">
          <span className="brand__mark" aria-hidden>
            E
          </span>
          <span className="brand__name">Express Your Idea</span>
        </div>
        <div className="header-actions">
          <button className="icon-btn" onClick={() => setHelpOpen(true)} aria-label="Ayuda" title="Ayuda">
            <CircleHelp size={18} />
          </button>
          <ThemeToggle />
        </div>
      </header>

      <main className="projects__main">
        <div className="projects__intro">
          <h1 className="projects__title">
            <span className="hl">Tus proyectos</span>
          </h1>
          <div className="projects__actions">
            <button className="btn btn--ghost" onClick={openExisting}>
              <FolderOpen size={18} aria-hidden />
              Abrir proyecto
            </button>
            <button className="btn btn--primary" onClick={() => setCreating(true)}>
              <Plus size={18} aria-hidden />
              Nuevo proyecto
            </button>
          </div>
        </div>

        {recent === null ? null : recent.length === 0 ? (
          <section className="empty">
            <h2 className="empty__title">Todavía no hay proyectos</h2>
            <p className="empty__text">
              Una idea no tiene por qué empezar ordenada. Crea un proyecto y empieza a volcarla en el
              lienzo: textos, notas, imágenes, dibujos y audios.
            </p>
            <button className="btn btn--primary" onClick={() => setCreating(true)}>
              <Plus size={18} aria-hidden />
              Crear mi primer proyecto
            </button>
          </section>
        ) : (
          <>
          <ProjectFilterBar all={recent} visibleCount={visible.length} />
          {visible.length === 0 ? (
            <section className="empty empty--compact">
              <h2 className="empty__title">Ningún proyecto coincide</h2>
              <p className="empty__text">
                Prueba con otras palabras o quita algún color del filtro.
              </p>
              <button className="btn btn--ghost" onClick={() => setFilters({ query: '', colors: [] })}>
                Quitar filtros
              </button>
            </section>
          ) : (
          <ul className="cards">
            {visible.map((r) => (
              <li key={r.folderPath} className={`card${r.missing ? ' card--missing' : ''}`}>
                <span className="card__tab" style={{ background: r.color }} aria-hidden />
                <button
                  className="card__open"
                  onClick={() => (r.missing ? undefined : open(r.folderPath))}
                  disabled={r.missing}
                  aria-label={`Abrir ${r.name}`}
                >
                  <span className="card__name">
                    <Highlighted text={r.name} q={q} exact={filters.exact} />
                  </span>
                  <span className="card__desc">
                    {r.missing ? (
                      'No se encuentra la carpeta. Puede que se haya movido o eliminado.'
                    ) : r.description ? (
                      <Highlighted text={r.description} q={q} exact={filters.exact} />
                    ) : (
                      'Sin descripción'
                    )}
                  </span>
                  <span className="card__meta">
                    {formatDate(r.lastOpenedAt)}
                    {filters.query.trim() && isExactNameMatch(r, filters.query) && (
                      <span className="badge">Nombre exacto</span>
                    )}
                  </span>
                </button>

                <div className="card__menu">
                  <button
                    className="icon-btn icon-btn--sm"
                    aria-label={`Opciones de ${r.name}`}
                    aria-expanded={menuFor === r.folderPath}
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuFor(menuFor === r.folderPath ? null : r.folderPath);
                    }}
                  >
                    <MoreHorizontal size={18} />
                  </button>
                  {menuFor === r.folderPath && (
                    <div className="menu" role="menu">
                      {r.missing ? (
                        <button role="menuitem" className="menu__item" onClick={() => forget(r)}>
                          <X size={16} aria-hidden /> Quitar de la lista
                        </button>
                      ) : (
                        <>
                          <button role="menuitem" className="menu__item" onClick={() => startEdit(r)}>
                            <Pencil size={16} aria-hidden /> Editar
                          </button>
                          <button
                            role="menuitem"
                            className="menu__item"
                            onClick={() => api.projects.revealInFolder(r.folderPath)}
                          >
                            <FolderSearch size={16} aria-hidden /> Mostrar en carpeta
                          </button>
                          <button
                            role="menuitem"
                            className="menu__item menu__item--danger"
                            onClick={() => setDeleting(r)}
                          >
                            <Trash2 size={16} aria-hidden /> Eliminar
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
          )}
          </>
        )}
      </main>

      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
      <ProjectDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(folderPath) => void open(folderPath)}
      />
      <ProjectDialog
        open={editing !== null}
        editing={editing}
        onClose={() => setEditing(null)}
        onUpdated={() => void refresh()}
      />
      <ConfirmDialog
        open={deleting !== null}
        title="¿Eliminar este proyecto?"
        confirmLabel="Eliminar proyecto"
        danger
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      >
        <p>
          «{deleting?.name}» y todo su contenido (imágenes, audios y páginas) se enviarán a la
          papelera de Windows. Desde allí todavía puedes recuperarlo.
        </p>
      </ConfirmDialog>
    </div>
  );
}
