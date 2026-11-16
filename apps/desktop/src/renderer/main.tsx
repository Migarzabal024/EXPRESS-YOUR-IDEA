import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createIpcApi, type EyiBridge } from '@eyi/core/contract';
import { App } from '@eyi/editor';
import '@eyi/editor/styles.css';

declare global {
  interface Window {
    eyiBridge: EyiBridge;
  }
}

const api = createIpcApi(window.eyiBridge);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App api={api} />
  </StrictMode>,
);
