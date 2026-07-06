import { useEffect, useMemo, useState } from 'react'
import OrderCard from '../components/OrderCard'
import OrderEditModal from '../components/OrderEditModal'
import { orderService } from '../services/orderService'
import { readStorage } from '../utils/storage'

const CUSTOMER_PROFILE_KEY = 'online-order-template-customer-profile'
const MOCK_ROLE_KEY = 'online-order-template-role'

const tabs = [
  { value: 'all', label: '全部' },
  { value: 'dine_in', label: '內用' },
  { value: 'takeaway', label: '自取' }
]

export default function OrderManagementPage({ role: roleProp }) {
  const role = roleProp || readStorage(MOCK_ROLE_KEY, 'customer')
  const isStore = role === 'store'
  const customerProfile = readStorage(CUSTOMER_PROFILE_KEY, { name: '', phone: '' })
  const [orders, setOrders] = useState([])
  const [tab, setTab] = useState('all')
  const [status, setStatus] = useState('all')
  const [date, setDate] = useState(isStore ? new Date().toISOString().slice(0, 10) : '')
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

  async function changeStatus(orderId, nextStatus) {
    if (!isStore) return
    await orderService.updateOrder(orderId, { status: nextStatus })
    await loadOrders()
  }

  async function cancelOrder(orderId) {
    if (!isStore) return
    const reason = window.prompt('退單原因（可留空）') || ''
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
            <option value="pending">待處理</option>
            <option value="accepted">已接單</option>
            <option value="preparing">製作中</option>
            <option value="completed">已完成</option>
            <option value="cancelled">已取消</option>
          </select>
        </div>
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {filtered.map((order) => (
          <OrderCard key={order.id} order={order} readonly={!isStore} onStatusChange={changeStatus} onEdit={setEditingOrder} onCancel={cancelOrder} />
        ))}
        {filtered.length === 0 && <p className="card p-8 text-center text-muted lg:col-span-2">目前沒有符合條件的訂單。</p>}
      </div>

      {isStore && editingOrder && <OrderEditModal order={editingOrder} onClose={() => setEditingOrder(null)} onSave={saveOrder} />}
    </div>
  )
}
