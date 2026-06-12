import { describe, expect, test } from "vitest";
import type { AiParams } from "../src/ai";
import { chooseMove, chooseSideDeck } from "../src/ai";
import { pickSideDeck } from "../src/moves";
import type { G, PlayerState, SideCard } from "../src/types";

const plus = (value: 1 | 2 | 3 | 4 | 5 | 6): SideCard => ({
	kind: "standard",
	value,
	sign: "+",
});
const minus = (value: 1 | 2 | 3 | 4 | 5 | 6): SideCard => ({
	kind: "standard",
	value,
	sign: "-",
});
const pm = (value: 1 | 2 | 3 | 4 | 5 | 6): SideCard => ({
	kind: "standard",
	value,
	sign: "pm",
});

function ps(over: Partial<PlayerState> = {}): PlayerState {
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

const P18: AiParams = { standThreshold: 18 };

describe("chooseMove — stand (contrat §6)", () => {
	test("stand quand le score est dans [seuil, 20]", () => {
		expect(chooseMove(ps({ score: 18, hand: [plus(1)] }), P18)).toEqual({
			move: "stand",
		});
		expect(chooseMove(ps({ score: 19, hand: [] }), P18)).toEqual({
			move: "stand",
		});
	});

	test("le seuil est paramétrable (difficulté)", () => {
		expect(
			chooseMove(ps({ score: 17, hand: [] }), { standThreshold: 17 }),
		).toEqual({ move: "stand" });
		expect(
			chooseMove(ps({ score: 17, hand: [] }), { standThreshold: 19 }),
		).toEqual({ move: "endTurn" });
	});
});

describe("chooseMove — sous le seuil (contrat §6)", () => {
	test("joue une carte qui amène à 20 exact", () => {
		expect(
			chooseMove(ps({ score: 17, hand: [plus(1), plus(3)] }), P18),
		).toEqual({ move: "playCard", args: [1] });
	});

	test("endTurn si aucune carte n'atteint 20", () => {
		expect(chooseMove(ps({ score: 12, hand: [plus(3)] }), P18)).toEqual({
			move: "endTurn",
		});
	});

	test("utilise une ± pour atteindre 20, avec déclaration de signe", () => {
		expect(chooseMove(ps({ score: 16, hand: [pm(4)] }), P18)).toEqual({
			move: "playCard",
			args: [0, { sign: "+" }],
		});
	});
});

describe("chooseMove — rescousse au-dessus de 20 (contrat §6)", () => {
	test("joue une carte négative pour revenir ≤ 20", () => {
		expect(chooseMove(ps({ score: 23, hand: [minus(3)] }), P18)).toEqual({
			move: "playCard",
			args: [0],
		});
	});

	test("maximise le score résultant ≤ 20", () => {
		expect(
			chooseMove(ps({ score: 24, hand: [minus(6), minus(4)] }), P18),
		).toEqual({ move: "playCard", args: [1] });
	});

	test("rescousse avec une ± en signe négatif", () => {
		expect(chooseMove(ps({ score: 22, hand: [pm(3)] }), P18)).toEqual({
			move: "playCard",
			args: [0, { sign: "-" }],
		});
	});

	test("endTurn (bust forcé) si aucune carte ne ramène ≤ 20", () => {
		expect(chooseMove(ps({ score: 25, hand: [pm(2)] }), P18)).toEqual({
			move: "endTurn",
		});
	});
});

describe("chooseSideDeck", () => {
	test("renvoie 10 cartes standard valides, acceptées par pickSideDeck", () => {
		const deck = chooseSideDeck();
		expect(deck).toHaveLength(10);
		const G: G = {
			players: { "0": ps(), "1": ps() },
			mainDeck: [],
			currentSet: 1,
			setStarter: "0",
			matchWinner: null,
		};
		const r = (
			pickSideDeck as unknown as (c: unknown, cards: SideCard[]) => unknown
		)(
			{
				G,
				playerID: "0",
				random: { Shuffle: <T>(a: T[]) => a },
			},
			deck,
		);
		expect(r).toBeUndefined();
		expect((G.players["0"] as PlayerState).hand).toHaveLength(4);
	});
});
