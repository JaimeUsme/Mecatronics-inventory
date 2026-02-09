# Guía de Instalación - Sistema de Inventario

## 📦 Dependencias Requeridas

### 1. Instalar TypeORM y Driver de Base de Datos

**MySQL (configurado en este proyecto):**
```bash
npm install @nestjs/typeorm typeorm mysql2
```

Nota: `mysql2` ya incluye sus tipos TypeScript, no es necesario instalar `@types/mysql2`.

### 2. Configurar Variables de Entorno

Crear o actualizar el archivo `.env` en la raíz del proyecto:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=tu-password
DB_DATABASE=Inventory

# Application
NODE_ENV=development
PORT=3000
```

### 3. Crear Base de Datos

**MySQL:**
```bash
mysql -u root -p
CREATE DATABASE Inventory;
```

O desde la línea de comandos:
```bash
mysql -u root -p -e "CREATE DATABASE Inventory;"
```

### 4. Ejecutar Migraciones

**MySQL:**
```bash
mysql -u root -p Inventory < src/infrastructure/persistence/migrations/001-create-inventory-tables.sql
```

O desde la consola MySQL:
```sql
USE Inventory;
SOURCE src/infrastructure/persistence/migrations/001-create-inventory-tables.sql;
```

### 5. Verificar Instalación

```bash
npm run build
npm run start:dev
```

## ✅ Checklist de Verificación

- [ ] TypeORM y driver de BD instalados
- [ ] Variables de entorno configuradas
- [ ] Base de datos creada
- [ ] Migraciones ejecutadas
- [ ] Aplicación compila sin errores
- [ ] Servidor inicia correctamente

## 🧪 Pruebas Rápidas

### 1. Verificar Conexión a Base de Datos

El servidor debería iniciar sin errores de conexión. Revisa los logs:

```
[Nest] INFO [TypeOrmModule] TypeORM successfully connected to database
```

### 2. Probar Endpoint de Inventario

```bash
curl -X GET http://localhost:3000/inventory/warehouse \
  -H "Authorization: Bearer <jwt-token>"
```

Debería retornar un array vacío `{"items": []}` si no hay datos, o un error 401 si falta el token.

## 🔧 Solución de Problemas

### Error: "Cannot find module '@nestjs/typeorm'"

**Solución:** Instalar dependencias:
```bash
npm install @nestjs/typeorm typeorm mysql2
```

### Error: "Connection refused" o "ECONNREFUSED"

**Solución:** Verificar que la base de datos esté corriendo y las credenciales sean correctas.

### Error: "relation 'materials' does not exist"

**Solución:** Ejecutar las migraciones SQL manualmente.

### Error: "Unknown database 'Inventory'"

**Solución:** Crear la base de datos primero:
```bash
mysql -u root -p -e "CREATE DATABASE Inventory;"
```

## 📚 Próximos Pasos

1. Crear materiales iniciales (manualmente o vía API)
2. Crear bodega central (se crea automáticamente al usar el servicio)
3. Probar transferencias de material
4. Probar consumos en órdenes

## 📖 Documentación Adicional

Ver `docs/INVENTORY_SYSTEM.md` para:
- Documentación completa del sistema
- Ejemplos de uso
- Queries SQL importantes
- Casos de uso comunes

