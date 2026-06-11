import { describe, expect, test } from "vitest";
import { getState, player, singleClient } from "./support";

describe("setup initial (contrat §3)", () => {
	test("crée les joueurs '0' et '1'", () => {
		expect(Object.keys(getState(singleClient()).G.players)).toEqual(["0", "1"]);
	});

	test("chaque joueur démarre vide (sideDeck null, flags false, setsWon 0)", () => {
		const c = singleClient();
		for (const id of ["0", "1"]) {
			const p = player(c, id);
			expect(p.sideDeck).toBeNull();
			expect(p.hand).toEqual([]);
			expect(p.board).toEqual([]);
			expect(p.score).toBe(0);
			expect(p.standing).toBe(false);
			expect(p.busted).toBe(false);
			expect(p.setsWon).toBe(0);
			expect(p.playedHandCardThisTurn).toBe(false);
		}
	});

	test("le main deck contient 40 cartes et currentSet vaut 1", () => {
		const g = getState(singleClient()).G;
		expect(g.mainDeck).toHaveLength(40);
		expect(g.currentSet).toBe(1);
		expect(g.matchWinner).toBeNull();
	});
});
