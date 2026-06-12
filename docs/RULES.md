# RULES.md — Pazaak

> Spécification des règles, sourcée le 11 juin 2026 (GameFAQs/nyiaor, StrategyWiki KOTOR 1 & 2,
> Hyperspace Props, Wookieepedia, Giant Bomb). Sources concordantes — un seul `[À VALIDER]`.
> Référence ultime en cas de doute : le comportement en jeu dans KOTOR 1/2.

---

## 1. Vue d'ensemble

Pazaak est un jeu **1 contre 1**. L'objectif d'un *set* est d'atteindre le score le plus
proche de 20 sans le dépasser. Le premier joueur à remporter **3 sets** gagne le *match*.
Un set terminé sur égalité **ne compte pas** et est rejoué.

## 2. Matériel

**Main deck** — 40 cartes : 4 exemplaires de chaque valeur de **+1 à +10**. Partagé,
mélangé en début de chaque set.

**Side deck** — propre à chaque joueur : il choisit **10 cartes** de sa collection avant
le match. Sa **main** est constituée de **4 cartes tirées au hasard** parmi ces 10.
La main est conservée pour **tout le match** : une carte jouée est consommée
définitivement, et la main ne se reconstitue pas entre les sets.

## 3. Catalogue des cartes de side deck

**Standard (périmètre de base)**
| Carte | Effet |
|---|---|
| +1 à +6 | Ajoute la valeur au score |
| −1 à −6 | Retranche la valeur |
| ±1 à ±6 | Le signe est **déclaré au moment de jouer**, irrévocable |

**Gold cards (stretch — KOTOR 2)**
| Carte | Effet |
|---|---|
| Tiebreaker (±1T) | Carte ±1 ; si le set se termine sur égalité et que son joueur l'a jouée, il **gagne le set** |
| Double (D) | Duplique la valeur de la carte du main deck reçue ce tour |
| 1±2 | Signe **et** valeur (1 ou 2) déclarés avant de jouer, irrévocables |
| Flip 2&4 | Inverse le signe des cartes de valeur 2 et 4 déjà posées sur son plateau |
| Flip 3&6 | Idem pour les valeurs 3 et 6 |

`[À VALIDER]` (en jeu, sur KOTOR 2) : les flips s'appliquent-elles aux seules cartes du
main deck posées, ou aussi aux cartes de main déjà jouées ? Sans réponse, implémenter
le comportement le plus simple (toutes les cartes du plateau de valeur 2/4 ou 3/6) et
documenter le choix ici.

## 4. Déroulement d'un set

Le **premier joueur** du premier set est déterminé par un tirage du main deck (carte la
plus haute commence). Pour les sets suivants : alternance.

À chaque tour, dans l'ordre :

1. **Pioche automatique** : le joueur reçoit la carte du dessus du main deck, posée sur
   son plateau. (Pas de pioche si le joueur a déclaré *Stand* — il ne joue plus.)
2. **Carte de main (optionnel)** : il peut jouer **au maximum une** carte de sa main,
   posée sur son plateau. Signe/valeur déclarés à ce moment pour les ± et la 1±2.
   Si la pioche forcée a fait **dépasser 20**, c'est ici qu'il peut jouer une carte
   négative pour revenir ≤ 20 (rescousse) ; le bust n'est constaté qu'au choix de fin
   de tour (cf. §5).
3. **Choix de fin de tour** :
   - **End Turn** — il repiochera au début de son prochain tour ;
   - **Stand** — son score est figé jusqu'à la fin du set, il ne joue plus.

L'adversaire continue de jouer seul tant qu'il n'a pas lui-même stand, busté ou gagné.
Les tours ne sont donc **pas strictement alternés** en fin de set.

## 5. Fins de set

| Condition | Résultat |
|---|---|
| Score > 20 à la **fin du tour** (**bust**) | Le joueur perd le set |
| Score = **20 exact** | Stand automatique |
| **9 cartes** en jeu sans bust | Stand automatique **et victoire du set** |
| Les deux joueurs ont stand | Le score le plus élevé ≤ 20 gagne |
| Égalité au double stand | Set **rejoué**, non compté (sauf Tiebreaker joué → son joueur gagne) |

Le **bust est constaté à la conclusion du tour** (End Turn ou Stand), pas à l'instant de
la pioche : un joueur qui dépasse 20 sur la pioche forcée peut jouer une carte de side
deck pour revenir ≤ 20. La règle des **9 cartes** ne donne la victoire que **sans bust** :
9 cartes en dépassant 20 (on ne peut plus poser de carte) = bust.

Le main deck est remélangé entre les sets. Les plateaux sont vidés. Les mains sont
conservées en l'état (cartes consommées non rendues).

## 6. Fin de match et mise

Premier à **3 sets gagnés**. La mise est convenue **avant** le match, winner-takes-all,
inchangée en cours de match. (Jouer sans mise = « Republic Senate rules ».)

## 7. Invariants (pour les tests property-based)

- Un plateau ne contient jamais plus de 9 cartes.
- Le score d'un joueur est toujours égal à la somme signée de son plateau.
- Une main ne contient jamais plus de 4 cartes ; elle ne croît jamais.
- Sur un set, au plus 4 exemplaires de chaque valeur 1–10 sortent du main deck.
- Un joueur en *Stand* ne reçoit plus de carte et ne peut plus jouer de move.
- `setsWon` de chaque joueur est ≤ 3 ; le match se termine dès qu'un joueur atteint 3.
