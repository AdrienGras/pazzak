import { hasNineCards, isBust, isTwenty, scoreBoard } from "./scoring";
import type { G, PlayerID, PlayerState } from "./types";

/**
 * Recalcule le score d'un joueur et applique les effets automatiques (RULES §5) :
 * bust (> 20), 9 cartes (stand auto + victoire), 20 exact (stand auto).
 * À appeler après toute modification du plateau (pioche ou carte de main).
 */
export function refreshScoreAndFlags(player: PlayerState): void {
	player.score = scoreBoard(player.board);
	if (isBust(player.score)) {
		player.busted = true;
	} else if (hasNineCards(player.board)) {
		player.standing = true;
	} else if (isTwenty(player.score)) {
		player.standing = true;
	}
}

/** Pioche la carte du dessus du main deck vers le plateau du joueur, puis recalcule. */
export function drawFromMainDeck(G: G, playerId: PlayerID): void {
	const player = G.players[playerId];
	if (!player) {
		return;
	}
	const value = G.mainDeck.pop();
	if (value === undefined) {
		return; // main deck épuisé : ne devrait pas arriver (40 cartes, ≤ 18 piochées/set)
	}
	player.board.push({ source: "main", value, flipped: false });
	refreshScoreAndFlags(player);
}
