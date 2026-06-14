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

function isCapacitor(): boolean {
  try {
    return !!(window as any).Capacitor?.isNativePlatform()
  } catch {
    return false
  }
}

export async function checkForUpdate(): Promise<UpdateInfo | null> {
  if (!isCapacitor()) return null

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

export function startUpdatePolling(
  onUpdate: (info: UpdateInfo) => void,
  intervalMs = 30000,
): () => void {
  let active = true
  let lastAvailable = false

  const poll = async () => {
    if (!active) return
    const info = await checkForUpdate()
    if (!active) return
    if (info && info.available && !lastAvailable) {
      lastAvailable = true
      onUpdate(info)
    } else if (info && !info.available) {
      lastAvailable = false
    }
  }

  poll()
  const id = setInterval(poll, intervalMs)
  return () => { active = false; clearInterval(id) }
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
