# Backend Export Endpoints Documentation

Este documento describe los endpoints que el backend debe implementar para soportar la funcionalidad de exportación de formularios completados en Excel y compresión de imágenes por step.

## Endpoints Requeridos

### 1. Export Submission as Excel

**Endpoint:** `GET /api/export/submissions/:id/excel`

**Descripción:** Genera y retorna un archivo Excel con todos los datos de una submission específica.

**Parámetros:**
- `id` (path parameter): ID de la submission

**Headers:**
- `Authorization`: Bearer token del usuario

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "data": {
    "url": "https://api.towerforms.com/files/exports/submission_123_excel_1234567890.xlsx",
    "fileName": "Inspeccion_Torre_ABC_2026-01-10.xlsx"
  }
}
```

**Estructura del Excel:**
El archivo Excel debe contener:
- **Hoja 1 - Información General:**
  - Nombre del formulario
  - Fecha de creación
  - Fecha de completado
  - Usuario que completó el formulario
  - Metadata (ubicación, deviceId, etc.)

- **Hoja 2 - Respuestas por Step:**
  - Columnas: Step | Pregunta | Tipo | Respuesta | Archivos Adjuntos
  - Una fila por cada respuesta
  - Para preguntas con archivos, listar nombres de archivos

**Errores:**
- `404`: Submission no encontrada
- `401`: No autorizado
- `403`: No tienes permiso para acceder a esta submission

---

### 2. Export Submission Step Images as ZIP

**Endpoint:** `GET /api/export/submissions/:id/images/step/:stepNumber`

**Descripción:** Comprime todas las imágenes de un step específico en un archivo ZIP.

**Parámetros:**
- `id` (path parameter): ID de la submission
- `stepNumber` (path parameter): Número del step (1, 2, 3, etc.)

**Headers:**
- `Authorization`: Bearer token del usuario

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "data": {
    "url": "https://api.towerforms.com/files/exports/submission_123_step_1_images_1234567890.zip",
    "fileName": "Torre_ABC_Step1_Imagenes.zip"
  }
}
```

**Estructura del ZIP:**
```
Torre_ABC_Step1_Imagenes.zip
├── question_1_image_1.jpg
├── question_1_image_2.jpg
├── question_2_image_1.png
└── question_3_document.pdf
```

**Nombre de archivos dentro del ZIP:**
- Formato: `question_{questionId}_{index}.{extension}`
- O usar el nombre original si está disponible

**Errores:**
- `404`: Submission o step no encontrado
- `400`: No hay imágenes en este step
- `401`: No autorizado
- `403`: No tienes permiso para acceder a esta submission

---

### 3. Export Complete Submission Package

**Endpoint:** `GET /api/export/submissions/:id/package`

**Descripción:** Genera un paquete completo con el Excel de la submission y archivos ZIP de imágenes separados por step.

**Parámetros:**
- `id` (path parameter): ID de la submission

**Headers:**
- `Authorization`: Bearer token del usuario

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "data": {
    "excel": {
      "url": "https://api.towerforms.com/files/exports/submission_123_excel_1234567890.xlsx",
      "fileName": "Inspeccion_Torre_ABC_2026-01-10.xlsx"
    },
    "images": [
      {
        "stepNumber": 1,
        "url": "https://api.towerforms.com/files/exports/submission_123_step_1_images_1234567890.zip",
        "fileName": "Torre_ABC_Step1_Imagenes.zip"
      },
      {
        "stepNumber": 2,
        "url": "https://api.towerforms.com/files/exports/submission_123_step_2_images_1234567890.zip",
        "fileName": "Torre_ABC_Step2_Imagenes.zip"
      },
      {
        "stepNumber": 3,
        "url": "https://api.towerforms.com/files/exports/submission_123_step_3_images_1234567890.zip",
        "fileName": "Torre_ABC_Step3_Imagenes.zip"
      },
      {
        "stepNumber": 4,
        "url": "https://api.towerforms.com/files/exports/submission_123_step_4_images_1234567890.zip",
        "fileName": "Torre_ABC_Step4_Imagenes.zip"
      }
    ]
  }
}
```

**Notas:**
- Si un step no tiene imágenes, no se incluye en el array de `images`
- El array `images` solo contiene los steps que tienen archivos adjuntos
- Cada ZIP corresponde a un step específico del formulario

**Errores:**
- `404`: Submission no encontrada
- `401`: No autorizado
- `403`: No tienes permiso para acceder a esta submission

---

## Consideraciones de Implementación

### 1. Generación de Archivos

**Excel:**
- Usar librería como `xlsx` o `exceljs` en Node.js
- Generar el archivo en memoria o en almacenamiento temporal
- Subir a S3/storage y retornar URL firmada

**ZIP:**
- Usar librería como `archiver` o `jszip` en Node.js
- Comprimir solo imágenes y archivos del step especificado
- Organizar archivos dentro del ZIP con nombres descriptivos

### 2. URLs de Descarga

- Las URLs deben ser **firmadas** y tener expiración (ej: 1 hora)
- Usar S3 presigned URLs o similar
- Garantizar que solo el usuario autorizado pueda descargar

### 3. Performance

- Generar archivos de forma asíncrona si son muy grandes
- Implementar caché para exports recientes (opcional)
- Limpiar archivos temporales después de la expiración

### 4. Límites

- Tamaño máximo de ZIP: Configurar según infraestructura
- Timeout de generación: Considerar timeout para submissions muy grandes

### 5. Seguridad

- Validar que el usuario tenga acceso a la submission
- Validar que la submission existe y está completada
- Sanitizar nombres de archivos para evitar path traversal

---

## Ejemplo de Flujo Completo

1. **Usuario presiona "Paquete Completo" en la app**

2. **App hace request a:** `GET /api/export/submissions/123/package`

3. **Backend:**
   - Verifica autenticación y autorización
   - Busca la submission con ID 123
   - Busca el formulario asociado para obtener los steps
   - Genera archivo Excel con datos de la submission
   - Para cada step que tenga archivos:
     - Busca todos los archivos de ese step
     - Comprime en un ZIP separado
   - Sube archivos a S3 (o storage)
   - Genera URLs firmadas
   - Retorna respuesta con URLs

4. **App:**
   - Recibe URLs
   - Descarga Excel usando `FileSystem.downloadAsync()`
   - Comparte archivo Excel usando `Sharing.shareAsync()`
   - Repite para cada ZIP de imágenes
   - Muestra alerta de éxito al usuario

---

## Librerías Recomendadas (Node.js)

```bash
npm install exceljs archiver aws-sdk
```

**Excel:**
- `exceljs`: https://www.npmjs.com/package/exceljs
- `xlsx`: https://www.npmjs.com/package/xlsx

**ZIP:**
- `archiver`: https://www.npmjs.com/package/archiver
- `jszip`: https://www.npmjs.com/package/jszip

**Storage:**
- `aws-sdk`: Para S3
- `@google-cloud/storage`: Para Google Cloud Storage

---

## Códigos de Error Estándar

```json
{
  "success": false,
  "error": {
    "code": "SUBMISSION_NOT_FOUND",
    "message": "La submission con ID 123 no fue encontrada"
  }
}
```

**Códigos comunes:**
- `SUBMISSION_NOT_FOUND`: Submission no existe
- `UNAUTHORIZED`: Token inválido o expirado
- `FORBIDDEN`: Usuario no tiene acceso a esta submission
- `NO_IMAGES_FOUND`: Step no tiene imágenes
- `GENERATION_FAILED`: Error al generar archivo
- `UPLOAD_FAILED`: Error al subir archivo a storage

---

## Testing

**Casos de prueba:**
1. Export de submission con todos los steps con imágenes
2. Export de submission con algunos steps sin imágenes
3. Export de submission sin imágenes (solo Excel)
4. Export con usuario no autorizado
5. Export de submission inexistente
6. Export con archivos muy grandes (stress test)

---

## Notas Adicionales

- Los archivos exportados deben limpiarse automáticamente después de 24 horas
- Considerar agregar endpoint para obtener historial de exports
- Agregar analytics para rastrear cuántos exports se realizan
- Implementar rate limiting para prevenir abuso
