import { nanoid } from 'nanoid';

export function generateEventCode(): string {
  // Génère un code alphanumérique de 4 caractères
  return nanoid(4).toUpperCase();
}

export function validateEventCode(code: string): boolean {
  // Vérifie que le code est valide (4 caractères alphanumériques)
  return /^[A-Z0-9]{4}$/.test(code);
}

export function hashEventCode(code: string): string {
  // Simple hachage pour le stockage sécurisé
  // Dans une vraie application, utilisez une fonction de hachage cryptographique
  return btoa(code);
}

export function verifyEventCode(code: string, hashedCode: string): boolean {
  return hashEventCode(code) === hashedCode;
}