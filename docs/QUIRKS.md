# Quirks & pièges connus

Comportements non-évidents découverts au fil du projet. Un H2 par quirk, avec une date.

**Si tu en découvres un nouveau pendant une session : ajoute-le ici dès la découverte, pas plus tard.**

---

## Codecov refuse le tokenless → `CODECOV_TOKEN` requis (2026-06-13)

**Découvert** : au premier run CI réel (le spec supposait « Codecov tokenless » sur repo public).

**Symptôme** : `codecov-action` log `-> Token length: 0` puis `error -- Upload queued for
processing failed: {"message":"Token required - not valid tokenless upload"}`. Le step
reste vert (`fail_ci_if_error: false`) mais **aucune donnée n'est ingérée** → badge README
« unknown ». L'`id-token: write` (OIDC) ne suffit pas non plus.

**Fix** : créer le repo sur codecov.io → récupérer l'upload token → l'ajouter en secret
GitHub `CODECOV_TOKEN` → `with: { token: ${{ secrets.CODECOV_TOKEN }} }` sur le step.
Confirmé : `Token length: 36` + `Upload queued for processing complete`, badge peuplé.

**Référence** : `.github/workflows/ci.yml` (step codecov), `docs/ENVIRONMENT.md`.

---

## CI : lefthook (allowBuilds), commitlint gitmoji, coverage lockstep (2026-06-13)

**Découvert** : mise en place de la CI.

- **lefthook** a un postinstall natif → il faut `lefthook: true` dans `allowBuilds`
  (`pnpm-workspace.yaml`), sinon le binaire n'est pas posé et `prepare: lefthook install`
  échoue.
- **commitlint + gitmoji** : `@commitlint/config-conventional` seul rejette le préfixe
  emoji. On surcharge `parserPreset.parserOpts.headerPattern` (emoji unicode non capturé
  en tête) + `headerCorrespondence`, on désactive `subject-case`, et un `ignores` laisse
  passer les merges `🔀 Merge:`. Un commit sans emoji est rejeté (type/subject vides).
- **`@vitest/coverage-v8`** doit être **exactement** la version de `vitest` (4.1.8) —
  ils sortent en lockstep, un écart casse `vitest run --coverage`.
- En CI (runner propre), pas de rtk : `pnpm check`/`audit` s'appellent directement.

**Référence** : `lefthook.yml`, `commitlint.config.js`, `packages/engine/vitest.config.ts`.

---

## `act` + Codecov : upload échoue sans token mais ne bloque pas le job (2026-06-13)

**Découvert** : lors de la validation `act` du job `quality` (CI-3).

**Symptôme** : Codecov log `"Token required - not valid tokenless upload"` → exit code non-nul côté Codecov CLI, mais le step GitHub Actions se termine en succès.

**Cause** : `codecov/codecov-action@v5` est configuré avec `fail_ci_if_error: false`. En vraie CI GitHub, OIDC ou un secret `CODECOV_TOKEN` prend le relais.

**Implication** : le job `quality` passe localement avec `act` ; en production, l'upload réussira si le repo est configuré sur Codecov avec OIDC ou un token secret.

**Référence** : `.github/workflows/ci.yml` (step codecov/codecov-action@v5)

---

## boardgame.io → vulns high transitives `ws` + `socket.io-parser` + `@koa/cors` (2026-06-13)

**Découvert** : `pnpm audit --audit-level=high` (job `security` du CI).

**Symptôme** : 3 vulns `high` dans l'arbre de dépendances de boardgame.io :
- `ws <7.5.10` → DoS via HTTP headers (GHSA-3h5v-q93c-6h6q). Chemin : `boardgame.io > koa-socket-2 > socket.io > engine.io > ws`.
- `socket.io-parser <4.2.6` → ReDoS (GHSA-677m-j7p3-52f9). Chemin : `boardgame.io > koa-socket-2 > socket.io > socket.io-parser`.
- `@koa/cors <5.0.0` → origine trop permissive (GHSA-qxrj-hx23-xp82). Chemin : `boardgame.io > @koa/cors`.

**Cause** : boardgame.io épingle des versions de socket.io/ws/@koa/cors non patchées.

**Statut** : **PATCHÉES** via `pnpm overrides` dans `pnpm-workspace.yaml` :
- `ws: ">=7.5.10 <8"` (même majeure, faible risque)
- `socket.io-parser: ">=4.2.6 <5"` (même majeure, faible risque)
- `@koa/cors: ">=5.0.0 <6"` (bump majeur 4→5 — le correctif EST la 5.0)

**Caveat** : les versions forcées (en particulier `@koa/cors` 5.x) ne sont pas testées par boardgame.io. Ces dépendances ne sont utilisées que par le game-server (transport websocket, P5/P6). **À revalider quand le game-server tournera (P5/P6)** — si un bug de transport apparaît, ré-évaluer.

**Référence** : `pnpm-workspace.yaml` (overrides), `docs/BACKLOG.md`

---

## Bust finalisé à la conclusion du tour, pas à la pioche (2026-06-12)

**Découvert / décidé** : en P3, en branchant l'IA (le branch « éviter le bust » du
contrat §6 était mort avec le moteur P2).

**Comportement** : un joueur dont la pioche forcée fait dépasser 20 **n'est pas busté
immédiatement** (tant que board < 9). Il reste `currentPlayer` actif et DOIT jouer un
coup (carte de rescousse pour revenir ≤ 20, ou `endTurn`/`stand` qui finalise le bust).
`refreshScoreAndFlags` ne verrouille `busted` que sur 9 cartes en dépassant 20.

**Implication** : tout pilote du jeu (UI solo, futur bot, tests) doit fournir un coup au
joueur courant même au-dessus de 20 — il n'y a plus d'auto-fin de tour sur bust. Le bust
sur la pioche n'apparaît qu'après `endTurn`/`stand`.

**Référence** : `packages/engine/src/turn.ts`, `moves.ts` ; RULES §5 ; contrat §5-6.

---

## boardgame.io : `playerView` s'applique aussi au client single-player (2026-06-11)

**Découvert** : en P2, en branchant `playerView` (le test de `setup` a cassé).

**Symptôme** : un `Client({ game })` single-player (sans `multiplayer: Local()`) renvoie un
`G` **déjà strippé** pour le joueur courant `'0'` → l'adversaire `'1'` apparaît masqué
(`hand: { count }`, `sideDeck: null`). Impossible d'inspecter l'état brut des deux joueurs
via un client.

**Cause** : dès que `playerView` est défini sur le Game, boardgame.io l'applique pour le
`playerID` courant, y compris en mono-client.

**Workaround** : pour tester l'état brut (ex. `setup`), appeler la **fonction pure**
`initialState()` directement, sans passer par un Client. Pour les flux, lire chaque joueur
depuis SON client (`players['0']` via `p0`, `players['1']` via `p1`) en multiplayer `Local()`.

**Référence** : `packages/engine/test/setup.test.ts`, `packages/engine/test/support.ts`

---

## `pnpm format` ne couvre pas le lint/organizeImports (2026-06-11)

**Découvert** : pendant P2.

**Symptôme** : `pnpm format` passe vert, mais `biome check` échoue ensuite (règles
`useOptionalChain`, `organizeImports`, imports non triés…).

**Cause** : `pnpm format` = `biome format --write` (mise en forme **uniquement**). Le lint
et les actions d'assist (tri des imports) relèvent de `biome check`, pas de `format`.

**Workaround** : avant de considérer un chantier terminé, lancer `command pnpm exec biome
check .` (le `command` bypasse l'interception rtk de `pnpm lint`). `biome check --write`
applique les correctifs sûrs ; `--unsafe` pour les correctifs marqués unsafe (ex. optional chain).

**Référence** : `docs/ENVIRONMENT.md` (Toolchain), `package.json` scripts

---

## rtk intercepte `pnpm lint` (et d'autres scripts) (2026-06-11)

**Découvert** : pendant la vérification P1.

**Symptôme** : `pnpm lint` sort `ESLint output (JSON parse failed)` + `Command "eslint" not found`, alors que le script projet est `biome lint .`.

**Cause** : `rtk` (Rust Token Killer) installe un wrapper shell autour de `pnpm` et intercepte certains noms de scripts (`lint`, probablement `test`/`build`) pour lancer son propre adaptateur (eslint-centré). Notre lint est Biome → l'adaptateur échoue.

**Workaround** : préfixer `command` pour bypasser le wrapper (`command pnpm lint`, `command pnpm -r test`), ou appeler l'outil directement (`pnpm exec biome check .`). `pnpm format` n'est pas intercepté.

**Référence** : `docs/ENVIRONMENT.md` (section Toolchain)

---

## pnpm 11 : réglages déplacés + nouvelle policy supply-chain (2026-06-11)

**Découvert** : en bumpant pnpm 10.28.1 → 11.5.3.

**Symptômes & causes** :
- `save-exact` n'est plus lu depuis `.npmrc` → les `pnpm add` réécrivaient des `^`. **Fix** : `saveExact: true` dans `pnpm-workspace.yaml`.
- `pnpm.onlyBuiltDependencies` (package.json) ignoré ; la liste `onlyBuiltDependencies` dans `pnpm-workspace.yaml` n'a pas non plus autorisé le build natif. La **bonne clé pnpm 11 est `allowBuilds`** (map `nom: true|false`). **Fix** : `allowBuilds: { better-sqlite3: true, esbuild: true }`.
- Policy **`minimumReleaseAge`** active : refuse tout package publié trop récemment. `@types/node@25.9.3` (publié il y a ~2h) bloquait l'install. **Fix** : `overrides: { "@types/node": "24.0.0" }` (ligne 24.x, alignée runtime, suffisamment datée). Le peer optionnel de vite/vitest tirait sinon le dernier `@types/node`.
- Changement de major du store → `pnpm install` veut purger `node_modules` mais refuse sans TTY (`ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`). **Fix** : `CI=true pnpm install` (ou `confirmModulesPurge=false`).

**Référence** : `pnpm-workspace.yaml`

---

## Host Node 23 par défaut, projet en Node 24 (2026-06-11)

**Découvert** : au bootstrap P1.

**Symptôme** : `node -v` dans un shell neuf renvoie `v23.11.1` (et `pnpm` absent tant que corepack n'a pas shimé le Node courant), malgré `nvm alias default 24`.

**Cause** : le profil du host force Node 23. `.nvmrc` du projet pointe sur `v24.16.0`.

**Workaround** : `export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use && corepack enable` avant toute commande pnpm/node.

**Référence** : `.nvmrc`, `docs/ENVIRONMENT.md`

---

## ~~Docs de référence à la racine~~ — RÉSOLU (2026-06-11)

Les docs (`contrat-pazaak.md`, `RULES.md`, `BOOTSTRAP.md`, `ROADMAP.md`) ont été déplacées
dans `docs/` (`git mv`), conformément aux chemins de `CLAUDE.md`. Plus de divergence.

---

## ~~Repo non bootstrappé~~ — RÉSOLU (2026-06-11)

P1 livré : structure pnpm workspaces, tooling, placeholders, tests verts. Les commandes
de `CLAUDE.md` sont opérationnelles (avec Node 24 actif, cf. quirk Node ci-dessus).
