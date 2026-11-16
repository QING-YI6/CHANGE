import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.change.personal',
  appName: 'change',
  webDir: 'dist',
  backgroundColor: '#F6F2E9',
  android: {
    backgroundColor: '#F6F2E9'
  },
  server: {
    androidScheme: 'https'
  },
  plugins: {
    StatusBar: {
      overlaysWebView: false,
      style: 'DARK',
      backgroundColor: '#F6F2E9'
    }
  }
};

export default config;
