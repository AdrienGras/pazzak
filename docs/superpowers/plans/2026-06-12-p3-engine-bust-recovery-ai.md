# P3.1 — Moteur bust-recovery + IA heuristique — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corriger le moteur pour que le bust ne soit verrouillé qu'à la conclusion du tour (autorisant la rescousse par carte de side deck), puis livrer l'IA heuristique pure du contrat §6 (`chooseMove` + `chooseSideDeck`).

**Architecture:** `engine` reste du TypeScript pur (seule dép runtime `boardgame.io`). Le bust devient un état *de conclusion* : `refreshScoreAndFlags` ne verrouille plus `busted` quand `score > 20` avec board < 9 ; les moves `endTurn`/`stand` finalisent le bust à la sortie du tour. L'IA est une fonction pure `(PlayerState, AiParams) => AiMove`, testée en unit, sans dépendance au runtime boardgame.io.

**Tech Stack:** TypeScript strict, Vitest, fast-check, boardgame.io 0.50.2.

**Préambule toolchain (à exécuter une fois dans le shell avant toute commande pnpm) :**
```bash
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use && corepack enable
```
Rappels : `pnpm lint` est intercepté par rtk → utiliser `command pnpm exec biome check .`. Tests : `command pnpm --filter @pazaak/engine test`.

---

## File Structure

| Fichier | Responsabilité | Action |
|---|---|---|
| `docs/RULES.md` | Règle bust à la conclusion (§4–§5) | Modifier |
| `docs/contrat-pazaak.md` | Phase play + signature IA (§5–§6) | Modifier |
| `packages/engine/src/turn.ts` | `refreshScoreAndFlags` : ne plus verrouiller bust à la pioche | Modifier |
| `packages/engine/src/moves.ts` | `endTurn`/`stand` : bust à la conclusion | Modifier |
| `packages/engine/src/ai.ts` | IA pure : `chooseMove`, `chooseSideDeck`, types `AiMove`/`AiParams` | Créer |
| `packages/engine/src/index.ts` | Export de l'API IA | Modifier |
| `packages/engine/test/turn.test.ts` | Tests purs de `refreshScoreAndFlags` | Créer |
| `packages/engine/test/end-turn-stand.test.ts` | Tests des moves `endTurn`/`stand` (conclusion) | Créer |
| `packages/engine/test/play-card.test.ts` | MAJ du test « dépasse 20 » (plus de bust immédiat) | Modifier |
| `packages/engine/test/ai.test.ts` | Tests de l'IA | Créer |

---

## Task 1 : Documentation d'abord (le contrat fait loi)

**Files:**
- Modify: `docs/RULES.md`
- Modify: `docs/contrat-pazaak.md`

- [ ] **Step 1 : RULES.md §4, étape « Carte de main »**

Dans `docs/RULES.md`, remplacer la ligne de l'étape 2 du §4 :

```markdown
2. **Carte de main (optionnel)** : il peut jouer **au maximum une** carte de sa main,
   posée sur son plateau. Signe/valeur déclarés à ce moment pour les ± et la 1±2.
```

par :

```markdown
2. **Carte de main (optionnel)** : il peut jouer **au maximum une** carte de sa main,
   posée sur son plateau. Signe/valeur déclarés à ce moment pour les ± et la 1±2.
   Si la pioche forcée a fait **dépasser 20**, c'est ici qu'il peut jouer une carte
   négative pour revenir ≤ 20 (rescousse) ; le bust n'est constaté qu'au choix de fin
   de tour (cf. §5).
```

- [ ] **Step 2 : RULES.md §5, ligne bust + note**

Dans `docs/RULES.md` §5, remplacer la ligne du tableau :

```markdown
| Score > 20 (**bust**) | Le joueur perd le set immédiatement |
```

par :

```markdown
| Score > 20 à la **fin du tour** (**bust**) | Le joueur perd le set |
```

Puis, juste sous le tableau du §5 (avant la phrase « Le main deck est remélangé… »), ajouter :

```markdown
Le **bust est constaté à la conclusion du tour** (End Turn ou Stand), pas à l'instant de
la pioche : un joueur qui dépasse 20 sur la pioche forcée peut jouer une carte de side
deck pour revenir ≤ 20. La règle des **9 cartes** ne donne la victoire que **sans bust** :
9 cartes en dépassant 20 (on ne peut plus poser de carte) = bust.

```

- [ ] **Step 3 : contrat §5, phase play**

Dans `docs/contrat-pazaak.md` §5, remplacer le bullet `onBegin` :

```markdown
- `onBegin` de tour : si le joueur courant est `standing` ou `busted`, son tour est
  sauté (ordre de tour custom). Sinon : pioche automatique du main deck → `board`,
  recalcul du score, détection bust / 20 exact / 9 cartes.
```

par :

```markdown
- `onBegin` de tour : si le joueur courant est `standing` ou `busted`, son tour est
  sauté (ordre de tour custom). Sinon : pioche automatique du main deck → `board`,
  recalcul du score. Auto-stand à 20 exact et à 9 cartes ; le **bust n'est pas verrouillé
  ici** (un score > 20 avec board < 9 laisse le joueur actif pour une rescousse).
```

Puis remplacer le bullet `stand()` / la description de fin de tour. Localiser :

```markdown
- `stand()` : fige le joueur, clôt le tour.
```

par :

```markdown
- `stand()` : fige le joueur (ou le buste si score > 20), clôt le tour.
- Conclusion du tour (`endTurn`/`stand`) : si le score > 20, le joueur est `busted`
  (le bust n'est finalisé qu'ici, contrat RULES §5).
```

- [ ] **Step 4 : contrat §6, signature IA**

Dans `docs/contrat-pazaak.md`, remplacer **toute** la section `## 6. IA heuristique` par :

```markdown
## 6. IA heuristique (solo, dans `engine`)

Fonctions **pures**, exportées par `engine`.

```typescript
type AiMove =
  | { move: 'stand' }
  | { move: 'endTurn' }
  | { move: 'playCard'; args: [handIndex: number, declaration?: { sign: Sign }] };

type AiParams = { standThreshold: 17 | 18 | 19 }; // défaut 18 ; niveaux de difficulté

chooseMove(self: PlayerState, params: AiParams): AiMove   // self = état complet de l'IA
chooseSideDeck(): SideCard[]                              // 10 cartes standard, déterministe
```

`chooseMove` (appelée seulement quand l'IA est active ; la pioche auto a déjà eu lieu) :
- `score > 20` → **rescousse** : jouer la carte de main qui maximise le score résultant
  ≤ 20 (pour une ± : tester `+v` et `−v`) ; si aucune ne ramène ≤ 20 → `endTurn` (bust).
- `score ∈ [standThreshold, 20]` → `stand`.
- `score < standThreshold` → jouer une carte si elle amène à **20 exact**, sinon `endTurn`.

Le signe d'une ± est celui qui maximise le résultat ≤ 20 ; déterminisme : plus petit
`handIndex` à résultat égal. `chooseSideDeck` renvoie un deck équilibré par défaut
(`±1..±6, +1, +2, −1, −2`).
```

- [ ] **Step 5 : Commit**

```bash
rtk git add docs/RULES.md docs/contrat-pazaak.md
rtk git commit -m "📝 docs(p3): bust a la conclusion du tour + signature IA (contrat 5-6, RULES 4-5)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2 : `refreshScoreAndFlags` — bust non verrouillé à la pioche

**Files:**
- Test: `packages/engine/test/turn.test.ts` (créer)
- Modify: `packages/engine/src/turn.ts`

- [ ] **Step 1 : Écrire le test qui échoue**

Créer `packages/engine/test/turn.test.ts` :

```ts
import { describe, expect, test } from "vitest";
import { refreshScoreAndFlags } from "../src/turn";
import type { PlayedCard, PlayerState } from "../src/types";

const main = (value: number): PlayedCard => ({
	source: "main",
	value,
	flipped: false,
});

function ps(over: Partial<PlayerState> = {}): PlayerState {
	return {
		sideDeck: null,
		hand: [],
		board: [],
		score: 0,
		standing: false,
		busted: false,
		setsWon: 0,
		playedHandCardThisTurn: false,
		playedTiebreakerThisSet: false,
		...over,
	};
}

describe("refreshScoreAndFlags (RULES §5, bust à la conclusion)", () => {
	test("recalcule le score depuis le plateau", () => {
		const p = ps({ board: [main(5), main(7)] });
		refreshScoreAndFlags(p);
		expect(p.score).toBe(12);
	});

	test("score > 20 avec board < 9 : reste actif (ni standing ni busted)", () => {
		const p = ps({ board: [main(10), main(8), main(5)] }); // 23
		refreshScoreAndFlags(p);
		expect(p.score).toBe(23);
		expect(p.busted).toBe(false);
		expect(p.standing).toBe(false);
	});

	test("20 exact (board < 9) : stand automatique, pas de bust", () => {
		const p = ps({ board: [main(10), main(10)] });
		refreshScoreAndFlags(p);
		expect(p.score).toBe(20);
		expect(p.standing).toBe(true);
		expect(p.busted).toBe(false);
	});

	test("9 cartes sans bust : stand automatique, pas de bust", () => {
		const p = ps({ board: Array(9).fill(main(2)) }); // 18
		refreshScoreAndFlags(p);
		expect(p.standing).toBe(true);
		expect(p.busted).toBe(false);
	});

	test("9 cartes en dépassant 20 : stand ET bust (on ne peut plus poser)", () => {
		const p = ps({ board: Array(9).fill(main(3)) }); // 27
		refreshScoreAndFlags(p);
		expect(p.standing).toBe(true);
		expect(p.busted).toBe(true);
	});

	test("score < 20 (board < 9) : rien n'est verrouillé", () => {
		const p = ps({ board: [main(7)] });
		refreshScoreAndFlags(p);
		expect(p.standing).toBe(false);
		expect(p.busted).toBe(false);
	});
});
```

- [ ] **Step 2 : Lancer le test, vérifier l'échec**

Run: `command pnpm --filter @pazaak/engine exec vitest run test/turn.test.ts`
Expected: FAIL — le cas « score > 20 avec board < 9 » attend `busted=false`, l'implémentation actuelle met `busted=true`.

- [ ] **Step 3 : Implémenter la nouvelle sémantique**

Dans `packages/engine/src/turn.ts`, remplacer la fonction `refreshScoreAndFlags` :

```ts
export function refreshScoreAndFlags(player: PlayerState): void {
	player.score = scoreBoard(player.board);
	if (hasNineCards(player.board)) {
		// 9 cartes : on ne peut plus poser → conclusion forcée.
		player.standing = true;
		if (isBust(player.score)) {
			player.busted = true; // 9 cartes en dépassant 20 = bust (RULES §5)
		}
	} else if (isTwenty(player.score)) {
		player.standing = true; // 20 exact → stand automatique
	}
	// score > 20 avec board < 9 : le joueur reste actif (rescousse possible) ;
	// le bust n'est finalisé qu'à la conclusion du tour (endTurn/stand).
}
```

- [ ] **Step 4 : Lancer le test, vérifier le succès**

Run: `command pnpm --filter @pazaak/engine exec vitest run test/turn.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5 : MAJ du test play-card devenu obsolète**

Le test « une carte qui dépasse 20 buste » suppose l'ancien bust-on-play. Dans
`packages/engine/test/play-card.test.ts`, remplacer le test (lignes ~104–112) :

```ts
	test("une carte qui dépasse 20 buste", () => {
		const g = makeG({
			hand: [plus3],
			board: [mainCard(10), mainCard(9)],
			score: 19,
		});
		call(g, 0);
		expect((g.players["0"] as PlayerState).busted).toBe(true);
	});
```

par :

```ts
	test("une carte qui dépasse 20 ne buste pas tout de suite (bust à la conclusion)", () => {
		const g = makeG({
			hand: [plus3],
			board: [mainCard(10), mainCard(9)],
			score: 19,
		});
		call(g, 0);
		const p = g.players["0"] as PlayerState;
		expect(p.score).toBe(22);
		expect(p.busted).toBe(false); // reste actif ; le bust est finalisé par endTurn/stand
		expect(p.standing).toBe(false);
	});
```

- [ ] **Step 6 : Lancer la suite engine complète**

Run: `command pnpm --filter @pazaak/engine exec vitest run`
Expected: PASS. (Le test play-card est à jour ; `invariants.test.ts` reste vert — les trois moves restent valides pour le joueur courant même au-dessus de 20.)

- [ ] **Step 7 : Commit**

```bash
rtk git add packages/engine/src/turn.ts packages/engine/test/turn.test.ts packages/engine/test/play-card.test.ts
rtk git commit -m "✨ feat(engine): bust non verrouille a la pioche (rescousse possible)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3 : `endTurn` / `stand` — bust à la conclusion

**Files:**
- Test: `packages/engine/test/end-turn-stand.test.ts` (créer)
- Modify: `packages/engine/src/moves.ts`

- [ ] **Step 1 : Écrire le test qui échoue**

Créer `packages/engine/test/end-turn-stand.test.ts` :

```ts
import { INVALID_MOVE } from "boardgame.io/core";
import { describe, expect, test } from "vitest";
import { endTurn, stand } from "../src/moves";
import type { G, PlayedCard, PlayerState } from "../src/types";

const main = (value: number): PlayedCard => ({
	source: "main",
	value,
	flipped: false,
});

function freshP(over: Partial<PlayerState> = {}): PlayerState {
	return {
		sideDeck: null,
		hand: [],
		board: [],
		score: 0,
		standing: false,
		busted: false,
		setsWon: 0,
		playedHandCardThisTurn: false,
		playedTiebreakerThisSet: false,
		...over,
	};
}

function makeG(p0: Partial<PlayerState>): G {
	return {
		players: { "0": freshP(p0), "1": freshP() },
		mainDeck: [],
		currentSet: 1,
		setStarter: "0",
		matchWinner: null,
	};
}

function callEndTurn(G: G): unknown {
	let ended = false;
	const r = (endTurn as unknown as (c: unknown) => unknown)({
		G,
		ctx: { currentPlayer: "0" },
		events: {
			endTurn: () => {
				ended = true;
			},
		},
		playerID: "0",
	});
	return r ?? ended;
}

function callStand(G: G): unknown {
	return (stand as unknown as (c: unknown) => unknown)({
		G,
		ctx: { currentPlayer: "0" },
		playerID: "0",
	});
}

describe("endTurn (conclusion, RULES §5)", () => {
	test("score ≤ 20 : clôt le tour sans buster", () => {
		const g = makeG({ board: [main(10)], score: 10 });
		callEndTurn(g);
		expect((g.players["0"] as PlayerState).busted).toBe(false);
	});

	test("score > 20 : buste à la conclusion", () => {
		const g = makeG({ board: [main(10), main(10), main(5)], score: 25 });
		callEndTurn(g);
		expect((g.players["0"] as PlayerState).busted).toBe(true);
	});

	test("rejet si déjà standing", () => {
		expect(callEndTurn(makeG({ standing: true }))).toBe(INVALID_MOVE);
	});
});

describe("stand (conclusion, RULES §5)", () => {
	test("score ≤ 20 : fige le joueur", () => {
		const g = makeG({ board: [main(18)], score: 18 });
		callStand(g);
		const p = g.players["0"] as PlayerState;
		expect(p.standing).toBe(true);
		expect(p.busted).toBe(false);
	});

	test("score > 20 : buste (stand au-dessus de 20 = bust)", () => {
		const g = makeG({ board: [main(10), main(10), main(5)], score: 25 });
		callStand(g);
		const p = g.players["0"] as PlayerState;
		expect(p.busted).toBe(true);
		expect(p.standing).toBe(false);
	});

	test("rejet si déjà busted", () => {
		expect(callStand(makeG({ busted: true }))).toBe(INVALID_MOVE);
	});
});
```

- [ ] **Step 2 : Lancer le test, vérifier l'échec**

Run: `command pnpm --filter @pazaak/engine exec vitest run test/end-turn-stand.test.ts`
Expected: FAIL — les cas « score > 20 » attendent `busted=true`, l'implémentation actuelle ne le met pas.

- [ ] **Step 3 : Implémenter la conclusion**

Dans `packages/engine/src/moves.ts`, remplacer la fonction `endTurn` :

```ts
export const endTurn: Move<G> = ({ G, ctx, events, playerID }) => {
	if (playerID == null || playerID !== ctx.currentPlayer) {
		return INVALID_MOVE;
	}
	const player = G.players[playerID];
	if (!player || player.standing || player.busted) {
		return INVALID_MOVE;
	}
	if (player.score > 20) {
		player.busted = true; // bust finalisé à la conclusion du tour (RULES §5)
	}
	events.endTurn();
};
```

Puis remplacer la fonction `stand` :

```ts
export const stand: Move<G> = ({ G, ctx, playerID }) => {
	if (playerID == null || playerID !== ctx.currentPlayer) {
		return INVALID_MOVE;
	}
	const player = G.players[playerID];
	if (!player || player.standing || player.busted) {
		return INVALID_MOVE;
	}
	if (player.score > 20) {
		player.busted = true; // stand au-dessus de 20 = bust (RULES §5)
	} else {
		player.standing = true;
	}
};
```

- [ ] **Step 4 : Lancer le test, vérifier le succès**

Run: `command pnpm --filter @pazaak/engine exec vitest run test/end-turn-stand.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5 : Commit**

```bash
rtk git add packages/engine/src/moves.ts packages/engine/test/end-turn-stand.test.ts
rtk git commit -m "✨ feat(engine): bust finalise par endTurn/stand a la conclusion du tour

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4 : Module IA (`ai.ts`)

**Files:**
- Test: `packages/engine/test/ai.test.ts` (créer)
- Create: `packages/engine/src/ai.ts`
- Modify: `packages/engine/src/index.ts`

- [ ] **Step 1 : Écrire le test qui échoue**

Créer `packages/engine/test/ai.test.ts` :

```ts
import { describe, expect, test } from "vitest";
import { chooseMove, chooseSideDeck } from "../src/ai";
import { pickSideDeck } from "../src/moves";
import type { AiParams } from "../src/ai";
import type { G, PlayedCard, PlayerState, SideCard } from "../src/types";

const main = (value: number): PlayedCard => ({
	source: "main",
	value,
	flipped: false,
});
const plus = (value: 1 | 2 | 3 | 4 | 5 | 6): SideCard => ({
	kind: "standard",
	value,
	sign: "+",
});
const minus = (value: 1 | 2 | 3 | 4 | 5 | 6): SideCard => ({
	kind: "standard",
	value,
	sign: "-",
});
const pm = (value: 1 | 2 | 3 | 4 | 5 | 6): SideCard => ({
	kind: "standard",
	value,
	sign: "pm",
});

function ps(over: Partial<PlayerState> = {}): PlayerState {
	return {
		sideDeck: null,
		hand: [],
		board: [],
		score: 0,
		standing: false,
		busted: false,
		setsWon: 0,
		playedHandCardThisTurn: false,
		playedTiebreakerThisSet: false,
		...over,
	};
}

const P18: AiParams = { standThreshold: 18 };

describe("chooseMove — stand (contrat §6)", () => {
	test("stand quand le score est dans [seuil, 20]", () => {
		expect(chooseMove(ps({ score: 18, hand: [plus(1)] }), P18)).toEqual({
			move: "stand",
		});
		expect(chooseMove(ps({ score: 19, hand: [] }), P18)).toEqual({
			move: "stand",
		});
	});

	test("le seuil est paramétrable (difficulté)", () => {
		expect(chooseMove(ps({ score: 17, hand: [] }), { standThreshold: 17 })).toEqual(
			{ move: "stand" },
		);
		// au seuil 19, 17 n'est pas encore dans l'intervalle → endTurn
		expect(chooseMove(ps({ score: 17, hand: [] }), { standThreshold: 19 })).toEqual(
			{ move: "endTurn" },
		);
	});
});

describe("chooseMove — sous le seuil (contrat §6)", () => {
	test("joue une carte qui amène à 20 exact", () => {
		// score 17, +3 -> 20
		expect(
			chooseMove(ps({ score: 17, hand: [plus(1), plus(3)] }), P18),
		).toEqual({ move: "playCard", args: [1] });
	});

	test("endTurn si aucune carte n'atteint 20", () => {
		expect(chooseMove(ps({ score: 12, hand: [plus(3)] }), P18)).toEqual({
			move: "endTurn",
		});
	});

	test("utilise une ± pour atteindre 20, avec déclaration de signe", () => {
		// score 16, ±4 en + -> 20
		expect(chooseMove(ps({ score: 16, hand: [pm(4)] }), P18)).toEqual({
			move: "playCard",
			args: [0, { sign: "+" }],
		});
	});
});

describe("chooseMove — rescousse au-dessus de 20 (contrat §6)", () => {
	test("joue une carte négative pour revenir ≤ 20", () => {
		// score 23, -3 -> 20
		expect(
			chooseMove(ps({ score: 23, hand: [minus(3)] }), P18),
		).toEqual({ move: "playCard", args: [0] });
	});

	test("maximise le score résultant ≤ 20", () => {
		// score 24 ; -4 -> 20 (mieux), -6 -> 18 : choisir -4
		expect(
			chooseMove(ps({ score: 24, hand: [minus(6), minus(4)] }), P18),
		).toEqual({ move: "playCard", args: [1] });
	});

	test("rescousse avec une ± en signe négatif", () => {
		// score 22, ±3 en - -> 19
		expect(chooseMove(ps({ score: 22, hand: [pm(3)] }), P18)).toEqual({
			move: "playCard",
			args: [0, { sign: "-" }],
		});
	});

	test("endTurn (bust forcé) si aucune carte ne ramène ≤ 20", () => {
		// score 25, +/- 2 -> 23 ou 27 : aucune ≤ 20
		expect(chooseMove(ps({ score: 25, hand: [pm(2)] }), P18)).toEqual({
			move: "endTurn",
		});
	});
});

describe("chooseSideDeck", () => {
	test("renvoie 10 cartes standard valides, acceptées par pickSideDeck", () => {
		const deck = chooseSideDeck();
		expect(deck).toHaveLength(10);
		const G: G = {
			players: { "0": ps(), "1": ps() },
			mainDeck: [],
			currentSet: 1,
			setStarter: "0",
			matchWinner: null,
		};
		const r = (
			pickSideDeck as unknown as (c: unknown, cards: SideCard[]) => unknown
		)(
			{
				G,
				playerID: "0",
				random: { Shuffle: <T>(a: T[]) => a },
			},
			deck,
		);
		expect(r).toBeUndefined(); // pick accepté (pas INVALID_MOVE)
		expect((G.players["0"] as PlayerState).hand).toHaveLength(4);
	});
});
```

- [ ] **Step 2 : Lancer le test, vérifier l'échec**

Run: `command pnpm --filter @pazaak/engine exec vitest run test/ai.test.ts`
Expected: FAIL — `../src/ai` n'existe pas (erreur de résolution de module).

- [ ] **Step 3 : Implémenter `ai.ts`**

Créer `packages/engine/src/ai.ts` :

```ts
// IA heuristique pure du mode solo (contrat §6). Aucun accès runtime boardgame.io :
// décide à partir de l'état complet du joueur IA (PlayerState, main incluse).

import type { PlayerState, SideCard, Sign, StandardValue } from "./types";

export type AiMove =
	| { move: "stand" }
	| { move: "endTurn" }
	| {
			move: "playCard";
			args: [handIndex: number, declaration?: { sign: Sign }];
	  };

export interface AiParams {
	standThreshold: 17 | 18 | 19; // défaut 18 ; niveaux de difficulté
}

/** Résolutions possibles d'une carte de main jouée (les ± offrent deux signes). */
function candidatesFor(
	card: SideCard,
): { resolved: number; declaration?: { sign: Sign } }[] {
	if (card.kind !== "standard") {
		return []; // P2 : seules les cartes standard sont jouables
	}
	if (card.sign === "+") {
		return [{ resolved: card.value }];
	}
	if (card.sign === "-") {
		return [{ resolved: -card.value }];
	}
	// ± : signe déclaré au play
	return [
		{ resolved: card.value, declaration: { sign: "+" } },
		{ resolved: -card.value, declaration: { sign: "-" } },
	];
}

/**
 * Choisit le coup de l'IA (contrat §6). Appelée uniquement quand l'IA est active
 * (la pioche automatique a déjà eu lieu) :
 * 1. score > 20 → rescousse : carte qui maximise le score résultant ≤ 20, sinon endTurn ;
 * 2. score ∈ [standThreshold, 20] → stand ;
 * 3. score < standThreshold → carte qui amène à 20 exact, sinon endTurn.
 */
export function chooseMove(self: PlayerState, params: AiParams): AiMove {
	const score = self.score;

	// Meilleure carte jouable satisfaisant `accept`, maximisant le résultat.
	const bestPlay = (accept: (result: number) => boolean): AiMove | null => {
		let best: {
			handIndex: number;
			declaration?: { sign: Sign };
			result: number;
		} | null = null;
		for (let i = 0; i < self.hand.length; i++) {
			const card = self.hand[i];
			if (!card) {
				continue;
			}
			for (const cand of candidatesFor(card)) {
				const result = score + cand.resolved;
				if (!accept(result)) {
					continue;
				}
				if (best === null || result > best.result) {
					best = { handIndex: i, declaration: cand.declaration, result };
				}
			}
		}
		if (best === null) {
			return null;
		}
		return best.declaration
			? { move: "playCard", args: [best.handIndex, best.declaration] }
			: { move: "playCard", args: [best.handIndex] };
	};

	if (score > 20) {
		return bestPlay((r) => r <= 20) ?? { move: "endTurn" };
	}
	if (score >= params.standThreshold) {
		return { move: "stand" };
	}
	return bestPlay((r) => r === 20) ?? { move: "endTurn" };
}

/** Side deck par défaut de l'IA : équilibré, riche en ± (rescousse + atteindre 20). */
export function chooseSideDeck(): SideCard[] {
	const card = (value: StandardValue, sign: Sign | "pm"): SideCard => ({
		kind: "standard",
		value,
		sign,
	});
	return [
		card(1, "pm"),
		card(2, "pm"),
		card(3, "pm"),
		card(4, "pm"),
		card(5, "pm"),
		card(6, "pm"),
		card(1, "+"),
		card(2, "+"),
		card(1, "-"),
		card(2, "-"),
	];
}
```

- [ ] **Step 4 : Lancer le test, vérifier le succès**

Run: `command pnpm --filter @pazaak/engine exec vitest run test/ai.test.ts`
Expected: PASS (toutes les descriptions).

- [ ] **Step 5 : Exporter l'API IA**

Dans `packages/engine/src/index.ts`, ajouter deux lignes d'export. Juste après
`export { createMainDeck, standardSideCardCatalogue } from "./deck";` :

```ts
export { chooseMove, chooseSideDeck } from "./ai";
export type { AiMove, AiParams } from "./ai";
```

(L'export de types vient d'un module différent — `./ai` — il ne peut pas être fusionné
avec le bloc `export type { ... } from "./types";` existant ; c'est une ligne séparée.)

- [ ] **Step 6 : Typecheck + suite complète**

Run: `command pnpm --filter @pazaak/engine exec tsc --noEmit`
Expected: PASS (aucune erreur).

Run: `command pnpm --filter @pazaak/engine exec vitest run`
Expected: PASS (toute la suite engine, IA incluse).

- [ ] **Step 7 : Commit**

```bash
rtk git add packages/engine/src/ai.ts packages/engine/src/index.ts packages/engine/test/ai.test.ts
rtk git commit -m "✨ feat(engine): IA heuristique pure (chooseMove + chooseSideDeck, contrat 6)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5 : Vérification finale + mémoire projet

**Files:**
- Modify: `docs/INDEX.md`, `docs/HANDOFF.md`, `docs/QUIRKS.md`

- [ ] **Step 1 : Invariants fast-check (≥ 1000 runs)**

Run: `command pnpm --filter @pazaak/engine exec vitest run test/invariants.test.ts`
Expected: PASS (1000 runs verts ; les invariants RULES §7 tiennent avec le nouvel état « actif > 20 »). Si un cas remonte un état incohérent, traiter via systematic-debugging avant de continuer.

- [ ] **Step 2 : Lint + typecheck + test à la racine**

```bash
command pnpm exec biome check .
command pnpm -r typecheck
command pnpm -r test
```
Expected: les trois verts (RC=0).

- [ ] **Step 3 : Mettre à jour `docs/INDEX.md`**

Ajouter dans la table « Features », sous la ligne P2 :

```markdown
| **P3.1 — Moteur bust-recovery + IA** | 2026-06-12 | `superpowers/specs/2026-06-12-p3-engine-bust-recovery-ai.md` | `superpowers/plans/2026-06-12-p3-engine-bust-recovery-ai.md` | ✅ Livré | Bust finalisé à la conclusion du tour (rescousse par side deck) ; IA pure `chooseMove`/`chooseSideDeck` (contrat §6). Tests engine MAJ + nouveaux. Web solo → bloc P3.2. |
```

- [ ] **Step 4 : Mettre à jour `docs/HANDOFF.md`**

Ajouter une entrée datée en haut (sous le titre H1) :

```markdown
## 2026-06-12 — P3.1 Moteur bust-recovery + IA livré ★

### Dernière chose faite
- Corrigé le moteur : le bust n'est plus verrouillé à la pioche forcée. Un joueur > 20
  (board < 9) reste actif et peut jouer une carte de side deck pour revenir ≤ 20 ; le
  bust est finalisé par `endTurn`/`stand` (RULES §5 mis à jour d'abord).
  `refreshScoreAndFlags`, `endTurn`, `stand` modifiés ; tests `turn.test.ts`,
  `end-turn-stand.test.ts` ajoutés ; `play-card.test.ts` mis à jour.
- Livré l'IA heuristique pure (`ai.ts`) : `chooseMove(self, params)` (contrat §6) +
  `chooseSideDeck()`. Exportées par `index.ts`. `ai.test.ts` couvre stand / jeu vers 20 /
  rescousse / bust forcé / déterminisme du signe ±.

### Trucs en suspens
- **Bloc P3.2 (web)** non commencé : wiring TanStack Start + écrans pick/board/fin,
  client local boardgame.io branché sur l'IA. C'est lui qui satisfait le critère de
  sortie P3 « partie solo complète au navigateur ». Spec à écrire (brainstorming).
- Gold cards toujours P8 ; l'IA ne joue que des cartes standard.

### Prochaine chose à creuser
- P3.2 : résoudre `@tanstack/react-start` + client `boardgame.io` via Context7 avant le
  front. Décider comment l'IA pilote ses tours dans un client `Local()` (driver manuel
  qui dispatch `chooseMove`, vs bot natif boardgame.io).

### Notes pour future Claude
- L'IA est totalement découplée du runtime boardgame.io : pure `(PlayerState, AiParams)
  => AiMove`. Le web devra lire l'état de l'IA (son `PlayerState` complet, vu de son
  propre client) et dispatcher l'`AiMove` sur le client.
- Le moteur autorise désormais un joueur courant « actif > 20 » : tout pilote (UI, bot)
  doit lui proposer un coup (rescousse / endTurn), il n'y a plus d'auto-fin sur bust.
```

- [ ] **Step 5 : Mettre à jour `docs/QUIRKS.md`**

Ajouter en tête (après le préambule, avant le premier quirk daté) :

```markdown
## Bust finalisé à la conclusion du tour, pas à la pioche (2026-06-12)

**Découvert / décidé** : en P3, en branchant l'IA (le branch « éviter le bust » du
contrat §6 était mort avec le moteur P2).

**Comportement** : un joueur dont la pioche forcée fait dépasser 20 **n'est pas busté
immédiatement** (tant que board < 9). Il reste `currentPlayer` actif et DOIT jouer un
coup (carte de rescousse pour revenir ≤ 20, ou `endTurn`/`stand` qui finalise le bust).
`refreshScoreAndFlags` ne verrouille `busted` que sur 9 cartes en dépassant 20.

**Implication** : tout pilote du jeu (UI solo, futur bot, tests) doit fournir un coup au
joueur courant même au-dessus de 20 — il n'y a plus d'auto-fin de tour sur bust. Le bust
sur la pioche n'apparaît qu'après `endTurn`/`stand`.

**Référence** : `packages/engine/src/turn.ts`, `moves.ts` ; RULES §5 ; contrat §5-6.

```

- [ ] **Step 6 : Commit mémoire**

```bash
rtk git add docs/INDEX.md docs/HANDOFF.md docs/QUIRKS.md
rtk git commit -m "📝 docs(p3): memoire projet apres P3.1 (moteur bust-recovery + IA)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Critères de sortie du bloc P3.1
- [ ] `command pnpm exec biome check .` vert.
- [ ] `command pnpm -r typecheck` vert.
- [ ] `command pnpm -r test` vert (engine : suite MAJ + `turn`, `end-turn-stand`, `ai`).
- [ ] Invariants fast-check ≥ 1000 runs verts.
- [ ] `RULES.md` + `contrat-pazaak.md` mis à jour **avant** le code ; `INDEX`/`HANDOFF`/`QUIRKS` à jour.
- [ ] Aucun doc de `docs/` en désaccord avec le code livré.

> Le critère de sortie **P3 global** (« partie solo complète jouable au navigateur ») est
> atteint au **bloc P3.2 (web)**, hors de ce plan.
