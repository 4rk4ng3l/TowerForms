// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Configuración de alias (para @core, @data, etc.)
config.resolver.alias = {
  '@': path.resolve(__dirname),
  '@core': path.resolve(__dirname, 'app/src/core'),
  '@data': path.resolve(__dirname, 'app/src/data'),
  '@infrastructure': path.resolve(__dirname, 'app/src/infrastructure'),
  '@presentation': path.resolve(__dirname, 'app/src/presentation'),
  '@store': path.resolve(__dirname, 'app/src/store'),
};

// Asegurar que se resuelvan las extensiones de TypeScript
config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  'ts',
  'tsx',
  'cjs',
  'mjs',
];

// Incluir carpetas para watch
config.watchFolders = [
  ...(config.watchFolders || []),
  path.resolve(__dirname, 'app/src'),
];

// Configuración para manejar módulos no transpilados en node_modules
config.resolver.unstable_enablePackageExports = true;

module.exports = config;