# Guía para Generar APK Localmente (Sin EAS)

Esta guía te ayudará a generar un APK localmente en tu PC sin usar los servidores de EAS/Expo.

---

## 📋 Prerequisitos

### 1. Instalar Java Development Kit (JDK)

**Opción A: OpenJDK 17 (Recomendado)**

```bash
# En Ubuntu/Debian
sudo apt install openjdk-17-jdk

# Verificar instalación
java -version
```

**Opción B: Descargar desde Oracle**
- Descargar JDK 17 desde: https://www.oracle.com/java/technologies/downloads/

### 2. Instalar Android Studio

1. Descargar desde: https://developer.android.com/studio
2. Instalar Android Studio
3. Durante la instalación, asegúrate de instalar:
   - Android SDK
   - Android SDK Platform
   - Android Virtual Device (opcional)

### 3. Configurar Variables de Entorno

**En Linux:**

Edita `~/.bashrc` o `~/.zshrc`:

```bash
nano ~/.bashrc
```

Agrega al final:

```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
```

Recarga la configuración:
```bash
source ~/.bashrc
```

**En Windows:**

1. Panel de Control → Sistema → Configuración avanzada del sistema
2. Variables de entorno → Nueva (Sistema)
3. Agregar:
   - `ANDROID_HOME`: `C:\Users\TU_USUARIO\AppData\Local\Android\Sdk`
   - `JAVA_HOME`: `C:\Program Files\Java\jdk-17`
4. Editar `Path` y agregar:
   - `%ANDROID_HOME%\platform-tools`
   - `%ANDROID_HOME%\tools`

### 4. Instalar SDK y herramientas

Abre Android Studio:
1. More Actions → SDK Manager
2. SDK Platforms → Instalar Android 13.0 (API Level 33) o superior
3. SDK Tools → Marcar:
   - Android SDK Build-Tools
   - Android SDK Command-line Tools
   - Android Emulator
   - Google Play services

---

## 🚀 Método 1: Build con Expo Prebuild (Recomendado)

### Paso 1: Generar proyecto nativo

```bash
cd /home/usuario-hp/Desarrollos/TowerForms/TowerForms

# Generar carpetas android/ e ios/
npx expo prebuild --platform android
```

Esto creará la carpeta `android/` con todo el código nativo necesario.

### Paso 2: Compilar el APK

**Opción A: APK de Debug (desarrollo)**

```bash
cd android
./gradlew assembleDebug
```

El APK estará en: `android/app/build/outputs/apk/debug/app-debug.apk`

**Opción B: APK de Release (producción)**

```bash
cd android
./gradlew assembleRelease
```

El APK estará en: `android/app/build/outputs/apk/release/app-release.apk`

**Nota**: Para APK de release necesitas configurar el signing (ver sección más abajo).

### Paso 3: Instalar el APK

```bash
# Conecta tu dispositivo por USB y habilita "Depuración USB"

# Verificar que el dispositivo está conectado
adb devices

# Instalar APK
adb install android/app/build/outputs/apk/debug/app-debug.apk

# O para release
adb install android/app/build/outputs/apk/release/app-release.apk
```

---

## 🎯 Método 2: Build con Android Studio (GUI)

### Paso 1: Generar proyecto nativo (si no lo hiciste)

```bash
cd /home/usuario-hp/Desarrollos/TowerForms/TowerForms
npx expo prebuild --platform android
```

### Paso 2: Abrir en Android Studio

1. Abrir Android Studio
2. File → Open
3. Seleccionar la carpeta `android/`
4. Esperar a que sincronice (primera vez tarda varios minutos)

### Paso 3: Generar APK

1. Build → Build Bundle(s) / APK(s) → Build APK(s)
2. Esperar a que compile
3. Cuando termine, click en "locate" para abrir la carpeta del APK

El APK estará en: `android/app/build/outputs/apk/debug/app-debug.apk`

### Para APK de Release:

1. Build → Generate Signed Bundle / APK
2. Seleccionar APK → Next
3. Configurar keystore (ver sección siguiente)
4. Build

---

## 🔐 Configurar Signing para APK de Release

Para generar un APK de release necesitas un keystore (certificado).

### Paso 1: Generar Keystore

```bash
# Ir a la carpeta android/app
cd /home/usuario-hp/Desarrollos/TowerForms/TowerForms/android/app

# Generar keystore
keytool -genkeypair -v -storetype PKCS12 -keystore towerforms-release.keystore -alias towerforms -keyalg RSA -keysize 2048 -validity 10000
```

Te preguntará:
- **Password**: Crea una contraseña segura (¡guárdala!)
- **Nombre y apellido**: Tu nombre o nombre de la empresa
- **Unidad organizativa**: Tu empresa
- **Organización**: Nombre de tu empresa
- **Ciudad**: Tu ciudad
- **Estado**: Tu estado/provincia
- **Código de país**: CO (para Colombia)

**IMPORTANTE**: ¡Guarda el archivo `towerforms-release.keystore` y la contraseña! Los necesitarás para todas las actualizaciones futuras.

### Paso 2: Configurar Gradle

Crea el archivo: `android/gradle.properties`

```bash
nano /home/usuario-hp/Desarrollos/TowerForms/TowerForms/android/gradle.properties
```

Agrega al final (reemplaza con tus datos):

```properties
TOWERFORMS_RELEASE_STORE_FILE=towerforms-release.keystore
TOWERFORMS_RELEASE_KEY_ALIAS=towerforms
TOWERFORMS_RELEASE_STORE_PASSWORD=TU_PASSWORD_AQUI
TOWERFORMS_RELEASE_KEY_PASSWORD=TU_PASSWORD_AQUI
```

**IMPORTANTE**: Agrega `gradle.properties` a `.gitignore` para no subir las contraseñas a Git.

### Paso 3: Configurar build.gradle

Edita: `android/app/build.gradle`

Busca la sección `android {` y dentro de ella, busca `signingConfigs`. Si no existe, agrégala antes de `buildTypes`:

```gradle
android {
    ...

    signingConfigs {
        release {
            if (project.hasProperty('TOWERFORMS_RELEASE_STORE_FILE')) {
                storeFile file(TOWERFORMS_RELEASE_STORE_FILE)
                storePassword TOWERFORMS_RELEASE_STORE_PASSWORD
                keyAlias TOWERFORMS_RELEASE_KEY_ALIAS
                keyPassword TOWERFORMS_RELEASE_KEY_PASSWORD
            }
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
    ...
}
```

### Paso 4: Generar APK Release Firmado

```bash
cd /home/usuario-hp/Desarrollos/TowerForms/TowerForms/android
./gradlew assembleRelease
```

El APK firmado estará en: `android/app/build/outputs/apk/release/app-release.apk`

---

## 📦 Método 3: Build Directo con Expo (Alternativa Simple)

Si Expo CLI aún soporta builds locales:

```bash
cd /home/usuario-hp/Desarrollos/TowerForms/TowerForms

# Instalar expo-cli global (si no lo tienes)
npm install -g expo-cli

# Intentar build local
expo build:android -t apk --local
```

**Nota**: Este método está deprecado pero puede funcionar aún.

---

## 🔄 Actualizar y Recompilar

Cuando hagas cambios en tu código:

### Si NO modificaste código nativo:

```bash
# Solo recompilar JavaScript
cd /home/usuario-hp/Desarrollos/TowerForms/TowerForms
npx expo export

# Recompilar APK
cd android
./gradlew assembleRelease
```

### Si modificaste código nativo o dependencias:

```bash
# Limpiar build anterior
cd /home/usuario-hp/Desarrollos/TowerForms/TowerForms/android
./gradlew clean

# Regenerar prebuild (si es necesario)
cd ..
npx expo prebuild --clean

# Compilar nuevamente
cd android
./gradlew assembleRelease
```

---

## 🐛 Solución de Problemas

### Error: "ANDROID_HOME not set"

```bash
# Verifica que la variable esté configurada
echo $ANDROID_HOME

# Si no aparece nada, configura las variables de entorno (ver sección Prerequisitos)
```

### Error: "SDK location not found"

Crea el archivo `android/local.properties`:

```bash
nano /home/usuario-hp/Desarrollos/TowerForms/TowerForms/android/local.properties
```

Agrega:
```properties
sdk.dir=/home/TU_USUARIO/Android/Sdk
```

En Windows sería:
```properties
sdk.dir=C\:\\Users\\TU_USUARIO\\AppData\\Local\\Android\\Sdk
```

### Error: "Gradle build failed"

```bash
# Limpiar y volver a intentar
cd android
./gradlew clean
./gradlew assembleRelease
```

### Error: "Unable to find bundled Java"

Instala JDK 17 y configura JAVA_HOME.

### APK muy grande

El APK de debug es más grande. Usa release:

```bash
./gradlew assembleRelease
```

Además, asegúrate de tener estas opciones en `android/app/build.gradle`:

```gradle
buildTypes {
    release {
        minifyEnabled true
        shrinkResources true
    }
}
```

### Error en Windows: "gradlew is not recognized"

Usa:
```bash
gradlew.bat assembleRelease
```

---

## 📊 Comparación de Métodos

| Método | Ventajas | Desventajas |
|--------|----------|-------------|
| **Expo Prebuild** | Control total, compilación local | Requiere configuración inicial |
| **Android Studio** | Interface gráfica, fácil debugging | Más pesado, consume más recursos |
| **expo build:android** | Simple, una línea | Deprecado, puede no funcionar |

---

## ✅ Checklist para Build Local

- [ ] JDK 17 instalado
- [ ] Android Studio instalado
- [ ] Android SDK instalado (API 33+)
- [ ] Variables de entorno configuradas (ANDROID_HOME, JAVA_HOME)
- [ ] Ejecutado `npx expo prebuild`
- [ ] Configurado keystore (para release)
- [ ] Configurado signing en gradle.properties y build.gradle
- [ ] Compilado APK: `./gradlew assembleRelease`
- [ ] APK generado en `android/app/build/outputs/apk/`
- [ ] APK instalado y probado en dispositivo

---

## 🎯 Comandos Rápidos

### Build Debug (rápido, para probar):
```bash
cd /home/usuario-hp/Desarrollos/TowerForms/TowerForms
npx expo prebuild --platform android
cd android
./gradlew assembleDebug
adb install app/build/outputs/apk/debug/app-debug.apk
```

### Build Release (optimizado, para compartir):
```bash
cd /home/usuario-hp/Desarrollos/TowerForms/TowerForms
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
# APK en: app/build/outputs/apk/release/app-release.apk
```

---

## 📱 Compartir el APK

Una vez generado el APK:

1. El archivo estará en `android/app/build/outputs/apk/release/app-release.apk`
2. Compártelo por:
   - WhatsApp
   - Email
   - Google Drive
   - Dropbox
   - USB

Los usuarios deben:
1. Descargar el APK
2. Habilitar "Instalar aplicaciones desconocidas" en Android
3. Tocar el APK e instalar

---

## 🔒 Seguridad del Keystore

**MUY IMPORTANTE**:

1. **Haz backup** del archivo `.keystore`
2. **Guarda** las contraseñas en un lugar seguro (password manager)
3. **NO subas** el keystore a Git (agrégalo a `.gitignore`)
4. **NO compartas** el keystore públicamente

Si pierdes el keystore:
- No podrás actualizar la app
- Tendrás que crear una nueva app con diferente package name
- Los usuarios tendrán que desinstalar la vieja e instalar la nueva

---

## 📞 Ayuda Adicional

### Ver logs durante el build:
```bash
cd android
./gradlew assembleRelease --info
```

### Limpiar todo y empezar de cero:
```bash
cd /home/usuario-hp/Desarrollos/TowerForms/TowerForms
rm -rf android/
rm -rf node_modules/
npm install
npx expo prebuild --platform android --clean
cd android
./gradlew assembleRelease
```

### Verificar firma del APK:
```bash
jarsigner -verify -verbose -certs android/app/build/outputs/apk/release/app-release.apk
```

---

## 🌟 Ventajas del Build Local

✅ No depende de servidores externos
✅ Builds ilimitados y gratuitos
✅ Compilación más rápida (dependiendo de tu PC)
✅ Control total sobre el proceso
✅ No necesita cuenta de Expo
✅ Puedes debuggear más fácilmente
✅ Funciona sin internet (después de la configuración inicial)

---

## 📚 Referencias

- Expo Prebuild: https://docs.expo.dev/workflow/prebuild/
- Android Build: https://developer.android.com/studio/build/building-cmdline
- Signing APK: https://developer.android.com/studio/publish/app-signing
- Gradle: https://docs.gradle.org/current/userguide/userguide.html
