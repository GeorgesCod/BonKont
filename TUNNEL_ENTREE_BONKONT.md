# 🎯 Tunnel d'Entrée Bonkont - Vision Produit & Implémentation

## 📋 Problème Résumé

**Le point critique d'adoption de Bonkont** : Si l'entrée n'est pas évidente + sécurisée + guidée, l'événement échoue avant même de commencer.

### Situation Actuelle (Problèmes identifiés)

❌ Le participant reçoit le code/QR mais :
- Ne sait pas où le saisir
- Ne sait pas comment le QR l'authentifie
- Ne sait pas comment Bonkont sait qui il est
- Ne sait pas s'il est accepté ou non

❌ L'organisateur veut garder la main mais :
- Pas d'interface claire pour valider/refuser
- Pas de moyen d'ajouter manuellement
- Pas de statut visible pour modérer

## ✅ Solution Bonkont (Simple, Robuste, Scalable)

### 🧭 1. Point d'Entrée Universel (OBLIGATOIRE)

**📍 Où ?**
- **Écran d'accueil** : Bouton principal très visible "➕ Rejoindre un évènement"
- **Menu** : Toujours accessible
- **Dashboard** : Visible même si vide ou non
- **Jamais caché**

### 🧩 2. Écran "Rejoindre un évènement"

**Contenu unique :**
- **A) Entrée par code**
  - Champ : Code événement `[ PIL-RTSEA ]`
  - Bouton : `[ Rejoindre ]`

- **B) Entrée par QR code**
  - Bouton : `[ 📷 Scanner un QR code ]`
  - Ouvre le scanner de caméra

👉 **Même logique derrière, seul le moyen change.**

### 🔐 3. Sécurité & Authentification (TRÈS IMPORTANT)

#### Cas 1 — Utilisateur NON connecté

1. Il saisit le code / scanne le QR
2. Bonkont affiche :
   ```
   "Pour rejoindre cet évènement, merci de confirmer votre identité"
   ```
3. Choix :
   - Se connecter
   - Créer un compte (email / mot de passe / Google)

👉 **Le code n'ouvre JAMAIS l'événement sans identité.**

#### Cas 2 — Utilisateur déjà connecté

Le code est associé à :
- `userId`
- `email`
- `name` (modifiable)

### 🧠 4. Ce que fait réellement le code / QR

**Le code NE DONNE PAS accès directement.**

Il permet uniquement de :
→ **créer une DEMANDE DE PARTICIPATION**

**Structure logique :**
```javascript
{
  eventCode: "PIL-RTSEA",
  userId: "abc123",
  email: "paul@mail.com",
  name: "Paul",
  status: "pending"  // ⚠️ Toujours pending au départ
}
```

### 👑 5. Rôle de l'Organisateur (ADMIN)

**À la création de l'événement :**
- L'organisateur devient :
  - `role = "organizer"`
  - `permissions = all`

**Dans son dashboard événement :**
- **Onglet : Participants**

**👤 Liste organisée :**
- ✅ **Confirmés** (status: 'confirmed')
- ⏳ **En attente** (status: 'pending')
- ❌ **Refusés** (status: 'rejected')

**Actions admin :**
- ✅ **Accepter** → status: 'confirmed'
- ❌ **Refuser** → status: 'rejected'
- ✉️ **Relancer** (renvoyer invitation)
- ➕ **Ajouter manuellement un participant**

### ✉️ 6. Ajout Manuel (Clé pour Adoption)

**Organisateur peut :**
1. Cliquer "➕ Ajouter un participant"
2. Remplir :
   - Nom : `_______`
   - Email : `_______`
3. Cliquer `[ Envoyer invitation ]`

**➡️ Bonkont :**
- Crée un lien pré-rempli unique
- Ou un code unique temporaire
- Envoie un email :
  ```
  "Vous êtes invité à l'événement Voyage Madrid — cliquez pour rejoindre"
  ```

👉 **Parfait pour :**
- Parents
- Amis moins à l'aise
- Gens sans QR

### 🟡 7. Statut Côté Participant (Transparence)

**Quand le participant rejoint via code :**

**Écran immédiat :**
```
🎒 Voyage à Madrid
Organisé par : Georges

⏳ En attente de validation par l'organisateur
```

**Puis :**
- ✅ Notification quand accepté → accès total
- ❌ Notification si refusé → message explicatif
- ⏳ Pas d'accès tant que status !== 'confirmed'

### 🔒 8. Sécurité Anti-Abus (Important)

**Le code événement :**
- ❌ Ne donne pas accès aux données
- ❌ Ne permet aucune action financière
- ❌ Ne permet pas de voir les transactions

**Tant que :**
- ❌ Non accepté (status !== 'confirmed')
- ❌ Pas de validation par l'organisateur

➡️ **Lecture seule OU rien du tout**

### 🧠 9. Résumé en 1 Phrase (Produit)

> **Le code / QR Bonkont ne donne pas accès à un événement. Il permet de demander à y entrer, avec une identité vérifiée, sous le contrôle de l'organisateur.**

---

## 🎯 Ce qui doit être Implémenté (Priorité Produit)

### ✅ Checklist Implémentation

- [ ] **1. Bouton "Rejoindre un évènement"**
  - [ ] Sur l'écran d'accueil (non connecté)
  - [ ] Dans le header/menu (toujours visible)
  - [ ] Dans le dashboard (même si vide)

- [ ] **2. Écran unique Code / QR**
  - [ ] Champ code événement
  - [ ] Bouton scanner QR code
  - [ ] Intégration scanner caméra (bibliothèque QR)

- [ ] **3. Auth obligatoire**
  - [ ] Vérifier si connecté avant de permettre la demande
  - [ ] Si non connecté → ouvrir AuthDialog
  - [ ] Après connexion → continuer la demande

- [ ] **4. Statut pending / accepted / rejected**
  - [ ] Toujours créer avec status: 'pending'
  - [ ] Interface admin pour changer le statut
  - [ ] Affichage clair côté participant

- [ ] **5. Organisateur = admin + ajout manuel**
  - [ ] Interface admin dans EventManagement
  - [ ] Liste séparée par statut
  - [ ] Boutons accepter/refuser
  - [ ] Formulaire ajout manuel
  - [ ] Génération lien/code unique pour invitation

- [ ] **6. Message clair côté participant**
  - [ ] Écran "En attente de validation"
  - [ ] Notification quand accepté/refusé
  - [ ] Redirection vers événement si accepté

---

## 🔥 Punchline Bonkont (UX)

> **"Un code suffit pour demander à rejoindre. Un organisateur décide. Bonkont sécurise."**

---

## 📊 Flow Complet (Écran par Écran)

### Flow Participant

1. **Accueil** → Bouton "Rejoindre un évènement"
2. **Écran Rejoindre** → Saisir code OU scanner QR
3. **Si non connecté** → AuthDialog (connexion/création compte)
4. **Après auth** → Création demande (status: 'pending')
5. **Écran Attente** → "En attente de validation par l'organisateur"
6. **Notification** → "Vous avez été accepté(e) !"
7. **Accès événement** → Dashboard complet

### Flow Organisateur

1. **Création événement** → Devient organizer automatiquement
2. **Dashboard événement** → Onglet "Participants"
3. **Voir demandes** → Liste "En attente"
4. **Actions** → Accepter / Refuser / Ajouter manuellement
5. **Notification** → Participant informé automatiquement

---

## 🔧 Détails Techniques

### Modèle de Données

```javascript
// Event
{
  id: "...",
  code: "PIL-RTSEA",
  organizerId: "user@email.com",
  organizerName: "Georges",
  participants: [
    {
      id: 1,
      userId: "user@email.com",  // Si connecté
      email: "user@email.com",
      name: "Paul",
      status: "pending" | "confirmed" | "rejected",
      isOrganizer: true,  // Pour l'organisateur
      // ... autres champs
    }
  ]
}
```

### Routes

- `#/join` → Écran rejoindre (code/QR)
- `#/join/CODE` → Écran rejoindre avec code pré-rempli
- `#/event/ID` → Dashboard événement (si confirmé)

### Sécurité

- Code événement = public (peut être partagé)
- userId = privé (authentification requise)
- status = 'pending' par défaut (pas d'accès)
- Seul l'organisateur peut changer le status

---

## 📝 Notes d'Implémentation

### Bibliothèques Nécessaires

- **QR Code Scanner** : `react-qr-reader` ou `html5-qrcode`
- **QR Code Generator** : Déjà présent (`QRCode` component)

### Composants à Créer/Modifier

1. **`EventJoin.jsx`** → Modifier pour auth obligatoire
2. **`QRCodeScanner.jsx`** → Nouveau composant
3. **`App.jsx`** → Ajouter bouton "Rejoindre" partout
4. **`EventManagement.jsx`** → Interface admin complète
5. **`AuthDialog.jsx`** → Intégrer dans flow de rejoindre

### États à Gérer

- `isAuthenticated` → Vérifier avant de créer demande
- `pendingRequests` → Liste des demandes en attente
- `eventAccess` → Vérifier status avant d'afficher contenu

---

## ✅ Critères de Succès

1. ✅ Un utilisateur non connecté peut trouver "Rejoindre" en < 3 clics
2. ✅ Le code/QR ne donne jamais accès direct sans auth
3. ✅ L'organisateur voit clairement toutes les demandes
4. ✅ Le participant sait toujours où il en est (statut visible)
5. ✅ L'ajout manuel fonctionne et envoie une invitation

---

**Date de création** : 2024
**Version** : 1.0
**Statut** : À implémenter

