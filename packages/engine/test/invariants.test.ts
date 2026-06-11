import fc from "fast-check";
import { describe, test } from "vitest";
import { scoreBoard } from "../src/scoring";
import type { PlayerState } from "../src/types";
import { getState, makeClients, move, pickValid, player } from "./support";

/** Vérifie les invariants RULES §7 sur un joueur ; renvoie la taille de main observée. */
function checkPlayer(p: PlayerState, prevHand: number): number {
	if (p.board.length > 9) {
		throw new Error(`plateau > 9 cartes (${p.board.length})`);
	}
	if (p.score !== scoreBoard(p.board)) {
		throw new Error(
			`score (${p.score}) != somme du plateau (${scoreBoard(p.board)})`,
		);
	}
	if (p.hand.length > 4) {
		throw new Error(`main > 4 cartes (${p.hand.length})`);
	}
	if (p.hand.length > prevHand) {
		throw new Error(`la main a grossi (${prevHand} -> ${p.hand.length})`);
	}
	if (p.setsWon > 3) {
		throw new Error(`setsWon > 3 (${p.setsWon})`);
	}
	return p.hand.length;
}

/** Joue une partie pilotée par une suite d'actions et vérifie les invariants à chaque état. */
function playAndCheck(seed: number, actions: number[]): void {
	const { p0, p1 } = makeClients(`inv-${seed}`);
	pickValid(p0);
	pickValid(p1);

	let prev0 = checkPlayer(player(p0, "0"), 4);
	let prev1 = checkPlayer(player(p1, "1"), 4);

	for (const code of actions) {
		const s = getState(p0);
		if (s.ctx.gameover !== undefined) {
			break;
		}
		const cur = s.ctx.currentPlayer;
		const c = cur === "0" ? p0 : p1;
		const me = player(c, cur);
		const action = code % 3;

		if (action === 2 && me.hand.length > 0 && !me.playedHandCardThisTurn) {
			const card = me.hand[0];
			if (card?.kind === "standard" && card.sign === "pm") {
				move(c, "playCard", 0, { sign: "+" });
			} else {
				move(c, "playCard", 0);
			}
		} else if (action === 1) {
			move(c, "endTurn");
		} else {
			move(c, "stand");
		}

		prev0 = checkPlayer(player(p0, "0"), prev0);
		prev1 = checkPlayer(player(p1, "1"), prev1);
	}
}

describe("invariants (fast-check, RULES §7)", () => {
	test("toute partie aléatoire respecte les invariants à chaque état", () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 1, max: 1_000_000 }),
				fc.array(fc.nat({ max: 99 }), { maxLength: 50 }),
				(seed, actions) => {
					playAndCheck(seed, actions);
				},
			),
			{ numRuns: 1000 },
		);
	}, 120_000);
});
