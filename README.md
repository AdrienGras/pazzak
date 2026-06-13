# Pazaak

Jeu de **Pazaak** (KOTOR) — mode **solo contre IA** et mode **ranked 1v1** multijoueur.
Monorepo TypeScript : TanStack Start + Koa boardgame.io + SQLite, pnpm workspaces.

[![CI](https://github.com/AdrienGras/pazzak/actions/workflows/ci.yml/badge.svg)](https://github.com/AdrienGras/pazzak/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/AdrienGras/pazzak/branch/main/graph/badge.svg)](https://codecov.io/gh/AdrienGras/pazzak)
[![License](https://img.shields.io/github/license/AdrienGras/pazzak)](./LICENSE)
![Node](https://img.shields.io/badge/node-24-339933?logo=node.js&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-11-F69220?logo=pnpm&logoColor=white)
![Biome](https://img.shields.io/badge/biome-checked-60A5FA?logo=biome&logoColor=white)
![Gitmoji](https://img.shields.io/badge/gitmoji-%F0%9F%98%9C%20%F0%9F%98%8D-FFDD67)

## Stack

- **`packages/engine`** — noyau de règles pur (boardgame.io), IA, playerView, tests + fast-check.
- **`packages/shared`** — types inter-services.
- **`apps/web`** — TanStack Start (front + server functions + SQLite, solo client-local).
- **`apps/game-server`** — Koa boardgame.io (parties ranked, webhook settlement HMAC).
- **`e2e`** — Playwright (P7).

## Getting started

Node 24 + pnpm via corepack :

```bash
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use && corepack enable
pnpm install
```

## Scripts

| Script | Effet |
|---|---|
| `pnpm check` | Biome : lint + format + tri d'imports |
| `pnpm typecheck` | `tsc --noEmit` sur tous les packages |
| `pnpm test` | Vitest (unit + intégration) |
| `pnpm test:coverage` | Couverture engine (lcov) |
| `pnpm dev` | web + game-server en parallèle |
| `pnpm e2e` | Playwright (suppose la stack docker démarrée) |

## Documentation

La base de connaissances vit dans [`docs/`](./docs) : contrat technique, règles, roadmap,
et la mémoire opérationnelle (`HANDOFF`, `INDEX`, `ENVIRONMENT`, `QUIRKS`).
