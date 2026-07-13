import { useEffect, useState } from 'react'
import { Link, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { adminInviteService } from '../services/adminInviteService'
import { storeConfigService } from '../services/storeConfigService'

export default function AdminInvitePage({ adminSession }) {
  const [stores, setStores] = useState([])
  const [invites, setInvites] = useState([])
  const [draft, setDraft] = useState({ role: 'store', storeId: '', note: '' })
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  async function loadData() {
    setLoading(true)
    try {
      const [nextStores, nextInvites] = await Promise.all([
        storeConfigService.listStores(),
        adminInviteService.listInvites()
      ])
      setStores(nextStores.filter((store) => store.isActive !== false))
      setInvites(nextInvites)
      setDraft((current) => ({ ...current, storeId: current.storeId || nextStores[0]?.id || '' }))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  async function createInvite(event) {
    event.preventDefault()
    setMessage('')
    setSubmitting(true)
    try {
      const selectedStore = stores.find((store) => store.id === draft.storeId)
      const invite = await adminInviteService.createInvite({
        role: draft.role,
        storeId: draft.role === 'owner' ? '' : selectedStore?.id || '',
        storeName: draft.role === 'owner' ? '' : selectedStore?.name || '',
        note: draft.note,
        createdBy: adminSession?.username || adminSession?.id || ''
      })
      setInvites([invite, ...invites])
      setDraft({ role: 'store', storeId: selectedStore?.id || stores[0]?.id || '', note: '' })
      setMessage('邀請連結已建立，可複製傳給對方。')
    } catch (error) {
      setMessage(error.message || '建立邀請失敗。')
    } finally {
      setSubmitting(false)
    }
  }

  async function copyLink(link) {
    await navigator.clipboard.writeText(link)
    setMessage('邀請連結已複製。')
  }

  async function revokeInvite(code) {
    if (!window.confirm('確定停用這個邀請連結？')) return
    setInvites(await adminInviteService.revokeInvite(code))
  }

  if (adminSession?.role !== 'owner') {
    return <div className="mx-auto max-w-5xl px-4 py-6"><section className="card p-6 text-sm text-muted">只有老闆帳號可以建立管理員邀請。</section></div>
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <section className="card p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cream text-brand"><ShieldCheck size={22} /></div>
          <div><p className="text-xs font-semibold text-accent">Admin Invite</p><h1 className="text-3xl font-black">管理員邀請</h1></div>
        </div>
        <p className="mt-4 text-sm leading-6 text-muted">建立一次性邀請連結，傳給門店或管理員。對方開啟後可設定帳號密碼；若在 LINE/LIFF 內開啟，會同步綁定 LINE ID。</p>
      </section>

      <section className="card mt-5 p-5">
        <h2 className="text-xl font-black">建立邀請連結</h2>
        <form className="mt-5 grid gap-3 md:grid-cols-2" onSubmit={createInvite}>
          <label className="space-y-1">
            <span className="label">邀請角色</span>
            <select className="input" value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value })}>
              <option value="store">門店</option>
              <option value="owner">老闆</option>
            </select>
          </label>
          {draft.role === 'store' && (
            <label className="space-y-1">
              <span className="label">綁定門店</span>
              <select className="input" value={draft.storeId} onChange={(event) => setDraft({ ...draft, storeId: event.target.value })} required>
                {stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
              </select>
            </label>
          )}
          <label className="space-y-1 md:col-span-2">
            <span className="label">備註</span>
            <input className="input" value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} placeholder="例如：邀請中山店店長" />
          </label>
          <button className="btn-primary md:col-span-2" type="submit" disabled={submitting}><Plus size={18} className="inline-block" /> {submitting ? '建立中...' : '建立邀請連結'}</button>
        </form>
        {message && <p className="mt-4 rounded-2xl bg-cream p-3 text-sm font-semibold text-muted">{message}</p>}
      </section>

      <section className="card mt-5 p-5">
        <h2 className="text-xl font-black">邀請紀錄</h2>
        {loading ? <p className="mt-4 text-sm text-muted">正在讀取邀請紀錄...</p> : (
          <div className="mt-4 grid gap-3">
            {invites.map((invite) => (
              <div key={invite.code} className="rounded-3xl border border-line bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-black">{invite.role === 'owner' ? '老闆' : `門店：${invite.storeName || invite.storeId || '未指定'}`}</p>
                    <p className="mt-1 text-xs text-muted">{invite.note || '無備註'}｜{invite.isUsed ? `已使用：${invite.usedBy}` : invite.isRevoked ? '已停用' : '可使用'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-secondary py-2" type="button" onClick={() => copyLink(invite.link)}><Link size={16} className="inline-block" /> 複製</button>
                    {!invite.isUsed && !invite.isRevoked && <button className="rounded-2xl border border-red-200 bg-white px-3 py-2 text-sm font-bold text-red-600" type="button" onClick={() => revokeInvite(invite.code)}><Trash2 size={16} className="inline-block" /> 停用</button>}
                  </div>
                </div>
                <p className="mt-3 break-all rounded-2xl bg-cream p-3 text-xs text-muted">{invite.link}</p>
              </div>
            ))}
            {invites.length === 0 && <p className="rounded-2xl bg-cream p-4 text-sm text-muted">尚未建立邀請。</p>}
          </div>
        )}
      </section>
    </div>
  )
}
