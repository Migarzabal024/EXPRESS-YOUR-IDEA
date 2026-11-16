import { useEffect, useState } from 'react';
import { FolderOpen } from 'lucide-react';
import { PROJECT_COLORS, type CanvasMode, type Project } from '@eyi/core';
import { errorMessage, useApi } from '../api-context';
import { useAppStore } from '../state/app-store';
import { Modal } from './Modal';

interface ProjectDialogProps {
  open: boolean;
  /** Si se pasa, el diálogo edita ese proyecto; si no, crea uno nuevo. */
  editing?: { project: Project; folderPath: string } | null;
  onClose(): void;
  onCreated?(folderPath: string): void;
  onUpdated?(project: Project): void;
}

export function ProjectDialog({ open, editing, onClose, onCreated, onUpdated }: ProjectDialogProps) {
  const api = useApi();
  const settings = useAppStore((s) => s.settings);
  const notify = useAppStore((s) => s.notify);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<string>(PROJECT_COLORS[0]);
  const [parentFolder, setParentFolder] = useState('');
  const [canvasMode, setCanvasMode] = useState<CanvasMode>('infinite');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setBusy(false);
    if (editing) {
      setName(editing.project.name);
      setDescription(editing.project.description);
      setColor(editing.project.color);
    } else {
      setName('');
      setDescription('');
      setColor(PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)]!);
      setParentFolder(settings?.defaultStoragePath ?? '');
      setCanvasMode(settings?.defaultCanvasMode ?? 'infinite');
    }
  }, [open, editing, settings]);

  const pickFolder = async () => {
    const picked = await api.projects.pickParentFolder(parentFolder || undefined);
    if (picked) setParentFolder(picked);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Escribe un nombre para el proyecto.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (editing) {
        const project = await api.projects.update(editing.folderPath, { name, description, color });
        notify('Cambios guardados');
        onUpdated?.(project);
      } else {
        const snapshot = await api.projects.create({
          name,
          description,
          color,
          parentFolder,
          defaultCanvasMode: canvasMode,
        });
        onCreated?.(snapshot.folderPath);
      }
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar proyecto' : 'Nuevo proyecto'}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button type="submit" form="project-form" className="btn btn--primary" disabled={busy}>
            {editing ? 'Guardar cambios' : 'Crear proyecto'}
          </button>
        </>
      }
    >
      <form id="project-form" className="form" onSubmit={submit}>
        <label className="field">
          <span className="field__label">Nombre</span>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder="Por ejemplo: Rediseño de mi tienda"
            autoFocus
          />
        </label>

        <label className="field">
          <span className="field__label">Descripción</span>
          <textarea
            className="input input--area"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="¿De qué trata esta idea? (opcional)"
          />
        </label>

        <fieldset className="field">
          <legend className="field__label">Color</legend>
          <div className="swatches" role="radiogroup" aria-label="Color del proyecto">
            {PROJECT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={c === color}
                aria-label={c}
                className="swatch"
                style={{ background: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </fieldset>

        {!editing && (
          <>
            <div className="field">
              <span className="field__label">Lienzo inicial</span>
              <div className="segmented">
                <button
                  type="button"
                  className="segmented__option"
                  aria-pressed={canvasMode === 'infinite'}
                  onClick={() => setCanvasMode('infinite')}
                >
                  Lienzo infinito
                </button>
                <button
                  type="button"
                  className="segmented__option"
                  aria-pressed={canvasMode === 'pages'}
                  onClick={() => setCanvasMode('pages')}
                >
                  Páginas
                </button>
              </div>
            </div>

            <div className="field">
              <span className="field__label">Dónde guardarlo</span>
              <div className="path-picker">
                <span className="path-picker__path" title={parentFolder}>
                  {parentFolder ? `\u200E${parentFolder}\u200E` : 'Sin carpeta elegida'}
                </span>
                <button type="button" className="btn btn--ghost btn--sm" onClick={pickFolder}>
                  <FolderOpen size={16} aria-hidden />
                  Cambiar
                </button>
              </div>
              <span className="field__hint">Se creará una carpeta con el nombre del proyecto.</span>
            </div>
          </>
        )}

        {error && (
          <p className="form__error" role="alert">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
