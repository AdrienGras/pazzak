export type Screen = "pick" | "play" | "gameover";

interface ScreenState {
	G: { matchWinner: string | null };
	ctx: { phase: string | null; gameover?: unknown };
}

/** Écran à afficher, dérivé de l'état du client humain. */
export function deriveScreen(state: ScreenState | null): Screen {
	if (!state) {
		return "pick";
	}
	if (state.G.matchWinner != null || state.ctx.gameover != null) {
		return "gameover";
	}
	if (state.ctx.phase === "pickSideDeck") {
		return "pick";
	}
	return "play";
}
