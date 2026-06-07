import { URL } from 'url';

export function normalizeUsername(value: string, fieldName = 'Username', allowAtPrefix = false): string {
  let cleaned = value.toLowerCase().trim();
  if (allowAtPrefix && cleaned.startsWith('@')) {
    cleaned = cleaned.substring(1);
  }
  if (!cleaned) {
    throw new Error(`${fieldName} cannot be blank`);
  }
  if (cleaned.length < 3 || cleaned.length > 24) {
    throw new Error(`${fieldName} must be between 3 and 24 characters`);
  }
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned.charCodeAt(i) < 32) {
      throw new Error(`${fieldName} contains unsupported control characters`);
    }
  }
  if (!/^[a-z0-9_]+$/.test(cleaned)) {
    throw new Error(`${fieldName} may contain only letters, numbers, and underscores`);
  }
  return cleaned;
}

export function normalizeRequiredText(value: string, fieldName: string): string {
  const cleaned = value.trim();
  if (!cleaned) {
    throw new Error(`${fieldName} cannot be blank`);
  }
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned.charCodeAt(i) < 32) {
      throw new Error(`${fieldName} contains unsupported control characters`);
    }
  }
  return cleaned;
}

export function normalizeOptionalText(value: string | null | undefined, fieldName: string): string | null {
  if (value === null || value === undefined) return null;
  const cleaned = value.trim();
  if (!cleaned) return null;
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned.charCodeAt(i) < 32) {
      throw new Error(`${fieldName} contains unsupported control characters`);
    }
  }
  return cleaned;
}

export function normalizeBioText(value: string): string {
  const cleaned = value.trim();
  if (!cleaned) return '';
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned.charCodeAt(i) < 32) {
      throw new Error(`Bio contains unsupported control characters`);
    }
  }
  return cleaned;
}

export function validateProfileImageURL(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const cleaned = value.trim();
  if (!cleaned) return null;
  let parsed: URL;
  try {
    parsed = new URL(cleaned);
  } catch (error) {
    throw new Error('Avatar URL must be a valid HTTP or HTTPS URL');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Avatar URL must be a valid HTTP or HTTPS URL');
  }
  if (parsed.username || parsed.password) {
    throw new Error('Avatar URL must not include credentials');
  }
  if (parsed.hash) {
    throw new Error('Avatar URL must not include a URL fragment');
  }

  if (parsed.protocol !== 'https:') {
    const hostname = parsed.hostname.toLowerCase();
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      throw new Error('Avatar URL must use HTTPS unless it targets localhost');
    }
  }
  return cleaned;
}

export function validatePassword(value: string): string {
  if (!value || !value.trim()) {
    throw new Error('Password cannot be blank');
  }
  if (value.length < 10) {
    throw new Error('Password must be at least 10 characters long');
  }
  for (let i = 0; i < value.length; i++) {
    if (value.charCodeAt(i) < 32) {
      throw new Error('Password contains unsupported control characters');
    }
  }
  return value;
}
export function normalizeEmail(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error('Email cannot be blank.');
  }
  // Simple regex check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new Error('Email must be a valid email address.');
  }
  return trimmed.toLowerCase();
}
