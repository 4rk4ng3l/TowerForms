#!/bin/bash

# Script para generar APK localmente sin EAS
# TowerForms - Build Script

set -e  # Exit on error

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=========================================="
echo "TowerForms - APK Build Script"
echo -e "==========================================${NC}"
echo ""

# Función para verificar prerequisitos
check_prerequisites() {
    echo -e "${YELLOW}Verificando prerequisitos...${NC}"

    # Verificar Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}Error: Node.js no está instalado${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Node.js: $(node --version)${NC}"

    # Verificar Java
    if ! command -v java &> /dev/null; then
        echo -e "${RED}Error: Java no está instalado${NC}"
        echo "Instala JDK 17 primero"
        exit 1
    fi
    echo -e "${GREEN}✓ Java: $(java -version 2>&1 | head -n 1)${NC}"

    # Verificar ANDROID_HOME
    if [ -z "$ANDROID_HOME" ]; then
        echo -e "${RED}Error: ANDROID_HOME no está configurado${NC}"
        echo "Configura las variables de entorno primero"
        exit 1
    fi
    echo -e "${GREEN}✓ ANDROID_HOME: $ANDROID_HOME${NC}"

    # Verificar que node_modules existe
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}Instalando dependencias...${NC}"
        npm install
    fi
    echo -e "${GREEN}✓ Dependencias instaladas${NC}"

    echo ""
}

# Función para limpiar builds anteriores
clean_build() {
    echo -e "${YELLOW}Limpiando builds anteriores...${NC}"
    if [ -d "android" ]; then
        cd android
        ./gradlew clean
        cd ..
    fi
    echo -e "${GREEN}✓ Build anterior limpiado${NC}"
    echo ""
}

# Función para generar proyecto nativo
generate_native() {
    echo -e "${YELLOW}Generando proyecto Android nativo...${NC}"
    if [ ! -d "android" ]; then
        npx expo prebuild --platform android
    else
        echo "La carpeta android/ ya existe. ¿Quieres regenerarla? (y/N)"
        read -r response
        if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
            npx expo prebuild --platform android --clean
        fi
    fi
    echo -e "${GREEN}✓ Proyecto nativo generado${NC}"
    echo ""
}

# Función para compilar APK
build_apk() {
    local build_type=$1

    echo -e "${YELLOW}Compilando APK de $build_type...${NC}"
    cd android

    if [ "$build_type" == "debug" ]; then
        ./gradlew assembleDebug
        APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
    else
        # Verificar que existe la configuración de signing
        if [ ! -f "app/towerforms-release.keystore" ] && [ ! -f "gradle.properties" ]; then
            echo -e "${RED}Error: No se encontró configuración de signing${NC}"
            echo "Primero genera el keystore:"
            echo "  keytool -genkeypair -v -storetype PKCS12 -keystore app/towerforms-release.keystore -alias towerforms -keyalg RSA -keysize 2048 -validity 10000"
            cd ..
            exit 1
        fi
        ./gradlew assembleRelease
        APK_PATH="app/build/outputs/apk/release/app-release.apk"
    fi

    cd ..

    if [ -f "android/$APK_PATH" ]; then
        echo -e "${GREEN}=========================================="
        echo "✓ APK generado exitosamente!"
        echo -e "==========================================${NC}"
        echo ""
        echo -e "${BLUE}Ubicación del APK:${NC}"
        echo "  android/$APK_PATH"
        echo ""
        echo -e "${BLUE}Tamaño:${NC}"
        ls -lh "android/$APK_PATH" | awk '{print "  "$5}'
        echo ""

        # Preguntar si quiere instalar
        if command -v adb &> /dev/null; then
            if adb devices | grep -q "device$"; then
                echo "¿Quieres instalar el APK en el dispositivo conectado? (y/N)"
                read -r response
                if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
                    adb install -r "android/$APK_PATH"
                    echo -e "${GREEN}✓ APK instalado${NC}"
                fi
            fi
        fi
    else
        echo -e "${RED}Error: No se pudo generar el APK${NC}"
        exit 1
    fi
}

# Menú principal
main() {
    echo "Selecciona el tipo de build:"
    echo "1) Debug (desarrollo, sin firma)"
    echo "2) Release (producción, firmado)"
    echo "3) Limpiar y build debug"
    echo "4) Limpiar y build release"
    echo ""
    read -p "Opción (1-4): " option
    echo ""

    check_prerequisites

    case $option in
        1)
            generate_native
            build_apk "debug"
            ;;
        2)
            generate_native
            build_apk "release"
            ;;
        3)
            clean_build
            generate_native
            build_apk "debug"
            ;;
        4)
            clean_build
            generate_native
            build_apk "release"
            ;;
        *)
            echo -e "${RED}Opción inválida${NC}"
            exit 1
            ;;
    esac
}

# Ejecutar script
main
