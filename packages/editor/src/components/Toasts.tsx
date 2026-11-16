import { useAppStore } from '../state/app-store';

export function Toasts() {
  const toasts = useAppStore((s) => s.toasts);
  const dismiss = useAppStore((s) => s.dismissToast);
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <button
          key={t.id}
          className={`toast toast--${t.kind}`}
          onClick={() => dismiss(t.id)}
          role={t.kind === 'error' ? 'alert' : 'status'}
        >
          {t.text}
        </button>
      ))}
    </div>
  );
}
