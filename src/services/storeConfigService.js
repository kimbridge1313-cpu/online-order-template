import { collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, setDoc } from 'firebase/firestore'
import { env } from '../config/env'
import { assertFirestoreReady } from '../config/firebase'
import { readStorage, writeStorage } from '../utils/storage'

export const STORE_SETTINGS_KEY = 'online-order-template-store-settings'
export const STORE_LIST_KEY = 'online-order-template-store-list'

const SETTINGS_COLLECTION = 'systemSettings'
const SETTINGS_DOC_ID = 'storeSettings'
const STORES_COLLECTION = 'stores'

const defaultDiningModules = { dine_in: true, takeaway: true, delivery: false }
const defaultDeliverySettings = { freeDeliveryMinAmount: 0, maxDeliveryDistanceKm: 0 }
const defaultTimeSettings = { immediateEnabled: true, scheduledEnabled: true, preorderMinDays: 0 }

export const defaultStoreSettings = {
  brandName: '示範店家',
  logoUrl: '',
  logoPublicId: '',
  logoMeta: null,
  tableNumberEnabled: false,
  tableNumbers: [],
  diningModules: defaultDiningModules,
  deliverySettings: defaultDeliverySettings,
  timeSettings: defaultTimeSettings
}

export const defaultStores = [
  { id: 'demo-store', name: '示範門店', accountName: 'demo-store-account', latitude: 23.6978, longitude: 120.9605, address: '示範地址', isActive: true }
]

export function normalizeStoreSettings(rawSettings = {}) {
  return {
    ...defaultStoreSettings,
    ...rawSettings,
    logoUrl: rawSettings.logoUrl || env.storeLogoUrl || '',
    logoPublicId: rawSettings.logoPublicId || '',
    logoMeta: rawSettings.logoMeta || null,
    diningModules: {
      ...defaultDiningModules,
      ...(rawSettings.diningModules || {})
    },
    deliverySettings: {
      ...defaultDeliverySettings,
      ...(rawSettings.deliverySettings || {})
    },
    timeSettings: {
      ...defaultTimeSettings,
      ...(rawSettings.timeSettings || {})
    }
  }
}

function cleanPayload(payload) {
  return JSON.parse(JSON.stringify(payload || {}))
}

const mockStoreConfigService = {
  async getSettings() {
    const settings = normalizeStoreSettings(readStorage(STORE_SETTINGS_KEY, defaultStoreSettings))
    writeStorage(STORE_SETTINGS_KEY, settings)
    return settings
  },

  async saveSettings(settings) {
    const normalized = normalizeStoreSettings(settings)
    writeStorage(STORE_SETTINGS_KEY, normalized)
    window.dispatchEvent(new Event('store-settings-updated'))
    return normalized
  },

  async listStores() {
    const stores = readStorage(STORE_LIST_KEY, defaultStores)
    writeStorage(STORE_LIST_KEY, stores)
    return stores
  },

  async saveStore(store) {
    const stores = await this.listStores()
    const payload = { ...store, id: store.id || `store-${Date.now()}` }
    const next = stores.some((item) => item.id === payload.id)
      ? stores.map((item) => item.id === payload.id ? payload : item)
      : [...stores, payload]
    writeStorage(STORE_LIST_KEY, next)
    return next
  },

  async deleteStore(storeId) {
    const stores = await this.listStores()
    const next = stores.filter((store) => store.id !== storeId)
    writeStorage(STORE_LIST_KEY, next)
    return next
  }
}

const firebaseStoreConfigService = {
  async getSettings() {
    const db = assertFirestoreReady()
    const snapshot = await getDoc(doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID))
    const settings = snapshot.exists() ? normalizeStoreSettings(snapshot.data()) : defaultStoreSettings
    writeStorage(STORE_SETTINGS_KEY, settings)
    return settings
  },

  async saveSettings(settings) {
    const db = assertFirestoreReady()
    const normalized = normalizeStoreSettings(settings)
    await setDoc(doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID), cleanPayload(normalized), { merge: true })
    writeStorage(STORE_SETTINGS_KEY, normalized)
    window.dispatchEvent(new Event('store-settings-updated'))
    return normalized
  },

  async listStores() {
    const db = assertFirestoreReady()
    const snapshot = await getDocs(query(collection(db, STORES_COLLECTION), orderBy('name', 'asc')))
    const stores = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
    const next = stores.length ? stores : defaultStores
    writeStorage(STORE_LIST_KEY, next)
    return next
  },

  async saveStore(store) {
    const db = assertFirestoreReady()
    const id = store.id || `store-${Date.now()}`
    const payload = cleanPayload({ ...store, id })
    await setDoc(doc(db, STORES_COLLECTION, id), payload, { merge: true })
    return this.listStores()
  },

  async deleteStore(storeId) {
    const db = assertFirestoreReady()
    await deleteDoc(doc(db, STORES_COLLECTION, storeId))
    return this.listStores()
  }
}

export const storeConfigService = env.useMockData ? mockStoreConfigService : firebaseStoreConfigService