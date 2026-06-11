const fs = require('fs');
const path = require('path');

const dist = path.resolve(__dirname, '..', 'dist');
const versionFile = path.resolve(__dirname, '..', 'public', 'app-version.json');

const apkPublic = path.resolve(__dirname, '..', 'public', 'adonai.apk');
const apkAndroid = path.resolve(__dirname, '..', 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const apkPublicLegacy = path.resolve(__dirname, '..', 'public', 'downloads', 'adonai-1.0.0.apk');

const apkSource = fs.existsSync(apkAndroid) ? apkAndroid : (fs.existsSync(apkPublic) ? apkPublic : (fs.existsSync(apkPublicLegacy) ? apkPublicLegacy : null));
if (apkSource) {
  const dest = path.join(dist, 'adonai.apk');
  fs.cpSync ? fs.cpSync(apkSource, dest) : fs.copyFileSync(apkSource, dest);
  console.log('✓ APK copied to dist/adonai.apk');
}

const verSource = path.resolve(__dirname, '..', 'public', 'downloads', 'adonai-1.0.0.apk');
if (fs.existsSync(verSource)) {
  fs.copyFileSync(verSource, path.join(dist, 'downloads', 'adonai-1.0.0.apk'));
}

if (fs.existsSync(versionFile)) {
  fs.copyFileSync(versionFile, path.join(dist, 'app-version.json'));
  console.log('✓ app-version.json copied to dist/');
}
