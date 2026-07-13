import { collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore'
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
    passwordHash: data.passwordHash || '',
    createdAt: data.createdAt || '',
    updatedAt: data.updatedAt || '',
    lastLoginAt: data.lastLoginAt || ''
  }
}

function cleanAdminPayload(user = {}) {
  return JSON.parse(JSON.stringify({
    username: user.username,
    role: user.role === 'owner' ? 'owner' : 'store',
    storeId: user.role === 'owner' ? '' : user.storeId || '',
    storeName: user.role === 'owner' ? '' : user.storeName || '',
    displayName: user.displayName || user.username,
    isActive: user.isActive !== false,
    ...(user.password ? { password: user.password } : {}),
    updatedAt: new Date().toISOString()
  }))
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

async function listAdminUsersWithFirebase() {
  const db = assertFirestoreReady()
  const snapshot = await getDocs(query(collection(db, ADMIN_USERS_COLLECTION), orderBy('username', 'asc')))
  return snapshot.docs.map((item) => sanitizeUser(normalizeAdminUser(item.id, item.data())))
}

async function saveAdminUserWithFirebase(user) {
  const db = assertFirestoreReady()
  const username = String(user.username || '').trim()
  if (!username) throw new Error('請輸入帳號。')
  if (!user.id && !user.password) throw new Error('新增帳號需要設定密碼。')
  const payload = cleanAdminPayload({ ...user, username })
  const ref = doc(db, ADMIN_USERS_COLLECTION, username)
  const exists = await getDoc(ref)
  await setDoc(ref, {
    ...payload,
    createdAt: exists.exists() ? exists.data().createdAt || new Date().toISOString() : new Date().toISOString(),
    updatedAtServer: serverTimestamp(),
    ...(exists.exists() ? {} : { createdAtServer: serverTimestamp() })
  }, { merge: true })
  return listAdminUsersWithFirebase()
}

async function deleteAdminUserWithFirebase(username) {
  const db = assertFirestoreReady()
  await deleteDoc(doc(db, ADMIN_USERS_COLLECTION, username))
  return listAdminUsersWithFirebase()
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

  async listAdminUsers() {
    if (env.useMockData) return mockUsers.map(sanitizeUser)
    return listAdminUsersWithFirebase()
  },

  async saveAdminUser(user) {
    if (env.useMockData) throw new Error('模板模式不支援帳號管理。')
    return saveAdminUserWithFirebase(user)
  },

  async deleteAdminUser(username) {
    if (env.useMockData) throw new Error('模板模式不支援帳號管理。')
    return deleteAdminUserWithFirebase(username)
  },

  logout() {
    writeStorage(ADMIN_SESSION_KEY, null)
    writeStorage(ROLE_STORAGE_KEY, 'customer')
    window.dispatchEvent(new Event('admin-session-updated'))
  }
}
