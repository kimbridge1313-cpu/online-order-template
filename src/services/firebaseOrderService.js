import { collection, doc, getDocs, orderBy, query, setDoc } from 'firebase/firestore'
import { assertFirestoreReady } from '../config/firebase'
import { createOrderNumber } from '../utils/orderNumber'
import { lineNotificationService } from './lineNotificationService'

const COLLECTION = 'orders'

function cleanOrder(order) {
  return JSON.parse(JSON.stringify(order || {}))
}

function defaultPaymentStatus(payload = {}) {
  if (payload.paymentStatus) return payload.paymentStatus
  return payload.source === 'counter' ? 'paid' : 'unpaid'
}

function defaultPaidAt(payload = {}, now = '') {
  if (payload.paidAt) return payload.paidAt
  return payload.source === 'counter' ? now : ''
}

export const firebaseOrderService = {
  async listOrders() {
    const db = assertFirestoreReady()
    const snapshot = await getDocs(query(collection(db, COLLECTION), orderBy('createdAt', 'desc')))
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
  },

  async createOrder(payload) {
    const db = assertFirestoreReady()
    const now = new Date().toISOString()
    const id = `order-${Date.now()}`
    const order = cleanOrder({
      ...payload,
      id,
      orderNumber: createOrderNumber(),
      status: payload.source === 'counter' ? 'accepted' : 'pending',
      paymentStatus: defaultPaymentStatus(payload),
      paymentMethod: payload.paymentMethod || (payload.source === 'counter' ? 'cash' : ''),
      paidAt: defaultPaidAt(payload, now),
      paidBy: payload.paidBy || (payload.source === 'counter' ? '門店帳號' : ''),
      createdAt: now,
      updatedAt: now
    })
    await setDoc(doc(db, COLLECTION, id), order)
    await lineNotificationService.notifyNewOrder(order)
    return order
  },

  async updateOrder(orderId, patch) {
    const db = assertFirestoreReady()
    const payload = cleanOrder({ ...patch, updatedAt: new Date().toISOString() })
    await setDoc(doc(db, COLLECTION, orderId), payload, { merge: true })
    const orders = await this.listOrders()
    return orders.find((order) => order.id === orderId)
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
