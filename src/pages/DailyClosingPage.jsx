import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, RefreshCw, Trash2 } from 'lucide-react'
import { dailyClosingService } from '../services/dailyClosingService'
import { orderService } from '../services/orderService'
import { readStorage } from '../utils/storage'
import { formatPrice } from '../utils/price'

const MOCK_ROLE_KEY = 'online-order-template-role'
const STORE_LIST_KEY = 'online-order-template-store-list'
const defaultStores = [
  { id: 'demo-store', name: '示範門店', accountName: 'demo-store-account', isActive: true }
]

const paymentMethodOptions = [
  { value: 'cash', label: '現金' },
  { value: 'linepay', label: 'LINE Pay' },
  { value: 'transfer', label: '轉帳' },
  { value: 'other', label: '其他' }
]

const paymentMethodLabels = paymentMethodOptions.reduce((acc, item) => ({ ...acc, [item.value]: item.label }), {})

function getTodayDate() {
  return new Date().toISOString().slice(0, 10)
}

function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-3xl border border-line bg-white p-4">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className="mt-2 text-2xl font-black text-ink">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </div>
  )
}

export default function DailyClosingPage({ role: roleProp }) {
  const role = roleProp || readStorage(MOCK_ROLE_KEY, 'customer')
  const isOwner = role === 'owner'
  const stores = readStorage(STORE_LIST_KEY, defaultStores).filter((store) => store.isActive !== false)
  const firstStore = stores[0] || defaultStores[0]
  const [businessDate, setBusinessDate] = useState(getTodayDate())
  const [storeId, setStoreId] = useState(isOwner ? 'all' : firstStore.id)
  const [summary, setSummary] = useState(null)
  const [closings, setClosings] = useState([])
  const [cashActual, setCashActual] = useState('')
  const [note, setNote] = useState('')
  const [message, setMessage] = useState('')
  const [collectingOrder, setCollectingOrder] = useState(null)

  const selectedStore = useMemo(() => {
    if (storeId === 'all') return { id: 'all', name: '全部門店' }
    return stores.find((store) => store.id === storeId) || firstStore
  }, [storeId, stores, firstStore])

  const cashExpected = Number(summary?.cashBaseAmount || summary?.netSales || 0)
  const cashDifference = Number(cashActual || 0) - cashExpected

  async function loadData() {
    const nextSummary = await dailyClosingService.getSummary({ businessDate, storeId })
    setSummary(nextSummary)
    setClosings(await dailyClosingService.listClosings())
    const existing = nextSummary.existingClosing
    setCashActual(existing ? String(existing.cashActual || 0) : String(nextSummary.cashBaseAmount || nextSummary.netSales || 0))
    setNote(existing?.note || '')
  }

  useEffect(() => { loadData() }, [businessDate, storeId])

  async function markPaid(order, paymentMethod) {
    setMessage('')
    await orderService.markOrderPaid(order.id, {
      paymentMethod,
      paidBy: isOwner ? '老闆帳號' : '門店帳號'
    })
    setCollectingOrder(null)
    setMessage(`${order.orderNumber} 已以${paymentMethodLabels[paymentMethod]}收款，已加入今日訂單明細。`)
    await loadData()
  }

  async function closeDay() {
    setMessage('')
    if (!summary) return
    if (summary.orderCount === 0 && !window.confirm('今天沒有已收款訂單，仍要產生日結紀錄嗎？')) return
    if ((summary.unpaidOnlineOrders || []).length > 0 && !window.confirm(`尚有 ${summary.unpaidOnlineOrders.length} 筆線上訂單未收款，仍要結帳嗎？`)) return
    const record = await dailyClosingService.closeDay({
      businessDate,
      storeId,
      storeName: selectedStore.name,
      cashActual: Number(cashActual || 0),
      manualAdjustments: [],
      note,
      closedBy: isOwner ? '老闆帳號' : '門店帳號'
    })
    setMessage(`已完成 ${record.businessDate} ${record.storeName} 日結。`)
    await loadData()
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <section className="card p-5">
        <p className="text-xs font-semibold text-accent">Daily Closing</p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black">每日結帳</h1>
            <p className="mt-2 text-sm text-muted">日結只統計今日已收款訂單；線上未付款訂單會放在左側待收款，打勾收款後自動加入今日明細。</p>
          </div>
          <button className="btn-secondary" type="button" onClick={loadData}><RefreshCw size={16} className="inline-block" /> 重新整理</button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-[220px_1fr]">
          <label className="space-y-1">
            <span className="label">營業日期</span>
            <input className="input" type="date" value={businessDate} onChange={(event) => setBusinessDate(event.target.value)} />
          </label>
          <label className="space-y-1">
            <span className="label">門店</span>
            <select className="input" value={storeId} onChange={(event) => setStoreId(event.target.value)} disabled={!isOwner}>
              {isOwner && <option value="all">全部門店</option>}
              {stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
            </select>
          </label>
        </div>
      </section>

      {summary && (
        <>
          {summary.existingClosing && (
            <section className="mt-5 rounded-3xl border border-green-200 bg-green-50 p-4 text-green-800">
              <div className="flex items-center gap-2 font-bold"><CheckCircle2 size={18} /> 此日期已結帳</div>
              <p className="mt-1 text-sm">結帳時間：{new Date(summary.existingClosing.closedAt).toLocaleString('zh-TW')}｜差額：{formatPrice(summary.existingClosing.cashDifference)}</p>
            </section>
          )}

          <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="今日已收款訂單" value={summary.orderCount} sub={`線上 ${summary.onlineOrderCount}｜門店 ${summary.counterOrderCount}`} />
            <StatCard label="今日實收金額" value={formatPrice(summary.netSales)} sub="以 paidAt 為今日計算" />
            <StatCard label="線上待收款" value={(summary.unpaidOnlineOrders || []).length} sub={formatPrice(summary.unpaidOnlineAmount || 0)} />
            <StatCard label="平均客單價" value={formatPrice(summary.averageOrderAmount)} sub="以已收款訂單計算" />
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-[300px_1fr_380px]">
            <aside className="card h-fit p-5 lg:sticky lg:top-24">
              <h2 className="text-xl font-black">線上待收款</h2>
              <p className="mt-1 text-sm text-muted">客人今天來付帳時，點打勾收款；系統會把它加入今日訂單明細。</p>
              <div className="mt-4 space-y-3">
                {(summary.unpaidOnlineOrders || []).map((order) => (
                  <div key={order.id} className="rounded-3xl border border-line bg-white p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-black">{order.orderNumber}</p>
                        <p className="mt-1 text-xs text-muted">{order.customer?.name || '未填姓名'}</p>
                      </div>
                      <p className="font-black text-brand">{formatPrice(order.totalAmount)}</p>
                    </div>
                    <button className="btn-primary mt-3 w-full py-2" type="button" onClick={() => setCollectingOrder(order)}>✓ 收款</button>
                  </div>
                ))}
                {(summary.unpaidOnlineOrders || []).length === 0 && <p className="rounded-2xl bg-white p-4 text-sm text-muted">目前沒有線上待收款訂單。</p>}
              </div>
            </aside>

            <div className="card p-5">
              <h2 className="text-xl font-black">今日訂單明細</h2>
              <p className="mt-1 text-sm text-muted">只顯示今日已收款訂單。門店櫃檯訂單建立後預設已收款；線上訂單收款後才會進來。</p>
              <div className="mt-3 divide-y divide-line rounded-3xl border border-line bg-white">
                {summary.orders.map((order) => (
                  <div key={order.id} className="grid gap-2 p-3 text-sm md:grid-cols-[140px_1fr_120px] md:items-center">
                    <div>
                      <p className="font-black">{order.orderNumber}</p>
                      <p className="text-xs text-muted">{order.paidAt ? new Date(order.paidAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) : '-'}</p>
                    </div>
                    <p className="text-muted">{order.customer?.name || '門店櫃檯'}｜{order.source === 'customer_online' ? '線上' : '門店'}｜{paymentMethodLabels[order.paymentMethod] || '現金'}</p>
                    <p className="font-black text-brand">{formatPrice(order.totalAmount)}</p>
                  </div>
                ))}
                {summary.orders.length === 0 && <p className="p-6 text-center text-sm text-muted">此日期目前沒有已收款訂單。</p>}
              </div>
            </div>

            <aside className="card h-fit p-5 lg:sticky lg:top-24">
              <h2 className="text-xl font-black">結帳對帳</h2>
              <div className="mt-4 space-y-3 rounded-3xl bg-cream p-4">
                <div className="flex justify-between gap-3"><span className="text-muted">系統應收</span><strong>{formatPrice(cashExpected)}</strong></div>
                <div className="flex justify-between gap-3"><span className="text-muted">線上待收款</span><strong>{formatPrice(summary.unpaidOnlineAmount || 0)}</strong></div>
                <div className="flex justify-between gap-3 border-t border-line pt-3"><span className="font-bold">今日已收款合計</span><strong>{formatPrice(summary.netSales)}</strong></div>
              </div>

              <label className="mt-4 block space-y-1">
                <span className="label">實點現金 / 今日實收</span>
                <input className="input" type="number" min="0" value={cashActual} onChange={(event) => setCashActual(event.target.value)} />
              </label>
              <div className="mt-3 flex justify-between gap-3 rounded-3xl bg-cream p-4">
                <span className="font-bold">差額</span>
                <strong className={cashDifference < 0 ? 'text-red-600' : 'text-brand'}>{formatPrice(cashDifference)}</strong>
              </div>

              <label className="mt-4 block space-y-1">
                <span className="label">日結備註</span>
                <textarea className="input min-h-24" value={note} onChange={(event) => setNote(event.target.value)} placeholder="例如：現金短少、補登說明" />
              </label>
              {message && <p className="mt-4 rounded-2xl bg-green-50 p-3 text-sm font-semibold text-green-700">{message}</p>}
              <button className="btn-primary mt-4 w-full" type="button" onClick={closeDay}>確認結帳</button>
              <p className="mt-3 text-xs leading-5 text-muted">第一版允許同日重新結帳，系統會覆蓋同日期、同門店的日結紀錄。</p>
            </aside>
          </section>
        </>
      )}

      <section className="card mt-5 p-5">
        <h2 className="text-xl font-black">歷史日結</h2>
        <div className="mt-4 divide-y divide-line rounded-3xl border border-line bg-white">
          {closings.filter((record) => isOwner || record.storeId === storeId).slice(0, 12).map((record) => (
            <div key={record.id} className="grid gap-2 p-3 text-sm md:grid-cols-[130px_1fr_120px_120px_160px] md:items-center">
              <p className="font-black">{record.businessDate}</p>
              <p className="text-muted">{record.storeName}</p>
              <p>實收：<strong>{formatPrice(record.netSales)}</strong></p>
              <p>差額：<strong className={record.cashDifference < 0 ? 'text-red-600' : 'text-brand'}>{formatPrice(record.cashDifference)}</strong></p>
              <p className="text-xs text-muted">{new Date(record.closedAt).toLocaleString('zh-TW')}</p>
            </div>
          ))}
          {closings.length === 0 && <p className="p-6 text-center text-sm text-muted">尚未產生日結紀錄。</p>}
        </div>
      </section>

      {collectingOrder && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-0 md:items-center md:p-6">
          <div className="w-full max-w-md rounded-t-3xl bg-cream p-5 shadow-soft md:rounded-3xl">
            <p className="text-xs font-semibold text-accent">選擇收款方式</p>
            <h2 className="mt-1 text-2xl font-black">{collectingOrder.orderNumber}</h2>
            <p className="mt-2 text-sm text-muted">{collectingOrder.customer?.name || '未填姓名'}｜{formatPrice(collectingOrder.totalAmount)}</p>
            <div className="mt-5 grid gap-2">
              {paymentMethodOptions.map((option) => (
                <button key={option.value} className="btn-secondary w-full justify-center" type="button" onClick={() => markPaid(collectingOrder, option.value)}>
                  {option.label}
                </button>
              ))}
            </div>
            <button className="mt-4 w-full text-sm font-bold text-muted underline" type="button" onClick={() => setCollectingOrder(null)}>取消</button>
          </div>
        </div>
      )}
    </div>
  )
}