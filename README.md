# bolt-split-payment

[Edit in StackBlitz next generation editor ⚡️](https://stackblitz.com/~/github.com/donvito/bolt-split-payment)

## Configuration OCR avec GPT-4 Vision (Recommandé)

Pour utiliser GPT-4 Vision au lieu de Tesseract OCR (plus rapide et plus précis) :

1. Créez un fichier `.env` à la racine du projet
2. Ajoutez votre clé API OpenAI :
   ```
   VITE_OPENAI_API_KEY=votre_cle_api_openai_ici
   ```
3. Obtenez votre clé API sur https://platform.openai.com/api-keys

L'application utilisera automatiquement GPT-4 Vision si la clé API est configurée. Sinon, vous pouvez basculer manuellement entre Tesseract et GPT-4 Vision via le toggle dans l'interface.

### Avantages de GPT-4 Vision :
- ✅ Plus rapide (quelques secondes vs plusieurs secondes/minutes)
- ✅ Plus précis pour les factures françaises
- ✅ Extraction directe des données structurées (JSON)
- ✅ Meilleure gestion des images floues ou inclinées