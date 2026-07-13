import { useState } from 'react'
import { X } from 'lucide-react'
import DiningTypeSelector from './DiningTypeSelector'
import CustomerForm from './CustomerForm'

export default function OrderEditModal({ order, onClose, onSave }) {
  const [draft, setDraft] = useState(order)

  function submit() {
    onSave(draft.id, draft)
  }

  function updateDiningType(value) {
    setDraft({
      ...draft,
      diningType: value,
      deliveryAddress: value === 'delivery' ? draft.deliveryAddress || '' : ''
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-0 md:items-center md:p-6">
      <div className="w-full max-w-2xl rounded-t-3xl bg-cream p-5 shadow-soft md:rounded-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-accent">修改訂單</p>
            <h2 className="text-2xl font-bold">{order.orderNumber}</h2>
          </div>
          <button className="rounded-2xl bg-white p-3" onClick={onClose} type="button"><X size={20} /></button>
        </div>
        <div className="mt-5 space-y-4">
          <DiningTypeSelector value={draft.diningType} onChange={updateDiningType} />
          {(draft.diningType === 'takeaway' || draft.diningType === 'delivery' || draft.diningType === 'preorder') && (
            <label className="block space-y-1">
              <span className="label">預計時間</span>
              <input className="input" type="datetime-local" value={draft.pickupTime || ''} onChange={(event) => setDraft({ ...draft, pickupTime: event.target.value })} />
            </label>
          )}
          {draft.diningType === 'delivery' && (
            <label className="block space-y-1">
              <span className="label">外送地址</span>
              <textarea className="input min-h-20" value={draft.deliveryAddress || ''} onChange={(event) => setDraft({ ...draft, deliveryAddress: event.target.value })} placeholder="請填寫外送地址、樓層或備註" />
            </label>
          )}
          <CustomerForm customer={draft.customer || {}} onChange={(customer) => setDraft({ ...draft, customer })} note={draft.note} onNoteChange={(note) => setDraft({ ...draft, note })} />
          <p className="rounded-2xl bg-white p-3 text-sm text-muted">第一版修改訂單先支援顧客資料、用餐方式、時間、外送地址與備註。商品明細重新編輯可在下一版補上。</p>
          <button className="btn-primary w-full" onClick={submit} type="button">儲存修改</button>
        </div>
      </div>
    </div>
  )
}
