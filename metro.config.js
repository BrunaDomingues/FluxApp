const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Garante que expo-font seja resolvido do node_modules da raiz do projeto,
// evitando erro quando @expo/vector-icons (aninhado em expo) importa expo-font.
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'expo-font': path.resolve(__dirname, 'node_modules/expo-font'),
};

module.exports = config;
