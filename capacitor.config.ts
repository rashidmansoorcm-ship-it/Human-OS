// Capacitor configuration for wrapping the compiled `dist/` bundle into a native Android APK.
// See ANDROID_BUILD.md for step-by-step build commands.
const config = {
  appId: 'app.humanos.life',
  appName: 'Human OS',
  webDir: 'dist',
  android: {
    backgroundColor: '#073d30',
    allowMixedContent: false,
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
