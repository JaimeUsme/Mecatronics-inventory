# Migraciones de Base de Datos

Este directorio contiene las migraciones SQL para crear y modificar las tablas del sistema de inventario.

## Archivos

- `001-create-inventory-tables.sql`: Migración genérica (compatible con MySQL)
- `001-create-inventory-tables-postgresql.sql`: Migración específica para PostgreSQL

## Cómo ejecutar las migraciones

### PostgreSQL

```bash
psql -U postgres -d wispro_inventory -f src/infrastructure/persistence/migrations/001-create-inventory-tables-postgresql.sql
```

### MySQL

```bash
mysql -u root -p wispro_inventory < src/infrastructure/persistence/migrations/001-create-inventory-tables.sql
```

## Notas

- Las migraciones deben ejecutarse en orden
- Asegúrate de tener una base de datos creada antes de ejecutar las migraciones
- Los tipos ENUM en PostgreSQL deben crearse antes de las tablas
- TypeORM puede generar migraciones automáticamente si configuras `synchronize: false`

