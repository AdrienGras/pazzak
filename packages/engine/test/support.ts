import type { Ctx } from "boardgame.io";
import { Client } from "boardgame.io/client";
import { Local } from "boardgame.io/multiplayer";
import { PazaakGame } from "../src/game";
import type { G, PlayerState } from "../src/types";

/**
 * Vue structurelle minimale d'un client boardgame.io pour les tests headless.
 * Évite d'importer le type interne `_ClientImpl` tout en restant strictement typé.
 */
export interface TestClient {
	moves: Record<string, ((...args: unknown[]) => void) | undefined>;
	events: Record<string, ((...args: unknown[]) => void) | undefined>;
	getState: () => { G: G; ctx: Ctx } | null;
	start: () => void;
	stop: () => void;
}

/** Deux clients en multiplayer local (joueurs '0' et '1') partageant un master seedé. */
export function makeClients(seed = "seed"): { p0: TestClient; p1: TestClient } {
	const spec = {
		game: { ...PazaakGame, seed },
		numPlayers: 2,
		multiplayer: Local(),
	};
	const p0 = Client({ ...spec, playerID: "0" }) as unknown as TestClient;
	const p1 = Client({ ...spec, playerID: "1" }) as unknown as TestClient;
	p0.start();
	p1.start();
	return { p0, p1 };
}

/** Client single-player (pas de playerView) pour inspecter l'état brut. */
export function singleClient(seed = "seed"): TestClient {
	return Client({ game: { ...PazaakGame, seed } }) as unknown as TestClient;
}

/** État courant, narrowé non-null. */
export function getState(client: TestClient): { G: G; ctx: Ctx } {
	const s = client.getState();
	if (!s) {
		throw new Error("client non démarré (getState a renvoyé null)");
	}
	return s;
}

/** État d'un joueur, narrowé non-null. */
export function player(client: TestClient, id: string): PlayerState {
	const p = getState(client).G.players[id];
	if (!p) {
		throw new Error(`joueur « ${id} » absent de l'état`);
	}
	return p;
}

/** Invoque un move par son nom, en échouant clairement s'il est indisponible. */
export function move(
	client: TestClient,
	name: string,
	...args: unknown[]
): void {
	const fn = client.moves[name];
	if (!fn) {
		throw new Error(
			`move « ${name} » indisponible dans la phase/stage courant`,
		);
	}
	fn(...args);
}
