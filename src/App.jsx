import { Component, useEffect, useMemo, useState } from 'react'
import { Calculator, ClipboardList, LogOut, Menu, Package, QrCode, Settings, ShoppingBag, UserRound } from 'lucide-react'
import OrderPage from './pages/OrderPage'
import OrderManagementPage from './pages/OrderManagementPage'
import ProductManagementPage from './pages/ProductManagementPage'
import StoreSettingsPage from './pages/StoreSettingsPage'
import DailyClosingPage from './pages/DailyClosingPage'
import AdminInviteAcceptPage from './pages/AdminInviteAcceptPage'
import { env } from './config/env'
import { storeConfigService } from './services/storeConfigService'
import { authService, ROLE_STORAGE_KEY } from './services/authService'
import { readStorage, writeStorage } from './utils/storage'

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
            <pre className="mt-4 overflow-auto rounded-2xl bg-red-50 p-4 text-xs text-red-800">{this.state.error?.message || String(this.state.error)}</pre>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function normalizedPathname() {
  return window.location.pathname.replace(/\/+$/, '') || '/'
}

function isAdminRoute() {
  const pathname = normalizedPathname()
  return pathname === '/admin' || pathname.startsWith('/admin/')
}

function isInviteRoute() {
  return normalizedPathname() === '/admin/invite'
}

function BrandMark({ brandName, logoUrl = '', size = 'lg' }) {
  const currentLogoUrl = logoUrl || env.storeLogoUrl
  const sizeClass = size === 'sm' ? 'h-10 w-10 rounded-2xl' : 'h-24 w-24 rounded-[2rem]'
  const textClass = size === 'sm' ? 'text-base' : 'text-3xl'
  const fallbackText = String(brandName || env.storeName || '店').trim().slice(0, 1)

  return (
    <div className={`${sizeClass} flex items-center justify-center overflow-hidden bg-white shadow-soft ring-1 ring-line`}>
      {currentLogoUrl ? (
        <img className="h-full w-full object-cover" src={currentLogoUrl} alt={`${brandName || env.storeName} logo`} />
      ) : (
        <span className={`${textClass} font-black text-brand`}>{fallbackText}</span>
      )}
    </div>
  )
}

function LoadingScreen({ brandName, logoUrl, message = '正在載入...' }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-6 text-ink">
      <div className="flex flex-col items-center text-center">
        <BrandMark brandName={brandName} logoUrl={logoUrl} />
        <p className="mt-6 text-sm font-semibold text-accent">{brandName || env.storeName}</p>
        <h1 className="mt-1 text-2xl font-black">{env.appName}</h1>
        <p className="mt-3 text-sm font-semibold text-muted">{message}</p>
        <div className="mt-6 flex gap-1.5" aria-hidden="true">
          <span className="h-2 w-2 animate-pulse rounded-full bg-brand" />
          <span className="h-2 w-2 animate-pulse rounded-full bg-brand [animation-delay:150ms]" />
          <span className="h-2 w-2 animate-pulse rounded-full bg-brand [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  )
}

function AdminLoginPage({ onLogin }) {
  const [form, setForm] = useState({ username: '', password: '' })
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [lineSubmitting, setLineSubmitting] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setMessage('')
    setSubmitting(true)
    try {
      const session = await authService.login(form)
      onLogin(session)
    } catch (error) {
      setMessage(error.message || '登入失敗。')
    } finally {
      setSubmitting(false)
    }
  }

  async function loginWithLine() {
    setMessage('')
    setLineSubmitting(true)
    try {
      const session = await authService.loginWithLineProfile({ requireLogin: true })
      if (session) {
        onLogin(session)
        return
      }
      setMessage('尚未找到已綁定此 LINE 的管理帳號。請先用帳號密碼登入，或請老闆重新發送邀請。')
    } catch (error) {
      setMessage(error.message || 'LINE 登入失敗。')
    } finally {
      setLineSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <section className="card p-7">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cream text-brand"><UserRound size={24} /></div>
        <p className="mt-5 text-xs font-semibold text-accent">Management</p>
        <h1 className="mt-1 text-3xl font-black">管理入口</h1>
        <p className="mt-3 text-sm leading-6 text-muted">門店可使用帳號密碼登入；已綁定 LINE 的管理員，也可以使用 LINE 授權或桌機掃碼登入。</p>
        {env.isLiffEnabled && <button className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-line bg-white px-4 py-3 text-sm font-black text-ink" type="button" onClick={loginWithLine} disabled={lineSubmitting}><QrCode size={18} /> {lineSubmitting ? '正在開啟 LINE...' : '使用 LINE / 掃碼登入'}</button>}
        <div className="my-5 flex items-center gap-3 text-xs font-bold text-muted"><span className="h-px flex-1 bg-line" /><span>或使用帳號密碼</span><span className="h-px flex-1 bg-line" /></div>
        <form onSubmit={submit}>
          <div className="space-y-3">
            <label className="block space-y-1"><span className="label">帳號</span><input className="input" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} autoComplete="username" required /></label>
            <label className="block space-y-1"><span className="label">密碼</span><input className="input" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} autoComplete="current-password" required /></label>
          </div>
          {message && <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{message}</p>}
          <button className="btn-primary mt-5 w-full" type="submit" disabled={submitting}>{submitting ? '登入中...' : '帳號密碼登入'}</button>
        </form>
      </section>
    </div>
  )
}

function AppShell() {
  const showTemplateRoleSwitch = env.useMockData
  const inviteRoute = isInviteRoute()
  const adminRoute = isAdminRoute()
  const [page, setPage] = useState('order')
  const [open, setOpen] = useState(false)
  const [role, setRole] = useState(() => showTemplateRoleSwitch ? readStorage(ROLE_STORAGE_KEY, 'customer') : authService.getSession()?.role || 'customer')
  const [adminSession, setAdminSession] = useState(() => authService.getSession())
  const [storeSettings, setStoreSettings] = useState({ brandName: env.storeName, logoUrl: env.storeLogoUrl })
  const [lineChecking, setLineChecking] = useState(false)
  const [loadingGateOpen, setLoadingGateOpen] = useState(false)
  const isLoggedAdmin = authService.isAdminSession(adminSession)
  const isAdmin = showTemplateRoleSwitch ? role === 'store' || role === 'owner' : isLoggedAdmin && (role === 'store' || role === 'owner')
  const shouldShowInviteAccept = inviteRoute && !showTemplateRoleSwitch
  const shouldShowAdminLogin = adminRoute && !inviteRoute && !isAdmin && !showTemplateRoleSwitch
  const brandName = storeSettings?.brandName || env.storeName
  const logoUrl = storeSettings?.logoUrl || env.storeLogoUrl

  useEffect(() => {
    const timer = window.setTimeout(() => setLoadingGateOpen(true), 3000)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!showTemplateRoleSwitch && isLoggedAdmin && role !== adminSession.role) {
      setRole(adminSession.role)
      writeStorage(ROLE_STORAGE_KEY, adminSession.role)
      setPage('order')
    }
    if (!showTemplateRoleSwitch && !isLoggedAdmin && role !== 'customer') {
      setRole('customer')
      writeStorage(ROLE_STORAGE_KEY, 'customer')
      setPage('order')
    }
  }, [showTemplateRoleSwitch, isLoggedAdmin, role, adminSession])

  useEffect(() => {
    if (showTemplateRoleSwitch || isLoggedAdmin || !env.isLiffEnabled || inviteRoute) return
    let mounted = true
    async function loginByLine() {
      setLineChecking(true)
      try {
        const session = await authService.loginWithLineProfile()
        if (!mounted || !session) return
        setAdminSession(session)
        setRole(session.role)
        writeStorage(ROLE_STORAGE_KEY, session.role)
        setPage('order')
      } catch (error) {
        console.warn('LINE auto admin login skipped:', error)
      } finally {
        if (mounted) setLineChecking(false)
      }
    }
    loginByLine()
    return () => { mounted = false }
  }, [showTemplateRoleSwitch, isLoggedAdmin, inviteRoute])

  useEffect(() => {
    let mounted = true
    async function refreshSettings() {
      const nextSettings = await storeConfigService.getSettings()
      if (mounted) setStoreSettings(nextSettings)
    }
    refreshSettings()
    window.addEventListener('store-settings-updated', refreshSettings)
    window.addEventListener('storage', refreshSettings)
    return () => {
      mounted = false
      window.removeEventListener('store-settings-updated', refreshSettings)
      window.removeEventListener('storage', refreshSettings)
    }
  }, [])

  useEffect(() => {
    function refreshAdminSession() {
      setAdminSession(authService.getSession())
    }
    window.addEventListener('admin-session-updated', refreshAdminSession)
    window.addEventListener('storage', refreshAdminSession)
    return () => {
      window.removeEventListener('admin-session-updated', refreshAdminSession)
      window.removeEventListener('storage', refreshAdminSession)
    }
  }, [])

  function switchRole(nextRole) {
    if (!showTemplateRoleSwitch) return
    writeStorage(ROLE_STORAGE_KEY, nextRole)
    setRole(nextRole)
    if (!(nextRole === 'store' || nextRole === 'owner') && (page === 'products' || page === 'settings' || page === 'closing')) setPage('order')
    if (nextRole === 'store' || nextRole === 'owner') setPage('order')
  }

  function refreshRole() {
    const nextRole = showTemplateRoleSwitch ? readStorage(ROLE_STORAGE_KEY, 'customer') : authService.getSession()?.role || 'customer'
    setRole(nextRole)
    if (!(nextRole === 'store' || nextRole === 'owner') && (page === 'products' || page === 'settings' || page === 'closing')) setPage('order')
  }

  function loginAdmin(session) {
    setAdminSession(session)
    setRole(session.role)
    writeStorage(ROLE_STORAGE_KEY, session.role)
    setPage('order')
    if (window.location.pathname.startsWith('/admin')) window.history.replaceState({}, '', '/')
  }

  function logoutAdmin() {
    authService.logout()
    setAdminSession(null)
    setRole('customer')
    setPage('order')
    setOpen(false)
  }

  const navItems = useMemo(() => {
    if (isAdmin) {
      return [
        { value: 'order', label: '訂餐頁', icon: ShoppingBag },
        { value: 'orders', label: '訂單管理', icon: ClipboardList },
        { value: 'closing', label: '每日結帳', icon: Calculator },
        { value: 'products', label: '商品管理', icon: Package },
        { value: 'settings', label: '設定', icon: Settings }
      ]
    }
    return [
      { value: 'order', label: '訂餐頁', icon: ShoppingBag },
      { value: 'orders', label: '我的訂單', icon: ClipboardList }
    ]
  }, [isAdmin])

  const CurrentPage = shouldShowInviteAccept
    ? AdminInviteAcceptPage
    : shouldShowAdminLogin
      ? AdminLoginPage
      : page === 'orders'
        ? OrderManagementPage
        : page === 'closing' && isAdmin
          ? DailyClosingPage
          : page === 'products' && isAdmin
            ? ProductManagementPage
            : page === 'settings' && isAdmin
              ? StoreSettingsPage
              : OrderPage

  if (!loadingGateOpen || lineChecking) {
    return <LoadingScreen brandName={brandName} logoUrl={logoUrl} message={lineChecking ? '正在確認 LINE 身份...' : '正在載入...'} />
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line bg-cream/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <BrandMark brandName={brandName} logoUrl={logoUrl} size="sm" />
            <div className="min-w-0"><p className="truncate text-xs font-semibold text-accent">{brandName}</p><h1 className="truncate text-lg font-black text-ink">{env.appName}</h1></div>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            {showTemplateRoleSwitch && <select className="rounded-2xl border border-line bg-white px-3 py-3 text-sm font-bold text-ink" value={role} onChange={(event) => switchRole(event.target.value)} aria-label="模板身份切換"><option value="customer">顧客</option><option value="store">門店</option><option value="owner">老闆</option></select>}
            {!shouldShowAdminLogin && !shouldShowInviteAccept && <nav className="flex gap-2">{navItems.map((item) => { const Icon = item.icon; return <button key={item.value} onClick={() => { refreshRole(); setPage(item.value) }} className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold ${page === item.value ? 'bg-brand text-white' : 'bg-white text-muted'}`} type="button"><Icon size={18} /> {item.label}</button> })}{!showTemplateRoleSwitch && isLoggedAdmin && <button className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-muted" type="button" onClick={logoutAdmin}><LogOut size={18} /> 登出</button>}</nav>}
          </div>
          <button className="rounded-2xl bg-white p-3 md:hidden" onClick={() => setOpen(!open)} type="button"><Menu size={20} /></button>
        </div>
        {open && <nav className="grid gap-2 border-t border-line px-4 py-3 md:hidden">{showTemplateRoleSwitch && <label className="space-y-1"><span className="text-xs font-bold text-muted">模板身份</span><select className="input" value={role} onChange={(event) => switchRole(event.target.value)}><option value="customer">顧客</option><option value="store">門店</option><option value="owner">老闆</option></select></label>}{!shouldShowAdminLogin && !shouldShowInviteAccept && navItems.map((item) => { const Icon = item.icon; return <button key={item.value} onClick={() => { refreshRole(); setPage(item.value); setOpen(false) }} className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold ${page === item.value ? 'bg-brand text-white' : 'bg-white text-muted'}`} type="button"><Icon size={18} /> {item.label}</button> })}{!showTemplateRoleSwitch && isLoggedAdmin && <button className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-muted" type="button" onClick={logoutAdmin}><LogOut size={18} /> 登出</button>}</nav>}
      </header>
      <CurrentPage key={`${role}-${page}-${isAdmin ? 'admin' : 'public'}-${shouldShowAdminLogin ? 'login' : shouldShowInviteAccept ? 'invite' : 'app'}`} role={role} onRoleChange={refreshRole} onLogin={loginAdmin} adminSession={adminSession} />
    </div>
  )
}

export default function App() {
  return <AppErrorBoundary><AppShell /></AppErrorBoundary>
}
