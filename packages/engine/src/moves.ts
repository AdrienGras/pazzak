import type { Move } from "boardgame.io";
import { INVALID_MOVE } from "boardgame.io/core";
import { refreshScoreAndFlags } from "./turn";
import type { G, SideCard, Sign } from "./types";

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

/** Clôt le tour sans stand : le joueur repiochera à son prochain tour (RULES §4). */
export const endTurn: Move<G> = ({ G, ctx, events, playerID }) => {
	if (playerID == null || playerID !== ctx.currentPlayer) {
		return INVALID_MOVE;
	}
	const player = G.players[playerID];
	if (!player || player.standing || player.busted) {
		return INVALID_MOVE;
	}
	events.endTurn();
};

/** Fige le score du joueur jusqu'à la fin du set (RULES §4). turn.endIf clôt le tour. */
export const stand: Move<G> = ({ G, ctx, playerID }) => {
	if (playerID == null || playerID !== ctx.currentPlayer) {
		return INVALID_MOVE;
	}
	const player = G.players[playerID];
	if (!player || player.standing || player.busted) {
		return INVALID_MOVE;
	}
	player.standing = true;
};

/**
 * Joue au plus une carte de la main sur le plateau (contrat §5). En P2, seules les
 * cartes standard sont jouables ; le signe d'une carte ± est déclaré ici, irrévocable.
 */
export const playCard: Move<G> = (
	{ G, ctx, playerID },
	handIndex: number,
	declaration?: { sign: Sign; value?: 1 | 2 },
) => {
	if (playerID == null || playerID !== ctx.currentPlayer) {
		return INVALID_MOVE;
	}
	const player = G.players[playerID];
	if (!player || player.standing || player.busted) {
		return INVALID_MOVE;
	}
	if (player.playedHandCardThisTurn) {
		return INVALID_MOVE;
	}
	if (
		!Number.isInteger(handIndex) ||
		handIndex < 0 ||
		handIndex >= player.hand.length
	) {
		return INVALID_MOVE;
	}
	const card = player.hand[handIndex];
	if (card?.kind !== "standard") {
		return INVALID_MOVE; // P2 : cartes standard uniquement
	}

	let resolvedValue: number;
	if (card.sign === "pm") {
		if (
			!declaration ||
			(declaration.sign !== "+" && declaration.sign !== "-")
		) {
			return INVALID_MOVE; // ± : déclaration de signe obligatoire
		}
		resolvedValue = declaration.sign === "+" ? card.value : -card.value;
	} else {
		if (declaration) {
			return INVALID_MOVE; // signe fixe : aucune déclaration attendue
		}
		resolvedValue = card.sign === "+" ? card.value : -card.value;
	}

	player.board.push({ source: "hand", card, resolvedValue });
	player.hand.splice(handIndex, 1);
	player.playedHandCardThisTurn = true;
	refreshScoreAndFlags(player);
};
