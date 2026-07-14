import { doc, getDoc, setDoc } from 'firebase/firestore'
import { getServerFirestore } from '../_lib/firebase.js'
import { json, pushLineMessages } from '../_lib/line.js'

function parsePostbackData(data = '') {
  const params = new URLSearchParams(data)
  return {
    action: params.get('action') || '',
    orderId: params.get('orderId') || ''
  }
}

function buildOrderSummary(order) {
  const itemText = (order.items || []).map((item) => `${item.name} x ${item.quantity}`).join('、')
  return [
    `訂單編號：${order.orderNumber || order.id}`,
    order.store?.name ? `門店：${order.store.name}` : '',
    order.customer?.name ? `顧客：${order.customer.name}` : '',
    `金額：$${Number(order.totalAmount || 0).toLocaleString('zh-TW')}`,
    itemText ? `品項：${itemText}` : '',
    order.pickupTime ? `時間：${order.pickupTime}` : '',
    order.note ? `備註：${order.note}` : ''
  ].filter(Boolean).join('\n')
}

async function acceptOrder(orderId) {
  const db = getServerFirestore()
  const orderRef = doc(db, 'orders', orderId)
  const snapshot = await getDoc(orderRef)
  if (!snapshot.exists()) return { ok: false, error: 'order_not_found' }

  const order = { id: snapshot.id, ...snapshot.data() }
  const now = new Date().toISOString()

  if (order.status === 'accepted') {
    return { ok: true, alreadyAccepted: true, order }
  }

  if (order.status === 'cancelled') {
    return { ok: false, error: 'order_already_cancelled', order }
  }

  const acceptedOrder = {
    ...order,
    status: 'accepted',
    acceptedAt: now,
    acceptedBy: 'LINE',
    updatedAt: now
  }

  await setDoc(orderRef, {
    status: 'accepted',
    acceptedAt: now,
    acceptedBy: 'LINE',
    updatedAt: now
  }, { merge: true })

  const customerLineUserId = acceptedOrder.customer?.lineUserId || ''
  if (customerLineUserId) {
    await pushLineMessages({
      to: customerLineUserId,
      messages: [
        {
          type: 'text',
          text: `店家已接收你的訂單\n${buildOrderSummary(acceptedOrder)}`
        }
      ]
    })
  }

  return { ok: true, order: acceptedOrder, customerNotified: Boolean(customerLineUserId) }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method_not_allowed' })

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const events = Array.isArray(body.events) ? body.events : []
    const results = []

    for (const event of events) {
      if (event.type !== 'postback') continue
      const { action, orderId } = parsePostbackData(event.postback?.data || '')
      if (action !== 'accept_order') continue
      if (!orderId) {
        results.push({ ok: false, error: 'missing_order_id' })
        continue
      }
      results.push(await acceptOrder(orderId))
    }

    return json(res, 200, { ok: true, results })
  } catch (error) {
    return json(res, 500, {
      ok: false,
      error: error.code || error.message || 'unknown_error',
      detail: error.lineResponse || ''
    })
  }
}
