import { NATIVE_APP_VERSION } from "@/config/nativeVersion"

export interface AppVersionManifest {
  android: {
    version: string
    apkUrl: string
  }
  ios: {
    version: string
    testflightUrl: string
  }
}

export interface UpdateInfo {
  available: boolean
  platform: 'android' | 'ios' | null
  latestVersion: string
  currentVersion: string
  downloadUrl: string
}

export async function checkForUpdate(): Promise<UpdateInfo | null> {
  const isCapacitor = typeof (window as any).Capacitor !== 'undefined' && (window as any).Capacitor.isNative
  if (!isCapacitor) return null

  const platform = (window as any).Capacitor.getPlatform() as string
  if (platform !== 'android' && platform !== 'ios') return null

  try {
    const res = await fetch('/app-version.json', { cache: 'no-cache' })
    if (!res.ok) return null
    const manifest: AppVersionManifest = await res.json()

    const platformKey = platform as 'android' | 'ios'
    const remote = manifest[platformKey]
    if (!remote) return null

    const current = NATIVE_APP_VERSION
    const latest = remote.version

    if (compareVersions(latest, current) > 0) {
      return {
        available: true,
        platform: platformKey,
        latestVersion: latest,
        currentVersion: current,
        downloadUrl: platformKey === 'android' ? remote.apkUrl : remote.testflightUrl,
      }
    }

    return { available: false, platform: null, latestVersion: latest, currentVersion: current, downloadUrl: '' }
  } catch {
    return null
  }
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0
    const nb = pb[i] || 0
    if (na > nb) return 1
    if (na < nb) return -1
  }
  return 0
}
