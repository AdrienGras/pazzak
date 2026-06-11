import type { PlayedCard, PlayerState } from "./types";

/** Contribution signée d'une carte posée au score du plateau. */
export function cardContribution(card: PlayedCard): number {
	if (card.source === "main") {
		return card.flipped ? -card.value : card.value;
	}
	return card.resolvedValue;
}

/** Score d'un joueur = somme signée de son plateau (RULES §7). */
export function scoreBoard(board: readonly PlayedCard[]): number {
	return board.reduce((sum, card) => sum + cardContribution(card), 0);
}

/** Bust : score strictement supérieur à 20 (RULES §5). */
export function isBust(score: number): boolean {
	return score > 20;
}

/** 20 exact : déclenche le stand automatique (RULES §5). */
export function isTwenty(score: number): boolean {
	return score === 20;
}

/** 9 cartes posées sans bust : stand automatique + victoire du set (RULES §5). */
export function hasNineCards(board: readonly PlayedCard[]): boolean {
	return board.length >= 9;
}

/** Comparaison de deux scores (≤ 20) au double stand : le plus élevé gagne, égalité = tie. */
export function betterScore(a: number, b: number): "a" | "b" | "tie" {
	if (a > b) {
		return "a";
	}
	if (b > a) {
		return "b";
	}
	return "tie";
}

/**
 * Issue d'un set entre deux joueurs `a` et `b` (RULES §5). Renvoie :
 * - `"a"` / `"b"` : vainqueur du set ;
 * - `"tie"` : double stand à égalité → set rejoué ;
 * - `null` : le set n'est pas encore terminé.
 *
 * Priorité : bust (perte immédiate) → 9 cartes (victoire immédiate) → double stand.
 */
export function setOutcome(
	a: PlayerState,
	b: PlayerState,
): "a" | "b" | "tie" | null {
	if (a.busted) {
		return "b";
	}
	if (b.busted) {
		return "a";
	}
	if (hasNineCards(a.board)) {
		return "a";
	}
	if (hasNineCards(b.board)) {
		return "b";
	}
	if (a.standing && b.standing) {
		return betterScore(a.score, b.score);
	}
	return null;
}
