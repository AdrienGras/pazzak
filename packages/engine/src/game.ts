import type { Game } from "boardgame.io";
import { createMainDeck } from "./deck";
import { pickSideDeck } from "./moves";
import type { G, PlayerState } from "./types";

/** État neuf d'un joueur en début de match (contrat §3). */
function freshPlayer(): PlayerState {
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
	};
}

export const PazaakGame: Game<G> = {
	name: "pazaak",

	setup: (): G => ({
		players: { "0": freshPlayer(), "1": freshPlayer() },
		mainDeck: createMainDeck(),
		currentSet: 1,
		setStarter: "0",
		matchWinner: null,
	}),

	phases: {
		// Sélection simultanée des side decks ; main de 4 tirée au pick (contrat §5).
		pickSideDeck: {
			start: true,
			turn: {
				activePlayers: { all: "pick", minMoves: 1, maxMoves: 1 },
				stages: { pick: { moves: { pickSideDeck } } },
			},
			endIf: ({ G }) =>
				G.players["0"]?.sideDeck !== null && G.players["1"]?.sideDeck !== null,
			onEnd: ({ G, random }) => {
				// Premier joueur : tirage du main deck, la plus haute commence ; égalité → retirage.
				let a = random.Die(10);
				let b = random.Die(10);
				while (a === b) {
					a = random.Die(10);
					b = random.Die(10);
				}
				G.setStarter = a > b ? "0" : "1";
			},
			next: "play",
		},

		// Boucle de sets — implémentée par incréments (moves play/endTurn/stand, fin de set/match).
		play: {},
	},
};
