import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { calculateUnitPrice, formatPrice } from '../utils/price'
import { flattenSelectedOptions, validateRequiredOptions } from '../utils/optionValidation'

export default function ProductOptionModal({ product, onClose, onAdd }) {
  const initialSelections = useMemo(() => {
    const state = {}
    for (const group of product.optionGroups || []) state[group.id] = group.type === 'multiple' ? [] : ''
    return state
  }, [product])
  const [selections, setSelections] = useState(initialSelections)
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const selectedOptions = flattenSelectedOptions(product, selections)
  const unitPrice = calculateUnitPrice(product, selectedOptions)
  const subtotal = unitPrice * quantity
  const description = String(product.description || '').trim()

  function selectSingle(groupId, optionId) {
    setSelections({ ...selections, [groupId]: optionId })
  }

  function toggleMultiple(groupId, optionId) {
    const current = selections[groupId] || []
    const next = current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId]
    setSelections({ ...selections, [groupId]: next })
  }

  function submit() {
    const missing = validateRequiredOptions(product, selections)
    if (missing.length) {
      setError(`請選擇：${missing.join('、')}`)
      return
    }
    onAdd({
      productId: product.id,
      name: product.name,
      basePrice: product.price,
      imageUrl: product.imageUrl || '',
      quantity,
      selectedOptions,
      unitPrice,
      subtotal,
      note
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-0 md:items-center md:p-6">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-auto rounded-t-3xl bg-cream p-5 shadow-soft md:rounded-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-accent">{product.category}</p>
            <h2 className="text-2xl font-bold text-ink">{product.name}</h2>
            <p className="mt-1 text-sm text-muted">基本價格 {formatPrice(product.price)}</p>
          </div>
          <button className="rounded-2xl bg-white p-3" onClick={onClose} type="button"><X size={20} /></button>
        </div>

        {product.imageUrl && (
          <div className="mt-4 overflow-hidden rounded-3xl border border-line bg-white">
            <img className="max-h-72 w-full object-cover" src={product.imageUrl} alt={product.name} loading="lazy" />
          </div>
        )}

        {description && (
          <section className="mt-4 rounded-3xl border border-line bg-white p-4">
            <h3 className="text-sm font-black text-ink">商品描述</h3>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted">{description}</p>
          </section>
        )}

        <div className="mt-5 space-y-5">
          {(product.optionGroups || []).map((group) => (
            <section key={group.id} className="card p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">{group.name}</h3>
                <span className="text-xs text-muted">{group.required ? '必選' : '選填'}｜{group.type === 'single' ? '單選' : '多選'}</span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {group.options.map((option) => {
                  const checked = group.type === 'single' ? selections[group.id] === option.id : (selections[group.id] || []).includes(option.id)
                  return (
                    <label key={option.id} className={`flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 text-sm ${checked ? 'border-brand bg-cream' : 'border-line bg-white'}`}>
                      <span className="flex items-center gap-2">
                        <input
                          type={group.type === 'single' ? 'radio' : 'checkbox'}
                          checked={checked}
                          onChange={() => group.type === 'single' ? selectSingle(group.id, option.id) : toggleMultiple(group.id, option.id)}
                        />
                        {option.name}
                      </span>
                      {Number(option.priceDelta) > 0 && <span className="font-semibold text-brand">+{formatPrice(option.priceDelta)}</span>}
                    </label>
                  )
                })}
              </div>
            </section>
          ))}

          <label className="block space-y-1">
            <span className="label">商品備註</span>
            <textarea className="input min-h-20" value={note} onChange={(event) => setNote(event.target.value)} placeholder="例如：不要蔥、餐點分開裝" />
          </label>

          <div className="flex items-center justify-between rounded-3xl bg-white p-4">
            <span className="font-bold">數量</span>
            <div className="flex items-center gap-3">
              <button className="btn-secondary px-4 py-2" onClick={() => setQuantity(Math.max(1, quantity - 1))} type="button">-</button>
              <span className="w-8 text-center text-lg font-bold">{quantity}</span>
              <button className="btn-secondary px-4 py-2" onClick={() => setQuantity(quantity + 1)} type="button">+</button>
            </div>
          </div>
          {error && <p className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
          <button className="btn-primary w-full text-base" onClick={submit} type="button">加入購物車｜{formatPrice(subtotal)}</button>
        </div>
      </div>
    </div>
  )
}
