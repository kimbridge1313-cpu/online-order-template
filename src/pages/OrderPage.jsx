import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, ChevronDown, ChevronUp, MapPin, MessageCircle, Minus, Plus, ShoppingBag, Trash2, UserRound } from 'lucide-react'
import ProductCard from '../components/ProductCard'
import ProductOptionModal from '../components/ProductOptionModal'
import CartPanel from '../components/CartPanel'
import DiningTypeSelector from '../components/DiningTypeSelector'
import { productService } from '../services/productService'
import { orderService } from '../services/orderService'
import { calculateCartTotal, formatPrice } from '../utils/price'
import { env } from '../config/env'
import { readStorage, writeStorage } from '../utils/storage'

const CUSTOMER_PROFILE_KEY = 'online-order-template-customer-profile'
const MOCK_ROLE_KEY = 'online-order-template-role'
const MOCK_LINE_LOGIN_KEY = 'online-order-template-line-login'
const STORE_SETTINGS_KEY = 'online-order-template-store-settings'
const STORE_LIST_KEY = 'online-order-template-store-list'
const defaultStores = [
  { id: 'demo-store', name: '示範門店', accountName: 'demo-store-account', latitude: 23.6978, longitude: 120.9605, address: '示範地址', isActive: true }
]

function getTodayDate() {
  return new Date().toISOString().slice(0, 10)
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

function CartItemControls({ item, index, onRemove, onQuantityChange }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-bold text-ink">{item.name}</p>
          {item.selectedOptions?.length > 0 && (
            <ul className="mt-1 space-y-0.5 text-xs text-muted">
              {item.selectedOptions.map((option) => (
                <li key={`${option.groupId}-${option.optionId}`}>{option.groupName}：{option.optionName}{option.priceDelta > 0 ? ` +${formatPrice(option.priceDelta)}` : ''}</li>
              ))}
            </ul>
          )}
          {item.note && <p className="mt-1 text-xs text-muted">備註：{item.note}</p>}
        </div>
        <button className="rounded-xl p-2 text-red-600 hover:bg-red-50" type="button" onClick={() => onRemove(index)} aria-label="刪除商品"><Trash2 size={18} /></button>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="font-black text-brand">{formatPrice(item.subtotal)}</p>
        <div className="flex items-center gap-2">
          <button className="flex h-8 w-8 items-center justify-center rounded-xl border border-line bg-white" type="button" onClick={() => onQuantityChange(index, item.quantity - 1)} aria-label="減少數量"><Minus size={16} /></button>
          <span className="w-7 text-center font-bold">{item.quantity}</span>
          <button className="flex h-8 w-8 items-center justify-center rounded-xl border border-line bg-white" type="button" onClick={() => onQuantityChange(index, item.quantity + 1)} aria-label="增加數量"><Plus size={16} /></button>
        </div>
      </div>
    </div>
  )
}

export default function OrderPage() {
  const [role, setRole] = useState(() => readStorage(MOCK_ROLE_KEY, 'customer'))
  const [isLineLoggedIn, setIsLineLoggedIn] = useState(() => readStorage(MOCK_LINE_LOGIN_KEY, false))
  const [profile, setProfile] = useState(() => readStorage(CUSTOMER_PROFILE_KEY, { name: '', phone: '' }))
  const [profileDraft, setProfileDraft] = useState(() => readStorage(CUSTOMER_PROFILE_KEY, { name: '', phone: '' }))
  const [storeSettings] = useState(() => readStorage(STORE_SETTINGS_KEY, { tableNumberEnabled: false, tableNumbers: [] }))
  const [stores] = useState(() => readStorage(STORE_LIST_KEY, defaultStores).filter((store) => store.isActive !== false))
  const [selectedStoreId, setSelectedStoreId] = useState(() => (readStorage(STORE_LIST_KEY, defaultStores).find((store) => store.isActive !== false)?.id || 'demo-store'))
  const [storeLocationMessage, setStoreLocationMessage] = useState('')
  const [products, setProducts] = useState([])
  const [category, setCategory] = useState('全部')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [cartItems, setCartItems] = useState([])
  const [mobileCartOpen, setMobileCartOpen] = useState(false)
  const [checkoutStep, setCheckoutStep] = useState('ordering')
  const [diningType, setDiningType] = useState('dine_in')
  const [bagging, setBagging] = useState(false)
  const [timeType, setTimeType] = useState('now')
  const [orderDate, setOrderDate] = useState(getTodayDate())
  const [orderTime, setOrderTime] = useState('')
  const [tableNumber, setTableNumber] = useState('')
  const [note, setNote] = useState('')
  const [message, setMessage] = useState('')
  const [successOrder, setSuccessOrder] = useState(null)

  const isStore = role === 'store' || role === 'owner'
  const hasProfile = isStore || Boolean(profile?.name && profile?.phone)
  const source = isStore ? 'counter' : 'customer_online'
  const cartTotal = calculateCartTotal(cartItems)
  const selectedStore = stores.find((store) => store.id === selectedStoreId) || stores[0]

  async function loadProducts() {
    const data = await productService.listProducts()
    setProducts(data.filter((product) => product.isAvailable))
  }

  useEffect(() => { loadProducts() }, [])

  useEffect(() => {
    if (isStore || stores.length === 0) return
    if (!navigator.geolocation) {
      setStoreLocationMessage('無法使用 GPS，請手動選擇門店。')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLocation = { latitude: position.coords.latitude, longitude: position.coords.longitude }
        const nearest = [...stores].sort((a, b) => getDistanceKm(userLocation, a) - getDistanceKm(userLocation, b))[0]
        if (nearest) {
          setSelectedStoreId(nearest.id)
          const distance = getDistanceKm(userLocation, nearest)
          setStoreLocationMessage(`已依 GPS 選擇最近門店：約 ${distance.toFixed(1)} km`)
        }
      },
      () => setStoreLocationMessage('無法取得 GPS，請手動選擇門店。'),
      { enableHighAccuracy: true, timeout: 6000 }
    )
  }, [isStore, stores])

  const categories = useMemo(() => ['全部', ...Array.from(new Set(products.map((p) => p.category)))], [products])
  const visibleProducts = products.filter((product) => category === '全部' || product.category === category)

  function updateRole(nextRole) {
    setRole(nextRole)
    writeStorage(MOCK_ROLE_KEY, nextRole)
    if (nextRole === 'store' || nextRole === 'owner') {
      setIsLineLoggedIn(true)
      writeStorage(MOCK_LINE_LOGIN_KEY, true)
      setCheckoutStep('ordering')
    }
  }

  function mockLineLogin() {
    setIsLineLoggedIn(true)
    writeStorage(MOCK_LINE_LOGIN_KEY, true)
  }

  function saveProfile(event) {
    event.preventDefault()
    if (!profileDraft.name || !profileDraft.phone) return setMessage('請填寫姓名與電話。')
    setMessage('')
    setProfile(profileDraft)
    writeStorage(CUSTOMER_PROFILE_KEY, profileDraft)
  }

  function addToCart(item) {
    setCartItems([...cartItems, item])
    setSelectedProduct(null)
  }

  function removeFromCart(index) {
    setCartItems(cartItems.filter((_, itemIndex) => itemIndex !== index))
  }

  function updateCartQuantity(index, nextQuantity) {
    const quantity = Math.max(1, Number(nextQuantity || 1))
    setCartItems(cartItems.map((item, itemIndex) => itemIndex === index ? { ...item, quantity, subtotal: Number(item.unitPrice || 0) * quantity } : item))
  }

  function goCheckout() {
    setMessage('')
    if (cartItems.length === 0) return setMessage('請先加入商品。')
    if (isStore) return submitOrder()
    setMobileCartOpen(false)
    setCheckoutStep('checkout')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function getScheduledTime() {
    if (timeType === 'now') return ''
    if (!orderDate || !orderTime) return ''
    return `${orderDate}T${orderTime}`
  }

  async function submitOrder() {
    setMessage('')
    if (cartItems.length === 0) return setMessage('請先加入商品。')
    if (!hasProfile) return setMessage('請先完成顧客資料。')
    if (!selectedStore) return setMessage('請選擇門店。')
    if (timeType === 'scheduled' && !getScheduledTime()) return setMessage('請選擇預定日期與時間。')

    const order = await orderService.createOrder({
      source,
      store: selectedStore ? { id: selectedStore.id, name: selectedStore.name } : null,
      customer: {
        name: isStore ? '門店櫃檯' : profile.name,
        phone: isStore ? '' : profile.phone,
        lineUserId: isStore ? '' : 'mock-line-user-id',
        lineDisplayName: isStore ? '' : profile.name
      },
      diningType,
      pickupTime: getScheduledTime(),
      items: cartItems,
      totalAmount: calculateCartTotal(cartItems),
      note: [
        selectedStore ? `門店：${selectedStore.name}` : '',
        timeType === 'now' ? '時間：立即' : `時間：${orderDate} ${orderTime}`,
        storeSettings.tableNumberEnabled && tableNumber ? `桌號：${tableNumber}` : '',
        bagging ? '需要打包' : '不需打包',
        note ? `備註：${note}` : ''
      ].filter(Boolean).join('｜')
    })
    setSuccessOrder(order)
    setCartItems([])
    setNote('')
    setTableNumber('')
    setBagging(false)
    setTimeType('now')
    setOrderDate(getTodayDate())
    setOrderTime('')
    setCheckoutStep('ordering')
  }

  function StoreSelector() {
    if (stores.length === 0) return null
    return (
      <section className="card p-4">
        <div className="flex items-center gap-2">
          <MapPin className="text-accent" size={18} />
          <h2 className="font-black">選擇門店</h2>
        </div>
        <select className="input mt-3" value={selectedStoreId} onChange={(event) => setSelectedStoreId(event.target.value)}>
          {stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
        </select>
        {selectedStore?.address && <p className="mt-2 text-xs text-muted">{selectedStore.address}</p>}
        {!isStore && storeLocationMessage && <p className="mt-2 text-xs text-muted">{storeLocationMessage}</p>}
      </section>
    )
  }

  function CustomerStoreHeader() {
    if (stores.length === 0) return null
    return (
      <div>
        <label className="sr-only" htmlFor="customer-store-select">下拉選擇門店</label>
        <select
          id="customer-store-select"
          className="w-full appearance-none bg-transparent text-xl font-black text-ink outline-none"
          value={selectedStoreId}
          onChange={(event) => setSelectedStoreId(event.target.value)}
        >
          <option value="" disabled>下拉選擇門店</option>
          {stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
        </select>
        {selectedStore && <p className="mt-1 text-xs text-muted">{selectedStore.name}{storeLocationMessage ? `｜${storeLocationMessage}` : ''}</p>}
      </div>
    )
  }

  function OrderOptionsPanel() {
    return (
      <div className="space-y-3">
        {!isStore && <StoreSelector />}
        <section className={isStore ? 'card p-3' : 'card p-4'}>
          <h2 className="font-black">用餐方式</h2>
          <div className="mt-2"><DiningTypeSelector value={diningType} onChange={setDiningType} /></div>
          {storeSettings.tableNumberEnabled && (
            <label className="mt-3 block space-y-1">
              <span className="label">桌號</span>
              <select className="input" value={tableNumber} onChange={(event) => setTableNumber(event.target.value)}>
                <option value="">請選擇桌號</option>
                {(storeSettings.tableNumbers || []).map((table) => <option key={table.id} value={table.name}>{table.name}</option>)}
              </select>
            </label>
          )}
          <label className="mt-3 flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={bagging} onChange={(event) => setBagging(event.target.checked)} />
            需要打包
          </label>
        </section>

        <section className={isStore ? 'card p-3' : 'card p-4'}>
          <h2 className="font-black">用餐 / 取餐時間</h2>
          <div className="mt-2 grid grid-cols-2 gap-2 rounded-3xl bg-cream p-1.5">
            <button className={`rounded-2xl px-3 py-2.5 text-sm font-bold ${timeType === 'now' ? 'bg-white text-brand shadow' : 'text-muted'}`} type="button" onClick={() => setTimeType('now')}>立即</button>
            <button className={`rounded-2xl px-3 py-2.5 text-sm font-bold ${timeType === 'scheduled' ? 'bg-white text-brand shadow' : 'text-muted'}`} type="button" onClick={() => setTimeType('scheduled')}>預定</button>
          </div>
          {timeType === 'scheduled' && (
            <div className="mt-3 grid gap-2">
              <label className="space-y-1"><span className="label">日期 *</span><input className="input" type="date" value={orderDate} onChange={(event) => setOrderDate(event.target.value)} /></label>
              <label className="space-y-1"><span className="label">時間 *</span><input className="input" type="time" value={orderTime} onChange={(event) => setOrderTime(event.target.value)} /></label>
            </div>
          )}
        </section>
      </div>
    )
  }

  if (!isStore && !isLineLoggedIn) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <section className="card border-accent/30 bg-green-50/80 p-7 text-center">
          <MessageCircle className="mx-auto text-accent" size={52} />
          <h1 className="mt-4 text-3xl font-black">請先加入 LINE 官方帳號</h1>
          <p className="mt-3 text-sm leading-6 text-muted">為了接收訂單通知與聯絡訂單內容，請先加入店家的 LINE 官方帳號，再開始點餐。</p>
          <a className={`btn-primary mt-6 inline-block ${!env.lineOfficialAccountUrl ? 'pointer-events-none opacity-40' : ''}`} href={env.lineOfficialAccountUrl || '#'} target="_blank" rel="noreferrer">加入 LINE 官方帳號</a>
          <button className="btn-secondary mt-3 w-full" type="button" onClick={mockLineLogin}>模板測試：模擬已登入 LINE</button>
          <button className="mt-4 text-xs font-semibold text-muted underline" type="button" onClick={() => updateRole('store')}>模板測試：切換為門店帳號</button>
          <button className="mt-3 text-xs font-semibold text-muted underline" type="button" onClick={() => updateRole('owner')}>模板測試：切換為老闆帳號</button>
        </section>
      </div>
    )
  }

  if (!isStore && !hasProfile) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <form className="card p-7" onSubmit={saveProfile}>
          <UserRound className="text-accent" size={36} />
          <h1 className="mt-3 text-3xl font-black">建立訂餐資料</h1>
          <p className="mt-2 text-sm leading-6 text-muted">初次訂餐請填寫姓名與電話。資料僅限訂單聯絡使用。</p>
          <div className="mt-5 space-y-3">
            <label className="space-y-1 block"><span className="label">姓名 *</span><input className="input" value={profileDraft.name} onChange={(event) => setProfileDraft({ ...profileDraft, name: event.target.value })} required /></label>
            <label className="space-y-1 block"><span className="label">電話 *</span><input className="input" value={profileDraft.phone} onChange={(event) => setProfileDraft({ ...profileDraft, phone: event.target.value })} required inputMode="tel" /></label>
          </div>
          {message && <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{message}</p>}
          <button className="btn-primary mt-5 w-full" type="submit">儲存並開始點餐</button>
        </form>
      </div>
    )
  }

  if (successOrder) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10"><div className="card p-8 text-center"><CheckCircle2 className="mx-auto text-accent" size={52} /><h1 className="mt-4 text-3xl font-black">訂餐成功</h1><p className="mt-2 text-muted">訂單編號：{successOrder.orderNumber}</p><p className="mt-4 text-4xl font-black text-brand">{formatPrice(successOrder.totalAmount)}</p><button className="btn-primary mt-6" type="button" onClick={() => setSuccessOrder(null)}>建立下一筆訂單</button></div></div>
    )
  }

  if (!isStore && checkoutStep === 'checkout') {
    return (
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-6 lg:grid-cols-[1fr_360px]">
        <main className="space-y-5">
          <section className="card p-5"><p className="text-xs font-semibold text-accent">Checkout</p><h1 className="mt-1 text-3xl font-black">確認訂單</h1><p className="mt-2 text-sm text-muted">確認門店、用餐方式、用餐 / 取餐時間與訂單聯絡資料。</p></section>
          <OrderOptionsPanel />
          <section className="card p-5"><h2 className="font-black">訂單聯絡資料</h2><div className="mt-3 rounded-2xl bg-cream p-4 text-sm"><p className="font-bold">{profile.name}</p><p className="mt-1 text-muted">{profile.phone}</p><p className="mt-2 text-xs text-muted">資料僅限訂單聯絡使用。</p></div><label className="mt-4 block space-y-1"><span className="label">訂單備註</span><textarea className="input min-h-24" placeholder="例如：餐具需求、特殊備註" value={note} onChange={(event) => setNote(event.target.value)} /></label></section>
          {message && <p className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{message}</p>}
          <button className="btn-secondary" type="button" onClick={() => setCheckoutStep('ordering')}>返回修改商品</button>
        </main>
        <div className="space-y-4"><CartPanel items={cartItems} onRemove={removeFromCart} onSubmit={submitOrder} submitLabel="送出訂單" /></div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-0 py-0 pb-32 lg:px-3 lg:py-4 lg:pb-4">
      <main className={isStore ? 'space-y-3 px-3 lg:space-y-4 lg:px-0 lg:grid lg:grid-cols-[1fr_330px] lg:gap-4' : 'space-y-0'}>
        {!isStore && (
          <section className="grid h-[calc(100vh-73px)] grid-cols-[116px_1fr] overflow-hidden bg-white lg:h-[calc(100vh-81px)] lg:rounded-3xl lg:border lg:border-line">
            <aside className="overflow-y-auto border-r border-line bg-white pb-28">
              <div className="sticky top-0 z-10 bg-white px-4 py-5 text-lg font-black text-ink">熱銷</div>
              <div className="space-y-1 pb-4">
                {categories.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCategory(item)}
                    className={`w-full border-l-2 px-4 py-5 text-left text-base font-semibold leading-7 transition ${category === item ? 'border-brand bg-cream text-ink' : 'border-transparent text-muted'}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </aside>

            <section className="overflow-y-auto pb-32">
              <div className="sticky top-0 z-10 border-b border-line bg-white/95 px-4 py-4 backdrop-blur">
                <CustomerStoreHeader />
              </div>
              <div className="grid grid-cols-2 gap-2 px-2 py-3 sm:gap-3 sm:px-4 md:grid-cols-3 xl:grid-cols-4">
                {visibleProducts.map((product) => <ProductCard key={product.id} product={product} onSelect={setSelectedProduct} compact />)}
                {visibleProducts.length === 0 && <p className="col-span-2 p-8 text-center text-sm text-muted md:col-span-3 xl:col-span-4">此分類目前沒有商品。</p>}
              </div>
            </section>
          </section>
        )}

        {isStore && (
          <>
            <section className="space-y-3">
              <div className="flex gap-1.5 overflow-auto pb-0.5">{categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${category === item ? 'bg-brand text-white' : 'bg-white text-muted'}`}>{item}</button>)}</div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">{visibleProducts.map((product) => <ProductCard key={product.id} product={product} onSelect={setSelectedProduct} compact dense />)}</div>
            </section>
            <div className="hidden space-y-3 lg:block"><OrderOptionsPanel /><CartPanel items={cartItems} onRemove={removeFromCart} onSubmit={submitOrder} submitLabel="送出訂單" compact />{isStore && <label className="card block space-y-1 p-3"><span className="label">訂單備註</span><textarea className="input min-h-16" placeholder="例如：餐具需求、特殊備註" value={note} onChange={(event) => setNote(event.target.value)} /></label>}</div>
          </>
        )}
      </main>

      <div className={`fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 p-3 shadow-soft backdrop-blur ${isStore ? 'lg:hidden' : ''}`}><div className="mx-auto max-w-2xl">{mobileCartOpen && <div className="mb-3 max-h-[44vh] space-y-2 overflow-auto rounded-3xl border border-line bg-cream p-3">{cartItems.length === 0 && <p className="rounded-2xl bg-white p-4 text-sm text-muted">尚未加入商品。</p>}{cartItems.map((item, index) => <CartItemControls key={`${item.productId}-${index}`} item={item} index={index} onRemove={removeFromCart} onQuantityChange={updateCartQuantity} />)}</div>}<div className="flex items-center gap-3"><button className="flex min-w-0 flex-1 items-center justify-between rounded-2xl bg-cream px-4 py-3 text-left" type="button" onClick={() => setMobileCartOpen(!mobileCartOpen)}><span><span className="block text-xs font-semibold text-muted">購物車 {cartItems.length} 項</span><span className="block text-xl font-black text-brand">{formatPrice(cartTotal)}</span></span>{mobileCartOpen ? <ChevronDown size={20} /> : <ChevronUp size={20} />}</button><button className="btn-primary shrink-0" type="button" disabled={cartItems.length === 0} onClick={goCheckout}><ShoppingBag size={18} className="inline-block" /> {isStore ? '送出訂單' : '點餐完畢'}</button></div></div></div>
      {message && <p className="fixed bottom-24 left-4 right-4 z-50 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700 shadow-soft lg:static lg:mt-4">{message}</p>}
      {selectedProduct && <ProductOptionModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onAdd={addToCart} />}
    </div>
  )
}
