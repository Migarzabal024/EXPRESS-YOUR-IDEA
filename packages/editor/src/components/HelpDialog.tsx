import { useApi } from '../api-context';
import { useAppStore } from '../state/app-store';
import { Modal } from './Modal';

/** Ayuda básica pensada para cualquier persona, sin términos técnicos. */
export function HelpDialog({ open, onClose }: { open: boolean; onClose(): void }) {
  const api = useApi();
  const settings = useAppStore((s) => s.settings);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ayuda"
      width={560}
      footer={
        <button className="btn btn--primary" onClick={onClose}>
          Entendido
        </button>
      }
    >
      <div className="help">
        <section>
          <h3 className="help__title">Dónde se guarda tu trabajo</h3>
          <p>
            Cada proyecto es una carpeta en tu computadora. Por defecto se crean en{' '}
            <strong className="help__path">{settings?.defaultStoragePath ?? 'Documentos'}</strong>.
            Todo se guarda ahí: textos, imágenes y audios. No hace falta internet ni una cuenta.
          </p>
        </section>
        <section>
          <h3 className="help__title">Copiar o llevar un proyecto a otra computadora</h3>
          <p>
            Copia la carpeta del proyecto completa (por ejemplo, a un pendrive o a OneDrive). En la
            otra computadora, instala Express Your Idea y usa <strong>Abrir proyecto</strong> para
            elegir esa carpeta.
          </p>
        </section>
        <section>
          <h3 className="help__title">Buscar</h3>
          <p>
            <kbd>Ctrl</kbd> + <kbd>F</kbd> busca proyectos en la pantalla principal, y palabras dentro
            del proyecto cuando tienes uno abierto. Escribe una frase “entre comillas” para buscarla
            exacta.
          </p>
        </section>
        <section>
          <h3 className="help__title">Si eliminas algo por error</h3>
          <p>
            Los proyectos eliminados van a la Papelera de reciclaje de Windows. Desde ahí puedes
            restaurarlos y volver a abrirlos con <strong>Abrir proyecto</strong>.
          </p>
        </section>
        <p className="help__version">Express Your Idea, versión {api.appVersion}</p>
      </div>
    </Modal>
  );
}
