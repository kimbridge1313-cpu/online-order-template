export function readStorage(key, fallback) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return fallback
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch (error) {
    console.warn(`Failed to read localStorage key: ${key}`, error)
    return fallback
  }
}

export function writeStorage(key, value) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (error) {
    console.warn(`Failed to write localStorage key: ${key}`, error)
    return false
  }
}
