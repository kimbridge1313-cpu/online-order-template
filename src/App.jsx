import { useState } from 'react'
import { ClipboardList, Menu, Package, ShoppingBag } from 'lucide-react'
import OrderPage from './pages/OrderPage'
import OrderManagementPage from './pages/OrderManagementPage'
import ProductManagementPage from './pages/ProductManagementPage'
import { env } from './config/env'

const navItems = [
  { value: 'order', label: '訂餐頁', icon: ShoppingBag },
  { value: 'orders', label: '訂單管理', icon: ClipboardList },
  { value: 'products', label: '商品管理', icon: Package }
]

export default function App() {
  const [page, setPage] = useState('order')
  const [open, setOpen] = useState(false)
  const CurrentPage = page === 'orders' ? OrderManagementPage : page === 'products' ? ProductManagementPage : OrderPage

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line bg-cream/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-xs font-semibold text-accent">{env.storeName}</p>
            <h1 className="text-lg font-black text-ink">{env.appName}</h1>
          </div>
          <button className="rounded-2xl bg-white p-3 md:hidden" onClick={() => setOpen(!open)} type="button"><Menu size={20} /></button>
          <nav className="hidden gap-2 md:flex">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <button key={item.value} onClick={() => setPage(item.value)} className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold ${page === item.value ? 'bg-brand text-white' : 'bg-white text-muted'}`} type="button">
                  <Icon size={18} /> {item.label}
                </button>
              )
            })}
          </nav>
        </div>
        {open && (
          <nav className="grid gap-2 border-t border-line px-4 py-3 md:hidden">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <button key={item.value} onClick={() => { setPage(item.value); setOpen(false) }} className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold ${page === item.value ? 'bg-brand text-white' : 'bg-white text-muted'}`} type="button">
                  <Icon size={18} /> {item.label}
                </button>
              )
            })}
          </nav>
        )}
      </header>
      <CurrentPage />
    </div>
  )
}
