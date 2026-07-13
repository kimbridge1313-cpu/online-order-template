import { useEffect, useMemo, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { adminInviteService } from '../services/adminInviteService'

function getInviteCode() {
  return new URLSearchParams(window.location.search).get('code') || ''
}

export default function AdminInviteAcceptPage({ onLogin }) {
  const code = useMemo(() => getInviteCode(), [])
  const [invite, setInvite] = useState(null)
  const [form, setForm] = useState({ username: '', password: '', displayName: '' })
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

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

  async function submit(event) {
    event.preventDefault()
    setMessage('')
    setSubmitting(true)
    try {
      const session = await adminInviteService.acceptInvite({ code, ...form })
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
            <form className="mt-5 space-y-3" onSubmit={submit}>
              <label className="block space-y-1"><span className="label">帳號</span><input className="input" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} autoComplete="username" required /></label>
              <label className="block space-y-1"><span className="label">顯示名稱</span><input className="input" value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} placeholder="例如：中山店店長" /></label>
              <label className="block space-y-1"><span className="label">密碼</span><input className="input" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} autoComplete="new-password" required /></label>
              {message && <p className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{message}</p>}
              <button className="btn-primary w-full" type="submit" disabled={submitting}>{submitting ? '建立中...' : '建立並進入管理系統'}</button>
            </form>
          </>
        ) : <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{message || '邀請連結無效。'}</p>}
      </section>
    </div>
  )
}
