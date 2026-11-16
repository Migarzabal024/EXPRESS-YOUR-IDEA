import { create } from 'zustand';
import type { Project, ProjectSnapshot, Theme, UserSettings, Workspace } from '@eyi/core';
import { EMPTY_FILTERS, type ProjectFilters } from './project-filters';

type Screen =
  | { name: 'projects' }
  | { name: 'workspace'; snapshot: ProjectSnapshot; activeWorkspaceId: string };

export interface Toast {
  id: number;
  kind: 'info' | 'error';
  text: string;
}

interface AppState {
  screen: Screen;
  settings: UserSettings | null;
  toasts: Toast[];
  /** Filtros de la pantalla de proyectos; se conservan al entrar y salir de un proyecto. */
  projectFilters: ProjectFilters;

  setProjectFilters(patch: Partial<ProjectFilters>): void;
  setSettings(settings: UserSettings): void;
  openWorkspaceScreen(snapshot: ProjectSnapshot): void;
  goToProjects(): void;
  selectWorkspace(id: string): void;
  replaceProject(project: Project): void;
  upsertWorkspace(workspace: Workspace): void;
  removeWorkspace(id: string): void;
  notify(text: string, kind?: Toast['kind']): void;
  dismissToast(id: number): void;
}

let toastSeq = 0;

export const useAppStore = create<AppState>((set, get) => ({
  screen: { name: 'projects' },
  settings: null,
  toasts: [],
  projectFilters: EMPTY_FILTERS,

  setProjectFilters: (patch) => set({ projectFilters: { ...get().projectFilters, ...patch } }),
  setSettings: (settings) => set({ settings }),

  openWorkspaceScreen: (snapshot) =>
    set({
      screen: { name: 'workspace', snapshot, activeWorkspaceId: snapshot.workspaces[0]?.id ?? '' },
    }),

  goToProjects: () => set({ screen: { name: 'projects' } }),

  selectWorkspace: (id) => {
    const { screen } = get();
    if (screen.name === 'workspace') set({ screen: { ...screen, activeWorkspaceId: id } });
  },

  replaceProject: (project) => {
    const { screen } = get();
    if (screen.name === 'workspace') {
      set({ screen: { ...screen, snapshot: { ...screen.snapshot, project } } });
    }
  },

  upsertWorkspace: (workspace) => {
    const { screen } = get();
    if (screen.name !== 'workspace') return;
    const list = screen.snapshot.workspaces;
    const exists = list.some((w) => w.id === workspace.id);
    const workspaces = exists
      ? list.map((w) => (w.id === workspace.id ? workspace : w))
      : [...list, workspace];
    set({ screen: { ...screen, snapshot: { ...screen.snapshot, workspaces } } });
  },

  removeWorkspace: (id) => {
    const { screen } = get();
    if (screen.name !== 'workspace') return;
    const workspaces = screen.snapshot.workspaces.filter((w) => w.id !== id);
    const activeWorkspaceId =
      screen.activeWorkspaceId === id ? (workspaces[0]?.id ?? '') : screen.activeWorkspaceId;
    set({ screen: { ...screen, activeWorkspaceId, snapshot: { ...screen.snapshot, workspaces } } });
  },

  notify: (text, kind = 'info') => {
    const id = ++toastSeq;
    set({ toasts: [...get().toasts, { id, kind, text }] });
    setTimeout(() => get().dismissToast(id), kind === 'error' ? 6000 : 3500);
  },

  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export function resolveTheme(theme: Theme | undefined): 'light' | 'dark' {
  if (theme === 'light' || theme === 'dark') return theme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
