import { MAC_DOWNLOAD, WIN_DOWNLOAD } from "@/lib/download-urls";
import { trackAnalyticsEvent } from "@/lib/analytics";

export type DownloadPlatform = "win" | "mac";

export const DOWNLOAD_GUIDE_VIDEO_SRC = "/videos/video-boton-de-descarga.mp4";
export const START_DOWNLOAD_GUIDE_EVENT = "adonai:start-download-guide";

export function getInstallerDownloadUrl(platform: DownloadPlatform) {
  return platform === "win" ? WIN_DOWNLOAD : MAC_DOWNLOAD;
}

export function triggerInstallerDownload(platform: DownloadPlatform) {
  const link = document.createElement("a");
  link.href = getInstallerDownloadUrl(platform);
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function startGuidedDownload(platform: DownloadPlatform, skipAuthGate = false) {
  if (!skipAuthGate) {
    const onboardingDone = localStorage.getItem('adonai_onboarding_done') === 'true';
    const sessionType = localStorage.getItem('adonai_session_type');
    if (onboardingDone && sessionType === 'anonymous') {
      window.dispatchEvent(new CustomEvent('adonai:show-download-gate', { detail: { platform } }));
      return;
    }
  }

  trackAnalyticsEvent("download_started", {
    platform,
    installer_url: getInstallerDownloadUrl(platform),
  });
  window.dispatchEvent(new CustomEvent(START_DOWNLOAD_GUIDE_EVENT, { detail: { platform } }));
  triggerInstallerDownload(platform);
}
