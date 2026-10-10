/**
 * `structuredClone`, déclaré à la main.
 *
 * Le moteur est compilé sans la lib DOM et sans les types de Node : il n'a le
 * droit de dépendre d'aucun hôte, ni navigateur, ni serveur, ni Worker. Mais
 * le clonage profond d'un état immutable, lui, a besoin d'une fonction — et
 * `structuredClone` existe nativement partout où ce paquet s'exécute :
 * navigateurs modernes, Node 20, Workers. La déclarer ici, plutôt que
 * d'importer une librairie ou de relire la moitié de la plateforme, c'est trois
 * lignes qui disent exactement ce que le moteur attend du monde extérieur.
 */

declare function structuredClone<T>(value: T): T;
