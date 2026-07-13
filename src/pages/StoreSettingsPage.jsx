import { useState } from 'react'
import { MapPin, Pencil, Settings, Store, Trash2 } from 'lucide-react'
import { readStorage, writeStorage } from '../utils/storage'

const STORE_SETTINGS_KEY = 'online-order-template-store-settings'
const STORE_LIST_KEY = 'online-order-template-store-list'
const ROLE_STORAGE_KEY = 'online-order-template-role'
const defaultDiningModules = { dine_in: true, takeaway: true, delivery: false }
const defaultDeliverySettings = { freeDeliveryMinAmount: 0, maxDeliveryDistanceKm: 0 }
const defaultTimeSettings = { immediateEnabled: true, scheduledEnabled: true, preorderMinDays: 0 }
const diningModuleOptions = [
  { key: 'dine_in', label: '內用', description: '適合現場座位、桌邊點餐，可搭配桌號設定。' },
  { key: 'takeaway', label: '自取', description: '適合顧客預約後到店取餐。' },
  { key: 'delivery', label: '外送', description: '適合需要顧客填寫外送地址的訂單。' }
]
const defaultSettings = {
  brandName: '示範店家',
  tableNumberEnabled: false,
  tableNumbers: [],
  diningModules: defaultDiningModules,
  deliverySettings: defaultDeliverySettings,
  timeSettings: defaultTimeSettings
}
const defaultStores = [
  { id: 'demo-store', name: '示範門店', accountName: 'demo-store-account', latitude: 23.6978, longitude: 120.9605, address: '示範地址', isActive: true }
]

function normalizeSettings(rawSettings = {}) {
  return {
    ...defaultSettings,
    ...rawSettings,
    diningModules: { ...defaultDiningModules, ...(rawSettings.diningModules || {}) },
    deliverySettings: { ...defaultDeliverySettings, ...(rawSettings.deliverySettings || {}) },
    timeSettings: { ...defaultTimeSettings, ...(rawSettings.timeSettings || {}) }
  }
}

export default function StoreSettingsPage({ role: roleProp }) {
  const role = roleProp || readStorage(ROLE_STORAGE_KEY, 'customer')
  const isOwner = role === 'owner'
  const [settings, setSettings] = useState(() => normalizeSettings(readStorage(STORE_SETTINGS_KEY, defaultSettings)))
  const [stores, setStores] = useState(() => readStorage(STORE_LIST_KEY, defaultStores))
  const [tableDraft, setTableDraft] = useState('')
  const [editingTableId, setEditingTableId] = useState(null)
  const [editingTableName, setEditingTableName] = useState('')
  const [storeDraft, setStoreDraft] = useState({ name: '', accountName: '', latitude: '', longitude: '', address: '' })
  const [editingStoreId, setEditingStoreId] = useState(null)

  function updateSettings(nextSettings) {
    const normalized = normalizeSettings(nextSettings)
    setSettings(normalized)
    writeStorage(STORE_SETTINGS_KEY, normalized)
    window.dispatchEvent(new Event('store-settings-updated'))
  }

  function toggleDiningModule(moduleKey) {
    const currentModules = { ...defaultDiningModules, ...(settings.diningModules || {}) }
    const nextModules = { ...currentModules, [moduleKey]: !currentModules[moduleKey] }
    if (Object.values(nextModules).filter(Boolean).length === 0) return window.alert('至少需要開啟一種用餐方式。')
    updateSettings({ ...settings, diningModules: nextModules })
  }

  function toggleTimeMode(modeKey) {
    const current = { ...defaultTimeSettings, ...(settings.timeSettings || {}) }
    const next = { ...current, [modeKey]: !current[modeKey] }
    if (!next.immediateEnabled && !next.scheduledEnabled) return window.alert('至少需要開啟立即或預定其中一種時間方式。')
    updateSettings({ ...settings, timeSettings: next })
  }

  function updateDeliverySettings(patch) {
    updateSettings({ ...settings, deliverySettings: { ...settings.deliverySettings, ...patch } })
  }

  function updateTimeSettings(patch) {
    updateSettings({ ...settings, timeSettings: { ...settings.timeSettings, ...patch } })
  }

  function persistStores(nextStores) {
    setStores(nextStores)
    writeStorage(STORE_LIST_KEY, nextStores)
  }

  function addTable() {
    const name = tableDraft.trim()
    if (!name) return
    updateSettings({ ...settings, tableNumbers: [...(settings.tableNumbers || []), { id: `table-${Date.now()}`, name }] })
    setTableDraft('')
  }

  function renameTable(tableId) {
    const name = editingTableName.trim()
    if (!name) return
    updateSettings({ ...settings, tableNumbers: (settings.tableNumbers || []).map((table) => table.id === tableId ? { ...table, name } : table) })
    setEditingTableId(null)
    setEditingTableName('')
  }

  function deleteTable(tableId) {
    if (!window.confirm('確定刪除這個桌號？')) return
    updateSettings({ ...settings, tableNumbers: (settings.tableNumbers || []).filter((table) => table.id !== tableId) })
  }

  function resetStoreDraft() {
    setStoreDraft({ name: '', accountName: '', latitude: '', longitude: '', address: '' })
    setEditingStoreId(null)
  }

  function saveStore(event) {
    event.preventDefault()
    if (!storeDraft.name || !storeDraft.accountName) return
    const payload = {
      id: editingStoreId || `store-${Date.now()}`,
      name: storeDraft.name,
      accountName: storeDraft.accountName,
      latitude: Number(storeDraft.latitude || 0),
      longitude: Number(storeDraft.longitude || 0),
      address: storeDraft.address,
      isActive: true
    }
    persistStores(editingStoreId ? stores.map((store) => store.id === editingStoreId ? payload : store) : [...stores, payload])
    resetStoreDraft()
  }

  function editStore(store) {
    setEditingStoreId(store.id)
    setStoreDraft({ name: store.name || '', accountName: store.accountName || '', latitude: String(store.latitude || ''), longitude: String(store.longitude || ''), address: store.address || '' })
  }

  function deleteStore(storeId) {
    if (!window.confirm('確定刪除這個門店？')) return
    persistStores(stores.filter((store) => store.id !== storeId))
  }

  function toggleStoreActive(store) {
    persistStores(stores.map((item) => item.id === store.id ? { ...item, isActive: !item.isActive } : item))
  }

  function useCurrentLocationForStore() {
    if (!navigator.geolocation) return window.alert('此瀏覽器不支援定位。')
    navigator.geolocation.getCurrentPosition(
      (position) => setStoreDraft({ ...storeDraft, latitude: String(position.coords.latitude), longitude: String(position.coords.longitude) }),
      () => window.alert('無法取得目前定位，請手動輸入座標。')
    )
  }

  const diningModules = { ...defaultDiningModules, ...(settings.diningModules || {}) }
  const deliverySettings = { ...defaultDeliverySettings, ...(settings.deliverySettings || {}) }
  const timeSettings = { ...defaultTimeSettings, ...(settings.timeSettings || {}) }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <section className="card p-5">
        <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cream text-brand"><Settings size={22} /></div><div><p className="text-xs font-semibold text-accent">Store Settings</p><h1 className="text-3xl font-black">門店設定</h1></div></div>
        <p className="mt-4 text-sm leading-6 text-muted">這裡放門店營運設定。模板版先使用 localStorage，正式版可接到 Firebase 店家設定。</p>
      </section>

      {isOwner && <section className="card mt-5 p-5"><h2 className="text-xl font-black">品牌設定</h2><p className="mt-2 text-sm text-muted">老闆可以設定品牌名稱，會同步顯示在頁首 Header。</p><label className="mt-4 block space-y-1"><span className="label">品牌名稱</span><input className="input" value={settings.brandName || ''} onChange={(event) => updateSettings({ ...settings, brandName: event.target.value })} placeholder="例如：先生手作千層" /></label></section>}

      {isOwner && (
        <section className="card mt-5 p-5">
          <h2 className="text-xl font-black">用餐方式模組</h2>
          <p className="mt-2 text-sm text-muted">選擇訂餐頁要開啟的用餐方式。外送開啟後，顧客與門店點餐時會出現外送地址欄位。</p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">{diningModuleOptions.map((item) => <label key={item.key} className="flex min-h-32 items-start justify-between gap-4 rounded-3xl border border-line bg-white p-4"><span><span className="block font-bold text-ink">{item.label}</span><span className="mt-2 block text-xs leading-5 text-muted">{item.description}</span></span><input className="mt-1 h-5 w-5 shrink-0" type="checkbox" checked={!!diningModules[item.key]} onChange={() => toggleDiningModule(item.key)} /></label>)}</div>
        </section>
      )}

      {isOwner && diningModules.delivery && (
        <section className="card mt-5 p-5">
          <h2 className="text-xl font-black">外送條件</h2>
          <p className="mt-2 text-sm text-muted">設定外送可用距離與免費外送門檻。0 代表不限制或不顯示門檻。</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <label className="space-y-1"><span className="label">滿多少免費外送</span><input className="input" type="number" min="0" value={deliverySettings.freeDeliveryMinAmount} onChange={(event) => updateDeliverySettings({ freeDeliveryMinAmount: Number(event.target.value || 0) })} placeholder="例如：500" /></label>
            <label className="space-y-1"><span className="label">多少公里內可外送</span><input className="input" type="number" min="0" step="0.1" value={deliverySettings.maxDeliveryDistanceKm} onChange={(event) => updateDeliverySettings({ maxDeliveryDistanceKm: Number(event.target.value || 0) })} placeholder="例如：5" /></label>
          </div>
        </section>
      )}

      {isOwner && (
        <section className="card mt-5 p-5">
          <h2 className="text-xl font-black">時間設定</h2>
          <p className="mt-2 text-sm text-muted">可關閉立即點餐，並設定預定需提前幾天。</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <label className="flex items-center justify-between gap-4 rounded-3xl border border-line bg-white p-4"><span><span className="block font-bold text-ink">允許立即</span><span className="mt-1 block text-xs text-muted">關閉後，訂餐頁只會允許預定。</span></span><input className="h-5 w-5" type="checkbox" checked={!!timeSettings.immediateEnabled} onChange={() => toggleTimeMode('immediateEnabled')} /></label>
            <label className="flex items-center justify-between gap-4 rounded-3xl border border-line bg-white p-4"><span><span className="block font-bold text-ink">允許預定</span><span className="mt-1 block text-xs text-muted">開啟後可選日期與時間。</span></span><input className="h-5 w-5" type="checkbox" checked={!!timeSettings.scheduledEnabled} onChange={() => toggleTimeMode('scheduledEnabled')} /></label>
          </div>
          {timeSettings.scheduledEnabled && <label className="mt-4 block space-y-1"><span className="label">預定需提前幾天</span><input className="input" type="number" min="0" value={timeSettings.preorderMinDays} onChange={(event) => updateTimeSettings({ preorderMinDays: Number(event.target.value || 0) })} placeholder="例如：2" /></label>}
        </section>
      )}

      <section className="card mt-5 p-5"><h2 className="text-xl font-black">桌號設定</h2><p className="mt-2 text-sm text-muted">開啟後，門店訂餐頁會顯示桌號欄位；關閉後不會出現桌號。</p><label className="mt-5 flex items-center justify-between gap-4 rounded-3xl border border-line bg-white p-4"><span><span className="block font-bold text-ink">啟用桌號</span><span className="mt-1 block text-xs text-muted">適合內用桌邊點餐、平板櫃檯點餐。</span></span><input className="h-5 w-5" type="checkbox" checked={!!settings.tableNumberEnabled} onChange={(event) => updateSettings({ ...settings, tableNumberEnabled: event.target.checked })} /></label>{settings.tableNumberEnabled && <div className="mt-5"><div className="flex gap-2"><input className="input" placeholder="新增桌號，例如：A1、吧台 2" value={tableDraft} onChange={(event) => setTableDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addTable() }} /><button className="btn-primary shrink-0" type="button" onClick={addTable}>新增</button></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{(settings.tableNumbers || []).map((table) => <div key={table.id} className="rounded-2xl border border-line bg-white p-3">{editingTableId === table.id ? <div className="flex gap-2"><input className="input" value={editingTableName} onChange={(event) => setEditingTableName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') renameTable(table.id) }} /><button className="btn-primary shrink-0 py-2" type="button" onClick={() => renameTable(table.id)}>儲存</button></div> : <div className="flex items-center justify-between gap-3"><span className="font-bold">{table.name}</span><div className="flex gap-1"><button className="rounded-xl border border-line p-2 text-muted hover:text-brand" type="button" onClick={() => { setEditingTableId(table.id); setEditingTableName(table.name) }}><Pencil size={16} /></button><button className="rounded-xl border border-line p-2 text-red-600 hover:bg-red-50" type="button" onClick={() => deleteTable(table.id)}><Trash2 size={16} /></button></div></div>}</div>)}{(settings.tableNumbers || []).length === 0 && <p className="rounded-2xl bg-cream p-4 text-sm text-muted sm:col-span-2">尚未建立桌號。</p>}</div></div>}</section>

      {isOwner && <section className="card mt-5 p-5"><div className="flex items-center gap-2"><Store className="text-accent" size={20} /><h2 className="text-xl font-black">門店管理</h2></div><p className="mt-2 text-sm text-muted">老闆權限可新增門店帳號與定位。顧客點餐時會依 GPS 預設選擇最近門店。</p><form className="mt-5 grid gap-3 md:grid-cols-2" onSubmit={saveStore}><label className="space-y-1"><span className="label">門店名稱 *</span><input className="input" value={storeDraft.name} onChange={(event) => setStoreDraft({ ...storeDraft, name: event.target.value })} required /></label><label className="space-y-1"><span className="label">門店帳號 *</span><input className="input" value={storeDraft.accountName} onChange={(event) => setStoreDraft({ ...storeDraft, accountName: event.target.value })} required /></label><label className="space-y-1"><span className="label">緯度</span><input className="input" type="number" step="any" value={storeDraft.latitude} onChange={(event) => setStoreDraft({ ...storeDraft, latitude: event.target.value })} /></label><label className="space-y-1"><span className="label">經度</span><input className="input" type="number" step="any" value={storeDraft.longitude} onChange={(event) => setStoreDraft({ ...storeDraft, longitude: event.target.value })} /></label><label className="space-y-1 md:col-span-2"><span className="label">地址</span><input className="input" value={storeDraft.address} onChange={(event) => setStoreDraft({ ...storeDraft, address: event.target.value })} /></label><div className="flex flex-wrap gap-2 md:col-span-2"><button className="btn-primary" type="submit">{editingStoreId ? '儲存門店' : '新增門店'}</button><button className="btn-secondary" type="button" onClick={useCurrentLocationForStore}><MapPin size={16} className="inline-block" /> 使用目前定位</button>{editingStoreId && <button className="btn-secondary" type="button" onClick={resetStoreDraft}>取消編輯</button>}</div></form><div className="mt-6 grid gap-3 md:grid-cols-2">{stores.map((store) => <article key={store.id} className={`rounded-3xl border border-line bg-white p-4 ${!store.isActive ? 'opacity-60' : ''}`}><div className="flex items-start justify-between gap-3"><div><p className="font-black">{store.name}</p><p className="mt-1 text-xs text-muted">帳號：{store.accountName}</p><p className="mt-1 text-xs text-muted">{store.address || '未填地址'}</p><p className="mt-1 text-xs text-muted">{store.latitude}, {store.longitude}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${store.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{store.isActive ? '啟用' : '停用'}</span></div><div className="mt-4 flex flex-wrap gap-2"><button className="btn-secondary py-2" type="button" onClick={() => editStore(store)}>修改</button><button className="btn-secondary py-2" type="button" onClick={() => toggleStoreActive(store)}>{store.isActive ? '停用' : '啟用'}</button><button className="btn-danger py-2" type="button" onClick={() => deleteStore(store.id)}>刪除</button></div></article>)}</div></section>}
    </div>
  )
}
