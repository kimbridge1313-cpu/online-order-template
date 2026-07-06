import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, MessageCircle } from 'lucide-react'
import ProductCard from '../components/ProductCard'
import ProductOptionModal from '../components/ProductOptionModal'
import CartPanel from '../components/CartPanel'
import DiningTypeSelector from '../components/DiningTypeSelector'
import CustomerForm from '../components/CustomerForm'
import { productService } from '../services/productService'
import { orderService } from '../services/orderService'
import { calculateCartTotal, formatPrice } from '../utils/price'
import { env } from '../config/env'

export default function OrderPage() {
  const [mode, setMode] = useState('customer_online')
  const [products, setProducts] = useState([])
  const [category, setCategory] = useState('全部')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [cartItems, setCartItems] = useState([])
  const [diningType, setDiningType] = useState('dine_in')
  const [pickupTime, setPickupTime] = useState('')
  const [customer, setCustomer] = useState({ name: '', phone: '' })
  const [note, setNote] = useState('')
  const [message, setMessage] = useState('')
  const [successOrder, setSuccessOrder] = useState(null)

  async function loadProducts() {
    const data = await productService.listProducts()
    setProducts(data)
  }

  useEffect(() => { loadProducts() }, [])

  const categories = useMemo(() => ['全部', ...Array.from(new Set(products.map((p) => p.category)))], [products])
  const visibleProducts = products.filter((product) => category === '全部' || product.category === category)

  function addToCart(item) {
    setCartItems([...cartItems, item])
    setSelectedProduct(null)
  }

  function removeFromCart(index) {
    setCartItems(cartItems.filter((_, itemIndex) => itemIndex !== index))
  }

  async function submitOrder() {
    setMessage('')
    if (cartItems.length === 0) return setMessage('請先加入商品。')
    if ((diningType === 'takeaway' || diningType === 'preorder') && !pickupTime) return setMessage('請填寫預計取餐時間。')
    if (mode === 'customer_online' && (!customer.name || !customer.phone)) return setMessage('客人線上訂餐請填寫姓名與手機。')

    const order = await orderService.createOrder({
      source: mode,
      customer: {
        name: customer.name,
        phone: customer.phone,
        lineUserId: '',
        lineDisplayName: ''
      },
      diningType,
      pickupTime: diningType === 'dine_in' ? '' : pickupTime,
      items: cartItems,
      totalAmount: calculateCartTotal(cartItems),
      note
    })
    setSuccessOrder(order)
    setCartItems([])
    setCustomer({ name: '', phone: '' })
    setNote('')
    setPickupTime('')
  }

  if (successOrder) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="card p-8 text-center">
          <CheckCircle2 className="mx-auto text-accent" size={52} />
          <h1 className="mt-4 text-3xl font-black">訂餐成功</h1>
          <p className="mt-2 text-muted">訂單編號：{successOrder.orderNumber}</p>
          <p className="mt-4 text-4xl font-black text-brand">{formatPrice(successOrder.totalAmount)}</p>
          <button className="btn-primary mt-6" type="button" onClick={() => setSuccessOrder(null)}>建立下一筆訂單</button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[1fr_380px]">
      <main className="space-y-6">
        <section className="card p-5">
          <p className="text-xs font-semibold text-accent">{env.storeName}</p>
          <h1 className="mt-1 text-3xl font-black">訂餐頁</h1>
          <div className="mt-5 grid grid-cols-2 gap-2 rounded-3xl bg-cream p-2">
            <button className={`rounded-2xl px-4 py-3 text-sm font-bold ${mode === 'customer_online' ? 'bg-white text-brand shadow' : 'text-muted'}`} onClick={() => setMode('customer_online')} type="button">客人線上訂餐</button>
            <button className={`rounded-2xl px-4 py-3 text-sm font-bold ${mode === 'counter' ? 'bg-white text-brand shadow' : 'text-muted'}`} onClick={() => setMode('counter')} type="button">店家櫃檯點餐</button>
          </div>
        </section>

        {mode === 'customer_online' && (
          <section className="card border-accent/30 bg-green-50/80 p-5">
            <div className="flex items-start gap-3">
              <MessageCircle className="mt-1 text-accent" />
              <div>
                <h2 className="font-black">請先加入 LINE 官方帳號</h2>
                <p className="mt-1 text-sm text-muted">為了接收訂單通知，請先加入店家的 LINE 官方帳號，再開始點餐。</p>
                <a className={`btn-primary mt-4 inline-block ${!env.lineOfficialAccountUrl ? 'pointer-events-none opacity-40' : ''}`} href={env.lineOfficialAccountUrl || '#'} target="_blank" rel="noreferrer">加入 LINE 官方帳號</a>
              </div>
            </div>
          </section>
        )}

        <section className="space-y-4">
          <div className="flex gap-2 overflow-auto pb-1">
            {categories.map((item) => (
              <button key={item} type="button" onClick={() => setCategory(item)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${category === item ? 'bg-brand text-white' : 'bg-white text-muted'}`}>{item}</button>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleProducts.map((product) => <ProductCard key={product.id} product={product} onSelect={setSelectedProduct} />)}
          </div>
        </section>
      </main>

      <div className="space-y-5">
        <section className="card p-4">
          <h2 className="mb-3 font-black">用餐方式</h2>
          <DiningTypeSelector value={diningType} onChange={setDiningType} />
          {(diningType === 'takeaway' || diningType === 'preorder') && (
            <label className="mt-4 block space-y-1">
              <span className="label">預計取餐時間 *</span>
              <input className="input" type="datetime-local" value={pickupTime} onChange={(event) => setPickupTime(event.target.value)} />
            </label>
          )}
        </section>
        <section className="card p-4">
          <h2 className="mb-3 font-black">顧客資料</h2>
          <CustomerForm customer={customer} onChange={setCustomer} note={note} onNoteChange={setNote} required={mode === 'customer_online'} />
        </section>
        {message && <p className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{message}</p>}
        <CartPanel items={cartItems} onRemove={removeFromCart} onSubmit={submitOrder} />
      </div>

      {selectedProduct && <ProductOptionModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onAdd={addToCart} />}
    </div>
  )
}
