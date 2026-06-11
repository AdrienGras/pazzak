# Environnement du projet

Carte des paths, conteneurs, services, accès. À jour au fil des découvertes.

À consulter **avant de lancer toute commande non-triviale**.

---

## Repo

- **Path hôte** : `/srv/AdrienGras/pazzak`
- **Branche par défaut** : `main`
- **Convention de merge** : feature branches + conventional commits (`feat(engine): …`, `fix(web): …`). Ne jamais commiter directement sur `main` sans demande.
- **État** : monorepo **pas encore bootstrappé** au 2026-06-11 (aucun `package.json` / `packages/` / `apps/` ; seulement les docs de référence). Phase ROADMAP courante : avant P0.

## Stack d'exécution

- **Runtime** : Node 22 (épinglé via `.nvmrc` + `engines`), gestionnaire **pnpm** (workspaces natifs, pas de Turborepo).
- **Langage** : TypeScript strict partout, ESM (`"type": "module"`).
- **Outillage** : Biome (lint + format, config unique racine), Vitest (unit/intégration), fast-check (property-based, engine only), Playwright (e2e).
- **Comment lancer une commande** : depuis la racine ; cibler un package avec `pnpm --filter <pkg> <cmd>`.

## Commandes principales

```bash
pnpm install                  # racine, workspaces
pnpm lint                     # Biome, tout le repo
pnpm typecheck                # tsc --noEmit, tous les packages
pnpm test                     # Vitest : unit (engine) + intégration (web, game-server)
pnpm --filter engine test     # cibler un package
pnpm dev                      # web + game-server en parallèle (hot reload)
docker compose up --build     # stack prod-like
pnpm e2e                      # Playwright — suppose la stack docker démarrée
```

> Note : ces scripts supposent que la phase P0 (init monorepo) soit faite. À ce stade, ils ne sont pas encore définis dans un `package.json`.

## Services actifs

| Service | Rôle | Accès |
|---|---|---|
| `apps/web` | Front TanStack Start + server functions + SQLite | port front publié (à définir, cf. `.env.example`) |
| `apps/game-server` | Koa boardgame.io + Lobby API + webhook `onEnd` HMAC | port websocket publié (à définir) |
| SQLite | Persistance web (`apps/web/data/pazaak.db`) | fichier local, migrations = script SQL idempotent au boot |

## Variables d'environnement

- `.env` / `.env.example` (commité) — defaults, ports
- `.env.local` (hors git) — secrets et overrides

| Bloc | Variables |
|---|---|
| Secrets settlement | `SETTLEMENT_SECRET` (HMAC web ↔ game-server, jamais committé) |
| Sessions | `SESSION_SECRET` (cookie httpOnly signé) |
| Réseau | ports web + game-server, URL websocket game-server (consommée par le client web) |
