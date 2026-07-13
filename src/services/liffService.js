import { env } from '../config/env'

const PROFILE_STORAGE_KEY = 'online-order-template-line-profile'

function readCachedProfile() {
  try {
    return JSON.parse(window.localStorage.getItem(PROFILE_STORAGE_KEY) || 'null')
  } catch {
    return null
  }
}

function writeCachedProfile(profile) {
  if (!profile) return
  window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile))
}

function waitForLiff(timeoutMs = 3000) {
  if (window.liff) return Promise.resolve(window.liff)
  return new Promise((resolve, reject) => {
    const startedAt = Date.now()
    const timer = window.setInterval(() => {
      if (window.liff) {
        window.clearInterval(timer)
        resolve(window.liff)
      }
      if (Date.now() - startedAt > timeoutMs) {
        window.clearInterval(timer)
        reject(new Error('LIFF SDK 尚未載入。'))
      }
    }, 100)
  })
}

export const liffService = {
  getCachedProfile() {
    return readCachedProfile()
  },

  async getProfile({ requireLogin = false } = {}) {
    if (!env.isLiffEnabled) return null
    const liff = await waitForLiff()
    await liff.init({ liffId: env.lineLiffId })

    if (!liff.isLoggedIn()) {
      if (requireLogin) {
        liff.login({ redirectUri: window.location.href })
      }
      return null
    }

    const profile = await liff.getProfile()
    const normalized = {
      userId: profile.userId,
      displayName: profile.displayName || '',
      pictureUrl: profile.pictureUrl || '',
      statusMessage: profile.statusMessage || '',
      updatedAt: new Date().toISOString()
    }
    writeCachedProfile(normalized)
    return normalized
  }
}
