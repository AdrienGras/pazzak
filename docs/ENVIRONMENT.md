# Environnement du projet

Carte des paths, conteneurs, services, accès. À jour au fil des découvertes.

À consulter **avant de lancer toute commande non-triviale**.

---

## Repo

- **Path hôte** : `/srv/AdrienGras/pazzak`
- **Branche par défaut** : `main`
- **Convention de merge** : feature branches + conventional commits (`feat(engine): …`), **mergées dans `main` en fin de livraison (`--no-ff`, pas de PR)**. Ne jamais commiter directement sur `main`.
- **État** : monorepo **bootstrappé (P1 fait)**. Structure pnpm workspaces en place, placeholders + tests verts. Prochaine phase ROADMAP : **P2 (engine)**.

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
| `packages/engine` | `@pazaak/engine` | Noyau règles/IA (P2) | `boardgame.io` 0.50.2 |
| `packages/shared` | `@pazaak/shared` | Types inter-services | — (zéro dep) |
| `apps/web` | `@pazaak/web` | Front TanStack Start + SQLite | `@tanstack/react-start` 1.168.25, `react` 19.2.7, `zustand` 5.0.14, `better-sqlite3` 12.10.0, `boardgame.io` 0.50.2 |
| `apps/game-server` | `@pazaak/game-server` | Server Koa boardgame.io | `boardgame.io` 0.50.2, `koa` 3.2.1 |
| `e2e` | `@pazaak/e2e` | Playwright (P7) | `@playwright/test` 1.60.0 (devDep) |

Outillage : `typescript` 6.0.3, `@biomejs/biome` 2.4.16 (racine), `vitest` 4.1.8, `fast-check` 4.8.0 (engine).

## Services actifs

| Service | Rôle | Accès |
|---|---|---|
| `apps/web` | Front TanStack Start + server functions + SQLite | `WEB_PORT` (défaut 3000) |
| `apps/game-server` | Koa boardgame.io + Lobby API + webhook `onEnd` HMAC | `GAME_SERVER_PORT` (défaut 8000) |
| SQLite | Persistance web (`DATABASE_PATH`, défaut `./data/pazaak.db`) | fichier local, créé/migré au boot (P4) |

## Variables d'environnement

- `.env.example` (commité) — documente les variables, sans valeurs sensibles.
- `.env.local` (hors git) — secrets et overrides. `.env` est gitignoré.

| Bloc | Variables |
|---|---|
| Secrets | `SETTLEMENT_SECRET` (HMAC web ↔ game-server), `SESSION_SECRET` (cookie session) |
| Réseau | `WEB_PORT`, `GAME_SERVER_PORT`, `GAME_SERVER_URL` |
| Données | `DATABASE_PATH` |
