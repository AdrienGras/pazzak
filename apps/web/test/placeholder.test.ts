import { expect, test } from "vitest";
import { WEB_PLACEHOLDER } from "../src/index";

test("web placeholder est en place", () => {
	expect(WEB_PLACEHOLDER).toBe(true);
});
