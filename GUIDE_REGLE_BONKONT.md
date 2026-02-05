# Guide de la Double Règle Bonkont

## 🎯 La Règle Fondamentale

**"Tu Valides, Tu consommes, Tu reçois ou Tu verses, Tu es Quittes"**

C'est Transparent, c'est Équitable, c'est Bonkont.

### 🔴 Données partagées et équitables (carton rouge)

La base doit **restituer fidèlement** les mêmes données pour l’organisateur et pour chaque participant : montants payés, statuts, participants, etc. Si un participant (ex. invité par code) ne peut pas consulter les données qu’il partage avec l’événement, ou voit des données différentes de l’organisateur, c’est une **incohérence inacceptable** — règle Bonkont carton rouge. L’application garantit une lecture systématique depuis le serveur (pas de cache local incohérent) pour que tout le monde voie la même vérité.

---

## 📋 La Double Règle Bonkont

La règle Bonkont repose sur **deux principes fondamentaux** qui garantissent un partage équitable et transparent de **TOUTES les transactions** :

### 1️⃣ La Validation : Qui est concerné ?

**La validation de TOUTE transaction détermine et déclenche la règle Bonkont.**

**Principe universel :** Dès qu'une transaction est validée, elle suit la règle Bonkont selon son type :
- ✅ **Validation collective** : Si tous les participants valident → Tous sont concernés
- ✅ **Validation partielle** : Si seulement certains valident → Seuls ces participants sont concernés
- ✅ **Par défaut** : Si aucune validation explicite → Tous les participants sont concernés (répartition équitable)

**Types de transactions et traitement :**

1. **Contributions au POT** (participant → POT) :
   - ✅ Validées ET déclenchent le partage équitable
   - ✅ La validation détermine QUI est concerné (qui bénéficie de la contribution)
   - ✅ Le partage équitable détermine COMBIEN chacun consomme (montant ÷ nombre de participants concernés)
   - Le participant qui paie verse le montant total, tous les participants concernés consomment leur part
   - **Double règle : Validation + Partage Équitable**

2. **Dépenses/Avances** (participant paie pour le groupe) :
   - ✅ Validées ET déclenchent le partage équitable
   - ✅ La validation détermine QUI consomme
   - ✅ Le partage équitable détermine COMBIEN chacun consomme
   - **Double règle : Validation + Partage Équitable**

3. **Transferts directs** (participant → participant) :
   - ✅ Validés pour traçabilité et transparence
   - ℹ️ Ne déclenchent PAS de partage équitable (paiement direct)
   - La validation confirme que le transfert est accepté

4. **Remboursements POT** (POT → participant) :
   - ✅ Validés pour traçabilité et transparence
   - ℹ️ Ne déclenchent PAS de partage équitable (remboursement direct)
   - La validation confirme que le remboursement est accepté

**Exemple concret :**
- 10 personnes participent à un événement
- Alice effectue une dépense de 30€ pour un repas en ville
- Alice, Bob et Charlie valident cette dépense
- Les 7 autres participants ne valident pas (ils sont restés sur site)
- **Résultat** : Seuls Alice, Bob et Charlie sont concernés par cette dépense

### 2️⃣ Le Partage Équitable : Comment se fait la répartition ?

**Le partage équitable s'applique aux DÉPENSES/AVANCES validées :**

**Toute avance étant validée par les participants, le payeur consomme sa part au prorata, et les autres participants concernés consomment aussi leur part au prorata.**

**Important :** Le partage équitable ne s'applique qu'aux dépenses/avances. Les contributions au POT, transferts directs et remboursements sont des transactions directes qui ne nécessitent pas de partage (mais sont toujours validées pour traçabilité).

#### Principe de base :
- Le **payeur avance le montant TOTAL**
- Le **payeur consomme sa PART** (montant ÷ nombre de participants concernés)
- Chaque **autre participant concerné consomme aussi sa PART** (montant ÷ nombre de participants concernés)
- Le **payeur reçoit le remboursement** des autres participants concernés

#### Exemple concret avec 8 participants :

**Scénario :** kalopic avance 36,61€ pour une dépense validée par tous les participants

**Calcul :**
- Montant total : 36,61€
- Nombre de participants concernés : 8
- Part par personne : 36,61€ ÷ 8 = **4,58€**

**Répartition :**
- kalopic avance : **36,61€**
- kalopic consomme : **4,58€** (sa part)
- Chaque autre participant consomme : **4,58€** (sa part)
- kalopic doit recevoir : 36,61€ - 4,58€ = **32,03€** des 7 autres participants

**Mais attention !** kalopic consomme aussi sa part de toutes les autres dépenses avancées par les autres participants. Donc :

- kalopic avance : 36,61€
- kalopic consomme sa part de sa propre avance : 4,58€
- kalopic consomme sa part des autres avances : 47,75€
- **Total consommé par kalopic : 52,33€**
- **Solde de kalopic : 36,61€ - 52,33€ = -15,72€** (à verser)

---

## 💡 Exemples Pratiques

### Exemple 1 : Repas partagé entre 3 personnes sur 10

**Situation :**
- 10 personnes dans un événement
- Alice, Bob et Charlie sortent prendre un repas
- Alice paie 30€ pour les 3
- Seulement Alice, Bob et Charlie valident cette dépense

**Résultat selon la règle Bonkont :**
- ✅ Seuls Alice, Bob et Charlie sont concernés (validation partielle)
- ✅ Chacun consomme : 30€ ÷ 3 = **10€**
- ✅ Alice a avancé 30€, elle consomme 10€ → elle doit recevoir **20€**
- ✅ Bob et Charlie doivent chacun **10€** à Alice
- ✅ Les 7 autres participants sont exemptés (ils n'ont pas validé)

### Exemple 2 : Courses pour tous validées collectivement

**Situation :**
- 8 personnes dans un événement
- Bob fait des courses pour 40€
- Tous les participants valident cette dépense

**Résultat selon la règle Bonkont :**
- ✅ Tous les 8 participants sont concernés (validation collective)
- ✅ Chacun consomme : 40€ ÷ 8 = **5€**
- ✅ Bob a avancé 40€, il consomme 5€ → il doit recevoir **35€**
- ✅ Chaque autre participant doit **5€** à Bob

### Exemple 3 : Plusieurs dépenses successives

**Situation :**
- 4 personnes dans un événement (Alice, Bob, Charlie, David)
- Alice avance 20€ (validé par tous)
- Bob avance 40€ (validé par tous)
- Charlie avance 60€ (validé par tous)

**Calcul pour Alice :**
- Alice avance : **20€**
- Alice consomme sa part de sa propre avance : 20€ ÷ 4 = **5€**
- Alice consomme sa part de l'avance de Bob : 40€ ÷ 4 = **10€**
- Alice consomme sa part de l'avance de Charlie : 60€ ÷ 4 = **15€**
- **Total consommé par Alice : 30€**
- **Solde d'Alice : 20€ - 30€ = -10€** (à verser)

**Calcul pour Bob :**
- Bob avance : **40€**
- Bob consomme sa part de l'avance d'Alice : 20€ ÷ 4 = **5€**
- Bob consomme sa part de sa propre avance : 40€ ÷ 4 = **10€**
- Bob consomme sa part de l'avance de Charlie : 60€ ÷ 4 = **15€**
- **Total consommé par Bob : 30€**
- **Solde de Bob : 40€ - 30€ = +10€** (à recevoir)

**Résultat final :**
- Alice doit verser 10€
- Bob doit recevoir 10€
- Charlie doit recevoir 30€ (60€ - 30€)
- David doit verser 30€ (0€ - 30€)
- **Total : 0€** (équilibré !)

---

## 🔍 Comment ça fonctionne dans Bonkont ?

### 1. Types de transactions

Bonkont gère **4 types de transactions**, toutes validées selon la règle Bonkont :

**A) Contributions au POT** (participant → POT) :
- Le participant verse le montant total au POT (cagnotte)
- Validé ET partagé équitablement
- Tous les participants concernés consomment leur part au prorata

**B) Dépenses/Avances** (participant paie pour le groupe) :
- Le payeur avance le montant total
- Validé ET partagé équitablement
- La validation détermine qui consomme
- Le partage équitable détermine combien chacun consomme

**C) Transferts directs** (participant → participant) :
- Paiement direct entre participants
- Validé pour traçabilité
- Pas de partage équitable (paiement direct)

**D) Remboursements POT** (POT → participant) :
- Remboursement direct du POT vers un participant
- Validé pour traçabilité
- Pas de partage équitable (remboursement direct)

### 2. Validation

**Pour TOUTES les transactions :**
- ✅ **Validation collective** : Tous les participants valident → Transaction acceptée
- ✅ **Validation partielle** : Seulement certains valident → Transaction acceptée par ces participants
- ✅ **Par défaut** : Si aucune validation explicite → Transaction acceptée par tous (répartition équitable)

**Pour les DÉPENSES/AVANCES spécifiquement :**
- La validation détermine QUI est concerné par le partage équitable
- Si tous valident → Tous consomment leur part
- Si seulement certains valident → Seuls ces participants consomment leur part

### 3. Calcul automatique

Bonkont calcule automatiquement pour **toutes les transactions validées** :
- ✅ La traçabilité complète (qui a payé, qui a reçu, qui a validé)
- ✅ Pour les dépenses/avances : la part de chaque participant concerné
- ✅ Pour les dépenses/avances : la consommation totale de chaque participant
- ✅ Le solde de chaque participant (ce qu'il doit recevoir ou verser)
- ✅ Les transferts nécessaires pour équilibrer les comptes

### 4. Traçabilité complète

Dans votre fiche participant et dans l'export PDF, vous voyez :
- ✅ Toutes les dépenses que vous avez avancées
- ✅ Votre part de consommation pour chaque dépense avancée
- ✅ Toutes les dépenses avancées par d'autres dont vous avez consommé votre part
- ✅ Votre consommation totale
- ✅ Votre solde final

---

## ✅ Avantages de la Règle Bonkont

### 🎯 Transparence Totale
- Chaque participant voit exactement ce qu'il a avancé et consommé
- Tous les calculs sont détaillés et vérifiables
- Aucune ambiguïté sur qui doit quoi à qui

### ⚖️ Équité Garantie
- Chacun consomme sa part au prorata
- Personne ne paie plus que sa part réelle
- La répartition est toujours équitable

### 🤝 Confiance et Simplicité
- La règle est simple et claire
- Les calculs sont automatiques
- Le PDF exporté est un document de référence incontestable

### 💰 Gestion Équilibrée
- Les comptes sont toujours équilibrés
- Les transferts sont calculés automatiquement
- Chacun sait exactement combien il doit recevoir ou verser

---

## 📊 Résumé en 3 Points

1. **Validation Universelle** : La validation de TOUTE transaction (contributions, dépenses, transferts, remboursements) déclenche la règle Bonkont pour traçabilité et transparence
2. **Partage Équitable** : Pour les dépenses/avances validées, chacun consomme sa part au prorata du nombre de participants concernés
3. **Équilibre Garanti** : Pour les dépenses/avances, le payeur avance le total, consomme sa part, et reçoit le remboursement des autres participants concernés

---

## 🎉 La Promesse Bonkont

**"Bonkont fait les comptes, les Amis font le reste"**

Avec la double règle Bonkont :
- ✅ Plus de disputes sur qui doit quoi
- ✅ Plus de calculs compliqués à faire
- ✅ Plus de doutes sur la répartition
- ✅ Juste du partage équitable et transparent

**C'est Transparent, c'est Équitable, c'est Bonkont.**

---

*Dernière mise à jour : 2024*

