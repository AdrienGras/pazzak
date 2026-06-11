# ROADMAP.md — Pazaak (projet d'entraînement pré-jam)

> Quatrième pilier du kit documentaire, compagnon de `contrat-pazaak.md` (architecture),
> `RULES.md` (règles) et `BOOTSTRAP.md` (standards & outillage).
> Ordonné par **dépendances**, pas par dates. Chaque phase a des **critères de sortie**
> vérifiables : on ne passe pas à la suivante tant qu'ils ne sont pas verts.
> Objectif secondaire explicite : valider la stack et la méthode du kit avant la jam Kessel Sabacc.

---

## Vue d'ensemble

```
P0 Kit documentaire
   └─▶ P1 Bootstrap monorepo
          └─▶ P2 Engine + tests unitaires   ★ cœur du projet
                 ├─▶ P3 Solo client-local
                 └─▶ P4 Backend Start ──┐
                        P5 Game server Koa ──┴─▶ P6 Multi ranked
                                                    └─▶ P7 E2E Playwright
                                                           └─▶ P8 Polish
```

P3 et P4/P5 sont parallélisables après P2. P7 valide l'intégration complète.

---

## P0 — Kit documentaire

**Livrables**
- `RULES.md` Pazaak : structure du match (sets, best of 3), tour de jeu (draw auto, 1 carte de main max, End Turn / Stand), règle des 9 cartes, gestion du tie (set rejoué, non compté ; Tiebreaker), bust, 20 exact = stand auto, composition main deck (40 cartes, 4× chaque valeur +1..+10), side deck (10 cartes choisies → main de 4 tirée au hasard, non reconstituée entre les sets), catalogue des cartes (±1..±6 standard ; gold cards en stretch : Tiebreaker, Double, 1±2, flips 2&4 / 3&6).
- `contrat-pazaak.md` : schéma `G`, moves, phases, server functions, route HMAC, schéma SQLite — version simplifiée du contrat Kessel (1v1 strict, pas de tokens, settlement winner-takes-pot).
- `BOOTSTRAP.md` : repris du Kessel quasi tel quel (renommage du repo).

**Critères de sortie** : zéro `[À VALIDER]` ouvert ; le seul point identifié (comportement exact des flip cards) tranché en jeu sur KOTOR ou repoussé en stretch avec les gold cards.

---

## P1 — Bootstrap monorepo

**Livrables**
- Structure pnpm workspaces : `packages/engine`, `packages/shared`, `apps/web`, `apps/game-server`, `e2e/`.
- `tsconfig.base.json` strict, Biome, Vitest configuré dans chaque package, Playwright installé dans `e2e/`.
- `docker-compose.yml` + `docker-compose.dev.yml` squelettes (services déclarés, images non finalisées).
- Versions structurantes épinglées exactes au premier install (TanStack Start, boardgame.io, better-sqlite3), lockfile committé.

**Critères de sortie** : `pnpm install`, `pnpm lint`, `pnpm test` verts à la racine sur des packages vides (un test placeholder par package). Un agent peut cloner et travailler sans poser de question.

---

## P2 — Engine + tests unitaires ★

Le cœur du projet et l'essentiel de l'effort de test. `engine` est du TypeScript pur,
seule dépendance autorisée : `boardgame.io` (types `Game`, `Ctx`, client local).

**Livrables**
- Types : `Card` (main deck 1–10, side cards ±1..±6 avec déclaration de signe au play), `G` (plateaux par joueur **avec identité des cartes posées**, pas une simple somme — prérequis des flip cards en stretch), scores, sets gagnés, statut stand/bust.
- Phase `pickSideDeck` : sélection simultanée (`activePlayers`) de 10 cartes, tirage de la main de 4 via `ctx.random`, side decks et mains cachés via `playerView`.
- Boucle de set : draw automatique en `onBegin` de tour, moves `playCard` (max 1/tour, signe déclaré pour les ±), `endTurn`, `stand` ; tours non alternés après un stand (l'adversaire continue seul).
- Fins de set : bust, 20 exact (stand auto), 9 cartes (stand auto + victoire), comparaison au double stand, tie → set rejoué non compté.
- Boucle de match : best of 3, main non reconstituée entre sets, `onEnd` avec vainqueur.

**Stratégie de test (Vitest, headless via le client local boardgame.io)**
- Tests par move : chaque validation (carte déjà jouée, 2e carte du tour, move après stand…) a son test de rejet.
- Tests de scénarios : parties complètes scriptées avec `ctx.random` seedé — déterminisme total, pas de mock.
- Tests des invariants par property-based testing (`fast-check`) : jamais plus de 9 cartes en jeu, le score est toujours la somme des cartes posées, la main ne dépasse jamais 4, le main deck reste cohérent (4× chaque valeur consommées au plus).
- Test du `playerView` : l'état strippé ne contient jamais la main ni le side deck adverse.

**Critères de sortie** : partie complète jouable en client local headless ; suite verte ; les invariants tiennent sur ≥ 1000 runs fast-check.

---

## P3 — Solo client-local (parallélisable avec P4/P5)

**Livrables**
- `apps/web` : TanStack Start, écrans pick du side deck, board, fin de set/match.
- IA heuristique dans `engine` (pure, testable) : stand à 18–20, jouer une carte si elle donne 20 ou évite un bust, sinon end turn. Paramétrable (seuil de stand) pour les niveaux de difficulté.
- Mode entraînement gratuit, sans réseau, sans crédits.

**Tests** : l'IA est testée en unit dans `engine` (décisions sur des états donnés) ; l'UI est couverte plus tard par les e2e P7, pas de tests de composants pendant l'entraînement.

**Critères de sortie** : partie solo complète jouable au navigateur contre l'IA.

---

## P4 — Backend Start

**Livrables**
- Server functions : auth (argon2 + session), crédits (recharge à 100), rooms, leaderboard.
- Schéma SQLite (better-sqlite3) : `users`, `rooms`, `room_players`, `leaderboard`.
- Route interne `/api/internal/settlement` : vérification HMAC + idempotence (clé = matchID).

**Stratégie de test (Vitest, intégration)**
- SQLite réel sur fichier temporaire par suite — pas de mock de la base.
- Auth : hash/verify argon2, session, accès refusé sans session.
- Settlement : signature HMAC valide/invalide/absente, rejeu du même matchID = no-op, débit au buy-in et crédit au settlement corrects.

**Critères de sortie** : API testable au script, suite d'intégration verte.

---

## P5 — Game server Koa

**Livrables**
- Server boardgame.io + Lobby API, import du `game object` depuis `engine`.
- Hook `onEnd` → webhook HMAC vers Start.
- Dockerfile ; Lobby API et `/api/internal/*` confinés au réseau Docker.

**Tests (intégration)** : createMatch/join via Lobby API, partie pilotée par deux clients programmatiques jusqu'au `onEnd`, vérification de l'appel webhook (signature, payload, retry simple en cas d'échec).

**Critères de sortie** : un match complet 1v1 piloté par script déclenche un settlement correct côté Start.

---

## P6 — Multi ranked

**Livrables** : wiring de bout en bout — lobby front, création/join de room avec buy-in, partie temps réel websocket, settlement, leaderboard mis à jour.

**Critères de sortie** : deux navigateurs jouent un match ranked complet à la main, les soldes et le leaderboard sont justes.

---

## P7 — E2E Playwright

La validation finale de tout le système, sur le docker-compose prod-like.
Peu de tests, mais les chemins critiques — la pyramide est déjà large en bas (P2)
et au milieu (P4/P5).

**Scénarios**
1. **Auth** : signup → login → session persistante au reload → logout.
2. **Solo** : pick du side deck → partie complète contre l'IA → écran de fin.
3. **Match ranked complet** (le test roi) : deux `browser.newContext()` dans un même test = deux joueurs réels. Création de room avec buy-in, join, pick simultané, match joué jusqu'au bout, vérification des soldes et du leaderboard des deux côtés.
4. **Secret state** : pendant le match du scénario 3, assertion que le DOM du joueur A n'expose jamais la main de B (ni dans le markup ni dans les payloads websocket interceptés via `page.on('websocket')`).
5. **Robustesse** : fermeture d'un context en pleine partie → l'autre joueur voit l'état de déconnexion ; reconnexion = siège conservé (si implémenté, sinon assertion du comportement dégradé documenté au contrat).

**Standards** : sélecteurs par `data-testid` exclusivement (à poser dès P3), pas de `waitForTimeout` — uniquement des assertions sur l'état ; les e2e tournent contre `docker compose up`, pas contre les serveurs de dev.

**Critères de sortie** : les 5 scénarios verts, reproductibles, sur l'environnement conteneurisé.

---

## P8 — Polish & stretch

- Animations de reveal, écran de règles, sons.
- Gold cards (Tiebreaker, Double, 1±2, flips) — possibles uniquement grâce à l'identité des cartes posées prévue en P2.
- Reconnexion soignée.

---

## Bilan attendu vis-à-vis de la jam

À la fin de P7, sont validés pour le Kessel Sabacc : le squelette monorepo, la chaîne
TanStack Start ↔ Koa boardgame.io (websocket, Lobby API, webhook HMAC), le pattern
`pickLoadout`/`playerView`, le flux buy-in → settlement → leaderboard, la stratégie de
test à trois étages (unit engine seedé + fast-check, intégration backend sur SQLite réel,
e2e Playwright multi-context), et la méthode du kit documentaire elle-même. Le jour de
la jam, seul le package `engine` et les écrans changent.
