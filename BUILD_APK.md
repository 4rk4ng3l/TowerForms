# Guía para Generar APK de TowerForms

Esta guía te ayudará a generar un archivo APK que puedes compartir e instalar directamente en dispositivos Android (sin necesidad de publicar en Play Store).

---

## 📋 Prerequisitos

### 1. Instalar EAS CLI

```bash
npm install -g eas-cli
```

### 2. Crear cuenta en Expo (si no tienes una)

Visita: https://expo.dev/signup

### 3. Iniciar sesión en EAS

```bash
eas login
```

Ingresa tu email y contraseña de Expo.

---

## 🚀 Generar APK

### Opción 1: APK de Prueba (Recomendado para compartir)

Este perfil genera un APK optimizado para compartir y probar:

```bash
cd /home/usuario-hp/Desarrollos/TowerForms/TowerForms

# Generar APK de prueba
eas build --platform android --profile preview
```

### Opción 2: APK de Producción

Para un APK con todas las optimizaciones de producción:

```bash
eas build --platform android --profile production
```

### Opción 3: APK de Desarrollo (con desarrollo client)

Para desarrollo y debugging:

```bash
eas build --platform android --profile development
```

---

## ⚙️ Proceso de Build

1. **Primera vez**: EAS te preguntará si quieres configurar el proyecto
   - Responde "Yes" a las preguntas
   - Se creará automáticamente la configuración necesaria

2. **Generación de Keystore**: Si es la primera vez, EAS preguntará sobre el keystore:
   - Opción 1: "Generate new keystore" (Recomendado)
   - Opción 2: "Use existing keystore" (si ya tienes uno)

3. **Proceso de compilación**:
   - EAS subirá tu código a la nube
   - Compilará la aplicación (tarda 10-20 minutos)
   - Te dará una URL para ver el progreso

4. **Descargar el APK**:
   - Una vez terminado, te dará un link para descargar
   - También puedes verlo en: https://expo.dev/accounts/TU_USUARIO/projects/TowerForms/builds

---

## 📱 Instalar el APK en Android

### Método 1: Compartir por Link

1. EAS genera un link público (ej: https://expo.dev/artifacts/...)
2. Abre ese link en tu dispositivo Android
3. Descarga e instala el APK

### Método 2: Transferir el archivo

1. Descarga el APK a tu PC
2. Transfiere el archivo a tu teléfono (USB, email, WhatsApp, etc.)
3. En el teléfono:
   - Abre el archivo APK
   - Si aparece "Instalar aplicaciones desconocidas", actívalo
   - Toca "Instalar"

### Método 3: Usar ADB

```bash
# Descarga el APK primero
adb install ruta/al/archivo.apk
```

---

## 🔧 Configuraciones de Build

### Perfiles disponibles en `eas.json`:

1. **development**
   - APK con desarrollo client
   - Para debugging
   - Más pesado

2. **preview** ⭐ (Recomendado para compartir)
   - APK optimizado
   - Para testing y compartir
   - Tamaño mediano

3. **production**
   - APK de producción
   - Totalmente optimizado
   - Tamaño más pequeño

4. **production-aab**
   - AAB para Google Play Store
   - Solo si quieres publicar en la tienda

---

## 📊 Ver el estado de tus builds

### En la web:
```
https://expo.dev
```
Ve a tu proyecto → Builds

### Desde la terminal:
```bash
# Ver lista de builds
eas build:list

# Ver detalles de un build específico
eas build:view BUILD_ID
```

---

## 🔄 Actualizar y Generar Nuevo APK

Cuando hagas cambios en tu app:

```bash
# 1. Asegúrate de que todos los cambios estén guardados

# 2. Incrementa la versión en app.json
# Cambia "version": "1.0.0" a "1.0.1"
# Y "versionCode": 1 a "versionCode": 2

# 3. Genera el nuevo APK
eas build --platform android --profile preview
```

---

## 🎯 Comando Rápido (Todo en uno)

```bash
# Ir al directorio
cd /home/usuario-hp/Desarrollos/TowerForms/TowerForms

# Verificar que estás logueado
eas whoami

# Generar APK
eas build --platform android --profile preview

# Esperar a que termine y descargar el APK desde el link que te da
```

---

## 🐛 Problemas Comunes

### Error: "Not logged in"

```bash
eas login
```

### Error: "Project not configured"

```bash
eas build:configure
```

### Error: "Android package name already exists"

Edita `app.json` y cambia el package name:
```json
"android": {
  "package": "com.tuempresa.towerforms"
}
```

### Build falla en "Installing dependencies"

Asegúrate de que tu `package.json` tenga todas las dependencias correctas:
```bash
npm install
```

### APK muy grande

Usa el perfil de producción en lugar de development:
```bash
eas build --platform android --profile production
```

---

## 📝 Notas Importantes

### Sobre el Package Name

El package name actual es: `com.anonymous.TowerForms`

**Recomendación**: Cámbialo a algo único para tu empresa:
- Formato: `com.tuempresa.towerforms`
- Ejemplo: `com.alexia.towerforms`

### Sobre la Versión

Cada vez que generes un nuevo APK para actualizar:
1. Incrementa `version` en app.json (ej: 1.0.0 → 1.0.1)
2. Incrementa `versionCode` en app.json (ej: 1 → 2)

### Sobre el Keystore

- EAS guarda tu keystore de forma segura
- Es necesario para actualizar la app
- Si pierdes el keystore, no podrás actualizar la app (tendrás que generar un nuevo package name)

---

## 🔒 Seguridad

### Variables de entorno sensibles

Si tienes API keys o secrets, créalos en Expo:

```bash
# Crear secret
eas secret:create --scope project --name API_KEY --value "tu-api-key"

# Ver secrets
eas secret:list
```

Luego úsalos en tu código:
```typescript
import Constants from 'expo-constants';
const apiKey = Constants.expoConfig?.extra?.API_KEY;
```

---

## ✅ Checklist para Generar APK

- [ ] EAS CLI instalado (`npm install -g eas-cli`)
- [ ] Sesión iniciada en EAS (`eas login`)
- [ ] Backend configurado y funcionando
- [ ] URL de producción correcta en `config.ts`
- [ ] Versión actualizada en `app.json`
- [ ] Permisos correctos en `app.json`
- [ ] Ejecutar: `eas build --platform android --profile preview`
- [ ] Esperar a que termine el build (10-20 min)
- [ ] Descargar APK desde el link proporcionado
- [ ] Probar instalación en dispositivo Android

---

## 🎉 ¡Listo!

Una vez que tengas el APK:
1. Compártelo por WhatsApp, email, Google Drive, etc.
2. Los usuarios pueden instalarlo directamente
3. No necesitas publicar en Play Store

**Importante**: Los usuarios deben habilitar "Instalar aplicaciones desconocidas" en Android para instalar el APK.

---

## 📞 Comandos de Ayuda

```bash
# Ver ayuda general
eas build --help

# Ver ayuda de un perfil específico
eas build --platform android --help

# Ver información de tu proyecto
eas project:info

# Ver tus builds
eas build:list

# Cancelar un build en progreso
eas build:cancel

# Ver logs de un build
eas build:view BUILD_ID
```

---

## 🌐 Links Útiles

- Expo Dashboard: https://expo.dev
- Documentación EAS Build: https://docs.expo.dev/build/introduction/
- Documentación Android: https://docs.expo.dev/build-reference/android-builds/
