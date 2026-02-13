# Guía de Inicialización del Sistema de Inventario

Esta guía te muestra cómo inicializar el sistema de inventario usando los endpoints de la API.

## 📋 Orden de Inicialización

### Paso 1: Crear Materiales (Catálogo de Insumos)

Primero, crea los materiales que vas a usar en el sistema.

**Endpoint:** `POST /inventory/materials`

**Ejemplo:**
```bash
curl -X POST http://localhost:3000/inventory/materials \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Cable UTP Cat6",
    "unit": "metro"
  }'
```

**Respuesta:**
```json
{
  "id": "uuid-del-material",
  "name": "Cable UTP Cat6",
  "unit": "metro",
  "createdAt": "2026-02-05T..."
}
```

**Materiales comunes a crear:**
- Cable UTP Cat6 (metro)
- Conector RJ45 (unidad)
- Módem Router (unidad)
- Splitter TV (unidad)
- Cable Coaxial RG6 (metro)
- etc.

### Paso 2: Crear la Bodega Central

Crea la bodega central donde se almacenará el stock principal.

**Endpoint:** `POST /inventory/locations`

**Ejemplo:**
```bash
curl -X POST http://localhost:3000/inventory/locations \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "WAREHOUSE",
    "name": "Bodega Central"
  }'
```

**Respuesta:**
```json
{
  "id": "uuid-de-la-bodega",
  "type": "WAREHOUSE",
  "referenceId": null,
  "name": "Bodega Central",
  "createdAt": "2026-02-05T..."
}
```

**Nota:** Solo puede haber una bodega central. Si intentas crear otra, recibirás un error.

### Paso 3: Agregar Stock Inicial a la Bodega

Agrega el stock inicial de cada material a la bodega.

**Endpoint:** `POST /inventory/adjust`

**Ejemplo:**
```bash
curl -X POST http://localhost:3000/inventory/adjust \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "materialId": "uuid-del-material",
    "locationId": "uuid-de-la-bodega",
    "quantity": 1000
  }'
```

**Nota:** `quantity` puede ser positivo (agregar) o negativo (quitar). Para stock inicial, usa valores positivos.

### Paso 4: (Opcional) Crear Ubicaciones de Técnicos

Cuando necesites asignar material a un técnico, crea su ubicación.

**Endpoint:** `POST /inventory/locations`

**Ejemplo:**
```bash
curl -X POST http://localhost:3000/inventory/locations \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "TECHNICIAN",
    "referenceId": "wispro-technician-id-123",
    "name": "Inventario de Juan Pérez"
  }'
```

---

## 🔍 Endpoints de Consulta

### Listar Materiales

**Endpoint:** `GET /inventory/materials`

```bash
curl -X GET http://localhost:3000/inventory/materials \
  -H "Authorization: Bearer <jwt-token>"
```

**Respuesta:**
```json
[
  {
    "id": "uuid-1",
    "name": "Cable UTP Cat6",
    "unit": "metro",
    "createdAt": "2026-02-05T..."
  },
  {
    "id": "uuid-2",
    "name": "Conector RJ45",
    "unit": "unidad",
    "createdAt": "2026-02-05T..."
  }
]
```

### Listar Ubicaciones

**Endpoint:** `GET /inventory/locations`

```bash
curl -X GET http://localhost:3000/inventory/locations \
  -H "Authorization: Bearer <jwt-token>"
```

**Respuesta:**
```json
[
  {
    "id": "uuid-bodega",
    "type": "WAREHOUSE",
    "referenceId": null,
    "name": "Bodega Central",
    "createdAt": "2026-02-05T..."
  },
  {
    "id": "uuid-tecnico",
    "type": "TECHNICIAN",
    "referenceId": "wispro-technician-id-123",
    "name": "Inventario de Juan Pérez",
    "createdAt": "2026-02-05T..."
  }
]
```

### Consultar Inventario de Bodega

**Endpoint:** `GET /inventory/warehouse`

```bash
curl -X GET http://localhost:3000/inventory/warehouse \
  -H "Authorization: Bearer <jwt-token>"
```

**Respuesta:**
```json
{
  "items": [
    {
      "materialId": "uuid-1",
      "materialName": "Cable UTP Cat6",
      "unit": "metro",
      "stock": 1000
    },
    {
      "materialId": "uuid-2",
      "materialName": "Conector RJ45",
      "unit": "unidad",
      "stock": 500
    }
  ]
}
```

---

## 🚀 Script de Inicialización Completo

Aquí tienes un ejemplo de script bash para inicializar todo:

```bash
#!/bin/bash

# Configuración
BASE_URL="http://localhost:3000"
TOKEN="tu-jwt-token-aqui"

# Función helper
api_call() {
  curl -X "$1" "$BASE_URL$2" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    ${3:+-d "$3"}
}

# 1. Crear materiales
echo "Creando materiales..."
CABLE_ID=$(api_call POST /inventory/materials '{"name":"Cable UTP Cat6","unit":"metro"}' | jq -r '.id')
CONECTOR_ID=$(api_call POST /inventory/materials '{"name":"Conector RJ45","unit":"unidad"}' | jq -r '.id')
MODEM_ID=$(api_call POST /inventory/materials '{"name":"Módem Router","unit":"unidad"}' | jq -r '.id')

# 2. Crear bodega
echo "Creando bodega central..."
WAREHOUSE_ID=$(api_call POST /inventory/locations '{"type":"WAREHOUSE","name":"Bodega Central"}' | jq -r '.id')

# 3. Agregar stock inicial
echo "Agregando stock inicial..."
api_call POST /inventory/adjust "{\"materialId\":\"$CABLE_ID\",\"locationId\":\"$WAREHOUSE_ID\",\"quantity\":1000}"
api_call POST /inventory/adjust "{\"materialId\":\"$CONECTOR_ID\",\"locationId\":\"$WAREHOUSE_ID\",\"quantity\":500}"
api_call POST /inventory/adjust "{\"materialId\":\"$MODEM_ID\",\"locationId\":\"$WAREHOUSE_ID\",\"quantity\":50}"

echo "Inicialización completada!"
```

---

## ✅ Checklist de Inicialización

- [ ] Crear materiales necesarios
- [ ] Crear bodega central
- [ ] Agregar stock inicial a la bodega
- [ ] Verificar inventario de bodega
- [ ] (Opcional) Crear ubicaciones de técnicos

---

## 📝 Notas Importantes

1. **Todos los endpoints requieren autenticación JWT** en el header `Authorization: Bearer <token>`

2. **Solo puede haber una bodega central**. Si intentas crear otra, recibirás un error 400.

3. **El ajuste de inventario crea un movimiento de tipo ADJUSTMENT** en el histórico.

4. **Los IDs son UUIDs** generados automáticamente por TypeORM.

5. **El stock inicial se agrega con valores positivos** en el campo `quantity` del ajuste.

---

## 🔄 Próximos Pasos

Una vez inicializado el sistema, puedes:

1. **Transferir material de bodega a técnico:**
   ```
   POST /inventory/transfer
   ```

2. **Registrar consumo de material en una orden:**
   ```
   POST /inventory/consume
   ```

3. **Consultar inventarios:**
   ```
   GET /inventory/warehouse
   GET /inventory/technician/:locationId
   ```


