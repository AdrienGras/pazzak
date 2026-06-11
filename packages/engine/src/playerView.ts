import type {
	G,
	OpponentView,
	PlayerID,
	PlayerState,
	PlayerViewG,
} from "./types";

/** Réduit l'état d'un adversaire à sa part publique (contrat §4). */
function stripOpponent(p: PlayerState): OpponentView {
	return {
		board: p.board,
		score: p.score,
		standing: p.standing,
		busted: p.busted,
		setsWon: p.setsWon,
		playedHandCardThisTurn: p.playedHandCardThisTurn,
		playedTiebreakerThisSet: p.playedTiebreakerThisSet,
		sideDeck: null,
		hand: { count: p.hand.length },
	};
}

/**
 * Vue livrée au client pour le joueur `playerID` (contrat §4) :
 * - son propre état : intégral ;
 * - l'adversaire : side deck masqué, main réduite à un compte, reste public ;
 * - main deck : réduit au nombre de cartes restantes.
 * Aucune valeur de carte de main/side deck adverse ni du main deck ne doit fuiter.
 */
export function playerView({
	G,
	playerID,
}: {
	G: G;
	playerID: PlayerID | null;
}): PlayerViewG {
	const players: Record<PlayerID, PlayerState | OpponentView> = {};
	for (const [id, p] of Object.entries(G.players)) {
		players[id] = id === playerID ? p : stripOpponent(p);
	}
	return {
		players,
		mainDeck: { remaining: G.mainDeck.length },
		currentSet: G.currentSet,
		setStarter: G.setStarter,
		matchWinner: G.matchWinner,
	};
}
