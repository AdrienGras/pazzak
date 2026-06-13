# Backlog & idées

Choses identifiées comme "à faire un jour" mais pas prioritaires. Si tu trouves une amélioration en passant, note-la ici plutôt que de l'oublier ou de la coder maintenant.

Une fois faite, déplace-la en `INDEX.md` (livré) ou supprime-la (abandonnée).

---

## CI / Sécurité

- [ ] **Valider les overrides socket.io/ws/@koa/cors** quand le game-server tournera (P5/P6) : les versions forcées (dont @koa/cors 5.x majeure) ne sont pas testées par boardgame.io. Si un bug de transport apparaît, ré-évaluer.
- [ ] **Token Codecov** : configurer OIDC ou secret `CODECOV_TOKEN` sur GitHub pour activer les uploads de couverture en vraie CI.
- [ ] **e2e en CI** (P7) : workflow séparé contre `docker compose up` + `playwright install`. Hors périmètre de la CI initiale.
- [ ] **Étendre la couverture** aux autres packages quand ils auront de vrais tests (web/game-server en P4+), avec flags Codecov par package.

## Outillage / deps

- [ ] **argon2** : ajouter `argon2: true` à `allowBuilds` (pnpm-workspace.yaml) et l'épingler quand l'auth web arrive (P4). Pas installé en P1 (hors liste de pin P1).
- [ ] **Playwright browsers** : `pnpm --filter @pazaak/e2e exec playwright install` avant de lancer les vrais e2e (P7). Le package est installé, pas les navigateurs.
- [x] ~~**TanStack Start** : wiring complet~~ — fait en **P3.2** (vite config, plugin react, routes, `getRouter`). Ajout devDeps `vite` 8.x + `@vitejs/plugin-react` 6.x + `@types/react`/`-dom`.
- [ ] **`@types/node`** : figé à `24.0.0` via override (policy `minimumReleaseAge` de pnpm). Revisiter si une 24.x plus récente et « datée » est souhaitée.
- [ ] **Vitest config web** : passer `environment: jsdom` quand des tests de composants arriveront (actuellement node ; mais l'UI est couverte par les e2e P7, pas de tests de composants prévus).

## Engine / règles

- [x] ~~**IA heuristique** (`packages/engine/src/ai.ts`, contrat §6)~~ — livrée en **P3.1**
  (`chooseMove`/`chooseSideDeck`), branchée au front en **P3.2** (`aiStep`).
- [ ] **Gold cards** (stretch P8) : tiebreaker, double, 1±2, flips 2&4 / 3&6. Types déjà
  présents dans `SideCard`/`PlayedCard` (identité des cartes posées prête). `playCard` les
  rejette pour l'instant. Trancher le `[À VALIDER]` comportement des flips (RULES §3).
- [ ] **Alternance du premier joueur sur set rejoué (tie)** : choix actuel = alterner à
  chaque nouveau set, y compris les replays de tie. Vérifier vs comportement KOTOR si besoin.

## Web / solo (P3.2 — nice-to-have)

- [ ] **Lifecycle des clients `useMemo` → `useRef`** (`apps/web/src/routes/solo.tsx`) : les
  clients vivent dans un `useMemo` (correct aujourd'hui car les consommateurs sont keyed sur
  l'identité et pas de StrictMode), mais React ne garantit pas le cache de `useMemo`.
  Refactor vers `useRef`/effect-owned pour robustesse (ou commentaire explicatif). Non bloquant.
- [ ] **`useSyncExternalStore`** pour `useSoloGame` : plus idiomatique React 18+ que
  subscribe+`useState` (le client expose déjà `subscribe`/`getSnapshot`). Pas de bug actuel.
- [ ] **Deck-builder : doublons / quantités** : actuellement 10 cartes **distinctes** parmi
  les 18 du catalogue. Pazaak réel autorise des doublons selon la collection — raffinement P8.
- [ ] **Sélecteur de difficulté visuel** + écran de règles, animations de reveal (P8 polish).
  Le mapping difficulté→`standThreshold` (19/18/17) est déjà câblé.

## Docker

- [ ] Dockerfiles `apps/web` et `apps/game-server` (base `node:24-slim`) — finalisés en P5. Les services compose sont déclarés mais ne buildent pas encore.
