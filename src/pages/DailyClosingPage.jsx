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

function getMonthStartDate() {
  const date = new Date()
  date.setDate(1)
  return date.toISOString().slice(0, 10)
}

function getOrderPaidDate(order) {
  return order.paidAt?.slice(0, 10) || ''
}

function isSameStore(order, storeId) {
  if (!storeId || storeId === 'all') return true
  return order.store?.id === storeId || order.storeId === storeId
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
  const [activeTab, setActiveTab] = useState('today')
  const [businessDate, setBusinessDate] = useState(getTodayDate())
  const [storeId, setStoreId] = useState(isOwner ? 'all' : firstStore.id)
  const [summary, setSummary] = useState(null)
  const [closings, setClosings] = useState([])
  const [allOrders, setAllOrders] = useState([])
  const [cashActual, setCashActual] = useState('')
  const [note, setNote] = useState('')
  const [message, setMessage] = useState('')
  const [collectingOrder, setCollectingOrder] = useState(null)
  const [salesRangeStart, setSalesRangeStart] = useState(getMonthStartDate())
  const [salesRangeEnd, setSalesRangeEnd] = useState(getTodayDate())
  const [salesStoreId, setSalesStoreId] = useState('all')

  const tabs = [
    { value: 'today', label: '今日結帳' },
    ...(isOwner ? [{ value: 'report', label: '期間統計' }] : []),
    { value: 'history', label: '歷史日結' }
  ]

  const selectedStore = useMemo(() => {
    if (storeId === 'all') return { id: 'all', name: '全部門店' }
    return stores.find((store) => store.id === storeId) || firstStore
  }, [storeId, stores, firstStore])

  const cashExpected = Number(summary?.cashBaseAmount || summary?.netSales || 0)
  const cashDifference = Number(cashActual || 0) - cashExpected

  const salesReport = useMemo(() => {
    if (!isOwner) return null
    const reportOrders = allOrders.filter((order) => {
      const paidDate = getOrderPaidDate(order)
      if (order.status === 'cancelled') return false
      if ((order.paymentStatus || 'unpaid') !== 'paid') return false
      if (!paidDate) return false
      if (salesRangeStart && paidDate < salesRangeStart) return false
      if (salesRangeEnd && paidDate > salesRangeEnd) return false
      if (!isSameStore(order, salesStoreId)) return false
      return true
    })
    const total = reportOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0)
    const onlineOrders = reportOrders.filter((order) => order.source === 'customer_online')
    const counterOrders = reportOrders.filter((order) => order.source === 'counter')
    const byMethod = paymentMethodOptions.reduce((acc, method) => {
      acc[method.value] = reportOrders
        .filter((order) => (order.paymentMethod || 'cash') === method.value)
        .reduce((sum, order) => sum + Number(order.totalAmount || 0), 0)
      return acc
    }, {})
    return {
      orders: reportOrders,
      orderCount: reportOrders.length,
      total,
      averageOrderAmount: reportOrders.length ? Math.round(total / reportOrders.length) : 0,
      onlineAmount: onlineOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0),
      counterAmount: counterOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0),
      byMethod
    }
  }, [allOrders, isOwner, salesRangeStart, salesRangeEnd, salesStoreId])

  async function loadData() {
    const [nextSummary, nextClosings, nextOrders] = await Promise.all([
      dailyClosingService.getSummary({ businessDate, storeId }),
      dailyClosingService.listClosings(),
      orderService.listOrders()
    ])
    setSummary(nextSummary)
    setClosings(nextClosings)
    setAllOrders(nextOrders)
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

  async function undoPaid(order) {
    setMessage('')
    if (!window.confirm(`確定要取消 ${order.orderNumber} 的收款紀錄嗎？取消後會回到線上待收款。`)) return
    await orderService.markOrderUnpaid(order.id)
    setMessage(`${order.orderNumber} 已取消收款，已回到線上待收款。`)
    await loadData()
  }

  function editClosing(record) {
    setBusinessDate(record.businessDate)
    setStoreId(record.storeId)
    setCashActual(String(record.cashActual || 0))
    setNote(record.note || '')
    setActiveTab('today')
    setMessage(`已載入 ${record.businessDate} ${record.storeName}，修正後按「確認結帳」即可覆蓋。`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function deleteClosing(record) {
    setMessage('')
    if (!window.confirm(`確定要刪除 ${record.businessDate} ${record.storeName} 的日結紀錄嗎？`)) return
    await dailyClosingService.deleteClosing(record.id)
    setMessage(`已刪除 ${record.businessDate} ${record.storeName} 日結紀錄。`)
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
            <p className="mt-2 text-sm text-muted">今日結帳、期間統計、歷史日結已拆成分頁，避免同一頁資訊過多。</p>
          </div>
          <button className="btn-secondary" type="button" onClick={loadData}><RefreshCw size={16} className="inline-block" /> 重新整理</button>
        </div>

        <div className="mt-5 grid gap-2 rounded-3xl bg-cream p-2 md:inline-grid md:grid-flow-col">
          {tabs.map((tab) => (
            <button key={tab.value} className={`rounded-2xl px-4 py-3 text-sm font-black ${activeTab === tab.value ? 'bg-white text-brand shadow' : 'text-muted'}`} type="button" onClick={() => setActiveTab(tab.value)}>
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {activeTab === 'today' && (
        <>
          <section className="card mt-5 p-5">
            <div className="grid gap-3 md:grid-cols-[220px_1fr]">
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
                  <div className="flex items-center gap-2 font-bold"><CheckCircle2 size={18} /> 此日期已有日結紀錄，可直接修正後重新確認結帳覆蓋。</div>
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
                  <p className="mt-1 text-sm text-muted">只顯示今日已收款訂單。線上訂單誤按已收款時，可以在這裡取消收款。</p>
                  <div className="mt-3 divide-y divide-line rounded-3xl border border-line bg-white">
                    {summary.orders.map((order) => (
                      <div key={order.id} className="grid gap-2 p-3 text-sm md:grid-cols-[140px_1fr_120px_104px] md:items-center">
                        <div>
                          <p className="font-black">{order.orderNumber}</p>
                          <p className="text-xs text-muted">{order.paidAt ? new Date(order.paidAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) : '-'}</p>
                        </div>
                        <p className="text-muted">{order.customer?.name || '門店櫃檯'}｜{order.source === 'customer_online' ? '線上' : '門店'}｜{paymentMethodLabels[order.paymentMethod] || '現金'}</p>
                        <p className="font-black text-brand">{formatPrice(order.totalAmount)}</p>
                        {order.source === 'customer_online' ? (
                          <button className="btn-secondary py-2 text-xs" type="button" onClick={() => undoPaid(order)}>取消收款</button>
                        ) : <span className="text-xs text-muted">櫃檯單</span>}
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
                  <button className="btn-primary mt-4 w-full" type="button" onClick={closeDay}>{summary.existingClosing ? '儲存修改' : '確認結帳'}</button>
                  <p className="mt-3 text-xs leading-5 text-muted">同日重新結帳會覆蓋同日期、同門店的日結紀錄；歷史日結也可以載入修改或刪除。</p>
                </aside>
              </section>
            </>
          )}
        </>
      )}

      {activeTab === 'report' && isOwner && salesReport && (
        <section className="card mt-5 p-5">
          <div>
            <p className="text-xs font-semibold text-accent">Owner Report</p>
            <h2 className="mt-1 text-2xl font-black">指定期間營業額</h2>
            <p className="mt-1 text-sm text-muted">依收款日期 paidAt 統計；只計入已收款且未取消的訂單。</p>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-[180px_180px_1fr]">
            <label className="space-y-1">
              <span className="label">開始日期</span>
              <input className="input" type="date" value={salesRangeStart} onChange={(event) => setSalesRangeStart(event.target.value)} />
            </label>
            <label className="space-y-1">
              <span className="label">結束日期</span>
              <input className="input" type="date" value={salesRangeEnd} onChange={(event) => setSalesRangeEnd(event.target.value)} />
            </label>
            <label className="space-y-1">
              <span className="label">門店</span>
              <select className="input" value={salesStoreId} onChange={(event) => setSalesStoreId(event.target.value)}>
                <option value="all">全部門店</option>
                {stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
              </select>
            </label>
          </div>
          <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="區間實收營業額" value={formatPrice(salesReport.total)} sub={`${salesRangeStart || '不限'} ～ ${salesRangeEnd || '不限'}`} />
            <StatCard label="區間訂單數" value={salesReport.orderCount} sub={`平均 ${formatPrice(salesReport.averageOrderAmount)}`} />
            <StatCard label="線上收款" value={formatPrice(salesReport.onlineAmount)} sub={`門店收款 ${formatPrice(salesReport.counterAmount)}`} />
            <StatCard label="現金 / LINE Pay" value={`${formatPrice(salesReport.byMethod.cash || 0)} / ${formatPrice(salesReport.byMethod.linepay || 0)}`} sub={`轉帳 ${formatPrice(salesReport.byMethod.transfer || 0)}｜其他 ${formatPrice(salesReport.byMethod.other || 0)}`} />
          </section>
        </section>
      )}

      {activeTab === 'history' && (
        <section className="card mt-5 p-5">
          <h2 className="text-xl font-black">歷史日結</h2>
          <p className="mt-1 text-sm text-muted">可載入修改或刪除誤產生的日結紀錄。</p>
          <div className="mt-4 divide-y divide-line rounded-3xl border border-line bg-white">
            {closings.filter((record) => isOwner || record.storeId === storeId).slice(0, 12).map((record) => (
              <div key={record.id} className="grid gap-2 p-3 text-sm md:grid-cols-[130px_1fr_120px_120px_160px_150px] md:items-center">
                <p className="font-black">{record.businessDate}</p>
                <p className="text-muted">{record.storeName}</p>
                <p>實收：<strong>{formatPrice(record.netSales)}</strong></p>
                <p>差額：<strong className={record.cashDifference < 0 ? 'text-red-600' : 'text-brand'}>{formatPrice(record.cashDifference)}</strong></p>
                <p className="text-xs text-muted">{new Date(record.closedAt).toLocaleString('zh-TW')}</p>
                <div className="flex gap-2">
                  <button className="btn-secondary py-2 text-xs" type="button" onClick={() => editClosing(record)}>修改</button>
                  <button className="rounded-2xl p-2 text-red-600 hover:bg-red-50" type="button" onClick={() => deleteClosing(record)} aria-label="刪除日結"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
            {closings.length === 0 && <p className="p-6 text-center text-sm text-muted">尚未產生日結紀錄。</p>}
          </div>
        </section>
      )}

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
