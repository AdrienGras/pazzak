import { describe, expect, test } from "vitest";
import { refreshScoreAndFlags } from "../src/turn";
import type { PlayedCard, PlayerState } from "../src/types";

const main = (value: number): PlayedCard => ({
	source: "main",
	value,
	flipped: false,
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

describe("refreshScoreAndFlags (RULES §5, bust à la conclusion)", () => {
	test("recalcule le score depuis le plateau", () => {
		const p = ps({ board: [main(5), main(7)] });
		refreshScoreAndFlags(p);
		expect(p.score).toBe(12);
	});

	test("score > 20 avec board < 9 : reste actif (ni standing ni busted)", () => {
		const p = ps({ board: [main(10), main(8), main(5)] }); // 23
		refreshScoreAndFlags(p);
		expect(p.score).toBe(23);
		expect(p.busted).toBe(false);
		expect(p.standing).toBe(false);
	});

	test("20 exact (board < 9) : stand automatique, pas de bust", () => {
		const p = ps({ board: [main(10), main(10)] });
		refreshScoreAndFlags(p);
		expect(p.score).toBe(20);
		expect(p.standing).toBe(true);
		expect(p.busted).toBe(false);
	});

	test("9 cartes sans bust : stand automatique, pas de bust", () => {
		const p = ps({ board: Array(9).fill(main(2)) }); // 18
		refreshScoreAndFlags(p);
		expect(p.standing).toBe(true);
		expect(p.busted).toBe(false);
	});

	test("9 cartes en dépassant 20 : stand ET bust (on ne peut plus poser)", () => {
		const p = ps({ board: Array(9).fill(main(3)) }); // 27
		refreshScoreAndFlags(p);
		expect(p.standing).toBe(true);
		expect(p.busted).toBe(true);
	});

	test("score < 20 (board < 9) : rien n'est verrouillé", () => {
		const p = ps({ board: [main(7)] });
		refreshScoreAndFlags(p);
		expect(p.standing).toBe(false);
		expect(p.busted).toBe(false);
	});
});
