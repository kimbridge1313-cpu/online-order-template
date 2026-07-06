import { Trash2 } from 'lucide-react'
import { calculateCartTotal, formatPrice } from '../utils/price'

export default function CartPanel({ items, onRemove, onSubmit, disabled, submitLabel = '送出訂單', title = '購物車', compact = false }) {
  const total = calculateCartTotal(items)
  return (
    <aside className={`card safe-bottom ${compact ? 'p-3' : 'p-4 sticky bottom-4 lg:top-6 lg:bottom-auto'}`}>
      <div className="flex items-center justify-between">
        <h2 className={compact ? 'text-base font-bold' : 'text-lg font-bold'}>{title}</h2>
        <span className="text-sm text-muted">{items.length} 項</span>
      </div>
      <div className={`${compact ? 'mt-2 max-h-52 space-y-2' : 'mt-4 max-h-72 space-y-3'} overflow-auto`}>
        {items.length === 0 && <p className={`rounded-2xl bg-cream text-sm text-muted ${compact ? 'p-3' : 'p-4'}`}>尚未加入商品。</p>}
        {items.map((item, index) => (
          <div key={`${item.productId}-${index}`} className={`rounded-2xl border border-line bg-white ${compact ? 'p-2.5' : 'p-3'}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={compact ? 'text-sm font-bold' : 'font-bold'}>{item.name} × {item.quantity}</p>
                <p className="text-sm text-brand">{formatPrice(item.subtotal)}</p>
              </div>
              {onRemove && <button className="rounded-xl p-2 text-red-600 hover:bg-red-50" type="button" onClick={() => onRemove(index)}><Trash2 size={compact ? 16 : 18} /></button>}
            </div>
            {item.selectedOptions?.length > 0 && (
              <ul className="mt-2 space-y-0.5 text-xs text-muted">
                {item.selectedOptions.map((option) => (
                  <li key={`${option.groupId}-${option.optionId}`}>- {option.groupName}：{option.optionName}{option.priceDelta > 0 ? ` +${formatPrice(option.priceDelta)}` : ''}</li>
                ))}
              </ul>
            )}
            {item.note && <p className="mt-2 rounded-xl bg-cream px-3 py-2 text-xs text-muted">備註：{item.note}</p>}
          </div>
        ))}
      </div>
      <div className={`${compact ? 'mt-3 pt-3' : 'mt-4 pt-4'} flex items-center justify-between border-t border-line`}>
        <span className="font-bold">總金額</span>
        <span className={compact ? 'text-xl font-black text-brand' : 'text-2xl font-black text-brand'}>{formatPrice(total)}</span>
      </div>
      <button className={`btn-primary w-full ${compact ? 'mt-3 py-3' : 'mt-4'}`} type="button" disabled={disabled || items.length === 0} onClick={onSubmit}>{submitLabel}</button>
    </aside>
  )
}
