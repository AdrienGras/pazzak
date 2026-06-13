import type { OpponentView, PlayerState } from "@pazaak/engine";
import { HandView } from "./HandView";
import { PlayerPanel } from "./PlayerPanel";

interface BoardProps {
	human: PlayerState;
	opponent: OpponentView;
	isMyTurn: boolean;
	currentSet: number;
	onPlay: (handIndex: number, declaration?: { sign: "+" | "-" }) => void;
	onEndTurn: () => void;
	onStand: () => void;
}

export function Board({
	human,
	opponent,
	isMyTurn,
	currentSet,
	onPlay,
	onEndTurn,
	onStand,
}: BoardProps) {
	const frozen = human.standing || human.busted;
	const actionsDisabled = !isMyTurn || frozen;
	return (
		<div data-testid="board">
			<p data-testid="current-set">Set {currentSet}</p>
			<PlayerPanel player={opponent} label="IA" testId="panel-ai" />
			<PlayerPanel player={human} label="Vous" testId="panel-human" />
			<HandView
				hand={human.hand}
				disabled={actionsDisabled || human.playedHandCardThisTurn}
				onPlay={onPlay}
			/>
			<div>
				<button
					type="button"
					data-testid="end-turn"
					disabled={actionsDisabled}
					onClick={onEndTurn}
				>
					Fin du tour
				</button>
				<button
					type="button"
					data-testid="stand"
					disabled={actionsDisabled}
					onClick={onStand}
				>
					Stand
				</button>
			</div>
		</div>
	);
}
