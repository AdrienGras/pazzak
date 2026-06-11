import { expect, test } from "vitest";
import { SHARED_PLACEHOLDER } from "../src/index";

test("shared placeholder est en place", () => {
	expect(SHARED_PLACEHOLDER).toBe(true);
});
