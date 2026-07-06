import { readStorage, writeStorage } from '../utils/storage'
import { orderService } from './orderService'

const STORAGE_KEY = 'online-order-template-daily-closings'

export const paymentLabels = {
  cash: '現金',
  linePay: 'LINE Pay',
  card: '信用卡',
  other: '其他'
}

function list() {
  return readStorage(STORAGE_KEY, [])
}

function saveAll(records) {
  writeStorage(STORAGE_KEY, records)
}

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
  const paymentSummary = { cash: 0, linePay: 0, card: 0, other: 0 }

  activeOrders.forEach((order) => {
    const paymentMethod = order.paymentMethod || 'cash'
    const key = paymentSummary[paymentMethod] === undefined ? 'other' : paymentMethod
    paymentSummary[key] += Number(order.totalAmount || 0)
  })

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
    paymentSummary,
    cashExpected: paymentSummary.cash
  }
}

export const dailyClosingService = {
  async listClosings() {
    return list().sort((a, b) => new Date(b.closedAt || b.createdAt) - new Date(a.closedAt || a.createdAt))
  },

  async getSummary({ businessDate = getBusinessDate(), storeId = 'all' } = {}) {
    const orders = await orderService.listOrders()
    const filteredOrders = orders.filter((order) => isSameBusinessDate(order, businessDate) && isSameStore(order, storeId))
    const existingClosing = list().find((record) => record.businessDate === businessDate && record.storeId === storeId)
    return {
      businessDate,
      storeId,
      orders: filteredOrders,
      existingClosing,
      ...summarizeOrders(filteredOrders)
    }
  },

  async closeDay({ businessDate, storeId = 'all', storeName = '全部門店', cashActual = 0, note = '', closedBy = '門店帳號' }) {
    const summary = await this.getSummary({ businessDate, storeId })
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
      paymentSummary: summary.paymentSummary,
      cashExpected: summary.cashExpected,
      cashActual: Number(cashActual || 0),
      cashDifference: Number(cashActual || 0) - summary.cashExpected,
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
  }
}
