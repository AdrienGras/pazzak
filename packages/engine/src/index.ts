// API publique du moteur Pazaak (contrat §11, BOOTSTRAP §3).
// L'IA (ai.ts) sera ajoutée en P3.

export { createMainDeck, standardSideCardCatalogue } from "./deck";
export { chooseMove, chooseSideDeck } from "./ai";
export type { AiMove, AiParams } from "./ai";
export { initialState, PazaakGame } from "./game";
export { playerView } from "./playerView";
export {
	betterScore,
	hasNineCards,
	isBust,
	isTwenty,
	scoreBoard,
	setOutcome,
} from "./scoring";
export type {
	G,
	OpponentView,
	PlayedCard,
	PlayerID,
	PlayerState,
	PlayerViewG,
	SideCard,
	Sign,
	StandardValue,
} from "./types";
