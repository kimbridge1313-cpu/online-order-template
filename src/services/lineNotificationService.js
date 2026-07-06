import { readStorage, writeStorage } from '../utils/storage'

const NOTIFICATION_LOG_KEY = 'online-order-template-line-notification-log'

function getLog() {
  return readStorage(NOTIFICATION_LOG_KEY, [])
}

function saveNotification(notification) {
  const next = [notification, ...getLog()]
  writeStorage(NOTIFICATION_LOG_KEY, next)
  console.info('[LINE notification template]', notification)
  return notification
}

function buildOrderSummary(order) {
  const itemText = (order.items || []).map((item) => `${item.name} x ${item.quantity}`).join('、')
  return [
    `訂單編號：${order.orderNumber}`,
    order.store?.name ? `門店：${order.store.name}` : '',
    `金額：$${order.totalAmount}`,
    itemText ? `品項：${itemText}` : '',
    order.note ? `備註：${order.note}` : ''
  ].filter(Boolean).join('\n')
}

export const lineNotificationService = {
  async notifyNewOrder(order) {
    const summary = buildOrderSummary(order)
    const now = new Date().toISOString()
    return [
      saveNotification({
        id: `line-store-new-${Date.now()}`,
        type: 'new_order_to_store',
        target: 'store',
        storeId: order.store?.id || '',
        title: '新訂單通知',
        message: `有一筆新訂單。\n${summary}`,
        status: 'queued_template_only',
        createdAt: now
      }),
      saveNotification({
        id: `line-customer-new-${Date.now()}`,
        type: 'new_order_to_customer',
        target: 'customer',
        lineUserId: order.customer?.lineUserId || '',
        title: '訂單已送出',
        message: `你的訂單已送出，待店家接單。\n${summary}`,
        status: 'queued_template_only',
        createdAt: now
      })
    ]
  },

  async notifyAcceptedOrder(order) {
    const summary = buildOrderSummary(order)
    const now = new Date().toISOString()
    return saveNotification({
      id: `line-customer-accepted-${Date.now()}`,
      type: 'accepted_order_to_customer',
      target: 'customer',
      lineUserId: order.customer?.lineUserId || '',
      title: '店家已接收訂單',
      message: `店家已接收你的訂單。\n${summary}`,
      status: 'queued_template_only',
      createdAt: now
    })
  },

  async notifyCancelledOrder(order) {
    const summary = buildOrderSummary(order)
    const now = new Date().toISOString()
    return [
      saveNotification({
        id: `line-store-cancel-${Date.now()}`,
        type: 'cancel_order_to_store',
        target: 'store',
        storeId: order.store?.id || '',
        title: '取消訂單通知',
        message: `訂單已取消。\n${summary}`,
        status: 'queued_template_only',
        createdAt: now
      }),
      saveNotification({
        id: `line-customer-cancel-${Date.now()}`,
        type: 'cancel_order_to_customer',
        target: 'customer',
        lineUserId: order.customer?.lineUserId || '',
        title: '訂單已取消',
        message: `你的訂單已取消。\n${summary}`,
        status: 'queued_template_only',
        createdAt: now
      })
    ]
  },

  listNotifications() {
    return getLog()
  }
}
