import type { AiParams } from "@pazaak/engine";
import { useEffect } from "react";
import { aiStep } from "./ai-driver";
import type { SoloClient } from "./clients";

/** Branche le pilotage IA sur le client du siège '1' pour toute la durée du match. */
export function useAiDriver(client: SoloClient, params: AiParams): void {
	useEffect(() => {
		let acting = false;
		const pump = () => {
			if (acting) {
				return;
			}
			acting = true;
			queueMicrotask(() => {
				acting = false;
				aiStep(client.getState(), client.moves, params);
			});
		};
		const unsubscribe = client.subscribe(pump);
		pump(); // amorce le pick initial de l'IA
		return unsubscribe;
	}, [client, params]);
}
