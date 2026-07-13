import { useEffect, useState } from 'react'
import { MapPin, Pencil, Settings, Store, Trash2, Users } from 'lucide-react'
import { readStorage } from '../utils/storage'
import { authService } from '../services/authService'
import AdminInvitePage from './AdminInvitePage'
import { defaultStoreSettings, defaultStores, normalizeStoreSettings, storeConfigService } from '../services/storeConfigService'

const ROLE_STORAGE_KEY = 'online-order-template-role'
const defaultDiningModules = { dine_in: true, takeaway: true, delivery: false }
const defaultDeliverySettings = { freeDeliveryMinAmount: 0, maxDeliveryDistanceKm: 0 }
const defaultTimeSettings = { immediateEnabled: true, scheduledEnabled: true, preorderMinDays: 0 }
const diningModuleOptions = [
  { key: 'dine_in', label: '內用', description: '適合現場座位、桌邊點餐，可搭配桌號設定。' },
  { key: 'takeaway', label: '自取', description: '適合顧客預約後到店取餐。' },
  { key: 'delivery', label: '外送', description: '適合需要顧客填寫外送地址的訂單。' }
]

function emptyAdminDraft() {
  return { username: '', password: '', displayName: '', role: 'store', storeId: '', isActive: true }
}

export default function StoreSettingsPage({ role: roleProp, adminSession }) {
  const role = roleProp || readStorage(ROLE_STORAGE_KEY, 'customer')
  const isOwner = role === 'owner'
  const [settings, setSettings] = useState(() => normalizeStoreSettings(defaultStoreSettings))
  const [stores, setStores] = useState(defaultStores)
  const [tableDraft, setTableDraft] = useState('')
  const [editingTableId, setEditingTableId] = useState(null)
  const [editingTableName, setEditingTableName] = useState('')
  const [storeDraft, setStoreDraft] = useState({ name: '', accountName: '', latitude: '', longitude: '', address: '' })
  const [editingStoreId, setEditingStoreId] = useState(null)
  const [adminUsers, setAdminUsers] = useState([])
  const [adminDraft, setAdminDraft] = useState(emptyAdminDraft())
  const [editingAdminId, setEditingAdminId] = useState(null)
  const [adminMessage, setAdminMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function loadConfig() {
      try {
        const [nextSettings, nextStores, nextUsers] = await Promise.all([
          storeConfigService.getSettings(),
          storeConfigService.listStores(),
          isOwner ? authService.listAdminUsers() : Promise.resolve([])
        ])
        if (!mounted) return
        setSettings(normalizeStoreSettings(nextSettings))
        setStores(nextStores)
        setAdminUsers(nextUsers)
        setAdminDraft((current) => ({ ...current, storeId: current.storeId || nextStores[0]?.id || '' }))
      } finally {
        if (mounted) setLoading(false)
      }
    }
    loadConfig()
    return () => { mounted = false }
  }, [isOwner])

  async function updateSettings(nextSettings) {
    const normalized = normalizeStoreSettings(nextSettings)
    setSettings(normalized)
    await storeConfigService.saveSettings(normalized)
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

  async function addTable() {
    const name = tableDraft.trim()
    if (!name) return
    await updateSettings({ ...settings, tableNumbers: [...(settings.tableNumbers || []), { id: `table-${Date.now()}`, name }] })
    setTableDraft('')
  }

  async function renameTable(tableId) {
    const name = editingTableName.trim()
    if (!name) return
    await updateSettings({ ...settings, tableNumbers: (settings.tableNumbers || []).map((table) => table.id === tableId ? { ...table, name } : table) })
    setEditingTableId(null)
    setEditingTableName('')
  }

  async function deleteTable(tableId) {
    if (!window.confirm('確定刪除這個桌號？')) return
    await updateSettings({ ...settings, tableNumbers: (settings.tableNumbers || []).filter((table) => table.id !== tableId) })
  }

  function resetStoreDraft() {
    setStoreDraft({ name: '', accountName: '', latitude: '', longitude: '', address: '' })
    setEditingStoreId(null)
  }

  async function saveStore(event) {
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
    const nextStores = await storeConfigService.saveStore(payload)
    setStores(nextStores)
    resetStoreDraft()
  }

  function editStore(store) {
    setEditingStoreId(store.id)
    setStoreDraft({ name: store.name || '', accountName: store.accountName || '', latitude: String(store.latitude || ''), longitude: String(store.longitude || ''), address: store.address || '' })
  }

  async function deleteStore(storeId) {
    if (!window.confirm('確定刪除這個門店？')) return
    setStores(await storeConfigService.deleteStore(storeId))
  }

  async function toggleStoreActive(store) {
    setStores(await storeConfigService.saveStore({ ...store, isActive: !store.isActive }))
  }

  function useCurrentLocationForStore() {
    if (!navigator.geolocation) return window.alert('此瀏覽器不支援定位。')
    navigator.geolocation.getCurrentPosition(
      (position) => setStoreDraft({ ...storeDraft, latitude: String(position.coords.latitude), longitude: String(position.coords.longitude) }),
      () => window.alert('無法取得目前定位，請手動輸入座標。')
    )
  }

  function editAdmin(user) {
    setEditingAdminId(user.id || user.username)
    setAdminDraft({
      username: user.username || user.id || '',
      password: '',
      displayName: user.displayName || '',
      role: user.role || 'store',
      storeId: user.storeId || stores[0]?.id || '',
      isActive: user.isActive !== false
    })
  }

  function resetAdminDraft() {
    setEditingAdminId(null)
    setAdminDraft({ ...emptyAdminDraft(), storeId: stores[0]?.id || '' })
  }

  async function saveAdmin(event) {
    event.preventDefault()
    setAdminMessage('')
    const selectedStore = stores.find((store) => store.id === adminDraft.storeId)
    try {
      const nextUsers = await authService.saveAdminUser({
        id: editingAdminId,
        ...adminDraft,
        username: adminDraft.username.trim(),
        storeId: adminDraft.role === 'owner' ? '' : adminDraft.storeId,
        storeName: adminDraft.role === 'owner' ? '' : selectedStore?.name || ''
      })
      setAdminUsers(nextUsers)
      resetAdminDraft()
      setAdminMessage('人員資料已儲存。')
    } catch (error) {
      setAdminMessage(error.message || '儲存失敗。')
    }
  }

  async function toggleAdminActive(user) {
    if (user.username === adminSession?.username && user.isActive !== false) return window.alert('不能停用目前登入的自己。')
    const nextUsers = await authService.saveAdminUser({ ...user, id: user.id || user.username, isActive: user.isActive === false })
    setAdminUsers(nextUsers)
  }

  async function removeAdmin(user) {
    if (user.username === adminSession?.username) return window.alert('不能刪除目前登入的自己。')
    if (!window.confirm(`確定刪除 ${user.displayName || user.username}？離職員工建議刪除或停用。`)) return
    setAdminUsers(await authService.deleteAdminUser(user.username || user.id))
  }

  const diningModules = { ...defaultDiningModules, ...(settings.diningModules || {}) }
  const deliverySettings = { ...defaultDeliverySettings, ...(settings.deliverySettings || {}) }
  const timeSettings = { ...defaultTimeSettings, ...(settings.timeSettings || {}) }

  if (loading) return <div className="mx-auto max-w-5xl px-4 py-6"><section className="card p-6 text-sm text-muted">正在讀取門店設定...</section></div>

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <section className="card p-5">
        <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cream text-brand"><Settings size={22} /></div><div><p className="text-xs font-semibold text-accent">Store Settings</p><h1 className="text-3xl font-black">設定</h1></div></div>
        <p className="mt-4 text-sm leading-6 text-muted">老闆可管理品牌、門店、人員與邀請；門店可調整基礎桌號設定。</p>
      </section>

      {isOwner && <section className="card mt-5 p-5"><h2 className="text-xl font-black">品牌設定</h2><label className="mt-4 block space-y-1"><span className="label">品牌名稱</span><input className="input" value={settings.brandName || ''} onChange={(event) => updateSettings({ ...settings, brandName: event.target.value })} placeholder="例如：先生手作千層" /></label></section>}

      {isOwner && <section className="card mt-5 p-5"><h2 className="text-xl font-black">用餐方式模組</h2><p className="mt-2 text-sm text-muted">選擇訂餐頁要開啟的用餐方式。</p><div className="mt-5 grid gap-3 md:grid-cols-3">{diningModuleOptions.map((item) => <label key={item.key} className="flex min-h-32 items-start justify-between gap-4 rounded-3xl border border-line bg-white p-4"><span><span className="block font-bold text-ink">{item.label}</span><span className="mt-2 block text-xs leading-5 text-muted">{item.description}</span></span><input className="mt-1 h-5 w-5 shrink-0" type="checkbox" checked={!!diningModules[item.key]} onChange={() => toggleDiningModule(item.key)} /></label>)}</div></section>}

      {isOwner && diningModules.delivery && <section className="card mt-5 p-5"><h2 className="text-xl font-black">外送條件</h2><p className="mt-2 text-sm text-muted">0 代表不限制或不顯示門檻。</p><div className="mt-5 grid gap-3 md:grid-cols-2"><label className="space-y-1"><span className="label">滿多少免費外送</span><input className="input" type="number" min="0" value={deliverySettings.freeDeliveryMinAmount} onChange={(event) => updateDeliverySettings({ freeDeliveryMinAmount: Number(event.target.value || 0) })} /></label><label className="space-y-1"><span className="label">多少公里內可外送</span><input className="input" type="number" min="0" step="0.1" value={deliverySettings.maxDeliveryDistanceKm} onChange={(event) => updateDeliverySettings({ maxDeliveryDistanceKm: Number(event.target.value || 0) })} /></label></div></section>}

      {isOwner && <section className="card mt-5 p-5"><h2 className="text-xl font-black">時間設定</h2><div className="mt-5 grid gap-3 md:grid-cols-2"><label className="flex items-center justify-between gap-4 rounded-3xl border border-line bg-white p-4"><span><span className="block font-bold text-ink">允許立即</span><span className="mt-1 block text-xs text-muted">關閉後，訂餐頁只允許預定。</span></span><input className="h-5 w-5" type="checkbox" checked={!!timeSettings.immediateEnabled} onChange={() => toggleTimeMode('immediateEnabled')} /></label><label className="flex items-center justify-between gap-4 rounded-3xl border border-line bg-white p-4"><span><span className="block font-bold text-ink">允許預定</span><span className="mt-1 block text-xs text-muted">開啟後可選日期與時間。</span></span><input className="h-5 w-5" type="checkbox" checked={!!timeSettings.scheduledEnabled} onChange={() => toggleTimeMode('scheduledEnabled')} /></label></div>{timeSettings.scheduledEnabled && <label className="mt-4 block space-y-1"><span className="label">預定需提前幾天</span><input className="input" type="number" min="0" value={timeSettings.preorderMinDays} onChange={(event) => updateTimeSettings({ preorderMinDays: Number(event.target.value || 0) })} /></label>}</section>}

      <section className="card mt-5 p-5"><h2 className="text-xl font-black">桌號設定</h2><label className="mt-5 flex items-center justify-between gap-4 rounded-3xl border border-line bg-white p-4"><span><span className="block font-bold text-ink">啟用桌號</span><span className="mt-1 block text-xs text-muted">適合內用桌邊點餐、平板櫃檯點餐。</span></span><input className="h-5 w-5" type="checkbox" checked={!!settings.tableNumberEnabled} onChange={(event) => updateSettings({ ...settings, tableNumberEnabled: event.target.checked })} /></label>{settings.tableNumberEnabled && <div className="mt-5"><div className="flex gap-2"><input className="input" placeholder="新增桌號，例如：A1、吧台 2" value={tableDraft} onChange={(event) => setTableDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addTable() }} /><button className="btn-primary shrink-0" type="button" onClick={addTable}>新增</button></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{(settings.tableNumbers || []).map((table) => <div key={table.id} className="rounded-2xl border border-line bg-white p-3">{editingTableId === table.id ? <div className="flex gap-2"><input className="input" value={editingTableName} onChange={(event) => setEditingTableName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') renameTable(table.id) }} /><button className="btn-primary shrink-0 py-2" type="button" onClick={() => renameTable(table.id)}>儲存</button></div> : <div className="flex items-center justify-between gap-3"><span className="font-bold">{table.name}</span><div className="flex gap-1"><button className="rounded-xl border border-line p-2 text-muted hover:text-brand" type="button" onClick={() => { setEditingTableId(table.id); setEditingTableName(table.name) }}><Pencil size={16} /></button><button className="rounded-xl border border-line p-2 text-red-600 hover:bg-red-50" type="button" onClick={() => deleteTable(table.id)}><Trash2 size={16} /></button></div></div>}</div>)}{(settings.tableNumbers || []).length === 0 && <p className="rounded-2xl bg-cream p-4 text-sm text-muted sm:col-span-2">尚未建立桌號。</p>}</div></div>}</section>

      {isOwner && <section className="card mt-5 p-5"><div className="flex items-center gap-2"><Store className="text-accent" size={20} /><h2 className="text-xl font-black">門店管理</h2></div><p className="mt-2 text-sm text-muted">門店資料會寫入 Firebase stores collection。</p><form className="mt-5 grid gap-3 md:grid-cols-2" onSubmit={saveStore}><label className="space-y-1"><span className="label">門店名稱 *</span><input className="input" value={storeDraft.name} onChange={(event) => setStoreDraft({ ...storeDraft, name: event.target.value })} /></label><label className="space-y-1"><span className="label">帳務名稱 *</span><input className="input" value={storeDraft.accountName} onChange={(event) => setStoreDraft({ ...storeDraft, accountName: event.target.value })} /></label><label className="space-y-1"><span className="label">緯度</span><input className="input" value={storeDraft.latitude} onChange={(event) => setStoreDraft({ ...storeDraft, latitude: event.target.value })} /></label><label className="space-y-1"><span className="label">經度</span><input className="input" value={storeDraft.longitude} onChange={(event) => setStoreDraft({ ...storeDraft, longitude: event.target.value })} /></label><label className="space-y-1 md:col-span-2"><span className="label">地址</span><input className="input" value={storeDraft.address} onChange={(event) => setStoreDraft({ ...storeDraft, address: event.target.value })} /></label><div className="flex gap-2 md:col-span-2"><button className="btn-secondary" type="button" onClick={useCurrentLocationForStore}><MapPin size={16} className="inline-block" /> 使用目前位置</button><button className="btn-primary" type="submit">{editingStoreId ? '儲存門店' : '新增門店'}</button>{editingStoreId && <button className="btn-secondary" type="button" onClick={resetStoreDraft}>取消</button>}</div></form><div className="mt-5 grid gap-3">{stores.map((store) => <div key={store.id} className="rounded-3xl border border-line bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-black">{store.name}</p><p className="mt-1 text-xs text-muted">{store.accountName}｜{store.address || '未填地址'}｜{store.isActive === false ? '停用' : '啟用'}</p></div><div className="flex gap-2"><button className="btn-secondary py-2" type="button" onClick={() => editStore(store)}>修改</button><button className="btn-secondary py-2" type="button" onClick={() => toggleStoreActive(store)}>{store.isActive === false ? '啟用' : '停用'}</button><button className="rounded-2xl border border-red-200 bg-white px-3 py-2 text-sm font-bold text-red-600" type="button" onClick={() => deleteStore(store.id)}>刪除</button></div></div></div>))}</div></section>}

      {isOwner && <section className="card mt-5 p-5"><div className="flex items-center gap-2"><Users className="text-accent" size={20} /><h2 className="text-xl font-black">人員管理</h2></div><p className="mt-2 text-sm text-muted">離職員工可停用或刪除；修改密碼時填入新密碼，留空代表不變。</p><form className="mt-5 grid gap-3 md:grid-cols-2" onSubmit={saveAdmin}><label className="space-y-1"><span className="label">帳號 *</span><input className="input" value={adminDraft.username} onChange={(event) => setAdminDraft({ ...adminDraft, username: event.target.value })} disabled={!!editingAdminId} required /></label><label className="space-y-1"><span className="label">顯示名稱</span><input className="input" value={adminDraft.displayName} onChange={(event) => setAdminDraft({ ...adminDraft, displayName: event.target.value })} /></label><label className="space-y-1"><span className="label">角色</span><select className="input" value={adminDraft.role} onChange={(event) => setAdminDraft({ ...adminDraft, role: event.target.value })}><option value="store">門店</option><option value="owner">老闆</option></select></label>{adminDraft.role === 'store' && <label className="space-y-1"><span className="label">綁定門店</span><select className="input" value={adminDraft.storeId} onChange={(event) => setAdminDraft({ ...adminDraft, storeId: event.target.value })}>{stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}</select></label>}<label className="space-y-1"><span className="label">{editingAdminId ? '新密碼（可留空）' : '密碼 *'}</span><input className="input" type="password" value={adminDraft.password} onChange={(event) => setAdminDraft({ ...adminDraft, password: event.target.value })} required={!editingAdminId} /></label><label className="flex items-center gap-3 rounded-3xl border border-line bg-white p-4"><input type="checkbox" checked={adminDraft.isActive} onChange={(event) => setAdminDraft({ ...adminDraft, isActive: event.target.checked })} /><span className="font-bold">啟用帳號</span></label><div className="flex gap-2 md:col-span-2"><button className="btn-primary" type="submit">{editingAdminId ? '儲存人員' : '新增人員'}</button>{editingAdminId && <button className="btn-secondary" type="button" onClick={resetAdminDraft}>取消</button>}</div></form>{adminMessage && <p className="mt-4 rounded-2xl bg-cream p-3 text-sm font-semibold text-muted">{adminMessage}</p>}<div className="mt-5 grid gap-3">{adminUsers.map((user) => <div key={user.id || user.username} className="rounded-3xl border border-line bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-black">{user.displayName || user.username}</p><p className="mt-1 text-xs text-muted">{user.username}｜{user.role === 'owner' ? '老闆' : `門店 ${user.storeName || user.storeId || ''}`}｜{user.lineUserId ? '已綁 LINE' : '未綁 LINE'}｜{user.isActive === false ? '停用' : '啟用'}</p></div><div className="flex gap-2"><button className="btn-secondary py-2" type="button" onClick={() => editAdmin(user)}>修改</button><button className="btn-secondary py-2" type="button" onClick={() => toggleAdminActive(user)}>{user.isActive === false ? '啟用' : '停用'}</button><button className="rounded-2xl border border-red-200 bg-white px-3 py-2 text-sm font-bold text-red-600" type="button" onClick={() => removeAdmin(user)}>刪除</button></div></div></div>))}</div></section>}

      {isOwner && <AdminInvitePage adminSession={adminSession} />}
    </div>
  )
}
