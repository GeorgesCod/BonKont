import { nanoid, customAlphabet } from 'nanoid';

// Alphabet personnalisé : uniquement les lettres majuscules
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function generateEventCode() {
  // Génère un code de 8 caractères avec uniquement des lettres majuscules
  const generateCode = customAlphabet(alphabet, 8);
  return generateCode();
}

export function validateEventCode(code) {
  // Vérifie que le code est valide (8 caractères, lettres majuscules uniquement)
  return /^[A-Z]{8}$/.test(code.toUpperCase());
}

export function hashEventCode(code) {
  // Simple hachage pour le stockage sécurisé
  // Dans une vraie application, utilisez une fonction de hachage cryptographique
  return btoa(code);
}

export function verifyEventCode(code, hashedCode) {
  return hashEventCode(code) === hashedCode;
}