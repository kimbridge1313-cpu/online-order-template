import { readStorage, writeStorage } from '../utils/storage'
import { createOrderNumber } from '../utils/orderNumber'

const STORAGE_KEY = 'online-order-template-orders'

function list() {
  return readStorage(STORAGE_KEY, [])
}

function saveAll(orders) {
  writeStorage(STORAGE_KEY, orders)
}

export const mockOrderService = {
  async listOrders() {
    return list().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  },
  async createOrder(payload) {
    const now = new Date().toISOString()
    const order = {
      ...payload,
      id: `order-${Date.now()}`,
      orderNumber: createOrderNumber(),
      status: 'pending',
      createdAt: now,
      updatedAt: now
    }
    const next = [order, ...list()]
    saveAll(next)
    return order
  },
  async updateOrder(orderId, patch) {
    const next = list().map((order) =>
      order.id === orderId ? { ...order, ...patch, updatedAt: new Date().toISOString() } : order
    )
    saveAll(next)
    return next.find((order) => order.id === orderId)
  },
  async cancelOrder(orderId, cancelReason = '') {
    return this.updateOrder(orderId, {
      status: 'cancelled',
      cancelReason,
      cancelledAt: new Date().toISOString()
    })
  }
}
