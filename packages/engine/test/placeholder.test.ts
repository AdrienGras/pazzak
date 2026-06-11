import { expect, test } from "vitest";
import { ENGINE_PLACEHOLDER } from "../src/index";

test("engine placeholder est en place", () => {
	expect(ENGINE_PLACEHOLDER).toBe(true);
});
