import type { SideCard } from "@pazaak/engine";
import { standardSideCardCatalogue } from "@pazaak/engine";
import { DECK_SIZE } from "../solo/selection";
import { useDeckBuilder } from "../store";
import { CardView, sideCardLabel } from "./CardView";

const CATALOGUE = standardSideCardCatalogue();

export function DeckBuilder({
	onConfirm,
}: {
	onConfirm: (deck: SideCard[]) => void;
}) {
	const { selected, toggle } = useDeckBuilder();
	const complete = selected.length === DECK_SIZE;
	return (
		<div data-testid="deck-builder">
			<h1>Choisis tes {DECK_SIZE} cartes</h1>
			<p data-testid="deck-count">
				{selected.length}/{DECK_SIZE}
			</p>
			<div>
				{CATALOGUE.map((card, i) => (
					<button
						type="button"
						// biome-ignore lint/suspicious/noArrayIndexKey: catalogue statique
						key={i}
						data-testid={`catalogue-card-${i}`}
						aria-pressed={selected.includes(i)}
						onClick={() => toggle(i)}
						style={{
							border: selected.includes(i)
								? "2px solid #2a7"
								: "1px solid #888",
						}}
					>
						<CardView label={sideCardLabel(card)} />
					</button>
				))}
			</div>
			<button
				type="button"
				data-testid="confirm-deck"
				disabled={!complete}
				onClick={() =>
					onConfirm(
						selected
							.map((i) => CATALOGUE[i])
							.filter((c): c is SideCard => c !== undefined),
					)
				}
			>
				Valider
			</button>
		</div>
	);
}
