import * as Crypto from 'expo-crypto';

/**
 * Generates a UUID v4 string
 * @returns A UUID v4 string (e.g., "550e8400-e29b-41d4-a716-446655440000")
 */
export function generateUUID(): string {
  return Crypto.randomUUID();
}
