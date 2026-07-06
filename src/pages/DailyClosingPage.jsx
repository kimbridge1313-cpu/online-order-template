import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, RefreshCw } from 'lucide-react'
import { dailyClosingService, paymentLabels } from '../services/dailyClosingService'
import { readStorage } from '../utils/storage'
import { formatPrice } from '../utils/price'

const MOCK_ROLE_KEY = 'online-order-template-role'
const STORE_LIST_KEY = 'online-order-template-store-list'
const defaultStores = [
  { id: 'demo-store', name: '示範門店', accountName: 'demo-store-account', isActive: true }
]

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

  const selectedStore = useMemo(() => {
    if (storeId === 'all') return { id: 'all', name: '全部門店' }
    return stores.find((store) => store.id === storeId) || firstStore
  }, [storeId, stores, firstStore])

  async function loadData() {
    const nextSummary = await dailyClosingService.getSummary({ businessDate, storeId })
    setSummary(nextSummary)
    setClosings(await dailyClosingService.listClosings())
    setCashActual(nextSummary.existingClosing ? String(nextSummary.existingClosing.cashActual || 0) : String(nextSummary.cashExpected || 0))
    setNote(nextSummary.existingClosing?.note || '')
  }

  useEffect(() => { loadData() }, [businessDate, storeId])

  async function closeDay() {
    setMessage('')
    if (!summary) return
    if (summary.orderCount === 0 && !window.confirm('今天沒有訂單，仍要產生日結紀錄嗎？')) return
    const record = await dailyClosingService.closeDay({
      businessDate,
      storeId,
      storeName: selectedStore.name,
      cashActual: Number(cashActual || 0),
      note,
      closedBy: isOwner ? '老闆帳號' : '門店帳號'
    })
    setMessage(`已完成 ${record.businessDate} ${record.storeName} 日結。`)
    await loadData()
  }

  const cashDifference = Number(cashActual || 0) - Number(summary?.cashExpected || 0)

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <section className="card p-5">
        <p className="text-xs font-semibold text-accent">Daily Closing</p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black">每日結帳</h1>
            <p className="mt-2 text-sm text-muted">統計當日訂單、付款方式與現金差額，產生日結紀錄。</p>
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
            <StatCard label="今日訂單數" value={summary.orderCount} sub={`線上 ${summary.onlineOrderCount}｜門店 ${summary.counterOrderCount}`} />
            <StatCard label="有效訂單" value={summary.activeOrderCount} sub={`取消 ${summary.cancelledOrderCount}`} />
            <StatCard label="實際營業額" value={formatPrice(summary.netSales)} sub={`取消金額 ${formatPrice(summary.cancelledAmount)}`} />
            <StatCard label="平均客單價" value={formatPrice(summary.averageOrderAmount)} sub="以非取消訂單計算" />
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_380px]">
            <div className="card p-5">
              <h2 className="text-xl font-black">付款方式統計</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {Object.entries(paymentLabels).map(([key, label]) => (
                  <div key={key} className="rounded-3xl bg-cream p-4">
                    <p className="text-sm font-semibold text-muted">{label}</p>
                    <p className="mt-2 text-2xl font-black text-brand">{formatPrice(summary.paymentSummary[key] || 0)}</p>
                  </div>
                ))}
              </div>

              <h2 className="mt-6 text-xl font-black">今日訂單明細</h2>
              <div className="mt-3 divide-y divide-line rounded-3xl border border-line bg-white">
                {summary.orders.map((order) => (
                  <div key={order.id} className="grid gap-2 p-3 text-sm md:grid-cols-[140px_1fr_110px_110px] md:items-center">
                    <div>
                      <p className="font-black">{order.orderNumber}</p>
                      <p className="text-xs text-muted">{new Date(order.createdAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <p className="text-muted">{order.customer?.name || '門店櫃檯'}｜{order.source === 'customer_online' ? '線上' : '門店'}</p>
                    <p className="font-semibold">{paymentLabels[order.paymentMethod || 'cash'] || '現金'}</p>
                    <p className={`font-black ${order.status === 'cancelled' ? 'text-red-600 line-through' : 'text-brand'}`}>{formatPrice(order.totalAmount)}</p>
                  </div>
                ))}
                {summary.orders.length === 0 && <p className="p-6 text-center text-sm text-muted">此日期目前沒有訂單。</p>}
              </div>
            </div>

            <aside className="card h-fit p-5 lg:sticky lg:top-24">
              <h2 className="text-xl font-black">現金對帳</h2>
              <div className="mt-4 space-y-3 rounded-3xl bg-cream p-4">
                <div className="flex justify-between gap-3"><span className="text-muted">系統應收現金</span><strong>{formatPrice(summary.cashExpected)}</strong></div>
                <label className="block space-y-1">
                  <span className="label">實點現金</span>
                  <input className="input" type="number" min="0" value={cashActual} onChange={(event) => setCashActual(event.target.value)} />
                </label>
                <div className="flex justify-between gap-3 border-t border-line pt-3">
                  <span className="font-bold">差額</span>
                  <strong className={cashDifference < 0 ? 'text-red-600' : 'text-brand'}>{formatPrice(cashDifference)}</strong>
                </div>
              </div>
              <label className="mt-4 block space-y-1">
                <span className="label">備註</span>
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
              <p>營業額：<strong>{formatPrice(record.netSales)}</strong></p>
              <p>差額：<strong className={record.cashDifference < 0 ? 'text-red-600' : 'text-brand'}>{formatPrice(record.cashDifference)}</strong></p>
              <p className="text-xs text-muted">{new Date(record.closedAt).toLocaleString('zh-TW')}</p>
            </div>
          ))}
          {closings.length === 0 && <p className="p-6 text-center text-sm text-muted">尚未產生日結紀錄。</p>}
        </div>
      </section>
    </div>
  )
}
