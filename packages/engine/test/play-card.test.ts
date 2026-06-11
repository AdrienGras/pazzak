import { INVALID_MOVE } from "boardgame.io/core";
import { describe, expect, test } from "vitest";
import { playCard } from "../src/moves";
import type { G, PlayedCard, PlayerState, SideCard } from "../src/types";

const plus3: SideCard = { kind: "standard", value: 3, sign: "+" };
const minus2: SideCard = { kind: "standard", value: 2, sign: "-" };
const pm4: SideCard = { kind: "standard", value: 4, sign: "pm" };
const gold: SideCard = { kind: "tiebreaker" };
const mainCard = (value: number): PlayedCard => ({
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

/** Appel direct du move avec un contexte minimal (déterministe, sans pioche auto). */
function call(G: G, handIndex: number, declaration?: unknown): unknown {
	return (
		playCard as unknown as (c: unknown, h: number, d?: unknown) => unknown
	)({ G, ctx: { currentPlayer: "0" }, playerID: "0" }, handIndex, declaration);
}

describe("playCard (contrat §5)", () => {
	test("joue une carte +3 : +3 au score, retirée de la main, flag posé", () => {
		const g = makeG({ hand: [plus3] });
		expect(call(g, 0)).toBeUndefined();
		const p = g.players["0"] as PlayerState;
		expect(p.score).toBe(3);
		expect(p.hand).toHaveLength(0);
		expect(p.board).toHaveLength(1);
		expect(p.playedHandCardThisTurn).toBe(true);
	});

	test("une carte -2 retranche du score", () => {
		const g = makeG({ hand: [minus2], board: [mainCard(10)], score: 10 });
		call(g, 0);
		expect((g.players["0"] as PlayerState).score).toBe(8);
	});

	test("une carte ± exige une déclaration de signe", () => {
		expect(call(makeG({ hand: [pm4] }), 0)).toBe(INVALID_MOVE);
	});

	test("± déclarée - applique le signe négatif", () => {
		const g = makeG({ hand: [pm4], board: [mainCard(10)], score: 10 });
		call(g, 0, { sign: "-" });
		expect((g.players["0"] as PlayerState).score).toBe(6);
	});

	test("une carte à signe fixe rejette une déclaration", () => {
		expect(call(makeG({ hand: [plus3] }), 0, { sign: "+" })).toBe(INVALID_MOVE);
	});

	test("rejette un index hors bornes", () => {
		expect(call(makeG({ hand: [plus3] }), 5)).toBe(INVALID_MOVE);
	});

	test("rejette une deuxième carte de main dans le même tour", () => {
		const g = makeG({ hand: [plus3, minus2], playedHandCardThisTurn: true });
		expect(call(g, 0)).toBe(INVALID_MOVE);
	});

	test("rejette une gold card (non jouable en P2)", () => {
		expect(call(makeG({ hand: [gold] }), 0)).toBe(INVALID_MOVE);
	});

	test("une carte qui amène à 20 déclenche le stand automatique", () => {
		const g = makeG({
			hand: [plus3],
			board: [mainCard(10), mainCard(7)],
			score: 17,
		});
		call(g, 0);
		const p = g.players["0"] as PlayerState;
		expect(p.score).toBe(20);
		expect(p.standing).toBe(true);
	});

	test("une carte qui dépasse 20 buste", () => {
		const g = makeG({
			hand: [plus3],
			board: [mainCard(10), mainCard(9)],
			score: 19,
		});
		call(g, 0);
		expect((g.players["0"] as PlayerState).busted).toBe(true);
	});
});
