import { hasNineCards, isBust, isTwenty, scoreBoard } from "./scoring";
import type { G, PlayerID, PlayerState } from "./types";

/**
 * Recalcule le score d'un joueur et applique les effets automatiques (RULES §5) :
 * - 9 cartes : stand forcé ; si score > 20, bust immédiat (impossible de poser une carte de secours).
 * - 20 exact (board < 9) : stand automatique.
 * - score > 20 avec board < 9 : le joueur reste actif (rescousse possible) ;
 *   le bust n'est finalisé qu'à la conclusion du tour (endTurn/stand).
 * À appeler après toute modification du plateau (pioche ou carte de main).
 */
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
