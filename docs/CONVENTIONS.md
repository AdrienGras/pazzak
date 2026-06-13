# Conventions de code

Squelettes et patterns récurrents du projet. À consulter avant de créer un nouveau type de fichier (entité, service, contrôleur, composant, etc.).

Si tu découvres un pattern récurrent : documente-le ici.

> Nommage global : kebab-case fichiers, PascalCase types/composants, camelCase fonctions.
> Pas de `any`. ESM partout. Tout choix non évident est commenté avec un renvoi au § du contrat ou de RULES.

---

## Move boardgame.io (`packages/engine`) — squelette

```ts
import type { Move } from "boardgame.io";
import type { G } from "./types";

// Signature contrat §X. Toute validation échouée retourne INVALID_MOVE.
export const playCard: Move<G> = ({ G, ctx, playerID, random }, cardId: string) => {
  const player = G.players[playerID];
  if (!player) return INVALID_MOVE;

  // 1. valider l'invariant (cf. RULES §X) — sinon INVALID_MOVE
  // 2. muter G de façon déterministe ; tout aléa passe par `random` (ctx.random)
  // 3. ne jamais exposer le secret state (main/side deck adverses) — voir playerView.ts
};
```

### Règles tacites
- La logique de règles vit **uniquement** dans `packages/engine`. Jamais de scoring/validation dupliqué dans `web` ou `game-server`.
- `engine` est pur : aucun accès réseau, fichier, DOM, horloge. Tout l'aléa via `ctx.random` / `random`.
- Toute modification de `G` impose de relire `playerView.ts` et son test contractuel (secret state).

---

## Union discriminée fermée (`SideCard`, `PlayedCard`) — squelette

```ts
// Unions fermées : tout switch est exhaustif via `satisfies never` sur le default.
type SideCard =
  | { kind: "plus"; value: number }
  | { kind: "minus"; value: number }
  | { kind: "flip"; value: number };

function describe(card: SideCard): string {
  switch (card.kind) {
    case "plus":
      return `+${card.value}`;
    case "minus":
      return `-${card.value}`;
    case "flip":
      return `±${card.value}`;
    default:
      return card satisfies never; // erreur de compil si un variant est oublié
  }
}
```

### Règles tacites
- `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` actifs : indexer un objet/array renvoie `T | undefined` — gérer le cas.
- `verbatimModuleSyntax` : utiliser `import type` pour les imports de types uniquement.

---

## Package de workspace — squelette (P1)

Tout nouveau package du monorepo suit ce gabarit.

`packages/<nom>/package.json` :
```json
{
  "name": "@pazaak/<nom>",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  }
}
```

`packages/<nom>/tsconfig.json` :
```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src", "test"]
}
```

### Règles tacites
- **ESM partout** (`"type": "module"`), source TS consommée directement entre packages via `exports` (`./src/index.ts`) — pas de build intermédiaire.
- Deps inter-packages en **`workspace:*`** (ex. `"@pazaak/engine": "workspace:*"`). En zsh, **quoter** la spec lors d'un `pnpm add` (`'@pazaak/engine@workspace:*'`) sinon le `*` est glob-expansé.
- **Versions exactes** (pas de `^`) — garanti par `saveExact: true` dans `pnpm-workspace.yaml`.
- Imports de tests **extensionless** (`from "../src/index"`), résolus par `moduleResolution: bundler` + Vitest.
- Un package qui n'entre pas dans `pnpm test` (ex. `e2e`) **n'a pas de script `test`** (il expose `e2e` à la place).
- `imports` de `vitest` → le package doit déclarer `vitest` en devDep (sinon `tsc` échoue sur la résolution du module).

---

## Tests du moteur (`packages/engine`) — patterns

Deux niveaux de test, complémentaires (établis en P2) :

1. **Logique de règles pure → appel direct, déterministe.** Les fonctions pures
   (`scoreBoard`, `setOutcome`) et les moves (`playCard`) se testent en les appelant
   directement sur un `G` fabriqué, sans framework — pas de pioche auto à gérer :
   ```ts
   const r = (playCard as unknown as (c: unknown, ...a: unknown[]) => unknown)(
     { G, ctx: { currentPlayer: "0" }, playerID: "0" }, handIndex, declaration,
   );
   expect(r).toBe(INVALID_MOVE);
   ```
2. **Flux boardgame.io → Client headless seedé** via `test/support.ts`
   (`makeClients`/`reachPlay`/`move`/`player`). Déterminisme par `seed` sur le Game.
   `noUncheckedIndexedAccess` oblige : passer par les helpers `player()`/`getState()` qui
   narrowent en lançant une erreur claire, plutôt que des `!`.
3. **Invariants → fast-check** (`fc.assert(fc.property(...), { numRuns: 1000 })`), en jouant
   des parties aléatoires et en vérifiant après chaque coup (RULES §7).

### Règles tacites
- `playerView` actif : un client ne voit que SON joueur en entier → lire `players['0']`
  depuis `p0`, `players['1']` depuis `p1`. Pour l'état brut (setup), tester `initialState()`.
- Pour vérifier l'absence de fuite secret state : sentinelles (cartes gold dans l'état
  adverse) + `JSON.stringify(view)` ne doit pas les contenir.

---

## Web (`apps/web`) — logique testable extraite + hook/composant fin (P3.2)

Pattern établi pour brancher le moteur sur le front sans tests de composants (l'UI est
couverte par les e2e P7) : **extraire toute la logique décisionnelle en fonction pure
testable**, puis poser un hook/composant fin par-dessus.

```ts
// 1. Fonction pure (testée en unit, framework-agnostic) :
export function aiStep(state, moves, params): boolean { /* lit l'état, dispatche ≤1 coup */ }
export function deriveScreen(state): Screen { /* dérive l'écran de l'état */ }
export function toggleSelection(selected, i): number[] { /* logique de sélection */ }

// 2. Hook/composant fin (vérifié par typecheck, pas de test unitaire) :
export function useAiDriver(client, params) { useEffect(() => { /* subscribe → aiStep */ }) }
```

### Règles tacites
- **Aucune règle de jeu côté web** : tout passe par `@pazaak/engine` (scoring, sélection
  de coup via `chooseMove`, validation). Le web lit l'état et dispatche.
- **Typer les clients `boardgame.io`** via `ReturnType<typeof Client<G>>` (le type interne
  `_ClientImpl` n'est pas exporté) ; pour les fonctions pures qui ne lisent qu'un
  sous-ensemble de l'état, un type maison minimal (`PlayerState | OpponentView`) suffit.
  Jamais `any`.
- **Distinguer son siège de l'adversaire** dans un client : `Array.isArray(p.hand)`
  (PlayerState complet) vs `{ count }` (OpponentView). `ctx.currentPlayer` n'est pas fiable
  en phase pick simultanée (`activePlayers:{all:'pick'}`).
- **Transport `Local` synchrone** : un dispatch dans un callback `subscribe` re-notifie
  synchroniquement → boucler via `queueMicrotask` + flag de ré-entrance.
- **`data-testid` sur tout élément interactif** dès la création (règle absolue, consommés
  par les e2e P7). Désactiver le Debug Panel boardgame.io (`debug:false`, cf. QUIRKS).
- **`@pazaak/engine` est la seule source de règles** : pas de logique dupliquée côté web.
