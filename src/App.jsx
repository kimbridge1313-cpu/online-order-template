import { Component, useEffect, useMemo, useState } from 'react'
import { ClipboardList, Menu, Package, Settings, ShoppingBag } from 'lucide-react'
import OrderPage from './pages/OrderPage'
import OrderManagementPage from './pages/OrderManagementPage'
import ProductManagementPage from './pages/ProductManagementPage'
import StoreSettingsPage from './pages/StoreSettingsPage'
import { env } from './config/env'
import { readStorage } from './utils/storage'

const ROLE_STORAGE_KEY = 'online-order-template-role'
const STORE_SETTINGS_KEY = 'online-order-template-store-settings'

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('App render error:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-cream px-4 py-10 text-ink">
          <div className="mx-auto max-w-2xl rounded-3xl border border-red-200 bg-white p-6 shadow-soft">
            <p className="text-xs font-bold text-red-600">系統啟動失敗</p>
            <h1 className="mt-2 text-2xl font-black">頁面載入時發生錯誤</h1>
            <p className="mt-3 text-sm text-muted">這通常是前端執行階段錯誤。請打開瀏覽器 Console 查看詳細訊息。</p>
            <pre className="mt-4 overflow-auto rounded-2xl bg-red-50 p-4 text-xs text-red-800">
              {this.state.error?.message || String(this.state.error)}
            </pre>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

function AppShell() {
  const [page, setPage] = useState('order')
  const [open, setOpen] = useState(false)
  const [role, setRole] = useState(() => readStorage(ROLE_STORAGE_KEY, 'customer'))
  const [storeSettings, setStoreSettings] = useState(() => readStorage(STORE_SETTINGS_KEY, { brandName: env.storeName }))
  const isAdmin = role === 'store' || role === 'owner'
  const brandName = storeSettings?.brandName || env.storeName

  useEffect(() => {
    function refreshSettings() {
      setStoreSettings(readStorage(STORE_SETTINGS_KEY, { brandName: env.storeName }))
    }
    window.addEventListener('store-settings-updated', refreshSettings)
    window.addEventListener('storage', refreshSettings)
    return () => {
      window.removeEventListener('store-settings-updated', refreshSettings)
      window.removeEventListener('storage', refreshSettings)
    }
  }, [])

  function refreshRole() {
    const nextRole = readStorage(ROLE_STORAGE_KEY, 'customer')
    setRole(nextRole)
    if (!(nextRole === 'store' || nextRole === 'owner') && (page === 'products' || page === 'settings')) setPage('order')
  }

  const navItems = useMemo(() => {
    if (isAdmin) {
      return [
        { value: 'order', label: '訂餐頁', icon: ShoppingBag },
        { value: 'orders', label: '訂單管理', icon: ClipboardList },
        { value: 'products', label: '商品管理', icon: Package },
        { value: 'settings', label: '設定', icon: Settings }
      ]
    }
    return [
      { value: 'order', label: '訂餐頁', icon: ShoppingBag },
      { value: 'orders', label: '我的訂單', icon: ClipboardList }
    ]
  }, [isAdmin])

  const CurrentPage = page === 'orders'
    ? OrderManagementPage
    : page === 'products' && isAdmin
      ? ProductManagementPage
      : page === 'settings' && isAdmin
        ? StoreSettingsPage
        : OrderPage

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line bg-cream/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-xs font-semibold text-accent">{brandName}</p>
            <h1 className="text-lg font-black text-ink">{env.appName}</h1>
          </div>
          <button className="rounded-2xl bg-white p-3 md:hidden" onClick={() => setOpen(!open)} type="button"><Menu size={20} /></button>
          <nav className="hidden gap-2 md:flex">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <button key={item.value} onClick={() => { refreshRole(); setPage(item.value) }} className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold ${page === item.value ? 'bg-brand text-white' : 'bg-white text-muted'}`} type="button">
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
                <button key={item.value} onClick={() => { refreshRole(); setPage(item.value); setOpen(false) }} className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold ${page === item.value ? 'bg-brand text-white' : 'bg-white text-muted'}`} type="button">
                  <Icon size={18} /> {item.label}
                </button>
              )
            })}
          </nav>
        )}
      </header>
      <CurrentPage role={role} onRoleChange={refreshRole} />
    </div>
  )
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AppShell />
    </AppErrorBoundary>
  )
}
