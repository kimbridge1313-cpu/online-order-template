import { useEffect, useMemo, useState } from 'react'
import { Pencil, XCircle } from 'lucide-react'
import OrderEditModal from '../components/OrderEditModal'
import StatusBadge from '../components/StatusBadge'
import { orderService } from '../services/orderService'
import { readStorage } from '../utils/storage'
import { formatPrice } from '../utils/price'

const CUSTOMER_PROFILE_KEY = 'online-order-template-customer-profile'
const MOCK_ROLE_KEY = 'online-order-template-role'

const tabs = [
  { value: 'all', label: '全部' },
  { value: 'dine_in', label: '內用' },
  { value: 'takeaway', label: '自取' }
]

const diningLabels = { dine_in: '內用', takeaway: '自取', preorder: '預訂單' }
const sourceLabels = { customer_online: '線上預約', counter: '門店點餐' }

export default function OrderManagementPage({ role: roleProp }) {
  const role = roleProp || readStorage(MOCK_ROLE_KEY, 'customer')
  const isStore = role === 'store' || role === 'owner'
  const customerProfile = readStorage(CUSTOMER_PROFILE_KEY, { name: '', phone: '' })
  const [orders, setOrders] = useState([])
  const [tab, setTab] = useState('all')
  const [status, setStatus] = useState('all')
  const [date, setDate] = useState(isStore ? new Date().toISOString().slice(0, 10) : '')
  const [expandedOrderId, setExpandedOrderId] = useState(null)
  const [editingOrder, setEditingOrder] = useState(null)

  async function loadOrders() {
    setOrders(await orderService.listOrders())
  }

  useEffect(() => { loadOrders() }, [])

  const filtered = useMemo(() => orders.filter((order) => {
    const sameOwner = isStore || (
      order.source === 'customer_online' && (
        order.customer?.lineUserId === 'mock-line-user-id' ||
        (customerProfile.phone && order.customer?.phone === customerProfile.phone)
      )
    )
    const sameType = tab === 'all' || order.diningType === tab
    const sameStatus = status === 'all' || order.status === status
    const sameDate = !date || order.createdAt?.slice(0, 10) === date
    return sameOwner && sameType && sameStatus && sameDate
  }), [orders, tab, status, date, isStore, customerProfile.phone])

  async function acceptOrder(orderId) {
    if (!isStore) return
    await orderService.acceptOrder(orderId)
    await loadOrders()
  }

  async function changeStatus(orderId, nextStatus) {
    if (!isStore) return
    await orderService.updateOrder(orderId, { status: nextStatus })
    await loadOrders()
  }

  async function cancelOrder(orderId) {
    if (!isStore) return
    const reason = window.prompt('取消原因（可留空）') || ''
    await orderService.cancelOrder(orderId, reason)
    await loadOrders()
  }

  async function saveOrder(orderId, draft) {
    if (!isStore) return
    await orderService.updateOrder(orderId, draft)
    setEditingOrder(null)
    await loadOrders()
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <section className="card p-5">
        <p className="text-xs font-semibold text-accent">{isStore ? 'Order Management' : 'My Orders'}</p>
        <h1 className="mt-1 text-3xl font-black">{isStore ? '訂單管理頁' : '我的訂單'}</h1>
        {!isStore && <p className="mt-2 text-sm text-muted">這裡只會顯示你自己的線上訂單。</p>}
        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_220px_220px]">
          <div className="grid grid-cols-3 gap-2 rounded-3xl bg-cream p-2">
            {tabs.map((item) => (
              <button key={item.value} className={`rounded-2xl px-4 py-3 text-sm font-bold ${tab === item.value ? 'bg-white text-brand shadow' : 'text-muted'}`} onClick={() => setTab(item.value)} type="button">{item.label}</button>
            ))}
          </div>
          <input className="input" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          <select className="input" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">全部狀態</option>
            <option value="pending">待接單</option>
            <option value="accepted">已接收</option>
            <option value="preparing">製作中</option>
            <option value="completed">已完成</option>
            <option value="cancelled">已取消</option>
          </select>
        </div>
      </section>

      <section className="card mt-6 overflow-hidden">
        <div className="hidden grid-cols-[150px_1fr_120px_110px_130px_190px] gap-3 border-b border-line bg-cream px-4 py-3 text-xs font-bold text-muted lg:grid">
          <span>訂單</span>
          <span>顧客 / 品項</span>
          <span>用餐</span>
          <span>金額</span>
          <span>狀態</span>
          <span>操作</span>
        </div>

        <div className="divide-y divide-line">
          {filtered.map((order) => {
            const itemSummary = (order.items || []).map((item) => `${item.name}×${item.quantity}`).join('、')
            const expanded = expandedOrderId === order.id
            const isOnlineOrder = order.source === 'customer_online'
            const needsAccept = isOnlineOrder && order.status === 'pending'
            return (
              <article key={order.id} className="bg-white px-4 py-4">
                <div className="grid gap-3 lg:grid-cols-[150px_1fr_120px_110px_130px_190px] lg:items-center">
                  <button className="text-left" type="button" onClick={() => setExpandedOrderId(expanded ? null : order.id)}>
                    <p className="font-black text-ink">{order.orderNumber}</p>
                    <p className="mt-1 text-xs text-muted">{new Date(order.createdAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}</p>
                    <p className="mt-1 text-xs font-bold text-accent">{sourceLabels[order.source] || order.source}</p>
                  </button>

                  <div>
                    <p className="font-bold">{order.customer?.name || '未填'}{order.store?.name ? `｜${order.store.name}` : ''}</p>
                    <p className="mt-1 line-clamp-1 text-sm text-muted">{itemSummary || '無品項'}</p>
                  </div>

                  <div className="text-sm">
                    <p className="font-bold">{diningLabels[order.diningType] || order.diningType}</p>
                    {order.pickupTime && <p className="mt-1 text-xs text-muted">{order.pickupTime}</p>}
                  </div>

                  <p className="text-lg font-black text-brand">{formatPrice(order.totalAmount)}</p>
                  <StatusBadge status={order.status} />

                  <div className="flex flex-wrap gap-2">
                    {isStore && needsAccept && <button className="btn-secondary py-2" type="button" onClick={() => acceptOrder(order.id)}>接單</button>}
                    {isStore && order.status !== 'cancelled' && order.status !== 'completed' && <button className="btn-secondary py-2" type="button" onClick={() => setEditingOrder(order)}><Pencil size={15} className="inline-block" /> 修改</button>}
                    {isStore && order.status !== 'cancelled' && <button className="btn-danger py-2" type="button" onClick={() => cancelOrder(order.id)}><XCircle size={15} className="inline-block" /> 取消</button>}
                    {!isStore && <button className="btn-secondary py-2" type="button" onClick={() => setExpandedOrderId(expanded ? null : order.id)}>{expanded ? '收合' : '明細'}</button>}
                  </div>
                </div>

                {expanded && (
                  <div className="mt-4 rounded-3xl bg-cream p-4">
                    <div className="grid gap-2 text-sm md:grid-cols-2">
                      <p>手機：{order.customer?.phone || '未填'}</p>
                      <p>門店：{order.store?.name || '未指定'}</p>
                      <p>來源：{sourceLabels[order.source] || order.source}</p>
                      {order.acceptedAt && <p>接單時間：{new Date(order.acceptedAt).toLocaleString('zh-TW')}</p>}
                      {order.note && <p className="md:col-span-2">備註：{order.note}</p>}
                      {order.cancelReason && <p className="text-red-700 md:col-span-2">取消原因：{order.cancelReason}</p>}
                    </div>
                    <div className="mt-3 space-y-2">
                      {(order.items || []).map((item, index) => (
                        <div key={`${order.id}-${item.productId}-${index}`} className="rounded-2xl border border-line bg-white p-3">
                          <div className="flex justify-between gap-3"><p className="font-bold">{item.name} × {item.quantity}</p><p className="font-bold text-brand">{formatPrice(item.subtotal)}</p></div>
                          {item.selectedOptions?.length > 0 && <p className="mt-1 text-xs text-muted">{item.selectedOptions.map((option) => `${option.groupName}：${option.optionName}`).join('、')}</p>}
                          {item.note && <p className="mt-1 text-xs text-muted">商品備註：{item.note}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            )
          })}
          {filtered.length === 0 && <p className="p-8 text-center text-muted">目前沒有符合條件的訂單。</p>}
        </div>
      </section>

      {isStore && editingOrder && <OrderEditModal order={editingOrder} onClose={() => setEditingOrder(null)} onSave={saveOrder} />}
    </div>
  )
}
