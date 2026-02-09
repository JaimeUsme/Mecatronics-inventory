# Wispro Automation - NestJS con Arquitectura Hexagonal

Proyecto NestJS con arquitectura hexagonal para automatización de procesos con Wispro, incluyendo obtención de cookies de sesión y tokens CSRF mediante Playwright.

## 🏗️ Arquitectura

Este proyecto sigue los principios de **Arquitectura Hexagonal (Ports & Adapters)**, organizando el código en capas bien definidas:

- **Domain**: Lógica de negocio pura, independiente de frameworks
- **Application**: Casos de uso y orquestación de lógica de negocio
- **Infrastructure**: Implementaciones concretas (Playwright, bases de datos, APIs externas)
- **Presentation**: Controladores HTTP, DTOs, validaciones
- **Shared**: Utilidades y código compartido
- **Config**: Configuración de la aplicación

Para más detalles, consulta [ARCHITECTURE.md](./ARCHITECTURE.md).

## 📁 Estructura del Proyecto

```
src/
├── domain/              # Capa de Dominio
│   ├── entities/        # Entidades de dominio
│   ├── value-objects/   # Objetos de valor
│   ├── repositories/    # Interfaces (Ports)
│   ├── services/        # Servicios de dominio
│   └── exceptions/      # Excepciones de dominio
│
├── application/         # Capa de Aplicación
│   ├── use-cases/       # Casos de uso
│   ├── services/        # Servicios de aplicación
│   ├── dto/            # DTOs de aplicación
│   └── mappers/        # Mapeadores
│
├── infrastructure/      # Capa de Infraestructura
│   ├── adapters/        # Implementaciones (Adapters)
│   ├── persistence/     # Persistencia
│   ├── external/        # Servicios externos
│   ├── automation/      # Scripts Playwright ⭐
│   └── config/         # Configuración de infraestructura
│
├── presentation/       # Capa de Presentación
│   ├── controllers/     # Controladores HTTP
│   ├── dto/            # DTOs de API
│   ├── filters/         # Filtros de excepciones
│   ├── guards/          # Guards
│   ├── interceptors/    # Interceptores
│   └── pipes/          # Pipes
│
├── shared/             # Capa Compartida
│   ├── exceptions/      # Excepciones compartidas
│   ├── utils/          # Utilidades
│   ├── constants/       # Constantes
│   └── validators/      # Validadores
│
└── config/             # Configuración
```

## 🚀 Instalación

1. **Instala las dependencias:**
```bash
npm install
```

2. **Instala los navegadores de Playwright:**
```bash
npx playwright install chromium
```

## 🔧 Configuración

El servicio de automatización (`WisproAutomationService`) está ubicado en:
- `src/infrastructure/automation/wispro-automation.service.ts`

Para usar el servicio, necesitas proporcionar las credenciales:

```typescript
import { WisproAutomationService } from '@infrastructure/automation';

const credentials = {
  email: 'tu-email@example.com',
  password: 'tu-password'
};

const result = await wisproAutomationService.loginAndExtractAuth(credentials);
```

## 📝 Uso del Servicio de Automatización

El servicio `WisproAutomationService` proporciona el método `loginAndExtractAuth()` que:

1. Abre un navegador headless con Playwright
2. Navega a la página de login de Wispro
3. Completa el formulario de login
4. Extrae las cookies de sesión
5. Obtiene el token CSRF (X-CSRF-Token)
6. Retorna un objeto `WisproAuthResult` con toda la información

### Ejemplo de Resultado

```typescript
{
  cookies: Cookie[],           // Todas las cookies
  sessionCookie: Cookie | null, // Cookie de sesión específica
  csrfToken: string | null      // Token CSRF
}
```

## 🛠️ Scripts Disponibles

```bash
# Desarrollo
npm run start:dev

# Producción
npm run start:prod

# Build
npm run build

# Tests
npm run test
npm run test:watch
npm run test:cov

# Linting
npm run lint

# Formateo
npm run format
```

## 📦 Módulos

### WisproAutomationModule

Módulo que proporciona el servicio de automatización. Puede ser importado en otros módulos:

```typescript
import { WisproAutomationModule } from '@infrastructure/automation';

@Module({
  imports: [WisproAutomationModule],
  // ...
})
export class YourModule {}
```

## 🎯 Próximos Pasos

La estructura está lista para agregar:

1. **Casos de uso** en `application/use-cases/`
2. **Controladores** en `presentation/controllers/`
3. **Entidades de dominio** en `domain/entities/`
4. **Repositorios** en `infrastructure/adapters/repositories/`
5. **DTOs** en `presentation/dto/` y `application/dto/`

## 📚 Recursos

- [NestJS Documentation](https://docs.nestjs.com/)
- [Playwright Documentation](https://playwright.dev/)
- [Arquitectura Hexagonal](https://alistair.cockburn.us/hexagonal-architecture/)

## 📄 Licencia

ISC
