import type { OpponentView, PlayedCard, PlayerState } from "@pazaak/engine";
import { CardView, playedCardLabel } from "./CardView";

function BoardCard({
	card,
	index,
	testId,
}: {
	card: PlayedCard;
	index: number;
	testId: string;
}) {
	return (
		<CardView
			key={index}
			label={playedCardLabel(card)}
			testId={`${testId}-board-${index}`}
		/>
	);
}

export function PlayerPanel({
	player,
	label,
	testId,
}: {
	player: PlayerState | OpponentView;
	label: string;
	testId: string;
}) {
	const status = player.busted ? "busted" : player.standing ? "stand" : "actif";
	return (
		<section
			data-testid={testId}
			style={{ border: "1px solid #555", padding: "0.5rem" }}
		>
			<h2>{label}</h2>
			<div data-testid={`${testId}-board`}>
				{player.board.map((c, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: board cards stable by position
					<BoardCard key={i} card={c} index={i} testId={testId} />
				))}
			</div>
			<p>
				Score : <span data-testid={`${testId}-score`}>{player.score}</span> Sets
				: <span data-testid={`${testId}-sets`}>{player.setsWon}</span>{" "}
				<span data-testid={`${testId}-status`}>{status}</span>
			</p>
		</section>
	);
}
