import { chooseSideDeck } from "@pazaak/engine";
import { expect, test } from "vitest";
import { createSoloClients } from "../src/solo/clients";

test("les deux clients Local partagent le même master de jeu", () => {
	const { human, ai } = createSoloClients("test-match");
	human.start();
	ai.start();

	const hState = human.getState();
	const aState = ai.getState();
	expect(hState?.ctx.phase).toBe("pickSideDeck");
	expect(aState?.ctx.phase).toBe("pickSideDeck");

	human.stop();
	ai.stop();
});

test("un coup dispatché sur le client humain se propage au client IA via le master partagé", () => {
	const { human, ai } = createSoloClients("test-cross");
	human.start();
	ai.start();

	// Vue initiale du client IA : le joueur '0' (humain) est un OpponentView,
	// sa main est réduite à un compte et vaut 0 avant le pick.
	const before = ai.getState()?.G.players["0"];
	expect(before && "hand" in before && before.hand).toEqual({ count: 0 });

	// Coup dispatché sur le client HUMAIN.
	const pickSideDeck = human.moves.pickSideDeck;
	expect(pickSideDeck).toBeDefined();
	pickSideDeck?.(chooseSideDeck());

	// Observation CROISÉE sur le client IA : la main de 4 du joueur '0' a été tirée
	// au pick et devient visible (count: 4) → preuve que le master est partagé.
	const after = ai.getState()?.G.players["0"];
	expect(after && "hand" in after && after.hand).toEqual({ count: 4 });

	human.stop();
	ai.stop();
});
