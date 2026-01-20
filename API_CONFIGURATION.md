# Configuration de l'API BONKONT

## Configuration de l'URL de l'API

L'application BONKONT utilise une API backend pour rechercher les événements par code. Vous devez configurer l'URL de cette API.

### Méthode 1 : Fichier .env (Recommandé)

1. Créez un fichier `.env` à la racine du projet
2. Ajoutez la ligne suivante avec l'URL de votre API :

```env
VITE_API_BASE_URL=https://votre-api-backend.com/api
```

**Exemples :**
- Production : `VITE_API_BASE_URL=https://bonkont-api.web.app/api`
- Développement local : `VITE_API_BASE_URL=http://localhost:3000/api`
- Autre serveur : `VITE_API_BASE_URL=https://api.bonkont.com/api`

### Méthode 2 : Modification directe du code

Si vous ne souhaitez pas utiliser de variables d'environnement, vous pouvez modifier directement le fichier `src/services/api.js` :

```javascript
const API_BASE_URL = 'https://votre-api-backend.com/api';
```

### Vérification de la configuration

Lors du développement, l'URL utilisée est affichée dans la console du navigateur :
```
[API] Base URL configured: https://votre-api-backend.com/api
```

### Endpoints requis

L'API backend doit implémenter les endpoints suivants :

#### 1. Recherche d'événement par code
- **URL** : `GET /api/events/code/:code`
- **Paramètres** : `code` (string, 8 caractères alphanumériques)
- **Réponse** : 
  - `200 OK` : Objet événement
  - `404 Not Found` : Événement non trouvé

**Exemple de réponse :**
```json
{
  "id": "event-id-123",
  "code": "VKCKVSOB",
  "title": "Voyage en Italie",
  "description": "Description de l'événement",
  "organizerId": "organizer@email.com",
  "startDate": "2024-01-15",
  "endDate": "2024-01-20",
  "participants": [...],
  ...
}
```

#### 2. Création d'une demande de participation (optionnel)
- **URL** : `POST /api/events/:eventId/participants`
- **Body** : 
```json
{
  "userId": "user@email.com",
  "name": "Nom du participant",
  "email": "participant@email.com"
}
```

### Notes importantes

- Le fichier `.env` est ignoré par Git (ne sera pas commité)
- Les variables d'environnement doivent commencer par `VITE_` pour être accessibles dans le code
- Après modification du fichier `.env`, redémarrez le serveur de développement (`npm run dev`)
- Pour la production, configurez les variables d'environnement dans votre plateforme de déploiement (Firebase, Vercel, etc.)

