import { useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Circle,
  Hand,
  Highlighter,
  Image,
  Layers,
  Minus,
  MousePointer2,
  Music,
  Pencil,
  Plus,
  Redo2,
  Save,
  Square,
  StickyNote,
  Trash2,
  Type,
  Undo2,
  Settings2,
  CircleHelp,
} from 'lucide-react';
import type { CanvasMode, Workspace } from '@eyi/core';
import { errorMessage, useApi } from '../api-context';
import { useAppStore } from '../state/app-store';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Modal } from '../components/Modal';
import { ProjectDialog } from '../components/ProjectDialog';
import { ThemeToggle } from '../components/ThemeToggle';
import { HelpDialog } from '../components/HelpDialog';
import { ProjectSearchPanel } from '../components/ProjectSearchPanel';

/** Herramientas del lienzo. Se activan en las etapas 2 y 3. */
const TOOLS = [
  { id: 'select', label: 'Seleccionar (V)', icon: MousePointer2 },
  { id: 'hand', label: 'Mano (H)', icon: Hand },
  { id: 'text', label: 'Texto (T)', icon: Type },
  { id: 'note', label: 'Nota (N)', icon: StickyNote },
  { id: 'rect', label: 'Rectángulo (R)', icon: Square },
  { id: 'ellipse', label: 'Círculo (O)', icon: Circle },
  { id: 'arrow', label: 'Flecha y conector (A)', icon: ArrowUpRight },
  { id: 'pen', label: 'Dibujo libre (P)', icon: Pencil },
  { id: 'highlighter', label: 'Resaltador (M)', icon: Highlighter },
  { id: 'image', label: 'Imagen (I)', icon: Image },
  { id: 'audio', label: 'Audio', icon: Music },
] as const;

export function WorkspaceScreen() {
  const api = useApi();
  const screen = useAppStore((s) => s.screen);
  const goToProjects = useAppStore((s) => s.goToProjects);
  const selectWorkspace = useAppStore((s) => s.selectWorkspace);
  const upsertWorkspace = useAppStore((s) => s.upsertWorkspace);
  const removeWorkspace = useAppStore((s) => s.removeWorkspace);
  const replaceProject = useAppStore((s) => s.replaceProject);
  const notify = useAppStore((s) => s.notify);

  const [tool, setTool] = useState<string>('select');
  const [newWsOpen, setNewWsOpen] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newWsMode, setNewWsMode] = useState<CanvasMode>('infinite');
  const [deletingWs, setDeletingWs] = useState<Workspace | null>(null);
  const [editingProject, setEditingProject] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  if (screen.name !== 'workspace') return null;
  const { snapshot, activeWorkspaceId } = screen;
  const { project, workspaces, folderPath } = snapshot;
  const active = workspaces.find((w) => w.id === activeWorkspaceId) ?? workspaces[0];

  const createWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const ws = await api.workspaces.create(folderPath, {
        name: newWsName.trim() || 'Nuevo espacio',
        canvasMode: newWsMode,
      });
      upsertWorkspace(ws);
      selectWorkspace(ws.id);
      setNewWsOpen(false);
      setNewWsName('');
    } catch (err) {
      notify(errorMessage(err), 'error');
    }
  };

  const confirmDeleteWs = async () => {
    if (!deletingWs) return;
    try {
      await api.workspaces.remove(folderPath, deletingWs.id);
      removeWorkspace(deletingWs.id);
      notify(`Espacio «${deletingWs.name}» eliminado`);
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setDeletingWs(null);
    }
  };

  const setMode = async (canvasMode: CanvasMode) => {
    if (!active || active.canvasMode === canvasMode) return;
    try {
      upsertWorkspace(await api.workspaces.update(folderPath, active.id, { canvasMode }));
    } catch (err) {
      notify(errorMessage(err), 'error');
    }
  };

  return (
    <div className="ws">
      {/* ---------- Barra superior ---------- */}
      <header className="ws__top">
        <div className="ws__top-left">
          <button className="icon-btn" onClick={goToProjects} aria-label="Volver a proyectos" title="Volver a proyectos">
            <ArrowLeft size={18} />
          </button>
          <button className="ws__project" onClick={() => setEditingProject(true)} title="Editar proyecto">
            <span className="ws__dot" style={{ background: project.color }} aria-hidden />
            <span className="ws__project-name">{project.name}</span>
            <span className="ws__sep" aria-hidden>/</span>
            <span className="ws__ws-name">{active?.name}</span>
          </button>
        </div>

        <div className="toolbar" role="toolbar" aria-label="Herramientas">
          {TOOLS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className="tool"
              aria-pressed={tool === id}
              aria-label={label}
              title={label}
              onClick={() => setTool(id)}
            >
              <Icon size={18} />
            </button>
          ))}
        </div>

        <div className="ws__top-right">
          <button className="icon-btn" aria-label="Deshacer (Ctrl+Z)" title="Deshacer (Ctrl+Z)" disabled>
            <Undo2 size={18} />
          </button>
          <button className="icon-btn" aria-label="Rehacer (Ctrl+Y)" title="Rehacer (Ctrl+Y)" disabled>
            <Redo2 size={18} />
          </button>
          <div className="zoom" aria-label="Zoom">
            <button className="icon-btn icon-btn--sm" aria-label="Alejar" disabled>
              <Minus size={16} />
            </button>
            <span className="zoom__value">100%</span>
            <button className="icon-btn icon-btn--sm" aria-label="Acercar" disabled>
              <Plus size={16} />
            </button>
          </div>
          <span className="save-state" title="Todos los cambios están guardados en tu computadora">
            <Save size={16} aria-hidden /> Guardado
          </span>
          <button className="icon-btn" onClick={() => setHelpOpen(true)} aria-label="Ayuda" title="Ayuda">
            <CircleHelp size={18} />
          </button>
          <ThemeToggle />
        </div>
      </header>

      {/* ---------- Barra lateral izquierda ---------- */}
      <aside className="ws__left" aria-label="Navegación y búsqueda">
        <ProjectSearchPanel
          key={folderPath}
          folderPath={folderPath}
          workspaces={workspaces}
          activeWorkspaceId={active?.id ?? ''}
        >
        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Espacios de trabajo</h2>
            <button className="icon-btn icon-btn--sm" aria-label="Nuevo espacio de trabajo" title="Nuevo espacio de trabajo" onClick={() => setNewWsOpen(true)}>
              <Plus size={16} />
            </button>
          </div>
          <ul className="nav-list">
            {workspaces.map((w) => (
              <li key={w.id} className="nav-list__row">
                <button
                  className="nav-list__item"
                  aria-current={w.id === active?.id ? 'page' : undefined}
                  onClick={() => selectWorkspace(w.id)}
                >
                  <Layers size={16} aria-hidden />
                  <span className="nav-list__label">{w.name}</span>
                </button>
                {workspaces.length > 1 && (
                  <button
                    className="icon-btn icon-btn--sm nav-list__action"
                    aria-label={`Eliminar ${w.name}`}
                    title="Eliminar espacio"
                    onClick={() => setDeletingWs(w)}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Lienzo</h2>
          </div>
          <div className="segmented segmented--full">
            <button className="segmented__option" aria-pressed={active?.canvasMode === 'infinite'} onClick={() => setMode('infinite')}>
              Infinito
            </button>
            <button className="segmented__option" aria-pressed={active?.canvasMode === 'pages'} onClick={() => setMode('pages')}>
              Páginas
            </button>
          </div>
          {active?.canvasMode === 'pages' && (
            <p className="panel__hint">Las páginas con tamaño, nombre y fondo propios llegan en la etapa 4.</p>
          )}
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Recursos</h2>
          </div>
          <p className="panel__hint">Las imágenes y los audios que importes aparecerán aquí.</p>
        </section>
        </ProjectSearchPanel>
      </aside>

      {/* ---------- Lienzo central ---------- */}
      <main className={`ws__canvas ${active?.canvasMode === 'pages' ? 'ws__canvas--pages' : ''}`} aria-label="Lienzo">
        {active?.canvasMode === 'pages' ? (
          <div className="page-sheet">
            <span className="page-sheet__label">Página 1 (A4 horizontal)</span>
          </div>
        ) : (
          <div className="canvas-empty">
            <p className="canvas-empty__title">Este es tu lienzo</p>
            <p className="canvas-empty__text">
              En la próxima etapa vas a poder escribir, pegar imágenes, dibujar y conectar ideas aquí.
            </p>
          </div>
        )}
      </main>

      {/* ---------- Panel derecho ---------- */}
      <aside className="ws__right" aria-label="Propiedades">
        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">
              <Settings2 size={14} aria-hidden /> Propiedades
            </h2>
          </div>
          <p className="panel__hint">Selecciona un elemento del lienzo para ver y cambiar su posición, tamaño, color y estilo.</p>
        </section>
        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Proyecto</h2>
          </div>
          <dl className="props">
            <dt>Carpeta</dt>
            <dd>
              <button className="link" onClick={() => api.projects.revealInFolder(folderPath)} title={folderPath}>
                {folderPath}
              </button>
            </dd>
            <dt>Espacios</dt>
            <dd>{workspaces.length}</dd>
          </dl>
        </section>
      </aside>

      <Modal
        open={newWsOpen}
        title="Nuevo espacio de trabajo"
        onClose={() => setNewWsOpen(false)}
        width={420}
        footer={
          <>
            <button className="btn btn--ghost" onClick={() => setNewWsOpen(false)}>
              Cancelar
            </button>
            <button className="btn btn--primary" type="submit" form="ws-form">
              Crear espacio
            </button>
          </>
        }
      >
        <form id="ws-form" className="form" onSubmit={createWorkspace}>
          <label className="field">
            <span className="field__label">Nombre</span>
            <input className="input" value={newWsName} onChange={(e) => setNewWsName(e.target.value)} placeholder="Por ejemplo: Bocetos" maxLength={80} autoFocus />
          </label>
          <div className="field">
            <span className="field__label">Tipo de lienzo</span>
            <div className="segmented">
              <button type="button" className="segmented__option" aria-pressed={newWsMode === 'infinite'} onClick={() => setNewWsMode('infinite')}>
                Lienzo infinito
              </button>
              <button type="button" className="segmented__option" aria-pressed={newWsMode === 'pages'} onClick={() => setNewWsMode('pages')}>
                Páginas
              </button>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deletingWs !== null}
        title="¿Eliminar este espacio de trabajo?"
        confirmLabel="Eliminar espacio"
        danger
        onConfirm={confirmDeleteWs}
        onCancel={() => setDeletingWs(null)}
      >
        <p>Se eliminará «{deletingWs?.name}» con todo lo que contiene. Esta acción no se puede deshacer.</p>
      </ConfirmDialog>

      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
      <ProjectDialog
        open={editingProject}
        editing={{ project, folderPath }}
        onClose={() => setEditingProject(false)}
        onUpdated={replaceProject}
      />
    </div>
  );
}
