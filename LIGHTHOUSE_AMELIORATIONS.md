# Améliorations Lighthouse (BONKONT)

## Corrections appliquées

### SEO (91 → objectif 100)
- **robots.txt** : Création de `public/robots.txt` (User-agent: * / Allow: /). Auparavant, Firebase renvoyait `index.html` pour `/robots.txt`, ce qui provoquait les 20 erreurs « Syntax not understood ». Vite copie `public/robots.txt` dans `dist/`, Firebase sert ce fichier avant la règle SPA.

### Accessibilité (84 → objectif 90+)
- **Noms accessibles des boutons** : Ajout d’`aria-label` sur les boutons icône (Paramètres, Changer le thème, Retour, Synchroniser, Export PDF, Copier le code, QR code, Partager la localisation, Mois précédent/suivant, etc.).
- **Hiérarchie des titres** : Le bloc « Qui verse combien à qui ? » utilise maintenant un `<h2>` au lieu d’un `<h3>` pour respecter l’ordre h1 → h2 (éviter un saut h1 → h3).
- **Contraste** : Ajustement de `--muted-foreground` (thème clair : 38 % au lieu de 46 % ; thème sombre : 72 % au lieu de 65 %) pour améliorer la lisibilité du texte secondaire.

### Bonnes pratiques
- Déjà à 100 ; pas de changement.

---

## Performance (69) – recommandations

Lighthouse signale notamment :
- **IndexedDB** : Faire l’audit en navigation privée pour éviter l’impact des données locales sur le score.
- **Chargement lent** : Réduire le JavaScript inutilisé (~358 Kio), le temps d’exécution (~1,5 s) et le travail du thread principal (~3,4 s).
- **Cache** : Utiliser des durées de cache efficaces (économie estimée ~600 Kio) ; requêtes de blocage de l’affichage (~450 ms).
- **Tâches longues** : Éviter les tâches longues sur le thread principal (8 détectées).
- **Animations** : Privilégier les animations composées (10 éléments animés non composés).

Pistes techniques (à traiter progressivement) :
1. **Code splitting** : `React.lazy()` + `Suspense` pour les écrans lourds (EventManagement, TransactionManagement, EventClosure).
2. **Bundle** : Analyser avec `vite build --mode production` puis un analyseur de bundle pour cibler les gros modules (Firebase, jspdf, recharts, etc.).
3. **Cache HTTP** : Headers de cache adaptés côté Firebase Hosting (fichiers hashés en long cache, index.html sans cache ou court).
4. **Critical CSS** : Réduire le CSS bloquant si possible (Tailwind purge déjà actif).

---

## Relancer un audit

1. En navigation privée : éviter l’impact d’IndexedDB / extensions.
2. URL : `https://bonkont-48a2c.web.app/` (ou une page événement après déploiement).
3. Après déploiement : vérifier que `https://bonkont-48a2c.web.app/robots.txt` renvoie bien le fichier texte et plus l’HTML.
