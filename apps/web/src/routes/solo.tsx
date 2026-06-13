import type { OpponentView, PlayerState } from "@pazaak/engine";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Board } from "../components/Board";
import { DeckBuilder } from "../components/DeckBuilder";
import { GameOver } from "../components/GameOver";
import { createSoloClients } from "../solo/clients";
import { aiParamsFor, isDifficulty } from "../solo/difficulty";
import { deriveScreen } from "../solo/screen";
import { useAiDriver } from "../solo/use-ai-driver";
import { useSoloGame } from "../solo/use-solo-game";
import { useDeckBuilder } from "../store";

export const Route = createFileRoute("/solo")({
	validateSearch: (
		search: Record<string, unknown>,
	): { difficulty: "easy" | "normal" | "hard" } => ({
		difficulty: isDifficulty(search.difficulty) ? search.difficulty : "normal",
	}),
	component: SoloPage,
});

/**
 * Le client humain (siège '0') reçoit son propre `PlayerState` complet et l'adversaire
 * (siège '1') filtré en `OpponentView` par `playerView`. Le type `G` du client ne
 * distingue pas ces deux vues (`Record<PlayerID, PlayerState>`) ; on s'appuie sur
 * l'invariant runtime du contrat (§4) — la main de l'adversaire est réduite à
 * `{ count }`, pas un Array — pour resserrer sans `any`.
 */
function isOpponentView(p: PlayerState | OpponentView): p is OpponentView {
	return !Array.isArray(p.hand);
}

function SoloPage() {
	const { difficulty } = Route.useSearch();
	const [matchSeq, setMatchSeq] = useState(0);
	const params = useMemo(() => aiParamsFor(difficulty), [difficulty]);
	const { human, ai } = useMemo(
		() => createSoloClients(`solo-${difficulty}-${matchSeq}`),
		[difficulty, matchSeq],
	);

	useEffect(() => {
		human.start();
		ai.start();
		return () => {
			human.stop();
			ai.stop();
		};
	}, [human, ai]);

	useAiDriver(ai, params);
	const state = useSoloGame(human);
	const resetDeck = useDeckBuilder((s) => s.reset);

	const screen = deriveScreen(state);

	if (screen === "pick") {
		return (
			<DeckBuilder
				onConfirm={(deck) => {
					human.moves.pickSideDeck?.(deck);
				}}
			/>
		);
	}

	if (screen === "gameover" && state) {
		const winner = state.G.matchWinner ?? "0";
		return (
			<GameOver
				winner={winner}
				isHumanWinner={winner === "0"}
				onReplay={() => {
					resetDeck();
					setMatchSeq((n) => n + 1);
				}}
			/>
		);
	}

	if (state && screen === "play") {
		const human0 = state.G.players["0"];
		const ai1 = state.G.players["1"];
		if (!human0 || !ai1 || isOpponentView(human0) || !isOpponentView(ai1)) {
			return <div data-testid="solo-loading">Chargement…</div>;
		}
		return (
			<Board
				human={human0}
				opponent={ai1}
				isMyTurn={state.ctx.currentPlayer === "0" && state.isActive === true}
				currentSet={state.G.currentSet}
				onPlay={(i, decl) => human.moves.playCard?.(i, decl)}
				onEndTurn={() => human.moves.endTurn?.()}
				onStand={() => human.moves.stand?.()}
			/>
		);
	}

	return <div data-testid="solo-loading">Chargement…</div>;
}
