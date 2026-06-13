# Environnement du projet

Carte des paths, conteneurs, services, accès. À jour au fil des découvertes.

À consulter **avant de lancer toute commande non-triviale**.

---

## Repo

- **Path hôte** : `/srv/AdrienGras/pazzak`
- **Branche par défaut** : `main`
- **Convention de merge** : feature branches + conventional commits (`feat(engine): …`), **mergées dans `main` en fin de livraison (`--no-ff`, pas de PR)**. Ne jamais commiter directement sur `main`.
- **État** : **P1, P2, P3 livrés.** Monorepo + **moteur Pazaak complet** (`@pazaak/engine`) + **solo client-local jouable** (`apps/web`, P3.2 — TanStack Start + écrans + IA sur client `Local()`). `apps/game-server` et `shared` encore en placeholders. Prochaine phase ROADMAP : **P4 (backend Start : auth/crédits/rooms/leaderboard, SQLite, settlement HMAC)**, parallélisable avec **P5 (game-server Koa)**.

## Toolchain (IMPORTANT)

- **Node 24 LTS** (`lts/krypton`, exact `v24.16.0`) — épinglé via `.nvmrc`. Le **shell de login du host démarre par défaut sur Node 23** : avant toute commande `pnpm`/`node`, faire :
  ```bash
  export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use   # lit .nvmrc -> v24.16.0
  corepack enable                                            # shime pnpm pour ce Node
  ```
- **pnpm 11.5.3** (via corepack, champ `packageManager`). Workspaces natifs, pas de Turborepo.
- **Réglages pnpm** : vivent dans `pnpm-workspace.yaml` (pnpm 11 ne lit plus `.npmrc`/`package.json#pnpm` pour ça) : `saveExact: true`, `allowBuilds` (scripts natifs autorisés), `overrides` (`@types/node` figé 24.x).
- **rtk** (Rust Token Killer) wrappe le shell : `pnpm lint` est **intercepté** par rtk (tente un eslint et échoue). Pour lancer les vrais outils, préfixer `command` : `command pnpm lint`, ou appeler Biome direct `pnpm exec biome check .`. Cf. QUIRKS.

## Commandes principales (depuis la racine, Node 24 actif)

```bash
pnpm install                  # workspaces ; --frozen-lockfile en CI
command pnpm exec biome check .   # lint + format check (bypass rtk)
pnpm format                   # biome format --write (OK via rtk)
command pnpm -r typecheck      # tsc --noEmit sur tous les packages
command pnpm -r test           # Vitest : engine, shared, web, game-server (e2e exclu)
pnpm --filter @pazaak/engine test   # cibler un package
pnpm dev                      # web + game-server en parallèle (placeholders en P1)
docker compose up --build     # stack prod-like (Dockerfiles finalisés en P5)
pnpm e2e                      # Playwright (P7 ; suppose la stack docker démarrée)
```

## Packages (workspaces)

| Package | Nom | Rôle | Deps runtime épinglées |
|---|---|---|---|
| `packages/engine` | `@pazaak/engine` | Noyau règles (P2 ✅, IA→P3) | `boardgame.io` 0.50.2 |
| `packages/shared` | `@pazaak/shared` | Types inter-services | — (zéro dep) |
| `apps/web` | `@pazaak/web` | Front TanStack Start + SQLite ; **solo client-local jouable (P3.2)** | `@tanstack/react-start` 1.168.25, `@tanstack/react-router` 1.170.15, `react` 19.2.7, `zustand` 5.0.14, `better-sqlite3` 12.10.0, `boardgame.io` 0.50.2 ; devDeps `vite` 8.x, `@vitejs/plugin-react` 6.x |
| `apps/game-server` | `@pazaak/game-server` | Server Koa boardgame.io | `boardgame.io` 0.50.2, `koa` 3.2.1 |
| `e2e` | `@pazaak/e2e` | Playwright (P7) | `@playwright/test` 1.60.0 (devDep) |

Outillage : `typescript` 6.0.3, `@biomejs/biome` 2.4.16 (racine), `vitest` 4.1.8, `fast-check` 4.8.0 (engine).

### `packages/engine/src` — modules (P2)

| Fichier | Rôle |
|---|---|
| `types.ts` | Schéma `G`, `SideCard`, `PlayedCard`, `PlayerState` + vues strippées (contrat §3-4) |
| `deck.ts` | `createMainDeck` (40), `standardSideCardCatalogue` (18) |
| `scoring.ts` | `scoreBoard`, `isBust/isTwenty/hasNineCards`, `betterScore`, `setOutcome` (fin de set) |
| `turn.ts` | `drawFromMainDeck`, `refreshScoreAndFlags` (bust/20/9) |
| `moves.ts` | `pickSideDeck`, `playCard`, `endTurn`, `stand` (+ validations) |
| `playerView.ts` | Strip secret state (contrat §4) |
| `game.ts` | `PazaakGame` (Game boardgame.io), `initialState`, phases `pickSideDeck`/`play`, boucle de match |
| `index.ts` | API publique |

Tests : `packages/engine/test/` (13 fichiers, **127 tests**) + `test/support.ts` (harnais Client headless seedé). Invariants fast-check : `invariants.test.ts` (1000 runs). IA pure : `ai.ts` (`chooseMove`/`chooseSideDeck`, P3.1). Non-régression boucle de set : `set-loop-termination.test.ts` (P3.2).

### `apps/web/src` — structure (P3.2)

| Chemin | Rôle |
|---|---|
| `vite.config.ts`, `router.tsx` | Plomberie TanStack Start (plugin `tanstackStart()` + `viteReact()`) ; factory `getRouter` + `routeTree.gen.ts` (généré, gitignoré) |
| `routes/__root.tsx` | App shell (header + `<Outlet/>`) |
| `routes/index.tsx` | Accueil + sélecteur de difficulté (liens `/solo?difficulty=`) |
| `routes/solo.tsx` | Orchestration du match (search param typé, clients, hooks, écran dérivé) |
| `solo/clients.ts` | Factory des 2 clients `Local()` (`debug:false`) |
| `solo/difficulty.ts` | `Difficulty` → `AiParams` (`standThreshold` 19/18/17) |
| `solo/ai-driver.ts` | `aiStep` (pilotage IA pur, Approche A) |
| `solo/screen.ts` | `deriveScreen` (pick/play/gameover) |
| `solo/selection.ts` | `toggleSelection` + `DECK_SIZE` |
| `solo/use-solo-game.ts`, `solo/use-ai-driver.ts` | Hooks de souscription / pilotage |
| `store.ts` | Zustand `useDeckBuilder` (buffer de sélection) |
| `components/` | `CardView`, `PlayerPanel`, `HandView`, `DeckBuilder`, `Board`, `GameOver` (data-testid partout) |

Serveur de dev : `pnpm dev` dans `apps/web` (ou `pnpm dev` racine) → **Vite sur port 3000**. Tests web : `apps/web/test/` (4 fichiers, 11 tests : clients, ai-driver, screen, selection). Pas de tests de composants (UI couverte par e2e P7).

## Services actifs

| Service | Rôle | Accès |
|---|---|---|
| `apps/web` | Front TanStack Start + server functions + SQLite | `WEB_PORT` (défaut 3000) |
| `apps/game-server` | Koa boardgame.io + Lobby API + webhook `onEnd` HMAC | `GAME_SERVER_PORT` (défaut 8000) |
| SQLite | Persistance web (`DATABASE_PATH`, défaut `./data/pazaak.db`) | fichier local, créé/migré au boot (P4) |

## CI / outillage qualité

- **GitHub Actions** `.github/workflows/ci.yml` : job `quality` (install --frozen-lockfile
  → `pnpm check` → `typecheck` → `test:coverage` → upload Codecov) et job `security`
  (`pnpm audit --audit-level=high`). Déclencheurs : push `main` + PR. `permissions:
  contents: read` (top) + `id-token: write` sur `quality` (Codecov OIDC). Actions épinglées
  par tag majeur ; Dependabot (`.github/dependabot.yml`) suit les bumps d'actions.
  Versions actuelles (post-Dependabot 2026-06-13, Node 24) : `checkout@v6`, `setup-node@v6`,
  `pnpm/action-setup@v6`, `codecov-action@v7`. Merger une PR de workflow via `gh` exige le
  scope `workflow` sur le token (cf. QUIRKS).
- **Couverture** : `pnpm test:coverage` (engine, lcov dans `packages/engine/coverage/`),
  upload Codecov via le secret repo `CODECOV_TOKEN` (le tokenless est refusé par Codecov,
  cf. QUIRKS). Badge dans le README. **Seuil dur** (`vitest.config.ts`, `coverage.thresholds`) :
  le job `quality` échoue si la couverture engine passe sous **90%** (lignes/statements/
  functions ; branches non gardées). Pas de `codecov.yml` → checks Codecov en indicatif.
- **Hooks git** : `lefthook.yml` (installé au `pnpm install` via `prepare: lefthook
  install`). `commit-msg` → commitlint (`commitlint.config.js`, gitmoji + conventional) ;
  `pre-commit` → `biome check` sur fichiers stagés.
- **Validation locale** : `act pull_request -j <job> -P ubuntu-latest=catthehacker/ubuntu:act-latest`.
- **À activer côté Settings GitHub** : Dependabot security alerts (npm). ✅ Codecov : repo
  lié + secret `CODECOV_TOKEN` ajouté (2026-06-13) → upload OK, badge peuplé.

## Variables d'environnement

- `.env.example` (commité) — documente les variables, sans valeurs sensibles.
- `.env.local` (hors git) — secrets et overrides. `.env` est gitignoré.

| Bloc | Variables |
|---|---|
| Secrets | `SETTLEMENT_SECRET` (HMAC web ↔ game-server), `SESSION_SECRET` (cookie session) |
| Réseau | `WEB_PORT`, `GAME_SERVER_PORT`, `GAME_SERVER_URL` |
| Données | `DATABASE_PATH` |
