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

	test("un joueur poussé > 20 par la pioche garde son tour, puis endTurn lui fait perdre le set", () => {
		const { p0, p1 } = reachPlay("over20-flow");
		let observedActiveOver20 = false;

		// Pilote uniquement avec endTurn : un joueur qui ne stand jamais finit
		// par dépasser 20 sur une pioche forcée (fenêtre de rescousse, RULES §5).
		for (let i = 0; i < 80; i++) {
			const s = getState(p0);
			if (s.ctx.gameover !== undefined) {
				break;
			}
			const cur = s.ctx.currentPlayer;
			const curClient = cur === "0" ? p0 : p1;
			const me = player(curClient, cur);

			if (me.score > 20 && !me.busted && !me.standing) {
				// État « actif > 20 » : le tour est resté au joueur (pas d'auto-bust).
				observedActiveOver20 = true;
				const other = cur === "0" ? "1" : "0";
				const otherBefore = player(clientOf(p0, p1, other), other).setsWon;
				const curSetBefore = getState(p0).G.currentSet;

				move(curClient, "endTurn"); // conclut le tour au-dessus de 20 → bust

				// Après résolution : soit l'adversaire a un setsWon de plus,
				// soit un nouveau set a démarré (currentSet++, boards remis à zéro).
				// Note : startNextSet remet busted = false donc on ne peut plus lire
				// player(curClient, cur).busted — on vérifie à la place l'effet sur le set.
				const otherAfter = player(clientOf(p0, p1, other), other).setsWon;
				const curSetAfter = getState(p0).G.currentSet;
				expect(
					otherAfter === otherBefore + 1 || curSetAfter === curSetBefore + 1,
				).toBe(true);
				break;
			}

			move(curClient, "endTurn");
		}

		// Le test doit RÉELLEMENT avoir traversé la fenêtre « actif > 20 »
		// (sinon il passerait à vide). Le seed est choisi pour la produire.
		expect(observedActiveOver20).toBe(true);
	});
});
