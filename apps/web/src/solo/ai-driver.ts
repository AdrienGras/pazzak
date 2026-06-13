import type { AiParams, OpponentView, PlayerState } from "@pazaak/engine";
import { chooseMove, chooseSideDeck } from "@pazaak/engine";

/**
 * Forme minimale de l'état renvoyé par `getState()` d'un client vanilla boardgame.io,
 * filtré par `playerView` : le siège local porte un `PlayerState` complet (`hand`
 * = `SideCard[]`, un Array), l'adversaire un `OpponentView` (`hand` = `{ count }`).
 * `boardgame.io` n'exporte pas `ClientState` ; on modélise donc le sous-ensemble lu ici.
 */
interface ClientState {
	G: {
		players: Record<string, PlayerState | OpponentView>;
		matchWinner: string | null;
	};
	ctx: { phase: string | null };
	isActive?: boolean;
}

/**
 * Dispatchers de coups exposés par un client vanilla boardgame.io.
 * `boardgame.io` les type en `(...args: any[]) => void` ; on resserre à `unknown[]`
 * pour rester `any`-free — les `AiMove.args` sont typés en amont par `chooseMove`.
 */
interface ClientMoves {
	[move: string]: ((...args: unknown[]) => void) | undefined;
}

/**
 * Le joueur dont l'état est complet (sa `hand` est un Array) est le siège local du
 * client : la vue de l'adversaire réduit `hand` à `{ count }`. On s'appuie sur cette
 * distinction plutôt que sur `ctx.currentPlayer`, qui ne désigne pas le siège local
 * pendant la phase simultanée `pickSideDeck` (stage `{ all: 'pick' }`).
 */
function isOwnSeat(p: PlayerState | OpponentView): p is PlayerState {
	return Array.isArray(p.hand);
}

function findOwnSeat(state: ClientState): PlayerState | null {
	for (const p of Object.values(state.G.players)) {
		if (isOwnSeat(p)) {
			return p;
		}
	}
	return null;
}

/**
 * Avance le pilotage IA d'un pas pour le client donné. Renvoie `true` si un coup a été
 * dispatché. Sans effet si l'état est nul (sync en cours) ou si le client n'est pas
 * actif (`isActive === false`).
 *
 * - Phase `pickSideDeck` (stage simultané `{ all: 'pick' }`) : `ctx.currentPlayer` ne
 *   désigne pas le siège local ; on identifie le siège par sa main (Array) et on pique
 *   un side deck par défaut s'il ne l'a pas encore fait.
 * - Phase `play` : on délègue à `chooseMove`, qui est total (rescousse > 20, stand,
 *   jeu vers 20, sinon endTurn) ; il n'y a jamais d'auto-fin sur bust côté moteur.
 */
export function aiStep(
	state: ClientState | null,
	moves: ClientMoves,
	params: AiParams,
): boolean {
	if (!state || state.isActive === false) {
		return false;
	}

	const self = findOwnSeat(state);
	if (!self) {
		return false;
	}

	if (state.ctx.phase === "pickSideDeck") {
		if (self.sideDeck === null) {
			moves.pickSideDeck?.(chooseSideDeck());
			return true;
		}
		return false;
	}

	const m = chooseMove(self, params);
	moves[m.move]?.(...m.args);
	return true;
}
