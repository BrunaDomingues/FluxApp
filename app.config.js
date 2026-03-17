// Configuração do Expo. Para login com Supabase, crie um arquivo .env na raiz (veja .env.example).
require('dotenv').config();

module.exports = {
  expo: {
    name: 'FluxApp',
    slug: 'FluxApp',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: { supportsTablet: true },
    android: {
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/icon.png',
      },
      permissions: [
        'android.permission.RECORD_AUDIO',
        'android.permission.MODIFY_AUDIO_SETTINGS',
      ],
      package: 'com.brunateemo.FluxApp',
    },
    web: { favicon: './assets/favicon.png' },
    scheme: 'fluxapp',
    plugins: ['expo-asset', 'expo-font', 'expo-av', 'expo-sqlite'],
    extra: {
      eas: { projectId: '9c184509-fb6f-424e-b46e-671f92f28da3' },
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
    },
  },
};
