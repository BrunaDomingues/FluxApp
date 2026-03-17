// Configuração do Expo. Para login com Supabase, crie um arquivo .env na raiz (veja .env.example).
require('dotenv').config();

module.exports = {
  expo: {
    name: 'FluxApp',
    slug: 'FluxApp',
    version: '1.0.1',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: { supportsTablet: true, buildNumber: '1' },
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
      versionCode: 1,
    },
    web: { favicon: './assets/favicon.png' },
    scheme: 'fluxapp',
    plugins: ['expo-asset', 'expo-font', 'expo-av', 'expo-sqlite', '@react-native-community/datetimepicker'],
    extra: {
      eas: { projectId: '9c184509-fb6f-424e-b46e-671f92f28da3' },
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
    },
  },
};
