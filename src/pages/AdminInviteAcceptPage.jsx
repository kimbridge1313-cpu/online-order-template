import { useEffect, useMemo, useState } from 'react'
import { MessageCircle, ShieldCheck } from 'lucide-react'
import { adminInviteService } from '../services/adminInviteService'
import { liffService } from '../services/liffService'
import { env } from '../config/env'

function getInviteCode() {
  return new URLSearchParams(window.location.search).get('code') || ''
}

export default function AdminInviteAcceptPage({ onLogin }) {
  const code = useMemo(() => getInviteCode(), [])
  const [invite, setInvite] = useState(null)
  const [form, setForm] = useState({ username: '', password: '', displayName: '' })
  const [lineProfile, setLineProfile] = useState(() => liffService.getCachedProfile())
  const [message, setMessage] = useState('')
  const [lineMessage, setLineMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [lineSubmitting, setLineSubmitting] = useState(false)

  useEffect(() => {
    let mounted = true
    async function loadInvite() {
      try {
        const nextInvite = await adminInviteService.getInvite(code)
        if (mounted) setInvite(nextInvite)
      } catch (error) {
        if (mounted) setMessage(error.message || '邀請連結無效。')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    loadInvite()
    return () => { mounted = false }
  }, [code])

  useEffect(() => {
    if (!lineProfile?.displayName || form.displayName) return
    setForm((current) => ({ ...current, displayName: current.displayName || lineProfile.displayName }))
  }, [lineProfile?.displayName])

  async function bindLineProfile() {
    setLineMessage('')
    setMessage('')
    setLineSubmitting(true)
    try {
      if (!env.isLiffEnabled) {
        setLineMessage('尚未設定 LIFF ID，無法使用 LINE 綁定。')
        return
      }
      const profile = await liffService.getProfile({ requireLogin: true })
      if (!profile?.userId) {
        setLineMessage('正在開啟 LINE 授權，完成後會回到此頁。')
        return
      }
      setLineProfile(profile)
      setForm((current) => ({ ...current, displayName: current.displayName || profile.displayName || '' }))
      setLineMessage(`已綁定 LINE：${profile.displayName || '管理員'}`)
    } catch (error) {
      setLineMessage(error.message || 'LINE 綁定失敗，請重新開啟此頁。')
    } finally {
      setLineSubmitting(false)
    }
  }

  async function submit(event) {
    event.preventDefault()
    setMessage('')
    setSubmitting(true)
    try {
      const session = await adminInviteService.acceptInvite({ code, ...form, lineProfile })
      onLogin(session)
      window.history.replaceState({}, '', '/')
    } catch (error) {
      setMessage(error.message || '建立帳號失敗。')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <section className="card p-7">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cream text-brand"><ShieldCheck size={24} /></div>
        <p className="mt-5 text-xs font-semibold text-accent">Admin Invite</p>
        <h1 className="mt-1 text-3xl font-black">建立管理帳號</h1>
        {loading ? <p className="mt-4 text-sm text-muted">正在確認邀請連結...</p> : invite ? (
          <>
            <p className="mt-3 text-sm leading-6 text-muted">你受邀成為{invite.role === 'owner' ? '老闆管理員' : `門店管理員${invite.storeName ? `｜${invite.storeName}` : ''}`}。請設定帳號密碼。</p>
            <section className="mt-5 rounded-3xl border border-line bg-white p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-green-50 text-accent"><MessageCircle size={20} /></div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-black">LINE 登入綁定</h2>
                  <p className="mt-1 text-sm leading-6 text-muted">可在建立管理帳號前先取得 LINE ID。綁定後，之後可在管理入口使用 LINE / 掃碼登入；不綁定也可以只用帳號密碼建立。</p>
                  {lineProfile?.userId ? (
                    <div className="mt-3 rounded-2xl bg-green-50 p-3 text-sm font-semibold text-green-700">
                      已取得 LINE：{lineProfile.displayName || '管理員'}
                    </div>
                  ) : (
                    <button className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-line bg-white px-4 py-3 text-sm font-black text-ink" type="button" onClick={bindLineProfile} disabled={lineSubmitting || !env.isLiffEnabled}>
                      <MessageCircle size={18} /> {lineSubmitting ? '正在開啟 LINE...' : '使用 LINE 綁定身份'}
                    </button>
                  )}
                  {lineProfile?.userId && <button className="mt-2 text-xs font-bold text-muted underline" type="button" onClick={bindLineProfile} disabled={lineSubmitting}>重新綁定 LINE</button>}
                  {lineMessage && <p className={`mt-3 rounded-2xl p-3 text-sm font-semibold ${lineMessage.includes('已綁定') ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-800'}`}>{lineMessage}</p>}
                  {!env.isLiffEnabled && <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">目前尚未設定 LIFF ID，所以此頁不會顯示可用的 LINE 綁定流程。</p>}
                </div>
              </div>
            </section>
            <form className="mt-5 space-y-3" onSubmit={submit}>
              <label className="block space-y-1"><span className="label">帳號</span><input className="input" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} autoComplete="username" required /></label>
              <label className="block space-y-1"><span className="label">顯示名稱</span><input className="input" value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} placeholder="例如：中山店店長" /></label>
              <label className="block space-y-1"><span className="label">密碼</span><input className="input" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} autoComplete="new-password" required /></label>
              {message && <p className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{message}</p>}
              <button className="btn-primary w-full" type="submit" disabled={submitting}>{submitting ? '建立中...' : lineProfile?.userId ? '建立管理帳號並綁定 LINE' : '建立管理帳號'}</button>
            </form>
          </>
        ) : <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{message || '邀請連結無效。'}</p>}
      </section>
    </div>
  )
}
