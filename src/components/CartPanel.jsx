import { useState } from 'react'
import { ChevronDown, ChevronUp, Minus, Plus, Trash2 } from 'lucide-react'
import { calculateCartTotal, formatPrice } from '../utils/price'

export default function CartPanel({ items, onRemove, onSubmit, onQuantityChange, disabled, submitLabel = '送出訂單', title = '購物車', compact = false, defaultCollapsed = false }) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed || compact)
  const total = calculateCartTotal(items)
  const itemCount = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
  const isCollapsed = compact && collapsed

  return (
    <aside className={`card safe-bottom ${compact ? 'p-3' : 'p-4 sticky bottom-4 lg:top-6 lg:bottom-auto'}`}>
      <button className="flex w-full items-center justify-between gap-3 text-left" type="button" onClick={() => compact && setCollapsed(!collapsed)}>
        <div>
          <h2 className={compact ? 'text-base font-bold' : 'text-lg font-bold'}>{title}</h2>
          <p className="mt-0.5 text-xs text-muted">{itemCount} 件｜{formatPrice(total)}</p>
        </div>
        {compact ? (collapsed ? <ChevronUp size={20} className="text-brand" /> : <ChevronDown size={20} className="text-brand" />) : <span className="text-sm text-muted">{items.length} 項</span>}
      </button>

      {!isCollapsed && (
        <>
          <div className={`${compact ? 'mt-2 max-h-52 space-y-2' : 'mt-4 max-h-72 space-y-3'} overflow-auto`}>
            {items.length === 0 && <p className={`rounded-2xl bg-cream text-sm text-muted ${compact ? 'p-3' : 'p-4'}`}>尚未加入商品。</p>}
            {items.map((item, index) => (
              <div key={`${item.productId}-${index}`} className={`rounded-2xl border border-line bg-white ${compact ? 'p-2.5' : 'p-3'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className={compact ? 'text-sm font-bold' : 'font-bold'}>{item.name}</p>
                    <p className="text-sm text-brand">{formatPrice(item.subtotal)}</p>
                  </div>
                  {onRemove && <button className="rounded-xl p-2 text-red-600 hover:bg-red-50" type="button" onClick={() => onRemove(index)}><Trash2 size={compact ? 16 : 18} /></button>}
                </div>

                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-xs text-muted">數量</span>
                  {onQuantityChange ? (
                    <div className="flex items-center gap-2">
                      <button className="flex h-8 w-8 items-center justify-center rounded-xl border border-line" type="button" onClick={() => onQuantityChange(index, Number(item.quantity || 1) - 1)}><Minus size={14} /></button>
                      <span className="w-7 text-center text-sm font-bold">{item.quantity}</span>
                      <button className="flex h-8 w-8 items-center justify-center rounded-xl border border-line" type="button" onClick={() => onQuantityChange(index, Number(item.quantity || 1) + 1)}><Plus size={14} /></button>
                    </div>
                  ) : <span className="text-sm font-bold">{item.quantity}</span>}
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
        </>
      )}

      {isCollapsed && (
        <button className="btn-primary mt-3 w-full py-3" type="button" disabled={disabled || items.length === 0} onClick={onSubmit}>{submitLabel}</button>
      )}
    </aside>
  )
}
