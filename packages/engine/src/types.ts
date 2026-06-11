// Schéma de l'état du jeu — contrat §3. Source de vérité : docs/contrat-pazaak.md.

export type PlayerID = string; // '0' | '1'

export type Sign = "+" | "-";

export type StandardValue = 1 | 2 | 3 | 4 | 5 | 6;

export type SideCard =
	| { kind: "standard"; value: StandardValue; sign: Sign | "pm" } // 'pm' = ±, signe déclaré au play
	// Stretch (P8) — typés dès P2 (identité des cartes posées), non jouables en P2 :
	| { kind: "tiebreaker" } // ±1T
	| { kind: "double" } // D
	| { kind: "oneTwo" } // 1±2
	| { kind: "flip"; targets: [2, 4] | [3, 6] };

export type PlayedCard =
	| { source: "main"; value: number; flipped: boolean } // flipped : préparé pour le stretch
	| { source: "hand"; card: SideCard; resolvedValue: number };

export interface PlayerState {
	sideDeck: SideCard[] | null; // les 10 choisies ; null tant que non pické ; SECRET
	hand: SideCard[]; // ≤ 4, consommée sur tout le match ; SECRET
	board: PlayedCard[]; // ≤ 9 ; public
	score: number; // dérivé du board, stocké pour l'UI ; public
	standing: boolean;
	busted: boolean;
	setsWon: number; // sets sur égalité non comptés
	playedHandCardThisTurn: boolean;
	playedTiebreakerThisSet: boolean; // stretch
}

export interface G {
	players: Record<PlayerID, PlayerState>;
	mainDeck: number[]; // SECRET — strippé intégralement en playerView
	currentSet: number; // 1-indexé, inclut les sets rejoués
	setStarter: PlayerID; // tirage au set 1, alternance ensuite
	matchWinner: PlayerID | null;
}
