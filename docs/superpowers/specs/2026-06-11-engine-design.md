# Spec — Design du moteur Pazaak (P2)

> Design de référence du package `@pazaak/engine`, livré en P2. Complète le plan
> `plans/2026-06-11-p2-engine.md` (ordre TDD) en figeant le **quoi/pourquoi** des choix de
> modélisation boardgame.io 0.50.2 et les apprentissages. Spec = `contrat-pazaak.md` §3-6
> + `RULES.md`. Périmètre : **cartes standard uniquement** (gold cards → P8).

## 1. État `G` et secret state

- `G` suit le contrat §3 : `players: Record<'0'|'1', PlayerState>`, `mainDeck: number[]`,
  `currentSet`, `setStarter`, `matchWinner`.
- **Identité des cartes posées** : `PlayedCard` distingue `source: 'main' | 'hand'` (et garde
  `card`/`flipped`) — pas une simple somme. Prérequis des flips gold (P8).
- **Secret** : `sideDeck`, `hand` (par joueur) et `mainDeck` (global). `playerView` (contrat §4)
  les strippe : adversaire → `sideDeck: null`, `hand: { count }` ; `mainDeck → { remaining }`.
  `PlayerView.STRIP_SECRETS` de boardgame.io est **trop agressif** (il retire tout l'objet
  adversaire) → `playerView` custom.

## 2. Phases boardgame.io

- **`pickSideDeck`** (`start: true`) : pick **simultané** via
  `turn.activePlayers: { all: 'pick', minMoves: 1, maxMoves: 1 }` + stage `pick`. Chaque joueur
  joue exactement une fois. `endIf` = les deux `sideDeck` posés. `onEnd` tire le premier joueur
  (deux `random.Die(10)`, plus haut commence, égalité → retirage). Main de 4 tirée dans le move
  `pickSideDeck` (`random.Shuffle`).
- **`play`** : **une seule phase qui boucle tous les sets** (le nombre de sets est dynamique,
  donc pas modélisable en phases statiques).

## 3. Modélisation des tours et de la boucle de set (le point dur)

- `turn.onBegin` : **pioche automatique** du dessus du `mainDeck` → recalcul score + auto-flags
  (`refreshScoreAndFlags` : bust > 20, 9 cartes → stand+gagne, 20 → stand).
- `turn.endIf` : `true` dès que le joueur courant est **figé** (`standing || busted`). C'est ce
  qui auto-termine le tour après une pioche/playCard fatale, sans move explicite. `stand` se
  contente de poser `standing` ; `endTurn` appelle `events.endTurn()` (joueur non figé).
- `turn.order` custom (`nextActivePos`) encode :
  - **tours non alternés** (RULES §4) : si l'adversaire est figé, le joueur courant **rejoue**
    seul ;
  - **redémarrage de set** : si le plateau des deux est vide et tous actifs (« fresh »), le
    prochain tour est celui du `setStarter` (nouveau set après reset).
- `turn.onEnd` → `resolveSetIfOver` : applique `setOutcome` (bust / 9 cartes / double stand /
  tie). Si vainqueur → `setsWon++` ; si `=== 3` → `matchWinner` (le `game.endIf` clôt la partie) ;
  sinon (ou tie) → `startNextSet` (vide les plateaux, **remélange un main deck neuf**,
  `currentSet++`, **alterne `setStarter`**, **conserve les mains**).
- `game.endIf` : `matchWinner != null ? { winner } : undefined`.

### Pourquoi ça marche
La résolution est centralisée (`setOutcome` pur + `resolveSetIfOver` impur), et `nextActivePos`
est piloté par l'état de `G` (pas par un compteur de tours), donc robuste aux resets de set et
aux séquences non alternées. Validé par un test de match best-of-3 complet et 1000 runs fast-check.

## 4. Stratégie de test (apprentissages)

- **Règles pures en appel direct** : `setOutcome` et même les moves (`playCard`) testés en les
  invoquant sur un `G` fabriqué — déterministe, pas de pioche auto parasite.
- **Flux boardgame.io** via Client `Local()` seedé (`test/support.ts`). `noUncheckedIndexedAccess`
  oblige des helpers `player()`/`getState()` qui narrowent (throw) plutôt que des `!`.
- **Invariants** fast-check 1000 runs : board ≤9, score = somme, main ≤4 non croissante,
  `setsWon` ≤3 — sur parties aléatoires, vérifiés après chaque coup.
- Voir QUIRKS : `playerView` s'applique au client single-player → tester l'état brut via
  `initialState()`.

## 5. Dette assumée / hors périmètre P2

- **IA** (`ai.ts`, contrat §6) → P3.
- **Gold cards** (tiebreaker/double/1±2/flips) → P8 ; types prêts, `playCard` les rejette.
  `[À VALIDER]` comportement des flips (RULES §3) toujours ouvert.
- **Alternance du premier joueur sur tie** : choix actuel = alterner à chaque nouveau set, y
  compris les replays (à confirmer vs KOTOR — `BACKLOG.md`).
- **Main deck épuisé** en cours de set : géré défensivement (pioche no-op), ne devrait pas
  arriver (40 cartes, ≤ 18 piochées/set).
