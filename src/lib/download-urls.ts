/**
 * Centralized download URLs for Adonai desktop app.
 * Always pointing to /releases/latest so new builds are auto-served.
 */
export const WIN_DOWNLOAD =
  'https://github.com/PabloGoitiaEmprendedor/adonai-tareas/releases/latest/download/Adonai-Setup.exe';

export const MAC_DOWNLOAD =
  'https://github.com/PabloGoitiaEmprendedor/adonai-tareas/releases/latest/download/Adonai-Mac.dmg';

export const ANDROID_DOWNLOAD =
  'https://github.com/PabloGoitiaEmprendedor/adonai-tareas/releases/latest/download/adonai.apk';

export const ANDROID_PAGE = '/android';

const configuredAppleDownload = import.meta.env.VITE_APPLE_DOWNLOAD_URL as string | undefined;

export const APPLE_DOWNLOAD =
  configuredAppleDownload && configuredAppleDownload !== 'https://testflight.apple.com/join/adonai'
    ? configuredAppleDownload
    : '/apple';
