import type { SideCard } from "@pazaak/engine";
import { CardView, sideCardLabel } from "./CardView";

export function HandView({
	hand,
	disabled,
	onPlay,
}: {
	hand: SideCard[];
	disabled: boolean;
	onPlay: (handIndex: number, declaration?: { sign: "+" | "-" }) => void;
}) {
	return (
		<div data-testid="hand">
			{hand.map((card, i) => {
				const isPm = card.kind === "standard" && card.sign === "pm";
				return (
					// biome-ignore lint/suspicious/noArrayIndexKey: hand cards stable by position
					<span key={i} style={{ display: "inline-block", margin: "0.25rem" }}>
						<CardView label={sideCardLabel(card)} testId={`hand-card-${i}`} />
						{isPm ? (
							<span>
								<button
									type="button"
									data-testid={`hand-play-${i}-plus`}
									disabled={disabled}
									onClick={() => onPlay(i, { sign: "+" })}
								>
									+
								</button>
								<button
									type="button"
									data-testid={`hand-play-${i}-minus`}
									disabled={disabled}
									onClick={() => onPlay(i, { sign: "-" })}
								>
									−
								</button>
							</span>
						) : (
							<button
								type="button"
								data-testid={`hand-play-${i}`}
								disabled={disabled}
								onClick={() => onPlay(i)}
							>
								Jouer
							</button>
						)}
					</span>
				);
			})}
		</div>
	);
}
