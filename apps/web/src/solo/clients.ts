import type { G } from "@pazaak/engine";
import { PazaakGame } from "@pazaak/engine";
import { Client } from "boardgame.io/client";
import { Local } from "boardgame.io/multiplayer";

/**
 * Type d'un client vanilla boardgame.io paramétré par le `G` du moteur Pazaak.
 * `_ClientImpl` n'est pas exporté par `boardgame.io/client` ; on le récupère via
 * `ReturnType<typeof Client<G>>`, ce qui type correctement `getState().G`.
 */
export type SoloClient = ReturnType<typeof Client<G>>;

/** Crée les deux clients vanilla du mode solo, connectés au même master Local(). */
export function createSoloClients(matchID: string): {
	human: SoloClient;
	ai: SoloClient;
} {
	const multiplayer = Local();
	const common = {
		game: PazaakGame,
		numPlayers: 2,
		matchID,
		multiplayer,
	} as const;
	return {
		human: Client({ ...common, playerID: "0" }),
		ai: Client({ ...common, playerID: "1" }),
	};
}
