import { INVALID_MOVE } from "boardgame.io/core";
import { describe, expect, test } from "vitest";
import { endTurn, stand } from "../src/moves";
import type { G, PlayedCard, PlayerState } from "../src/types";

const main = (value: number): PlayedCard => ({
	source: "main",
	value,
	flipped: false,
});

function freshP(over: Partial<PlayerState> = {}): PlayerState {
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
		...over,
	};
}

function makeG(p0: Partial<PlayerState>): G {
	return {
		players: { "0": freshP(p0), "1": freshP() },
		mainDeck: [],
		currentSet: 1,
		setStarter: "0",
		matchWinner: null,
	};
}

function callEndTurn(G: G): unknown {
	let ended = false;
	const r = (endTurn as unknown as (c: unknown) => unknown)({
		G,
		ctx: { currentPlayer: "0" },
		events: {
			endTurn: () => {
				ended = true;
			},
		},
		playerID: "0",
	});
	return r ?? ended;
}

function callStand(G: G): unknown {
	return (stand as unknown as (c: unknown) => unknown)({
		G,
		ctx: { currentPlayer: "0" },
		playerID: "0",
	});
}

describe("endTurn (conclusion, RULES §5)", () => {
	test("score ≤ 20 : clôt le tour sans buster", () => {
		const g = makeG({ board: [main(10)], score: 10 });
		expect(callEndTurn(g)).toBe(true); // endTurn() a bien été appelé
		expect((g.players["0"] as PlayerState).busted).toBe(false);
	});

	test("score = 20 exact : clôt le tour sans buster (borne)", () => {
		const g = makeG({ board: [main(10), main(10)], score: 20 });
		expect(callEndTurn(g)).toBe(true);
		expect((g.players["0"] as PlayerState).busted).toBe(false);
	});

	test("score > 20 : buste à la conclusion", () => {
		const g = makeG({ board: [main(10), main(10), main(5)], score: 25 });
		callEndTurn(g);
		expect((g.players["0"] as PlayerState).busted).toBe(true);
	});

	test("rejet si déjà standing", () => {
		expect(callEndTurn(makeG({ standing: true }))).toBe(INVALID_MOVE);
	});

	test("rejet si déjà busted", () => {
		expect(callEndTurn(makeG({ busted: true }))).toBe(INVALID_MOVE);
	});
});

describe("stand (conclusion, RULES §5)", () => {
	test("score ≤ 20 : fige le joueur", () => {
		const g = makeG({ board: [main(18)], score: 18 });
		callStand(g);
		const p = g.players["0"] as PlayerState;
		expect(p.standing).toBe(true);
		expect(p.busted).toBe(false);
	});

	test("score = 20 exact : fige le joueur, pas de bust (borne)", () => {
		const g = makeG({ board: [main(10), main(10)], score: 20 });
		callStand(g);
		const p = g.players["0"] as PlayerState;
		expect(p.standing).toBe(true);
		expect(p.busted).toBe(false);
	});

	test("score > 20 : buste (stand au-dessus de 20 = bust)", () => {
		const g = makeG({ board: [main(10), main(10), main(5)], score: 25 });
		callStand(g);
		const p = g.players["0"] as PlayerState;
		expect(p.busted).toBe(true);
		expect(p.standing).toBe(false);
	});

	test("rejet si déjà busted", () => {
		expect(callStand(makeG({ busted: true }))).toBe(INVALID_MOVE);
	});
});
