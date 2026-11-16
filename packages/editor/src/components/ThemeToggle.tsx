import { Moon, Sun } from 'lucide-react';
import { useApi } from '../api-context';
import { resolveTheme, useAppStore } from '../state/app-store';

export function ThemeToggle() {
  const api = useApi();
  const settings = useAppStore((s) => s.settings);
  const setSettings = useAppStore((s) => s.setSettings);
  const current = resolveTheme(settings?.theme);
  const next = current === 'dark' ? 'light' : 'dark';

  return (
    <button
      className="icon-btn"
      title={next === 'dark' ? 'Cambiar a tema oscuro' : 'Cambiar a tema claro'}
      aria-label={next === 'dark' ? 'Cambiar a tema oscuro' : 'Cambiar a tema claro'}
      onClick={async () => setSettings(await api.settings.update({ theme: next }))}
    >
      {current === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
