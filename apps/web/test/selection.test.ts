import { expect, test } from "vitest";
import { toggleSelection } from "../src/solo/selection";

test("ajoute un index non sélectionné", () => {
	expect(toggleSelection([], 3)).toEqual([3]);
});

test("retire un index déjà sélectionné", () => {
	expect(toggleSelection([1, 3, 5], 3)).toEqual([1, 5]);
});

test("refuse d'ajouter au-delà de 10 (no-op)", () => {
	const ten = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
	expect(toggleSelection(ten, 10)).toEqual(ten);
});

test("autorise la désélection même à 10", () => {
	const ten = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
	expect(toggleSelection(ten, 5)).toEqual([0, 1, 2, 3, 4, 6, 7, 8, 9]);
});
