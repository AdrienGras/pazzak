# Handoff — état courant du projet

Notes informelles à destination de la prochaine session (humaine ou Claude). Format libre, chronologique inverse (le plus récent en haut).

**À mettre à jour à la fin d'une session significative**. Pas besoin de noter chaque petit truc — l'idée est de te resituer en 30 secondes en début de session.

---

## 2026-06-11 — P1 Bootstrap monorepo livré

### Dernière chose faite
- **P1 complet** sur la branche `feat/p1-bootstrap-monorepo` : pnpm workspaces (`@pazaak/engine`, `@pazaak/shared`, `@pazaak/web`, `@pazaak/game-server`, `@pazaak/e2e`), `tsconfig.base.json` strict, Biome (lint+format), Vitest par package + placeholder test, Playwright dans `e2e`, `docker-compose.yml` + `.dev.yml` squelettes, `.env.example`, `.gitignore`.
- **Critères de sortie verts** : `pnpm install --frozen-lockfile`, `biome check`, `pnpm -r typecheck`, `pnpm -r test` (4 packages, e2e exclu) tous RC=0.
- Décisions de session : **Node 24 LTS** (était 22 au contrat — docs mises à jour), **pnpm 11.5.3** (bump depuis 10.28.1), **tout Biome** (oxlint envisagé puis abandonné). Docs de référence déplacées dans `docs/`.

### Trucs en suspens
- **Toolchain** : Node 24 via nvm obligatoire (host par défaut Node 23). `pnpm lint` doit passer par `command pnpm` (rtk l'intercepte). Voir `QUIRKS.md` + `ENVIRONMENT.md`.
- **argon2** non installé (P4), **Playwright browsers** non installés (P7), **TanStack Start** épinglé mais non câblé (P3). Voir `BACKLOG.md`.
- Pas encore de PR ouverte au moment d'écrire (commit P1 à faire sur la branche).

### Prochaine chose à creuser
- **P2 — Engine** (★ cœur) : types `G`, phase `pickSideDeck`, boucle de set/match, moves, `playerView`, IA, tests Vitest + fast-check (≥1000 runs). Résoudre `boardgame.io` via Context7 **avant** de coder.

### Notes pour future Claude
- Avant toute commande : `export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use && corepack enable`.
- Réglages pnpm dans `pnpm-workspace.yaml` (`saveExact`, `allowBuilds`, `overrides`), pas `.npmrc`.
- Le contrat fait loi ; pureté d'`engine` (TS pur + `boardgame.io`, aléa via `ctx.random`).

---

## 2026-06-11 — Init mémoire projet

### Dernière chose faite
- Bootstrap du système de mémoire persistante sous `docs/` (HANDOFF, INDEX, ENVIRONMENT, QUIRKS, BACKLOG, CONVENTIONS + `superpowers/{specs,plans}`).
- Bloc « Mémoire projet » ajouté à `CLAUDE.md` (decision tree + règle de fin d'implémentation).
- Hook `SessionStart` (`.claude/hooks/load-memory.sh`) qui injecte les têtes de `HANDOFF.md` et `INDEX.md` dans le contexte.

### Trucs en suspens
- **Le repo n'est pas encore bootstrappé** : il n'y a aucun `package.json`, ni `packages/`, ni `apps/`. Seuls les docs de référence existent. On est avant la phase P0 de la ROADMAP.
- **Incohérence de paths** : `CLAUDE.md` référence `docs/contrat-pazaak.md`, `docs/RULES.md`, etc., mais ces fichiers sont à la **racine** (`contrat-pazaak.md`, `RULES-pazaak.md`, `BOOTSTRAP-pazaak.md`, `ROADMAP-pazaak.md`). Voir `QUIRKS.md`.

### Prochaine chose à creuser
- Démarrer la phase P0 (init monorepo) : `pnpm init`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `biome.json` — cf. `BOOTSTRAP-pazaak.md §2`.
- Décider : déplacer les docs de référence dans `docs/` (pour coller à `CLAUDE.md`) ou corriger les chemins dans `CLAUDE.md`.

### Notes pour future Claude
- Le contrat fait loi (`contrat-pazaak.md`). Toute déviation du schéma `G`, des moves ou du schéma SQLite passe par une mise à jour du contrat **d'abord**.
- Pureté d'`engine` : TS pur, seule dépendance runtime `boardgame.io`, tout l'aléa via `ctx.random`.
- Résoudre la doc des librairies via Context7 avant d'écrire du code (versions épinglées dans `pnpm-lock.yaml`).
