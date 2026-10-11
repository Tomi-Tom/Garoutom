/**
 * La sonde du banc de chaos, chargée DANS le processus serveur (`--import`).
 *
 * Elle ne change rien au comportement du serveur : pas de gestionnaire
 * d'exception, pas de minuterie qui le maintiendrait en vie. Elle répond
 * seulement, par le canal IPC du processus enfant, à la question « combien de
 * mémoire, combien de sockets ouvertes ? ». Sans IPC (lancement à la main),
 * elle ne fait rien.
 */

interface Demande {
  type?: unknown;
  id?: unknown;
}

const envoyer = process.send?.bind(process);

if (envoyer) {
  process.on('message', (brut: unknown) => {
    const demande = (typeof brut === 'object' && brut !== null ? brut : {}) as Demande;
    if (demande.type !== 'mesure') return;
    const memoire = process.memoryUsage();
    const ressources = process.getActiveResourcesInfo();
    const parType: Record<string, number> = {};
    for (const nom of ressources) parType[nom] = (parType[nom] ?? 0) + 1;
    envoyer({
      type: 'mesure',
      id: demande.id,
      rss: memoire.rss,
      heapUsed: memoire.heapUsed,
      external: memoire.external,
      arrayBuffers: memoire.arrayBuffers,
      sockets: parType.TCPSocketWrap ?? 0,
      ressources: parType,
    });
  });
  // Le canal IPC ne doit pas, à lui seul, garder le serveur en vie.
  (process.channel as { unref?: () => void } | undefined)?.unref?.();
}
