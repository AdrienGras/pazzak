# Registre des features livrées

Catalogue chronologique de ce qui a été construit. Pour chaque entrée : spec (le quoi/pourquoi), plan (le comment), statut. Une ligne par feature.

Voir aussi : `ENVIRONMENT.md` · `QUIRKS.md` · `BACKLOG.md` · `HANDOFF.md` · `superpowers/specs/` · `superpowers/plans/`

---

## Features

| Feature | Date | Spec | Plan | Statut | Notes |
|---|---|---|---|---|---|
| **P2 — Engine (noyau Pazaak)** | 2026-06-11 | `contrat-pazaak.md` §3-6, `RULES.md` | `superpowers/plans/2026-06-11-p2-engine.md` | ✅ Livré | deck, scoring, types G, pickSideDeck, phase play (match best-of-3), playCard, playerView (§4), invariants fast-check (1000 runs). 50 tests. Cartes standard only ; IA→P3, gold cards→P8. |
| **P1 — Bootstrap monorepo** | 2026-06-11 | `ROADMAP.md` §P1 | — | ✅ Livré | pnpm workspaces (engine/shared/web/game-server/e2e), TS strict, Biome, Vitest, Playwright, docker-compose squelettes. `install`/lint/typecheck/test verts. Node 24, pnpm 11. |
| Système de mémoire projet (`docs/` + hook SessionStart) | 2026-06-11 | — | — | ✅ Livré | Bootstrap KB opérationnelle + hook d'injection `HANDOFF`/`INDEX` |
| Docs de référence (contrat, RULES, BOOTSTRAP, ROADMAP) | 2026-06-11 | — | — | ✅ Livré | Déplacées dans `docs/` (P1) |

## Commandes / scripts utilitaires

| Commande | Date | Cible |
|---|---|---|
| `.claude/hooks/load-memory.sh` | 2026-06-11 | Hook SessionStart : injecte les têtes de `HANDOFF.md` + `INDEX.md` |
| `pnpm lint` / `format` / `typecheck` / `test` / `dev` / `e2e` | 2026-06-11 | Scripts d'orchestration racine (cf. `ENVIRONMENT.md` ; `pnpm lint` à lancer via `command pnpm` à cause de rtk) |
