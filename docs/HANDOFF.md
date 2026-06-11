# Handoff — état courant du projet

Notes informelles à destination de la prochaine session (humaine ou Claude). Format libre, chronologique inverse (le plus récent en haut).

**À mettre à jour à la fin d'une session significative**. Pas besoin de noter chaque petit truc — l'idée est de te resituer en 30 secondes en début de session.

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
