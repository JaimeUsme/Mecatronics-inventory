/**
 * TypeScript types for Wispro authentication automation.
 * These types define the structure of authentication data
 * obtained through Playwright automation.
 */

/**
 * Represents a cookie obtained from the browser context
 */
export interface Cookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

/**
 * Result of the Wispro authentication automation process
 */
export interface WisproAuthResult {
  cookies: Cookie[];
  sessionCookie: Cookie | null;
  csrfToken: string | null;
}

/**
 * Credentials for Wispro login
 */
export interface WisproCredentials {
  email: string;
  password: string;
}


