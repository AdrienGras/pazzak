import { describe, expect, test } from "vitest";
import { initialState } from "../src/game";

describe("initialState (setup, contrat §3)", () => {
	test("crée les joueurs '0' et '1'", () => {
		expect(Object.keys(initialState().players)).toEqual(["0", "1"]);
	});

	test("chaque joueur démarre vide (sideDeck null, flags false, setsWon 0)", () => {
		const g = initialState();
		for (const id of ["0", "1"]) {
			const p = g.players[id];
			expect(p?.sideDeck).toBeNull();
			expect(p?.hand).toEqual([]);
			expect(p?.board).toEqual([]);
			expect(p?.score).toBe(0);
			expect(p?.standing).toBe(false);
			expect(p?.busted).toBe(false);
			expect(p?.setsWon).toBe(0);
			expect(p?.playedHandCardThisTurn).toBe(false);
		}
	});

	test("le main deck contient 40 cartes et currentSet vaut 1", () => {
		const g = initialState();
		expect(g.mainDeck).toHaveLength(40);
		expect(g.currentSet).toBe(1);
		expect(g.matchWinner).toBeNull();
	});
});
