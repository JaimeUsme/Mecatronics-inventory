/**
 * Application Configuration
 * 
 * Main configuration file that loads and validates
 * environment variables and provides application settings.
 * 
 * Note: To use @nestjs/config, install: npm install @nestjs/config
 * Then uncomment the registerAs import and usage below.
 */

// import { registerAs } from '@nestjs/config';

// export default registerAs('app', () => ({
//   port: process.env.PORT || 3000,
//   env: process.env.NODE_ENV || 'development',
//   name: process.env.APP_NAME || 'wispro-automation',
// }));

export const appConfig = {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',
  name: process.env.APP_NAME || 'wispro-automation',
};

