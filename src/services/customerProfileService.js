import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { env } from '../config/env'
import { assertFirestoreReady } from '../config/firebase'
import { readStorage, writeStorage } from '../utils/storage'

const COLLECTION = 'customerProfiles'
const MOCK_STORAGE_KEY = 'online-order-template-customer-profiles'

function cleanProfile(profile = {}) {
  return JSON.parse(JSON.stringify({
    lineUserId: profile.lineUserId || '',
    lineDisplayName: profile.lineDisplayName || '',
    linePictureUrl: profile.linePictureUrl || '',
    name: profile.name || '',
    phone: profile.phone || '',
    updatedAt: new Date().toISOString()
  }))
}

function readMockProfiles() {
  return readStorage(MOCK_STORAGE_KEY, {}) || {}
}

export const customerProfileService = {
  async getByLineUserId(lineUserId) {
    if (!lineUserId) return null
    if (env.useMockData) return readMockProfiles()[lineUserId] || null
    const db = assertFirestoreReady()
    const snapshot = await getDoc(doc(db, COLLECTION, lineUserId))
    if (!snapshot.exists()) return null
    return { id: snapshot.id, ...snapshot.data() }
  },

  async save(profile) {
    const payload = cleanProfile(profile)
    if (!payload.lineUserId) throw new Error('缺少 LINE 使用者 ID，無法儲存顧客資料。')
    if (env.useMockData) {
      const profiles = readMockProfiles()
      profiles[payload.lineUserId] = payload
      writeStorage(MOCK_STORAGE_KEY, profiles)
      return payload
    }
    const db = assertFirestoreReady()
    await setDoc(doc(db, COLLECTION, payload.lineUserId), {
      ...payload,
      updatedAtServer: serverTimestamp(),
      createdAtServer: serverTimestamp()
    }, { merge: true })
    return payload
  }
}
