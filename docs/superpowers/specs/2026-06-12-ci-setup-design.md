# Spec — Mise en place de la CI + badges README

> Design validé le 2026-06-12. Travail intermédiaire entre P3.1 (livré) et P3.2 (web).
> Compagnon : `BOOTSTRAP.md` (§8 tests, §9 conventions), `CLAUDE.md` (règles absolues,
> gel des versions, gitmoji).

---

## 1. Objectif et périmètre

Mettre en place l'intégration continue GitHub Actions du monorepo + une suite d'outillage
qualité local, et doter le README de badges. Objectifs :

- Faire tourner à chaque push `main` et chaque PR le **trio « définition de terminé »**
  (lint+format, typecheck, tests) + **couverture** + **audit de sécurité**.
- Verrouiller le **gel des versions** via `--frozen-lockfile` (la CI devient gardienne).
- Outiller les **conventions de commit** (gitmoji + conventional) par un hook local.
- Établir une **règle d'exploitation post-push** (observation CI + triage sécurité).

**Hors périmètre** (assumé, non bloquant) :
- e2e Playwright en CI → **P7** (workflow séparé contre `docker compose`).
- Build/scan d'images Docker → **P5**.
- Dependabot sur npm (contredirait le gel) ; CodeQL ; matrix Node (un seul Node supporté).

## 2. Contexte technique (acquis)

- Repo **public** `AdrienGras/pazzak`, branche par défaut `main`, remote `origin`.
- **GitHub Actions** = provider (alimente les badges).
- Node **24** (`.nvmrc` = `v24.16.0`), pnpm **11.5.3** (champ `packageManager`).
- Scripts racine prêts : `check` (biome lint+format+imports), `typecheck` (`pnpm -r`),
  `test` (`pnpm -r`).
- `pnpm-workspace.yaml` : `saveExact: true`, `allowBuilds` (better-sqlite3, esbuild),
  `overrides` (`@types/node` 24.0.0), policy `minimumReleaseAge` active.
- **Quirk rtk** (`pnpm lint` intercepté) = **purement local** ; en CI, pnpm est appelé
  directement, aucun `command` nécessaire.

## 3. Décisions de design

| Sujet | Décision |
|---|---|
| Provider / triggers | GitHub Actions ; `push: [main]` + `pull_request` ; `concurrency` cancel-in-progress par ref. |
| Structure | **Job unique `quality` séquentiel** + **job `security` distinct** (statuts séparés). Pas de parallélisme lint/type/test (overhead > gain sur 4 petits packages). |
| Couverture | `@vitest/coverage-v8` **= version exacte de vitest (4.1.8)**, scope **`packages/engine` uniquement** (seul package à logique réelle), reporters `text` + `lcov`. |
| Reporting couverture | **Codecov tokenless** (OIDC, repo public) → badge + commentaires PR. |
| Sécurité | Job `security` : `pnpm audit --audit-level=high` (échoue sur high+). + **alertes Dependabot natives** (Security tab, à activer en Settings). |
| Updates deps | **Dependabot `github-actions` seulement**, hebdo. Pas de npm (gel). |
| Pinning des actions | **Tag majeur** (`@v4`) ; Dependabot suit les bumps. |
| Hooks locaux | **lefthook** : `commit-msg` → commitlint (gitmoji+conventional) ; `pre-commit` → `biome check` sur fichiers stagés. |
| README | Réécriture + **7 badges** : CI, Codecov, License, Node 24, pnpm 11, Biome, Gitmoji. |

## 4. Composantes à livrer

### 4.1 `.github/workflows/ci.yml`
Déclencheurs : `push` (branches `main`), `pull_request`. Bloc `concurrency` :
`group: ci-${{ github.ref }}`, `cancel-in-progress: true`.

**Job `quality`** (ubuntu-latest) :
1. `actions/checkout@v4`
2. `pnpm/action-setup@v4` (version lue depuis `packageManager` du `package.json`)
3. `actions/setup-node@v4` : `node-version-file: .nvmrc`, `cache: pnpm`
4. `pnpm install --frozen-lockfile`
5. `pnpm check` (biome lint + format + tri d'imports)
6. `pnpm typecheck`
7. `pnpm test:coverage` (nouveau script racine, cf. 4.2)
8. `codecov/codecov-action@v5` (tokenless ; `files: packages/engine/coverage/lcov.info`)

**Job `security`** (ubuntu-latest, indépendant) :
1. checkout + pnpm + node (idem 1-3)
2. `pnpm install --frozen-lockfile`
3. `pnpm audit --audit-level=high` (échoue le job sur vuln high/critical)

### 4.2 Couverture (vitest)
- Ajouter `@vitest/coverage-v8@4.1.8` en devDep de `packages/engine` (lockstep avec
  `vitest@4.1.8` déjà présent). **Version assez datée** pour passer `minimumReleaseAge`.
- Config vitest engine (`packages/engine/vitest.config.ts` ou clé `test.coverage` dans un
  config existant) : `provider: 'v8'`, `reporter: ['text', 'lcov']`,
  `reportsDirectory: './coverage'`, `include: ['src/**']`.
- Script racine `test:coverage` : lance la couverture sur engine
  (`pnpm --filter @pazaak/engine exec vitest run --coverage`). Les autres packages
  (placeholders) ne sont pas couverts pour l'instant.
- `coverage/` ajouté au `.gitignore`.

### 4.3 `.github/dependabot.yml`
```yaml
version: 2
updates:
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```
(npm volontairement absent — gel des versions.)

### 4.4 Hooks locaux — lefthook + commitlint
- `lefthook.yml` racine :
  - `commit-msg` → `pnpm exec commitlint --edit {1}`
  - `pre-commit` → `biome check` sur `{staged_files}` (uniquement les fichiers stagés)
- `commitlint.config.*` : valide `<emoji> type(scope): sujet`. Base
  `@commitlint/config-conventional` **+ adaptation gitmoji** (la config conventional seule
  rejette le préfixe emoji). Lib/headerPattern exact à **résoudre via la doc avant
  d'écrire** (candidats : `commitlint-config-gitmoji`, ou `parserPreset.parserOpts.
  headerPattern` custom acceptant un emoji unicode en tête).
- DevDeps racine **épinglées exactes** (versions assez datées pour `minimumReleaseAge`) :
  `lefthook`, `@commitlint/cli`, `@commitlint/config-conventional` (+ config gitmoji
  retenue).
- Installation des hooks : script racine `prepare: lefthook install` (s'exécute au
  `pnpm install`). `lefthook` télécharge un binaire en postinstall → ajouter
  `lefthook: true` à `allowBuilds` dans `pnpm-workspace.yaml`.

### 4.5 README
Réécriture de `# pazzak` en un README structuré :
- Titre + description courte (Pazaak KOTOR, solo IA + ranked 1v1, stack).
- **Bandeau de 7 badges** :
  - CI : `https://github.com/AdrienGras/pazzak/actions/workflows/ci.yml/badge.svg`
  - Codecov : `https://codecov.io/gh/AdrienGras/pazzak/branch/main/graph/badge.svg`
  - License : `https://img.shields.io/github/license/AdrienGras/pazzak`
  - Node : `https://img.shields.io/badge/node-24-339933?logo=node.js&logoColor=white`
  - pnpm : `https://img.shields.io/badge/pnpm-11-F69220?logo=pnpm&logoColor=white`
  - Biome : `https://img.shields.io/badge/biome-checked-60A5FA?logo=biome&logoColor=white`
  - Gitmoji : `https://img.shields.io/badge/gitmoji-%F0%9F%98%9C%20%F0%9F%98%8D-FFDD67`
- Sections : Stack, Getting started (rituel nvm/pnpm), Scripts (check/typecheck/test/
  dev/e2e), Carte des docs (`docs/`).

### 4.6 Règle d'exploitation post-push (CLAUDE.md)
Ajouter une règle **toujours-active** : *Après chaque push (dans une session) :*
1. *Observer le run CI jusqu'à la fin (`gh run watch`) et rapporter le résultat.*
2. *Si un job échoue (quality) → triage et proposition de correction.*
3. *Si une remontée de sécurité apparaît (job `security` rouge ou alerte Dependabot) →*
   ***ne jamais patcher automatiquement***. *D'abord rechercher l'impact du bump
   (changelog, semver, direct vs transitive, contrainte lockfile) :*
   - *non-breaking → proposer le patch prêt, preuve de non-régression à l'appui ;*
   - *potentiellement breaking → présenter les changements/impacts et les options.*
   *Dans tous les cas : proposition, jamais d'application sans accord. C'est le canal
   explicite qui lève le gel des versions pour un motif de sécurité.*

### 4.7 Mémoire projet
- `INDEX.md` : ligne « Outillage CI (GitHub Actions + hooks + badges) ».
- `ENVIRONMENT.md` : workflows, jobs, Codecov, lefthook/commitlint, scripts.
- `QUIRKS.md` : `allowBuilds: lefthook`, commitlint+gitmoji headerPattern,
  `@vitest/coverage-v8` lockstep avec vitest.
- `HANDOFF.md`, `BACKLOG.md` (e2e CI → P7, étendre couverture aux autres packages).

## 5. Définition de terminé
- `.github/workflows/ci.yml` vert au premier push (les deux jobs).
- `pnpm install` installe lefthook/commitlint/coverage **sans casser** `minimumReleaseAge`,
  lockfile committé.
- `pnpm test:coverage` produit un `lcov.info` ; le badge Codecov s'affiche.
- Un commit au mauvais format est **refusé par le hook commit-msg** ; un fichier mal
  formaté est rattrapé par le pre-commit.
- README rendu avec les 7 badges (au moins CI/License/Node/pnpm/Biome/Gitmoji immédiats ;
  Codecov se peuple au premier upload).
- `pnpm check`, `pnpm typecheck`, `pnpm test` verts en local.
- Règle post-push inscrite dans `CLAUDE.md` ; docs mémoire à jour.

## 6. Risques / points de vigilance
- **`minimumReleaseAge`** : choisir des versions datées pour les nouvelles devDeps, sinon
  `pnpm install` échoue (cf. quirk `@types/node` en P1).
- **commitlint + gitmoji** : le préfixe emoji unicode doit être accepté — valider le
  `headerPattern`/la config avant d'écrire (sinon tous les commits sont rejetés).
- **`pnpm audit`** peut remonter une vuln transitive non corrigeable → le job `security`
  rouge déclenche le protocole §4.6 (recherche + proposition), ne bloque rien en local.
- **Codecov tokenless** : nécessite que le repo soit lié côté Codecov ; le badge reste
  vide tant qu'aucun upload n'a eu lieu.
