# Handoff — état courant du projet

Notes informelles à destination de la prochaine session (humaine ou Claude). Format libre, chronologique inverse (le plus récent en haut).

**À mettre à jour à la fin d'une session significative**. Pas besoin de noter chaque petit truc — l'idée est de te resituer en 30 secondes en début de session.

---

## 2026-06-13 — P3.2 Task 3 : driver IA `aiStep` + test intégration deux sièges ★

### Dernière chose faite
- `apps/web/src/solo/ai-driver.ts` : `aiStep(state, moves, params): boolean` (≤1 coup
  par appel, no-op si état null ou `isActive===false`). Délègue à `chooseMove`/`chooseSideDeck`
  de l'engine. **Identification du siège local** via le discriminant « `hand` est un Array »
  (PlayerState complet) vs `{count}` (OpponentView) — plus robuste que `ctx.currentPlayer`,
  peu fiable pendant le stage simultané `pickSideDeck` `{ all: 'pick' }`. `any`-free
  (type guard `p is PlayerState`, args `unknown[]`).
- `apps/web/test/ai-driver.test.ts` : test headless IA-vs-IA jusqu'à `matchWinner`.
  **PASSE** : winner `'1'`, 3 sets gagnés, ~30 dispatches `aiStep`, partie sur 4 sets.
- Commit `7113fcf` sur `feat/p3.2-web-solo`. Typecheck + biome verts.

### Trucs à savoir tout de suite
- Le test reposait sur un **bug moteur** (auto-stand en pioche `onBegin` ne terminait pas
  le tour) que ce chantier a débusqué → corrigé en amont (commit `90c23a8`, `game.ts`,
  `events.endTurn()` depuis `onBegin`). Engine vert (127 tests). Détail dans QUIRKS.

### Prochaine chose à creuser
- Suite P3.2 : brancher `aiStep` dans le composant solo (loop UI côté client), câbler le
  mapping difficulté (`solo/difficulty.ts`) → `standThreshold`.

### Notes pour future Claude
- `boardgame.io/client` n'exporte pas `ClientState` → `aiStep` type un sous-ensemble
  minimal maison (`PlayerState | OpponentView`), pas d'import du type interne.

---

## 2026-06-13 — Outillage CI livré + opérationnel ★

### Dernière chose faite
- CI GitHub Actions (`ci.yml`) **mergée dans `main`, poussée, verte**. Jobs `quality`
  (`check` → `typecheck` → `test:coverage` → Codecov ; permissions least-privilege) et
  `security` (`pnpm audit --audit-level=high`). Workflow validé en local via `act`.
- Couverture vitest v8 (engine, lcov). Hooks lefthook (commit-msg → commitlint gitmoji ;
  pre-commit → biome). README + 7 badges. Règle post-push dans `CLAUDE.md`.
- **Vulns high boardgame.io patchées** via `pnpm overrides` (`ws ≥7.5.10`,
  `socket.io-parser ≥4.2.6`, `@koa/cors ≥5.0` — majeure 4→5, à valider en P5/P6) → job
  `security` vert.
- **Dependabot (actions) traité** : PR de bump mergées → `checkout@v6`, `setup-node@v6`,
  `pnpm/action-setup@v6`, `codecov-action@v7` (résout la dépréciation Node 20 du 16/06).
- **Codecov opérationnel** : le tokenless est refusé → secret `CODECOV_TOKEN` ajouté +
  `token:` sur le step → upload OK, badge peuplé (~84%).
- **Seuil de couverture 90%** (lignes/stmts/funcs) dans `vitest.config.ts` → le job
  `quality` échoue sous 90% (branches non gardées, ~89%). Prouvé non-no-op.

### Trucs en suspens
- **Bloc P3.2 (web)** non commencé — prochain chantier (critère de sortie P3).
- Override `@koa/cors` 5.x (majeure) à **valider quand le game-server tournera (P5/P6)**.
- e2e en CI → P7 (workflow séparé contre `docker compose`). Activer aussi les Dependabot
  security alerts npm côté Settings GitHub.

### Prochaine chose à creuser
- **P3.2 (web)** : brainstorming → wiring TanStack Start + écrans pick/board/fin + IA sur
  client `Local()`. La CI (dont la garde 90%) tourne déjà dessus.

### Notes pour future Claude
- **Merger une PR qui touche `.github/workflows/` via `gh`** exige le scope `workflow`
  (`gh auth refresh -h github.com -s workflow`) — déjà accordé. Le push git SSH n'est PAS
  concerné (éditer `ci.yml` localement + push ferme la PR Dependabot). Cf. QUIRKS.
- **Badge Codecov "unknown"** = aucune donnée ingérée (souvent token manquant) ; vérifier
  le log du step (`Token length: 0` / "Token required"). Cf. QUIRKS.
- `act pull_request -j <job> -P ubuntu-latest=catthehacker/ubuntu:act-latest` pour rejouer
  un job en local (image déjà pull). `act` n'a pas le token Codecov (upload échoue, mais
  `fail_ci_if_error: false`).
- `pnpm audit` exit 1 si ≥1 vuln au niveau demandé ; les vulns boardgame.io vivent dans
  `boardgame.io > koa-socket-2 > socket.io > {engine.io > ws | socket.io-parser}` + `@koa/cors`.

---

## 2026-06-12 — P3.1 Moteur bust-recovery + IA livré ★

### Dernière chose faite
- Corrigé le moteur : le bust n'est plus verrouillé à la pioche forcée. Un joueur > 20
  (board < 9) reste actif et peut jouer une carte de side deck pour revenir ≤ 20 ; le
  bust est finalisé par `endTurn`/`stand` (RULES §5 mis à jour d'abord).
  `refreshScoreAndFlags`, `endTurn`, `stand` modifiés ; tests `turn.test.ts`,
  `end-turn-stand.test.ts` ajoutés ; `play-card.test.ts` mis à jour.
- Livré l'IA heuristique pure (`ai.ts`) : `chooseMove(self, params)` (contrat §6) +
  `chooseSideDeck()`. Exportées par `index.ts`. `ai.test.ts` couvre stand / jeu vers 20 /
  rescousse / bust forcé / déterminisme du signe ±.

### Trucs en suspens
- **Bloc P3.2 (web)** non commencé : wiring TanStack Start + écrans pick/board/fin,
  client local boardgame.io branché sur l'IA. C'est lui qui satisfait le critère de
  sortie P3 « partie solo complète au navigateur ». Spec à écrire (brainstorming).
- Gold cards toujours P8 ; l'IA ne joue que des cartes standard.

### Prochaine chose à creuser
- P3.2 : résoudre `@tanstack/react-start` + client `boardgame.io` via Context7 avant le
  front. Décider comment l'IA pilote ses tours dans un client `Local()` (driver manuel
  qui dispatch `chooseMove`, vs bot natif boardgame.io).

### Notes pour future Claude
- L'IA est totalement découplée du runtime boardgame.io : pure `(PlayerState, AiParams)
  => AiMove`. Le web devra lire l'état de l'IA (son `PlayerState` complet, vu de son
  propre client) et dispatcher l'`AiMove` sur le client.
- `AiMove` est **uniforme** (`args` toujours présent, `[]` pour stand/endTurn) → dispatch
  générique sans cas particulier : `client.moves[m.move](...m.args)`.
- Le moteur autorise désormais un joueur courant « actif > 20 » : tout pilote (UI, bot)
  doit lui proposer un coup (rescousse / endTurn), il n'y a plus d'auto-fin sur bust.
- Test de flux réel ajouté (`play.test.ts`) qui épingle « actif >20 → endTurn → perte du
  set ». Reste à faire en P3.2 : un test d'intégration **piloté par l'IA** (deux sièges
  via `chooseMove` jusqu'au gameover) — l'IA n'est pour l'instant testée que pure.

---

## 2026-06-11 — P2 Engine livré ★

### Dernière chose faite
- **P2 complet** (branche `feat/p2-engine`) : noyau Pazaak en TDD strict.
  - `deck.ts`, `scoring.ts` (+ `setOutcome`), `types.ts` (schéma `G` contrat §3).
  - `game.ts` : `pickSideDeck` (pick simultané, main de 4, 1er joueur) + phase `play`
    complète (pioche auto, `turn.order` custom non-alternant, `playCard`/`endTurn`/`stand`,
    résolution de set, boucle de match **best-of-3**, `endIf`).
  - `playerView.ts` (contrat §4) + test contractuel de non-fuite (sentinelles gold).
  - `invariants.test.ts` : fast-check **1000 runs** verts (RULES §7), ~1.7s.
  - `index.ts` : API publique. `support.ts` : harnais headless typé.
- **Critères de sortie P2 atteints** : match complet jouable en client local headless ;
  50 tests verts ; lint + typecheck verts ; invariants ≥1000 runs.

### Trucs en suspens
- **IA non implémentée** : `ai.ts` (contrat §6) relève de **P3** (pas un critère P2). Le plan
  P2 la listait mais la ROADMAP la place en P3.
- **Gold cards** (tiebreaker, double, 1±2, flips) : types présents, **non jouables** (P8).
  `playCard` rejette toute carte non-`standard`. `[À VALIDER]` flip cards toujours ouvert.
- **Quirk outillage** : `pnpm format` ne lance PAS le lint/organizeImports → toujours finir
  par `command pnpm exec biome check .` (cf. QUIRKS).

### Prochaine chose à creuser
- **P3 — Solo client-local** : `ai.ts` heuristique (stand 18-20, jouer si 20/évite bust)
  + écrans `apps/web` (pick, board, fin de set/match). Résoudre `@tanstack/react-start`
  via Context7 avant le front.

### Notes pour future Claude
- Modélisation boardgame.io : un seul phase `play` boucle les sets ; `nextActivePos`
  gère les tours non alternés (adversaire continue seul) + le redémarrage de set (fresh).
  Résolution de set centralisée dans `resolveSetIfOver` (turn.onEnd).
- Tests : logique de règles pure testée en direct (`setOutcome`, `playCard` en appel
  direct déterministe) ; flux boardgame.io testé via Client `Local()` seedé.

---

## 2026-06-11 — P1 Bootstrap monorepo livré

### Dernière chose faite
- **P1 complet** sur la branche `feat/p1-bootstrap-monorepo` : pnpm workspaces (`@pazaak/engine`, `@pazaak/shared`, `@pazaak/web`, `@pazaak/game-server`, `@pazaak/e2e`), `tsconfig.base.json` strict, Biome (lint+format), Vitest par package + placeholder test, Playwright dans `e2e`, `docker-compose.yml` + `.dev.yml` squelettes, `.env.example`, `.gitignore`.
- **Critères de sortie verts** : `pnpm install --frozen-lockfile`, `biome check`, `pnpm -r typecheck`, `pnpm -r test` (4 packages, e2e exclu) tous RC=0.
- Décisions de session : **Node 24 LTS** (était 22 au contrat — docs mises à jour), **pnpm 11.5.3** (bump depuis 10.28.1), **tout Biome** (oxlint envisagé puis abandonné). Docs de référence déplacées dans `docs/`.

### Trucs en suspens
- **Toolchain** : Node 24 via nvm obligatoire (host par défaut Node 23). `pnpm lint` doit passer par `command pnpm` (rtk l'intercepte). Voir `QUIRKS.md` + `ENVIRONMENT.md`.
- **argon2** non installé (P4), **Playwright browsers** non installés (P7), **TanStack Start** épinglé mais non câblé (P3). Voir `BACKLOG.md`.
- Workflow PR abandonné : **on merge la branche dans `main` en fin de livraison** (`--no-ff`, pas de PR). PR #1 fermée, branche P1 mergée dans `main`.

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
