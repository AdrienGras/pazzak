import { describe, expect, test } from "vitest";
import { createMainDeck, standardSideCardCatalogue } from "../src/deck";

describe("createMainDeck", () => {
	test("contient 40 cartes (RULES §2)", () => {
		expect(createMainDeck()).toHaveLength(40);
	});

	test("contient exactement 4 exemplaires de chaque valeur de 1 à 10", () => {
		const deck = createMainDeck();
		for (let v = 1; v <= 10; v++) {
			expect(deck.filter((c) => c === v)).toHaveLength(4);
		}
	});

	test("ne contient que des valeurs comprises entre 1 et 10", () => {
		for (const c of createMainDeck()) {
			expect(c).toBeGreaterThanOrEqual(1);
			expect(c).toBeLessThanOrEqual(10);
		}
	});
});

describe("standardSideCardCatalogue", () => {
	test("contient 18 cartes (+1..+6, -1..-6, ±1..±6)", () => {
		expect(standardSideCardCatalogue()).toHaveLength(18);
	});

	test("ne contient que des cartes standard de valeur 1..6 et de signe +/-/pm", () => {
		for (const card of standardSideCardCatalogue()) {
			expect(card.kind).toBe("standard");
			if (card.kind === "standard") {
				expect(card.value).toBeGreaterThanOrEqual(1);
				expect(card.value).toBeLessThanOrEqual(6);
				expect(["+", "-", "pm"]).toContain(card.sign);
			}
		}
	});

	test("couvre les trois signes pour chacune des valeurs 1..6", () => {
		const cat = standardSideCardCatalogue();
		for (const v of [1, 2, 3, 4, 5, 6]) {
			const signs = cat
				.filter((c) => c.kind === "standard" && c.value === v)
				.map((c) => (c.kind === "standard" ? c.sign : null));
			expect(signs).toContain("+");
			expect(signs).toContain("-");
			expect(signs).toContain("pm");
		}
	});
});
