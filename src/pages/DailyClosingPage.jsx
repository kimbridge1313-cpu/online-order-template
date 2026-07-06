import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { dailyClosingService } from '../services/dailyClosingService'
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

function createAdjustment(name = '') {
  return {
    id: `adjustment-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name,
    amount: 0,
    note: ''
  }
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
  const [manualAdjustments, setManualAdjustments] = useState([])
  const [note, setNote] = useState('')
  const [message, setMessage] = useState('')

  const selectedStore = useMemo(() => {
    if (storeId === 'all') return { id: 'all', name: '全部門店' }
    return stores.find((store) => store.id === storeId) || firstStore
  }, [storeId, stores, firstStore])

  const manualAdjustmentTotal = manualAdjustments.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const cashExpected = Math.max(0, Number(summary?.cashBaseAmount || summary?.netSales || 0) - manualAdjustmentTotal)
  const cashDifference = Number(cashActual || 0) - cashExpected

  async function loadData() {
    const nextSummary = await dailyClosingService.getSummary({ businessDate, storeId })
    setSummary(nextSummary)
    setClosings(await dailyClosingService.listClosings())
    const existing = nextSummary.existingClosing
    const nextAdjustments = existing?.manualAdjustments?.length
      ? existing.manualAdjustments
      : [createAdjustment('掃碼支付'), createAdjustment('老闆轉交')]
    const nextManualTotal = nextAdjustments.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    const nextCashExpected = Math.max(0, Number(nextSummary.cashBaseAmount || nextSummary.netSales || 0) - nextManualTotal)
    setManualAdjustments(nextAdjustments)
    setCashActual(existing ? String(existing.cashActual || 0) : String(nextCashExpected || 0))
    setNote(existing?.note || '')
  }

  useEffect(() => { loadData() }, [businessDate, storeId])

  function updateAdjustment(id, patch) {
    setManualAdjustments(manualAdjustments.map((item) => item.id === id ? { ...item, ...patch } : item))
  }

  function addAdjustment() {
    setManualAdjustments([...manualAdjustments, createAdjustment('')])
  }

  function removeAdjustment(id) {
    setManualAdjustments(manualAdjustments.filter((item) => item.id !== id))
  }

  async function closeDay() {
    setMessage('')
    if (!summary) return
    if (summary.orderCount === 0 && !window.confirm('今天沒有訂單，仍要產生日結紀錄嗎？')) return
    const record = await dailyClosingService.closeDay({
      businessDate,
      storeId,
      storeName: selectedStore.name,
      cashActual: Number(cashActual || 0),
      manualAdjustments,
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
            <p className="mt-2 text-sm text-muted">統計當日訂單，並用手動對帳項目處理掃碼支付、老闆轉交等非現金情況。</p>
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

          <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_420px]">
            <div className="card p-5">
              <h2 className="text-xl font-black">今日訂單明細</h2>
              <p className="mt-1 text-sm text-muted">目前不做多付款方式自動統計；日結以營業額為基礎，再用右側手動項目扣除非現金或轉交金額。</p>
              <div className="mt-3 divide-y divide-line rounded-3xl border border-line bg-white">
                {summary.orders.map((order) => (
                  <div key={order.id} className="grid gap-2 p-3 text-sm md:grid-cols-[140px_1fr_110px] md:items-center">
                    <div>
                      <p className="font-black">{order.orderNumber}</p>
                      <p className="text-xs text-muted">{new Date(order.createdAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <p className="text-muted">{order.customer?.name || '門店櫃檯'}｜{order.source === 'customer_online' ? '線上' : '門店'}</p>
                    <p className={`font-black ${order.status === 'cancelled' ? 'text-red-600 line-through' : 'text-brand'}`}>{formatPrice(order.totalAmount)}</p>
                  </div>
                ))}
                {summary.orders.length === 0 && <p className="p-6 text-center text-sm text-muted">此日期目前沒有訂單。</p>}
              </div>
            </div>

            <aside className="card h-fit p-5 lg:sticky lg:top-24">
              <h2 className="text-xl font-black">現金對帳</h2>
              <div className="mt-4 space-y-3 rounded-3xl bg-cream p-4">
                <div className="flex justify-between gap-3"><span className="text-muted">實際營業額</span><strong>{formatPrice(summary.netSales)}</strong></div>
                <div className="flex justify-between gap-3"><span className="text-muted">手動扣除項目</span><strong>{formatPrice(manualAdjustmentTotal)}</strong></div>
                <div className="flex justify-between gap-3 border-t border-line pt-3"><span className="font-bold">系統應收現金</span><strong>{formatPrice(cashExpected)}</strong></div>
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-black">手動對帳項目</h3>
                  <p className="mt-1 text-xs text-muted">例如掃碼支付、老闆轉交、平台代收等，會從應收現金扣除。</p>
                </div>
                <button className="rounded-2xl bg-cream p-3 text-brand" type="button" onClick={addAdjustment} aria-label="新增對帳項目"><Plus size={18} /></button>
              </div>

              <div className="mt-3 space-y-3">
                {manualAdjustments.map((item) => (
                  <div key={item.id} className="rounded-3xl border border-line bg-white p-3">
                    <div className="grid grid-cols-[1fr_112px_40px] gap-2">
                      <input className="input" value={item.name} onChange={(event) => updateAdjustment(item.id, { name: event.target.value })} placeholder="項目名稱" />
                      <input className="input" type="number" min="0" value={item.amount} onChange={(event) => updateAdjustment(item.id, { amount: Number(event.target.value) })} placeholder="金額" />
                      <button className="rounded-2xl text-red-600 hover:bg-red-50" type="button" onClick={() => removeAdjustment(item.id)} aria-label="刪除對帳項目"><Trash2 size={18} /></button>
                    </div>
                    <input className="input mt-2" value={item.note || ''} onChange={(event) => updateAdjustment(item.id, { note: event.target.value })} placeholder="備註，可留空" />
                  </div>
                ))}
                {manualAdjustments.length === 0 && <p className="rounded-2xl bg-white p-4 text-sm text-muted">尚未新增手動對帳項目。</p>}
              </div>

              <label className="mt-4 block space-y-1">
                <span className="label">實點現金</span>
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
