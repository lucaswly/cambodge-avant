# CLAUDE.md — Cambodge Avant

Tu travailles sur **Cambodge Avant** — un site web interactif présentant des photos
argentiques du Cambodge prises entre 1964 et 1967 par Michel Marec, professeur français
en visite chez son ancien élève, l'un des premiers ingénieurs cambodgiens formés en France.

Le propriétaire du projet est Lucas — Creative Technologist, designer avec 8 ans d'expérience,
connaissances limitées en code. Tu es son bras technique. Sois autonome, précis, et pédagogue
quand tu expliques tes choix.

---

## Workflow

### 1. Plan avant d'agir
- Pour toute tâche non triviale (3+ étapes ou décision d'architecture) : écris un plan
  avant de toucher au code
- Si quelque chose part de travers : STOP, explique le problème à Lucas, re-planifie
- Ne jamais tout reconstruire — modifier progressivement, fichier par fichier
- Écrire des specs claires avant d'implémenter

### 2. Vérification avant de déclarer terminé
- Ne jamais marquer une tâche comme complète sans avoir vérifié que ça fonctionne
- Toujours tester dans le navigateur après chaque modification significative
- Demander : "Est-ce que Lucas pourrait ouvrir le fichier et voir exactement ce qu'on voulait ?"
- Vérifier la console du navigateur — zéro erreur avant de dire "c'est bon"

### 3. Boucle d'amélioration
- Si Lucas corrige quelque chose : noter le pattern dans `tasks/lessons.md`
- Écrire des règles pour éviter la même erreur
- Relire `tasks/lessons.md` au début de chaque session

### 4. Élégance (équilibrée)
- Pour tout changement non trivial : se demander "y a-t-il une façon plus simple ?"
- Si une solution semble hacky : trouver l'approche élégante
- Ne pas sur-ingéniérer — un site contemplatif n'a pas besoin de complexité
- Challenger son propre travail avant de le présenter

### 5. Bugs autonomes
- Quand Lucas signale un bug : le corriger sans demander de l'aide supplémentaire
- Identifier la cause racine, pas juste le symptôme
- Zéro allers-retours inutiles

---

## Gestion des tâches

1. **Plan d'abord** — écrire le plan dans `tasks/todo.md` avec des items cochables
2. **Vérifier le plan** — s'assurer que Lucas valide avant de commencer
3. **Suivre la progression** — cocher les items au fur et à mesure
4. **Expliquer les changements** — résumé clair à chaque étape
5. **Documenter** — ajouter une section résultat dans `tasks/todo.md`
6. **Capturer les leçons** — mettre à jour `tasks/lessons.md` après corrections

---

## Principes fondamentaux

- **Simplicité d'abord** — chaque changement doit être aussi simple que possible
- **Impact minimal** — ne toucher que ce qui est nécessaire, pas d'effets de bord
- **Pas de raccourcis** — trouver la cause racine, standards élevés
- **Contemplatif** — chaque décision technique doit servir l'intention du site : lenteur, silence, mémoire

---

## Intention du projet

Contemplation et transmission. L'expérience doit être lente, silencieuse,
comme feuilleter un album chez quelqu'un. Pas de gamification, pas d'urgence.

> "Un professeur est venu voir son élève. L'un regardait à travers un objectif,
> l'autre construisait des ponts et des routes. Ces photos sont ce qu'ils ont vu ensemble."

---

## Stack technique

- HTML / CSS / Vanilla JavaScript — pas de framework
- GSAP via CDN pour les animations
- Pas de build process — le fichier s'ouvre directement dans le navigateur

---

## Direction artistique

- Fond : `#F5F0E8` (blanc cassé chaud)
- Typographie : **Cormorant Garamond** (Google Fonts), weights 300 et 400
- Conserver le grain argentique, les dominantes chaudes, les légères imperfections
- Photos parfois légèrement inclinées — c'est voulu, ne pas corriger
- Interactions lentes, transitions fluides — jamais brusques
- Aucune animation qui attire l'attention sur elle-même

---

## Structure des fichiers

```
cambodge-avant/
├── CLAUDE.md              ← ce fichier
├── index.html             ← page principale
├── style.css              ← tout le style
├── main.js                ← toutes les interactions
├── data/
│   └── photos.json        ← metadata de chaque photo (63 entrées)
├── photos/
│   ├── photo-001.png      ← photos recto (001 à 063)
│   └── verso-002.png      ← annotations manuscrites (002 à 033, avec gaps)
└── tasks/
    ├── todo.md            ← plan de travail en cours
    └── lessons.md         ← erreurs passées et leçons apprises
```

---

## Interactions prévues

- **Flip card CSS 3D** au clic : recto = photo, verso = annotation manuscrite
- **Darkroom reveal** : la photo apparaît progressivement au hover (effet chambre noire)
- **Scatter layout** : photos légèrement inclinées et éparpillées, pas une grille froide
- **Ouverture** : clic sur une carte → agrandissement centré, flottant

---

## Données

Chaque photo dans `data/photos.json` contient :
- `id` — numéro (001 à 063)
- `filename` — nom du fichier recto
- `verso` — nom du fichier verso, ou `null`
- `annotation` — texte manuscrit transcrit, ou `null`
- `lieu` — lieu photographié, ou `null`
- `date` — date de la prise de vue, ou `null`
- `description` — description courte de la scène

---

## Règles importantes

- Code commenté en anglais
- Desktop d'abord, mobile ensuite
- Commits clairs après chaque fonctionnalité : `feat:`, `fix:`, `style:`, `chore:`
- Ne jamais tout reconstruire — modifier progressivement
- Si une décision impacte l'esthétique : demander validation à Lucas avant d'implémenter
