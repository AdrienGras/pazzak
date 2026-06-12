# CLAUDE.md — Pazaak

Monorepo TypeScript : jeu de Pazaak (KOTOR) avec mode solo contre IA et mode ranked
1v1 multijoueur. Stack : TanStack Start + Koa boardgame.io + SQLite, pnpm workspaces.

---

## Protocole obligatoire avant tout travail

1. **Lire les documents de référence**, dans cet ordre :
   - `docs/contrat-pazaak.md` — architecture, schéma `G`, moves, server functions, SQLite. **Le contrat fait loi.**
   - `docs/RULES.md` — règles du jeu et invariants testables.
   - `docs/BOOTSTRAP.md` — structure du repo, outillage, standards, règles de test.
   - `docs/ROADMAP.md` — phases, dépendances, critères de sortie. Identifier la phase courante avant de coder.

2. **Résoudre la documentation des librairies via Context7** avant d'écrire du code
   qui les utilise. Ne suppose jamais la syntaxe d'une API à partir de tes données
   d'entraînement — elles peuvent être obsolètes. Les versions sont épinglées exactes
   dans `pnpm-lock.yaml` : c'est la version de référence, pas la dernière.

   Librairies à résoudre systématiquement selon le package concerné :
   - `packages/engine` → `boardgame.io` (Game, Ctx, phases, activePlayers, playerView, client local), `fast-check`
   - `packages/shared` → aucune dépendance, pas de consultation nécessaire
   - `apps/web` → `@tanstack/start` (server functions, sessions), `@tanstack/router`, `@tanstack/query`, `zustand`, `better-sqlite3`, `argon2`, client `boardgame.io`
   - `apps/game-server` → `boardgame.io/server` (Server Koa, Lobby API, hooks), `koa`
   - `e2e` → `@playwright/test` (multi-context, interception websocket)

   Workflow : `resolve-library-id` → `query-docs` sur les points précis → seulement ensuite, écrire le code.

3. **Vérifier les critères de sortie** de la phase ROADMAP en cours avant de déclarer
   un chantier terminé.

## Règles absolues

- **Le contrat fait loi.** Toute déviation du schéma `G`, des moves, des signatures de
  server functions ou du schéma SQLite passe par une mise à jour de
  `docs/contrat-pazaak.md` **d'abord**, code ensuite. Idem pour les standards
  (BOOTSTRAP) et les règles du jeu (RULES).
- **La logique de règles vit uniquement dans `packages/engine`.** Interdiction absolue
  de dupliquer du scoring, de la validation de move ou de la logique de set dans
  `apps/web` ou `apps/game-server`. Si tu es tenté de le faire, c'est que l'API
  d'`engine` doit être étendue — mets à jour le contrat.
- **Pureté d'`engine`** : TypeScript pur, seule dépendance runtime `boardgame.io`.
  Aucun réseau, fichier, DOM, horloge. Tout l'aléa passe par `ctx.random` (mélange du
  main deck, tirage de la main de 4, tirage du premier joueur).
- **Secret state** : la main et le side deck adverses, et le contenu du main deck, ne
  doivent jamais atteindre un client. Toute modification de `G` impose de relire
  `playerView.ts` et son test contractuel.
- **`data-testid`** sur tout élément interactif dès sa création.
- **Pas de mock de SQLite** dans les tests d'intégration — base réelle sur fichier
  temporaire. Pas de `waitForTimeout` en e2e.
- Versions épinglées : ne mets **jamais** à jour une dépendance structurante sans
  demande explicite.

## Commandes

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

### Toolchain locale — gotchas (TOUJOURS appliquer)

Appris en P1/P2, détails dans `docs/ENVIRONMENT.md` + `docs/QUIRKS.md` :

- **Node 24 via nvm avant toute commande** (le host démarre par défaut sur Node 23, et
  `pnpm` n'est shimé qu'après `corepack enable`) :
  ```bash
  export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use && corepack enable
  ```
- **`pnpm lint` est intercepté par rtk** (il tente eslint et échoue) → préfixer `command`
  (`command pnpm ...`) ou appeler l'outil direct.
- **`pnpm format` ≠ lint** : il ne fait que la mise en forme. Finir par
  `command pnpm exec biome check .` (lint + tri d'imports) avant de déclarer « terminé ».
- **Réglages pnpm dans `pnpm-workspace.yaml`** (pas `.npmrc`) : `saveExact`, `allowBuilds`
  (build natif), `overrides`. pnpm 11 ne lit plus `.npmrc`/`package.json#pnpm` pour ça.

## Carte des chantiers (contrat §11)

| Package            | Rôle                                                           | Ne touche jamais                                    |
| ------------------ | -------------------------------------------------------------- | --------------------------------------------------- |
| `packages/engine`  | Règles, phases, moves, playerView, IA, tests unit + fast-check | Réseau, DB, DOM                                     |
| `packages/shared`  | Types inter-services (settlement, DTO)                         | Toute logique                                       |
| `apps/web`         | Front + server functions + SQLite + solo client-local          | La logique de règles, le Lobby API depuis le client |
| `apps/game-server` | Server boardgame.io + Lobby + webhook onEnd HMAC               | SQLite                                              |
| `e2e`              | 5 scénarios Playwright (ROADMAP P7)                            | —                                                   |

## Définition de "terminé"

Un chantier n'est terminé que si : `pnpm lint`, `pnpm typecheck` et `pnpm test` sont
verts à la racine ; les critères de sortie de la phase ROADMAP sont satisfaits ; et
aucun document de `docs/` n'est en désaccord avec le code livré.

## Mémoire projet — où chercher quoi

Le projet maintient une base de connaissances opérationnelle sous `docs/`. **En début de session, scanner ces fichiers pour se resituer** :

- **`docs/HANDOFF.md`** — état courant, dernière chose faite, trucs à savoir tout de suite. **À lire en premier.**
- **`docs/INDEX.md`** — catalogue des features livrées avec liens vers spec/plan.
- **`docs/ENVIRONMENT.md`** — paths, services, env vars, accès. À consulter avant de lancer toute commande non-triviale.

À consulter au cas par cas :
- **`docs/QUIRKS.md`** — pièges et comportements non-évidents.
- **`docs/BACKLOG.md`** — idées et améliorations identifiées mais non urgentes.
- **`docs/CONVENTIONS.md`** — skeletons de code et règles tacites.
- **`docs/superpowers/specs/`** — design docs détaillés par feature.
- **`docs/superpowers/plans/`** — plans d'implémentation détaillés par feature.

### À mettre à jour DURANT la session (decision tree — une question = un fichier)

| Tu découvres ou décides… | Fichier |
|---|---|
| Une règle qui s'applique TOUJOURS au projet | `CLAUDE.md` |
| Un squelette de code récurrent | `docs/CONVENTIONS.md` |
| Une feature livrée | ajouter une ligne dans `docs/INDEX.md` + spec/plan dans `docs/superpowers/` si non-trivial |
| Où vit un container, un path, un port, un accès | `docs/ENVIRONMENT.md` |
| Un comportement non-évident, un piège | `docs/QUIRKS.md` (ajouter dès la découverte, pas plus tard) |
| Une idée future / nice-to-have | `docs/BACKLOG.md` |
| L'état mental d'une session significative | `docs/HANDOFF.md` (en fin de session) |

### Règle de fin d'implémentation (NON-NÉGOCIABLE)

À la fin de toute implémentation significative (feature livrée, refactor majeur, bug fix non-trivial, nouvelle commande/script), **avant de signaler la fin du travail**, tu DOIS :

1. **Mettre à jour `docs/INDEX.md`** — ajouter une ligne dans la table correspondante (feature, commande, etc.).
2. **Mettre à jour `docs/HANDOFF.md`** — ajouter une entrée datée en haut (sous le titre H1) avec : `Dernière chose faite`, `Trucs en suspens`, `Prochaine chose à creuser`, `Notes pour future Claude`.
3. **Mettre à jour `docs/QUIRKS.md`** si tu as découvert un piège non-évident pendant l'implémentation.
4. **Mettre à jour `docs/BACKLOG.md`** si tu as identifié des améliorations futures que tu n'as pas implémentées.
5. **Mettre à jour `docs/CONVENTIONS.md`** si tu as introduit un nouveau pattern qui doit être reproduit.
6. **Mettre à jour `docs/ENVIRONMENT.md`** si tu as ajouté/découvert un service, path, port, env var.
7. **Mettre à jour `CLAUDE.md`** si tu as établi une règle qui s'applique toujours au projet.

Ces mises à jour font partie de la définition de "terminé". Une feature livrée sans mise à jour de la mémoire est une feature à moitié livrée.

<!-- rtk-instructions v2 -->
# RTK (Rust Token Killer) - Token-Optimized Commands

## Golden Rule

**Always prefix commands with `rtk`**. If RTK has a dedicated filter, it uses it. If not, it passes through unchanged. This means RTK is always safe to use.

**Important**: Even in command chains with `&&`, use `rtk`:
```bash
# ❌ Wrong
git add . && git commit -m "msg" && git push

# ✅ Correct
rtk git add . && rtk git commit -m "msg" && rtk git push
```

## RTK Commands by Workflow

### Build & Compile (80-90% savings)
```bash
rtk cargo build         # Cargo build output
rtk cargo check         # Cargo check output
rtk cargo clippy        # Clippy warnings grouped by file (80%)
rtk tsc                 # TypeScript errors grouped by file/code (83%)
rtk lint                # ESLint/Biome violations grouped (84%)
rtk prettier --check    # Files needing format only (70%)
rtk next build          # Next.js build with route metrics (87%)
```

### Test (90-99% savings)
```bash
rtk cargo test          # Cargo test failures only (90%)
rtk vitest run          # Vitest failures only (99.5%)
rtk playwright test     # Playwright failures only (94%)
rtk test <cmd>          # Generic test wrapper - failures only
```

### Git (59-80% savings)
```bash
rtk git status          # Compact status
rtk git log             # Compact log (works with all git flags)
rtk git diff            # Compact diff (80%)
rtk git show            # Compact show (80%)
rtk git add             # Ultra-compact confirmations (59%)
rtk git commit          # Ultra-compact confirmations (59%)
rtk git push            # Ultra-compact confirmations
rtk git pull            # Ultra-compact confirmations
rtk git branch          # Compact branch list
rtk git fetch           # Compact fetch
rtk git stash           # Compact stash
rtk git worktree        # Compact worktree
```

Note: Git passthrough works for ALL subcommands, even those not explicitly listed.

### GitHub (26-87% savings)
```bash
rtk gh pr view <num>    # Compact PR view (87%)
rtk gh pr checks        # Compact PR checks (79%)
rtk gh run list         # Compact workflow runs (82%)
rtk gh issue list       # Compact issue list (80%)
rtk gh api              # Compact API responses (26%)
```

### JavaScript/TypeScript Tooling (70-90% savings)
```bash
rtk pnpm list           # Compact dependency tree (70%)
rtk pnpm outdated       # Compact outdated packages (80%)
rtk pnpm install        # Compact install output (90%)
rtk npm run <script>    # Compact npm script output
rtk npx <cmd>           # Compact npx command output
rtk prisma              # Prisma without ASCII art (88%)
```

### Files & Search (60-75% savings)
```bash
rtk ls <path>           # Tree format, compact (65%)
rtk read <file>         # Code reading with filtering (60%)
rtk grep <pattern>      # Search grouped by file (75%)
rtk find <pattern>      # Find grouped by directory (70%)
```

### Analysis & Debug (70-90% savings)
```bash
rtk err <cmd>           # Filter errors only from any command
rtk log <file>          # Deduplicated logs with counts
rtk json <file>         # JSON structure without values
rtk deps                # Dependency overview
rtk env                 # Environment variables compact
rtk summary <cmd>       # Smart summary of command output
rtk diff                # Ultra-compact diffs
```

### Infrastructure (85% savings)
```bash
rtk docker ps           # Compact container list
rtk docker images       # Compact image list
rtk docker logs <c>     # Deduplicated logs
rtk kubectl get         # Compact resource list
rtk kubectl logs        # Deduplicated pod logs
```

### Network (65-70% savings)
```bash
rtk curl <url>          # Compact HTTP responses (70%)
rtk wget <url>          # Compact download output (65%)
```

### Meta Commands
```bash
rtk gain                # View token savings statistics
rtk gain --history      # View command history with savings
rtk discover            # Analyze Claude Code sessions for missed RTK usage
rtk proxy <cmd>         # Run command without filtering (for debugging)
rtk init                # Add RTK instructions to CLAUDE.md
rtk init --global       # Add RTK to ~/.claude/CLAUDE.md
```

## Token Savings Overview

| Category | Commands | Typical Savings |
|----------|----------|-----------------|
| Tests | vitest, playwright, cargo test | 90-99% |
| Build | next, tsc, lint, prettier | 70-87% |
| Git | status, log, diff, add, commit | 59-80% |
| GitHub | gh pr, gh run, gh issue | 26-87% |
| Package Managers | pnpm, npm, npx | 70-90% |
| Files | ls, read, grep, find | 60-75% |
| Infrastructure | docker, kubectl | 85% |
| Network | curl, wget | 65-70% |

Overall average: **60-90% token reduction** on common development operations.
<!-- /rtk-instructions -->