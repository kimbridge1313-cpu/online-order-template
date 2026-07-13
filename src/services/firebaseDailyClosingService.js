import { collection, doc, getDocs, orderBy, query, setDoc } from 'firebase/firestore'
import { assertFirestoreReady } from '../config/firebase'
import { orderService } from './orderService'

const COLLECTION = 'dailyClosings'

function getBusinessDate(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

function isSameBusinessDate(order, businessDate) {
  return order.createdAt?.slice(0, 10) === businessDate
}

function isSameStore(order, storeId) {
  if (!storeId || storeId === 'all') return true
  return order.store?.id === storeId || order.storeId === storeId
}

function summarizeOrders(orders) {
  const activeOrders = orders.filter((order) => order.status !== 'cancelled')
  const cancelledOrders = orders.filter((order) => order.status === 'cancelled')
  const grossSales = orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0)
  const cancelledAmount = cancelledOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0)
  const netSales = activeOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0)
  const averageOrderAmount = activeOrders.length ? Math.round(netSales / activeOrders.length) : 0

  return {
    orderCount: orders.length,
    activeOrderCount: activeOrders.length,
    completedOrderCount: orders.filter((order) => order.status === 'completed').length,
    cancelledOrderCount: cancelledOrders.length,
    onlineOrderCount: orders.filter((order) => order.source === 'customer_online').length,
    counterOrderCount: orders.filter((order) => order.source === 'counter').length,
    grossSales,
    cancelledAmount,
    netSales,
    averageOrderAmount,
    cashBaseAmount: netSales
  }
}

function normalizeManualAdjustments(items = []) {
  return items
    .map((item) => ({
      id: item.id || `adjustment-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: item.name || '手動對帳項目',
      amount: Number(item.amount || 0),
      note: item.note || ''
    }))
    .filter((item) => item.name || item.amount)
}

function sumManualAdjustments(items = []) {
  return normalizeManualAdjustments(items).reduce((sum, item) => sum + Number(item.amount || 0), 0)
}

function cleanRecord(record) {
  return JSON.parse(JSON.stringify(record || {}))
}

export const firebaseDailyClosingService = {
  async listClosings() {
    const db = assertFirestoreReady()
    const snapshot = await getDocs(query(collection(db, COLLECTION), orderBy('closedAt', 'desc')))
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
  },

  async getSummary({ businessDate = getBusinessDate(), storeId = 'all' } = {}) {
    const db = assertFirestoreReady()
    const orders = await orderService.listOrders()
    const closingsSnapshot = await getDocs(collection(db, COLLECTION))
    const closings = closingsSnapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
    const filteredOrders = orders.filter((order) => isSameBusinessDate(order, businessDate) && isSameStore(order, storeId))
    const existingClosing = closings.find((record) => record.businessDate === businessDate && record.storeId === storeId)
    return {
      businessDate,
      storeId,
      orders: filteredOrders,
      existingClosing,
      ...summarizeOrders(filteredOrders)
    }
  },

  async closeDay({ businessDate, storeId = 'all', storeName = '全部門店', cashActual = 0, manualAdjustments = [], note = '', closedBy = '門店帳號' }) {
    const db = assertFirestoreReady()
    const summary = await this.getSummary({ businessDate, storeId })
    const normalizedAdjustments = normalizeManualAdjustments(manualAdjustments)
    const manualAdjustmentTotal = sumManualAdjustments(normalizedAdjustments)
    const cashExpected = Math.max(0, summary.cashBaseAmount - manualAdjustmentTotal)
    const now = new Date().toISOString()
    const id = `closing-${businessDate}-${storeId}`
    const record = cleanRecord({
      id,
      businessDate,
      storeId,
      storeName,
      orderCount: summary.orderCount,
      activeOrderCount: summary.activeOrderCount,
      completedOrderCount: summary.completedOrderCount,
      cancelledOrderCount: summary.cancelledOrderCount,
      onlineOrderCount: summary.onlineOrderCount,
      counterOrderCount: summary.counterOrderCount,
      grossSales: summary.grossSales,
      cancelledAmount: summary.cancelledAmount,
      netSales: summary.netSales,
      averageOrderAmount: summary.averageOrderAmount,
      cashBaseAmount: summary.cashBaseAmount,
      manualAdjustments: normalizedAdjustments,
      manualAdjustmentTotal,
      cashExpected,
      cashActual: Number(cashActual || 0),
      cashDifference: Number(cashActual || 0) - cashExpected,
      status: 'closed',
      note,
      closedBy,
      closedAt: now,
      updatedAt: now
    })

    await setDoc(doc(db, COLLECTION, id), record)
    return record
  }
}
