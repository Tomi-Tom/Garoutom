/**
 * Le `Channel` du moteur, branché sur le `ws` de Node.
 *
 * Les robots, le banc de chaos et les essais de bout en bout parlent au
 * serveur exactement comme le navigateur : par le canal du moteur
 * (`packages/engine/src/channel.ts`), avec son battement, son chien de garde,
 * sa reconnexion et ses codes de fermeture (D22). Ce fichier ne fait que lui
 * donner une socket — comme `packages/client/src/lib/socket.ts` le fait pour
 * le navigateur —, avec deux libertés de plus pour le banc :
 *
 * - des **en-têtes** à la bascule (`x-forwarded-for` : chaque table du banc
 *   joue depuis « son » Wi-Fi, derrière un serveur lancé avec
 *   `GAROUTOM_PROXY=1`) ;
 * - une **porte** : fermée, elle retient minuteries et évènements de socket,
 *   comme un téléphone en veille qui ne fait plus rien tourner ; rouverte,
 *   elle rend tout ce qui s'est accumulé, dans l'ordre.
 */

import WebSocket from 'ws';

import {
  Channel,
  withProtocolVersion,
  type ChannelOptions,
  type SocketLike,
  type TimerHandle,
  type Timers,
} from '@garoutom/engine';

/**
 * Des minuteries et un fil d'évènements qu'on peut suspendre : la veille d'un
 * téléphone. Une minuterie échue pendant la veille part au réveil, en retard,
 * comme dans un navigateur.
 */
export class Porte implements Timers {
  fermee = false;
  private retenus: (() => void)[] = [];

  readonly set = (run: () => void, delay: number): TimerHandle => {
    const poignee = { annulee: false, t: undefined as ReturnType<typeof setTimeout> | undefined };
    poignee.t = setTimeout(() => {
      this.passer(() => {
        if (!poignee.annulee) run();
      });
    }, delay);
    return poignee;
  };

  readonly clear = (handle: TimerHandle): void => {
    const poignee = handle as { annulee: boolean; t: ReturnType<typeof setTimeout> | undefined } | null;
    if (!poignee) return;
    poignee.annulee = true;
    clearTimeout(poignee.t);
  };

  /** Exécute maintenant, ou au réveil si la porte est fermée. */
  passer(f: () => void): void {
    if (this.fermee) this.retenus.push(f);
    else f();
  }

  fermer(): void {
    this.fermee = true;
  }

  /** Rouvre et rend, dans l'ordre, tout ce qui attendait. */
  ouvrir(): void {
    this.fermee = false;
    const retenus = this.retenus;
    this.retenus = [];
    for (const f of retenus) f();
  }
}

export interface OptionsSocketNode {
  /** En-têtes de la bascule HTTP (ex. `x-forwarded-for`). */
  entetes?: Record<string, string>;
  /** Appelé avec chaque socket brute créée : le banc la tue, la gèle, lui écrit. */
  surSocket?: (ws: WebSocket) => void;
  /** La porte de veille : ses évènements de socket attendent le réveil. */
  porte?: Porte;
}

/**
 * Adapte une socket `ws` à ce que le canal attend — le code de fermeture
 * compris : c'est lui qui dit « partie ouverte ailleurs » (4001) ou « le
 * serveur redémarre » (1012).
 */
export function socketNode(url: string, options: OptionsSocketNode = {}): SocketLike {
  const brut = new WebSocket(url, options.entetes ? { headers: options.entetes } : undefined);
  const porte = options.porte;
  const passer = (f: () => void): void => {
    if (porte) porte.passer(f);
    else f();
  };
  const like: SocketLike = {
    send: (data) => {
      if (brut.readyState === WebSocket.OPEN) brut.send(data);
    },
    close: () => {
      brut.close();
    },
    onopen: null,
    onclose: null,
    onmessage: null,
    onerror: null,
  };
  // Les rappels sont relus au moment de servir : un canal qui a débranché la
  // socket entre-temps (`detach`) ne reçoit plus rien d'elle.
  brut.on('open', () => {
    passer(() => like.onopen?.());
  });
  brut.on('close', (code: number) => {
    passer(() => like.onclose?.({ code }));
  });
  brut.on('error', () => {
    passer(() => like.onerror?.());
  });
  brut.on('message', (raw: unknown) => {
    const data = String(raw);
    passer(() => like.onmessage?.({ data }));
  });
  options.surSocket?.(brut);
  return like;
}

export interface OptionsCanalNode extends OptionsSocketNode {
  /** Le journal des incidents du lien (défaut : silence). */
  log?: (message: string) => void;
  /** Un réseau coupé : la fabrique refuse d'ouvrir, le canal réessaiera. */
  horsLigne?: () => boolean;
}

/**
 * Un canal du moteur vers `url`, qui annonce la version de protocole de ce
 * paquet (`?v=2`). Avec une porte, le canal en tire ses minuteries et sa
 * visibilité : porte fermée, onglet caché.
 */
export function canalNode(url: string, options: OptionsCanalNode = {}): Channel {
  const adresse = withProtocolVersion(url);
  const porte = options.porte;
  const reglages: ChannelOptions = {
    log: options.log ?? (() => undefined),
    ...(porte ? { timers: porte, visible: () => !porte.fermee } : {}),
  };
  return new Channel(() => {
    if (options.horsLigne?.()) throw new Error('réseau coupé');
    return socketNode(adresse, options);
  }, reglages);
}
