import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Kok bulunamadi: #root');
}

createRoot(container).render(
  <StrictMode>
    <p>iskelet · api v{window.api.version}</p>
  </StrictMode>,
);
