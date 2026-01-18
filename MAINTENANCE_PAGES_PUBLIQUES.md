# Maintenance des Pages Publiques - Bonkont

## 📋 Vue d'ensemble

Ce document décrit le système de maintenance et de mise à jour automatique des pages publiques de Bonkont. Les pages publiques incluent :

- **FAQ** : Questions fréquentes
- **TermsOfService** : Conditions générales d'utilisation
- **PrivacyPolicy** : Politique de confidentialité
- **Contact** : Page de contact
- **SettingsDialog (Help Tab)** : Onglet Aide avec guide Bonkont

## 🔄 Système de Versioning

Le système de versioning est géré par `src/utils/publicPagesVersion.js` qui :
- Suit la version actuelle des pages publiques
- Documente les changements importants
- Liste les pages à mettre à jour lors de modifications

**Version actuelle : 2.0.0** (Tunnel d'entrée + Validation participants)

## 📝 Processus de Mise à Jour

### Quand mettre à jour les pages publiques ?

Les pages publiques doivent être mises à jour lors de :
- ✅ Ajout de nouvelles fonctionnalités majeures
- ✅ Changements dans le processus d'authentification
- ✅ Modifications des règles de partage/validation
- ✅ Nouveaux types de données collectées
- ✅ Changements dans le flux utilisateur
- ✅ Ajout de nouvelles méthodes de participation

### Étapes de mise à jour

1. **Mettre à jour les traductions** (`src/lib/i18n.js`)
   - Ajouter les nouvelles clés de traduction en FR et EN
   - Vérifier la cohérence des traductions

2. **Mettre à jour les composants**
   - `FAQ.jsx` : Ajouter/modifier les questions pertinentes
   - `TermsOfService.jsx` : Mettre à jour les sections concernées
   - `PrivacyPolicy.jsx` : Ajouter les nouvelles données collectées
   - `Contact.jsx` : Mettre à jour si nécessaire

3. **Mettre à jour le système de versioning**
   - Incrémenter la version dans `publicPagesVersion.js`
   - Documenter les changements dans `changes[]`
   - Lister les pages affectées

4. **Vérifications**
   - ✅ Toutes les nouvelles fonctionnalités sont documentées
   - ✅ Les traductions FR et EN sont complètes
   - ✅ Les pages publiques reflètent les changements
   - ✅ Pas de texte en dur dans les composants
   - ✅ Les liens et références sont à jour

5. **Tests**
   - Tester dans les deux langues (FR/EN)
   - Vérifier que toutes les clés de traduction existent
   - Vérifier l'affichage sur mobile et desktop

## 📚 Dernières Mises à Jour

### Version 2.0.0 (2024-12-19) - Tunnel d'entrée

**Pages affectées :**
- FAQ
- TermsOfService
- PrivacyPolicy

**Modifications :**

1. **FAQ** :
   - Ajout de `faqQ7` : "Comment rejoindre un événement ?"
   - Ajout de `faqQ8` : "Le code événement donne-t-il un accès direct ?"
   - Ajout de `faqQ9` : "Que faire si ma demande de participation est en attente ?"
   - Ajout de `faqQ10` : "Puis-je créer plusieurs événements en même temps ?"

2. **TermsOfService** :
   - Mise à jour de `termsAccess1` : Mention du QR code
   - Ajout de `termsAccess2` : Le code ne donne pas un accès direct
   - Ajout de `termsAccess3` : Seuls les participants validés peuvent accéder
   - Ajout de `termsAccess4` : Authentification obligatoire

3. **PrivacyPolicy** :
   - Mise à jour de `privacyDataEventParticipants` : Mention du statut de validation
   - Ajout de `privacyDataEventRequests` : Demandes de participation

## 🔍 Checklist de Vérification

Avant de déployer, vérifier :

- [ ] Toutes les nouvelles fonctionnalités sont documentées dans la FAQ
- [ ] Les CGU reflètent les nouveaux processus (validation, authentification)
- [ ] La politique de confidentialité mentionne toutes les nouvelles données
- [ ] Les traductions FR et EN sont complètes et cohérentes
- [ ] Pas de texte en dur dans les composants
- [ ] Les icônes et styles sont cohérents
- [ ] Les liens fonctionnent correctement
- [ ] L'affichage est correct sur mobile et desktop
- [ ] Le système de versioning est à jour

## 🛠️ Outils et Fichiers

- **Traductions** : `src/lib/i18n.js`
- **Versioning** : `src/utils/publicPagesVersion.js`
- **FAQ** : `src/components/FAQ.jsx`
- **CGU** : `src/components/TermsOfService.jsx`
- **Confidentialité** : `src/components/PrivacyPolicy.jsx`
- **Contact** : `src/components/Contact.jsx`
- **Aide** : `src/components/SettingsDialog.jsx` (onglet Help)

## 📖 Guide de Traduction

### Structure des clés de traduction

Les clés suivent une convention de nommage :
- `faqQ[N]` : Question FAQ numéro N
- `faqA[N]` : Réponse FAQ numéro N
- `terms[Section][Item]` : Section des CGU
- `privacy[Section][Item]` : Section de la politique de confidentialité
- `contact[Item]` : Éléments de la page de contact

### Bonnes pratiques

1. **Cohérence** : Utiliser le même ton et style dans toutes les traductions
2. **Clarté** : Les textes doivent être compréhensibles par tous
3. **Exhaustivité** : Toutes les fonctionnalités doivent être documentées
4. **Actualité** : Les pages doivent refléter l'état actuel de l'application

## 🚀 Déploiement

Après avoir mis à jour les pages publiques :

1. Vérifier la checklist ci-dessus
2. Tester localement dans les deux langues
3. Commiter les changements avec un message clair
4. Déployer sur Firebase

## 📞 Support

Pour toute question sur la maintenance des pages publiques :
- Consulter `src/utils/publicPagesVersion.js` pour la version actuelle
- Vérifier les changements documentés dans `MAINTENANCE_PAGES_PUBLIQUES.md`
- Contacter l'équipe de développement si nécessaire

