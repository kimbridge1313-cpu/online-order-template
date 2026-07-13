import { readStorage, writeStorage } from '../utils/storage'
import { createOrderNumber } from '../utils/orderNumber'
import { lineNotificationService } from './lineNotificationService'

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
      status: payload.source === 'counter' ? 'accepted' : 'pending',
      paymentStatus: payload.paymentStatus || 'unpaid',
      paymentMethod: payload.paymentMethod || '',
      paidAt: payload.paidAt || '',
      paidBy: payload.paidBy || '',
      createdAt: now,
      updatedAt: now
    }
    const next = [order, ...list()]
    saveAll(next)
    await lineNotificationService.notifyNewOrder(order)
    return order
  },
  async updateOrder(orderId, patch) {
    const next = list().map((order) =>
      order.id === orderId ? { ...order, ...patch, updatedAt: new Date().toISOString() } : order
    )
    saveAll(next)
    return next.find((order) => order.id === orderId)
  },
  async acceptOrder(orderId) {
    const order = await this.updateOrder(orderId, {
      status: 'accepted',
      acceptedAt: new Date().toISOString()
    })
    if (order && order.source === 'customer_online') await lineNotificationService.notifyAcceptedOrder(order)
    return order
  },
  async markOrderPaid(orderId, { paymentMethod = 'cash', paidBy = '' } = {}) {
    return this.updateOrder(orderId, {
      paymentStatus: 'paid',
      paymentMethod,
      paidBy,
      paidAt: new Date().toISOString()
    })
  },
  async cancelOrder(orderId, cancelReason = '') {
    const order = await this.updateOrder(orderId, {
      status: 'cancelled',
      cancelReason,
      cancelledAt: new Date().toISOString()
    })
    if (order) await lineNotificationService.notifyCancelledOrder(order)
    return order
  }
}
