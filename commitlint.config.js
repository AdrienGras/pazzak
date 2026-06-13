// Valide les messages "<emoji> type(scope): sujet" (gitmoji + conventional).
export default {
	extends: ["@commitlint/config-conventional"],
	// Laisse passer les commits de merge gitmoji ("🔀 Merge: ...") : "Merge" n'est pas un
	// type conventionnel, et le préfixe emoji court-circuite l'ignore-merge par défaut.
	ignores: [(message) => /^\S*\s*Merge:/.test(message)],
	parserPreset: {
		parserOpts: {
			// Emoji unicode en tête (sélecteur de variante VS16 optionnel), non capturé.
			headerPattern:
				/^\p{Extended_Pictographic}️?\s+(\w+)(?:\(([^)]+)\))?:\s(.+)$/u,
			headerCorrespondence: ["type", "scope", "subject"],
		},
	},
	rules: {
		"subject-case": [0],
	},
};
