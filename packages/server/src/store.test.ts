/**
 * Le magasin en mémoire : se comporter comme un magasin distant.
 *
 * Il passe la suite de contrat commune à tous les magasins
 * (`store.contract.ts`) : celle que le magasin de fichiers de Node et le
 * SQLite du Worker passent aussi.
 */

import { contratMagasin } from './store.contract.js';
import { MemoryRoomStore } from './store.js';

contratMagasin('MemoryRoomStore', () => Promise.resolve(new MemoryRoomStore<unknown>()));
