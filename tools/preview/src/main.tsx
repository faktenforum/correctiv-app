import { createRoot } from 'react-dom/client';

import { App } from './App';
import { install } from './api';
import { start } from './store';
// eslint-disable-next-line import/no-unassigned-import -- the bundler turns this into the page's stylesheet
import './styles.css';

/**
 * The address bar is the shell's only persistence, so it is read before the
 * first render rather than adopted afterwards: a shell that painted its defaults
 * and then jumped to the link's device would make every screenshot handed over
 * as a URL a race.
 */
start();
install();

createRoot(document.getElementById('root')!).render(<App />);
