import { useEffect, useState } from "react";
import type { SoloClient } from "./clients";

/** État courant exposé par un client vanilla (getState()). */
export type SoloState = ReturnType<SoloClient["getState"]>;

/** Souscrit au client humain et renvoie son état courant (re-render à chaque changement). */
export function useSoloGame(client: SoloClient): SoloState {
	const [state, setState] = useState<SoloState>(() => client.getState());
	useEffect(() => {
		setState(client.getState());
		const unsubscribe = client.subscribe(() => setState(client.getState()));
		return unsubscribe;
	}, [client]);
	return state;
}
