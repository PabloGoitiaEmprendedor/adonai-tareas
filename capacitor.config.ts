import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.adonaitasks.app',
  appName: 'Adonai',
  webDir: 'dist',
  server: {
    url: 'https://webadonai.com',
    allowNavigation: [
      'accounts.dev',
      'clerk.com',
      '*.clerk.accounts.dev',
    ],
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
