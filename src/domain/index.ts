/**
 * Domain Layer - Central Export Point
 * 
 * This layer contains the core business logic and domain entities.
 * It is completely independent of frameworks, databases, and external services.
 * 
 * Structure:
 * - entities: Domain models representing business concepts
 * - value-objects: Immutable objects that represent domain concepts
 * - repositories: Interfaces defining data access contracts (ports)
 * - services: Domain services containing pure business logic
 * - exceptions: Domain-specific exceptions
 */

// Export domain entities
// export * from './entities';

// Export value objects
// export * from './value-objects';

// Export repository interfaces (ports)
export * from './repositories/inventory.repository.interface';
export * from './repositories/inventory-movement.repository.interface';
export * from './repositories/material.repository.interface';
export * from './repositories/location.repository.interface';
export * from './repositories/service-order-material.repository.interface';

// Export domain services
// export * from './services';

// Export domain exceptions
// export * from './exceptions';

// Export enums
export * from './enums';

