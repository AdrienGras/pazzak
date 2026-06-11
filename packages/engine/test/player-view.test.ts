import { describe, expect, test } from "vitest";
import { playerView } from "../src/playerView";
import type { G, OpponentView, PlayerState } from "../src/types";

function P(over: Partial<PlayerState> = {}): PlayerState {
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

const g: G = {
	players: {
		"0": P({
			sideDeck: [{ kind: "standard", value: 1, sign: "+" }],
			hand: [{ kind: "standard", value: 2, sign: "-" }],
		}),
		"1": P({
			sideDeck: [{ kind: "double" }], // sentinelle side deck adverse
			hand: [{ kind: "tiebreaker" }], // sentinelle main adverse
			board: [{ source: "main", value: 7, flipped: false }],
			score: 7,
			setsWon: 1,
			standing: true,
		}),
	},
	mainDeck: [3, 4, 5],
	currentSet: 2,
	setStarter: "1",
	matchWinner: null,
};

describe("playerView (contrat §4)", () => {
	test("le joueur voit sa propre main et son side deck intégralement", () => {
		const me = playerView({ G: g, playerID: "0" }).players["0"] as PlayerState;
		expect(Array.isArray(me.hand)).toBe(true);
		expect(me.hand).toHaveLength(1);
		expect(me.sideDeck).toHaveLength(1);
	});

	test("la main adverse est réduite à un compte", () => {
		const opp = playerView({ G: g, playerID: "0" }).players[
			"1"
		] as OpponentView;
		expect(opp.hand).toEqual({ count: 1 });
	});

	test("le side deck adverse est masqué (null)", () => {
		const opp = playerView({ G: g, playerID: "0" }).players[
			"1"
		] as OpponentView;
		expect(opp.sideDeck).toBeNull();
	});

	test("le main deck est réduit au nombre de cartes restantes", () => {
		expect(playerView({ G: g, playerID: "0" }).mainDeck).toEqual({
			remaining: 3,
		});
	});

	test("l'état public adverse reste visible (board, score, setsWon, standing)", () => {
		const opp = playerView({ G: g, playerID: "0" }).players[
			"1"
		] as OpponentView;
		expect(opp.board).toHaveLength(1);
		expect(opp.score).toBe(7);
		expect(opp.setsWon).toBe(1);
		expect(opp.standing).toBe(true);
	});

	test("aucune carte secrète adverse ne fuite dans l'objet sérialisé", () => {
		const json = JSON.stringify(playerView({ G: g, playerID: "0" }));
		expect(json).not.toContain("tiebreaker");
		expect(json).not.toContain("double");
	});

	test("symétrique : pour le joueur '1', c'est '0' qui est masqué", () => {
		const v = playerView({ G: g, playerID: "1" });
		expect((v.players["1"] as PlayerState).hand).toHaveLength(1);
		expect((v.players["0"] as OpponentView).hand).toEqual({ count: 1 });
	});
});
