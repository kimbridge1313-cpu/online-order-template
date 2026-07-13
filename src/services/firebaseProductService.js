import { collection, deleteDoc, doc, getDocs, orderBy, query, setDoc, writeBatch } from 'firebase/firestore'
import { assertFirestoreReady } from '../config/firebase'
import { sampleProducts } from '../data/sampleProducts'

const COLLECTION = 'products'

function cleanProduct(product) {
  return JSON.parse(JSON.stringify(product || {}))
}

export const firebaseProductService = {
  async listProducts() {
    const db = assertFirestoreReady()
    const snapshot = await getDocs(query(collection(db, COLLECTION), orderBy('sortOrder', 'asc')))
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
  },

  async saveProduct(product) {
    const db = assertFirestoreReady()
    const now = new Date().toISOString()
    const id = product.id || `product-${Date.now()}`
    const payload = cleanProduct({
      ...product,
      id,
      createdAt: product.createdAt || now,
      updatedAt: now
    })
    await setDoc(doc(db, COLLECTION, id), payload, { merge: true })
    return this.listProducts()
  },

  async deleteProduct(productId) {
    const db = assertFirestoreReady()
    await deleteDoc(doc(db, COLLECTION, productId))
    return this.listProducts()
  },

  async resetProducts() {
    const db = assertFirestoreReady()
    const batch = writeBatch(db)
    sampleProducts.forEach((product, index) => {
      const id = product.id || `product-${index + 1}`
      batch.set(doc(db, COLLECTION, id), cleanProduct({ ...product, id }), { merge: true })
    })
    await batch.commit()
    return this.listProducts()
  }
}
