import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// The palette, generated from packages/design-tokens so it cannot fork. It has to
// come first: every stylesheet below reads the custom properties it defines.
import 'virtual:tokens.css';
import './styles/shell.css';
import './styles/landing.css';
import './styles/diagrams.css';
import './styles/reference.css';
import './styles/sources.css';
import './styles/workbench-shell.css';

import { App } from './App';

const root = document.getElementById('root');
if (!root) throw new Error('index.html has no #root');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
