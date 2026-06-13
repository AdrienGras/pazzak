# Registre des features livrées

Catalogue chronologique de ce qui a été construit. Pour chaque entrée : spec (le quoi/pourquoi), plan (le comment), statut. Une ligne par feature.

Voir aussi : `ENVIRONMENT.md` · `QUIRKS.md` · `BACKLOG.md` · `HANDOFF.md` · `superpowers/specs/` · `superpowers/plans/`

---

## Features

| Feature | Date | Spec | Plan | Statut | Notes |
|---|---|---|---|---|---|
| **P2 — Engine (noyau Pazaak)** | 2026-06-11 | `contrat-pazaak.md` §3-6, `RULES.md`, `superpowers/specs/2026-06-11-engine-design.md` | `superpowers/plans/2026-06-11-p2-engine.md` | ✅ Livré | deck, scoring, types G, pickSideDeck, phase play (match best-of-3), playCard, playerView (§4), invariants fast-check (1000 runs). 50 tests. Cartes standard only ; IA→P3, gold cards→P8. |
| **P3.1 — Moteur bust-recovery + IA** | 2026-06-12 | `superpowers/specs/2026-06-12-p3-engine-bust-recovery-ai.md` | `superpowers/plans/2026-06-12-p3-engine-bust-recovery-ai.md` | ✅ Livré | Bust finalisé à la conclusion du tour (rescousse par side deck) ; IA pure `chooseMove`/`chooseSideDeck` (contrat §6). Tests engine MAJ + nouveaux. Web solo → bloc P3.2. |
| **P3.2 — Solo client-local web (jouable)** | 2026-06-13 | `superpowers/specs/2026-06-13-p3.2-web-solo-design.md` | `superpowers/plans/2026-06-13-p3.2-web-solo.md` | ✅ Livré | **Critère de sortie P3 atteint** (partie solo complète jouable au navigateur, vérifiée Playwright). TanStack Start (app shell + routes `/`, `/solo`), deck-builder 10 cartes, écrans board/fin, sélecteur de difficulté → `standThreshold`. 2 clients `boardgame.io` `Local()` (humain `'0'` + IA `'1'`), driver `aiStep` (Approche A) branché via hooks (`useSoloGame`/`useAiDriver`). Logique testable extraite : `aiStep`, `deriveScreen`, `toggleSelection` + test intégration IA-vs-IA. |
| **Fix moteur — blocage boucle de set** | 2026-06-13 | — | `superpowers/plans/2026-06-13-p3.2-web-solo.md` (débusqué en P3.2) | ✅ Livré | Bug latent P2/P3.1 : un auto-stand (20 pile / 9 cartes) pendant la pioche `onBegin` ne terminait pas le tour → boucle de set figée (~60% des parties). Fix `game.ts` `90c23a8` : `events.endTurn()` depuis `onBegin` quand le joueur auto-fige. Test de non-régression (balayage de seeds). Engine 127 tests verts. Cf. QUIRKS. |
| **P1 — Bootstrap monorepo** | 2026-06-11 | `ROADMAP.md` §P1 | — | ✅ Livré | pnpm workspaces (engine/shared/web/game-server/e2e), TS strict, Biome, Vitest, Playwright, docker-compose squelettes. `install`/lint/typecheck/test verts. Node 24, pnpm 11. |
| Système de mémoire projet (`docs/` + hook SessionStart) | 2026-06-11 | — | — | ✅ Livré | Bootstrap KB opérationnelle + hook d'injection `HANDOFF`/`INDEX` |
| Docs de référence (contrat, RULES, BOOTSTRAP, ROADMAP) | 2026-06-11 | — | — | ✅ Livré | Déplacées dans `docs/` (P1) |

| **Outillage CI (GitHub Actions + hooks + badges)** | 2026-06-13 | `superpowers/specs/2026-06-12-ci-setup-design.md` | `superpowers/plans/2026-06-12-ci-setup.md` | ✅ Livré | Workflow `ci.yml` (jobs quality+security, permissions least-privilege), couverture Codecov (engine), lefthook+commitlint gitmoji, Dependabot actions, README + 7 badges, règle post-push. 3 vulns high transitives boardgame.io patchées via pnpm overrides (à valider en P5/P6). |

## Commandes / scripts utilitaires

| Commande | Date | Cible |
|---|---|---|
| `.claude/hooks/load-memory.sh` | 2026-06-11 | Hook SessionStart : injecte les têtes de `HANDOFF.md` + `INDEX.md` |
| `pnpm lint` / `format` / `typecheck` / `test` / `dev` / `e2e` | 2026-06-11 | Scripts d'orchestration racine (cf. `ENVIRONMENT.md` ; `pnpm lint` à lancer via `command pnpm` à cause de rtk) |
