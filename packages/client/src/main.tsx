import { MotionConfig } from 'motion/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@tombp/arcade/arcade.css';

import { App } from './App.js';
import { useReglages } from './lib/reglages.js';
import './styles.css';

const container = document.getElementById('root');
if (container === null) {
  throw new Error('Point de montage introuvable : #root');
}

/**
 * La racine lit le réglage d'animations : `user` suit le système, `always`
 * est le calme demandé dans les réglages. La nuit du village doit se poser
 * sans secousse pour qui l'a voulu, quelle que soit la machine.
 */
function Racine() {
  const { animations } = useReglages();
  return (
    <MotionConfig reducedMotion={animations === 'reduites' ? 'always' : 'user'}>
      <App />
    </MotionConfig>
  );
}

createRoot(container).render(
  <StrictMode>
    <Racine />
  </StrictMode>,
);
