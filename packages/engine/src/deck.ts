import type { SideCard, Sign, StandardValue } from "./types";

/**
 * Main deck : 40 cartes, 4 exemplaires de chaque valeur +1..+10 (RULES §2).
 * Non mélangé — le mélange passe par `ctx.random.Shuffle` (pureté engine, contrat §3).
 */
export function createMainDeck(): number[] {
	const deck: number[] = [];
	for (let value = 1; value <= 10; value++) {
		for (let copy = 0; copy < 4; copy++) {
			deck.push(value);
		}
	}
	return deck;
}

const STANDARD_VALUES: readonly StandardValue[] = [1, 2, 3, 4, 5, 6];
const STANDARD_SIGNS: readonly (Sign | "pm")[] = ["+", "-", "pm"];

/**
 * Catalogue des cartes de side deck autorisées en périmètre de base (RULES §3) :
 * +1..+6, -1..-6, ±1..±6 — soit 18 cartes.
 */
export function standardSideCardCatalogue(): SideCard[] {
	const catalogue: SideCard[] = [];
	for (const value of STANDARD_VALUES) {
		for (const sign of STANDARD_SIGNS) {
			catalogue.push({ kind: "standard", value, sign });
		}
	}
	return catalogue;
}
