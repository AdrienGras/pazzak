import { describe, expect, test } from "vitest";
import {
	clientOf,
	currentClient,
	getState,
	move,
	player,
	reachPlay,
} from "./support";

describe("phase play — pioche et tours (contrat §5, RULES §4)", () => {
	test("au début du set, le setStarter pioche 1 carte automatiquement", () => {
		const { p0, p1 } = reachPlay();
		const starter = getState(p0).G.setStarter;
		const ps = player(clientOf(p0, p1, starter), starter);
		expect(ps.board).toHaveLength(1);
		const top = ps.board[0];
		expect(top?.source).toBe("main");
		if (top?.source === "main") {
			expect(ps.score).toBe(top.value);
		}
	});

	test("c'est au setStarter de jouer en premier", () => {
		const { p0 } = reachPlay();
		const s = getState(p0);
		expect(s.ctx.currentPlayer).toBe(s.G.setStarter);
	});

	test("endTurn passe la main à l'adversaire, qui pioche à son tour", () => {
		const { p0, p1 } = reachPlay();
		const starter = getState(p0).G.setStarter;
		const other = starter === "0" ? "1" : "0";
		move(currentClient(p0, p1), "endTurn");
		expect(getState(p0).ctx.currentPlayer).toBe(other);
		expect(player(clientOf(p0, p1, other), other).board).toHaveLength(1);
	});
});

describe("phase play — fin de set et de match (RULES §5-6)", () => {
	test("quand les deux joueurs stand, le set est résolu (nouveau set démarré)", () => {
		const { p0, p1 } = reachPlay();
		move(currentClient(p0, p1), "stand"); // le starter stand
		move(currentClient(p0, p1), "stand"); // puis l'adversaire stand
		const s = getState(p0);
		const totalSetsWon = player(p0, "0").setsWon + player(p1, "1").setsWon;
		expect(s.G.currentSet).toBe(2);
		expect(totalSetsWon).toBeLessThanOrEqual(1);
	});

	test("une partie où chacun stand à son tour se termine par un vainqueur (best of 3)", () => {
		const { p0, p1 } = reachPlay("match-seed");
		for (let i = 0; i < 200 && getState(p0).ctx.gameover === undefined; i++) {
			move(currentClient(p0, p1), "stand");
		}
		const over = getState(p0).ctx.gameover as { winner: string } | undefined;
		expect(over).toBeDefined();
		expect(["0", "1"]).toContain(over?.winner);
		if (over) {
			expect(player(clientOf(p0, p1, over.winner), over.winner).setsWon).toBe(
				3,
			);
		}
	});
});
