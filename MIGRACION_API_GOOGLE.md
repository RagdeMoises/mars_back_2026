# Migración de Excel a API de Google Apps Script

## Cambios Realizados

### 1. Backend - Excel Controller

Se modificó el archivo `back2/src/controllers/excel.controller.js` para consumir datos desde una API de Google Apps Script en lugar de leer archivos Excel locales.

#### Cambios Principales:

1. **Nueva dependencia**: Se agregó `axios` en `package.json` para realizar peticiones HTTP.

2. **Nueva función `fetchProductsFromAPI()`**:
   - Reemplaza la función `readExcelFile()`
   - Consume la API: `https://script.googleusercontent.com/macros/echo?user_content_key=...`
   - Mapea los datos de la API al formato esperado por la base de datos PostgreSQL

3. **Mapeo de datos**:
   ```javascript
   API de Google → Base de Datos
   -----------------------------
   'Código Barras' → barra
   'Código' → sku
   'Id' → id
   'Nombre' → titulo
   'Stock' → stock
   'Costo Interno' → precio_costo
   'Precio Final' → precio_minorista
   'Precio' → precio_especial
   'Precio Mayorista' → precio_mayorista
   'Id Rubro' → categoria
   'Estado' → AD (convertido a 1 para 'Activo', 0 para otros)
   ```

4. **Funciones actualizadas**:
   - `getProducts()`: Ahora obtiene datos directamente de la API
   - `uploadExcel()`: Sincroniza datos de la API a la base de datos (ya no requiere archivo Excel)

## Endpoints Afectados

### `/api/productos` (GET)
- **Antes**: Leía el archivo `public/uploads/data.xlsx`
- **Ahora**: Obtiene datos directamente de la API de Google
- **Respuesta**: Array de productos en formato JSON

### `/data/upload` (POST)
- **Antes**: Requería subir un archivo Excel
- **Ahora**: Sincroniza automáticamente desde la API
- **Respuesta**: 
  ```json
  {
    "success": true,
    "message": "Productos sincronizados correctamente",
    "count": 2144
  }
  ```

## Cómo Usar

### Sincronizar productos desde la API

```bash
# Opción 1: Desde el navegador
# Acceder a la ruta de formulario
http://localhost:3000/data/upload

# Opción 2: Usando curl
curl -X POST http://localhost:3000/data/upload

# Opción 3: Usando Postman
POST http://localhost:3000/data/upload
```

### Obtener productos

```bash
# Obtener todos los productos (sin paginar)
curl http://localhost:3000/api/productos

# Obtener productos paginados con filtros
curl "http://localhost:3000/api/productos/paginated?page=1&limit=10&search=ABRELATAS"
```

## Ventajas del Nuevo Sistema

1. **No requiere archivos locales**: Ya no es necesario subir archivos Excel manualmente
2. **Sincronización automática**: Los datos se actualizan directamente desde la fuente
3. **Tiempo real**: Cualquier cambio en Google Sheets se refleja inmediatamente
4. **Menor almacenamiento**: No se guardan archivos Excel en el servidor
5. **Escalabilidad**: Más fácil de mantener y escalar

## Consideraciones

1. **Timeout**: La API tiene un timeout de 30 segundos para manejar grandes volúmenes de datos
2. **Manejo de errores**: Se incluye logging detallado para depuración
3. **Compatibilidad**: El resto de funciones (enviarCorreo, getCategorias, etc.) siguen funcionando igual

## Próximos Pasos Recomendados

1. **Agregar caché**: Considerar implementar caché para reducir llamadas a la API
2. **Sincronización programada**: Configurar cron jobs para sincronizar automáticamente
3. **Webhook**: Implementar webhook desde Google Apps Script para sincronización en tiempo real
4. **Validación de datos**: Agregar validación más robusta de los datos recibidos

## Testing

Para probar la integración:

```bash
# 1. Instalar dependencias
cd back2
npm install

# 2. Iniciar el servidor
npm run dev

# 3. Probar el endpoint de sincronización
curl -X POST http://localhost:3000/data/upload

# 4. Verificar los datos
curl http://localhost:3000/api/productos/paginated?page=1&limit=5
```

## Rollback (Si es necesario)

Si necesitas volver a la versión anterior con archivos Excel:
1. Restaurar el archivo `excel.controller.js` desde git
2. Remover `axios` de `package.json`
3. Asegurar que el archivo `data.xlsx` existe en `public/uploads/`
