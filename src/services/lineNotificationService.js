import { readStorage, writeStorage } from '../utils/storage'

const NOTIFICATION_LOG_KEY = 'online-order-template-line-notification-log'

function getLog() {
  return readStorage(NOTIFICATION_LOG_KEY, [])
}

function saveNotification(notification) {
  const next = [notification, ...getLog()]
  writeStorage(NOTIFICATION_LOG_KEY, next)
  console.info('[LINE notification]', notification)
  return notification
}

function formatAmount(amount) {
  return `$${Number(amount || 0).toLocaleString('zh-TW')}`
}

function buildItemText(order) {
  return (order.items || []).map((item) => `${item.name} x ${item.quantity}`).join('、')
}

function buildOrderSummary(order) {
  const itemText = buildItemText(order)
  return [
    `訂單編號：${order.orderNumber}`,
    order.store?.name ? `門店：${order.store.name}` : '',
    order.customer?.name ? `顧客：${order.customer.name}` : '',
    order.customer?.phone ? `電話：${order.customer.phone}` : '',
    `金額：${formatAmount(order.totalAmount)}`,
    itemText ? `品項：${itemText}` : '',
    order.pickupTime ? `時間：${order.pickupTime}` : '',
    order.deliveryAddress ? `外送：${order.deliveryAddress}` : '',
    order.note ? `備註：${order.note}` : ''
  ].filter(Boolean).join('\n')
}

function getStoreLineUserId(order) {
  return order.store?.notifyLineUserId || order.store?.lineUserId || order.storeLineUserId || ''
}

function getCustomerLineUserId(order) {
  return order.customer?.lineUserId || ''
}

function buildNewOrderFlexMessage(order) {
  const itemText = buildItemText(order) || '未列品項'
  const customerText = [order.customer?.name || '', order.customer?.phone || ''].filter(Boolean).join('｜') || '未填顧客資料'
  const timeText = order.pickupTime || '立即 / 依訂單備註'
  const noteText = order.note || '無'
  return {
    type: 'flex',
    altText: `新訂單通知｜${order.orderNumber}`,
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          { type: 'text', text: '新訂單通知', weight: 'bold', size: 'lg', color: '#3B2A1F' },
          { type: 'text', text: `#${order.orderNumber || order.id}`, size: 'sm', color: '#8A6F5A' },
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            margin: 'md',
            contents: [
              { type: 'text', text: `門店：${order.store?.name || '未指定'}`, size: 'sm', wrap: true },
              { type: 'text', text: `顧客：${customerText}`, size: 'sm', wrap: true },
              { type: 'text', text: `金額：${formatAmount(order.totalAmount)}`, size: 'sm', weight: 'bold', wrap: true },
              { type: 'text', text: `品項：${itemText}`, size: 'sm', wrap: true },
              { type: 'text', text: `時間：${timeText}`, size: 'sm', wrap: true },
              { type: 'text', text: `備註：${noteText}`, size: 'xs', color: '#666666', wrap: true }
            ]
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            height: 'sm',
            color: '#6B4E2E',
            action: {
              type: 'postback',
              label: '接單',
              data: `action=accept_order&orderId=${encodeURIComponent(order.id)}`,
              displayText: `接單 ${order.orderNumber || order.id}`
            }
          }
        ]
      }
    }
  }
}

async function pushLineMessages({ target, to, messages }) {
  const response = await fetch('/api/line/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target, to, messages })
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !payload.ok) throw new Error(payload.error || 'LINE 通知送出失敗')
  return payload
}

async function notify({ type, target, to, storeId = '', title, message, messages }) {
  const now = new Date().toISOString()
  const base = {
    id: `line-${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    target,
    storeId,
    lineUserId: to || '',
    title,
    message,
    status: 'pending',
    createdAt: now
  }

  try {
    const result = await pushLineMessages({
      target,
      to,
      messages: messages || [{ type: 'text', text: `${title}\n${message}` }]
    })
    return saveNotification({
      ...base,
      status: result.skipped ? 'skipped_missing_line_target' : 'sent',
      sentAt: result.skipped ? '' : new Date().toISOString(),
      error: result.reason || ''
    })
  } catch (error) {
    return saveNotification({
      ...base,
      status: 'failed',
      error: error.message || 'LINE 通知失敗'
    })
  }
}

export const lineNotificationService = {
  async notifyNewOrder(order) {
    const summary = buildOrderSummary(order)
    return Promise.all([
      notify({
        type: 'new_order_to_store',
        target: 'store',
        to: getStoreLineUserId(order),
        storeId: order.store?.id || order.storeId || '',
        title: '新訂單通知',
        message: `有一筆新訂單。\n${summary}`,
        messages: [buildNewOrderFlexMessage(order)]
      }),
      notify({
        type: 'new_order_to_customer',
        target: 'customer',
        to: getCustomerLineUserId(order),
        title: '訂單已送出',
        message: `你的訂單已送出，待店家接單。\n${summary}`
      })
    ])
  },

  async notifyAcceptedOrder(order) {
    const summary = buildOrderSummary(order)
    return notify({
      type: 'accepted_order_to_customer',
      target: 'customer',
      to: getCustomerLineUserId(order),
      title: '店家已接收訂單',
      message: `店家已接收你的訂單。\n${summary}`
    })
  },

  async notifyCancelledOrder(order) {
    const summary = buildOrderSummary(order)
    return Promise.all([
      notify({
        type: 'cancel_order_to_store',
        target: 'store',
        to: getStoreLineUserId(order),
        storeId: order.store?.id || order.storeId || '',
        title: '取消訂單通知',
        message: `訂單已取消。\n${summary}`
      }),
      notify({
        type: 'cancel_order_to_customer',
        target: 'customer',
        to: getCustomerLineUserId(order),
        title: '訂單已取消',
        message: `你的訂單已取消。\n${summary}`
      })
    ])
  },

  listNotifications() {
    return getLog()
  }
}
