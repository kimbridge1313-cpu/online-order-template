import { collection, deleteDoc, doc, getDocs, query, setDoc, where } from 'firebase/firestore'
import { env } from '../config/env'
import { assertFirestoreReady } from '../config/firebase'
import { readStorage, writeStorage } from '../utils/storage'

const COLLECTION = 'storeProductStatus'
const STORAGE_KEY = 'online-order-template-store-product-status'
export const PRODUCT_STORE_STATUS = {
  AVAILABLE: 'available',
  SOLD_OUT: 'sold_out',
  HIDDEN: 'hidden'
}

export function getStoreStatusDate(date = new Date()) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return localDate.toISOString().slice(0, 10)
}

export function normalizeStoreProductStatus(status) {
  if (status === PRODUCT_STORE_STATUS.AVAILABLE) return PRODUCT_STORE_STATUS.AVAILABLE
  if (status === PRODUCT_STORE_STATUS.SOLD_OUT) return PRODUCT_STORE_STATUS.SOLD_OUT
  return PRODUCT_STORE_STATUS.HIDDEN
}

function makeStatusDocId({ storeId, productId, date }) {
  return `${date}__${storeId}__${productId}`
}

function readMockRows() {
  return readStorage(STORAGE_KEY, [])
}

function writeMockRows(rows) {
  writeStorage(STORAGE_KEY, rows)
  window.dispatchEvent(new Event('store-product-status-updated'))
}

function rowsToMap(rows) {
  return rows.reduce((map, row) => {
    if (row.productId) map[row.productId] = normalizeStoreProductStatus(row.status)
    return map
  }, {})
}

const mockStoreProductStatusService = {
  async listStoreProductStatuses({ storeId, date = getStoreStatusDate() }) {
    if (!storeId) return {}
    const rows = readMockRows().filter((row) => row.storeId === storeId && row.date === date)
    return rowsToMap(rows)
  },

  async saveStoreProductStatus({ storeId, productId, status, date = getStoreStatusDate() }) {
    if (!storeId || !productId) return this.listStoreProductStatuses({ storeId, date })
    const normalized = normalizeStoreProductStatus(status)
    const current = readMockRows().filter((row) => !(row.storeId === storeId && row.productId === productId && row.date === date))
    const next = normalized === PRODUCT_STORE_STATUS.HIDDEN
      ? current
      : [
          ...current,
          {
            id: makeStatusDocId({ storeId, productId, date }),
            storeId,
            productId,
            date,
            status: normalized,
            updatedAt: new Date().toISOString()
          }
        ]
    writeMockRows(next)
    return this.listStoreProductStatuses({ storeId, date })
  },

  async bulkSaveStoreProductStatuses({ storeId, productIds = [], status, date = getStoreStatusDate() }) {
    if (!storeId) return {}
    const normalized = normalizeStoreProductStatus(status)
    const productSet = new Set(productIds.filter(Boolean))
    const current = readMockRows().filter((row) => !(row.storeId === storeId && row.date === date && productSet.has(row.productId)))
    const nextRows = normalized === PRODUCT_STORE_STATUS.HIDDEN
      ? []
      : [...productSet].map((productId) => ({
          id: makeStatusDocId({ storeId, productId, date }),
          storeId,
          productId,
          date,
          status: normalized,
          updatedAt: new Date().toISOString()
        }))
    writeMockRows([...current, ...nextRows])
    return this.listStoreProductStatuses({ storeId, date })
  }
}

const firebaseStoreProductStatusService = {
  async listStoreProductStatuses({ storeId, date = getStoreStatusDate() }) {
    if (!storeId) return {}
    const db = assertFirestoreReady()
    const snapshot = await getDocs(query(
      collection(db, COLLECTION),
      where('storeId', '==', storeId),
      where('date', '==', date)
    ))
    return rowsToMap(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })))
  },

  async saveStoreProductStatus({ storeId, productId, status, date = getStoreStatusDate() }) {
    if (!storeId || !productId) return this.listStoreProductStatuses({ storeId, date })
    const db = assertFirestoreReady()
    const normalized = normalizeStoreProductStatus(status)
    const id = makeStatusDocId({ storeId, productId, date })
    if (normalized === PRODUCT_STORE_STATUS.HIDDEN) {
      await deleteDoc(doc(db, COLLECTION, id))
    } else {
      await setDoc(doc(db, COLLECTION, id), {
        id,
        storeId,
        productId,
        date,
        status: normalized,
        updatedAt: new Date().toISOString()
      }, { merge: true })
    }
    return this.listStoreProductStatuses({ storeId, date })
  },

  async bulkSaveStoreProductStatuses({ storeId, productIds = [], status, date = getStoreStatusDate() }) {
    if (!storeId) return {}
    const db = assertFirestoreReady()
    const normalized = normalizeStoreProductStatus(status)
    await Promise.all(productIds.filter(Boolean).map((productId) => {
      const id = makeStatusDocId({ storeId, productId, date })
      if (normalized === PRODUCT_STORE_STATUS.HIDDEN) return deleteDoc(doc(db, COLLECTION, id))
      return setDoc(doc(db, COLLECTION, id), {
        id,
        storeId,
        productId,
        date,
        status: normalized,
        updatedAt: new Date().toISOString()
      }, { merge: true })
    }))
    return this.listStoreProductStatuses({ storeId, date })
  }
}

export const storeProductStatusService = env.useMockData ? mockStoreProductStatusService : firebaseStoreProductStatusService
