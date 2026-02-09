/**
 * Application Layer - Central Export Point
 * 
 * This layer contains use cases and application services that orchestrate
 * domain logic. It acts as a bridge between the presentation layer and the domain layer.
 * 
 * Structure:
 * - use-cases: Application use cases (command/query handlers)
 * - services: Application services that coordinate domain operations
 * - dto: Data Transfer Objects for application layer
 * - mappers: Converters between domain entities and DTOs
 */

// Export use cases
export * from './use-cases';

// Export application services
// export * from './services';

// Export DTOs
// export * from './dto';

// Export mappers
export * from './mappers';

