/**
 * Presentation Layer - Central Export Point
 * 
 * This layer contains controllers, DTOs, and interfaces that handle
 * incoming requests and format responses. It's the entry point for
 * external clients (REST APIs, GraphQL, WebSockets, etc.).
 * 
 * Structure:
 * - controllers: HTTP controllers, GraphQL resolvers, WebSocket handlers
 * - dto: Request/Response DTOs for API contracts
 * - decorators: Custom decorators for validation, authorization, etc.
 * - filters: Exception filters, response interceptors
 * - guards: Authentication and authorization guards
 * - interceptors: Request/response transformation interceptors
 * - pipes: Validation and transformation pipes
 */

// Export controllers
export * from './controllers';

// Export DTOs
export * from './dto';

// Export decorators
// export * from './decorators';

// Export filters
// export * from './filters';

// Export guards
// export * from './guards';

// Export interceptors
// export * from './interceptors';

// Export pipes
// export * from './pipes';

