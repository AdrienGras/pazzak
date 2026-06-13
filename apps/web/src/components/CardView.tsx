import type { PlayedCard, SideCard } from "@pazaak/engine";

/** Libellé d'une carte de side deck (catalogue). */
export function sideCardLabel(card: SideCard): string {
	if (card.kind !== "standard") {
		return "?"; // gold cards : P8
	}
	const prefix = card.sign === "pm" ? "±" : card.sign;
	return `${prefix}${card.value}`;
}

/** Libellé d'une carte posée sur le plateau. */
export function playedCardLabel(card: PlayedCard): string {
	if (card.source === "main") {
		return `${card.value}`;
	}
	return card.resolvedValue >= 0
		? `+${card.resolvedValue}`
		: `${card.resolvedValue}`;
}

export function CardView({
	label,
	testId,
}: {
	label: string;
	testId?: string;
}) {
	return (
		<span
			data-testid={testId}
			style={{
				display: "inline-block",
				minWidth: "2rem",
				padding: "0.5rem",
				margin: "0.15rem",
				border: "1px solid #888",
				borderRadius: "4px",
				textAlign: "center",
			}}
		>
			{label}
		</span>
	);
}
