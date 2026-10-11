/**
 * Un relais TCP entre les robots et le serveur : c'est lui qui fabrique les
 * pannes de réseau que le WebSocket seul ne sait pas simuler.
 *
 * - `geler` : plus un octet ne passe, dans aucun sens, mais rien ne se ferme
 *   (téléphone en veille). Les octets restent dans les tampons du noyau,
 *   comme une retransmission TCP qui finira par passer : au dégel, tout
 *   arrive, dans l'ordre.
 * - `zombifier` : le côté robot meurt, le côté serveur reste ouvert et muet
 *   (NAT mort, box redémarrée). Le serveur n'en saura rien tant qu'il
 *   n'écrit pas assez pour remplir ses tampons — ou jamais.
 *
 * Chaque tuyau est retrouvé par le port local de la socket du robot.
 */

import { connect, createServer, type Server, type Socket } from 'node:net';

export class Tuyau {
  gele = false;
  zombie = false;
  ferme = false;

  constructor(
    readonly client: Socket,
    readonly amont: Socket,
  ) {}

  geler(): void {
    if (this.ferme) return;
    this.gele = true;
    this.client.pause();
    this.amont.pause();
  }

  degeler(): void {
    if (this.ferme || this.zombie) return;
    this.gele = false;
    this.client.resume();
    this.amont.resume();
  }

  /** Le robot perd sa connexion ; le serveur garde la sienne, muette, ouverte. */
  zombifier(): void {
    if (this.ferme) return;
    this.zombie = true;
    this.gele = true;
    this.amont.pause();
    this.client.destroy();
  }
}

export class Relais {
  private serveur: Server | null = null;
  private readonly tuyaux = new Map<number, Tuyau>();
  /** Tuyaux zombies : encore ouverts côté serveur. */
  readonly zombies = new Set<Tuyau>();
  connexions = 0;
  echecsAmont = 0;

  constructor(
    private readonly hote: string,
    private readonly portCible: number,
  ) {}

  ouvrir(): Promise<number> {
    const serveur = createServer((client) => {
      this.brancher(client);
    });
    this.serveur = serveur;
    return new Promise((resolve, reject) => {
      serveur.once('error', reject);
      serveur.listen(0, '127.0.0.1', () => {
        const adresse = serveur.address();
        resolve(typeof adresse === 'object' && adresse ? adresse.port : 0);
      });
    });
  }

  private brancher(client: Socket): void {
    this.connexions += 1;
    client.setNoDelay(true);
    const amont = connect(this.portCible, this.hote);
    amont.setNoDelay(true);
    const tuyau = new Tuyau(client, amont);
    const cle = client.remotePort ?? -1;
    this.tuyaux.set(cle, tuyau);

    client.on('data', (morceau: Buffer) => {
      if (!amont.write(morceau)) client.pause();
    });
    amont.on('data', (morceau: Buffer) => {
      if (!client.write(morceau)) amont.pause();
    });
    amont.on('drain', () => {
      if (!tuyau.gele) client.resume();
    });
    client.on('drain', () => {
      if (!tuyau.gele) amont.resume();
    });

    const fin = (): void => {
      if (this.tuyaux.get(cle) === tuyau) this.tuyaux.delete(cle);
    };
    client.on('close', () => {
      fin();
      // Une fermeture côté robot se propage — sauf pour un zombie, dont le
      // serveur ne doit justement rien savoir.
      if (!tuyau.zombie) {
        tuyau.ferme = true;
        amont.destroy();
      }
    });
    amont.on('close', () => {
      tuyau.ferme = true;
      this.zombies.delete(tuyau);
      fin();
      client.destroy();
    });
    amont.on('error', () => {
      this.echecsAmont += 1;
    });
    client.on('error', () => {
      // La fermeture suit.
    });
  }

  tuyauDe(portLocalRobot: number | null): Tuyau | undefined {
    if (portLocalRobot === null) return undefined;
    return this.tuyaux.get(portLocalRobot);
  }

  zombifier(tuyau: Tuyau): void {
    this.zombies.add(tuyau);
    tuyau.zombifier();
  }

  /** Tue les zombies restants (fin de campagne). */
  purgerZombies(): number {
    const n = this.zombies.size;
    for (const z of this.zombies) {
      z.ferme = true;
      z.amont.destroy();
    }
    this.zombies.clear();
    return n;
  }

  fermer(): Promise<void> {
    this.purgerZombies();
    for (const t of this.tuyaux.values()) {
      t.client.destroy();
      t.amont.destroy();
    }
    this.tuyaux.clear();
    const serveur = this.serveur;
    this.serveur = null;
    return new Promise((resolve) => {
      if (!serveur) {
        resolve();
        return;
      }
      serveur.close(() => {
        resolve();
      });
    });
  }
}
