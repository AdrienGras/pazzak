import { describe, expect, test } from "vitest";
import { setOutcome } from "../src/scoring";
import type { PlayedCard, PlayerState } from "../src/types";

const aCard: PlayedCard = { source: "main", value: 1, flipped: false };

function ps(over: Partial<PlayerState>): PlayerState {
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

describe("setOutcome (fin de set, RULES §5)", () => {
	test("aucune condition remplie => set non terminé (null)", () => {
		expect(
			setOutcome(ps({ standing: true, score: 18 }), ps({ score: 12 })),
		).toBeNull();
	});

	test("un joueur busté => l'autre gagne immédiatement", () => {
		expect(setOutcome(ps({ busted: true }), ps({ score: 5 }))).toBe("b");
		expect(setOutcome(ps({ score: 5 }), ps({ busted: true }))).toBe("a");
	});

	test("9 cartes sans bust => victoire immédiate, même si l'autre a 20", () => {
		const nine = ps({ board: Array(9).fill(aCard), score: 9 });
		expect(setOutcome(nine, ps({ standing: true, score: 20 }))).toBe("a");
	});

	test("double stand => le meilleur score gagne", () => {
		expect(
			setOutcome(
				ps({ standing: true, score: 19 }),
				ps({ standing: true, score: 18 }),
			),
		).toBe("a");
		expect(
			setOutcome(
				ps({ standing: true, score: 17 }),
				ps({ standing: true, score: 20 }),
			),
		).toBe("b");
	});

	test("double stand à égalité => tie (set rejoué)", () => {
		expect(
			setOutcome(
				ps({ standing: true, score: 18 }),
				ps({ standing: true, score: 18 }),
			),
		).toBe("tie");
	});
});
