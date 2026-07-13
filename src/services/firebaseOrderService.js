import { collection, doc, getDocs, orderBy, query, setDoc } from 'firebase/firestore'
import { assertFirestoreReady } from '../config/firebase'
import { createOrderNumber } from '../utils/orderNumber'
import { lineNotificationService } from './lineNotificationService'

const COLLECTION = 'orders'

function cleanOrder(order) {
  return JSON.parse(JSON.stringify(order || {}))
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
