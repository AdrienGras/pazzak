import { describe, expect, test } from "vitest";
import {
	betterScore,
	hasNineCards,
	isBust,
	isTwenty,
	scoreBoard,
} from "../src/scoring";
import type { PlayedCard } from "../src/types";

const main = (value: number): PlayedCard => ({
	source: "main",
	value,
	flipped: false,
});
const hand = (resolvedValue: number): PlayedCard => ({
	source: "hand",
	card: { kind: "standard", value: 1, sign: "+" },
	resolvedValue,
});

describe("scoreBoard", () => {
	test("plateau vide vaut 0", () => {
		expect(scoreBoard([])).toBe(0);
	});
	test("somme les valeurs des cartes du main deck", () => {
		expect(scoreBoard([main(5), main(10), main(3)])).toBe(18);
	});
	test("ajoute la valeur résolue signée des cartes de main", () => {
		expect(scoreBoard([main(10), hand(-3)])).toBe(7);
		expect(scoreBoard([main(8), hand(4)])).toBe(12);
	});
});

describe("prédicats de fin de set (RULES §5)", () => {
	test("isBust : strictement au-dessus de 20", () => {
		expect(isBust(21)).toBe(true);
		expect(isBust(20)).toBe(false);
		expect(isBust(7)).toBe(false);
	});
	test("isTwenty : 20 exact", () => {
		expect(isTwenty(20)).toBe(true);
		expect(isTwenty(19)).toBe(false);
	});
	test("hasNineCards : 9 cartes posées", () => {
		expect(hasNineCards(Array(9).fill(main(1)))).toBe(true);
		expect(hasNineCards(Array(8).fill(main(1)))).toBe(false);
	});
});

describe("betterScore (comparaison au double stand)", () => {
	test("le score le plus élevé gagne", () => {
		expect(betterScore(18, 17)).toBe("a");
		expect(betterScore(15, 20)).toBe("b");
	});
	test("égalité => tie", () => {
		expect(betterScore(19, 19)).toBe("tie");
	});
});
