# Backlog & idées

Choses identifiées comme "à faire un jour" mais pas prioritaires. Si tu trouves une amélioration en passant, note-la ici plutôt que de l'oublier ou de la coder maintenant.

Une fois faite, déplace-la en `INDEX.md` (livré) ou supprime-la (abandonnée).

---

## Outillage / deps

- [ ] **argon2** : ajouter `argon2: true` à `allowBuilds` (pnpm-workspace.yaml) et l'épingler quand l'auth web arrive (P4). Pas installé en P1 (hors liste de pin P1).
- [ ] **Playwright browsers** : `pnpm --filter @pazaak/e2e exec playwright install` avant de lancer les vrais e2e (P7). Le package est installé, pas les navigateurs.
- [ ] **TanStack Start** : épinglé en P1 mais non câblé (pas de vite config / routes / plugin react). Wiring complet en P3 — résoudre la doc via Context7 avant.
- [ ] **`@types/node`** : figé à `24.0.0` via override (policy `minimumReleaseAge` de pnpm). Revisiter si une 24.x plus récente et « datée » est souhaitée.
- [ ] **Vitest config web** : passer `environment: jsdom` quand des tests de composants arriveront (actuellement node ; mais l'UI est couverte par les e2e P7, pas de tests de composants prévus).

## Engine / règles

- [ ] **IA heuristique** (`packages/engine/src/ai.ts`, contrat §6) — à faire en **P3** :
  `(view, params) => Move`, stand 18-20, jouer une carte si elle donne 20 ou évite un bust.
- [ ] **Gold cards** (stretch P8) : tiebreaker, double, 1±2, flips 2&4 / 3&6. Types déjà
  présents dans `SideCard`/`PlayedCard` (identité des cartes posées prête). `playCard` les
  rejette pour l'instant. Trancher le `[À VALIDER]` comportement des flips (RULES §3).
- [ ] **Alternance du premier joueur sur set rejoué (tie)** : choix actuel = alterner à
  chaque nouveau set, y compris les replays de tie. Vérifier vs comportement KOTOR si besoin.

## Docker

- [ ] Dockerfiles `apps/web` et `apps/game-server` (base `node:24-slim`) — finalisés en P5. Les services compose sont déclarés mais ne buildent pas encore.
