import { useEffect, useState } from 'react'
import { Image, Link, MapPin, Pencil, Plus, Settings, Store, Trash2, Users } from 'lucide-react'
import { readStorage } from '../utils/storage'
import { authService } from '../services/authService'
import { adminInviteService } from '../services/adminInviteService'
import { cloudinaryImageService } from '../services/cloudinaryImageService'
import { defaultStoreSettings, defaultStores, normalizeStoreSettings, storeConfigService } from '../services/storeConfigService'

const ROLE_STORAGE_KEY = 'online-order-template-role'
const defaultDiningModules = { dine_in: true, takeaway: true, delivery: false }
const defaultDeliverySettings = { freeDeliveryMinAmount: 0, maxDeliveryDistanceKm: 0 }
const defaultTimeSettings = { immediateEnabled: true, scheduledEnabled: true, preorderMinDays: 0 }
const diningModuleOptions = [
  { key: 'dine_in', label: '內用', description: '適合現場座位、桌邊點餐。' },
  { key: 'takeaway', label: '自取', description: '適合顧客預約後到店取餐。' },
  { key: 'delivery', label: '外送', description: '適合需要顧客填寫外送地址的訂單。' }
]
const discountTypeOptions = [
  { value: 'fixed_amount', label: '固定金額', hint: '例如環保杯折扣 -5。' },
  { value: 'percent', label: '百分比', hint: '例如九折請填 10，代表折 10%。' },
  { value: 'bogo', label: '買一送一', hint: '結帳時會折抵購物車中最低單價商品。' }
]

function emptyAdminDraft(storeId = '') {
  return { username: '', password: '', displayName: '', role: 'store', storeId, lineUserId: '', lineDisplayName: '', isActive: true }
}

function emptyStoreDraft() {
  return { name: '', accountName: '', latitude: '', longitude: '', address: '' }
}

function emptyDiscountDraft() {
  return { name: '', type: 'fixed_amount', value: '', note: '', isActive: true }
}

function normalizeDiscountDraft(draft, editingId = '') {
  return {
    id: editingId || `discount-${Date.now()}`,
    name: String(draft.name || '').trim(),
    type: draft.type || 'fixed_amount',
    value: draft.type === 'bogo' ? 0 : Number(draft.value || 0),
    note: String(draft.note || '').trim(),
    isActive: draft.isActive !== false
  }
}

function discountValueText(discount) {
  if (discount.type === 'fixed_amount') return `折 ${Number(discount.value || 0)} 元`
  if (discount.type === 'percent') return `折 ${Number(discount.value || 0)}%`
  if (discount.type === 'bogo') return '買一送一'
  return ''
}

export default function StoreSettingsPage({ role: roleProp, adminSession }) {
  const role = roleProp || readStorage(ROLE_STORAGE_KEY, 'customer')
  const isOwner = role === 'owner'
  const [settings, setSettings] = useState(() => normalizeStoreSettings(defaultStoreSettings))
  const [stores, setStores] = useState(defaultStores)
  const [tableDraft, setTableDraft] = useState('')
  const [editingTableId, setEditingTableId] = useState(null)
  const [editingTableName, setEditingTableName] = useState('')
  const [storeFormOpen, setStoreFormOpen] = useState(false)
  const [storeDraft, setStoreDraft] = useState(emptyStoreDraft())
  const [editingStoreId, setEditingStoreId] = useState(null)
  const [adminFormOpen, setAdminFormOpen] = useState(false)
  const [adminUsers, setAdminUsers] = useState([])
  const [adminDraft, setAdminDraft] = useState(emptyAdminDraft())
  const [editingAdminId, setEditingAdminId] = useState(null)
  const [adminMessage, setAdminMessage] = useState('')
  const [discountDraft, setDiscountDraft] = useState(emptyDiscountDraft())
  const [editingDiscountId, setEditingDiscountId] = useState(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [brandMessage, setBrandMessage] = useState('')
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

  async function uploadLogo(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setLogoUploading(true)
    setBrandMessage('')
    try {
      const uploaded = await cloudinaryImageService.uploadStoreLogo(file)
      await updateSettings({ ...settings, logoUrl: uploaded.imageUrl, logoPublicId: uploaded.imagePublicId, logoMeta: uploaded.imageMeta })
      setBrandMessage('Logo 已上傳並套用。')
    } catch (error) {
      setBrandMessage(error.message || 'Logo 上傳失敗。')
    } finally {
      setLogoUploading(false)
    }
  }

  async function removeLogo() {
    if (!window.confirm('確定移除目前 Logo？')) return
    await updateSettings({ ...settings, logoUrl: '', logoPublicId: '', logoMeta: null })
    setBrandMessage('Logo 已移除。')
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

  function openNewStoreForm() { setEditingStoreId(null); setStoreDraft(emptyStoreDraft()); setStoreFormOpen(true) }
  function resetStoreDraft() { setStoreDraft(emptyStoreDraft()); setEditingStoreId(null); setStoreFormOpen(false) }

  async function saveStore(event) {
    event.preventDefault()
    if (!storeDraft.name || !storeDraft.accountName) return
    const previousStore = stores.find((store) => store.id === editingStoreId)
    const payload = { ...previousStore, id: editingStoreId || `store-${Date.now()}`, name: storeDraft.name, accountName: storeDraft.accountName, latitude: Number(storeDraft.latitude || 0), longitude: Number(storeDraft.longitude || 0), address: storeDraft.address, isActive: previousStore?.isActive !== false }
    setStores(await storeConfigService.saveStore(payload))
    resetStoreDraft()
  }

  function editStore(store) {
    setEditingStoreId(store.id)
    setStoreDraft({ name: store.name || '', accountName: store.accountName || '', latitude: String(store.latitude || ''), longitude: String(store.longitude || ''), address: store.address || '' })
    setStoreFormOpen(true)
  }

  async function deleteStore(storeId) {
    if (!window.confirm('確定刪除這個門店？')) return
    setStores(await storeConfigService.deleteStore(storeId))
  }

  async function toggleStoreActive(store) { setStores(await storeConfigService.saveStore({ ...store, isActive: !store.isActive })) }

  function useCurrentLocationForStore() {
    if (!navigator.geolocation) return window.alert('此瀏覽器不支援定位。')
    navigator.geolocation.getCurrentPosition(
      (position) => setStoreDraft({ ...storeDraft, latitude: String(position.coords.latitude), longitude: String(position.coords.longitude) }),
      () => window.alert('無法取得目前定位，請手動輸入座標。')
    )
  }

  function openNewAdminForm() { setEditingAdminId(null); setAdminDraft(emptyAdminDraft(stores[0]?.id || '')); setAdminFormOpen(true) }
  function resetAdminDraft() { setEditingAdminId(null); setAdminDraft(emptyAdminDraft(stores[0]?.id || '')); setAdminFormOpen(false) }

  function editAdmin(user) {
    setEditingAdminId(user.id || user.username)
    setAdminDraft({ username: user.username || user.id || '', password: '', displayName: user.displayName || '', role: user.role || 'store', storeId: user.storeId || stores[0]?.id || '', lineUserId: user.lineUserId || '', lineDisplayName: user.lineDisplayName || '', isActive: user.isActive !== false })
    setAdminFormOpen(true)
  }

  async function saveAdmin(event) {
    event.preventDefault()
    setAdminMessage('')
    const selectedStore = stores.find((store) => store.id === adminDraft.storeId)
    try {
      const nextUsers = await authService.saveAdminUser({ id: editingAdminId, ...adminDraft, username: adminDraft.username.trim(), storeId: adminDraft.role === 'owner' ? '' : adminDraft.storeId, storeName: adminDraft.role === 'owner' ? '' : selectedStore?.name || '', lineUserId: adminDraft.lineUserId.trim(), lineDisplayName: adminDraft.lineDisplayName.trim() })
      setAdminUsers(nextUsers)
      resetAdminDraft()
      setAdminMessage('人員資料已儲存。')
    } catch (error) {
      setAdminMessage(error.message || '儲存失敗。')
    }
  }

  async function toggleAdminActive(user) {
    if (user.username === adminSession?.username && user.isActive !== false) return window.alert('不能停用目前登入的自己。')
    setAdminUsers(await authService.saveAdminUser({ ...user, id: user.id || user.username, isActive: user.isActive === false }))
  }

  async function removeAdmin(user) {
    if (user.username === adminSession?.username) return window.alert('不能刪除目前登入的自己。')
    if (!window.confirm(`確定刪除 ${user.displayName || user.username}？`)) return
    setAdminUsers(await authService.deleteAdminUser(user.username || user.id))
  }

  async function createQuickInvite() {
    setAdminMessage('')
    try {
      const selectedStore = stores.find((store) => store.id === adminDraft.storeId) || stores[0]
      const invite = await adminInviteService.createInvite({ role: adminDraft.role || 'store', storeId: adminDraft.role === 'owner' ? '' : selectedStore?.id || '', storeName: adminDraft.role === 'owner' ? '' : selectedStore?.name || '', note: adminDraft.role === 'owner' ? '老闆管理員邀請' : `門店管理員邀請｜${selectedStore?.name || ''}`, createdBy: adminSession?.username || adminSession?.id || '' })
      await navigator.clipboard.writeText(invite.link)
      setAdminMessage('邀請連結已建立並複製。此連結為一次性使用。')
    } catch (error) {
      setAdminMessage(error.message || '建立邀請失敗。')
    }
  }

  async function saveDiscount(event) {
    event.preventDefault()
    const payload = normalizeDiscountDraft(discountDraft, editingDiscountId)
    if (!payload.name) return window.alert('請輸入折扣名稱。')
    if (payload.type !== 'bogo' && payload.value <= 0) return window.alert('請輸入大於 0 的折扣數值。')
    const current = settings.discountSettings?.discounts || []
    const next = editingDiscountId ? current.map((item) => item.id === editingDiscountId ? payload : item) : [...current, payload]
    await updateSettings({ ...settings, discountSettings: { ...(settings.discountSettings || {}), discounts: next } })
    setDiscountDraft(emptyDiscountDraft())
    setEditingDiscountId(null)
  }

  function editDiscount(discount) {
    setEditingDiscountId(discount.id)
    setDiscountDraft({ name: discount.name || '', type: discount.type || 'fixed_amount', value: String(discount.value || ''), note: discount.note || '', isActive: discount.isActive !== false })
  }

  async function deleteDiscount(discountId) {
    if (!window.confirm('確定刪除這個折扣？')) return
    const next = (settings.discountSettings?.discounts || []).filter((discount) => discount.id !== discountId)
    await updateSettings({ ...settings, discountSettings: { ...(settings.discountSettings || {}), discounts: next } })
  }

  async function toggleDiscountActive(discount) {
    const next = (settings.discountSettings?.discounts || []).map((item) => item.id === discount.id ? { ...item, isActive: item.isActive === false } : item)
    await updateSettings({ ...settings, discountSettings: { ...(settings.discountSettings || {}), discounts: next } })
  }

  const diningModules = { ...defaultDiningModules, ...(settings.diningModules || {}) }
  const deliverySettings = { ...defaultDeliverySettings, ...(settings.deliverySettings || {}) }
  const timeSettings = { ...defaultTimeSettings, ...(settings.timeSettings || {}) }
  const discounts = settings.discountSettings?.discounts || []
  const activeDiscountTypeHint = discountTypeOptions.find((item) => item.value === discountDraft.type)?.hint || ''

  if (loading) return <div className="mx-auto max-w-5xl px-4 py-6"><section className="card p-6 text-sm text-muted">正在讀取設定...</section></div>

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <section className="card p-5"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cream text-brand"><Settings size={22} /></div><div><p className="text-xs font-semibold text-accent">Store Settings</p><h1 className="text-3xl font-black">設定</h1></div></div><p className="mt-4 text-sm leading-6 text-muted">老闆可管理品牌、門店、人員與邀請；門店可調整基礎桌號設定。</p></section>

      {isOwner && <section className="card mt-5 p-5"><h2 className="text-xl font-black">品牌設定</h2><div className="mt-4 grid gap-4 md:grid-cols-[160px_1fr] md:items-start"><div className="flex h-36 w-36 items-center justify-center overflow-hidden rounded-[2rem] border border-line bg-cream text-brand">{settings.logoUrl ? <img className="h-full w-full object-contain p-4" src={settings.logoUrl} alt="店家 Logo" /> : <Image size={42} />}</div><div className="space-y-3"><label className="block space-y-1"><span className="label">品牌名稱</span><input className="input" value={settings.brandName || ''} onChange={(event) => updateSettings({ ...settings, brandName: event.target.value })} /></label><div className="flex flex-wrap gap-2"><label className={`btn-secondary cursor-pointer ${logoUploading ? 'pointer-events-none opacity-60' : ''}`}><input className="hidden" type="file" accept="image/*" onChange={uploadLogo} disabled={logoUploading} />{logoUploading ? 'Logo 上傳中...' : settings.logoUrl ? '更換 Logo' : '上傳 Logo'}</label>{settings.logoUrl && <button className="rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-bold text-red-600" type="button" onClick={removeLogo}>移除 Logo</button>}</div><p className="text-xs leading-5 text-muted">建議使用正方形 PNG / JPG。上傳後會套用到頁首與 loading 畫面。</p>{brandMessage && <p className="rounded-2xl bg-cream p-3 text-sm font-semibold text-muted">{brandMessage}</p>}</div></div></section>}

      {isOwner && <section className="card mt-5 p-5"><h2 className="text-xl font-black">用餐方式模組</h2><div className="mt-5 grid gap-3 md:grid-cols-3">{diningModuleOptions.map((item) => <label key={item.key} className="flex min-h-32 items-start justify-between gap-4 rounded-3xl border border-line bg-white p-4"><span><span className="block font-bold text-ink">{item.label}</span><span className="mt-2 block text-xs leading-5 text-muted">{item.description}</span></span><input className="mt-1 h-5 w-5 shrink-0" type="checkbox" checked={!!diningModules[item.key]} onChange={() => toggleDiningModule(item.key)} /></label>)}</div></section>}

      {isOwner && diningModules.delivery && <section className="card mt-5 p-5"><h2 className="text-xl font-black">外送條件</h2><div className="mt-5 grid gap-3 md:grid-cols-2"><label className="space-y-1"><span className="label">滿多少免費外送</span><input className="input" type="number" min="0" value={deliverySettings.freeDeliveryMinAmount} onChange={(event) => updateSettings({ ...settings, deliverySettings: { ...settings.deliverySettings, freeDeliveryMinAmount: Number(event.target.value || 0) } })} /></label><label className="space-y-1"><span className="label">多少公里內可外送</span><input className="input" type="number" min="0" step="0.1" value={deliverySettings.maxDeliveryDistanceKm} onChange={(event) => updateSettings({ ...settings, deliverySettings: { ...settings.deliverySettings, maxDeliveryDistanceKm: Number(event.target.value || 0) } })} /></label></div></section>}

      {isOwner && <section className="card mt-5 p-5"><h2 className="text-xl font-black">時間設定</h2><div className="mt-5 grid gap-3 md:grid-cols-2"><label className="flex items-center justify-between gap-4 rounded-3xl border border-line bg-white p-4"><span><span className="block font-bold text-ink">允許立即</span><span className="mt-1 block text-xs text-muted">關閉後只允許預定。</span></span><input className="h-5 w-5" type="checkbox" checked={!!timeSettings.immediateEnabled} onChange={() => toggleTimeMode('immediateEnabled')} /></label><label className="flex items-center justify-between gap-4 rounded-3xl border border-line bg-white p-4"><span><span className="block font-bold text-ink">允許預定</span><span className="mt-1 block text-xs text-muted">開啟後可選日期與時間。</span></span><input className="h-5 w-5" type="checkbox" checked={!!timeSettings.scheduledEnabled} onChange={() => toggleTimeMode('scheduledEnabled')} /></label></div>{timeSettings.scheduledEnabled && <label className="mt-4 block space-y-1"><span className="label">預定需提前幾天</span><input className="input" type="number" min="0" value={timeSettings.preorderMinDays} onChange={(event) => updateSettings({ ...settings, timeSettings: { ...settings.timeSettings, preorderMinDays: Number(event.target.value || 0) } })} /></label>}</section>}

      {isOwner && <section className="card mt-5 p-5"><h2 className="text-xl font-black">自訂折扣</h2><p className="mt-2 text-sm leading-6 text-muted">設定後，訂餐頁與櫃檯點餐的購物車會出現折扣按鈕。適合環保杯折扣、九折、買一送一等情境。</p><form className="mt-5 grid gap-3 rounded-3xl border border-line bg-white p-4 md:grid-cols-2" onSubmit={saveDiscount}><label className="space-y-1"><span className="label">折扣名稱 *</span><input className="input" value={discountDraft.name} onChange={(event) => setDiscountDraft({ ...discountDraft, name: event.target.value })} placeholder="例如：環保杯折扣" /></label><label className="space-y-1"><span className="label">折扣類型</span><select className="input" value={discountDraft.type} onChange={(event) => setDiscountDraft({ ...discountDraft, type: event.target.value })}>{discountTypeOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>{discountDraft.type !== 'bogo' && <label className="space-y-1"><span className="label">折扣數值</span><input className="input" type="number" min="0" step="1" value={discountDraft.value} onChange={(event) => setDiscountDraft({ ...discountDraft, value: event.target.value })} /></label>}<label className="space-y-1"><span className="label">備註</span><input className="input" value={discountDraft.note} onChange={(event) => setDiscountDraft({ ...discountDraft, note: event.target.value })} placeholder="選填，給店員辨識用" /></label><label className="flex items-center gap-3 rounded-3xl border border-line bg-white p-4"><input type="checkbox" checked={discountDraft.isActive} onChange={(event) => setDiscountDraft({ ...discountDraft, isActive: event.target.checked })} /><span className="font-bold">啟用折扣</span></label><p className="rounded-2xl bg-cream p-3 text-xs leading-5 text-muted md:col-span-2">{activeDiscountTypeHint}</p><div className="flex flex-wrap gap-2 md:col-span-2"><button className="btn-primary" type="submit">{editingDiscountId ? '儲存折扣' : '新增折扣'}</button>{editingDiscountId && <button className="btn-secondary" type="button" onClick={() => { setEditingDiscountId(null); setDiscountDraft(emptyDiscountDraft()) }}>取消編輯</button>}</div></form><div className="mt-5 grid gap-3">{discounts.map((discount) => <div key={discount.id} className="rounded-3xl border border-line bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-black">{discount.name}</p><p className="mt-1 text-xs text-muted">{discountValueText(discount)}｜{discount.isActive === false ? '停用' : '啟用'}{discount.note ? `｜${discount.note}` : ''}</p></div><div className="flex flex-wrap gap-2"><button className="btn-secondary py-2" type="button" onClick={() => editDiscount(discount)}>修改</button><button className="btn-secondary py-2" type="button" onClick={() => toggleDiscountActive(discount)}>{discount.isActive === false ? '啟用' : '停用'}</button><button className="rounded-2xl border border-red-200 bg-white px-3 py-2 text-sm font-bold text-red-600" type="button" onClick={() => deleteDiscount(discount.id)}>刪除</button></div></div></div>)}{discounts.length === 0 && <p className="rounded-2xl bg-cream p-4 text-sm text-muted">尚未建立折扣。</p>}</div></section>}

      <section className="card mt-5 p-5"><h2 className="text-xl font-black">桌號設定</h2><label className="mt-5 flex items-center justify-between gap-4 rounded-3xl border border-line bg-white p-4"><span><span className="block font-bold text-ink">啟用桌號</span><span className="mt-1 block text-xs text-muted">適合內用桌邊點餐、平板櫃檯點餐。</span></span><input className="h-5 w-5" type="checkbox" checked={!!settings.tableNumberEnabled} onChange={(event) => updateSettings({ ...settings, tableNumberEnabled: event.target.checked })} /></label>{settings.tableNumberEnabled && <div className="mt-5"><div className="flex gap-2"><input className="input" placeholder="新增桌號，例如：A1、吧台 2" value={tableDraft} onChange={(event) => setTableDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addTable() }} /><button className="btn-primary shrink-0" type="button" onClick={addTable}>新增</button></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{(settings.tableNumbers || []).map((table) => <div key={table.id} className="rounded-2xl border border-line bg-white p-3">{editingTableId === table.id ? <div className="flex gap-2"><input className="input" value={editingTableName} onChange={(event) => setEditingTableName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') renameTable(table.id) }} /><button className="btn-primary shrink-0 py-2" type="button" onClick={() => renameTable(table.id)}>儲存</button></div> : <div className="flex items-center justify-between gap-3"><span className="font-bold">{table.name}</span><div className="flex gap-1"><button className="rounded-xl border border-line p-2 text-muted hover:text-brand" type="button" onClick={() => { setEditingTableId(table.id); setEditingTableName(table.name) }}><Pencil size={16} /></button><button className="rounded-xl border border-line p-2 text-red-600 hover:bg-red-50" type="button" onClick={() => deleteTable(table.id)}><Trash2 size={16} /></button></div></div>}</div>)}{(settings.tableNumbers || []).length === 0 && <p className="rounded-2xl bg-cream p-4 text-sm text-muted sm:col-span-2">尚未建立桌號。</p>}</div></div>}</section>

      {isOwner && <section className="card mt-5 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><Store className="text-accent" size={20} /><div><h2 className="text-xl font-black">門店管理</h2><p className="mt-1 text-sm text-muted">新增或修改門店時才展開表單。</p></div></div><button className="btn-secondary" type="button" onClick={storeFormOpen ? resetStoreDraft : openNewStoreForm}><Plus size={16} className="inline-block" /> {storeFormOpen ? '收合' : '新增門店'}</button></div>{storeFormOpen && <form className="mt-5 grid gap-3 rounded-3xl border border-line bg-white p-4 md:grid-cols-2" onSubmit={saveStore}><label className="space-y-1"><span className="label">門店名稱 *</span><input className="input" value={storeDraft.name} onChange={(event) => setStoreDraft({ ...storeDraft, name: event.target.value })} required /></label><label className="space-y-1"><span className="label">帳務名稱 *</span><input className="input" value={storeDraft.accountName} onChange={(event) => setStoreDraft({ ...storeDraft, accountName: event.target.value })} required /></label><label className="space-y-1"><span className="label">緯度</span><input className="input" value={storeDraft.latitude} onChange={(event) => setStoreDraft({ ...storeDraft, latitude: event.target.value })} /></label><label className="space-y-1"><span className="label">經度</span><input className="input" value={storeDraft.longitude} onChange={(event) => setStoreDraft({ ...storeDraft, longitude: event.target.value })} /></label><label className="space-y-1 md:col-span-2"><span className="label">地址</span><input className="input" value={storeDraft.address} onChange={(event) => setStoreDraft({ ...storeDraft, address: event.target.value })} /></label><div className="flex flex-wrap gap-2 md:col-span-2"><button className="btn-secondary" type="button" onClick={useCurrentLocationForStore}><MapPin size={16} className="inline-block" /> 使用目前位置</button><button className="btn-primary" type="submit">{editingStoreId ? '儲存門店' : '新增門店'}</button><button className="btn-secondary" type="button" onClick={resetStoreDraft}>取消</button></div></form>}<div className="mt-5 grid gap-3">{stores.map((store) => <div key={store.id} className="rounded-3xl border border-line bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-black">{store.name}</p><p className="mt-1 text-xs text-muted">{store.accountName}｜{store.address || '未填地址'}｜{store.isActive === false ? '停用' : '啟用'}</p></div><div className="flex flex-wrap gap-2"><button className="btn-secondary py-2" type="button" onClick={() => editStore(store)}>修改</button><button className="btn-secondary py-2" type="button" onClick={() => toggleStoreActive(store)}>{store.isActive === false ? '啟用' : '停用'}</button><button className="rounded-2xl border border-red-200 bg-white px-3 py-2 text-sm font-bold text-red-600" type="button" onClick={() => deleteStore(store.id)}>刪除</button></div></div></div>)}</div></section>}

      {isOwner && <section className="card mt-5 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><Users className="text-accent" size={20} /><div><h2 className="text-xl font-black">人員管理</h2><p className="mt-1 text-sm text-muted">同一門店可以建立多個門店帳號；離職員工可停用或刪除。</p></div></div><div className="flex flex-wrap gap-2"><button className="btn-secondary" type="button" onClick={createQuickInvite}><Link size={16} className="inline-block" /> 建立邀請連結</button><button className="btn-secondary" type="button" onClick={adminFormOpen ? resetAdminDraft : openNewAdminForm}><Plus size={16} className="inline-block" /> {adminFormOpen ? '收合' : '新增人員'}</button></div></div>{adminFormOpen && <form className="mt-5 grid gap-3 rounded-3xl border border-line bg-white p-4 md:grid-cols-2" onSubmit={saveAdmin}><label className="space-y-1"><span className="label">帳號 *</span><input className="input" value={adminDraft.username} onChange={(event) => setAdminDraft({ ...adminDraft, username: event.target.value })} disabled={!!editingAdminId} required /></label><label className="space-y-1"><span className="label">顯示名稱</span><input className="input" value={adminDraft.displayName} onChange={(event) => setAdminDraft({ ...adminDraft, displayName: event.target.value })} /></label><label className="space-y-1"><span className="label">角色</span><select className="input" value={adminDraft.role} onChange={(event) => setAdminDraft({ ...adminDraft, role: event.target.value })}><option value="store">門店</option><option value="owner">老闆</option></select></label>{adminDraft.role === 'store' && <label className="space-y-1"><span className="label">綁定門店</span><select className="input" value={adminDraft.storeId} onChange={(event) => setAdminDraft({ ...adminDraft, storeId: event.target.value })}>{stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}</select></label>}<label className="space-y-1"><span className="label">{editingAdminId ? '新密碼（可留空）' : '密碼 *'}</span><input className="input" type="password" value={adminDraft.password} onChange={(event) => setAdminDraft({ ...adminDraft, password: event.target.value })} required={!editingAdminId} /></label><label className="space-y-1"><span className="label">LINE ID</span><input className="input" value={adminDraft.lineUserId} onChange={(event) => setAdminDraft({ ...adminDraft, lineUserId: event.target.value })} placeholder="未抓到時可手動填寫" /></label><label className="space-y-1"><span className="label">LINE 顯示名稱</span><input className="input" value={adminDraft.lineDisplayName} onChange={(event) => setAdminDraft({ ...adminDraft, lineDisplayName: event.target.value })} placeholder="系統抓到時會自動帶入" /></label><label className="flex items-center gap-3 rounded-3xl border border-line bg-white p-4"><input type="checkbox" checked={adminDraft.isActive} onChange={(event) => setAdminDraft({ ...adminDraft, isActive: event.target.checked })} /><span className="font-bold">啟用帳號</span></label><div className="flex flex-wrap gap-2 md:col-span-2"><button className="btn-primary" type="submit">{editingAdminId ? '儲存人員' : '新增人員'}</button><button className="btn-secondary" type="button" onClick={resetAdminDraft}>取消</button></div></form>}{adminMessage && <p className="mt-4 rounded-2xl bg-cream p-3 text-sm font-semibold text-muted">{adminMessage}</p>}<div className="mt-5 grid gap-3">{adminUsers.map((user) => <div key={user.id || user.username} className="rounded-3xl border border-line bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-black">{user.displayName || user.username}</p><p className="mt-1 text-xs text-muted">{user.username}｜{user.role === 'owner' ? '老闆' : `門店 ${user.storeName || user.storeId || ''}`}｜{user.lineUserId ? `LINE：${user.lineUserId}` : '未綁 LINE'}｜{user.isActive === false ? '停用' : '啟用'}</p></div><div className="flex flex-wrap gap-2"><button className="btn-secondary py-2" type="button" onClick={() => editAdmin(user)}>修改</button><button className="btn-secondary py-2" type="button" onClick={() => toggleAdminActive(user)}>{user.isActive === false ? '啟用' : '停用'}</button><button className="rounded-2xl border border-red-200 bg-white px-3 py-2 text-sm font-bold text-red-600" type="button" onClick={() => removeAdmin(user)}>刪除</button></div></div></div>)}{adminUsers.length === 0 && <p className="rounded-2xl bg-cream p-4 text-sm text-muted">尚未建立人員。</p>}</div></section>}
    </div>
  )
}
