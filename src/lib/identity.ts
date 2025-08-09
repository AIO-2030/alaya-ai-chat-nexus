import { Principal } from '@dfinity/principal';
import { getPrincipalFromII } from './ii';

// Identity Provider (II) URL can be configured via env, defaults to ic0.app
const DEFAULT_II_URL = 'https://identity.ic0.app';

export const getIIUrl = (): string => {
  const fromEnv = (import.meta as any).env?.VITE_II_URL as string | undefined;
  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_II_URL;
};

// Try to derive a stable pseudo principal when II is not integrated yet.
export const deriveStablePseudoPrincipal = (seed: string): string => {
  // Simple stable mapping using Principal.fromText fallback strategy
  // In practice, replace with a deterministic derivation that matches backend.
  const encoder = new TextEncoder();
  const data = encoder.encode(seed);
  // Create a simple CRC-like sum to make it deterministic and short
  let sum = 0;
  for (let i = 0; i < data.length; i += 1) sum = (sum + data[i]) % 65536;
  const hex = sum.toString(16).padStart(4, '0');
  // Use a fixed dev principal prefix with the hex tail to ensure valid format in dev/mock
  // Note: This is NOT a real principal derivation.
  const pseudo = `2vxsx-fae-${hex}`;
  try {
    // Validate it is syntactically acceptable by Principal parser
    return Principal.fromText(pseudo).toText();
  } catch {
    return '2vxsx-fae';
  }
};

export const generatePrincipalForNonPlug = async (_seed: string): Promise<string> => {
  // Use real Internet Identity flow
  return getPrincipalFromII();
};

