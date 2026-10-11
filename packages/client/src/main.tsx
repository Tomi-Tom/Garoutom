import { MotionConfig } from 'motion/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@tombp/arcade/arcade.css';

import { App } from './App.js';
import './styles.css';

const container = document.getElementById('root');
if (container === null) {
  throw new Error('Point de montage introuvable : #root');
}

createRoot(container).render(
  <StrictMode>
    {/* `reducedMotion="user"` neutralise les animations de transformation pour
        qui a demandé moins de mouvement au niveau du système. La nuit du
        village doit se poser sans secousse pour personne. */}
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </StrictMode>,
);
