# Arquitectura Hexagonal - NestJS

## Estructura del Proyecto

Este proyecto sigue los principios de **Arquitectura Hexagonal (Ports & Adapters)** combinados con las mejores prácticas de **NestJS** y **TypeScript**.

```
src/
├── domain/              # Capa de Dominio (Núcleo del Negocio)
│   ├── entities/        # Entidades de dominio
│   ├── value-objects/   # Objetos de valor
│   ├── repositories/    # Interfaces de repositorios (Ports)
│   ├── services/        # Servicios de dominio
│   └── exceptions/      # Excepciones de dominio
│
├── application/         # Capa de Aplicación (Casos de Uso)
│   ├── use-cases/       # Casos de uso específicos
│   ├── services/        # Servicios de aplicación
│   ├── dto/            # DTOs de aplicación
│   └── mappers/        # Mapeadores entre capas
│
├── infrastructure/      # Capa de Infraestructura (Adaptadores)
│   ├── adapters/        # Implementaciones de interfaces (Adapters)
│   ├── persistence/     # Persistencia de datos
│   ├── external/        # Servicios externos
│   ├── automation/      # Scripts de automatización (Playwright)
│   └── config/         # Configuración de infraestructura
│
├── presentation/       # Capa de Presentación (Interfaces)
│   ├── controllers/     # Controladores HTTP
│   ├── dto/            # DTOs de API
│   ├── decorators/      # Decoradores personalizados
│   ├── filters/         # Filtros de excepciones
│   ├── guards/          # Guards de autenticación/autorización
│   ├── interceptors/    # Interceptores
│   └── pipes/          # Pipes de validación
│
├── shared/             # Capa Compartida
│   ├── exceptions/      # Excepciones compartidas
│   ├── utils/          # Utilidades
│   ├── constants/       # Constantes
│   ├── types/          # Tipos compartidos
│   ├── decorators/      # Decoradores compartidos
│   └── validators/      # Validadores
│
├── config/             # Configuración
│   └── *.config.ts     # Archivos de configuración
│
├── app.module.ts       # Módulo raíz
└── main.ts            # Punto de entrada
```

## Principios de la Arquitectura

### 1. Domain Layer (Capa de Dominio)
- **Independiente**: No depende de frameworks, bases de datos o servicios externos
- **Lógica de negocio pura**: Contiene las reglas de negocio y validaciones
- **Ports (Interfaces)**: Define contratos que serán implementados en otras capas
- **Entidades**: Modelos de dominio con comportamiento
- **Value Objects**: Objetos inmutables que representan conceptos del dominio

### 2. Application Layer (Capa de Aplicación)
- **Orquestación**: Coordina la lógica de dominio para cumplir casos de uso
- **Casos de uso**: Cada caso de uso representa una operación de negocio específica
- **Independiente de UI**: No conoce detalles de HTTP, GraphQL, etc.
- **Depende solo de Domain**: Solo depende de la capa de dominio

### 3. Infrastructure Layer (Capa de Infraestructura)
- **Implementaciones**: Implementa las interfaces definidas en Domain (Adapters)
- **Tecnologías específicas**: Contiene código específico de frameworks, bases de datos, APIs externas
- **Adaptadores**: Conecta el dominio con el mundo exterior
- **Automation**: Scripts de Playwright para automatización

### 4. Presentation Layer (Capa de Presentación)
- **Interfaces externas**: HTTP, GraphQL, WebSockets, CLI
- **Controladores**: Manejan requests y responses
- **DTOs**: Definen contratos de API
- **Validación**: Valida datos de entrada

### 5. Shared Layer (Capa Compartida)
- **Utilidades**: Funciones reutilizables
- **Excepciones base**: Excepciones compartidas
- **Constantes**: Valores constantes de la aplicación

## Flujo de Datos

```
Request → Presentation (Controller) 
       → Application (Use Case) 
       → Domain (Entity/Service) 
       → Infrastructure (Repository Adapter) 
       → Database/External Service
```

## Dependencias

- **Domain**: No depende de nada (capa más interna)
- **Application**: Depende solo de Domain
- **Infrastructure**: Depende de Domain (implementa sus interfaces)
- **Presentation**: Depende de Application y Domain
- **Shared**: Puede ser usado por todas las capas

## Ventajas

1. **Testabilidad**: Fácil de testear cada capa de forma aislada
2. **Mantenibilidad**: Código organizado y fácil de mantener
3. **Escalabilidad**: Fácil agregar nuevas funcionalidades
4. **Independencia**: El dominio no depende de tecnologías específicas
5. **Flexibilidad**: Fácil cambiar implementaciones sin afectar el dominio

## Ejemplo de Uso

### 1. Definir Port en Domain
```typescript
// domain/repositories/IAuthenticationRepository.ts
export interface IAuthenticationRepository {
  login(credentials: Credentials): Promise<Session>;
}
```

### 2. Implementar Adapter en Infrastructure
```typescript
// infrastructure/adapters/repositories/AuthenticationRepository.ts
@Injectable()
export class AuthenticationRepository implements IAuthenticationRepository {
  async login(credentials: Credentials): Promise<Session> {
    // Implementación concreta
  }
}
```

### 3. Crear Use Case en Application
```typescript
// application/use-cases/LoginUseCase.ts
@Injectable()
export class LoginUseCase {
  constructor(
    @Inject('IAuthenticationRepository')
    private authRepo: IAuthenticationRepository
  ) {}
  
  async execute(credentials: Credentials): Promise<SessionDto> {
    // Lógica de caso de uso
  }
}
```

### 4. Exponer en Presentation
```typescript
// presentation/controllers/AuthenticationController.ts
@Controller('auth')
export class AuthenticationController {
  constructor(private loginUseCase: LoginUseCase) {}
  
  @Post('login')
  async login(@Body() dto: LoginRequestDto) {
    return this.loginUseCase.execute(dto);
  }
}
```

## Scripts de Automatización

El módulo de automatización (`infrastructure/automation`) contiene scripts de Playwright para:
- Login automatizado en Wispro
- Extracción de cookies de sesión
- Obtención de tokens CSRF

Este módulo puede ser usado por casos de uso de aplicación para automatizar procesos de autenticación.

