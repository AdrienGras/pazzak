import type { Move } from "boardgame.io";
import { INVALID_MOVE } from "boardgame.io/core";
import type { G, SideCard } from "./types";

/** Une carte est-elle autorisée dans le périmètre de base (standard ±1..±6) ? */
function isAllowedStandardCard(card: SideCard): boolean {
	return (
		card.kind === "standard" &&
		card.value >= 1 &&
		card.value <= 6 &&
		(card.sign === "+" || card.sign === "-" || card.sign === "pm")
	);
}

/**
 * Phase pickSideDeck : le joueur choisit exactement 10 cartes du catalogue autorisé ;
 * le serveur tire sa main de 4 (ctx.random). Contrat §5.
 */
export const pickSideDeck: Move<G> = (
	{ G, playerID, random },
	cards: SideCard[],
) => {
	if (playerID == null) {
		return INVALID_MOVE;
	}
	const player = G.players[playerID];
	if (!player || player.sideDeck !== null) {
		return INVALID_MOVE;
	}
	if (!Array.isArray(cards) || cards.length !== 10) {
		return INVALID_MOVE;
	}
	if (!cards.every(isAllowedStandardCard)) {
		return INVALID_MOVE;
	}
	player.sideDeck = cards;
	player.hand = random.Shuffle([...cards]).slice(0, 4);
};
