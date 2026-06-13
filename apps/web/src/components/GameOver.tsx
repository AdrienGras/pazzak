export function GameOver({
	winner,
	isHumanWinner,
	onReplay,
}: {
	winner: string;
	isHumanWinner: boolean;
	onReplay: () => void;
}) {
	return (
		<div data-testid="game-over">
			<h1 data-testid="winner">
				{isHumanWinner ? "Victoire !" : "Défaite"} (joueur {winner})
			</h1>
			<button type="button" data-testid="replay" onClick={onReplay}>
				Rejouer
			</button>
		</div>
	);
}
