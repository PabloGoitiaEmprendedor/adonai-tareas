/**
 * Single source of truth for the desktop (Windows) app installer.
 * Uses GitHub's "latest release" redirect so it always points to the newest version.
 */
export const DESKTOP_APP_DOWNLOAD_URL =
  "https://github.com/PabloGoitiaEmprendedor/adonai-tareas/releases/latest/download/Adonai-Setup.exe";

export const DESKTOP_APP_VERSION = "latest";

/** Trigger the .exe download in any browser. */
export function downloadDesktopApp() {
  window.location.href = DESKTOP_APP_DOWNLOAD_URL;
}

/**
 * Cross-component event: opens the global "Download desktop app" dialog
 * rendered inside NavigationWrapper. Any component (e.g. the floating-window
 * toggle on DailyPage) can dispatch it to ask the user to install the app.
 */
export const OPEN_DOWNLOAD_DIALOG_EVENT = "adonai:open-download-dialog";

export function openDownloadDialog() {
  window.dispatchEvent(new CustomEvent(OPEN_DOWNLOAD_DIALOG_EVENT));
}