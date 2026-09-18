/**
 * Security & Sanitization Utilities for JAIS E-Penilaian Portal
 */

export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

export const sanitizeObjectStrings = <T extends Record<string, any>>(obj: T): T => {
  const sanitized: Record<string, any> = { ...obj };
  for (const key of Object.keys(sanitized)) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeInput(sanitized[key]);
    }
  }
  return sanitized as T;
};

export const isValidGoogleScriptUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  return trimmed.startsWith('https://script.google.com/') && trimmed.endsWith('/exec');
};
