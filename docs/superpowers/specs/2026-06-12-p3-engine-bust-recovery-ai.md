# Spec — P3.1 : moteur bust-recovery + IA heuristique

> Design validé le 2026-06-12. Premier bloc de la phase **P3 (solo client-local)**.
> Compagnon : `contrat-pazaak.md` (§5–§6), `RULES.md` (§4–§5), `ROADMAP.md` (P3).
> Le bloc **web** (TanStack Start + écrans) fera l'objet d'une spec séparée ensuite.

---

## 1. Contexte et problème

Le contrat §6 spécifie une IA heuristique qui doit, entre autres, **jouer une carte de
main si elle évite un bust en ramenant le score ≤ 20**. Ce branch suppose qu'un joueur
puisse être au-dessus de 20 *tout en ayant encore la main pour réagir*.

Or le moteur P2 ne le permet pas : la pioche forcée (`turn.onBegin` →
`drawFromMainDeck` → `refreshScoreAndFlags`) verrouille `busted = true` **dès** que le
score dépasse 20, `turn.endIf` clôt le tour aussitôt, et `resolveSetIfOver` fait perdre
le set immédiatement. Le joueur n'a jamais l'occasion de jouer une carte de rescousse
(et `playCard` refuse un joueur `busted`). Le branch « éviter le bust » du contrat §6
est donc **inatteignable** — du code mort.

C'est aussi en tension avec le vrai Pazaak (KOTOR) : la pioche forcée peut faire
dépasser 20, et c'est précisément là qu'on joue une carte négative du side deck pour
revenir ≤ 20. Le bust n'est verrouillé que si on **finit son tour** au-dessus de 20.

**Décision** (validée) : corriger le moteur pour autoriser la récupération de bust, ce
qui rend l'IA §6 opérante et la règle conforme. Conséquence de séquencement : le fix
moteur est un **prérequis** de l'IA.

## 2. Décisions de design

| Sujet | Décision |
|---|---|
| Sémantique du bust | **Approche A** : le bust est finalisé à la *conclusion du tour* (End Turn / Stand) si score > 20. Un joueur > 20 avec board < 9 reste **actif** et peut jouer une carte de rescousse. |
| Auto-stand | Inchangé : 20 exact → stand auto ; 9 cartes → stand auto. **9 cartes & score > 20 → bust** (pas de victoire). |
| Pick IA | Vit dans `engine` (pur), `chooseSideDeck()`. Étend le contrat §6. |
| Signature IA de jeu | `chooseMove(self: PlayerState, params: AiParams): AiMove` — l'IA voit son état complet (main incluse) ; heuristique self-only (n'utilise pas l'adversaire). |

## 3. Changements de documentation (À FAIRE EN PREMIER — le contrat fait loi)

### `RULES.md`
- **§4** : clarifier l'ordre — pioche forcée → carte de main optionnelle (y compris pour
  revenir ≤ 20 si la pioche a fait dépasser) → End Turn / Stand.
- **§5** : le bust est constaté **quand le joueur conclut son tour** au-dessus de 20, pas
  à l'instant de la pioche. Un joueur > 20 après la pioche peut jouer **une** carte de
  side deck pour revenir ≤ 20. 9 cartes : stand auto + victoire **uniquement si ≤ 20** ;
  9 cartes & > 20 = bust.

### `contrat-pazaak.md`
- **§5 (phase `play`)** : la pioche auto ne verrouille plus le bust ; le tour se conclut
  par `endTurn`/`stand` ; le bust est calculé à la conclusion (score > 20).
- **§6 (IA)** : ajouter la fonction de choix de side deck `chooseSideDeck()` et préciser
  la signature `chooseMove(self, params)` et le type de retour `AiMove`.

## 4. Changements moteur (`packages/engine`)

### `turn.ts` — `refreshScoreAndFlags`
Nouvelle sémantique (à appeler après toute modification du board) :
- `score = scoreBoard(board)`.
- Si `board.length >= 9` (9 cartes, on ne peut plus poser) : `standing = true` ;
  **et si `score > 20` → `busted = true`** (conclusion forcée 9-cartes-bust).
- Sinon si `score === 20` : `standing = true` (auto-stand, on ne peut plus améliorer).
- Sinon : **ne rien verrouiller** — `score` peut être > 20 (board < 9) sans `busted`,
  le joueur reste actif pour tenter une rescousse, ou < 20 et continue.

### `moves.ts`
- `playCard` : **aucun changement de garde nécessaire** — un joueur > 20 (board < 9) est
  ni `standing` ni `busted`, donc accepté ; la rescousse passe naturellement. Après la
  pose, `refreshScoreAndFlags` recalcule (≤ 20, 20 auto-stand, ou toujours > 20).
- `endTurn` : à la conclusion, **si `score > 20` → `busted = true`**, puis fin de tour.
- `stand` : **si `score > 20` → `busted = true`** (stand au-dessus de 20 = bust) ;
  sinon `standing = true`.

### `game.ts`
- `turn.endIf` (`standing || busted`) et `resolveSetIfOver` **inchangés** —
  `setOutcome` teste `busted` en premier, donc la cohérence est préservée (bust prime
  sur 9-cartes).

## 5. Module IA (`packages/engine/src/ai.ts`, pur)

```ts
export type AiMove =
  | { move: "stand" }
  | { move: "endTurn" }
  | { move: "playCard"; args: [handIndex: number, declaration?: { sign: Sign }] };

export interface AiParams { standThreshold: 17 | 18 | 19 } // défaut 18

export function chooseMove(self: PlayerState, params: AiParams): AiMove;
export function chooseSideDeck(): SideCard[]; // 10 cartes standard, déterministe
```

### `chooseMove` — logique (appelée uniquement quand l'IA est active ; pioche auto déjà faite)
1. **`score > 20` → rescousse** : parmi les cartes de main, calculer les candidats dont
   le score résultant est ≤ 20 (pour une carte ± `'pm'` : tester `+v` **et** `−v`).
   Jouer celui qui **maximise** le score résultant ≤ 20. Si aucun candidat ≤ 20 →
   `{ move: "endTurn" }` (bust forcé).
2. **`score ∈ [standThreshold, 20]` → `{ move: "stand" }`.**
3. **`score < standThreshold`** : si une carte amène à **20 exact**, la jouer ;
   sinon `{ move: "endTurn" }`.

Détails :
- Signe d'une carte ± = celui qui donne le meilleur résultat ≤ 20.
- Déterminisme : à égalité de résultat, plus petit `handIndex` ; pour une ±, préférer le
  signe `+` à `−` à résultat égal (ne survient pas en pratique mais fige le comportement).
- `declaration` n'est présent que pour les cartes ± (`'pm'`) ; absent pour les signes fixes.

### `chooseSideDeck` — deck par défaut
10 cartes standard, riche en ± (flexibilité rescousse + atteindre 20) :
`±1, ±2, ±3, ±4, ±5, ±6, +1, +2, −1, −2`. Déterministe, accepté par `pickSideDeck`.

## 6. API publique (`index.ts`)
Exporter `chooseMove`, `chooseSideDeck`, et les types `AiMove`, `AiParams`.

## 7. Tests

### Moteur (mise à jour de la suite P2)
- Corriger les scénarios/invariants qui supposaient le bust-on-draw.
- Le driver fast-check (`invariants.test.ts`) doit gérer le nouvel état « actif > 20 »
  (proposer un move valide même quand le joueur courant est > 20).
- Nouveaux cas déterministes :
  - pioche fait > 20 → joueur encore actif → carte de rescousse → score ≤ 20 → continue ;
  - rescousse amène à 20 exact → auto-stand ;
  - > 20 + `endTurn` → `busted` → perte du set ;
  - > 20 sans carte de rescousse → `endTurn` → bust ;
  - `stand` au-dessus de 20 → bust (défensif) ;
  - 9 cartes & > 20 → bust ; 9 cartes & ≤ 20 → victoire du set.

### IA (unit, nouveau fichier)
- stand quand `score ∈ [seuil, 20]` ;
- jeu vers 20 exact quand `score < seuil` ;
- rescousse depuis > 20 (dont choix de signe d'une carte ±) ;
- `endTurn` quand `score < seuil` et aucune carte n'atteint 20 ;
- `endTurn` forcé quand > 20 sans rescousse possible ;
- sélection « maximise ≤ 20 » (préfère 20 à 18, etc.) ;
- `chooseSideDeck()` → 10 cartes valides, acceptées par `pickSideDeck`.

## 8. Définition de terminé (ce bloc)
- `command pnpm exec biome check .`, `command pnpm -r typecheck`,
  `command pnpm -r test` verts à la racine.
- Invariants fast-check ≥ 1000 runs verts.
- `RULES.md`, `contrat-pazaak.md` à jour **avant** le code ; `INDEX.md`, `HANDOFF.md`,
  `QUIRKS.md` mis à jour à la livraison.
- Le critère de sortie P3 « partie solo complète au navigateur » sera atteint au bloc
  **web** suivant (spec séparée).

## 9. Hors périmètre (ce bloc)
- `apps/web` : wiring TanStack Start, écrans pick/board/fin, branchement du client local
  boardgame.io avec l'IA. → bloc P3.2 (spec séparée).
- Gold cards (P8). L'IA ne joue que des cartes standard.
