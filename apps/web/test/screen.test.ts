import { expect, test } from "vitest";
import { deriveScreen } from "../src/solo/screen";

const base = (phase: string, matchWinner: string | null) => ({
	G: { matchWinner },
	ctx: { phase, gameover: undefined as unknown },
});

test("état null (sync) → pick", () => {
	expect(deriveScreen(null)).toBe("pick");
});

test("phase pickSideDeck → pick", () => {
	expect(deriveScreen(base("pickSideDeck", null))).toBe("pick");
});

test("phase play sans vainqueur → play", () => {
	expect(deriveScreen(base("play", null))).toBe("play");
});

test("matchWinner défini → gameover", () => {
	expect(deriveScreen(base("play", "0"))).toBe("gameover");
});
