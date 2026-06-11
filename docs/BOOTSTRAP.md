# BOOTSTRAP.md — Monorepo Pazaak

> Document compagnon de `contrat-pazaak.md` (architecture), `RULES.md` (règles) et
> `ROADMAP.md` (ordre d'implémentation). Repris du bootstrap Kessel Sabacc — c'est
> volontaire : valider ces standards fait partie de l'entraînement.
> Objectif : qu'un agent (ou un humain) puisse initialiser et naviguer le repo sans
> poser de question. Toute dérogation aux standards = mise à jour de ce document d'abord.

---

## 1. Vue d'ensemble

```
pazaak/
├── package.json                  # racine : scripts d'orchestration uniquement, private
├── pnpm-workspace.yaml
├── tsconfig.base.json            # strict, partagé par tous les packages
├── biome.json                    # lint + format (un seul outil)
├── docker-compose.yml            # prod-like : web + game-server
├── docker-compose.dev.yml        # volumes montés, hot reload
├── .env.example                  # SETTLEMENT_SECRET, SESSION_SECRET, ports
├── docs/
│   ├── contrat-pazaak.md
│   ├── RULES.md
│   ├── ROADMAP.md
│   └── BOOTSTRAP.md              # ce fichier
├── packages/
│   ├── engine/                   # ★ le noyau partagé (règles, IA, playerView)
│   └── shared/                   # types de contrats inter-services (payloads settlement, DTO rooms)
├── apps/
│   ├── web/                      # TanStack Start (front + server functions + SQLite)
│   └── game-server/              # Koa boardgame.io
└── e2e/                          # Playwright (hors workspaces applicatifs)
```

**Outillage** : Node 24 LTS (`lts/krypton`, fixé via `.nvmrc` + `engines`), **pnpm**
(workspaces natifs, pas de Turborepo — 4 packages ne justifient pas un orchestrateur de
build), **TypeScript strict partout**, **Biome** (lint + format, config unique à la
racine), **Vitest** (unit/intégration), **fast-check** (property-based, engine
uniquement), **Playwright** (e2e).

## 2. Initialisation

```bash
mkdir pazaak && cd pazaak && git init
corepack enable && corepack use pnpm@latest
node -v > .nvmrc            # doit afficher v24.x (lts/krypton)
pnpm init                   # puis "private": true dans package.json
```

`pnpm-workspace.yaml` :

```yaml
packages:
  - "packages/*"
  - "apps/*"
  - "e2e"
```

`tsconfig.base.json` :

```jsonc
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

Chaque package étend cette base. ESM partout (`"type": "module"`).

**Règle de versions** : au premier `pnpm install` de chaque dépendance structurante
(TanStack Start, boardgame.io, better-sqlite3), la version est **épinglée exacte**
(pas de `^`) et ne bouge plus pendant le projet. Un seul `pnpm-lock.yaml`, committé.

## 3. `packages/engine` — le noyau

**Contrainte de pureté (la règle la plus importante du repo)** : `engine` est du
TypeScript pur. Dépendances autorisées : `boardgame.io` (types `Game`, `Ctx`, client
local) **uniquement** ; `fast-check` en devDependency. Aucun accès réseau, fichier,
DOM, ni horloge système. Tout l'aléa passe par `ctx.random`.

Structure indicative :

```
packages/engine/src/
├── index.ts            # exporte PazaakGame, types, ai
├── types.ts            # SideCard, PlayedCard, PlayerState, G
├── deck.ts             # composition main deck, catalogue side cards
├── scoring.ts          # somme du board, détection bust/20/9 cartes, comparaison
├── moves.ts            # pickSideDeck, playCard, endTurn, stand + validations
├── phases.ts           # pickSideDeck, play, gestion sets/tie/match
├── playerView.ts       # stripping (contrat §4)
└── ai.ts               # heuristique pure paramétrable
```

Tests dans `packages/engine/test/` : un fichier par module + `scenarios.test.ts`
(parties complètes seedées) + `invariants.test.ts` (fast-check, RULES §7).

## 4. `packages/shared`

Types partagés entre `web` et `game-server` qui ne relèvent pas des règles du jeu :
payload et signature du settlement, DTO rooms/leaderboard, constantes (recharge à 100).
Zéro logique, zéro dépendance.

## 5. `apps/web` — TanStack Start

- Server functions du contrat §7, SQLite via better-sqlite3 (fichier `data/pazaak.db`,
  migrations = un script SQL idempotent exécuté au boot).
- Sessions : cookie httpOnly signé (`SESSION_SECRET`).
- Solo : client local boardgame.io important `engine` directement — aucun réseau.
- Multi : client boardgame.io websocket vers `game-server` (URL via env).
- **`data-testid` obligatoire** sur tout élément interactif dès sa création (consommés
  par les e2e, cf. ROADMAP P7).

## 6. `apps/game-server` — Koa boardgame.io

- `Server({ games: [PazaakGame], origins })` + Lobby API.
- Hook `onEnd` → POST signé HMAC vers `web` (`/api/internal/settlement`), 3 retries.
- N'importe `engine` et `shared` ; ne touche jamais SQLite.

## 7. Docker

- 2 Dockerfiles (`apps/web`, `apps/game-server`), base `node:24-slim`, build pnpm
  avec `--filter` depuis la racine.
- `docker-compose.yml` : réseau interne `pazaak-net` ; seuls les ports du front et du
  websocket sont publiés. `SETTLEMENT_SECRET` partagé via env, jamais committé.
- `docker-compose.dev.yml` : volumes montés + hot reload, mêmes variables.

## 8. Tests — règles transverses

- **Pyramide** : large en unit (engine), moyenne en intégration (web : SQLite réel sur
  fichier temporaire, jamais de mock de la base ; game-server : Lobby API réelle),
  étroite en e2e (5 scénarios de ROADMAP P7).
- Pas de `waitForTimeout` en e2e — uniquement des assertions sur l'état.
- Les e2e tournent contre `docker compose up`, pas contre les serveurs de dev.
- `pnpm test` à la racine = unit + intégration ; `pnpm e2e` = Playwright (suppose la
  stack docker démarrée).
- CI minimale (optionnelle pour l'entraînement) : lint + typecheck + test sur push.

## 9. Conventions

- Commits : conventional commits (`feat(engine): ...`, `fix(web): ...`).
- Nommage : kebab-case fichiers, PascalCase types/composants, camelCase fonctions.
- Pas de `any` ; les unions discriminées (`SideCard`, `PlayedCard`) sont fermées —
  tout `switch` est exhaustif (`satisfies never` sur le default).
- Doc : tout choix non évident est commenté avec un renvoi au § du contrat ou de RULES.
