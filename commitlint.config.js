// Valide les messages "<emoji> type(scope): sujet" (gitmoji + conventional).
export default {
	extends: ["@commitlint/config-conventional"],
	// Laisse passer uniquement les commits de merge gitmoji ("🔀 Merge: ...") : un emoji
	// est obligatoire en préfixe — un "Merge:" sans emoji est rejeté comme tout autre commit.
	ignores: [(message) => /^\p{Extended_Pictographic}️?\s+Merge:/u.test(message)],
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
