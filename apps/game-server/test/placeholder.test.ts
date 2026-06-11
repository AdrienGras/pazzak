import { expect, test } from "vitest";
import { GAME_SERVER_PLACEHOLDER } from "../src/index";

test("game-server placeholder est en place", () => {
	expect(GAME_SERVER_PLACEHOLDER).toBe(true);
});
