import { expect, test } from "vitest";
import { aiStep } from "../src/solo/ai-driver";
import { createSoloClients } from "../src/solo/clients";

test("deux sièges pilotés par l'IA jouent jusqu'à un vainqueur", () => {
	const { human, ai } = createSoloClients("ai-vs-ai");
	human.start();
	ai.start();

	const params = { standThreshold: 18 } as const;
	let guard = 0;
	while (human.getState()?.G.matchWinner == null && guard < 5000) {
		guard++;
		const acted =
			aiStep(human.getState(), human.moves, params) ||
			aiStep(ai.getState(), ai.moves, params);
		if (!acted) {
			break;
		}
	}

	const final = human.getState();
	expect(final?.G.matchWinner).not.toBeNull();
	expect(["0", "1"]).toContain(final?.G.matchWinner);
	const winner = final?.G.matchWinner;
	expect(final?.G.players[winner!]?.setsWon).toBe(3);

	human.stop();
	ai.stop();
});
