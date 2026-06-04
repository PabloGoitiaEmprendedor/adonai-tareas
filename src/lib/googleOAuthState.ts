export type GoogleOAuthService = "calendar" | "sheets"

type GoogleOAuthStatePayload = {
  nonce: string
  service: GoogleOAuthService
  desktop: boolean
  createdAt: number
}

const GOOGLE_OAUTH_STATE_PREFIX = "adonai_google_oauth_state"
const GOOGLE_OAUTH_STATE_TTL_MS = 15 * 60 * 1000

const storageKey = (service: GoogleOAuthService) => `${GOOGLE_OAUTH_STATE_PREFIX}:${service}`

const encodePayload = (payload: GoogleOAuthStatePayload) =>
  window.btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")

const decodePayload = (state: string): GoogleOAuthStatePayload | null => {
  try {
    const normalized = state.replace(/-/g, "+").replace(/_/g, "/")
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=")
    const parsed = JSON.parse(window.atob(padded)) as GoogleOAuthStatePayload

    if (
      typeof parsed?.nonce !== "string" ||
      (parsed.service !== "calendar" && parsed.service !== "sheets") ||
      typeof parsed.desktop !== "boolean" ||
      typeof parsed.createdAt !== "number"
    ) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

const createNonce = () => {
  if (typeof window === "undefined" || !window.crypto?.getRandomValues) {
    throw new Error("No se pudo crear un estado seguro para Google OAuth")
  }

  const bytes = new Uint8Array(16)
  window.crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

export const createGoogleOAuthState = (service: GoogleOAuthService, desktop: boolean) => {
  const payload: GoogleOAuthStatePayload = {
    nonce: createNonce(),
    service,
    desktop,
    createdAt: Date.now(),
  }

  window.sessionStorage.setItem(storageKey(service), JSON.stringify(payload))
  return encodePayload(payload)
}

export const isGoogleOAuthDesktopState = (state: string | null) => {
  if (state === "desktop") return true
  if (!state) return false
  return decodePayload(state)?.desktop === true
}

export const validateGoogleOAuthState = (state: string | null, expectedService: GoogleOAuthService) => {
  if (!state || state === "desktop") return false

  const payload = decodePayload(state)
  if (!payload || payload.service !== expectedService) return false

  const key = storageKey(expectedService)
  const storedRaw = window.sessionStorage.getItem(key)
  if (!storedRaw) return false

  try {
    const stored = JSON.parse(storedRaw) as GoogleOAuthStatePayload
    const isExpired = Date.now() - payload.createdAt > GOOGLE_OAUTH_STATE_TTL_MS
    const isValid =
      !isExpired &&
      stored.nonce === payload.nonce &&
      stored.service === payload.service &&
      stored.desktop === payload.desktop &&
      stored.createdAt === payload.createdAt

    if (isValid || isExpired) {
      window.sessionStorage.removeItem(key)
    }

    return isValid
  } catch {
    window.sessionStorage.removeItem(key)
    return false
  }
}
