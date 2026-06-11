import type { Ctx, Game } from "boardgame.io";
import { createMainDeck } from "./deck";
import { endTurn, pickSideDeck, playCard, stand } from "./moves";
import { playerView } from "./playerView";
import { setOutcome } from "./scoring";
import { drawFromMainDeck } from "./turn";
import type { G, PlayerID, PlayerState } from "./types";

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

/** Un joueur peut-il encore jouer ce set (ni standing, ni busted) ? */
function isActive(G: G, id: PlayerID): boolean {
	const p = G.players[id];
	return !!p && !p.standing && !p.busted;
}

/** Prochaine position de tour (RULES §4 : tours non alternés après un stand). */
function nextActivePos(G: G, ctx: Ctx): number | undefined {
	const order = ctx.playOrder;
	// Début d'un nouveau set (plateaux vides, tous actifs) → le setStarter commence.
	const fresh = order.every((id) => {
		const p = G.players[id];
		return !!p && p.board.length === 0 && !p.standing && !p.busted;
	});
	if (fresh) {
		return Math.max(0, order.indexOf(G.setStarter));
	}
	const otherPos = (ctx.playOrderPos + 1) % ctx.numPlayers;
	const otherId = order[otherPos];
	if (otherId !== undefined && isActive(G, otherId)) {
		return otherPos;
	}
	// L'adversaire est figé : le joueur courant continue seul tant qu'il est actif.
	const curId = order[ctx.playOrderPos];
	if (curId !== undefined && isActive(G, curId)) {
		return ctx.playOrderPos;
	}
	return undefined;
}

/** Vide les plateaux, remélange un main deck neuf, alterne le premier joueur (mains conservées). */
function startNextSet(
	G: G,
	ctx: Ctx,
	random: { Shuffle: <T>(deck: T[]) => T[] },
): void {
	for (const id of ctx.playOrder) {
		const p = G.players[id];
		if (!p) {
			continue;
		}
		p.board = [];
		p.score = 0;
		p.standing = false;
		p.busted = false;
		p.playedHandCardThisTurn = false;
	}
	G.mainDeck = random.Shuffle(createMainDeck());
	G.currentSet += 1;
	const first = ctx.playOrder[0];
	const second = ctx.playOrder[1];
	if (first !== undefined && second !== undefined) {
		G.setStarter = G.setStarter === first ? second : first;
	}
}

/** Résout le set s'il est terminé : crédite le vainqueur, clôt le match ou enchaîne (RULES §5-6). */
function resolveSetIfOver(
	G: G,
	ctx: Ctx,
	random: { Shuffle: <T>(deck: T[]) => T[] },
): void {
	const aId = ctx.playOrder[0];
	const bId = ctx.playOrder[1];
	if (aId === undefined || bId === undefined) {
		return;
	}
	const a = G.players[aId];
	const b = G.players[bId];
	if (!a || !b) {
		return;
	}
	const outcome = setOutcome(a, b);
	if (outcome === null) {
		return; // set pas encore terminé
	}
	if (outcome !== "tie") {
		const winnerId = outcome === "a" ? aId : bId;
		const winner = G.players[winnerId];
		if (winner) {
			winner.setsWon += 1;
			if (winner.setsWon >= 3) {
				G.matchWinner = winnerId;
				return; // match terminé : game.endIf clôt la partie, pas de nouveau set
			}
		}
	}
	startNextSet(G, ctx, random);
}

/** État initial du match (contrat §3). Fonction pure, réutilisée par `setup` et les tests. */
export function initialState(): G {
	return {
		players: { "0": freshPlayer(), "1": freshPlayer() },
		mainDeck: createMainDeck(),
		currentSet: 1,
		setStarter: "0",
		matchWinner: null,
	};
}

export const PazaakGame: Game<G> = {
	name: "pazaak",

	setup: (): G => initialState(),

	playerView,

	// Fin de match : `setsWon === 3` côté vainqueur (contrat §5).
	endIf: ({ G }) =>
		G.matchWinner != null ? { winner: G.matchWinner } : undefined,

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

		// Boucle de sets (contrat §5).
		play: {
			onBegin: ({ G, random }) => {
				G.mainDeck = random.Shuffle(G.mainDeck);
			},
			moves: { playCard, endTurn, stand },
			turn: {
				order: {
					first: ({ G, ctx }) =>
						Math.max(0, ctx.playOrder.indexOf(G.setStarter)),
					next: ({ G, ctx }) => nextActivePos(G, ctx),
				},
				// Pioche automatique en début de tour (sauf joueur figé). RULES §4.
				onBegin: ({ G, ctx }) => {
					const id = ctx.currentPlayer;
					if (!isActive(G, id)) {
						return;
					}
					const p = G.players[id];
					if (p) {
						p.playedHandCardThisTurn = false;
					}
					drawFromMainDeck(G, id);
				},
				// Clôt le tour dès que le joueur courant est figé (bust, 20, 9 cartes, stand).
				endIf: ({ G, ctx }) => {
					const p = G.players[ctx.currentPlayer];
					return !!p && (p.standing || p.busted);
				},
				onEnd: ({ G, ctx, random }) => {
					resolveSetIfOver(G, ctx, random);
				},
			},
		},
	},
};
