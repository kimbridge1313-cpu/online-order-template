import { readStorage, writeStorage } from '../utils/storage'
import { orderService } from './orderService'

const STORAGE_KEY = 'online-order-template-daily-closings'

function list() {
  return readStorage(STORAGE_KEY, [])
}

function saveAll(records) {
  writeStorage(STORAGE_KEY, records)
}

function getBusinessDate(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

function isSamePaidDate(order, businessDate) {
  return order.paidAt?.slice(0, 10) === businessDate
}

function isSameCreatedDate(order, businessDate) {
  return order.createdAt?.slice(0, 10) === businessDate
}

function isSameStore(order, storeId) {
  if (!storeId || storeId === 'all') return true
  return order.store?.id === storeId || order.storeId === storeId
}

function isPaidOrder(order) {
  return order.status !== 'cancelled' && order.paymentStatus === 'paid'
}

function isUnpaidOnlineOrder(order) {
  return order.status !== 'cancelled' && order.source === 'customer_online' && order.paymentStatus !== 'paid'
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

export const mockDailyClosingService = {
  async listClosings() {
    return list().sort((a, b) => new Date(b.closedAt || b.createdAt) - new Date(a.closedAt || a.createdAt))
  },

  async getSummary({ businessDate = getBusinessDate(), storeId = 'all' } = {}) {
    const orders = await orderService.listOrders()
    const paidOrders = orders.filter((order) => isPaidOrder(order) && isSamePaidDate(order, businessDate) && isSameStore(order, storeId))
    const unpaidOnlineOrders = orders.filter((order) => isUnpaidOnlineOrder(order) && isSameCreatedDate(order, businessDate) && isSameStore(order, storeId))
    const existingClosing = list().find((record) => record.businessDate === businessDate && record.storeId === storeId)
    return {
      businessDate,
      storeId,
      orders: paidOrders,
      unpaidOnlineOrders,
      unpaidOnlineAmount: unpaidOnlineOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0),
      existingClosing,
      ...summarizeOrders(paidOrders)
    }
  },

  async closeDay({ businessDate, storeId = 'all', storeName = '全部門店', cashActual = 0, manualAdjustments = [], note = '', closedBy = '門店帳號' }) {
    const summary = await this.getSummary({ businessDate, storeId })
    const normalizedAdjustments = normalizeManualAdjustments(manualAdjustments)
    const manualAdjustmentTotal = sumManualAdjustments(normalizedAdjustments)
    const cashExpected = Math.max(0, summary.cashBaseAmount - manualAdjustmentTotal)
    const now = new Date().toISOString()
    const record = {
      id: `closing-${businessDate}-${storeId}`,
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
      unpaidOnlineOrderCount: summary.unpaidOnlineOrders.length,
      unpaidOnlineAmount: summary.unpaidOnlineAmount,
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
    }

    const records = list()
    const next = [record, ...records.filter((item) => item.id !== record.id)]
    saveAll(next)
    return record
  },

  async deleteClosing(id) {
    const next = list().filter((item) => item.id !== id)
    saveAll(next)
    return next
  }
}
