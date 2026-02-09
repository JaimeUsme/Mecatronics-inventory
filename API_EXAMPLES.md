# Ejemplos de Uso de la API

## Endpoint de Login

### POST /auth/login

Realiza el login en Wispro mediante automatización con Playwright y retorna las cookies de sesión y el token CSRF.

#### Request

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tu-email@example.com",
    "password": "tu-password"
  }'
```

#### Request Body

```json
{
  "email": "tu-email@example.com",
  "password": "tu-password"
}
```

#### Response (200 OK)

```json
{
  "csrfToken": "xyz789...",
  "_wispro_session_v2": "ABC123..."
}
```

#### Ejemplo con JavaScript/TypeScript

```typescript
const response = await fetch('http://localhost:3000/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'tu-email@example.com',
    password: 'tu-password',
  }),
});

const data = await response.json();
console.log('CSRF Token:', data.csrfToken);
console.log('Session Cookie:', data._wispro_session_v2);
```

#### Ejemplo con Postman

1. Método: `POST`
2. URL: `http://localhost:3000/auth/login`
3. Headers:
   - `Content-Type: application/json`
4. Body (raw JSON):
```json
{
  "email": "tu-email@example.com",
  "password": "tu-password"
}
```

#### Uso de las Cookies y CSRF Token

Una vez obtenidas las cookies y el token CSRF, puedes usarlas para hacer peticiones autenticadas a los endpoints de Wispro:

```typescript
// Ejemplo de uso de la cookie de sesión y CSRF token
const sessionCookieValue = data._wispro_session_v2;
const csrfToken = data.csrfToken;

// Hacer petición autenticada
const apiResponse = await fetch('https://cloud.wispro.co/api/endpoint', {
  method: 'GET',
  headers: {
    'Cookie': `_wispro_session_v2=${sessionCookieValue}`,
    'X-CSRF-Token': csrfToken,
  },
});
```

#### Notas

- El proceso de login puede tardar varios segundos ya que utiliza Playwright para automatizar el navegador
- Las cookies y tokens tienen un tiempo de expiración, asegúrate de renovarlos cuando sea necesario
- No compartas tus credenciales ni las cookies de sesión públicamente

---

## Endpoint de Usuario Actual

### GET /users/current

Obtiene la información del usuario actual desde la API de Wispro usando las credenciales de autenticación guardadas en la sesión.

**Nota importante**: Este endpoint usa automáticamente las credenciales guardadas después del login. No es necesario pasar las credenciales como parámetros.

#### Request

```bash
curl -X GET "http://localhost:3000/users/current"
```

#### Requisitos

- Debe haberse realizado login previamente mediante `POST /auth/login`
- Las credenciales se guardan automáticamente en la sesión después del login

#### Response (200 OK)

```json
{
  "id": "74fda4e6-688d-4234-a20c-8ba76f93d28e",
  "name": "NATALIA SANCHEZ",
  "email": "nataliasr0211@gmail.com",
  "phone_mobile": "3233975522"
}
```

#### Ejemplo con JavaScript/TypeScript

```typescript
// 1. Primero hacer login (las credenciales se guardan automáticamente en la sesión)
const loginResponse = await fetch('http://localhost:3000/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'tu-email@example.com',
    password: 'tu-password',
  }),
});

const loginData = await loginResponse.json();
console.log('Login exitoso. Credenciales guardadas en sesión.');

// 2. Obtener el usuario actual (usa automáticamente las credenciales de la sesión)
const userResponse = await fetch('http://localhost:3000/users/current');
const userData = await userResponse.json();
console.log('Usuario actual:', userData);
```

#### Ejemplo con Postman

1. **Primero hacer login:**
   - Método: `POST`
   - URL: `http://localhost:3000/auth/login`
   - Body (raw JSON):
   ```json
   {
     "email": "tu-email@example.com",
     "password": "tu-password"
   }
   ```

2. **Luego obtener el usuario:**
   - Método: `GET`
   - URL: `http://localhost:3000/users/current`
   - No requiere parámetros adicionales

#### Flujo Completo

1. **Login**: `POST /auth/login` → Guarda automáticamente `csrfToken` y `_wispro_session_v2` en la sesión
2. **Get Current User**: `GET /users/current` → Usa automáticamente las credenciales de la sesión para obtener información del usuario

#### Gestión de Sesión

- **Almacenamiento automático**: Después del login, las credenciales se guardan automáticamente en la sesión
- **Uso automático**: Todos los endpoints de Wispro usan automáticamente las credenciales de la sesión
- **Sin parámetros**: No necesitas pasar credenciales en cada petición
- **Expiración**: Las credenciales tienen un tiempo de expiración, si expiran necesitarás hacer login nuevamente

#### Notas

- **Sesión en memoria**: Las credenciales se guardan en memoria del servidor (se pierden al reiniciar)
- **Una sesión activa**: Solo se puede tener una sesión activa a la vez
- **Re-login necesario**: Si la sesión expira o se reinicia el servidor, necesitarás hacer login nuevamente
- Este endpoint hace una petición a la API externa de Wispro (`https://cloud.wispro.co/users/current`)

