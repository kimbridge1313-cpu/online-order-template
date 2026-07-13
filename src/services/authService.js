import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { env } from '../config/env'
import { assertFirestoreReady } from '../config/firebase'
import { readStorage, writeStorage } from '../utils/storage'

export const ADMIN_SESSION_KEY = 'online-order-template-admin-session'
export const ROLE_STORAGE_KEY = 'online-order-template-role'

const ADMIN_USERS_COLLECTION = 'adminUsers'

function sanitizeUser(user) {
  if (!user) return null
  const { password, passwordHash, ...safeUser } = user
  return safeUser
}

function normalizeAdminUser(id, data = {}) {
  return {
    id,
    username: data.username || id,
    role: data.role === 'owner' ? 'owner' : 'store',
    storeId: data.storeId || '',
    storeName: data.storeName || '',
    displayName: data.displayName || data.username || id,
    isActive: data.isActive !== false,
    password: data.password || '',
    passwordHash: data.passwordHash || ''
  }
}

function saveSession(user) {
  const session = {
    ...sanitizeUser(user),
    loggedInAt: new Date().toISOString()
  }
  writeStorage(ADMIN_SESSION_KEY, session)
  writeStorage(ROLE_STORAGE_KEY, session.role)
  window.dispatchEvent(new Event('admin-session-updated'))
  return session
}

const mockUsers = [
  { id: 'owner-demo', username: 'owner', password: 'owner1234', role: 'owner', displayName: '老闆', isActive: true },
  { id: 'store-demo', username: 'store', password: 'store1234', role: 'store', storeId: 'demo-store', storeName: '示範門店', displayName: '示範門店', isActive: true }
]

async function loginWithMock({ username, password }) {
  const user = mockUsers.find((item) => item.username === username && item.password === password && item.isActive)
  if (!user) throw new Error('帳號或密碼錯誤。')
  return saveSession(user)
}

async function loginWithFirebase({ username, password }) {
  const db = assertFirestoreReady()
  const cleanUsername = String(username || '').trim()
  if (!cleanUsername || !password) throw new Error('請輸入帳號與密碼。')
  const snapshot = await getDoc(doc(db, ADMIN_USERS_COLLECTION, cleanUsername))
  if (!snapshot.exists()) throw new Error('帳號或密碼錯誤。')
  const user = normalizeAdminUser(snapshot.id, snapshot.data())
  if (!user.isActive) throw new Error('此帳號已停用。')

  // Transitional login: the current frontend-only phase supports a plaintext `password` field.
  // Next step should move verification to a backend API with password hashing and sessions.
  if (!user.password || user.password !== password) throw new Error('帳號或密碼錯誤。')

  await setDoc(doc(db, ADMIN_USERS_COLLECTION, cleanUsername), { lastLoginAt: serverTimestamp() }, { merge: true })
  return saveSession(user)
}

export const authService = {
  getSession() {
    return readStorage(ADMIN_SESSION_KEY, null)
  },

  isAdminSession(session) {
    return session?.role === 'owner' || session?.role === 'store'
  },

  async login(credentials) {
    return env.useMockData ? loginWithMock(credentials) : loginWithFirebase(credentials)
  },

  logout() {
    writeStorage(ADMIN_SESSION_KEY, null)
    writeStorage(ROLE_STORAGE_KEY, 'customer')
    window.dispatchEvent(new Event('admin-session-updated'))
  }
}
