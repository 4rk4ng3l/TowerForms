# Correcciones de Sincronización

## Problemas Identificados y Resueltos

### 1. ✅ Error Crítico en Lógica de Actualización de Estados
**Ubicación**: `app/src/core/use-cases/submissions/SyncSubmissionsUseCase.ts:120-149`

**Problema**:
- El código iteraba sobre TODAS las `unsyncedSubmissions` después del sync
- Incluía submissions que fallaron en el mapeo y no se enviaron al backend
- Esto causaba marcaje incorrecto de estados

**Solución**:
```typescript
const failedMappingIds = new Set<string>();
// ... agregar IDs que fallaron en mapeo
// En el loop de actualización:
if (failedMappingIds.has(submission.id)) {
  continue; // Skip submissions que fallaron en mapeo
}
```

### 2. ✅ Límite de Payload Insuficiente en Backend
**Ubicación**: `TowerFormsBackEnd/src/main.ts:102-103`

**Problema**:
- Express tiene límite por defecto de 100kb para JSON
- Imágenes en base64 fácilmente exceden este límite

**Solución**:
```typescript
this.app.use(express.json({ limit: '50mb' }));
this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));
```

### 3. ✅ Timeout Muy Bajo
**Ubicación**: `app/src/data/api/config.ts:11`

**Problema**:
- 30 segundos es insuficiente para sincronizar múltiples submissions con imágenes
- Conexiones lentas fallaban por timeout

**Solución**:
```typescript
TIMEOUT: 120000, // 120 segundos (2 minutos)
```

### 4. ✅ Falta de Validación de Existencia de Archivos
**Ubicación**: `app/src/core/use-cases/submissions/SyncSubmissionsUseCase.ts:240-246`

**Problema**:
- No se validaba si el archivo existe antes de intentar leerlo
- Causaba errores crípticos cuando archivos fueron eliminados

**Solución**:
```typescript
// Check if file exists before attempting to read
const fileInfo = await FileSystem.getInfoAsync(file.localPath);

if (!fileInfo.exists) {
  throw new Error(`File not found at path: ${file.localPath}`);
}

if (!fileInfo.isDirectory) {
  // Read file...
}
```

### 5. ✅ Logging Mejorado en Backend
**Ubicación**: `TowerFormsBackEnd/src/application/commands/sync/sync-submissions.handler.ts:34-66`

**Problema**:
- Difícil diagnosticar problemas sin logs detallados

**Solución**:
- Agregado logging antes y después de cada operación
- Incluye detalles de errores con stack traces
- Resumen de operación al finalizar

## Pasos para Probar las Correcciones

1. **Limpiar la base de datos del dispositivo:**
   ```bash
   adb shell run-as com.anonymous.TowerForms rm databases/towerforms.db
   adb shell run-as com.anonymous.TowerForms rm databases/towerforms.db-shm
   adb shell run-as com.anonymous.TowerForms rm databases/towerforms.db-wal
   ```

2. **Recompilar el backend:**
   ```bash
   cd /home/usuario-hp/Desarrollos/TowerFormsBackEnd
   npm run build
   ```

3. **Reiniciar el backend:**
   - Detener el servidor actual
   - `npm start` o `npm run dev`

4. **Reiniciar la app móvil:**
   - Force close en el dispositivo
   - Abrir de nuevo

5. **Crear un nuevo submission de prueba:**
   - Con respuestas y al menos 1-2 imágenes
   - Completar el formulario

6. **Sincronizar:**
   - Ir a la sección de Descargas
   - Presionar el botón de sincronización
   - Observar los logs en consola para diagnóstico

## Problemas Potenciales Restantes

### A Considerar en el Futuro:

1. **Sincronización por lotes**: Si hay muchos submissions, enviarlos todos a la vez puede sobrecargar
   - Considerar enviar en lotes de 5-10 submissions

2. **Compresión de imágenes**: Base64 aumenta el tamaño ~33%
   - Considerar comprimir imágenes antes de convertir a base64
   - O enviar archivos en formato multipart/form-data en lugar de JSON

3. **Sincronización incremental**: Solo sincronizar archivos que no estén en el servidor
   - Requiere endpoint para verificar qué archivos ya existen

4. **Reintentos automáticos**: Implementar retry logic más robusto
   - Exponential backoff
   - Límite de intentos por submission

5. **Transacciones en Backend**: Usar transacciones de Prisma para operaciones atómicas
   - Si falla un archivo, hacer rollback del submission completo

6. **Estado de red**: Verificar conectividad antes de intentar sincronizar
   - Mostrar mensaje al usuario si no hay conexión

## Comandos útiles para debugging

### Ver logs de la app en tiempo real:
```bash
npx react-native log-android
# o
adb logcat | grep -i towerforms
```

### Ver logs del backend:
```bash
cd /home/usuario-hp/Desarrollos/TowerFormsBackEnd
npm run dev  # modo desarrollo con logs detallados
```

### Inspeccionar base de datos SQLite:
```bash
adb shell run-as com.anonymous.TowerForms
cd databases
sqlite3 towerforms.db
.tables
SELECT * FROM submissions;
SELECT * FROM files;
.exit
```

### Verificar tamaño de payloads:
```bash
# En la consola del navegador o logs, buscar:
# [SyncSubmissionsUseCase] Successfully read file ...
# Esto muestra el tamaño de cada archivo en KB
```
