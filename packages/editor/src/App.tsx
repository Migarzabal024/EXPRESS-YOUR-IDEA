import { useEffect } from 'react';
import type { EyiApi } from '@eyi/core/contract';
import { ApiProvider, errorMessage } from './api-context';
import { resolveTheme, useAppStore } from './state/app-store';
import { ProjectsScreen } from './screens/ProjectsScreen';
import { WorkspaceScreen } from './screens/WorkspaceScreen';
import { Toasts } from './components/Toasts';

function ThemeSync() {
  const theme = useAppStore((s) => s.settings?.theme);
  useEffect(() => {
    const apply = () => {
      document.documentElement.dataset['theme'] = resolveTheme(theme);
    };
    apply();
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
  return null;
}

export function App({ api }: { api: EyiApi }) {
  const screen = useAppStore((s) => s.screen.name);
  const settings = useAppStore((s) => s.settings);
  const setSettings = useAppStore((s) => s.setSettings);
  const notify = useAppStore((s) => s.notify);

  useEffect(() => {
    api.settings
      .get()
      .then(setSettings)
      .catch((err) => notify(errorMessage(err), 'error'));
  }, [api, setSettings, notify]);

  return (
    <ApiProvider api={api}>
      <ThemeSync />
      {settings && (screen === 'projects' ? <ProjectsScreen /> : <WorkspaceScreen />)}
      <Toasts />
    </ApiProvider>
  );
}
