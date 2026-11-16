import { useEffect, useRef, type ReactNode } from 'react';

interface ModalProps {
  title: string;
  open: boolean;
  onClose(): void;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}

/** Diálogo modal accesible basado en <dialog> nativo (foco atrapado y Escape incluidos). */
export function Modal({ title, open, onClose, children, footer, width = 480 }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="modal"
      style={{ width }}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="modal-title"
    >
      <div className="modal__body">
        <h2 id="modal-title" className="modal__title">
          {title}
        </h2>
        {children}
      </div>
      {footer && <div className="modal__footer">{footer}</div>}
    </dialog>
  );
}
