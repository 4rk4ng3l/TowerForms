# Reset Completo de Base de Datos - TowerForms

## ✅ Tareas Completadas

### Backend (PostgreSQL)

1. **Eliminadas Migraciones de Prisma**
   - Carpeta `/prisma/migrations` eliminada completamente
   - Ahora se usa `prisma db push` directamente sin historial de migraciones

2. **Base de Datos Recreada**
   - Base de datos `forms_alexia` eliminada completamente
   - Base de datos creada nuevamente desde cero
   - Schema aplicado con `prisma db push`
   - Seed ejecutado exitosamente

3. **Schema Actualizado**
   - Agregado campo `siteId` a la tabla `Form`
   - Relación `Site -> Form` establecida correctamente
   - Límite de payload aumentado a 50MB en Express (para sincronización con imágenes base64)

4. **Datos Iniciales (Seed)**
   - ✅ Roles: Administrador, Técnico de Campo, Consultor
   - ✅ 29 Permisos creados
   - ✅ Usuario admin: `admin@admin.com` / `admin`
   - ✅ Formulario "Maintenance Preventive" creado

### Frontend (React Native + Expo)

1. **Creada Utilidad DatabaseUtils** (`app/src/infrastructure/database/db-utils.ts`)

   Funciones disponibles:
   - `clearSubmissionData()` - Elimina submissions, answers y files
   - `clearAllData()` - Elimina TODO incluyendo formularios
   - `getStats()` - Estadísticas de la base de datos
   - `getSyncStats()` - Estadísticas de sincronización
   - `retryFailedSync()` - Marca elementos fallidos como pendientes

2. **Nueva Pestaña de Ajustes** (`app/(tabs)/settings.tsx`)

   Características:
   - 📊 Estadísticas en tiempo real de la base de datos
   - 🔄 Estado de sincronización (sincronizados/pendientes/fallidos)
   - 🔧 Reintentar sincronización fallida
   - 🗑️ Limpiar datos de submissions
   - ⚠️ Eliminar todos los datos (con doble confirmación)
   - ℹ️ Información útil para el usuario

3. **Tab de Ajustes Agregado al Layout**
   - Nuevo tab visible en la barra inferior
   - Ícono: engranaje (gearshape.fill)
   - Título: "Ajustes"

## 🚀 Cómo Usar

### Para Limpiar la Base de Datos del Dispositivo (Con Expo Go)

Ya que estás usando **Expo Go** (`host.exp.exponent`), NO puedes usar adb directamente para acceder a la base de datos.

**Opciones:**

1. **Opción Recomendada: Usar el nuevo Tab de Ajustes**
   - Abre la app
   - Ve al tab "Ajustes" (último tab en la barra inferior)
   - Presiona "Limpiar Datos de Submissions"
   - Confirma la acción

2. **Opción Nuclear: Limpiar datos de Expo Go** (⚠️ Borra TODAS las apps de Expo Go)
   ```bash
   adb shell pm clear host.exp.exponent
   ```

3. **Opción Alternativa: Desinstalar y reinstalar Expo Go**
   ```bash
   adb uninstall host.exp.exponent
   # Luego reinstala desde Play Store
   ```

### Para Reiniciar el Backend

```bash
cd /home/usuario-hp/Desarrollos/TowerFormsBackEnd

# Si el backend está corriendo, detenerlo (Ctrl+C)

# Iniciar el backend
npm start
# o
npm run dev
```

## 📋 Estado Actual

### Backend
- ✅ Base de datos limpia y recreada
- ✅ Schema aplicado sin migraciones
- ✅ Seed ejecutado
- ✅ Compilación exitosa
- ✅ Límite de payload: 50MB
- ✅ Usuario admin creado

### Frontend
- ✅ Utilidades de base de datos creadas
- ✅ Tab de ajustes implementado
- ✅ Timeout aumentado a 120 segundos
- ✅ Validación de archivos mejorada
- ✅ Logging mejorado

## 🔄 Flujo Recomendado para Probar

1. **Limpiar datos desde la app:**
   - Abrir tab "Ajustes"
   - "Limpiar Datos de Submissions"

2. **Crear nuevo submission de prueba:**
   - Ir a "Formularios"
   - Seleccionar "Maintenance Preventive"
   - Llenar el formulario con 1-2 imágenes
   - Completar

3. **Sincronizar:**
   - Ir a "Descargas"
   - Presionar "Sincronizar"
   - Observar logs en la consola

4. **Verificar en backend:**
   ```bash
   # En otra terminal
   cd /home/usuario-hp/Desarrollos/TowerFormsBackEnd
   npx prisma studio
   # Abre en http://localhost:5555
   ```

## 📱 Funcionalidades del Tab de Ajustes

### Estadísticas Mostradas
- Total de formularios descargados
- Total de submissions completados
- Total de respuestas guardadas
- Total de archivos (imágenes)
- Submissions sincronizados/pendientes/fallidos
- Archivos sincronizados/pendientes/fallidos

### Acciones Disponibles
1. **Reintentar Sincronización Fallida**: Marca elementos fallidos como pendientes
2. **Actualizar Estadísticas**: Recarga los contadores
3. **Limpiar Datos de Submissions**: Elimina solo submissions (preserva formularios)
4. **Eliminar Todos los Datos**: Elimina TODO (requiere doble confirmación)

## ⚠️ Advertencias

- **"Limpiar Datos de Submissions"**: Elimina tus formularios completados pero NO los formularios descargados. Podrás volver a llenarlos.

- **"Eliminar Todos los Datos"**: Elimina TODO incluyendo formularios. Deberás volver a descargarlos del servidor.

- Con **Expo Go**, la base de datos está dentro del sandbox de Expo y no es accesible directamente con adb.

## 🐛 Debugging

### Ver logs de la app:
```bash
# Si usas npx expo start
# Los logs aparecen automáticamente en la consola

# O usa adb logcat
adb logcat | grep -E "SyncSubmissionsUseCase|DatabaseUtils|SQLite"
```

### Ver logs del backend:
```bash
cd /home/usuario-hp/Desarrollos/TowerFormsBackEnd
npm run dev
# Los logs aparecen en consola con winston
```

### Inspeccionar base de datos del backend:
```bash
cd /home/usuario-hp/Desarrollos/TowerFormsBackEnd
npx prisma studio
# Abre http://localhost:5555
```

## 📝 Notas Importantes

1. **Sin Migraciones en Backend**:
   - Ya no se usa `prisma migrate dev`
   - Se usa `prisma db push` directamente
   - Más simple y directo para desarrollo

2. **Expo Go vs Development Build**:
   - Actualmente: **Expo Go** (host.exp.exponent)
   - Base de datos está en sandbox de Expo Go
   - Para acceso directo con adb, necesitarías crear un development build

3. **Sincronización**:
   - Timeout: 120 segundos
   - Límite de payload: 50MB
   - Archivos en base64 (aumenta tamaño ~33%)
   - Validación de existencia de archivos antes de leer

4. **Seguridad**:
   - Doble confirmación para acciones destructivas
   - Información clara sobre lo que se eliminará
   - Stats actualizadas después de cada acción
