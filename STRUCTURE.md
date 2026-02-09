# Estructura Completa del Proyecto

## 📂 Árbol de Directorios

```
obtener cookie wispro/
│
├── src/                                    # Código fuente principal
│   │
│   ├── main.ts                            # ⚙️ Punto de entrada de la aplicación NestJS
│   ├── app.module.ts                      # 📦 Módulo raíz que configura toda la aplicación
│   │
│   ├── domain/                            # 🏛️ CAPA DE DOMINIO (Núcleo del Negocio)
│   │   ├── index.ts                       # Exportaciones centralizadas del dominio
│   │   ├── entities/                      # Entidades de dominio (modelos de negocio)
│   │   │   └── .gitkeep
│   │   ├── value-objects/                 # Objetos de valor inmutables
│   │   │   └── .gitkeep
│   │   ├── repositories/                  # Interfaces de repositorios (Ports)
│   │   │   └── .gitkeep
│   │   ├── services/                      # Servicios de dominio (lógica de negocio pura)
│   │   │   └── .gitkeep
│   │   └── exceptions/                    # Excepciones específicas del dominio
│   │       └── .gitkeep
│   │
│   ├── application/                       # 🎯 CAPA DE APLICACIÓN (Casos de Uso)
│   │   ├── index.ts                       # Exportaciones centralizadas de aplicación
│   │   ├── use-cases/                     # Casos de uso específicos del negocio
│   │   │   └── .gitkeep
│   │   │   # Ejemplo: authentication/LoginUseCase.ts
│   │   ├── services/                      # Servicios de aplicación (orquestación)
│   │   │   └── .gitkeep
│   │   ├── dto/                          # DTOs de la capa de aplicación
│   │   │   └── .gitkeep
│   │   └── mappers/                       # Mapeadores entre capas
│   │       └── .gitkeep
│   │
│   ├── infrastructure/                    # 🔌 CAPA DE INFRAESTRUCTURA (Adaptadores)
│   │   ├── index.ts                       # Exportaciones centralizadas de infraestructura
│   │   ├── adapters/                      # Implementaciones de interfaces del dominio
│   │   │   └── .gitkeep
│   │   │   # Ejemplo: repositories/UserRepository.ts (implementa IUserRepository)
│   │   ├── persistence/                   # Configuración de persistencia (DB, ORM)
│   │   │   └── .gitkeep
│   │   ├── external/                      # Clientes de servicios externos
│   │   │   └── .gitkeep
│   │   ├── automation/                    # 🤖 AUTOMATIZACIÓN (Playwright)
│   │   │   ├── index.ts                   # Exportaciones del módulo de automatización
│   │   │   ├── wispro-automation.module.ts # Módulo NestJS para automatización
│   │   │   ├── wispro-automation.service.ts # Servicio principal de automatización
│   │   │   └── types/                     # Tipos TypeScript para automatización
│   │   │       ├── index.ts
│   │   │       └── wispro-auth.types.ts   # Tipos: Cookie, WisproAuthResult, WisproCredentials
│   │   └── config/                        # Configuración de infraestructura
│   │       └── .gitkeep
│   │
│   ├── presentation/                      # 🌐 CAPA DE PRESENTACIÓN (Interfaces)
│   │   ├── index.ts                       # Exportaciones centralizadas de presentación
│   │   ├── controllers/                   # Controladores HTTP (REST, GraphQL, etc.)
│   │   │   └── .gitkeep
│   │   │   # Ejemplo: authentication/authentication.controller.ts
│   │   ├── dto/                          # DTOs de API (requests/responses)
│   │   │   └── .gitkeep
│   │   ├── decorators/                    # Decoradores personalizados
│   │   │   └── .gitkeep
│   │   ├── filters/                       # Filtros de excepciones
│   │   │   └── .gitkeep
│   │   ├── guards/                        # Guards de autenticación/autorización
│   │   │   └── .gitkeep
│   │   ├── interceptors/                  # Interceptores (logging, transformación)
│   │   │   └── .gitkeep
│   │   └── pipes/                         # Pipes de validación y transformación
│   │       └── .gitkeep
│   │
│   ├── shared/                            # 🔄 CAPA COMPARTIDA
│   │   ├── index.ts                       # Exportaciones centralizadas compartidas
│   │   ├── exceptions/                    # Excepciones base compartidas
│   │   │   └── .gitkeep
│   │   ├── utils/                         # Funciones utilitarias
│   │   │   └── .gitkeep
│   │   ├── constants/                     # Constantes de la aplicación
│   │   │   └── .gitkeep
│   │   ├── types/                         # Tipos TypeScript compartidos
│   │   │   └── .gitkeep
│   │   ├── decorators/                    # Decoradores compartidos
│   │   │   └── .gitkeep
│   │   └── validators/                    # Validadores reutilizables
│   │       └── .gitkeep
│   │
│   └── config/                             # ⚙️ CONFIGURACIÓN
│       ├── index.ts                       # Exportaciones de configuración
│       └── app.config.ts                  # Configuración principal de la aplicación
│
├── dist/                                  # Código compilado (generado)
├── node_modules/                          # Dependencias (generado)
│
├── package.json                           # 📦 Configuración de dependencias y scripts
├── tsconfig.json                          # ⚙️ Configuración de TypeScript
├── nest-cli.json                          # ⚙️ Configuración del CLI de NestJS
├── .eslintrc.js                           # 🔍 Configuración de ESLint
├── .prettierrc                            # 💅 Configuración de Prettier
├── .gitignore                             # 🚫 Archivos ignorados por Git
│
├── README.md                              # 📖 Documentación principal
├── ARCHITECTURE.md                        # 🏗️ Documentación de arquitectura
└── STRUCTURE.md                           # 📂 Este archivo (estructura del proyecto)
```

## 🎯 Propósito de Cada Capa

### Domain (Dominio)
- **Propósito**: Contiene la lógica de negocio pura, independiente de cualquier framework o tecnología
- **Características**: 
  - No tiene dependencias externas
  - Define interfaces (ports) que serán implementadas en otras capas
  - Contiene entidades con comportamiento y reglas de negocio
- **Ejemplo**: `User` entity con método `validatePassword()`

### Application (Aplicación)
- **Propósito**: Orquesta la lógica de dominio para cumplir casos de uso específicos
- **Características**:
  - Depende solo de Domain
  - Contiene casos de uso (use cases) que representan operaciones de negocio
  - Coordina múltiples servicios de dominio si es necesario
- **Ejemplo**: `LoginUseCase` que usa `UserRepository` y `PasswordService`

### Infrastructure (Infraestructura)
- **Propósito**: Implementa las interfaces del dominio y conecta con el mundo exterior
- **Características**:
  - Implementa los ports definidos en Domain (adapters)
  - Contiene código específico de tecnologías (Playwright, TypeORM, HTTP clients)
  - Puede tener dependencias de frameworks
- **Ejemplo**: `WisproAutomationService` usa Playwright para automatizar login

### Presentation (Presentación)
- **Propósito**: Maneja la comunicación con clientes externos (HTTP, GraphQL, etc.)
- **Características**:
  - Contiene controladores que reciben requests
  - Valida datos de entrada
  - Formatea respuestas
  - Maneja errores HTTP
- **Ejemplo**: `AuthenticationController` con endpoint `POST /auth/login`

### Shared (Compartida)
- **Propósito**: Código reutilizable que puede ser usado por todas las capas
- **Características**:
  - Utilidades generales
  - Excepciones base
  - Constantes
  - Tipos compartidos
- **Ejemplo**: `DateUtils.formatDate()`, `BaseException`

### Config (Configuración)
- **Propósito**: Centraliza toda la configuración de la aplicación
- **Características**:
  - Variables de entorno
  - Configuración de módulos
  - Settings de la aplicación
- **Ejemplo**: `app.config.ts` con puerto, entorno, etc.

## 🔄 Flujo de Datos Típico

```
1. Request HTTP
   ↓
2. Presentation Layer (Controller)
   - Valida DTO de entrada
   ↓
3. Application Layer (Use Case)
   - Orquesta la lógica
   ↓
4. Domain Layer (Entity/Service)
   - Ejecuta reglas de negocio
   ↓
5. Infrastructure Layer (Repository Adapter)
   - Persiste o consulta datos
   ↓
6. Response HTTP
```

## 📝 Archivos Clave

### `wispro-automation.service.ts`
Servicio principal que automatiza el login en Wispro usando Playwright. Extrae cookies y tokens CSRF.

### `wispro-auth.types.ts`
Define los tipos TypeScript para la automatización:
- `Cookie`: Estructura de una cookie
- `WisproAuthResult`: Resultado de la autenticación
- `WisproCredentials`: Credenciales de login

### `index.ts` (en cada capa)
Centraliza las exportaciones de cada capa, facilitando imports limpios:
```typescript
import { User } from '@domain';
import { LoginUseCase } from '@application';
```

## 🚀 Próximos Pasos para Desarrollo

1. **Crear entidades de dominio** en `domain/entities/`
2. **Definir interfaces de repositorios** en `domain/repositories/`
3. **Implementar casos de uso** en `application/use-cases/`
4. **Crear controladores** en `presentation/controllers/`
5. **Implementar adaptadores** en `infrastructure/adapters/`
6. **Agregar DTOs** en `presentation/dto/` y `application/dto/`

