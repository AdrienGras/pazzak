import { create } from "zustand";
import { toggleSelection } from "./solo/selection";

interface DeckBuilderStore {
	selected: number[]; // indices dans standardSideCardCatalogue() (0..17)
	toggle: (i: number) => void;
	reset: () => void;
}

export const useDeckBuilder = create<DeckBuilderStore>((set) => ({
	selected: [],
	toggle: (i) => set((s) => ({ selected: toggleSelection(s.selected, i) })),
	reset: () => set({ selected: [] }),
}));
