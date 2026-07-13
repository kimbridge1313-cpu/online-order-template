import { useMemo, useState } from 'react'
import { Trash2, X } from 'lucide-react'
import DiningTypeSelector from './DiningTypeSelector'
import CustomerForm from './CustomerForm'
import { calculateCartTotal, formatPrice } from '../utils/price'

function recalcItems(items = []) {
  return items.map((item) => {
    const quantity = Math.max(1, Number(item.quantity || 1))
    const unitPrice = Number(item.unitPrice ?? item.basePrice ?? 0)
    return {
      ...item,
      quantity,
      unitPrice,
      subtotal: unitPrice * quantity
    }
  })
}

export default function OrderEditModal({ order, onClose, onSave }) {
  const [draft, setDraft] = useState(() => ({ ...order, items: recalcItems(order.items || []) }))
  const totalAmount = useMemo(() => calculateCartTotal(draft.items || []), [draft.items])

  function submit() {
    onSave(draft.id, {
      ...draft,
      items: recalcItems(draft.items || []),
      totalAmount
    })
  }

  function updateDiningType(value) {
    setDraft({
      ...draft,
      diningType: value,
      deliveryAddress: value === 'delivery' ? draft.deliveryAddress || '' : ''
    })
  }

  function updateItem(index, patch) {
    const nextItems = recalcItems((draft.items || []).map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item))
    setDraft({ ...draft, items: nextItems })
  }

  function removeItem(index) {
    const nextItems = recalcItems((draft.items || []).filter((_, itemIndex) => itemIndex !== index))
    setDraft({ ...draft, items: nextItems })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-0 md:items-center md:p-6">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-t-3xl bg-cream p-5 shadow-soft md:rounded-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-accent">修改訂單</p>
            <h2 className="text-2xl font-bold">{order.orderNumber}</h2>
          </div>
          <button className="rounded-2xl bg-white p-3" onClick={onClose} type="button"><X size={20} /></button>
        </div>

        <div className="mt-5 space-y-4">
          <section className="rounded-3xl bg-white p-4">
            <h3 className="font-black">商品明細</h3>
            <div className="mt-3 space-y-3">
              {(draft.items || []).map((item, index) => (
                <div key={`${item.productId || item.name}-${index}`} className="rounded-2xl border border-line bg-cream p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-ink">{item.name}</p>
                      {item.selectedOptions?.length > 0 && <p className="mt-1 text-xs text-muted">{item.selectedOptions.map((option) => `${option.groupName}：${option.optionName}`).join('、')}</p>}
                    </div>
                    <button className="rounded-xl p-2 text-red-600 hover:bg-red-50" type="button" onClick={() => removeItem(index)} aria-label="刪除商品"><Trash2 size={18} /></button>
                  </div>

                  <div className="mt-3 grid gap-2 md:grid-cols-[120px_1fr_110px] md:items-end">
                    <label className="space-y-1">
                      <span className="label">數量</span>
                      <input className="input" type="number" min="1" value={item.quantity || 1} onChange={(event) => updateItem(index, { quantity: Number(event.target.value || 1) })} />
                    </label>
                    <label className="space-y-1">
                      <span className="label">商品備註</span>
                      <input className="input" value={item.note || ''} onChange={(event) => updateItem(index, { note: event.target.value })} placeholder="商品備註" />
                    </label>
                    <p className="rounded-2xl bg-white px-3 py-3 text-right font-black text-brand">{formatPrice(item.subtotal)}</p>
                  </div>
                </div>
              ))}
              {(draft.items || []).length === 0 && <p className="rounded-2xl bg-cream p-4 text-sm text-muted">此訂單沒有商品明細。</p>}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
              <span className="font-bold">訂單總金額</span>
              <span className="text-2xl font-black text-brand">{formatPrice(totalAmount)}</span>
            </div>
          </section>

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
          <button className="btn-primary w-full" onClick={submit} type="button">儲存修改｜{formatPrice(totalAmount)}</button>
        </div>
      </div>
    </div>
  )
}
