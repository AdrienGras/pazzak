import { describe, expect, test } from "vitest";
import { standardSideCardCatalogue } from "../src/deck";
import type { SideCard } from "../src/types";
import { getState, makeClients, move, player } from "./support";

const tenValid = (): SideCard[] => standardSideCardCatalogue().slice(0, 10);

describe("phase pickSideDeck (contrat §5)", () => {
	test("la partie démarre en phase pickSideDeck", () => {
		const { p0 } = makeClients();
		expect(getState(p0).ctx.phase).toBe("pickSideDeck");
	});

	test("rejette une sélection qui n'a pas exactement 10 cartes", () => {
		const { p0 } = makeClients();
		move(p0, "pickSideDeck", tenValid().slice(0, 9));
		expect(player(p0, "0").sideDeck).toBeNull();
	});

	test("rejette une carte hors catalogue (gold card en P2)", () => {
		const { p0 } = makeClients();
		const bad = tenValid();
		bad[0] = { kind: "tiebreaker" };
		move(p0, "pickSideDeck", bad);
		expect(player(p0, "0").sideDeck).toBeNull();
	});

	test("un pick valide fixe le sideDeck (10) et tire une main de 4", () => {
		const { p0 } = makeClients();
		move(p0, "pickSideDeck", tenValid());
		expect(player(p0, "0").sideDeck).toHaveLength(10);
		expect(player(p0, "0").hand).toHaveLength(4);
	});

	test("quand les deux ont pické : passage en phase play et setStarter défini", () => {
		const { p0, p1 } = makeClients();
		move(p0, "pickSideDeck", tenValid());
		move(p1, "pickSideDeck", tenValid());
		expect(getState(p0).ctx.phase).toBe("play");
		expect(["0", "1"]).toContain(getState(p0).G.setStarter);
	});
});
