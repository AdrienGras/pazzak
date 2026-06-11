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
