// IA heuristique pure du mode solo (contrat §6). Aucun accès runtime boardgame.io :
// décide à partir de l'état complet du joueur IA (PlayerState, main incluse).

import type { PlayerState, SideCard, Sign, StandardValue } from "./types";

export type AiMove =
	| { move: "stand"; args: [] }
	| { move: "endTurn"; args: [] }
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
					best = cand.declaration
						? { handIndex: i, declaration: cand.declaration, result }
						: { handIndex: i, result };
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
		return bestPlay((r) => r <= 20) ?? { move: "endTurn", args: [] };
	}
	if (score >= params.standThreshold) {
		return { move: "stand", args: [] };
	}
	return bestPlay((r) => r === 20) ?? { move: "endTurn", args: [] };
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
