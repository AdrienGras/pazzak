export const DECK_SIZE = 10;

/**
 * Bascule l'index `i` dans la sélection : retire s'il y est, ajoute sinon (sauf si la
 * sélection est déjà pleine à DECK_SIZE → no-op). La désélection reste toujours possible.
 */
export function toggleSelection(selected: number[], i: number): number[] {
	if (selected.includes(i)) {
		return selected.filter((x) => x !== i);
	}
	if (selected.length >= DECK_SIZE) {
		return selected;
	}
	return [...selected, i];
}
