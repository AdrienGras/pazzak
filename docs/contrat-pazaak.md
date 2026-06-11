# Contrat technique — Pazaak (projet d'entraînement)

> Document de référence pour tous les chantiers, compagnon de `RULES.md`, `BOOTSTRAP.md`
> et `ROADMAP.md`. **Aucun agent ne dévie de ce contrat sans mise à jour explicite du
> document.** Hérite des décisions du contrat Kessel Sabacc — les différences sont
> signalées par `[≠ Kessel]`.

---

## 1. Architecture

```
[Client React]
   │ server functions (RPC typé)        │ websocket + credentials
   ▼                                    ▼
[TanStack Start / Nitro] ──REST──▶ [Koa boardgame.io]
   │  SQLite (better-sqlite3)      ◀──webhook onEnd (HMAC)──
   ▼
users / rooms / room_players / leaderboard / settlements
```

- **TanStack Start** (1 process Nitro) : front React + server functions (auth, crédits,
  rooms, leaderboard) + SQLite.
- **Serveur boardgame.io** (1 process Koa) : moteur de jeu, parties temps réel, secret state.
- **Solo / entraînement** : client-local boardgame.io, gratuit, IA heuristique (dans
  `engine`). Ne touche ni le Koa, ni les crédits, ni le leaderboard.
- **Multi / ranked** : `[≠ Kessel]` **1v1 strict**. Flux buy-in → match → settlement
  winner-takes-pot.
- Conteneurisation : 2 images, docker-compose, réseau interne. Seuls le front et le
  websocket Koa sont exposés. `/api/internal/*` et le Lobby API ne sortent **jamais**
  du réseau Docker.

## 2. Périmètre

**Base**
- Moteur Pazaak complet, cartes standard (±1..±6) uniquement
- Phase de pick du side deck (10 cartes), main de 4 tirée par le serveur, **cachée**
- Solo client-local contre IA heuristique paramétrable
- Ranked 1v1 : buy-in, settlement, leaderboard
- Lobby, auth (argon2 + session), crédits avec recharge à 100, guide des règles

**Stretch**
- Gold cards (Tiebreaker, Double, 1±2, flips 2&4 / 3&6)
- Reconnexion soignée (siège conservé par défaut)
- Collection de cartes / déblocage (hors scope entraînement, noté pour mémoire)

`[≠ Kessel]` Pas de shift tokens, pas de loadout-toggle par room, pas d'élimination par
jetons : l'économie est au niveau du match (buy-in/pot), pas de la manche.

## 3. Schéma `G` (état boardgame.io)

```typescript
type PlayerID = string; // '0' | '1'

type Sign = '+' | '-';

type SideCard =
  | { kind: 'standard'; value: 1|2|3|4|5|6; sign: Sign | 'pm' } // 'pm' = ±, signe déclaré au play
  // stretch :
  | { kind: 'tiebreaker' }   // ±1T
  | { kind: 'double' }       // D
  | { kind: 'oneTwo' }       // 1±2
  | { kind: 'flip'; targets: [2, 4] | [3, 6] };

type PlayedCard =
  | { source: 'main'; value: number; flipped: boolean }   // flipped : préparé pour le stretch
  | { source: 'hand'; card: SideCard; resolvedValue: number };

interface PlayerState {
  sideDeck: SideCard[] | null;   // les 10 choisies ; null tant que non pické ; SECRET
  hand: SideCard[];              // ≤ 4, consommée sur tout le match ; SECRET
  board: PlayedCard[];           // ≤ 9 ; public
  score: number;                 // dérivé du board, stocké pour l'UI ; public
  standing: boolean;
  busted: boolean;
  setsWon: number;               // sets sur égalité non comptés
  playedHandCardThisTurn: boolean;
  playedTiebreakerThisSet: boolean; // stretch
}

interface G {
  players: Record<PlayerID, PlayerState>;
  mainDeck: number[];            // SECRET — strippé intégralement en playerView
  currentSet: number;            // 1-indexé, inclut les sets rejoués
  setStarter: PlayerID;          // tirage au set 1, alternance ensuite
  matchWinner: PlayerID | null;
}
```

`mainDeck` est mélangé via `ctx.random.Shuffle` au début de chaque set — déterminisme
par seed pour les tests, source d'aléa serveur en multi (le client ne tire jamais).

## 4. `playerView`

Pour le joueur `p`, l'état livré au client :
- `players[p]` : intégral.
- `players[adversaire]` : `sideDeck → null`, `hand → { count: number }` (longueur seule),
  le reste (board, score, standing, busted, setsWon) intégral.
- `mainDeck → { remaining: number }`.

Test contractuel : aucune valeur de carte de main ou de deck adverse ne doit être
présente dans l'objet sérialisé (assertion structurelle, puis e2e scénario 4).

## 5. Phases et moves

**Phase `pickSideDeck`** — `activePlayers: { all: 'pick' }`, simultanée.
- `pickSideDeck(cards: SideCard[])` : exactement 10 cartes du catalogue autorisé par la
  config de room. Le serveur tire la main de 4 (`ctx.random`). `endIf` : les deux side
  decks posés. `onEnd` : tirage du premier joueur (carte du main deck, la plus haute
  commence ; égalité → retirage).

**Phase `play`** — boucle de sets.
- `onBegin` de tour : si le joueur courant est `standing` ou `busted`, son tour est
  sauté (ordre de tour custom). Sinon : pioche automatique du main deck → `board`,
  recalcul du score, détection bust / 20 exact / 9 cartes.
- `playCard(handIndex: number, declaration?: { sign: Sign; value?: 1|2 })` :
  rejets — index invalide, `playedHandCardThisTurn`, joueur standing/busted,
  déclaration manquante pour ± et 1±2, déclaration fournie pour une carte à signe fixe.
- `endTurn()` : clôt le tour.
- `stand()` : fige le joueur, clôt le tour.
- Fin de set (`endIf` de la boucle interne) : cf. RULES §5. Tie sans Tiebreaker →
  set rejoué : plateaux vidés, deck remélangé, `currentSet++`, aucun `setsWon` modifié.
- Fin de match : `setsWon === 3` → `matchWinner`, `ctx.events.endGame({ winner })`.

## 6. IA heuristique (solo, dans `engine`)

Fonction pure `(view: PlayerViewState, params: AiParams) => Move`.
- Stand si score ∈ [standThreshold, 20] (défaut 18).
- Jouer une carte de main si elle amène à 20 exact, ou si elle évite un bust en
  ramenant ≤ 20 ; choisir la carte qui maximise le score résultant ≤ 20.
- Sinon end turn.
- `AiParams = { standThreshold: 17|18|19 }` = niveaux de difficulté.

## 7. Server functions (TanStack Start)

```typescript
signup(username, password)            → { user }            // argon2id
login(username, password)             → { user }            // session cookie httpOnly
logout()                              → void
getMe()                               → { user, credits }
rechargeCredits()                     → { credits }         // remet à 100 si < 100
createRoom({ name, buyIn })           → { room }            // débit buy-in, createMatch via Lobby API (réseau interne)
joinRoom(roomId)                      → { room, credentials } // débit buy-in, join Lobby API
listRooms()                           → Room[]
getLeaderboard()                      → LeaderboardEntry[]
```

Toutes les fonctions sauf signup/login exigent une session valide (guard commun).
Le client ne parle **jamais** au Lobby API directement — uniquement via ces fonctions.

## 8. Route interne settlement

`POST /api/internal/settlement` — appelée par le hook `onEnd` du Koa.

- Headers : `X-Signature: hex(hmacSHA256(body, SETTLEMENT_SECRET))`.
- Body : `{ matchID, roomId, winnerUserId, loserUserId, pot }`.
- Idempotence : `INSERT INTO settlements(match_id)` en première instruction de la
  transaction ; violation d'unicité → 200 no-op.
- Effets (une transaction) : crédit du pot au vainqueur, mise à jour leaderboard
  (wins/losses/credits_won), room → `status = 'finished'`.
- Signature invalide ou absente → 401, aucun effet. Retry côté Koa : 3 tentatives,
  backoff simple, puis log d'erreur (réconciliation manuelle acceptable en entraînement).

## 9. Schéma SQLite

```sql
CREATE TABLE users (
  id            INTEGER PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  credits       INTEGER NOT NULL DEFAULT 100,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE rooms (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  buy_in      INTEGER NOT NULL CHECK (buy_in > 0),
  status      TEXT NOT NULL DEFAULT 'open'
              CHECK (status IN ('open','playing','finished','abandoned')),
  match_id    TEXT UNIQUE,            -- ID boardgame.io
  created_by  INTEGER NOT NULL REFERENCES users(id),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE room_players (
  room_id INTEGER NOT NULL REFERENCES rooms(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  seat    INTEGER NOT NULL CHECK (seat IN (0,1)),   -- [≠ Kessel] 1v1
  PRIMARY KEY (room_id, seat),
  UNIQUE (room_id, user_id)
);

CREATE TABLE leaderboard (
  user_id     INTEGER PRIMARY KEY REFERENCES users(id),
  wins        INTEGER NOT NULL DEFAULT 0,
  losses      INTEGER NOT NULL DEFAULT 0,
  credits_won INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE settlements (
  match_id     TEXT PRIMARY KEY,       -- idempotence
  processed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

## 10. Cas dégradés

- Déconnexion en partie : le siège est conservé (boardgame.io credentials) ; pas de
  forfeit automatique en base — stretch.
- Room `open` jamais remplie : bouton « annuler » du créateur → remboursement du buy-in,
  `status = 'abandoned'`.
- Crash du Koa en cours de match : la room reste `playing` ; réconciliation manuelle
  (acceptable pour l'entraînement, à durcir pour la jam).

## 11. Découpage des chantiers

| Chantier | Périmètre | Référence | Livrable |
|---|---|---|---|
| **Moteur** | `engine` : G, phases, moves, playerView, IA, tests unit + fast-check | §3–6 + RULES.md | Match jouable en client local headless, suite verte |
| **Backend Start** | server functions, settlement HMAC, SQLite, guard auth | §7–9 | API testable au script |
| **Serveur Koa** | Server + Lobby, hook onEnd → webhook, Dockerfile | §8 + moteur (interface G/moves) | Match scripté → settlement correct |
| **Front** | login, lobby, pick, board, fin de match, leaderboard, guide | tous les contrats | Solo jouable, puis ranked branché |

Règles de cohabitation identiques au Kessel : `engine` importé par `web` (solo) et
`game-server` (multi), **interdiction** de dupliquer la logique de règles. Tout
changement de contrat = mise à jour de ce document d'abord.

## 12. Stack & versions

Vite + React, TanStack Start (figer la version exacte au premier install), TanStack
Router/Query, Zustand, boardgame.io, better-sqlite3, argon2, fast-check (dev, engine).
Node 24 LTS / `lts/krypton` (`node:24-slim`, build natif better-sqlite3 sur la même base).

---

*Document vivant — version du 11 juin 2026. `[À VALIDER]` restants : 1 (flip cards, cf. RULES §3), en stretch donc non bloquant.*
