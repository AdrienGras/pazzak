import type { AiParams } from "@pazaak/engine";

export type Difficulty = "easy" | "normal" | "hard";

/** Mapping difficulté → seuil de stand de l'IA (contrat §6). */
export function aiParamsFor(difficulty: Difficulty): AiParams {
	const standThreshold =
		difficulty === "easy" ? 19 : difficulty === "hard" ? 17 : 18;
	return { standThreshold };
}

export function isDifficulty(value: unknown): value is Difficulty {
	return value === "easy" || value === "normal" || value === "hard";
}
