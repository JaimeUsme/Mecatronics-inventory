# Sistema de Inventario - Documentación Técnica

## 📋 Descripción General

Sistema de inventario tipo ERP para órdenes de servicio con control de:
- **Bodega central**: Almacén principal de materiales
- **Inventarios por técnico**: Stock asignado a cada técnico
- **Consumo de materiales**: Registro de materiales usados en órdenes de servicio

## 🏗️ Arquitectura

El sistema sigue una **arquitectura hexagonal** con las siguientes capas:

- **Domain**: Enums, interfaces de repositorios
- **Infrastructure/Persistence**: Entidades TypeORM, migraciones SQL
- **Application/Services**: Lógica de negocio (transferencias, consumos)
- **Presentation**: DTOs, controladores REST

## 📊 Modelo de Datos

### Entidades Principales

1. **Material**: Catálogo de materiales/insumos
2. **Location**: Ubicaciones (bodega o técnico)
3. **Inventory**: Stock actual por material y ubicación
4. **InventoryMovement**: Histórico de todos los movimientos
5. **ServiceOrderMaterial**: Materiales consumidos en órdenes

### Flujo de Stock

```
BODEGA → TRANSFER → TÉCNICO → CONSUMPTION → ORDEN
```

- **Transferencia**: Reduce bodega, aumenta técnico
- **Consumo**: Reduce SOLO técnico (NO afecta bodega)

## 🔧 Instalación y Configuración

### 1. Instalar Dependencias

```bash
npm install @nestjs/typeorm typeorm pg
# o para MySQL:
npm install @nestjs/typeorm typeorm mysql2
```

### 2. Variables de Entorno

Crear archivo `.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=wispro_inventory
NODE_ENV=development
```

### 3. Ejecutar Migraciones

**PostgreSQL:**
```bash
psql -U postgres -d wispro_inventory -f src/infrastructure/persistence/migrations/001-create-inventory-tables-postgresql.sql
```

**MySQL:**
```bash
mysql -u root -p wispro_inventory < src/infrastructure/persistence/migrations/001-create-inventory-tables.sql
```

## 📡 Endpoints API

### 1. Transferir Material de Bodega a Técnico

```http
POST /inventory/transfer
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "materialId": "uuid-del-material",
  "fromLocationId": "uuid-bodega",
  "toLocationId": "uuid-tecnico",
  "quantity": 10,
  "technicianId": "wispro-technician-id"
}
```

**Respuesta:** `204 No Content`

**Proceso:**
- Valida stock suficiente en bodega
- Resta stock de bodega
- Suma stock al técnico
- Crea movimiento tipo `TRANSFER`
- Todo en una transacción

### 2. Registrar Consumo de Material

```http
POST /inventory/consume
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "materialId": "uuid-del-material",
  "technicianLocationId": "uuid-tecnico",
  "quantity": 2,
  "serviceOrderId": "wispro-order-id",
  "technicianId": "wispro-technician-id"
}
```

**Respuesta:** `204 No Content`

**Proceso:**
- Valida stock suficiente en técnico
- Resta stock SOLO del técnico (NO toca bodega)
- Crea registro en `ServiceOrderMaterial`
- Crea movimiento tipo `CONSUMPTION`
- Todo en una transacción

### 3. Consultar Inventario de Bodega

```http
GET /inventory/warehouse
Authorization: Bearer <jwt-token>
```

**Respuesta:**
```json
{
  "items": [
    {
      "materialId": "uuid",
      "materialName": "Cable UTP Cat6",
      "unit": "metro",
      "stock": 500.00
    },
    {
      "materialId": "uuid",
      "materialName": "Conector RJ45",
      "unit": "unidad",
      "stock": 1000.00
    }
  ]
}
```

### 4. Consultar Inventario de Técnico

```http
GET /inventory/technician/:locationId
Authorization: Bearer <jwt-token>
```

**Respuesta:** Mismo formato que bodega

## 💾 Queries SQL Importantes

### 1. Obtener Stock Actual de un Material en Bodega

```sql
SELECT i.stock, m.name, m.unit
FROM inventories i
INNER JOIN materials m ON i.materialId = m.id
INNER JOIN locations l ON i.locationId = l.id
WHERE l.type = 'WAREHOUSE'
  AND m.id = 'uuid-del-material';
```

### 2. Obtener Historial de Movimientos de un Material

```sql
SELECT 
  im.type,
  im.quantity,
  im.createdAt,
  m.name as material_name,
  l_from.name as from_location,
  l_to.name as to_location
FROM inventory_movements im
INNER JOIN materials m ON im.materialId = m.id
LEFT JOIN locations l_from ON im.fromLocationId = l_from.id
LEFT JOIN locations l_to ON im.toLocationId = l_to.id
WHERE im.materialId = 'uuid-del-material'
ORDER BY im.createdAt DESC;
```

### 3. Obtener Materiales Consumidos en una Orden

```sql
SELECT 
  som.quantityUsed,
  m.name as material_name,
  m.unit,
  som.createdAt
FROM service_order_materials som
INNER JOIN materials m ON som.materialId = m.id
WHERE som.serviceOrderId = 'wispro-order-id';
```

### 4. Obtener Stock Total por Material (Suma de todas las ubicaciones)

```sql
SELECT 
  m.id,
  m.name,
  m.unit,
  SUM(i.stock) as total_stock
FROM materials m
LEFT JOIN inventories i ON m.id = i.materialId
GROUP BY m.id, m.name, m.unit
ORDER BY m.name;
```

### 5. Obtener Técnicos con Stock Bajo (menos de 10 unidades)

```sql
SELECT 
  l.name as technician_name,
  l.referenceId as technician_id,
  m.name as material_name,
  i.stock
FROM inventories i
INNER JOIN locations l ON i.locationId = l.id
INNER JOIN materials m ON i.materialId = m.id
WHERE l.type = 'TECHNICIAN'
  AND i.stock < 10
ORDER BY i.stock ASC;
```

### 6. Obtener Movimientos de Transferencia en un Rango de Fechas

```sql
SELECT 
  im.createdAt,
  m.name as material_name,
  im.quantity,
  l_from.name as from_location,
  l_to.name as to_location,
  im.technicianId
FROM inventory_movements im
INNER JOIN materials m ON im.materialId = m.id
INNER JOIN locations l_from ON im.fromLocationId = l_from.id
INNER JOIN locations l_to ON im.toLocationId = l_to.id
WHERE im.type = 'TRANSFER'
  AND im.createdAt BETWEEN '2026-01-01' AND '2026-12-31'
ORDER BY im.createdAt DESC;
```

## 🔍 Casos de Uso Comunes

### Caso 1: Inicializar Bodega con Materiales

```typescript
// 1. Crear materiales
const material1 = await materialRepository.save({
  name: 'Cable UTP Cat6',
  unit: 'metro',
});

// 2. Obtener o crear bodega
const warehouse = await inventoryService.getOrCreateWarehouse();

// 3. Crear inventario inicial
await inventoryRepository.save({
  materialId: material1.id,
  locationId: warehouse.id,
  stock: 1000, // 1000 metros
});
```

### Caso 2: Asignar Material a Técnico

```typescript
// 1. Obtener ubicación del técnico
const technicianLocation = await inventoryService.getOrCreateTechnicianLocation(
  'wispro-technician-id',
  'Juan Pérez'
);

// 2. Obtener bodega
const warehouse = await inventoryService.getOrCreateWarehouse();

// 3. Transferir material
await inventoryService.transferMaterialToTechnician({
  materialId: material1.id,
  fromLocationId: warehouse.id,
  toLocationId: technicianLocation.id,
  quantity: 50, // 50 metros
  technicianId: 'wispro-technician-id',
});
```

### Caso 3: Registrar Consumo en Orden

```typescript
await inventoryService.consumeMaterialInOrder({
  materialId: material1.id,
  technicianLocationId: technicianLocation.id,
  quantity: 5, // 5 metros usados
  serviceOrderId: 'wispro-order-id',
  technicianId: 'wispro-technician-id',
});
```

## ⚠️ Validaciones y Reglas de Negocio

1. **Stock Insuficiente**: No se puede transferir o consumir más de lo disponible
2. **Transacciones**: Todas las operaciones de modificación de stock son atómicas
3. **Histórico**: Todo cambio de stock crea un registro en `InventoryMovement`
4. **Consumo NO afecta Bodega**: El consumo solo reduce el stock del técnico
5. **Ubicaciones Únicas**: Un material solo puede tener un registro de inventario por ubicación

## 🚀 Próximos Pasos

- [ ] Endpoint para crear materiales
- [ ] Endpoint para crear ubicaciones
- [ ] Endpoint para ajustes de inventario (ADJUSTMENT)
- [ ] Reportes de movimientos
- [ ] Alertas de stock bajo
- [ ] Integración con órdenes de Wispro

## 📝 Notas Importantes

- El stock actual se mantiene en la tabla `Inventory` (no se calcula on the fly)
- Todos los cambios deben crear registros en `InventoryMovement`
- Las transacciones aseguran la consistencia de datos
- Los índices mejoran el rendimiento de las consultas

