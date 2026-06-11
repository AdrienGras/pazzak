# Quirks & pièges connus

Comportements non-évidents découverts au fil du projet. Un H2 par quirk, avec une date.

**Si tu en découvres un nouveau pendant une session : ajoute-le ici dès la découverte, pas plus tard.**

---

## Docs de référence à la racine, pas dans `docs/` (2026-06-11)

**Découvert** : pendant le bootstrap de la mémoire projet.

**Symptôme** : `CLAUDE.md` (et `BOOTSTRAP-pazaak.md §1`) référencent `docs/contrat-pazaak.md`, `docs/RULES.md`, `docs/BOOTSTRAP.md`, `docs/ROADMAP.md`. Ces chemins n'existent pas.

**Cause** : les documents de référence sont physiquement à la **racine** du repo, avec un suffixe `-pazaak` : `contrat-pazaak.md`, `RULES-pazaak.md`, `BOOTSTRAP-pazaak.md`, `ROADMAP-pazaak.md`.

**Workaround** : lire les fichiers à la racine. Une normalisation est à trancher (déplacer dans `docs/` OU corriger les chemins de `CLAUDE.md`) — cf. `BACKLOG.md`.

**Référence** : `CLAUDE.md` (section « Protocole obligatoire ») · racine du repo

---

## Repo non bootstrappé (2026-06-11)

**Découvert** : pendant le bootstrap de la mémoire projet.

**Symptôme** : les commandes `pnpm lint/typecheck/test/dev` de `CLAUDE.md` échouent — aucun `package.json` n'existe.

**Cause** : le projet est au tout début (commit initial). La structure monorepo (`packages/`, `apps/`, `pnpm-workspace.yaml`, `tsconfig.base.json`) n'a pas encore été créée. Phase ROADMAP : avant P0.

**Workaround** : exécuter d'abord la phase P0 (`BOOTSTRAP-pazaak.md §2`) avant d'attendre quoi que ce soit de ces scripts.

**Référence** : `BOOTSTRAP-pazaak.md:42` (section Initialisation)
