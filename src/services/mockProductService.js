import { sampleProducts } from '../data/sampleProducts'
import { readStorage, writeStorage } from '../utils/storage'

const STORAGE_KEY = 'online-order-template-products'

function ensureProducts() {
  const products = readStorage(STORAGE_KEY, null)
  if (products) return products
  writeStorage(STORAGE_KEY, sampleProducts)
  return sampleProducts
}

export const mockProductService = {
  async listProducts() {
    return ensureProducts().sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0))
  },
  async saveProduct(product) {
    const products = ensureProducts()
    const now = new Date().toISOString()
    const next = product.id
      ? products.map((item) => (item.id === product.id ? { ...product, updatedAt: now } : item))
      : [
          ...products,
          {
            ...product,
            id: `product-${Date.now()}`,
            createdAt: now,
            updatedAt: now
          }
        ]
    writeStorage(STORAGE_KEY, next)
    return next
  },
  async deleteProduct(productId) {
    const next = ensureProducts().filter((item) => item.id !== productId)
    writeStorage(STORAGE_KEY, next)
    return next
  },
  async resetProducts() {
    writeStorage(STORAGE_KEY, sampleProducts)
    return sampleProducts
  }
}
