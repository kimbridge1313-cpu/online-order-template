import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, ChevronDown, MapPin, MessageCircle, ShoppingBag, UserRound } from 'lucide-react'
import ProductCard from '../components/ProductCard'
import ProductOptionModal from '../components/ProductOptionModal'
import CartPanel from '../components/CartPanel'
import DiningTypeSelector, { allDiningTypes } from '../components/DiningTypeSelector'
import { productService } from '../services/productService'
import { orderService } from '../services/orderService'
import { defaultStoreSettings, defaultStores, normalizeStoreSettings, storeConfigService } from '../services/storeConfigService'
import { PRODUCT_STORE_STATUS, getStoreStatusDate, storeProductStatusService } from '../services/storeProductStatusService'
import { calculateCartTotal, formatPrice } from '../utils/price'
import { env } from '../config/env'
import { readStorage, writeStorage } from '../utils/storage'

const CUSTOMER_PROFILE_KEY = 'online-order-template-customer-profile'
const MOCK_ROLE_KEY = 'online-order-template-role'
const MOCK_LINE_LOGIN_KEY = 'online-order-template-line-login'
const defaultDiningModules = { dine_in: true, takeaway: true, delivery: false }
const defaultDeliverySettings = { freeDeliveryMinAmount: 0, maxDeliveryDistanceKm: 0 }
const defaultTimeSettings = { immediateEnabled: true, scheduledEnabled: true, preorderMinDays: 0 }

function getDateAfter(days = 0) {
  const date = new Date()
  date.setDate(date.getDate() + Number(days || 0))
  return date.toISOString().slice(0, 10)
}

function getDistanceKm(a, b) {
  if (!a || !b || !Number.isFinite(Number(b.latitude)) || !Number.isFinite(Number(b.longitude))) return Infinity
  const R = 6371
  const dLat = (Number(b.latitude) - a.latitude) * Math.PI / 180
  const dLon = (Number(b.longitude) - a.longitude) * Math.PI / 180
  const lat1 = a.latitude * Math.PI / 180
  const lat2 = Number(b.latitude) * Math.PI / 180
  const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

export default function OrderPage({ role: roleProp, adminSession }) {
  const [role] = useState(() => roleProp || readStorage(MOCK_ROLE_KEY, 'customer'))
  const [isLineLoggedIn] = useState(() => readStorage(MOCK_LINE_LOGIN_KEY, false))
  const [allowNoLineOrder, setAllowNoLineOrder] = useState(false)
  const [noLineExpanded, setNoLineExpanded] = useState(false)
  const [profile, setProfile] = useState(() => readStorage(CUSTOMER_PROFILE_KEY, { name: '', phone: '' }))
  const [profileDraft, setProfileDraft] = useState(() => readStorage(CUSTOMER_PROFILE_KEY, { name: '', phone: '' }))
  const [storeSettings, setStoreSettings] = useState(() => normalizeStoreSettings(defaultStoreSettings))
  const [stores, setStores] = useState(defaultStores)
  const [selectedStoreId, setSelectedStoreId] = useState(adminSession?.storeId || defaultStores[0]?.id || '')
  const [userLocation, setUserLocation] = useState(null)
  const [storeLocationMessage, setStoreLocationMessage] = useState('')
  const [products, setProducts] = useState([])
  const [storeProductStatuses, setStoreProductStatuses] = useState({})
  const [category, setCategory] = useState('全部')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [cartItems, setCartItems] = useState([])
  const [checkoutStep, setCheckoutStep] = useState('ordering')
  const [diningType, setDiningType] = useState('dine_in')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [bagging, setBagging] = useState(false)
  const [timeType, setTimeType] = useState('now')
  const [orderDate, setOrderDate] = useState(getDateAfter(0))
  const [orderTime, setOrderTime] = useState('')
  const [tableNumber, setTableNumber] = useState('')
  const [note, setNote] = useState('')
  const [message, setMessage] = useState('')
  const [successOrder, setSuccessOrder] = useState(null)

  const isStore = role === 'store' || role === 'owner'
  const isOwner = role === 'owner'
  const activeStores = stores.filter((store) => store.isActive !== false)
  const hasProfile = isStore || Boolean(profile?.name && profile?.phone)
  const source = isStore ? 'counter' : 'customer_online'
  const cartTotal = calculateCartTotal(cartItems)
  const selectedStore = activeStores.find((store) => store.id === selectedStoreId) || activeStores[0]
  const selectedStoreDistanceKm = Number.isFinite(getDistanceKm(userLocation, selectedStore)) ? getDistanceKm(userLocation, selectedStore) : null
  const diningModules = { ...defaultDiningModules, ...(storeSettings.diningModules || {}) }
  const deliverySettings = { ...defaultDeliverySettings, ...(storeSettings.deliverySettings || {}) }
  const timeSettings = { ...defaultTimeSettings, ...(storeSettings.timeSettings || {}) }
  const diningOptions = allDiningTypes.filter((item) => diningModules[item.value])
  const activeDiningOptions = diningOptions.length > 0 ? diningOptions : allDiningTypes.slice(0, 1)
  const timeOptions = [
    timeSettings.immediateEnabled ? { value: 'now', label: '立即' } : null,
    timeSettings.scheduledEnabled ? { value: 'scheduled', label: '預定' } : null
  ].filter(Boolean)
  const minScheduledDate = getDateAfter(timeSettings.preorderMinDays || 0)
  const freeDeliveryMinAmount = Number(deliverySettings.freeDeliveryMinAmount || 0)
  const maxDeliveryDistanceKm = Number(deliverySettings.maxDeliveryDistanceKm || 0)
  const isOverDeliveryDistance = diningType === 'delivery' && maxDeliveryDistanceKm > 0 && selectedStoreDistanceKm !== null && selectedStoreDistanceKm > maxDeliveryDistanceKm

  useEffect(() => {
    let mounted = true
    async function loadConfig() {
      const [settingsData, storeData, productData] = await Promise.all([
        storeConfigService.getSettings(),
        storeConfigService.listStores(),
        productService.listProducts()
      ])
      if (!mounted) return
      const normalized = normalizeStoreSettings(settingsData)
      const nextStores = storeData.length ? storeData : defaultStores
      const enabledStores = nextStores.filter((store) => store.isActive !== false)
      const preferredStoreId = role === 'store' && adminSession?.storeId ? adminSession.storeId : selectedStoreId
      setStoreSettings(normalized)
      setStores(nextStores)
      setProducts(productData.filter((product) => product.isAvailable))
      setSelectedStoreId((current) => enabledStores.some((store) => store.id === preferredStoreId) ? preferredStoreId : (enabledStores.some((store) => store.id === current) ? current : (enabledStores[0]?.id || '')))
      if (normalized.timeSettings?.immediateEnabled === false) setTimeType('scheduled')
      setOrderDate(getDateAfter(normalized.timeSettings?.preorderMinDays || 0))
    }
    loadConfig()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    let mounted = true
    async function loadStoreProductStatuses() {
      if (!selectedStoreId) {
        setStoreProductStatuses({})
        return
      }
      const statuses = await storeProductStatusService.listStoreProductStatuses({
        storeId: selectedStoreId,
        date: getStoreStatusDate()
      })
      if (mounted) setStoreProductStatuses(statuses)
    }
    loadStoreProductStatuses()
    return () => { mounted = false }
  }, [selectedStoreId])

  useEffect(() => {
    if (!activeDiningOptions.some((item) => item.value === diningType)) setDiningType(activeDiningOptions[0]?.value || 'dine_in')
  }, [activeDiningOptions, diningType])

  useEffect(() => {
    if (!timeOptions.some((item) => item.value === timeType)) setTimeType(timeOptions[0]?.value || 'scheduled')
  }, [timeOptions, timeType])

  useEffect(() => {
    if (orderDate < minScheduledDate) setOrderDate(minScheduledDate)
  }, [minScheduledDate, orderDate])

  useEffect(() => {
    if (diningType !== 'delivery' && deliveryAddress) setDeliveryAddress('')
    if (diningType !== 'dine_in' && tableNumber) setTableNumber('')
  }, [diningType, deliveryAddress, tableNumber])

  useEffect(() => {
    if (isStore || activeStores.length === 0) return
    if (!navigator.geolocation) return setStoreLocationMessage('無法使用 GPS，請手動選擇門店。')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextUserLocation = { latitude: position.coords.latitude, longitude: position.coords.longitude }
        setUserLocation(nextUserLocation)
        const nearest = [...activeStores].sort((a, b) => getDistanceKm(nextUserLocation, a) - getDistanceKm(nextUserLocation, b))[0]
        if (nearest) {
          setSelectedStoreId(nearest.id)
          setStoreLocationMessage(`已依 GPS 選擇最近門店：約 ${getDistanceKm(nextUserLocation, nearest).toFixed(1)} km`)
        }
      },
      () => setStoreLocationMessage('無法取得 GPS，請手動選擇門店。'),
      { enableHighAccuracy: true, timeout: 6000 }
    )
  }, [isStore, activeStores.length])

  const storeVisibleProducts = useMemo(() => {
    return products
      .map((product) => {
        const storeStatus = storeProductStatuses[product.id] || PRODUCT_STORE_STATUS.HIDDEN
        return {
          ...product,
          storeStatus,
          isSoldOut: storeStatus === PRODUCT_STORE_STATUS.SOLD_OUT
        }
      })
      .filter((product) => product.storeStatus === PRODUCT_STORE_STATUS.AVAILABLE || product.storeStatus === PRODUCT_STORE_STATUS.SOLD_OUT)
  }, [products, storeProductStatuses])

  const categories = useMemo(() => ['全部', ...Array.from(new Set(storeVisibleProducts.map((p) => p.category)))], [storeVisibleProducts])
  const visibleProducts = storeVisibleProducts.filter((product) => category === '全部' || product.category === category)

  function saveProfile(event) {
    event.preventDefault()
    if (!profileDraft.name || !profileDraft.phone) return setMessage('請填寫姓名與電話。')
    setMessage('')
    setProfile(profileDraft)
    writeStorage(CUSTOMER_PROFILE_KEY, profileDraft)
  }

  function addToCart(item) {
    if (storeProductStatuses[item.productId] !== PRODUCT_STORE_STATUS.AVAILABLE) {
      setMessage('此商品目前未上架或已售完。')
      setSelectedProduct(null)
      return
    }
    setCartItems([...cartItems, item])
    setSelectedProduct(null)
  }

  function removeFromCart(index) {
    setCartItems(cartItems.filter((_, itemIndex) => itemIndex !== index))
  }

  function goCheckout() {
    setMessage('')
    if (cartItems.length === 0) return setMessage('請先加入商品。')
    const unavailableItem = cartItems.find((item) => storeProductStatuses[item.productId] !== PRODUCT_STORE_STATUS.AVAILABLE)
    if (unavailableItem) return setMessage(`「${unavailableItem.name}」目前未上架或已售完，請先從購物車移除。`)
    if (isStore) return submitOrder()
    setCheckoutStep('checkout')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function getScheduledTime() {
    if (timeType === 'now') return ''
    if (!orderDate || !orderTime) return ''
    return `${orderDate}T${orderTime}`
  }

  function renderLineWarning(extraClassName = '') {
    if (isStore || isLineLoggedIn) return null
    return (
      <p className={`rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-semibold leading-6 text-red-700 ${extraClassName}`}>
        未使用 LINE 點餐，將無法收到店家接單、取消等訂單狀態通知。請務必留下可聯絡電話。
      </p>
    )
  }

  function renderLineEntry() {
    if (isStore || isLineLoggedIn || allowNoLineOrder || hasProfile) return null
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <section className="card border-accent/30 bg-green-50/80 p-7 text-center">
          <MessageCircle className="mx-auto text-accent" size={52} />
          <h1 className="mt-4 text-3xl font-black">使用 LINE 開始點餐</h1>
          <p className="mt-3 text-sm leading-6 text-muted">建議使用 LINE 點餐，才能收到店家接單、取消與訂單狀態通知。</p>
          <a className={`btn-primary mt-6 inline-block ${!env.lineOfficialAccountUrl ? 'pointer-events-none opacity-40' : ''}`} href={env.lineOfficialAccountUrl || '#'} target="_blank" rel="noreferrer">加入 LINE 官方帳號</a>
          <p className="mt-3 text-xs leading-5 text-muted">加入後請回到此頁繼續點餐。</p>
        </section>

        <section className="mt-4 rounded-3xl border border-line bg-white/80 p-4">
          <button className="flex w-full items-center justify-between text-left text-sm font-black text-muted" type="button" onClick={() => setNoLineExpanded(!noLineExpanded)}>
            <span>沒有 LINE，也可以繼續點餐</span>
            <ChevronDown className={`transition ${noLineExpanded ? 'rotate-180' : ''}`} size={18} />
          </button>
          {noLineExpanded && (
            <div className="mt-4 space-y-3">
              {renderLineWarning()}
              <button className="btn-secondary w-full" type="button" onClick={() => setAllowNoLineOrder(true)}>我了解，仍要繼續點餐</button>
            </div>
          )}
        </section>
      </div>
    )
  }

  async function submitOrder() {
    setMessage('')
    if (cartItems.length === 0) return setMessage('請先加入商品。')
    if (!hasProfile) return setMessage('請先完成顧客資料。')
    if (!selectedStore) return setMessage('請選擇門店。')
    const unavailableItem = cartItems.find((item) => storeProductStatuses[item.productId] !== PRODUCT_STORE_STATUS.AVAILABLE)
    if (unavailableItem) return setMessage(`「${unavailableItem.name}」目前未上架或已售完，請先從購物車移除。`)
    if (diningType === 'delivery' && !deliveryAddress.trim()) return setMessage('請填寫外送地址。')
    if (isOverDeliveryDistance) return setMessage(`目前距離約 ${selectedStoreDistanceKm.toFixed(1)} km，超過可外送範圍 ${maxDeliveryDistanceKm} km。`)
    if (timeType === 'now' && !timeSettings.immediateEnabled) return setMessage('目前不開放立即訂餐，請選擇預定。')
    if (timeType === 'scheduled' && !getScheduledTime()) return setMessage('請選擇預定日期與時間。')
    if (timeType === 'scheduled' && orderDate < minScheduledDate) return setMessage(`預定日期至少需提前 ${timeSettings.preorderMinDays || 0} 天。`)

    const customerLineUserId = !isStore && isLineLoggedIn ? 'mock-line-user-id' : ''
    const order = await orderService.createOrder({
      source,
      store: selectedStore ? { id: selectedStore.id, name: selectedStore.name } : null,
      customer: {
        name: isStore ? '門店櫃檯' : profile.name,
        phone: isStore ? '' : profile.phone,
        lineUserId: customerLineUserId,
        lineDisplayName: customerLineUserId ? profile.name : ''
      },
      diningType,
      deliveryAddress: diningType === 'delivery' ? deliveryAddress.trim() : '',
      deliveryDistanceKm: diningType === 'delivery' && selectedStoreDistanceKm !== null ? Number(selectedStoreDistanceKm.toFixed(1)) : null,
      pickupTime: getScheduledTime(),
      items: cartItems,
      totalAmount: calculateCartTotal(cartItems),
      note: [
        selectedStore ? `門店：${selectedStore.name}` : '',
        timeType === 'now' ? '時間：立即' : `時間：${orderDate} ${orderTime}`,
        storeSettings.tableNumberEnabled && diningType === 'dine_in' && tableNumber ? `桌號：${tableNumber}` : '',
        diningType === 'delivery' && deliveryAddress.trim() ? `外送地址：${deliveryAddress.trim()}` : '',
        diningType === 'delivery' && selectedStoreDistanceKm !== null ? `外送距離：約 ${selectedStoreDistanceKm.toFixed(1)} km` : '',
        bagging ? '需要打包' : '不需打包',
        note ? `備註：${note}` : ''
      ].filter(Boolean).join('｜')
    })
    setSuccessOrder(order)
    setCartItems([])
    setNote('')
    setTableNumber('')
    setDeliveryAddress('')
    setBagging(false)
    setTimeType(timeSettings.immediateEnabled === false ? 'scheduled' : 'now')
    setOrderDate(getDateAfter(timeSettings.preorderMinDays || 0))
    setOrderTime('')
    setCheckoutStep('ordering')
  }

  function renderStoreSelector() {
    if (activeStores.length === 0) return null
    return (
      <section className="card p-4">
        <div className="flex items-center gap-2"><MapPin className="text-accent" size={18} /><h2 className="font-black">選擇門店</h2></div>
        <select className="input mt-3" value={selectedStoreId} onChange={(event) => { setSelectedStoreId(event.target.value); setCartItems([]) }} disabled={role === 'store' && !!adminSession?.storeId}>
          {activeStores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
        </select>
        {selectedStore?.address && <p className="mt-2 text-xs text-muted">{selectedStore.address}</p>}
        {!isStore && storeLocationMessage && <p className="mt-2 text-xs text-muted">{storeLocationMessage}</p>}
      </section>
    )
  }

  function renderOrderOptionsPanel() {
    return (
      <div className="space-y-3">
        {(!isStore || isOwner) && renderStoreSelector()}
        <section className={isStore ? 'card p-3' : 'card p-4'}>
          <h2 className="font-black">用餐方式</h2>
          <div className="mt-2"><DiningTypeSelector value={diningType} onChange={setDiningType} options={activeDiningOptions} /></div>
          {storeSettings.tableNumberEnabled && diningType === 'dine_in' && (
            <label className="mt-3 block space-y-1">
              <span className="label">桌號</span>
              <select className="input" value={tableNumber} onChange={(event) => setTableNumber(event.target.value)}>
                <option value="">請選擇桌號</option>
                {(storeSettings.tableNumbers || []).map((table) => <option key={table.id} value={table.name}>{table.name}</option>)}
              </select>
            </label>
          )}
          {diningType === 'delivery' && (
            <div className="mt-3 space-y-2">
              <label className="block space-y-1">
                <span className="label">外送地址 *</span>
                <textarea className="input min-h-24" value={deliveryAddress} onChange={(event) => setDeliveryAddress(event.target.value)} placeholder="請填寫外送地址、樓層或備註" autoComplete="street-address" />
              </label>
              <div className={`rounded-2xl p-3 text-xs leading-5 ${isOverDeliveryDistance ? 'bg-red-50 text-red-700' : 'bg-cream text-muted'}`}>
                {maxDeliveryDistanceKm > 0 && <p>可外送距離：{maxDeliveryDistanceKm} km 內{selectedStoreDistanceKm !== null ? `｜目前約 ${selectedStoreDistanceKm.toFixed(1)} km` : ''}</p>}
                {freeDeliveryMinAmount > 0 && <p>滿 {formatPrice(freeDeliveryMinAmount)} 免費外送｜目前 {cartTotal >= freeDeliveryMinAmount ? '已達門檻' : `還差 ${formatPrice(freeDeliveryMinAmount - cartTotal)}`}</p>}
                {maxDeliveryDistanceKm === 0 && freeDeliveryMinAmount === 0 && <p>外送條件未設定，請依門店實際規則確認。</p>}
              </div>
            </div>
          )}
          <label className="mt-3 flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={bagging} onChange={(event) => setBagging(event.target.checked)} />需要打包</label>
        </section>
        <section className={isStore ? 'card p-3' : 'card p-4'}>
          <h2 className="font-black">用餐 / 取餐 / 外送時間</h2>
          <div className={`mt-2 grid gap-2 rounded-3xl bg-cream p-1.5 ${timeOptions.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {timeOptions.map((item) => <button key={item.value} className={`rounded-2xl px-3 py-2.5 text-sm font-bold ${timeType === item.value ? 'bg-white text-brand shadow' : 'text-muted'}`} type="button" onClick={() => setTimeType(item.value)}>{item.label}</button>)}
          </div>
          {timeType === 'scheduled' && (
            <div className="mt-3 grid gap-2">
              <label className="space-y-1"><span className="label">日期 *</span><input className="input" type="date" min={minScheduledDate} value={orderDate} onChange={(event) => setOrderDate(event.target.value)} /></label>
              <label className="space-y-1"><span className="label">時間 *</span><input className="input" type="time" value={orderTime} onChange={(event) => setOrderTime(event.target.value)} /></label>
              {timeSettings.preorderMinDays > 0 && <p className="text-xs text-muted">需至少提前 {timeSettings.preorderMinDays} 天預定。</p>}
            </div>
          )}
        </section>
      </div>
    )
  }

  function renderCustomerStoreHeader() {
    if (activeStores.length === 0) return null
    return (
      <div>
        <label className="sr-only" htmlFor="customer-store-select">下拉選擇門店</label>
        <div className="relative rounded-2xl bg-cream px-3 py-2 pr-10">
          <select id="customer-store-select" className="w-full appearance-none bg-transparent text-base font-black text-ink outline-none" value={selectedStoreId} onChange={(event) => { setSelectedStoreId(event.target.value); setCartItems([]) }}>
            <option value="" disabled>下拉選擇門店</option>
            {activeStores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-brand" size={18} />
        </div>
        {selectedStore && <p className="mt-1.5 text-[11px] leading-4 text-muted">{selectedStore.name}{storeLocationMessage ? `｜${storeLocationMessage}` : ''}</p>}
      </div>
    )
  }

  const lineEntry = renderLineEntry()
  if (lineEntry) return lineEntry

  if (!isStore && !hasProfile) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <form className="card p-7" onSubmit={saveProfile}>
          <UserRound className="text-accent" size={36} />
          <h1 className="mt-3 text-3xl font-black">建立訂餐資料</h1>
          <p className="mt-2 text-sm leading-6 text-muted">初次訂餐請填寫姓名與電話。資料僅限訂單聯絡使用。</p>
          {allowNoLineOrder && renderLineWarning('mt-4')}
          <div className="mt-5 space-y-3">
            <label className="block space-y-1"><span className="label">姓名 *</span><input className="input" value={profileDraft.name} onChange={(event) => setProfileDraft({ ...profileDraft, name: event.target.value })} required /></label>
            <label className="block space-y-1"><span className="label">電話 *</span><input className="input" value={profileDraft.phone} onChange={(event) => setProfileDraft({ ...profileDraft, phone: event.target.value })} required inputMode="tel" /></label>
          </div>
          {message && <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{message}</p>}
          <button className="btn-primary mt-5 w-full" type="submit">儲存並開始點餐</button>
        </form>
      </div>
    )
  }

  if (successOrder) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="card p-8 text-center">
          <CheckCircle2 className="mx-auto text-accent" size={52} />
          <h1 className="mt-4 text-3xl font-black">訂餐成功</h1>
          <p className="mt-2 text-muted">訂單編號：{successOrder.orderNumber}</p>
          <p className="mt-4 text-4xl font-black text-brand">{formatPrice(successOrder.totalAmount)}</p>
          {!isLineLoggedIn && <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold leading-6 text-red-700">你尚未使用 LINE 點餐，本次訂單不會收到接單或取消等狀態通知。請留意電話聯絡。</p>}
          <button className="btn-primary mt-6" type="button" onClick={() => setSuccessOrder(null)}>建立下一筆訂單</button>
        </div>
      </div>
    )
  }

  if (!isStore && checkoutStep === 'checkout') {
    return (
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-6 lg:grid-cols-[1fr_360px]">
        <main className="space-y-5">
          <section className="card p-5">
            <p className="text-xs font-semibold text-accent">Checkout</p>
            <h1 className="mt-1 text-3xl font-black">確認訂單</h1>
            <p className="mt-2 text-sm text-muted">確認門店、用餐方式、用餐 / 取餐 / 外送時間與訂單聯絡資料。</p>
            {allowNoLineOrder && renderLineWarning('mt-4')}
          </section>
          {renderOrderOptionsPanel()}
          <section className="card p-5">
            <h2 className="font-black">訂單聯絡資料</h2>
            <div className="mt-3 rounded-2xl bg-cream p-4 text-sm"><p className="font-bold">{profile.name}</p><p className="mt-1 text-muted">{profile.phone}</p></div>
            <label className="mt-4 block space-y-1"><span className="label">訂單備註</span><textarea className="input min-h-24" placeholder="例如：餐具需求、特殊備註" value={note} onChange={(event) => setNote(event.target.value)} /></label>
          </section>
          {message && <p className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{message}</p>}
          <button className="btn-secondary" type="button" onClick={() => setCheckoutStep('ordering')}>返回修改商品</button>
        </main>
        <div className="space-y-4"><CartPanel items={cartItems} onRemove={removeFromCart} onSubmit={submitOrder} submitLabel="送出訂單" /></div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-0 py-0 pb-32 md:px-3 md:py-4 md:pb-4">
      <main className={isStore ? 'space-y-3 px-3 md:grid md:grid-cols-[1fr_340px] md:gap-4 md:px-0' : 'space-y-0'}>
        {!isStore && (
          <section className="grid h-[calc(100vh-73px)] grid-cols-[104px_1fr] overflow-hidden bg-white lg:h-[calc(100vh-81px)] lg:rounded-3xl lg:border lg:border-line">
            <aside className="overflow-y-auto border-r border-line bg-white pb-28">
              <div className="sticky top-0 z-10 bg-white px-3 py-4 text-base font-black text-ink">熱銷</div>
              <div className="space-y-0.5 pb-4">
                {categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={`w-full border-l-2 px-3 py-4 text-left text-sm font-semibold leading-6 transition ${category === item ? 'border-brand bg-cream text-ink' : 'border-transparent text-muted'}`}>{item}</button>)}
              </div>
            </aside>
            <section className="overflow-y-auto pb-32">
              <div className="sticky top-0 z-10 border-b border-line bg-white/95 px-3 py-3 backdrop-blur">{renderCustomerStoreHeader()}</div>
              <div className="grid grid-cols-2 gap-2 px-2 py-2.5 sm:gap-2.5 sm:px-3 md:grid-cols-3 xl:grid-cols-4">
                {visibleProducts.map((product) => <ProductCard key={product.id} product={product} onSelect={setSelectedProduct} compact dense />)}
                {visibleProducts.length === 0 && <p className="col-span-2 p-8 text-center text-sm text-muted md:col-span-3 xl:col-span-4">這間門店今日尚未上架此分類商品。</p>}
              </div>
            </section>
          </section>
        )}
        {isStore && (
          <section className="space-y-3">
            <section className="card p-4"><p className="text-xs font-semibold text-accent">Counter Order</p><h1 className="mt-1 text-2xl font-black">門店櫃檯點餐</h1><p className="mt-2 text-sm text-muted">目前門店：{selectedStore?.name || '未選擇'}</p></section>
            <section className="card p-3">
              <div className="mb-3 flex items-center gap-2"><ShoppingBag size={18} className="text-accent" /><h2 className="font-black">商品</h2></div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
                {visibleProducts.map((product) => <ProductCard key={product.id} product={product} onSelect={setSelectedProduct} compact dense />)}
                {visibleProducts.length === 0 && <p className="col-span-2 p-8 text-center text-sm text-muted md:col-span-3 xl:col-span-4">這間門店今日尚未上架此分類商品。</p>}
              </div>
            </section>
          </section>
        )}
        <div className={isStore ? 'space-y-3 md:sticky md:top-24 md:self-start' : 'fixed inset-x-0 bottom-0 z-30 border-t border-line bg-cream/95 p-3 backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:p-0'}>
          {isStore && renderOrderOptionsPanel()}
          <CartPanel items={cartItems} onRemove={removeFromCart} onSubmit={goCheckout} submitLabel={isStore ? '建立櫃檯訂單' : '前往結帳'} compact={!isStore} />
          {message && <p className="mt-2 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{message}</p>}
        </div>
      </main>
      {selectedProduct && <ProductOptionModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onAdd={addToCart} />}
    </div>
  )
}
