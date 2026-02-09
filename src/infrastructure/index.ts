/**
 * Infrastructure Layer - Central Export Point
 * 
 * This layer contains implementations of adapters, external services,
 * database repositories, and third-party integrations.
 * It implements the interfaces (ports) defined in the domain layer.
 * 
 * Structure:
 * - adapters: Implementations of domain interfaces (adapters)
 * - persistence: Database implementations, ORM configurations
 * - external: External API clients, third-party services
 * - automation: Playwright scripts and automation tools
 * - config: Infrastructure-specific configuration
 */

// Export adapters
// export * from './adapters';

// Export persistence
// export * from './persistence';

// Export external services
export * from './external';

// Export automation
export * from './automation';

// Export infrastructure config
// export * from './config';

