/**
 * JWT Configuration
 * 
 * Configuración para JWT tokens.
 * En producción, usa variables de entorno para el secret.
 */
export const jwtConfig = {
  secret: process.env.JWT_SECRET || 'wispro-secret-key-change-in-production',
  expiresIn: process.env.JWT_EXPIRES_IN || '24h', // 24 horas
};

