import { describe, expect, test } from "vitest";
import type { PlayerState } from "../src/types";
import { clientOf, getState, reachPlay } from "./support";

/**
 * Régression — blocage de la boucle de set sur auto-stand en pioche onBegin.
 *
 * Bug reproduit (184/300 seeds) : lorsque la pioche forcée de `turn.onBegin`
 * fige le joueur courant (score 20 pile, ou 9 cartes), boardgame.io ne
 * réévalue pas `turn.endIf` après `onBegin`. Le tour ne se termine donc jamais :
 * le joueur courant figé n'a plus de move légal, l'adversaire actif n'obtient
 * jamais la main, et `turn.onEnd`/`resolveSetIfOver` ne s'exécutent pas. La
 * partie se fige (`matchWinner === null` indéfiniment).
 *
 * Pilotage pur-moteur : chaque joueur, à son tour, fait UNIQUEMENT `endTurn`
 * (jamais de carte de main, jamais de stand explicite). Le seul moyen pour un
 * joueur de se figer est alors la pioche forcée de onBegin → c'est exactement
 * le chemin qui déclenche le bug. Chaque partie doit se terminer par un
 * vainqueur (3 sets gagnés).
 */
describe("phase play — terminaison de la boucle de set (RULES §4-5)", () => {
	const SEEDS = Array.from({ length: 50 }, (_, i) => `repro-${i}`);

	test.each(
		SEEDS,
	)("la partie pilotée à coups de endTurn se termine (seed %s)", (seed) => {
		const { p0, p1 } = reachPlay(seed);

		let matchWinner: string | null = null;
		let lastSignature = "";
		let stableCount = 0;

		for (let i = 0; i < 3000; i++) {
			const s = getState(p0);
			matchWinner = s.G.matchWinner;
			if (matchWinner != null) {
				break;
			}

			const cur = s.ctx.currentPlayer;
			const curClient = clientOf(p0, p1, cur);
			// Vue propre (non strippée) du joueur courant : son propre client.
			const me: PlayerState | undefined = getState(curClient).G.players[cur];

			// Détection du wedge : joueur courant figé, match non résolu, état figé.
			const signature = `${s.G.currentSet}/${cur}/${me?.score}/${me?.standing}/${me?.busted}/${s.ctx.turn}`;
			if (signature === lastSignature) {
				stableCount += 1;
			} else {
				stableCount = 0;
				lastSignature = signature;
			}

			if (me && (me.standing || me.busted)) {
				// Le joueur courant est figé alors que c'est son tour : c'est le wedge.
				// Aucun move ne peut le débloquer (endTurn/stand/playCard tous INVALID
				// sur un joueur figé). On l'assert explicitement pour un échec lisible.
				expect(
					`WEDGE seed=${seed} set=${s.G.currentSet} currentPlayer=${cur} ` +
						`score=${me.score} standing=${me.standing} busted=${me.busted} ` +
						`matchWinner=${s.G.matchWinner}`,
				).toBe("no wedge");
			}

			// Garde anti-boucle : état strictement identique pendant trop longtemps.
			expect(stableCount).toBeLessThan(5);

			const fn = curClient.moves.endTurn;
			expect(fn, `endTurn indisponible (seed ${seed})`).toBeTypeOf("function");
			fn?.();
		}

		expect(
			matchWinner,
			`aucun vainqueur après 3000 itérations (seed ${seed})`,
		).not.toBeNull();
		expect(["0", "1"]).toContain(matchWinner);
		if (matchWinner != null) {
			const winner = getState(clientOf(p0, p1, matchWinner)).G.players[
				matchWinner
			];
			expect(winner?.setsWon).toBe(3);
		}
	});
});
