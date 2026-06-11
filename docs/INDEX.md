# Registre des features livrées

Catalogue chronologique de ce qui a été construit. Pour chaque entrée : spec (le quoi/pourquoi), plan (le comment), statut. Une ligne par feature.

Voir aussi : `ENVIRONMENT.md` · `QUIRKS.md` · `BACKLOG.md` · `HANDOFF.md` · `superpowers/specs/` · `superpowers/plans/`

---

## Features

| Feature | Date | Spec | Plan | Statut | Notes |
|---|---|---|---|---|---|
| Système de mémoire projet (`docs/` + hook SessionStart) | 2026-06-11 | — | — | ✅ Livré | Bootstrap KB opérationnelle + hook d'injection `HANDOFF`/`INDEX` |
| Docs de référence (contrat, RULES, BOOTSTRAP, ROADMAP) | 2026-06-11 | — | — | ✅ Pré-existant | À la racine du repo (cf. QUIRKS sur les paths) |

## Commandes / scripts utilitaires

| Commande | Date | Cible |
|---|---|---|
| `.claude/hooks/load-memory.sh` | 2026-06-11 | Hook SessionStart : injecte les têtes de `HANDOFF.md` + `INDEX.md` |
